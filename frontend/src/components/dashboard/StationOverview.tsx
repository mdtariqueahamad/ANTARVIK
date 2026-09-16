import React from 'react';
import EnergyMix from './EnergyMix';
import DepletionTable from './DepletionTable';

import { useStationStore } from '../../hooks/useStationStore';
import { Thermometer, Wind, Zap, Shield, AlertTriangle, MessageSquare, Droplets, CloudSnow, Search, Bell , MapPin, Activity, ChevronDown } from 'lucide-react';

const MOCK_ENERGY_MIX = Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
  diesel_kw: 80 + Math.random() * 30,
  solar_kw: i >= 10 && i <= 16 ? 20 + Math.random() * 40 : Math.random() * 5,
  wind_kw: 10 + Math.random() * 25,
}));

const MOCK_DEPLETION = [
  { name: 'Winter Diesel', category: 'Fuel', quantity: 39900, unit: 'L', dailyRate: 420, daysRemaining: 95 },
  { name: 'Potable Water', category: 'Water', quantity: 9600, unit: 'L', dailyRate: 150, daysRemaining: 64 },
  { name: 'LPG Cylinders', category: 'Fuel', quantity: 45, unit: 'cyl', dailyRate: 0.5, daysRemaining: 90 },
  { name: 'Dry Rations', category: 'Food', quantity: 420, unit: 'kg', dailyRate: 3.5, daysRemaining: 120 },
];

const KPICard = ({ title, value, trend, status }: { title: string, value: string, trend?: string, status?: 'good'|'warning'|'critical' }) => {
  const colors = {
    good: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
    default: 'text-white'
  };
  return (
    <div className="bg-[#1e293b]/70 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col justify-center shadow-lg hover:bg-white/10 transition-colors">
      <span className="text-xs text-slate-400 font-medium mb-1">{title}</span>
      <div className="flex items-baseline justify-between">
        <span className={`text-2xl font-bold ${status ? colors[status] : colors.default}`}>{value}</span>
        {trend && <span className="text-xs text-emerald-400">{trend}</span>}
      </div>
    </div>
  );
};

