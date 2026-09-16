import React from 'react';
import { Wind, AlertTriangle } from 'lucide-react';

export const PredictionsView = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl m-8 shadow-2xl">
    <Wind className="w-16 h-16 text-indigo-400 mb-4 animate-pulse" />
    <h2 className="text-3xl font-black text-white mb-2">Predictive Models</h2>
    <p className="text-slate-400">AI Forecasting Engine will be mounted here.</p>
  </div>
);

export const AlertsView = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl m-8 shadow-2xl">
    <AlertTriangle className="w-16 h-16 text-red-400 mb-4 animate-bounce" />
    <h2 className="text-3xl font-black text-white mb-2">Critical Alerts</h2>
    <p className="text-slate-400">System incident response management.</p>
  </div>
);
