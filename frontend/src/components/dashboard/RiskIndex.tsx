import ProvenanceTooltip from '../common/ProvenanceTooltip';
import { healthColor } from '../../utils/formatters';

interface RiskIndexProps {
  score: number;
  factors: {
    name: string;
    score: number;
    weight: number;
  }[];
}

export default function RiskIndex({ score, factors }: RiskIndexProps) {
  const color = healthColor(100 - score); // Higher risk = worse health
  const radius = 60;
  const circumference = 2 * Math.PI * radius * 0.75;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Winter-Over Risk Index</h3>
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <svg width={140} height={140} viewBox="0 0 140 140" className="transform rotate-[135deg]">
            <circle
              cx={70} cy={70} r={radius}
              fill="none" stroke="#1e2550" strokeWidth={12}
              strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
              strokeLinecap="round"
            />
            <circle
              cx={70} cy={70} r={radius}
              fill="none" stroke={color} strokeWidth={12}
              strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="gauge-ring"
              style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ProvenanceTooltip provenance="derived">
              <span className="text-3xl font-bold font-mono" style={{ color }}>
                {score}
              </span>
            </ProvenanceTooltip>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="flex-1 space-y-2">
          {factors.map((f) => (
            <div key={f.name}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-400">{f.name}</span>
                <span className="text-gray-300 font-mono">{f.score}</span>
              </div>
              <div className="w-full h-1.5 bg-antarctic-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${f.score}%`,
                    backgroundColor: healthColor(100 - f.score),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
