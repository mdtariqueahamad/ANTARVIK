import re

with open("frontend/src/components/dashboard/StationOverview.tsx", "r") as f:
    content = f.read()

# Update KPICard definition
kpicard_def_old = """const KPICard = ({ title, value, trend, status }: {
  title: string; value: string; trend?: string; status?: 'good' | 'warning' | 'critical'
}) => {
  const colors = { good: 'text-emerald-400', warning: 'text-amber-400', critical: 'text-red-400', default: 'text-white' };
  return (
    <div className="bg-[#1e293b]/70 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col justify-center shadow-lg hover:bg-white/10 transition-colors">"""

kpicard_def_new = """const KPICard = ({ title, value, trend, status, onClick }: {
  title: string; value: string; trend?: string; status?: 'good' | 'warning' | 'critical'; onClick?: () => void
}) => {
  const colors = { good: 'text-emerald-400', warning: 'text-amber-400', critical: 'text-red-400', default: 'text-white' };
  return (
    <div onClick={onClick} className="bg-[#1e293b]/70 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col justify-center shadow-lg hover:bg-white/10 transition-colors cursor-pointer active:scale-95">"""

content = content.replace(kpicard_def_old, kpicard_def_new)

# We need to add state for the modal in StationOverview component
import_old = "import { useStationStore } from '../../hooks/useStationStore';"
import_new = "import { useStationStore } from '../../hooks/useStationStore';\nimport { X } from 'lucide-react';"
if "import { X }" not in content:
    content = content.replace(import_old, import_new)

# Add modal state inside StationOverview
overview_func_old = """export default function StationOverview() {
  const { selectedStation } = useStationStore();"""
overview_func_new = """export default function StationOverview() {
  const { selectedStation } = useStationStore();
  const [activeModal, setActiveModal] = React.useState<string | null>(null);"""
content = content.replace(overview_func_old, overview_func_new)

# Update state to include wastages
kpi_state_old = """const [kpi, setKpi] = React.useState({
    power: 96, fuelL: 39900, waterL: 9600, foodKg: 420,
  });"""
kpi_state_new = """const [kpi, setKpi] = React.useState({
    power: 96, fuelL: 39900, waterL: 9600, foodKg: 420, wastagesKg: 120,
  });"""
content = content.replace(kpi_state_old, kpi_state_new)

nudge_kpi_old = """setKpi(p => ({
        power:  Math.min(100, Math.max(70, nudge(p.power, 0.5, 1))),
        fuelL:  Math.max(0, Math.round(p.fuelL - Math.random() * 10)),
        waterL: Math.max(0, Math.round(p.waterL - Math.random() * 3)),
        foodKg: Math.max(0, +(p.foodKg - Math.random() * 0.04).toFixed(1)),
      }));"""
nudge_kpi_new = """setKpi(p => ({
        power:  Math.min(100, Math.max(70, nudge(p.power, 0.5, 1))),
        fuelL:  Math.max(0, Math.round(p.fuelL - Math.random() * 10)),
        waterL: Math.max(0, Math.round(p.waterL - Math.random() * 3)),
        foodKg: Math.max(0, +(p.foodKg - Math.random() * 0.04).toFixed(1)),
        wastagesKg: Math.max(0, +(p.wastagesKg + Math.random() * 0.02).toFixed(1)),
      }));"""
content = content.replace(nudge_kpi_old, nudge_kpi_new)

status_old = """const fuelStatus:   'good' | 'warning' | 'critical' = kpi.fuelL > 30000 ? 'good' : kpi.fuelL > 15000 ? 'warning' : 'critical';"""
status_new = """const fuelStatus:   'good' | 'warning' | 'critical' = kpi.fuelL > 30000 ? 'good' : kpi.fuelL > 15000 ? 'warning' : 'critical';
  const wastageStatus: 'good' | 'warning' | 'critical' = kpi.wastagesKg < 300 ? 'good' : kpi.wastagesKg < 500 ? 'warning' : 'critical';"""
content = content.replace(status_old, status_new)

kpi_ribbon_old = """{/* KPI RIBBON */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard title="Station Health"  value={`${health}/100`}                   trend={health >= 85 ? '↑ Good' : health >= 65 ? '→ Fair' : '↓ Poor'}  status={healthStatus} />
        <KPICard title="Power Avail"     value={`${kpi.power.toFixed(1)}%`}         trend={kpi.power >= 90 ? 'Stable' : 'Degraded'}                         status={powerStatus} />
        <KPICard title="Fuel Reserve"    value={`${kpi.fuelL.toLocaleString()} L`}  status={fuelStatus} />
        <KPICard title="Water Storage"   value={`${kpi.waterL.toLocaleString()} L`} />
        <KPICard title="Food Supplies"   value={`${kpi.foodKg} kg`} />
        <KPICard title="Active Alerts"   value={String(critCount + warnCount)}      trend={critCount > 0 ? `${critCount} critical` : undefined}
          status={critCount > 0 ? 'critical' : warnCount > 0 ? 'warning' : 'good'} />
      </div>"""

