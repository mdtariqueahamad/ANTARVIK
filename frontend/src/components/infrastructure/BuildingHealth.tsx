import { Building2, Thermometer, Snowflake, Fan } from 'lucide-react';
import ProvenanceTooltip from '../common/ProvenanceTooltip';
import { healthColor, formatPercent, formatTemperature } from '../../utils/formatters';
import { BuildingHealth as BuildingHealthType } from '../../types';

interface BuildingHealthProps {
  buildings: BuildingHealthType[];
}

export default function BuildingHealth({ buildings }: BuildingHealthProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-ice" />
          Building Health
        </h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {buildings.map((b) => {
          const snowPct = (b.snow_load_kpa / b.snow_load_capacity_kpa) * 100;
          const snowColor = snowPct > 80 ? '#ff3b3b' : snowPct > 60 ? '#ffd700' : '#00ff88';

          return (
            <div
              key={b.building_id}
              className="p-3 rounded-lg border border-antarctic-border bg-antarctic-navy"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-200">{b.name}</h4>
                <ProvenanceTooltip provenance={b.provenance}>
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      color: healthColor(100 - b.envelope_stress * 100),
                      backgroundColor: `${healthColor(100 - b.envelope_stress * 100)}15`,
                    }}
                  >
                    Stress: {formatPercent(b.envelope_stress * 100)}
                  </span>
                </ProvenanceTooltip>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Snow Load */}
                <div className="text-center">
                  <Snowflake className="w-4 h-4 mx-auto mb-1" style={{ color: snowColor }} />
                  <p className="text-xs text-gray-500">Snow Load</p>
                  <p className="text-sm font-mono" style={{ color: snowColor }}>
                    {b.snow_load_kpa.toFixed(1)} kPa
                  </p>
                  <div className="w-full h-1 bg-antarctic-border rounded-full mt-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${snowPct}%`, backgroundColor: snowColor }}
                    />
                  </div>
                </div>

                {/* HVAC */}
                <div className="text-center">
                  <Fan className="w-4 h-4 mx-auto mb-1 text-ice" />
                  <p className="text-xs text-gray-500">HVAC Eff.</p>
                  <p className="text-sm font-mono" style={{ color: healthColor(b.hvac_efficiency * 100) }}>
                    {formatPercent(b.hvac_efficiency * 100)}
                  </p>
                </div>

                {/* Internal Temp */}
                <div className="text-center">
                  <Thermometer className="w-4 h-4 mx-auto mb-1 text-severity-high" />
                  <p className="text-xs text-gray-500">Int. Temp</p>
                  <p className="text-sm font-mono text-gray-200">
                    {formatTemperature(b.internal_temp_c)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Target: {formatTemperature(b.target_temp_c)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
