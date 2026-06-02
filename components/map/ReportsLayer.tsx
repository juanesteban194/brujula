"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import { getReports } from "@/lib/api/reports";

const SRC = "reports-src";
const LAYER = "reports-circles";
const GLOW = "reports-glow";

const COLORS: Record<string, string> = {
  acoso_verbal: "#F97316",
  zona_solitaria: "#FBBF24",
  iluminacion_deficiente: "#FCD34D",
  robo: "#EF4444",
  bien: "#34D399",
};

export default function ReportsLayer({ map, visible }: { map: MapLibreMap | null; visible: boolean }) {
  const { data } = useQuery({
    queryKey: ["reports-layer"],
    queryFn: () => getReports(),
    enabled: visible,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (!map || !data) return;

    const fc = {
      type: "FeatureCollection",
      features: data.map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lon, r.lat] },
        properties: { color: COLORS[r.type] ?? "#A78BFA", severity: r.severity },
      })),
    };

    const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) {
      src.setData(fc);
    } else {
      map.addSource(SRC, { type: "geojson", data: fc as never });
      map.addLayer({
        id: GLOW,
        type: "circle",
        source: SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 6, 16, 16],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.18,
          "circle-blur": 1,
        },
      });
      map.addLayer({
        id: LAYER,
        type: "circle",
        source: SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3.5, 16, 7],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.95,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#FFFFFF",
        },
      });
    }
  }, [map, data]);

  useEffect(() => {
    if (!map) return;
    const vis = visible ? "visible" : "none";
    [LAYER, GLOW].forEach((id) => {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis); } catch {}
    });
  }, [map, visible, data]);

  return null;
}
