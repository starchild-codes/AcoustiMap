interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  /** color of the progress arc */
  color?: string
  /** color of the background track */
  trackColor?: string
  label?: string
  sublabel?: string
}

export default function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = '#2c5a37',
  trackColor = '#e7e0d2',
  label,
  sublabel,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(value / max, 0), 1)
  const dash = pct * circumference

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${label}: ${value} out of ${max}` : `${value} out of ${max}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className="font-display text-2xl font-semibold text-charcoal-900 tabular-nums">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-[10px] font-medium text-charcoal-400 uppercase tracking-wide">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}
