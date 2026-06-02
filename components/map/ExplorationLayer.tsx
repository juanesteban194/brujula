"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { ExplorationEvent } from "@/lib/api/sse";
import { ROUTE_COLOR_BY_INDEX } from "@/lib/constants";

const SINGLE_COLOR = "#14B8A6"; // teal for single-route exploration

const SRC = "exploration-source";
const GLOW = "exploration-glow";
const CORE = "exploration-core";

interface Props {
  map: MapLibreMap | null;
  events: ExplorationEvent[];
  /** Per-`ruta` palette override (e.g. comparison mode). Defaults to alternatives palette. */
  colors?: string[];
}

export default function ExplorationLayer({ map, events, colors }: Props) {
  const rafId = useRef<number | null>(null);
  const shown = useRef(0);
  const prevLen = useRef(0);

  useEffect(() => {
    if (!map) return;

    const visits = events.filter((e) => e.tipo === "visit" && e.lat != null && e.lon != null);

    // Ensure layers exist
    const ensure = () => {
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } as never });
        map.addLayer({
          id: GLOW, type: "circle", source: SRC,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 6, 16, 14],
            "circle-color": ["get", "color"],
            "circle-blur": 1,
            "circle-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.55, 1, 0.08],
          },
        });
        map.addLayer({
          id: CORE, type: "circle", source: SRC,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 1.8, 16, 3.4],
            "circle-color": ["get", "color"],
            "circle-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.95, 1, 0.25],
          },
        });
      }
    };

    const setData = (n: number) => {
      const src = map.getSource(SRC) as { setData?: (d: unknown) => void } | undefined;
      if (!src?.setData) return;
      const slice = visits.slice(0, n);
      const total = Math.max(slice.length, 1);
      src.setData({
        type: "FeatureCollection",
        features: slice.map((e, i) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [e.lon, e.lat] },
          // age: 0 = freshly revealed (bright frontier), 1 = oldest (faded)
          properties: {
            age: 1 - i / total,
            color: e.ruta != null ? ((colors ?? ROUTE_COLOR_BY_INDEX)[e.ruta] ?? SINGLE_COLOR) : SINGLE_COLOR,
          },
        })),
      });
    };

    // Reset when a new calculation starts (events cleared / shrunk)
    if (visits.length < prevLen.current) {
      shown.current = 0;
      ensure();
      setData(0);
    }
    prevLen.current = visits.length;

    if (visits.length === 0) {
      if (map.getSource(SRC)) setData(0);
      if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; }
      return;
    }

    ensure();

    // Progressive reveal: unfold over ~1.4s regardless of how fast data arrived
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    const perFrame = Math.max(1, Math.ceil(visits.length / (1.4 * 60)));
    const loop = () => {
      if (!map.getSource(SRC)) return;
      shown.current = Math.min(shown.current + perFrame, visits.length);
      setData(shown.current);
      if (shown.current < visits.length) {
        rafId.current = requestAnimationFrame(loop);
      }
    };
    rafId.current = requestAnimationFrame(loop);

    return () => { if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; } };
  }, [map, events, colors]);

  return null;
}
