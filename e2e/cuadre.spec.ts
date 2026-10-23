// ╔══════════════════════════════════════════════════════╗
// ║  e2e/cuadre.spec.ts                                   ║
// ║  Stenbrary v3.44.1 — Cuadre de números de punta a punta║
// ║                                                       ║
// ║  Restaura e2e/fixtures/cuadre.json (6 alumnos, 10     ║
// ║  visitas) con el "Restaurar respaldo" real, congela    ║
// ║  el reloj en el miércoles 7 oct 2026 12:00 de Nuevo   ║
// ║  Laredo y compara cada pantalla contra los valores    ║
// ║  calculados A MANO (comentados junto a cada assert).  ║
// ║                                                       ║
// ║  Los unitarios prueban cada función; este prueba que  ║
// ║  la pantalla muestre lo que la función calcula — el   ║
// ║  hueco por el que se colaron los bugs de la auditoría ║
// ║  2026-10 (docs/AUDITORIA-2026-10.md).                 ║
// ║                                                       ║
// ║  El fixture se regenera con e2e/fixtures/crear-cuadre.py.║
// ╚══════════════════════════════════════════════════════╝

import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
import { confirmarConPin } from './helpers';

const FIXTURE = path.join(__dirname, 'fixtures', 'cuadre.json');

// innerText respeta el text-transform (etiquetas en MAYÚSCULAS) y pega los
// números de spans contiguos ("360%" = 3 y 60 %): de ahí /i y \s*.
async function texto(page: Page, selector: string): Promise<string> {
  return (await page.locator(selector).first().innerText()).replace(/\s+/g, ' ');
}

