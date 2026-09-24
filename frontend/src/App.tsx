import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HQDashboard from './components/dashboard/HQDashboard';
import StationOverview, { subscribeNotifications, NotifRow } from './components/dashboard/StationOverview';
import type { Notification } from './components/dashboard/StationOverview';
import DigitalTwinView from './components/dashboard/DigitalTwinView';
import Energy from './pages/Energy';
import Logistics from './pages/Logistics';
import Ships from './pages/Ships';
import IncidentCommand from './pages/IncidentCommand';
import SensorCalibration from './pages/SensorCalibration';
import ScenarioSimulator from './pages/ScenarioSimulator';
import Login from './pages/Login';
import { useStationStore } from './hooks/useStationStore';
import {
  Building2, Snowflake, Wind, LogOut, ChevronDown, Menu, Activity,
  AlertTriangle, Bell, CheckCircle, LayoutDashboard, X, Box, ShieldAlert, Cpu,
  Zap, Package, Anchor, FileText, Download
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import FloatingChatbot from './components/common/FloatingChatbot';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = !!sessionStorage.getItem('token');
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// ─── Gateway ──────────────────────────────────────────────────────────────────

// ─── AI Notifications Slide Panel ─────────────────────────────────────────────
const AINotificationsPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeNotifications(n => setNotifs([...n]));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const critCount = notifs.filter(n => n.level === 'critical').length;
  const warnCount = notifs.filter(n => n.level === 'warning').length;
  const infoCount = notifs.filter(n => n.level === 'info').length;
  const totalBadge = critCount + warnCount;

  return (
    <div
      ref={panelRef}
      className={`fixed top-0 left-0 h-full w-[420px] bg-slate-950/97 backdrop-blur-2xl border-r border-white/10 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30">
            <Bell className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold tracking-widest uppercase text-sm">AI Notifications</h2>
            <p className="text-slate-400 text-[10px] mt-0.5">Live threshold analysis feed</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/3 shrink-0 flex-wrap">
        {critCount > 0 && (
          <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 px-2.5 py-1 rounded-lg text-xs font-bold">
            <AlertTriangle className="w-3 h-3" /> {critCount} Critical
          </span>
        )}
        {warnCount > 0 && (
          <span className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-lg text-xs font-bold">
            <Bell className="w-3 h-3" /> {warnCount} Warning
          </span>
        )}
        {infoCount > 0 && (
          <span className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-lg text-xs font-bold">
            <Activity className="w-3 h-3" /> {infoCount} Info
          </span>
        )}
        {totalBadge === 0 && infoCount === 0 && (
          <span className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold">
            <CheckCircle className="w-3 h-3" /> All Clear
          </span>
        )}
        <span className="ml-auto text-slate-500 text-[10px] font-mono">{notifs.length} entries</span>
      </div>

      {/* All notifications */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {notifs.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-10">Waiting for sensor data…</div>
        ) : (
          notifs.map(n => <NotifRow key={n.id} n={n} />)
        )}
      </div>

      <div className="px-5 py-3 border-t border-white/10 bg-white/3 shrink-0">
        <span className="text-slate-600 text-[10px] font-mono">Auto-generated from live AWS thresholds • no AI inference</span>
      </div>
    </div>
  );
};

// ─── Critical Alerts Slide Panel ───────────────────────────────────────────────
const CriticalAlertsPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeNotifications(n => setNotifs([...n]));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  // Only truly critical alerts
  const criticals = notifs.filter(n => n.level === 'critical');

  return (
    <div
      ref={panelRef}
      className={`fixed top-0 left-0 h-full w-[420px] bg-slate-950/97 backdrop-blur-2xl border-r border-red-500/20 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-red-500/20 bg-red-500/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 p-2.5 rounded-xl border border-red-500/30 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-white font-bold tracking-widest uppercase text-sm">Critical Alerts</h2>
            <p className="text-red-400/70 text-[10px] mt-0.5">Extreme-threshold & predictive warnings only</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Count banner */}
      <div className="px-5 py-3 border-b border-red-500/20 bg-red-500/5 shrink-0">
        {criticals.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5" /> {criticals.length} Active Critical Alert{criticals.length > 1 ? 's' : ''}
            </span>
            <span className="text-slate-500 text-[10px] font-mono ml-auto">Immediate action required</span>
          </div>
        ) : (
          <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold">
            <CheckCircle className="w-3.5 h-3.5" /> No Critical Alerts — All Systems Nominal
          </span>
        )}
      </div>

      {/* Critical alerts list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {criticals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <CheckCircle className="w-14 h-14 text-emerald-500/40" />
            <p className="text-slate-500 text-sm text-center">No critical thresholds breached.<br />Station parameters within safe limits.</p>
          </div>
        ) : (
          criticals.map(n => <NotifRow key={n.id} n={n} />)
        )}
      </div>

      <div className="px-5 py-3 border-t border-red-500/20 bg-red-500/5 shrink-0">
        <span className="text-slate-600 text-[10px] font-mono">Filters: temp &lt; −30°C · wind &gt; 80 km/h · pressure &lt; 960 hPa</span>
      </div>
    </div>
  );
};

// ─── Sidebar nav item ──────────────────────────────────────────────────────────
type NavDef =
  | { kind: 'route'; path: string; label: string; Icon: React.ComponentType<{ className?: string }>; badge?: string }
  | { kind: 'action'; id: string; label: string; Icon: React.ComponentType<{ className?: string }> };

// ─── Main Layout ───────────────────────────────────────────────────────────────
const DashboardWrapper = () => {
  const location = useLocation();
  const isHQ = sessionStorage.getItem('activeNode') === 'NCPOR' && !location.search.includes('edge=1');
  return isHQ ? <HQDashboard /> : <StationOverview />;
};

const MainLayout = ({ children }: { children: JSX.Element }) => {
  const activeNode = sessionStorage.getItem('activeNode') || 'NCPOR';
  const { selectedStation, setStation, sidebarCollapsed, toggleSidebar } = useStationStore();
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [critPanelOpen, setCritPanelOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Live alert count for sidebar badge
  const [alertBadge, setAlertBadge] = useState(0);
  const [critBadge, setCritBadge] = useState(0);
  useEffect(() => {
    const unsub = subscribeNotifications(notifs => {
      const count = notifs.filter(n => n.level === 'critical' || n.level === 'warning').length;
      const crit = notifs.filter(n => n.level === 'critical').length;
      setAlertBadge(count);
      setCritBadge(crit);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeNode === 'MAITRI' && selectedStation !== 'maitri') setStation('maitri');
    else if (activeNode === 'BHARATI' && selectedStation !== 'bharati') setStation('bharati');
  }, [activeNode, selectedStation, setStation]);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('activeNode');
    window.location.href = '/login';
  };

  const NAV: NavDef[] = [
    { kind: 'route',  path: '/dashboard', label: activeNode === 'NCPOR' ? 'HQ Gateway' : 'Overview', Icon: activeNode === 'NCPOR' ? Building2 : LayoutDashboard },
    ...(activeNode === 'NCPOR' ? [{ kind: 'route', path: '/dashboard?edge=1', label: 'Station View', Icon: LayoutDashboard } as NavDef] : []),
    { kind: 'route',  path: '/twin',      label: '3D Twin',          Icon: Box },
    { kind: 'route',  path: '/energy',    label: 'Energy',           Icon: Zap },
    { kind: 'route',  path: '/logistics', label: 'Inventory',        Icon: Package },
    { kind: 'route',  path: '/ships',     label: 'Ship Tracking',    Icon: Anchor },
    { kind: 'route',  path: '/simulator', label: 'Simulator',        Icon: Activity },
    ...(activeNode === 'NCPOR' 
      ? [
          { kind: 'route',  path: '/incidents', label: 'Incident Command', Icon: ShieldAlert } as NavDef
        ]
      : [{ kind: 'route',  path: '/sensors',   label: 'Sensor Management', Icon: Cpu } as NavDef]
    ),
    { kind: 'action', id: 'ai-notifs',   label: 'AI Notifications', Icon: Bell },
    { kind: 'action', id: 'crit-alerts', label: 'Critical Alerts',  Icon: AlertTriangle },
  ];

  const handleNavClick = (item: NavDef) => {
    if (item.kind === 'route') {
      setAiPanelOpen(false);
      setCritPanelOpen(false);
      navigate(item.path);
    } else if (item.id === 'ai-notifs') {
      setCritPanelOpen(false);
      setAiPanelOpen(o => !o);
    } else if (item.id === 'crit-alerts') {
      setAiPanelOpen(false);
      setCritPanelOpen(o => !o);
    }
  };

  const isNavActive = (item: NavDef) => {
    if (item.kind === 'route') return location.pathname + location.search === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard' && location.search === '');
    if (item.id === 'ai-notifs') return aiPanelOpen;
    if (item.id === 'crit-alerts') return critPanelOpen;
    return false;
  };

  const getNavBadge = (item: NavDef) => {
    if (item.kind === 'action' && item.id === 'ai-notifs') return alertBadge > 0 ? String(alertBadge) : undefined;
    if (item.kind === 'action' && item.id === 'crit-alerts') return critBadge > 0 ? String(critBadge) : undefined;
    return undefined;
  };

  const getNavBadgeColor = (item: NavDef) => {
    if (item.kind === 'action' && item.id === 'crit-alerts') return 'bg-red-500/20 border-red-500/30 text-red-400';
    return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
  };

  const handleGenerateReport = () => {
    const date = new Date().toISOString().split('T')[0];
    const reportContent = `NCPOR HEADQUARTERS - CENTRAL COMMAND
COMPREHENSIVE STATION REPORT
Date: ${date}
Generated By: HQ Dashboard

=============================================
1. MAITRI STATION - EDGE NODE STATUS
=============================================
Health Index: 82/100 (Nominal)
Power: 92% Available | Fuel Reserve: ~38,000 L
Critical Alerts: 0
Weather Snapshot: Temp -18°C, Wind 38 km/h, Rel. Humidity 62%

ACTIVE INCIDENTS:
- INC-2026-0921: Generator 2 Thermal Runaway [UNACKNOWLEDGED]
  Analysis: Intake louver ice buildup restricting cooling airflow.
  Action: Engage pre-heater on Louver B; transition load to Gen 3.

=============================================
2. BHARATI STATION - EDGE NODE STATUS
=============================================
Health Index: 95/100 (Optimal)
Power: 98% Available | Fuel Reserve: ~29,500 L
Critical Alerts: 0
Weather Snapshot: Temp -3°C, Wind 9 km/h, Rel. Humidity 47%

ACTIVE INCIDENTS:
- INC-2026-0920: Primary Sat-Link Dropout [RESOLVED]
  Analysis: Extreme wind (110km/h) misaligned Radome Dish 1.

=============================================
3. LOGISTICS & SUPPLY CHAIN (IN TRANSIT)
=============================================
Vessel: SA Agulhas II (ETA: 14 Days to Maitri)
- Cargo: Aviation Turbine Fuel (120,000 L), Dry/Frozen Food (24 Tons)
Vessel: Vasiliy Golovnin (ETA: 22 Days to Bharati)
- Cargo: High-Speed Diesel (250,000 L), Medical Supplies (4 Tons)

=============================================
4. END OF REPORT
=============================================
Note: This data is consolidated from the digital twin sync pipelines.
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NCPOR_HQ_Report_${date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative isolate flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-200">
      <div
        aria-hidden="true"
        className="absolute -inset-3 z-0 scale-105 bg-cover bg-fixed bg-center blur-md"
        style={{ backgroundImage: "url('/background.png')" }}
      />
      <div className="absolute inset-0 z-0 bg-slate-950/70" />

      {/* Slide panels — rendered above sidebar */}
      <AINotificationsPanel open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
      <CriticalAlertsPanel  open={critPanelOpen} onClose={() => setCritPanelOpen(false)} />

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className={`${sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'} flex-shrink-0 flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl relative z-20 transition-all duration-300 ease-in-out`}>

        {/* Logo */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-5'} py-5 border-b border-white/10`}>
          <div className="bg-white/10 p-2 rounded-xl border border-white/20 shrink-0">
            <Snowflake className="w-5 h-5 text-blue-300" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-black tracking-widest text-white leading-none">ANTARVIK</h1>
              <p className="text-[10px] text-white/40 font-medium tracking-wider mt-0.5">Digital Twin Platform</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1 px-3 py-4 overflow-y-auto">
          {NAV.map((item) => {
            const active = isNavActive(item);
            const badge = getNavBadge(item);
            const badgeColor = getNavBadgeColor(item);
            const isCrit = item.kind === 'action' && item.id === 'crit-alerts';
            return (
              <button
                key={item.kind === 'route' ? item.path : item.id}
                onClick={() => handleNavClick(item)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full ${
                  active
                    ? isCrit
                      ? 'bg-red-500/20 border border-red-500/30 text-red-300 font-bold'
                      : 'bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold'
                    : isCrit
                      ? 'text-white/55 hover:bg-red-500/10 hover:text-red-300 font-medium border border-transparent'
                      : 'text-white/55 hover:bg-white/7 hover:text-white font-medium border border-transparent'
                }`}
              >
                <item.Icon className={`w-5 h-5 shrink-0 ${isCrit && critBadge > 0 ? 'text-red-400 animate-pulse' : ''}`} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-sm">{item.label}</span>
                    {badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-bold ${badgeColor}`}>
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="px-5 py-4 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Team Atrangi</p>
            <p className="text-xs text-white/40 mt-0.5">ANTARVIK v1.0 · SIH 2026</p>
          </div>
        )}
      </aside>

      {/* ── MAIN AREA ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">

        {/* ── TOP MENU BAR ────────────────────────────────────────────────────── */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-5 border-b border-white/10 bg-white/5 backdrop-blur-xl gap-4">

          {/* Left: burger + node badge + page title */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={toggleSidebar}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors border border-transparent hover:border-white/10">
              <Menu className="w-5 h-5" />
            </button>

            {/* Active node pill */}
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold text-white/80 gap-1.5">
              {activeNode === 'NCPOR'   && <><Building2 className="w-3.5 h-3.5 text-blue-300" /> HQ Command</>}
              {activeNode === 'MAITRI'  && <><Snowflake  className="w-3.5 h-3.5 text-cyan-300" /> Maitri Edge</>}
              {activeNode === 'BHARATI' && <><Wind       className="w-3.5 h-3.5 text-indigo-300" /> Bharati Edge</>}
            </div>

            {/* Breadcrumb page name */}
            <span className="hidden lg:block text-white/30 text-sm">/</span>
            <span className="hidden lg:block text-white/70 text-sm font-medium capitalize">
              {location.pathname.replace('/', '') || 'dashboard'}
            </span>
          </div>

          {/* Right: station selector + logout */}
          <div className="flex items-center gap-2 shrink-0">

            {/* HQ Generate Report Button */}
            {activeNode === 'NCPOR' && (
              <button
                onClick={handleGenerateReport}
                className="hidden md:flex items-center gap-2 px-3 py-2 mr-2 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50 transition-colors text-xs font-bold uppercase tracking-widest text-blue-300"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
            )}

            {/* Station selector */}
            <div className="relative">
              <button
                onClick={() => activeNode === 'NCPOR' && setShowStationDropdown(s => !s)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                  activeNode === 'NCPOR'
                    ? 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 cursor-pointer'
                    : 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className={`w-2 h-2 rounded-full animate-pulse ${selectedStation === 'maitri' ? 'bg-cyan-400' : 'bg-indigo-400'}`} />
                <span className="text-white">{selectedStation} Station</span>
                {activeNode === 'NCPOR' && <ChevronDown className="w-3.5 h-3.5 text-white/50" />}
              </button>

              {showStationDropdown && activeNode === 'NCPOR' && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50">
                  {([
                    { id: 'maitri',  label: 'Maitri Station',  Icon: Snowflake, color: 'text-cyan-400' },
                    { id: 'bharati', label: 'Bharati Station', Icon: Wind,      color: 'text-indigo-400' },
                  ] as const).map(({ id, label, Icon, color }) => (
                    <button
                      key={id}
                      onClick={() => { setStation(id); setShowStationDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors ${selectedStation === id ? 'bg-white/5' : ''}`}
                    >
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-white/90">{label}</span>
                      {selectedStation === id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto pt-6 px-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <FloatingChatbot />
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"   element={<Login />} />
        <Route path="/gateway" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<ProtectedRoute><MainLayout><DashboardWrapper /></MainLayout></ProtectedRoute>} />
        <Route path="/twin"      element={<ProtectedRoute><MainLayout><DigitalTwinView /></MainLayout></ProtectedRoute>} />
        <Route path="/energy"    element={<ProtectedRoute><MainLayout><Energy /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics" element={<ProtectedRoute><MainLayout><Logistics /></MainLayout></ProtectedRoute>} />
        <Route path="/ships"     element={<ProtectedRoute><MainLayout><Ships /></MainLayout></ProtectedRoute>} />
        <Route path="/simulator" element={<ProtectedRoute><MainLayout><ScenarioSimulator /></MainLayout></ProtectedRoute>} />
        <Route path="/sensors"   element={<ProtectedRoute><MainLayout><SensorCalibration /></MainLayout></ProtectedRoute>} />
        <Route path="/incidents" element={<ProtectedRoute><MainLayout><IncidentCommand /></MainLayout></ProtectedRoute>} />

        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
