import { apiGet } from "./client";

export interface WeatherData {
  temperatura_c: number;
  precipitacion_mmh: number;
  viento_kmh: number;
  humedad_pct: number;
  probabilidad_lluvia_pct: number;
  source: string;
  cache_age_seconds?: number;
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

export const getWeather = () => apiGet<WeatherData>("/api/siata/weather/current");

export const getAirQuality = () =>
  apiGet<{ stations: AirStation[]; count: number; cache_age_seconds: number }>(
    "/api/siata/air-quality"
  );

export interface NearestAir {
  disponible: boolean;
  estimado: boolean;
  name: string;
  lat: number;
  lon: number;
  pm25: number;
  ica: number;
  ica_categoria: string;
  ica_color: string;
  distancia_m: number;
  timestamp: string;
  cache_age_seconds: number | null;
  apto_ejercicio: boolean;
  nivel: string;
  mensaje: string;
  color: string;
}

export const getNearestAir = (lat: number, lon: number) =>
  apiGet<NearestAir>(`/api/siata/air-quality/nearest?lat=${lat}&lon=${lon}`);

export const getPrecipitation = () =>
  apiGet<{ type: string; features: unknown[]; source: string }>(
    "/api/siata/precipitation/grid"
  );

export const getAlerts = () =>
  apiGet<{ alerts: SiataAlert[]; count: number }>("/api/siata/alerts/active");

export const getCompositeAlerts = () =>
  apiGet<{ type: string; features: unknown[]; total: number }>(
    "/api/alerts/composite"
  );
