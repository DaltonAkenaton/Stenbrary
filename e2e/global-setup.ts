// ╔══════════════════════════════════════════════════════╗
// ║  e2e/global-setup.ts — Stenbrary v3.62.0             ║
// ║                                                      ║
// ║  Antes de la primera prueba, confirma que el         ║
// ║  servidor del baseURL es Stenbrary. Una corrida      ║
// ║  local llegó a probar otro proyecto que ocupaba el   ║
// ║  puerto: decenas de fallos sin relación con el       ║
// ║  código. Mejor detenerse con un mensaje claro.       ║
// ╚══════════════════════════════════════════════════════╝

import type { FullConfig } from '@playwright/test';

/** Marca que solo tiene el index.html de Stenbrary. */
const MARCA = '<meta name="application-name" content="Stenbrary">';

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) throw new Error('E2E: falta baseURL en playwright.config.ts');

  let html: string;
  try {
    const res = await fetch(baseURL);
    html = await res.text();
  } catch (e) {
    throw new Error(`E2E: no responde ${baseURL} (${(e as Error).message}).`);
  }

  if (!html.includes(MARCA)) {
    throw new Error(
      `E2E: ${baseURL} responde, pero NO es Stenbrary (falta ${MARCA} en el HTML). ` +
      'Otro proyecto ocupa ese puerto. Ciérralo o usa otro: E2E_PORT=4310 npx playwright test',
    );
  }
}
