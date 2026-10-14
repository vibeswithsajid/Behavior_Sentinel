import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUserProfile } from "../api";
import BehaviourChart from "../components/BehaviourChart";
import RiskScoreCard from "../components/RiskScoreCard";
import SHAPExplanation from "../components/SHAPExplanation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  AlertTriangle,
  FileText,
  Shield,
  Download,
  CheckCircle2,
  ListChecks,
  Activity,
  HardDrive,
  Mail,
  Lock,
  Usb,
  Moon,
} from "lucide-react";

const CHART_METRICS = [
  { key: "files_accessed", label: "Files Accessed", color: "#2563EB", icon: FileText },
  { key: "data_transfer_mb", label: "Data Transfer (MB)", color: "#7C3AED", icon: HardDrive },
  { key: "email_recipients_count", label: "External Email Recipients", color: "#0891B2", icon: Mail },
  { key: "failed_logins", label: "Failed Authentication Attempts", color: "#DC2626", icon: Lock },
  { key: "usb_events", label: "USB Storage Operations", color: "#EA580C", icon: Usb },
  { key: "after_hours_access", label: "After-Hours Activity Flags", color: "#D97706", icon: Moon },
];

const formatTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function InvestigationSteps({ score, logs }) {
  const hasUsbEvents = logs?.some((l) => l.usb_events > 0);
  const hasAfterHours = logs?.some((l) => l.after_hours_access);
  const hasFailedLogins = logs?.some((l) => l.failed_logins > 2);
  const hasDataTransfer = logs?.some((l) => l.data_transfer_mb > 200);

  const steps = [];
  if (score >= 80) {
    steps.push({
      text: "Immediately freeze sensitive repository permissions and file export access",
      priority: "critical",
    });
    steps.push({
      text: "Correlate off-hours network session IP addresses against known VPN pools",
      priority: "critical",
    });
  }
  if (hasUsbEvents) {
    steps.push({
      text: "Audit USB device serial numbers via endpoint management logs",
      priority: "high",
    });
  }
  if (hasDataTransfer) {
    steps.push({
      text: "Inspect egress firewall logs to identify destination IP / cloud storage domains",
      priority: "high",
    });
  }
  if (hasAfterHours) {
    steps.push({
      text: "Verify whether off-hours access was pre-approved or part of on-call rotation",
      priority: "medium",
    });
  }
  if (hasFailedLogins) {
    steps.push({
      text: "Review auth failure strings to determine if password spraying was attempted",
      priority: "medium",
    });
  }
  steps.push({
    text: "Conduct an informal check-in with the employee's direct reporting manager",
    priority: "low",
  });

  const priorityStyle = {
    critical: "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]",
    high: "bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]",
    medium: "bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]",
    low: "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]",
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <ListChecks size={16} className="text-[#2563EB]" />
        <div>
          <h4 className="text-[14px] font-semibold text-[#0F172A]">
            Recommended SOC Investigation Steps
          </h4>
          <p className="text-[12px] text-[#64748B]">
            Automated checklist generated from the detected behavioral anomaly profile
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              priorityStyle[step.priority]
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/70 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 text-[13px] leading-relaxed">
              {step.text}
            </div>
            <span className="text-[10.5px] uppercase font-semibold tracking-wider opacity-80 shrink-0">
              {step.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchUserProfile(userId)
      .then(setProfile)
      .catch(() =>
        setError("Failed to load user investigation profile. The user may not exist or the backend is offline.")
      )
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="skeleton h-8 w-36" />
        <div className="skeleton h-32 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-64 rounded-lg" />
          <div className="skeleton h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="card text-center py-16 space-y-3">
          <AlertTriangle size={32} className="text-[#DC2626] mx-auto opacity-80" />
          <h3 className="text-[16px] font-semibold text-[#0F172A]">{error || "Profile not found"}</h3>
          <p className="text-[13px] text-[#64748B]">Unable to locate telemetry for user ID {userId}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary text-[13px] mx-auto mt-2">
            ← Return to Previous View
          </button>
        </div>
      </div>
    );
  }

  const logs = profile.logs || [];
  const isHighRisk = (profile.risk_score || 0) >= 65;

  const chartData = logs.map((log) => ({
    day: log.day,
    files_accessed: log.files_accessed,
    data_transfer_mb: log.data_transfer_mb,
    email_recipients_count: log.email_recipients_count,
    failed_logins: log.failed_logins,
    usb_events: log.usb_events,
    after_hours_access: log.after_hours_access,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Navigation Breadcrumb Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary text-[12.5px] flex items-center gap-1.5"
        >
          <ArrowLeft size={13} />
          <span>Back to Detections</span>
        </button>

        <span className="badge-blue text-[11px] font-medium">
          Detailed SOC Investigation
        </span>
      </div>

      {/* ── User Overview & Risk Gauge Card ─────────────────────────── */}
      <div className="card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* User Bio */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border-2 border-[#BFDBFE] flex items-center justify-center text-xl font-bold text-[#2563EB] shrink-0">
              {getInitials(profile.name)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-[#0F172A]">{profile.name}</h2>
                <span className="text-[12px] font-mono text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded">
                  {profile.user_id}
                </span>
                <span
                  className={`badge ${
                    profile.risk_score >= 80
                      ? "badge-critical"
                      : profile.risk_score >= 65
                      ? "badge-high"
                      : "badge-medium"
                  }`}
                >
                  Score {profile.risk_score?.toFixed(1)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-[12.5px] text-[#64748B] mt-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 size={13} className="text-[#94A3B8]" />
                  {profile.department || "Enterprise"}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-[#94A3B8]" />
                  45-Day Baseline Active
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5 text-[#16A34A] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  Monitored Account
                </span>
              </div>
            </div>
          </div>

          {/* Risk Gauge Visual */}
          <div className="self-center md:self-auto border-t md:border-t-0 md:border-l border-[#E2E8F0] pt-4 md:pt-0 md:pl-8">
            <RiskScoreCard score={profile.risk_score || 0} />
          </div>
        </div>
      </div>

      {/* ── Explainable AI: SHAP Feature Attribution ───────────────── */}
      <SHAPExplanation explanation={profile.explanation} isHighRisk={isHighRisk} />

      {/* ── Suspicious Activity Timelines (6 Metric Panels) ─────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Historical Behavioral Telemetry
            </h3>
            <p className="text-[12px] text-[#64748B]">
              Rolling 45-day activity vectors against baseline statistical thresholds
            </p>
          </div>
          <span className="text-[11px] text-[#94A3B8]">D1 = 45 days ago · D45 = Today</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHART_METRICS.map(({ key, label, color, icon: Icon }) => (
            <div key={key} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0F172A]">
                  <Icon size={14} style={{ color }} />
                  <span>{label}</span>
                </div>
                <span className="text-[11px] text-[#94A3B8] font-mono">{key}</span>
              </div>
              <BehaviourChart
                data={chartData}
                dataKey={key}
                color={color}
                height={120}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Recommended Investigative Steps ─────────────────────────── */}
      <InvestigationSteps score={profile.risk_score || 0} logs={logs} />

      {/* ── Related Events Log Table ─────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h4 className="text-[14px] font-semibold text-[#0F172A]">
              Recorded Behavioral Events Audit
            </h4>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              Daily aggregates fed into feature extraction and anomaly scoring
            </p>
          </div>
          <span className="badge-neutral text-[11px] font-mono">
            {logs.length} Log Cycles
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Day</th>
                <th className="py-2.5 px-4">Files</th>
                <th className="py-2.5 px-4">Transfer</th>
                <th className="py-2.5 px-4">Emails</th>
                <th className="py-2.5 px-4">Auth Fails</th>
                <th className="py-2.5 px-4">USB Ops</th>
                <th className="py-2.5 px-4">Schedule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
              {logs.slice().reverse().map((row, i) => (
                <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-4 font-medium text-[#0F172A]">Day {row.day}</td>
                  <td className="py-2 px-4 text-[#475569] tabular-nums">{row.files_accessed}</td>
                  <td className="py-2 px-4 text-[#475569] tabular-nums">{row.data_transfer_mb} MB</td>
                  <td className="py-2 px-4 text-[#475569] tabular-nums">{row.email_recipients_count}</td>
                  <td className={`py-2 px-4 tabular-nums font-semibold ${row.failed_logins > 0 ? "text-[#DC2626]" : "text-[#64748B]"}`}>
                    {row.failed_logins}
                  </td>
                  <td className={`py-2 px-4 tabular-nums font-semibold ${row.usb_events > 0 ? "text-[#EA580C]" : "text-[#64748B]"}`}>
                    {row.usb_events}
                  </td>
                  <td className="py-2 px-4">
                    {row.after_hours_access ? (
                      <span className="text-[11px] font-medium text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded">
                        After-Hours
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#64748B]">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
