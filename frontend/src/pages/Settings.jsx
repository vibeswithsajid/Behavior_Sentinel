import { useState } from "react";
import {
  Settings as SettingsIcon,
  Sliders,
  Shield,
  Bell,
  Database,
  Webhook,
  CheckCircle2,
  Save,
} from "lucide-react";

export default function Settings() {
  const [criticalThreshold, setCriticalThreshold] = useState(80);
  const [highThreshold, setHighThreshold] = useState(65);
  const [mediumThreshold, setMediumThreshold] = useState(40);
  const [isoWeight, setIsoWeight] = useState(60);
  const [autoSaveToast, setAutoSaveToast] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setAutoSaveToast(true);
    setTimeout(() => setAutoSaveToast(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-[#0F172A]">Platform Settings</h2>
            <span className="badge-neutral text-[11px]">SOC Configuration</span>
          </div>
          <p className="text-[13px] text-[#64748B]">
            Configure behavioral thresholds, webhook endpoints, and detection ensemble parameters.
          </p>
        </div>
        {autoSaveToast && (
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-md animate-fade-in">
            <CheckCircle2 size={15} />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Detection Thresholds */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <Sliders size={16} className="text-[#2563EB]" />
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Anomaly Scoring & Risk Thresholds
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-[12.5px] font-medium text-[#0F172A] mb-1">
                Critical Alert Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                  className="input text-[13px] w-24"
                />
                <span className="text-[12px] text-[#DC2626] font-medium">≥ {criticalThreshold} Score</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1.5">
                Automatically triggers immediate SOC alert and incident card.
              </p>
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-[#0F172A] mb-1">
                High Risk Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="40"
                  max="90"
                  value={highThreshold}
                  onChange={(e) => setHighThreshold(Number(e.target.value))}
                  className="input text-[13px] w-24"
                />
                <span className="text-[12px] text-[#EA580C] font-medium">≥ {highThreshold} Score</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1.5">
                Elevates to Investigation Queue for analyst review.
              </p>
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-[#0F172A] mb-1">
                Medium Risk Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="20"
                  max="60"
                  value={mediumThreshold}
                  onChange={(e) => setMediumThreshold(Number(e.target.value))}
                  className="input text-[13px] w-24"
                />
                <span className="text-[12px] text-[#D97706] font-medium">≥ {mediumThreshold} Score</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1.5">
                Logs behavioral flag without immediate escalation.
              </p>
            </div>
          </div>
        </div>

        {/* Telemetry Webhook Ingestion */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <Webhook size={16} className="text-[#2563EB]" />
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Telemetry Ingestion Webhook
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[12.5px] font-medium text-[#0F172A] mb-1">
                Client EDR Webhook URL
              </label>
              <input
                type="text"
                readOnly
                value="http://localhost:8000/api/telemetry/event"
                className="input font-mono text-[12px] bg-[#F8FAFC] text-[#334155]"
              />
              <p className="text-[11.5px] text-[#64748B] mt-1">
                External clients (e.g. Apex Global intranet on port 3000) post user events directly to this endpoint.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span className="text-[13px] font-medium text-[#0F172A]">Ingestion Active</span>
              <span className="text-[12px] text-[#64748B]">· Sub-50ms inference enabled</span>
            </div>
          </div>
        </div>

        {/* Model Ensemble Weights */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <Shield size={16} className="text-[#2563EB]" />
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Ensemble Model Weighting
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-[#0F172A]">
                Isolation Forest: <span className="text-[#2563EB] font-bold">{isoWeight}%</span>
              </span>
              <span className="font-medium text-[#0F172A]">
                Deep Autoencoder: <span className="text-[#7C3AED] font-bold">{100 - isoWeight}%</span>
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="80"
              value={isoWeight}
              onChange={(e) => setIsoWeight(Number(e.target.value))}
              className="w-full accent-[#2563EB]"
            />
            <p className="text-[11.5px] text-[#64748B]">
              Balances statistical outlier isolation with neural network reconstruction loss.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary flex items-center gap-2 text-[13px]">
            <Save size={15} />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
