// ╔══════════════════════════════════════════════════════╗
// ║  playwright.config.ts                                ║
// ║  Stenbrary v3.12.1 — Smoke E2E                       ║
// ║                                                      ║
// ║  Un solo smoke test para detectar regresiones tipo   ║
// ║  "componente huérfano no montado" (como el bug del   ║
// ║  ToastContainer en v3.12.0).                         ║
// ╚══════════════════════════════════════════════════════╝

import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // El navegador vive en la zona horaria de la biblioteca, no en la del
    // runner (UTC): los errores de fecha "un día antes" solo existen aquí.
    timezoneId: 'America/Mexico_City',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npx ng serve --configuration development --port 4200',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
