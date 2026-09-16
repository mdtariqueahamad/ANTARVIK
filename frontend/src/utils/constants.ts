import { Severity, AssetDomain, ProvenanceType, OperatingMode } from '../types';

// ─── Colors ──────────────────────────────────────────────

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff3b3b',
  high: '#ff8c00',
  medium: '#ffd700',
  low: '#00d4ff',
  info: '#8b9dc3',
};

export const DOMAIN_COLORS: Record<AssetDomain, string> = {
  energy: '#ffd700',
  infrastructure: '#00d4ff',
  logistics: '#00ff88',
  environment: '#a855f7',
};

export const PROVENANCE_COLORS: Record<ProvenanceType, string> = {
  measured: '#00ff88',
  simulated: '#00d4ff',
  assumption: '#ffd700',
  derived: '#a855f7',
};

export const PROVENANCE_LABELS: Record<ProvenanceType, string> = {
  measured: 'Measured (Sensor)',
  simulated: 'Simulated (Model)',
  assumption: 'Assumed (Default)',
  derived: 'Derived (Calculated)',
};

export const MODE_COLORS: Record<OperatingMode, string> = {
  connected: '#00ff88',
  degraded: '#ffd700',
  recovery: '#00d4ff',
};

export const MODE_LABELS: Record<OperatingMode, string> = {
  connected: 'Connected',
  degraded: 'Degraded',
  recovery: 'Recovery',
};

// ─── Chart Palette ───────────────────────────────────────

export const POLAR_PALETTE = [
  '#00d4ff', // ice blue
  '#00ff88', // aurora green
  '#ffd700', // gold
  '#a855f7', // purple
  '#ff6b9d', // pink
  '#ff8c00', // orange
  '#00cc6a', // dark green
  '#80eaff', // light ice
];

export const ENERGY_SOURCE_COLORS = {
  diesel: '#ff8c00',
  solar: '#ffd700',
  wind: '#00d4ff',
  battery: '#00ff88',
};

// ─── Metric Units ────────────────────────────────────────

export const METRIC_UNITS: Record<string, string> = {
  temperature: '°C',
  wind_speed: 'm/s',
  pressure: 'hPa',
  humidity: '%',
  irradiance: 'W/m²',
  power: 'kW',
  energy: 'kWh',
  fuel: 'L',
  fuel_rate: 'L/h',
  voltage: 'V',
  current: 'A',
  frequency: 'Hz',
  soc: '%',
  load: 'kN/m²',
  stress: 'MPa',
  rul: 'hrs',
};

// ─── Asset Types ─────────────────────────────────────────

export const ASSET_TYPES = [
  'diesel_generator',
  'solar_panel',
  'wind_turbine',
  'battery_bank',
  'transformer',
  'hvac_unit',
  'water_heater',
  'water_treatment',
  'fuel_tank',
  'building_envelope',
  'communication_system',
  'weather_station',
] as const;

export const ASSET_TYPE_LABELS: Record<string, string> = {
  diesel_generator: 'Diesel Generator',
  solar_panel: 'Solar Panel Array',
  wind_turbine: 'Wind Turbine',
  battery_bank: 'Battery Bank',
  transformer: 'Transformer',
  hvac_unit: 'HVAC Unit',
  water_heater: 'Water Heater',
  water_treatment: 'Water Treatment',
  fuel_tank: 'Fuel Tank',
  building_envelope: 'Building Envelope',
  communication_system: 'Communication System',
  weather_station: 'Weather Station',
};

// ─── Station Info ────────────────────────────────────────

export const STATIONS = {
  maitri: {
    name: 'Maitri',
    fullName: 'Maitri Research Station',
    lat: -70.7667,
    lon: 11.7333,
    elevation: 117,
    established: 1989,
  },
  bharati: {
    name: 'Bharati',
    fullName: 'Bharati Research Station',
    lat: -69.4077,
    lon: 76.1836,
    elevation: 49,
    established: 2012,
  },
} as const;

// ─── Inventory Categories ────────────────────────────────

export const INVENTORY_CATEGORIES = [
  'fuel',
  'food',
  'medical',
  'spare_parts',
  'chemicals',
  'clothing',
  'communication',
  'scientific',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  fuel: 'Fuel & Lubricants',
  food: 'Food & Provisions',
  medical: 'Medical Supplies',
  spare_parts: 'Spare Parts',
  chemicals: 'Chemicals',
  clothing: 'Clothing & Gear',
  communication: 'Communication',
  scientific: 'Scientific Equipment',
};
