"""
main.py
FastAPI application entry point for BehaviorSentinel.

Endpoints:
  GET  /api/users                       → all users with current risk score
  GET  /api/user/{user_id}              → full timeline + SHAP explanation
  GET  /api/alerts                      → active alerts (score > 65), sorted by severity
  POST /api/alerts/{alert_id}/dismiss   → analyst dismisses an alert
  GET  /api/run-detection               → trigger full detection pipeline

Startup sequence:
  1. Initialise SQLite DB
  2. Load users_meta.csv + logs.csv into DB (idempotent)
  3. If no risk scores: run full detection pipeline automatically
"""

import os
import sys
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, "data")

app = FastAPI(
    title="BehaviorSentinel API",
    description="AI-driven insider threat detection — REST interface",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── State ─────────────────────────────────────────────────────────────────────
_detection_running = False


# ── Helper: full pipeline ─────────────────────────────────────────────────────

def _run_full_pipeline(force_retrain: bool = False):
    """
    Run: ingest → detection → SHAP → update DB alerts.
    Called on startup (if no scores) and on /api/run-detection.
    """
    import database as db
    from ingest import compute_features
    from detector import run_detection, models_exist
    from explainer import get_explainer

    logs_csv   = os.path.join(DATA_DIR, "logs.csv")
    meta_csv   = os.path.join(DATA_DIR, "users_meta.csv")
    fmatrix    = os.path.join(DATA_DIR, "feature_matrix.csv")

    # Ingest
    if not os.path.exists(fmatrix):
        print("[pipeline] Running feature engineering...")
        compute_features(logs_csv, fmatrix)
    else:
        print("[pipeline] Feature matrix already exists, recomputing for freshness...")
        compute_features(logs_csv, fmatrix)

    # Detection (train if models missing OR if forced)
    save_models = not models_exist() or force_retrain
    print("[pipeline] Running detection...")
    scores_df = run_detection(fmatrix, save_models=save_models)
    scores = scores_df.to_dict(orient="records")   # [{user_id, risk_score}]

    # Persist scores
    db.upsert_risk_scores(scores)
    scores_dict = {s["user_id"]: s["risk_score"] for s in scores}

    # Generate SHAP explanations for flagged users
    explainer = get_explainer()
    flagged = [s["user_id"] for s in scores if s["risk_score"] > 65]
    print(f"[pipeline] Generating SHAP explanations for {len(flagged)} flagged users...")
    explanations = explainer.batch_explain(flagged, min_score=65, scores=scores_dict)

    # Rebuild alerts table
    db.rebuild_alerts(scores, explanations)
    print(f"[pipeline] Pipeline complete. {len(flagged)} alerts generated.")
    return scores


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    import database as db

    print("=== BehaviorSentinel API — starting up ===")
    db.init_db()

    meta_csv = os.path.join(DATA_DIR, "users_meta.csv")
    logs_csv = os.path.join(DATA_DIR, "logs.csv")

    if os.path.exists(meta_csv):
        db.load_users_from_csv(meta_csv)
    if os.path.exists(logs_csv):
        db.load_logs_from_csv(logs_csv)

    if not db.scores_exist():
        print("[startup] No risk scores found — running detection pipeline...")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run_full_pipeline)
    else:
        print("[startup] Existing scores found — skipping pipeline.")

    print("=== Startup complete ===")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/users", tags=["Users"])
def list_users() -> List[Dict[str, Any]]:
    """Return all users with their current risk score."""
    import database as db
    users = db.get_all_users()
    for u in users:
        score = u.get("risk_score", 0) or 0
        if score >= 80:
            u["score_level"] = "critical"
        elif score >= 65:
            u["score_level"] = "high"
        elif score >= 40:
            u["score_level"] = "medium"
        else:
            u["score_level"] = "low"
    return users


@app.get("/api/user/{user_id}", tags=["Users"])
def get_user_profile(user_id: str) -> Dict[str, Any]:
    """Return a user's full behavioural timeline and SHAP explanation."""
    import database as db
    from explainer import get_explainer

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

    return {
        "user_id":     user["user_id"],
        "name":        user["name"],
        "department":  user["department"],
        "risk_score":  score,
        "score_level": (
            "critical" if score >= 80
            else "high" if score >= 65
            else "medium" if score >= 40
            else "low"
        ),
        "explanation": explanation,
        "logs":        logs,
    }


@app.get("/api/alerts", tags=["Alerts"])
def list_alerts() -> List[Dict[str, Any]]:
    """Return active (non-dismissed) alerts, sorted by risk score descending."""
    import database as db
    return db.get_alerts(dismissed=False)


@app.post("/api/alerts/{alert_id}/dismiss", tags=["Alerts"])
def dismiss_alert(alert_id: int) -> Dict[str, Any]:
    """Mark an alert as dismissed by an analyst."""
    import database as db
    success = db.dismiss_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return {"success": True, "alert_id": alert_id, "dismissed_at": datetime.utcnow().isoformat()}


@app.get("/api/run-detection", tags=["Detection"])
async def run_detection_endpoint(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Trigger the full detection pipeline (ingest → ML → SHAP → update alerts).
    Runs synchronously and returns updated scores.
    """
    global _detection_running
    if _detection_running:
        return {"status": "already_running", "message": "Detection pipeline is already in progress."}

    _detection_running = True
    try:
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(None, _run_full_pipeline)
    finally:
        _detection_running = False

    import database as db
    return {
        "status":     "complete",
        "users_scored": len(scores),
        "alerts_generated": len([s for s in scores if s["risk_score"] > 65]),
        "scanned_at": datetime.utcnow().isoformat(),
        "top_risks":  sorted(scores, key=lambda x: -x["risk_score"])[:5],
    }


@app.get("/api/stats", tags=["Dashboard"])
def get_stats() -> Dict[str, Any]:
    """Dashboard summary stats."""
    import database as db
    users   = db.get_all_users()
    alerts  = db.get_alerts(dismissed=False)
    scores  = [u["risk_score"] or 0 for u in users]
    last_scan = db.get_last_scan_time()

    return {
        "total_users":    len(users),
        "active_alerts":  len(alerts),
        "high_risk_users": len([s for s in scores if s >= 65]),
        "avg_risk_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "last_scan":      last_scan,
    }


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "BehaviorSentinel API"}
