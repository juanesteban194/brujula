import Link from "next/link";
import { ArrowRight, MapPin, Shield, Zap, Users, Building2, Globe, CheckCircle2, ChevronDown } from "lucide-react";
import { LogoWithWordmark } from "@/components/brand/Logo";
import { BrujulaQR } from "@/components/brand/QRCode";

/* ─── Datos de personas ───────────────────────────────────────────────────── */
const PERSONAS = [
  {
    initial: "M",
    name: "María, 21",
    role: "Estudiante UdeM",
    color: "var(--route-fast)",
    bg: "rgba(96,165,250,0.1)",
    story: "Sale de clase a las 9:15pm. Quiere llegar rápido a Belén sin atravesar zonas que la ponen nerviosa.",
  },
  {
    initial: "C",
    name: "Camila, 28",
    role: "Profesional · Ciudad del Río",
    color: "var(--route-safe)",
    bg: "rgba(52,211,153,0.1)",
    story: "Va a cenar a Provenza un viernes. Conoce la ciudad pero siempre prefiere alternativas más seguras.",
  },
  {
    initial: "S",
    name: "Sarah",
    role: "Turista · Alemania",
    color: "var(--route-balanced)",
    bg: "rgba(167,139,250,0.1)",
    story: "Primer día en Medellín. Sale de El Poblado hacia Pueblito Paisa sin conocer nada.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Marcá tu destino",
    body: "Tap en el mapa o escribe la dirección. Brújula detecta tu ubicación con el GPS de tu celular.",
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    number: "02",
    title: "Elegí tu prioridad",
    body: "Un slider entre velocidad y seguridad. El motor ajusta los pesos del algoritmo en tiempo real.",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    number: "03",
    title: "Caminá con rumbo",
    body: "A* con heurística haversine calcula tu ruta en milisegundos. Datos reales de acoso en Medellín.",
    icon: <Zap className="w-5 h-5" />,
  },
];

