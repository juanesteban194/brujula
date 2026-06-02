import { defineConfig, devices } from "@playwright/test";

/**
 * Brújula E2E config.
 * Assumes the backend (uvicorn :8000) and frontend (next :3000) are already running.
 * Run both, then: npm run test:e2e
 *
 * Mobile-first: default project emulates an iPhone-class viewport.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] }, // Chromium-based mobile emulation
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
