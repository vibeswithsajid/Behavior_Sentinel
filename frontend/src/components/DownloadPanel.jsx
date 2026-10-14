import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Download, CheckCircle2, AlertTriangle, FileSpreadsheet, Archive } from "lucide-react";

const API_BASE = "http://localhost:8000";
const ROLE_LEVELS = { intern: 1, junior: 2, senior_manager: 3, manager: 4 };

function DownloadButton({ label, endpoint, token, minRole, userRole, filename, description }) {
  const allowed = (ROLE_LEVELS[userRole] || 0) >= (ROLE_LEVELS[minRole] || 0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await axios.get(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError(e?.response?.status === 403 ? "Access restricted" : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const isZip = filename.endsWith(".zip");

  if (!allowed) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] opacity-60 cursor-not-allowed">
        <div className="flex items-center gap-2.5">
          {isZip ? <Archive size={16} className="text-[#94A3B8]" /> : <FileSpreadsheet size={16} className="text-[#94A3B8]" />}
          <div>
            <div className="text-[13px] font-medium text-[#94A3B8]">{label}</div>
            <div className="text-[11px] text-[#94A3B8]">{description}</div>
          </div>
        </div>
        <span className="badge-neutral text-[10.5px] uppercase tracking-wider font-semibold">
          {minRole.replace("_", " ")}+
        </span>
      </div>
    );
  }

  return (
    <button
      id={`download-${filename.split(".")[0]}`}
      onClick={handleDownload}
      disabled={loading}
      className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-left transition-all ${
        done
          ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]"
          : error
          ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
          : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#CBD5E1] text-[#0F172A]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${done ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#2563EB]"}`}>
          {done ? (
            <CheckCircle2 size={16} />
          ) : error ? (
            <AlertTriangle size={16} />
          ) : isZip ? (
            <Archive size={16} />
          ) : (
            <FileSpreadsheet size={16} />
          )}
        </div>
        <div>
          <div className="text-[13px] font-semibold">
            {loading ? "Generating export…" : done ? "Export downloaded" : error || label}
          </div>
          <div className="text-[11.5px] text-[#64748B]">{description}</div>
        </div>
      </div>
      <span className="text-[11px] font-mono text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded">
        {isZip ? "ZIP" : "CSV"}
      </span>
    </button>
  );
}

export default function DownloadPanel() {
  const { user } = useAuth();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const downloads = [
    {
      label: "My Activity Audit Log",
      description: "Personal 14-day workstation telemetry and login events",
      endpoint: "/api/download/my-report",
      minRole: "intern",
      filename: `my_activity_${today}.csv`,
    },
    {
      label: "Fleet Risk Scores Matrix",
      description: "Current anomaly scores for all monitored users across teams",
      endpoint: "/api/download/team-report",
      minRole: "junior",
      filename: `team_risk_scores_${today}.csv`,
    },
    {
      label: "Active Incidents & Alerts Report",
      description: "Summary of unhandled high and critical security alerts",
      endpoint: "/api/download/alerts-report",
      minRole: "senior_manager",
      filename: `alerts_${today}.csv`,
    },
    {
      label: "Full Telemetry & Model Archive",
      description: "Complete feature matrix, CSV logs, and risk database archive",
      endpoint: "/api/download/full-report",
      minRole: "manager",
      filename: `behaviorsentinel_full_${today}.zip`,
    },
  ];

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0F172A]">Security Audit Exports</h3>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Download encrypted compliance reports and raw telemetry data
          </p>
        </div>
        <span className="badge-neutral text-[11px] capitalize">
          {user.role?.replace("_", " ")} clearance
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {downloads.map((d) => (
          <DownloadButton
            key={d.filename}
            {...d}
            token={user.token}
            userRole={user.role}
          />
        ))}
      </div>
    </div>
  );
}
