/**
 * SIATA (Sistema de Alerta Temprana del Valle de Aburrá) client.
 * Real-time environmental data with a reliable Open-Meteo fallback for weather.
 * Results are cached with a TTL to avoid hammering external APIs.
 */

// ---------- Simple TTL cache -------------------------------------------------
class TTLCache<T = unknown> {
  private store = new Map<string, { ts: number; val: T }>();
  constructor(private ttlMs: number) {}

  get(key: string): T | null {
    const hit = this.store.get(key);
    if (hit) {
      if (Date.now() - hit.ts < this.ttlMs) return hit.val;
      this.store.delete(key);
    }
    return null;
  }
  set(key: string, val: T): void {
    this.store.set(key, { ts: Date.now(), val });
  }
  ageSeconds(key: string): number | null {
    const hit = this.store.get(key);
    return hit ? Math.floor((Date.now() - hit.ts) / 1000) : null;
  }
}

// Persist caches across module reloads / warm invocations
const g = globalThis as unknown as {
  __siataCache5m?: TTLCache;
  __siataCache2m?: TTLCache;
};
export const cache5m = (g.__siataCache5m ??= new TTLCache(300_000));
export const cache2m = (g.__siataCache2m ??= new TTLCache(120_000));

export const MEDELLIN_LAT = 6.2442;
export const MEDELLIN_LON = -75.5812;

