import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchUsers, fetchStats } from "../api";
import {
  Search,
  Filter,
  Users,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Building2,
  Activity,
  ChevronRight,
} from "lucide-react";

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

const getAnomalyType = (user) => {
  const score = user.risk_score || 0;
  if (score >= 80) return "Data Exfiltration & Off-Hours Spike";
  if (score >= 70) return "Credential Abuse / Auth Flooding";
  if (score >= 60) return "Mass Directory Harvesting";
  if (score >= 40) return "Elevated Baseline Deviation";
  return "Within Normal Parameters";
};

const getInvestigationStatus = (score) => {
  if (score >= 80) return { label: "Immediate Action", color: "text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]" };
  if (score >= 65) return { label: "Under Review", color: "text-[#EA580C] bg-[#FFF7ED] border-[#FED7AA]" };
  if (score >= 40) return { label: "Monitoring", color: "text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]" };
  return { label: "Baseline Normal", color: "text-[#16A34A] bg-[#F0FDF4] border-[#BBF7D0]" };
};

const formatTime = (iso) => {
  if (!iso) return "Recent scan";
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ThreatDetection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      setError(null);
      const [u, s] = await Promise.all([fetchUsers(), fetchStats()]);
      setUsers(u || []);
      setStats(s || null);
    } catch (err) {
      setError("Unable to retrieve user detections. Ensure the backend is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const departments = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    let list = [...users].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

    if (selectedSeverity !== "all") {
      if (selectedSeverity === "critical") list = list.filter((u) => u.risk_score >= 80);
      else if (selectedSeverity === "high") list = list.filter((u) => u.risk_score >= 65 && u.risk_score < 80);
      else if (selectedSeverity === "medium") list = list.filter((u) => u.risk_score >= 40 && u.risk_score < 65);
      else if (selectedSeverity === "low") list = list.filter((u) => u.risk_score < 40);
    }

    if (selectedDept !== "all") {
      list = list.filter((u) => u.department === selectedDept);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.user_id?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q) ||
          getAnomalyType(u).toLowerCase().includes(q)
      );
    }

    return list;
  }, [users, selectedSeverity, selectedDept, searchQuery]);

  const counts = useMemo(
    () => ({
      all: users.length,
      critical: users.filter((u) => u.risk_score >= 80).length,
      high: users.filter((u) => u.risk_score >= 65 && u.risk_score < 80).length,
      medium: users.filter((u) => u.risk_score >= 40 && u.risk_score < 65).length,
      low: users.filter((u) => u.risk_score < 40).length,
    }),
    [users]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-[#0F172A]">Threat Detection</h2>
            <span className="badge-blue text-[11px] font-medium">Real-Time Registry</span>
          </div>
          <p className="text-[13px] text-[#64748B]">
            Automated anomaly detection across all organizational entities, accounts, and behavioral vectors.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary self-start sm:self-auto text-[13px]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-[12px] font-medium text-[#64748B]">Monitored Entities</div>
          <div className="text-2xl font-semibold text-[#0F172A] tabular-nums mt-1">
            {users.length}
          </div>
          <div className="text-[11px] text-[#94A3B8]">Across all active departments</div>
        </div>
        <div className="stat-card">
          <div className="text-[12px] font-medium text-[#64748B]">Critical Anomalies</div>
          <div className="text-2xl font-semibold text-[#DC2626] tabular-nums mt-1">
            {counts.critical}
          </div>
          <div className="text-[11px] text-[#DC2626] font-medium">Score ≥ 80 (Immediate threat)</div>
        </div>
        <div className="stat-card">
          <div className="text-[12px] font-medium text-[#64748B]">High-Risk Vectors</div>
          <div className="text-2xl font-semibold text-[#EA580C] tabular-nums mt-1">
            {counts.high}
          </div>
          <div className="text-[11px] text-[#EA580C] font-medium">Score 65–79 (Elevated)</div>
        </div>
        <div className="stat-card">
          <div className="text-[12px] font-medium text-[#64748B]">Baseline Status</div>
          <div className="text-2xl font-semibold text-[#16A34A] tabular-nums mt-1">
            {counts.low + counts.medium}
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium">Within standard deviation</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              id="threat-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, ID, department, or anomaly type…"
              className="input pl-9 text-[13px] w-full"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-[#94A3B8] shrink-0" />
            <select
              id="department-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input text-[13px] py-1.5 pr-8 bg-white"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Severity Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-[#F1F5F9]">
          {[
            { key: "all", label: "All Severities", count: counts.all },
            { key: "critical", label: "Critical", count: counts.critical },
            { key: "high", label: "High", count: counts.high },
            { key: "medium", label: "Medium", count: counts.medium },
            { key: "low", label: "Low", count: counts.low },
          ].map((tab) => (
            <button
              key={tab.key}
              id={`tab-severity-${tab.key}`}
              onClick={() => setSelectedSeverity(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors shrink-0 ${
                selectedSeverity === tab.key
                  ? "bg-[#0F172A] text-white"
                  : "bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-[#E2E8F0]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-full tabular-nums font-semibold ${
                  selectedSeverity === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-[#E2E8F0] text-[#64748B]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Detections Data Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="skeleton h-6 w-48 mx-auto" />
            <div className="skeleton h-32 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[#DC2626]">
            <AlertTriangle size={24} className="mx-auto mb-2 opacity-80" />
            <p className="text-[14px] font-medium">{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8]">
            <Users size={32} className="mx-auto mb-2 opacity-60" />
            <p className="text-[14px] font-medium text-[#0F172A]">No entities match your filter criteria</p>
            <p className="text-[12px] text-[#64748B] mt-1">Try resetting the department or search term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-5">Entity / User</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Primary Anomaly Indicator</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Evaluated</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredUsers.map((user) => {
                  const anomaly = getAnomalyType(user);
                  const status = getInvestigationStatus(user.risk_score || 0);

                  return (
                    <tr
                      key={user.user_id}
                      onClick={() => navigate(`/user/${user.user_id}`)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    >
                      {/* User Column */}
                      <td className="py-3.5 px-5">
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
                      <td className="py-3.5 px-4 text-[13px] text-[#475569]">
                        {user.department || "Unassigned"}
                      </td>

                      {/* Primary Anomaly Type */}
                      <td className="py-3.5 px-4">
                        <span className="text-[12.5px] font-medium text-[#334155]">
                          {anomaly}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
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

                      {/* Severity Badge */}
                      <td className="py-3.5 px-4">
                        <span className={getRiskBadge(user.risk_score || 0)}>
                          {getRiskLabel(user.risk_score || 0)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-[12px] text-[#64748B]">
                        {formatTime(user.computed_at)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/${user.user_id}`);
                          }}
                          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                        >
                          <span>Investigate</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
