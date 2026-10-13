"""
main.py
FastAPI application entry point for BehaviorSentinel.

Endpoints:
  POST /api/login                       → authenticate, get JWT
  GET  /api/me                          → current user info
  GET  /api/users                       → all users with current risk score   [senior_manager+]
  GET  /api/user/{user_id}              → full timeline + SHAP explanation    [auth required, own profile or manager+]
  GET  /api/alerts                      → active alerts                       [senior_manager+]
  POST /api/alerts/{alert_id}/dismiss   → dismiss an alert                    [senior_manager+]
  GET  /api/run-detection               → trigger full detection pipeline      [manager only]
  GET  /api/stats                       → dashboard summary statistics         [senior_manager+]
  GET  /api/my-activity                 → caller's own activity summary        [any role]
  GET  /api/admin/aggregate-day         → aggregate today + run pipeline       [manager only]
  GET  /api/download/my-report          → download caller's activity CSV       [any role]
  GET  /api/download/team-report        → team risk scores CSV                 [junior+]
  GET  /api/download/alerts-report      → active alerts CSV                    [senior_manager+]
  GET  /api/download/full-report        → full logs ZIP                        [manager only]

Startup sequence:
  1. Initialise SQLite DB
  2. Seed 4 fixed auth users
  3. Seed 45 days of normal history for the 4 users
  4. Load logs.csv → DB (idempotent)
  5. If no risk scores: run full detection pipeline automatically
"""

import io
import os
import csv
import asyncio
import zipfile
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, "data")

app = FastAPI(
    title="BehaviorSentinel API",
    description="AI-driven insider threat detection — REST interface",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Activity Middleware ───────────────────────────────────────────────────────
from activity_logger import ActivityMiddleware
app.add_middleware(ActivityMiddleware)

# ── State ─────────────────────────────────────────────────────────────────────
_detection_running = False


# ── Helper: full pipeline ─────────────────────────────────────────────────────

def _run_full_pipeline(force_retrain: bool = False):
    """Run: ingest → detection → SHAP → update DB alerts."""
    import database as db
    from ingest import compute_features
    from detector import run_detection, models_exist
    from explainer import get_explainer

    logs_csv  = os.path.join(DATA_DIR, "logs.csv")
    fmatrix   = os.path.join(DATA_DIR, "feature_matrix.csv")

    print("[pipeline] Running feature engineering...")
    compute_features(logs_csv, fmatrix)

    save_models = not models_exist() or force_retrain
    print("[pipeline] Running detection...")
    scores_df = run_detection(fmatrix, save_models=save_models)
    scores    = scores_df.to_dict(orient="records")

    db.upsert_risk_scores(scores)
    scores_dict = {s["user_id"]: s["risk_score"] for s in scores}

    explainer = get_explainer()
    flagged   = [s["user_id"] for s in scores if s["risk_score"] > 65]
    print(f"[pipeline] Generating SHAP explanations for {len(flagged)} flagged users...")
    explanations = explainer.batch_explain(flagged, min_score=65, scores=scores_dict)

    db.rebuild_alerts(scores, explanations)
    print(f"[pipeline] Pipeline complete. {len(flagged)} alerts generated.")
    return scores


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    import database as db
    from auth import FIXED_USERS
    from activity_logger import seed_history_for_users

    print("=== BehaviorSentinel API v2.0 — starting up ===")
    db.init_db()

    # Seed fixed auth users
    db.seed_auth_users(FIXED_USERS)
    print("[startup] 4 auth users seeded.")

    # Seed 45-day synthetic history for the 4 fixed users
    fixed_ids = [u["user_id"] for u in FIXED_USERS]
    seed_history_for_users(fixed_ids, n_days=45)

    # Load any existing CSV logs into DB
    logs_csv = os.path.join(DATA_DIR, "logs.csv")
    if os.path.exists(logs_csv):
        db.load_logs_from_csv(logs_csv)

    # Also load legacy synthetic users_meta if present
    meta_csv = os.path.join(DATA_DIR, "users_meta.csv")
    if os.path.exists(meta_csv):
        db.load_users_from_csv(meta_csv)

    if not db.scores_exist():
        print("[startup] No risk scores found — running detection pipeline...")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run_full_pipeline)
    else:
        print("[startup] Existing scores found — skipping pipeline.")

    print("=== Startup complete ===")


