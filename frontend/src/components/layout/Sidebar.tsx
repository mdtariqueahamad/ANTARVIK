import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Building2,
  Package,
  Cloud,
  AlertTriangle,
  Box,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStationStore } from '../../hooks/useStationStore';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/energy', label: 'Energy', icon: Zap },
  { path: '/infrastructure', label: 'Infrastructure', icon: Building2 },
  { path: '/logistics', label: 'Logistics', icon: Package },
  { path: '/environment', label: 'Environment', icon: Cloud },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/3d', label: '3D View', icon: Box },
  { path: '/reports', label: 'Reports', icon: FileText },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useStationStore();

  return (
    <aside
      className={`${
        sidebarCollapsed ? 'w-16' : 'w-56'
      } bg-antarctic-panel border-r border-antarctic-border flex flex-col transition-all duration-300 ease-in-out relative`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-antarctic-panel border border-antarctic-border flex items-center justify-center hover:bg-antarctic-navy-light transition-colors z-10"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-400" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-ice/10 text-ice border border-ice/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-antarctic-navy-light border border-transparent'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-antarctic-border">
          <div className="text-xs text-gray-600">
            <p>ANTARVIK v1.0</p>
            <p className="mt-0.5">NCPOR · ISRO · SIH 2026</p>
          </div>
        </div>
      )}
    </aside>
  );
}
