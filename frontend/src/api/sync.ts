import client from './client';
import { SyncStatus } from '../types';

export async function getSyncStatus(): Promise<SyncStatus> {
  const { data } = await client.get<SyncStatus>('/sync/status');
  return data;
}

export async function triggerSync(): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/sync/trigger');
  return data;
}

export async function setOperatingMode(mode: string): Promise<SyncStatus> {
  const { data } = await client.post<SyncStatus>('/sync/mode', { mode });
  return data;
}
