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
