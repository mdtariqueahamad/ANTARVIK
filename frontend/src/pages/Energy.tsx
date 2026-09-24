
import React from 'react';
import { Zap } from 'lucide-react';
import MicrogridView from '../components/energy/MicrogridView';
import FuelForecast from '../components/energy/FuelForecast';
import LoadProfile from '../components/energy/LoadProfile';
import DispatchPanel from '../components/energy/DispatchPanel';
import { useStationStore } from '../hooks/useStationStore';

// Mocks for energy page
const mockGensets = [
  { id: 'G1', state: 'running', powerOutput: 120, fuelConsumptionRate: 15, temperature: 75, efficiency: 92, nextService: '120h' },
  { id: 'G2', state: 'standby', powerOutput: 0, fuelConsumptionRate: 0, temperature: 20, efficiency: 95, nextService: '400h' },
  { id: 'G3', state: 'maintenance', powerOutput: 0, fuelConsumptionRate: 0, temperature: 15, efficiency: 0, nextService: '0h (Active)' },
  { id: 'G4', state: 'running', powerOutput: 90, fuelConsumptionRate: 12, temperature: 72, efficiency: 89, nextService: '50h' }
];
const mockLoads = [
  { id: 'L1', name: 'Main Station HVAC', powerDemand: 80, priority: 1, state: 'online' },
  { id: 'L2', name: 'Science Lab Server Rack', powerDemand: 30, priority: 2, state: 'online' },
  { id: 'L3', name: 'Water Pumping System', powerDemand: 50, priority: 1, state: 'online' },
  { id: 'L4', name: 'External Lighting', powerDemand: 15, priority: 3, state: 'online' },
  { id: 'L5', name: 'Vehicle Block Heater', powerDemand: 25, priority: 2, state: 'online' },
];
const mockProfile = [
  { timestamp: '00:00', totalDemand: 150, generationCapacity: 200, renewableContribution: 20 },
  { timestamp: '04:00', totalDemand: 140, generationCapacity: 200, renewableContribution: 10 },
  { timestamp: '08:00', totalDemand: 180, generationCapacity: 300, renewableContribution: 50 },
  { timestamp: '12:00', totalDemand: 210, generationCapacity: 300, renewableContribution: 80 },
];
const mockFuel = [
  { date: '2026-10-01', predicted_level: 250000, consumption_rate: 1200 },
  { date: '2026-11-01', predicted_level: 214000, consumption_rate: 1200 },
  { date: '2026-12-01', predicted_level: 178000, consumption_rate: 1200 },
];

export default function Energy() {
  const { selectedStation } = useStationStore();

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Zap className="w-6 h-6 text-amber-400" />
            Energy & Microgrid
          </h2>
          <p className="text-white/50 text-sm mt-1">Manage generators, renewable dispatch, and loads for {selectedStation.toUpperCase()}</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MicrogridView {...({ gensets: mockGensets } as any)} />
        <DispatchPanel recommendations={[]} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <LoadProfile data={mockProfile as any} />
        <FuelForecast data={mockFuel as any} />
      </div>
    </div>
  );
}
