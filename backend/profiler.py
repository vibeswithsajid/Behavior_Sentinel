"""
profiler.py
Builds per-user behavioural profiles from the feature matrix.
Provides:
  - get_profile(user_id)  → 30-day baseline stats dict
  - get_recent_stats(user_id, n=10) → stats for last n days
"""

import os
import pandas as pd
import numpy as np
from typing import Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
FEATURE_MATRIX_PATH = os.path.join(DATA_DIR, "feature_matrix.csv")

RAW_FEATURES = [
    "login_hour", "files_accessed", "data_transfer_mb",
    "failed_logins", "after_hours_access", "usb_events", "email_recipients_count",
]

DEV_FEATURES = [f"{f}_dev" for f in RAW_FEATURES]


class UserProfiler:
    def __init__(self, feature_matrix_path: str = FEATURE_MATRIX_PATH):
        self._df: Optional[pd.DataFrame] = None
        self._path = feature_matrix_path

    def _load(self):
        if self._df is None:
            self._df = pd.read_csv(self._path)

    def get_profile(self, user_id: str, window: int = 30) -> dict:
        """
        Return the 30-day baseline (mean ± std) for each feature for a user.
        Uses the first 30 days as the stable baseline.
        """
        self._load()
        user_df = self._df[self._df["user_id"] == user_id].sort_values("day")
        baseline = user_df[user_df["day"] <= window]
        if baseline.empty:
            baseline = user_df

        profile = {"user_id": user_id, "n_days": len(user_df)}
        for feat in RAW_FEATURES:
            profile[f"{feat}_mean"] = round(float(baseline[feat].mean()), 3)
            profile[f"{feat}_std"]  = round(float(baseline[feat].std()), 3)
        return profile

    def get_recent_stats(self, user_id: str, n: int = 10) -> dict:
        """
        Return mean values for key features over the last n days.
        Used for natural-language SHAP explanation generation.
        """
        self._load()
        user_df = self._df[self._df["user_id"] == user_id].sort_values("day")
        recent = user_df.tail(n)

        if recent.empty:
            return {}

        stats = {"user_id": user_id, "n_days": n}
        for feat in RAW_FEATURES:
            stats[f"{feat}_recent_mean"] = round(float(recent[feat].mean()), 2)
        stats["after_hours_count"] = int(recent["after_hours_access"].sum())
        return stats

    def get_all_user_ids(self) -> list:
        self._load()
        return sorted(self._df["user_id"].unique().tolist())

    def get_user_timeline(self, user_id: str) -> list:
        """Return per-day raw + deviation data for a user as list of dicts."""
        self._load()
        user_df = self._df[self._df["user_id"] == user_id].sort_values("day")
        return user_df.to_dict(orient="records")


# Singleton instance used by other modules
_profiler: Optional[UserProfiler] = None


def get_profiler() -> UserProfiler:
    global _profiler
    if _profiler is None:
        _profiler = UserProfiler()
    return _profiler
