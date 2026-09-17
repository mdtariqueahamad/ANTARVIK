import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Sliders, Thermometer, Wind, Eye, Zap, Fuel, Droplets, Package,
  Wifi, WifiOff, AlertTriangle, ArrowRight, RotateCcw, Play,
  Shield, Info, Clock, Radio, ChevronDown, ChevronUp, Flame, Loader2, Sparkles, Cpu
} from 'lucide-react';
import { useStationStore } from '../hooks/useStationStore';

// ============================================
// STUBS FOR MISSING LIB TYPES & FUNCTIONS
// ============================================
type StationId = 'bharati' | 'maitri';
type GeneratorStatus = 'RUNNING' | 'FAILED';
type WaterStatus = 'NORMAL' | 'DEGRADED' | 'FAILED';
type SpareAvailability = 'AVAILABLE' | 'LOW' | 'UNAVAILABLE';
type CommunicationStatus = 'ONLINE' | 'OFFLINE';
type HeatingMode = 'AUTO' | 'MANUAL';
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
type SyncPriority = 'P1' | 'P2' | 'P3' | 'P4';
type SyncItemStatus = 'PENDING' | 'SYNCING' | 'SYNCED';
type PresetScenario = 'NORMAL' | 'SEVERE_BLIZZARD' | 'EXTREME_COLD' | 'GENERATOR_2_FAILURE' | 'LOW_FUEL' | 'COMMUNICATION_OUTAGE' | 'COMPOUND_EMERGENCY';

