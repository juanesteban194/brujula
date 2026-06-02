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
              { icon: <BarChart2 className="w-4 h-4 text-route-balanced" />, title: "Yen's K-Shortest Paths", desc: "Genera 3 alternativas distintas. Clasifica automáticamente en Rápida, Segura y Balanceada." },
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

        {/* Stack */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Stack</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Backend", "FastAPI · Python 3.12 · Railway"],
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
