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
import fs from 'node:fs';
import path from 'node:path';
import { confirmarConPin } from './helpers';

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
      // v3.62.0: comprobar el hash tarda; el diálogo ignora un reenvío
      // mientras tanto. Tras un fallo el campo se vacía.
      await expect(input).toHaveValue('');
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

  test('una credencial leída con el diálogo del PIN abierto no cuenta como intento (v3.54.0)', async ({ page }) => {
    await abrirPin(page);
    await page.locator('.pin-input').focus();
    await page.keyboard.type('2200000001', { delay: 5 });
    await page.keyboard.press('Enter');
    await expect(page.getByText('no cuenta como intento')).toBeVisible();
    await expect(page.locator('.pin-error')).toHaveCount(0);
    await expect(page.locator('.pin-input')).toHaveValue('');
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

  test('con el código de recuperación se pone un PIN nuevo y se sale (v3.57.0)', async ({ page }) => {
    await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('stenbrary-config')!);
      localStorage.setItem('stenbrary-config', JSON.stringify({ ...c, quioscoCodigoRecuperacion: 'ABCD-EFGH-JKLM' }));
    });
    await page.reload();
    await abrirPin(page);
    await page.getByRole('button', { name: '¿Olvidaste el PIN?' }).click();
    const codigo = page.locator('.codigo-input');
    await codigo.fill('abcd efgh jkln');                       // equivocado: cuenta como intento
    await codigo.press('Enter');
    await expect(page.locator('.pin-error')).toContainText('Código incorrecto');
    await codigo.fill('abcd efgh jklm');                       // minúsculas y sin guiones: vale
    await codigo.press('Enter');

    await page.locator('.nuevo-pin-1').fill('1357');
    await page.locator('.nuevo-pin-2').fill('1358');
    await page.getByRole('button', { name: 'Guardar PIN' }).click();
    await expect(page.locator('.pin-error')).toContainText('no coinciden');
    await page.locator('.nuevo-pin-2').fill('1357');
    await page.getByRole('button', { name: 'Guardar PIN' }).click();
    const nuevo = (await page.locator('.codigo-recuperacion').innerText()).trim();
    expect(nuevo).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(nuevo).not.toBe('ABCD-EFGH-JKLM');                  // el usado deja de servir
    await page.getByRole('button', { name: 'Ya lo anoté' }).click();
    await page.getByRole('button', { name: /Salir del modo quiosco/ }).click();
    await expect(page.locator('.kiosk-mode')).toHaveCount(0);

    // v3.62.0: se guardan sus hashes, nunca el PIN ni el código.
    const guardado = await page.evaluate(() => localStorage.getItem('stenbrary-config')!);
    expect(JSON.parse(guardado).quioscoPin).toMatch(/^pbkdf2-sha256\$600000\$/);
    expect(JSON.parse(guardado).quioscoCodigoRecuperacion).toMatch(/^pbkdf2-sha256\$/);
    expect(guardado).not.toContain('1357');
    expect(guardado).not.toContain(nuevo);
    expect(guardado).not.toContain('ABCD');
    await page.goto('/configuracion#bitacora');
    await expect(page.locator('.bitacora-lista')).toContainText('Usó el código de recuperación');
  });
});

