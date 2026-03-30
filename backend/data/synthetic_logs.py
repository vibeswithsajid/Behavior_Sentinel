"""
synthetic_logs.py
Generates realistic CERT-style synthetic insider threat logs.
- 50 users, 60 days
- 3 malicious users (indices 3, 17, 31) with injected anomalies in last 10 days
- Output: backend/data/logs.csv
"""

import numpy as np
import pandas as pd
import os
import random

np.random.seed(42)
random.seed(42)

# ── Constants ─────────────────────────────────────────────────────────────────
N_USERS = 50
N_DAYS = 60
MALICIOUS_INDICES = [3, 17, 31]   # 6% of users are anomalous
ANOMALY_START_DAY = N_DAYS - 10   # anomalies start at day 51

DEPARTMENTS = [
    "Engineering", "Finance", "HR", "Sales",
    "IT", "Operations", "Marketing", "Legal"
]

FIRST_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Drew",
    "Avery", "Blake", "Cameron", "Dana", "Ellis", "Finley", "Gray", "Harper",
    "Hayden", "Hunter", "Jamie", "Jesse", "Kai", "Kelly", "Lee", "Logan",
    "Madison", "Mason", "Micah", "Noel", "Parker", "Peyton", "Reagan", "Reese",
    "Robin", "Rowan", "Ryan", "Sam", "Sawyer", "Scott", "Shawn", "Sidney",
    "Skylar", "Spencer", "Taylor", "Terry", "Toby", "Tracy", "Val", "Whitney",
    "Winter", "Wren"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Anderson", "Thomas", "Jackson", "White", "Harris",
    "Martin", "Thompson", "Moore", "Young", "Allen", "King", "Wright",
    "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
    "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter",
    "Roberts", "Phillips", "Evans", "Turner", "Torres", "Parker", "Collins",
    "Edwards", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan"
]


# ── User profile generator ────────────────────────────────────────────────────

def build_user_profile(idx: int) -> dict:
    """Return a stable personal baseline distribution for a user."""
    rng = np.random.RandomState(idx + 1000)
    return {
        "user_id": f"U{idx:03d}",
        "name": f"{FIRST_NAMES[idx % len(FIRST_NAMES)]} {LAST_NAMES[idx % len(LAST_NAMES)]}",
        "department": DEPARTMENTS[idx % len(DEPARTMENTS)],
        # personal baselines
        "mu_login_hour": rng.uniform(8.0, 10.5),
        "sd_login_hour": rng.uniform(0.5, 2.0),
        "mu_files": rng.uniform(15, 40),
        "sd_files": rng.uniform(5, 12),
        "mu_transfer": rng.uniform(20, 100),
        "sd_transfer": rng.uniform(10, 30),
        "p_failed": rng.uniform(0.05, 0.25),
        "p_after_hours": rng.uniform(0.02, 0.08),
        "mu_usb": rng.uniform(0.05, 0.3),
        "mu_email": rng.uniform(3, 12),
        "sd_email": rng.uniform(1, 4),
    }


def generate_normal_day(profile: dict, day: int) -> dict:
    """Generate a normal day's log record for a user."""
    p = profile
    return {
        "user_id":               p["user_id"],
        "day":                   day,
        "login_hour":            int(np.clip(np.random.normal(p["mu_login_hour"], p["sd_login_hour"]), 6, 20)),
        "files_accessed":        int(np.clip(np.random.normal(p["mu_files"], p["sd_files"]), 0, 150)),
        "data_transfer_mb":      round(float(np.clip(np.random.normal(p["mu_transfer"], p["sd_transfer"]), 0, 400)), 2),
        "failed_logins":         int(np.random.binomial(5, p["p_failed"])),
        "after_hours_access":    int(np.random.random() < p["p_after_hours"]),
        "usb_events":            int(np.random.poisson(p["mu_usb"])),
        "email_recipients_count": int(np.clip(np.random.normal(p["mu_email"], p["sd_email"]), 0, 50)),
    }


def inject_anomalous_day(profile: dict, day: int) -> dict:
    """Overlay malicious behaviour onto a normal day record."""
    record = generate_normal_day(profile, day)
    # Spike all threat indicators
    record["files_accessed"]        = int(np.clip(np.random.normal(130, 25), 80, 250))
    record["data_transfer_mb"]      = round(float(np.clip(np.random.normal(380, 60), 200, 700)), 2)
    record["after_hours_access"]    = int(np.random.random() < 0.75)
    record["failed_logins"]         = int(np.clip(np.random.normal(4, 1.5), 1, 10))
    record["usb_events"]            = int(np.clip(np.random.poisson(2.5), 0, 6))
    record["email_recipients_count"] = int(np.clip(np.random.normal(45, 12), 20, 90))
    record["login_hour"]            = int(np.clip(np.random.normal(22, 2), 18, 26) % 24)
    return record


# ── Main generation ───────────────────────────────────────────────────────────

def generate_logs() -> pd.DataFrame:
    all_records = []

    for idx in range(N_USERS):
        profile = build_user_profile(idx)
        is_malicious = idx in MALICIOUS_INDICES

        for day in range(1, N_DAYS + 1):
            if is_malicious and day > ANOMALY_START_DAY:
                record = inject_anomalous_day(profile, day)
            else:
                record = generate_normal_day(profile, day)
            all_records.append(record)

    df = pd.DataFrame(all_records)
    # Ensure proper column order
    col_order = [
        "user_id", "day", "login_hour", "files_accessed",
        "data_transfer_mb", "failed_logins", "after_hours_access",
        "usb_events", "email_recipients_count"
    ]
    return df[col_order]


def save_user_metadata() -> pd.DataFrame:
    """Save user name/department lookup table."""
    profiles = [build_user_profile(i) for i in range(N_USERS)]
    meta_df = pd.DataFrame([{
        "user_id":    p["user_id"],
        "name":       p["name"],
        "department": p["department"],
        "is_malicious": 1 if i in MALICIOUS_INDICES else 0,
    } for i, p in enumerate(profiles)])
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users_meta.csv")
    meta_df.to_csv(out, index=False)
    print(f"  ↳ user metadata saved to {out}")
    return meta_df


if __name__ == "__main__":
    print("Generating synthetic CERT-style logs...")
    df = generate_logs()

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs.csv")
    df.to_csv(out_path, index=False)

    meta = save_user_metadata()

    print(f"\n✅ logs.csv: {len(df):,} records  ({N_USERS} users × {N_DAYS} days)")
    print(f"   Malicious users: {[f'U{i:03d}' for i in MALICIOUS_INDICES]}")
    print(f"   Anomaly injected from day {ANOMALY_START_DAY + 1} → {N_DAYS}")
    print(f"   Saved to: {out_path}")
