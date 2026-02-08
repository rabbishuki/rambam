/**
 * Circular progress indicator with three visual states:
 *   0%    — empty circle outline
 *   1–99% — progress ring with percentage number
 *   100%  — full ring with checkmark
 */

interface ProgressCircleProps {
  /** Completion percentage 0–100 */
  percentage: number;
  /** SVG size in px (default 30) */
  size?: number;
  /** Stroke/text color (default theme primary) */
  color?: string;
}

export function ProgressCircle({
  percentage,
  size = 30,
  color = "var(--color-primary)",
}: ProgressCircleProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const isComplete = clamped === 100;

  // Scale geometry to size — radius leaves room for stroke
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const sw = size >= 28 ? 2 : 1.5;

  // Checkmark path scaled to circle
  const chkX = cx - size * 0.16;
  const chkMid = cx - size * 0.03;
  const chkEnd = cx + size * 0.19;
  const chkY = cy + size * 0.02;
  const chkTop = cy - size * 0.12;
  const chkBot = cy + size * 0.14;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={color}
        strokeWidth={sw}
        opacity="0.2"
      />

      {/* Progress arc */}
      {clamped > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={isComplete ? 0.8 : 0.6}
        />
      )}

      {/* Center content */}
      {isComplete ? (
        <path
          d={`M${chkX} ${chkY}L${chkMid} ${chkBot}L${chkEnd} ${chkTop}`}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      ) : clamped > 0 ? (
        <text
          x={cx}
          y={cy + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.34}
          fontWeight="600"
          fill={color}
          opacity="0.7"
        >
          {clamped}
        </text>
      ) : null}
    </svg>
  );
}
