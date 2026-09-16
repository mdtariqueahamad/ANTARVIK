import client from './client';
import { StationId, Alert, AlertStatus } from '../types';

export async function getAlerts(
  stationId: StationId,
  status?: AlertStatus,
): Promise<Alert[]> {
  const params = status ? { status } : {};
  const { data } = await client.get<Alert[]>(`/stations/${stationId}/alerts`, { params });
  return data;
}

export async function getAlert(stationId: StationId, alertId: string): Promise<Alert> {
  const { data } = await client.get<Alert>(`/stations/${stationId}/alerts/${alertId}`);
  return data;
}

export async function acknowledgeAlert(stationId: StationId, alertId: string): Promise<Alert> {
  const { data } = await client.post<Alert>(
    `/stations/${stationId}/alerts/${alertId}/acknowledge`,
  );
  return data;
}

export async function resolveAlert(stationId: StationId, alertId: string): Promise<Alert> {
  const { data } = await client.post<Alert>(
    `/stations/${stationId}/alerts/${alertId}/resolve`,
  );
  return data;
}
