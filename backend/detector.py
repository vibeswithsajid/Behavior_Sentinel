"""
detector.py
ML anomaly detection pipeline.
  - IsolationForest (scikit-learn)
  - Autoencoder (Keras / TensorFlow)
  - Ensemble: final_score = 0.5 * IF_score + 0.5 * AE_score  →  0-100

Run directly to train & save models:
    python detector.py
"""

import os
import sys
import warnings
import numpy as np
import pandas as pd
import joblib

warnings.filterwarnings("ignore")

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")

FEATURE_MATRIX_PATH  = os.path.join(DATA_DIR,  "feature_matrix.csv")
IF_MODEL_PATH        = os.path.join(MODEL_DIR, "isolation_forest.pkl")
AE_MODEL_PATH        = os.path.join(MODEL_DIR, "autoencoder.keras")
SCALER_PATH          = os.path.join(MODEL_DIR, "scaler.pkl")
SCORES_PATH          = os.path.join(DATA_DIR,  "risk_scores.csv")

DEV_FEATURES = [
    "login_hour_dev", "files_accessed_dev", "data_transfer_mb_dev",
    "failed_logins_dev", "after_hours_access_dev",
    "usb_events_dev", "email_recipients_count_dev",
]

# ── Normalisation helpers ─────────────────────────────────────────────────────

def _minmax(arr: np.ndarray) -> np.ndarray:
    mn, mx = arr.min(), arr.max()
    if mx - mn < 1e-9:
        return np.zeros_like(arr, dtype=float)
    return (arr - mn) / (mx - mn)


# ── Isolation Forest ──────────────────────────────────────────────────────────

def train_isolation_forest(X: np.ndarray):
    from sklearn.ensemble import IsolationForest
    print("  Training IsolationForest...")
    model = IsolationForest(
        n_estimators=200,
        contamination=0.06,
        max_samples="auto",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)
    return model


def if_anomaly_scores(model, X: np.ndarray) -> np.ndarray:
    """
    score_samples returns negative values; more negative = more anomalous.
    Flip and normalise to [0, 1] → higher = more anomalous.
    """
    raw = model.score_samples(X)        # shape (n,)
    flipped = -raw                      # now higher = worse
    return _minmax(flipped)


# ── Autoencoder ───────────────────────────────────────────────────────────────

def build_autoencoder(input_dim: int):
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers

    inp = keras.Input(shape=(input_dim,))
    x   = layers.Dense(64, activation="relu")(inp)
    x   = layers.Dense(32, activation="relu")(x)
    encoded = layers.Dense(16, activation="relu")(x)
    x   = layers.Dense(32, activation="relu")(encoded)
    x   = layers.Dense(64, activation="relu")(x)
    out = layers.Dense(input_dim, activation="linear")(x)

    model = keras.Model(inputs=inp, outputs=out)
    model.compile(optimizer="adam", loss="mse")
    return model


def train_autoencoder(X: np.ndarray):
    print("  Training Autoencoder...")
    ae = build_autoencoder(X.shape[1])
    ae.fit(
        X, X,
        epochs=50,
        batch_size=64,
        validation_split=0.1,
        verbose=0,
    )
    return ae


def ae_anomaly_scores(model, X: np.ndarray) -> np.ndarray:
    """Reconstruction error per sample, normalised to [0, 1]."""
    X_pred = model.predict(X, verbose=0)
    recon_error = np.mean((X - X_pred) ** 2, axis=1)
    return _minmax(recon_error)


# ── Ensemble scoring per user ─────────────────────────────────────────────────

def compute_user_scores(
    if_scores_norm: np.ndarray,
    ae_scores_norm: np.ndarray,
    user_ids: np.ndarray,
) -> pd.DataFrame:
    """
    Average the two normalised score arrays per-sample, then aggregate to per-user
    score using the max of the last 10 days (to catch recent spikes).
    Final score scaled to 0-100.
    """
    ensemble = 0.5 * if_scores_norm + 0.5 * ae_scores_norm   # per sample (0-1)

    df_scores = pd.DataFrame({
        "user_id": user_ids,
        "sample_score": ensemble,
    })
    # Use max of the last 10 rows per user (= last 10 days after sorting)
    # The feature_matrix is already sorted by user_id, day, so tail = most recent
    user_scores = (
        df_scores.groupby("user_id")["sample_score"]
        .apply(lambda s: s.tail(10).max())
        .reset_index()
        .rename(columns={"sample_score": "risk_score"})
    )
    user_scores["risk_score"] = (user_scores["risk_score"] * 100).round(1)
    return user_scores


