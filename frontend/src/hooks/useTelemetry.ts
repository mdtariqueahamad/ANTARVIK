import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryReading, StationId } from '../types';
import { getLatestTelemetry } from '../api/telemetry';

interface UseTelemetryOptions {
  stationId: StationId;
  assetId?: string;
  pollInterval?: number; // ms, default 5000
  enabled?: boolean;
}

interface UseTelemetryResult {
  readings: TelemetryReading[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useTelemetry({
  stationId,
  assetId,
  pollInterval = 5000,
  enabled = true,
}: UseTelemetryOptions): UseTelemetryResult {
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getLatestTelemetry(stationId, assetId);
      setReadings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch telemetry'));
    } finally {
      setLoading(false);
    }
  }, [stationId, assetId]);

  useEffect(() => {
    if (!enabled) return;

    fetchData();
    intervalRef.current = setInterval(fetchData, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, pollInterval, enabled]);

  return { readings, loading, error, refresh: fetchData };
}
