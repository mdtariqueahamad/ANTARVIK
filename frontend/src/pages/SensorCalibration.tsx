import React, { useState, useEffect, useRef } from 'react';
import { useStationStore } from '../hooks/useStationStore';
import {
  Cpu, Thermometer, Wind, Droplets, Activity,
  AlertTriangle, Settings2, RefreshCw, CheckCircle,
  XCircle, Radio, ArrowRight, ShieldAlert, Wrench, Zap
} from 'lucide-react';

type SensorStatus = 'NOMINAL' | 'DEGRADED' | 'DIVERTED' | 'FAILED';

interface ComponentScore {
  score: number;
  weight: number;
  description: string;
  spike_delta?: number;
  spike_threshold?: number;
}

interface SuddenChangeEvent {
  sensor_id: string;
  name: string;
  sensor_type: string;
  previous_value: number;
  current_value: number;
  delta: number;
  threshold: number;
  penalty_applied: number;
  confidence_penalty_pct: number;
  timestamp: number;
  timestamp_iso: string;
  description: string;
}

interface SensorConfidence {
  sensor_id: string;
  name: string;
  sensor_type: string;
  confidence: number;
  confidence_pct: number;
  status: SensorStatus;
  reason: string;
  sudden_changes: SuddenChangeEvent[];
  components: {
    weibull: ComponentScore;
    atmospheric: ComponentScore;
    crosscheck: ComponentScore;
    drift: ComponentScore;
    spike: ComponentScore;
  };
  parameters_used: Record<string, number>;
}

interface StationConfidence {
  station: string;
  station_confidence_pct: number;
  sensor_count: number;
  diverted_count: number;
  failed_count: number;
  sudden_change_count: number;
  sudden_changes: SuddenChangeEvent[];
  formula: string;
  thresholds: Record<string, string>;
  spike_thresholds: Record<string, string>;
  sensors: SensorConfidence[];
}

interface SensorData {
  id: string;
  name: string;
  type: string;
  value: string;
  raw: string;
  status: SensorStatus;
  lastPing: string;
  redundancy: boolean;
  confidence_pct?: number;
  reason?: string;
  components?: SensorConfidence['components'];
  parameters_used?: Record<string, number>;
  sudden_changes?: SuddenChangeEvent[];
}

const STATIC_SENSOR_META: Record<string, Omit<SensorData, 'status' | 'confidence_pct' | 'reason' | 'components' | 'parameters_used' | 'sudden_changes'>> = {
  'S-ANM-01': { id: 'S-ANM-01', name: 'Primary Anemometer',    type: 'Wind',     value: '0 km/h',   raw: '0.00v',  lastPing: '2s ago',  redundancy: true  },
  'S-ANM-02': { id: 'S-ANM-02', name: 'Secondary Anemometer',  type: 'Wind',     value: '84 km/h',  raw: '4.21v',  lastPing: '2s ago',  redundancy: false },
  'S-TMP-A':  { id: 'S-TMP-A',  name: 'Ambient Temp Probe A',  type: 'Temp',     value: '-32.4 °C', raw: '1.42v',  lastPing: '1s ago',  redundancy: true  },
  'S-TMP-B':  { id: 'S-TMP-B',  name: 'Ambient Temp Probe B',  type: 'Temp',     value: '-29.1 °C', raw: '1.55v',  lastPing: '1s ago',  redundancy: true  },
  'S-PRS-01': { id: 'S-PRS-01', name: 'Barometric Sensor',     type: 'Pressure', value: '962 hPa',  raw: '2.84v',  lastPing: '5s ago',  redundancy: false },
  'S-GLY-01': { id: 'S-GLY-01', name: 'Glycol Loop Pressure',  type: 'Fluid',    value: 'ERR',      raw: '0.00v',  lastPing: 'OFFLINE', redundancy: true  },
};

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const POLL_INTERVAL_MS = 5000;

