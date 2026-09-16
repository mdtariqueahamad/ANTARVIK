import { SEVERITY_COLORS } from '../../utils/constants';
import { Severity } from '../../types';

interface StatusBadgeProps {
  severity?: Severity;
  status?: string;
  label: string;
  pulse?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  operational: '#00ff88',
  running: '#00ff88',
  standby: '#00d4ff',
  degraded: '#ffd700',
  maintenance: '#ffd700',
  failed: '#ff3b3b',
  open: '#00d4ff',
  in_progress: '#ffd700',
  closed: '#8b9dc3',
  compliant: '#00ff88',
  warning: '#ffd700',
  violation: '#ff3b3b',
  active: '#ff3b3b',
  acknowledged: '#ffd700',
  resolved: '#00ff88',
};

export default function StatusBadge({ severity, status, label, pulse }: StatusBadgeProps) {
  const color = severity
    ? SEVERITY_COLORS[severity]
    : STATUS_COLORS[status || ''] || '#8b9dc3';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{
        color,
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
