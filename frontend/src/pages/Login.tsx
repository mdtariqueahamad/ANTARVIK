import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Snowflake, Wind, ExternalLink, User, ArrowRight, Shield, Zap, Package, Eye } from 'lucide-react';

const ROLES = [
  { id: 'commander', name: 'Head Office', icon: Shield, desc: 'Full station command' },
  { id: 'logistics', name: 'Logistics Manager', icon: Package, desc: 'Inventory & resupply' },
  { id: 'generator', name: 'Generator Operator', icon: Zap, desc: 'Microgrid control' },
  { id: 'general',   name: 'General (Read-Only)', icon: Eye, desc: 'No override permissions' }
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<'NCPOR' | 'MAITRI' | 'BHARATI' | null>(null);

  const handleSelectNode = (node: 'NCPOR' | 'MAITRI' | 'BHARATI') => {
    if (node === 'NCPOR') {
      sessionStorage.setItem('token', 'mock_jwt_token_12345');
      sessionStorage.setItem('activeNode', node);
      sessionStorage.setItem('role', 'hq');
      navigate('/dashboard'); // NCPOR has a gateway to view all stations
    } else {
      setSelectedNode(node);
    }
  };

  const handleSelectRole = (roleId: string) => {
    if (!selectedNode) return;
    sessionStorage.setItem('token', 'mock_jwt_token_12345');
    sessionStorage.setItem('activeNode', selectedNode);
    sessionStorage.setItem('role', roleId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col relative overflow-hidden text-white font-sans"
         style={{ backgroundImage: "url('/background.png')" }}>
      
      <div className="absolute inset-0 bg-slate-900/40 z-0 backdrop-blur-sm"></div>

      <header className="absolute top-0 w-full flex justify-between items-center px-10 py-6 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-slate-950/25 p-2 rounded-lg backdrop-blur-sm border border-white/10 shadow-lg">
            <Snowflake className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-widest text-white drop-shadow-md">ANTARVIK</span>
            <span className="text-[8px] uppercase tracking-[0.2em] text-blue-100 font-semibold drop-shadow-sm">Federated Digital Twin</span>
          </div>
        </div>

        <a 
          href="https://ncpor.res.in" 
          target="_blank" 
          rel="noreferrer"
          className="bg-slate-950/25 backdrop-blur-sm border border-white/20 text-white px-5 py-2 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-all shadow-lg"
        >
          <User className="w-3.5 h-3.5" />
          Research Portal
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </header>

      <div className="flex-grow flex flex-col items-center justify-center z-10 px-4 mt-8">
        
        <div className="bg-slate-950/25 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold mb-6 shadow-lg text-white">
          <Snowflake className="w-3 h-3" />
          SIH 2026 • Problem Statement 60
        </div>

        <div className="bg-slate-950/40 backdrop-blur-md border border-white/15 rounded-2xl p-8 flex flex-col items-center shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] max-w-3xl w-full transition-all">
          
          {!selectedNode ? (
            <>
              <h1 className="text-2xl font-black text-white mb-2 text-center drop-shadow-lg tracking-tight">
                Select <span className="text-blue-300">Operating Node</span>
              </h1>
              <p className="text-white/70 text-xs mb-8 text-center font-medium tracking-wide">
                Authenticate to your designated research station or command center.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full justify-center">
                <div onClick={() => handleSelectNode('NCPOR')} className="group bg-slate-950/50 backdrop-blur-md border border-white/10 rounded-xl flex flex-col items-center relative overflow-hidden shadow-lg hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-900/30 transition-all duration-300 cursor-pointer">
                  <div className="w-full h-24 relative">
                     <img src="/goa.jpeg" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80" alt="NCPOR Goa" />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <div className="absolute top-16 bg-slate-800 backdrop-blur-md rounded-full p-2 shadow-xl text-blue-300 flex items-center justify-center border border-white/10 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="pt-8 pb-5 px-4 flex flex-col items-center text-center">
                    <h3 className="text-sm font-bold text-white tracking-wide">NCPOR Command</h3>
                    <p className="text-[8px] font-bold text-blue-300 uppercase tracking-widest mt-1">Headquarters (Goa)</p>
                  </div>
                </div>

                <div onClick={() => handleSelectNode('MAITRI')} className="group bg-slate-950/50 backdrop-blur-md border border-white/10 rounded-xl flex flex-col items-center relative overflow-hidden shadow-lg hover:-translate-y-1 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all duration-300 cursor-pointer">
                  <div className="w-full h-24 relative">
                     <img src="/maitri.jpeg" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80" alt="Maitri Station" />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <div className="absolute top-16 bg-slate-800 backdrop-blur-md rounded-full p-2 shadow-xl text-cyan-300 flex items-center justify-center border border-white/10 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    <Snowflake className="w-4 h-4" />
                  </div>
                  <div className="pt-8 pb-5 px-4 flex flex-col items-center text-center">
                    <h3 className="text-sm font-bold text-white tracking-wide">Maitri Station</h3>
                    <p className="text-[8px] font-bold text-cyan-300 uppercase tracking-widest mt-1">Schirmacher Oasis</p>
                  </div>
                </div>

                <div onClick={() => handleSelectNode('BHARATI')} className="group bg-slate-950/50 backdrop-blur-md border border-white/10 rounded-xl flex flex-col items-center relative overflow-hidden shadow-lg hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-900/30 transition-all duration-300 cursor-pointer">
                  <div className="w-full h-24 relative">
                     <img src="/bharati-hero.png" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80" alt="Bharati Station" />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <div className="absolute top-16 bg-slate-800 backdrop-blur-md rounded-full p-2 shadow-xl text-indigo-300 flex items-center justify-center border border-white/10 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Wind className="w-4 h-4" />
                  </div>
                  <div className="pt-8 pb-5 px-4 flex flex-col items-center text-center">
                    <h3 className="text-sm font-bold text-white tracking-wide">Bharati Station</h3>
                    <p className="text-[8px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Larsemann Hills</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button onClick={() => setSelectedNode(null)} className="text-xs text-white/50 hover:text-white mb-4 flex items-center gap-1 transition-colors">
                &larr; Back to Nodes
              </button>
              <h1 className="text-2xl font-black text-white mb-2 text-center drop-shadow-lg tracking-tight">
                Select Role for <span className="text-blue-300">{selectedNode}</span>
              </h1>
              <p className="text-white/70 text-xs mb-8 text-center font-medium tracking-wide">
                Choose your operational authorization level.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ROLES.map(role => (
                  <div 
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-slate-900/50 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer group"
                  >
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 group-hover:bg-blue-500/20 group-hover:text-blue-300 text-slate-300 transition-colors">
                      <role.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{role.name}</h4>
                      <p className="text-[10px] text-white/50 mt-0.5">{role.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <footer className="absolute bottom-0 w-full flex justify-end items-end px-10 py-6 z-50 pointer-events-none">
        <div className="hidden md:flex items-center gap-3 opacity-80">
          <div className="w-10 h-[1px] bg-white/40"></div>
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase drop-shadow-md">
            People • Science • Sustainability
          </span>
        </div>
      </footer>
      
    </div>
  );
};

export default Login;
