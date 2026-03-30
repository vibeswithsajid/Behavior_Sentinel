import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, Dot,
} from "recharts";

const CustomTooltip = ({ active, payload, label, dataKey }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-muted text-xs mb-1">Day {label}</p>
      <p className="font-semibold text-white">
        {typeof val === "number" ? val.toFixed(2) : val}
      </p>
    </div>
  );
};

const CustomDot = ({ cx, cy, value, threshold, color }) => {
  if (threshold && value > threshold) {
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#0f172a" strokeWidth={2} />;
  }
  return null;
};

/**
 * Generic line / area chart wrapper using Recharts.
 */
export default function BehaviourChart({
  data = [],
  dataKey,
  label,
  color = "#6366f1",
  yDomain,
  referenceLine,
  height = 160,
}) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-muted text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#334155"
          opacity={0.4}
          vertical={false}
        />

        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          interval={9}
          tickFormatter={v => `D${v}`}
        />

        <YAxis
          domain={yDomain || ["auto", "auto"]}
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          width={36}
        />

        <Tooltip content={<CustomTooltip dataKey={dataKey} />} />

        {referenceLine && (
          <ReferenceLine
            y={referenceLine}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: "Alert", fontSize: 9, fill: "#ef4444", position: "insideTopRight" }}
          />
        )}

        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${dataKey})`}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: "#0f172a", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
