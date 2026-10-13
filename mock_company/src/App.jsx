import { useState, useEffect } from "react";
import axios from "axios";

const SENTINEL_API = "http://localhost:8000/api/telemetry/event";

const EMPLOYEES = [
  {
    id: "intern01",
    name: "Alex Rivera",
    role: "Intern",
    roleLevel: "intern",
    department: "Engineering",
    avatar: "AR",
    color: "from-emerald-500 to-teal-700",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  {
    id: "junior01",
    name: "Jordan Kim",
    role: "Junior Analyst",
    roleLevel: "junior",
    department: "Finance",
    avatar: "JK",
    color: "from-blue-500 to-indigo-700",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    id: "senior_mgr",
    name: "Morgan Singh",
    role: "Senior Manager",
    roleLevel: "senior_manager",
    department: "Operations",
    avatar: "MS",
    color: "from-amber-500 to-orange-700",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  {
    id: "manager",
    name: "Taylor Brooks",
    role: "Executive Director",
    roleLevel: "manager",
    department: "Management",
    avatar: "TB",
    color: "from-rose-500 to-red-700",
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
];

const VAULT_FILES = [
  {
    id: "f1",
    name: "Sprint_Backlog_Q4.xlsx",
    category: "Standard Project File",
    sizeMb: 1.4,
    sensitivity: "Public Internal",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: "📄",
    recommendedRole: "All Roles",
  },
  {
    id: "f2",
    name: "Engineering_System_Architecture.pdf",
    category: "Technical Specs",
    sizeMb: 4.8,
    sensitivity: "Internal Engineering",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    icon: "📐",
    recommendedRole: "Engineering",
  },
  {
    id: "f3",
    name: "Q4_Confidential_Financial_Projections.xlsx",
    category: "Financial Forecasts",
    sizeMb: 45.0,
    sensitivity: "Confidential",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: "📊",
    recommendedRole: "Finance & Execs",
  },
  {
    id: "f4",
    name: "Customer_PII_SSN_Master_Database.zip",
    category: "Core Customer Vault",
    sizeMb: 850.0,
    sensitivity: "CRITICAL RESTRICTED",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold",
    icon: "🗄️",
    recommendedRole: "CISO Only",
    isHighRisk: true,
  },
  {
    id: "f5",
    name: "Production_IAM_Keys_and_Certs.tar.gz",
    category: "Credentials & Secrets",
    sizeMb: 12.0,
    sensitivity: "CRITICAL RESTRICTED",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold",
    icon: "🔑",
    recommendedRole: "DevOps Lead",
    isHighRisk: true,
  },
  {
    id: "f6",
    name: "Apex_Proprietary_Source_Code_Git.bundle",
    category: "Intellectual Property",
    sizeMb: 340.0,
    sensitivity: "IP RESTRICTED",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold",
    icon: "💻",
    recommendedRole: "Core Dev Only",
    isHighRisk: true,
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(EMPLOYEES[0]);
  const [isNightMode, setIsNightMode] = useState(false);
  const [activeTab, setActiveTab] = useState("vault"); // "vault" | "scenarios" | "custom"
  const [sending, setSending] = useState(false);
  const [lastVerdict, setLastVerdict] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);
  const [toast, setToast] = useState(null);

  // Custom simulator state
  const [customFiles, setCustomFiles] = useState(12);
  const [customMb, setCustomMb] = useState(15);
  const [customFails, setCustomFails] = useState(0);
  const [customUsb, setCustomUsb] = useState(0);
  const [customHour, setCustomHour] = useState(10);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const dispatchTelemetry = async (action, details, title) => {
    setSending(true);
    const hour = isNightMode ? 2 : (details.hour ?? 11);
    const payload = {
      user_id: currentUser.id,
      action: action,
      details: {
        ...details,
        hour: hour,
        is_after_hours: hour < 9 || hour >= 18 ? 1 : 0,
        performed_by_name: currentUser.name,
        role: currentUser.roleLevel,
      },
      source_app: "Apex Global Workspace",
    };

    try {
      const resp = await axios.post(SENTINEL_API, payload);
      const verdict = resp.data;
      setLastVerdict(verdict);
      setEventHistory((prev) => [verdict, ...prev.slice(0, 19)]);

      if (verdict.alert_triggered) {
        showToast(
          `🚨 ANOMALY FLAGGED: Risk Score ${verdict.risk_score} (${verdict.severity.toUpperCase()}) — Sentinel Alert Generated!`,
          "danger"
        );
      } else {
        showToast(
          `✓ Telemetry shipped: Risk Score ${verdict.risk_score} (Normal Baseline)`,
          "success"
        );
      }
    } catch (err) {
      console.error("Telemetry failed:", err);
      showToast("⚠ Could not reach BehaviorSentinel (localhost:8000)", "warning");
    } finally {
      setSending(false);
    }
  };

  const handleDownloadFile = (file, isExfiltration = false) => {
    const size = isExfiltration ? file.sizeMb * 1.5 : file.sizeMb;
    dispatchTelemetry(
      isExfiltration ? "mass_exfiltration" : "download",
      {
        filename: file.name,
        bytes_mb: size,
        files_count: isExfiltration ? 25 : 1,
        usb_events: isExfiltration ? 1 : 0,
      },
      `Download ${file.name}`
    );
  };

  const runScenario = (scenario) => {
    switch (scenario) {
      case "rogue_intern":
        setIsNightMode(true);
        dispatchTelemetry(
          "mass_exfiltration",
          {
            filename: "Customer_PII_SSN_Master_Database.zip",
            bytes_mb: 850.0,
            files_count: 94,
            hour: 2,
            is_after_hours: 1,
            usb_events: 2,
            failed_count: 1,
          },
          "Rogue Intern Data Exfiltration"
        );
        break;

      case "credential_stuffing":
        setIsNightMode(true);
        dispatchTelemetry(
          "failed_login",
          {
            filename: "Internal_Auth_Gateway",
            failed_count: 12,
            hour: 23,
            is_after_hours: 1,
            bytes_mb: 2.0,
            files_count: 4,
          },
          "Credential Stuffing Attack"
        );
        break;

      case "mass_harvesting":
        dispatchTelemetry(
          "file_access",
          {
            filename: "Department_Shares_Crawler",
            files_count: 88,
            bytes_mb: 180.0,
            hour: isNightMode ? 3 : 14,
            usb_events: 0,
          },
          "Mass Directory Harvesting"
        );
        break;

      case "usb_exfiltration":
        dispatchTelemetry(
          "usb_export",
          {
            filename: "Encrypted_Source_Bundle.tar.gz",
            bytes_mb: 320.0,
            files_count: 14,
            usb_events: 3,
            hour: isNightMode ? 1 : 16,
          },
          "Unauthorized USB Device Exfiltration"
        );
        break;

      case "normal_routine":
        setIsNightMode(false);
        dispatchTelemetry(
          "file_access",
          {
            filename: "Sprint_Backlog_Q4.xlsx",
            bytes_mb: 1.4,
            files_count: 2,
            hour: 10,
            is_after_hours: 0,
            failed_count: 0,
            usb_events: 0,
          },
          "Normal Daily Routine"
        );
        break;

      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col font-sans">
      {/* Top Banner / Sentinel Status */}
      <div className="bg-[#111c38] border-b border-[#253560] px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-emerald-400 font-semibold tracking-wide">
            BEHAVIORSENTINEL EDR AGENT v2.4
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">
            Telemetry Target: <code className="text-blue-400">http://localhost:8000/api/telemetry/event</code>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 transition-colors"
          >
            <span>Open Sentinel SOC Panel (Port 5173)</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      {/* Main Enterprise Header */}
      <header className="bg-[#111c38]/80 backdrop-blur-md border-b border-[#253560] px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
              ⬡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">Apex Global Technologies</h1>
                <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                  Enterprise ERP
                </span>
              </div>
              <p className="text-xs text-slate-400">Internal Cloud Workplace & Document Vault</p>
            </div>
          </div>

          {/* User selector & Mode toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Night mode toggle */}
            <button
              onClick={() => setIsNightMode(!isNightMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isNightMode
                  ? "bg-purple-950/60 border-purple-500/50 text-purple-300 shadow-md shadow-purple-500/20"
                  : "bg-[#172346] border-[#253560] text-slate-300 hover:border-slate-500"
              }`}
            >
              <span>{isNightMode ? "🌙 Off-Hours Mode (02:00 AM)" : "☀️ Normal Hours (10:30 AM)"}</span>
              <span className={`w-2 h-2 rounded-full ${isNightMode ? "bg-purple-400 animate-pulse" : "bg-amber-400"}`} />
            </button>

            {/* Active employee selector */}
            <div className="flex items-center gap-2 bg-[#172346] border border-[#253560] rounded-xl p-1.5">
              <span className="text-xs text-slate-400 font-medium pl-2">Logged in as:</span>
              <div className="flex gap-1">
                {EMPLOYEES.map((emp) => {
                  const isSelected = emp.id === currentUser.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setCurrentUser(emp)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? `bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold`
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{emp.avatar}</span>
                      <span className="hidden sm:inline">{emp.name.split(" ")[0]}</span>
                      <span className="text-[10px] opacity-75">({emp.role})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border flex items-center gap-3 backdrop-blur-lg ${
              toast.type === "danger"
                ? "bg-rose-950/90 text-rose-200 border-rose-500/50"
                : toast.type === "warning"
                ? "bg-amber-950/90 text-amber-200 border-amber-500/50"
                : "bg-emerald-950/90 text-emerald-200 border-emerald-500/50"
            }`}
          >
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workplace Actions (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#253560] pb-3">
            <button
              onClick={() => setActiveTab("vault")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "vault"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              📁 Corporate Document Vault
            </button>
            <button
              onClick={() => setActiveTab("scenarios")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "scenarios"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              ⚡ Threat Scenario Playground ("The Holes")
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "custom"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🎛️ Custom Telemetry Injector
            </button>
          </div>

          {/* TAB 1: Corporate Document Vault */}
          {activeTab === "vault" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Confidential Enterprise Vault</h2>
                  <p className="text-xs text-slate-400">
                    Active user: <span className="text-blue-400 font-semibold">{currentUser.name}</span> ({currentUser.role}, {currentUser.department})
                  </p>
                </div>
                <span className="text-xs text-slate-400 bg-[#172346] px-3 py-1 rounded-lg border border-[#253560]">
                  {VAULT_FILES.length} Files Available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VAULT_FILES.map((file) => (
                  <div
                    key={file.id}
                    className={`corp-card relative flex flex-col justify-between hover:border-slate-400 ${
                      file.isHighRisk ? "border-rose-900/40 bg-gradient-to-b from-[#111c38] to-[#1c1226]" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{file.icon}</span>
                          <div>
                            <h3 className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-[220px]">
                              {file.name}
                            </h3>
                            <span className="text-[10px] text-slate-400">{file.category}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded border ${file.badgeColor}`}>
                          {file.sensitivity}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 my-2 pt-2 border-t border-[#253560]/60">
                        <span>File Size: <strong className="text-slate-200">{file.sizeMb} MB</strong></span>
                        <span>Access: {file.recommendedRole}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2">
                      <button
                        onClick={() => handleDownloadFile(file, false)}
                        disabled={sending}
                        className="corp-btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1.5"
                      >
                        <span>Download</span>
                        <span>↓</span>
                      </button>

                      {file.isHighRisk && (
                        <button
                          onClick={() => handleDownloadFile(file, true)}
                          disabled={sending}
                          title="Simulate massive abnormal download with USB export"
                          className="corp-btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <span>Exfiltrate</span>
                          <span>⚠</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Threat Scenario Playground */}
          {activeTab === "scenarios" && (
            <div className="space-y-4">
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4">
                <h2 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                  <span>⚡ Insider Threat Simulation Playground</span>
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Trigger multi-variable behavioural anomaly attacks with 1 click. Watch BehaviorSentinel
                  instantly evaluate the risk severity, generate mathematical SHAP attribution, and update the SOC alert queue.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scenario 1 */}
                <div className="corp-card border-rose-500/40 hover:border-rose-400 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                      Scenario A • Critical
                    </span>
                    <span className="text-lg">💣</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Disgruntled Intern Data Exfiltration</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Alex Rivera logs in at 02:00 AM, accesses 94 customer records, inserts external USB drive, and exports 850 MB confidential database.
                  </p>
                  <div className="mt-3 text-[11px] font-mono text-slate-300 bg-black/40 p-2 rounded">
                    <div>• bytes: 850 MB (30× baseline)</div>
                    <div>• after_hours: 1 (02:00 AM)</div>
                    <div>• usb_events: 2</div>
                  </div>
                  <button
                    onClick={() => runScenario("rogue_intern")}
                    disabled={sending}
                    className="w-full mt-4 corp-btn-danger text-xs py-2 flex items-center justify-center gap-2"
                  >
                    <span>Execute Exfiltration Attack</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Scenario 2 */}
                <div className="corp-card border-amber-500/40 hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                      Scenario B • High Risk
                    </span>
                    <span className="text-lg">🔓</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Credential Stuffing & Takeover</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    12 rapid failed authentication attempts followed by successful login from an unverified session at 23:00 PM.
                  </p>
                  <div className="mt-3 text-[11px] font-mono text-slate-300 bg-black/40 p-2 rounded">
                    <div>• failed_logins: 12</div>
                    <div>• hour: 23:00 (off-hours)</div>
                    <div>• baseline deviation: +13.8σ</div>
                  </div>
                  <button
                    onClick={() => runScenario("credential_stuffing")}
                    disabled={sending}
                    className="w-full mt-4 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Execute Brute-Force Attack</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Scenario 3 */}
                <div className="corp-card border-blue-500/40 hover:border-blue-400 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
                      Scenario C • Medium Risk
                    </span>
                    <span className="text-lg">📁</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Mass Directory Harvesting</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Employee systematically accesses 88 files across unauthorized departments in rapid succession.
                  </p>
                  <div className="mt-3 text-[11px] font-mono text-slate-300 bg-black/40 p-2 rounded">
                    <div>• files_accessed: 88 (vs 12 avg)</div>
                    <div>• data_transfer: 180 MB</div>
                    <div>• departments: Cross-boundary</div>
                  </div>
                  <button
                    onClick={() => runScenario("mass_harvesting")}
                    disabled={sending}
                    className="w-full mt-4 corp-btn-primary text-xs py-2 flex items-center justify-center gap-2"
                  >
                    <span>Execute Mass Harvesting</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Scenario 4 */}
                <div className="corp-card border-emerald-500/40 hover:border-emerald-400 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      Scenario D • Low / Benign
                    </span>
                    <span className="text-lg">🕊️</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Normal Business Day Routine</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Standard employee working during standard business hours. Opens 2 backlog spreadsheets, zero anomalies.
                  </p>
                  <div className="mt-3 text-[11px] font-mono text-slate-300 bg-black/40 p-2 rounded">
                    <div>• files_accessed: 2 (Normal)</div>
                    <div>• bytes: 1.4 MB</div>
                    <div>• hour: 10:00 AM (In-hours)</div>
                  </div>
                  <button
                    onClick={() => runScenario("normal_routine")}
                    disabled={sending}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Execute Benign Routine</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Custom Telemetry Injector */}
          {activeTab === "custom" && (
            <div className="corp-card space-y-4">
              <h2 className="text-sm font-bold text-white">Custom Variable Injector</h2>
              <p className="text-xs text-slate-400">
                Manually calibrate telemetry parameters to test custom boundary conditions against the ensemble model.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs text-slate-300 font-medium flex justify-between">
                    <span>Data Transfer (MB)</span>
                    <strong className="text-blue-400">{customMb} MB</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="1000"
                    value={customMb}
                    onChange={(e) => setCustomMb(Number(e.target.value))}
                    className="w-full mt-1 accent-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium flex justify-between">
                    <span>Files Accessed Count</span>
                    <strong className="text-blue-400">{customFiles} files</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="150"
                    value={customFiles}
                    onChange={(e) => setCustomFiles(Number(e.target.value))}
                    className="w-full mt-1 accent-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium flex justify-between">
                    <span>Failed Login Attempts</span>
                    <strong className="text-rose-400">{customFails} fails</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={customFails}
                    onChange={(e) => setCustomFails(Number(e.target.value))}
                    className="w-full mt-1 accent-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium flex justify-between">
                    <span>Login Hour (0-23)</span>
                    <strong className="text-purple-400">{customHour}:00 {customHour < 9 || customHour >= 18 ? "(Off-Hours)" : "(Normal)"}</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="23"
                    value={customHour}
                    onChange={(e) => setCustomHour(Number(e.target.value))}
                    className="w-full mt-1 accent-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  dispatchTelemetry(
                    "custom_simulation",
                    {
                      bytes_mb: customMb,
                      files_count: customFiles,
                      failed_count: customFails,
                      hour: customHour,
                      usb_events: customUsb,
                    },
                    "Custom Simulation"
                  )
                }
                disabled={sending}
                className="w-full corp-btn-primary text-xs py-2.5 mt-2 flex items-center justify-center gap-2"
              >
                <span>{sending ? "Evaluating in BehaviorSentinel..." : "Transmit Custom Telemetry Event"}</span>
                <span>⚡</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Sentinel Agent Real-Time Verdict HUD (1/3 width) */}
        <div className="space-y-4">
          <div className="corp-card border-blue-500/30 bg-[#111c38]">
            <div className="flex items-center justify-between pb-3 border-b border-[#253560]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">Sentinel Telemetry HUD</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            {/* Verdict Display */}
            {lastVerdict ? (
              <div className="mt-4 space-y-4">
                {/* Risk score gauge card */}
                <div
                  className={`p-4 rounded-xl border ${
                    lastVerdict.severity === "critical"
                      ? "bg-rose-950/40 border-rose-500/50"
                      : lastVerdict.severity === "high"
                      ? "bg-amber-950/40 border-amber-500/50"
                      : lastVerdict.severity === "medium"
                      ? "bg-yellow-950/40 border-yellow-500/50"
                      : "bg-emerald-950/40 border-emerald-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                      Evaluated Risk Score
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        lastVerdict.severity === "critical"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : lastVerdict.severity === "high"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : lastVerdict.severity === "medium"
                          ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {lastVerdict.severity}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold font-mono text-white">
                      {lastVerdict.risk_score}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>

                  {/* Progress meter */}
                  <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className={`h-full transition-all duration-700 ${
                        lastVerdict.risk_score >= 80
                          ? "bg-rose-500"
                          : lastVerdict.risk_score >= 65
                          ? "bg-amber-500"
                          : lastVerdict.risk_score >= 40
                          ? "bg-yellow-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(lastVerdict.risk_score, 100)}%` }}
                    />
                  </div>

                  {lastVerdict.alert_triggered && (
                    <div className="mt-3 flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                      <span>⚠</span>
                      <span>Security Incident Alert Dispatched to SOC Queue</span>
                    </div>
                  )}
                </div>

                {/* Primary Anomaly Drivers (SHAP) */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">
                    Primary Anomaly Factors (SHAP Attribution):
                  </h4>
                  <div className="space-y-1.5">
                    {lastVerdict.drivers?.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-black/30 border border-[#253560]"
                      >
                        <span className="text-slate-300 truncate max-w-[180px]">{d.driver}</span>
                        <span className="font-mono text-blue-400 font-bold">{d.weight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Natural language explanation */}
                <div className="p-3 rounded-lg bg-black/30 border border-[#253560] text-xs text-slate-300">
                  <span className="font-semibold text-blue-400 block mb-1">AI Analyst Explanation:</span>
                  <p className="leading-relaxed">{lastVerdict.explanation}</p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <span className="text-3xl">📡</span>
                <p className="text-xs">Awaiting client telemetry...</p>
                <p className="text-[10px] text-slate-500">
                  Click any download, trigger a scenario, or inject custom events on the left to see live evaluation.
                </p>
              </div>
            )}
          </div>

          {/* Recent Event Audit Log */}
          <div className="corp-card">
            <h3 className="text-xs font-bold text-white mb-3">Live Telemetry Stream ({eventHistory.length})</h3>
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {eventHistory.length > 0 ? (
                eventHistory.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2 rounded-lg bg-black/20 border border-[#253560] text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">{evt.user_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{evt.action}</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold ${
                          evt.risk_score >= 80
                            ? "text-rose-400"
                            : evt.risk_score >= 65
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {evt.risk_score}
                      </span>
                      <div className="text-[9px] text-slate-500">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ""}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No events yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#253560] bg-[#111c38]/50 px-6 py-4 text-center text-xs text-slate-500">
        <p>Apex Global Technologies Inc. • Enterprise Cloud Platform v4.12 • Telemetry Connected to BehaviorSentinel</p>
      </footer>
    </div>
  );
}
