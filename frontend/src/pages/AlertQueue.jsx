import { useEffect, useState, useMemo } from "react";
import { fetchAlerts, dismissAlert } from "../api";
import AlertCard from "../components/AlertCard";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Filter,
  ShieldCheck,
} from "lucide-react";

export default function AlertQueue() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dismissing, setDismissing] = useState(new Set());

  const loadAlerts = async () => {
    try {
      setError(null);
      const data = await fetchAlerts();
      setAlerts(data || []);
    } catch {
      setError("Failed to load investigation queue. Ensure the backend engine is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleDismiss = async (alertId) => {
    setDismissing((prev) => new Set(prev).add(alertId));
    try {
      await dismissAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      setError("Failed to dismiss alert.");
    } finally {
      setDismissing((prev) => {
        const s = new Set(prev);
        s.delete(alertId);
        return s;
      });
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    if (filter === "critical") return alerts.filter((a) => a.risk_score >= 80);
    if (filter === "high") return alerts.filter((a) => a.risk_score >= 65 && a.risk_score < 80);
    if (filter === "medium") return alerts.filter((a) => a.risk_score < 65);
    return alerts;
  }, [alerts, filter]);

  const counts = useMemo(
    () => ({
      all: alerts.length,
      critical: alerts.filter((a) => a.risk_score >= 80).length,
      high: alerts.filter((a) => a.risk_score >= 65 && a.risk_score < 80).length,
      medium: alerts.filter((a) => a.risk_score < 65).length,
    }),
    [alerts]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-[#0F172A]">Investigation Queue</h2>
            <span className="badge-critical text-[11px] font-medium">
              {alerts.length} Active {alerts.length === 1 ? "Incident" : "Incidents"}
            </span>
          </div>
          <p className="text-[13px] text-[#64748B]">
            Prioritized review queue for anomalous employee actions flagged by ensemble inference.
          </p>
        </div>

        <button
          id="btn-refresh-alerts"
          onClick={() => {
            setLoading(true);
            loadAlerts();
          }}
          className="btn-secondary text-[13px] self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Error Banner */}
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-lg p-1 w-fit shadow-card">
        {[
          { key: "all", label: "All Incidents", count: counts.all },
          { key: "critical", label: "Critical", count: counts.critical },
          { key: "high", label: "High Risk", count: counts.high },
          { key: "medium", label: "Medium", count: counts.medium },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            id={`alert-filter-${key}`}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
              filter === key
                ? "bg-[#0F172A] text-white font-semibold"
                : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
            }`}
          >
            <span>{label}</span>
            <span
              className={`text-[10.5px] px-1.5 py-0.2 rounded-full tabular-nums font-semibold ${
                filter === key ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts Stream */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto text-[#16A34A]">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#0F172A]">
              Queue cleared for this category
            </h3>
            <p className="text-[13px] text-[#64748B] mt-1 max-w-md mx-auto">
              All monitored users in this severity tier are behaving consistently with their historical statistical baselines.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert, idx) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={handleDismiss}
              dismissing={dismissing.has(alert.id)}
              style={{ animationDelay: `${idx * 40}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
