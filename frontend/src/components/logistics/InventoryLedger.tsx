import { useState } from 'react';
import { Package, Search } from 'lucide-react';
import ProvenanceTooltip from '../common/ProvenanceTooltip';
import { formatDaysRemaining, formatNumber } from '../../utils/formatters';
import { InventoryItem } from '../../types';
import { CATEGORY_LABELS } from '../../utils/constants';

interface InventoryLedgerProps {
  items: InventoryItem[];
}

export default function InventoryLedger({ items }: InventoryLedgerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const categories = ['all', ...new Set(items.map((i) => i.category))];

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || item.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Package className="w-4 h-4 text-aurora-green" />
          Inventory Ledger
        </h3>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 pt-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-field w-auto"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : CATEGORY_LABELS[cat] || cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm mt-2">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-antarctic-border">
              <th className="text-left py-3 px-4">Item</th>
              <th className="text-right py-3 px-2">Quantity</th>
              <th className="text-right py-3 px-2">Threshold</th>
              <th className="text-right py-3 px-2">Daily Use</th>
              <th className="text-right py-3 px-4">Days Left</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-antarctic-border">
            {filtered.map((item) => {
              const belowThreshold = item.quantity <= item.threshold;
              const urgencyColor =
                item.days_remaining < 14
                  ? '#ff3b3b'
                  : item.days_remaining < 30
                  ? '#ff8c00'
                  : item.days_remaining < 60
                  ? '#ffd700'
                  : '#00ff88';

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-antarctic-navy-light/50 transition-colors ${
                    belowThreshold ? 'bg-severity-critical/5' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <p className="text-gray-200">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.sku} · {CATEGORY_LABELS[item.category] || item.category}
                    </p>
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    <span className={belowThreshold ? 'text-severity-critical' : 'text-gray-300'}>
                      {formatNumber(item.quantity, 0)}
                    </span>
                    <span className="text-gray-500 ml-1">{item.unit}</span>
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-gray-500">
                    {formatNumber(item.threshold, 0)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-gray-400">
                    {item.daily_consumption.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <ProvenanceTooltip provenance={item.provenance}>
                      <span className="font-mono font-semibold" style={{ color: urgencyColor }}>
                        {formatDaysRemaining(item.days_remaining)}
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