const SIATA_AIR_PM25 = "https://siata.gov.co/EntregaData1/Datos_SIATA_Aire_pm25.json";
const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${MEDELLIN_LAT}&longitude=${MEDELLIN_LON}` +
  "&current=temperature_2m,precipitation,wind_speed_10m,relative_humidity_2m" +
  "&hourly=precipitation_probability&timezone=America/Bogota&forecast_days=1";

const ICA_CATEGORIES: Array<[number, string, string]> = [
  [50, "Buena", "#00E400"],
  [100, "Moderada", "#FFFF00"],
  [150, "Dañina grupos sensibles", "#FF7E00"],
  [200, "Dañina", "#FF0000"],
  [300, "Muy dañina", "#8F3F97"],
  [999, "Peligrosa", "#7E0023"],
];

const TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Convert PM2.5 (µg/m³) into an EPA AQI (ICA) index + category + color. */
export function icaInfo(pm25: number): [number, string, string] {
  const breakpoints: Array<[number, number, number, number]> = [
    [0, 12.0, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];
  let ica = 500;
  for (const [cLo, cHi, iLo, iHi] of breakpoints) {
    if (pm25 >= cLo && pm25 <= cHi) {
      ica = Math.round(((iHi - iLo) / (cHi - cLo)) * (pm25 - cLo) + iLo);
      break;
    }
  }
  for (const [threshold, cat, color] of ICA_CATEGORIES) {
    if (ica <= threshold) return [ica, cat, color];
  }
  return [ica, "Peligrosa", "#7E0023"];
}

export interface AirStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  pm25: number;
  ica: number;
  ica_categoria: string;
  ica_color: string;
  timestamp: string;
  source: string;
}

export async function fetchAirQuality(): Promise<AirStation[]> {
  const cached = cache5m.get("air_quality") as AirStation[] | null;
  if (cached) return cached;

  try {
    const raw = (await fetchJson(SIATA_AIR_PM25)) as Record<string, unknown>[];
    const stations: AirStation[] = [];
    for (const item of raw) {
      try {
        const quality = Number(item["calidad"] ?? 0);
        if (quality > 2.5) continue;
        const pm25 = Number(item["pm25"] ?? item["valor"] ?? 0);
        const [ica, categoria, color] = icaInfo(pm25);
        stations.push({
          id: String(item["codigoSerial"] ?? ""),
          name: String(item["nombre"] ?? "Estación SIATA"),
          lat: Number(item["latitud"] ?? 0),
          lon: Number(item["longitud"] ?? 0),
          pm25,
          ica,
          ica_categoria: categoria,
          ica_color: color,
          timestamp: String(item["marca_tiempo"] ?? ""),
          source: "siata",
        });
      } catch {
        continue;
      }
    }
    cache5m.set("air_quality", stations);
    return stations;
  } catch (e) {
    console.warn("[siata] air quality falló, retornando vacío:", String(e));
    return [];
  }
}

export interface WeatherData {
  temperatura_c: number;
  precipitacion_mmh: number;
  viento_kmh: number;
  humedad_pct: number;
  probabilidad_lluvia_pct: number;
  source: string | null;
  error?: string;
}

export async function fetchWeatherCurrent(): Promise<WeatherData> {
  const cached = cache5m.get("weather") as WeatherData | null;
  if (cached) return cached;

  try {
    const data = (await fetchJson(OPEN_METEO_URL)) as {
      current?: Record<string, number>;
      hourly?: { precipitation_probability?: number[] };
    };
    const current = data.current ?? {};
    const precipProb = data.hourly?.precipitation_probability?.[0] ?? 0;
    const result: WeatherData = {
      temperatura_c: current["temperature_2m"] ?? 20,
      precipitacion_mmh: current["precipitation"] ?? 0,
      viento_kmh: current["wind_speed_10m"] ?? 0,
      humedad_pct: current["relative_humidity_2m"] ?? 70,
      probabilidad_lluvia_pct: precipProb,
      source: "open-meteo",
    };
    cache5m.set("weather", result);
    return result;
  } catch (e) {
    console.error("[siata] Open-Meteo falló:", String(e));
    return {
      temperatura_c: 20,
      precipitacion_mmh: 0,
      viento_kmh: 0,
      humedad_pct: 70,
      probabilidad_lluvia_pct: 0,
      source: null,
      error: "weather_unavailable",
    };
  }
}

export interface SiataAlert {
  id: string;
  tipo: string;
  nivel: "amarillo" | "naranja" | "rojo";
  descripcion: string;
  poligono: unknown;
  vigente_hasta: string | null;
  source: string;
}

export async function fetchAlertsActive(): Promise<SiataAlert[]> {
  const cached = cache2m.get("alerts") as SiataAlert[] | null;
  if (cached) return cached;

  const weather = await fetchWeatherCurrent();
  const alerts: SiataAlert[] = [];
  const rain = weather.precipitacion_mmh ?? 0;

  if (rain >= 15) {
    alerts.push({
      id: "alert_lluvia_001",
      tipo: "lluvia_intensa",
      nivel: "rojo",
      descripcion: `Lluvia intensa: ${rain.toFixed(1)}mm/h en el Valle de Aburrá`,
      poligono: null,
      vigente_hasta: null,
      source: "open-meteo-derived",
    });
  } else if (rain >= 5) {
    alerts.push({
      id: "alert_lluvia_002",
      tipo: "lluvia_intensa",
      nivel: "amarillo",
      descripcion: `Lluvia moderada: ${rain.toFixed(1)}mm/h`,
      poligono: null,
      vigente_hasta: null,
      source: "open-meteo-derived",
    });
  }

  const airStations = await fetchAirQuality();
  const maxIca = airStations.reduce((m, s) => Math.max(m, s.ica), 0);
  if (maxIca > 150) {
    alerts.push({
      id: "alert_aire_001",
      tipo: "calidad_aire",
      nivel: maxIca <= 200 ? "naranja" : "rojo",
      descripcion: `Calidad del aire: ICA ${maxIca} — Dañina para grupos sensibles`,
      poligono: null,
      vigente_hasta: null,
      source: "siata",
    });
  }

  cache2m.set("alerts", alerts);
  return alerts;
}

export function getCacheAge(key: string, cache: TTLCache): number | null {
  return cache.ageSeconds(key);
}

export function exerciseReco(ica: number): {
  apto_ejercicio: boolean;
  nivel: string;
  mensaje: string;
  color: string;
} {
  if (ica <= 50)
    return { apto_ejercicio: true, nivel: "ideal", mensaje: "Ideal para ejercicio al aire libre", color: "#10B981" };
  if (ica <= 100)
    return { apto_ejercicio: true, nivel: "aceptable", mensaje: "Aceptable para actividad física", color: "#FBBF24" };
  if (ica <= 150)
    return { apto_ejercicio: false, nivel: "sensibles", mensaje: "Grupos sensibles: evita esfuerzo prolongado", color: "#FB923C" };
  if (ica <= 200)
    return { apto_ejercicio: false, nivel: "dañina", mensaje: "Evita ejercicio intenso al aire libre", color: "#EF4444" };
  if (ica <= 300)
    return { apto_ejercicio: false, nivel: "muy_dañina", mensaje: "No recomendable ejercitarse afuera", color: "#8F3F97" };
  return { apto_ejercicio: false, nivel: "peligrosa", mensaje: "Evita toda actividad al aire libre", color: "#7E0023" };
}
