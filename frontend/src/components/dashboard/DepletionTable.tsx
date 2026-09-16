import { TrendingDown } from 'lucide-react';
import ProvenanceTooltip from '../common/ProvenanceTooltip';
import { formatDaysRemaining } from '../../utils/formatters';

interface DepletionItem {
  name: string;
  category: string;
  daysRemaining: number;
  dailyRate: number;
  quantity: number;
  unit: string;
}

interface DepletionTableProps {
  items: DepletionItem[];
}

export default function DepletionTable({ items }: DepletionTableProps) {
  const sorted = [...items].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 5);

  return (
    <div className="w-full h-full">
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="w-4 h-4 text-severity-high" />
        <h3 className="text-sm font-semibold text-gray-300">Top Depleting Consumables</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-2 pr-2">Item</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Rate/day</th>
              <th className="text-right py-2 pl-2">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-antarctic-border">
            {sorted.map((item, i) => {
              const urgency =
                item.daysRemaining < 14
                  ? '#ff3b3b'
                  : item.daysRemaining < 30
                  ? '#ff8c00'
                  : item.daysRemaining < 60
                  ? '#ffd700'
                  : '#00ff88';
              return (
                <tr key={i} className="hover:bg-antarctic-navy-light/50 transition-colors">
                  <td className="py-2 pr-2">
                    <p className="text-gray-200">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-300">
                    {item.quantity.toFixed(0)} {item.unit}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400">
                    {item.dailyRate.toFixed(1)}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <ProvenanceTooltip provenance="derived">
                      <span className="font-mono font-semibold" style={{ color: urgency }}>
                        {formatDaysRemaining(item.daysRemaining)}
                      </span>
                    </ProvenanceTooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
