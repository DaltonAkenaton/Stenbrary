// ╔══════════════════════════════════════════════════════╗
// ║  e2e/responsive.spec.ts                              ║
// ║  Stenbrary — Auditoría de overflow horizontal        ║
// ║                                                      ║
// ║  Qué detecta:                                        ║
// ║  el síntoma nº1 de un layout roto en móvil es que la ║
// ║  página se pueda desplazar de lado. Se mide, no se   ║
// ║  opina: scrollWidth del documento vs. viewport.      ║
// ║                                                      ║
// ║  Siembra IndexedDB antes de medir. Sin datos las     ║
// ║  vistas de tabla muestran su estado vacío y no       ║
// ║  revientan nunca — justo el caso que NO interesa.    ║
// ║                                                      ║
// ║  Cada test junta TODAS las rutas con problema y      ║
// ║  falla una sola vez con la lista completa, para que  ║
// ║  una corrida dé el panorama entero.                  ║
// ╚══════════════════════════════════════════════════════╝

import { test, expect, Page } from '@playwright/test';

/** Tolerancia en px: el redondeo sub-pixel del navegador no es un bug. */
const TOLERANCIA_PX = 2;

const VIEWPORTS = [
  { nombre: 'móvil',  width: 390,  height: 844 },
  { nombre: 'tablet', width: 820,  height: 1180 },
  { nombre: 'laptop', width: 1440, height: 900 },
];

/** Rutas sin guard ni dependencia de sessionStorage. */
const RUTAS = [
  '/scanner',
  '/dashboard',
  '/alumnos',
  '/registros',
  '/estadisticas',
  '/gestion-motivos',
  '/configuracion',
  '/importar-alumnos',
  '/novedades',
  '/inactivos',
  '/presencia',
  '/detalle-alumno/2000000001',
];

// ═══════════════════════════════════════════════════════════
// SIEMBRA
// ═══════════════════════════════════════════════════════════
// Se escribe con la API cruda de IndexedDB (no `idb`) porque corre
// dentro del navegador, fuera del bundle de Angular. El esquema debe
// coincidir con DatabaseService: stores alumnos/registros/motivos,
// todos con keyPath 'id'.
async function sembrarDatos(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const CARRERAS = [
      'Ingeniería en Sistemas Computacionales',
      'Licenciatura en Derecho',
      'Contador Público',
      'Licenciatura en Administración',
    ];
    const MOTIVOS = ['Estudiar', 'Pedir libro', 'Trabajo escolar', 'Investigación', 'Otro'];

    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const req = indexedDB.open('stenbrary-db');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const alumnos: any[] = [];
    const registros: any[] = [];

    for (let i = 0; i < 40; i++) {
      const matricula = String(2000000001 + i);
      alumnos.push({
        id: `alumno-${matricula}`,
        matricula,
        // Nombres largos a propósito: es lo que desborda las tablas.
        nombre: i % 3 === 0 ? 'María Guadalupe' : 'Juan Carlos',
        apellidoPaterno: 'Hernández',
        apellidoMaterno: 'Villanueva',
        carrera: CARRERAS[i % CARRERAS.length],
        grado: (i % 10) + 1,
        grupo: 'ABCDEF'[i % 6],
        turno: ['Matutino', 'Vespertino', 'Mixto'][i % 3],
        activo: true,
        fechaRegistro: new Date(2026, 0, 15),
        email: `alumno${matricula}@alumnos.uat.edu.mx`,
        datosExtra: {},
      });
    }

    const hoy = new Date();
    for (let i = 0; i < 300; i++) {
      const a = alumnos[i % alumnos.length];
      const f = new Date(hoy);
      f.setDate(f.getDate() - (i % 45));
      f.setHours(8 + (i % 12), (i * 7) % 60, 0, 0);
      const motivo = MOTIVOS[i % MOTIVOS.length];
      const salida = new Date(f);
      salida.setMinutes(salida.getMinutes() + 30 + (i % 90));
      registros.push({
        id: `registro-${i}`,
        alumnoId: a.id,
        matricula: a.matricula,
        nombreCompleto: `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`,
        carrera: a.carrera,
        motivoId: `motivo-${motivo}`,
        motivoNombre: motivo,
        motivoIds: [`motivo-${motivo}`],
        motivoNombres: [motivo],
        fechaHora: f,
        turno: a.turno,
        sincronizado: false,
        // Dos de cada tres cerrados; el resto queda abierto para /presencia.
        ...(i % 3 === 0 ? {} : { horaSalida: salida, duracionMinutos: 30 + (i % 90) }),
      });
    }

    const escribir = (store: string, items: any[]) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        items.forEach(it => os.put(it));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

    await escribir('alumnos', alumnos);
    await escribir('registros', registros);
    db.close();
    return registros.length;
  });
}

/**
 * Mide desbordamiento horizontal.
 *
 * OJO — la medición ingenua NO funciona en esta app:
 * `styles.scss` fija `html, body { overflow: hidden }` y `.content-area`
 * añade `overflow-x: hidden`. Con eso el contenido que se pasa de ancho se
 * RECORTA en silencio en vez de volver la página scrollable, y
 * `documentElement.scrollWidth` nunca crece. Medirlo así da verde siempre.
 *
 * El instrumento correcto para un app-shell es el contenedor de scroll real:
 * aunque tenga overflow-x hidden, su `scrollWidth` sí refleja el contenido
 * completo. Ese delta es la señal.
 */
