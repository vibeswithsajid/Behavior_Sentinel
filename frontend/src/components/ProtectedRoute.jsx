import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route and enforces a minimum role.
 * If not authenticated → redirect to /login
 * If wrong role → show 403 message
 */
export default function ProtectedRoute({ children, minRole = "intern" }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-navy">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
            <path d="M21 12a9 9 0 00-9-9" />
          </svg>
          <p className="text-muted text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!hasRole(minRole)) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <div className="card text-center max-w-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-high/10 border border-high/30 flex items-center justify-center text-2xl mx-auto">🔒</div>
          <h3 className="text-white font-bold text-lg">Access Restricted</h3>
          <p className="text-muted text-sm">
            This section requires <span className="text-accent font-semibold">{minRole.replace("_", " ")}</span> access or above.
          </p>
          <p className="text-muted text-xs font-mono">Your role: {user.role}</p>
        </div>
      </div>
    );
  }

  return children;
}
