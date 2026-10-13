import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Role badge colours
const ROLE_INFO = {
  intern:         { label: "Intern",          color: "text-low",    bg: "bg-low/10 border-low/30" },
  junior:         { label: "Junior",          color: "text-accent", bg: "bg-accent/10 border-accent/30" },
  senior_manager: { label: "Senior Manager",  color: "text-medium", bg: "bg-medium/10 border-medium/30" },
  manager:        { label: "Manager",         color: "text-high",   bg: "bg-high/10 border-high/30" },
};

// Credential hints for demo
const DEMO_CREDENTIALS = [
  { username: "intern01",   password: "intern123",  role: "intern" },
  { username: "junior01",   password: "junior123",  role: "junior" },
  { username: "senior_mgr", password: "senior123",  role: "senior_manager" },
  { username: "manager",    password: "manager123", role: "manager" },
];

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail || "Login failed. Check credentials.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred) => {
    setUsername(cred.username);
    setPassword(cred.password);
    setError("");
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                        bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent/20 border border-accent/40 rounded-2xl
                          flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                 stroke="#6366f1" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">BehaviorSentinel</h1>
          <p className="text-muted text-sm mt-1 font-mono tracking-widest uppercase text-xs">
            Insider Threat Detection
          </p>
        </div>

        {/* Login card */}
        <div className="card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Sign In</h2>
            <p className="text-muted text-sm mt-0.5">Enter your credentials to access the platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                Username
              </label>
              <input
                id="input-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. manager"
                autoComplete="username"
                className="w-full bg-navy border border-border rounded-lg px-3 py-2.5 text-sm text-slate-200
                           focus:outline-none focus:border-accent/60 placeholder:text-muted transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="input-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full bg-navy border border-border rounded-lg px-3 py-2.5 text-sm text-slate-200
                             focus:outline-none focus:border-accent/60 placeholder:text-muted transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-slate-300"
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-high/10 border border-high/30 text-high rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                    <path d="M21 12a9 9 0 00-9-9" />
                  </svg>
                  Signing in…
                </>
              ) : "Sign In →"}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted mb-3 text-center uppercase tracking-widest font-semibold">
              Demo Accounts — click to fill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((cred) => {
                const info = ROLE_INFO[cred.role];
                return (
                  <button
                    key={cred.username}
                    id={`demo-${cred.role}`}
                    type="button"
                    onClick={() => fillDemo(cred)}
                    className={`text-left px-3 py-2.5 rounded-lg border transition-all duration-150
                                hover:scale-[1.02] ${info.bg}
                                ${username === cred.username ? "ring-1 ring-accent/50" : ""}`}
                  >
                    <div className={`text-xs font-bold ${info.color}`}>{info.label}</div>
                    <div className="text-[10px] text-muted font-mono mt-0.5">{cred.username}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Role access table */}
        <div className="card mt-4 text-xs">
          <p className="text-muted font-semibold uppercase tracking-widest mb-3 text-[10px]">Access Levels</p>
          <div className="space-y-1.5">
            {[
              { role: "Intern",          access: "Own profile + activity" },
              { role: "Junior",          access: "+ Team risk scores + downloads" },
              { role: "Senior Manager",  access: "+ All users + Alerts + dismiss" },
              { role: "Manager",         access: "+ Run Detection + Full reports" },
            ].map(row => (
              <div key={row.role} className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">{row.role}</span>
                <span className="text-muted">{row.access}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