test.describe('PIN del coordinador para lo que no se deshace (v3.57.0)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
  });

  test('las herramientas de prueba están escondidas tras el PIN; ya no hay "Eliminar todos los datos"', async ({ page }) => {
    await page.goto('/configuracion#datos');
    await expect(page.locator('app-limpieza-registros')).toBeVisible();
    await expect(page.locator('app-datos-prueba')).toHaveCount(0);

    await page.goto('/configuracion#avanzado');
    await expect(page.getByText('Restablecer el sistema (dejarlo como nuevo)')).toBeVisible();
    await expect(page.getByText('Eliminar todos los datos')).toHaveCount(0);
    await expect(page.getByText('DESTRUCCION_HABILITADA')).toHaveCount(0);
    await expect(page.locator('app-datos-prueba')).toHaveCount(0);
    await page.getByRole('button', { name: /Mostrar herramientas de prueba/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('app-datos-prueba')).toBeVisible();
  });

  test('cambiar el PIN pide el actual; el PIN ya no se lee en Configuración', async ({ page }) => {
    await page.goto('/configuracion#quiosco');
    await expect(page.locator('#quioscoPin')).toHaveCount(0);
    await expect(page.getByText('Sin código de recuperación')).toBeVisible();
    await page.getByRole('button', { name: /Cambiar PIN/ }).click();
    await confirmarConPin(page, '9999');
    await expect(page.locator('.pin-error')).toContainText('PIN incorrecto');
    await page.locator('app-pin-coordinador-dialog .pin-input').fill('0000');
    await page.locator('.pin-confirmar').click();
    await page.locator('.nuevo-pin-1').fill('482916');
    await page.locator('.nuevo-pin-2').fill('482916');
    await page.locator('.nuevo-pin-2').press('Enter');
    await expect(page.locator('.codigo-recuperacion')).toBeVisible();
    await page.getByRole('button', { name: 'Ya lo anoté' }).click();
    await expect(page.getByText('PIN de 6 dígitos')).toBeVisible();
    await expect(page.getByText('Código de recuperación: generado')).toBeVisible();
    const guardado = await page.evaluate(() => localStorage.getItem('stenbrary-config')!);
    expect(JSON.parse(guardado).quioscoPin).toMatch(/^pbkdf2-sha256\$/);
    expect(guardado).not.toContain('482916');
    // El PIN nuevo es el que autoriza ahora.
    await page.getByRole('button', { name: /Cambiar PIN/ }).click();
    await confirmarConPin(page, '482916');
    await expect(page.locator('.nuevo-pin-1')).toBeVisible();
  });

  test('una instalación de antes con el PIN en texto plano lo migra a hash y el PIN sigue sirviendo (v3.62.0)', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-pin-viejo')) {
        localStorage.setItem('stenbrary-config', JSON.stringify({ quioscoPin: '2580', quioscoCodigoRecuperacion: 'WXYZ-2345-6789' }));
        sessionStorage.setItem('e2e-pin-viejo', '1');
      }
    });
    await page.goto('/configuracion#quiosco');
    await expect(page.getByText('PIN de 4 dígitos')).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('stenbrary-config')!))
      .not.toContain('2580');
    const guardado = await page.evaluate(() => localStorage.getItem('stenbrary-config')!);
    expect(guardado).not.toContain('WXYZ');
    await page.getByRole('button', { name: /Cambiar PIN/ }).click();
    await confirmarConPin(page, '2580');
    await expect(page.locator('.nuevo-pin-1')).toBeVisible();
  });
});

