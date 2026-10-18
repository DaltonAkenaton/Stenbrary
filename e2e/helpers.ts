// Ayudas compartidas por los specs E2E (no es un spec: Playwright no lo corre).
import { Page, expect } from '@playwright/test';

/**
 * Confirma una acción que pide el PIN del coordinador (v3.57.0). Sin
 * configurar, el PIN es el de fábrica.
 */
export async function confirmarConPin(page: Page, pin = '0000'): Promise<void> {
  const dialogo = page.locator('app-pin-coordinador-dialog');
  await expect(dialogo).toBeVisible();
  await dialogo.locator('.pin-input').fill(pin);
  await dialogo.locator('.pin-confirmar').click();
}