test.describe('Cuadre: cada pantalla dice lo que se calculó a mano', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-07T12:00:00-05:00') });
    await page.addInitScript(() => {
      localStorage.setItem('stenbrary-setup-completado', '1');
    });
    await page.goto('/configuracion#datos');
    await page.locator('input[type="file"][accept=".json"]').setInputFiles(FIXTURE);
    await page.getByRole('button', { name: /Reemplazar todo/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('.import-result.success')).toContainText('Importación exitosa', { timeout: 15000 });
  });

  test('Estadísticas, 7 días', async ({ page }) => {
    await page.goto('/estadisticas?p=ultimos7&tab=resumen');
    await expect(page.locator('.kpis-hero')).toContainText(/alumnos únicos/i, { timeout: 15000 });
    const hero = await texto(page, '.kpis-hero');
    const iq = await texto(page, '.insights-quick');
    const banner = await texto(page, '.rango-activo-banner');

    expect(hero).toMatch(/Total de registros\D*6\b/i);                      // 3 + 2 + 1
    expect(hero).toMatch(/\b2\s*promedio por día con actividad/i);           // 6 / 3 días (P4)
    expect(hero).toMatch(/\b3 alumnos únicos/);                              // sin el invitado
    // 6 contra 2: la visita del miércoles 30 a las 15:00 queda fuera (P6).
    expect(hero).toMatch(/200\.0% más que el período anterior/);
    expect(banner).toMatch(/hasta las 12:00 \(al mismo avance\)/);
    expect(hero).toMatch(/Lunes 10:00 2 visitas/);
    expect(hero).toMatch(/1h por visita · 2 medidas/);                       // (90 + 30) / 2; la de 240 es estimada (P3)
    expect(hero).toMatch(/1 con salida estimada no cuentan/);
    expect(hero).toMatch(/67%/);                                             // 2 de 3 con ≥2 visitas
    expect(hero).toMatch(/Alumnos inactivos\D*1 30\+ días/i);               // Eva, hace 40 días (P1)
    expect(hero).toMatch(/1 nunca han venido/);                              // Dani; Fer está desactivado
    expect(hero).toMatch(/Vinieron solo 1 vez\D*1 solo 1 visita/i);          // Eva
    expect(hero).toMatch(/Estudiar en 3 visitas · 50% de ellas/);           // cada motivo suma (P2)
    expect(iq).toMatch(/Día más concurrido Lunes/i);
    expect(iq).toMatch(/16\.7%/);                                            // 1 invitado de 6
    expect(iq).not.toMatch(/Hoy cerraría con/);                               // < 4 miércoles de historial (P8)
  });

  test('Esta semana se compara con lunes–miércoles de la semana pasada', async ({ page }) => {
    // Antes: los 3 días previos (vie–dom), que no tienen nada que ver.
    await page.goto('/estadisticas?p=semana&tab=resumen');
    await expect(page.locator('.kpis-hero')).toContainText(/alumnos únicos/i, { timeout: 15000 });
    const banner = await texto(page, '.rango-activo-banner');
    expect(banner).toMatch(/del 28-sep al 30-sep hasta las 12:00/);
    // 6 (lun 3 + mar 2 + mié 1) contra 2 (lun 28 + mar 29; la del mié 30 a las 15:00 aún no).
    expect(await texto(page, '.kpis-hero')).toMatch(/200\.0% más que el período anterior/);
  });

  test('Este mes: la alerta compara contra lo mismo que la tarjeta', async ({ page }) => {
    // 1–7 oct contra 1–7 sep (0 visitas): no hay base para un %. Antes la
    // tarjeta decía "Sin datos previos" y la alerta "crecieron 200 %"
    // (contra 24–30 sep, los 7 días previos).
    await page.goto('/estadisticas?p=mes-actual&tab=resumen');
    await expect(page.locator('.kpis-hero')).toContainText(/alumnos únicos/i, { timeout: 15000 });
    const t = await texto(page, '.dashboard-ejecutivo-container');
    expect(t).toMatch(/Total de registros\D*6\b/i);
    expect(t).toMatch(/Sin datos previos para comparar/);
    expect(t).not.toMatch(/Crecimiento extraordinario/);
  });

  test('Un período desconocido en la URL no deja la pantalla en ceros', async ({ page }) => {
    await page.goto('/estadisticas?p=no-existe&tab=resumen');
    await expect(page.locator('.rango-activo-banner')).toContainText(/30 días/, { timeout: 15000 });
    expect(await texto(page, '.kpis-hero')).toMatch(/Total de registros\D*9\b/i);   // 8 sep – 7 oct
  });

  test('El mapa de calor sigue al período de arriba', async ({ page }) => {
    // Antes tenía su propio rango (30 días) aunque arriba se eligiera otro.
    await page.goto('/estadisticas?p=ultimos7&tab=calor');
    await expect(page.locator('.heatmap-aviso')).toContainText(/mismo período/, { timeout: 15000 });
    await expect(page.locator('.heatmap-total-grand')).toHaveText(/^\s*6\s*$/);   // las 6 visitas de los 7 días
  });

  test('Estadísticas, personas', async ({ page }) => {
    await page.goto('/estadisticas?p=ultimos7&tab=personas');
    await expect(page.getByText(/visitas? de invitados/)).toBeVisible({ timeout: 15000 });
    const t = await texto(page, '.dashboard-ejecutivo-container');
    expect(t).toMatch(/hubo 1 visita de invitados/);                         // fuera de carreras (P5)
    expect(t).toMatch(/Matutino\s*3\s*60%/);
    expect(t).toMatch(/Vespertino\s*2\s*40%/);
    expect(t).toMatch(/1°\s*1\s*20%\s*3°\s*2\s*40%\s*5°\s*2\s*40%/);
    expect(t).toMatch(/Estudiar \+ Pedir libro\s*1\s*100%/);
    // El Top sigue al período de arriba (7 días), no a 30 días fijos:
    // Ana 2 (r1, r4), Beto 2 (r2, r6), Caro 1 (r3). En 30 días serían 3, 3, 2.
    expect(t).toMatch(/Top 5 alumnos — mismo período/);
    expect(t).toMatch(/Beto Prueba Cuadre\s*Ing\. TI\s*login\s*2 visitas/);
    expect(t).toMatch(/Ana Prueba Cuadre\s*Ing\. TI\s*login\s*2 visitas/);
    expect(t).toMatch(/Caro Prueba Cuadre\s*Derecho\s*login\s*1 visita\b/);
  });

  test('Hoy: la retención no aplica a un solo día', async ({ page }) => {
    await page.goto('/estadisticas?p=hoy&tab=resumen');
    await expect(page.locator('.kpis-hero')).toContainText(/alumnos únicos/i, { timeout: 15000 });
    const hero = await texto(page, '.kpis-hero');
    expect(hero).toMatch(/Tasa de retención\D*No aplica/i);
    expect(hero).toMatch(/Contra el día anterior/i);
    expect(hero).toMatch(/Miércoles 09:00\s*1 visita\b/);                     // singular
  });

  test('Comparar recorta el mes pasado al mismo avance', async ({ page }) => {
    await page.goto('/estadisticas?p=ultimos7&tab=comparar');
    await expect(page.locator('.comparador-card')).toContainText(/B sin registros/, { timeout: 15000 });
    expect(await texto(page, '.comparador-card'))
      .toMatch(/se tomó solo hasta el 7 de septiembre de 2026 a las 12:00/);
  });

  test('Resumen', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Visitas en total')).toBeVisible({ timeout: 15000 });
    const t = await texto(page, 'body');
    expect(t).toMatch(/\b1\b Accesos hoy/);
    expect(t).toMatch(/\b6\b Alumnos registrados/);
    expect(t).toMatch(/\b10\b Visitas en total/);
    // El miércoles pasado a las 12:00 llevaba 0: no hay base para un %.
    expect(t).not.toMatch(/vs miércoles pasado a esta hora/);
  });

  test('Registros: el día correcto y los motivos secundarios', async ({ page }) => {
    await page.goto('/registros?fecha=2026-10-05');
    await expect(page.locator('tbody tr')).toHaveCount(3, { timeout: 15000 });   // R1: no el día 4
    await expect(page.locator('tbody')).toContainText('Estudiar, Pedir libro');    // r2: todas sus actividades (P2)
    await page.goto('/registros?desde=2026-10-01&hasta=2026-10-07&motivo=Pedir%20libro');
    await expect(page.locator('tbody tr')).toHaveCount(2, { timeout: 15000 });   // incluye el secundario
  });

  test('Registros: del detalle de la visita al perfil del alumno (v3.51.0)', async ({ page }) => {
    await page.goto('/registros?fecha=2026-10-05');
    await page.locator('tbody tr').filter({ hasText: 'Ana' }).first().click();
    await page.locator('.alumno-link').click();
    await expect(page).toHaveURL(/\/detalle-alumno\/2200000001/);
    await page.goto('/detalle-alumno/2200000002');                                  // Beto: r2 con 2 actividades
    await expect(page.locator('.historial-table')).toContainText('Estudiar, Pedir libro', { timeout: 15000 });
  });

  test('Eliminar registros cuenta el rango por defecto al abrir (v3.57.0)', async ({ page }) => {
    // Antes decía "Eliminar 0 registros" hasta tocar el selector.
    await page.goto('/configuracion#datos');
    await expect(page.getByRole('button', { name: /Eliminar 9 registros/ })).toBeVisible({ timeout: 15000 });   // 8 sep – 7 oct: todas menos la de Eva
  });

  test('Eliminar registros pide el PIN; con el incorrecto no borra (v3.57.0)', async ({ page }) => {
    await page.goto('/configuracion#datos');
    await page.getByRole('button', { name: /Eliminar 9 registros/ }).click({ timeout: 15000 });
    const dialogo = page.locator('app-pin-coordinador-dialog');
    await expect(dialogo.getByRole('button', { name: /Descargar respaldo antes/ })).toBeVisible();
    await dialogo.locator('.pin-input').fill('1111');
    await dialogo.locator('.pin-confirmar').click();
    await expect(dialogo.locator('.pin-error')).toContainText('Te quedan 4 intentos');
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('button', { name: /Eliminar 9 registros/ })).toBeVisible();   // no borró nada

    await page.getByRole('button', { name: /Eliminar 9 registros/ }).click();
    await confirmarConPin(page);
    await expect(page.getByRole('button', { name: /Eliminar 0 registros/ })).toBeVisible({ timeout: 15000 });
  });

  test('Actividades: borrar una usada recomienda desactivarla; si se borra, se marca (v3.57.0)', async ({ page }) => {
    await page.goto('/estadisticas?p=ultimos30&tab=resumen');
    // r2 tiene dos actividades: en 30 días, 10 actividades en 9 visitas.
    await expect(page.locator('.nota-motivos').first()).toContainText('suman más de 100 %', { timeout: 15000 });
    await expect(page.locator('.nota-motivos').first()).toContainText('1.11 actividades por visita');

    await page.goto('/gestion-motivos');
    await page.locator('.motivo-row').filter({ hasText: 'Pedir libro' }).locator('.btn-delete').click();
    const dialogo = page.locator('app-confirm-dialog');
    await expect(dialogo).toContainText('Se ha usado en 2 visitas');           // por id, incluye el secundario de r2
    await dialogo.getByRole('button', { name: /Desactivar/ }).click();
    await expect(page.locator('.motivo-row').filter({ hasText: 'Pedir libro' })).toHaveClass(/row-inactivo/);

    await page.locator('.motivo-row').filter({ hasText: 'Trabajo escolar' }).locator('.btn-delete').click();
    await page.locator('app-confirm-dialog .btn-confirm.btn-danger').click();
    await expect(page.locator('.motivo-row').filter({ hasText: 'Trabajo escolar' })).toHaveCount(0);
    await page.goto('/estadisticas?p=ultimos30&tab=resumen');
    await expect(page.locator('.dashboard-ejecutivo-container')).toContainText('(actividad eliminada)', { timeout: 15000 });
  });

  test('Catálogos: agregar la carrera de los datos, corregir su nombre en todo y "cambió de nombre" (v3.57.0)', async ({ page }) => {
    await page.goto('/configuracion#catalogos');
    const fuera = page.locator('.cat-fuera');
    await expect(fuera).toContainText('Ing. TI');                   // las del fixture no están en el catálogo
    await expect(fuera).toContainText('3 alumnos · 7 visitas');
    await fuera.locator('.cat-carrera').filter({ hasText: 'Ing. TI' }).getByRole('button', { name: /Agregar al catálogo/ }).click();
    await fuera.locator('.cat-carrera').filter({ hasText: 'Derecho' }).getByRole('button', { name: /Agregar al catálogo/ }).click();
    await expect(page.locator('.cat-fuera')).toHaveCount(0);

    // Corregir: alumnos y visitas pasadas cambian de nombre.
    const ti = page.locator('.cat-lista .cat-carrera').filter({ hasText: 'Ing. TI' });
    await ti.getByRole('button', { name: /Renombrar/ }).click();
    await page.locator('.cat-renombre').fill('Tecnologías de la Información e IA');
    await page.locator('.cat-renombre').press('Enter');
    await expect(page.locator('app-confirm-dialog')).toContainText('tiene 3 alumnos y 7 visitas');
    await page.locator('app-confirm-dialog .btn-confirm.btn-info:not(.btn-alternativa)').click();
    await expect(page.locator('app-toast-container')).toContainText('3 alumnos y 7 visitas');
    await page.goto('/registros?desde=2026-10-01&hasta=2026-10-07');
    await expect(page.locator('tbody')).toContainText('Tecnologías de la Información e IA', { timeout: 15000 });
    await expect(page.locator('tbody')).not.toContainText('Ing. TI');

    // Cambió de nombre: la vieja queda desactivada con sus datos.
    await page.goto('/configuracion#catalogos');
    await page.locator('.cat-lista .cat-carrera')
      .filter({ has: page.locator('.cat-nombre > span', { hasText: /^Derecho$/ }) })   // no "Licenciatura en Derecho"
      .getByRole('button', { name: /Renombrar/ }).click();
    await page.locator('.cat-renombre').fill('Derecho y Ciencias Jurídicas');
    await page.locator('.cat-renombre').press('Enter');
    await page.locator('app-confirm-dialog .btn-alternativa').click();
    await expect(page.locator('.cat-carrera.inactiva')).toContainText('Derecho');
    await expect(page.locator('.cat-carrera.inactiva')).toContainText('3 alumnos');
    // Al registrar se ofrece la nueva, no la desactivada.
    await page.goto('/registro-alumno');
    await page.locator('mat-select[formcontrolname="carrera"]').click();
    const opciones = page.locator('mat-option');
    await expect(opciones.filter({ hasText: 'Derecho y Ciencias Jurídicas' })).toHaveCount(1);
    await expect(opciones.filter({ hasText: /^\s*Derecho\s*$/ })).toHaveCount(0);
    await expect(opciones.filter({ hasText: 'Tecnologías de la Información e IA' })).toHaveCount(1);
  });

  test('Diagnóstico: las cifras cuadran entre pantallas (v3.57.0)', async ({ page }) => {
    await page.goto('/diagnostico');
    await page.getByRole('button', { name: /Verificar cifras/ }).click();
    await expect(page.locator('.cuadre-cifras .seccion-titulo')).toContainText('Todas las cifras cuadran', { timeout: 15000 });
    await expect(page.locator('.cuadre-cifras .cifra.es-error')).toHaveCount(0);
  });

  test('Inactivos', async ({ page }) => {
    await page.goto('/inactivos');
    const resumen = page.locator('.summary-row');
    await expect(resumen).toContainText(/1 alumno dejó de venir/, { timeout: 15000 });
    await expect(resumen).toContainText(/1 nunca han venido/);
  });

  test('"Vinieron solo 1 vez" abre la lista en Alumnos (v3.59.0)', async ({ page }) => {
    await page.goto('/estadisticas?p=ultimos7&tab=resumen');
    await page.getByRole('link', { name: 'Ver los alumnos que vinieron solo una vez' }).click({ timeout: 15000 });
    await expect(page).toHaveURL(/\/alumnos\?visitas=una&estado=activos/);
    const badges = page.locator('.visitas-badge');
    await expect(badges).toHaveCount(1, { timeout: 15000 });                 // la misma cifra de la tarjeta
    await expect(badges.first()).toHaveText('1 visita');
    await expect(page.locator('.filtro-chip')).toContainText(['Activos', 'Solo 1 vez']);
  });
});

