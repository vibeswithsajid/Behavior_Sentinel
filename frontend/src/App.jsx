import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import Dashboard    from "./pages/Dashboard";
import AlertQueue   from "./pages/AlertQueue";
import UserProfile  from "./pages/UserProfile";
import "./index.css";

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
const ShieldIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar() {
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
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest px-4 mb-3">Navigation</p>

        <NavLink
          id="nav-dashboard"
          to="/"
          end
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <DashboardIcon />
          Dashboard
        </NavLink>

        <NavLink
          id="nav-alerts"
          to="/alerts"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <AlertIcon />
          Alert Queue
        </NavLink>

        <NavLink
          id="nav-users"
          to="/users"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <UsersIcon />
          Users
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-low animate-pulse-slow" />
          <span className="text-xs text-muted">System Online</span>
        </div>
        <p className="text-[10px] text-muted/60 mt-1 font-mono">v1.0.0</p>
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

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/alerts"      element={<AlertQueue />} />
          <Route path="/users"       element={<Dashboard />} />
          <Route path="/user/:userId" element={<UserProfile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
