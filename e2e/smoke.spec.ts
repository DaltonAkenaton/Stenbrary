// ╔══════════════════════════════════════════════════════╗
// ║  e2e/smoke.spec.ts                                   ║
// ║  Stenbrary v3.12.1                                   ║
// ║                                                      ║
// ║  Smoke test mínimo: verifica que la app arranca,     ║
// ║  el shell se monta correctamente y los componentes   ║
// ║  globales (toast-container, loading overlay) están   ║
// ║  presentes en el DOM.                                ║
// ║                                                      ║
// ║  Objetivo: detectar regresiones tipo "componente     ║
// ║  huérfano no montado" sin depender de cámara,        ║
// ║  IndexedDB poblada, ni flujos con permisos.          ║
// ╚══════════════════════════════════════════════════════╝

import { test, expect } from '@playwright/test';

test.describe('Smoke: shell y componentes globales', () => {
  // Un navegador limpio + base vacía = instalación nueva, y desde v3.30 eso
  // lleva al asistente inicial. Estos tests son sobre el shell, así que se
  // marca el setup como hecho antes de cargar. El comportamiento del
  // asistente se prueba aparte, abajo.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stenbrary-setup-completado', '1');
    });
  });

  test('la app redirige a /scanner y monta el shell', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/scanner$/);
    await expect(page.locator('app-root')).toBeVisible();
  });

  test('toast-container está montado (regresión v3.12.0)', async ({ page }) => {
    await page.goto('/');
    // El contenedor debe existir aunque no haya toasts visibles.
    const toast = page.locator('app-toast-container');
    await expect(toast).toHaveCount(1);
  });

  test('bottom-nav / topbar renderizan elementos de navegación', async ({ page }) => {
    await page.goto('/');
    // El shell monta al menos un link a alguna vista principal.
    // Se busca por el texto visible en sidebar/bottom-nav.
    const anyNav = page.getByRole('link').or(page.getByRole('button'));
    await expect(anyNav.first()).toBeVisible();
  });

  test('/novedades renderiza el CHANGELOG', async ({ page }) => {
    await page.goto('/novedades');
    // Versión actual (del CHANGELOG) debe estar visible.
    await expect(page.getByText(/v?3\.\d+\.\d+/).first()).toBeVisible();
  });
});

test.describe('Asistente de configuración inicial', () => {
  test('una instalación nueva aterriza en /bienvenida', async ({ page }) => {
    // Sin marca de setup y sin datos: es la primera vez que alguien abre
    // el sistema. Debe encontrarse el asistente, no el escáner en blanco.
    await page.goto('/');
    await expect(page).toHaveURL(/\/bienvenida$/);
    await expect(page.getByText(/Bienvenido a Stenbrary/i)).toBeVisible();
  });

  test('se puede saltar y deja de aparecer', async ({ page }) => {
    // El asistente no puede volverse una trampa: quien lo salta debe poder
    // usar el sistema y no encontrárselo otra vez en cada recarga.
    await page.goto('/bienvenida');
    await page.getByText(/Saltar y usar los valores por defecto/i).click();
    await expect(page).toHaveURL(/\/scanner$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/scanner$/);
  });

  test('quien ya tiene datos NO ve el asistente', async ({ page }) => {
    // Regresión: sin la comprobación de base vacía, cada usuario existente
    // se habría encontrado el asistente al actualizar, con riesgo de pisar
    // su configuración.
    await page.goto('/');
    await page.waitForSelector('app-root');
    await page.evaluate(async () => {
      localStorage.removeItem('stenbrary-setup-completado');
      const db: IDBDatabase = await new Promise((ok, no) => {
        const r = indexedDB.open('stenbrary-db');
        r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
      });
      await new Promise<void>((ok, no) => {
        const tx = db.transaction('alumnos', 'readwrite');
        tx.objectStore('alumnos').put({
          id: 'a-existente', matricula: '2241419999', nombre: 'Previo',
          apellidoPaterno: 'Usuario', apellidoMaterno: 'Antiguo',
          carrera: 'ISC', grado: 1, grupo: 'A', turno: 'Matutino',
          activo: true, fechaRegistro: new Date(), datosExtra: {},
        });
        tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error);
      });
      db.close();
    });

    await page.goto('/');
    await expect(page).toHaveURL(/\/scanner$/);
  });
});

test('al terminar el asistente se ve el arranque y se entra al sistema', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/bienvenida');

  await terminarAsistente(page);

  // El arranque debe verse antes de entrar.
  await expect(page.locator('.arranque')).toBeVisible();
  await expect(page.getByText('Toca para continuar')).toBeVisible({ timeout: 5000 });

  // Y no puede ser una trampa: termina solo en el sistema.
  await expect(page).toHaveURL(/\/scanner$/, { timeout: 8000 });
});

test('el arranque se puede saltar con un clic', async ({ page }) => {
  // Nadie debe quedar atrapado mirando una animación.
  await page.addInitScript(() => {
    localStorage.setItem('stenbrary-setup-completado', '1');
  });
  await page.goto('/bienvenida');

  await terminarAsistente(page);
  await page.locator('.arranque').click();
  await expect(page).toHaveURL(/\/scanner$/, { timeout: 3000 });
});

/**
 * Avanza el asistente hasta el último paso.
 *
 * Espera a que aparezca el botón final en lugar de contar pasos con un
 * tiempo fijo: así el test no se rompe si cambia el número de pasos ni la
 * duración de la animación del mazo.
 */
async function recorrerAsistente(page: import('@playwright/test').Page): Promise<void> {
  const final = page.getByRole('button', { name: /Empezar a usar Stenbrary/ });
  for (let i = 0; i < 25; i++) {
    if (await final.count() > 0) return;
    await page.getByRole('button', { name: /Siguiente/ }).click();
    // Mayor que MS_SALIDA (380ms): por debajo de ese umbral el componente
    // descarta el clic a propósito, y el test contaría avances que no
    // ocurrieron.
    await page.waitForTimeout(500);
  }
  throw new Error('El asistente no llegó al último paso');
}

/** Pulsa el botón final y espera a que aparezca el arranque. */
async function terminarAsistente(page: import('@playwright/test').Page): Promise<void> {
  await recorrerAsistente(page);
  await page.getByRole('button', { name: /Empezar a usar Stenbrary/ }).click();
  await page.locator('.arranque').waitFor({ state: 'visible' });
}
