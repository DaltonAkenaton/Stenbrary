// ╔══════════════════════════════════════════════════════╗
// ║  e2e/produccion/cabeceras.spec.ts — v3.62.0          ║
// ║                                                      ║
// ║  Contra el build de producción con public/_headers:  ║
// ║  las cabeceras llegan, index.html no trae código     ║
// ║  inline, y el recorrido principal (gráficas, PDF,    ║
// ║  Excel, importación en el Worker, cámara, service    ║
// ║  worker y sin conexión) no produce NINGUNA violación ║
// ║  de la Content-Security-Policy.                      ║
// ╚══════════════════════════════════════════════════════╝

import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

/** Registra cada violación de la CSP que ocurra en la página. */
async function vigilarCsp(page: Page): Promise<string[]> {
  const violaciones: string[] = [];
  page.on('console', m => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violaciones.push(`consola: ${m.text()}`);
  });
  await page.exposeFunction('__reportarCsp', (v: string) => { violaciones.push(v); });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => {
      (window as unknown as { __reportarCsp: (v: string) => void })
        .__reportarCsp(`${e.violatedDirective} ← ${e.blockedURI || '(inline)'} en ${e.sourceFile}:${e.lineNumber}`);
    });
  });
  return violaciones;
}

test('las cabeceras de seguridad llegan en la portada, en rutas de la app y en los scripts', async ({ request }) => {
  for (const ruta of ['/', '/estadisticas', '/configuracion#datos', '/ngsw-worker.js']) {
    const r = await request.get(ruta);
    expect(r.status(), ruta).toBe(200);
    const h = r.headers();
    expect(h['content-security-policy'], ruta).toContain("script-src 'self';");
    expect(h['content-security-policy'], ruta).toContain("frame-ancestors 'none'");
    expect(h['content-security-policy'], ruta).toContain("object-src 'none'");
    expect(h['x-frame-options'], ruta).toBe('DENY');
    expect(h['x-content-type-options'], ruta).toBe('nosniff');
    expect(h['referrer-policy'], ruta).toBe('strict-origin-when-cross-origin');
    expect(h['permissions-policy'], ruta).toContain('camera=(self)');
  }
  expect((await request.get('/ngsw.json')).headers()['cache-control']).toBe('no-cache');
});

test('index.html no tiene scripts inline ni manejadores de eventos en atributos', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
  expect(html).not.toMatch(/\son[a-z]+\s*=/i);
});

test('recorrido principal sin violaciones de la CSP', async ({ page }) => {
  const violaciones = await vigilarCsp(page);

  // Asistente → datos de ejemplo → Estadísticas (gráficas de Chart.js).
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar con datos de ejemplo/ }).click();
  await expect(page).toHaveURL(/\/estadisticas/, { timeout: 60_000 });
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });

  // PDF (jsPDF) desde el top de alumnos.
  await page.goto('/estadisticas?p=ultimos30&tab=personas');
  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.export-btn-pdf').first().click(),
  ]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);

  // Excel (SheetJS) desde Registros.
  await page.goto('/registros');
  const [excel] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTitle('Exportar a Excel').click(),
  ]);
  expect(excel.suggestedFilename()).toMatch(/\.xlsx$/);

  // Importar el padrón: la lectura corre en el Web Worker.
  await page.goto('/importar-alumnos');
  await page.locator('input[type="file"][accept=".xlsx,.xls,.csv"]').setInputFiles(
    path.join(__dirname, '..', 'fixtures', 'padron-casos.xlsx'));
  await expect(page.locator('.mapeo-item').first()).toBeVisible();

  // Respaldo (descarga de un Blob).
  await page.goto('/configuracion#datos');
  const [respaldo] = await Promise.all([page.waitForEvent('download'), page.locator('.btn-backup').click()]);
  expect(respaldo.suggestedFilename()).toMatch(/^stenbrary_backup_.*\.json$/);

  for (const ruta of ['/scanner', '/dashboard', '/alumnos', '/inactivos', '/novedades', '/diagnostico', '/funciones']) {
    await page.goto(ruta);
    await expect(page.locator('app-root')).not.toBeEmpty();
  }

  expect(violaciones).toEqual([]);
});

test('la cámara (getUserMedia → <video>) no choca con la CSP', async ({ browser }) => {
  const ctx = await browser.newContext({
    permissions: ['camera'],
  });
  const page = await ctx.newPage();
  const violaciones = await vigilarCsp(page);
  await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
  await page.goto('/scanner');
  // El flujo de cámara usa srcObject con un MediaStream; se reproduce uno sintético.
  const reproduce = await page.evaluate(async () => {
    const lienzo = document.createElement('canvas');
    lienzo.getContext('2d')!.fillRect(0, 0, 10, 10);
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = lienzo.captureStream(5);
    document.body.appendChild(video);
    await video.play();
    return !video.paused;
  });
  expect(reproduce).toBe(true);
  expect(violaciones).toEqual([]);
  await ctx.close();
});

test('el service worker se instala y la app abre sin conexión', async ({ page, context }) => {
  const violaciones = await vigilarCsp(page);
  await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
  await page.goto('/scanner');
  // registerWhenStable:30000 → se registra a más tardar a los 30 s.
  await expect.poll(() => page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r?.active?.state ?? 'sin registrar';
  }), { timeout: 60_000, intervals: [1000] }).toBe('activated');
  // Que el SW controle la página y termine de precargar.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await page.evaluate(() => caches.keys())).some(k => k.includes('ngsw')), { timeout: 30_000 }).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('app-root')).not.toBeEmpty();
  await page.goto('/estadisticas');
  await expect(page.locator('app-root')).not.toBeEmpty();
  await context.setOffline(false);
  expect(violaciones).toEqual([]);
});
