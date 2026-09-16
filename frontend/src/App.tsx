import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import StationOverview from './components/dashboard/StationOverview';
import DigitalTwinView from './components/dashboard/DigitalTwinView';
import { PredictionsView, AlertsView } from './components/dashboard/PlaceholderViews';
import Login from './pages/Login';
import { useStationStore } from './hooks/useStationStore';
import { Building2, Snowflake, Wind, LogOut, ChevronDown, Menu, Activity, Shield, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import FloatingChatbot from './components/common/FloatingChatbot';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = !!sessionStorage.getItem('token');
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Gateway Page
const GatewayPage = () => {
  const { setStation } = useStationStore();
  const navigate = useNavigate();

  const handleSelect = (station: 'maitri' | 'bharati') => {
    setStation(station);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center p-6 relative" style={{ backgroundImage: "url('/background.png')" }}>
      <div className="absolute inset-0 bg-slate-900/40 z-0"></div>
      <div className="relative z-10 text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-white/5 backdrop-blur-md rounded-full mb-4 border border-white/10 shadow-lg">
          <Building2 className="w-6 h-6 text-blue-300" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-widest mb-2 drop-shadow-md">NCPOR CENTRAL COMMAND</h1>
        <p className="text-white/70 text-xs tracking-wide">Select a target research station to monitor</p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
        <button onClick={() => handleSelect('maitri')} className="group flex flex-col items-center p-8 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl hover:-translate-y-1 hover:bg-white/10 hover:border-white/30 transition-all shadow-lg overflow-hidden relative">
          <div className="w-full h-32 mb-6 relative rounded-xl overflow-hidden border border-white/10 shadow-inner">
             <img src="/maitri.jpeg" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Maitri" />
             <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-full p-2 border border-white/20 text-cyan-300">
               <Snowflake className="w-5 h-5" />
             </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Maitri Station</h2>
        </button>

        <button onClick={() => handleSelect('bharati')} className="group flex flex-col items-center p-8 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl hover:-translate-y-1 hover:bg-white/10 hover:border-white/30 transition-all shadow-lg overflow-hidden relative">
          <div className="w-full h-32 mb-6 relative rounded-xl overflow-hidden border border-white/10 shadow-inner">
             <img src="/bharati.jpeg" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Bharati" />
             <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-full p-2 border border-white/20 text-indigo-300">
               <Wind className="w-5 h-5" />
             </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Bharati Station</h2>
        </button>
      </div>
    </div>
  );
};

// Main Layout with Sliding Sidebar
const MainLayout = ({ children }: { children: JSX.Element }) => {
  const activeNode = sessionStorage.getItem('activeNode') || 'NCPOR';
  const { selectedStation, setStation, sidebarCollapsed, toggleSidebar } = useStationStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeNode === 'MAITRI' && selectedStation !== 'maitri') setStation('maitri');
    else if (activeNode === 'BHARATI' && selectedStation !== 'bharati') setStation('bharati');
  }, [activeNode, selectedStation, setStation]);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('activeNode');
    window.location.href = '/login';
  };

  const NavItem = ({ path, icon: Icon, label, badge }: any) => {
    const isActive = location.pathname === path;
    return (
      <button 
        onClick={() => navigate(path)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap overflow-hidden ${
          isActive 
            ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold' 
            : 'text-white/60 hover:bg-white/5 hover:text-white font-medium border border-transparent'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" /> 
        <span className={`transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 flex-1 text-left'}`}>{label}</span>
        {!sidebarCollapsed && badge && (
          <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full border border-red-500/20 shrink-0">{badge}</span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-cover bg-fixed bg-center font-sans text-slate-200"
         style={{ backgroundImage: "url('/background.png')" }}>
      
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* SLIDING SIDEBAR */}
      <aside className={`${sidebarCollapsed ? 'w-[80px]' : 'w-[260px]'} flex-shrink-0 flex flex-col justify-between border-r border-white/10 bg-white/5 backdrop-blur-xl relative z-20 transition-all duration-300 ease-in-out`}>
        <div className="p-4 flex flex-col h-full">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} mb-10 h-10`}>
            <div className="bg-white/10 p-2 rounded-lg border border-white/20 shrink-0">
              <Snowflake className="w-5 h-5 text-blue-300" />
            </div>
            <h1 className={`text-xl font-black tracking-widest text-white transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100 block'}`}>
              ANTARVIK
            </h1>
          </div>
          
          <nav className="flex flex-col gap-2 flex-1">
            <NavItem path="/dashboard" icon={Activity} label="Dashboard" />
            <NavItem path="/twin" icon={Shield} label="Digital Twin" />
            <NavItem path="/predictions" icon={Wind} label="Predictions" />
            <NavItem path="/alerts" icon={AlertTriangle} label="Alerts" badge="3" />
          </nav>
        </div>

        <div className={`p-6 border-t border-white/10 whitespace-nowrap overflow-hidden transition-all ${sidebarCollapsed ? 'opacity-0 h-0 p-0 border-none' : 'opacity-100'}`}>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Team Atrangi</p>
          <p className="text-xs text-white/60">Antarctic UI v1.0</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold text-white/80 shadow-inner">
              {activeNode === 'NCPOR' && <><Building2 className="w-3.5 h-3.5 mr-2 text-blue-300"/> HQ COMMAND</>}
              {activeNode === 'MAITRI' && <><Snowflake className="w-3.5 h-3.5 mr-2 text-cyan-300"/> MAITRI EDGE</>}
              {activeNode === 'BHARATI' && <><Wind className="w-3.5 h-3.5 mr-2 text-indigo-300"/> BHARATI EDGE</>}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                onClick={() => activeNode === 'NCPOR' && setShowDropdown(!showDropdown)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${activeNode === 'NCPOR' ? 'bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10 cursor-pointer shadow-md' : 'bg-white/5 border-white/10 opacity-70 cursor-not-allowed'} transition-all`}
              >
                <span className={`w-2 h-2 rounded-full animate-pulse ${selectedStation === 'maitri' ? 'bg-cyan-400' : 'bg-indigo-400'}`}></span>
                <span className="text-xs font-bold tracking-widest uppercase text-white">
                  {selectedStation} STATION
                </span>
                {activeNode === 'NCPOR' && <ChevronDown className="w-4 h-4 text-white/50" />}
              </button>

              {showDropdown && activeNode === 'NCPOR' && (
                <div className="absolute right-0 mt-3 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden py-1 z-50">
                  <button onClick={() => { setStation('maitri'); setShowDropdown(false); }} className="w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/10 flex items-center text-white/90">
                    <Snowflake className="w-4 h-4 mr-3 text-cyan-400" /> Maitri
                  </button>
                  <button onClick={() => { setStation('bharati'); setShowDropdown(false); }} className="w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/10 flex items-center text-white/90">
                    <Wind className="w-4 h-4 mr-3 text-indigo-400" /> Bharati
                  </button>
                </div>
              )}
            </div>

            <button onClick={handleLogout} className="p-2 text-white/50 hover:text-white hover:bg-red-500/20 rounded-full transition-colors border border-transparent hover:border-red-500/30">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        
        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto pt-6 px-6">
          {children}
        </main>
        <FloatingChatbot />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/gateway" element={<ProtectedRoute><GatewayPage /></ProtectedRoute>} />
        
        <Route path="/dashboard" element={<ProtectedRoute><MainLayout><StationOverview /></MainLayout></ProtectedRoute>} />
        <Route path="/twin" element={<ProtectedRoute><MainLayout><DigitalTwinView /></MainLayout></ProtectedRoute>} />
        <Route path="/predictions" element={<ProtectedRoute><MainLayout><PredictionsView /></MainLayout></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><MainLayout><AlertsView /></MainLayout></ProtectedRoute>} />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