test.describe('Puerta 24/7: cierre automático sin abrir "En Biblioteca" (v3.53.0)', () => {
  test('la entrada sin salida se cierra sola y el aforo baja, en el escáner', async ({ page }) => {
    const ahora = new Date('2026-10-14T12:00:00-05:00');
    await page.clock.install({ time: ahora });
    await page.addInitScript(() => {
      localStorage.setItem('stenbrary-setup-completado', '1');
      if (!sessionStorage.getItem('e2e-config-puesta')) {
        localStorage.setItem('stenbrary-config', JSON.stringify({
          registroSalidaActivo: true, horasAutoSalida: 2, aforoMaximo: 10,
        }));
        sessionStorage.setItem('e2e-config-puesta', '1');
      }
    });
    // Entró hace 1 h 59 min y nunca registró salida.
    const entrada = new Date(ahora.getTime() - 119 * 60_000).toISOString();
    const respaldo = {
      meta: { version: '3.4', fecha: ahora.toISOString(), app: 'Stenbrary', totalAlumnos: 1, totalRegistros: 1, totalMotivos: 1 },
      alumnos: [{ id: 'a1', matricula: '2200000001', nombre: 'Ana', apellidoPaterno: 'P', apellidoMaterno: 'M', carrera: 'Ing. TI', grado: 1, grupo: 'A', turno: 'Matutino', activo: true, fechaRegistro: entrada }],
      registros: [{ id: 'r1', alumnoId: 'a1', matricula: '2200000001', nombreCompleto: 'Ana P M', carrera: 'Ing. TI', motivoId: 'm1', motivoNombre: 'Estudiar', motivoIds: ['m1'], motivoNombres: ['Estudiar'], fechaHora: entrada, sincronizado: false }],
      motivos: [{ id: 'm1', nombre: 'Estudiar', icono: 'school', orden: 1, activo: true }],
    };
    await page.goto('/configuracion#datos');
    await page.locator('input[type="file"][accept=".json"]').setInputFiles({
      name: 'r.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(respaldo)),
    });
    await page.getByRole('button', { name: /Reemplazar todo/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('.import-result.success')).toBeVisible({ timeout: 15000 });

    await page.goto('/scanner');
    await expect(page.locator('.aforo-detalle')).toContainText(/1\s*\/\s*10/);
    await page.clock.fastForward('02:05');       // vence el umbral de 2 h; corre la revisión de cada minuto
    await expect(page.locator('.aforo-detalle')).toContainText(/0\s*\/\s*10/);
    await expect(page).toHaveURL(/\/scanner/);    // nadie abrió "En Biblioteca"
  });
});

test.describe('Puerta: el lector fuera del escáner y pantallas abandonadas (v3.54.0)', () => {
  const FIXTURE = path.join(__dirname, 'fixtures', 'cuadre.json');

  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-14T12:00:00-05:00') });
    await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
    await page.goto('/configuracion#datos');
    await page.locator('input[type="file"][accept=".json"]').setInputFiles(FIXTURE);
    await page.getByRole('button', { name: /Reemplazar todo/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('.import-result.success')).toBeVisible({ timeout: 15000 });
    await page.goto('/scanner');
    await expect(page.locator('app-scanner')).toBeVisible();
    // Que el escáner ya escuche: con la máquina cargada, la primera tecla del
    // "lector" se perdía y la prueba fallaba de vez en cuando.
    await expect(page.locator('.matricula-input')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
  });

  /** El lector: teclas muy rápidas y Enter, sin foco en ningún campo. */
  async function pasarCredencial(page: import('@playwright/test').Page, matricula: string) {
    await page.keyboard.type(matricula, { delay: 5 });
    await page.keyboard.press('Enter');
  }

  test('pantalla abandonada: la credencial del siguiente la reemplaza', async ({ page }) => {
    await pasarCredencial(page, '2200000001');
    await expect(page.locator('.student-name')).toContainText('Ana', { timeout: 10000 });
    await page.clock.fastForward('00:25');                 // Ana se fue sin elegir
    await pasarCredencial(page, '2200000002');
    await expect(page.locator('.student-name')).toContainText('Beto', { timeout: 10000 });
  });

  test('con alguien eligiendo, la del siguiente espera y su Enter no presiona nada', async ({ page }) => {
    await pasarCredencial(page, '2200000001');
    await expect(page.locator('.student-name')).toContainText('Ana', { timeout: 10000 });
    await page.locator('.btn-registrar').focus();          // el foco quedó en "Registrar"
    await pasarCredencial(page, '2200000002');
    await expect(page.getByText('Hay un registro en curso')).toBeVisible();
    await expect(page.locator('.student-name')).toContainText('Ana');
    await expect(page.locator('.exito-nombre')).toHaveCount(0); // no se registró a Ana
  });

  test('matrícula a mano + Enter + Enter registra la entrada (v3.57.0)', async ({ page }) => {
    // Antes el foco quedaba en "Cancelar" y el segundo Enter cancelaba.
    await page.locator('.matricula-input').fill('2200000001');
    await page.locator('.matricula-input').press('Enter');
    await expect(page.locator('app-confirmacion-matricula-dialog')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);                          // que termine la animación y el foco
    await page.keyboard.press('Enter');
    await expect(page.locator('.student-name')).toContainText('Ana', { timeout: 10000 });
  });

  test('Enter rápido o repetido en la confirmación no deja otra encima (v3.57.3)', async ({ page }) => {
    // Los Enter que llegaban antes de que el diálogo tomara el foco seguían
    // cayendo en la caja y abrían una confirmación por cada uno; al confirmar
    // la de arriba, la de abajo quedaba sobre "¿Para qué vienes?".
    await page.locator('.matricula-input').fill('2200000001');
    await page.locator('.matricula-input').press('Enter');
    await page.locator('.matricula-input').press('Enter');
    await page.locator('.matricula-input').press('Enter');
    await expect(page.locator('app-confirmacion-matricula-dialog')).toHaveCount(1, { timeout: 10000 });
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await expect(page.locator('.student-name')).toContainText('Ana', { timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(page.locator('app-confirmacion-matricula-dialog')).toHaveCount(0);
  });

  test('con la confirmación abierta, otra credencial no la confirma (v3.57.0)', async ({ page }) => {
    await page.locator('.matricula-input').fill('2200000001');
    await page.locator('.matricula-input').press('Enter');
    await expect(page.locator('app-confirmacion-matricula-dialog')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);
    await pasarCredencial(page, '2200000002');               // su Enter caería en "Confirmar"
    await expect(page.getByText('Se pasó otra credencial')).toBeVisible();
    await expect(page.locator('app-confirmacion-matricula-dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/scanner/);
  });

  test('sin tocar nada 90 s, vuelve solo al escáner', async ({ page }) => {
    await pasarCredencial(page, '2200000001');
    await expect(page.locator('.student-name')).toContainText('Ana', { timeout: 10000 });
    await page.clock.fastForward('01:35');
    await expect(page).toHaveURL(/\/scanner/);
    await expect(page.getByText('Registro cancelado por inactividad')).toBeVisible();
  });

  test('registro de alumno nuevo: solo letras, nombres capitalizados, materno opcional', async ({ page }) => {
    await pasarCredencial(page, '2299999999');
    await expect(page).toHaveURL(/\/registro-alumno/, { timeout: 10000 });
    await page.locator('input[formcontrolname="nombre"]').fill('ana2');
    await page.locator('input[formcontrolname="nombre"]').blur();
    await expect(page.getByText('Solo letras, espacios y guiones')).toBeVisible();

    await page.locator('input[formcontrolname="nombre"]').fill('  juan   carlos ');
    await page.locator('input[formcontrolname="apellidoPaterno"]').fill('GARCÍA');
    for (const [campo, opcion] of [['carrera', 0], ['grado', 0], ['grupo', 0], ['turno', 0]] as const) {
      await page.locator(`mat-select[formcontrolname="${campo}"]`).click();
      await page.locator('mat-option').nth(opcion).click();
    }
    await page.getByRole('button', { name: /Registrar/ }).last().click();
    await expect(page).toHaveURL(/\/seleccion-motivo/, { timeout: 10000 });
    await expect(page.locator('.student-name')).toContainText('Juan');

    await page.goto('/detalle-alumno/2299999999');
    await expect(page.locator('h2').first()).toContainText('Juan Carlos García');
  });
});

test.describe('Importar el padrón (v3.57.0)', () => {
  test('encabezados de otro sistema, mayúsculas, prefijo "a", sin materno y repetidos', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
    await page.goto('/importar-alumnos');
    await page.locator('input[type="file"][accept=".xlsx,.xls,.csv"]').setInputFiles(
      path.join(__dirname, 'fixtures', 'padron-casos.xlsx'));

    // "Cuenta" es la matrícula: antes caía al alias "id" y tomaba "Primer apellido".
    const selMatricula = page.locator('.mapeo-item', { hasText: 'Matrícula' }).locator('select');
    await expect(selMatricula).toHaveValue('Cuenta');
    await expect(page.locator('.validacion-resumen')).toContainText(/2\s*válidos/);
    await expect(page.locator('.validacion-resumen')).toContainText(/2\s*con errores/);   // repetida + 12345

    await page.locator('.btn-import').click();
    await expect(page.getByText('Importación Completada')).toBeVisible({ timeout: 15000 });

    const guardados = await page.evaluate(async () => {
      const db: IDBDatabase = await new Promise(ok => { const r = indexedDB.open('stenbrary-db'); r.onsuccess = () => ok(r.result); });
      return new Promise<any[]>(ok => { const r = db.transaction('alumnos').objectStore('alumnos').getAll(); r.onsuccess = () => ok(r.result); });
    });
    const rosa = guardados.find(a => a.matricula === '2300200001');
    const ivan = guardados.find(a => a.matricula === '2300200002');   // sin la "a"
    expect([rosa?.nombre, rosa?.apellidoPaterno, rosa?.carrera, rosa?.grado, rosa?.grupo, rosa?.turno])
      .toEqual(['Rosa Elena', 'Valdez', 'Contador Público', 4, 'A', 'Matutino']);
    expect([ivan?.apellidoPaterno, ivan?.apellidoMaterno]).toEqual(['De la Garza', '']);
    expect(guardados.length).toBe(2);
  });

  test('un archivo que no es hoja de cálculo se rechaza con el motivo y no guarda nada (v3.62.0)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
    await page.goto('/importar-alumnos');
    const input = page.locator('input[type="file"][accept=".xlsx,.xls,.csv"]');

    // Texto con extensión .xlsx: la firma no es ZIP.
    await input.setInputFiles({ name: 'padron.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('Matricula,Nombre\n1,x\n') });
    await expect(page.getByRole('alert')).toContainText('no corresponde a un archivo .xlsx');

    // Un .xlsx que sí es ZIP pero está truncado: lo detecta la lectura en el Worker.
    const real = fs.readFileSync(path.join(__dirname, 'fixtures', 'padron-casos.xlsx'));
    await input.setInputFiles({ name: 'danado.xlsx', mimeType: 'application/octet-stream', buffer: real.subarray(0, 300) });
    await expect(page.getByRole('alert')).toContainText('dañado');

    // Sigue en el primer paso y la base no cambió.
    await expect(page.locator('.mapeo-item')).toHaveCount(0);
    const total = await page.evaluate(async () => {
      const db: IDBDatabase = await new Promise(ok => { const r = indexedDB.open('stenbrary-db'); r.onsuccess = () => ok(r.result); });
      return new Promise<number>(ok => { const r = db.transaction('alumnos').objectStore('alumnos').count(); r.onsuccess = () => ok(r.result); });
    });
    expect(total).toBe(0);
  });
});

test.describe('Aforo y cierre al final del horario (v3.57.0)', () => {
  const AHORA = new Date('2026-10-14T12:00:00-05:00');   // miércoles

  /** Ana adentro desde las 11:00 sin salida; config a la medida de cada prueba. */
  async function preparar(page: import('@playwright/test').Page, config: Record<string, unknown>) {
    await page.clock.install({ time: AHORA });
    await page.addInitScript((cfg) => {
      localStorage.setItem('stenbrary-setup-completado', '1');
      if (!sessionStorage.getItem('e2e-config-puesta')) {
        localStorage.setItem('stenbrary-config', JSON.stringify(cfg));
        sessionStorage.setItem('e2e-config-puesta', '1');
      }
    }, config);
    const entrada = new Date(AHORA.getTime() - 60 * 60_000).toISOString();
    const alumno = (id: string, m: string, n: string) => ({ id, matricula: m, nombre: n, apellidoPaterno: 'P', apellidoMaterno: 'M', carrera: 'Ing. TI', grado: 1, grupo: 'A', turno: 'Matutino', activo: true, fechaRegistro: entrada });
    const respaldo = {
      meta: { version: '3.4', fecha: AHORA.toISOString(), app: 'Stenbrary', totalAlumnos: 2, totalRegistros: 1, totalMotivos: 1 },
      alumnos: [alumno('a1', '2200000001', 'Ana'), alumno('a2', '2200000002', 'Beto'),
        { ...alumno('a3', '2200000003', 'Carla'), activo: false }],
      registros: [{ id: 'r1', alumnoId: 'a1', matricula: '2200000001', nombreCompleto: 'Ana P M', carrera: 'Ing. TI', motivoId: 'm1', motivoNombre: 'Estudiar', motivoIds: ['m1'], motivoNombres: ['Estudiar'], fechaHora: entrada, sincronizado: false }],
      motivos: [{ id: 'm1', nombre: 'Estudiar', icono: 'school', orden: 1, activo: true }],
    };
    await page.goto('/configuracion#datos');
    await page.locator('input[type="file"][accept=".json"]').setInputFiles({
      name: 'r.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(respaldo)),
    });
    await page.getByRole('button', { name: /Reemplazar todo/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('.import-result.success')).toBeVisible({ timeout: 15000 });
    await page.goto('/scanner');
    // El escáner tiene que estar escuchando: si no, se pierde la primera tecla del lector.
    // Sin aforo no hay indicador: entonces la caja de matrícula, que se pinta después.
    await expect(page.locator(config['aforoMaximo'] ? '.aforo-detalle' : '.matricula-input')).toBeVisible({ timeout: 10000 });
    if (!config['aforoMaximo']) await page.waitForTimeout(500);
  }
  const pasarCredencial = async (page: import('@playwright/test').Page, m: string) => {
    await page.keyboard.type(m, { delay: 5 });
    await page.keyboard.press('Enter');
  };

  test('aforo lleno en modo "bloquear": no deja entrar', async ({ page }) => {
    await preparar(page, { registroSalidaActivo: true, aforoMaximo: 1, aforoModo: 'bloquear' });
    await expect(page.locator('.aforo-detalle')).toContainText(/1\s*\/\s*1/);
    await pasarCredencial(page, '2200000002');
    await expect(page.getByText(/Aforo lleno/)).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/scanner/);
  });

  test('aforo lleno en modo "confirmar": pregunta y deja entrar si se autoriza', async ({ page }) => {
    await preparar(page, { registroSalidaActivo: true, aforoMaximo: 1, aforoModo: 'confirmar' });
    await pasarCredencial(page, '2200000002');
    await expect(page.getByText('Aforo máximo alcanzado')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Autorizar entrada/ }).click();
    await expect(page.locator('.student-name')).toContainText('Beto', { timeout: 10000 });
  });

  test('aforo lleno en modo "permitir": deja entrar con aviso', async ({ page }) => {
    await preparar(page, { registroSalidaActivo: true, aforoMaximo: 1, aforoModo: 'permitir' });
    await pasarCredencial(page, '2200000002');
    await expect(page.getByText(/entrada permitida con alerta/)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.student-name')).toContainText('Beto', { timeout: 10000 });
  });

  test('cerrar al final del horario: sale a la hora de cierre y el aforo baja', async ({ page }) => {
    const dia = { cerrado: false, apertura: '07:00', cierre: '12:02' };
    await preparar(page, {
      registroSalidaActivo: true, aforoMaximo: 10, horarioActivo: true, cierreAlHorario: true,
      horarios: { 0: dia, 1: dia, 2: dia, 3: dia, 4: dia, 5: dia, 6: dia },
    });
    await expect(page.locator('.aforo-detalle')).toContainText(/1\s*\/\s*10/);
    await page.clock.fastForward('03:30');              // pasan las 12:02; corre la revisión de cada minuto
    await expect(page.locator('.aforo-detalle')).toContainText(/0\s*\/\s*10/, { timeout: 10000 });
    const salida = await page.evaluate(async () => {
      const db: IDBDatabase = await new Promise(ok => { const r = indexedDB.open('stenbrary-db'); r.onsuccess = () => ok(r.result); });
      const r: any = await new Promise(ok => { const q = db.transaction('registros').objectStore('registros').get('r1'); q.onsuccess = () => ok(q.result); });
      const d = new Date(r.horaSalida);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    expect(salida).toBe('12:02');                       // la hora de cierre, no la de la revisión
  });

  // ── Revisión de la puerta (v3.57.2) ─────────────────────────
  const leerR1 = (page: import('@playwright/test').Page) => page.evaluate(async () => {
    const db: IDBDatabase = await new Promise(ok => { const r = indexedDB.open('stenbrary-db'); r.onsuccess = () => ok(r.result); });
    return new Promise<any>(ok => { const q = db.transaction('registros').objectStore('registros').get('r1'); q.onsuccess = () => ok(q.result); });
  });

  test('horario en "bloquear": ya cerrado, la salida SÍ se registra y la entrada no', async ({ page }) => {
    const dia = { cerrado: false, apertura: '07:00', cierre: '11:30' };   // son las 12:00
    await preparar(page, {
      registroSalidaActivo: true, aforoMaximo: 10, horarioActivo: true, horarioModo: 'bloquear',
      horarios: { 0: dia, 1: dia, 2: dia, 3: dia, 4: dia, 5: dia, 6: dia },
    });
    await pasarCredencial(page, '2200000001');                     // Ana sale tarde
    await page.locator('app-registro-duplicado-dialog .btn-salida').click({ timeout: 10000 });
    await expect(page.locator('.toast-message', { hasText: 'Salida registrada' })).toBeVisible({ timeout: 10000 });
    expect((await leerR1(page)).horaSalida).toBeTruthy();
    await expect(page.locator('.aforo-detalle')).toContainText(/0\s*\/\s*10/, { timeout: 10000 });

    await page.clock.fastForward('00:02');
    await pasarCredencial(page, '2200000002');                     // Beto quiere entrar
    await expect(page.getByText(/Ya cerró/)).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/scanner/);
  });

  test('con "¿salida o nueva visita?" abierto, la credencial del siguiente no marca la salida', async ({ page }) => {
    await preparar(page, { registroSalidaActivo: true, aforoMaximo: 10 });
    await pasarCredencial(page, '2200000001');
    await expect(page.locator('app-registro-duplicado-dialog')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);                                // el foco queda en "Registrar salida"
    await pasarCredencial(page, '2200000002');
    await expect(page.getByText('Se pasó otra credencial')).toBeVisible();
    expect((await leerR1(page)).horaSalida).toBeFalsy();           // Ana sigue adentro

    // Ana se fue sin contestar: pasados 20 s, la credencial de Beto lo cierra y entra él.
    await page.clock.fastForward('00:25');
    await pasarCredencial(page, '2200000002');
    await expect(page.locator('.student-name')).toContainText('Beto', { timeout: 10000 });
    expect((await leerR1(page)).horaSalida).toBeFalsy();
  });

  // ── Flujos de la puerta sin prueba hasta v3.58.0 ────────────
  const leerRegistros = (page: import('@playwright/test').Page) => page.evaluate(async () => {
    const db: IDBDatabase = await new Promise(ok => { const r = indexedDB.open('stenbrary-db'); r.onsuccess = () => ok(r.result); });
    return new Promise<any[]>(ok => { const q = db.transaction('registros').objectStore('registros').getAll(); q.onsuccess = () => ok(q.result); });
  });
  const elegirActividadYRegistrar = async (page: import('@playwright/test').Page) => {
    await expect(page).toHaveURL(/\/seleccion-motivo/, { timeout: 10000 });
    await expect(page.locator('.motivo-card').first()).toBeVisible();
    // A quien ya vino se le preselecciona su última actividad: otro clic la quitaría.
    if (await page.locator('.motivo-card.selected').count() === 0) await page.locator('.motivo-card').first().click();
    await page.locator('.btn-registrar').click();
    await expect(page.locator('.toast-message', { hasText: 'Registro exitoso' })).toBeVisible({ timeout: 10000 });
  };

  test('visitante: entra con su nombre y su salida se marca desde la lista', async ({ page }) => {
    await preparar(page, { registroSalidaActivo: true, aforoMaximo: 10 });
    await page.getByRole('button', { name: /Continuar como invitado/ }).click();
    await page.locator('app-invitado-nombre-dialog input').fill('Laura Visitante');
    await page.getByRole('button', { name: /Continuar/ }).last().click();
    await elegirActividadYRegistrar(page);
    await page.clock.fastForward('00:06');                         // la pantalla de éxito regresa sola
    await expect(page.locator('.aforo-detalle')).toContainText(/2\s*\/\s*10/, { timeout: 10000 });

    await page.getByRole('button', { name: /Marcar salida de visitante/ }).click();
    await page.locator('.dlg-item', { hasText: 'Laura Visitante' }).click();
    // Hasta v3.58.0 el banner seguía en 2 hasta la siguiente entrada.
    await expect(page.locator('.aforo-detalle')).toContainText(/1\s*\/\s*10/, { timeout: 10000 });
    const laura = (await leerRegistros(page)).find(r => r.matricula === 'INVITADO');
    expect(laura?.nombreCompleto).toBe('Laura Visitante');
    expect(laura?.carrera).toBe('Visitante');
    expect(laura?.horaSalida).toBeTruthy();
  });

  test('sin registro de salida: la misma credencial dentro del umbral pregunta; Cancelar no cuenta y "Nueva visita" sí', async ({ page }) => {
    // Es el modo de fábrica. Ana entró hace 60 min; con umbral de 90 es "reciente".
    await preparar(page, { registroSalidaActivo: false, umbralDuplicadoMin: 90 });
    await pasarCredencial(page, '2200000001');
    await expect(page.locator('app-registro-duplicado-dialog')).toBeVisible({ timeout: 10000 });
    await page.locator('app-registro-duplicado-dialog .btn-cancelar').click();
    await expect(page).toHaveURL(/\/scanner/);
    expect(await leerRegistros(page)).toHaveLength(1);

    await page.clock.fastForward('00:03');
    await pasarCredencial(page, '2200000001');
    await page.locator('app-registro-duplicado-dialog .btn-nuevo').click({ timeout: 10000 });
    await elegirActividadYRegistrar(page);
    expect(await leerRegistros(page)).toHaveLength(2);
  });

  test('una credencial desactivada no entra', async ({ page }) => {
    await preparar(page, { registroSalidaActivo: true, aforoMaximo: 10 });
    await pasarCredencial(page, '2200000003');
    await expect(page.getByText('Esta credencial está inactiva')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/scanner/);
    expect(await leerRegistros(page)).toHaveLength(1);
  });

  test('"Deshacer" borra la visita recién registrada', async ({ page }) => {
    await preparar(page, { registroSalidaActivo: false });
    await pasarCredencial(page, '2200000002');
    await elegirActividadYRegistrar(page);
    expect(await leerRegistros(page)).toHaveLength(2);
    await page.locator('.toast-action', { hasText: 'Deshacer' }).click();
    await expect.poll(async () => (await leerRegistros(page)).length, { timeout: 10000 }).toBe(1);
  });

  test('hora ajustada a mano: la visita se guarda con la hora correcta, no con la de la PC (v3.59.0)', async ({ page }) => {
    // La PC marca las 12:00; la hora real son las 11:53 (va 7 min adelantada).
    await preparar(page, { registroSalidaActivo: false });
    await page.goto('/configuracion#general');
    await page.getByRole('button', { name: /Ajustar a mano/ }).click();
    await page.locator('.reloj-hora-input').fill('11:53');
    await page.locator('.btn-guardar-hora').click();
    await confirmarConPin(page);
    await expect(page.getByText(/La computadora va 7 min adelantada/)).toBeVisible({ timeout: 10000 });

    await page.goto('/scanner');
    await expect(page.locator('.matricula-input')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await pasarCredencial(page, '2200000002');
    await elegirActividadYRegistrar(page);
    const beto = (await leerRegistros(page)).find(r => r.matricula === '2200000002');
    // La hora se lee en el navegador (zona de Nuevo Laredo), no en Node: en CI
    // Node corre en UTC y daba 16:53.
    const hora = await page.evaluate(iso => {
      const d = new Date(iso);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }, beto.fechaHora);
    expect(hora).toBe('11:53');

    // Sobrevive a recargar: el desfase se guarda.
    await page.reload();
    await page.goto('/configuracion#general');
    await expect(page.getByText(/Ajustada a mano/)).toBeVisible({ timeout: 10000 });
  });

  test('el código de barras de un libro no abre el registro de alumno', async ({ page }) => {
    await preparar(page, { registroSalidaActivo: true, aforoMaximo: 10 });
    await pasarCredencial(page, '9786071512819');                  // ISBN-13
    await expect(page.getByText('Ese código no es una credencial')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/scanner/);
  });
});

test.describe('Claridad: Configuración, bitácora y salidas estimadas (v3.57.0)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
  });

  test('Horario e Inactividad viven en Operación, y "Cerrar al final del horario" lleva al horario', async ({ page }) => {
    await page.goto('/configuracion#quiosco');
    await expect(page.getByRole('heading', { name: 'Modo Quiosco' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Horarios de Operación' })).toHaveCount(0);
    await page.goto('/configuracion#experiencia');
    await expect(page.getByRole('heading', { name: 'Alertas de inactividad' })).toHaveCount(0);

    await page.goto('/configuracion#operacion');
    await expect(page.getByRole('heading', { name: 'Horarios de Operación' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alertas de inactividad' })).toBeVisible();
    // El enlace solo aparece con el registro de salida encendido y el horario apagado.
    await page.evaluate(() => localStorage.setItem('stenbrary-config', JSON.stringify({ registroSalidaActivo: true })));
    await page.reload();
    await page.getByRole('button', { name: /Ir al Horario de operación/ }).click();
    await expect(page.locator('#horario-operacion')).toBeInViewport();
  });

  test('el nombre del equipo se guarda con el botón; la bitácora filtra por texto y fechas', async ({ page }) => {
    await page.goto('/configuracion#bitacora');
    const guardar = page.getByRole('button', { name: /Guardar/ });
    await expect(guardar).toBeDisabled();
    await page.locator('#nombreEquipo').fill('Oficina');
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await guardar.click();
    await expect(page.locator('app-toast-container')).toContainText('Guardado: este equipo se llama "Oficina"');
    await expect(guardar).toBeDisabled();

    // Dos eventos de otras fechas y equipos, escritos directo en la bitácora.
    await page.evaluate(async () => {
      const req = indexedDB.open('stenbrary-db');
      await new Promise<void>((ok) => { req.onsuccess = () => ok(); });
      const tx = req.result.transaction('bitacora', 'readwrite');
      tx.objectStore('bitacora').put({ id: 'b1', fechaHora: new Date(2026, 0, 10, 10).toISOString(), accion: 'registro-eliminado', detalle: 'Ana López (2200000001), visita del 09/01/2026', equipo: 'Puerta' });
      tx.objectStore('bitacora').put({ id: 'b2', fechaHora: new Date(2026, 2, 5, 10).toISOString(), accion: 'alumno-editado', detalle: 'Beto Ruiz (2200000002)', equipo: 'Oficina' });
      await new Promise<void>((ok) => { tx.oncomplete = () => ok(); });
    });
    await page.reload();
    await expect(page.locator('.bitacora-total')).toContainText('2 eventos');
    await page.locator('.filtro-texto').fill('lopez');                  // sin acento y en minúsculas
    await expect(page.locator('.bitacora-total')).toContainText('1 evento');
    await expect(page.locator('.bitacora-lista')).toContainText('Ana López');
    await page.getByRole('button', { name: /Quitar filtros/ }).click();
    await page.locator('.filtro-desde').fill('2026-03-01');
    await expect(page.locator('.bitacora-total')).toContainText('1 evento');
    await expect(page.locator('.bitacora-lista')).toContainText('Beto Ruiz');
  });

  test('En Biblioteca: una salida estimada se puede corregir con la hora real', async ({ page }) => {
    const AHORA = new Date('2026-10-14T13:00:00-05:00');
    await page.clock.install({ time: AHORA });
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-config-puesta')) {
        localStorage.setItem('stenbrary-config', JSON.stringify({ registroSalidaActivo: true, horasAutoSalida: 2 }));
        sessionStorage.setItem('e2e-config-puesta', '1');
      }
    });
    const respaldo = {
      meta: { version: '3.4', fecha: AHORA.toISOString(), app: 'Stenbrary', totalAlumnos: 1, totalRegistros: 1, totalMotivos: 1 },
      alumnos: [{ id: 'a1', matricula: '2200000001', nombre: 'Ana', apellidoPaterno: 'P', apellidoMaterno: 'M', carrera: 'Ing. TI', grado: 1, grupo: 'A', turno: 'Matutino', activo: true, fechaRegistro: '2026-10-14T09:00:00-05:00' }],
      registros: [{ id: 'r1', alumnoId: 'a1', matricula: '2200000001', nombreCompleto: 'Ana P M', carrera: 'Ing. TI', motivoId: 'm1', motivoNombre: 'Estudiar', motivoIds: ['m1'], motivoNombres: ['Estudiar'], fechaHora: '2026-10-14T09:40:00-05:00', horaSalida: '2026-10-14T11:40:00-05:00', duracionMinutos: 120, cierreAutomatico: true, salidaEstimada: true, sincronizado: false }],
      motivos: [{ id: 'm1', nombre: 'Estudiar', icono: 'school', orden: 1, activo: true }],
    };
    await page.goto('/configuracion#datos');
    await page.locator('input[type="file"][accept=".json"]').setInputFiles({
      name: 'r.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(respaldo)),
    });
    await page.getByRole('button', { name: /Reemplazar todo/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('.import-result.success')).toBeVisible({ timeout: 15000 });

    await page.goto('/presencia');
    await page.getByText('Ana P M').first().click();
    const confirmar = page.locator('app-confirm-dialog');
    await expect(confirmar).toContainText('el sistema la puso a las 11:40');
    await confirmar.getByRole('button', { name: /Corregir hora/ }).click();
    const hora = page.locator('app-corregir-hora-dialog input[type="time"]');
    await expect(hora).toHaveValue('11:40');
    await hora.fill('09:30');                                           // antes de la entrada
    await page.getByRole('button', { name: 'Guardar hora real' }).click();
    await expect(page.locator('app-corregir-hora-dialog')).toContainText('Debe ser entre las 09:40');
    await hora.fill('10:25');
    await page.getByRole('button', { name: 'Guardar hora real' }).click();
    await expect(page.locator('app-toast-container')).toContainText('Salida corregida');

    const r = await page.evaluate(async () => {
      const req = indexedDB.open('stenbrary-db');
      await new Promise<void>((ok) => { req.onsuccess = () => ok(); });
      const get = req.result.transaction('registros').objectStore('registros').get('r1');
      return await new Promise<{ duracionMinutos: number; salidaEstimada: boolean; cierreAutomatico: boolean }>((ok) => { get.onsuccess = () => ok(get.result); });
    });
    expect(r.duracionMinutos).toBe(45);
    expect(r.salidaEstimada).toBe(false);
    expect(r.cierreAutomatico).toBe(false);
  });
});
