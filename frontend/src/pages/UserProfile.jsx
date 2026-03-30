import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUserProfile } from "../api";
import BehaviourChart   from "../components/BehaviourChart";
import RiskScoreCard    from "../components/RiskScoreCard";
import SHAPExplanation  from "../components/SHAPExplanation";

const CHART_METRICS = [
  { key: "files_accessed",         label: "Files Accessed",          color: "#6366f1" },
  { key: "data_transfer_mb",       label: "Data Transfer (MB)",      color: "#ef4444" },
  { key: "email_recipients_count", label: "Email Recipients",        color: "#f59e0b" },
  { key: "failed_logins",          label: "Failed Logins",           color: "#dc2626" },
  { key: "usb_events",             label: "USB Events",              color: "#8b5cf6" },
  { key: "after_hours_access",     label: "After-Hours Access",      color: "#f97316" },
];

const scoreColor = (score) => {
  if (score >= 80) return "#dc2626";
  if (score >= 65) return "#ef4444";
  if (score >= 40) return "#f59e0b";
  return "#22c55e";
};

export default function UserProfile() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchUserProfile(userId)
      .then(setProfile)
      .catch(() => setError("Failed to load user profile."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_,i) => <div key={i} className="skeleton h-48 w-full rounded-xl" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="card text-center py-12">
        <p className="text-high text-lg">{error}</p>
        <button className="btn-ghost mt-4 mx-auto" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </div>
  );

  if (!profile) return null;

  const logs = profile.logs || [];

  // Build chart data: aggregate per day
  const chartData = logs.map(log => ({
    day:                   log.day,
    files_accessed:        log.files_accessed,
    data_transfer_mb:      log.data_transfer_mb,
    email_recipients_count: log.email_recipients_count,
    failed_logins:         log.failed_logins,
    usb_events:            log.usb_events,
    after_hours_access:    log.after_hours_access,
  }));

  const isHighRisk = profile.risk_score >= 65;

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* Back button + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button id="btn-back" className="btn-ghost" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-muted text-sm font-mono">{profile.user_id}</span>
              <span className="text-border">·</span>
              <span className="text-muted text-sm">{profile.department}</span>
            </div>
          </div>
        </div>
        <RiskScoreCard score={profile.risk_score} />
      </div>

      {/* SHAP explanation (only if risk > 40) */}
      {profile.explanation && (
        <SHAPExplanation
          explanation={profile.explanation}
          isHighRisk={isHighRisk}
        />
      )}

      {/* Risk score trend (using daily deviation as proxy) */}
      {logs.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Risk Score Trend</h3>
          <BehaviourChart
            data={chartData.map(d => ({
              day: d.day,
              score: Math.min(
                100,
                Math.max(0,
                  (d.files_accessed / 150 * 30) +
                  (d.data_transfer_mb / 500 * 30) +
                  (d.after_hours_access * 20) +
                  (d.failed_logins / 10 * 20)
                )
              )
            }))}
            dataKey="score"
            label="Composite Risk"
            color={scoreColor(profile.risk_score)}
            yDomain={[0, 100]}
            referenceLine={65}
          />
        </div>
      )}

      {/* Per-metric charts grid */}
      <div>
        <h3 className="font-semibold text-white mb-4">Behavioural Metrics — 60 Day History</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {CHART_METRICS.map(({ key, label, color }) => (
            <div key={key} className="card">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">{label}</h4>
              <BehaviourChart
                data={chartData}
                dataKey={key}
                label={label}
                color={color}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Raw log table (last 10 days) */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">
          Activity Log — Last 10 Days
          <span className="text-xs text-muted font-normal ml-2">(most recent first)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted uppercase tracking-wide">
                {["Day","Login Hr","Files","Transfer MB","Failed Logins","After Hrs","USB","Email Recipients"].map(h => (
                  <th key={h} className="text-left py-2.5 px-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().slice(0, 10).map(log => (
                <tr key={log.day} className="border-b border-border/30 hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 font-mono text-muted">{log.day}</td>
                  <td className="py-2.5 px-2">{log.login_hour}:00</td>
                  <td className={`py-2.5 px-2 font-semibold ${log.files_accessed > 80 ? "text-high" : "text-slate-200"}`}>
                    {log.files_accessed}
                  </td>
                  <td className={`py-2.5 px-2 font-semibold ${log.data_transfer_mb > 200 ? "text-high" : "text-slate-200"}`}>
                    {log.data_transfer_mb?.toFixed(1)}
                  </td>
                  <td className={`py-2.5 px-2 ${log.failed_logins > 2 ? "text-medium" : "text-slate-300"}`}>
                    {log.failed_logins}
                  </td>
                  <td className="py-2.5 px-2">
                    {log.after_hours_access
                      ? <span className="text-high font-semibold">Yes</span>
                      : <span className="text-muted">No</span>
                    }
                  </td>
                  <td className={`py-2.5 px-2 ${log.usb_events > 0 ? "text-medium" : "text-muted"}`}>
                    {log.usb_events}
                  </td>
                  <td className="py-2.5 px-2 text-slate-300">{log.email_recipients_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
