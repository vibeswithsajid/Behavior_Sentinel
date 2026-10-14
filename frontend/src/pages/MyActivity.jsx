import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyActivity } from "../api";
import DownloadPanel from "../components/DownloadPanel";
import {
  Activity,
  ShieldCheck,
  Building2,
  Calendar,
  Lock,
  HardDrive,
  Eye,
  LogOut,
  ArrowRight,
  Clock,
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
  return "Normal";
};

const getRiskColor = (score) => {
  if (score >= 80) return "#DC2626";
  if (score >= 65) return "#EA580C";
  if (score >= 40) return "#D97706";
  return "#16A34A";
};

const ROLE_LABELS = {
  intern: "Intern Analyst",
  junior: "Junior Analyst",
  senior_manager: "Senior Manager",
  manager: "Executive Director",
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MyActivity() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyActivity()
      .then(setData)
      .catch(() => setError("Failed to load your activity telemetry."))
      .finally(() => setLoading(false));
  }, []);

  const isPrivileged = hasRole("senior_manager");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-[#0F172A]">Activity & Audit Logs</h2>
            <span className="badge-blue text-[11px] font-medium">Personal Telemetry</span>
          </div>
          <p className="text-[13px] text-[#64748B]">
            Review your recorded behavioral baseline, recent workstation actions, and compliance events.
          </p>
        </div>

        {isPrivileged && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-secondary text-[12.5px] flex items-center gap-1.5"
            >
              <span>Security Overview</span>
              <ArrowRight size={13} />
            </button>
            <button
              onClick={() => navigate("/alerts")}
              className="btn-primary text-[12.5px] flex items-center gap-1.5"
            >
              <span>Investigation Queue</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Identity Summary Card ─────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#EFF6FF] border-2 border-[#BFDBFE] flex items-center justify-center text-lg font-bold text-[#2563EB] shrink-0">
              {getInitials(user?.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[16px] font-bold text-[#0F172A]">{user?.name}</h3>
                <span className="text-[11.5px] font-mono text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded">
                  {user?.user_id}
                </span>
                <span className="badge-neutral text-[11px]">
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
              </div>
              <p className="text-[12.5px] text-[#64748B] mt-1 flex items-center gap-2">
                <Building2 size={13} className="text-[#94A3B8]" />
                <span>{user?.department || "Enterprise Employee"}</span>
                <span>·</span>
                <span className="text-[#16A34A] flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  Sentinel EDR Agent Connected
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn-secondary text-[12.5px] flex items-center gap-1.5 self-start sm:self-auto"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[13px]">
          {error}
        </div>
      )}

      {/* ── Baseline Risk Status ──────────────────────────────────── */}
      {loading ? (
        <div className="skeleton h-32 w-full rounded-lg" />
      ) : (
        data && (
          <div className="card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[14px] font-semibold text-[#0F172A]">
                  Behavioral Baseline Status
                </h4>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Calculated against your 30-day historical standard deviation
                </p>
              </div>
              <span className={getRiskBadge(data.risk_score || 0)}>
                {getRiskLabel(data.risk_score || 0)} Risk
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl font-bold tabular-nums"
                style={{ color: getRiskColor(data.risk_score || 0) }}
              >
                {data.risk_score?.toFixed(1) ?? "0.0"}
              </span>
              <span className="text-[12px] text-[#94A3B8] font-semibold uppercase">
                / 100 Index
              </span>
            </div>

            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(data.risk_score || 0, 100)}%`,
                  backgroundColor: getRiskColor(data.risk_score || 0),
                }}
              />
            </div>

            <p className="text-[12.5px] text-[#64748B]">
              {data.score_level === "low"
                ? "Your current activity patterns match your statistical historical baseline. No behavioral alerts active."
                : data.score_level === "medium"
                ? "Moderate deviation observed in recent telemetry events. Monitored for baseline drift."
                : "Significant behavioral deviation detected. Incident reported to SOC Investigation Queue."}
            </p>
          </div>
        )
      )}

      {/* ── Recent Activity Events Table ───────────────────────────── */}
      {data?.activity_summary?.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h4 className="text-[14px] font-semibold text-[#0F172A]">
                Recent 7-Day Activity Audit
              </h4>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Workstation and portal access events logged by the EDR agent
              </p>
            </div>
            <span className="badge-neutral text-[11px] font-mono">
              {data.activity_summary.length} Days Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-4 text-right">Page Views</th>
                  <th className="py-3 px-4 text-right">Downloads</th>
                  <th className="py-3 px-4 text-right">Auth Failures</th>
                  <th className="py-3 px-5 text-right">Data Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                {data.activity_summary.map((row, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-5 font-medium text-[#0F172A]">{row.event_date}</td>
                    <td className="py-3 px-4 text-right text-[#475569] tabular-nums">
                      {row.page_views}
                    </td>
                    <td className="py-3 px-4 text-right text-[#475569] tabular-nums">
                      {row.downloads}
                    </td>
                    <td
                      className={`py-3 px-4 text-right tabular-nums font-semibold ${
                        row.login_fails > 0 ? "text-[#DC2626]" : "text-[#64748B]"
                      }`}
                    >
                      {row.login_fails}
                    </td>
                    <td className="py-3 px-5 text-right text-[#64748B] tabular-nums font-mono">
                      {row.total_bytes ? (row.total_bytes / 1024).toFixed(1) : "0.0"} KB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Report Downloads ────────────────────────────────────────── */}
      <DownloadPanel />
    </div>
  );
}
