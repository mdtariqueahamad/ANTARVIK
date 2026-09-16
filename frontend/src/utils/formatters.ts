import { format, formatDistanceToNow, parseISO } from 'date-fns';

// ─── Date Formatters ─────────────────────────────────────

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy');
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy HH:mm');
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm:ss');
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

// ─── Number Formatters ───────────────────────────────────

export function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(1);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── Unit Formatters ─────────────────────────────────────

export function formatWithUnit(value: number, unit: string, decimals = 1): string {
  return `${formatNumber(value, decimals)} ${unit}`;
}

export function formatTemperature(celsius: number): string {
  return `${celsius.toFixed(1)}°C`;
}

export function formatPower(kw: number): string {
  if (kw >= 1000) return `${(kw / 1000).toFixed(1)} MW`;
  return `${kw.toFixed(1)} kW`;
}

export function formatFuel(liters: number): string {
  if (liters >= 1000) return `${(liters / 1000).toFixed(1)} kL`;
  return `${liters.toFixed(0)} L`;
}

export function formatDaysRemaining(days: number): string {
  if (days <= 0) return 'Depleted';
  if (days < 1) return `${(days * 24).toFixed(0)} hrs`;
  if (days < 30) return `${days.toFixed(0)} days`;
  if (days < 365) return `${(days / 30).toFixed(1)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

export function formatRUL(hours: number): string {
  if (hours <= 0) return 'EOL';
  if (hours < 24) return `${hours.toFixed(0)} hrs`;
  if (hours < 720) return `${(hours / 24).toFixed(0)} days`;
  return `${(hours / 720).toFixed(0)} months`;
}

// ─── Severity Helpers ────────────────────────────────────

export function severityLabel(severity: string): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function healthLabel(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Degraded';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

export function healthColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#00d4ff';
  if (score >= 40) return '#ffd700';
  if (score >= 20) return '#ff8c00';
  return '#ff3b3b';
}
