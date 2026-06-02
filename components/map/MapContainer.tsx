"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, MapMouseEvent, MapTouchEvent, StyleSpecification } from "maplibre-gl";
import { MEDELLIN_CENTER, MEDELLIN_ZOOM } from "@/lib/constants";
import { useUiStore, type MapTheme } from "@/lib/store/uiStore";

interface MapContainerProps {
  onMapReady?: (map: MapLibreMap) => void;
  onMapClick?: (lat: number, lon: number) => void;
  onLongPress?: (lat: number, lon: number) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Colorful basemap. Uses MapTiler Streets (vector) if a key is present,
 * otherwise CARTO Voyager (colorful raster, free, no key required).
 */
const cartoTiles = (style: string) => [
  `https://a.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
  `https://b.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
  `https://c.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
  `https://d.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
];

/** Background fill shown while tiles load — matches each base so there's no flash. */
const BG_COLOR: Record<MapTheme, string> = {
  beige: "#F3EFE6",
  gray: "#EBEBEB",
  dark: "#0B0F17",
};

/** Three bases — beige (Google-Maps-like, Voyager), clean gray (Positron) and
 *  dark (Dark Matter, makes glow/route overlays pop, §6.1). We toggle visibility
 *  instead of setStyle() so overlays survive a theme change. */
function buildStyle(theme: MapTheme): StyleSpecification {
  return {
    version: 8,
    name: "Brújula",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      carto_beige: {
        type: "raster", tiles: cartoTiles("rastertiles/voyager"), tileSize: 256,
        attribution: "© OpenStreetMap · © CARTO", maxzoom: 20,
      },
      carto_gray: {
        type: "raster", tiles: cartoTiles("light_all"), tileSize: 256,
        attribution: "© OpenStreetMap · © CARTO", maxzoom: 20,
      },
      carto_dark: {
        type: "raster", tiles: cartoTiles("dark_all"), tileSize: 256,
        attribution: "© OpenStreetMap · © CARTO", maxzoom: 20,
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": BG_COLOR[theme] } },
      {
        id: "base-beige", type: "raster", source: "carto_beige",
        layout: { visibility: theme === "beige" ? "visible" : "none" },
        // Warm it slightly toward Google-Maps beige
        paint: { "raster-opacity": 1, "raster-saturation": -0.05, "raster-hue-rotate": -6, "raster-brightness-min": 0.02 },
      },
      {
        id: "base-gray", type: "raster", source: "carto_gray",
        layout: { visibility: theme === "gray" ? "visible" : "none" },
        paint: { "raster-opacity": 1 },
      },
      {
        id: "base-dark", type: "raster", source: "carto_dark",
        layout: { visibility: theme === "dark" ? "visible" : "none" },
        paint: { "raster-opacity": 1 },
      },
    ],
  } as StyleSpecification;
}

export default function MapContainer({
  onMapReady,
  onMapClick,
  onLongPress,
  className = "",
  children,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressRef = useRef<{ lat: number; lon: number } | null>(null);
  const movedRef = useRef(false);
  const mapTheme = useUiStore((s) => s.mapTheme);

  // Toggle base layers when theme changes (no setStyle → overlays survive)
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    try {
      if (m.getLayer("base-beige")) m.setLayoutProperty("base-beige", "visibility", mapTheme === "beige" ? "visible" : "none");
      if (m.getLayer("base-gray")) m.setLayoutProperty("base-gray", "visibility", mapTheme === "gray" ? "visible" : "none");
      if (m.getLayer("base-dark")) m.setLayoutProperty("base-dark", "visibility", mapTheme === "dark" ? "visible" : "none");
      if (m.getLayer("bg")) m.setPaintProperty("bg", "background-color", BG_COLOR[mapTheme]);
    } catch {}
  }, [mapTheme]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MapLibreMap;

    import("maplibre-gl").then(({ Map }) => {
      map = new Map({
        container: containerRef.current!,
        style: buildStyle(useUiStore.getState().mapTheme) as never,
        center: MEDELLIN_CENTER,
        zoom: MEDELLIN_ZOOM,
        minZoom: 10,
        maxZoom: 19,
        attributionControl: { compact: true },
      });

      map.on("load", () => {
        mapRef.current = map;
        onMapReady?.(map);
      });

      map.on("click", (e: MapMouseEvent) => onMapClick?.(e.lngLat.lat, e.lngLat.lng));

      const start = (lat: number, lon: number) => {
        movedRef.current = false;
        pressRef.current = { lat, lon };
        timerRef.current = setTimeout(() => {
          if (pressRef.current && !movedRef.current) {
            onLongPress?.(pressRef.current.lat, pressRef.current.lon);
            if ("vibrate" in navigator) navigator.vibrate(25);
          }
        }, 500);
      };
      const cancel = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        pressRef.current = null;
      };

      map.on("touchstart", (e: MapTouchEvent) => start(e.lngLat.lat, e.lngLat.lng));
      map.on("touchend", cancel);
      map.on("touchmove", () => { movedRef.current = true; cancel(); });
      map.on("dragstart", () => { movedRef.current = true; cancel(); });
    });

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {children}
    </div>
  );
}
