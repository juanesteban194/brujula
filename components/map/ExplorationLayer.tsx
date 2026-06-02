"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { ExplorationEvent } from "@/lib/api/sse";
import { ROUTE_COLOR_BY_INDEX, EXPLORE_REVEAL_MS } from "@/lib/constants";

// Turquoise for single-route exploration (clearly below the brand-green route).
const SINGLE_COLOR = "#5EE6C7";

const SRC = "exploration-edges";
const GLOW = "explore-glow";
const LINE = "explore-line";

// How long the frontier takes to fill in — deliberately slow & visible (§4).
// The final route is shown only after this completes (see routeStore).
const REVEAL_SECONDS = EXPLORE_REVEAL_MS / 1000;

interface Props {
  map: MapLibreMap | null;
  events: ExplorationEvent[];
  /** Per-`ruta` palette override (comparison mode). Defaults to alternatives palette. */
  colors?: string[];
  /** When a final route exists, dim the explored streets to a background tissue. */
  routeReady?: boolean;
}

export default function ExplorationLayer({ map, events, colors, routeReady = false }: Props) {
  const rafId = useRef<number | null>(null);
  const shown = useRef(0);
  const prevLen = useRef(0);

  useEffect(() => {
    if (!map) return;

    const edges = events.filter(
      (e) => e.tipo === "edge" && Array.isArray(e.coords) && e.coords.length >= 2,
    );

    const ensure = () => {
      if (map.getSource(SRC)) return;
      map.addSource(SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } as never });
      // Soft glow underneath gives the streets body.
      map.addLayer({
        id: GLOW, type: "line", source: SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 5, 16, 9],
          "line-blur": 6,
          "line-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.28, 1, 0.06],
        },
      });
      // Main explored-street stroke; the freshly revealed head is brighter.
      map.addLayer({
        id: LINE, type: "line", source: SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1.6, 16, 3.6],
          "line-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.78, 1, 0.34],
        },
      });
    };

    const palette = colors ?? ROUTE_COLOR_BY_INDEX;
    const setData = (n: number) => {
      const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
      if (!src?.setData) return;
      const slice = edges.slice(0, n);
      const total = Math.max(slice.length, 1);
      src.setData({
        type: "FeatureCollection",
        features: slice.map((e, i) => ({
          type: "Feature",
          geometry: { type: "LineString", coordinates: e.coords!.map(([lat, lon]) => [lon, lat]) },
          properties: {
            // age 0 = freshly painted (bright head), 1 = oldest (faded)
            age: 1 - i / total,
            color: e.ruta != null ? (palette[e.ruta] ?? SINGLE_COLOR) : SINGLE_COLOR,
          },
        })),
      });
    };

    // Reset when a new search starts (events cleared / shrank).
    if (edges.length < prevLen.current) {
      shown.current = 0;
      ensure();
      setData(0);
    }
    prevLen.current = edges.length;

    if (edges.length === 0) {
      if (map.getSource(SRC)) setData(0);
      if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; }
      return;
    }

    ensure();

    // Progressive reveal: streets light up from the origin over ~REVEAL_SECONDS.
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    const perFrame = Math.max(1, Math.ceil(edges.length / (REVEAL_SECONDS * 60)));
    const loop = () => {
      if (!map.getSource(SRC)) return;
      shown.current = Math.min(shown.current + perFrame, edges.length);
      setData(shown.current);
      if (shown.current < edges.length) rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);

    return () => { if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; } };
  }, [map, events, colors]);

  // Once the final route(s) are drawn, the exploration has served its purpose:
  // make it DISAPPEAR so only the valid route(s) remain on the map.
  useEffect(() => {
    if (!map || !routeReady) return;
    if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    shown.current = 0;
    const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) src.setData({ type: "FeatureCollection", features: [] });
  }, [map, routeReady]);

  return null;
}
