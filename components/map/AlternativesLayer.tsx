"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { AlternativesResponse } from "@/lib/api/routes";

import { ROUTE_COLORS } from "@/lib/constants";

const COLORS: Record<string, string> = {
  rapida: ROUTE_COLORS.rapida,
  segura: ROUTE_COLORS.segura,
  balanceada: ROUTE_COLORS.balanceada,
};

const N = 3;
const srcId = (i: number) => `alt-src-${i}`;
const casingId = (i: number) => `alt-casing-${i}`;
const coreId = (i: number) => `alt-core-${i}`;

interface Props {
  map: MapLibreMap | null;
  alternativas: AlternativesResponse | null;
  selected: number;
}

export default function AlternativesLayer({ map, alternativas, selected }: Props) {
  const rafId = useRef<number | null>(null);

  // Build / update the 3 route lines + animate the progressive draw
  useEffect(() => {
    if (!map) return;
    if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; }

    const rutas = alternativas?.rutas ?? [];
    const etiquetas = alternativas?.etiquetas ?? [];
    const allCoords: [number, number][] = [];

    for (let i = 0; i < N; i++) {
      const ruta = rutas[i];
      const color = COLORS[etiquetas[i]] ?? "#A78BFA";
      const coords = ruta?.encontrada ? ruta.coordenadas.map(([lat, lon]) => [lon, lat]) : [];
      if (coords.length) allCoords.push(...(coords as [number, number][]));
      const line = { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} };

      const src = map.getSource(srcId(i)) as { setData?: (d: unknown) => void } | undefined;
      if (src?.setData) {
        src.setData(line);
      } else {
        map.addSource(srcId(i), { type: "geojson", lineMetrics: true, data: line as never });
        map.addLayer({
          id: casingId(i), type: "line", source: srcId(i),
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": color, "line-width": 12, "line-blur": 8, "line-opacity": 0.0 },
        });
        map.addLayer({
          id: coreId(i), type: "line", source: srcId(i),
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-width": 5, "line-gradient": ["step", ["line-progress"], color, 0.0001, "rgba(0,0,0,0)"] },
        });
      }
      if (map.getLayer(casingId(i))) map.setPaintProperty(casingId(i), "line-color", color);
    }

    // Animate all routes drawing together
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const applyGradient = (i: number, p: number) => {
      if (!map.getLayer(coreId(i))) return;
      const color = COLORS[etiquetas[i]] ?? "#A78BFA";
      const has = rutas[i]?.encontrada && rutas[i]!.coordenadas.length > 1;
      if (!has) { map.setPaintProperty(coreId(i), "line-gradient", "rgba(0,0,0,0)"); return; }
      map.setPaintProperty(coreId(i), "line-gradient",
        p >= 1 ? color : ["step", ["line-progress"], color, Math.max(p, 0.0001), "rgba(0,0,0,0)"]);
    };

    if (reduce) {
      for (let i = 0; i < N; i++) applyGradient(i, 1);
    } else {
      let p = 0;
      const loop = () => {
        p += 0.03;
        for (let i = 0; i < N; i++) applyGradient(i, Math.min(p, 1));
        if (p < 1) rafId.current = requestAnimationFrame(loop);
      };
      rafId.current = requestAnimationFrame(loop);
    }

    // Fit to the union of all routes
    if (allCoords.length > 1) {
      import("maplibre-gl").then(({ LngLatBounds }) => {
        const b = allCoords.reduce((bb, c) => bb.extend(c), new LngLatBounds(allCoords[0], allCoords[0]));
        const leftPad = typeof window !== "undefined" && window.innerWidth >= 400 ? 380 : 60;
        map.fitBounds(b, { padding: { top: 120, bottom: 80, left: leftPad, right: 60 }, duration: 800, maxZoom: 16 });
      });
    }

    return () => { if (rafId.current != null) cancelAnimationFrame(rafId.current); };
  }, [map, alternativas]);

  // Highlight the selected route
  useEffect(() => {
    if (!map) return;
    for (let i = 0; i < N; i++) {
      const isSel = i === selected;
      try {
        if (map.getLayer(coreId(i))) {
          map.setPaintProperty(coreId(i), "line-width", isSel ? 6 : 3.5);
          map.setPaintProperty(coreId(i), "line-opacity", isSel ? 1 : 0.5);
        }
        if (map.getLayer(casingId(i))) {
          map.setPaintProperty(casingId(i), "line-opacity", isSel ? 0.4 : 0);
        }
        // Bring selected to front
        if (isSel && map.getLayer(coreId(i))) map.moveLayer(coreId(i));
      } catch {}
    }
  }, [map, selected, alternativas]);

  return null;
}
