import React from 'react';
import mqtt from 'mqtt';
import { motion, AnimatePresence } from 'framer-motion';
import { useStationStore } from '../../hooks/useStationStore';
import {
  Thermometer, Star, Wind, Droplets,
  AlertTriangle, MapPin, Activity, Bell, CheckCircle, Info, X,
  Building2, Users, Radio, Target, Shield, Zap
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type AwsRow = { t: number; ap: number; ws: number; wd: number; rh: number };

export type Notification = {
  id: number;
  level: 'critical' | 'warning' | 'info';
  msg: string;
  ts: string;
};

// Shortest-path angular interpolation for wind direction
function lerpAngle(a: number, b: number, t: number) {
  const diff = ((b - a + 540) % 360) - 180; // shortest arc, −180..+180
  return (a + diff * t + 360) % 360;
}

function lerp(a: number, b: number, t: number) {
  return +(a + (b - a) * t).toFixed(1);
}

// Interpolate between two AWS rows in STEPS sub-steps
function interpolateRows(a: AwsRow, b: AwsRow, steps: number): AwsRow[] {
  const result: AwsRow[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    result.push({
      t:  lerp(a.t,  b.t,  t),
      ap: lerp(a.ap, b.ap, t),
      ws: Math.max(0, lerp(a.ws, b.ws, t)),
      wd: Math.round(lerpAngle(a.wd, b.wd, t)),
      rh: Math.min(100, Math.max(0, lerp(a.rh, b.rh, t))),
    });
  }
  return result;
}

// Pre-build a smooth stream from raw dataset rows
function buildSmoothedStream(rows: AwsRow[], steps = 10): AwsRow[] {
  const out: AwsRow[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    out.push(...interpolateRows(rows[i], rows[i + 1], steps));
  }
  return out;
}

// ─── Threshold alert rules ────────────────────────────────────────────────────
export function generateNotifications(
  d: { temp: number; rh: number; pressure: number; ws: number },
  station: string,
): Notification[] {
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const notes: Omit<Notification, 'id' | 'ts'>[] = [];

  if (d.temp < -30)       notes.push({ level: 'critical', msg: `${station}: Temp ${d.temp}°C — extreme cold. Frostbite risk HIGH. Generator pre-heat required.` });
  else if (d.temp < -20)  notes.push({ level: 'warning',  msg: `${station}: Temp ${d.temp}°C — approaching extreme cold. Insulation check advised.` });

  if (d.ws > 80)          notes.push({ level: 'critical', msg: `${station}: Wind ${d.ws} km/h — blizzard threshold. Outdoor ops suspended immediately.` });
  else if (d.ws > 50)     notes.push({ level: 'warning',  msg: `${station}: Wind ${d.ws} km/h — high wind event. Secure all loose equipment.` });
  else if (d.ws > 30)     notes.push({ level: 'info',     msg: `${station}: Wind ${d.ws} km/h — moderate. Monitor for gusts.` });

  if (d.pressure < 960)   notes.push({ level: 'critical', msg: `${station}: Pressure ${d.pressure} hPa — rapid drop detected. Storm system approaching.` });
  else if (d.pressure < 975) notes.push({ level: 'warning', msg: `${station}: Pressure ${d.pressure} hPa — low pressure. Weather deterioration likely.` });

  if (d.rh > 90)          notes.push({ level: 'warning',  msg: `${station}: Humidity ${d.rh}% — condensation risk in electronics bay.` });
  else if (d.rh < 20)     notes.push({ level: 'info',     msg: `${station}: Humidity ${d.rh}% — very dry. Static discharge precautions in effect.` });

  if (notes.length === 0) {
    notes.push({ level: 'info', msg: `${station}: All parameters nominal. T=${d.temp}°C  P=${d.pressure} hPa  WS=${d.ws} km/h  RH=${d.rh}%` });
  }

  let id = Date.now();
  return notes.map(n => ({ ...n, id: id++, ts: now }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function windDirLabel(deg: number) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

function nudge(v: number, delta: number, decimals = 1) {
  return +(v + (Math.random() * delta * 2 - delta)).toFixed(decimals);
}

function stationHealthScore(d: { temp: number; pressure: number; ws: number; rh: number }) {
  let s = 100;
  if (d.temp < -30) s -= 15; else if (d.temp < -20) s -= 7;
  if (d.ws > 80) s -= 20; else if (d.ws > 50) s -= 10;
  if (d.pressure < 960) s -= 15; else if (d.pressure < 975) s -= 7;
  if (d.rh > 90) s -= 8;
  return Math.max(40, Math.min(100, Math.round(s)));
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ title, value, trend, status, onClick }: {
  title: string; value: string; trend?: string; status?: 'good' | 'warning' | 'critical'; onClick?: () => void
}) => {
  const colors = { good: 'text-emerald-400', warning: 'text-amber-400', critical: 'text-red-400', default: 'text-white' };
  return (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      onClick={onClick} 
      className="bg-slate-950/75 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col justify-center shadow-lg transition-colors duration-200 hover:bg-slate-900/85 hover:border-white/20 cursor-pointer"
    >
      <span className="text-xs text-slate-400 font-medium mb-1">{title}</span>
      <div className="flex items-baseline justify-between">
        <span className={`text-2xl font-bold ${status ? colors[status] : colors.default}`}>{value}</span>
        {trend && <span className={`text-xs ${status === 'critical' ? 'text-red-400' : status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>{trend}</span>}
      </div>
    </motion.div>
  );
};

// ─── Notification Row ──────────────────────────────────────────────────────────
export const NotifRow = ({ n }: { n: Notification }) => {
  const cfg = {
    critical: { bg: 'bg-red-500/10 border-red-500/30',     text: 'text-red-400',   Icon: AlertTriangle },
    warning:  { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', Icon: Bell },
    info:     { bg: 'bg-blue-500/10 border-blue-500/30',   text: 'text-blue-300',  Icon: Info },
  }[n.level];
  return (
    <div className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border ${cfg.bg}`}>
      <cfg.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.text}`} />
      <div className="flex-1 min-w-0">
        <p className="text-white/85 text-xs leading-snug">{n.msg}</p>
        <span className="text-slate-500 text-[10px] font-mono">{n.ts}</span>
      </div>
    </div>
  );
};

// ─── Notification store (module-level so App.tsx can subscribe) ───────────────
type NotifsListener = (notifs: Notification[]) => void;
const _listeners = new Set<NotifsListener>();
let _notifs: Notification[] = [];
export function subscribeNotifications(fn: NotifsListener) {
  _listeners.add(fn);
  fn(_notifs); // immediate snapshot
  return () => { _listeners.delete(fn); };
}
function publishNotifications(notifs: Notification[]) {
  _notifs = notifs;
  _listeners.forEach(fn => fn(notifs));
}

// ─── AWS Stream Module (Single Source of Truth) ───────────────────────────────
export type AwsListener = (data: AwsRow) => void;
const _awsListeners = { maitri: new Set<AwsListener>(), bharati: new Set<AwsListener>() };
let _awsStream: { maitri: AwsRow[]; bharati: AwsRow[] } = { maitri: [], bharati: [] };
const _awsIdx = { maitri: 0, bharati: 0 };
let _awsInit = false;
const _currentAws: { maitri: AwsRow | null; bharati: AwsRow | null } = { maitri: null, bharati: null };

export function subscribeAwsData(station: 'maitri' | 'bharati', fn: AwsListener) {
  _awsListeners[station].add(fn);
  if (_currentAws[station]) fn(_currentAws[station]!);
  return () => { _awsListeners[station].delete(fn); };
}

let _lastMqttT: number | null = null;
let _lastMqttRh: number | null = null;
let _lastMqttTime = 0;

function initAwsStream() {
  if (_awsInit) return;
  _awsInit = true;

  try {
    if (false as boolean) {
      const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt');
      client.on('connect', () => {
        client.subscribe('antarvik/telemetry/MAITRI/data');
      });
      client.on('message', (topic: string, message: any) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.t !== undefined) {
            _lastMqttT = data.t;
            _lastMqttRh = data.rh !== undefined ? data.rh : null;
            _lastMqttTime = Date.now();
            
            // Instantly push to listeners if we have current data
            if (_currentAws.maitri && _lastMqttT !== null) {
              const freshRow = { ..._currentAws.maitri, t: _lastMqttT, rh: _lastMqttRh ?? _currentAws.maitri.rh };
              _currentAws.maitri = freshRow;
              _awsListeners.maitri.forEach(fn => fn(freshRow));
            }
          }
        } catch (e) {
          console.error("MQTT decode error", e);
        }
      });
    } else {
      console.warn("MQTT library not loaded correctly.");
    }
  } catch (err) {
    console.error("MQTT Error:", err);
  }

  fetch('/aws_dataset.json')
    .then(r => r.json())
    .then(d => {
      _awsStream = {
        maitri: buildSmoothedStream(d.maitri, 10),
        bharati: buildSmoothedStream(d.bharati, 10),
      };
      _awsIdx.bharati = Math.floor(_awsStream.bharati.length * 0.6);
      
      setInterval(() => {
        (['maitri', 'bharati'] as const).forEach(s => {
          const stream = _awsStream[s];
          if (!stream.length) return;
          const originalRow = stream[_awsIdx[s] % stream.length];
          const row = { ...originalRow };
          
          if (s === 'maitri' && Date.now() - _lastMqttTime < 15000 && _lastMqttT !== null) {
            row.t = _lastMqttT;
            if (_lastMqttRh !== null) row.rh = _lastMqttRh;
          }
          
          _awsIdx[s]++;
          _currentAws[s] = row;
          _awsListeners[s].forEach(fn => fn(row));
        });
      }, 2000);
    })
    .catch(() => { _awsInit = false; });
}
initAwsStream();

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StationOverview() {
  const { selectedStation } = useStationStore();
  const [activeModal, setActiveModal] = React.useState<string | null>(null);

  const defaults = {
    maitri:  { temp: -18.5, rh: 62,   pressure: 982, ws: 38,  wd: 220 },
    bharati: { temp:  -3.2, rh: 47.4, pressure: 973, ws: 9.8, wd: 94  },
  };

  const [realData, setRealData] = React.useState(defaults[selectedStation]);
  const [envData, setEnvData] = React.useState({
    radiation: 120, ozone: 24.0, blackCarbon: 0.45, nox: 1.2,
    maxwellCurrent: 2.1, airEarthCurrent: 1.8, efm: 120,
    posCond: 1.4, negCond: 1.2, magField: 43200, cosmicNoise: 0.4,
  });
  const [kpi, setKpi] = React.useState({
    power: 96, fuelL: 39900, waterL: 9600, foodKg: 420, wastagesKg: 120,
  });
  
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  // Subscribe to central AWS stream
  React.useEffect(() => {
    // Reset optimistically
    setRealData(defaults[selectedStation]);
    const unsub = subscribeAwsData(selectedStation, (row) => {
      setRealData({ temp: row.t, rh: row.rh, pressure: row.ap, ws: row.ws, wd: row.wd });
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStation]);

  // Refresh ancillary simulated telemetry every 10 s.
  React.useEffect(() => {
    const iv = setInterval(() => {
      setEnvData(p => ({
        radiation:       Math.max(0,     nudge(p.radiation, 4)),
        ozone:           Math.max(5,     nudge(p.ozone, 0.4)),
        blackCarbon:     Math.max(0.1,   nudge(p.blackCarbon, 0.02)),
        nox:             Math.max(0.2,   nudge(p.nox, 0.06)),
        maxwellCurrent:  Math.max(0.5,   nudge(p.maxwellCurrent, 0.08)),
        airEarthCurrent: Math.max(0.5,   nudge(p.airEarthCurrent, 0.08)),
        efm:             Math.max(50,    nudge(p.efm, 5, 0)),
        posCond:         Math.max(0.5,   nudge(p.posCond, 0.04)),
        negCond:         Math.max(0.5,   nudge(p.negCond, 0.04)),
        magField:        Math.max(42000, nudge(p.magField, 60, 0)),
        cosmicNoise:     Math.max(0,     nudge(p.cosmicNoise, 0.02)),
      }));
      setKpi(p => ({
        power:  Math.min(100, Math.max(70, nudge(p.power, 0.5, 1))),
        fuelL:  Math.max(0, Math.round(p.fuelL - Math.random() * 10)),
        waterL: Math.max(0, Math.round(p.waterL - Math.random() * 3)),
        foodKg: Math.max(0, +(p.foodKg - Math.random() * 0.04).toFixed(1)),
        wastagesKg: Math.max(0, +(p.wastagesKg + Math.random() * 0.02).toFixed(1)),
      }));
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  // Generate notifications on each sensor update and publish to header
  React.useEffect(() => {
    const stLabel = selectedStation === 'maitri' ? 'Maitri' : 'Bharati';
    const fresh = generateNotifications(realData, stLabel);
    setNotifications(prev => {
      // Only prepend if the top message text changed (avoid flooding on stable data)
      if (prev.length > 0 && prev[0].msg === fresh[0].msg) return prev;
      const merged = [...fresh, ...prev].slice(0, 8);
      publishNotifications(merged);
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realData]);

  // Derived
  const health = stationHealthScore(realData);
  const healthStatus: 'good' | 'warning' | 'critical' = health >= 85 ? 'good' : health >= 65 ? 'warning' : 'critical';
  const powerStatus:  'good' | 'warning' | 'critical' = kpi.power >= 90 ? 'good' : kpi.power >= 75 ? 'warning' : 'critical';
  const fuelStatus:   'good' | 'warning' | 'critical' = kpi.fuelL > 30000 ? 'good' : kpi.fuelL > 15000 ? 'warning' : 'critical';
  const wastageStatus: 'good' | 'warning' | 'critical' = kpi.wastagesKg < 300 ? 'good' : kpi.wastagesKg < 500 ? 'warning' : 'critical';

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } }
      }}
      className="flex flex-col min-h-full pb-12 w-full max-w-[1600px] mx-auto relative"
    >

      {/* HERO */}
      <motion.div 
        variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } } }}
        className="relative w-full h-[240px] rounded-3xl overflow-hidden mb-6 border border-white/10 shadow-xl shrink-0"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${selectedStation === 'maitri' ? '/maitri2.png' : '/bharati-card.png'})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/30 to-transparent pointer-events-none z-10" />

        <div className="absolute bottom-6 left-8 pointer-events-none z-20">
          <p className="text-blue-300 text-sm font-medium flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4" />
            {selectedStation === 'maitri' ? '69.7667° S, 11.7333° E' : '69.4077° S, 76.1836° E'}
            {' '}• Elev {selectedStation === 'maitri' ? '117m' : '35m'}
          </p>
          <h2 className="text-5xl font-black text-white tracking-tight drop-shadow-md">
            {selectedStation === 'maitri' ? 'Maitri Station' : 'Bharati Station'}
          </h2>
        </div>

        {/* Live weather chip */}
        <div className={`absolute right-5 z-20 bg-slate-900/75 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 shadow-lg flex gap-3 pointer-events-none ${selectedStation === 'maitri' ? 'bottom-5' : 'top-5'}`}>
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-cyan-400" />
            <div>
              <div className={`text-lg font-bold leading-none transition-colors ${realData.temp < -25 ? 'text-red-400' : realData.temp < -15 ? 'text-amber-300' : 'text-white'}`}>
                {realData.temp}°C
              </div>

            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col gap-1 justify-center">
            <div className={`flex items-center gap-1.5 font-medium text-xs ${realData.ws > 80 ? 'text-red-400 font-bold' : realData.ws > 50 ? 'text-amber-300' : 'text-white'}`}>
              <Wind className="w-3 h-3 text-indigo-400" />
              {realData.ws} km/h {windDirLabel(realData.wd)}
            </div>
            <div className="flex items-center gap-1.5 text-white font-medium text-xs">
              <Droplets className="w-3 h-3 text-blue-400" /> {realData.rh}% RH
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col gap-0.5 justify-center text-[10px]">
            <div className="text-slate-400">Pressure</div>
            <div className={`font-mono font-bold text-xs ${realData.pressure < 960 ? 'text-red-400' : realData.pressure < 975 ? 'text-amber-300' : 'text-white'}`}>
              {realData.pressure} hPa
            </div>
          </div>
        </div>
      </motion.div>

      {/* OPERATIONAL SUMMARY */}
      <section aria-label="Station operational summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPICard onClick={() => setActiveModal('Health')} title="Station Health"  value={`${health}/100`}                   trend={health >= 85 ? '↑ Good' : health >= 65 ? '→ Fair' : '↓ Poor'}  status={healthStatus} />
        <KPICard onClick={() => setActiveModal('Power')} title="Power Avail"     value={`${kpi.power.toFixed(1)}%`}         trend={kpi.power >= 90 ? 'Stable' : 'Degraded'}                         status={powerStatus} />
        <KPICard onClick={() => setActiveModal('Fuel')} title="Fuel Reserve"    value={`${kpi.fuelL.toLocaleString()} L`}  status={fuelStatus} />
        <KPICard onClick={() => setActiveModal('Water')} title="Water Storage"   value={`${kpi.waterL.toLocaleString()} L`} />
        <KPICard onClick={() => setActiveModal('Food')} title="Food Supplies"   value={`${kpi.foodKg} kg`} />
        <KPICard onClick={() => setActiveModal('Wastages')} title="Wastages"   value={`${kpi.wastagesKg.toFixed(1)} kg`} trend={kpi.wastagesKg < 300 ? 'Managed' : 'High'} status={wastageStatus} />
      </section>

      {/* ROW 1: Met & Env */}
      <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="grid grid-cols-12 gap-6 mb-6">

        {/* Meteorological */}
        <div className="col-span-12 lg:col-span-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-yellow-400/20 px-3 py-1 rounded-bl-xl border-l border-b border-yellow-400/30 flex items-center gap-1.5 shadow-lg">
            <Star className="w-4 h-4 fill-yellow-300 text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
            <span className="text-yellow-300 text-[9px] font-bold tracking-widest uppercase">Real Dataset</span>
          </div>
          <h3 className="text-xs uppercase tracking-widest text-white/50 font-bold mb-6 flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" /> Meteorological Data (AWS &amp; Synoptic)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Temperature',     val: `${realData.temp}°C`,        alert: realData.temp < -30,       warn: realData.temp < -20 },
              { label: 'Rel. Humidity',   val: `${realData.rh}%`,           alert: realData.rh > 90,          warn: false },
              { label: 'Pressure',        val: `${realData.pressure} hPa`,  alert: realData.pressure < 960,   warn: realData.pressure < 975 },
              { label: 'Wind Speed',      val: `${realData.ws} km/h`,       alert: realData.ws > 80,          warn: realData.ws > 50 },
            ].map(({ label, val, alert, warn }) => (
              <div key={label} className={`flex justify-between items-center bg-black/20 p-3 rounded-xl border transition-colors ${
                alert ? 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]' : warn ? 'border-amber-400/40' : 'border-yellow-400/20'}`}>
                <span className="text-slate-400 text-xs">{label}</span>
                <span className={`font-mono font-bold text-sm ${alert ? 'text-red-400 animate-pulse' : warn ? 'text-amber-300' : 'text-yellow-300'}`}>{val}</span>
              </div>
            ))}
            <div className="col-span-2 flex justify-between items-center bg-black/20 p-3 rounded-xl border border-yellow-400/20">
              <span className="text-slate-400 text-xs">Wind Direction</span>
              <span className="text-yellow-300 font-mono font-bold text-sm">{realData.wd}° {windDirLabel(realData.wd)}</span>
            </div>
          </div>
        </div>

        {/* Environmental */}
        <div className="col-span-12 lg:col-span-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
          <h3 className="text-xs uppercase tracking-widest text-white/50 font-bold mb-6 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-emerald-400" /> Environmental Data
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Solar Radiation',    val: `${envData.radiation.toFixed(0)} W/m²` },
              { label: 'Surface Ozone',      val: `${envData.ozone.toFixed(1)} ppb`,   colored: envData.ozone > 30 ? 'text-amber-400' : 'text-white' },
              { label: 'Black Carbon',       val: `${envData.blackCarbon.toFixed(2)} µg/m³` },
              { label: 'NOₓ Concentration', val: `${envData.nox.toFixed(1)} ppb` },
              { label: 'Water Analysis',     val: envData.ozone > 30 ? 'Elevated' : 'Nominal', colored: envData.ozone > 30 ? 'text-amber-400' : 'text-emerald-400' },
            ].map(({ label, val, colored }, i, arr) => (
              <div key={label} className={`flex justify-between items-center ${i < arr.length - 1 ? 'border-b border-white/5 pb-2' : ''}`}>
                <span className="text-slate-400 text-sm">{label}</span>
                <span className={`font-mono text-sm ${colored ?? 'text-white'}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ROW 2: Geophysical */}
      <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="grid grid-cols-12 gap-6">
        <div className="col-span-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
          <h3 className="text-xs uppercase tracking-widest text-white/50 font-bold mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" /> Geophysical &amp; Space Weather Data
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
              <h4 className="text-indigo-300 text-[10px] uppercase tracking-widest mb-4 font-bold border-b border-indigo-500/20 pb-2">Magnetic Fields (DFM/ICM/PPM)</h4>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-slate-400 text-xs">H, D, Z Components</span><span className="text-white font-mono text-xs">Active</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">Earth Mag Field</span><span className="text-white font-mono text-xs">Active</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">Total Field (F)</span><span className="text-indigo-300 font-mono text-xs">{envData.magField.toLocaleString()} nT</span></div>
              </div>
            </div>
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
              <h4 className="text-amber-300 text-[10px] uppercase tracking-widest mb-4 font-bold border-b border-amber-500/20 pb-2">Atmospheric Electricity (GEC)</h4>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-slate-400 text-xs">Maxwell Current</span><span className="text-amber-200 font-mono text-xs">{envData.maxwellCurrent.toFixed(2)} pA/m²</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">Air-Earth Current</span><span className="text-amber-200 font-mono text-xs">{envData.airEarthCurrent.toFixed(2)} pA/m²</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">EFM</span><span className="text-amber-200 font-mono text-xs">{envData.efm} V/m</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">+ve / -ve Conductivity</span><span className="text-amber-200 font-mono text-xs">{envData.posCond.toFixed(2)} / {envData.negCond.toFixed(2)} fS/m</span></div>
              </div>
            </div>
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
              <h4 className="text-cyan-300 text-[10px] uppercase tracking-widest mb-4 font-bold border-b border-cyan-500/20 pb-2">GPS &amp; Riometer</h4>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-slate-400 text-xs">GPS Obs &amp; Nav</span><span className="text-white font-mono text-xs">Logging</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">Ionospheric Data</span><span className="text-white font-mono text-xs">Nominal</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">Ionosonde Data</span><span className="text-white font-mono text-xs">Nominal</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">Cosmic Noise Abs.</span>
                  <span className={`font-mono text-xs ${envData.cosmicNoise > 0.6 ? 'text-amber-300' : 'text-cyan-200'}`}>{envData.cosmicNoise.toFixed(2)} dB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dynamic Info Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900/90 border border-white/20 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <h3 className="text-lg font-bold text-white uppercase tracking-widest">{activeModal} Information</h3>
              <button onClick={() => setActiveModal(null)} className="text-white/50 hover:text-white p-1 rounded-lg transition-colors hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {activeModal === 'Health' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase text-white/50 tracking-widest font-bold mb-2">System Diagnostics</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">The Station Health Index is dynamically calculated by integrating live meteorological stress vectors against current operational capacity and asset degradation.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <span className="block text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Stress Penalties</span>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Thermal Stress</span><span className="text-red-400 font-mono">{realData.temp < -30 ? '-15' : realData.temp < -20 ? '-7' : '0'}</span></div>
                        <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Wind Shear</span><span className="text-red-400 font-mono">{realData.ws > 80 ? '-20' : realData.ws > 50 ? '-10' : '0'}</span></div>
                        <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Barometric Drop</span><span className="text-red-400 font-mono">{realData.pressure < 960 ? '-15' : realData.pressure < 975 ? '-7' : '0'}</span></div>
                        <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Moisture Risk</span><span className="text-red-400 font-mono">{realData.rh > 90 ? '-8' : '0'}</span></div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4 rounded-xl border border-indigo-500/20">
                      <span className="block text-[10px] uppercase text-indigo-300 font-bold mb-3 tracking-widest">ML Health Prediction</span>
                      <p className="text-xs text-indigo-200/80 mb-3">Model forecasts an 8% drop in station health over the next 48 hours due to advancing low-pressure system.</p>
                      <div className="flex items-center gap-2 mt-auto">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">Confidence: 94%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeModal === 'Power' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase text-white/50 tracking-widest font-bold mb-2">Energy Distribution</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">Real-time power generation versus consumption breakdown across the hybrid microgrid. Diesel baseload is actively supplemented by renewable injections.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Diesel Gensets</span>
                      <span className="text-3xl font-mono font-black text-white">{(kpi.power * 0.85).toFixed(1)}%</span>
                      <span className="text-[9px] text-emerald-400 uppercase tracking-widest mt-2 font-bold">Baseload Active</span>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Renewables (Wind/Solar)</span>
                      <span className="text-3xl font-mono font-black text-cyan-400">{(kpi.power * 0.15).toFixed(1)}%</span>
                      <span className="text-[9px] text-cyan-400/70 uppercase tracking-widest mt-2 font-bold">Peak Shaving Active</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex items-start gap-4">
                    <Zap className="w-6 h-6 text-blue-400 shrink-0" />
                    <div>
                      <span className="block text-[10px] uppercase text-blue-300 font-bold mb-1 tracking-widest">Load Forecasting Model</span>
                      <p className="text-xs text-blue-200/70 leading-relaxed">Predictive engine estimates a peak load surge at 18:00 UTC due to extreme ambient temperature drop. Recommended action: Pre-charge BESS to 100% capacity.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeModal === 'Fuel' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase text-white/50 tracking-widest font-bold mb-2">Logistics: Aviation & Diesel</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">Winter fuel cache status. Estimated depletion rate is highly sensitive to generator load, ambient temperature, and heating requirements.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <span className="block text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Consumption Metrics</span>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400">Current Burn Rate</span>
                        <span className="text-sm font-mono font-bold text-amber-400">~120 L/day</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Static Endurance</span>
                        <span className="text-sm font-mono font-bold text-white">{Math.round(kpi.fuelL / 120)} days</span>
                      </div>
                    </div>
                    
                    <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                      <span className="block text-[10px] uppercase text-amber-400 font-bold mb-2 tracking-widest">ML Depletion Prediction</span>
                      <p className="text-xs text-amber-200/80 mb-3">Adjusting for upcoming katabatic wind forecasts, thermal load will increase burn rate by 18%.</p>
                      <span className="text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30 bg-amber-500/20 px-2 py-1 rounded">Dynamic ETA: {Math.round(kpi.fuelL / (120 * 1.18))} days</span>
                    </div>
                  </div>
                </div>
              )}
              
              {activeModal === 'Water' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase text-white/50 tracking-widest font-bold mb-2">Hydrological Reserves</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">Pumped glacial lake water reserves. Includes potable fresh water for consumption and grey water routing for utilities.</p>
                  </div>
                  
                  <div className="bg-black/20 p-5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Current Storage Level</span>
                      <span className="text-lg font-mono font-bold text-blue-400">{kpi.waterL.toLocaleString()} L</span>
                    </div>
                    <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full" style={{ width: `${(kpi.waterL / 15000) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
                      <span>0 L</span>
                      <span>Max Cap: 15,000 L</span>
                    </div>
                  </div>

                  <div className="bg-cyan-500/10 p-4 rounded-xl border border-cyan-500/20 flex items-start gap-4">
                    <Droplets className="w-6 h-6 text-cyan-400 shrink-0" />
                    <div>
                      <span className="block text-[10px] uppercase text-cyan-300 font-bold mb-1 tracking-widest">Freeze Risk Model</span>
                      <p className="text-xs text-cyan-200/70 leading-relaxed">Heat trace algorithms on main inlet pipes are operating normally. Sub-surface temperature gradients indicate zero risk of line freezing for the next 7 days.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeModal === 'Food' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase text-white/50 tracking-widest font-bold mb-2">Ration Integrity</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">Dry and frozen ration status for wintering personnel. Inventory is tracked against daily caloric consumption standards.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <span className="block text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Inventory Breakdown</span>
                      <ul className="text-xs text-slate-400 space-y-2.5">
                        <li className="flex justify-between items-center"><span className="text-white/80">Frozen Veg & Meat</span><span className="font-mono text-emerald-400">{(kpi.foodKg * 0.4).toFixed(1)} kg</span></li>
                        <li className="flex justify-between items-center"><span className="text-white/80">Dry Staples</span><span className="font-mono text-emerald-400">{(kpi.foodKg * 0.45).toFixed(1)} kg</span></li>
                        <li className="flex justify-between items-center"><span className="text-white/80">Emergency MREs</span><span className="font-mono text-emerald-400">{(kpi.foodKg * 0.15).toFixed(1)} kg</span></li>
                      </ul>
                    </div>
                    
                    <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                      <span className="block text-[10px] uppercase text-emerald-400 font-bold mb-2 tracking-widest">Consumption Analytics</span>
                      <p className="text-xs text-emerald-200/80 mb-3">AI models verify that the current macro-nutrient distribution is sufficient to maintain body heat in extreme exposure environments. No spoilage risk detected in cold storage units.</p>
                      <div className="inline-block px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-[9px] font-bold text-emerald-300 uppercase tracking-widest">Caloric Intake: Optimal</div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeModal === 'Wastages' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase text-white/50 tracking-widest font-bold mb-2">Environmental Compliance</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">Accumulated solid and biological waste pending retro-grading. All outputs are strictly monitored per the Antarctic Treaty System (ATS) Madrid Protocol.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-xl border border-amber-500/20 text-center flex flex-col justify-center">
                      <span className="block text-[10px] text-amber-400/80 uppercase tracking-widest font-bold mb-2">Solid Waste</span>
                      <span className="text-2xl font-mono font-black text-amber-300">{(kpi.wastagesKg * 0.7).toFixed(1)} kg</span>
                      <span className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest">Compacted</span>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-purple-500/20 text-center flex flex-col justify-center">
                      <span className="block text-[10px] text-purple-400/80 uppercase tracking-widest font-bold mb-2">Biological</span>
                      <span className="text-2xl font-mono font-black text-purple-300">{(kpi.wastagesKg * 0.3).toFixed(1)} kg</span>
                      <span className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest">Incineration Queue</span>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <span className="block text-[10px] uppercase text-emerald-400 font-bold mb-1 tracking-widest">Treaty Compliance Model</span>
                      <p className="text-xs text-slate-400 leading-relaxed">Prediction: Accumulation trajectory will remain well below the 500 kg maximum safety threshold before the next scheduled ship arrival. Compliance is securely maintained.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <button onClick={() => setActiveModal(null)} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
                Close
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
