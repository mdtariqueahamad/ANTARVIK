import re

with open("src/pages/GatewayPage.tsx", "r") as f:
    content = f.read()

old_card = r"""  const StationCard = \(\{ id, name, icon: Icon, color, image, health, temp, power, status \}: any\) => \(.*?  \);"""

new_card = """  const StationCard = ({ id, name, icon: Icon, color, image, health, temp, power, status }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" }}
      transition={{ duration: 0.2 }}
      className="bg-white/5 border border-white/10 rounded-3xl flex flex-col relative overflow-hidden backdrop-blur-md cursor-pointer group origin-center h-full p-0"
      onClick={() => handleSelectStation(id)}
    >
      {/* Prominent Image Header */}
      <div className="w-full h-40 relative border-b border-white/10 shrink-0">
        <img src={image} className="w-full h-full object-cover opacity-90 transition-transform duration-700" alt={name} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        
        <div className="absolute bottom-4 left-6 flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-widest uppercase text-white drop-shadow-md">{name}</h3>
            <span className="text-[10px] text-white/80 tracking-widest uppercase drop-shadow">Edge Node Active</span>
          </div>
        </div>
        
        <div className="absolute top-4 right-6 text-right">
          <div className="text-3xl font-black text-white drop-shadow-lg">{health}%</div>
          <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase drop-shadow-md">Health Index</span>
        </div>
      </div>

      {/* Metrics Body */}
      <div className="p-6 flex-1 flex flex-col justify-end">
        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase tracking-widest mb-1 block">Live Temp</span>
            <span className="text-lg font-mono text-white">{temp}°C</span>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase tracking-widest mb-1 block">Power Avail</span>
            <span className="text-lg font-mono text-white">{power}%</span>
          </div>
          <div className="col-span-2 bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-white/50 uppercase tracking-widest">Status</span>
            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">{status}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );"""

content = re.sub(old_card, new_card, content, flags=re.DOTALL)

with open("src/pages/GatewayPage.tsx", "w") as f:
    f.write(content)

