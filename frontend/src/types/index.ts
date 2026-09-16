// ─── Core Entities ───────────────────────────────────────

export type StationId = 'maitri' | 'bharati';

export type OperatingMode = 'connected' | 'degraded' | 'recovery';

export type ProvenanceType = 'measured' | 'simulated' | 'assumption' | 'derived';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export type WorkOrderStatus = 'open' | 'in_progress' | 'closed';

export type AssetDomain = 'energy' | 'infrastructure' | 'logistics' | 'environment';

export type GensetStatus = 'running' | 'standby' | 'maintenance' | 'failed';

// ─── Station ─────────────────────────────────────────────

export interface Station {
  id: StationId;
  name: string;
  lat: number;
  lon: number;
  elevation_m: number;
  winter_crew: number;
  summer_crew: number;
  buildings: Building[];
}

export interface Building {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  domain: AssetDomain;
}

// ─── Assets ──────────────────────────────────────────────

export interface Asset {
  id: string;
  station_id: StationId;
  name: string;
  type: string;
  domain: AssetDomain;
  building_id: string;
  status: 'operational' | 'degraded' | 'failed' | 'maintenance';
  rul_hours: number | null;
  rul_confidence: number | null;
  installed_date: string;
  metadata: Record<string, unknown>;
}

// ─── Telemetry ───────────────────────────────────────────

export interface TelemetryReading {
  asset_id: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: string;
  provenance: ProvenanceType;
  quality: number;
}

export interface TelemetrySnapshot {
  station_id: StationId;
  timestamp: string;
  readings: Record<string, TelemetryReading>;
}

// ─── Energy ──────────────────────────────────────────────

export interface MicrogridState {
  station_id: StationId;
  timestamp: string;
  gensets: GensetState[];
  pv_output_kw: number;
  wind_output_kw: number;
  battery_soc_pct: number;
  battery_power_kw: number;
  total_load_kw: number;
  total_generation_kw: number;
  provenance: ProvenanceType;
}

export interface GensetState {
  id: string;
  name: string;
  status: GensetStatus;
  output_kw: number;
  capacity_kw: number;
  fuel_rate_lph: number;
  runtime_hours: number;
  rul_hours: number;
}

export interface EnergyMixPoint {
  timestamp: string;
  diesel_kw: number;
  solar_kw: number;
  wind_kw: number;
  battery_kw: number;
}

export interface LoadProfilePoint {
  hour: number;
  load_kw: number;
  heating_kw: number;
  lighting_kw: number;
  equipment_kw: number;
  cooking_kw: number;
}

export interface FuelForecastPoint {
  date: string;
  level_liters: number;
  lower_bound: number;
  upper_bound: number;
}

// ─── Infrastructure ──────────────────────────────────────

export interface BuildingHealth {
  building_id: string;
  name: string;
  envelope_stress: number;
  snow_load_kpa: number;
  snow_load_capacity_kpa: number;
  hvac_efficiency: number;
  internal_temp_c: number;
  target_temp_c: number;
  provenance: ProvenanceType;
}

export interface EquipmentRUL {
  asset_id: string;
  name: string;
  type: string;
  rul_hours: number;
  confidence: number;
  health_score: number;
  last_maintenance: string;
  next_maintenance: string;
  provenance: ProvenanceType;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  asset_id: string;
  asset_name: string;
  status: WorkOrderStatus;
  priority: Severity;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  alert_id?: string;
}

// ─── Logistics ───────────────────────────────────────────

export interface InventoryItem {
  id: string;
  station_id: StationId;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  threshold: number;
  daily_consumption: number;
  days_remaining: number;
  last_resupply: string;
  provenance: ProvenanceType;
}

export interface DepletionForecastPoint {
  date: string;
  quantity: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ResupplyManifest {
  id: string;
  vessel: string;
  departure_date: string;
  arrival_date: string;
  items: ResupplyItem[];
  status: 'planned' | 'in_transit' | 'delivered';
}

export interface ResupplyItem {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  priority: Severity;
}

// ─── Environment ─────────────────────────────────────────

export interface WeatherState {
  station_id: StationId;
  timestamp: string;
  temperature_c: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  pressure_hpa: number;
  humidity_pct: number;
  irradiance_wm2: number;
  visibility_km: number;
  condition: string;
  provenance: ProvenanceType;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
  provenance: ProvenanceType;
}

export interface ComplianceEntry {
  id: string;
  category: 'waste' | 'emissions' | 'wildlife' | 'water';
  metric: string;
  value: number;
  limit: number;
  unit: string;
  status: 'compliant' | 'warning' | 'violation';
  timestamp: string;
}

// ─── Alerts ──────────────────────────────────────────────

export interface Alert {
  id: string;
  station_id: StationId;
  severity: Severity;
  status: AlertStatus;
  title: string;
  message: string;
  domain: AssetDomain;
  asset_id?: string;
  asset_name?: string;
  trigger_rule: string;
  recommended_action: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: string;
}

// ─── Scenarios ───────────────────────────────────────────

export type ScenarioType = 'storm' | 'genset_failure' | 'resupply_delay' | 'sensor_drift';

export interface ScenarioTrigger {
  type: ScenarioType;
  params: Record<string, number | string>;
  duration_hours?: number;
}

export interface ScenarioResult {
  id: string;
  type: ScenarioType;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  impact_summary: string;
  affected_assets: string[];
  risk_delta: number;
  recommendations: string[];
}

// ─── Auth ────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  station_id?: StationId;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// ─── Sync ────────────────────────────────────────────────

export interface SyncStatus {
  mode: OperatingMode;
  last_sync: string;
  sync_progress?: number;
  pending_uploads: number;
  pending_downloads: number;
  bandwidth_kbps?: number;
}

// ─── API Response ────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
