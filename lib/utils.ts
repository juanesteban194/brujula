import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Risk thresholds calibrated for the real Medellín dataset:
 * p25=0.84, p50=0.90, p75=0.95
 * We use percentile-based categories so the scale is meaningful.
 */
export function riskToColor(risk: number): string {
  if (risk < 0.75)  return "var(--risk-low)";
  if (risk < 0.88)  return "var(--risk-mid)";
  if (risk < 0.95)  return "var(--risk-high)";
  return "var(--risk-extreme)";
}

export function riskLabel(risk: number): string {
  if (risk < 0.75)  return "Bajo";
  if (risk < 0.88)  return "Moderado";
  if (risk < 0.95)  return "Alto";
  return "Crítico";
}

export function riskNormToColor(riskNorm: number): string {
  // Uses percentile-normalized risk (0-1 = 0th-100th percentile)
  if (riskNorm < 0.25) return "var(--risk-low)";
  if (riskNorm < 0.60) return "var(--risk-mid)";
  if (riskNorm < 0.85) return "var(--risk-high)";
  return "var(--risk-extreme)";
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parse a "lat,lon" node id string into [lat, lon]. */
export function parseNodeId(id: string): [number, number] | null {
  const parts = id.split(",").map(Number);
  if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) return [parts[0], parts[1]];
  return null;
}

export function alphaFromPreference(_preference: number) {
  return 1.0;
}

export function betaFromPreference(preference: number) {
  // With real risk values ~0.84-0.95, beta needs to be higher
  // to meaningfully differentiate routes. 0-1000 range.
  return preference * 1000;
}
