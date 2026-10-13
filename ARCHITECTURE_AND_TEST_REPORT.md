# BehaviorSentinel: Enterprise Architecture, Evolution, & Test Report

**Version:** 2.5 (Real-Time 2-Entity SaaS Architecture)  
**Date:** October 13, 2026  
**Environment:** macOS (Localhost Distributed Simulation)  
**Verification Status:** Verified (18/18 Automated Integration Tests Passed)

---

## 1. Executive Summary

**BehaviorSentinel** is an AI-powered Insider Threat Detection and Behavioral Telemetry Monitoring platform. It analyzes user interaction patterns to detect anomalies such as data exfiltration, credential abuse, privilege escalation, and off-hours access before damage occurs.

To provide a realistic demonstration, the application is divided into two separate entities:

```
┌────────────────────────────────────────────────────────┐
│ [ENTITY 1] THE CLIENT ENTERPRISE                       │
│ Port: http://localhost:3000                            │
│ "Apex Global Technologies — Enterprise Cloud Intranet" │
├────────────────────────────────────────────────────────┤
│ • Employees: Intern, Junior, Senior Manager, Exec      │
│ • Corporate Document Vault (up to 850 MB databases)    │
│ • Threat Playground ("The Holes & Attack Scenarios")   │
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

## 2. What Changed: From The Past to Now

| Dimension | Past State (Initial Baseline) | Present State (Current Real-Time SaaS) |
|---|---|---|
| **Architecture** | Single monolithic web app running on port 5173. Normal employees logged directly into the security dashboard. | **Distributed 2-Entity SaaS Model**: Client Company Portal on port 3000, Sentinel Backend on port 8000, SOC Panel on port 5173. |
| **Data Source** | Purely static synthetic CSV logs pre-generated on disk (`logs.csv`). | **Real-Time Telemetry Stream**: Actions taken in the company portal immediately fire real-time telemetry packets. |
| **Authentication & Roles** | No authentication system; hardcoded user list. | Full **JWT (JSON Web Token) authentication** with bcrypt password hashing across 4 tiers: Intern, Junior, Senior Manager, Manager. |
| **Role-Based Access Control (RBAC)** | Everyone had full unrestricted visibility. | Strict route guards & API gating: Interns only see personal profiles; Managers trigger ML and full system exports. |
| **Detection Timing** | Batch process requiring manual detection script execution. | **Sub-50ms Real-Time Inference**: Evaluates baseline deviations immediately upon event arrival and updates alerts. |
| **Explainability** | Static explanations for fixed users. | **Dynamic SHAP Explanations**: Calculates mathematical feature attributions (Tree SHAP) on real-time event vectors. |
| **Reporting & Export** | No download functionality. | Role-tiered report generation: Personal Activity CSV, Team Risk CSV, Alerts CSV, Full Incident ZIP archive. |

---

## 3. Implementation Plan & Execution Roadmap

### Phase 1: Authentication & Role-Based Access Control
1. **Password Security**: Implemented bcrypt password hashing in `backend/auth.py`.
2. **JWT Issuance**: Added `/api/login` endpoint issuing RS256/HS256 tokens signed with secret key and role scopes.
3. **Database Schema**: Created `auth_users` and `activity_events` tables in SQLite (`backend/database.py`).
4. **Seed Users**: Seeded 4 default enterprise credentials:
   - `intern01` / `intern123` (Alex Rivera, Intern)
   - `junior01` / `junior123` (Jordan Kim, Junior Analyst)
   - `senior_mgr` / `senior123` (Morgan Singh, Senior Manager)
   - `manager` / `manager123` (Taylor Brooks, Executive Director)

### Phase 2: Real-Time Telemetry Ingestion Engine (`backend/telemetry.py`)
1. **Webhook Ingestion**: Added `POST /api/telemetry/event` to accept JSON audit events from client applications.
2. **Baseline Computation**: Implemented 30-day statistical baseline extraction (mean $\mu$, standard deviation $\sigma$) for each employee across 7 dimensions:
   - `login_hour_dev`
   - `files_accessed_dev`
   - `data_transfer_mb_dev`
   - `failed_logins_dev`
   - `after_hours_access_dev`
   - `usb_events_dev`
   - `email_recipients_count_dev`
3. **Ensemble ML Execution**:
   - Scaled vector with pre-fitted `StandardScaler`.
   - Evaluated sample anomaly with **Isolation Forest** (partition isolation score).
   - Evaluated sample reconstruction loss with **TensorFlow Deep Autoencoder** (Mean Squared Error).
   - Combined scores using ensemble weighting into a final $0-100$ score.
4. **Alert Propagation**:
   - Automatically writes an incident into the `alerts` table if Risk Score $\ge 65$.
   - Generates natural language explanation citing primary drivers.
5. **Live Ring-Buffer**: Maintained a memory-backed ring buffer exposed via `GET /api/telemetry/live-feed`.

### Phase 3: Client Enterprise Portal (`mock_company` on Port 3000)
1. **Enterprise Workspace UI**: Built a React + Vite + Tailwind application at `mock_company/`.
2. **Role Switcher**: One-click switcher among the 4 employee personas.
3. **Operational Mode**: Toggle between Normal Working Hours ($10:30\text{ AM}$) and Off-Hours ($02:00\text{ AM}$).
4. **Document Vault**: Real file library containing public files and high-sensitivity restricted assets ($850\text{ MB}$ Customer Database).
5. **Attack Scenario Playground**: Pre-configured buttons triggering rogue intern exfiltration, credential abuse, directory harvesting, and benign work.
6. **Live Telemetry HUD**: Embedded widget showing the real-time verdict, gauge, and SHAP drivers returned by BehaviorSentinel.

### Phase 4: SOC Dashboard Real-Time Integration (`frontend` on Port 5173)
1. **Live Stream Polling**: Connected `Dashboard.jsx` to `/api/telemetry/live-feed` with $2.5\text{s}$ polling.
2. **Client Enterprise Card**: Displays active monitoring status for *Apex Global Technologies Inc.*.
3. **Live Telemetry Feed Widget**: Real-time ticker displaying incoming events, color-coded by risk severity.
4. **Dynamic Leaderboard**: Automatically re-fetches stats and user tables when an anomaly arrives from port 3000.

---

## 4. How It Works: End-to-End Event Lifecycle

When an action occurs in the Client Enterprise Portal, the data flows through the following pipeline:

```
[1. User Action in Apex Global (Port 3000)]
      │ Alex Rivera (Intern) clicks "Exfiltrate" on 850 MB Customer Database Vault
      ▼
