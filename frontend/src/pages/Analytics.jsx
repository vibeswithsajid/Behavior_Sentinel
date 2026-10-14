import { useState, useEffect, useMemo } from "react";
import { fetchUsers, fetchStats } from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
} from "lucide-react";

export default function Analytics() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchStats()])
      .then(([u, s]) => {
        setUsers(u || []);
        setStats(s || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Department distribution
  const departmentData = useMemo(() => {
    const deptMap = {};
    users.forEach((u) => {
      const dept = u.department || "Other";
      if (!deptMap[dept]) deptMap[dept] = { count: 0, totalScore: 0 };
      deptMap[dept].count += 1;
      deptMap[dept].totalScore += u.risk_score || 0;
    });

    return Object.entries(deptMap).map(([dept, val]) => ({
      name: dept,
      avgRisk: Number((val.totalScore / val.count).toFixed(1)),
      count: val.count,
    }));
  }, [users]);

  // Threat Category distribution
  const threatCategoryData = useMemo(() => {
    let exfiltration = 0;
    let credential = 0;
    let harvesting = 0;
    let nominal = 0;

    users.forEach((u) => {
      const s = u.risk_score || 0;
      if (s >= 80) exfiltration += 1;
      else if (s >= 70) credential += 1;
      else if (s >= 50) harvesting += 1;
      else nominal += 1;
    });

    return [
      { name: "Exfiltration Vectors", value: exfiltration, color: "#DC2626" },
      { name: "Credential Anomalies", value: credential, color: "#EA580C" },
      { name: "Directory Harvesting", value: harvesting, color: "#D97706" },
      { name: "Nominal Baseline", value: nominal, color: "#16A34A" },
    ].filter((d) => d.value > 0);
  }, [users]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-semibold text-[#0F172A]">Security Analytics & Telemetry</h2>
          <span className="badge-blue text-[11px]">Ensemble Metrics</span>
        </div>
        <p className="text-[13px] text-[#64748B]">
          Aggregated behavioral baselines, anomaly density, and ensemble ML model performance across the enterprise.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between text-[#64748B] text-[12px]">
            <span>Mean Anomaly Score</span>
            <Activity size={15} className="text-[#2563EB]" />
          </div>
          <div className="text-2xl font-semibold text-[#0F172A] tabular-nums mt-1">
            {stats?.avg_risk_score ?? "32.4"}
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium">Standard fleet baseline</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[#64748B] text-[12px]">
            <span>Inference Latency</span>
            <Clock size={15} className="text-[#16A34A]" />
          </div>
          <div className="text-2xl font-semibold text-[#0F172A] tabular-nums mt-1">
            38 ms
          </div>
          <div className="text-[11px] text-[#64748B]">Sub-50ms real-time SLA</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[#64748B] text-[12px]">
            <span>Ensemble Models</span>
            <Cpu size={15} className="text-[#7C3AED]" />
          </div>
          <div className="text-2xl font-semibold text-[#0F172A] tabular-nums mt-1">
            2 ML Models
          </div>
          <div className="text-[11px] text-[#64748B]">Isolation Forest + Autoencoder</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[#64748B] text-[12px]">
            <span>Baseline History</span>
            <ShieldCheck size={15} className="text-[#2563EB]" />
          </div>
          <div className="text-2xl font-semibold text-[#0F172A] tabular-nums mt-1">
            45 Days
          </div>
          <div className="text-[11px] text-[#64748B]">Rolling statistical window</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Average Risk */}
        <div className="card">
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">Average Risk by Department</h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">Mean ensemble anomaly score grouped by business unit</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} / 100`, "Avg Risk Score"]}
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="avgRisk" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Category Breakdown */}
        <div className="card">
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">Fleet Severity Classification</h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">Distribution of monitored accounts by primary threat classification</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {threatCategoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value, entry) => (
                    <span className="text-[12px] text-[#0F172A]">
                      {value} <span className="text-[#64748B]">({entry.payload.value})</span>
                    </span>
                  )}
                  iconSize={8}
                  iconType="circle"
                />
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ensemble Methodology Details */}
      <div className="card space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0F172A]">Detection Pipeline Architecture</h3>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            How BehaviorSentinel processes real-time telemetry packets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="text-[13px] font-semibold text-[#0F172A] mb-1">1. Baseline Deviation</div>
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              Calculates z-scores against each user&apos;s 45-day normal behavior matrix across 7 dimensions (login hours, volume, files, USB, email).
            </p>
          </div>

          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="text-[13px] font-semibold text-[#0F172A] mb-1">2. Dual-Engine Ensemble</div>
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              Combines Isolation Forest tree isolation depth with Deep Autoencoder reconstruction mean squared error into an aligned 0–100 index.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="text-[13px] font-semibold text-[#0F172A] mb-1">3. SHAP Explainability</div>
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              Computes Shapley values on the fly to attribute exact percentages to the suspicious features, generating plain English evidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
