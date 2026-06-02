"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, MapPin, AlertTriangle, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import Link from "next/link";
import { getReports, voteReport, type Report } from "@/lib/api/reports";
import { LogoWithWordmark } from "@/components/brand/Logo";
import { formatDistance } from "date-fns";
import { es } from "date-fns/locale";

const MapContainer = dynamic(() => import("@/components/map/MapContainer"), { ssr: false });

const TYPE_LABELS: Record<string, string> = {
  acoso_verbal: "Acoso verbal",
  zona_solitaria: "Zona solitaria",
  iluminacion_deficiente: "Sin iluminación",
  robo: "Robo",
  bien: "Zona segura",
};

const TYPE_COLORS: Record<string, string> = {
  acoso_verbal: "var(--risk-high)",
  zona_solitaria: "var(--risk-mid)",
  iluminacion_deficiente: "var(--risk-mid)",
  robo: "var(--risk-extreme)",
  bien: "var(--risk-low)",
};

export default function ReportsPage() {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const qc = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => getReports(),
    staleTime: 2 * 60 * 1000,
  });

  const voteMut = useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: "confirm" | "deny" }) =>
      voteReport(id, vote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });

  // Add markers when map and reports are ready
  const addMarkers = (m: MapLibreMap) => {
    if (!m || !reports.length) return;
    import("maplibre-gl").then(({ Marker, Popup }) => {
      reports.forEach((rep) => {
        const el = document.createElement("div");
        el.className = "w-4 h-4 rounded-full border-2 border-bg-base cursor-pointer";
        el.style.background = TYPE_COLORS[rep.type] ?? "var(--accent)";
        el.onclick = () => setSelectedReport(rep);

        new Marker({ element: el })
          .setLngLat([rep.lon, rep.lat])
          .addTo(m);
      });
    });
  };

  return (
    <div className="fixed inset-0 bg-bg-base flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border-subtle glass z-10 pt-safe">
        <Link href="/" className="touch-target text-text-tertiary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <LogoWithWordmark size={22} />
        <span className="text-text-secondary text-sm">Reportes</span>
        <Link href="/reports/new" className="ml-auto touch-target text-accent hover:text-accent-hover">
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* Map */}
      <MapContainer
        className="flex-1"
        onMapReady={(m) => { setMap(m); addMarkers(m); }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      )}

      {/* Report detail sheet */}
      {selectedReport && (
        <div
          className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl p-5 pb-safe space-y-3"
          style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: TYPE_COLORS[selectedReport.type] }} />
                <h3 className="font-semibold text-sm">{TYPE_LABELS[selectedReport.type] ?? selectedReport.type}</h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{
                    background: `${TYPE_COLORS[selectedReport.type]}22`,
                    color: TYPE_COLORS[selectedReport.type],
                  }}
                >
                  Severidad {selectedReport.severity}/5
                </span>
              </div>
              {selectedReport.description && (
                <p className="text-sm text-text-secondary mt-1">{selectedReport.description}</p>
              )}
              <p className="text-xs text-text-tertiary mt-1">
                {formatDistance(new Date(selectedReport.timestamp), new Date(), { addSuffix: true, locale: es })}
                {" · "}
                {selectedReport.lat.toFixed(4)}, {selectedReport.lon.toFixed(4)}
              </p>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="touch-target text-text-tertiary"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => voteMut.mutate({ id: selectedReport.id, vote: "confirm" })}
              className="flex-1 h-11 rounded-xl bg-accent/10 text-accent border border-accent/30 text-sm flex items-center justify-center gap-2 hover:bg-accent/20 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              Confirmar ({selectedReport.votes.confirm})
            </button>
            <button
              onClick={() => voteMut.mutate({ id: selectedReport.id, vote: "deny" })}
              className="flex-1 h-11 rounded-xl bg-risk-high/10 text-risk-high border border-risk-high/30 text-sm flex items-center justify-center gap-2 hover:bg-risk-high/20 transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              Negar ({selectedReport.votes.deny})
            </button>
          </div>
        </div>
      )}

      {/* Reports count FAB */}
      {!selectedReport && (
        <div className="absolute bottom-4 left-4 pb-safe glass rounded-xl px-3 py-2 text-xs text-text-secondary">
          <MapPin className="w-3 h-3 inline mr-1" />
          {reports.length} reportes activos
        </div>
      )}
    </div>
  );
}
