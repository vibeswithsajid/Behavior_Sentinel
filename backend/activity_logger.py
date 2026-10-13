"""
activity_logger.py
Tracks real user behaviour as they interact with the web app.

Two layers:
  1. FastAPI middleware → records every authenticated HTTP event into `activity_events` table
  2. aggregate_day()   → collapses today's raw events into one row per user (logs.csv format)
                         and triggers the full ML pipeline

Feature mapping:
  login_hour            → hour of the login event
  files_accessed        → count of page/API requests in the session (excl. auth)
  data_transfer_mb      → total bytes downloaded / 1_048_576
  failed_logins         → count of failed login attempts
  after_hours_access    → 1 if any session started outside 09:00–18:00
  usb_events            → always 0 (not detectable in a web app)
  email_recipients_count→ number of report exports
"""

import os
from datetime import datetime, date
from typing import Callable

import numpy as np
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Endpoints that count as "file/page access"
PAGE_PREFIXES = ["/api/users", "/api/user/", "/api/alerts", "/api/stats"]
# Endpoints that count as "report export"
DOWNLOAD_PREFIXES = ["/api/download/"]
# Endpoints to ignore (auth, health)
IGNORE_PREFIXES  = ["/api/login", "/health", "/docs", "/openapi", "/favicon"]


def _is_after_hours(hour: int) -> int:
    return 1 if (hour < 9 or hour >= 18) else 0


class ActivityMiddleware(BaseHTTPMiddleware):
    """
    Intercepts every request.
    If the request carries a valid JWT, records the activity.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        path = request.url.path

        # Skip ignored paths
        if any(path.startswith(p) for p in IGNORE_PREFIXES):
            return response

        # Pull user from request state (set by auth dependency) or JWT header
        user_id = getattr(request.state, "user_id", None)
        if user_id is None:
            user_id = _extract_user_id_from_header(request)
        if user_id is None:
            return response

        now   = datetime.utcnow()
        today = now.strftime("%Y-%m-%d")
        hour  = now.hour

        # Determine event type
        if any(path.startswith(p) for p in DOWNLOAD_PREFIXES):
            event_type = "download"
            content_len = int(response.headers.get("content-length", 0))
        elif any(path.startswith(p) for p in PAGE_PREFIXES):
            event_type = "page_view"
            content_len = int(response.headers.get("content-length", 0))
        else:
            event_type = "other"
            content_len = 0

        import database as db
        db.record_activity_event(
            user_id=user_id,
            event_date=today,
            event_type=event_type,
            endpoint=path,
            bytes_transferred=content_len,
            hour=hour,
        )
        return response


def _extract_user_id_from_header(request: Request) -> str | None:
    """Pull user_id from Bearer JWT without raising exceptions."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        from auth import decode_token
        payload = decode_token(token)
        return payload.get("sub")
    except Exception:
        return None


def record_login(user_id: str, success: bool):
    """Called explicitly from the login endpoint."""
    import database as db
    now   = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    db.record_activity_event(
        user_id=user_id,
        event_date=today,
        event_type="login_success" if success else "login_fail",
        endpoint="/api/login",
        bytes_transferred=0,
        hour=now.hour,
    )


# ── Day aggregation ───────────────────────────────────────────────────────────

