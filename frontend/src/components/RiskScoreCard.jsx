import { useEffect, useRef } from "react";

const getRiskLabel = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const getRiskColor = (score) => {
  if (score >= 80) return "#DC2626";
  if (score >= 65) return "#EA580C";
  if (score >= 40) return "#D97706";
  return "#16A34A";
};

const getRiskTrackColor = (score) => {
  if (score >= 80) return "#FEE2E2";
  if (score >= 65) return "#FFEDD5";
  if (score >= 40) return "#FEF3C7";
  return "#DCFCE7";
};

export default function RiskScoreCard({ score = 0 }) {
  const circleRef = useRef(null);

  const RADIUS = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const clamped = Math.min(Math.max(score, 0), 100);
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const color = getRiskColor(clamped);
  const trackColor = getRiskTrackColor(clamped);
  const label = getRiskLabel(clamped);

  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
    const anim = requestAnimationFrame(() => {
      if (circleRef.current) {
        circleRef.current.style.transition = "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
        circleRef.current.style.strokeDashoffset = offset;
      }
    });
    return () => cancelAnimationFrame(anim);
  }, [score, offset, CIRCUMFERENCE]);

  return (
    <div
      id="risk-score-card"
      className="flex flex-col items-center justify-center select-none"
      title={`Risk score: ${clamped.toFixed(1)}`}
    >
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={trackColor}
            strokeWidth="7"
          />
          {/* Animated Gauge Arc */}
          <circle
            ref={circleRef}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight tabular-nums" style={{ color }}>
            {clamped.toFixed(0)}
          </span>
          <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span
          className="text-[12px] font-semibold px-2 py-0.5 rounded-full border"
          style={{
            color,
            backgroundColor: `${color}10`,
            borderColor: `${color}30`,
          }}
        >
          {label} Threat Level
        </span>
      </div>
    </div>
  );
}
