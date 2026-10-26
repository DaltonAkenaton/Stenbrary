// ╔══════════════════════════════════════════════════════╗
// ║  playwright.produccion.config.ts — Stenbrary v3.62.0 ║
// ║                                                      ║
// ║  Pruebas contra el BUILD DE PRODUCCIÓN servido con   ║
// ║  las cabeceras de public/_headers (CSP incluida),    ║
// ║  como lo sirve Cloudflare. Requiere el build hecho:  ║
// ║    npx ng build --configuration production           ║
// ║    npm run e2e:produccion                            ║
// ╚══════════════════════════════════════════════════════╝

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['E2E_PROD_PORT'] ?? 4400);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e/produccion',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: process.env['CI'] ? [['list'], ['github']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    timezoneId: 'America/Matamoros',
    serviceWorkers: 'allow',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/servir-produccion.mjs ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
