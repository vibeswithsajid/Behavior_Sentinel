import { useState, useEffect, useRef } from "react";
import {
  Crosshair,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Terminal,
  Activity,
  Cpu,
  Layers,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

// ── Persona / Scenario Definitions ───────────────────────────────────────────
const PERSONAS = [
  {
    id: "data-exfiltrator",
    name: "Alex Turner",
    department: "Finance",
    role: "Senior Financial Analyst",
    attackType: "Data Exfiltration",
    severity: "critical",
    avatarInitials: "AT",
    description:
      "Employee attempts unauthorized bulk extraction of sensitive financial statements and customer banking records onto external removable media during off-hours.",
    behaviours: [
      "Abnormal data egress volume (847 MB vs 26 MB baseline)",
      "Unsanctioned USB mass storage insert & export events",
      "Mass access across 94 restricted budget directories",
      "Off-hours authentication event at 02:14 AM",
    ],
    riskScore: 87.4,
    threatCategory: "Data Exfiltration / Insider Threat",
    explanation:
      "Massive spike in data transfer volume (847 MB vs 26 MB historical average) coinciding with removable media export events and 94 directory accesses between 01:30–03:00 AM far exceeds behavioral baselines. The AI ensemble flagged this event primarily due to data transfer volume and physical media insertion.",
    shapFeatures: [
      {
        label: "Data Transfer Volume (MB)",
        value: 68,
        description: "847 MB transferred (32× above 30-day baseline)",
        color: "bg-[#DC2626]",
      },
      {
        label: "USB Storage Activity",
        value: 21,
        description: "3 removable media write events detected during off-hours",
        color: "bg-[#EA580C]",
      },
      {
        label: "File Access Velocity",
        value: 11,
        description: "94 files accessed across 5 restricted directories in 15 minutes",
        color: "bg-[#2563EB]",
      },
    ],
    consoleLogs: [
      "Initializing isolated simulation environment…",
      "Loading 45-day statistical baseline for Alex Turner (Finance)…",
      "Injecting bulk file access sequence [94 documents, restricted budget paths]…",
      "Simulating USB mass storage connection → write payload [847 MB]…",
      "Synthesizing off-hours auth session: timestamp=02:14 AM…",
      "Dispatching feature vector to real-time ingestion pipeline…",
      "Running Isolation Forest partition depth evaluation…",
      "Computing Autoencoder deep neural reconstruction error…",
      "Synthesizing ensemble score [60% Isolation Forest + 40% Autoencoder]…",
      "Calculating TreeExplainer SHAP attributions…",
      "SHAP feature attributions verified. Primary driver: data_transfer_mb.",
      "ALERT COMMITTED — Score: 87.4 — Severity: Critical",
    ],
  },
  {
    id: "credential-abuser",
    name: "Maya Patel",
    department: "IT Infrastructure",
    role: "Systems Administrator",
    attackType: "Credential Abuse",
    severity: "high",
    avatarInitials: "MP",
    description:
      "Account takeover or credential stuffing scenario where multiple authentication failures are followed by an anomalous administrative session late at night.",
    behaviours: [
      "12 consecutive failed login attempts within an 8-minute window",
      "Successful session established at 11:47 PM from unexpected subnet",
      "Login hour deviation: μ=9.2 AM → observed=11:47 PM (13.8σ drift)",
      "Horizontal access across 3 separate privileged console accounts",
    ],
    riskScore: 79.1,
    threatCategory: "Credential Abuse / Privilege Escalation",
    explanation:
      "A burst of 12 rapid failed authentication attempts followed by successful administrative access at 11:47 PM indicates probable credential spraying or brute force. The access timestamp is 14.5 hours outside standard operating hours.",
    shapFeatures: [
      {
        label: "Authentication Failures",
        value: 54,
        description: "12 consecutive password failures in 8 minutes",
        color: "bg-[#DC2626]",
      },
      {
        label: "After-Hours Deviation",
        value: 29,
        description: "Access at 23:47, 13.8σ outside historical mean (09:12 AM)",
        color: "bg-[#EA580C]",
      },
      {
        label: "Multi-Account Traversal",
        value: 17,
        description: "Rapid privilege elevation attempts across 3 internal consoles",
        color: "bg-[#2563EB]",
      },
    ],
    consoleLogs: [
      "Initializing isolated simulation environment…",
      "Loading 45-day statistical baseline for Maya Patel (IT)…",
      "Injecting auth failure burst: 12 failed attempts [22:51–22:59]…",
      "Simulating successful admin logon event at 23:47 PM…",
      "Evaluating login hour deviation against mean μ=09:12, σ=0.9…",
      "Flagging privilege console elevation across 3 host targets…",
      "Dispatching feature vector to real-time ingestion pipeline…",
      "Running Isolation Forest partition depth evaluation…",
      "Computing Autoencoder deep neural reconstruction error…",
      "Synthesizing ensemble score [60% Isolation Forest + 40% Autoencoder]…",
      "Calculating TreeExplainer SHAP attributions…",
      "ALERT COMMITTED — Score: 79.1 — Severity: High",
    ],
  },
  {
    id: "insider-recon",
    name: "James Okafor",
    department: "R&D",
    role: "Staff Research Engineer",
    attackType: "Insider Reconnaissance",
    severity: "high",
    avatarInitials: "JO",
    description:
      "Pre-resignation reconnaissance scenario where an engineer conducts widespread exploration of unrelated intellectual property and sends correspondence to personal emails.",
    behaviours: [
      "162 documents accessed across 7 unrelated intellectual property vaults",
      "Outbound email spike: 31 unique external recipient addresses",
      "Consecutive after-hours work sessions across 4 consecutive days",
      "Unusual exploration of proprietary patent drafts and design assets",
    ],
    riskScore: 74.8,
    threatCategory: "Insider Reconnaissance / IP Theft Precursor",
    explanation:
      "162 file accesses traversing 7 project directories unrelated to the engineer's active sprint, coupled with an anomalous spike in external email recipients during evening hours, matches behavioral patterns of pre-departure intellectual property harvesting.",
    shapFeatures: [
      {
        label: "Cross-Vault File Access",
        value: 49,
        description: "162 documents across 7 unrelated R&D vaults",
        color: "bg-[#DC2626]",
      },
      {
        label: "External Email Recipients",
        value: 32,
        description: "31 unique external addresses (normal mean: 2)",
        color: "bg-[#EA580C]",
      },
      {
        label: "Repeated Off-Hours Sessions",
        value: 19,
        description: "4 consecutive non-business day logins",
        color: "bg-[#2563EB]",
      },
    ],
    consoleLogs: [
      "Initializing isolated simulation environment…",
      "Loading 45-day statistical baseline for James Okafor (R&D)…",
      "Injecting file access burst: 162 documents across 7 project directories…",
      "Simulating email dispatch: 31 external domains logged…",
      "Recording 4 consecutive after-hours interaction periods…",
      "Dispatching feature vector to real-time ingestion pipeline…",
      "Running Isolation Forest partition depth evaluation…",
      "Computing Autoencoder deep neural reconstruction error…",
      "Synthesizing ensemble score [60% Isolation Forest + 40% Autoencoder]…",
      "Calculating TreeExplainer SHAP attributions…",
      "ALERT COMMITTED — Score: 74.8 — Severity: High",
    ],
  },
];

const getSeverityBadge = (sev) => {
  if (sev === "critical") return "badge-critical";
  if (sev === "high") return "badge-high";
  return "badge-medium";
};

export default function ThreatTheater() {
  const [activePersona, setActivePersona] = useState(null);
  const [logs, setLogs] = useState([]);
  const [done, setDone] = useState(false);
  const [running, setRunning] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const consoleRef = useRef(null);
  const timeoutsRef = useRef([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const handleLaunch = (persona) => {
    clearTimeouts();
    setActivePersona(persona);
    setLogs([]);
    setDone(false);
    setRunning(true);
    setLogsExpanded(false);
    setEscalated(false);

    setTimeout(() => {
      consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    persona.consoleLogs.forEach((line, i) => {
      const t = setTimeout(() => {
        setLogs((prev) => [...prev, line]);
        if (i === persona.consoleLogs.length - 1) {
          setDone(true);
          setRunning(false);
        }
      }, i * 500);
      timeoutsRef.current.push(t);
    });
  };

  const handleReset = () => {
    clearTimeouts();
    setActivePersona(null);
    setLogs([]);
    setDone(false);
    setRunning(false);
    setLogsExpanded(false);
    setEscalated(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-[#0F172A]">Attack Simulation Environment</h2>
            <span className="badge-blue text-[11px] font-medium">SOC Testing Mode</span>
          </div>
          <p className="text-[13px] text-[#64748B]">
            Execute synthetic insider threat vectors to validate model sensitivity, alert latency, and SHAP explainability.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          <span>Non-destructive test environment</span>
        </div>
      </div>

      {/* ── Scenario Selection Cards ──────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-[13px] font-semibold text-[#0F172A] uppercase tracking-wider text-[#94A3B8]">
          Select Attack Scenario to Execute
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PERSONAS.map((persona) => {
            const isSelected = activePersona?.id === persona.id;

            return (
              <div
                key={persona.id}
                className={`card flex flex-col justify-between transition-all duration-200 ${
                  isSelected
                    ? "ring-2 ring-[#2563EB] border-transparent shadow-card-md"
                    : "hover:border-[#CBD5E1]"
                } ${running && !isSelected ? "opacity-40 pointer-events-none" : ""}`}
              >
                <div className="space-y-3">
                  {/* Scenario Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[12.5px] font-bold text-[#2563EB]">
                        {persona.avatarInitials}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-semibold text-[#0F172A]">{persona.name}</h4>
                        <p className="text-[11.5px] text-[#64748B]">{persona.role} · {persona.department}</p>
                      </div>
                    </div>
                    <span className={getSeverityBadge(persona.severity)}>
                      {persona.attackType}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[12.5px] text-[#475569] leading-relaxed">
                    {persona.description}
                  </p>

                  {/* Injected Indicators */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                      Injected Telemetry Anomalies
                    </div>
                    <ul className="space-y-1.5 text-[12px] text-[#334155]">
                      {persona.behaviours.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-4 mt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Expected Score</span>
                    <span className="text-[15px] font-bold text-[#0F172A] tabular-nums">
                      {persona.riskScore.toFixed(1)}
                    </span>
                  </div>

                  <button
                    id={`btn-launch-${persona.id}`}
                    onClick={() => handleLaunch(persona)}
                    disabled={running}
                    className={`text-[12.5px] flex items-center gap-1.5 ${
                      isSelected && running ? "btn-secondary" : "btn-primary"
                    }`}
                  >
                    <Play size={13} fill="currentColor" />
                    <span>{isSelected && running ? "Executing…" : "Execute Scenario"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active Simulation Output & Results ─────────────────────── */}
      {activePersona && (
        <div ref={consoleRef} className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Simulation Evaluation: {activePersona.name} ({activePersona.attackType})
            </h3>
            <button
              onClick={handleReset}
              className="text-[12.5px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Reset Testing Environment</span>
            </button>
          </div>

          {/* Progress Banner while executing */}
          {!done && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
                  <span className="font-semibold text-[#0F172A]">
                    Simulating Telemetry & Executing Dual-Model Pipeline…
                  </span>
                </div>
                <span className="text-[12px] text-[#64748B] tabular-nums">
                  Step {logs.length} of {activePersona.consoleLogs.length}
                </span>
              </div>

              <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                  style={{
                    width: `${(logs.length / activePersona.consoleLogs.length) * 100}%`,
                  }}
                />
              </div>

              <p className="text-[12px] font-mono text-[#64748B] truncate">
                &gt; {logs[logs.length - 1] || "Connecting EDR agent simulator…"}
              </p>
            </div>
          )}

          {/* Result Card when Complete */}
          {done && (
            <div className="card space-y-5 animate-fade-in border-[#CBD5E1]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-[16px] font-bold text-[#0F172A]">
                        Simulation Verdict: Incident Flagged
                      </h4>
                      <span className={getSeverityBadge(activePersona.severity)}>
                        {activePersona.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#64748B] mt-0.5">
                      Detection pipeline completed evaluation in 42ms.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#DC2626] tabular-nums">
                      {activePersona.riskScore.toFixed(1)}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] font-medium">Anomaly Score</div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-4">
                    <button
                      id="btn-escalate-sim"
                      onClick={() => setEscalated(true)}
                      disabled={escalated}
                      className="btn-primary text-[12.5px]"
                    >
                      {escalated ? "Escalated to Queue" : "Escalate to SOC Queue"}
                    </button>
                    <button onClick={handleReset} className="btn-secondary text-[12.5px]">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>

              {/* Natural Language Explanation */}
              <div>
                <h5 className="text-[13px] font-semibold text-[#0F172A] mb-1.5">
                  Natural Language Incident Summary
                </h5>
                <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#334155] leading-relaxed">
                  {activePersona.explanation}
                </div>
              </div>

              {/* SHAP Feature Contribution Bars */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-[#2563EB]" />
                    <h5 className="text-[13px] font-semibold text-[#0F172A]">
                      Feature Attributions (SHAP TreeExplainer)
                    </h5>
                  </div>
                  <span className="badge-neutral text-[11px]">Why was this flagged?</span>
                </div>

                <div className="space-y-3">
                  {activePersona.shapFeatures.map((f, i) => (
                    <div key={i} className="p-3 rounded-lg border border-[#E2E8F0] bg-white">
                      <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                        <span className="font-semibold text-[#0F172A]">{f.label}</span>
                        <span className="font-bold text-[#0F172A] tabular-nums">
                          {f.value}% attribution
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden mb-1">
                        <div
                          className={`h-full ${f.color} rounded-full transition-all duration-700`}
                          style={{ width: `${f.value}%` }}
                        />
                      </div>
                      <p className="text-[11.5px] text-[#64748B]">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Collapsible Technical Execution Logs ─────────────────── */}
          <div className="card p-0 overflow-hidden">
            <button
              onClick={() => setLogsExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Terminal size={15} className="text-[#64748B]" />
                <span className="text-[13px] font-semibold text-[#0F172A]">
                  Technical Execution Log
                </span>
                <span className="text-[11px] text-[#94A3B8] font-mono">
                  ({logs.length} pipeline steps)
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`text-[#94A3B8] transition-transform duration-200 ${
                  logsExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {logsExpanded && (
              <div className="border-t border-[#E2E8F0] p-4 bg-[#F8FAFC]">
                <div className="font-mono text-[11.5px] space-y-1 max-h-56 overflow-y-auto">
                  {logs.map((line, idx) => {
                    const isAlert = line.includes("ALERT COMMITTED");
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 py-0.5 ${
                          isAlert
                            ? "text-[#DC2626] font-semibold"
                            : "text-[#475569]"
                        }`}
                      >
                        <span className="text-[#94A3B8] select-none w-6 text-right tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span>{line}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
