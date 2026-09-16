import { useState } from 'react';
import { Zap, CloudLightning, Truck, Radio, Play, Loader2 } from 'lucide-react';
import { useStationStore } from '../../hooks/useStationStore';
import { triggerScenario } from '../../api/scenarios';
import { ScenarioType } from '../../types';
import toast from 'react-hot-toast';

const SCENARIOS: {
  type: ScenarioType;
  label: string;
  description: string;
  icon: typeof Zap;
  color: string;
  params: Record<string, number | string>;
}[] = [
  {
    type: 'storm',
    label: 'Katabatic Storm',
    description: 'Simulate 72h storm with 180km/h winds, -50°C, zero visibility',
    icon: CloudLightning,
    color: '#a855f7',
    params: { wind_speed_ms: 50, duration_hours: 72, temperature_c: -50 },
  },
  {
    type: 'genset_failure',
    label: 'Generator Failure',
    description: 'Primary genset trips offline, switch to backup',
    icon: Zap,
    color: '#ff3b3b',
    params: { genset_id: 'DG-01', failure_mode: 'trip' },
  },
  {
    type: 'resupply_delay',
    label: 'Resupply Delay',
    description: 'Ice conditions delay vessel by 30 days',
    icon: Truck,
    color: '#ff8c00',
    params: { delay_days: 30 },
  },
  {
    type: 'sensor_drift',
    label: 'Sensor Drift',
    description: 'Temperature sensors drift by ±5°C, test anomaly detection',
    icon: Radio,
    color: '#ffd700',
    params: { drift_magnitude: 5, affected_sensors: 'temperature' },
  },
];

export default function FaultInjection() {
  const { selectedStation, faultInjectionOpen, toggleFaultInjection } = useStationStore();
  const [running, setRunning] = useState<ScenarioType | null>(null);

  if (!faultInjectionOpen) return null;

  const handleTrigger = async (scenario: (typeof SCENARIOS)[0]) => {
    setRunning(scenario.type);
    try {
      const result = await triggerScenario(selectedStation, {
        type: scenario.type,
        params: scenario.params,
        duration_hours: (scenario.params.duration_hours as number) || 24,
      });
      toast.success(`Scenario "${scenario.label}" triggered: ${result.impact_summary}`);
    } catch {
      toast.error(`Failed to trigger "${scenario.label}"`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50 w-96 panel animate-in slide-in-from-top-2">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-ice flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Fault Injection Panel
        </h3>
        <button
          onClick={toggleFaultInjection}
          className="text-gray-400 hover:text-gray-200 text-sm"
        >
          ✕
        </button>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-500 mb-3">
          Inject faults to test digital twin resilience for station{' '}
          <span className="text-ice">{selectedStation.toUpperCase()}</span>
        </p>
        {SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const isRunning = running === scenario.type;
          return (
            <div
              key={scenario.type}
              className="flex items-center gap-3 p-3 rounded-lg border border-antarctic-border bg-antarctic-navy hover:border-antarctic-border/80 transition-colors"
            >
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${scenario.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: scenario.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200">{scenario.label}</p>
                <p className="text-xs text-gray-500 truncate">{scenario.description}</p>
              </div>
              <button
                onClick={() => handleTrigger(scenario)}
                disabled={!!running}
                className="p-2 rounded-lg border border-antarctic-border hover:bg-antarctic-navy-light disabled:opacity-50 transition-colors"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 text-ice animate-spin" />
                ) : (
                  <Play className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