const BUSINESS = [
  {
    icon: <Users className="w-4 h-4" />,
    color: "var(--route-fast)",
    title: "B2C Freemium",
    desc: "App gratuita ilimitada. Premium $2/mes por modo acompañante y alertas de ETA.",
  },
  {
    icon: <Building2 className="w-4 h-4" />,
    color: "var(--route-safe)",
    title: "B2B Universidades",
    desc: "Licencias por estudiante para UdeM, EAFIT, U. de A., Nacional.",
  },
  {
    icon: <Globe className="w-4 h-4" />,
    color: "var(--route-balanced)",
    title: "B2B Turismo",
    desc: "Integración en concierge digital de hoteles del Área Metropolitana.",
  },
  {
    icon: <Shield className="w-4 h-4" />,
    color: "var(--accent)",
    title: "B2G Medellín",
    desc: "Secretaría de las Mujeres + Secretaría de Turismo. Datos agregados anonimizados.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen text-text-primary" style={{ background: "var(--bg-base)" }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 px-6 flex items-center justify-between glass" style={{ paddingTop: "var(--safe-top)" }}>
        <LogoWithWordmark size={24} wordmarkSize="base" />
        <div className="hidden sm:flex items-center gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
          <Link href="/about" className="hover:text-text-primary transition-colors">Acerca de</Link>
          <Link href="/reports" className="hover:text-text-primary transition-colors">Reportes</Link>
          <Link href="/compare" className="hover:text-text-primary transition-colors">Algoritmos</Link>
        </div>
        <Link
          href="/route"
          className="flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium transition-all hover:opacity-90 active:scale-95"
          style={{ background: "var(--accent)", color: "var(--bg-base)" }}
        >
          Abrir app <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-[100dvh] px-6 pb-16 pt-14 text-center overflow-hidden">
        {/* Background radial */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Animated compass */}
        <div className="mb-8 relative">
          <div className="w-20 h-20 mx-auto relative">
            <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
              {/* Outer glow ring */}
              <circle cx="40" cy="40" r="38" stroke="rgba(245,158,11,0.08)" strokeWidth="1"/>
              <circle cx="40" cy="40" r="33" stroke="rgba(245,158,11,0.12)" strokeWidth="1"/>
              <circle cx="40" cy="40" r="28" stroke="var(--border-strong)" strokeWidth="1.5"/>

              {/* Grid lines */}
              <line x1="40" y1="12" x2="40" y2="16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="68" y1="40" x2="64" y2="40" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="40" x2="16" y2="40" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="40" y1="68" x2="40" y2="64" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>

              {/* Needle north — amber */}
              <path d="M40 14 L36.5 40 L40 37 L43.5 40 Z" fill="var(--accent)"/>
              {/* Needle south — muted */}
              <path d="M40 66 L43.5 40 L40 43 L36.5 40 Z" fill="var(--text-muted)"/>

              {/* Center */}
              <circle cx="40" cy="40" r="3.5" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>

        {/* Tag */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "var(--accent)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }}/>
          68,749 segmentos reales de Medellín
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-none mb-4">
          <span className="gradient-text-amber">Camina</span>
          <br />
          <span style={{ color: "var(--text-primary)" }}>con rumbo.</span>
        </h1>

        <p className="text-lg sm:text-xl max-w-md mb-10 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Rutas peatonales en Medellín optimizadas por
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}> seguridad percibida</span>,
          no solo por tiempo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-sm">
          <Link
            href="/route"
            className="flex items-center justify-center gap-2 h-13 px-6 rounded-full font-semibold text-base transition-all hover:opacity-90 active:scale-95 flex-1"
            style={{ background: "var(--accent)", color: "var(--bg-base)", minHeight: 52 }}
          >
            Probar ahora <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/about"
            className="flex items-center justify-center gap-2 h-13 px-6 rounded-full text-base transition-all flex-1"
            style={{
              border: "1px solid var(--border-strong)",
              color: "var(--text-secondary)",
              minHeight: 52,
            }}
          >
            Cómo funciona
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex gap-8 mt-14" style={{ color: "var(--text-tertiary)" }}>
          {[["68k+", "segmentos"], ["27k+", "nodos"], ["A*", "óptimo"]].map(([val, label]) => (
            <div key={label} className="flex flex-col items-center">
              <span className="font-mono font-bold text-xl" style={{ color: "var(--text-primary)" }}>{val}</span>
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 flex flex-col items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* ── EL PROBLEMA ── */}
      <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>El problema</p>
          <h2 className="text-3xl font-semibold mb-10 max-w-lg">
            Google Maps te dice cómo llegar rápido. No te dice cómo llegás bien.
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Ruta insegura */}
            <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "var(--risk-extreme)" }}/>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--risk-extreme)" }}/>
                <span className="text-xs font-mono" style={{ color: "var(--risk-extreme)" }}>RUTA RÁPIDA</span>
              </div>
              <h3 className="font-semibold mb-2">El camino directo</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Calle solitaria, mal iluminada, zona con reportes de acoso.
                <span style={{ color: "var(--text-primary)" }}> 8 minutos menos.</span> Pero ¿a qué costo?
              </p>
            </div>
            {/* Ruta segura */}
            <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid rgba(52,211,153,0.25)" }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "var(--route-safe)" }}/>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--route-safe)" }}/>
                <span className="text-xs font-mono" style={{ color: "var(--route-safe)" }}>RUTA SEGURA</span>
              </div>
              <h3 className="font-semibold mb-2">El camino inteligente</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Zona comercial, iluminada, transitada.
                <span style={{ color: "var(--text-primary)" }}> 3 minutos más.</span> La diferencia entre llegar tranquila y llegar con miedo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-widest mb-3 text-center" style={{ color: "var(--accent)" }}>Cómo funciona</p>
          <h2 className="text-3xl font-semibold mb-12 text-center">Tres pasos. Sin cuenta.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className="rounded-2xl p-6 animate-fade-up"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-3xl font-bold" style={{ color: "var(--border-strong)" }}>
                    {step.number}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                  >
                    {step.icon}
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PERSONAS ── */}
      <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Para quién</p>
          <h2 className="text-3xl font-semibold mb-10">Diseñado para quien camina vulnerable.</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PERSONAS.map((p) => (
              <div
                key={p.name}
                className="rounded-2xl p-5"
                style={{ background: p.bg, border: `1px solid ${p.color}30` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                    style={{ background: p.color, color: "var(--bg-base)" }}
                  >
                    {p.initial}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs" style={{ color: p.color }}>{p.role}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p.story}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QR FERIA ── */}
      <section className="px-6 py-20">
        <div className="max-w-lg mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-12 flex flex-col items-center text-center gap-6"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.25)",
                color: "var(--accent)",
              }}
            >
              Para la feria
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold">Escaneá y probá ahora</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Abrí la app en tu celular directamente. Sin instalación.
            </p>
            <BrujulaQR size={220} />
            <Link
              href="/route"
              className="flex items-center gap-2 h-12 px-8 rounded-full font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--bg-base)" }}
            >
              O abrí en este dispositivo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── MODELO DE NEGOCIO ── */}
      <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Negocio</p>
          <h2 className="text-3xl font-semibold mb-10">Sostenible desde el día uno.</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {BUSINESS.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}15`, color: item.color }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-10" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <LogoWithWordmark size={20} wordmarkSize="base" />
          <div className="flex gap-6 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {[["Acerca de", "/about"], ["Reportes", "/reports"], ["Comparar", "/compare"], ["Admin", "/admin"]].map(([label, href]) => (
              <Link key={label} href={href} className="hover:text-text-primary transition-colors">{label}</Link>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © 2026 · Universidad de Medellín
          </p>
        </div>
      </footer>
    </main>
  );
}
