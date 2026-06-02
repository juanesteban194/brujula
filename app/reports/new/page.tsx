"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { createReport } from "@/lib/api/reports";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { LogoWithWordmark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPES = [
  { value: "acoso_verbal", label: "Acoso verbal", emoji: "🗣️" },
  { value: "zona_solitaria", label: "Zona solitaria", emoji: "🌑" },
  { value: "iluminacion_deficiente", label: "Sin iluminación", emoji: "💡" },
  { value: "robo", label: "Robo / Hurto", emoji: "⚠️" },
  { value: "bien", label: "Zona segura", emoji: "✅" },
] as const;

type ReportType = typeof TYPES[number]["value"];

export default function NewReportPage() {
  const router = useRouter();
  const geo = useGeolocation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<ReportType | null>(null);
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      setDone(true);
      setTimeout(() => router.push("/reports"), 2000);
    },
    onError: () => toast.error("Error al enviar el reporte"),
  });

  const handleSubmit = () => {
    if (!type || geo.status !== "success") return;
    mutation.mutate({
      type,
      lat: geo.lat,
      lon: geo.lon,
      severity,
      description: description || undefined,
    });
  };

  if (done) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
          <Check className="w-10 h-10 text-accent" />
        </div>
        <h2 className="text-xl font-semibold">¡Gracias por reportar!</h2>
        <p className="text-text-secondary text-sm">Tu reporte ayuda a la comunidad a caminar más segura.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border-subtle glass pt-safe">
        <Link href="/reports" className="touch-target text-text-tertiary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <LogoWithWordmark size={22} />
        <span className="text-text-secondary text-sm">Nuevo reporte</span>
      </div>

      {/* Step indicator */}
      <div className="flex px-4 pt-4 pb-2 gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="flex-1 h-1 rounded-full transition-colors"
            style={{ background: s <= step ? "var(--accent)" : "var(--border-strong)" }}
          />
        ))}
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-auto">

        {/* Step 1: Type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">¿Qué ocurrió?</h2>
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setType(t.value); setStep(2); }}
                  className={cn(
                    "h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95",
                    type === t.value
                      ? "border-accent bg-accent/10"
                      : "border-border-subtle bg-bg-surface hover:border-border-strong"
                  )}
                >
                  <span className="text-3xl">{t.emoji}</span>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">¿Dónde fue?</h2>
            <button
              onClick={geo.request}
              disabled={geo.status === "loading"}
              className="w-full h-16 rounded-xl bg-accent text-bg-base font-semibold flex items-center justify-center gap-3 hover:bg-accent-hover transition-colors"
            >
              {geo.status === "loading" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
              Usar mi ubicación actual
            </button>
            {geo.status === "success" && (
              <p className="text-sm text-accent text-center">
                ✓ Ubicación detectada: {geo.lat.toFixed(5)}, {geo.lon.toFixed(5)}
              </p>
            )}
            {geo.status === "error" && (
              <p className="text-sm text-risk-high text-center">{geo.message}</p>
            )}
            {geo.status === "success" && (
              <button
                onClick={() => setStep(3)}
                className="w-full h-14 rounded-xl bg-accent text-bg-base font-semibold"
              >
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Detalles</h2>

            <div>
              <p className="text-sm text-text-secondary mb-2">Severidad</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "flex-1 h-12 rounded-xl border text-lg transition-all",
                      severity >= s
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-border-subtle text-text-tertiary"
                    )}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-text-secondary mb-2">Descripción (opcional)</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Describe brevemente lo que pasó..."
                className="w-full rounded-xl bg-bg-surface border border-border-subtle px-3 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent transition-colors"
                style={{ fontSize: 16 }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="w-full h-14 rounded-xl bg-accent text-bg-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Enviar reporte"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
