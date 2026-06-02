import Link from "next/link";
import { ArrowLeft, Github, Shield, Zap, BarChart2, Globe } from "lucide-react";
import { LogoWithWordmark } from "@/components/brand/Logo";
import { BrujulaQR } from "@/components/brand/QRCode";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary px-4 py-safe max-w-2xl mx-auto">
      <div className="pt-8 pb-4 flex items-center gap-3">
        <Link href="/" className="touch-target text-text-tertiary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <LogoWithWordmark size={24} />
      </div>

      <div className="space-y-10 pb-16">
        {/* Tagline */}
        <section>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">
            No solo la ruta.<br />El rumbo.
          </h1>
          <p className="text-text-secondary leading-relaxed">
            Brújula nació de una observación simple: en Medellín existe un dataset abierto
            con niveles de riesgo de acoso por segmento de calle, y ningún mapa lo usa.
            Google Maps optimiza por tiempo. Waze por tráfico. Brújula optimiza por
            cómo te vas a sentir caminando.
          </p>
        </section>

        {/* Technical */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Motor algorítmico</h2>
          <div className="space-y-3">
            {[
              { icon: <Zap className="w-4 h-4 text-route-fast" />, title: "A* con heurística haversine", desc: "Óptimo y rápido. La heurística es admisible: siempre subestima el costo real." },
              { icon: <BarChart2 className="w-4 h-4 text-route-balanced" />, title: "Comparación A* vs Dijkstra", desc: "Mismo óptimo; A* explora un corredor dirigido por la heurística, Dijkstra anillos concéntricos. Las 3 alternativas son A* con 3 perfiles de β." },
              { icon: <Shield className="w-4 h-4 text-route-safe" />, title: "Función de costo compuesta", desc: "costo = α·distancia + β·riesgo·distancia. El slider mueve β de 0 a 500." },
              { icon: <Globe className="w-4 h-4 text-risk-mid" />, title: "Capas en vivo (SIATA)", desc: "Integra datos reales de lluvia, calidad del aire y alertas del Sistema de Alerta Temprana del Valle de Aburrá." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-bg-surface border border-border-subtle">
                <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">{item.icon}</div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data transparency (§6.10) */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Datos y transparencia</h2>
          <div className="p-4 rounded-xl bg-bg-surface border border-border-subtle space-y-3">
            <p className="text-sm text-text-secondary leading-relaxed">
              Los datos de riesgo combinan <span className="text-text-primary font-medium">mediciones reales</span> del
              dataset oficial de Medellín, <span className="text-text-primary font-medium">estimaciones por interpolación
              espacial (IDW)</span> donde faltaba cobertura, y <span className="text-text-primary font-medium">reportes
              de la comunidad</span> en tiempo real.
            </p>
            <p className="text-xs text-text-tertiary leading-relaxed">
              No inventamos puntajes de peligrosidad. La red de calles cubre <span className="text-text-primary font-medium">todo
              el Valle de Aburrá</span> (OpenStreetMap, ~348.000 tramos). El riesgo viene del dataset oficial medido de Medellín:
              los tramos que coinciden con una calle medida conservan su valor real y el resto se estima con IDW —técnica
              estándar en SIG— desde los vecinos reales. Cada tramo lleva su fuente
              (<span className="font-mono">real</span> / <span className="font-mono">interpolado</span>) y los reportes de la
              comunidad lo actualizan.
            </p>
          </div>
        </section>

        {/* Stack */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Stack</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Backend", "Route Handlers de Next.js · TypeScript"],
              ["Frontend", "Next.js 15 · React 19 · Vercel"],
              ["Mapas", "MapLibre GL JS · OSM tiles"],
              ["UI", "TailwindCSS · shadcn/ui · vaul"],
              ["Animaciones", "Framer Motion"],
              ["Estado", "Zustand · TanStack Query"],
            ].map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl bg-bg-surface">
                <p className="text-xs text-text-tertiary">{label}</p>
                <p className="font-mono text-xs text-text-primary mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* QR */}
        <section className="flex flex-col items-center text-center gap-4 py-6">
          <h2 className="text-xl font-semibold">Probá desde tu celular</h2>
          <BrujulaQR size={200} caption="Escaneá el código" />
        </section>

        {/* Links */}
        <section className="flex flex-col gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-bg-surface border border-border-subtle hover:border-border-strong transition-colors"
          >
            <Github className="w-5 h-5 text-text-secondary" />
            <div>
              <p className="text-sm font-medium">Código fuente</p>
              <p className="text-xs text-text-tertiary">github.com/brujula-medellin</p>
            </div>
          </a>
          <Link
            href="/route"
            className="flex items-center justify-center gap-2 h-12 rounded-xl bg-accent text-bg-base font-semibold hover:bg-accent-hover transition-colors"
          >
            Abrir la app →
          </Link>
        </section>

        <p className="text-xs text-text-tertiary text-center">
          Proyecto académico · Análisis y Diseño de Algoritmos · Universidad de Medellín · 2026
        </p>
      </div>
    </main>
  );
}
