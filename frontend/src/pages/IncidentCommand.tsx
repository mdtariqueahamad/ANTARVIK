import React, { useState } from 'react';
import {
  ShieldAlert, Clock, AlertTriangle, FileText,
  CheckCircle, ChevronRight, Activity, Zap
} from 'lucide-react';

interface Incident {
  id: string;
  station: 'MAITRI' | 'BHARATI';
  subsystem: string;
  title: string;
  timestamp: string;
  status: 'UNACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
  snapshot: any;
  analysis?: {
    rootCause: string;
    metrics: { label: string; value: string; trend: string }[];
    recommendedAction: string;
  };
}

export default function IncidentCommand() {
  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: 'INC-2026-0921',
      station: 'MAITRI',
      subsystem: 'Power Generation',
      title: 'Generator 2 Thermal Runaway',
      timestamp: '12 mins ago',
      status: 'UNACKNOWLEDGED',
      snapshot: { Temp: '-32°C', Load: '115%', FuelFlow: 'Erratic', Wind: '42 km/h' },
      analysis: {
        rootCause: 'Intake louver ice buildup restricting cooling airflow.',
        metrics: [
          { label: 'Core Temp', value: '115°C', trend: 'Critical Rise' },
          { label: 'Oil Pressure', value: '45 PSI', trend: 'Dropping' },
          { label: 'Coolant Flow', value: '12 L/min', trend: 'Restricted' }
        ],
        recommendedAction: 'Engage pre-heater on Louver B; transition load to Gen 3 immediately.'
      }
    },
    {
      id: 'INC-2026-0920',
      station: 'BHARATI',
      subsystem: 'Communications',
      title: 'Primary Sat-Link Dropout',
      timestamp: '2 hours ago',
      status: 'RESOLVED',
      snapshot: { Temp: '-45°C', Pressure: '958 hPa', Wind: '110 km/h', Uplink: '0 Mbps' },
      analysis: {
        rootCause: 'Extreme wind (110km/h) misaligned Radome Dish 1.',
        metrics: [
          { label: 'Signal SNR', value: '2 dB', trend: 'Failing' },
          { label: 'Packet Loss', value: '98%', trend: 'Critical' }
        ],
        recommendedAction: 'Wait for wind to drop below 80km/h, dispatch team for physical recalibration.'
      }
    },
    {
      id: 'INC-2026-0919',
      station: 'MAITRI',
      subsystem: 'Life Support',
      title: 'HVAC Pressure Drop',
      timestamp: '4 hours ago',
      status: 'INVESTIGATING',
      snapshot: { Temp: '-35°C', CabinPressure: '980 hPa', Co2: '800 ppm', Humidity: '12%' },
      analysis: {
        rootCause: 'Suspected frozen condensation in return air duct.',
        metrics: [
          { label: 'Duct Temp', value: '-12°C', trend: 'Freezing' },
          { label: 'Airflow', value: '450 CFM', trend: 'Degraded' }
        ],
        recommendedAction: 'Isolate Sector 4 HVAC, enable thermal purge cycle.'
      }
    },
    {
      id: 'INC-2026-0918',
      station: 'BHARATI',
      subsystem: 'Power Grid',
      title: 'Wind Turbine #3 Over-speed',
      timestamp: '1 day ago',
      status: 'RESOLVED',
      snapshot: { Wind: '145 km/h', Rotor: '35 RPM', Output: '120kW (Capped)' },
      analysis: {
        rootCause: 'Category 4 blizzard sustained gusts over design limit.',
        metrics: [
          { label: 'Brake Temp', value: '250°C', trend: 'Cooling' },
          { label: 'Vibration', value: '0.2g', trend: 'Normal' }
        ],
        recommendedAction: 'Turbine auto-feathered and locked. Resume when wind drops below 90 km/h.'
      }
    },
    {
      id: 'INC-2026-0917',
      station: 'MAITRI',
      subsystem: 'Telemetry Sync',
      title: 'DTN Gateway Buffer Overflow',
      timestamp: '2 days ago',
      status: 'RESOLVED',
      snapshot: { Buffer: '98%', SyncRate: '0 KB/s', SatLink: 'Degraded' },
      analysis: {
        rootCause: 'Prolonged satellite dropout during aurora storm led to local buffer fill.',
        metrics: [
          { label: 'Queue Size', value: '450,000 pkts', trend: 'Flushing' },
          { label: 'Compression', value: 'Enabled', trend: 'Active' }
        ],
        recommendedAction: 'Switch to LZ4 max compression profile; utilize secondary Ku-band.'
      }
    }
  ]);

  const [selectedInc, setSelectedInc] = useState<string | null>('INC-2026-0921');

  const handleAcknowledge = (id: string) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'INVESTIGATING' } : inc));
  };

  const handleResolve = (id: string) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'RESOLVED' } : inc));
  };

  const getStatusColor = (status: string) => {
    if (status === 'UNACKNOWLEDGED') return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (status === 'INVESTIGATING') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  const activeIncident = incidents.find(i => i.id === selectedInc);

  return (
    <div className="py-6 fade-in h-full text-white max-w-7xl mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6 border-b border-white/10 pb-6 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">
              NCPOR CENTRAL COMMAND
            </span>
          </div>
          <h1 className="font-heading font-bold text-3xl tracking-wide text-white flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-red-400" />
            Incident Command & Triage
          </h1>
          <p className="text-sm text-white/50 tracking-wide mt-2">
            Global oversight of Edge incidents. Acknowledge crash reports, dispatch SOPs, and analyze frozen telemetry payloads.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left Column: Incident List */}
        <div className="lg:col-span-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-black/20">
            <h3 className="font-bold text-sm text-white/80 uppercase tracking-wider">Active Incident Queue</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {incidents.map(inc => (
              <button 
                key={inc.id}
                onClick={() => setSelectedInc(inc.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedInc === inc.id 
                    ? 'bg-blue-500/10 border-blue-500/30 shadow-lg' 
                    : 'bg-black/20 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${getStatusColor(inc.status)}`}>
                    {inc.status}
                  </span>
                  <span className="text-[10px] text-white/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {inc.timestamp}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white mb-1 truncate">{inc.title}</h4>
                <p className="text-xs text-white/50 truncate">{inc.station} • {inc.subsystem}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Incident Details */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-y-auto">
          {activeIncident ? (
            <div className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{activeIncident.title}</h2>
                  <div className="flex items-center gap-3 text-xs font-mono text-white/50">
                    <span>ID: {activeIncident.id}</span>
                    <span>•</span>
                    <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">{activeIncident.station}</span>
                    <span>•</span>
                    <span>{activeIncident.subsystem}</span>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold tracking-widest ${getStatusColor(activeIncident.status)}`}>
                  {activeIncident.status}
                </div>
              </div>

              {/* Edge Telemetry Snapshot */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Edge Telemetry Snapshot (Time of Crash)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(activeIncident.snapshot).map(([key, val]) => (
                    <div key={key} className="bg-black/40 border border-white/5 p-4 rounded-xl text-center">
                      <span className="block text-[10px] uppercase text-white/40 mb-1">{key}</span>
                      <span className="block font-mono text-lg text-white/90">{val as React.ReactNode}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis & Root Cause */}
              {activeIncident.analysis && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    HQ Detailed Analysis & Correlation
                  </h3>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5 mb-4">
                    <span className="block text-[10px] text-purple-300 uppercase tracking-widest font-bold mb-2">Automated Root Cause Diagnosis</span>
                    <p className="text-sm text-white/90">{activeIncident.analysis.rootCause}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {activeIncident.analysis.metrics.map(m => (
                      <div key={m.label} className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] uppercase text-white/50">{m.label}</span>
                        <span className="font-mono text-lg text-white font-bold">{m.value}</span>
                        <span className={`text-[10px] font-bold ${m.trend.includes('Critical') || m.trend.includes('Failing') || m.trend.includes('Restricted') ? 'text-red-400' : 'text-amber-400'}`}>{m.trend}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                    <Zap className="w-5 h-5 text-yellow-400 shrink-0" />
                    <div>
                      <span className="block text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Recommended SOP</span>
                      <p className="text-sm text-white/80">{activeIncident.analysis.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-6 border-t border-white/10">
                {activeIncident.status === 'UNACKNOWLEDGED' && (
                  <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-xl">
                    <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> ACTION REQUIRED
                    </h4>
                    <p className="text-xs text-white/70 mb-4">
                      The edge node has flagged this as a critical failure requiring HQ oversight. Acknowledge to notify the edge that HQ is investigating, and dispatch the relevant SOPs.
                    </p>
                    <button 
                      onClick={() => handleAcknowledge(activeIncident.id)}
                      className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                    >
                      Acknowledge & Investigate <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {activeIncident.status === 'INVESTIGATING' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-xl">
                    <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5" /> INVESTIGATION ACTIVE
                    </h4>
                    <p className="text-xs text-white/70 mb-4">
                      HQ is currently investigating. Standard Operating Procedures (SOPs) have been dispatched to the local edge node.
                    </p>
                    <button 
                      onClick={() => handleResolve(activeIncident.id)}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                    >
                      Mark as Resolved <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {activeIncident.status === 'RESOLVED' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-xl">
                    <h4 className="text-emerald-400 font-bold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> INCIDENT RESOLVED
                    </h4>
                    <p className="text-xs text-white/70 mt-2">
                      This incident has been fully resolved. Telemetry has stabilized and the case is closed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/30 p-6 text-center">
              <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
              <p>Select an incident from the queue to view edge telemetry payloads.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
