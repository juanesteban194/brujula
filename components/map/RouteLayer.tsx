"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { RouteResponse } from "@/lib/api/routes";

const SRC = "route-src";
const CASING = "route-casing";
const CORE = "route-core";

// Calm, serene route color (deep teal) — clearly readable on beige/gray bases
const SERENE = "#0D9488";

export default function RouteLayer({
  map,
  route,
  color: colorOverride,
}: {
  map: MapLibreMap | null;
  route: RouteResponse | null;
  color?: string;
}) {
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;
    if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; }

    const ok = route?.encontrada && route.coordenadas.length > 1;
    const coords = ok ? route!.coordenadas.map(([lat, lon]) => [lon, lat]) : [];
    const color = colorOverride ?? SERENE;

    const line = { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} };

    // Source with lineMetrics for the gradient reveal
    const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) {
      src.setData(line);
    } else {
      map.addSource(SRC, { type: "geojson", lineMetrics: true, data: line as never });
      map.addLayer({
        id: CASING, type: "line", source: SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": color, "line-width": 13, "line-blur": 8, "line-opacity": 0.35 },
      });
      map.addLayer({
        id: CORE, type: "line", source: SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-width": 5, "line-gradient": ["step", ["line-progress"], color, 0.0001, "rgba(0,0,0,0)"] },
      });
    }

    if (!ok) {
      if (map.getLayer(CASING)) map.setPaintProperty(CASING, "line-opacity", 0);
      return;
    }

    if (map.getLayer(CASING)) {
      map.setPaintProperty(CASING, "line-color", color);
      map.setPaintProperty(CASING, "line-opacity", 0.35);
    }

    // Animated "draw" reveal via line-progress
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (map.getLayer(CORE)) map.setPaintProperty(CORE, "line-gradient", color);
    } else {
      let p = 0;
      const loop = () => {
        if (!map.getLayer(CORE)) return;
        p += 0.03;
        const clamped = Math.min(p, 1);
        map.setPaintProperty(CORE, "line-gradient",
          clamped >= 1 ? color : ["step", ["line-progress"], color, clamped, "rgba(0,0,0,0)"]);
        if (p < 1) rafId.current = requestAnimationFrame(loop);
      };
      rafId.current = requestAnimationFrame(loop);
    }

    // Fit bounds
    import("maplibre-gl").then(({ LngLatBounds }) => {
      const b = coords.reduce((bb, c) => bb.extend(c as [number, number]), new LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]));
      const leftPad = typeof window !== "undefined" && window.innerWidth >= 400 ? 380 : 60;
      map.fitBounds(b, { padding: { top: 120, bottom: 80, left: leftPad, right: 60 }, duration: 800, maxZoom: 16 });
    });

    return () => { if (rafId.current != null) cancelAnimationFrame(rafId.current); };
  }, [map, route]);

  return null;
}
