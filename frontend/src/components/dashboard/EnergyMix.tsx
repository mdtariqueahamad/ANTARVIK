import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { EnergyMixPoint } from '../../types';
import { ENERGY_SOURCE_COLORS } from '../../utils/constants';
import ProvenanceTooltip from '../common/ProvenanceTooltip';

interface EnergyMixProps {
  data: EnergyMixPoint[];
}

export default function EnergyMix({ data }: EnergyMixProps) {
  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Energy Generation Mix</h3>
        <ProvenanceTooltip provenance="simulated">
          <span className="text-xs text-gray-500">24h</span>
        </ProvenanceTooltip>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            {Object.entries(ENERGY_SOURCE_COLORS).map(([key, color]) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => `${v}kW`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f1430',
              border: '1px solid #1e2550',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="diesel_kw"
            name="Diesel"
            stackId="1"
            stroke={ENERGY_SOURCE_COLORS.diesel}
            fill={`url(#grad-diesel)`}
          />
          <Area
            type="monotone"
            dataKey="solar_kw"
            name="Solar"
            stackId="1"
            stroke={ENERGY_SOURCE_COLORS.solar}
            fill={`url(#grad-solar)`}
          />
          <Area
            type="monotone"
            dataKey="wind_kw"
            name="Wind"
            stackId="1"
            stroke={ENERGY_SOURCE_COLORS.wind}
            fill={`url(#grad-wind)`}
          />
          <Area
            type="monotone"
            dataKey="battery_kw"
            name="Battery"
            stackId="1"
            stroke={ENERGY_SOURCE_COLORS.battery}
            fill={`url(#grad-battery)`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
