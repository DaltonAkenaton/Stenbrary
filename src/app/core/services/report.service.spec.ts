// ╔══════════════════════════════════════════════════════╗
// ║  report.service.spec.ts — Stenbrary v3.62.0          ║
// ║                                                      ║
// ║  Los PDF llevan texto que escribió una persona       ║
// ║  (nombres, carreras, motivos, institución). jsPDF    ║
// ║  tuvo en 2026 varias vulnerabilidades de inyección   ║
// ║  de objetos PDF. Estas pruebas generan el PDF real   ║
// ║  con textos hostiles y revisan el archivo: el texto  ║
// ║  sale escapado dentro de su cadena y no aparece      ║
// ║  ningún objeto activo (JavaScript, acciones, URIs).  ║
// ╚══════════════════════════════════════════════════════╝

import { Injector, runInInjectionContext } from '@angular/core';
import { jsPDF } from 'jspdf';
import { unzlibSync, strFromU8 } from 'fflate';
import { DatabaseService } from './database.service';
import { ReportService } from './report.service';
import { Alumno, Registro } from '../models';

/** Intenta cerrar la cadena de texto y abrir objetos PDF propios. */
const CIERRA_CADENA = 'Ana) Tj ET BT /F1 99 Tf (pwn';
const JS_PDF = 'x) >> /OpenAction << /S /JavaScript /JS (app.alert(1)';
const HTML = '<script>alert(1)</script><img src=x onerror=alert(1)>';
const BARRAS = 'C:\\ruta\\) \\(';

const ALUMNO: Alumno = {
  id: 'a1', matricula: '2299990001', nombre: CIERRA_CADENA, apellidoPaterno: HTML,
  apellidoMaterno: BARRAS, carrera: JS_PDF, grado: 3, grupo: 'A', turno: 'Matutino',
  activo: true, fechaRegistro: new Date(2026, 8, 1),
} as Alumno;

const REGISTRO: Registro = {
  id: 'r1', alumnoId: 'a1', matricula: '2299990001',
  nombreCompleto: `${CIERRA_CADENA} ${HTML}`, carrera: JS_PDF,
  motivoId: 'm1', motivoNombre: JS_PDF, motivoIds: ['m1'], motivoNombres: [JS_PDF],
  fechaHora: new Date(2026, 8, 2, 10, 0), horaSalida: new Date(2026, 8, 2, 11, 30), duracionMinutos: 90,
  turno: 'Matutino', sincronizado: false,
} as Registro;

/** Diccionarios (sin comprimir) + contenido de cada stream ya descomprimido. */
function leerPdf(pdf: ArrayBuffer): { diccionarios: string; contenido: string } {
  const bytes = new Uint8Array(pdf);
  const latin1 = Array.from(bytes, b => String.fromCharCode(b)).join('');
  const contenido: string[] = [];
  const re = />>\s*stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin1))) {
    const ini = m.index + m[0].length;
    const fin = latin1.indexOf('endstream', ini);
    if (fin < 0) break;
    try {
      contenido.push(strFromU8(unzlibSync(bytes.subarray(ini, fin)), true));
    } catch {
      contenido.push(latin1.slice(ini, fin)); // stream sin comprimir
    }
    re.lastIndex = fin + 'endstream'.length;
  }
  const diccionarios = latin1.replace(/stream\r?\n[\s\S]*?endstream/g, 'stream endstream');
  return { diccionarios, contenido: contenido.join('\n') };
}

/** Bytes del último PDF que el servicio intentó descargar. */
let generado: ArrayBuffer | null = null;

/** jsPDF que, en vez de descargar con `save()`, se queda con los bytes. */
class PdfCapturado extends jsPDF {
  constructor(...args: ConstructorParameters<typeof jsPDF>) {
    super(...args);
    Object.assign(this, { save: () => { generado = this.output('arraybuffer'); return this; } });
  }
}

async function crearServicio(): Promise<ReportService> {
  const db = { obtenerTodosLosAlumnos: async () => [ALUMNO], obtenerTodosLosMotivos: async () => [] };
  const injector = Injector.create({ providers: [{ provide: DatabaseService, useValue: db }] });
  const svc = runInInjectionContext(injector, () => new ReportService());
  const autoTableFn = (await import('jspdf-autotable')).default;
  // El servicio carga jsPDF bajo demanda; aquí recibe el capturador.
  Object.assign(svc, {
    pdfLibPromise: Promise.resolve({ JsPDFCtor: PdfCapturado, autoTableFn }),
    _autoTableFnCached: autoTableFn,
  });
  return svc;
}

describe('ReportService — texto hostil en los PDF', () => {
  beforeEach(() => { generado = null; });

  function revisar(): void {
    expect(generado).withContext('el PDF no se generó').not.toBeNull();
    const { diccionarios, contenido } = leerPdf(generado!);

    // Ningún objeto activo en el archivo.
    for (const peligro of ['/JavaScript', '/JS', '/Launch', '/AA', '/URI', '/EmbeddedFile', '/SubmitForm', '/ImportData']) {
      expect(diccionarios).withContext(peligro).not.toContain(peligro);
    }
    // jsPDF pone `/OpenAction [página /FitH null]` (la vista inicial): un
    // destino, no una acción. Cualquier otra forma sería inyectada.
    expect(diccionarios.match(/\/OpenAction (?!\[)/g)).toBeNull();
    // El texto llegó, pero dentro de su cadena: los paréntesis van escapados.
    expect(contenido).toContain('Ana\\) Tj ET BT');
    expect(contenido).not.toMatch(/Ana\) Tj ET BT/);
    expect(contenido).not.toMatch(/[^\\]\) >> \/OpenAction/);
  }

  it('constancia del alumno', async () => {
    await (await crearServicio()).generarConstanciaAlumno(ALUMNO, [REGISTRO], {
      nombreInstitucion: `${CIERRA_CADENA} ${HTML}`, folio: JS_PDF,
    });
    revisar();
  });

  it('reporte de visitas con todas las secciones', async () => {
    await (await crearServicio()).generarReporteAccesos([REGISTRO], {
      tipo: 'personalizado',
      fechaInicio: new Date(2026, 8, 1), fechaFin: new Date(2026, 8, 30),
      titulo: CIERRA_CADENA,
      filtros: { busqueda: JS_PDF, carrera: HTML, motivo: BARRAS, otros: [CIERRA_CADENA] },
      topAlumnos: [{
        posicion: 1, matricula: '2299990001', nombreCompleto: CIERRA_CADENA, carrera: JS_PDF,
        totalVisitas: 1, ultimaVisita: new Date(2026, 8, 2), motivoFrecuente: HTML,
      }],
    });
    revisar();
  });
});
