"""
explainer.py
SHAP-based natural-language explanation generator for flagged users.

Uses shap.TreeExplainer on the IsolationForest (supported in SHAP >= 0.40).
Falls back to shap.KernelExplainer with a sample background if TreeExplainer fails.

For each user with risk_score > 65:
    → Extract top 3 SHAP-contributing features
    → Translate into human-readable natural language string
"""

import os
import warnings
import numpy as np
import pandas as pd
import joblib
from typing import Optional

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")

FEATURE_MATRIX_PATH = os.path.join(DATA_DIR, "feature_matrix.csv")
IF_MODEL_PATH       = os.path.join(MODEL_DIR, "isolation_forest.pkl")
SCALER_PATH         = os.path.join(MODEL_DIR, "scaler.pkl")

DEV_FEATURES = [
    "login_hour_dev", "files_accessed_dev", "data_transfer_mb_dev",
    "failed_logins_dev", "after_hours_access_dev",
    "usb_events_dev", "email_recipients_count_dev",
]

RAW_FEATURES = [
    "login_hour", "files_accessed", "data_transfer_mb",
    "failed_logins", "after_hours_access", "usb_events", "email_recipients_count",
]

# Human-readable feature labels
FEATURE_LABELS = {
    "files_accessed_dev":        "files accessed",
    "data_transfer_mb_dev":      "data transferred (MB)",
    "after_hours_access_dev":    "after-hours access sessions",
    "failed_logins_dev":         "failed login attempts",
    "usb_events_dev":            "USB device events",
    "email_recipients_count_dev":"email recipients",
    "login_hour_dev":            "unusual login hours",
}


def _build_shap_explainer(if_model, X_background: np.ndarray):
    """Try TreeExplainer first; fall back to KernelExplainer."""
    import shap

    try:
        explainer = shap.TreeExplainer(if_model)
        # Quick validation call
        _ = explainer.shap_values(X_background[:5])
        return explainer, "tree"
    except Exception as e:
        print(f"  TreeExplainer failed ({e}), falling back to KernelExplainer...")
        bg = shap.kmeans(X_background, min(50, len(X_background)))
        explainer = shap.KernelExplainer(
            lambda x: if_model.decision_function(x),
            bg,
        )
        return explainer, "kernel"


def get_top_shap_features(
    shap_values: np.ndarray,
    feature_names: list,
    n: int = 3,
) -> list:
    """Return top-n feature names sorted by absolute SHAP importance."""
    importances = np.abs(shap_values).mean(axis=0)
    top_indices = np.argsort(importances)[::-1][:n]
    return [(feature_names[i], float(importances[i])) for i in top_indices]


def _natural_language(user_id: str, recent_raw: pd.DataFrame, top_features: list) -> str:
    """
    Build a natural-language explanation string from recent behavioural stats and top SHAP features.
    """
    baseline_window = 30
    n_recent = min(5, len(recent_raw))
    recent = recent_raw.tail(n_recent)

    parts = []
    for feat_dev, importance in top_features:
        # Map dev feature → raw feature name
        raw_feat = feat_dev.replace("_dev", "")

        recent_mean  = recent[raw_feat].mean() if raw_feat in recent.columns else None
        overall_mean = recent_raw.head(baseline_window)[raw_feat].mean() if len(recent_raw) >= baseline_window else recent_raw[raw_feat].mean()

        if recent_mean is None or overall_mean is None:
            continue

        label = FEATURE_LABELS.get(feat_dev, raw_feat)

        if raw_feat == "files_accessed":
            ratio = (recent_mean / (overall_mean + 1e-6))
            parts.append(f"accessed {ratio:.1f}× more files than their 30-day average")

        elif raw_feat == "data_transfer_mb":
            parts.append(f"{recent_mean:.0f} MB average outbound data transfer in last {n_recent} days")

        elif raw_feat == "after_hours_access":
            count = int(recent["after_hours_access"].sum())
            parts.append(f"{count} after-hours access session{'s' if count != 1 else ''} in last {n_recent} days")

        elif raw_feat == "failed_logins":
            parts.append(f"{recent_mean:.1f} avg failed logins per day (vs {overall_mean:.1f} baseline)")

        elif raw_feat == "usb_events":
            total = int(recent["usb_events"].sum())
            parts.append(f"{total} USB device event{'s' if total != 1 else ''} in last {n_recent} days")

        elif raw_feat == "email_recipients_count":
            parts.append(f"{recent_mean:.0f} avg email recipients per day (vs {overall_mean:.0f} baseline)")

        elif raw_feat == "login_hour":
            parts.append(f"abnormal login hour pattern (avg {recent_mean:.0f}:00)")

        else:
            ratio = recent_mean / (overall_mean + 1e-6)
            parts.append(f"{label} {ratio:.1f}× above baseline in last {n_recent} days")

    if not parts:
        return "Anomalous behavioural patterns detected across multiple dimensions."

    sentence = f"User {user_id}: " + ", ".join(parts[:2])
    if len(parts) >= 3:
        sentence += f", and {parts[2]}"
    sentence += "."
    return sentence


def _get_user_shap_values(explainer, explainer_type: str, X_user: np.ndarray) -> np.ndarray:
    """Return (n_samples, n_features) SHAP values array."""
    if explainer_type == "tree":
        vals = explainer.shap_values(X_user)
        # TreeExplainer for IF may return list (binary) or 2D array
        if isinstance(vals, list):
            vals = vals[0]
        return np.array(vals)
    else:
        return explainer.shap_values(X_user, nsamples=50)


class SHAPExplainer:
    def __init__(self):
        self._if_model = None
        self._explainer = None
        self._explainer_type = None
        self._fm: Optional[pd.DataFrame] = None
        self._X_scaled: Optional[np.ndarray] = None
        self._loaded = False

    def _load(self):
        if self._loaded:
            return
        print("Loading SHAP explainer resources...")
        self._if_model = joblib.load(IF_MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        self._fm = pd.read_csv(FEATURE_MATRIX_PATH)
        X_raw = self._fm[DEV_FEATURES].fillna(0).values.astype(np.float32)
        self._X_scaled = scaler.transform(X_raw)
        # Build explainer once on full data
        self._explainer, self._explainer_type = _build_shap_explainer(
            self._if_model, self._X_scaled
        )
        self._loaded = True
        print(f"  SHAP explainer ready ({self._explainer_type})")

    def explain(self, user_id: str) -> str:
        self._load()
        user_mask = self._fm["user_id"] == user_id
        if not user_mask.any():
            return f"No data found for user {user_id}."

        user_indices = np.where(user_mask)[0]
        X_user = self._X_scaled[user_indices]
        user_raw = self._fm[user_mask][RAW_FEATURES + ["day"]].reset_index(drop=True)

        shap_vals = _get_user_shap_values(self._explainer, self._explainer_type, X_user)
        top_features = get_top_shap_features(shap_vals, DEV_FEATURES, n=3)

        return _natural_language(user_id, user_raw, top_features)

    def batch_explain(self, user_ids: list, min_score: float = 65.0, scores: dict = None) -> dict:
        """Return dict {user_id: explanation_str} for all users in user_ids above min_score."""
        results = {}
        for uid in user_ids:
            if scores and scores.get(uid, 0) < min_score:
                results[uid] = ""
                continue
            try:
                results[uid] = self.explain(uid)
            except Exception as e:
                results[uid] = f"Explanation unavailable: {str(e)}"
        return results


# Singleton
_explainer_instance: Optional[SHAPExplainer] = None


def get_explainer() -> SHAPExplainer:
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = SHAPExplainer()
    return _explainer_instance
