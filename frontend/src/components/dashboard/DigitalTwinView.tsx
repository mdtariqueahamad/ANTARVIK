import React from 'react';
import StationModel from '../twin3d/StationModel';

export default function DigitalTwinView() {
  return (
    <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Interactive Spatial Twin</h2>
          <p className="text-blue-300 text-sm font-medium">Click on assets to view live telemetry and metadata.</p>
        </div>
      </div>
      
      <div className="flex-1 w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
         <StationModel />
      </div>
    </div>
  );
}