async function medirOverflow(page: Page, anchoViewport: number) {
  return page.evaluate((ancho) => {
    const doc = document.documentElement;
    const contenedor = document.querySelector<HTMLElement>('.content-area');

    const excesoDoc = doc.scrollWidth - ancho;
    const excesoContenedor = contenedor
      ? contenedor.scrollWidth - contenedor.clientWidth
      : 0;
    const exceso = Math.max(excesoDoc, excesoContenedor);

    // El borde derecho útil: lo que sobrepase esto queda cortado.
    const limite = contenedor
      ? contenedor.getBoundingClientRect().right
      : ancho;

    // El barrido de elementos corre SIEMPRE, no solo cuando `exceso > 0`:
    // el recorte puede ocurrir en un contenedor intermedio sin que ni el
    // documento ni .content-area lo reporten.
    const culpables: string[] = [];
    document.querySelectorAll<HTMLElement>('.content-area *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right <= limite + 2) return;

      // Ignorar lo que vive dentro de un contenedor con scroll horizontal
      // declarado: una tabla ancha en un wrapper `overflow-x: auto` es la
      // solución correcta, no un defecto.
      let p: HTMLElement | null = el.parentElement;
      let enScrollHorizontal = false;
      while (p && p !== document.body) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === 'auto' || ov === 'scroll') { enScrollHorizontal = true; break; }
        p = p.parentElement;
      }
      if (enScrollHorizontal) return;

      // Overlays y elementos fijos se posicionan respecto al viewport;
      // no forman parte del flujo que puede romper el layout.
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed') return;

      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      culpables.push(
        `${el.tagName.toLowerCase()}${id}${cls} ` +
        `(sobra ${Math.round(r.right - limite)}px)`,
      );
    });

    return {
      exceso: Math.max(exceso, culpables.length ? 3 : 0),
      excesoDoc,
      excesoContenedor,
      culpables: Array.from(new Set(culpables)).slice(0, 6),
    };
  }, anchoViewport);
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

// Un detector que nunca dispara da verde por la razón equivocada. Este test
// inyecta un desborde deliberado y exige que se detecte: si alguien cambia
// el layout o los selectores y la auditoría se vuelve un no-op, truena aquí
// y no en silencio.
test('el detector de overflow realmente detecta overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/scanner');
  await page.waitForSelector('.content-area');

  const limpio = await medirOverflow(page, 390);
  expect(limpio.culpables).toEqual([]);

  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'sonda-overflow';
    d.style.cssText = 'width:3000px;height:40px;background:red';
    document.querySelector('.content-area')!.appendChild(d);
  });

  const sucio = await medirOverflow(page, 390);
  expect(sucio.exceso).toBeGreaterThan(TOLERANCIA_PX);
  expect(sucio.culpables.join(' ')).toContain('sonda-overflow');
});

for (const vp of VIEWPORTS) {
  test(`sin desbordamiento horizontal en ${vp.nombre} (${vp.width}px)`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await page.goto('/scanner');
    await page.waitForSelector('app-root');
    await sembrarDatos(page);

    const fallos: string[] = [];

    for (const ruta of RUTAS) {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle').catch(() => { /* SW puede no aquietarse */ });
      // Margen para gráficas y listas que montan en un tick posterior.
      await page.waitForTimeout(900);

      const { exceso, culpables } = await medirOverflow(page, vp.width);
      if (exceso > TOLERANCIA_PX) {
        fallos.push(
          `${ruta} → se desborda ${exceso}px` +
          (culpables.length ? `\n      culpables: ${culpables.join(', ')}` : ''),
        );
      }
    }

    expect(
      fallos,
      `Desbordamiento horizontal en ${vp.nombre} (${vp.width}px):\n  - ${fallos.join('\n  - ')}\n`,
    ).toEqual([]);
  });
}

test('las rutas principales montan contenido con datos sembrados', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/scanner');
  await page.waitForSelector('app-root');
  const total = await sembrarDatos(page);
  expect(total).toBe(300);

  const vacias: string[] = [];
  for (const ruta of ['/dashboard', '/alumnos', '/registros', '/estadisticas']) {
    await page.goto(ruta);
    await page.waitForTimeout(1200);
    const texto = (await page.locator('body').innerText()).trim();
    // Una vista que montó con 300 registros debe tener contenido real.
    if (texto.length < 200) vacias.push(`${ruta} (${texto.length} chars)`);
  }
  expect(vacias, `Rutas que renderizaron casi vacías: ${vacias.join(', ')}`).toEqual([]);
});

// Las dos pantallas nuevas de v3.31 no estaban en RUTAS: /funciones es una
// rejilla de tarjetas y /bienvenida va a pantalla completa. Ambas son
// candidatas naturales a desbordarse en móvil.
test('las pantallas de presentación no se desbordan en móvil', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('stenbrary-setup-completado', '1');
  });

  const fallos: string[] = [];
  for (const ruta of ['/funciones', '/bienvenida']) {
    await page.goto(ruta);
    await page.waitForSelector('.content-area');
    await page.waitForTimeout(700);
    const { exceso, culpables } = await medirOverflow(page, 390);
    if (exceso > TOLERANCIA_PX) {
      fallos.push(`${ruta} → ${exceso}px · ${culpables.join(', ')}`);
    }
  }
  expect(fallos, `Desbordamiento:\n  - ${fallos.join('\n  - ')}`).toEqual([]);
});