// ── Verificación agosto–septiembre (2026-10-22) ─────────────────────
// e2e/fixtures/verificacion/ lo genera crear-verificacion.cjs SIN código de
// la app; el usuario contó en Excel lo mismo y cuadró. Este test fija esas
// cifras y prueba el respaldo de ida y vuelta: descargarlo y reemplazar con
// él no cambia ni una cifra.
test.describe('Verificación ago–sep: cifras contadas a mano y respaldo de ida y vuelta', () => {
  const VERIF = path.join(__dirname, 'fixtures', 'verificacion', 'respaldo-ago-sep-2026.json');

  async function cifrasAgoSep(page: Page): Promise<string> {
    await page.goto('/estadisticas?p=personalizado&ini=2026-08-01&fin=2026-09-30&tab=resumen');
    await expect(page.locator('.kpis-hero')).toContainText(/alumnos únicos/i, { timeout: 15000 });
    return texto(page, '.kpis-hero');
  }

  test('las cifras de las respuestas, antes y después del respaldo', async ({ page }) => {
    test.setTimeout(120000);
    await page.clock.install({ time: new Date('2026-10-22T12:00:00-05:00') });
    await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
    await page.goto('/configuracion#datos');
    await page.locator('input[type="file"][accept=".json"]').setInputFiles(VERIF);
    await page.getByRole('button', { name: /Reemplazar todo/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('.import-result.success')).toContainText('Importación exitosa', { timeout: 20000 });

    const antes = await cifrasAgoSep(page);
    expect(antes).toMatch(/Total de registros\D*215\b/i);                // 79 + 136
    expect(antes).toMatch(/4\.1 promedio por día con actividad/);        // 215 / 53
    expect(antes).toMatch(/\b23 alumnos únicos/);                        // 25 − 2 que nunca vinieron
    expect(antes).toMatch(/Lunes 13:00 10 visitas/);
    expect(antes).toMatch(/1h 20m por visita · 195 medidas/);            // 15 517 / 195 = 79.6
    expect(antes).toMatch(/12 con salida estimada no cuentan/);
    expect(antes).toMatch(/Estudiar en 106 visitas/);
    expect(await texto(page, '.insights-quick')).toMatch(/Día más concurrido Martes/i);

    // Ida y vuelta: descargar, reemplazar con lo descargado, mismas cifras.
    await page.goto('/configuracion#datos');
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-backup').click(),
    ]);
    const archivo = await descarga.path();
    await page.locator('input[type="file"][accept=".json"]').setInputFiles(archivo);
    await page.getByRole('button', { name: /Reemplazar todo/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('.import-result.success')).toContainText('Importación exitosa', { timeout: 20000 });
    expect(await cifrasAgoSep(page)).toBe(antes);
  });
});

