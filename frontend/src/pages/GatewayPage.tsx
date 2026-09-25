import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../hooks/useStationStore';
import { Building2, Snowflake, Wind, Activity, Zap, Anchor, ShieldAlert, BarChart4, TrendingUp, LogOut, Users, Send } from 'lucide-react';
import { subscribeNotifications } from '../components/dashboard/StationOverview';

export default function GatewayPage() {
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
    navigate('/dashboard');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('activeNode');
    navigate('/login');
  };

  const StationCard = ({ id, name, icon: Icon, color, image, health, temp, power, status, personnel }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-3xl flex flex-col relative overflow-hidden backdrop-blur-md cursor-pointer group origin-center h-full p-0"
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
          <div className="col-span-2 bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-white/50 uppercase tracking-widest flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Personnel Present</span>
            <span className="text-sm font-bold text-blue-300">{personnel} Active</span>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase tracking-widest mb-1 block">Power Avail</span>
            <span className="text-lg font-mono text-white">{power}%</span>
          </div>
          <div className="col-span-2 bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-white/50 uppercase tracking-widest">Station Status</span>
            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">{status}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed relative flex flex-col"
      style={{ backgroundImage: "url('/background.png')" }}>
      <div className="absolute inset-0 bg-slate-950/80 z-0" />

      {/* Top Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase drop-shadow-md">NCPOR Central Command</h1>
            <p className="text-white/60 text-xs mt-1 font-medium tracking-wide">Strategic Gateway & Dual-Station Telemetry</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-xs font-bold tracking-widest uppercase"
        >
          <LogOut className="w-4 h-4" /> Disconnect
        </button>
      </header>
      
      {/* Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">

        {/* Global Metrics Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors duration-300 cursor-default">
            <div className="flex items-center gap-3 text-blue-300 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Network Sync</span>
            </div>
            <div className="text-2xl font-mono text-white font-bold">99.8%</div>
            <p className="text-xs text-blue-300/60 mt-1">Both nodes connected via DTN</p>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors duration-300 cursor-default">
            <div className="flex items-center gap-3 text-emerald-300 mb-2">
              <Anchor className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Logistics</span>
            </div>
            <div className="text-2xl font-mono text-white font-bold">2 Active</div>
            <p className="text-xs text-emerald-300/60 mt-1">Vessels en-route to Antarctic</p>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors duration-300 cursor-default">
            <div className="flex items-center gap-3 text-purple-300 mb-2">
              <Zap className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Total Energy</span>
            </div>
            <div className="text-2xl font-mono text-white font-bold">1.4 MW</div>
            <p className="text-xs text-purple-300/60 mt-1">Combined Grid Output</p>
          </div>

          <div className={`p-5 rounded-2xl backdrop-blur-md transition-colors duration-300 cursor-default ${alertCount > 0 ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}>
            <div className={`flex items-center gap-3 mb-2 ${alertCount > 0 ? 'text-red-300' : 'text-white/50'}`}>
              <ShieldAlert className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Active Incidents</span>
            </div>
            <div className="text-2xl font-mono text-white font-bold">{alertCount}</div>
            <p className="text-xs text-white/40 mt-1">Pending resolution</p>
          </div>
        </div>

        {/* Edge Nodes */}
        <div>
          <h3 className="text-sm font-black tracking-widest uppercase text-white/80 mb-4 flex items-center gap-2">
            <BarChart4 className="w-5 h-5 text-blue-400" /> Select Target Node
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[260px]">
            <StationCard 
              id="maitri" name="Maitri Station" icon={Snowflake} color="text-cyan-400" image="/maitri.jpeg"
              health={82} temp={-18.4} power={92} status="Nominal Operation" personnel={42}
            />
            <StationCard 
              id="bharati" name="Bharati Station" icon={Wind} color="text-indigo-400" image="/bharati-hero.png"
              health={95} temp={-3.2} power={98} status="Optimal Performance" personnel={38}
            />
          </div>
        </div>

        {/* Expanded Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
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
      </div>
    </div>
  );
}
