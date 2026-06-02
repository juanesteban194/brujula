"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import { getAirQuality, type AirStation } from "@/lib/api/siata";

const SRC = "air-src";
const HEAT = "air-heat";
const POINT = "air-point";

// Demo stations so the toggle always shows data even if SIATA is unreachable.
const DEMO: AirStation[] = [
  { id: "d1", name: "Centro", lat: 6.2518, lon: -75.5636, pm25: 38, ica: 108, ica_categoria: "Dañina (sensibles)", ica_color: "#FF7E00", timestamp: "" },
  { id: "d2", name: "El Poblado", lat: 6.2086, lon: -75.5660, pm25: 18, ica: 64, ica_categoria: "Moderada", ica_color: "#FFFF00", timestamp: "" },
  { id: "d3", name: "Laureles", lat: 6.2459, lon: -75.5990, pm25: 24, ica: 78, ica_categoria: "Moderada", ica_color: "#FFFF00", timestamp: "" },
  { id: "d4", name: "Belén", lat: 6.2300, lon: -75.6050, pm25: 30, ica: 90, ica_categoria: "Moderada", ica_color: "#FFFF00", timestamp: "" },
  { id: "d5", name: "Itagüí", lat: 6.1850, lon: -75.5990, pm25: 45, ica: 124, ica_categoria: "Dañina (sensibles)", ica_color: "#FF7E00", timestamp: "" },
  { id: "d6", name: "Bello", lat: 6.3370, lon: -75.5560, pm25: 12, ica: 50, ica_categoria: "Buena", ica_color: "#00E400", timestamp: "" },
];

export default function AirQualityLayer({ map, visible }: { map: MapLibreMap | null; visible: boolean }) {
  const { data } = useQuery({
    queryKey: ["siata", "air"],
    queryFn: () => getAirQuality(),
    enabled: visible,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!map) return;
    const stations = data?.stations?.length ? data.stations : DEMO;

    const fc = {
      type: "FeatureCollection",
      features: stations.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
        properties: { ica: s.ica, color: s.ica_color, name: s.name },
      })),
    };

    const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) {
      src.setData(fc);
    } else {
      map.addSource(SRC, { type: "geojson", data: fc as never });
      // Heatmap: stations blend their colours where their zones overlap
      map.addLayer({
        id: HEAT, type: "heatmap", source: SRC, maxzoom: 17,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "ica"], 0, 0.15, 300, 1],
          "heatmap-intensity": 0.9,
          "heatmap-opacity": 0.55,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 50, 13, 110, 16, 180],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0,    "rgba(0,0,0,0)",
            0.15, "rgba(0,228,0,0.45)",
            0.35, "rgba(255,255,0,0.50)",
            0.55, "rgba(255,126,0,0.58)",
            0.72, "rgba(255,0,0,0.62)",
            0.87, "rgba(143,63,151,0.66)",
            1.0,  "rgba(126,0,35,0.72)",
          ],
        },
      });
      // Small core dot per station for precision
      map.addLayer({
        id: POINT, type: "circle", source: SRC, minzoom: 12,
        paint: {
          "circle-radius": 4,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-opacity": 0.9,
        },
      });
    }
  }, [map, data]);

  useEffect(() => {
    if (!map) return;
    const vis = visible ? "visible" : "none";
    [HEAT, POINT].forEach((id) => { try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis); } catch {} });
  }, [map, visible, data]);

  return null;
}
