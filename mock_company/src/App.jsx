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
    code: "AR-ENG-91",
  },
  {
    id: "junior01",
    name: "Jordan Kim",
    role: "Junior Analyst",
    roleLevel: "junior",
    department: "Finance",
    code: "JK-FIN-42",
  },
  {
    id: "senior_mgr",
    name: "Morgan Singh",
    role: "Senior Manager",
    roleLevel: "senior_manager",
    department: "Operations",
    code: "MS-OPS-18",
  },
  {
    id: "manager",
    name: "Taylor Brooks",
    role: "Executive Director",
    roleLevel: "manager",
    department: "Management",
    code: "TB-MGT-04",
  },
];

const VAULT_FILES = [
  {
    id: "f1",
    name: "Sprint_Backlog_Q4.xlsx",
    category: "Standard Project File",
    sizeMb: 1.4,
    sensitivity: "INTERNAL_UNCLASSIFIED",
    tag: "[DOC]",
    recommendedRole: "All Roles",
    isHighRisk: false,
  },
  {
    id: "f2",
    name: "Engineering_System_Architecture.pdf",
    category: "Technical Specifications",
    sizeMb: 4.8,
    sensitivity: "INTERNAL_ENGINEERING",
    tag: "[SPEC]",
    recommendedRole: "Engineering",
    isHighRisk: false,
  },
  {
    id: "f3",
    name: "Q4_Confidential_Financial_Projections.xlsx",
    category: "Financial Forecasts",
    sizeMb: 45.0,
    sensitivity: "CONFIDENTIAL_FINANCE",
    tag: "[DATA]",
    recommendedRole: "Finance & Execs",
    isHighRisk: false,
  },
  {
    id: "f4",
    name: "Customer_PII_SSN_Master_Database.zip",
    category: "Core Customer Vault",
    sizeMb: 850.0,
    sensitivity: "CRITICAL_RESTRICTED",
    tag: "[DB]",
    recommendedRole: "CISO Only",
    isHighRisk: true,
  },
  {
    id: "f5",
    name: "Production_IAM_Keys_and_Certs.tar.gz",
    category: "Credentials & Secrets",
    sizeMb: 12.0,
    sensitivity: "CRITICAL_RESTRICTED",
    tag: "[SECRETS]",
    recommendedRole: "DevOps Lead",
    isHighRisk: true,
  },
  {
    id: "f6",
    name: "Apex_Proprietary_Source_Code_Git.bundle",
    category: "Intellectual Property",
    sizeMb: 340.0,
    sensitivity: "IP_RESTRICTED",
    tag: "[SRC]",
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
      source_app: "Apex Enterprise Intranet",
    };

    try {
      const resp = await axios.post(SENTINEL_API, payload);
      const verdict = resp.data;
      setLastVerdict(verdict);
      setEventHistory((prev) => [verdict, ...prev.slice(0, 19)]);

      if (verdict.alert_triggered) {
        showToast(
          `[ANOMALY_FLAGGED] Risk Score: ${verdict.risk_score} (${verdict.severity.toUpperCase()}) — Incident queued to SOC`,
          "danger"
        );
      } else {
        showToast(
          `[TELEMETRY_LOGGED] Risk Score: ${verdict.risk_score} (Normal Baseline)`,
          "success"
        );
      }
    } catch (err) {
      console.error("Telemetry failed:", err);
      showToast("[ERR_CONN] Telemetry engine unreachable at localhost:8000", "warning");
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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-mono selection:bg-zinc-800 selection:text-white">
      {/* Top Banner: EDR Link & Telemetry Target */}
      <div className="bg-[#121215] border-b border-zinc-800 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-100"></span>
          </span>
          <span className="text-zinc-300 font-bold tracking-widest text-[11px]">
            APEX_EDR_SENSOR // AGENT_V2.4
          </span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-zinc-500 hidden sm:inline text-[11px]">
            TELEMETRY_PIPELINE: <span className="text-zinc-300 font-mono">http://localhost:8000/api/telemetry/event</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-zinc-900 px-2.5 py-1 rounded text-[11px] font-mono tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <span>[ OPEN_SOC_CONSOLE // 5173 ]</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      {/* Main Enterprise Header */}
      <header className="bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-zinc-700 bg-zinc-900 flex items-center justify-center text-white font-bold text-xs tracking-tighter">
              APEX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm tracking-wider uppercase text-zinc-100">
                  Apex Global Technologies
                </h1>
                <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.2 rounded">
                  ERP_WORKSTATION
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">Internal Secure Enterprise Storage & Operations</p>
            </div>
          </div>

          {/* User selector & Mode toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Shift Mode toggle */}
            <button
              onClick={() => setIsNightMode(!isNightMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[11px] font-mono tracking-wider transition-all ${
                isNightMode
                  ? "bg-zinc-800 border-zinc-500 text-zinc-100 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isNightMode ? "bg-white animate-pulse" : "bg-zinc-500"}`} />
              <span>{isNightMode ? "SHIFT: [ OFF-HOURS // 02:00 AM ]" : "SHIFT: [ REGULAR // 10:30 AM ]"}</span>
            </button>

            {/* Active employee selector */}
            <div className="flex items-center gap-1.5 bg-[#121215] border border-zinc-800 rounded p-1">
              <span className="text-[10px] text-zinc-500 font-mono uppercase pl-1.5 pr-1">USER:</span>
              <div className="flex gap-1">
                {EMPLOYEES.map((emp) => {
                  const isSelected = emp.id === currentUser.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setCurrentUser(emp)}
                      className={`px-2 py-1 rounded text-[11px] font-mono tracking-wider transition-all ${
                        isSelected
                          ? "bg-zinc-100 text-zinc-950 font-semibold"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                      }`}
                    >
                      <span>{emp.name.split(" ")[0]}</span>
                      <span className="text-[9px] opacity-70 ml-1">({emp.roleLevel.substring(0, 3).toUpperCase()})</span>
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
        <div className="fixed top-20 right-6 z-50">
          <div
            className={`px-4 py-2.5 rounded border text-xs font-mono tracking-wider shadow-2xl flex items-center gap-2 ${
              toast.type === "danger"
                ? "bg-zinc-950 text-red-300 border-red-800/80"
                : toast.type === "warning"
                ? "bg-zinc-950 text-amber-300 border-amber-800/80"
                : "bg-zinc-950 text-zinc-200 border-zinc-700"
            }`}
          >
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workplace Actions (2/3 width) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab("vault")}
              className={`px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-all ${
                activeTab === "vault"
                  ? "bg-zinc-100 text-zinc-950 font-bold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              [ // 01: VAULT_DOCUMENTS ]
            </button>
            <button
              onClick={() => setActiveTab("scenarios")}
              className={`px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-all ${
                activeTab === "scenarios"
                  ? "bg-zinc-100 text-zinc-950 font-bold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              [ // 02: THREAT_VECTORS ]
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={`px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-all ${
                activeTab === "custom"
                  ? "bg-zinc-100 text-zinc-950 font-bold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              [ // 03: TELEMETRY_INJECTOR ]
            </button>
          </div>

          {/* TAB 1: Corporate Document Vault */}
          {activeTab === "vault" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div>
                  <h2 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
                    Classified Document Repository
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    OPERATOR: <span className="text-zinc-200">{currentUser.name}</span> // {currentUser.department} ({currentUser.role})
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                  {VAULT_FILES.length} OBJECTS_INDEXED
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {VAULT_FILES.map((file) => (
                  <div
                    key={file.id}
                    className="corp-card flex flex-col justify-between hover:border-zinc-600 relative group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                            {file.tag}
                          </span>
                          <div>
                            <h3 className="text-xs font-semibold text-zinc-200 font-mono truncate max-w-[190px]">
                              {file.name}
                            </h3>
                            <span className="text-[10px] text-zinc-500 font-mono">{file.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 py-1.5 px-2 bg-zinc-950/60 rounded border border-zinc-800/80 my-2">
                        <span>SIZE: <strong className="text-zinc-200">{file.sizeMb} MB</strong></span>
                        <span className="text-zinc-400">{file.sensitivity}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/60">
                      <button
                        onClick={() => handleDownloadFile(file, false)}
                        disabled={sending}
                        className="corp-btn-primary flex-1 text-center py-1.5"
                      >
                        [ DOWNLOAD ]
                      </button>

                      {file.isHighRisk && (
                        <button
                          onClick={() => handleDownloadFile(file, true)}
                          disabled={sending}
                          title="Simulate bulk off-hours exfiltration with USB export"
                          className="corp-btn-danger py-1.5 px-2.5 text-center"
                        >
                          [ EXFILTRATE ]
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
              <div className="bg-[#121215] border border-zinc-800 rounded-lg p-4">
                <h2 className="text-xs font-bold font-mono tracking-wider text-zinc-200 uppercase">
                  // ATTACK_VECTOR_REPLAY_SUITE
                </h2>
                <p className="text-[11px] text-zinc-400 font-mono mt-1 leading-relaxed">
                  Trigger multi-variable insider telemetry vectors. BehaviorSentinel evaluates behavioral drift against baseline profiles,
                  generates mathematical SHAP feature weight attributions, and dispatches incidents to the port 5173 SOC alert queue.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Scenario 1 */}
                <div className="corp-card hover:border-zinc-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">
                      VECTOR_01 // CRITICAL
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">[MASS_EXFIL]</span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-100 font-mono">Disgruntled Intern Data Exfiltration</h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-1 leading-relaxed">
                    Alex Rivera logs in at 02:00 AM, queries 94 customer records, inserts external USB drive, and exports 850 MB confidential database.
                  </p>
                  <div className="mt-3 text-[10px] font-mono text-zinc-400 bg-zinc-950 p-2.5 rounded border border-zinc-800/80 space-y-0.5">
                    <div>• BYTES_TRANSFERRED: 850 MB (30x baseline)</div>
                    <div>• TIMESTAMP: 02:00 AM (OFF_HOURS)</div>
                    <div>• USB_ATTACHMENTS: 2 DEVICES</div>
                  </div>
                  <button
                    onClick={() => runScenario("rogue_intern")}
                    disabled={sending}
                    className="w-full mt-3 corp-btn-danger text-center py-2"
                  >
                    [ EXECUTE EXFILTRATION ATTACK ]
                  </button>
                </div>

                {/* Scenario 2 */}
                <div className="corp-card hover:border-zinc-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                      VECTOR_02 // HIGH_RISK
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">[AUTH_BURST]</span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-100 font-mono">Credential Stuffing & Takeover</h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-1 leading-relaxed">
                    12 rapid failed authentication attempts followed by successful administrative session access at 23:00 PM off-hours.
                  </p>
                  <div className="mt-3 text-[10px] font-mono text-zinc-400 bg-zinc-950 p-2.5 rounded border border-zinc-800/80 space-y-0.5">
                    <div>• FAILED_LOGINS: 12 ATTEMPTS</div>
                    <div>• TIMESTAMP: 23:00 PM (OFF_HOURS)</div>
                    <div>• STAT_ANOMALY: +13.8 SIGMA</div>
                  </div>
                  <button
                    onClick={() => runScenario("credential_stuffing")}
                    disabled={sending}
                    className="w-full mt-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 font-mono text-xs py-2 rounded uppercase tracking-wider transition-all"
                  >
                    [ EXECUTE BRUTE_FORCE ATTACK ]
                  </button>
                </div>

                {/* Scenario 3 */}
                <div className="corp-card hover:border-zinc-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                      VECTOR_03 // MEDIUM_RISK
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">[DIRECTORY_SCAN]</span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-100 font-mono">Mass Directory Harvesting</h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-1 leading-relaxed">
                    Operator systematically scrapes 88 files across unauthorized department network shares in rapid burst.
                  </p>
                  <div className="mt-3 text-[10px] font-mono text-zinc-400 bg-zinc-950 p-2.5 rounded border border-zinc-800/80 space-y-0.5">
                    <div>• FILES_ACCESSED: 88 (BASELINE: 12)</div>
                    <div>• VOLUME: 180 MB</div>
                    <div>• PERIMETER: CROSS_DEPARTMENT</div>
                  </div>
                  <button
                    onClick={() => runScenario("mass_harvesting")}
                    disabled={sending}
                    className="w-full mt-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 font-mono text-xs py-2 rounded uppercase tracking-wider transition-all"
                  >
                    [ EXECUTE HARVESTING VECTOR ]
                  </button>
                </div>

                {/* Scenario 4 */}
                <div className="corp-card hover:border-zinc-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      VECTOR_04 // BENIGN
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">[BASELINE]</span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-100 font-mono">Standard Operating Routine</h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-1 leading-relaxed">
                    Standard employee working during normal operating hours. Opens 2 sprint backlog spreadsheets with zero deviations.
                  </p>
                  <div className="mt-3 text-[10px] font-mono text-zinc-400 bg-zinc-950 p-2.5 rounded border border-zinc-800/80 space-y-0.5">
                    <div>• FILES_ACCESSED: 2 (EXPECTED)</div>
                    <div>• VOLUME: 1.4 MB</div>
                    <div>• TIMESTAMP: 10:00 AM (IN_HOURS)</div>
                  </div>
                  <button
                    onClick={() => runScenario("normal_routine")}
                    disabled={sending}
                    className="w-full mt-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono text-xs py-2 rounded uppercase tracking-wider transition-all"
                  >
                    [ EXECUTE BENIGN ROUTINE ]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Custom Telemetry Injector */}
          {activeTab === "custom" && (
            <div className="corp-card space-y-4">
              <div className="border-b border-zinc-800/80 pb-3">
                <h2 className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
                  // TELEMETRY_PARAMETER_CALIBRATOR
                </h2>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Calibrate boundary variables manually to test ML ensemble threshold triggers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-mono">
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800/80">
                  <label className="text-[11px] text-zinc-300 font-mono flex justify-between">
                    <span>DATA_TRANSFER_VOLUME</span>
                    <strong className="text-zinc-100">{customMb} MB</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="1000"
                    value={customMb}
                    onChange={(e) => setCustomMb(Number(e.target.value))}
                    className="w-full mt-2 accent-zinc-100 bg-zinc-800"
                  />
                </div>

                <div className="bg-zinc-950 p-3 rounded border border-zinc-800/80">
                  <label className="text-[11px] text-zinc-300 font-mono flex justify-between">
                    <span>FILES_ACCESSED_COUNT</span>
                    <strong className="text-zinc-100">{customFiles} FILES</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="150"
                    value={customFiles}
                    onChange={(e) => setCustomFiles(Number(e.target.value))}
                    className="w-full mt-2 accent-zinc-100 bg-zinc-800"
                  />
                </div>

                <div className="bg-zinc-950 p-3 rounded border border-zinc-800/80">
                  <label className="text-[11px] text-zinc-300 font-mono flex justify-between">
                    <span>AUTH_FAILURE_COUNT</span>
                    <strong className="text-zinc-100">{customFails} FAILS</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={customFails}
                    onChange={(e) => setCustomFails(Number(e.target.value))}
                    className="w-full mt-2 accent-zinc-100 bg-zinc-800"
                  />
                </div>

                <div className="bg-zinc-950 p-3 rounded border border-zinc-800/80">
                  <label className="text-[11px] text-zinc-300 font-mono flex justify-between">
                    <span>OPERATING_HOUR</span>
                    <strong className="text-zinc-100">{customHour}:00 {customHour < 9 || customHour >= 18 ? "(OFF_HOURS)" : "(NORMAL)"}</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="23"
                    value={customHour}
                    onChange={(e) => setCustomHour(Number(e.target.value))}
                    className="w-full mt-2 accent-zinc-100 bg-zinc-800"
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
                className="w-full corp-btn-primary py-2.5 text-center mt-2"
              >
                {sending ? "[ TRANSMITTING_TELEMETRY... ]" : "[ TRANSMIT CALIBRATED TELEMETRY ]"}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Sentinel Agent Real-Time Verdict HUD (1/3 width) */}
        <div className="space-y-4">
          <div className="corp-card">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-100 animate-pulse" />
                <h3 className="text-xs font-bold font-mono tracking-widest text-zinc-100 uppercase">
                  TELEMETRY_HUD
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                ACTIVE
              </span>
            </div>

            {/* Verdict Display */}
            {lastVerdict ? (
              <div className="mt-4 space-y-4">
                {/* Risk score gauge card */}
                <div className="p-4 rounded border border-zinc-800 bg-zinc-950 font-mono">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      RISK_SCORE_EVALUATION
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      lastVerdict.severity === "critical"
                        ? "bg-red-950/60 text-red-300 border-red-800/80"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700"
                    }`}>
                      [{lastVerdict.severity.toUpperCase()}]
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-white">
                      {lastVerdict.risk_score}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">/ 100</span>
                  </div>

                  {/* Progress meter */}
                  <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden mt-3 border border-zinc-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        lastVerdict.risk_score >= 80
                          ? "bg-red-500"
                          : lastVerdict.risk_score >= 60
                          ? "bg-zinc-300"
                          : "bg-zinc-500"
                      }`}
                      style={{ width: `${Math.min(lastVerdict.risk_score, 100)}%` }}
                    />
                  </div>

                  {lastVerdict.alert_triggered && (
                    <div className="mt-3 text-[11px] font-mono text-red-400 border border-red-900/60 bg-red-950/30 p-2 rounded">
                      [ALERT_DISPATCHED] Security incident queued to BehaviorSentinel SOC panel.
                    </div>
                  )}
                </div>

                {/* Primary Anomaly Drivers (SHAP) */}
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    // SHAP_FEATURE_ATTRIBUTION
                  </h4>
                  <div className="space-y-1.5 font-mono">
                    {lastVerdict.drivers?.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[11px] p-2 rounded bg-zinc-950 border border-zinc-800/80"
                      >
                        <span className="text-zinc-300 truncate max-w-[180px]">{d.driver}</span>
                        <span className="text-zinc-100 font-bold">{d.weight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Natural language explanation */}
                <div className="p-3 rounded bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-300 leading-relaxed">
                  <span className="text-zinc-400 block mb-1 uppercase font-bold text-[10px]">
                    // ENGINE_INFERENCE_SUMMARY:
                  </span>
                  <p>{lastVerdict.explanation}</p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500 font-mono space-y-2">
                <div className="text-xs uppercase tracking-wider">[ AWAITING_TELEMETRY ]</div>
                <p className="text-[11px] text-zinc-600 max-w-xs mx-auto">
                  Click download, trigger a threat vector, or inject parameters on the left to evaluate risk in real-time.
                </p>
              </div>
            )}
          </div>

          {/* Recent Event Audit Log */}
          <div className="corp-card">
            <h3 className="text-xs font-bold font-mono tracking-widest text-zinc-100 uppercase mb-3">
              TELEMETRY_LOG_STREAM ({eventHistory.length})
            </h3>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 font-mono">
              {eventHistory.length > 0 ? (
                eventHistory.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2 rounded bg-zinc-950 border border-zinc-800/80 text-[10px] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-zinc-200">{evt.user_name}</div>
                      <div className="text-[9px] text-zinc-500 font-mono">{evt.action}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-zinc-200">
                        {evt.risk_score} / 100
                      </span>
                      <div className="text-[9px] text-zinc-600">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ""}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-zinc-600 font-mono text-center py-4">
                  [ STREAM_EMPTY ]
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-[#09090b] px-6 py-3 text-center text-[11px] font-mono text-zinc-600">
        <p>APEX GLOBAL TECHNOLOGIES // SECURE WORKPLACE OS 4.12 // BEHAVIORSENTINEL EDR INTEGRATION</p>
      </footer>
    </div>
  );
}
