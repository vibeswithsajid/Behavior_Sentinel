import { useEffect, useState, useMemo } from "react";
import { fetchAlerts, dismissAlert } from "../api";
import AlertCard from "../components/AlertCard";

export default function AlertQueue() {
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState("all"); // all | critical | high | medium
  const [dismissing, setDismissing] = useState(new Set());

  const loadAlerts = async () => {
    try {
      setError(null);
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      setError("Failed to load alerts. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const handleDismiss = async (alertId) => {
    setDismissing(prev => new Set(prev).add(alertId));
    try {
      await dismissAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      setError("Failed to dismiss alert.");
    } finally {
      setDismissing(prev => { const s = new Set(prev); s.delete(alertId); return s; });
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all")      return alerts;
    if (filter === "critical") return alerts.filter(a => a.risk_score >= 80);
    if (filter === "high")     return alerts.filter(a => a.risk_score >= 65 && a.risk_score < 80);
    if (filter === "medium")   return alerts.filter(a => a.risk_score < 65);
    return alerts;
  }, [alerts, filter]);

  const counts = useMemo(() => ({
    all:      alerts.length,
    critical: alerts.filter(a => a.risk_score >= 80).length,
    high:     alerts.filter(a => a.risk_score >= 65 && a.risk_score < 80).length,
    medium:   alerts.filter(a => a.risk_score < 65).length,
  }), [alerts]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Alert Queue</h2>
          <p className="text-sm text-muted mt-0.5">
            {alerts.length} active alert{alerts.length !== 1 ? "s" : ""} requiring analyst review
          </p>
        </div>

        {/* Auto-refresh indicator */}
        <button
          id="btn-refresh-alerts"
          onClick={() => { setLoading(true); loadAlerts(); }}
          className="btn-ghost"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-high/10 border border-high/30 text-high rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all",      label: "All",      color: "text-slate-300" },
          { key: "critical", label: "Critical",  color: "text-critical" },
          { key: "high",     label: "High",      color: "text-high" },
          { key: "medium",   label: "Medium",    color: "text-medium" },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            id={`alert-filter-${key}`}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                        transition-all duration-150 border
                        ${filter === key
                          ? "bg-accent/10 border-accent/40 text-accent"
                          : "border-border text-muted hover:text-slate-300 hover:border-border/80"
                        }`}
          >
            {label}
            <span className={`text-xs font-bold ${filter === key ? "text-accent" : color}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-low/10 border border-low/30 flex items-center justify-center text-2xl">
            ✓
          </div>
          <div>
            <p className="text-low font-semibold">No alerts in this category</p>
            <p className="text-muted text-sm mt-1">All clear — no threats detected at this severity level.</p>
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
