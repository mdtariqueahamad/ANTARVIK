import client from './client';
import { StationId, ScenarioTrigger, ScenarioResult } from '../types';

export async function triggerScenario(
  stationId: StationId,
  trigger: ScenarioTrigger,
): Promise<ScenarioResult> {
  const { data } = await client.post<ScenarioResult>(
    `/stations/${stationId}/scenarios/trigger`,
    trigger,
  );
  return data;
}

export async function getScenarioResult(
  stationId: StationId,
  scenarioId: string,
): Promise<ScenarioResult> {
  const { data } = await client.get<ScenarioResult>(
    `/stations/${stationId}/scenarios/${scenarioId}`,
  );
  return data;
}

export async function getScenarioHistory(stationId: StationId): Promise<ScenarioResult[]> {
  const { data } = await client.get<ScenarioResult[]>(
    `/stations/${stationId}/scenarios`,
  );
  return data;
}
