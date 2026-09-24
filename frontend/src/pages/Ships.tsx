import React from 'react';
import { Anchor, Navigation, Clock, Package as PkgIcon } from 'lucide-react';
import { useStationStore } from '../hooks/useStationStore';

export default function Ships() {
  const { selectedStation } = useStationStore();

  const logisticsData = {
    maitri: {
      vessel: "SA Agulhas II", type: "Icebreaker Research Vessel", origin: "Cape Town, South Africa", eta: "14 Days",
      cargo: [
        { item: "Aviation Turbine Fuel (ATF)", qty: "120,000 L", weight: "96 Tons", critical: true },
        { item: "Heavy Machinery Parts", qty: "4 Crates", weight: "12 Tons", critical: false },
        { item: "Food Supplies (Dry/Frozen)", qty: "18 Pallets", weight: "24 Tons", critical: true },
        { item: "Winter Clothing Kits", qty: "50 Boxes", weight: "2 Tons", critical: false },
        { item: "Science Lab Reagents", qty: "2 Containers", weight: "1.5 Tons", critical: true }
      ],
      status: "In Transit - Crossing Roaring Forties", lat: -45.12, lon: 21.05
    },
    bharati: {
      vessel: "Vasiliy Golovnin", type: "Polar Cargo Vessel", origin: "Goa, India", eta: "22 Days",
      cargo: [
        { item: "Scientific Equipment (MOM)", qty: "8 Crates", weight: "5 Tons", critical: false },
        { item: "High-Speed Diesel (HSD)", qty: "250,000 L", weight: "215 Tons", critical: true },
        { item: "Medical Supplies", qty: "2 Containers", weight: "4 Tons", critical: true },
        { item: "Satellite Dish Radome", qty: "1 Unit", weight: "3 Tons", critical: false },
        { item: "Emergency Rescue Sleds", qty: "4 Units", weight: "1 Ton", critical: true }
      ],
      status: "In Transit - Refueling at Mauritius", lat: -20.15, lon: 57.51
    }
  };
  
  const activeShip = logisticsData[selectedStation as 'maitri' | 'bharati'];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Anchor className="w-6 h-6 text-emerald-400" />
            Vessel Tracking & Manifests
          </h2>
          <p className="text-white/50 text-sm mt-1">Live tracking and cargo manifests for {selectedStation.toUpperCase()} resupply</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <h4 className="text-emerald-300 text-xs uppercase tracking-widest mb-6 font-bold flex items-center gap-2">
              <Navigation className="w-4 h-4" /> Vessel Telemetry
            </h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Active Vessel</span>
                <span className="text-white font-mono text-lg">{activeShip.vessel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Vessel Class</span>
                <span className="text-white font-mono text-sm">{activeShip.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Origin Port</span>
                <span className="text-white font-mono text-sm">{activeShip.origin}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Live Coordinates</span>
                <span className="text-emerald-300 font-mono text-sm">{activeShip.lat}°, {activeShip.lon}°</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Status</span>
                <span className="text-emerald-400 font-mono text-sm animate-pulse">{activeShip.status}</span>
              </div>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-white/60 text-sm flex items-center gap-2"><Clock className="w-5 h-5 text-amber-400"/> Expected Arrival</span>
            <span className="text-amber-300 font-black text-2xl tracking-wider">{activeShip.eta}</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <h4 className="text-emerald-300 text-xs uppercase tracking-widest mb-6 font-bold flex items-center gap-2">
            <PkgIcon className="w-4 h-4" /> Cargo Manifest
          </h4>
          <div className="space-y-4">
            {activeShip.cargo.map((item, idx) => (
              <div key={idx} className="flex flex-col p-4 bg-black/20 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-bold ${item.critical ? 'text-red-400' : 'text-white'}`}>
                    {item.item}
                  </span>
                  <span className="text-sm text-emerald-200 font-mono bg-emerald-500/10 px-3 py-1 rounded-full">
                    {item.weight}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">Volume / Quantity</span>
                  <span className="text-white/70 text-sm font-mono">{item.qty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
