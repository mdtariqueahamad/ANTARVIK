import React from 'react';
import { AlertTriangle, Power } from 'lucide-react';

interface Props {
  isActive: boolean;
  onTrigger: () => void;
  onReset: () => void;
}

export default function FaultInjectionPanel({ isActive, onTrigger, onReset }: Props) {
  return (
    <div className={`panel p-4 border-2 transition-colors ${isActive ? 'border-red-500 bg-red-900/20' : 'border-gray-800'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Power className="w-5 h-5 text-yellow-500" />
            Scenario / Fault Injection
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Manually trigger critical events for system demonstrations.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {!isActive ? (
            <button
              onClick={onTrigger}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-bold flex items-center gap-2 transition-colors animate-pulse border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
            >
              <AlertTriangle className="w-5 h-5" />
              Trigger Polar Storm (Demo A)
            </button>
          ) : (
            <button
              onClick={onReset}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-md font-bold flex items-center gap-2 transition-colors"
            >
              Reset Scenario
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
