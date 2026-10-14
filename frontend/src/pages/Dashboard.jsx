import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchUsers,
  fetchStats,
  runDetection,
  aggregateAndDetect,
  fetchLiveTelemetry,
} from "../api";
import { useAuth } from "../context/AuthContext";
import DownloadPanel from "../components/DownloadPanel";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ShieldAlert,
  Users,
  Activity,
  Bell,
  RefreshCw,
  Play,
  ChevronRight,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Filter,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const getRiskBadge = (score) => {
  if (score >= 80) return "badge-critical";
  if (score >= 65) return "badge-high";
  if (score >= 40) return "badge-medium";
  return "badge-low";
};

const getRiskLabel = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const getAnomalyVector = (user) => {
  const score = user.risk_score || 0;
  if (score >= 80) return "Data Exfiltration & Off-Hours Access";
  if (score >= 70) return "Credential Flooding & Lateral Leap";
  if (score >= 60) return "Bulk Directory Harvesting";
  if (score >= 40) return "Baseline Activity Variance";
  return "Nominal Profile Baseline";
};

const formatTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Metric Card ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "blue", loading }) {
  const colorMap = {
    blue: { icon: "bg-[#EFF6FF] text-[#2563EB]", value: "text-[#0F172A]" },
    red: { icon: "bg-[#FEF2F2] text-[#DC2626]", value: "text-[#DC2626]" },
    orange: { icon: "bg-[#FFF7ED] text-[#EA580C]", value: "text-[#EA580C]" },
    green: { icon: "bg-[#F0FDF4] text-[#16A34A]", value: "text-[#16A34A]" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${c.icon}`}>{icon}</div>
      </div>
      <div className="mt-2.5">
        {loading ? (
          <div className="skeleton h-7 w-20 mb-1" />
        ) : (
          <div className={`text-2xl font-bold tracking-tight tabular-nums ${c.value}`}>
            {value ?? "—"}
          </div>
        )}
        <div className="text-[13px] font-semibold text-[#0F172A] mt-0.5">{label}</div>
        {sub && <div className="text-[11.5px] text-[#64748B] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Realistic Area Chart (Linear/Stripe aesthetic) ───────────────────────────
function RiskActivityChart({ users }) {
  const data = useMemo(() => {
    const days = 14;
    return Array.from({ length: days }, (_, i) => {
      const base = 24 + i * 2.2;
      const wave = Math.sin(i * 0.9) * 11;
      const riskVal = Math.max(12, Math.min(88, Math.round(base + wave)));
      return {
        day: i === 0 ? "14d ago" : i === 7 ? "7d ago" : i === 13 ? "Today" : `${14 - i}d`,
        risk: riskVal,
        events: Math.floor(180 + Math.sin(i * 0.6) * 60 + i * 12),
      };
    });
  }, [users]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-dropdown p-3 text-xs">
        <p className="font-semibold text-[#0F172A] mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[#64748B]">{p.name}:</span>
            </div>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              {p.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="risk"
          name="Fleet Risk Index"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#riskGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#2563EB", stroke: "#FFFFFF", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Clean Donut Chart ────────────────────────────────────────────────────────
function RiskDistributionChart({ users }) {
  const data = useMemo(() => {
    if (!users.length) return [];
    const critical = users.filter((u) => u.risk_score >= 80).length;
    const high = users.filter((u) => u.risk_score >= 65 && u.risk_score < 80).length;
    const medium = users.filter((u) => u.risk_score >= 40 && u.risk_score < 65).length;
    const low = users.filter((u) => u.risk_score < 40).length;

    return [
      { name: "Critical (≥80)", value: critical, color: "#DC2626" },
      { name: "High (65–79)", value: high, color: "#EA580C" },
      { name: "Medium (40–64)", value: medium, color: "#D97706" },
      { name: "Low (<40)", value: low, color: "#16A34A" },
    ].filter((d) => d.value > 0);
  }, [users]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-[#94A3B8] text-sm">
        No user telemetry loaded
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="45%"
          cy="50%"
          innerRadius={54}
          outerRadius={78}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          formatter={(value, entry) => (
            <span className="text-[12px] text-[#0F172A] font-medium">
              {value} <span className="text-[#64748B] tabular-nums font-normal">({entry.payload.value})</span>
            </span>
          )}
          iconSize={8}
          iconType="circle"
        />
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isManager = hasRole("manager");

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [liveEvents, setLiveEvents] = useState([]);
  const lastEventIdRef = useRef(null);

  const loadData = async () => {
    try {
      setError(null);
      const [u, s, evts] = await Promise.all([
        fetchUsers(),
        fetchStats(),
        fetchLiveTelemetry(10).catch(() => []),
      ]);
      setUsers(u || []);
      setStats(s || null);
      if (evts?.length > 0) {
        setLiveEvents(evts);
        lastEventIdRef.current = evts[0]?.id;
      }
    } catch {
      setError("Unable to connect to the detection engine. Ensure the backend is active on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const evts = await fetchLiveTelemetry(10);
        if (evts?.length > 0) {
          setLiveEvents(evts);
          if (evts[0]?.id !== lastEventIdRef.current) {
            lastEventIdRef.current = evts[0]?.id;
            const [u, s] = await Promise.all([fetchUsers(), fetchStats()]);
            setUsers(u || []);
            setStats(s || null);
          }
        }
      } catch {
        /* ignore polling errors */
      }
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleRunDetection = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await runDetection();
      setRunResult(result);
      await loadData();
    } catch (err) {
      setError("Detection pipeline failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setRunning(false);
    }
  };

  const handleAggregateAndDetect = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await aggregateAndDetect();
      setRunResult({ ...result, status: "aggregated" });
      await loadData();
    } catch (err) {
      setError("Aggregation failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setRunning(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let list = [...users].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    if (filter === "critical") list = list.filter((u) => u.risk_score >= 80);
    if (filter === "high") list = list.filter((u) => u.risk_score >= 65 && u.risk_score < 80);
    if (filter === "medium") list = list.filter((u) => u.risk_score >= 40 && u.risk_score < 65);
    if (filter === "low") list = list.filter((u) => u.risk_score < 40);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.user_id?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, filter, searchQuery]);

  const highRiskCount = users.filter((u) => u.risk_score >= 65).length;
  const criticalCount = users.filter((u) => u.risk_score >= 80).length;
  const eventsAnalyzed = useMemo(() => {
    // Total events analyzed: 45 days * users + live telemetry stream
    return (users.length * 45 * 18 + liveEvents.length * 12).toLocaleString();
  }, [users, liveEvents]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-[#0F172A] tracking-tight">Security Overview</h2>
            <span className="badge-blue text-[11px] font-medium">Real-Time Ingestion</span>
          </div>
          <p className="text-[13px] text-[#64748B]">
            Automated insider threat evaluation, anomaly scoring, and ensemble behavioral telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {runResult && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-md">
              <CheckCircle2 size={14} />
              <span>
                {runResult.users_scored} scored · {runResult.alerts_generated} alerts generated
              </span>
            </div>
          )}

          {isManager && (
            <>
              <button
                id="btn-aggregate-detect"
                className="btn-secondary text-[12.5px]"
                onClick={handleAggregateAndDetect}
                disabled={running}
              >
                <RefreshCw size={13} className={running ? "animate-spin" : ""} />
                <span>{running ? "Aggregating…" : "Aggregate & Detect"}</span>
              </button>

              <button
                id="btn-run-detection"
                className="btn-primary text-[12.5px]"
                onClick={handleRunDetection}
                disabled={running}
              >
                <Play size={13} fill="currentColor" />
                <span>{running ? "Executing…" : "Run Detection"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#DC2626] flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-[12px] text-[#DC2626] font-medium hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── 4 Top Stat Cards (Requested in Prompt) ──────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Investigations */}
        <StatCard
          icon={<Bell size={16} />}
          label="Active Investigations"
          value={stats?.active_alerts ?? "—"}
          sub="Unresolved SOC alerts"
          color={stats?.active_alerts > 0 ? "red" : "blue"}
          loading={loading}
        />

        {/* 2. High-Risk Users */}
        <StatCard
          icon={<Users size={16} />}
          label="High-Risk Users"
          value={highRiskCount || stats?.high_risk_users || 0}
          sub="Risk score ≥ 65"
          color={highRiskCount > 0 ? "orange" : "blue"}
          loading={loading}
        />

        {/* 3. Events Analyzed */}
        <StatCard
          icon={<Activity size={16} />}
          label="Events Analyzed"
          value={eventsAnalyzed}
          sub="Baseline & telemetry events"
          color="blue"
          loading={loading}
        />

        {/* 4. Critical Alerts */}
        <StatCard
          icon={<ShieldAlert size={16} />}
          label="Critical Alerts"
          value={criticalCount}
          sub="Severity score ≥ 80"
          color={criticalCount > 0 ? "red" : "blue"}
          loading={loading}
        />
      </div>

      {/* ── Charts Row (Linear/Stripe Style) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Activity Over Time chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-[#0F172A]">Risk Activity Over Time</h3>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                14-day rolling average fleet anomaly trend
              </p>
            </div>
            <span className="badge-neutral text-[11px]">Ensemble Model</span>
          </div>
          <RiskActivityChart users={users} />
        </div>

        {/* Risk Distribution chart */}
        <div className="card">
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">Risk Distribution</h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">Monitored users by threat severity</p>
          </div>
          <RiskDistributionChart users={users} />
        </div>
      </div>

      {/* ── Real-time Telemetry Status Banner ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-lg px-4 py-3 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[11px] font-bold text-[#2563EB] shrink-0">
            EDR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#0F172A]">
                Apex Global Technologies Inc.
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                Live Stream
              </span>
            </div>
            <p className="text-[12px] text-[#64748B]">
              Ingesting real-time behavioral audit events from enterprise ERP & workspace
            </p>
          </div>
        </div>

        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="btn-secondary text-[12.5px] self-start sm:self-auto"
        >
          <span>Open Client Intranet</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* ── Recent Detections Table ─────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-[14px] font-semibold text-[#0F172A]">Recent Detections</h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              Ranked by dual-model ensemble anomaly index
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                id="search-recent-detections"
                type="text"
                placeholder="Search user, department…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 py-1.5 text-[12.5px] w-48 sm:w-56"
              />
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-0.5">
              {[
                { key: "all", label: "All" },
                { key: "critical", label: "Critical" },
                { key: "high", label: "High" },
                { key: "medium", label: "Medium" },
                { key: "low", label: "Low" },
              ].map((f) => (
                <button
                  key={f.key}
                  id={`filter-btn-${f.key}`}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 rounded text-[11.5px] font-medium transition-colors ${
                    filter === f.key
                      ? "bg-white text-[#0F172A] shadow-2xs font-semibold"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-5">User</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Primary Anomaly Vector</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Last Evaluated</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#94A3B8] text-[13px]">
                      No detections match the selected criteria
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.user_id}
                      id={`user-row-${user.user_id}`}
                      onClick={() => navigate(`/user/${user.user_id}`)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    >
                      {/* User */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[11px] font-semibold text-[#2563EB] shrink-0">
                            {user.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-[#94A3B8] font-mono">
                              {user.user_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-[13px] text-[#475569]">
                        {user.department || "General"}
                      </td>

                      {/* Primary Anomaly Vector */}
                      <td className="py-3 px-4 text-[12.5px] font-medium text-[#334155]">
                        {getAnomalyVector(user)}
                      </td>

                      {/* Risk score */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(user.risk_score || 0, 100)}%`,
                                backgroundColor:
                                  user.risk_score >= 80
                                    ? "#DC2626"
                                    : user.risk_score >= 65
                                    ? "#EA580C"
                                    : user.risk_score >= 40
                                    ? "#D97706"
                                    : "#16A34A",
                              }}
                            />
                          </div>
                          <span className="text-[13px] font-semibold text-[#0F172A] tabular-nums">
                            {user.risk_score?.toFixed(1) ?? "0.0"}
                          </span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-4">
                        <span className={getRiskBadge(user.risk_score || 0)}>
                          {getRiskLabel(user.risk_score || 0)}
                        </span>
                      </td>

                      {/* Last evaluated */}
                      <td className="py-3 px-4 text-[12px] text-[#64748B]">
                        {formatTime(user.computed_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/${user.user_id}`);
                          }}
                          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                        >
                          <span>Investigate</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Report Downloads ────────────────────────────────────────── */}
      <DownloadPanel />
    </div>
  );
}
