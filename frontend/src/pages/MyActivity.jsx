import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyActivity } from "../api";
import DownloadPanel from "../components/DownloadPanel";

const ROLE_LABELS = {
  intern:         { label: "Intern",         color: "text-low",    bg: "bg-low/10 border-low/30" },
  junior:         { label: "Junior",         color: "text-accent", bg: "bg-accent/10 border-accent/30" },
  senior_manager: { label: "Senior Manager", color: "text-medium", bg: "bg-medium/10 border-medium/30" },
  manager:        { label: "Manager",        color: "text-high",   bg: "bg-high/10 border-high/30" },
};

const scoreClass = (score) => {
  if (score >= 80) return "text-critical";
  if (score >= 65) return "text-high";
  if (score >= 40) return "text-medium";
  return "text-low";
};

export default function MyActivity() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetchMyActivity()
      .then(setData)
      .catch(() => setError("Failed to load your activity. Ensure the backend is running."))
      .finally(() => setLoading(false));
  }, []);

  const role = user?.role || "intern";
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.intern;

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">My Activity</h2>
          <p className="text-sm text-muted mt-0.5">Your personal security profile</p>
        </div>
        <button onClick={logout} className="btn-ghost text-xs">
          Sign Out
        </button>
      </div>

      {/* Profile card */}
      <div className="card flex items-center gap-5">
        <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20
                        flex items-center justify-center text-xl font-bold text-accent-light shrink-0">
          {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg">{user?.name}</h3>
          <p className="text-muted text-sm">{user?.department}</p>
          <p className="text-muted text-xs font-mono mt-0.5">{user?.user_id}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${roleInfo.bg} ${roleInfo.color}`}>
          {roleInfo.label}
        </div>
      </div>

      {/* Risk score */}
      {!loading && data && (
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">Your Risk Score</p>
          <div className="flex items-end gap-3">
            <span className={`text-5xl font-bold font-mono ${scoreClass(data.risk_score)}`}>
              {data.risk_score?.toFixed(1) ?? "—"}
            </span>
            <span className={`text-sm font-semibold mb-1 capitalize ${scoreClass(data.risk_score)}`}>
              {data.score_level}
            </span>
          </div>
          <div className="mt-3 w-full h-2 bg-navy rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(data.risk_score, 100)}%`,
                backgroundColor:
                  data.risk_score >= 80 ? "#dc2626" :
                  data.risk_score >= 65 ? "#ef4444" :
                  data.risk_score >= 40 ? "#f59e0b" : "#22c55e",
              }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {data.score_level === "low"
              ? "✓ No suspicious activity detected. Your behaviour matches your baseline."
              : data.score_level === "medium"
              ? "⚠ Some deviations from your normal behaviour have been noted."
              : "⚠ Significant deviations detected. Your account may be under review."}
          </p>
        </div>
      )}

      {/* Recent activity */}
      {!loading && data?.activity_summary?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Activity (last 7 days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted uppercase tracking-wide">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-right py-2 px-2">Page Views</th>
                  <th className="text-right py-2 px-2">Downloads</th>
                  <th className="text-right py-2 px-2">Login Fails</th>
                  <th className="text-right py-2 px-2">Data (KB)</th>
                </tr>
              </thead>
              <tbody>
                {data.activity_summary.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-white/[0.02]">
                    <td className="py-2 px-2 font-mono text-slate-300">{row.event_date}</td>
                    <td className="py-2 px-2 text-right text-accent">{row.page_views}</td>
                    <td className="py-2 px-2 text-right text-low">{row.downloads}</td>
                    <td className="py-2 px-2 text-right text-high">{row.login_fails}</td>
                    <td className="py-2 px-2 text-right text-muted">
                      {row.total_bytes ? (row.total_bytes / 1024).toFixed(1) : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
      )}

      {error && (
        <div className="bg-high/10 border border-high/30 text-high rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Downloads */}
      <DownloadPanel />

      {/* Navigation hints based on role */}
      {(role === "senior_manager" || role === "manager") && (
        <div className="card">
          <p className="text-xs text-muted font-semibold uppercase tracking-widest mb-3">Quick Access</p>
          <div className="flex gap-3">
            <button onClick={() => navigate("/")} className="btn-ghost text-sm">
              → Dashboard
            </button>
            <button onClick={() => navigate("/alerts")} className="btn-ghost text-sm">
              → Alert Queue
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