# ── Full pipeline ─────────────────────────────────────────────────────────────

def run_detection(
    feature_matrix_path: str = FEATURE_MATRIX_PATH,
    save_models: bool = True,
) -> pd.DataFrame:
    """
    Full detection pipeline.
    If models are already saved, load them; otherwise train from scratch.
    Returns DataFrame with columns [user_id, risk_score].
    """
    from sklearn.preprocessing import StandardScaler

    os.makedirs(MODEL_DIR, exist_ok=True)

    print("Loading feature matrix...")
    fm = pd.read_csv(feature_matrix_path)
    X_raw = fm[DEV_FEATURES].fillna(0).values.astype(np.float32)
    user_ids = fm["user_id"].values

    # ── Scaler ──────────────────────────────────────────────────────────────
    if os.path.exists(SCALER_PATH):
        print("  Loading existing scaler...")
        scaler = joblib.load(SCALER_PATH)
        X = scaler.transform(X_raw)
    else:
        scaler = StandardScaler()
        X = scaler.fit_transform(X_raw)
        if save_models:
            joblib.dump(scaler, SCALER_PATH)
            print(f"  Scaler saved → {SCALER_PATH}")

    # ── Isolation Forest ────────────────────────────────────────────────────
    if os.path.exists(IF_MODEL_PATH):
        print("  Loading existing IsolationForest...")
        if_model = joblib.load(IF_MODEL_PATH)
    else:
        if_model = train_isolation_forest(X)
        if save_models:
            joblib.dump(if_model, IF_MODEL_PATH)
            print(f"  IsolationForest saved → {IF_MODEL_PATH}")

    if_scores = if_anomaly_scores(if_model, X)

    # ── Autoencoder ─────────────────────────────────────────────────────────
    if os.path.exists(AE_MODEL_PATH):
        print("  Loading existing Autoencoder...")
        import tensorflow as tf
        ae_model = tf.keras.models.load_model(AE_MODEL_PATH)
    else:
        ae_model = train_autoencoder(X)
        if save_models:
            ae_model.save(AE_MODEL_PATH)
            print(f"  Autoencoder saved → {AE_MODEL_PATH}")

    ae_scores = ae_anomaly_scores(ae_model, X)

    # ── Ensemble ─────────────────────────────────────────────────────────────
    print("  Computing ensemble scores...")
    user_scores = compute_user_scores(if_scores, ae_scores, user_ids)
    user_scores = user_scores.sort_values("risk_score", ascending=False).reset_index(drop=True)

    # Save scores CSV
    user_scores.to_csv(SCORES_PATH, index=False)
    print(f"  Risk scores saved → {SCORES_PATH}")

    return user_scores


def load_models():
    """Load pre-trained models for use in main.py. Returns (if_model, ae_model, scaler)."""
    import tensorflow as tf

    if_model = joblib.load(IF_MODEL_PATH)
    ae_model  = tf.keras.models.load_model(AE_MODEL_PATH)
    scaler    = joblib.load(SCALER_PATH)
    return if_model, ae_model, scaler


def models_exist() -> bool:
    return (
        os.path.exists(IF_MODEL_PATH)
        and os.path.exists(AE_MODEL_PATH)
        and os.path.exists(SCALER_PATH)
    )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Ensure feature matrix exists
    if not os.path.exists(FEATURE_MATRIX_PATH):
        print("Feature matrix not found — running ingest.py first...")
        from ingest import compute_features
        compute_features()

    print("\nRunning detection pipeline...")
    scores = run_detection()

    print("\n✅ Detection complete. Top 10 users by risk score:")
    print(scores.head(10).to_string(index=False))
