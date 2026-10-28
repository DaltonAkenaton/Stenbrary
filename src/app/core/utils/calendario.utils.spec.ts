// ╔══════════════════════════════════════════════════════╗
// ║  calendario.utils.spec.ts                             ║
// ║  Calendario escolar configurable (v3.43.0)            ║
// ╚══════════════════════════════════════════════════════╝

import {
  CALENDARIO_BASE_2026,
  CalendarioEscolar,
  calendarioInicial,
  calendarioTipico,
  domingoDePascua,
  diaInhabilEn,
  periodoActual,
  periodoAnterior,
  revisarCalendario,
} from './calendario.utils';
import { fechaLocalISO } from './tiempo.utils';

const cal: CalendarioEscolar = {
  periodos: [
    // Desordenados a propósito: el orden de captura no debe importar.
    { id: 'o', nombre: 'Otoño', inicio: '2026-08-17', fin: '2026-12-04' },
    { id: 'p', nombre: 'Primavera', inicio: '2026-01-19', fin: '2026-05-22' },
    { id: 'v', nombre: 'Verano', inicio: '2026-06-01', fin: '2026-07-17' },
  ],
  diasInhabiles: [
    { id: 'd1', desde: '2026-11-02', hasta: '2026-11-02', descripcion: 'Día de Muertos' },
    { id: 'd2', desde: '2026-07-20', hasta: '2026-07-31', descripcion: 'Vacaciones de verano' },
  ],
};

