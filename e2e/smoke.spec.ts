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

  test('saltar pide confirmación antes de salir', async ({ page }) => {
    // El enlace de saltar está justo debajo del botón de continuar y se pulsa
    // sin querer. Un descuido no debe costar toda la configuración.
    await page.goto('/bienvenida');
    await page.getByText(/Saltar y usar los valores por defecto/i).click();

    await expect(page.getByText(/¿Saltar la configuración\?/)).toBeVisible();

    // Arrepentirse deja el asistente donde estaba.
    await page.getByRole('button', { name: /Seguir configurando/ }).click();
    await expect(page).toHaveURL(/\/bienvenida$/);
    await expect(page.getByText(/Bienvenido a Stenbrary/i)).toBeVisible();
  });

  test('se puede saltar y deja de aparecer', async ({ page }) => {
    // El asistente no puede volverse una trampa: quien lo salta debe poder
    // usar el sistema y no encontrárselo otra vez en cada recarga.
    await page.goto('/bienvenida');
    await page.getByText(/Saltar y usar los valores por defecto/i).click();
    await page.getByRole('button', { name: /^Saltar$/ }).click();

    // Saltar la configuración no salta el arranque: el libro se cierra igual.
    // Antes esto navegaba directo y quien usaba los valores por defecto nunca
    // veía el cierre, que es la señal de que la instalación terminó.
    await expect(page.locator('.arranque')).toBeVisible();
    await expect(page).toHaveURL(/\/scanner$/, { timeout: 8000 });

    await page.goto('/');
    await expect(page).toHaveURL(/\/scanner$/);
  });

  test('elegir modo quiosco NO expulsa del asistente', async ({ page }) => {
    // Regresión: `setModoQuiosco(true)` dispara un effect en AppComponent que
    // saca de cualquier ruta ajena al flujo operativo. Al guardarlo en pleno
    // paso 7, el asistente se cerraba solo y saltaba al scanner.
    await page.goto('/bienvenida');

    // Avanzar hasta el paso del quiosco.
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /Siguiente/ }).click();
      await page.waitForTimeout(500);
    }
    const opcionQuiosco = page.getByRole('button', { name: /La tablet queda sola/ });
    await expect(opcionQuiosco).toBeVisible();

    await opcionQuiosco.click();
    await page.getByRole('button', { name: /Siguiente/ }).click();
    await page.waitForTimeout(600);

    // Sigue dentro del asistente, en el paso siguiente.
    await expect(page).toHaveURL(/\/bienvenida$/);
    await expect(page.getByText(/Avisos y seguimiento/i)).toBeVisible();
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

test('con modo quiosco elegido, el arranque SIGUE viéndose', async ({ page }) => {
  test.setTimeout(60_000);
  // Regresión: activar el quiosco antes de la animación disparaba el effect
  // de AppComponent y redirigía al scanner al instante, comiéndose el
  // arranque entero. Solo fallaba si se elegía esa opción.
  await page.goto('/bienvenida');

  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: /Siguiente/ }).click();
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /La tablet queda sola/ }).click();

  await terminarAsistente(page);
  await expect(page.locator('.arranque')).toBeVisible();
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

test.describe('Escáner: botón de cámara configurable (v3.45.0)', () => {
  test('por defecto se ofrece la cámara como respaldo', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
    await page.goto('/scanner');
    await expect(page.getByRole('button', { name: /Usar la cámara/ })).toBeVisible();
  });

  test('si se oculta en Configuración, no aparece y la captura manual sigue', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stenbrary-setup-completado', '1');
      localStorage.setItem('stenbrary-config', JSON.stringify({ mostrarBotonCamara: false }));
    });
    await page.goto('/scanner');
    await expect(page.locator('app-scanner')).toBeVisible();
    await expect(page.getByRole('button', { name: /Usar la cámara/ })).toHaveCount(0);
  });
});

test.describe('Escáner: aviso de privacidad (v3.48.0)', () => {
  test('por defecto se muestra; el texto lo pone el coordinador', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stenbrary-setup-completado', '1');
      localStorage.setItem('stenbrary-config', JSON.stringify({ avisoPrivacidadTexto: 'Texto propio de la biblioteca' }));
    });
    await page.goto('/scanner');
    await expect(page.locator('.aviso-privacidad')).toHaveText(/Texto propio de la biblioteca/);
  });

  test('si se oculta, no aparece', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stenbrary-setup-completado', '1');
      localStorage.setItem('stenbrary-config', JSON.stringify({ avisoPrivacidadActivo: false }));
    });
    await page.goto('/scanner');
    await expect(page.locator('app-scanner')).toBeVisible();
    await expect(page.locator('.aviso-privacidad')).toHaveCount(0);
  });
});

