import client from './client';
import { Station, Asset, StationId } from '../types';

export async function getStations(): Promise<Station[]> {
  const { data } = await client.get<Station[]>('/stations');
  return data;
}

export async function getStation(id: StationId): Promise<Station> {
  const { data } = await client.get<Station>(`/stations/${id}`);
  return data;
}

export async function getAssets(stationId: StationId, domain?: string): Promise<Asset[]> {
  const params = domain ? { domain } : {};
  const { data } = await client.get<Asset[]>(`/stations/${stationId}/assets`, { params });
  return data;
}

export async function getAsset(stationId: StationId, assetId: string): Promise<Asset> {
  const { data } = await client.get<Asset>(`/stations/${stationId}/assets/${assetId}`);
  return data;
}
