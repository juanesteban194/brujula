/**
 * seed-reports.ts — generate simulated community reports for the demo (§6.3).
 *
 * Reports are sampled from the augmented dataset WEIGHTED BY REAL RISK, so they
 * concentrate where the official harassment data is already high (not invented
 * hotspots), with some "bien" (safe) reports in low-risk areas so safe zones are
 * visible too. This is demo/seed data — the live app accepts real user reports
 * on top. Run:  npm run seed:reports
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA = join(process.cwd(), "data");
const SRC = join(DATA, "calles_de_medellin_aumentado.csv");
const OUT = join(DATA, "community_reports_seed.json");
const RISK_COL = 5;

const TOTAL = 900;       // total reports
const SAFE_SHARE = 0.16; // ~16% explicit "bien" reports in low-risk areas

const DESCRIPTIONS: Record<string, string[]> = {
  acoso_verbal: ["Comentarios incómodos al pasar", "Silbidos y comentarios a mujeres", "Grupo de hombres acosando", "Acoso verbal frecuente aquí"],
  zona_solitaria: ["Calle muy sola de noche", "Poco tránsito peatonal", "Zona despoblada después de las 8pm", "Sin gente ni comercio"],
  iluminacion_deficiente: ["Postes sin luz", "Tramo oscuro de noche", "Iluminación deficiente en la cuadra", "Faroles dañados"],
  robo: ["Hurto de celulares reportado", "Robo a transeúntes", "Atraco en moto", "Cuidado con el celular"],
  acoso_fisico: ["Intento de agarre reportado", "Acoso físico a una mujer", "Situación de riesgo, eviten de noche"],
  bien: ["Zona segura y transitada", "Buena iluminación y comercio", "Tranquilo de día y de noche", "Mucha gente, se siente seguro"],
};

// §6.3 distribution for risk-driven reports.
const RISK_TYPES: Array<[string, number]> = [
  ["acoso_verbal", 0.42],
  ["zona_solitaria", 0.21],
  ["iluminacion_deficiente", 0.16],
  ["robo", 0.13],
  ["acoso_fisico", 0.08],
];

function pickType(): string {
  let r = Math.random();
  for (const [t, p] of RISK_TYPES) { if ((r -= p) <= 0) return t; }
  return "acoso_verbal";
}
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randint = (a: number, b: number) => Math.floor(rand(a, b + 1));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");

interface Seg { lat: number; lon: number; risk: number }

function parseMid(o: string, d: string): [number, number] | null {
  const p = (s: string) => { const a = s.trim().replace(/^\(/, "").replace(/\)$/, "").split(","); const lon = +a[0], lat = +a[1]; return Number.isNaN(lat) || Number.isNaN(lon) ? null : [lat, lon] as [number, number]; };
  const a = p(o), b = p(d);
  return a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : null;
}

function main(): void {
  const lines = readFileSync(SRC, "utf-8").split(/\r?\n/);
  const segs: Seg[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(";");
    if (c.length <= RISK_COL) continue;
    const risk = Number(c[RISK_COL]);
    if (Number.isNaN(risk)) continue;
    const mid = parseMid(c[1], c[2]);
    if (!mid) continue;
    segs.push({ lat: mid[0], lon: mid[1], risk });
  }
  console.info(`[seed] segmentos disponibles: ${segs.length}`);

  // Weighted sampling: risk^3 concentrates on high-risk; reservoir-ish by random key.
  const weighted = (pow: number, filter: (s: Seg) => boolean, n: number): Seg[] =>
    segs.filter(filter)
      .map((s) => ({ s, k: Math.random() ** (1 / (Math.max(s.risk, 0.001) ** pow)) }))
      .sort((a, b) => b.k - a.k)
      .slice(0, n)
      .map((x) => x.s);

  const nSafe = Math.round(TOTAL * SAFE_SHARE);
  const nRisk = TOTAL - nSafe;

  const riskSegs = weighted(3, (s) => s.risk >= 0.5, nRisk);
  // safe reports: low risk, weighted toward the lowest
  const safeSegs = segs.filter((s) => s.risk < 0.45)
    .map((s) => ({ s, k: Math.random() ** (1 / (Math.max(1 - s.risk, 0.001) ** 3)) }))
    .sort((a, b) => b.k - a.k)
    .slice(0, nSafe)
    .map((x) => x.s);

  const now = Date.now();
  const DAY = 86400000;
  const reports = [] as unknown[];

  const make = (s: Seg, type: string) => {
    const sev = type === "bien"
      ? randint(1, 2)
      : Math.max(1, Math.min(5, Math.round(s.risk * 4 + rand(0.4, 1.6))));
    const confirm = type === "bien" ? randint(3, 14) : sev * 2 + randint(0, 7);
    const deny = randint(0, 3);
    const jitter = () => rand(-0.0006, 0.0006); // ~60 m so they don't stack exactly
    reports.push({
      id: `rep_${hex(8)}`,
      type,
      lat: +(s.lat + jitter()).toFixed(6),
      lon: +(s.lon + jitter()).toFixed(6),
      severity: sev,
      description: pick(DESCRIPTIONS[type] ?? DESCRIPTIONS.acoso_verbal),
      timestamp: new Date(now - randint(0, 90) * DAY - randint(0, DAY)).toISOString().replace(/\.\d{3}Z$/, "Z"),
      votes: { confirm, deny },
      active: !(deny > confirm && deny >= 4),
    });
  };

  for (const s of riskSegs) make(s, pickType());
  for (const s of safeSegs) make(s, "bien");

  // shuffle so types interleave
  for (let i = reports.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [reports[i], reports[j]] = [reports[j], reports[i]]; }

  writeFileSync(OUT, JSON.stringify(reports, null, 1), "utf-8");
  const byType: Record<string, number> = {};
  for (const r of reports as Array<{ type: string }>) byType[r.type] = (byType[r.type] ?? 0) + 1;
  console.info(`[seed] Escritos ${reports.length} reportes → ${OUT}`);
  console.info(`[seed] por tipo: ${JSON.stringify(byType)}`);
}

main();
