import { useNavigate } from "react-router-dom";

const scoreColor = (score) => {
  if (score >= 80) return "text-critical";
  if (score >= 65) return "text-high";
  if (score >= 40) return "text-medium";
  return "text-low";
};

const scoreBorderColor = (score) => {
  if (score >= 80) return "border-critical/40 glow-red";
  if (score >= 65) return "border-high/40 glow-red";
  if (score >= 40) return "border-medium/40 glow-yellow";
  return "border-low/30";
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
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleString();
};

/**
 * A single alert card in the alert queue.
 */
export default function AlertCard({ alert, onDismiss, dismissing, style }) {
  const navigate = useNavigate();

  return (
    <div
      id={`alert-card-${alert.id}`}
      className={`card border animate-slide-up ${scoreBorderColor(alert.risk_score)} transition-all duration-200`}
      style={style}
    >
      <div className="flex items-start gap-4">

        {/* Score ring (compact) */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
          <div
            className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold font-mono text-sm"
            style={{
              borderColor: alert.risk_score >= 80 ? "#dc2626" : alert.risk_score >= 65 ? "#ef4444" : "#f59e0b",
              color:       alert.risk_score >= 80 ? "#dc2626" : alert.risk_score >= 65 ? "#ef4444" : "#f59e0b",
              boxShadow:   `0 0 12px ${alert.risk_score >= 65 ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
            }}
          >
            {alert.risk_score?.toFixed(0)}
          </div>
          <span className={`${scoreBadge(alert.risk_score)} text-[10px] px-1.5 py-0.5`}>
            {scoreLabel(alert.risk_score)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <button
              className="font-semibold text-white hover:text-accent-light transition-colors duration-150 text-left"
              onClick={() => navigate(`/user/${alert.user_id}`)}
            >
              {alert.name || alert.user_id}
            </button>
            <span className="text-muted text-xs font-mono">{alert.user_id}</span>
            <span className="text-border text-xs">·</span>
            <span className="text-muted text-xs">{alert.department}</span>
          </div>

          {/* SHAP explanation */}
          {alert.explanation ? (
            <p className={`text-sm leading-relaxed mt-1 ${alert.risk_score >= 65 ? "text-slate-300" : "text-muted"}`}>
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mr-2 mb-0.5
                  ${alert.risk_score >= 80 ? "bg-critical" : alert.risk_score >= 65 ? "bg-high" : "bg-medium"}`}
              />
              {alert.explanation}
            </p>
          ) : (
            <p className="text-sm text-muted mt-1 italic">Generating explanation…</p>
          )}

          <div className="flex items-center gap-4 mt-2">
            <span className="text-[11px] text-muted font-mono">
              Detected: {formatTime(alert.created_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            id={`btn-view-user-${alert.user_id}`}
            className="btn-ghost text-xs py-1.5 px-3"
            onClick={() => navigate(`/user/${alert.user_id}`)}
          >
            View Profile
          </button>
          <button
            id={`btn-dismiss-${alert.id}`}
            className="text-xs text-muted hover:text-low border border-border hover:border-low/40
                       hover:bg-low/5 px-3 py-1.5 rounded-lg transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => onDismiss(alert.id)}
            disabled={dismissing}
          >
            {dismissing ? "Dismissing…" : "✓ Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}
