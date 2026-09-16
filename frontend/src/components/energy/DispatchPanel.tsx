import { AlertTriangle, Lightbulb } from 'lucide-react';

interface Recommendation {
  type: 'shed' | 'switch' | 'optimize';
  title: string;
  description: string;
  savingsKw: number;
  priority: 'high' | 'medium' | 'low';
}

interface DispatchPanelProps {
  recommendations: Recommendation[];
  suggestedGenset?: string;
}

export default function DispatchPanel({ recommendations, suggestedGenset }: DispatchPanelProps) {
  const priorityColors = {
    high: '#ff3b3b',
    medium: '#ffd700',
    low: '#00d4ff',
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-severity-medium" />
          Dispatch Recommendations
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {suggestedGenset && (
          <div className="p-3 rounded-lg border border-aurora-green/30 bg-aurora-green/5">
            <p className="text-sm text-aurora-green font-medium">
              Suggested: Switch to {suggestedGenset}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Optimal fuel efficiency for current load profile
            </p>
          </div>
        )}

        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg border border-antarctic-border bg-antarctic-navy"
          >
            <div
              className="p-1.5 rounded"
              style={{ backgroundColor: `${priorityColors[rec.priority]}15` }}
            >
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: priorityColors[rec.priority] }}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200">{rec.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{rec.description}</p>
            </div>
            <span className="text-xs font-mono text-aurora-green whitespace-nowrap">
              -{rec.savingsKw} kW
            </span>
          </div>
        ))}

        {recommendations.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No optimization recommendations at this time
          </p>
        )}
      </div>
    </div>
  );
}
