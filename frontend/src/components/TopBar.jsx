import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchAlerts } from "../api";
import {
  Search,
  Bell,
  ChevronRight,
  Menu,
  Shield,
  CheckCircle2,
  ExternalLink,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function TopBar({ breadcrumbs = [], onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout, login } = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (user?.role === "senior_manager" || user?.role === "manager") {
      fetchAlerts()
        .then((data) => setAlerts(data || []))
        .catch(() => setAlerts([]));
    }
  }, [user]);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/threat-detection?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleQuickSwitch = async (roleUsername, rolePassword) => {
    setShowUserMenu(false);
    try {
      await login(roleUsername, rolePassword);
      navigate("/dashboard");
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] h-14 flex items-center justify-between px-4 sm:px-6">
      {/* Left side: Mobile menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-[13px]">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={13} className="text-[#94A3B8]" />}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "text-[#0F172A] font-semibold"
                    : "text-[#64748B] hover:text-[#0F172A] transition-colors"
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Right side: Search, Telemetry Link, Notifications, User Menu */}
      <div className="flex items-center gap-3">
        {/* Global quick search */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden sm:flex items-center relative"
        >
          <Search
            size={14}
            className="absolute left-2.5 text-[#94A3B8] pointer-events-none"
          />
          <input
            id="topbar-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threats, users, IPs…"
            className="h-8 pl-8 pr-12 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-[12.5px] text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all w-48 lg:w-64"
          />
          <kbd className="absolute right-2 px-1 py-0.5 text-[10px] font-mono text-[#94A3B8] bg-white border border-[#E2E8F0] rounded pointer-events-none shadow-2xs">
            ⌘K
          </kbd>
        </form>

        {/* EDR Client Integration Link */}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:flex items-center gap-1.5 text-[12px] font-medium text-[#64748B] hover:text-[#2563EB] bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#BFDBFE] px-2.5 py-1 rounded-md transition-all"
          title="Open simulated Client Intranet (Apex Global)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          <span>Apex Global Intranet</span>
          <ExternalLink size={11} className="text-[#94A3B8]" />
        </a>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications"
            onClick={() => setShowNotifications((s) => !s)}
            className="relative p-1.5 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            aria-label="View notifications"
          >
            <Bell size={17} />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#DC2626] rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E2E8F0] rounded-lg shadow-dropdown z-50 p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <h4 className="text-[13px] font-semibold text-[#0F172A]">
                    Active Security Alerts
                  </h4>
                  <span className="badge-critical text-[10px] py-0 px-1.5">
                    {alerts.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate("/alerts");
                  }}
                  className="text-[11.5px] font-medium text-[#2563EB] hover:underline"
                >
                  View queue
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F5F9]">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-[#94A3B8] text-[13px]">
                    <CheckCircle2
                      size={24}
                      className="text-[#16A34A] mx-auto mb-2 opacity-80"
                    />
                    All entities normal. No unhandled alerts.
                  </div>
                ) : (
                  alerts.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate(`/user/${a.user_id}`);
                      }}
                      className="p-3 hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[12.5px] font-semibold text-[#0F172A]">
                          {a.name || a.user_id}
                        </span>
                        <span
                          className={`badge ${
                            a.risk_score >= 80
                              ? "badge-critical"
                              : a.risk_score >= 65
                              ? "badge-high"
                              : "badge-medium"
                          }`}
                        >
                          Score {a.risk_score?.toFixed(0)}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#64748B] line-clamp-2">
                        {a.explanation || "Anomalous behavior vector detected."}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            id="btn-user-menu"
            onClick={() => setShowUserMenu((s) => !s)}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-[#F1F5F9] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[11px] font-semibold text-[#2563EB]">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "BS"}
            </div>
            <ChevronDown size={14} className="text-[#94A3B8]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E8F0] rounded-lg shadow-dropdown z-50 p-2">
              <div className="px-3 py-2 border-b border-[#E2E8F0] mb-1">
                <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-[#64748B] truncate">
                  {user?.department || "SOC Security Team"} ·{" "}
                  <span className="capitalize">{user?.role?.replace("_", " ")}</span>
                </p>
              </div>

              {/* Demo role switchers */}
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">
                Switch Role (Demo)
              </div>
              <div className="space-y-0.5">
                {[
                  {
                    username: "manager",
                    pw: "manager123",
                    label: "Executive Director",
                    role: "manager",
                  },
                  {
                    username: "senior_mgr",
                    pw: "senior123",
                    label: "Senior SOC Manager",
                    role: "senior_manager",
                  },
                  {
                    username: "junior01",
                    pw: "junior123",
                    label: "Junior Analyst",
                    role: "junior",
                  },
                  {
                    username: "intern01",
                    pw: "intern123",
                    label: "Intern Analyst",
                    role: "intern",
                  },
                ].map((item) => (
                  <button
                    key={item.username}
                    onClick={() => handleQuickSwitch(item.username, item.pw)}
                    className={`w-full text-left px-3 py-1.5 rounded text-[12px] flex items-center justify-between ${
                      user?.role === item.role
                        ? "bg-[#EFF6FF] text-[#2563EB] font-medium"
                        : "text-[#334155] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {user?.role === item.role && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-[#E2E8F0] mt-1.5 pt-1.5">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-1.5 rounded text-[12px] text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 font-medium"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
