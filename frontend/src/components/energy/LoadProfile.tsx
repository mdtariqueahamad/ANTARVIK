import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { LoadProfilePoint } from '../../types';
import { POLAR_PALETTE } from '../../utils/constants';

interface LoadProfileProps {
  data: LoadProfilePoint[];
}

export default function LoadProfile({ data }: LoadProfileProps) {
  const formatted = data.map((d) => ({
    ...d,
    hour: `${d.hour.toString().padStart(2, '0')}:00`,
  }));

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">24h Load Profile</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            {['heating', 'lighting', 'equipment', 'cooking'].map((key, i) => (
              <linearGradient key={key} id={`lp-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={POLAR_PALETTE[i]} stopOpacity={0.4} />
                <stop offset="95%" stopColor={POLAR_PALETTE[i]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <XAxis
            dataKey="hour"
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
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" iconSize={8} />
          <Area
            type="monotone"
            dataKey="heating_kw"
            name="Heating"
            stackId="1"
            stroke={POLAR_PALETTE[0]}
            fill="url(#lp-heating)"
          />
          <Area
            type="monotone"
            dataKey="lighting_kw"
            name="Lighting"
            stackId="1"
            stroke={POLAR_PALETTE[1]}
            fill="url(#lp-lighting)"
          />
          <Area
            type="monotone"
            dataKey="equipment_kw"
            name="Equipment"
            stackId="1"
            stroke={POLAR_PALETTE[2]}
            fill="url(#lp-equipment)"
          />
          <Area
            type="monotone"
            dataKey="cooking_kw"
            name="Cooking"
            stackId="1"
            stroke={POLAR_PALETTE[3]}
            fill="url(#lp-cooking)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
