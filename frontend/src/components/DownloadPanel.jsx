import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_BASE = "http://localhost:8000";

function DownloadButton({ label, endpoint, token, minRole, userRole, filename }) {
  const ROLE_LEVELS = { intern: 1, junior: 2, senior_manager: 3, manager: 4 };
  const allowed = (ROLE_LEVELS[userRole] || 0) >= (ROLE_LEVELS[minRole] || 0);

  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await axios.get(`${API_BASE}${endpoint}`, {
        headers:      { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url  = URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError(e?.response?.status === 403 ? "Access denied" : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/40 opacity-40 cursor-not-allowed">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-[10px] text-muted border border-border/40 px-2 py-0.5 rounded font-mono">
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
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-150
        ${done
          ? "border-low/50 bg-low/10 text-low"
          : "border-border hover:border-accent/40 hover:bg-accent/5 text-slate-300 hover:text-white"
        }`}
    >
      <span className="text-xs font-medium">
        {loading ? "Downloading…" : done ? "✓ Downloaded" : label}
      </span>
      {!loading && !done && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      {error && <span className="text-[10px] text-high">{error}</span>}
    </button>
  );
}

export default function DownloadPanel() {
  const { user } = useAuth();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const downloads = [
    {
      label:    "My Activity Report",
      endpoint: "/api/download/my-report",
      minRole:  "intern",
      filename: `my_activity_${today}.csv`,
    },
    {
      label:    "Team Risk Scores",
      endpoint: "/api/download/team-report",
      minRole:  "junior",
      filename: `team_risk_scores_${today}.csv`,
    },
    {
      label:    "Active Alerts Report",
      endpoint: "/api/download/alerts-report",
      minRole:  "senior_manager",
      filename: `alerts_${today}.csv`,
    },
    {
      label:    "Full Dataset (ZIP)",
      endpoint: "/api/download/full-report",
      minRole:  "manager",
      filename: `behaviorsentinel_full_${today}.zip`,
    },
  ];

  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <h3 className="text-sm font-semibold text-white">Downloads</h3>
        <span className="ml-auto text-[10px] text-muted border border-border/50 px-2 py-0.5 rounded font-mono">
          {user.role.replace("_", " ")}
        </span>
      </div>
      <div className="space-y-2">
        {downloads.map(d => (
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
