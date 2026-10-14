import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, Eye, EyeOff, Lock, User, ArrowRight, AlertTriangle } from "lucide-react";

const ROLE_INFO = {
  intern: {
    label: "Intern Analyst",
    scope: "Personal activity telemetry & audit log",
    color: "border-[#E2E8F0] hover:border-[#CBD5E1] bg-white",
    badge: "badge-neutral",
  },
  junior: {
    label: "Junior Analyst",
    scope: "Personal telemetry + team risk scores export",
    color: "border-[#BFDBFE] hover:border-[#93C5FD] bg-[#EFF6FF]",
    badge: "badge-blue",
  },
  senior_manager: {
    label: "Senior SOC Manager",
    scope: "Full overview, threat detection, and investigation queue",
    color: "border-[#DDD6FE] hover:border-[#C4B5FD] bg-[#F5F3FF]",
    badge: "text-[#7C3AED] bg-white border border-[#DDD6FE]",
  },
  manager: {
    label: "Executive Director",
    scope: "Full administrator clearance + ML pipeline execution",
    color: "border-[#FED7AA] hover:border-[#FDBA74] bg-[#FFF7ED]",
    badge: "badge-high",
  },
};

const DEMO_CREDENTIALS = [
  { username: "intern01", password: "intern123", role: "intern" },
  { username: "junior01", password: "junior123", role: "junior" },
  { username: "senior_mgr", password: "senior123", role: "senior_manager" },
  { username: "manager", password: "manager123", role: "manager" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail || "Invalid credentials. Please verify your username and password.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = async (cred) => {
    setUsername(cred.username);
    setPassword(cred.password);
    setError("");
    setLoading(true);
    try {
      await login(cred.username, cred.password);
      navigate("/", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail || "Authentication failed.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 selection:bg-[#2563EB] selection:text-white">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB] text-white shadow-card mb-1">
            <Shield size={24} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            BehaviorSentinel
          </h1>
          <p className="text-[13.5px] text-[#64748B]">
            Enterprise Insider Threat Detection & Behavioral Telemetry
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="card shadow-card-md p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="input-username"
                className="block text-[13px] font-medium text-[#0F172A] mb-1.5"
              >
                Username or Agent ID
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                />
                <input
                  id="input-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. manager or intern01"
                  autoComplete="username"
                  className="input pl-9 text-[13px]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-password"
                  className="block text-[13px] font-medium text-[#0F172A]"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                />
                <input
                  id="input-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security passphrase"
                  autoComplete="current-password"
                  className="input pl-9 pr-10 text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 text-[12.5px] text-[#DC2626]">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-[13.5px] font-medium flex items-center justify-center gap-2"
            >
              <span>{loading ? "Authenticating…" : "Sign in to Security Platform"}</span>
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="border-t border-[#E2E8F0] pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                One-Click Role Demonstration
              </span>
              <span className="text-[11px] text-[#94A3B8]">Click any tier to enter</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((cred) => {
                const info = ROLE_INFO[cred.role];
                return (
                  <button
                    key={cred.username}
                    id={`demo-${cred.role}`}
                    type="button"
                    onClick={() => fillDemo(cred)}
                    disabled={loading}
                    className={`text-left p-3 rounded-lg border transition-all hover:shadow-xs flex flex-col justify-between ${info.color}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12.5px] font-bold text-[#0F172A]">
                          {info.label}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${info.badge}`}>
                          {cred.role.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] leading-tight">
                        {info.scope}
                      </p>
                    </div>
                    <div className="text-[10.5px] font-mono text-[#94A3B8] mt-2">
                      User: {cred.username}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security disclaimer */}
        <p className="text-center text-[12px] text-[#94A3B8]">
          Protected by BehaviorSentinel EDR · 256-bit AES Token Encryption
        </p>
      </div>
    </div>
  );
}
