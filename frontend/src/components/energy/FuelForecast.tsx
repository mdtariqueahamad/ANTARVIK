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
import ProvenanceTooltip from '../common/ProvenanceTooltip';

interface FuelForecastProps {
  data: { date: string; level_liters: number; lower_bound: number; upper_bound: number }[];
  resupplyDate?: string;
}

export default function FuelForecast({ data, resupplyDate }: FuelForecastProps) {
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Fuel Exhaustion Forecast</h3>
        <ProvenanceTooltip provenance="derived">
          <span className="text-xs text-gray-500">90-day projection</span>
        </ProvenanceTooltip>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="fuelBound" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff8c00" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ff8c00" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="dateLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}kL`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f1430',
              border: '1px solid #1e2550',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${(value / 1000).toFixed(1)} kL`]}
          />
          <Area
            type="monotone"
            dataKey="upper_bound"
            stroke="none"
            fill="url(#fuelBound)"
            name="Upper Bound"
          />
          <Area
            type="monotone"
            dataKey="lower_bound"
            stroke="none"
            fill="transparent"
            name="Lower Bound"
          />
          <Line
            type="monotone"
            dataKey="level_liters"
            stroke="#ff8c00"
            strokeWidth={2}
            dot={false}
            name="Projected Level"
          />
          {resupplyDate && (
            <ReferenceLine
              x={new Date(resupplyDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })}
              stroke="#00d4ff"
              strokeDasharray="5 5"
              label={{
                value: 'Resupply',
                fill: '#00d4ff',
                fontSize: 10,
                position: 'top',
              }}
            />
          )}
          {/* Critical threshold line */}
          <ReferenceLine
            y={10000}
            stroke="#ff3b3b"
            strokeDasharray="3 3"
            label={{
              value: 'Critical',
              fill: '#ff3b3b',
              fontSize: 10,
              position: 'left',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
