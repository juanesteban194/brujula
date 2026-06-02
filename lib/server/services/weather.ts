/**
 * Weather service (§1 v3). OpenWeatherMap is the primary source; Open-Meteo is a
 * key-less fallback so the badge always shows real data even without a key.
 * The API key lives server-side only and is never sent to the client.
 */

export interface WeatherCurrent {
  temperatura_c: number;
  descripcion: string;
  emoji: string;
  precipitacion_mmh: number;
  viento_kmh: number;
  humedad_pct: number;
  probabilidad_lluvia_pct: number;
  source: "openweather" | "open-meteo";
  cache_age_seconds?: number;
}

export const MEDELLIN_LAT = 6.2442;
export const MEDELLIN_LON = -75.5812;

const TTL_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 8000;

type CacheEntry = { ts: number; val: WeatherCurrent };
const g = globalThis as unknown as { __weatherCache?: Map<string, CacheEntry> };
const cache = (g.__weatherCache ??= new Map());

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Pick an emoji + label from precipitation + (optional) WMO/clear hints. */
function describe(precipMmh: number, clearHint: boolean, label?: string): { emoji: string; descripcion: string } {
  if (precipMmh >= 4) return { emoji: "🌧️", descripcion: label ?? "Lluvia fuerte" };
  if (precipMmh >= 0.5) return { emoji: "🌦️", descripcion: label ?? "Lluvia ligera" };
  if (precipMmh > 0) return { emoji: "🌦️", descripcion: label ?? "Llovizna" };
  if (clearHint) return { emoji: "☀️", descripcion: label ?? "Despejado" };
  return { emoji: "⛅", descripcion: label ?? "Parcialmente nublado" };
}

async function fromOpenWeather(lat: number, lon: number, key: string): Promise<WeatherCurrent> {
  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
    `&units=metric&lang=es&appid=${key}`;
  const j = (await fetchJson(url)) as {
    main?: { temp?: number; humidity?: number };
    wind?: { speed?: number };
    rain?: { "1h"?: number };
    clouds?: { all?: number };
    weather?: Array<{ description?: string; main?: string }>;
  };
  const precip = j.rain?.["1h"] ?? 0;
  const label = j.weather?.[0]?.description;
  const clear = (j.weather?.[0]?.main ?? "").toLowerCase() === "clear" || (j.clouds?.all ?? 100) < 20;
  const { emoji, descripcion } = describe(precip, clear, label ? cap(label) : undefined);
  return {
    temperatura_c: Math.round(j.main?.temp ?? 0),
    descripcion,
    emoji,
    precipitacion_mmh: precip,
    viento_kmh: Math.round((j.wind?.speed ?? 0) * 3.6),
    humedad_pct: Math.round(j.main?.humidity ?? 0),
    probabilidad_lluvia_pct: 0, // not in current-weather endpoint
    source: "openweather",
  };
}

async function fromOpenMeteo(lat: number, lon: number): Promise<WeatherCurrent> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,precipitation,wind_speed_10m,relative_humidity_2m,weather_code` +
    `&hourly=precipitation_probability&timezone=America/Bogota&forecast_days=1`;
  const j = (await fetchJson(url)) as {
    current?: { temperature_2m?: number; precipitation?: number; wind_speed_10m?: number; relative_humidity_2m?: number; weather_code?: number };
    hourly?: { precipitation_probability?: number[] };
  };
  const c = j.current ?? {};
  const precip = c.precipitation ?? 0;
  const code = c.weather_code ?? 0;
  const prob = j.hourly?.precipitation_probability?.[new Date().getHours()] ?? 0;
  const { emoji, descripcion } = wmo(code, precip);
  return {
    temperatura_c: Math.round(c.temperature_2m ?? 0),
    descripcion,
    emoji,
    precipitacion_mmh: precip,
    viento_kmh: Math.round(c.wind_speed_10m ?? 0),
    humedad_pct: Math.round(c.relative_humidity_2m ?? 0),
    probabilidad_lluvia_pct: Math.round(prob),
    source: "open-meteo",
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** WMO weather code → emoji + Spanish label (Open-Meteo). */
function wmo(code: number, precip: number): { emoji: string; descripcion: string } {
  if (code === 0) return { emoji: "☀️", descripcion: "Despejado" };
  if (code <= 3) return { emoji: "⛅", descripcion: "Parcialmente nublado" };
  if (code === 45 || code === 48) return { emoji: "🌫️", descripcion: "Niebla" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", descripcion: "Llovizna" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", descripcion: precip >= 4 ? "Lluvia fuerte" : "Lluvia" };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", descripcion: "Chubascos" };
  if (code >= 95) return { emoji: "⛈️", descripcion: "Tormenta" };
  return describe(precip, false);
}

/** Current weather with 5-min TTL cache; OpenWeatherMap → Open-Meteo fallback. */
export async function getCurrentWeather(lat = MEDELLIN_LAT, lon = MEDELLIN_LON): Promise<WeatherCurrent> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return { ...hit.val, cache_age_seconds: Math.floor((Date.now() - hit.ts) / 1000) };
  }

  const owKey = process.env.OPENWEATHER_API_KEY;
  let val: WeatherCurrent;
  try {
    val = owKey ? await fromOpenWeather(lat, lon, owKey) : await fromOpenMeteo(lat, lon);
  } catch {
    // OWM failed or quota hit → fall back to the key-less source.
    val = await fromOpenMeteo(lat, lon);
  }
  cache.set(key, { ts: Date.now(), val });
  return { ...val, cache_age_seconds: 0 };
}

export const OPENWEATHER_KEY_PRESENT = () => !!process.env.OPENWEATHER_API_KEY;
