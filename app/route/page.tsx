"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Navigation2, LocateFixed, Sun, CloudSun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import EmergencyButton from "@/components/controls/EmergencyButton";
import ReportFab from "@/components/controls/ReportFab";
import { useUiStore } from "@/lib/store/uiStore";
import { useRouteStore } from "@/lib/store/routeStore";
import { useLayersStore } from "@/lib/store/layersStore";
import { LogoCompact, Logo } from "@/components/brand/Logo";
import RouteBottomSheet from "@/components/controls/RouteBottomSheet";
import LayersPanel from "@/components/controls/LayersPanel";
import AlertsBanner from "@/components/controls/AlertsBanner";
import MapLegend from "@/components/controls/MapLegend";
import AirQualityWidget from "@/components/controls/AirQualityWidget";
import ComparisonHud from "@/components/metrics/ComparisonHud";
import { COMPARE_COLOR_BY_INDEX } from "@/lib/constants";

// MapLibre lazy-loaded (heavy)
const MapContainer = dynamic(() => import("@/components/map/MapContainer"), { ssr: false });
const RouteLayer = dynamic(() => import("@/components/map/RouteLayer"), { ssr: false });
const ExplorationLayer = dynamic(() => import("@/components/map/ExplorationLayer"), { ssr: false });
const RiskHeatmap = dynamic(() => import("@/components/map/RiskHeatmap"), { ssr: false });
const ReportsLayer = dynamic(() => import("@/components/map/ReportsLayer"), { ssr: false });
const CriticalZonesLayer = dynamic(() => import("@/components/map/CriticalZonesLayer"), { ssr: false });
const AirQualityLayer = dynamic(() => import("@/components/map/AirQualityLayer"), { ssr: false });
const WeatherLayer = dynamic(() => import("@/components/map/WeatherLayer"), { ssr: false });
const UserLocationLayer = dynamic(() => import("@/components/map/UserLocationLayer"), { ssr: false });
const EndpointsLayer = dynamic(() => import("@/components/map/EndpointsLayer"), { ssr: false });
const AlternativesLayer = dynamic(() => import("@/components/map/AlternativesLayer"), { ssr: false });

type ContextMenu = { lat: number; lon: number } | null;

// Map theme toggle metadata — icon for the current base + label of the next one.
const MAP_THEME_META = {
  beige: { Icon: Sun, label: "beige", next: "gris" },
  gray: { Icon: CloudSun, label: "gris", next: "oscuro" },
  dark: { Icon: Moon, label: "oscuro", next: "beige" },
} as const;

