import { NextResponse } from "next/server";

import { cache5m, fetchWeatherCurrent, getCacheAge } from "@/lib/server/services/siata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deterministic PRNG (mulberry32) + Box–Muller so the grid is stable per rain level
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRID: Array<[number, number]> = [
  [6.252, -75.569],
  [6.245, -75.58],
  [6.235, -75.6],
  [6.26, -75.565],
  [6.275, -75.57],
  [6.228, -75.574],
  [6.21, -75.57],
  [6.2, -75.578],
  [6.285, -75.558],
];

/** Precipitation as GeoJSON point features (synthetic grid around Medellín). */
export async function GET() {
  const weather = await fetchWeatherCurrent();
  const rain = weather.precipitacion_mmh ?? 0;
  const rnd = mulberry32(Math.floor(rain * 10));
  const gauss = () => {
    const u = Math.max(rnd(), 1e-9);
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const features = GRID.map(([lat, lon]) => {
    const localRain = Math.max(0, rain + gauss() * (rain * 0.3 + 0.1));
    const intensidad =
      localRain >= 7.5
        ? "fuerte"
        : localRain >= 2.5
          ? "moderada"
          : localRain >= 0.1
            ? "leve"
            : "ninguna";
    return {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [lon, lat] },
      properties: { precipitacion_mmh: Math.round(localRain * 100) / 100, intensidad },
    };
  });

  return NextResponse.json({
    type: "FeatureCollection",
    features,
    source: weather.source ?? "unknown",
    cache_age_seconds: getCacheAge("weather", cache5m),
  });
}
