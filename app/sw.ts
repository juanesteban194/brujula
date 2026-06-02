import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// Injected at build time by @serwist/next.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Brújula service worker (§8 — offline shell).
 *
 * Demo-safe by design: `skipWaiting` + `clientsClaim` make a freshly deployed
 * worker take over on the next load (no stale build lingering in a cached tab),
 * and the default runtime caching is NetworkFirst for navigations/API — so when
 * online the user always gets the latest, and offline falls back to the cached
 * shell + last map tiles.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
