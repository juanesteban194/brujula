"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import { getCompositeAlerts } from "@/lib/api/siata";

const SRC = "critical-src";
const HALO = "critical-halo";
const CORE = "critical-core";

const NIVEL_COLOR: Record<string, string> = {
  amarillo: "#FFB020",
  naranja: "#FF7E00",
  rojo: "#FF1744",
};

interface Feature {
  type: string;
  geometry: { type: string; coordinates: [number, number] };
  properties: { nivel?: string; score?: number };
}

export default function CriticalZonesLayer({ map, visible }: { map: MapLibreMap | null; visible: boolean }) {
  const { data } = useQuery({
    queryKey: ["alerts", "composite"],
    queryFn: () => getCompositeAlerts(),
    enabled: visible,
    staleTime: 120_000,
  });

  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!map || !data) return;

    const features = (data.features as Feature[])
      .filter((f) => f.geometry?.type === "Point")
      .map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          color: NIVEL_COLOR[f.properties.nivel ?? "rojo"] ?? "#FF1744",
        },
      }));

    const fc = { type: "FeatureCollection", features };
    const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) {
      src.setData(fc);
    } else {
      map.addSource(SRC, { type: "geojson", data: fc as never });
      map.addLayer({
        id: HALO, type: "circle", source: SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 28],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.22,
          "circle-blur": 1,
        },
      });
      map.addLayer({
        id: CORE, type: "circle", source: SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 6],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.95,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-opacity": 0.4,
        },
      });
    }
  }, [map, data]);

  useEffect(() => {
    if (!map) return;
    const vis = visible ? "visible" : "none";
    [HALO, CORE].forEach((id) => { try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis); } catch {} });

    const stop = () => { if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; } };
    stop();

    if (!visible) return;

    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (map.getLayer(HALO)) map.setPaintProperty(HALO, "circle-opacity", 0.28);
      return;
    }

    // Breathing alarm pulse on the halo — guard each frame (layer may not exist yet)
    let t = 0;
    const loop = () => {
      if (map.getLayer(HALO)) {
        t += 0.06;
        const o = 0.16 + 0.18 * (0.5 + 0.5 * Math.sin(t));
        map.setPaintProperty(HALO, "circle-opacity", o);
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);

    return stop;
  }, [map, visible, data]);

  return null;
}
