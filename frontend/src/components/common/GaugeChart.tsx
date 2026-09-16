interface GaugeChartProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  unit?: string;
  showValue?: boolean;
}

export default function GaugeChart({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color = '#00d4ff',
  bgColor = '#1e2550',
  label,
  unit = '',
  showValue = true,
}: GaugeChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius * 0.75; // 270 degrees
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform rotate-[135deg]"
      >
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
          strokeLinecap="round"
          className="gauge-ring"
        />
        {/* Value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="gauge-ring"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      {showValue && (
        <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
          <span className="text-xl font-bold font-mono" style={{ color }}>
            {value.toFixed(1)}
          </span>
          {unit && <span className="text-xs text-gray-500">{unit}</span>}
        </div>
      )}
      {label && (
        <span className="mt-1 text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      )}
    </div>
  );
}
