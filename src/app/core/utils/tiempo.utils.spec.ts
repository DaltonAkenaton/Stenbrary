// ╔══════════════════════════════════════════════════════╗
// ║  tiempo.utils.spec.ts                                 ║
// ║  Fechas de calendario en hora local (auditoría 2026-10)║
// ║                                                       ║
// ║  Estos tests solo muerden en una zona con offset      ║
// ║  negativo: en UTC, `new Date('YYYY-MM-DD')` y la hora  ║
// ║  local coinciden y el bug no existe. Por eso CI corre  ║
// ║  la suite con TZ=America/Mexico_City.                 ║
// ╚══════════════════════════════════════════════════════╝

import {
  contarHastaMismaHora,
  fechaLocalISO,
  parseFechaLocal,
  rangoUltimosDias,
} from './tiempo.utils';

describe('tiempo.utils — fechas de calendario', () => {
  describe('parseFechaLocal', () => {
    it('devuelve la medianoche LOCAL del día escrito, no la de UTC', () => {
      const d = parseFechaLocal('2026-10-03')!;
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(9);
      expect(d.getDate()).toBe(3);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    });

    it('rechaza texto vacío, con otro formato o fechas imposibles', () => {
      expect(parseFechaLocal('')).toBeNull();
      expect(parseFechaLocal(null)).toBeNull();
      expect(parseFechaLocal('03/10/2026')).toBeNull();
      expect(parseFechaLocal('2026-02-31')).toBeNull();
      expect(parseFechaLocal('2026-13-01')).toBeNull();
    });

    it('acepta el 29 de febrero solo en año bisiesto', () => {
      expect(parseFechaLocal('2028-02-29')).not.toBeNull();
      expect(parseFechaLocal('2026-02-29')).toBeNull();
    });
  });

  describe('fechaLocalISO', () => {
    it('a las 19:30 sigue siendo HOY (toISOString daba mañana en México)', () => {
      expect(fechaLocalISO(new Date(2026, 9, 5, 19, 30))).toBe('2026-10-05');
      expect(fechaLocalISO(new Date(2026, 9, 5, 23, 59, 59))).toBe('2026-10-05');
    });

    it('rellena mes y día con cero', () => {
      expect(fechaLocalISO(new Date(2026, 0, 7))).toBe('2026-01-07');
    });

    it('es la inversa de parseFechaLocal', () => {
      expect(fechaLocalISO(parseFechaLocal('2026-12-31')!)).toBe('2026-12-31');
    });
  });

  describe('rangoUltimosDias', () => {
    const hoy = new Date(2026, 9, 6, 15, 0);

    it('"últimos 7 días" son hoy y los 6 anteriores — no 8', () => {
      const { inicio, fin } = rangoUltimosDias(7, hoy);
      expect(fechaLocalISO(inicio)).toBe('2026-09-30');
      expect(inicio.getHours()).toBe(0);
      expect(fechaLocalISO(fin)).toBe('2026-10-06');
      expect(fin.getHours()).toBe(23);
    });

    it('1 día es solo hoy, y valores ≤ 0 se tratan como 1', () => {
      expect(fechaLocalISO(rangoUltimosDias(1, hoy).inicio)).toBe('2026-10-06');
      expect(fechaLocalISO(rangoUltimosDias(0, hoy).inicio)).toBe('2026-10-06');
    });
  });

  describe('contarHastaMismaHora', () => {
    // Lunes pasado: 2 accesos por la mañana, 3 por la tarde.
    const lunesPasado = [
      new Date(2026, 8, 28, 8, 15),
      new Date(2026, 8, 28, 9, 50),
      new Date(2026, 8, 28, 13, 0),
      new Date(2026, 8, 28, 16, 30),
      new Date(2026, 8, 28, 18, 45),
    ];

    it('cuenta solo lo que el otro día llevaba a esta misma hora', () => {
      expect(contarHastaMismaHora(lunesPasado, new Date(2026, 9, 5, 10, 0))).toBe(2);
      expect(contarHastaMismaHora(lunesPasado, new Date(2026, 9, 5, 7, 0))).toBe(0);
      expect(contarHastaMismaHora(lunesPasado, new Date(2026, 9, 5, 22, 0))).toBe(5);
    });

    it('incluye un acceso exactamente a la hora de corte', () => {
      expect(contarHastaMismaHora(lunesPasado, new Date(2026, 9, 5, 13, 0))).toBe(3);
    });
  });
});
