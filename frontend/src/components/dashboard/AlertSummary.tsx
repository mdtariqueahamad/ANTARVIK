import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { Severity } from '../../types';
import { SEVERITY_COLORS } from '../../utils/constants';

interface AlertSummaryProps {
  counts: Record<Severity, number>;
  totalActive: number;
}

const ICONS: Record<Severity, typeof AlertTriangle> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
  info: Info,
};

export default function AlertSummary({ counts, totalActive }: AlertSummaryProps) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Active Alerts</h3>
        <span className="text-2xl font-bold font-mono text-ice">{totalActive}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SEVERITY_COLORS) as Severity[])
          .filter((s) => s !== 'info')
          .map((sev) => {
            const Icon = ICONS[sev];
            const count = counts[sev] || 0;
            const color = SEVERITY_COLORS[sev];
            return (
              <div
                key={sev}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl border"
                style={{
                  borderColor: `${color}30`,
                  backgroundColor: count > 0 ? `${color}10` : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 capitalize">{sev}</p>
                  <p className="text-lg font-bold font-mono" style={{ color: count > 0 ? color : '#4b5563' }}>
                    {count}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
