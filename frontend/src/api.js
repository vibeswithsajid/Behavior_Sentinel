import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 60000,
});

// ── Users ────────────────────────────────────────────────────────────────────

/** Fetch all users with current risk scores. */
export const fetchUsers = () => API.get("/api/users").then((r) => r.data);

/** Fetch a single user's profile, logs, and SHAP explanation. */
export const fetchUserProfile = (userId) =>
  API.get(`/api/user/${userId}`).then((r) => r.data);

// ── Alerts ────────────────────────────────────────────────────────────────────

/** Fetch all active (non-dismissed) alerts. */
export const fetchAlerts = () => API.get("/api/alerts").then((r) => r.data);

/** Dismiss a single alert. */
export const dismissAlert = (alertId) =>
  API.post(`/api/alerts/${alertId}/dismiss`).then((r) => r.data);

// ── Detection ─────────────────────────────────────────────────────────────────

/** Trigger full detection pipeline and return updated scores. */
export const runDetection = () =>
  API.get("/api/run-detection").then((r) => r.data);

// ── Stats ─────────────────────────────────────────────────────────────────────

/** Fetch dashboard summary stats. */
export const fetchStats = () => API.get("/api/stats").then((r) => r.data);
