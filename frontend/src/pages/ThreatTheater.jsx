import { useState, useEffect, useRef } from "react";

// ── Persona Data ──────────────────────────────────────────────────────────────
const PERSONAS = [
  {
    id: "data-exfiltrator",
    name: "Alex Turner",
    department: "Finance Dept",
    role: "Senior Analyst",
    attackType: "Data Exfiltration",
    attackBadge: "badge-critical",
    avatarInitials: "AT",
    avatarColor: "#dc2626",
    behaviours: [
      "Spike in data_transfer_mb (3.2× baseline)",
      "USB insert/eject events during off-hours",
      "Mass file access across sensitive directories",
      "Anomalous login at 02:14 AM",
    ],
    riskScore: 87.4,
    threatCategory: "Data Exfiltration / Insider Threat",
    explanation:
      "Anomalous spike in data_transfer_mb (847 MB vs 26 MB baseline) combined with USB export events and 94 file accesses between 01:30–03:00 AM far exceed behavioural norms. SHAP attributes 68% of score to data_transfer_mb, 21% to usb_events.",
    consoleLogs: [
      "▶  Initialising simulation environment...",
      "▶  Loading behavioural baseline for Alex Turner (Finance)...",
      "▶  Injecting anomalous file access events [94 files, 01:30 AM]...",
      "▶  Simulating USB storage insert → export activity [847 MB]...",
      "▶  Generating login record: login_hour=02:14, after_hours=true...",
      "▶  Feeding synthetic log to feature extraction pipeline...",
      "▶  Running Isolation Forest anomaly detector...",
      "▶  Running Autoencoder reconstruction error analysis...",
      "▶  Combining model scores with ensemble weighting...",
      "▶  Computing SHAP feature attributions...",
      "▶  SHAP analysis complete. Top features: data_transfer_mb, usb_events, files_accessed.",
      "⚠  ALERT GENERATED — Risk Score: 87.4 — Severity: CRITICAL",
    ],
  },
  {
    id: "credential-abuser",
    name: "Maya Patel",
    department: "IT Dept",
    role: "Systems Administrator",
    attackType: "Credential Abuse",
    attackBadge: "badge-high",
    avatarInitials: "MP",
    avatarColor: "#ef4444",
    behaviours: [
      "12 failed login attempts within 8 minutes",
      "Successful after_hours_access at 11:47 PM",
      "login_hour deviation: μ=9.2 → observed=23",
      "Lateral movement across 3 admin panels",
    ],
    riskScore: 79.1,
    threatCategory: "Credential Abuse / Privilege Escalation",
    explanation:
      "12 consecutive failed_login attempts followed by after-hours access at 23:47 suggests credential stuffing or account takeover. Login hour (23) deviates 13.8σ from user's historical mean (09:12). SHAP weight: failed_logins 54%, after_hours_access 29%.",
    consoleLogs: [
      "▶  Initialising simulation environment...",
      "▶  Loading behavioural baseline for Maya Patel (IT)...",
      "▶  Injecting 12 consecutive failed_login events [22:51–22:59]...",
      "▶  Simulating after_hours access event at 23:47 PM...",
      "▶  Computing login_hour deviation: observed=23, baseline μ=9.2 σ=0.9...",
      "▶  Flagging lateral movement across admin consoles (3 systems)...",
      "▶  Feeding synthetic log to feature extraction pipeline...",
      "▶  Running Isolation Forest anomaly detector...",
      "▶  Running Autoencoder reconstruction error analysis...",
      "▶  Combining model scores with ensemble weighting...",
      "▶  Computing SHAP feature attributions...",
      "▶  SHAP analysis complete. Top features: failed_logins, after_hours_access, login_hour.",
      "⚠  ALERT GENERATED — Risk Score: 79.1 — Severity: HIGH",
    ],
  },
  {
    id: "insider-recon",
    name: "James Okafor",
    department: "R&D Dept",
    role: "Research Engineer",
    attackType: "Insider Recon",
    attackBadge: "badge-high",
    avatarInitials: "JO",
    avatarColor: "#f59e0b",
    behaviours: [
      "162 files accessed across 7 project dirs",
      "email_recipients_count spike: 31 unique recipients",
      "after_hours_access on 4 consecutive days",
      "Unusual access to IP & patent documents",
    ],
    riskScore: 74.8,
    threatCategory: "Insider Reconnaissance / IP Theft Precursor",
    explanation:
      "162 file accesses spanning 7 R&D project directories in a single session, coupled with an email recipients spike (31 unique external addresses) during after-hours periods, strongly indicates insider reconnaissance. SHAP: files_accessed 49%, email_recipients_count 32%.",
    consoleLogs: [
      "▶  Initialising simulation environment...",
      "▶  Loading behavioural baseline for James Okafor (R&D)...",
      "▶  Injecting file_access burst: 162 files across 7 directories...",
      "▶  Flagging access to /projects/patent-pending and /projects/IP-core...",
      "▶  Simulating email_sent events: 31 unique external recipients...",
      "▶  Marking after_hours_access=true for 4 consecutive days...",
      "▶  Feeding synthetic log to feature extraction pipeline...",
      "▶  Running Isolation Forest anomaly detector...",
      "▶  Running Autoencoder reconstruction error analysis...",
      "▶  Combining model scores with ensemble weighting...",
      "▶  Computing SHAP feature attributions...",
      "▶  SHAP analysis complete. Top features: files_accessed, email_recipients_count, after_hours_access.",
      "⚠  ALERT GENERATED — Risk Score: 74.8 — Severity: HIGH",
    ],
  },
];

