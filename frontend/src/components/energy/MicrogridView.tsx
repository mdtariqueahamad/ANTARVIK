import { Zap, Sun, Wind, Battery, Activity } from 'lucide-react';
import ProvenanceTooltip from '../common/ProvenanceTooltip';
import StatusBadge from '../common/StatusBadge';
import { formatPower, formatPercent } from '../../utils/formatters';
import { GensetState } from '../../types';

interface MicrogridViewProps {
  gensets: GensetState[];
  pvOutput: number;
  windOutput: number;
  batterySoc: number;
  batteryPower: number;
  totalLoad: number;
  totalGeneration: number;
}

export default function MicrogridView({
  gensets,
  pvOutput,
  windOutput,
  batterySoc,
  batteryPower,
  totalLoad,
  totalGeneration,
}: MicrogridViewProps) {
  const balance = totalGeneration - totalLoad;

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-ice" />
          Microgrid State
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Balance:</span>
          <span
            className={`text-sm font-bold font-mono ${
              balance >= 0 ? 'text-aurora-green' : 'text-severity-critical'
            }`}
          >
            {balance >= 0 ? '+' : ''}
            {formatPower(balance)}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Generation Sources */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Gensets */}
          {gensets.map((g) => (
            <div
              key={g.id}
              className="p-3 rounded-lg border border-antarctic-border bg-antarctic-navy"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-severity-high" />
                  <span className="text-xs font-medium text-gray-300">{g.name}</span>
                </div>
                <StatusBadge status={g.status} label={g.status} />
              </div>
              <ProvenanceTooltip provenance="simulated">
                <p className="text-lg font-bold font-mono text-severity-high">
                  {formatPower(g.output_kw)}
                </p>
              </ProvenanceTooltip>
              <p className="text-xs text-gray-500">
                Cap: {formatPower(g.capacity_kw)} · {g.fuel_rate_lph.toFixed(1)} L/h
              </p>
              <p className="text-xs text-gray-500">
                RUL: {g.rul_hours.toFixed(0)}h · Run: {g.runtime_hours.toFixed(0)}h
              </p>
            </div>
          ))}

          {/* Solar */}
          <div className="p-3 rounded-lg border border-antarctic-border bg-antarctic-navy">
            <div className="flex items-center gap-1.5 mb-2">
              <Sun className="w-3.5 h-3.5 text-severity-medium" />
              <span className="text-xs font-medium text-gray-300">Solar PV</span>
            </div>
            <ProvenanceTooltip provenance="simulated">
              <p className="text-lg font-bold font-mono text-severity-medium">
                {formatPower(pvOutput)}
              </p>
            </ProvenanceTooltip>
          </div>

          {/* Wind */}
          <div className="p-3 rounded-lg border border-antarctic-border bg-antarctic-navy">
            <div className="flex items-center gap-1.5 mb-2">
              <Wind className="w-3.5 h-3.5 text-ice" />
              <span className="text-xs font-medium text-gray-300">Wind</span>
            </div>
            <ProvenanceTooltip provenance="simulated">
              <p className="text-lg font-bold font-mono text-ice">
                {formatPower(windOutput)}
              </p>
            </ProvenanceTooltip>
          </div>

          {/* Battery */}
          <div className="p-3 rounded-lg border border-antarctic-border bg-antarctic-navy">
            <div className="flex items-center gap-1.5 mb-2">
              <Battery className="w-3.5 h-3.5 text-aurora-green" />
              <span className="text-xs font-medium text-gray-300">Battery</span>
            </div>
            <ProvenanceTooltip provenance="simulated">
              <p className="text-lg font-bold font-mono text-aurora-green">
                {formatPercent(batterySoc)}
              </p>
            </ProvenanceTooltip>
            <p className="text-xs text-gray-500">
              {batteryPower >= 0 ? 'Charging' : 'Discharging'}: {formatPower(Math.abs(batteryPower))}
            </p>
          </div>
        </div>

        {/* Load Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Total Load</span>
            <span className="font-mono text-gray-300">{formatPower(totalLoad)}</span>
          </div>
          <div className="w-full h-3 bg-antarctic-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((totalLoad / totalGeneration) * 100, 100)}%`,
                background: `linear-gradient(90deg, #00ff88, #00d4ff, #ffd700)`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-500">0</span>
            <span className="text-gray-500">Generation: {formatPower(totalGeneration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
