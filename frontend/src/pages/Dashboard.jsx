import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUsers, fetchStats, runDetection } from "../api";
import RiskScoreCard from "../components/RiskScoreCard";

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreClass = (score) => {
  if (score >= 80) return "text-critical";
  if (score >= 65) return "text-high";
  if (score >= 40) return "text-medium";
  return "text-low";
};

const scoreBadge = (score) => {
  if (score >= 80) return "badge-critical";
  if (score >= 65) return "badge-high";
  if (score >= 40) return "badge-medium";
  return "badge-low";
};

const scoreLabel = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const formatTime = (iso) => {
  if (!iso) return "Never";
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return d.toLocaleString();
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "text-accent" }) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted font-semibold uppercase tracking-widest">{label}</span>
        <span className={`text-xl ${color}`}>{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [users,       setUsers]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [running,     setRunning]     = useState(false);
  const [runResult,   setRunResult]   = useState(null);
  const [error,       setError]       = useState(null);
  const [filter,      setFilter]      = useState("all"); // all | high | medium | low
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    try {
      setError(null);
      const [u, s] = await Promise.all([fetchUsers(), fetchStats()]);
      setUsers(u);
      setStats(s);
    } catch (err) {
      setError("Failed to fetch data. Ensure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRunDetection = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await runDetection();
      setRunResult(result);
      await loadData();
    } catch (err) {
      setError("Detection run failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setRunning(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (filter === "high")   list = list.filter(u => u.risk_score >= 65);
    if (filter === "medium") list = list.filter(u => u.risk_score >= 40 && u.risk_score < 65);
    if (filter === "low")    list = list.filter(u => u.risk_score < 40);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u =>
        u.user_id.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, filter, searchQuery]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Threat Dashboard</h2>
          <p className="text-sm text-muted mt-0.5">
            Last scan: <span className="text-slate-300 font-mono">{formatTime(stats?.last_scan)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {runResult && (
            <div className="text-xs text-low bg-low/10 border border-low/30 px-3 py-1.5 rounded-lg font-mono">
              ✓ {runResult.users_scored} scored · {runResult.alerts_generated} alerts
            </div>
          )}
          <button
            id="btn-run-detection"
            className="btn-primary"
            onClick={handleRunDetection}
            disabled={running}
          >
            {running ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 00-9-9" />
                </svg>
                Running…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run Detection
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-high/10 border border-high/30 text-high rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👥"
          label="Total Users"
          value={stats?.total_users ?? "—"}
          sub="monitored accounts"
          color="text-accent-light"
        />
        <StatCard
          icon="🚨"
          label="Active Alerts"
          value={stats?.active_alerts ?? "—"}
          sub="require review"
          color="text-high"
        />
        <StatCard
          icon="⚠️"
          label="High Risk"
          value={stats?.high_risk_users ?? "—"}
          sub="score ≥ 65"
          color="text-medium"
        />
        <StatCard
          icon="📊"
          label="Avg Risk Score"
          value={stats?.avg_risk_score != null ? `${stats.avg_risk_score}` : "—"}
          sub="fleet baseline"
          color="text-slate-300"
        />
      </div>

      {/* ── User leaderboard ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Risk Score Leaderboard</h3>
          <div className="flex items-center gap-2">
            {/* Search */}
            <input
              id="user-search"
              type="text"
              placeholder="Search users…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-navy border border-border text-sm text-slate-300 rounded-lg px-3 py-1.5 w-44
                         focus:outline-none focus:border-accent/60 placeholder:text-muted"
            />
            {/* Filter tabs */}
            {["all","high","medium","low"].map(f => (
              <button
                key={f}
                id={`filter-${f}`}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold capitalize transition-all duration-150
                  ${filter === f
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "text-muted hover:text-slate-300 border border-transparent hover:border-border"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? <LoadingSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase tracking-wide">
                  <th className="text-left py-3 px-3 font-semibold">User</th>
                  <th className="text-left py-3 px-3 font-semibold">Department</th>
                  <th className="text-left py-3 px-3 font-semibold">Risk Score</th>
                  <th className="text-left py-3 px-3 font-semibold">Level</th>
                  <th className="text-left py-3 px-3 font-semibold">Last Scan</th>
                  <th className="py-3 px-3" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted">No users match your filter.</td>
                  </tr>
                ) : filteredUsers.map((user, idx) => (
                  <tr
                    key={user.user_id}
                    id={`user-row-${user.user_id}`}
                    className="table-row animate-slide-up"
                    style={{ animationDelay: `${idx * 20}ms` }}
                    onClick={() => navigate(`/user/${user.user_id}`)}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center
                                        justify-center text-xs font-bold text-accent-light">
                          {user.name?.split(" ").map(n => n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{user.name}</div>
                          <div className="text-xs text-muted font-mono">{user.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted">{user.department}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-1.5 bg-navy rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(user.risk_score, 100)}%`,
                              backgroundColor:
                                user.risk_score >= 80 ? "#dc2626" :
                                user.risk_score >= 65 ? "#ef4444" :
                                user.risk_score >= 40 ? "#f59e0b" : "#22c55e",
                            }}
                          />
                        </div>
                        <span className={`font-bold font-mono text-sm ${scoreClass(user.risk_score)}`}>
                          {user.risk_score?.toFixed(1) ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={scoreBadge(user.risk_score)}>
                        {scoreLabel(user.risk_score)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted text-xs font-mono">
                      {user.computed_at ? formatTime(user.computed_at) : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        className="text-xs text-accent hover:text-accent-light border border-accent/30
                                   hover:border-accent/60 px-2.5 py-1 rounded-md transition-all duration-150"
                        onClick={e => { e.stopPropagation(); navigate(`/user/${user.user_id}`); }}
                      >
                        Profile →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
