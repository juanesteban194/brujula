"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2, Shield, MapPin, Route, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api/client";
import { LogoWithWordmark } from "@/components/brand/Logo";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface AdminStats {
  total_reportes: number;
  reportes_activos: number;
  reportes_7d: number;
  rutas_calculadas: number;
  por_tipo: Record<string, number>;
  hotspot: [number, number] | null;
}

const TYPE_COLORS: Record<string, string> = {
  acoso_verbal: "#FF4D5E",
  robo: "#C1273D",
  zona_solitaria: "#FFB020",
  iluminacion_deficiente: "#FFB020",
  bien: "#00E5A0",
};

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("brujula:admin:token") : null;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    setToken(getToken());
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats", token],
    queryFn: () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json() as Promise<AdminStats>;
      }),
    enabled: !!token,
    retry: false,
  });

  const handleLogin = () => {
    localStorage.setItem("brujula:admin:token", inputToken);
    setToken(inputToken);
  };

  if (!token || (stats === undefined && !isLoading)) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-xs space-y-4">
          <div className="flex items-center justify-center mb-6">
            <LogoWithWordmark size={28} />
          </div>
          <h2 className="text-xl font-semibold text-center">Acceso Admin</h2>
          <input
            type="password"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Token de administrador"
            className="w-full h-12 px-4 rounded-xl bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            style={{ fontSize: 16 }}
            autoComplete="current-password"
          />
          <button
            onClick={handleLogin}
            className="w-full h-12 rounded-xl bg-accent text-bg-base font-semibold hover:bg-accent-hover transition-colors"
          >
            Ingresar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border-subtle glass sticky top-0 z-10 pt-safe">
        <Link href="/" className="touch-target text-text-tertiary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <LogoWithWordmark size={22} />
        <span className="text-text-secondary text-sm">Admin</span>
        <button
          onClick={() => { localStorage.removeItem("brujula:admin:token"); setToken(null); }}
          className="ml-auto text-xs text-text-tertiary hover:text-risk-high transition-colors"
        >
          Salir
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando datos...
        </div>
      ) : stats ? (
        <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard icon={<AlertTriangle className="w-5 h-5 text-risk-high" />} label="Total reportes" value={stats.total_reportes} />
            <KPICard icon={<MapPin className="w-5 h-5 text-accent" />} label="Activos" value={stats.reportes_activos} />
            <KPICard icon={<Shield className="w-5 h-5 text-route-safe" />} label="Últimos 7d" value={stats.reportes_7d} />
            <KPICard icon={<Route className="w-5 h-5 text-route-fast" />} label="Rutas calculadas" value={stats.rutas_calculadas} />
          </div>

          {/* Chart */}
          <div className="rounded-2xl bg-bg-surface border border-border-subtle p-4">
            <h3 className="text-sm font-semibold mb-4">Reportes por tipo</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={Object.entries(stats.por_tipo).map(([k, v]) => ({ name: k, count: v }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {Object.entries(stats.por_tipo).map(([key]) => (
                    <Cell key={key} fill={TYPE_COLORS[key] ?? "var(--accent)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {stats.hotspot && (
            <div className="rounded-xl bg-bg-surface border border-border-subtle p-4 text-sm">
              <p className="text-text-tertiary text-xs mb-1">Hotspot con más reportes</p>
              <p className="font-mono">
                {stats.hotspot[0]}, {stats.hotspot[1]}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-risk-high text-sm">
          No autorizado. Token inválido.
        </div>
      )}
    </div>
  );
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-bg-surface border border-border-subtle p-4 flex flex-col gap-2">
      {icon}
      <p className="font-mono font-bold text-2xl">{value.toLocaleString()}</p>
      <p className="text-xs text-text-tertiary">{label}</p>
    </div>
  );
}
