import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../../hooks/useStationStore';
import { Building2, Snowflake, Wind, Activity, Zap, Anchor, ShieldAlert, BarChart4, TrendingUp } from 'lucide-react';
import { subscribeNotifications } from './StationOverview';

export default function HQDashboard() {
  const { setStation } = useStationStore();
  const navigate = useNavigate();

  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeNotifications(notifs => {
      setAlertCount(notifs.filter(n => n.level === 'critical' || n.level === 'warning').length);
    });
    return () => unsub();
  }, []);

  const handleSelectStation = (station: 'maitri' | 'bharati') => {
    setStation(station);
    // Setting active node to edge so layout behaves like local station
    // Wait, let's just keep activeNode as NCPOR and navigate to twin/dashboard.
    // The user can view the specific station because selectedStation changes.
    navigate('/dashboard?edge=1');
  };

  const StationCard = ({ id, name, icon: Icon, color, image, health, temp, power, status }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" }}
      transition={{ duration: 0.2 }}
      className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden backdrop-blur-md hover:bg-white/10 hover:border-white/20 cursor-pointer group origin-center"
      onClick={() => handleSelectStation(id)}
    >
      <div className="absolute inset-0 opacity-10 mix-blend-overlay group-hover:scale-105 transition-transform duration-700">
        <img src={image} className="w-full h-full object-cover" alt={name} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
      
      <div className="relative z-10 flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-widest uppercase text-white">{name}</h3>
            <span className="text-xs text-white/50 tracking-wider">Edge Node Active</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-white">{health}%</div>
          <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Health Index</span>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-4 mt-auto">
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
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto p-2 pb-10 space-y-6">
      <header className="mb-2">
        <h2 className="text-3xl font-black text-white flex items-center gap-4 tracking-widest uppercase drop-shadow-md">
          <Building2 className="w-8 h-8 text-blue-400" />
          NCPOR Central Command
        </h2>
        <p className="text-white/60 text-sm mt-2 font-medium">Strategic Overview & Dual-Station Telemetry Gateway</p>
      </header>

      {/* Global Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }} transition={{ duration: 0.2 }} className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl backdrop-blur-sm transition-colors hover:bg-blue-500/20 cursor-default">
          <div className="flex items-center gap-3 text-blue-300 mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Network Sync</span>
          </div>
          <div className="text-2xl font-mono text-white font-bold">99.8%</div>
          <p className="text-xs text-blue-300/60 mt-1">Both nodes connected via DTN</p>
        </motion.div>
        
        <motion.div whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }} transition={{ duration: 0.2 }} className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl backdrop-blur-sm transition-colors hover:bg-emerald-500/20 cursor-default">
          <div className="flex items-center gap-3 text-emerald-300 mb-2">
            <Anchor className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Logistics</span>
          </div>
          <div className="text-2xl font-mono text-white font-bold">2 Active</div>
          <p className="text-xs text-emerald-300/60 mt-1">Vessels en-route to Antarctic</p>
        </motion.div>

        <motion.div whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }} transition={{ duration: 0.2 }} className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-2xl backdrop-blur-sm transition-colors hover:bg-purple-500/20 cursor-default">
          <div className="flex items-center gap-3 text-purple-300 mb-2">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Total Energy</span>
          </div>
          <div className="text-2xl font-mono text-white font-bold">1.4 MW</div>
          <p className="text-xs text-purple-300/60 mt-1">Combined Grid Output</p>
        </motion.div>

        <motion.div whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }} transition={{ duration: 0.2 }} className={`p-5 rounded-2xl backdrop-blur-sm transition-colors cursor-default ${alertCount > 0 ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
          <div className={`flex items-center gap-3 mb-2 ${alertCount > 0 ? 'text-red-300' : 'text-white/50'}`}>
            <ShieldAlert className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Active Incidents</span>
          </div>
          <div className="text-2xl font-mono text-white font-bold">{alertCount}</div>
          <p className="text-xs text-white/40 mt-1">Pending resolution</p>
        </motion.div>
      </div>

      {/* Edge Nodes */}
      <h3 className="text-lg font-black tracking-widest uppercase text-white/80 mt-6 flex items-center gap-2">
        <BarChart4 className="w-5 h-5 text-blue-400" /> Edge Nodes
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StationCard 
          id="maitri" name="Maitri Station" icon={Snowflake} color="text-cyan-400" image="/maitri.jpeg"
          health={82} temp={-18.4} power={92} status="Nominal Operation"
        />
        <StationCard 
          id="bharati" name="Bharati Station" icon={Wind} color="text-indigo-400" image="/bharati-hero.png"
          health={95} temp={-3.2} power={98} status="Optimal Performance"
        />
      </div>

      {/* Expanded Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
          <h4 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Consolidated Power Trend (24h)
          </h4>
          <div className="h-48 flex items-end gap-2 mt-4 relative">
            <div className="absolute inset-0 border-b border-l border-white/10" />
            {Array.from({length: 24}).map((_, i) => {
              const hM = 60 + Math.sin(i / 3) * 20 + Math.random() * 10;
              const hB = 50 + Math.cos(i / 3) * 15 + Math.random() * 5;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative h-full pt-4">
                  <div className="w-full bg-cyan-400/80 rounded-t-sm transition-all hover:bg-cyan-300" style={{ height: `${hM}%` }} />
                  <div className="w-full bg-indigo-500/80 rounded-t-sm transition-all hover:bg-indigo-400" style={{ height: `${hB}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-white/60"><span className="w-3 h-3 rounded bg-cyan-400/80"/> Maitri Load</div>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-white/60"><span className="w-3 h-3 rounded bg-indigo-500/80"/> Bharati Load</div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
          <h4 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" /> Strategic Threat Assessment
          </h4>
          <div className="space-y-4">
            <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white/80 uppercase">Blizzard Front Approaching</span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase">Warning</span>
              </div>
              <p className="text-sm text-white/60">Severe low-pressure system detected 400km West of Maitri. ETA 18 hours. Wind speeds expected &gt;120km/h.</p>
            </div>
            <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white/80 uppercase">Bharati Grid Resilience</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">Optimal</span>
              </div>
              <p className="text-sm text-white/60">Wind-solar hybrid contribution at 34%. Fuel consumption reduced by 12% week-over-week.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
