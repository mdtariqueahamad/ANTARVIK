
import React from 'react';
import { Zap } from 'lucide-react';
import MicrogridView from '../components/energy/MicrogridView';
import FuelForecast from '../components/energy/FuelForecast';
import LoadProfile from '../components/energy/LoadProfile';
import DispatchPanel from '../components/energy/DispatchPanel';
import { useStationStore } from '../hooks/useStationStore';

// Mocks for energy page
const mockGensets = [
  { id: 'G1', name: 'Generator 1', status: 'running', output_kw: 85, capacity_kw: 100, fuel_rate_lph: 12.5, runtime_hours: 450, rul_hours: 1200 },
  { id: 'G2', name: 'Generator 2', status: 'standby', output_kw: 0, capacity_kw: 100, fuel_rate_lph: 0, runtime_hours: 320, rul_hours: 4000 },
  { id: 'G3', name: 'Generator 3', status: 'maintenance', output_kw: 0, capacity_kw: 100, fuel_rate_lph: 0, runtime_hours: 800, rul_hours: 0 },
  { id: 'S1', name: 'Solar Array', status: 'running', output_kw: 45, capacity_kw: 50, fuel_rate_lph: 0, runtime_hours: 12000, rul_hours: 50000 },
  { id: 'W1', name: 'Wind Turbine', status: 'running', output_kw: 80, capacity_kw: 100, fuel_rate_lph: 0, runtime_hours: 8000, rul_hours: 20000 }
];
const mockLoads = [
  { id: 'L1', name: 'Main Station HVAC', powerDemand: 80, priority: 1, state: 'online' },
  { id: 'L2', name: 'Science Lab Server Rack', powerDemand: 30, priority: 2, state: 'online' },
  { id: 'L3', name: 'Water Pumping System', powerDemand: 50, priority: 1, state: 'online' },
  { id: 'L4', name: 'External Lighting', powerDemand: 15, priority: 3, state: 'online' },
  { id: 'L5', name: 'Vehicle Block Heater', powerDemand: 25, priority: 2, state: 'online' },
  { id: 'L6', name: 'Waste Treatment Plant', powerDemand: 45, priority: 1, state: 'online' },
  { id: 'L7', name: 'Secondary Communications', powerDemand: 15, priority: 2, state: 'standby' },
  { id: 'L8', name: 'Snow Melter (Potable Water)', powerDemand: 60, priority: 1, state: 'online' },
];
const mockProfile = [
  { hour: 0, heating_kw: 60, lighting_kw: 15, equipment_kw: 25, cooking_kw: 5 },
  { hour: 4, heating_kw: 65, lighting_kw: 15, equipment_kw: 25, cooking_kw: 5 },
  { hour: 8, heating_kw: 70, lighting_kw: 20, equipment_kw: 50, cooking_kw: 30 },
  { hour: 12, heating_kw: 60, lighting_kw: 15, equipment_kw: 60, cooking_kw: 45 },
  { hour: 16, heating_kw: 65, lighting_kw: 25, equipment_kw: 40, cooking_kw: 20 },
  { hour: 20, heating_kw: 75, lighting_kw: 30, equipment_kw: 30, cooking_kw: 40 }
];
const mockFuel = [
  { date: '2026-10-01', level_liters: 250000, lower_bound: 245000, upper_bound: 255000 },
  { date: '2026-10-15', level_liters: 214000, lower_bound: 205000, upper_bound: 220000 },
  { date: '2026-11-01', level_liters: 178000, lower_bound: 165000, upper_bound: 190000 },
  { date: '2026-11-15', level_liters: 142000, lower_bound: 120000, upper_bound: 160000 }
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
        <MicrogridView 
          gensets={mockGensets as any}
          pvOutput={125.5}
          windOutput={80.2}
          batterySoc={85}
          batteryPower={-15}
          totalLoad={280}
          totalGeneration={295}
        />
        <DispatchPanel recommendations={[
          { type: 'shed', title: 'Shed Sector 4 HVAC', description: 'Thermal mass is high enough to float for 2 hours.', savingsKw: 45, priority: 'medium' },
          { type: 'optimize', title: 'Engage Battery Discharge', description: 'Peak wind expected in 3 hours, discharge BESS to avoid curtailment.', savingsKw: 120, priority: 'high' }
        ]} suggestedGenset="G4" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <LoadProfile data={mockProfile as any} />
        <FuelForecast data={mockFuel as any} />
      </div>
    </div>
  );
}
