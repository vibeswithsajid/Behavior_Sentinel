import { useEffect, useRef } from "react";

const scoreColor = (score) => {
  if (score >= 80) return "#dc2626";
  if (score >= 65) return "#ef4444";
  if (score >= 40) return "#f59e0b";
  return "#22c55e";
};

const scoreLabel = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High Risk";
  if (score >= 40) return "Medium";
  return "Low Risk";
};

/**
 * Animated circular SVG gauge showing a risk score.
 */
export default function RiskScoreCard({ score = 0 }) {
  const circleRef = useRef(null);

  const RADIUS      = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const clampedScore = Math.min(Math.max(score, 0), 100);
  const offset = CIRCUMFERENCE - (clampedScore / 100) * CIRCUMFERENCE;
  const color  = scoreColor(clampedScore);
  const label  = scoreLabel(clampedScore);

  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.style.strokeDashoffset = CIRCUMFERENCE; // reset
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (circleRef.current) {
          circleRef.current.style.transition = "stroke-dashoffset 1s ease-out";
          circleRef.current.style.strokeDashoffset = offset;
        }
      }, 50);
    });
  }, [score, offset]);

  return (
    <div
      id="risk-score-card"
      className="flex flex-col items-center justify-center"
      title={`Risk Score: ${clampedScore.toFixed(1)}`}
    >
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke="#334155"
            strokeWidth="8"
          />
          {/* Score arc */}
          <circle
            ref={circleRef}
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
            style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        {/* Centre text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono" style={{ color }}>
            {clampedScore.toFixed(0)}
          </span>
          <span className="text-[9px] text-muted uppercase tracking-widest leading-tight">score</span>
        </div>
      </div>
      <span
        className="text-xs font-semibold mt-1 uppercase tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
