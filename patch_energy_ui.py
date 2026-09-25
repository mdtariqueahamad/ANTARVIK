import re

with open("frontend/src/pages/Energy.tsx", "r") as f:
    content = f.read()

# Replace gensets mock to strictly be the 3 100kW generators + Solar + Wind
gensets_old = """const mockGensets = [
  { id: 'G1', name: 'Main Diesel Gen 1', status: 'running', output_kw: 120, capacity_kw: 150, fuel_rate_lph: 15, runtime_hours: 450, rul_hours: 1200 },
  { id: 'G2', name: 'Main Diesel Gen 2', status: 'standby', output_kw: 0, capacity_kw: 150, fuel_rate_lph: 0, runtime_hours: 320, rul_hours: 4000 },
  { id: 'G3', name: 'Backup Gen', status: 'maintenance', output_kw: 0, capacity_kw: 100, fuel_rate_lph: 0, runtime_hours: 800, rul_hours: 0 },
  { id: 'G4', name: 'Peaker Gen', status: 'running', output_kw: 90, capacity_kw: 100, fuel_rate_lph: 12, runtime_hours: 150, rul_hours: 5000 },
  { id: 'S1', name: 'Solar Array', status: 'running', output_kw: 45, capacity_kw: 50, fuel_rate_lph: 0, runtime_hours: 12000, rul_hours: 50000 },
  { id: 'W1', name: 'Wind Turbine', status: 'running', output_kw: 80, capacity_kw: 100, fuel_rate_lph: 0, runtime_hours: 8000, rul_hours: 20000 }
];"""

gensets_new = """const mockGensets = [
  { id: 'G1', name: 'Generator 1', status: 'running', output_kw: 85, capacity_kw: 100, fuel_rate_lph: 12.5, runtime_hours: 450, rul_hours: 1200 },
  { id: 'G2', name: 'Generator 2', status: 'standby', output_kw: 0, capacity_kw: 100, fuel_rate_lph: 0, runtime_hours: 320, rul_hours: 4000 },
  { id: 'G3', name: 'Generator 3', status: 'maintenance', output_kw: 0, capacity_kw: 100, fuel_rate_lph: 0, runtime_hours: 800, rul_hours: 0 },
  { id: 'S1', name: 'Solar Array', status: 'running', output_kw: 45, capacity_kw: 50, fuel_rate_lph: 0, runtime_hours: 12000, rul_hours: 50000 },
  { id: 'W1', name: 'Wind Turbine', status: 'running', output_kw: 80, capacity_kw: 100, fuel_rate_lph: 0, runtime_hours: 8000, rul_hours: 20000 }
];"""

content = content.replace(gensets_old, gensets_new)

with open("frontend/src/pages/Energy.tsx", "w") as f:
    f.write(content)

with open("frontend/src/components/energy/MicrogridView.tsx", "r") as f:
    micro_content = f.read()

# Add edit capabilities to MicrogridView for Generator Operator
import_old = "import { Zap, Battery, Wind, Sun } from 'lucide-react';"
import_new = "import { Zap, Battery, Wind, Sun, Settings2 } from 'lucide-react';\nimport React, { useState } from 'react';"
if "import React, { useState }" not in micro_content:
    micro_content = micro_content.replace(import_old, import_new)

# Add role checking logic
micro_init_old = """export default function MicrogridView({
  gensets,
  pvOutput,
  windOutput,
  batterySoc,
  batteryPower,
  totalLoad,
  totalGeneration,
}: MicrogridViewProps) {"""

micro_init_new = """export default function MicrogridView({
  gensets: initialGensets,
  pvOutput,
  windOutput,
  batterySoc,
  batteryPower,
  totalLoad,
  totalGeneration,
}: MicrogridViewProps) {
  const role = sessionStorage.getItem('role');
  const isOperator = role === 'generator';
  const [gensets, setGensets] = useState(initialGensets);

  const handleToggleState = (id: string) => {
    if (!isOperator) return;
    setGensets(prev => prev.map(g => {
      if (g.id === id) {
        if (g.status === 'running') return { ...g, status: 'standby', output_kw: 0, fuel_rate_lph: 0 };
        if (g.status === 'standby') return { ...g, status: 'running', output_kw: g.capacity_kw * 0.8, fuel_rate_lph: 12.5 };
      }
      return g;
    }));
  };
"""

micro_content = micro_content.replace(micro_init_old, micro_init_new)
# Since we replaced gensets with initialGensets, we also need to fix that local usage. The state covers it.

# Update the gensets rendering map to be more square-like and interactive
gensets_map_old = """{gensets.map((g) => (
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
                Runtime: {formatNumber(g.runtime_hours, 0)}h
              </p>
            </div>
          ))}"""

gensets_map_new = """{gensets.map((g) => (
            <div
              key={g.id}
              className={`p-4 rounded-xl border flex flex-col relative overflow-hidden transition-all ${g.status === 'running' ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'bg-black/30 border-white/10'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${g.status === 'running' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'}`}>
                    {g.id.startsWith('G') ? <Zap className="w-4 h-4" /> : g.id.startsWith('S') ? <Sun className="w-4 h-4" /> : <Wind className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-bold text-white tracking-wide">{g.name}</span>
                </div>
                <StatusBadge status={g.status} label={g.status} />
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] text-white/50 uppercase tracking-widest">Output</span>
                  <span className={`text-2xl font-black font-mono ${g.status === 'running' ? 'text-amber-400' : 'text-white/30'}`}>
                    {formatPower(g.output_kw)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mb-3">
                  <div className={`h-full transition-all duration-1000 ${g.status === 'running' ? 'bg-amber-400' : 'bg-transparent'}`} style={{ width: `${(g.output_kw / g.capacity_kw) * 100}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <div className="bg-black/30 rounded p-1.5 text-center border border-white/5">
                    <span className="block text-[8px] text-white/40 uppercase">Capacity</span>
                    <span className="text-xs font-mono text-white/80">{formatPower(g.capacity_kw)}</span>
                  </div>
                  <div className="bg-black/30 rounded p-1.5 text-center border border-white/5">
                    <span className="block text-[8px] text-white/40 uppercase">Runtime</span>
                    <span className="text-xs font-mono text-white/80">{g.runtime_hours}h</span>
                  </div>
                </div>
              </div>

              {isOperator && g.id.startsWith('G') && (
                <button 
                  onClick={() => handleToggleState(g.id)}
                  className={`mt-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest border transition-all ${g.status === 'running' ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
                >
                  {g.status === 'running' ? 'Stop Generator' : g.status === 'maintenance' ? 'In Maintenance' : 'Start Generator'}
                </button>
              )}
            </div>
          ))}"""

micro_content = micro_content.replace(gensets_map_old, gensets_map_new)

with open("frontend/src/components/energy/MicrogridView.tsx", "w") as f:
    f.write(micro_content)

