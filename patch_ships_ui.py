import re

with open("frontend/src/pages/Ships.tsx", "r") as f:
    content = f.read()

# Add states for edit mode
import_old = "import { Anchor, Navigation, Clock, Package as PkgIcon } from 'lucide-react';"
import_new = "import { Anchor, Navigation, Clock, Package as PkgIcon, Edit2, Check } from 'lucide-react';\nimport { useState } from 'react';"
if "import { useState }" not in content:
    content = content.replace(import_old, import_new)

init_old = """export default function Ships() {
  const { selectedStation } = useStationStore();

  const logisticsData = {"""

init_new = """export default function Ships() {
  const { selectedStation } = useStationStore();
  const role = sessionStorage.getItem('role');
  const canEdit = role === 'hq' || role === 'commander';

  const [etaEdit, setEtaEdit] = useState(false);
  const [statusEdit, setStatusEdit] = useState(false);
  const [etaVal, setEtaVal] = useState('');
  const [statusVal, setStatusVal] = useState('');

  const [logisticsData, setLogisticsData] = useState<any>({"""

content = content.replace(init_old, init_new)
content = content.replace("const activeShip = logisticsData[selectedStation as 'maitri' | 'bharati'];", """const activeShip = logisticsData[selectedStation as 'maitri' | 'bharati'];
  
  const handleSave = (field: 'eta' | 'status') => {
    setLogisticsData((prev: any) => ({
      ...prev,
      [selectedStation]: {
        ...prev[selectedStation as 'maitri' | 'bharati'],
        [field]: field === 'eta' ? etaVal : statusVal
      }
    }));
    field === 'eta' ? setEtaEdit(false) : setStatusEdit(false);
  };
  
  const startEdit = (field: 'eta' | 'status', val: string) => {
    if (field === 'eta') { setEtaVal(val); setEtaEdit(true); }
    if (field === 'status') { setStatusVal(val); setStatusEdit(true); }
  };""")

status_old = """<div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Status</span>
                <span className="text-emerald-400 font-mono text-sm animate-pulse">{activeShip.status}</span>
              </div>"""

status_new = """<div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Status</span>
                <div className="flex items-center gap-2">
                  {statusEdit ? (
                    <>
                      <input type="text" value={statusVal} onChange={e => setStatusVal(e.target.value)} className="bg-black/40 border border-emerald-500/50 rounded px-2 py-1 text-xs text-emerald-400 focus:outline-none w-48" />
                      <button onClick={() => handleSave('status')} className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/40"><Check className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-400 font-mono text-xs">{activeShip.status}</span>
                      {canEdit && <button onClick={() => startEdit('status', activeShip.status)} className="text-white/30 hover:text-emerald-400"><Edit2 className="w-3 h-3" /></button>}
                    </>
                  )}
                </div>
              </div>"""
content = content.replace(status_old, status_new)

eta_old = """<div className="mt-8 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-white/60 text-sm flex items-center gap-2"><Clock className="w-5 h-5 text-amber-400"/> Expected Arrival</span>
            <span className="text-amber-300 font-black text-2xl tracking-wider">{activeShip.eta}</span>
          </div>"""

eta_new = """<div className="mt-8 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-white/60 text-sm flex items-center gap-2"><Clock className="w-5 h-5 text-amber-400"/> Expected Arrival</span>
            <div className="flex items-center gap-3">
              {etaEdit ? (
                <>
                  <input type="text" value={etaVal} onChange={e => setEtaVal(e.target.value)} className="bg-black/40 border border-amber-500/50 rounded px-2 py-1 text-lg font-black text-amber-300 focus:outline-none w-24 text-center" />
                  <button onClick={() => handleSave('eta')} className="p-1.5 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/40"><Check className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="text-amber-300 font-black text-2xl tracking-wider">{activeShip.eta}</span>
                  {canEdit && <button onClick={() => startEdit('eta', activeShip.eta)} className="p-1.5 text-white/30 hover:text-amber-400 bg-white/5 rounded"><Edit2 className="w-4 h-4" /></button>}
                </>
              )}
            </div>
          </div>"""
content = content.replace(eta_old, eta_new)

with open("frontend/src/pages/Ships.tsx", "w") as f:
    f.write(content)

