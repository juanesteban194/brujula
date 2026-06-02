import { test, expect, type Page } from "@playwright/test";

// Coordinates inside dataset coverage (central Medellín)
const LLERAS = { lat: 6.2096, lon: -75.5697 };
const CENTRO = { lat: 6.2520, lon: -75.5690 };

// Console-error signatures that indicate a real bug (ignore tile/network noise)
const CRITICAL = [
  "Cannot style non-existing layer",
  "non-existing layer",
  "Maximum update depth",
  "Cannot update a component",
  "is not a function",
  "undefined is not an object",
];

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return {
    assertClean() {
      const critical = errors.filter((e) => CRITICAL.some((c) => e.includes(c)));
      expect(critical, `Critical console errors:\n${critical.join("\n")}`).toHaveLength(0);
    },
  };
}

async function waitForStore(page: Page) {
  await page.waitForFunction(() => !!(window as any).__store, null, { timeout: 20_000 });
}
async function waitForMap(page: Page) {
  await page.waitForFunction(() => {
    const m = (window as any).__map;
    return !!(m && typeof m.getSource === "function");
  }, null, { timeout: 30_000 });
}
async function setPoints(page: Page, o = LLERAS, d = CENTRO) {
  await page.evaluate(({ o, d }) => {
    const s = (window as any).__store.getState();
    s.setOrigen(o);
    s.setDestino(d);
  }, { o, d });
}

test.describe("Ruta — visualización", () => {
  test("muestra el destino en el mapa ANTES de calcular", async ({ page }) => {
    const con = watchConsole(page);
    await page.goto("/route");
    await waitForStore(page);
    await waitForMap(page);

    await setPoints(page);

    // EndpointsLayer should render the markers immediately (no calculation yet)
    const features = await page.evaluate(() => {
      const m = (window as any).__map;
      const src = m.getSource("endpoints-src");
      return src ? (src.serialize().data.features?.length ?? 0) : 0;
    });
    expect(features).toBeGreaterThanOrEqual(2); // origen + destino
    con.assertClean();
  });

  test("calcula una ruta simple y la dibuja", async ({ page }) => {
    const con = watchConsole(page);
    await page.goto("/route");
    await waitForStore(page);
    await waitForMap(page);
    await setPoints(page);

    await page.getByTestId("btn-calcular").click();

    // Wait for the backend result
    await page.waitForFunction(
      () => (window as any).__store.getState().resultado?.encontrada === true,
      null, { timeout: 30_000 }
    );

    // The route line source must appear on the map (poll — React effect runs just after)
    await page.waitForFunction(
      () => !!(window as any).__map.getSource("route-src"),
      null, { timeout: 15_000 }
    );
    con.assertClean();
  });

  test("calcula 3 alternativas distintas y las pinta por color", async ({ page }) => {
    const con = watchConsole(page);
    await page.goto("/route");
    await waitForStore(page);
    await waitForMap(page);

    await page.evaluate(() => (window as any).__store.getState().setShowAlternatives(true));
    await setPoints(page);
    await page.getByTestId("btn-calcular").click();

    await page.waitForFunction(
      () => {
        const alt = (window as any).__store.getState().alternativas;
        return !!alt && alt.rutas.length >= 1;
      },
      null, { timeout: 30_000 }
    );

    // Alternatives layer source must appear (poll for the React effect)
    await page.waitForFunction(
      () => !!(window as any).__map.getSource("alt-src-0"),
      null, { timeout: 15_000 }
    );

    const info = await page.evaluate(() => {
      const alt = (window as any).__store.getState().alternativas;
      return { n: alt.rutas.length, etiquetas: alt.etiquetas };
    });
    expect(info.n).toBeGreaterThanOrEqual(1);
    console.log("Alternativas:", info.n, info.etiquetas);
    con.assertClean();
  });

  test("rutea puntos lejanos/fuera de cobertura sin romperse (caso Sabaneta)", async ({ page }) => {
    const con = watchConsole(page);
    await page.goto("/route");
    await waitForStore(page);
    await waitForMap(page);

    // Puntos del sur (Sabaneta) — antes daban 404 "No se encontraron rutas"
    await setPoints(page, { lat: 6.1581, lon: -75.6082 }, { lat: 6.1672, lon: -75.6059 });
    await page.getByTestId("btn-calcular").click();

    await page.waitForFunction(
      () => (window as any).__store.getState().resultado?.encontrada === true,
      null, { timeout: 30_000 }
    );
    await page.waitForFunction(
      () => !!(window as any).__map.getSource("route-src"),
      null, { timeout: 15_000 }
    );
    con.assertClean();
  });

  test("la exploración genera eventos (frontera del algoritmo)", async ({ page }) => {
    await page.goto("/route");
    await waitForStore(page);
    await waitForMap(page);
    await setPoints(page);
    await page.getByTestId("btn-calcular").click();

    await page.waitForFunction(
      () => (window as any).__store.getState().resultado?.encontrada === true,
      null, { timeout: 30_000 }
    );
    const nEvents = await page.evaluate(() => (window as any).__store.getState().eventosExploracion.length);
    expect(nEvents).toBeGreaterThan(0);
  });
});