def aggregate_day(target_date: str | None = None) -> list[dict]:
    """
    Collapse activity_events for `target_date` into one log row per user
    (same schema as logs.csv).

    Returns list of dicts suitable for appending to logs.csv.
    """
    import database as db

    if target_date is None:
        target_date = datetime.utcnow().strftime("%Y-%m-%d")

    events = db.get_activity_events_for_date(target_date)
    if not events:
        print(f"[aggregate_day] No events for {target_date}")
        return []

    # Group by user
    from collections import defaultdict
    user_events: dict[str, list] = defaultdict(list)
    for ev in events:
        user_events[ev["user_id"]].append(ev)

    # Compute next available day number from logs.csv
    logs_path = os.path.join(BASE_DIR, "data", "logs.csv")
    import pandas as pd
    if os.path.exists(logs_path):
        existing = pd.read_csv(logs_path)
        next_day = int(existing["day"].max()) + 1
    else:
        next_day = 1

    rows = []
    for uid, evs in user_events.items():
        page_views   = [e for e in evs if e["event_type"] == "page_view"]
        downloads    = [e for e in evs if e["event_type"] == "download"]
        login_fails  = [e for e in evs if e["event_type"] == "login_fail"]
        login_ok     = [e for e in evs if e["event_type"] == "login_success"]

        # login_hour: hour of first successful login (or first event)
        all_sorted = sorted(evs, key=lambda e: e.get("created_at", ""))
        first_login_hour = next(
            (e["hour"] for e in all_sorted if e["event_type"] == "login_success"),
            (all_sorted[0]["hour"] if all_sorted else 9),
        )

        # files_accessed: page views + unique endpoints visited
        files_accessed = len(page_views)

        # data_transfer_mb
        total_bytes = sum(e.get("bytes_transferred", 0) or 0 for e in downloads)
        data_transfer_mb = round(total_bytes / 1_048_576, 2)

        # failed_logins
        failed_logins = len(login_fails)

        # after_hours_access: any session outside 09–18
        after_hours = 1 if any(_is_after_hours(e["hour"]) for e in login_ok or all_sorted[:1]) else 0

        # usb_events: 0 (not detectable in web)
        usb_events = 0

        # email_recipients_count: number of report downloads
        email_recipients_count = len(downloads)

        rows.append({
            "user_id":                uid,
            "day":                    next_day,
            "login_hour":             first_login_hour,
            "files_accessed":         files_accessed,
            "data_transfer_mb":       data_transfer_mb,
            "failed_logins":          failed_logins,
            "after_hours_access":     after_hours,
            "usb_events":             usb_events,
            "email_recipients_count": email_recipients_count,
        })

    # Append to logs.csv
    new_df = pd.DataFrame(rows)
    if os.path.exists(logs_path):
        existing_df = pd.read_csv(logs_path)
        combined = pd.concat([existing_df, new_df], ignore_index=True)
    else:
        combined = new_df

    combined.to_csv(logs_path, index=False)
    print(f"[aggregate_day] Appended {len(rows)} rows for day {next_day} to logs.csv")
    return rows


def seed_history_for_users(user_ids: list[str], n_days: int = 45):
    """
    Seed `n_days` of synthetic-normal history into logs.csv for the 4 fixed users
    so the ML model has a baseline to detect deviations from.
    Only runs if logs.csv does NOT already contain these users.
    """
    import pandas as pd

    logs_path = os.path.join(BASE_DIR, "data", "logs.csv")

    if os.path.exists(logs_path):
        existing = pd.read_csv(logs_path)
        # If any of our fixed users already have rows, skip seeding
        if any(uid in existing["user_id"].values for uid in user_ids):
            print("[seed_history] Fixed users already have history — skipping seed.")
            return

    print(f"[seed_history] Seeding {n_days} days of normal history for {len(user_ids)} users...")

    rng = np.random.RandomState(99)

    # Per-user stable baselines (normal behaviour)
    PROFILES = {
        "intern01":   dict(mu_login=9.5, sd_login=1.0,  mu_files=12,  sd_files=4,  mu_transfer=15,  sd_transfer=8,  p_fail=0.05, p_ah=0.03, mu_email=2),
        "junior01":   dict(mu_login=9.0, sd_login=1.2,  mu_files=20,  sd_files=6,  mu_transfer=30,  sd_transfer=12, p_fail=0.08, p_ah=0.04, mu_email=4),
        "senior_mgr": dict(mu_login=8.5, sd_login=0.8,  mu_files=35,  sd_files=8,  mu_transfer=60,  sd_transfer=20, p_fail=0.04, p_ah=0.06, mu_email=8),
        "manager":    dict(mu_login=8.0, sd_login=1.5,  mu_files=50,  sd_files=12, mu_transfer=100, sd_transfer=30, p_fail=0.03, p_ah=0.08, mu_email=12),
    }

    rows = []
    for day in range(1, n_days + 1):
        for uid in user_ids:
            p = PROFILES.get(uid, PROFILES["junior01"])
            rows.append({
                "user_id":                 uid,
                "day":                     day,
                "login_hour":              int(np.clip(rng.normal(p["mu_login"], p["sd_login"]), 6, 20)),
                "files_accessed":          int(np.clip(rng.normal(p["mu_files"], p["sd_files"]), 0, 100)),
                "data_transfer_mb":        round(float(np.clip(rng.normal(p["mu_transfer"], p["sd_transfer"]), 0, 300)), 2),
                "failed_logins":           int(rng.binomial(5, p["p_fail"])),
                "after_hours_access":      int(rng.random() < p["p_ah"]),
                "usb_events":              0,
                "email_recipients_count":  int(np.clip(rng.normal(p["mu_email"], 2), 0, 30)),
            })

    new_df = pd.DataFrame(rows)

    if os.path.exists(logs_path):
        existing_df = pd.read_csv(logs_path)
        combined = pd.concat([existing_df, new_df], ignore_index=True)
    else:
        combined = new_df

    combined.to_csv(logs_path, index=False)
    print(f"[seed_history] Seeded {len(rows)} rows ({n_days} days × {len(user_ids)} users)")