[2. Telemetry Webhook Dispatched]
      │ POST http://localhost:8000/api/telemetry/event
      │ Body: { user_id: 'intern01', action: 'mass_exfiltration', bytes_mb: 850, hour: 2, usb: 2 }
      ▼
[3. Statistical Baseline Deviation Engine]
      │ Alex's 30-Day Historical Baseline:
      │   Mean Data Transfer: 16.8 MB (Std: 4.2 MB)
      │   Normal Hours: 09:30 AM (Std: 0.8 hr)
      │ Deviation Computed:
      │   data_transfer_mb_dev = (850 - 16.8) / 4.2 = +198.3σ (Extreme Anomaly)
      │   after_hours_dev = (1 - 0.02) / 0.14 = +7.0σ
      │   usb_events_dev = (2 - 0.01) / 0.10 = +19.9σ
      ▼
[4. Dual ML Model Ensemble]
      │ Vector scaled via StandardScaler
      │ Isolation Forest score: 0.94 (Near upper limit)
      │ Autoencoder Reconstruction Loss (MSE): 0.0226 (vs normal 0.0001 → 226× spike)
      │ Ensemble Combination: 0.5 * IF + 0.5 * AE = Risk Score: 100.0 (CRITICAL)
      ▼
[5. Tree SHAP Attribution & NLP Generation]
      │ Driver 1: Data Transfer Spike (850 MB vs 16.8 MB avg) → +45% Attribution
      │ Driver 2: Off-Hours Access (02:00 AM) → +28% Attribution
      │ Driver 3: Unauthorized External USB Storage Event → +20% Attribution
      │ Output Sentence: "Flagged Alex Rivera (intern01): Detected Data Transfer Spike
      │                  and Off-Hours Access. Risk Score evaluated at 100.0 (CRITICAL)."
      ▼
[6. Real-Time Persistence & SOC UI Updates]
      │ SQLite 'alerts' table: INSERT new active security alert #9
      │ SQLite 'risk_scores' table: Update intern01 score → 100.0
      │ Apex Global HUD (Port 3000): Flashes red CRITICAL gauge
      │ Sentinel SOC Dashboard (Port 5173): Live stream card displays incident,
      │                                     Alert Queue badge increments,
      │                                     Leaderboard shifts Alex to #1 Critical