test.describe('Quiosco: volver solo por inactividad (v3.49.0)', () => {
  async function abrirConMinutos(page: import('@playwright/test').Page, minutos: number) {
    await page.clock.install();
    await page.addInitScript((m) => {
      localStorage.setItem('stenbrary-setup-completado', '1');
      localStorage.setItem('stenbrary-config', JSON.stringify({ quioscoAutoMinutos: m }));
    }, minutos);
    await page.goto('/registros');
    await expect(page.locator('app-registros')).toBeVisible();
  }

  test('tras los minutos sin uso, se reactiva y regresa al escáner', async ({ page }) => {
    await abrirConMinutos(page, 5);
    await page.clock.fastForward('05:30');
    await expect(page).toHaveURL(/\/scanner/);
    await expect(page.locator('.kiosk-mode')).toBeVisible();
  });

  test('con 0 (nunca) se queda donde estaba', async ({ page }) => {
    await abrirConMinutos(page, 0);
    await page.clock.fastForward('30:00');
    await expect(page).toHaveURL(/\/registros/);
    await expect(page.locator('.kiosk-mode')).toHaveCount(0);
  });
});

test.describe('Quiosco: PIN con límite, respaldo sin salir y bitácora (v3.52.0)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stenbrary-setup-completado', '1');
      if (!sessionStorage.getItem('e2e-config-puesta')) {
        localStorage.setItem('stenbrary-config', JSON.stringify({
          modoQuiosco: true, quioscoPin: '2468', nombreEquipo: 'Puerta',
        }));
        sessionStorage.setItem('e2e-config-puesta', '1');
      }
    });
    await page.goto('/scanner');
    await expect(page.locator('.kiosk-mode')).toBeVisible();
  });

  /** 5 toques rápidos en una zona vacía del escáner abren el diálogo del PIN. */
  async function abrirPin(page: import('@playwright/test').Page) {
    const caja = (await page.locator('.scanner-container').boundingBox())!;
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(caja.x + 8, caja.y + 8);
      await page.mouse.down();
      await page.mouse.up();
    }
    await expect(page.locator('app-quiosco-pin-dialog')).toBeVisible();
  }

  test('5 PIN incorrectos bloquean, y recargar no lo reinicia', async ({ page }) => {
    await abrirPin(page);
    const input = page.locator('.pin-input');
    for (let i = 0; i < 4; i++) {
      await input.fill('1111');
      await input.press('Enter');
    }
    await expect(page.locator('.pin-error')).toContainText('Te queda 1 intento');
    await input.fill('1111');
    await input.press('Enter');
    await expect(page.locator('.pin-bloqueo')).toContainText('Demasiados intentos');

    await page.reload();
    await abrirPin(page);
    await expect(page.locator('.pin-bloqueo')).toBeVisible();
    await expect(page.locator('.pin-input')).toHaveCount(0);
  });

  test('respaldo sin salir del quiosco; la salida queda en la bitácora', async ({ page }) => {
    await abrirPin(page);
    await page.locator('.pin-input').fill('2468');
    await page.locator('.pin-input').press('Enter');

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: /Descargar respaldo/ }).click();
    expect((await descarga).suggestedFilename()).toMatch(/^stenbrary_backup_.*\.json$/);
    await expect(page.locator('.pin-ok')).toContainText('Descargado');
    await page.getByRole('button', { name: 'Listo' }).click();
    await expect(page.locator('.kiosk-mode')).toBeVisible();          // sigue en quiosco

    await abrirPin(page);
    await page.locator('.pin-input').fill('2468');
    await page.locator('.pin-input').press('Enter');
    await page.getByRole('button', { name: /Salir del modo quiosco/ }).click();
    await expect(page.locator('.kiosk-mode')).toHaveCount(0);

    await page.goto('/configuracion#bitacora');
    const lista = page.locator('.bitacora-lista');
    await expect(lista).toContainText('Salió del modo quiosco');
    await expect(lista).toContainText('Descargó un respaldo');
    await expect(lista.locator('.evento-equipo').first()).toHaveText('Puerta');
  });
});
