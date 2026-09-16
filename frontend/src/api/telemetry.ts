import client from './client';
import {
  StationId,
  TelemetryReading,
  MicrogridState,
  EnergyMixPoint,
  LoadProfilePoint,
  FuelForecastPoint,
  WeatherState,
  BuildingHealth,
  EquipmentRUL,
} from '../types';

export async function getLatestTelemetry(
  stationId: StationId,
  assetId?: string,
): Promise<TelemetryReading[]> {
  const params = assetId ? { asset_id: assetId } : {};
  const { data } = await client.get<TelemetryReading[]>(
    `/stations/${stationId}/telemetry/latest`,
    { params },
  );
  return data;
}

export async function getTelemetryHistory(
  stationId: StationId,
  assetId: string,
  metric: string,
  hours = 24,
): Promise<TelemetryReading[]> {
  const { data } = await client.get<TelemetryReading[]>(
    `/stations/${stationId}/telemetry/history`,
    { params: { asset_id: assetId, metric, hours } },
  );
  return data;
}

export async function getMicrogridState(stationId: StationId): Promise<MicrogridState> {
  const { data } = await client.get<MicrogridState>(`/stations/${stationId}/energy/microgrid`);
  return data;
}

export async function getEnergyMix(stationId: StationId, hours = 24): Promise<EnergyMixPoint[]> {
  const { data } = await client.get<EnergyMixPoint[]>(`/stations/${stationId}/energy/mix`, {
    params: { hours },
  });
  return data;
}

export async function getLoadProfile(stationId: StationId): Promise<LoadProfilePoint[]> {
  const { data } = await client.get<LoadProfilePoint[]>(
    `/stations/${stationId}/energy/load-profile`,
  );
  return data;
}

export async function getFuelForecast(
  stationId: StationId,
  days = 90,
): Promise<FuelForecastPoint[]> {
  const { data } = await client.get<FuelForecastPoint[]>(
    `/stations/${stationId}/energy/fuel-forecast`,
    { params: { days } },
  );
  return data;
}

export async function getWeather(stationId: StationId): Promise<WeatherState> {
  const { data } = await client.get<WeatherState>(`/stations/${stationId}/environment/weather`);
  return data;
}

export async function getBuildingHealth(stationId: StationId): Promise<BuildingHealth[]> {
  const { data } = await client.get<BuildingHealth[]>(
    `/stations/${stationId}/infrastructure/buildings`,
  );
  return data;
}

export async function getEquipmentRUL(stationId: StationId): Promise<EquipmentRUL[]> {
  const { data } = await client.get<EquipmentRUL[]>(
    `/stations/${stationId}/infrastructure/equipment-rul`,
  );
  return data;
}
