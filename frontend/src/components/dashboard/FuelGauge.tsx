import ProvenanceTooltip from '../common/ProvenanceTooltip';
import { formatFuel, formatDate } from '../../utils/formatters';

interface FuelGaugeProps {
  currentLiters: number;
  capacityLiters: number;
  exhaustionDate: string;
  dailyRate: number;
}

export default function FuelGauge({
  currentLiters,
  capacityLiters,
  exhaustionDate,
  dailyRate,
}: FuelGaugeProps) {
  const pct = (currentLiters / capacityLiters) * 100;
  const color =
    pct > 50 ? '#00ff88' : pct > 25 ? '#ffd700' : pct > 10 ? '#ff8c00' : '#ff3b3b';

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Fuel Reserve</h3>
      <div className="flex items-end gap-4">
        {/* Tank visual */}
        <div className="relative w-16 h-28 border-2 rounded-b-lg overflow-hidden flex-shrink-0"
          style={{ borderColor: `${color}60` }}
        >
          <div className="absolute top-0 left-0 right-0 h-2 rounded-t-sm mx-2 -mt-0.5"
            style={{ backgroundColor: `${color}40` }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-1000 rounded-b-md"
            style={{
              height: `${pct}%`,
              background: `linear-gradient(to top, ${color}, ${color}80)`,
              boxShadow: `0 0 15px ${color}30`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold font-mono text-white drop-shadow-lg">
              {pct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div>
            <span className="stat-label">Current Level</span>
            <ProvenanceTooltip provenance="simulated">
              <p className="text-lg font-bold font-mono" style={{ color }}>
                {formatFuel(currentLiters)}
              </p>
            </ProvenanceTooltip>
          </div>
          <div>
            <span className="stat-label">Daily Consumption</span>
            <p className="text-sm font-mono text-gray-300">{formatFuel(dailyRate)}/day</p>
          </div>
          <div>
            <span className="stat-label">Projected Exhaustion</span>
            <ProvenanceTooltip provenance="derived">
              <p className="text-sm font-mono text-severity-high">
                {formatDate(exhaustionDate)}
              </p>
            </ProvenanceTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
