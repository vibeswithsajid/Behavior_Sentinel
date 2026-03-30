"""
ingest.py
Load logs.csv → compute per-user per-day deviation features vs. personal 30-day rolling baseline.
Output: data/feature_matrix.csv
"""

import os
import pandas as pd
import numpy as np

# Feature columns to compute deviations for
FEATURES = [
    "login_hour",
    "files_accessed",
    "data_transfer_mb",
    "failed_logins",
    "after_hours_access",
    "usb_events",
    "email_recipients_count",
]

ROLLING_WINDOW = 30   # days for baseline
EPS = 1e-6            # avoid division by zero

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
LOGS_PATH = os.path.join(DATA_DIR, "logs.csv")
FEATURE_MATRIX_PATH = os.path.join(DATA_DIR, "feature_matrix.csv")


def compute_deviation_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each user and each day, compute the z-score deviation of each feature
    relative to that user's rolling 30-day historical window (excluding current day).
    Returns a DataFrame with original columns + '<feature>_dev' columns.
    """
    df = df.sort_values(["user_id", "day"]).reset_index(drop=True)
    records = []

    for user_id, user_df in df.groupby("user_id", sort=False):
        user_df = user_df.reset_index(drop=True)

        rolling_means = {f: [] for f in FEATURES}
        rolling_stds  = {f: [] for f in FEATURES}

        for i in range(len(user_df)):
            # Use up to ROLLING_WINDOW days *before* current day
            start = max(0, i - ROLLING_WINDOW)
            window = user_df.iloc[start:i]

            for feat in FEATURES:
                if len(window) == 0:
                    rolling_means[feat].append(user_df[feat].iloc[i])
                    rolling_stds[feat].append(1.0)
                else:
                    rolling_means[feat].append(window[feat].mean())
                    std = window[feat].std()
                    rolling_stds[feat].append(float(std) if (std is not None and not np.isnan(std) and std > 0) else 1.0)

        new_rows = user_df.copy()
        for feat in FEATURES:
            means = np.array(rolling_means[feat])
            stds  = np.array(rolling_stds[feat])
            new_rows[f"{feat}_dev"] = ((user_df[feat].values - means) / (stds + EPS)).round(4)

        records.append(new_rows)

    result = pd.concat(records, ignore_index=True)
    return result


def compute_features(
    logs_path: str = LOGS_PATH,
    output_path: str = FEATURE_MATRIX_PATH,
) -> pd.DataFrame:
    print("Loading logs...")
    df = pd.read_csv(logs_path)
    print(f"  ↳ {len(df):,} records loaded for {df['user_id'].nunique()} users")

    print("Computing 30-day rolling deviation features...")
    feature_df = compute_deviation_features(df)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    feature_df.to_csv(output_path, index=False)
    print(f"  ↳ feature_matrix shape: {feature_df.shape}")
    print(f"  ↳ saved to: {output_path}")
    return feature_df


if __name__ == "__main__":
    compute_features()
    print("\n✅ Feature engineering complete.")