export default function SensorCalibration() {
  const { selectedStation } = useStationStore();
  const [calibrating, setCalibrating] = useState<string | null>(null);
  const [offsetVal, setOffsetVal] = useState('');
  const [stationData, setStationData] = useState<StationConfidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Partial<SensorData>>>({});
  const [spiking, setSpiking] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConfidence = (isInitial = false) => {
    if (isInitial) setLoading(true);
    fetch(`${API_BASE}/sensor-confidence/${selectedStation}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<StationConfidence>;
      })
      .then(data => {
        setStationData(data);
        setLoading(false);
        setError(null);
        if (data.sudden_changes?.length) {
          const affected = new Set(data.sudden_changes.map(e => e.sensor_id));
          setSpiking(affected);
          setTimeout(() => setSpiking(new Set()), 2000);
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConfidence(true);
    pollRef.current = setInterval(() => fetchConfidence(false), POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedStation]);

  // Merge + filter to only degraded sensors
  const sensors: SensorData[] = React.useMemo(() => {
    const base = stationData?.sensors ?? [];
    return Object.values(STATIC_SENSOR_META)
      .map(meta => {
        const live = base.find(s => s.sensor_id === meta.id);
        const override = overrides[meta.id] ?? {};
        const merged = {
          ...meta,
          status: override.status ?? (live?.status as SensorStatus) ?? 'NOMINAL',
          confidence_pct: live?.confidence_pct,
          reason: live?.reason,
          components: live?.components,
          parameters_used: live?.parameters_used,
          sudden_changes: live?.sudden_changes,
          ...override,
        } as SensorData;
        return merged;
      })
      // Only show sensors that are NOT nominal — i.e. confidence has decreased
      .filter(s => s.status !== 'NOMINAL');
  }, [stationData, overrides]);

  const handleAction = (id: string, action: 'RESTART' | 'FAILOVER' | 'OVERRIDE') => {
    setOverrides(prev => {
      const update: Partial<SensorData> = {};
      if (action === 'FAILOVER') { update.status = 'NOMINAL'; update.value = 'Redundant Active'; update.raw = 'SYC'; }
      if (action === 'RESTART')  { update.status = 'NOMINAL'; }
      if (action === 'OVERRIDE') { update.status = 'NOMINAL'; update.value = offsetVal || 'MANUAL'; update.raw = 'OVR'; }
      return { ...prev, [id]: update };
    });
    setCalibrating(null);
    setOffsetVal('');
  };

  const getStatusColor = (status: SensorStatus) => {
    switch (status) {
      case 'NOMINAL':  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'DEGRADED': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'DIVERTED': return 'text-orange-400 bg-orange-500/10 border-orange-500/30 animate-pulse';
      case 'FAILED':   return 'text-red-400 bg-red-500/10 border-red-500/30';
    }
  };

  const getConfidenceColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 55) return 'text-amber-400';
    return 'text-orange-400';
  };

  const getConfidenceBar = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 55) return 'bg-amber-500';
    return 'bg-orange-500';
  };

  const totalSensors = Object.keys(STATIC_SENSOR_META).length;

  return (
    <div className="py-6 fade-in h-full text-white max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">
              EDGE DIAGNOSTICS &amp; CALIBRATION
            </span>
          </div>
          <h1 className="font-heading font-bold text-3xl tracking-wide text-white flex items-center gap-3">
            <Wrench className="w-7 h-7 text-blue-400" />
            Sensor Array Management
          </h1>
          <p className="text-sm text-white/50 tracking-wide mt-2">
            Local hardware abstraction layer for {selectedStation.toUpperCase()}. Detect drift, apply offsets, and route failovers.
          </p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-xl flex items-center gap-4 shadow-lg">
          <Activity className="w-6 h-6 text-orange-400" />
          <div>
            <p className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider">Edge Authority</p>
            <p className="text-xs text-white/70">Manual overrides will bypass physical probes.</p>
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-center py-12 text-white/40 font-mono text-sm animate-pulse">
          Fetching confidence data from backend...
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-mono">
          Backend unreachable ({error}) — showing last-known status.
        </div>
      )}

      {/* All-nominal banner */}
      {!loading && sensors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
          <CheckCircle className="w-10 h-10 text-emerald-500/50" />
          <p className="font-mono text-sm">All {totalSensors} sensors nominal — no degraded confidence detected.</p>
        </div>
      )}

      {/* Sensor Grid — only degraded sensors, same block style as before */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sensors.map(sensor => {
          const isSpike = spiking.has(sensor.id);
          return (
            <div
              key={sensor.id}
              className={`bg-white/5 backdrop-blur-xl border p-5 rounded-2xl shadow-lg relative overflow-hidden group transition-all duration-300 ${
                isSpike ? 'border-red-500/60' : 'border-white/10'
              }`}
            >
              {/* Status accent bar — top edge */}
              {sensor.status === 'DIVERTED' && (
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
              )}
              {sensor.status === 'FAILED' && (
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-60" />
              )}
              {sensor.status === 'DEGRADED' && (
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-40" />
              )}
              {isSpike && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
              )}

              {/* Card header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white/90 flex items-center gap-2">
                    {sensor.name}
                    {isSpike && <Zap className="w-4 h-4 text-red-400 animate-bounce" />}
                  </h3>
                  <p className="text-xs font-mono text-white/40 mt-1">ID: {sensor.id} • Type: {sensor.type}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold tracking-widest ${getStatusColor(sensor.status)}`}>
                  {sensor.status}
                </div>
              </div>

              {/* Reported Value / Raw / Last Ping — exact same layout as original */}
              <div className="grid grid-cols-3 gap-4 mb-5 bg-black/20 p-3 rounded-xl border border-white/5">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Reported Value</p>
                  <p className={`font-mono font-bold ${sensor.status === 'DIVERTED' || sensor.status === 'FAILED' ? 'text-red-400' : 'text-blue-300'}`}>
                    {sensor.value}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Raw Volt/Sig</p>
                  <p className="font-mono text-white/60">{sensor.raw}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Last Ping</p>
                  <p className="font-mono text-white/60">{sensor.lastPing}</p>
                </div>
              </div>

              {/* Confidence ratio bar */}
              {sensor.confidence_pct !== undefined && (
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Confidence Ratio</span>
                    <span className={`text-xs font-bold font-mono ${getConfidenceColor(sensor.confidence_pct)}`}>
                      {sensor.confidence_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getConfidenceBar(sensor.confidence_pct)}`}
                      style={{ width: `${sensor.confidence_pct}%` }}
                    />
                  </div>
                  {/* 5-component mini bars */}
                  {sensor.components && sensor.parameters_used && (
                    <div className="mt-3 space-y-1.5">
                      {(
                        [
                          ['weibull',    'Weibull'],
                          ['atmospheric','Atm. Model'],
                          ['crosscheck', 'Cross-Check'],
                          ['drift',      'Drift'],
                          ['spike',      'Spike'],
                        ] as const
                      ).map(([key, label]) => {
                        const score = sensor.components![key].score;
                        const isHurt = score < 1.0 && key === 'spike';
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono w-20 shrink-0 ${isHurt ? 'text-red-400' : 'text-white/30'}`}>{label}</span>
                            <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${score >= 0.80 ? 'bg-emerald-500' : score >= 0.55 ? 'bg-amber-500' : 'bg-orange-500'}`}
                                style={{ width: `${score * 100}%` }}
                              />
                            </div>
                            <span className={`text-[9px] font-mono w-8 text-right ${isHurt ? 'text-red-400 font-bold' : 'text-white/40'}`}>
                              {(score * 100).toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sudden-change applied — printed inline in the card */}
              {sensor.sudden_changes && sensor.sudden_changes.length > 0 && (
                <div className="mb-5 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5 space-y-2">
                  {sensor.sudden_changes.map((sc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-mono text-red-300 font-bold uppercase tracking-wider">
                          Sudden Change Applied
                        </p>
                        <p className="text-[10px] font-mono text-white/60 mt-0.5">{sc.description}</p>
                        <p className="text-[9px] font-mono text-red-400 mt-0.5">
                          Confidence penalised -{sc.confidence_penalty_pct.toFixed(0)}%
                          &nbsp;(delta {sc.delta.toFixed(1)} vs threshold ±{sc.threshold})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Diagnostic actions — identical to original */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/60 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  {sensor.status === 'DIVERTED'
                    ? 'Values severely deviate from atmospheric model (icing suspected).'
                    : sensor.status === 'FAILED'
                    ? 'Hardware fault detected — sensor offline.'
                    : 'Sensor health degraded — monitor closely.'}
                </p>

                {calibrating === sensor.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter override value..."
                      className="flex-1 bg-black/40 border border-blue-500/30 rounded-lg px-3 py-1.5 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                      value={offsetVal}
                      onChange={e => setOffsetVal(e.target.value)}
                    />
                    <button onClick={() => handleAction(sensor.id, 'OVERRIDE')} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors">
                      APPLY
                    </button>
                    <button onClick={() => setCalibrating(null)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors">
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAction(sensor.id, 'RESTART')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white/80 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Soft Restart
                    </button>
                    <button
                      onClick={() => setCalibrating(sensor.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs font-semibold text-blue-300 transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5" /> Override Value
                    </button>
                    {sensor.redundancy && (
                      <button
                        onClick={() => handleAction(sensor.id, 'FAILOVER')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs font-semibold text-emerald-400 transition-colors ml-auto"
                      >
                        <Radio className="w-3.5 h-3.5" /> Failover to Redundant
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
