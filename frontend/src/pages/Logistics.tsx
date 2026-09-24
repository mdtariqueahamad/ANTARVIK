
import React, { useState } from 'react';
import { Package } from 'lucide-react';
import InventoryLedger from '../components/logistics/InventoryLedger';
import DepletionForecast from '../components/logistics/DepletionForecast';
import { useStationStore } from '../hooks/useStationStore';

// Dummy data for logistics page
const mockInventoryItems = [
  { id: '1', station_id: '1', name: 'Aviation Turbine Fuel', category: 'Fuel', sku: 'ATF-001', quantity: 120000, unit: 'L', threshold: 40000, daily_consumption: 1500, days_remaining: 80, provenance: {} },
  { id: '2', station_id: '1', name: 'High Speed Diesel', category: 'Fuel', sku: 'HSD-001', quantity: 250000, unit: 'L', threshold: 50000, daily_consumption: 2500, days_remaining: 100, provenance: {} },
  { id: '3', station_id: '1', name: 'Medical Supplies (Cold)', category: 'Medical', sku: 'MED-C01', quantity: 450, unit: 'Boxes', threshold: 100, daily_consumption: 2, days_remaining: 225, provenance: {} },
  { id: '4', station_id: '1', name: 'MRE Rations (Frozen)', category: 'Food', sku: 'FOOD-FRZ-01', quantity: 8500, unit: 'Kg', threshold: 2000, daily_consumption: 35, days_remaining: 242, provenance: {} },
  { id: '5', station_id: '1', name: 'Dry Staples (Rice/Flour)', category: 'Food', sku: 'FOOD-DRY-01', quantity: 12000, unit: 'Kg', threshold: 3000, daily_consumption: 40, days_remaining: 300, provenance: {} },
  { id: '6', station_id: '1', name: 'Vehicle Spare Tracks', category: 'Parts', sku: 'SP-TRK-01', quantity: 24, unit: 'Units', threshold: 8, daily_consumption: 0.1, days_remaining: 240, provenance: {} },
  { id: '7', station_id: '1', name: 'Generator Oil', category: 'Lubes', sku: 'LUB-GEN-02', quantity: 3200, unit: 'L', threshold: 500, daily_consumption: 12, days_remaining: 266, provenance: {} },
  { id: '8', station_id: '1', name: 'Snowmobile Tracks', category: 'Parts', sku: 'SP-SNO-04', quantity: 12, unit: 'Units', threshold: 4, daily_consumption: 0.05, days_remaining: 240, provenance: {} },
  { id: '9', station_id: '1', name: 'Antifreeze Coolant', category: 'Lubes', sku: 'LUB-AF-01', quantity: 850, unit: 'L', threshold: 200, daily_consumption: 2.5, days_remaining: 340, provenance: {} },
  { id: '10', station_id: '1', name: 'Emergency Rations', category: 'Food', sku: 'FOOD-EMG-01', quantity: 1500, unit: 'Kg', threshold: 1000, daily_consumption: 0, days_remaining: 999, provenance: {} },
  { id: '11', station_id: '1', name: 'Helicopter Fuel (Jet-A1)', category: 'Fuel', sku: 'JET-A1-01', quantity: 45000, unit: 'L', threshold: 15000, daily_consumption: 250, days_remaining: 180, provenance: {} },
  { id: '12', station_id: '1', name: 'Satcom Spares', category: 'Comms', sku: 'COM-SAT-02', quantity: 3, unit: 'Boxes', threshold: 1, daily_consumption: 0.01, days_remaining: 300, provenance: {} }
];

const mockForecast = [
  { date: '2026-10-01', predicted_quantity: 120000, threshold: 40000, confidence: 0.98 },
  { date: '2026-11-01', predicted_quantity: 75000, threshold: 40000, confidence: 0.95 },
  { date: '2026-12-01', predicted_quantity: 30000, threshold: 40000, confidence: 0.90 } // Crosses threshold
];

export default function Logistics() {
  const { selectedStation } = useStationStore();
  
  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Package className="w-6 h-6 text-emerald-400" />
            Logistics & Inventory
          </h2>
          <p className="text-white/50 text-sm mt-1">Manage supply chains, ship tracking, and storage for {selectedStation.toUpperCase()}</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <InventoryLedger items={mockInventoryItems as any} />
        </div>
        <div className="xl:col-span-1">
          <DepletionForecast forecasts={mockForecast as any} />
        </div>
      </div>
    </div>
  );
}