# ── Auth Routes ───────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/login", tags=["Auth"])
def login(body: LoginRequest) -> Dict[str, Any]:
    """Authenticate and return a JWT token."""
    import database as db
    from auth import verify_password, create_token
    from activity_logger import record_login

    user = db.get_auth_user(body.username)
    if not user or not verify_password(body.password, user["password_hash"]):
        # Record failed attempt if user exists
        if user:
            record_login(user["user_id"], success=False)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    record_login(user["user_id"], success=True)
    token = create_token(user["user_id"], user["role"], user.get("username", ""))

    # Get profile info
    profile = db.get_user(user["user_id"])
    return {
        "token":   token,
        "user_id": user["user_id"],
        "role":    user["role"],
        "name":    profile["name"] if profile else user["username"],
        "department": profile["department"] if profile else "",
    }


@app.get("/api/me", tags=["Auth"])
def get_me(current_user: dict = Depends(__import__('auth').get_current_user)) -> Dict[str, Any]:
    """Return current user info from token."""
    import database as db
    user = db.get_user(current_user["sub"])
    return {
        "user_id": current_user["sub"],
        "role": current_user.get("role"),
        "name": user["name"] if user else current_user.get("username", ""),
        "department": user["department"] if user else "",
    }


# ── Users Routes ──────────────────────────────────────────────────────────────

@app.get("/api/users", tags=["Users"])
def list_users(current_user: dict = Depends(__import__('auth').require_role("senior_manager"))) -> List[Dict[str, Any]]:
    """Return all users with their current risk score. Requires senior_manager+."""
    import database as db
    users = db.get_all_users()
    for u in users:
        score = u.get("risk_score", 0) or 0
        u["score_level"] = (
            "critical" if score >= 80 else
            "high"     if score >= 65 else
            "medium"   if score >= 40 else "low"
        )
    return users


@app.get("/api/user/{user_id}", tags=["Users"])
def get_user_profile(
    user_id: str,
    current_user: dict = Depends(__import__('auth').get_current_user),
) -> Dict[str, Any]:
    """Return a user's full behavioural timeline and SHAP explanation.
    Users can view their own profile; senior_manager+ can view any user."""
    import database as db
    from auth import ROLE_LEVELS
    from explainer import get_explainer

    caller_role  = current_user.get("role", "intern")
    caller_id    = current_user.get("sub")
    can_view_all = ROLE_LEVELS.get(caller_role, 0) >= ROLE_LEVELS["senior_manager"]

    if not can_view_all and caller_id != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own profile")

    user = db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    logs  = db.get_user_logs(user_id)
    score = db.get_latest_risk_score(user_id) or 0

    explanation = ""
    if score > 40:
        try:
            explanation = get_explainer().explain(user_id)
        except Exception as e:
            explanation = f"Explanation unavailable: {str(e)}"

    # Include activity summary (recent real events)
    activity = db.get_activity_summary(user_id, days=7)

    return {
        "user_id":     user["user_id"],
        "name":        user["name"],
        "department":  user["department"],
        "risk_score":  score,
        "score_level": (
            "critical" if score >= 80 else
            "high"     if score >= 65 else
            "medium"   if score >= 40 else "low"
        ),
        "explanation": explanation,
        "logs":        logs,
        "activity":    activity,
    }


# ── Alerts Routes ─────────────────────────────────────────────────────────────

@app.get("/api/alerts", tags=["Alerts"])
def list_alerts(current_user: dict = Depends(__import__('auth').require_role("senior_manager"))) -> List[Dict[str, Any]]:
    """Return active (non-dismissed) alerts. Requires senior_manager+."""
    import database as db
    return db.get_alerts(dismissed=False)


