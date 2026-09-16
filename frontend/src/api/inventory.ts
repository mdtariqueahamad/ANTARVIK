import client from './client';
import { StationId, InventoryItem, DepletionForecastPoint, ResupplyManifest } from '../types';

export async function getInventory(
  stationId: StationId,
  category?: string,
): Promise<InventoryItem[]> {
  const params = category ? { category } : {};
  const { data } = await client.get<InventoryItem[]>(
    `/stations/${stationId}/logistics/inventory`,
    { params },
  );
  return data;
}

export async function getDepletionForecast(
  stationId: StationId,
  sku: string,
  days = 90,
): Promise<DepletionForecastPoint[]> {
  const { data } = await client.get<DepletionForecastPoint[]>(
    `/stations/${stationId}/logistics/depletion-forecast`,
    { params: { sku, days } },
  );
  return data;
}

export async function getResupplyManifests(stationId: StationId): Promise<ResupplyManifest[]> {
  const { data } = await client.get<ResupplyManifest[]>(
    `/stations/${stationId}/logistics/resupply`,
  );
  return data;
}

export async function createResupplyManifest(
  stationId: StationId,
  manifest: Omit<ResupplyManifest, 'id' | 'status'>,
): Promise<ResupplyManifest> {
  const { data } = await client.post<ResupplyManifest>(
    `/stations/${stationId}/logistics/resupply`,
    manifest,
  );
  return data;
}
