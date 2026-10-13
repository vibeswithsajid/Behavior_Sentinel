import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import AlertQueue   from "./pages/AlertQueue";
import UserProfile  from "./pages/UserProfile";
import ThreatTheater from "./pages/ThreatTheater";
import MyActivity   from "./pages/MyActivity";

import "./index.css";

// ── Icons ─────────────────────────────────────────────────────────────────────
const ShieldIcon     = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const DashboardIcon  = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const AlertIcon      = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const UsersIcon      = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const TheatreIcon    = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="3" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="3" />
  </svg>
);
const ActivityIcon   = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const ROLE_COLORS = {
  intern:         "text-low",
  junior:         "text-accent",
  senior_manager: "text-medium",
  manager:        "text-high",
};
const ROLE_LABELS = {
  intern:         "Intern",
  junior:         "Junior",
  senior_manager: "Sr. Manager",
  manager:        "Manager",
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout, hasRole } = useAuth();

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-card border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent/20 border border-accent/40 rounded-lg flex items-center justify-center text-accent">
            <ShieldIcon size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">BehaviorSentinel</h1>
            <p className="text-[10px] text-muted font-mono tracking-widest uppercase">Threat Detection</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest px-4 mb-3">Navigation</p>

        {/* My Activity — all roles */}
        <NavLink id="nav-my-activity" to="/my-activity"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <ActivityIcon /> My Activity
        </NavLink>

        {/* Dashboard — senior_manager+ */}
        {hasRole("senior_manager") && (
          <NavLink id="nav-dashboard" to="/" end
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <DashboardIcon /> Dashboard
          </NavLink>
        )}

        {/* Alert Queue — senior_manager+ */}
        {hasRole("senior_manager") && (
          <NavLink id="nav-alerts" to="/alerts"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <AlertIcon /> Alert Queue
          </NavLink>
        )}

        {/* Users — senior_manager+ */}
        {hasRole("senior_manager") && (
          <NavLink id="nav-users" to="/users"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <UsersIcon /> Users
          </NavLink>
        )}

        {/* Threat Theater — all roles */}
        <NavLink id="nav-threat-theater" to="/threat-theater"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <TheatreIcon /> Threat Theater
        </NavLink>
      </nav>

      {/* User info footer */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center
                            justify-center text-xs font-bold text-accent-light shrink-0">
              {user.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className={`text-[10px] font-semibold ${ROLE_COLORS[user.role] || "text-muted"}`}>
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>
            <button
              id="btn-logout"
              onClick={logout}
              title="Sign out"
              className="text-muted hover:text-high transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-low animate-pulse-slow" />
          <span className="text-xs text-muted">System Online</span>
        </div>
        <p className="text-[10px] text-muted/60 font-mono">v2.0.0</p>
      </div>
    </aside>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen bg-navy">
        {children}
      </main>
    </div>
  );
}

// ── Auth-aware root redirect ───────────────────────────────────────────────────
function RootRedirect() {
  const { user, hasRole } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Senior managers and managers go to the dashboard; others go to My Activity
  if (hasRole("senior_manager")) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/my-activity" replace />;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes — all wrapped in Layout+Sidebar */}
          <Route path="/" element={
            <ProtectedRoute minRole="intern">
              <Layout><RootRedirect /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/my-activity" element={
            <ProtectedRoute minRole="intern">
              <Layout><MyActivity /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute minRole="senior_manager">
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          {/* /users and / both go to Dashboard for senior_manager+ */}
          <Route path="/users" element={
            <ProtectedRoute minRole="senior_manager">
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/alerts" element={
            <ProtectedRoute minRole="senior_manager">
              <Layout><AlertQueue /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/user/:userId" element={
            <ProtectedRoute minRole="intern">
              <Layout><UserProfile /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/threat-theater" element={
            <ProtectedRoute minRole="intern">
              <Layout><ThreatTheater /></Layout>
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
