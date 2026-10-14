import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  ArrowRight,
  Check,
  Clock,
  User,
  Building2,
  Cpu,
} from "lucide-react";

const getRiskBadge = (score) => {
  if (score >= 80) return "badge-critical";
  if (score >= 65) return "badge-high";
  if (score >= 40) return "badge-medium";
  return "badge-low";
};

const getRiskLabel = (score) => {
  if (score >= 80) return "Critical Threat";
  if (score >= 65) return "High Risk";
  if (score >= 40) return "Medium Risk";
  return "Low Risk";
};

const formatTime = (iso) => {
  if (!iso) return "Recent";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AlertCard({ alert, onDismiss, dismissing, style }) {
  const navigate = useNavigate();

  return (
    <div
      id={`alert-card-${alert.id}`}
      className="card hover:border-[#CBD5E1] transition-all duration-200"
      style={style}
    >
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Score indicator badge */}
        <div
          className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-lg border ${
            alert.risk_score >= 80
              ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
              : alert.risk_score >= 65
              ? "bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]"
              : "bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]"
          }`}
        >
          <span className="text-lg font-bold tabular-nums">
            {alert.risk_score?.toFixed(0)}
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider opacity-80 -mt-0.5">
            Score
          </span>
        </div>

        {/* Content Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="text-[14px] font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                onClick={() => navigate(`/user/${alert.user_id}`)}
              >
                {alert.name || alert.user_id}
              </button>
              <span className="text-[11.5px] font-mono text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] px-1.5 py-0.5 rounded">
                {alert.user_id}
              </span>
              <span className="text-[12px] text-[#64748B] flex items-center gap-1">
                <Building2 size={12} className="text-[#94A3B8]" />
                {alert.department || "General"}
              </span>
              <span className={getRiskBadge(alert.risk_score)}>
                {getRiskLabel(alert.risk_score)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id={`btn-view-user-${alert.user_id}`}
                className="btn-primary text-[12px] py-1 px-3"
                onClick={() => navigate(`/user/${alert.user_id}`)}
              >
                <span>Investigate</span>
                <ArrowRight size={12} />
              </button>
              <button
                id={`btn-dismiss-${alert.id}`}
                className="btn-secondary text-[12px] py-1 px-2.5"
                onClick={() => onDismiss(alert.id)}
                disabled={dismissing}
              >
                {dismissing ? "Dismissing…" : "Dismiss"}
              </button>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3.5 py-2.5 my-2">
            <p className="text-[13px] text-[#334155] leading-relaxed">
              {alert.explanation || "Evaluating SHAP attribution vector across 7 behavioral dimensions…"}
            </p>
          </div>

          {/* Meta footer */}
          <div className="flex items-center gap-4 text-[11.5px] text-[#94A3B8] pt-1">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Detected {formatTime(alert.created_at)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Cpu size={12} />
              Isolation Forest + Autoencoder Ensemble
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
