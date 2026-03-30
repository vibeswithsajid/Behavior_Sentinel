# BehaviorSentinel 🛡️

> **AI-driven insider threat detection** — real-time behavioural profiling, ensemble anomaly detection, and SHAP-explainable analyst alerts.

---

## Architecture

```
behaviorsentinel/
├── backend/
│   ├── main.py              # FastAPI REST API
│   ├── ingest.py            # Feature engineering (30-day rolling deviations)
│   ├── profiler.py          # Per-user baseline profiles
│   ├── detector.py          # Isolation Forest + Autoencoder ensemble
│   ├── explainer.py         # SHAP natural-language explanations
│   ├── database.py          # SQLite schema + CRUD
│   ├── data/
│   │   ├── synthetic_logs.py   # Synthetic CERT-style log generator
│   │   ├── logs.csv            # (generated)
│   │   └── feature_matrix.csv  # (generated)
│   ├── models/              # Saved ML model files (generated)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/           # Dashboard, AlertQueue, UserProfile
        └── components/      # RiskScoreCard, BehaviourChart, AlertCard, SHAPExplanation
```

---

## Quick Start

### 1. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

> **Apple Silicon (M1/M2/M3)**: Replace `tensorflow` with `tensorflow-macos tensorflow-metal` in `requirements.txt`.

### 2. Generate synthetic logs

```bash
python data/synthetic_logs.py
```

Generates `data/logs.csv` — 50 users × 60 days = 3,000 log records.  
Users **U003**, **U017**, and **U031** are malicious with injected anomalies in the last 10 days.

### 3. Train ML models

```bash
python detector.py
```

Trains and saves:
- `models/isolation_forest.pkl`  
- `models/autoencoder.keras`  
- `models/scaler.pkl`

Prints the top 10 highest-risk users.

### 4. Start the API server

```bash
uvicorn main:app --reload
```

API available at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

### 5. Start the React frontend

```bash
cd ../frontend
npm install
npm run dev
```

Dashboard available at **http://localhost:5173**

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/users` | All users with current risk scores |
| `GET`  | `/api/user/{user_id}` | Full timeline + SHAP explanation |
| `GET`  | `/api/alerts` | Active alerts (score > 65), sorted by severity |
| `POST` | `/api/alerts/{alert_id}/dismiss` | Analyst dismisses an alert |
| `GET`  | `/api/run-detection` | Trigger full pipeline, returns updated scores |
| `GET`  | `/api/stats` | Dashboard summary statistics |

---

## ML Pipeline

```
logs.csv
  └─→ ingest.py          (30-day rolling z-score deviations per user)
       └─→ detector.py   (IsolationForest + Autoencoder ensemble → 0–100 score)
            └─→ explainer.py  (SHAP top-3 features → natural language)
                 └─→ database.py  (SQLite: risk_scores + alerts tables)
                      └─→ main.py  (FastAPI REST endpoints)
```

**Ensemble scoring:**  
`final_score = 0.5 × IF_normalised + 0.5 × AE_reconstruction_error`  
→ scaled to **0–100**; alerts triggered at **> 65**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI + Uvicorn |
| ML Models | scikit-learn (IsolationForest), TensorFlow/Keras (Autoencoder) |
| Explainability | SHAP (TreeExplainer / KernelExplainer fallback) |
| Database | SQLite (WAL mode) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |

---

## Design System

| Role | Value |
|------|-------|
| Background | `#0f172a` |
| Card | `#1e293b` |
| Critical risk | `#dc2626` |
| High risk | `#ef4444` |
| Medium risk | `#f59e0b` |
| Low risk | `#22c55e` |
| Accent | `#6366f1` |
