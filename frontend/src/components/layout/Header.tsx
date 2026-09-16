import { useState } from 'react';
import { Bell, Zap, ChevronDown, User, LogOut, Settings } from 'lucide-react';
import { useStationStore } from '../../hooks/useStationStore';
import { useAuth } from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';
import ModeIndicator from '../common/ModeIndicator';
import { STATIONS } from '../../utils/constants';
import { StationId } from '../../types';

export default function Header() {
  const {
    selectedStation,
    setStation,
    operatingMode,
    lastSync,
    syncProgress,
    toggleFaultInjection,
  } = useStationStore();
  const { user, logout } = useAuth();
  const { criticalCount } = useAlerts({ stationId: selectedStation });
  const [stationDropdown, setStationDropdown] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const currentStation = STATIONS[selectedStation];

  return (
    <header className="h-14 bg-antarctic-panel border-b border-antarctic-border flex items-center justify-between px-4 z-40 relative">
      {/* Left: Logo + Station Selector */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ice to-aurora-green flex items-center justify-center">
            <span className="text-antarctic-navy font-bold text-sm">AT</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-ice tracking-wide">ANTARVIK</h1>
            <p className="text-[10px] text-gray-500 -mt-0.5">Digital Twin Platform</p>
          </div>
        </div>

        {/* Station Selector */}
        <div className="relative">
          <button
            onClick={() => setStationDropdown(!stationDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-antarctic-border bg-antarctic-navy hover:border-ice/30 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-aurora-green" />
            <span className="text-sm font-medium">{currentStation.name}</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {stationDropdown && (
            <div className="absolute top-full left-0 mt-1 w-52 panel shadow-lg z-50">
              {(Object.keys(STATIONS) as StationId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setStation(id);
                    setStationDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-antarctic-navy-light transition-colors first:rounded-t-xl last:rounded-b-xl ${
                    selectedStation === id ? 'bg-antarctic-navy-light' : ''
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedStation === id ? 'bg-aurora-green' : 'bg-gray-600'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{STATIONS[id].name}</p>
                    <p className="text-xs text-gray-500">
                      {STATIONS[id].lat.toFixed(2)}°S, {STATIONS[id].lon.toFixed(2)}°E
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Mode Indicator */}
      <div className="hidden md:flex items-center">
        <ModeIndicator
          mode={operatingMode}
          lastSync={lastSync}
          syncProgress={syncProgress}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Fault Injection */}
        <button
          onClick={toggleFaultInjection}
          className="p-2 rounded-lg border border-antarctic-border hover:bg-antarctic-navy-light hover:border-aurora-purple/30 transition-colors"
          title="Fault Injection"
        >
          <Zap className="w-4 h-4 text-aurora-purple" />
        </button>

        {/* Alerts Bell */}
        <button className="relative p-2 rounded-lg border border-antarctic-border hover:bg-antarctic-navy-light transition-colors">
          <Bell className="w-4 h-4 text-gray-400" />
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-severity-critical text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
              {criticalCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenu(!userMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-antarctic-border hover:bg-antarctic-navy-light transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-ice" />
            </div>
            <span className="hidden sm:block text-sm text-gray-300">
              {user?.username || 'Operator'}
            </span>
          </button>

          {userMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 panel shadow-lg z-50">
              <div className="px-3 py-2.5 border-b border-antarctic-border">
                <p className="text-sm font-medium">{user?.username || 'Operator'}</p>
                <p className="text-xs text-gray-500">{user?.role || 'admin'}</p>
              </div>
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-antarctic-navy-light transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-severity-critical hover:bg-antarctic-navy-light transition-colors rounded-b-xl"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
