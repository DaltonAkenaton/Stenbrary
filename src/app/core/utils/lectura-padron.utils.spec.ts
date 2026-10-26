// ╔══════════════════════════════════════════════════════╗
// ║  lectura-padron.utils.spec.ts — Stenbrary v3.62.0    ║
// ║  Archivos válidos, dañados, vacíos, disfrazados y    ║
// ║  excesivos. Los límites se bajan en la prueba para   ║
// ║  no fabricar archivos de 20 000 filas.               ║
// ╚══════════════════════════════════════════════════════╝

import * as XLSX from 'xlsx';
import { LIMITES_PADRON, leerPadron, tipoPorExtension, validarArchivoPadron } from './lectura-padron.utils';

const ENCABEZADO = ['Matrícula', 'Nombre', 'Apellido Paterno', 'Apellido Materno', 'Carrera', 'Grado', 'Grupo', 'Turno'];
const FILA = ['2299990003', 'Juan', 'García', 'López', 'Contador Público', 4, 'A', 'Matutino'];

function libro(filas: unknown[][], tipo: 'xlsx' | 'csv' | 'xls' = 'xlsx'): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), 'Alumnos');
  const salida = XLSX.write(wb, { type: 'array', bookType: tipo === 'xls' ? 'biff8' : tipo });
  return new Uint8Array(salida as ArrayBuffer);
}

const texto = (s: string) => new TextEncoder().encode(s);

