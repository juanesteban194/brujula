import { NextResponse } from "next/server";

import { haversineM } from "@/lib/server/graph/haversine";
import {
  cache5m,
  exerciseReco,
  fetchAirQuality,
  getCacheAge,
} from "@/lib/server/services/siata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Air quality at the station nearest a GPS point, with an exercise recommendation. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ detail: "lat/lon requeridos" }, { status: 422 });
  }

  const stations = await fetchAirQuality();
  const age = getCacheAge("air_quality", cache5m);

  if (stations.length === 0) {
    const reco = exerciseReco(78);
    return NextResponse.json({
      disponible: true,
      estimado: true,
      name: "Estimación Valle de Aburrá",
      lat,
      lon,
      pm25: 22.0,
      ica: 78,
      ica_categoria: "Moderada",
      ica_color: "#FFFF00",
      distancia_m: 0,
      timestamp: "",
      cache_age_seconds: age,
      ...reco,
    });
  }

  let nearest = stations[0];
  let bestDist = haversineM(lat, lon, nearest.lat, nearest.lon);
  for (const s of stations) {
    const d = haversineM(lat, lon, s.lat, s.lon);
    if (d < bestDist) {
      bestDist = d;
      nearest = s;
    }
  }
  const reco = exerciseReco(nearest.ica);

  return NextResponse.json({
    disponible: true,
    estimado: false,
    name: nearest.name,
    lat: nearest.lat,
    lon: nearest.lon,
    pm25: nearest.pm25,
    ica: nearest.ica,
    ica_categoria: nearest.ica_categoria,
    ica_color: nearest.ica_color,
    distancia_m: Math.round(bestDist),
    timestamp: nearest.timestamp ?? "",
    cache_age_seconds: age,
    ...reco,
  });
}
