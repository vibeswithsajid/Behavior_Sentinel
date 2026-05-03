"""
database.py
SQLite schema + CRUD helpers for BehaviorSentinel.

Tables:
  users        — user registry
  logs         — raw daily activity logs
  risk_scores  — per-user risk score history
  alerts       — active / dismissed analyst alerts
"""

import os
import sqlite3
import pandas as pd
from datetime import datetime
from typing import Optional, List, Dict, Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "data", "behaviorsentinel.db")

SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS users (
    user_id    TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logs (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               TEXT NOT NULL,
    day                   INTEGER NOT NULL,
    login_hour            REAL,
    files_accessed        REAL,
    data_transfer_mb      REAL,
    failed_logins         REAL,
    after_hours_access    INTEGER,
    usb_events            REAL,
    email_recipients_count REAL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE(user_id, day)
);

CREATE TABLE IF NOT EXISTS risk_scores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    score       REAL NOT NULL,
    computed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    risk_score  REAL NOT NULL,
    severity    TEXT NOT NULL,
    explanation TEXT,
    dismissed   INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id   TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    ip_address   TEXT NOT NULL,
    device_agent TEXT,
    login_at     TEXT DEFAULT (datetime('now')),
    last_active  TEXT DEFAULT (datetime('now')),
    is_suspicious INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
"""


# ── Connection helpers ────────────────────────────────────────────────────────

def _get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = _get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


# ── Ingestion helpers ─────────────────────────────────────────────────────────

def load_users_from_csv(meta_csv: str):
    """Populate users table from users_meta.csv."""
    if not os.path.exists(meta_csv):
        return
    df = pd.read_csv(meta_csv)
    conn = _get_conn()
    cur = conn.cursor()
    for _, row in df.iterrows():
        cur.execute(
            "INSERT OR IGNORE INTO users (user_id, name, department) VALUES (?, ?, ?)",
            (row["user_id"], row["name"], row["department"]),
        )
    conn.commit()
    conn.close()


def load_logs_from_csv(logs_csv: str):
    """Populate logs table from logs.csv (skip if already loaded)."""
    if not os.path.exists(logs_csv):
        return
    conn = _get_conn()
    cur = conn.cursor()
    count = cur.execute("SELECT COUNT(*) FROM logs").fetchone()[0]
    if count > 0:
        conn.close()
        return  # already loaded

    df = pd.read_csv(logs_csv)
    df.to_sql("logs", conn, if_exists="append", index=False, method="multi")
    conn.commit()
    conn.close()
    print(f"  Loaded {len(df):,} log records into DB")


# ── CRUD: Users ───────────────────────────────────────────────────────────────

def get_all_users() -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT u.user_id, u.name, u.department,
               COALESCE(rs.score, 0) AS risk_score,
               rs.computed_at
        FROM users u
        LEFT JOIN (
            SELECT user_id, score, computed_at,
                   ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY computed_at DESC) AS rn
            FROM risk_scores
        ) rs ON u.user_id = rs.user_id AND rs.rn = 1
        ORDER BY risk_score DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM users WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_logs(user_id: str) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM logs WHERE user_id = ? ORDER BY day",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── CRUD: Risk Scores ─────────────────────────────────────────────────────────

def upsert_risk_scores(scores: List[Dict[str, Any]]):
    """
    Insert a fresh batch of risk scores (one row per user per detection run).
    """
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    cur = conn.cursor()
    for s in scores:
        cur.execute(
            "INSERT INTO risk_scores (user_id, score, computed_at) VALUES (?, ?, ?)",
            (s["user_id"], s["risk_score"], now),
        )
    conn.commit()
    conn.close()


def get_latest_risk_score(user_id: str) -> Optional[float]:
    conn = _get_conn()
    row = conn.execute(
        "SELECT score FROM risk_scores WHERE user_id = ? ORDER BY computed_at DESC LIMIT 1",
        (user_id,)
    ).fetchone()
    conn.close()
    return float(row["score"]) if row else None


def get_last_scan_time() -> Optional[str]:
    conn = _get_conn()
    row = conn.execute(
        "SELECT computed_at FROM risk_scores ORDER BY computed_at DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return row["computed_at"] if row else None


# ── CRUD: Alerts ──────────────────────────────────────────────────────────────

def _severity(score: float) -> str:
    if score >= 80:
        return "critical"
    elif score >= 65:
        return "high"
    return "medium"


def rebuild_alerts(scores: List[Dict[str, Any]], explanations: Dict[str, str]):
    """
    Clear non-dismissed alerts and rebuild from current scores > 65.
    Preserves dismissed=1 rows.
    """
    conn = _get_conn()
    conn.execute("DELETE FROM alerts WHERE dismissed = 0")
    now = datetime.utcnow().isoformat()
    cur = conn.cursor()
    for s in scores:
        score = s["risk_score"]
        if score > 65:
            uid = s["user_id"]
            cur.execute(
                """INSERT INTO alerts (user_id, risk_score, severity, explanation, dismissed, created_at)
                   VALUES (?, ?, ?, ?, 0, ?)""",
                (uid, score, _severity(score), explanations.get(uid, ""), now),
            )
    conn.commit()
    conn.close()


def get_alerts(dismissed: bool = False) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute(
        """SELECT a.*, u.name, u.department
           FROM alerts a
           JOIN users u ON a.user_id = u.user_id
           WHERE a.dismissed = ?
           ORDER BY a.risk_score DESC""",
        (1 if dismissed else 0,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def dismiss_alert(alert_id: int) -> bool:
    conn = _get_conn()
    cur = conn.execute(
        "UPDATE alerts SET dismissed = 1 WHERE id = ?", (alert_id,)
    )
    changed = cur.rowcount > 0
    conn.commit()
    conn.close()
    return changed


def scores_exist() -> bool:
    conn = _get_conn()
    count = conn.execute("SELECT COUNT(*) FROM risk_scores").fetchone()[0]
    conn.close()
    return count > 0


# ── CRUD: Sessions ────────────────────────────────────────────────────────────

def insert_session(session_id: str, user_id: str, ip_address: str, device_agent: str):
    """Insert a new login session record."""
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """
        INSERT INTO sessions (session_id, user_id, ip_address, device_agent, login_at, last_active, is_suspicious)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        """,
        (session_id, user_id, ip_address, device_agent or "", now, now),
    )
    conn.commit()
    conn.close()


def get_active_sessions(user_id: str) -> List[Dict[str, Any]]:
    """
    Return all sessions for user_id whose last_active is within the last 30 minutes.
    """
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT session_id, user_id, ip_address, device_agent, login_at, last_active, is_suspicious
        FROM sessions
        WHERE user_id = ?
          AND last_active >= datetime('now', '-30 minutes')
        ORDER BY login_at ASC
        """,
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def mark_sessions_suspicious(user_id: str):
    """Mark all sessions for a user as is_suspicious=1."""
    conn = _get_conn()
    conn.execute(
        "UPDATE sessions SET is_suspicious = 1 WHERE user_id = ?",
        (user_id,),
    )
    conn.commit()
    conn.close()


def insert_alert_direct(
    user_id: str,
    risk_score: float,
    severity: str,
    explanation: str,
) -> int:
    """
    Insert a single alert row directly (used for event-driven alerts such as
    session-hijack detection that don't go through rebuild_alerts).
    Returns the new alert id.
    """
    conn = _get_conn()
    now = datetime.utcnow().isoformat()
    cur = conn.execute(
        """
        INSERT INTO alerts (user_id, risk_score, severity, explanation, dismissed, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
        """,
        (user_id, risk_score, severity, explanation, now),
    )
    alert_id = cur.lastrowid
    conn.commit()
    conn.close()
    return alert_id