describe('lectura-padron.utils', () => {
  describe('tipoPorExtension', () => {
    it('reconoce .xlsx, .xls y .csv sin importar mayúsculas', () => {
      expect(tipoPorExtension('Padron 2026.XLSX')).toBe('xlsx');
      expect(tipoPorExtension('a.xls')).toBe('xls');
      expect(tipoPorExtension('a.csv')).toBe('csv');
    });
    it('rechaza otras extensiones o ninguna', () => {
      expect(tipoPorExtension('padron.pdf')).toBeNull();
      expect(tipoPorExtension('padron.xlsx.exe')).toBeNull();
      expect(tipoPorExtension('padron')).toBeNull();
    });
  });

  describe('validarArchivoPadron', () => {
    it('acepta un .xlsx real, un .xls de Excel 97 y un .csv', () => {
      const x = libro([ENCABEZADO, FILA]);
      expect(validarArchivoPadron('a.xlsx', x.length, x.subarray(0, 4096)).ok).toBeTrue();
      const b = libro([ENCABEZADO, FILA], 'xls');
      expect(validarArchivoPadron('a.xls', b.length, b.subarray(0, 4096)).ok).toBeTrue();
      const c = libro([ENCABEZADO, FILA], 'csv');
      expect(validarArchivoPadron('a.csv', c.length, c.subarray(0, 4096)).ok).toBeTrue();
    });

    it('acepta un ".xls" que en realidad es HTML (exportación típica de sistemas escolares)', () => {
      const html = texto('<table><tr><td>Matrícula</td></tr></table>');
      expect(validarArchivoPadron('padron.xls', html.length, html).ok).toBeTrue();
    });

    it('rechaza un archivo vacío', () => {
      const r = validarArchivoPadron('a.xlsx', 0, new Uint8Array());
      expect(r).toEqual({ ok: false, error: 'El archivo está vacío.' });
    });

    it('rechaza un archivo más pesado que el máximo, con el tamaño en el mensaje', () => {
      const r = validarArchivoPadron('a.xlsx', LIMITES_PADRON.maxBytes + 1, texto('PK\u0003\u0004'));
      expect(r.ok).toBeFalse();
      if (!r.ok) expect(r.error).toContain('el máximo es 10 MB');
    });

    it('rechaza un .xlsx que no es ZIP (texto o ejecutable renombrado)', () => {
      expect(validarArchivoPadron('a.xlsx', 10, texto('Matricula,Nombre')).ok).toBeFalse();
      const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]);   // "MZ": ejecutable de Windows
      expect(validarArchivoPadron('a.xlsx', exe.length, exe).ok).toBeFalse();
    });

    it('rechaza un .csv con contenido binario', () => {
      const zip = libro([ENCABEZADO, FILA]);
      expect(validarArchivoPadron('a.csv', zip.length, zip.subarray(0, 4096)).ok).toBeFalse();
    });

    it('rechaza extensiones no admitidas con un mensaje claro', () => {
      const r = validarArchivoPadron('padron.pdf', 10, texto('%PDF'));
      expect(r).toEqual({ ok: false, error: 'Formato no admitido: usa un archivo .xlsx, .xls o .csv.' });
    });
  });

  describe('leerPadron', () => {
    it('lee la primera hoja como filas encabezado → valor', () => {
      const r = leerPadron(libro([ENCABEZADO, FILA, ['2299990004', 'Ana', 'Ruiz', '', 'Derecho', 2, 'B', 'Vespertino']]));
      expect(r.ok).toBeTrue();
      if (!r.ok) return;
      expect(r.hoja).toBe('Alumnos');
      expect(r.filas.length).toBe(2);
      expect(r.filas[0]['Matrícula']).toBe('2299990003');
      expect(r.filas[1]['Apellido Materno']).toBe('');   // celdas vacías como ''
    });

    it('lee un CSV', () => {
      const r = leerPadron(texto('Matrícula,Nombre\n2299990003,Juan\n'));
      expect(r.ok && r.filas[0]['Nombre']).toBe('Juan');
    });

    it('un archivo dañado no lanza: devuelve el motivo', () => {
      const danado = libro([ENCABEZADO, FILA]).slice(0, 200);   // ZIP truncado
      const r = leerPadron(danado);
      expect(r.ok).toBeFalse();
      if (!r.ok) expect(r.error).toContain('dañado');
    });

    it('una hoja solo con encabezado se reporta vacía', () => {
      const r = leerPadron(libro([ENCABEZADO]));
      expect(r).toEqual({ ok: false, error: 'El archivo está vacío o no tiene datos.' });
    });

    it('más filas que el máximo: rechaza todo el archivo, no devuelve una parte', () => {
      const filas = [ENCABEZADO, ...Array.from({ length: 8 }, (_, i) => [String(2299990100 + i), 'N', 'P', '', 'C', 1, 'A', 'Matutino'])];
      const r = leerPadron(libro(filas), { ...LIMITES_PADRON, maxFilas: 5 });
      expect(r.ok).toBeFalse();
      if (!r.ok) expect(r.error).toContain('tiene 8 filas y el máximo es 5');
    });

    it('justo en el máximo sí se lee', () => {
      const filas = [ENCABEZADO, ...Array.from({ length: 5 }, (_, i) => [String(2299990100 + i), 'N', 'P', '', 'C', 1, 'A', 'Matutino'])];
      const r = leerPadron(libro(filas), { ...LIMITES_PADRON, maxFilas: 5 });
      expect(r.ok && r.filas.length).toBe(5);
    });

    it('más columnas que el máximo: rechaza', () => {
      const ancho = Array.from({ length: 12 }, (_, i) => `Col${i}`);
      const r = leerPadron(libro([ancho, ancho.map(() => 'x')]), { ...LIMITES_PADRON, maxColumnas: 10 });
      expect(r.ok).toBeFalse();
      if (!r.ok) expect(r.error).toContain('12 columnas');
    });

    it('una celda desproporcionada rechaza el archivo e indica fila y columna', () => {
      const r = leerPadron(libro([ENCABEZADO, [...FILA.slice(0, 1), 'x'.repeat(301), ...FILA.slice(2)]]));
      expect(r.ok).toBeFalse();
      if (!r.ok) expect(r.error).toContain('La fila 2, columna "Nombre", tiene 301 caracteres');
    });

    for (const prohibido of ['__proto__', 'constructor', 'prototype']) {
      it(`un encabezado "${prohibido}" se rechaza y no contamina objetos`, () => {
        const r = leerPadron(libro([['Matrícula', prohibido], ['2299990003', 'x']]));
        expect(r.ok).toBeFalse();
        expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
        expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'x')).toBeFalse();
      });
    }
  });
});
