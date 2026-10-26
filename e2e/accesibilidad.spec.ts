// ╔══════════════════════════════════════════════════════╗
// ║  e2e/accesibilidad.spec.ts — Stenbrary v3.62.0       ║
// ║                                                      ║
// ║  axe-core sobre el flujo principal y las pantallas   ║
// ║  de consulta, con datos de ejemplo cargados (vacías  ║
// ║  esconden tablas y botones). Criterio: WCAG 2.1 A y  ║
// ║  AA sin una sola violación, en escritorio y móvil.   ║
// ║  El lint (eslint.config.js) cubre lo estático; esto  ║
// ║  cubre lo que solo se ve renderizado: contraste,     ║
// ║  nombres accesibles, roles y controles anidados.     ║
// ╚══════════════════════════════════════════════════════╝

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function revisar(page: Page, donde: string): Promise<void> {
  // Las animaciones de entrada (opacidad 0 → 1) falsean el contraste si axe
  // mide a la mitad. Se esperan las finitas; las infinitas (cargas) no.
  await page.waitForFunction(() => document.getAnimations()
    .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
    .every(a => a.playState !== 'running'), undefined, { timeout: 5_000 }).catch(() => undefined);
  const r = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const resumen = r.violations.map(v =>
    `${donde} · ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
  // soft: una corrida lista las violaciones de todas las pantallas, no solo la primera.
  expect.soft(resumen, `Violaciones de accesibilidad en ${donde}`).toEqual([]);
}

/** Datos de ejemplo desde la bienvenida (los mismos que ve un reclutador en la demo). */
async function conDatos(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar con datos de ejemplo/ }).click();
  await page.waitForURL(/\/estadisticas/, { timeout: 60_000 });
  return page.evaluate(async () => {
    const db: IDBDatabase = await new Promise(ok => { const r = indexedDB.open('stenbrary-db'); r.onsuccess = () => ok(r.result); });
    return new Promise<string>(ok => {
      const r = db.transaction('alumnos').objectStore('alumnos').getAll();
      r.onsuccess = () => ok(r.result[0].matricula);
    });
  });
}

for (const [nombre, viewport] of [['escritorio', { width: 1366, height: 800 }], ['móvil', { width: 390, height: 844 }]] as const) {
  test.describe(`Accesibilidad (${nombre})`, () => {
    test.use({ viewport });

    test('flujo de la puerta: escáner, alumno nuevo y elegir actividad', async ({ page }) => {
      test.setTimeout(120_000);
      await conDatos(page);
      await page.goto('/scanner');
      await expect(page.locator('app-scanner')).toBeVisible();
      await revisar(page, '/scanner');

      await page.goto('/registro-alumno');
      await revisar(page, '/registro-alumno');

      const alumno = await page.evaluate(async () => {
        const db: IDBDatabase = await new Promise(ok => { const r = indexedDB.open('stenbrary-db'); r.onsuccess = () => ok(r.result); });
        return new Promise<unknown>(ok => { const r = db.transaction('alumnos').objectStore('alumnos').getAll(); r.onsuccess = () => ok(r.result[0]); });
      });
      await page.evaluate(a => sessionStorage.setItem('alumnoActual', JSON.stringify(a)), alumno);
      await page.goto('/seleccion-motivo');
      await expect(page.locator('.motivo-card').first()).toBeVisible();
      await revisar(page, '/seleccion-motivo');
    });

    test('pantallas de consulta y administración', async ({ page }) => {
      test.setTimeout(180_000);
      const matricula = await conDatos(page);
      for (const ruta of [
        '/dashboard', '/registros', '/alumnos', `/detalle-alumno/${matricula}`, '/inactivos',
        '/estadisticas', '/estadisticas?tab=personas', '/estadisticas?tab=comparar',
        '/configuracion', '/configuracion#datos', '/configuracion#quiosco',
        '/importar-alumnos', '/gestion-motivos', '/presencia', '/novedades', '/diagnostico',
      ]) {
        await page.goto(ruta);
        await expect(page.locator('app-root')).not.toBeEmpty();
        await page.waitForLoadState('networkidle');
        await revisar(page, ruta);
      }
    });
  });
}