@app.post("/api/alerts/{alert_id}/dismiss", tags=["Alerts"])
def dismiss_alert(
    alert_id: int,
    current_user: dict = Depends(__import__('auth').require_role("senior_manager")),
) -> Dict[str, Any]:
    """Mark an alert as dismissed. Requires senior_manager+."""
    import database as db
    success = db.dismiss_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return {"success": True, "alert_id": alert_id, "dismissed_at": datetime.utcnow().isoformat()}


# ── Detection Routes ──────────────────────────────────────────────────────────

@app.get("/api/run-detection", tags=["Detection"])
async def run_detection_endpoint(
    current_user: dict = Depends(__import__('auth').require_role("manager")),
) -> Dict[str, Any]:
    """Trigger full detection pipeline. Manager only."""
    global _detection_running
    if _detection_running:
        return {"status": "already_running", "message": "Detection pipeline is already in progress."}

    _detection_running = True
    try:
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(None, _run_full_pipeline)
    finally:
        _detection_running = False

    return {
        "status":            "complete",
        "users_scored":      len(scores),
        "alerts_generated":  len([s for s in scores if s["risk_score"] > 65]),
        "scanned_at":        datetime.utcnow().isoformat(),
        "top_risks":         sorted(scores, key=lambda x: -x["risk_score"])[:5],
    }


@app.get("/api/admin/aggregate-day", tags=["Detection"])
async def aggregate_and_detect(
    current_user: dict = Depends(__import__('auth').require_role("manager")),
) -> Dict[str, Any]:
    """
    Aggregate today's real activity events into log rows,
    then run the full detection pipeline. Manager only.
    """
    from activity_logger import aggregate_day

    global _detection_running
    if _detection_running:
        return {"status": "already_running"}

    _detection_running = True
    try:
        loop = asyncio.get_event_loop()
        rows = await loop.run_in_executor(None, aggregate_day)
        if rows:
            import database as db
            db.load_logs_from_csv(os.path.join(DATA_DIR, "logs.csv"))
        scores = await loop.run_in_executor(None, lambda: _run_full_pipeline(force_retrain=True))
    finally:
        _detection_running = False

    return {
        "status":           "complete",
        "rows_aggregated":  len(rows) if rows else 0,
        "users_scored":     len(scores),
        "alerts_generated": len([s for s in scores if s["risk_score"] > 65]),
        "scanned_at":       datetime.utcnow().isoformat(),
    }


# ── Stats Route ───────────────────────────────────────────────────────────────

@app.get("/api/stats", tags=["Dashboard"])
def get_stats(current_user: dict = Depends(__import__('auth').require_role("senior_manager"))) -> Dict[str, Any]:
    """Dashboard summary stats. Requires senior_manager+."""
    import database as db
    users     = db.get_all_users()
    alerts    = db.get_alerts(dismissed=False)
    scores    = [u["risk_score"] or 0 for u in users]
    last_scan = db.get_last_scan_time()

    return {
        "total_users":     len(users),
        "active_alerts":   len(alerts),
        "high_risk_users": len([s for s in scores if s >= 65]),
        "avg_risk_score":  round(sum(scores) / len(scores), 1) if scores else 0,
        "last_scan":       last_scan,
    }


# ── My Activity (any role) ────────────────────────────────────────────────────

@app.get("/api/my-activity", tags=["Users"])
def get_my_activity(current_user: dict = Depends(__import__('auth').get_current_user)) -> Dict[str, Any]:
    """Return caller's own activity summary + risk score. Any authenticated user."""
    import database as db

    uid   = current_user.get("sub")
    score = db.get_latest_risk_score(uid) or 0
    activity = db.get_activity_summary(uid, days=14)
    logs  = db.get_user_logs(uid)

    return {
        "user_id":    uid,
        "risk_score": score,
        "score_level": (
            "critical" if score >= 80 else
            "high"     if score >= 65 else
            "medium"   if score >= 40 else "low"
        ),
        "activity_summary": activity,
        "log_count":  len(logs),
    }