describe('calendario.utils', () => {
  describe('periodoActual', () => {
    it('devuelve el periodo que contiene hoy, incluidos el primer y el último día completos', () => {
      expect(periodoActual(cal, new Date(2026, 9, 6, 12))!.periodo.nombre).toBe('Otoño');
      expect(periodoActual(cal, new Date(2026, 7, 17, 0, 0))!.periodo.nombre).toBe('Otoño');
      const ultimoDia = periodoActual(cal, new Date(2026, 11, 4, 23, 59))!;
      expect(ultimoDia.periodo.nombre).toBe('Otoño');
      expect(ultimoDia.terminado).toBe(false);
    });

    it('en un hueco entre periodos devuelve el último que terminó, marcado', () => {
      const p = periodoActual(cal, new Date(2026, 4, 27))!; // 27 de mayo
      expect(p.periodo.nombre).toBe('Primavera');
      expect(p.terminado).toBe(true);
    });

    it('el rango cubre días completos en hora local', () => {
      const p = periodoActual(cal, new Date(2026, 1, 10))!;
      expect(p.rango.inicio.getDate()).toBe(19);
      expect(p.rango.inicio.getHours()).toBe(0);
      expect(p.rango.fin.getDate()).toBe(22);
      expect(p.rango.fin.getHours()).toBe(23);
    });

    it('sin periodos, o si todos son futuros, devuelve null', () => {
      expect(periodoActual({ periodos: [], diasInhabiles: [] })).toBeNull();
      expect(periodoActual(cal, new Date(2025, 5, 1))).toBeNull();
    });

    it('ignora periodos con fechas inválidas en vez de tronar', () => {
      const roto: CalendarioEscolar = {
        periodos: [...cal.periodos, { id: 'x', nombre: 'Roto', inicio: 'nada', fin: '2026-13-40' }],
        diasInhabiles: [],
      };
      expect(periodoActual(roto, new Date(2026, 9, 6))!.periodo.nombre).toBe('Otoño');
    });
  });

  describe('periodoAnterior', () => {
    it('es el que terminó justo antes de que empezara el de referencia', () => {
      const otono = cal.periodos[0];
      expect(periodoAnterior(cal, otono)!.periodo.nombre).toBe('Verano');
      const primavera = cal.periodos[1];
      expect(periodoAnterior(cal, primavera)).toBeNull();
    });
  });

  describe('diaInhabilEn', () => {
    it('reconoce días sueltos y rangos, todo el día', () => {
      expect(diaInhabilEn(cal, new Date(2026, 10, 2, 8))!.descripcion).toBe('Día de Muertos');
      expect(diaInhabilEn(cal, new Date(2026, 10, 2, 23, 30))).not.toBeNull();
      expect(diaInhabilEn(cal, new Date(2026, 6, 25))!.descripcion).toBe('Vacaciones de verano');
      expect(diaInhabilEn(cal, new Date(2026, 6, 31, 22))).not.toBeNull();
      expect(diaInhabilEn(cal, new Date(2026, 7, 1, 9))).toBeNull();
      expect(diaInhabilEn(cal, new Date(2026, 10, 3, 9))).toBeNull();
    });
  });

  describe('revisarCalendario', () => {
    const hoy = new Date(2026, 9, 6);

    it('marca como error lo que impide usar un periodo', () => {
      const avisos = revisarCalendario({
        periodos: [
          { id: '1', nombre: '', inicio: '2026-01-01', fin: '2026-02-01' },
          { id: '2', nombre: 'Al revés', inicio: '2026-05-01', fin: '2026-04-01' },
          { id: '3', nombre: 'Inválido', inicio: '', fin: '2026-04-01' },
        ],
        diasInhabiles: [{ id: 'd', desde: '2026-03-10', hasta: '2026-03-01', descripcion: 'X' }],
      }, hoy);
      const errores = avisos.filter(a => a.tipo === 'error').map(a => a.mensaje);
      expect(errores.length).toBe(4);
      expect(errores.some(m => m.includes('sin nombre'))).toBe(true);
      expect(errores.some(m => m.includes('Al revés'))).toBe(true);
      expect(errores.some(m => m.includes('Inválido'))).toBe(true);
    });

    it('avisa (sin bloquear) de huecos y encimados entre periodos', () => {
      const avisos = revisarCalendario(cal, hoy);
      expect(avisos.every(a => a.tipo === 'aviso')).toBe(true);
      // Primavera→Verano (23–31 may) y Verano→Otoño (18 jul–16 ago).
      expect(avisos.filter(a => a.mensaje.includes('sin periodo')).length).toBe(2);

      const encimados = revisarCalendario({
        periodos: [
          { id: 'a', nombre: 'A', inicio: '2026-01-01', fin: '2026-06-30' },
          { id: 'b', nombre: 'B', inicio: '2026-06-15', fin: '2026-12-31' },
        ],
        diasInhabiles: [],
      }, hoy);
      expect(encimados.some(a => a.mensaje.includes('se enciman'))).toBe(true);
    });

    it('periodos pegados (uno empieza al día siguiente del otro) no son hueco', () => {
      const pegados = revisarCalendario({
        periodos: [
          { id: 'a', nombre: 'A', inicio: '2026-01-01', fin: '2026-05-31' },
          { id: 'b', nombre: 'B', inicio: '2026-06-01', fin: '2026-12-31' },
        ],
        diasInhabiles: [],
      }, hoy);
      expect(pegados).toEqual([]);
    });

    it('avisa cuando el calendario ya no cubre hoy (cambio de año)', () => {
      const avisos = revisarCalendario(CALENDARIO_BASE_2026, new Date(2027, 0, 10));
      expect(avisos.some(a => a.mensaje.includes('ya no cubre'))).toBe(true);
    });
  });

  describe('CALENDARIO_BASE_2026', () => {
    it('no tiene errores ni huecos durante 2026', () => {
      expect(revisarCalendario(CALENDARIO_BASE_2026, new Date(2026, 9, 6))).toEqual([]);
    });

    it('el 13 de octubre es inhábil y el 10 de diciembre no (resultados de admisión)', () => {
      expect(diaInhabilEn(CALENDARIO_BASE_2026, new Date(2026, 9, 13, 10))).not.toBeNull();
      expect(diaInhabilEn(CALENDARIO_BASE_2026, new Date(2026, 11, 10, 10))).toBeNull();
    });
  });

  describe('calendario típico', () => {
    const inhabil = (cal: CalendarioEscolar, clave: string) =>
      cal.diasInhabiles.find(d => d.id.endsWith(clave))!;

    it('calcula bien el domingo de Pascua', () => {
      expect(fechaLocalISO(domingoDePascua(2026))).toBe('2026-04-05');
      expect(fechaLocalISO(domingoDePascua(2027))).toBe('2027-03-28');
      expect(fechaLocalISO(domingoDePascua(2024))).toBe('2024-03-31');
    });

    it('para 2026 reproduce las fechas del calendario oficial', () => {
      const tipico = calendarioTipico(2026);
      const oficial = (desde: string) => CALENDARIO_BASE_2026.diasInhabiles.find(d => d.desde === desde);
      // Cada festivo del típico existe en el oficial con el mismo rango.
      for (const d of tipico.diasInhabiles) {
        const o = oficial(d.desde);
        expect(o).withContext(d.descripcion).toBeDefined();
        expect(o?.hasta).withContext(d.descripcion).toBe(d.hasta);
      }
      // Otoño arranca el día de inicio de clases del PDF.
      expect(tipico.periodos[2].inicio).toBe('2026-08-17');
    });

    it('para 2027 recorre los festivos de ley y mueve Semana Santa', () => {
      const c = calendarioTipico(2027);
      expect(inhabil(c, 'constitucion').desde).toBe('2027-02-01');   // primer lunes de febrero
      expect(inhabil(c, 'juarez').desde).toBe('2027-03-15');         // tercer lunes de marzo
      expect(inhabil(c, 'revolucion').desde).toBe('2027-11-15');     // tercer lunes de noviembre
      expect(inhabil(c, 'semana-santa').desde).toBe('2027-03-22');   // Pascua 28 mar − 6
      expect(inhabil(c, 'semana-santa').hasta).toBe('2027-04-02');
      expect(inhabil(c, 'verano').desde).toBe('2027-07-19');         // dos semanas antes del 2 ago
      expect(inhabil(c, 'verano').hasta).toBe('2027-07-30');
      expect(c.periodos[2].inicio).toBe('2027-08-16');               // tercer lunes de agosto
      expect(c.periodos[1].fin).toBe('2027-08-15');
    });

    it('no tiene errores ni huecos entre periodos', () => {
      for (const anio of [2027, 2028, 2030]) {
        expect(revisarCalendario(calendarioTipico(anio), new Date(anio, 5, 1))).withContext(String(anio)).toEqual([]);
      }
    });

    it('al arrancar usa el oficial en 2026 y el típico en otros años', () => {
      expect(calendarioInicial(new Date(2026, 9, 6))).toBe(CALENDARIO_BASE_2026);
      expect(calendarioInicial(new Date(2027, 0, 10)).periodos[0].nombre).toBe('Primavera 2027');
    });
  });
});