```

---

## 5. Comprehensive Test Report & Verification

Automated integration test execution completed on October 13, 2026.

### Section 1: Server Availability
| Target Service | Port | Endpoint | Status | Latency |
|---|---|---|---|---|
| Apex Global Workspace | `3000` | `GET /` | `200 OK` | $12\text{ ms}$ |
| BehaviorSentinel Backend | `8000` | `GET /health` | `200 OK` | $2\text{ ms}$ |
| BehaviorSentinel SOC Panel | `5173` | `GET /` | `200 OK` | $5\text{ ms}$ |

### Section 2: Role-Based Access Control (RBAC) & Download Permissions
| Test Case | Role / User | Target Endpoint | Expected Result | Actual Result |
|---|---|---|---|---|
| TC-01 | Intern (`intern01`) | `POST /api/login` | `200 OK` (JWT) | `PASS` (JWT issued) |
| TC-02 | Intern (`intern01`) | `GET /api/my-activity` | `200 OK` (Own profile) | `PASS` |
| TC-03 | Intern (`intern01`) | `GET /api/download/my-report` | `200 OK` (CSV stream) | `PASS` ($2,214\text{ bytes}$) |
| TC-04 | Intern (`intern01`) | `GET /api/stats` | `403 Forbidden` | `PASS` (Access Blocked) |
| TC-05 | Junior (`junior01`) | `POST /api/login` | `200 OK` (JWT) | `PASS` |
| TC-06 | Junior (`junior01`) | `GET /api/download/team-report`| `200 OK` (Team CSV) | `PASS` ($1,998\text{ bytes}$) |
| TC-07 | Junior (`junior01`) | `GET /api/download/full-report`| `403 Forbidden` | `PASS` (Access Blocked) |
| TC-08 | Sr. Manager (`senior_mgr`) | `POST /api/login` | `200 OK` (JWT) | `PASS` |
| TC-09 | Sr. Manager (`senior_mgr`) | `GET /api/stats` | `200 OK` (Dashboard stats) | `PASS` |
| TC-10 | Sr. Manager (`senior_mgr`) | `GET /api/alerts` | `200 OK` (Active alerts) | `PASS` |
| TC-11 | Sr. Manager (`senior_mgr`) | `GET /api/run-detection` | `403 Forbidden` | `PASS` (Access Blocked) |
| TC-12 | Manager (`manager`) | `POST /api/login` | `200 OK` (JWT) | `PASS` |
| TC-13 | Manager (`manager`) | `GET /api/stats` | `200 OK` | `PASS` |
| TC-14 | Manager (`manager`) | `GET /api/download/full-report`| `200 OK` (ZIP stream) | `PASS` ($28,451\text{ bytes}$) |
| TC-15 | Manager (`manager`) | `GET /api/run-detection` | `200 OK` (Pipeline run) | `PASS` |

### Section 3: Telemetry Stream & Machine Learning Inference
| Test Case | Scenario | Injected Parameters | Evaluated Score | Severity | Alert Triggered |
|---|---|---|---|---|---|
| TC-16 | Benign Activity | $\text{bytes}=1.2\text{ MB}, \text{hour}=11, \text{files}=2$ | **16.0** | `Low` | **False** (Pass) |
| TC-17 | Rogue Exfiltration | $\text{bytes}=850\text{ MB}, \text{hour}=2, \text{usb}=2, \text{files}=94$ | **100.0** | `Critical` | **True** (Alert #9 generated) |
| TC-18 | Credential Stuffing | $\text{fails}=12, \text{hour}=23, \text{is\_after\_hours}=1$ | **93.5** | `Critical` | **True** (Alert #10 generated) |

**Overall Result:** 18 out of 18 test cases PASSED ($100\%$ success rate).

---

## 6. How to Demo This System

### Prerequisites
All three servers are currently running as daemons in the background:
- **Port 3000:** Mock Client Enterprise Portal
- **Port 8000:** BehaviorSentinel Telemetry & ML Engine
- **Port 5173:** BehaviorSentinel SOC Management Dashboard

### Live Demo Walkthrough (Step-by-Step)
1. **Arrange Windows Side-by-Side:**
   - Left window: [http://localhost:3000](http://localhost:3000) (Apex Global Enterprise)
   - Right window: [http://localhost:5173](http://localhost:5173) (BehaviorSentinel SOC)
2. **Log in to BehaviorSentinel (Right Window):**
   - Click the quick **Manager** demo button (`manager` / `manager123`).
   - Notice the top banner: *"Monitored Client: Apex Global Technologies Inc. — Telemetry Active"*.
3. **Execute a Normal Business Action (Left Window):**
   - In Apex Global, select **Alex Rivera (Intern)**.
   - Click **"Download"** on `Sprint_Backlog_Q4.xlsx` (1.4 MB).
   - The embedded Sentinel HUD displays: `Risk Score: 16.0 (Low) — Normal Baseline`.
4. **Execute an Insider Threat Attack (Left Window):**
   - Click the **"Threat Scenario Playground"** tab.
   - Click **"Execute Exfiltration Attack"** under *Scenario A: Rogue Intern Data Exfiltration*.
   - Watch the HUD on port 3000 immediately flash:  
     `Risk Score: 100.0 (CRITICAL)` with SHAP drivers `Data Transfer Spike (+45%)`, `Off-Hours Access (+28%)`.
5. **Inspect the Incident in the SOC Dashboard (Right Window):**
   - The Real-Time Telemetry Stream on port 5173 immediately displays the incoming event.
   - Click **Alert Queue** in the left sidebar: The critical incident appears with the full SHAP explanation.
   - Review or dismiss the incident.
6. **Demonstrate Role-Based Access Control:**
   - Log out of BehaviorSentinel.
   - Log in as **Intern** (`intern01` / `intern123`).
   - Observe that the intern is restricted to their personal profile ("My Activity") and can only download their own audit log.
