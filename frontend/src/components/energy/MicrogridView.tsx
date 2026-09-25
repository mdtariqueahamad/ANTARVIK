import React, { useState } from 'react';
import { Zap, Sun, Wind, Battery, BatteryCharging, Activity, Cpu, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import ProvenanceTooltip from '../common/ProvenanceTooltip';
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
  gensets: initialGensets,
  pvOutput,
  windOutput,
  batterySoc,
  batteryPower,
  totalLoad,
  totalGeneration,
}: MicrogridViewProps) {
  const role = sessionStorage.getItem('role');
  const isOperator = role === 'generator' || role === 'hq';
  const [gensets, setGensets] = useState(initialGensets);

  const handleToggleState = (id: string) => {
    if (!isOperator) return;
    setGensets((prev: any[]) => prev.map((g: any) => {
      if (g.id === id) {
        if (g.status === 'running') return { ...g, status: 'standby', output_kw: 0, fuel_rate_lph: 0 };
        if (g.status === 'standby') return { ...g, status: 'running', output_kw: g.capacity_kw * 0.8, fuel_rate_lph: 12.5 };
      }
      return g;
    }));
  };

  const balance = totalGeneration - totalLoad;
  const isDeficit = balance < 0;

  // ML Prediction Helpers
  const getGensetHealth = (rul: number) => {
    if (rul < 500) return { risk: 'High', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', msg: 'Maintenance Overdue', icon: AlertTriangle };
    if (rul < 2000) return { risk: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', msg: 'Wear Detected', icon: Clock };
    return { risk: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', msg: 'Optimal Operation', icon: CheckCircle };
  };

  const getFailureProb = (rul: number) => {
    const prob = Math.max(0.5, Math.min(99, 100 - (rul / 100)));
    return prob.toFixed(1);
  };

  return (
    <div className="bg-[#0b101e] border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl">
      
      {/* HEADER */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-widest uppercase">Microgrid Command State</h3>
            <p className="text-[10px] text-white/50 tracking-widest uppercase mt-0.5">Live Telemetry & Diagnostics</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Grid Balance</span>
          <span className={`text-xl font-black font-mono tracking-wider ${isDeficit ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`}>
            {balance >= 0 ? '+' : ''}{formatPower(balance)}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-10">
        
        {/* BLOCK 1: RENEWABLES & STORAGE */}
        <div>
          <h4 className="text-xs uppercase font-black text-white/60 tracking-widest mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
            Renewables & Storage
          </h4>
          
          <div className="flex flex-col gap-4">
            
            {/* Solar Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Sun className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="block text-sm font-black text-white uppercase tracking-widest">Solar Photovoltaic Array</span>
                  <span className="block text-[10px] text-white/40 tracking-wider mt-1">Monocrystalline panels optimized for high-albedo snow environments.</span>
                </div>
              </div>
              
              <div className="flex items-center gap-8 md:border-l md:border-white/10 md:pl-8">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Live Output</span>
                  <span className="text-xl font-mono font-bold text-white">{formatPower(pvOutput)}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Irradiance</span>
                  <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Nominal</span>
                </div>
              </div>
            </div>

            {/* Wind Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                  <Wind className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <span className="block text-sm font-black text-white uppercase tracking-widest">Wind Turbine</span>
                  <span className="block text-[10px] text-white/40 tracking-wider mt-1">Vertical-axis hybrid turbine engineered for severe katabatic winds.</span>
                </div>
              </div>
              
              <div className="flex items-center gap-8 md:border-l md:border-white/10 md:pl-8">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Live Output</span>
                  <span className="text-xl font-mono font-bold text-white">{formatPower(windOutput)}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Wind Speed</span>
                  <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Optimal</span>
                </div>
              </div>
            </div>

            {/* Battery Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className={`p-3 rounded-xl border ${batteryPower >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  {batteryPower >= 0 ? <BatteryCharging className="w-5 h-5 text-emerald-400" /> : <Battery className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <span className="block text-sm font-black text-white uppercase tracking-widest">BESS Storage</span>
                  <span className="block text-[10px] text-white/40 tracking-wider mt-1">Grid-forming Battery Energy Storage System for base-load smoothing.</span>
                </div>
              </div>
              
              <div className="flex items-center gap-8 md:border-l md:border-white/10 md:pl-8">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Charge State</span>
                  <span className="text-xl font-mono font-bold text-white">{formatPercent(batterySoc)}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Flow Rate</span>
                  <span className={`text-xl font-mono font-bold ${batteryPower >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {batteryPower >= 0 ? '+' : '-'}{formatPower(Math.abs(batteryPower))}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BLOCK 2: PRIMARY GENERATION */}
        <div>
          <h4 className="text-xs uppercase font-black text-white/60 tracking-widest mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
            Primary Generation
          </h4>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {gensets.map((g: any) => {
              const health = getGensetHealth(g.rul_hours);
              const failProb = getFailureProb(g.rul_hours);
              const isRunning = g.status === 'running';

              return (
                <div 
                  key={g.id} 
                  className={`relative p-5 rounded-2xl border transition-all shadow-lg overflow-hidden ${isRunning ? 'bg-gradient-to-br from-blue-900/30 to-black/60 border-blue-500/30 hover:border-blue-400/50' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
                >
                  {/* Background Accents */}
                  {isRunning && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />}
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${isRunning ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-sm font-black text-white uppercase tracking-widest">{g.name}</span>
                          <span className="text-[9px] uppercase tracking-widest font-bold text-white/40">Rated: {formatPower(g.capacity_kw)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleState(g.id)}
                          className={`text-[9px] px-3 py-1.5 rounded-lg border uppercase font-black tracking-widest transition-all ${isRunning ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] cursor-pointer hover:bg-blue-600' : 'bg-transparent text-white/50 border-white/20 cursor-pointer hover:bg-white/10 hover:text-white'}`}
                        >
                          {isRunning ? 'Running' : 'Standby'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      {/* Operational Metrics */}
                      <div className="space-y-4 border-r border-white/5 pr-4">
                        <ProvenanceTooltip provenance="simulated">
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-white/40 mb-1 tracking-widest">Live Output</span>
                            <div className={`text-2xl font-mono font-black ${isRunning ? 'text-white' : 'text-white/30'}`}>
                              {formatPower(g.output_kw)}
                            </div>
                          </div>
                        </ProvenanceTooltip>
                        
                        <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">Burn Rate</span>
                          <span className={`text-xs font-mono font-bold ${isRunning ? 'text-amber-400' : 'text-white/30'}`}>{g.fuel_rate_lph.toFixed(1)} L/h</span>
                        </div>
                      </div>

                      {/* Predictive Metrics */}
                      <div className="space-y-4">
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-white/40 mb-2 tracking-widest">Failure Prediction</span>
                          <div className={`flex items-center gap-2 p-2 rounded-lg border ${health.bg} ${health.border}`}>
                            <health.icon className={`w-3.5 h-3.5 ${health.color}`} />
                            <div className="flex flex-col">
                              <span className={`text-[9px] uppercase font-black tracking-widest ${health.color}`}>{health.msg}</span>
                              <span className="text-[8px] uppercase tracking-widest text-white/60 mt-0.5">Risk: {failProb}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">Est. RUL</span>
                          <span className="text-xs font-mono font-bold text-white/80">{g.rul_hours.toFixed(0)} <span className="text-[9px] text-white/40">hrs</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Load Distribution Gauge */}
        <div className="bg-gradient-to-r from-black/60 to-black/40 border border-white/10 p-6 rounded-2xl shadow-lg relative overflow-hidden mt-6">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Total System Load</span>
              <span className="text-2xl font-mono font-black text-white drop-shadow-md">{formatPower(totalLoad)}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Max Capacity</span>
              <span className="text-lg font-mono font-bold text-white/80">{formatPower(totalGeneration)}</span>
            </div>
          </div>
          
          <div className="relative z-10 w-full h-3 bg-black/80 rounded-full overflow-hidden border border-white/10 shadow-inner">
            <div 
              className="absolute top-0 left-0 h-full transition-all duration-1000 bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              style={{ width: `${Math.min((totalLoad / Math.max(totalGeneration, 1)) * 100, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center mt-3 relative z-10">
            <span className="text-[9px] font-mono font-bold text-white/30 tracking-widest">0 kW</span>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              Load Factor: <span className="text-white/80 font-mono">{((totalLoad / Math.max(totalGeneration, 1)) * 100).toFixed(1)}%</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
