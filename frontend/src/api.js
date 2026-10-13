import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 60000,
});

// ── Auth token injection ──────────────────────────────────────────────────────
API.interceptors.request.use((config) => {
  const stored = localStorage.getItem("bs_user");
  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      /* ignore */
    }
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginUser = (username, password) =>
  API.post("/api/login", { username, password }).then((r) => r.data);

// ── Users ────────────────────────────────────────────────────────────────────
/** Fetch all users with current risk scores. (senior_manager+) */
export const fetchUsers = () => API.get("/api/users").then((r) => r.data);

/** Fetch a single user's profile, logs, and SHAP explanation. */
export const fetchUserProfile = (userId) =>
  API.get(`/api/user/${userId}`).then((r) => r.data);

/** Fetch my own activity summary (any role). */
export const fetchMyActivity = () =>
  API.get("/api/my-activity").then((r) => r.data);

// ── Alerts ────────────────────────────────────────────────────────────────────
/** Fetch all active (non-dismissed) alerts. (senior_manager+) */
export const fetchAlerts = () => API.get("/api/alerts").then((r) => r.data);

/** Dismiss a single alert. */
export const dismissAlert = (alertId) =>
  API.post(`/api/alerts/${alertId}/dismiss`).then((r) => r.data);

// ── Detection ─────────────────────────────────────────────────────────────────
/** Trigger full detection pipeline. (manager only) */
export const runDetection = () =>
  API.get("/api/run-detection").then((r) => r.data);

/** Aggregate today's real activity then run pipeline. (manager only) */
export const aggregateAndDetect = () =>
  API.get("/api/admin/aggregate-day").then((r) => r.data);

// ── Stats ─────────────────────────────────────────────────────────────────────
/** Fetch dashboard summary stats. (senior_manager+) */
export const fetchStats = () => API.get("/api/stats").then((r) => r.data);

// ── Live Telemetry Feed (Apex Global Client) ──────────────────────────────────
/** Fetch live telemetry events stream. */
export const fetchLiveTelemetry = (limit = 20) =>
  API.get(`/api/telemetry/live-feed?limit=${limit}`).then((r) => r.data);
