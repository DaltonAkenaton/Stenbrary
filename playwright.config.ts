// ╔══════════════════════════════════════════════════════╗
// ║  playwright.config.ts                                ║
// ║  Stenbrary v3.62.0 — E2E                             ║
// ║                                                      ║
// ║  v3.62.0: Playwright levanta SIEMPRE su propio       ║
// ║  servidor, en un puerto propio (4300, o E2E_PORT).   ║
// ║  Antes reutilizaba lo que hubiera en el 4200: una    ║
// ║  corrida local probó otro proyecto que ocupaba ese   ║
// ║  puerto. global-setup confirma además que lo que     ║
// ║  responde es Stenbrary antes de correr nada.         ║
// ╚══════════════════════════════════════════════════════╝

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['E2E_PORT'] ?? 4300);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error(`E2E_PORT inválido: "${process.env['E2E_PORT']}". Usa un número entre 1024 y 65535.`);
}
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Reutilizar un servidor ya levantado solo si se pide explícitamente
 * (E2E_REUSE_SERVER=1), para iterar rápido en local. Aun así, global-setup
 * rechaza cualquier servidor que no sea Stenbrary.
 */
const REUSAR = process.env['E2E_REUSE_SERVER'] === '1' && !process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  // e2e/produccion corre aparte, contra el build (playwright.produccion.config.ts).
  testIgnore: ['produccion/**'],
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  // `github` publica cada fallo como anotación del job: legible sin sesión,
  // a diferencia del log completo.
  reporter: process.env['CI'] ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // El navegador vive en la zona horaria de la biblioteca, no en la del
    // runner (UTC): los errores de fecha "un día antes" solo existen aquí.
    timezoneId: 'America/Matamoros', // Nuevo Laredo: con horario de verano
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npx ng serve --configuration development --port ${PORT}`,
    url: BASE_URL,
    // Con `false`, si el puerto ya está ocupado Playwright se detiene con
    // "is already used" en vez de probar lo que sea que esté ahí.
    reuseExistingServer: REUSAR,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