export default function RoutePage() {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [ctx, setCtx] = useState<ContextMenu>(null);
  const [tracking, setTracking] = useState(false);

  const { setOrigen, setDestino, resultado, alternativas, selectedAlternative, eventosExploracion, comparisonMode } = useRouteStore();
  const layers = useLayersStore();
  const mapTheme = useUiStore((s) => s.mapTheme);
  const toggleMapTheme = useUiStore((s) => s.toggleMapTheme);

  // Test hook for Playwright E2E (harmless in prod)
  useEffect(() => {
    (window as unknown as { __store?: unknown; __map?: unknown }).__store = useRouteStore;
    (window as unknown as { __store?: unknown; __map?: unknown }).__map = map;
  }, [map]);

  // Dim the risk heatmap when another color-coded layer is on
  const riskOpacity = layers.airQuality || layers.criticalZones ? 0.28 : 0.55;

  const handleClick = useCallback((lat: number, lon: number) => {
    const s = useRouteStore.getState();
    if (s.origen && !s.destino) setDestino({ lat, lon });
    else if (!s.origen) setOrigen({ lat, lon });
  }, [setOrigen, setDestino]);

  const handleLongPress = useCallback((lat: number, lon: number) => setCtx({ lat, lon }), []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* MAP */}
      <MapContainer
        className="map-fullscreen"
        onMapReady={setMap}
        onMapClick={handleClick}
        onLongPress={handleLongPress}
      >
        <RiskHeatmap map={map} visible={layers.riskHeatmap} opacity={riskOpacity} />
        <ReportsLayer map={map} visible={layers.communityReports} />
        <CriticalZonesLayer map={map} visible={layers.criticalZones} />
        <WeatherLayer map={map} visible={layers.weatherRain} />
        <AirQualityLayer map={map} visible={layers.airQuality} />
        <ExplorationLayer
          map={map}
          events={eventosExploracion}
          colors={comparisonMode ? COMPARE_COLOR_BY_INDEX : undefined}
        />
        <UserLocationLayer
          map={map}
          active={tracking}
          onFix={(lat, lon) => setOrigen({ lat, lon })}
          onError={(m) => { toast.error(m); setTracking(false); }}
        />
        {alternativas ? (
          <AlternativesLayer map={map} alternativas={alternativas} selected={selectedAlternative} />
        ) : (
          resultado && <RouteLayer map={map} route={resultado} />
        )}
        {/* Origin/destination markers — visible immediately, before calculating */}
        <EndpointsLayer map={map} />
      </MapContainer>

      {/* MAP LOADING OVERLAY */}
      {!map && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 pointer-events-none"
          style={{ background: "var(--bg-base)" }}
        >
          <div className="animate-pulse">
            <Logo size={56} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Cargando mapa…</p>
        </div>
      )}

      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 z-40 glass" style={{ paddingTop: "var(--safe-top)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/"><LogoCompact /></Link>
          <div className="flex items-center gap-2">
            {(() => {
              const tm = MAP_THEME_META[mapTheme];
              return (
                <button
                  onClick={toggleMapTheme}
                  aria-label={`Mapa ${tm.label}. Tocar para cambiar a ${tm.next}.`}
                  title={`Mapa ${tm.label} · tap: ${tm.next}`}
                  className="w-12 h-12 rounded-2xl glass flex items-center justify-center active:scale-95 transition-transform"
                  style={{ color: "var(--accent)" }}
                >
                  <tm.Icon className="w-5 h-5" />
                </button>
              );
            })()}
            <LayersPanel />
          </div>
        </div>
      </div>

      {/* Permanent air-quality widget (GPS-based) */}
      <AirQualityWidget />

      {/* SIATA alerts banner */}
      <AlertsBanner visible={layers.siataAlerts} />

      {/* Legend */}
      <MapLegend />

      {/* A* vs Dijkstra live scoreboard (comparison mode) */}
      <ComparisonHud />

      {/* Right-side FAB stack */}
      <div
        className="absolute right-4 z-30 flex flex-col gap-3"
        style={{ bottom: "calc(150px + max(var(--safe-bottom), 16px))" }}
      >
        {/* Emergency 123 */}
        <EmergencyButton />
        {/* Report */}
        <ReportFab map={map} />
        {/* Locate / live tracking */}
        <button
          className="w-12 h-12 rounded-2xl glass flex items-center justify-center shadow-md active:scale-95 transition-transform"
          style={{ color: tracking ? "#1A73E8" : "var(--accent)", borderColor: tracking ? "#1A73E8" : undefined }}
          onClick={() => {
            if (tracking) {
              // recenter if already tracking
              const o = useRouteStore.getState().origen;
              if (o) map?.flyTo({ center: [o.lon, o.lat], zoom: 16, duration: 700 });
              else setTracking(false);
              return;
            }
            if (typeof window !== "undefined" && !window.isSecureContext) {
              toast.error("La ubicación necesita HTTPS", { description: "Toca el mapa para marcar tu punto." });
              return;
            }
            setTracking(true);
          }}
          aria-label={tracking ? "Recentrar en mi ubicación" : "Activar mi ubicación"}
        >
          {tracking ? <LocateFixed className="w-5 h-5" /> : <Navigation2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Long-press context menu */}
      {ctx && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtx(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute z-50 rounded-2xl glass-warm shadow-lg overflow-hidden"
            style={{ bottom: "calc(96px + 80px)", left: "50%", transform: "translateX(-50%)", minWidth: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                {ctx.lat.toFixed(5)}, {ctx.lon.toFixed(5)}
              </p>
            </div>
            {[
              { label: "Marcar como origen", color: "var(--route-fast)", fn: () => { setOrigen(ctx); setCtx(null); } },
              { label: "Marcar como destino", color: "var(--accent)", fn: () => { setDestino(ctx); setCtx(null); } },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={opt.fn}
                className="w-full px-4 py-3.5 text-left text-sm flex items-center gap-2.5 transition-colors hover:bg-bg-elevated"
                style={{ color: "var(--text-primary)" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                {opt.label}
              </button>
            ))}
          </motion.div>
        </>
      )}

      {/* Bottom sheet — controls on ALL viewports */}
      <RouteBottomSheet />
    </div>
  );
}