export default function StationOverview() {
  const { selectedStation } = useStationStore();

  return (
    <div className="flex flex-col min-h-full pb-12 w-full max-w-[1600px] mx-auto">
      
      {/* HEADER / NAVIGATION RIBBON */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
          <span className="text-white border-b-2 border-blue-500 pb-1">Overview</span>
          <span className="hover:text-white cursor-pointer transition-colors">Infrastructure</span>
          <span className="hover:text-white cursor-pointer transition-colors">Energy</span>
          <span className="hover:text-white cursor-pointer transition-colors">Logistics</span>
          <span className="hover:text-white cursor-pointer transition-colors">Environment</span>
          <span className="hover:text-white cursor-pointer transition-colors">Health & Safety</span>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300">
          Last 24 Hours <ChevronDown className="w-3 h-3" />
        </div>
      </div>

      {/* HERO SECTION - Integrates 3D Model seamlessly */}
{/* HERO SECTION - Image Background Only */}
      <div className="relative w-full h-[240px] rounded-3xl overflow-hidden mb-6 border border-white/10 shadow-xl shrink-0">
        
        {/* Dynamic Image based on station */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${selectedStation === 'maitri' ? '/maitri.jpeg' : '/bharati.jpeg'})` }}
        ></div>
        
        {/* Gradient Blend overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/30 to-transparent pointer-events-none z-10"></div>
        
        {/* Title Overlay */}
        <div className="absolute bottom-6 left-8 pointer-events-none z-20">
          <p className="text-blue-300 text-sm font-medium flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4" /> 
            {selectedStation === 'maitri' ? '69.7667° S, 11.7333° E' : '69.4077° S, 76.1836° E'} • Elev 117m
          </p>
          <h2 className="text-5xl font-black text-white tracking-tight drop-shadow-md">
            {selectedStation === 'maitri' ? 'Maitri Station' : 'Bharati Station'}
          </h2>
        </div>

        {/* Weather Widget */}
        <div className="absolute top-6 right-6 z-20 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex gap-8 pointer-events-none">
          <div className="flex items-center gap-3">
            <Thermometer className="w-8 h-8 text-cyan-400"/>
            <div>
              <div className="text-2xl font-bold text-white leading-none">-23.4°C</div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Light Snow</span>
            </div>
          </div>
          <div className="h-10 w-px bg-white/10"></div>
          <div className="flex flex-col gap-1 justify-center">
            <div className="flex items-center gap-2 text-white font-medium text-sm"><Wind className="w-3 h-3 text-indigo-400"/> 42 km/h</div>
            <div className="flex items-center gap-2 text-white font-medium text-sm"><Droplets className="w-3 h-3 text-blue-400"/> 68%</div>
          </div>
        </div>
      </div>

      {/* KPI RIBBON */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard title="Station Health" value="92/100" trend="↑ 2%" status="good" />
        <KPICard title="Power Avail" value="96%" trend="Stable" status="good" />
        <KPICard title="Fuel Reserve" value="39,900 L" status="warning" />
        <KPICard title="Water Storage" value="9,600 L" />
        <KPICard title="Food Supplies" value="420 kg" />
        <KPICard title="Critical Alerts" value="3" status="critical" />
      </div>

      {/* ROW 1: 12-Column Layout */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        
        {/* Key Parameters */}
        <div className="col-span-12 lg:col-span-3 bg-[#151e32]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col">
          <h3 className="text-sm text-slate-300 font-bold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400"/> Key Parameters (Live)
          </h3>
          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Temperature</span><span className="text-white font-medium">-23.4°C</span></div>
            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Wind Speed</span><span className="text-white font-medium">42 km/h</span></div>
            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Humidity</span><span className="text-white font-medium">68%</span></div>
            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Solar Irradiance</span><span className="text-white font-medium">120 W/m²</span></div>
            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Visibility</span><span className="text-white font-medium">1.2 km</span></div>
          </div>
        </div>

        {/* Predictive Forecasts */}
        <div className="col-span-12 lg:col-span-6 bg-[#151e32]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-slate-300 font-bold flex items-center gap-2">
              <CloudSnow className="w-4 h-4 text-blue-400"/> Predictive Forecasts (Next 7 Days)
            </h3>
            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg">
               <button className="px-3 py-1 bg-white/10 rounded-md text-xs text-white">Temp</button>
               <button className="px-3 py-1 text-xs text-slate-400">Fuel</button>
               <button className="px-3 py-1 text-xs text-slate-400">Power</button>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center bg-slate-900/40 rounded-xl border border-white/5">
            <CloudSnow className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-slate-400 text-sm font-medium">Temp drop to -32°C expected</p>
            <p className="text-slate-600 text-xs">AI Forecast Chart Placeholder</p>
          </div>
        </div>

        {/* AI Insights */}
        <div className="col-span-12 lg:col-span-3 bg-[#151e32]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col">
          <h3 className="text-sm text-slate-300 font-bold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400"/> AI Insights
          </h3>
          <div className="space-y-3 flex-1">
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">High Risk</span>
                <p className="text-slate-300 text-xs leading-relaxed">Fuel depletion accelerated by impending storm.</p>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">Medium Warning</span>
                <p className="text-slate-300 text-xs leading-relaxed">Temp expected to drop significantly in 48h.</p>
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex gap-3">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Positive</span>
                <p className="text-slate-300 text-xs leading-relaxed">Solar generation forecast indicates surplus tomorrow.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ROW 2: 12-Column Layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Energy Generation */}
        <div className="col-span-12 lg:col-span-5 bg-[#151e32]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-xl overflow-hidden flex flex-col">
          <h3 className="text-sm text-slate-300 font-bold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400"/> Energy Generation & Consumption
          </h3>
          <div className="flex-1">
             <EnergyMix data={MOCK_ENERGY_MIX} />
          </div>
        </div>
        
        {/* Top Depleting Consumables */}
        <div className="col-span-12 lg:col-span-4 bg-[#151e32]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-xl overflow-x-auto flex flex-col">
          <h3 className="text-sm text-slate-300 font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400"/> Top Depleting Consumables
          </h3>
          <div className="flex-1">
            <DepletionTable items={MOCK_DEPLETION} />
          </div>
        </div>

        {/* RAG Assistant Placeholder */}
        <div className="col-span-12 lg:col-span-3 bg-[#151e32]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col">
          <h3 className="text-sm text-slate-300 font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400"/> Ask AntarVik
          </h3>
          <div className="flex-1 border border-white/5 rounded-xl bg-slate-900/50 p-4 flex flex-col justify-center items-center text-center mb-3">
            <MessageSquare className="w-6 h-6 text-slate-600 mb-2" />
            <p className="text-slate-400 text-xs">RAG Assistant Placeholder</p>
          </div>
          <div className="bg-slate-900/60 border border-white/10 rounded-lg p-2.5 text-slate-500 text-xs flex items-center">
            <Search className="w-3 h-3 mr-2" /> Ask a question about station manuals...
          </div>
        </div>

      </div>
    </div>
  );
}

// Ensure icons used are correctly imported at the top.
// Added MapPin, Activity, ChevronDown, etc.
