"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import { getRiskGeoJSON } from "@/lib/api/routes";

const SOURCE = "risk-heatmap-source";
const LAYER = "risk-heatmap-layer";

interface RiskHeatmapProps {
  map: MapLibreMap | null;
  visible: boolean;
  opacity?: number;
}

export default function RiskHeatmap({ map, visible, opacity = 0.55 }: RiskHeatmapProps) {
  const { data } = useQuery({
    queryKey: ["risk-geojson"],
    queryFn: getRiskGeoJSON,
    staleTime: Infinity,
  });

  // Add source + layer once data is available (guard against double-add)
  useEffect(() => {
    if (!map || !data) return;

    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: "geojson", data: data as never });
      map.addLayer({
        id: LAYER,
        type: "line",
        source: SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": [
            "interpolate", ["linear"], ["get", "risk_norm"],
            0.0,  "rgba(16, 185, 129, 0)",
            0.10, "rgba(16, 185, 129, 0.7)",
            0.40, "rgba(251, 191, 36, 0.85)",
            0.70, "rgba(249, 115, 22, 0.92)",
            0.90, "rgba(239, 68, 68, 0.96)",
            1.0,  "rgba(239, 68, 68, 1.0)",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1, 14, 2.5, 17, 5],
          "line-opacity": visible ? opacity : 0,
        },
      });
    } else {
      (map.getSource(SOURCE) as unknown as { setData: (d: unknown) => void }).setData(data);
    }

    // Apply current state right after ensuring the layer exists
    if (map.getLayer(LAYER)) {
      map.setLayoutProperty(LAYER, "visibility", visible ? "visible" : "none");
      map.setPaintProperty(LAYER, "line-opacity", visible ? opacity : 0);
    }
  }, [map, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to visibility / opacity changes — only if the layer actually exists
  useEffect(() => {
    if (!map || !map.getLayer(LAYER)) return;
    map.setLayoutProperty(LAYER, "visibility", visible ? "visible" : "none");
    map.setPaintProperty(LAYER, "line-opacity", visible ? opacity : 0);
  }, [map, visible, opacity]);

  return null;
}