// ── v3.58.0: lo que pidió la verificación ago–sep ───────────────────
test.describe('Verificación ago–sep: filtros de Registros y días del período (v3.58.0)', () => {
  const VERIF = path.join(__dirname, 'fixtures', 'verificacion', 'respaldo-ago-sep-2026.json');

  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-22T12:00:00-05:00') });
    await page.addInitScript(() => localStorage.setItem('stenbrary-setup-completado', '1'));
    await page.goto('/configuracion#datos');
    await page.locator('input[type="file"][accept=".json"]').setInputFiles(VERIF);
    await page.getByRole('button', { name: /Reemplazar todo/ }).click();
    await confirmarConPin(page);
    await expect(page.locator('.import-result.success')).toContainText('Importación exitosa', { timeout: 20000 });
  });

  async function elegir(page: Page, select: string, opcion: string) {
    await page.locator(select).click();
    await page.getByRole('option', { name: opcion, exact: true }).click();
  }

  test('Registros: visitantes, tipo de salida, duración, orden y autocompletado', async ({ page }) => {
    await page.goto('/registros?desde=2026-08-01&hasta=2026-09-30');
    const total = () => page.getByText(/Rango personalizado: \d+ registros?/);
    await expect(total()).toContainText('215 registros', { timeout: 15000 });

    await elegir(page, '.filtro-tipo', 'Solo visitantes');
    await expect(total()).toContainText('13 registros');
    await elegir(page, '.filtro-tipo', 'Alumnos y visitantes');

    await elegir(page, '.filtro-salida', 'Puesta por el sistema');
    await expect(total()).toContainText('12 registros');
    await elegir(page, '.filtro-salida', 'Sin salida');
    await expect(total()).toContainText('7 registros');
    await elegir(page, '.filtro-salida', 'Todas');

    await page.locator('.duracion-min').fill('300');
    await expect(total()).toContainText('13 registros');                // ≥ 5 h, contadas en el JSON
    await page.locator('.duracion-min').fill('');

    // Orden por duración: la más larga primero (678 min, una salida estimada).
    await page.getByRole('button', { name: 'Ordenar por duración' }).click();
    await expect(page.locator('.duracion-chip').first()).toContainText('11h');

    // Autocompletado: "trevino" sin acento encuentra a Valeria Garza Treviño.
    await page.locator('.busqueda-input').fill('trevino');
    await page.getByRole('option', { name: /Valeria Garza Treviño/ }).click();
    await expect(page.locator('.busqueda-input')).toHaveValue('2300100001');
    await expect(total()).toContainText('24 registros');                // su total en el top 5
  });

  test('Registros: agregar a mano las visitas del papel (v3.59.0)', async ({ page }) => {
    await page.goto('/registros');
    await page.locator('.btn-agregar-visita').click({ timeout: 15000 });
    const dlg = page.locator('app-agregar-visita-dialog');

    // Valeria (sin acento) el 6-ago a las 11:40: el escáner ya tiene una a las 11:49 → avisa.
    await dlg.locator('.input-buscar-alumno').fill('trevino');
    await dlg.locator('.sugerencia').first().click();
    await dlg.locator('.input-fecha').fill('2026-08-06');
    await dlg.locator('.input-entrada').fill('11:40');
    await dlg.locator('.btn-guardar-visita').click();
    await expect(dlg.locator('.aviso.parecida')).toContainText('11:49');
    await expect(dlg.locator('.agregada')).toHaveCount(0);

    // Otra hora, con salida: se guarda; la fecha se queda para la siguiente.
    await dlg.locator('.input-entrada').fill('16:00');
    await dlg.locator('.input-salida').fill('17:30');
    await dlg.locator('.btn-guardar-visita').click();
    await expect(dlg.locator('.agregada')).toHaveCount(1);
    await expect(dlg.locator('.input-fecha')).toHaveValue('2026-08-06');

    // Un visitante, sin salida.
    await dlg.getByLabel('Es visitante (no es alumno)').check();
    await dlg.locator('.input-visitante').fill('Luis Prueba');
    await dlg.locator('.input-entrada').fill('10:00');
    await dlg.locator('.btn-guardar-visita').click();
    await expect(dlg.locator('.agregada')).toHaveCount(2);

    // La salida antes de la entrada no se guarda.
    await dlg.locator('.input-entrada').fill('12:00');
    await dlg.locator('.input-salida').fill('11:00');
    await dlg.locator('.btn-guardar-visita').click();
    await expect(dlg.locator('.aviso.error')).toContainText('después de la entrada');
    await dlg.getByRole('button', { name: 'Terminar' }).click();

    // 215 + 2, marcadas "a mano".
    await page.locator('.rango-tabs').getByText('Todo', { exact: true }).click();
    await expect(page.locator('.header-subtitle')).toContainText('217 registros');
    // (las del 6-ago no caben en la primera página: se buscan)
    await page.locator('.busqueda-input').fill('Luis Prueba');
    await expect(page.locator('.badge-a-mano')).toHaveCount(1);
    await page.goto('/registros?fecha=2026-08-06');
    await expect(page.locator('.badge-a-mano')).toHaveCount(2, { timeout: 15000 });
  });

  test('Alumnos: rango libre de visitas (v3.59.0)', async ({ page }) => {
    await page.goto('/alumnos');
    await page.locator('mat-form-field', { hasText: 'Visitas (histórico)' }).locator('mat-select').click({ timeout: 15000 });
    await page.getByRole('option', { name: 'Personalizado (de… a…)' }).click();
    await page.getByLabel('De (visitas)').fill('10');
    await page.getByLabel('A (visitas)').fill('12');
    // Fernanda 12, Diego 11, Andrés 11, Iker 11, Gael 10 (contado del respaldo).
    await expect(page.locator('.visitas-badge')).toHaveCount(5, { timeout: 15000 });
    await expect(page.locator('.filtro-chip')).toContainText('10 a 12 visitas');
    await page.getByLabel('A (visitas)').fill('');
    await page.getByLabel('De (visitas)').fill('16');
    await expect(page.locator('.visitas-badge')).toHaveCount(3);              // 24, 18, 16
    await expect(page.locator('.filtro-chip')).toContainText('16+ visitas');
  });

  test('Estadísticas: promedio por día de la semana y días del período', async ({ page }) => {
    await page.goto('/estadisticas?p=personalizado&ini=2026-08-01&fin=2026-09-30&tab=calor');
    const martes = page.locator('.heatmap-total-cell[title^="Total de Martes"]');
    await expect(martes).toContainText('6.9/día', { timeout: 15000 });        // 62 / 9 martes
    await expect(martes).toHaveAttribute('title', /62 visitas en 9 martes con visitas = 6\.9 por martes/);

    await page.goto('/estadisticas?p=personalizado&ini=2026-08-01&fin=2026-09-30&tab=resumen');
    const dias = page.locator('.iq-dias-periodo');
    await expect(dias).toContainText(/8.*sep.*· 10/i, { timeout: 15000 });  // martes 8-sep, 10 visitas
    // Horario de fábrica (L–V) y calendario UAT (16-sep inhábil): 42 días, todos con visitas.
    await expect(dias).toContainText('Todos los días hábiles tuvieron visitas (42)');
  });
});