# ── Download Routes ───────────────────────────────────────────────────────────

def _make_csv_response(rows: list, filename: str) -> StreamingResponse:
    if not rows:
        rows = [{"message": "No data available"}]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/download/my-report", tags=["Downloads"])
def download_my_report(current_user: dict = Depends(__import__('auth').get_current_user)):
    """Download caller's own activity log as CSV. Any authenticated user."""
    import database as db
    uid  = current_user.get("sub")
    logs = db.get_user_logs(uid)
    return _make_csv_response(logs, f"my_activity_{uid}_{datetime.utcnow().date()}.csv")


@app.get("/api/download/team-report", tags=["Downloads"])
def download_team_report(current_user: dict = Depends(__import__('auth').require_role("junior"))):
    """Download all users' current risk scores as CSV. Junior+ roles."""
    import database as db
    users = db.get_all_users()
    rows = [
        {
            "user_id":    u["user_id"],
            "name":       u["name"],
            "department": u["department"],
            "risk_score": u["risk_score"],
            "score_level": (
                "critical" if (u["risk_score"] or 0) >= 80 else
                "high"     if (u["risk_score"] or 0) >= 65 else
                "medium"   if (u["risk_score"] or 0) >= 40 else "low"
            ),
        }
        for u in users
    ]
    return _make_csv_response(rows, f"team_risk_scores_{datetime.utcnow().date()}.csv")


@app.get("/api/download/alerts-report", tags=["Downloads"])
def download_alerts_report(current_user: dict = Depends(__import__('auth').require_role("senior_manager"))):
    """Download all active alerts as CSV. Senior Manager+ roles."""
    import database as db
    alerts = db.get_alerts(dismissed=False)
    return _make_csv_response(alerts, f"alerts_{datetime.utcnow().date()}.csv")


@app.get("/api/download/full-report", tags=["Downloads"])
def download_full_report(current_user: dict = Depends(__import__('auth').require_role("manager"))):
    """Download full logs + risk scores as a ZIP. Manager only."""
    import database as db
    import pandas as pd

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        logs_path = os.path.join(DATA_DIR, "logs.csv")
        if os.path.exists(logs_path):
            zf.write(logs_path, "logs.csv")

        scores_path = os.path.join(DATA_DIR, "risk_scores.csv")
        if os.path.exists(scores_path):
            zf.write(scores_path, "risk_scores.csv")

        # Add alerts CSV
        alerts = db.get_alerts(dismissed=False)
        if alerts:
            out = io.StringIO()
            writer = csv.DictWriter(out, fieldnames=alerts[0].keys())
            writer.writeheader()
            writer.writerows(alerts)
            zf.writestr("alerts.csv", out.getvalue())

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=behaviorsentinel_full_{datetime.utcnow().date()}.zip"},
    )


# ── Telemetry Ingestion (Client Company Webhook) ──────────────────────────────

class TelemetryEventRequest(BaseModel):
    user_id: str
    action: str
    details: Optional[Dict[str, Any]] = None
    source_app: Optional[str] = "Apex Global Workspace"


@app.post("/api/telemetry/event", tags=["Telemetry"])
def ingest_telemetry_event(body: TelemetryEventRequest) -> Dict[str, Any]:
    """
    Ingest a real-time telemetry event from an external client enterprise (e.g. Apex Global).
    Instantly evaluates statistical baseline deviation, runs dual ML models,
    and returns risk score, severity, SHAP drivers, and alert status.
    """
    from telemetry import evaluate_telemetry_event
    return evaluate_telemetry_event(
        user_id=body.user_id,
        action=body.action,
        details=body.details or {},
        source_app=body.source_app or "Apex Global Workspace",
    )


@app.get("/api/telemetry/live-feed", tags=["Telemetry"])
def get_live_telemetry_feed(limit: int = 20) -> List[Dict[str, Any]]:
    """Return the recent live telemetry events and security evaluations."""
    from telemetry import get_live_feed
    return get_live_feed(limit=limit)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "BehaviorSentinel API v2.0"}
