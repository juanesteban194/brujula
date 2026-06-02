# 🧭 Brújula — Camina con rumbo

Motor de rutas peatonales para **Medellín** que optimiza por **seguridad percibida**, no solo por tiempo. Ningún mapa global (Google, Waze) usa el dato abierto de riesgo de acoso por calle; Brújula sí.

> *"No te dice qué tan rápido llegar, te dice cómo llegar bien."*

Monorepo **100% TypeScript**: frontend (React 19 + Next.js 15) y backend (Route Handlers de Next.js) en un solo repo. **Sin backend Python.** Los algoritmos A\*/Dijkstra están implementados a mano en TS y corren server-side.

---

## Requisitos

- **Node.js ≥ 22** (probado en Node 26). Los scripts de build corren TypeScript con el soporte nativo de Node, sin `tsx`.
- npm

## Cómo correr (desarrollo)

```bash
npm install        # solo la primera vez
npm run dev        # arranca en http://localhost:3000
```

Abrí:
- **http://localhost:3000** — landing con el QR.
- **http://localhost:3000/route** — pantalla principal del mapa (lo importante).

En `/route`: tocá el mapa para marcar **origen** y **destino**, ajustá el slider *Rápido ↔ Seguro* y "Calcular ruta". Activá **"Comparar A\* vs Dijkstra"** para ver los dos algoritmos explorar en vivo.

## Build de producción

```bash
npm run build
npm run start      # sirve el build en http://localhost:3000
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (HMR) |
| `npm run build` / `npm run start` | Build y servidor de producción |
| `npm run type-check` | `tsc --noEmit` (chequeo de tipos) |
| `npm run lint` | ESLint |
| `npm run augment` | Genera `data/calles_de_medellin_aumentado.csv` por interpolación IDW |
| `npm run icons` | Regenera los íconos PWA + OG desde `public/icon.svg` |
| `npm run test:e2e` | Pruebas end-to-end (Playwright) |

## Variables de entorno

Funciona **sin configurar nada** (mapa con fallback de CARTO, token admin con default). Para personalizar, copiá `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_MAPTILER_KEY` | (Opcional) tiles de MapTiler; si falta, usa CARTO. |
| `ADMIN_TOKEN` | Token para `/api/admin/*`. Cambialo en producción. |
| `CSV_PATH` | (Opcional) ruta a un CSV alterno del grafo. |
| `RISK_OVERLAY_WEIGHT` | Peso del overlay de riesgo por reportes comunitarios. |

## Datos y transparencia

El riesgo combina **mediciones reales** del dataset oficial, **estimaciones por IDW** (interpolación espacial estándar en SIG) donde faltaba cobertura, y **reportes de la comunidad**. De 68.749 tramos: 52.654 medidos, 16.091 interpolados — cada uno marcado con su `fuente`. El loader usa el dataset aumentado cuando existe; si no, cae al CSV oficial.

## Algoritmos

- **A\*** (motor de producción): heurística haversine admisible → ruta óptima explorando un corredor dirigido al destino.
- **Dijkstra** (comparación visual): mismo óptimo, explora en anillos concéntricos.
- Las **3 alternativas** (rápida/balanceada/segura) son A\* con tres perfiles de β — no Yen's.
- Costo de arista: `α·distancia + β·riesgo·distancia`. El slider mueve β.

> **Nota** sobre el modo comparación: A\* le gana dramáticamente a Dijkstra (~8–18× menos nodos) **cuando domina la distancia** (β≈0), porque ahí la heurística es fuerte. Con pesos de seguridad altos, el costo lo domina `β·riesgo·distancia` —que la heurística haversine no acota— y A\* converge a Dijkstra. Por eso la comparación corre en modo distancia (el ejemplo canónico de heurística). Es un trade-off real y un buen punto para la sustentación.

## Día de la feria

1. Deploy en Vercel (HTTPS — necesario para GPS y PWA). El QR apunta a la URL pública.
2. **1 minuto antes de presentar**, pegale a `/api/warmup` para cargar el grafo en memoria y evitar el lag de cold start.
3. Probá el QR desde varios celulares (iPhone Safari + Android Chrome).

> Por LAN en `npm run dev` (la IP `192.168.x.x:3000`) el mapa funciona, pero **el GPS no** (requiere contexto seguro/HTTPS; `localhost` cuenta como seguro, una IP LAN por http no).

## Estructura

```
app/            Páginas + Route Handlers (/api/*)
components/     Mapa, controles, métricas, marca
lib/server/     Grafo, algoritmos (A*/Dijkstra), servicios
lib/geo/        Interpolación IDW
lib/store/      Estado (Zustand)
data/           CSV del grafo + reportes seed
scripts/        augment-data.ts, generate-icons.ts
public/         manifest, íconos PWA, OG
```

---

🤖 Construido con asistencia de [Claude Code](https://claude.com/claude-code).
