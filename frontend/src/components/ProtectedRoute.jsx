import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, minRole = "intern" }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#09090b] font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-200 rounded-full animate-spin" />
          <p className="text-zinc-500 uppercase tracking-widest text-[10px]">[ VERIFYING_SESSION_AUTH ]</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!hasRole(minRole)) {
    return (
      <div className="flex items-center justify-center h-full p-10 font-mono">
        <div className="card text-center max-w-sm space-y-3 border-zinc-800">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">[ ACCESS_RESTRICTED ]</div>
          <h3 className="text-zinc-100 font-bold text-sm uppercase">INSUFFICIENT_SECURITY_CLEARANCE</h3>
          <p className="text-zinc-400 text-xs">
            Section requires <span className="text-white font-semibold">{minRole.replace("_", " ")}</span> privilege or higher.
          </p>
          <p className="text-zinc-600 text-[10px]">CURRENT_IDENTITY: {user.name} [{user.role}]</p>
        </div>
      </div>
    );
  }

  return children;
}
