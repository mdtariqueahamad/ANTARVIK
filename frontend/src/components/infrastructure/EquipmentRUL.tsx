import { Wrench } from 'lucide-react';
import ProvenanceTooltip from '../common/ProvenanceTooltip';
import { formatRUL, healthColor, formatDate } from '../../utils/formatters';
import { EquipmentRUL as EquipmentRULType } from '../../types';

interface EquipmentRULProps {
  equipment: EquipmentRULType[];
}

export default function EquipmentRUL({ equipment }: EquipmentRULProps) {
  const sorted = [...equipment].sort((a, b) => a.rul_hours - b.rul_hours);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-aurora-green" />
          Equipment RUL
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-antarctic-border">
              <th className="text-left py-3 px-4">Equipment</th>
              <th className="text-center py-3 px-2">Health</th>
              <th className="text-right py-3 px-2">RUL</th>
              <th className="text-right py-3 px-2">Confidence</th>
              <th className="text-right py-3 px-4">Next Maint.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-antarctic-border">
            {sorted.map((eq) => (
              <tr key={eq.asset_id} className="hover:bg-antarctic-navy-light/50 transition-colors">
                <td className="py-3 px-4">
                  <p className="text-gray-200">{eq.name}</p>
                  <p className="text-xs text-gray-500">{eq.type}</p>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div
                      className="w-8 h-2 rounded-full"
                      style={{ backgroundColor: `${healthColor(eq.health_score)}30` }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${eq.health_score}%`,
                          backgroundColor: healthColor(eq.health_score),
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono" style={{ color: healthColor(eq.health_score) }}>
                      {eq.health_score}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <ProvenanceTooltip provenance={eq.provenance}>
                    <span className="font-mono font-semibold" style={{ color: healthColor(eq.health_score) }}>
                      {formatRUL(eq.rul_hours)}
                    </span>
                  </ProvenanceTooltip>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="text-xs font-mono text-gray-400">
                    {(eq.confidence * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-xs text-gray-400">
                  {formatDate(eq.next_maintenance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
