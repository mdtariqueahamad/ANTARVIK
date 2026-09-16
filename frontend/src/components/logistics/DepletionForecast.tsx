import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { POLAR_PALETTE } from '../../utils/constants';
import ProvenanceTooltip from '../common/ProvenanceTooltip';

interface ForecastData {
  category: string;
  data: { date: string; quantity: number; lower_bound: number; upper_bound: number }[];
  threshold: number;
  unit: string;
}

interface DepletionForecastProps {
  forecasts: ForecastData[];
}

export default function DepletionForecast({ forecasts }: DepletionForecastProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-gray-300">Depletion Forecasts</h3>
        <ProvenanceTooltip provenance="derived">
          <span className="text-xs text-gray-500">90-day projections</span>
        </ProvenanceTooltip>
      </div>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {forecasts.map((forecast, idx) => {
          const color = POLAR_PALETTE[idx % POLAR_PALETTE.length];
          const formatted = forecast.data.map((d) => ({
            ...d,
            dateLabel: new Date(d.date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            }),
          }));

          return (
            <div key={forecast.category} className="rounded-lg border border-antarctic-border p-3">
              <h4 className="text-xs font-medium text-gray-400 mb-2">{forecast.category}</h4>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 9 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1430',
                      border: '1px solid #1e2550',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="upper_bound"
                    stroke="none"
                    fill={`${color}15`}
                  />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine
                    y={forecast.threshold}
                    stroke="#ff3b3b"
                    strokeDasharray="3 3"
                    label={{ value: 'Threshold', fill: '#ff3b3b', fontSize: 9 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}
