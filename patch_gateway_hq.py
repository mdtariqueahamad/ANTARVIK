import re

with open("frontend/src/pages/GatewayPage.tsx", "r") as f:
    content = f.read()

# Add personnel present in the StationCard
card_args_old = "const StationCard = ({ id, name, icon: Icon, color, image, health, temp, power, status }: any) => ("
card_args_new = "const StationCard = ({ id, name, icon: Icon, color, image, health, temp, power, status, personnel }: any) => ("
content = content.replace(card_args_old, card_args_new)

card_metrics_old = """<div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase tracking-widest mb-1 block">Live Temp</span>
            <span className="text-lg font-mono text-white">{temp}°C</span>
          </div>"""

card_metrics_new = """<div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase tracking-widest mb-1 block">Live Temp</span>
            <span className="text-lg font-mono text-white">{temp}°C</span>
          </div>
          <div className="col-span-2 bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-white/50 uppercase tracking-widest flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Personnel Present</span>
            <span className="text-sm font-bold text-blue-300">{personnel} Active</span>
          </div>"""
content = content.replace(card_metrics_old, card_metrics_new)
content = content.replace("<div className=\"col-span-2 bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between\">\n            <span className=\"text-[10px] text-white/50 uppercase tracking-widest\">Status</span>", "<div className=\"col-span-2 bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between\">\n            <span className=\"text-[10px] text-white/50 uppercase tracking-widest\">Station Status</span>")

# Pass personnel values
maitri_old = "health={82} temp={-18.4} power={92} status=\"Nominal Operation\""
maitri_new = "health={82} temp={-18.4} power={92} status=\"Nominal Operation\" personnel={42}"
content = content.replace(maitri_old, maitri_new)

bharati_old = "health={95} temp={-3.2} power={98} status=\"Optimal Performance\""
bharati_new = "health={95} temp={-3.2} power={98} status=\"Optimal Performance\" personnel={38}"
content = content.replace(bharati_old, bharati_new)

# Add Send Message / Broadcast panel in Expanded Analysis section
import_old = "import { Building2, Snowflake, Wind, Activity, Zap, Anchor, ShieldAlert, BarChart4, TrendingUp, LogOut } from 'lucide-react';"
import_new = "import { Building2, Snowflake, Wind, Activity, Zap, Anchor, ShieldAlert, BarChart4, TrendingUp, LogOut, Users, Send } from 'lucide-react';"
if "import { Building2, Snowflake" in content and "Users" not in content:
    content = content.replace(import_old, import_new)

threat_old = """<h4 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Strategic Threat Assessment
            </h4>"""

threat_new = """<h4 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Strategic Threat Assessment
            </h4>""" # Not changing this, but I'll add a whole new panel below the grid.

new_panel = """
        {/* HQ Broadcast / Messaging */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md mb-10">
          <h4 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" /> Global Comm Link & Priority Broadcast
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-black/30 border border-white/5 rounded-xl p-5 flex flex-col">
              <div className="flex gap-4 mb-4">
                <select className="bg-black/50 border border-white/10 text-sm text-white/80 rounded-lg px-3 py-2 focus:outline-none w-1/3">
                  <option>Broadcast All Stations</option>
                  <option>Maitri Command</option>
                  <option>Bharati Logistics</option>
                </select>
                <select className="bg-black/50 border border-white/10 text-sm text-white/80 rounded-lg px-3 py-2 focus:outline-none w-1/3">
                  <option>Priority: Standard</option>
                  <option className="text-amber-400">Priority: High</option>
                  <option className="text-red-400">Priority: CRITICAL ALERT</option>
                </select>
              </div>
              <textarea 
                className="bg-black/50 border border-white/10 text-sm text-white rounded-lg p-3 focus:outline-none focus:border-blue-500/50 flex-1 resize-none mb-4" 
                placeholder="Enter authorized communication payload..."
                defaultValue="⚠️ CRITICAL ALERT: Severe weather conditions expected. All personnel should remain inside the station until further notice."
              />
              <button className="self-end bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2">
                <Send className="w-3.5 h-3.5" /> Transmit Message
              </button>
            </div>
            <div className="bg-black/30 border border-white/5 rounded-xl p-5">
              <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Transmission Log</span>
              <div className="space-y-3">
                <div className="border-l-2 border-emerald-500 pl-3">
                  <span className="block text-xs text-white/80">Resupply operation confirmed. Maintain current operational protocol.</span>
                  <span className="text-[9px] text-white/40 font-mono mt-1 block">To: Maitri • Delivered 2m ago</span>
                </div>
                <div className="border-l-2 border-amber-500 pl-3">
                  <span className="block text-xs text-white/80">Wind turbine #3 feathering sequence initiated by remote override.</span>
                  <span className="text-[9px] text-white/40 font-mono mt-1 block">To: Bharati • Delivered 1h ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
"""

# Insert new panel after the Expanded Analysis grid
content = content.replace("</div>\n\n      </div>\n    </div>", f"</div>{new_panel}      </div>\n    </div>")

with open("frontend/src/pages/GatewayPage.tsx", "w") as f:
    f.write(content)

