"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import { getPrecipitation } from "@/lib/api/siata";

const SRC = "rain-src";
const HEAT = "rain-heat";

interface RainFeature {
  type: string;
  geometry: { type: string; coordinates: [number, number] };
  properties: { precipitacion_mmh?: number };
}

export default function WeatherLayer({ map, visible }: { map: MapLibreMap | null; visible: boolean }) {
  const { data } = useQuery({
    queryKey: ["siata", "rain"],
    queryFn: () => getPrecipitation(),
    enabled: visible,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!map || !data) return;

    // Ensure there's always a touch of weight so the heat layer renders
    const features = (data.features as RainFeature[]).map((f) => ({
      ...f,
      properties: { mm: Math.max(0.2, f.properties.precipitacion_mmh ?? 0) },
    }));
    const fc = { type: "FeatureCollection", features };

    const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) {
      src.setData(fc);
    } else {
      map.addSource(SRC, { type: "geojson", data: fc as never });
      map.addLayer({
        id: HEAT,
        type: "heatmap",
        source: SRC,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "mm"], 0, 0.1, 15, 1],
          "heatmap-intensity": 1.1,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 30, 15, 80],
          "heatmap-opacity": 0.65,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0,    "rgba(135,206,250,0)",
            0.2,  "rgba(135,206,250,0.4)",
            0.45, "rgba(70,130,230,0.6)",
            0.7,  "rgba(30,70,200,0.75)",
            1.0,  "rgba(120,40,200,0.9)",
          ],
        },
      });
    }
  }, [map, data]);

  useEffect(() => {
    if (!map) return;
    try { if (map.getLayer(HEAT)) map.setLayoutProperty(HEAT, "visibility", visible ? "visible" : "none"); } catch {}
  }, [map, visible, data]);

  return null;
}
