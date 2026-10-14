import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  LayoutDashboard,
  Users,
  AlertTriangle,
  Crosshair,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  Radio,
  X,
} from "lucide-react";

const ROLE_LABELS = {
  intern: "Intern",
  junior: "Junior Analyst",
  senior_manager: "Senior Manager",
  manager: "Director",
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Sidebar({ onClose, isMobile = false }) {
  const { user, logout, hasRole } = useAuth();
  const isSeniorMgr = hasRole("senior_manager");

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
      isActive
        ? "bg-[#EFF6FF] text-[#2563EB] font-semibold"
        : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
    }`;

  return (
    <aside className="flex flex-col h-full w-64 bg-white border-r border-[#E2E8F0] select-none">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
            <Shield size={17} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-[14px] font-semibold text-[#0F172A] tracking-tight">
                BehaviorSentinel
              </h1>
            </div>
            <p className="text-[11px] text-[#64748B] font-medium">
              Enterprise SOC Platform
            </p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Monitoring & Detection */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Security Operations
          </div>
          <div className="space-y-0.5">
            {isSeniorMgr && (
              <>
                <NavLink
                  id="nav-dashboard"
                  to="/dashboard"
                  onClick={onClose}
                  className={navItemClass}
                >
                  <LayoutDashboard size={16} />
                  <span>Overview</span>
                </NavLink>

                <NavLink
                  id="nav-threat-detection"
                  to="/threat-detection"
                  onClick={onClose}
                  className={navItemClass}
                >
                  <Users size={16} />
                  <span>Threat Detection</span>
                </NavLink>

                <NavLink
                  id="nav-alerts"
                  to="/alerts"
                  onClick={onClose}
                  className={navItemClass}
                >
                  <AlertTriangle size={16} />
                  <span>Investigation Queue</span>
                </NavLink>
              </>
            )}

            <NavLink
              id="nav-simulation"
              to="/threat-theater"
              onClick={onClose}
              className={navItemClass}
            >
              <Crosshair size={16} />
              <span>Attack Simulation</span>
            </NavLink>

            <NavLink
              id="nav-activity"
              to="/my-activity"
              onClick={onClose}
              className={navItemClass}
            >
              <Activity size={16} />
              <span>Activity Logs</span>
            </NavLink>
          </div>
        </div>

        {/* Intelligence & Analytics */}
        {isSeniorMgr && (
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              Intelligence
            </div>
            <div className="space-y-0.5">
              <NavLink
                id="nav-analytics"
                to="/analytics"
                onClick={onClose}
                className={navItemClass}
              >
                <BarChart3 size={16} />
                <span>Analytics</span>
              </NavLink>

              <NavLink
                id="nav-settings"
                to="/settings"
                onClick={onClose}
                className={navItemClass}
              >
                <Settings size={16} />
                <span>Settings</span>
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      {/* Live Ingestion Health Status */}
      <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
            </span>
            <span className="text-[11.5px] font-medium text-[#0F172A]">
              Telemetry stream
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#16A34A] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#BBF7D0]">
            Active
          </span>
        </div>
      </div>

      {/* Current User Card */}
      <div className="p-3 border-t border-[#E2E8F0]">
        {user && (
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8FAFC] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[11px] font-semibold text-[#2563EB] shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#0F172A] truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-[#64748B] truncate">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>
            </div>
            <button
              id="btn-sidebar-logout"
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-md transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