// ── Helper: score → color ─────────────────────────────────────────────────────
const scoreColor = (s) => {
  if (s >= 80) return "#dc2626";
  if (s >= 65) return "#ef4444";
  return "#f59e0b";
};

const scoreBadge = (s) => {
  if (s >= 80) return "badge-critical";
  if (s >= 65) return "badge-high";
  return "badge-medium";
};

const scoreLabel = (s) => {
  if (s >= 80) return "Critical";
  if (s >= 65) return "High";
  return "Medium";
};

// ── Persona Card ──────────────────────────────────────────────────────────────
function PersonaCard({ persona, onLaunch, isRunning, isThisRunning }) {
  return (
    <div
      className={`card flex flex-col gap-4 relative transition-all duration-300
        ${isThisRunning ? "border-critical/60 glow-red" : "hover:border-accent/30"}
        ${isRunning && !isThisRunning ? "opacity-40 pointer-events-none" : ""}`}
    >
      {/* Attack type badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
            style={{ background: `${persona.avatarColor}25`, border: `2px solid ${persona.avatarColor}50`, color: persona.avatarColor }}
          >
            {persona.avatarInitials}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{persona.name}</p>
            <p className="text-xs text-muted">{persona.role} · {persona.department}</p>
          </div>
        </div>
        <span className={persona.attackBadge}>{persona.attackType}</span>
      </div>

      {/* Behaviour list */}
      <div>
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">Simulated Behaviours</p>
        <ul className="space-y-1.5">
          {persona.behaviours.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-critical/70 flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Risk preview */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <span className="text-[10px] text-muted">Expected risk score:</span>
        <span
          className="font-bold font-mono text-sm"
          style={{ color: scoreColor(persona.riskScore) }}
        >
          {persona.riskScore.toFixed(1)}
        </span>
        <span className={`${scoreBadge(persona.riskScore)} text-[10px] px-1.5 py-0.5`}>
          {scoreLabel(persona.riskScore)}
        </span>
      </div>

      {/* Launch button */}
      <button
        id={`btn-launch-${persona.id}`}
        className="btn-primary w-full justify-center mt-1"
        onClick={() => onLaunch(persona)}
        disabled={isRunning}
        style={isThisRunning ? { background: "#dc2626" } : {}}
      >
        {isThisRunning ? (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Running Simulation…
          </>
        ) : (
          <>
            <span>▶</span>
            Launch Simulation
          </>
        )}
      </button>
    </div>
  );
}

// ── Simulation Console ────────────────────────────────────────────────────────
function SimulationConsole({ persona, logs, done, onReset }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const isCritical = persona.riskScore >= 80;
  const borderCol = scoreColor(persona.riskScore);
  const nowStr = new Date().toLocaleString();

  return (
    <div className="animate-slide-up space-y-4">
      {/* Console terminal */}
      <div className="card border-border/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-xs text-muted font-mono ml-2">
              sentinel-sim — {persona.name} [{persona.attackType}]
            </span>
          </div>
          {done && (
            <button
              id="btn-reset-simulation"
              className="btn-ghost text-xs py-1 px-3"
              onClick={onReset}
            >
              ↺ Reset
            </button>
          )}
        </div>

        <div
          className="rounded-lg p-4 font-mono text-xs leading-relaxed overflow-y-auto"
          style={{
            background: "#050d1a",
            minHeight: "220px",
            maxHeight: "300px",
            border: "1px solid #1e293b",
          }}
        >
          {logs.map((line, i) => {
            const isAlert = line.startsWith("⚠");
            return (
              <div
                key={i}
                className="animate-fade-in"
                style={{
                  color: isAlert ? "#dc2626" : "#22c55e",
                  fontWeight: isAlert ? "700" : "400",
                  marginBottom: "4px",
                  textShadow: isAlert
                    ? "0 0 8px rgba(220,38,38,0.5)"
                    : "0 0 6px rgba(34,197,94,0.3)",
                }}
              >
                <span style={{ color: "#4b5563", marginRight: "8px" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {line}
              </div>
            );
          })}
          {!done && logs.length > 0 && (
            <span
              className="inline-block w-2 h-4 ml-1 animate-pulse"
              style={{ background: "#22c55e", verticalAlign: "middle" }}
            />
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Mock Alert Card – shown after simulation completes */}
      {done && (
        <div
          id="simulated-alert-card"
          className="card animate-slide-up"
          style={{
            borderColor: `${borderCol}40`,
            boxShadow: `0 0 24px ${borderCol}20`,
          }}
        >
          {/* Alert header */}
          <div className="flex items-start gap-4">
            {/* Score ring */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
              <div
                className="w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold font-mono text-base"
                style={{
                  borderColor: borderCol,
                  color: borderCol,
                  boxShadow: `0 0 16px ${borderCol}40`,
                }}
              >
                {persona.riskScore.toFixed(0)}
              </div>
              <span className={`${scoreBadge(persona.riskScore)} text-[10px] px-1.5 py-0.5`}>
                {scoreLabel(persona.riskScore)}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-semibold text-white">{persona.name}</span>
                <span className="text-muted text-xs font-mono">
                  SIM-{persona.id.toUpperCase().slice(0, 6)}
                </span>
                <span className="text-border text-xs">·</span>
                <span className="text-muted text-xs">{persona.department}</span>
                <span className={scoreBadge(persona.riskScore)}>{persona.attackType}</span>
              </div>

              <p className="text-sm leading-relaxed mt-1 text-slate-300">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-2 mb-0.5"
                  style={{ background: borderCol }}
                />
                {persona.explanation}
              </p>

              <div className="flex items-center gap-4 mt-2">
                <span className="text-[11px] text-muted font-mono">
                  Threat Category: {persona.threatCategory}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-1">
                <span className="text-[11px] text-muted font-mono">
                  Detected (simulated): {nowStr}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                id="btn-escalate-sim"
                className="btn-primary text-xs py-1.5 px-3"
                style={{ background: borderCol }}
                onClick={() => alert("🚨 Alert escalated to SOC team (demo only)")}
              >
                🚨 Escalate
              </button>
              <button
                id="btn-dismiss-sim"
                className="text-xs text-muted hover:text-low border border-border hover:border-low/40
                           hover:bg-low/5 px-3 py-1.5 rounded-lg transition-all duration-150"
                onClick={onReset}
              >
                ✓ Dismiss
              </button>
            </div>
          </div>

          {/* SHAP bar strip */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">
              SHAP Feature Attribution
            </p>
            <div className="space-y-2">
              {persona.id === "data-exfiltrator" && (
                <>
                  <ShapBar label="data_transfer_mb" value={68} color={borderCol} />
                  <ShapBar label="usb_events" value={21} color={borderCol} />
                  <ShapBar label="files_accessed" value={11} color="#f59e0b" />
                </>
              )}
              {persona.id === "credential-abuser" && (
                <>
                  <ShapBar label="failed_logins" value={54} color={borderCol} />
                  <ShapBar label="after_hours_access" value={29} color={borderCol} />
                  <ShapBar label="login_hour_deviation" value={17} color="#f59e0b" />
                </>
              )}
              {persona.id === "insider-recon" && (
                <>
                  <ShapBar label="files_accessed" value={49} color={borderCol} />
                  <ShapBar label="email_recipients_count" value={32} color={borderCol} />
                  <ShapBar label="after_hours_access" value={19} color="#f59e0b" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShapBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted font-mono w-44 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{value}%</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ThreatTheater() {
  const [activePersona, setActivePersona] = useState(null);
  const [logs, setLogs]                   = useState([]);
  const [done, setDone]                   = useState(false);
  const [running, setRunning]             = useState(false);
  const consoleRef                        = useRef(null);
  const timeoutsRef                       = useRef([]);

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

    // Scroll to console
    setTimeout(() => {
      consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    // Print log lines one by one with 800ms gaps
    persona.consoleLogs.forEach((line, i) => {
      const t = setTimeout(() => {
        setLogs((prev) => [...prev, line]);
        if (i === persona.consoleLogs.length - 1) {
          setDone(true);
          setRunning(false);
        }
      }, i * 800);
      timeoutsRef.current.push(t);
    });
  };

  const handleReset = () => {
    clearTimeouts();
    setActivePersona(null);
    setLogs([]);
    setDone(false);
    setRunning(false);
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">Threat Theater</h2>
            {/* Pulsing SIMULATION MODE badge */}
            <div className="flex items-center gap-1.5 bg-critical/10 border border-critical/30 rounded-full px-3 py-1">
              <span
                className="w-2 h-2 rounded-full bg-critical"
                style={{ animation: "pulse 1s cubic-bezier(0.4,0,0.6,1) infinite" }}
              />
              <span className="text-critical text-[11px] font-bold tracking-widest uppercase font-mono">
                Simulation Mode
              </span>
            </div>
          </div>
          <p className="text-sm text-muted">
            Live Attack Simulation Mode — select a malicious persona to inject anomalous events and trigger the detection pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted font-mono bg-card border border-border rounded-lg px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-low animate-pulse-slow" />
          Frontend-only · No backend calls
        </div>
      </div>

      {/* ── Divider with label ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">
          Select Attack Persona
        </span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* ── Persona Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PERSONAS.map((p) => (
          <PersonaCard
            key={p.id}
            persona={p}
            onLaunch={handleLaunch}
            isRunning={running || (done && activePersona)}
            isThisRunning={(running || done) && activePersona?.id === p.id}
          />
        ))}
      </div>

      {/* ── Simulation Console ───────────────────────────────────────────────── */}
      {activePersona && (
        <>
          <div ref={consoleRef} className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">
              Simulation Console
            </span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <SimulationConsole
            persona={activePersona}
            logs={logs}
            done={done}
            onReset={handleReset}
          />
        </>
      )}

      {/* ── Footer disclaimer ────────────────────────────────────────────────── */}
      <p className="text-center text-[11px] text-muted/50 font-mono pb-2">
        ⚠ All simulated data is synthetic and for demonstration purposes only. No backend systems are modified.
      </p>
    </div>
  );
}