interface ScenarioInputs {
  temperature: number; windSpeed: number; visibility: number;
  generator1Status: GeneratorStatus; generator2Status: GeneratorStatus; fuelReserve: number;
  heatingMode: HeatingMode; heatingDemand: number; waterStatus: WaterStatus;
  generatorSpare: SpareAvailability; heatingSpare: SpareAvailability; pumpWaterSpare: SpareAvailability;
  communicationStatus: CommunicationStatus;
}
interface EventLogEntry { id: string; timestamp: string; message: string; type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SYSTEM'; }
interface SyncQueueItem { id: string; priority: SyncPriority; label: string; description: string; status: SyncItemStatus; timestamp: string; }

const bharatiBaselineInputs: ScenarioInputs = {
  temperature: -15, windSpeed: 25, visibility: 100, generator1Status: 'RUNNING', generator2Status: 'RUNNING',
  fuelReserve: 85, heatingMode: 'AUTO', heatingDemand: 60, waterStatus: 'NORMAL',
  generatorSpare: 'AVAILABLE', heatingSpare: 'AVAILABLE', pumpWaterSpare: 'AVAILABLE', communicationStatus: 'ONLINE'
};
const maitriBaselineInputs: ScenarioInputs = { ...bharatiBaselineInputs, temperature: -20, windSpeed: 30 };

const presetKeys: PresetScenario[] = [
  'NORMAL', 'SEVERE_BLIZZARD', 'EXTREME_COLD', 'GENERATOR_2_FAILURE',
  'LOW_FUEL', 'COMMUNICATION_OUTAGE', 'COMPOUND_EMERGENCY'
];

const presetLabels: Record<PresetScenario, string> = {
  NORMAL: 'Normal Ops', SEVERE_BLIZZARD: 'Severe Blizzard', EXTREME_COLD: 'Extreme Cold',
  GENERATOR_2_FAILURE: 'Gen-2 Failure', LOW_FUEL: 'Low Fuel', COMMUNICATION_OUTAGE: 'Comms Outage',
  COMPOUND_EMERGENCY: 'Compound Emergency'
};

function getPresetScenario(preset: PresetScenario, baseline: ScenarioInputs): ScenarioInputs {
  const s = { ...baseline };
  switch (preset) {
    case 'SEVERE_BLIZZARD': s.windSpeed = 110; s.visibility = 5; s.temperature = -30; break;
    case 'EXTREME_COLD': s.temperature = -48; s.heatingDemand = 100; break;
    case 'GENERATOR_2_FAILURE': s.generator2Status = 'FAILED'; break;
    case 'LOW_FUEL': s.fuelReserve = 15; break;
    case 'COMMUNICATION_OUTAGE': s.communicationStatus = 'OFFLINE'; break;
    case 'COMPOUND_EMERGENCY': s.temperature = -45; s.windSpeed = 100; s.generator1Status = 'FAILED'; s.communicationStatus = 'OFFLINE'; break;
  }
  return s;
}

function calculateFullState(inputs: ScenarioInputs, stationId: StationId) {
  let riskScore = 10;
  if (inputs.temperature < -30) riskScore += 15;
  if (inputs.windSpeed > 80) riskScore += 20;
  if (inputs.generator1Status === 'FAILED') riskScore += 25;
  if (inputs.generator2Status === 'FAILED') riskScore += 25;
  if (inputs.fuelReserve < 30) riskScore += 20;
  if (inputs.communicationStatus === 'OFFLINE') riskScore += 10;
  const level: RiskLevel = riskScore > 75 ? 'CRITICAL' : riskScore > 50 ? 'HIGH' : riskScore > 25 ? 'MODERATE' : 'LOW';

  return {
    environment: { temperature: inputs.temperature, windSpeed: inputs.windSpeed, weatherSeverity: inputs.windSpeed > 70 ? 'SEVERE' : 'NOMINAL' },
    heating: { demandPercent: inputs.heatingMode === 'AUTO' ? (inputs.temperature < -20 ? 90 : 60) : inputs.heatingDemand },
    power: {
      generator1: { status: inputs.generator1Status, outputKW: inputs.generator1Status === 'RUNNING' ? 125 : 0 },
      generator2: { status: inputs.generator2Status, outputKW: inputs.generator2Status === 'RUNNING' ? 125 : 0 },
      installedCapacityKW: 250, totalGenerationKW: (inputs.generator1Status === 'RUNNING' ? 125 : 0) + (inputs.generator2Status === 'RUNNING' ? 125 : 0),
      currentDemandKW: 180, capacityHeadroomPercent: 20, hasRedundancy: inputs.generator1Status === 'RUNNING' && inputs.generator2Status === 'RUNNING'
    },
    fuel: { reservePercent: inputs.fuelReserve, consumptionLPerHr: 45, estimatedEnduranceDays: (inputs.fuelReserve / 100) * 180 },
    water: { status: inputs.waterStatus, vulnerabilityPercent: 10 },
    communication: { status: inputs.communicationStatus },
    risk: {
      overallScore: riskScore, level,
      breakdown: { power: riskScore * 0.4, weather: riskScore * 0.3, heating: riskScore * 0.2, fuel: riskScore * 0.1 },
      drivers: riskScore > 50 ? ['Critical systems stressed'] : ['Systems nominal'],
      recommendations: riskScore > 50 ? ['Reduce non-essential loads', 'Prepare emergency protocols'] : ['Maintain normal operations']
    },
    alerts: riskScore > 75 ? [{ severity: 'CRITICAL' }] : []
  };
}

const mockLiveState = calculateFullState(bharatiBaselineInputs, 'bharati');
const RiskBadge = ({ level }: { level: string }) => {
  const colors = level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                 level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                 level === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  return <span className={`border px-2 py-0.5 rounded font-bold text-xs ${colors}`}>{level} RISK</span>;
};
const SimulatedBadge = () => <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold animate-pulse">SIMULATED</span>;


// ============================================
// SLIDER COMPONENT
// ============================================
function SliderControl({
  label, value, min, max, step, unit, onChange, icon, isOverride
}: {
  label: string; value: number; min: number; max: number; step?: number; unit: string;
  onChange: (v: number) => void; icon?: React.ReactNode; isOverride?: boolean;
}) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[10px] text-white/50 uppercase font-semibold tracking-wide">{label}</span>
          {isOverride && (
            <span className="text-[8px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              OVERRIDE
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-bold text-white">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step || 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-400"
      />
      <div className="flex justify-between text-[9px] text-white/40 font-mono mt-0.5">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ============================================
// TOGGLE COMPONENT
// ============================================
function ToggleControl<T extends string>({
  label, value, options, onChange, isOverride
}: {
  label: string; value: T; options: { value: T; label: string; color?: string }[];
  onChange: (v: T) => void; isOverride?: boolean;
}) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-white/50 uppercase font-semibold tracking-wide">{label}</p>
        {isOverride && (
          <span className="text-[8px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
            MANUAL
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 text-[10px] font-mono rounded-md border transition-all ${
              value === opt.value
                ? opt.color === 'red' ? 'bg-red-500/15 border-red-500/50 text-red-400 font-bold'
                : opt.color === 'yellow' ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 font-bold'
                : 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold shadow-sm'
                : 'bg-white/5 border-white/10 text-white/50 hover:border-blue-400/50 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// COMPARISON ROW
// ============================================
function CompareRow({
  label, liveVal, projVal, unit
}: {
  label: string; liveVal: string | number; projVal: string | number; unit?: string;
}) {
  const changed = String(liveVal) !== String(projVal);
  return (
    <div className={`grid grid-cols-3 py-2 px-2.5 text-xs border-b border-white/10 transition-colors ${changed ? 'bg-blue-500/5' : ''}`}>
      <span className="text-white/60 font-medium">{label}</span>
      <span className="font-mono text-center text-white/80">{liveVal}{unit || ''}</span>
      <span className={`font-mono text-center font-semibold ${changed ? 'text-blue-400' : 'text-white'}`}>
        {projVal}{unit || ''}
        {changed && <span className="ml-1 text-[9px] text-blue-400">●</span>}
      </span>
    </div>
  );
}

// ============================================
// MAIN SIMULATOR COMPONENT
// ============================================
export default function ScenarioSimulator() {
  const { selectedStation } = useStationStore();
  const [controlMode, setControlMode] = useState<'AUTO' | 'MANUAL'>('AUTO');

  const getBaseline = useCallback((sid: StationId | string) => sid === 'bharati' ? bharatiBaselineInputs : maitriBaselineInputs, []);

  const [scenarioInputs, setScenarioInputs] = useState<ScenarioInputs>({ ...getBaseline(selectedStation) });
  const [activePreset, setActivePreset] = useState<PresetScenario | null>('NORMAL');

  const [eventLog, setEventLog] = useState<EventLogEntry[]>([
    { id: '0', timestamp: new Date().toISOString(), message: 'What-If deterministic simulation engine initialized', type: 'SYSTEM' },
  ]);

  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const addEvent = useCallback((message: string, type: EventLogEntry['type'] = 'INFO') => {
    setEventLog(prev => [{
      id: String(Date.now()) + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(), message, type,
    }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    setScenarioInputs({ ...getBaseline(selectedStation) });
    setActivePreset('NORMAL');
    setSyncQueue([]);
    setIsRestoring(false);
    setIsSyncing(false);
    addEvent(`Simulation synchronized with active station: ${selectedStation.toUpperCase()}`, 'SYSTEM');
  }, [selectedStation, getBaseline, addEvent]);

  const projectedState = useMemo(() => calculateFullState(scenarioInputs, selectedStation as StationId), [scenarioInputs, selectedStation]);
  const liveState = mockLiveState;

  useEffect(() => {
    if (scenarioInputs.communicationStatus === 'OFFLINE') {
      const items: SyncQueueItem[] = [];
      const ts = new Date().toISOString();
      if (projectedState.alerts.some((a: any) => a.severity === 'CRITICAL') || scenarioInputs.generator1Status === 'FAILED' || scenarioInputs.generator2Status === 'FAILED') {
        items.push({ id: 'p1-1', priority: 'P1', label: 'CRITICAL — Safety & Power Telemetry', description: 'Generator failure states & critical risk transitions', status: 'PENDING', timestamp: ts });
      }
      items.push({ id: 'p2-1', priority: 'P2', label: 'HIGH — State Transitions', description: 'Thermal loop & load balance deviations', status: 'PENDING', timestamp: ts });
      items.push({ id: 'p3-1', priority: 'P3', label: 'NORMAL — Aggregated Telemetry', description: 'Subsystem sensor averages & fuel burn log', status: 'PENDING', timestamp: ts });
      items.push({ id: 'p4-1', priority: 'P4', label: 'BULK — Meteorological Archives', description: 'Sub-minute polar wind and barometric logs', status: 'PENDING', timestamp: ts });
      setSyncQueue(items);
    } else if (!isSyncing && !isRestoring) {
      setSyncQueue([]);
    }
  }, [scenarioInputs.communicationStatus, projectedState.alerts, scenarioInputs.generator1Status, scenarioInputs.generator2Status, isSyncing, isRestoring]);

  const updateInput = useCallback(<K extends keyof ScenarioInputs>(key: K, value: ScenarioInputs[K]) => {
    setActivePreset(null);
    setScenarioInputs(prev => ({ ...prev, [key]: value }));
    if (key === 'generator1Status' || key === 'generator2Status') {
      const gen = key === 'generator1Status' ? '1' : '2';
      addEvent(`Generator ${gen} switched to ${value === 'FAILED' ? 'FAILED' : 'RUNNING'}`, value === 'FAILED' ? 'CRITICAL' : 'INFO');
    }
    if (key === 'temperature') addEvent(`Ambient temperature modified to ${value}°C — recalculating heating & fuel demand`, 'INFO');
    if (key === 'communicationStatus') addEvent(value === 'OFFLINE' ? 'Carrier lost — local edge twin active' : 'Carrier restored', value === 'OFFLINE' ? 'WARNING' : 'SYSTEM');
  }, [addEvent]);

  const applyPreset = useCallback((preset: PresetScenario) => {
    const baseline = getBaseline(selectedStation);
    const newInputs = getPresetScenario(preset, baseline);
    setScenarioInputs(newInputs);
    setActivePreset(preset);
    addEvent(`Applied preset: ${presetLabels[preset]}`, 'SYSTEM');
  }, [selectedStation, getBaseline, addEvent]);

  const resetScenario = useCallback(() => {
    const baseline = getBaseline(selectedStation);
    setScenarioInputs({ ...baseline });
    setActivePreset('NORMAL');
    setSyncQueue([]);
    setIsRestoring(false);
    setIsSyncing(false);
    addEvent(`Simulation reset to baseline ${selectedStation.toUpperCase()}`, 'SYSTEM');
  }, [selectedStation, getBaseline, addEvent]);

  const restoreConnection = useCallback(async () => {
    if (isRestoring || isSyncing) return;
    setIsRestoring(true);
    addEvent('Reconnection handshake initiated with mainland NCPOR Goa gateway...', 'SYSTEM');
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsRestoring(false);
    setIsSyncing(true);
    updateInput('communicationStatus', 'ONLINE');
    addEvent('Carrier locked. Beginning priority-driven delta synchronization (P1 → P4)...', 'SYSTEM');
    for (let i = 0; i < syncQueue.length; i++) {
      setSyncQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'SYNCING' as SyncItemStatus } : item));
      addEvent(`Syncing ${syncQueue[i].priority}: ${syncQueue[i].label}`, 'INFO');
      await new Promise(r => setTimeout(r, 700));
      setSyncQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'SYNCED' as SyncItemStatus } : item));
      await new Promise(r => setTimeout(r, 400));
    }
    addEvent('✓ All priority packets synchronized. Mainland NCPOR state refreshed.', 'SYSTEM');
    setIsSyncing(false);
  }, [isRestoring, isSyncing, syncQueue, updateInput, addEvent]);

  const isOffline = scenarioInputs.communicationStatus === 'OFFLINE';
  const digitalTwinStatusText = isRestoring ? 'RECONNECTING • SATELLITE HANDSHAKE'
    : isSyncing ? 'SYNCING • PRIORITY QUEUE'
    : isOffline ? 'ACTIVE • OFFLINE EDGE' : 'ACTIVE • SYNCHRONIZED';

  return (
    <div className="py-6 fade-in h-full text-white">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">
              PREDICTIVE DIGITAL TWIN SCENARIO LABORATORY
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl tracking-wide text-white">
            SCENARIO SIMULATOR
          </h1>
          <p className="text-xs text-white/50 tracking-wide">
            Cross-domain dependency propagation • Deterministic physics engine • Offline edge continuity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 shadow-sm">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-mono text-blue-400 font-bold">SIMULATION MODE</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 shadow-sm">
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE STATE UNCHANGED</span>
          </div>
        </div>
      </div>

      {/* Station Selector & Auto/Manual Mode Bar */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 mb-5 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-heading font-bold text-white/50 uppercase mr-1">ACTIVE STATION:</span>
          <span className="px-4 py-2 text-xs font-heading font-bold rounded-lg border bg-blue-500/20 border-blue-500/50 text-white shadow-sm tracking-wider">
            {selectedStation.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
          <span className="text-[10px] font-heading font-bold text-white/50 uppercase px-2">MODE:</span>
          <button
            onClick={() => { setControlMode('AUTO'); addEvent('Switched to AUTO MODE — derived variables calculate automatically', 'SYSTEM'); }}
            className={`px-3 py-1.5 text-xs font-mono rounded-md font-bold transition-all ${
              controlMode === 'AUTO'
                ? 'bg-white/10 text-white shadow-sm border border-white/20'
                : 'text-white/50 hover:text-white'
            }`}
          >
            ⚡ AUTO (DERIVED)
          </button>
          <button
            onClick={() => { setControlMode('MANUAL'); addEvent('Switched to MANUAL MODE — direct override controls enabled', 'SYSTEM'); }}
            className={`px-3 py-1.5 text-xs font-mono rounded-md font-bold transition-all ${
              controlMode === 'MANUAL'
                ? 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/30'
                : 'text-white/50 hover:text-white'
            }`}
          >
            ⚙️ MANUAL OVERRIDE
          </button>
        </div>

        <button
          onClick={resetScenario}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> RESET SCENARIO
        </button>
      </div>

      {/* Offline Alert Banner */}
      {(isOffline || isRestoring || isSyncing) && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {isRestoring ? <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                : isSyncing ? <Radio className="w-6 h-6 text-blue-400 animate-pulse" />
                : <WifiOff className="w-6 h-6 text-red-400" />}
              <div>
                <p className="text-sm font-heading font-bold text-red-400 flex items-center gap-2">
                  {isRestoring ? 'RESTORING CONNECTION...' : isSyncing ? 'DELTA SYNCHRONIZATION IN PROGRESS' : 'COMMUNICATION LOST — EDGE PROCESSING ACTIVE'}
                  <span className="text-[10px] font-mono bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-normal">
                    {digitalTwinStatusText}
                  </span>
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  {isRestoring ? 'Transceiver acquiring carrier lock with NCPOR Goa mainland gateway (3 second delay)...'
                    : isSyncing ? 'Streaming prioritized buffered telemetry (P1 → P4) to mainland repository...'
                    : 'Local station Digital Twin running autonomously on edge hardware. Telemetry buffered in priority queue.'}
                </p>
              </div>
            </div>
            <button
              onClick={restoreConnection} disabled={isRestoring || isSyncing}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-bold rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all disabled:opacity-60 shadow-sm"
            >
              {isRestoring ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>RESTORING...</span></>
                : isSyncing ? <><Radio className="w-3.5 h-3.5 animate-pulse" /><span>SYNCING...</span></>
                : <><Wifi className="w-3.5 h-3.5" /><span>RESTORE CONNECTION</span></>}
            </button>
          </div>
        </div>
      )}

      {/* Preset Scenario Selector */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 mb-5 shadow-sm">
        <p className="text-[10px] text-white/50 uppercase font-semibold tracking-wider mb-2.5">STANDARD POLAR SCENARIO PRESETS</p>
        <div className="flex flex-wrap gap-2">
          {presetKeys.map(p => (
            <button
              key={p} onClick={() => applyPreset(p)}
              className={`px-3.5 py-2 text-xs font-mono rounded-lg border transition-all ${
                activePreset === p
                  ? p === 'COMPOUND_EMERGENCY'
                    ? 'bg-red-500/15 border-red-500/50 text-red-400 font-bold shadow-sm'
                    : 'bg-blue-500/15 border-blue-500/40 text-blue-300 font-bold shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-blue-400/30 hover:text-white'
              }`}
            >
              {presetLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <div>
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-white">SCENARIO CONTROLS ({controlMode})</h3>
              </div>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${controlMode === 'AUTO' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>
                {controlMode}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-cyan-400 font-heading font-bold uppercase tracking-wider mt-2 mb-1.5 border-b border-cyan-400/30 pb-1">WEATHER PARAMETERS</p>
              <SliderControl label="Ambient Temperature" value={scenarioInputs.temperature} min={-50} max={-10} unit="°C" onChange={v => updateInput('temperature', v)} icon={<Thermometer className="w-3.5 h-3.5 text-cyan-300" />} />
              <SliderControl label="Wind Speed" value={scenarioInputs.windSpeed} min={0} max={120} unit=" km/h" onChange={v => updateInput('windSpeed', v)} icon={<Wind className="w-3.5 h-3.5 text-cyan-400" />} />
              
              <p className="text-[10px] text-cyan-400 font-heading font-bold uppercase tracking-wider mt-4 mb-1.5 border-b border-cyan-400/30 pb-1">GENERATORS</p>
              <ToggleControl label="Generator 1" value={scenarioInputs.generator1Status} options={[{ value: 'RUNNING', label: 'RUNNING' }, { value: 'FAILED', label: 'FAILED', color: 'red' }]} onChange={v => updateInput('generator1Status', v)} />
              <ToggleControl label="Generator 2" value={scenarioInputs.generator2Status} options={[{ value: 'RUNNING', label: 'RUNNING' }, { value: 'FAILED', label: 'FAILED', color: 'red' }]} onChange={v => updateInput('generator2Status', v)} />

              <p className="text-[10px] text-cyan-400 font-heading font-bold uppercase tracking-wider mt-4 mb-1.5 border-b border-cyan-400/30 pb-1">FUEL RESERVES</p>
              <SliderControl label="Fuel Reserve" value={scenarioInputs.fuelReserve} min={0} max={100} unit="%" onChange={v => updateInput('fuelReserve', v)} icon={<Fuel className="w-3.5 h-3.5 text-amber-400" />} />

              {controlMode === 'MANUAL' && (
                <div className="mt-4 pt-3 border-t-2 border-dashed border-blue-500/30 space-y-3 bg-blue-500/5 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1"><Sparkles className="w-3.5 h-3.5 text-blue-400" /><span className="text-[10px] font-heading font-bold text-blue-400 uppercase">MANUAL OVERRIDES</span></div>
                  <ToggleControl label="Thermal Mode" value={scenarioInputs.heatingMode} options={[{ value: 'AUTO', label: 'AUTO' }, { value: 'MANUAL', label: 'MANUAL' }]} onChange={v => updateInput('heatingMode', v)} isOverride />
                  <ToggleControl label="Satellite Link" value={scenarioInputs.communicationStatus} options={[{ value: 'ONLINE', label: 'ONLINE' }, { value: 'OFFLINE', label: 'OFFLINE', color: 'red' }]} onChange={v => updateInput('communicationStatus', v)} isOverride />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 shadow-sm">
            <h3 className="font-heading font-bold text-xs tracking-wide mb-2.5 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-cyan-400" /> SIMULATION PROPAGATION LOG</h3>
            <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
              {eventLog.map(e => (
                <div key={e.id} className={`flex items-start gap-2 py-1.5 px-2 rounded text-[10px] ${e.type === 'CRITICAL' ? 'bg-red-500/10 text-red-400' : e.type === 'WARNING' ? 'bg-amber-500/10 text-amber-400' : e.type === 'SYSTEM' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'bg-white/5 text-white/80'}`}>
                  <span className="font-mono text-white/40 whitespace-nowrap text-[9px]">{new Date(e.timestamp).toLocaleTimeString()}</span>
                  <span className="leading-snug">{e.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h3 className="font-heading font-bold text-sm tracking-wide text-white flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /> PROJECTED RISK ANALYSIS</h3>
              <SimulatedBadge />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div className="text-center bg-white/5 rounded-xl p-5 border border-white/10 flex flex-col justify-center items-center">
                <p className="text-[10px] text-white/50 uppercase font-semibold mb-1">PROJECTED RISK</p>
                <p className={`text-4xl font-mono font-bold my-1 ${projectedState.risk.level === 'CRITICAL' ? 'text-red-400 risk-pulse' : projectedState.risk.level === 'HIGH' ? 'text-red-400' : projectedState.risk.level === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {projectedState.risk.overallScore.toFixed(1)}%
                </p>
                <div className="mt-1"><RiskBadge level={projectedState.risk.level} /></div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[10px] text-white/50 uppercase font-semibold mb-2">DOMAIN RISK</p>
                {Object.entries(projectedState.risk.breakdown).map(([key, val]) => (
                  <div key={key} className="mb-2">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-white/60 uppercase font-mono">{key}</span>
                      <span className="font-mono font-semibold">{val.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${val > 20 ? 'bg-red-500' : val > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, val * 3)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-white/50 uppercase font-semibold mb-2">CRITICAL RISK DRIVERS</p>
                  <div className="space-y-1.5">
                    {projectedState.risk.drivers.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" /><span className="text-[11px] text-white leading-tight">{d}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wide flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-blue-400" /> LIVE vs PROJECTED STATE</h3>
              <span className="text-[9px] font-mono text-white/50">Highlighted rows indicate divergence</span>
            </div>
            <div className="grid grid-cols-3 py-2 px-2.5 text-[10px] font-heading font-bold text-white/50 border-b-2 border-white/10 uppercase">
              <span>PARAMETER</span><span className="text-center">LIVE BASELINE</span><span className="text-center text-blue-400">PROJECTED</span>
            </div>
            <div className="divide-y divide-white/10">
              <CompareRow label="Ambient Temp" liveVal={liveState.environment.temperature} projVal={projectedState.environment.temperature} unit="°C" />
              <CompareRow label="Wind Speed" liveVal={liveState.environment.windSpeed} projVal={projectedState.environment.windSpeed} unit=" km/h" />
              <CompareRow label="Gen 1 Status" liveVal={liveState.power.generator1.status} projVal={projectedState.power.generator1.status} />
              <CompareRow label="Gen 2 Status" liveVal={liveState.power.generator2.status} projVal={projectedState.power.generator2.status} />
              <CompareRow label="Fuel Reserve" liveVal={liveState.fuel.reservePercent} projVal={projectedState.fuel.reservePercent} unit="%" />
              <CompareRow label="Comms Link" liveVal={liveState.communication.status} projVal={projectedState.communication.status} />
            </div>
          </div>

          {(isOffline || syncQueue.length > 0) && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide flex items-center gap-2"><Radio className="w-3.5 h-3.5 text-cyan-400" /> OFFLINE PRIORITY BUFFER QUEUE</h3>
              </div>
              <div className="space-y-2">
                {syncQueue.map(item => (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${item.status === 'SYNCED' ? 'bg-emerald-500/10 border-emerald-500/30' : item.status === 'SYNCING' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${item.priority === 'P1' ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-white/50'}`}>{item.priority}</span>
                      <div><p className="text-xs font-semibold text-white">{item.label}</p></div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${item.status === 'SYNCED' ? 'text-emerald-400' : item.status === 'SYNCING' ? 'text-blue-400' : 'text-white/50'}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
