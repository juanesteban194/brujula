import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Brújula — reloj de bolsillo vintage.
 * Caja de bronce, esfera crema, números romanos, manecillas azules,
 * subesfera de segundos. Diseñado para leerse desde 22px hasta hero.
 */
export function Logo({ size = 40, className }: LogoProps) {
  const id = Math.random().toString(36).slice(2, 8);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Brújula"
    >
      <defs>
        <radialGradient id={`case-${id}`} cx="42%" cy="34%" r="72%">
          <stop offset="0%"  stopColor="#F6D79B" />
          <stop offset="45%" stopColor="#D9A441" />
          <stop offset="100%" stopColor="#8A5A1E" />
        </radialGradient>
        <linearGradient id={`dial-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#F7F1E3" />
          <stop offset="100%" stopColor="#E6DCC4" />
        </linearGradient>
        <linearGradient id={`bow-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#E9C272" />
          <stop offset="100%" stopColor="#9A6A28" />
        </linearGradient>
      </defs>

      {/* Bow (anilla superior) */}
      <ellipse cx="24" cy="5.2" rx="3.4" ry="3.8"
        stroke={`url(#bow-${id})`} strokeWidth="2" fill="none" />
      {/* Crown (corona) */}
      <rect x="22.2" y="7.6" width="3.6" height="3" rx="1"
        fill={`url(#bow-${id})`} />

      {/* Caja exterior de bronce */}
      <circle cx="24" cy="28" r="17.5" fill={`url(#case-${id})`} />
      <circle cx="24" cy="28" r="17.5" stroke="#6E4517" strokeWidth="0.8" opacity="0.5" />
      {/* Bisel interior */}
      <circle cx="24" cy="28" r="14.6" fill="#7A4E1C" />
      <circle cx="24" cy="28" r="13.6" fill={`url(#dial-${id})`} />

      {/* Marcas horarias (12 ticks) */}
      <g stroke="#3A2A14" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const cardinal = i % 3 === 0;
          const r1 = 12.4;
          const r2 = cardinal ? 10.6 : 11.4;
          const x1 = 24 + r1 * Math.sin(a);
          const y1 = 28 - r1 * Math.cos(a);
          const x2 = 24 + r2 * Math.sin(a);
          const y2 = 28 - r2 * Math.cos(a);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              strokeWidth={cardinal ? 1.3 : 0.7} />
          );
        })}
      </g>

      {/* Manecillas azul acero */}
      <g strokeLinecap="round">
        {/* Hora */}
        <line x1="24" y1="28" x2="19.5" y2="23.5"
          stroke="#2D5B8E" strokeWidth="2.1" />
        {/* Minuto */}
        <line x1="24" y1="28" x2="30.5" y2="22"
          stroke="#3B6FB0" strokeWidth="1.6" />
      </g>

      {/* Subesfera de segundos */}
      <circle cx="24" cy="33" r="2.6" fill="none" stroke="#A99868" strokeWidth="0.6" />
      <circle cx="24" cy="33" r="0.5" fill="#2D5B8E" />

      {/* Eje central */}
      <circle cx="24" cy="28" r="1.5" fill="#1F2A1A" />
      <circle cx="24" cy="28" r="0.7" fill="#D9A441" />
    </svg>
  );
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return <Logo size={size} className={className} />;
}

export function Wordmark({
  className,
  size = "xl",
}: {
  className?: string;
  size?: "base" | "lg" | "xl" | "2xl" | "3xl";
}) {
  const sizeMap = {
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
  };
  return (
    <span className={cn("font-sans font-semibold tracking-tight", sizeMap[size], className)}>
      <span style={{ color: "var(--text-primary)" }}>Brú</span>
      <span style={{ color: "var(--accent)" }}>j</span>
      <span style={{ color: "var(--text-primary)" }}>ula</span>
    </span>
  );
}

export function LogoWithWordmark({
  size = 28,
  className,
  wordmarkSize = "xl",
}: {
  size?: number;
  className?: string;
  wordmarkSize?: "base" | "lg" | "xl" | "2xl" | "3xl";
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <Wordmark size={wordmarkSize} />
    </div>
  );
}

export function LogoCompact({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Logo size={22} />
      <span className="font-semibold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>
        Brú<span style={{ color: "var(--accent)" }}>j</span>ula
      </span>
    </div>
  );
}
