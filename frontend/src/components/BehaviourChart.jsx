import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-dropdown px-3 py-2 text-xs">
      <p className="text-[#64748B] mb-0.5 font-medium">Day {label}</p>
      <p className="font-semibold text-[#0F172A] tabular-nums text-[13px]">
        {typeof val === "number" ? val.toFixed(2) : val}
      </p>
    </div>
  );
};

export default function BehaviourChart({
  data = [],
  dataKey,
  color = "#2563EB",
  yDomain,
  referenceLine,
  height = 140,
}) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-28 text-[#94A3B8] text-[13px] bg-[#F8FAFC] rounded-lg border border-[#F1F5F9]">
        No telemetry baseline recorded
      </div>
    );
  }

  const gradId = `grad-${dataKey}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.16} />
            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          interval={9}
          tickFormatter={(v) => `D${v}`}
        />

        <YAxis
          domain={yDomain || ["auto", "auto"]}
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
          width={32}
        />

        <Tooltip content={<CustomTooltip />} />

        {referenceLine && (
          <ReferenceLine
            y={referenceLine}
            stroke="#DC2626"
            strokeDasharray="4 3"
            strokeOpacity={0.7}
            label={{
              value: "Threshold",
              fontSize: 10,
              fill: "#DC2626",
              position: "insideTopRight",
            }}
          />
        )}

        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 3.5, fill: color, stroke: "#FFFFFF", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