kpi_ribbon_new = """{/* KPI RIBBON */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard onClick={() => setActiveModal('Health')} title="Station Health"  value={`${health}/100`}                   trend={health >= 85 ? '↑ Good' : health >= 65 ? '→ Fair' : '↓ Poor'}  status={healthStatus} />
        <KPICard onClick={() => setActiveModal('Power')} title="Power Avail"     value={`${kpi.power.toFixed(1)}%`}         trend={kpi.power >= 90 ? 'Stable' : 'Degraded'}                         status={powerStatus} />
        <KPICard onClick={() => setActiveModal('Fuel')} title="Fuel Reserve"    value={`${kpi.fuelL.toLocaleString()} L`}  status={fuelStatus} />
        <KPICard onClick={() => setActiveModal('Water')} title="Water Storage"   value={`${kpi.waterL.toLocaleString()} L`} />
        <KPICard onClick={() => setActiveModal('Food')} title="Food Supplies"   value={`${kpi.foodKg} kg`} />
        <KPICard onClick={() => setActiveModal('Wastages')} title="Wastages"   value={`${kpi.wastagesKg.toFixed(1)} kg`} trend={kpi.wastagesKg < 300 ? 'Managed' : 'High'} status={wastageStatus} />
      </div>"""

content = content.replace(kpi_ribbon_old, kpi_ribbon_new)

# Add Modal rendering at the end of return
modal_code = """
      {/* Dynamic Info Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900/90 border border-white/20 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <h3 className="text-lg font-bold text-white uppercase tracking-widest">{activeModal} Information</h3>
              <button onClick={() => setActiveModal(null)} className="text-white/50 hover:text-white p-1 rounded-lg transition-colors hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {activeModal === 'Health' && (
                <div className="space-y-3">
                  <p className="text-slate-300 text-sm">Station overall health index calculated based on current meteorological stress and operational capacity.</p>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Temperature Penalty</span><span className="text-red-400 font-mono">{realData.temp < -30 ? '-15' : realData.temp < -20 ? '-7' : '0'}</span></div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Wind Penalty</span><span className="text-red-400 font-mono">{realData.ws > 80 ? '-20' : realData.ws > 50 ? '-10' : '0'}</span></div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Pressure Penalty</span><span className="text-red-400 font-mono">{realData.pressure < 960 ? '-15' : realData.pressure < 975 ? '-7' : '0'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-400">Humidity Penalty</span><span className="text-red-400 font-mono">{realData.rh > 90 ? '-8' : '0'}</span></div>
                  </div>
                </div>
              )}
              {activeModal === 'Power' && (
                <div className="space-y-3">
                  <p className="text-slate-300 text-sm">Real-time power generation vs consumption breakdown.</p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                      <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Diesel Gensets</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">{(kpi.power * 0.85).toFixed(1)}%</span>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                      <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Wind/Solar</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">{(kpi.power * 0.15).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
              {activeModal === 'Fuel' && (
                <div className="space-y-3">
                  <p className="text-slate-300 text-sm">Winter fuel cache status. Estimated depletion rate depends on generator load and heating requirements.</p>
                  <div className="bg-black/20 p-4 rounded-lg border border-white/5 mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">Burn Rate</span>
                      <span className="text-sm font-mono text-white">~120 L/day</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Est. Endurance</span>
                      <span className="text-sm font-mono text-white">{Math.round(kpi.fuelL / 120)} days</span>
                    </div>
                  </div>
                </div>
              )}
              {activeModal === 'Water' && (
                <div className="space-y-3">
                  <p className="text-slate-300 text-sm">Pumped lake water reserves. Includes fresh water for consumption and grey water for utilities.</p>
                  <div className="h-2 w-full bg-slate-800 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(kpi.waterL / 15000) * 100}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>0 L</span>
                    <span>Max Capacity: 15,000 L</span>
                  </div>
                </div>
              )}
              {activeModal === 'Food' && (
                <div className="space-y-3">
                  <p className="text-slate-300 text-sm">Dry and frozen ration status for wintering personnel.</p>
                  <ul className="text-xs text-slate-400 space-y-2 mt-3 p-3 bg-black/20 rounded-lg border border-white/5">
                    <li className="flex justify-between"><span className="text-white/80">Frozen Veg & Meat</span><span className="font-mono">{(kpi.foodKg * 0.4).toFixed(1)} kg</span></li>
                    <li className="flex justify-between"><span className="text-white/80">Dry Staples (Rice/Flour)</span><span className="font-mono">{(kpi.foodKg * 0.45).toFixed(1)} kg</span></li>
                    <li className="flex justify-between"><span className="text-white/80">Emergency MREs</span><span className="font-mono">{(kpi.foodKg * 0.15).toFixed(1)} kg</span></li>
                  </ul>
                </div>
              )}
              {activeModal === 'Wastages' && (
                <div className="space-y-3">
                  <p className="text-slate-300 text-sm">Accumulated solid and biological waste pending retro-grading per Antarctic Treaty guidelines.</p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-black/20 p-3 rounded-lg border border-amber-500/20 text-center">
                      <span className="block text-[10px] text-amber-400/80 uppercase tracking-widest mb-1">Solid Waste</span>
                      <span className="text-base font-mono font-bold text-amber-300">{(kpi.wastagesKg * 0.7).toFixed(1)} kg</span>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg border border-purple-500/20 text-center">
                      <span className="block text-[10px] text-purple-400/80 uppercase tracking-widest mb-1">Biological</span>
                      <span className="text-base font-mono font-bold text-purple-300">{(kpi.wastagesKg * 0.3).toFixed(1)} kg</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-center">Must be kept below 500 kg before next ship arrival.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <button onClick={() => setActiveModal(null)} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

end_div = "    </div>\n  );\n}"
content = content.replace(end_div, modal_code)

with open("frontend/src/components/dashboard/StationOverview.tsx", "w") as f:
    f.write(content)
