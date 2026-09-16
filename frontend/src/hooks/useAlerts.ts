import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, StationId } from '../types';
import { getAlerts } from '../api/alerts';

interface UseAlertsOptions {
  stationId: StationId;
  pollInterval?: number;
  enabled?: boolean;
}

interface UseAlertsResult {
  alerts: Alert[];
  activeCount: number;
  criticalCount: number;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useAlerts({
  stationId,
  pollInterval = 10000,
  enabled = true,
}: UseAlertsOptions): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getAlerts(stationId);
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    if (!enabled) return;

    fetchData();
    intervalRef.current = setInterval(fetchData, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, pollInterval, enabled]);

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const criticalCount = alerts.filter(
    (a) => a.severity === 'critical' && a.status === 'active',
  ).length;

  return { alerts, activeCount, criticalCount, loading, error, refresh: fetchData };
}
