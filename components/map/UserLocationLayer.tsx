"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

const SRC = "userloc-src";
const ACC_SRC = "userloc-acc-src";
const DOT = "userloc-dot";
const PULSE = "userloc-pulse";
const ACC = "userloc-acc";

interface Props {
  map: MapLibreMap | null;
  active: boolean;
  onFix?: (lat: number, lon: number, accuracy: number) => void;
  onError?: (msg: string) => void;
}

/** Geodesic circle polygon (~32-gon) of `radiusM` meters around a point. */
function circlePolygon(lat: number, lon: number, radiusM: number) {
  const pts: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLon = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * 2 * Math.PI;
    pts.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [pts] }, properties: {} };
}

export default function UserLocationLayer({ map, active, onFix, onError }: Props) {
  const watchId = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const firstFix = useRef(false);

  useEffect(() => {
    if (!map) return;

    const cleanup = () => {
      if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
      if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; }
      [DOT, PULSE, ACC].forEach((id) => { try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none"); } catch {} });
    };

    if (!active) { cleanup(); return; }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      onError?.("La ubicación necesita HTTPS. Toca el mapa para marcar tu punto.");
      return;
    }
    if (!navigator.geolocation) { onError?.("Geolocalización no disponible"); return; }

    firstFix.current = false;

    const ensureLayers = () => {
      if (!map.getSource(ACC_SRC)) {
        map.addSource(ACC_SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } as never });
        map.addLayer({
          id: ACC, type: "fill", source: ACC_SRC,
          paint: { "fill-color": "#1A73E8", "fill-opacity": 0.14 },
        });
      }
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } as never });
        map.addLayer({
          id: PULSE, type: "circle", source: SRC,
          paint: { "circle-radius": 12, "circle-color": "#1A73E8", "circle-opacity": 0.3 },
        });
        map.addLayer({
          id: DOT, type: "circle", source: SRC,
          paint: {
            "circle-radius": 7,
            "circle-color": "#1A73E8",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2.5,
          },
        });
      }
      [DOT, PULSE, ACC].forEach((id) => { try { map.setLayoutProperty(id, "visibility", "visible"); } catch {} });
    };

    ensureLayers();

    // Breathing pulse on the outer ring (respect reduced motion)
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let t = 0;
      const loop = () => {
        if (map.getLayer(PULSE)) {
          t += 0.05;
          const r = 12 + 8 * (0.5 + 0.5 * Math.sin(t));
          const o = 0.35 - 0.3 * (0.5 + 0.5 * Math.sin(t));
          map.setPaintProperty(PULSE, "circle-radius", r);
          map.setPaintProperty(PULSE, "circle-opacity", Math.max(0, o));
        }
        rafId.current = requestAnimationFrame(loop);
      };
      rafId.current = requestAnimationFrame(loop);
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        const pt = { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: {} };
        (map.getSource(SRC) as { setData?: (d: unknown) => void })?.setData?.({ type: "FeatureCollection", features: [pt] });
        (map.getSource(ACC_SRC) as { setData?: (d: unknown) => void })?.setData?.({
          type: "FeatureCollection",
          features: [circlePolygon(lat, lon, Math.min(accuracy || 30, 200))],
        });
        onFix?.(lat, lon, accuracy || 0);
        if (!firstFix.current) {
          firstFix.current = true;
          map.flyTo({ center: [lon, lat], zoom: 16, duration: 900 });
        }
      },
      (err) => onError?.(err.code === 1 ? "Permiso de ubicación denegado" : "No se pudo obtener tu ubicación"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return cleanup;
  }, [map, active]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
