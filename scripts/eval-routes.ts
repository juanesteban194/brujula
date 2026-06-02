/**
 * eval-routes.ts — calibración/validación de las 3 rutas (§6/§9).
 * Pega al endpoint /api/route/alternatives (con el server dev corriendo) para 3
 * pares O-D reales de Medellín e imprime distancia, tiempo, riesgo, tramos
 * peligrosos cruzados y solapamiento. Objetivo: Rápida más corta, Segura menos
 * riesgo/peligro, solapamiento bajo entre las 3.
 *
 * Uso:  BRUJULA_URL=http://localhost:3001 npm run eval
 */
const BASE = process.env.BRUJULA_URL || "http://localhost:3000";

const PARES = [
  { nombre: "UdeM → Belén", o: { lat: 6.2333, lon: -75.6135 }, d: { lat: 6.2342, lon: -75.6050 } },
  { nombre: "El Poblado → Centro", o: { lat: 6.2086, lon: -75.5680 }, d: { lat: 6.2518, lon: -75.5636 } },
  { nombre: "Laureles → Estadio", o: { lat: 6.2459, lon: -75.5990 }, d: { lat: 6.2530, lon: -75.5896 } },
];

interface Ruta {
  distancia_total_m: number;
  duracion_estimada_min: number;
  riesgo_promedio: number;
  aristas_peligrosas?: number;
  solapamiento_rapida?: number;
}

async function main(): Promise<void> {
  console.info(`[eval] endpoint: ${BASE}/api/route/alternatives\n`);
  for (const par of PARES) {
    try {
      const res = await fetch(`${BASE}/api/route/alternatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen: par.o, destino: par.d }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) { console.warn(`  ${par.nombre}: HTTP ${res.status}`); continue; }
      const j = (await res.json()) as { rutas: Ruta[]; etiquetas: string[] };
      console.info(`■ ${par.nombre}`);
      j.rutas.forEach((r, i) => {
        console.info(
          `   ${(j.etiquetas[i] ?? "?").padEnd(11)} ` +
          `${String(Math.round(r.distancia_total_m)).padStart(5)} m · ` +
          `${String(Math.round(r.duracion_estimada_min)).padStart(3)} min · ` +
          `riesgo ${r.riesgo_promedio.toFixed(3)} · ` +
          `peligrosas ${String(r.aristas_peligrosas ?? "?").padStart(3)} · ` +
          `solap.rápida ${r.solapamiento_rapida ?? "-"}`,
        );
      });
      // chequeos
      const rap = j.rutas[j.etiquetas.indexOf("rapida")];
      const seg = j.rutas[j.etiquetas.indexOf("segura")];
      if (rap && seg) {
        const okCorta = rap.distancia_total_m <= seg.distancia_total_m;
        const okSegura = (seg.aristas_peligrosas ?? 0) <= (rap.aristas_peligrosas ?? 0);
        const okDistintas = (seg.solapamiento_rapida ?? 0) < 0.7;
        console.info(`   ✓ rápida≤segura(dist):${okCorta}  segura≤rápida(peligro):${okSegura}  distintas(<70%):${okDistintas}\n`);
      }
    } catch (e) {
      console.warn(`  ${par.nombre}: ${(e as Error).message}`);
    }
  }
}

main();
