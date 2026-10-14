import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ThreatDetection from "./pages/ThreatDetection";
import AlertQueue from "./pages/AlertQueue";
import UserProfile from "./pages/UserProfile";
import ThreatTheater from "./pages/ThreatTheater";
import MyActivity from "./pages/MyActivity";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

import "./index.css";

// ── Auth-aware root redirect ─────────────────────────────────────────────────
function RootRedirect() {
  const { user, hasRole } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (hasRole("senior_manager")) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/my-activity" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<Login />} />

          {/* Root redirect */}
          <Route
            path="/"
            element={
              <ProtectedRoute minRole="intern">
                <RootRedirect />
              </ProtectedRoute>
            }
          />

          {/* Overview Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute minRole="senior_manager">
                <Layout breadcrumbs={["BehaviorSentinel", "Overview"]}>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Threat Detection */}
          <Route
            path="/threat-detection"
            element={
              <ProtectedRoute minRole="senior_manager">
                <Layout breadcrumbs={["BehaviorSentinel", "Threat Detection"]}>
                  <ThreatDetection />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Legacy /users alias */}
          <Route
            path="/users"
            element={
              <ProtectedRoute minRole="senior_manager">
                <Layout breadcrumbs={["BehaviorSentinel", "Threat Detection"]}>
                  <ThreatDetection />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Investigation Queue */}
          <Route
            path="/alerts"
            element={
              <ProtectedRoute minRole="senior_manager">
                <Layout breadcrumbs={["BehaviorSentinel", "Investigation Queue"]}>
                  <AlertQueue />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Investigation Details (User Profile) */}
          <Route
            path="/user/:userId"
            element={
              <ProtectedRoute minRole="intern">
                <Layout breadcrumbs={["BehaviorSentinel", "Investigation", "Entity Profile"]}>
                  <UserProfile />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Attack Simulation */}
          <Route
            path="/threat-theater"
            element={
              <ProtectedRoute minRole="intern">
                <Layout breadcrumbs={["BehaviorSentinel", "Attack Simulation"]}>
                  <ThreatTheater />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulation"
            element={
              <ProtectedRoute minRole="intern">
                <Layout breadcrumbs={["BehaviorSentinel", "Attack Simulation"]}>
                  <ThreatTheater />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Activity Logs */}
          <Route
            path="/my-activity"
            element={
              <ProtectedRoute minRole="intern">
                <Layout breadcrumbs={["BehaviorSentinel", "Activity Logs"]}>
                  <MyActivity />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute minRole="intern">
                <Layout breadcrumbs={["BehaviorSentinel", "Activity Logs"]}>
                  <MyActivity />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Analytics */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute minRole="senior_manager">
                <Layout breadcrumbs={["BehaviorSentinel", "Analytics"]}>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute minRole="senior_manager">
                <Layout breadcrumbs={["BehaviorSentinel", "Settings"]}>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
