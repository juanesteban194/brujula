"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useRouteStore } from "@/lib/store/routeStore";

const SRC = "endpoints-src";
const HALO = "endpoints-halo";
const DOT = "endpoints-dot";

export default function EndpointsLayer({ map }: { map: MapLibreMap | null }) {
  const origen = useRouteStore((s) => s.origen);
  const destino = useRouteStore((s) => s.destino);

  useEffect(() => {
    if (!map) return;

    const features = [];
    if (origen) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [origen.lon, origen.lat] },
        properties: { tipo: "origen", color: "#1A73E8" },
      });
    }
    if (destino) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [destino.lon, destino.lat] },
        properties: { tipo: "destino", color: "#F59E0B" },
      });
    }
    const fc = { type: "FeatureCollection", features };

    const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) {
      src.setData(fc);
    } else {
      map.addSource(SRC, { type: "geojson", data: fc as never });
      map.addLayer({
        id: HALO, type: "circle", source: SRC,
        paint: {
          "circle-radius": 14,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.2,
          "circle-blur": 0.6,
        },
      });
      map.addLayer({
        id: DOT, type: "circle", source: SRC,
        paint: {
          "circle-radius": ["case", ["==", ["get", "tipo"], "destino"], 9, 7],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 3,
        },
      });
    }
  }, [map, origen, destino]);

  return null;
}
