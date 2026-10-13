# BehaviorSentinel 🛡️

> **AI-driven insider threat detection** — real-time behavioural profiling, ensemble anomaly detection, and SHAP-explainable analyst alerts.

---

## Architecture & Multi-Entity Model

```
┌────────────────────────────────────────────────────────┐
│ [ENTITY 1] THE CLIENT ENTERPRISE                       │
│ Port: http://localhost:3000                            │
│ "Apex Global Technologies — Enterprise Cloud Intranet" │
├────────────────────────────────────────────────────────┤
│ • Employees: Intern, Junior, Senior Manager, Exec      │
│ • Corporate Document Vault (up to 850 MB databases)    │
│ • Threat Playground (Rogue Exfiltration, Brute-Force)  │
│ • Embedded Sentinel EDR Telemetry Agent v2.4 HUD       │
└───────────────────────────┬────────────────────────────┘
                            │ Real-Time HTTP Telemetry Webhook
                            │ (POST http://localhost:8000/api/telemetry/event)
                            ▼
┌────────────────────────────────────────────────────────┐
│ [ENTITY 2] BEHAVIORSENTINEL (3rd-Party Security SaaS)  │
│ Backend: http://localhost:8000                         │
│ SOC UI:  http://localhost:5173                         │
├────────────────────────────────────────────────────────┤
│ • Telemetry Ingestion Engine (`telemetry.py`)          │
│ • 30-Day Rolling Statistical Baseline Deviation Engine │
│ • Dual-Model Ensemble: Isolation Forest + Autoencoder  │
│ • Real-time Mathematical SHAP Attribution (Tree Expl.) │
│ • SOC Dashboard, Live Telemetry Stream, Alert Queue    │
└────────────────────────────────────────────────────────┘
```

---

## Quick Start (Running Both Entities)

### 1. Start the BehaviorSentinel Backend (Port 8000)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API docs: **http://localhost:8000/docs**

### 2. Start the BehaviorSentinel SOC Dashboard (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
SOC panel: **http://localhost:5173** (Demo Logins: Intern, Junior, Sr. Manager, Manager)

### 3. Start the Mock Enterprise Client Portal (Port 3000)
```bash
cd mock_company
npm install
npm run dev
```
Client Enterprise Workspace: **http://localhost:3000**

---

## 4 Demo User Accounts & Roles

| Role | Username | Password | User Name & Department | Access Scope |
|---|---|---|---|---|
| **Intern** | `intern01` | `intern123` | Alex Rivera (Engineering) | View personal activity & risk score; Download personal CSV |
| **Junior** | `junior01` | `junior123` | Jordan Kim (Finance) | All Intern capabilities + Download Team Risk Scores CSV |
| **Senior Manager** | `senior_mgr` | `senior123` | Morgan Singh (Operations) | Full Dashboard access, user risk overview, active Alert Queue |
| **Manager** | `manager` | `manager123` | Taylor Brooks (Management) | Full administrative access, trigger ML Detection, Full Data ZIP |

---

## Real-Time Telemetry & Core Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/login` | Authenticate and obtain JWT token | Public |
| `POST` | `/api/telemetry/event` | Real-time webhook ingestion from client enterprises | Client Webhook |
| `GET`  | `/api/telemetry/live-feed` | Live telemetry stream ticker | Public / SOC |
| `GET`  | `/api/my-activity` | Personal profile and activity history | All Roles |
| `GET`  | `/api/users` | All users with current risk scores | Senior Manager+ |
| `GET`  | `/api/alerts` | Active threat alerts with SHAP explanations | Senior Manager+ |
| `POST` | `/api/alerts/{id}/dismiss`| Dismiss an alert | Senior Manager+ |
| `GET`  | `/api/run-detection` | Trigger ensemble ML pipeline | Manager only |
| `GET`  | `/api/download/full-report`| Full dataset ZIP archive export | Manager only |

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
