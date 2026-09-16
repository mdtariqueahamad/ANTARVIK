import { OperatingMode } from '../../types';
import { MODE_COLORS, MODE_LABELS } from '../../utils/constants';
import { formatRelative } from '../../utils/formatters';

interface ModeIndicatorProps {
  mode: OperatingMode;
  lastSync?: string | null;
  syncProgress?: number | null;
}

export default function ModeIndicator({ mode, lastSync, syncProgress }: ModeIndicatorProps) {
  const color = MODE_COLORS[mode];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-antarctic-border bg-antarctic-navy">
      <span
        className="w-2.5 h-2.5 rounded-full animate-pulse-slow"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
      <span className="text-sm font-medium" style={{ color }}>
        {MODE_LABELS[mode]}
      </span>
      {mode === 'degraded' && lastSync && (
        <span className="text-xs text-gray-500 ml-1">
          Last sync: {formatRelative(lastSync)}
        </span>
      )}
      {mode === 'recovery' && syncProgress !== null && syncProgress !== undefined && (
        <div className="flex items-center gap-1.5 ml-1">
          <div className="w-16 h-1.5 bg-antarctic-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${syncProgress}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-xs text-gray-400">{syncProgress}%</span>
        </div>
      )}
    </div>
  );
}
