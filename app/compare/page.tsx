"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { compararAlgoritmos, type RouteResponse } from "@/lib/api/routes";
import { formatDistance, formatDuration, riskLabel, riskToColor } from "@/lib/utils";
import { LogoWithWordmark } from "@/components/brand/Logo";

const MapContainer = dynamic(() => import("@/components/map/MapContainer"), { ssr: false });
const RouteLayer = dynamic(() => import("@/components/map/RouteLayer"), { ssr: false });

// Demo comparison: fixed endpoints
const DEMO = {
  origenLat: 6.2096, origenLon: -75.5697,   // Parque Lleras
  destinoLat: 6.2520, destinoLon: -75.5690,  // Centro
};

const ALGO_COLORS: Record<string, string> = {
  "A*": "#34D399",
  Dijkstra: "#60A5FA",
  Greedy: "#FBBF24",
};

export default function ComparePage() {
  const [maps, setMaps] = useState<Record<string, MapLibreMap | null>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["compare", DEMO],
    queryFn: () => compararAlgoritmos(
      DEMO.origenLat, DEMO.origenLon,
      DEMO.destinoLat, DEMO.destinoLon,
    ),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border-subtle glass sticky top-0 z-10 pt-safe">
        <Link href="/route" className="touch-target text-text-tertiary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <LogoWithWordmark size={22} />
        <span className="text-text-secondary text-sm ml-1">Comparación</span>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Calculando rutas...
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center text-risk-high text-sm">
          Error cargando comparación. ¿Está corriendo el backend?
        </div>
      )}

      {data && (
        <>
          {/* Info banner */}
          <div className="px-4 py-3 text-xs text-text-tertiary border-b border-border-subtle">
            Parque Lleras → Centro Histórico · mismo origen/destino, distintos algoritmos
          </div>

          {/* Maps grid */}
          <div className="flex-1 grid md:grid-cols-3 divide-x divide-border-subtle min-h-[50vh]">
            {data.map((ruta) => (
              <div key={ruta.algoritmo} className="flex flex-col">
                <MapContainer
                  className="flex-1 min-h-[45vh]"
                  onMapReady={(m) => setMaps((prev) => ({ ...prev, [ruta.algoritmo]: m }))}
                >
                  <RouteLayer
                    map={maps[ruta.algoritmo] ?? null}
                    route={ruta}
                    color={ALGO_COLORS[ruta.algoritmo] ?? "var(--accent)"}
                  />
                </MapContainer>

                {/* Metrics card */}
                <AlgoCard ruta={ruta} color={ALGO_COLORS[ruta.algoritmo] ?? "var(--accent)"} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AlgoCard({ ruta, color }: { ruta: RouteResponse; color: string }) {
  return (
    <div
      className="p-4 border-t"
      style={{ borderColor: color, borderTopWidth: 2, background: "var(--bg-surface)" }}
    >
      <h3 className="font-semibold text-sm mb-3" style={{ color }}>
        {ruta.algoritmo}
      </h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Tiempo" value={formatDuration(ruta.duracion_estimada_min)} />
        <Stat label="Distancia" value={formatDistance(ruta.distancia_total_m)} />
        <Stat label="Riesgo" value={riskLabel(ruta.riesgo_promedio)} valueColor={riskToColor(ruta.riesgo_promedio)} />
        <Stat label="Cálculo" value={`${ruta.tiempo_ms.toFixed(1)}ms`} />
        <Stat label="Nodos" value={ruta.nodos_explorados.toLocaleString()} />
        <Stat label="Encontrada" value={ruta.encontrada ? "Sí" : "No"} />
      </div>
    </div>
  );
}

function Stat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p className="text-text-tertiary">{label}</p>
      <p className="font-mono font-semibold" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </p>
    </div>
  );
}
