import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { WorkOrder, WorkOrderStatus } from '../../types';
import { formatRelative } from '../../utils/formatters';

interface WorkOrdersProps {
  orders: WorkOrder[];
  onCreateFromAlert?: (alertId: string) => void;
}

const STATUS_TABS: { value: WorkOrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

export default function WorkOrders({ orders, onCreateFromAlert }: WorkOrdersProps) {
  const [filter, setFilter] = useState<WorkOrderStatus | 'all'>('all');

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-aurora-purple" />
          Work Orders
        </h3>
        <button className="btn-secondary text-xs flex items-center gap-1">
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 px-4 pt-3">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === tab.value
                ? 'bg-ice/10 text-ice border border-ice/20'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <span className="ml-1 text-gray-600">
                ({orders.filter((o) => o.status === tab.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="p-4 space-y-2">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="p-3 rounded-lg border border-antarctic-border bg-antarctic-navy hover:border-ice/20 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-200">{order.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {order.asset_name} · {formatRelative(order.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge severity={order.priority} label={order.priority} />
                <StatusBadge status={order.status} label={order.status.replace('_', ' ')} />
              </div>
            </div>
            {order.assigned_to && (
              <p className="text-xs text-gray-500 mt-1">Assigned: {order.assigned_to}</p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">No work orders found</p>
        )}
      </div>
    </div>
  );
}
