// ╔══════════════════════════════════════════════════════╗
// ║  horarios.utils.spec.ts                              ║
// ║  Stenbrary v3.12.1 — Tests de horario operativo      ║
// ╚══════════════════════════════════════════════════════╝

import { salidaAlCierre, verificarHorario } from './horarios.utils';
import { HorariosSemana } from '../services/config.service';

// Día de la semana: 0=Dom, 1=Lun, ..., 6=Sáb
// Usamos fechas Date con (año, mes0, día, hh, mm) para evitar ambigüedad UTC.

const HORARIO_LUN_A_VIE: HorariosSemana = {
  0: { cerrado: true,  apertura: '09:00', cierre: '14:00' },
  1: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  2: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  3: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  4: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  5: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  6: { cerrado: true,  apertura: '09:00', cierre: '14:00' },
};

describe('horarios.utils', () => {
  describe('verificarHorario', () => {
    it('marca domingo como cerrado y sugiere próxima apertura (mañana)', () => {
      // 2026-04-19 es domingo
      const dom = new Date(2026, 3, 19, 10, 0);
      expect(dom.getDay()).toBe(0);
      const r = verificarHorario(dom, HORARIO_LUN_A_VIE);
      expect(r.abierto).toBeFalse();
      expect(r.mensaje).toContain('los domingos');
      expect(r.proximaApertura).toBe('mañana a las 07:00');
    });

    it('marca sábado como cerrado y sugiere lunes (saltando domingo)', () => {
      // 2026-04-18 es sábado
      const sab = new Date(2026, 3, 18, 10, 0);
      expect(sab.getDay()).toBe(6);
      const r = verificarHorario(sab, HORARIO_LUN_A_VIE);
      expect(r.abierto).toBeFalse();
      // Sábado+1 = domingo (cerrado), Sábado+2 = lunes (abierto)
      expect(r.proximaApertura).toBe('lunes a las 07:00');
    });

    it('bloquea cuando son antes de la apertura (mismo día)', () => {
      // 2026-04-20 lunes, 06:30 (antes de apertura 07:00)
      const lun = new Date(2026, 3, 20, 6, 30);
      expect(lun.getDay()).toBe(1);
      const r = verificarHorario(lun, HORARIO_LUN_A_VIE);
      expect(r.abierto).toBeFalse();
      expect(r.mensaje).toContain('Aún no abre');
      expect(r.proximaApertura).toBe('hoy a las 07:00');
    });

    it('abre exactamente en minuto de apertura (07:00)', () => {
      const lun = new Date(2026, 3, 20, 7, 0);
      const r = verificarHorario(lun, HORARIO_LUN_A_VIE);
      expect(r.abierto).toBeTrue();
    });

    it('está abierto a media jornada', () => {
      const lun = new Date(2026, 3, 20, 13, 45);
      const r = verificarHorario(lun, HORARIO_LUN_A_VIE);
      expect(r.abierto).toBeTrue();
    });

    it('cierra exactamente en el minuto de cierre (>= cierre)', () => {
      const lun = new Date(2026, 3, 20, 20, 0);
      const r = verificarHorario(lun, HORARIO_LUN_A_VIE);
      expect(r.abierto).toBeFalse();
      expect(r.mensaje).toContain('Ya cerró');
    });

    it('cerrado un minuto antes de medianoche', () => {
      const lun = new Date(2026, 3, 20, 23, 59);
      const r = verificarHorario(lun, HORARIO_LUN_A_VIE);
      expect(r.abierto).toBeFalse();
    });

    it('cerrado justo a medianoche del día abierto', () => {
      const lun = new Date(2026, 3, 20, 0, 0);
      expect(lun.getDay()).toBe(1);
      const r = verificarHorario(lun, HORARIO_LUN_A_VIE);
      expect(r.abierto).toBeFalse();
      expect(r.mensaje).toContain('Aún no abre');
    });

    it('trata configuración inválida como abierto (fail-safe)', () => {
      const horariosRotos: HorariosSemana = {
        ...HORARIO_LUN_A_VIE,
        1: { cerrado: false, apertura: 'abc', cierre: 'xyz' },
      };
      const lun = new Date(2026, 3, 20, 10, 0);
      const r = verificarHorario(lun, horariosRotos);
      expect(r.abierto).toBeTrue();
    });

    it('devuelve proximaApertura undefined si toda la semana está cerrada', () => {
      const todoCerrado: HorariosSemana = {
        0: { cerrado: true, apertura: '', cierre: '' },
        1: { cerrado: true, apertura: '', cierre: '' },
        2: { cerrado: true, apertura: '', cierre: '' },
        3: { cerrado: true, apertura: '', cierre: '' },
        4: { cerrado: true, apertura: '', cierre: '' },
        5: { cerrado: true, apertura: '', cierre: '' },
        6: { cerrado: true, apertura: '', cierre: '' },
      };
      const lun = new Date(2026, 3, 20, 10, 0);
      const r = verificarHorario(lun, todoCerrado);
      expect(r.abierto).toBeFalse();
      expect(r.proximaApertura).toBeUndefined();
    });

    it('maneja día sin configuración (undefined) como cerrado', () => {
      const horariosParciales = {
        1: { cerrado: false, apertura: '07:00', cierre: '20:00' },
      } as HorariosSemana;
      const mar = new Date(2026, 3, 21, 10, 0);
      expect(mar.getDay()).toBe(2);
      const r = verificarHorario(mar, horariosParciales);
      expect(r.abierto).toBeFalse();
    });
  });

  // ─── Cerrar al final del horario (v3.57.0) ──────────────
  describe('salidaAlCierre', () => {
    // Lun–vie 07:00–20:00; sábado y domingo cerrados (HORARIO_LUN_A_VIE).
    const lun = (h: number, m = 0) => new Date(2026, 9, 12, h, m);   // lunes 12-oct-2026

    it('la salida es la hora de cierre de ESE día, no el momento de la revisión', () => {
      const s = salidaAlCierre(lun(10), HORARIO_LUN_A_VIE, new Date(2026, 9, 12, 23, 40));
      expect(s?.getHours()).toBe(20);
      expect(s?.getMinutes()).toBe(0);
    });

    it('antes de la hora de cierre no hay salida todavía', () => {
      expect(salidaAlCierre(lun(10), HORARIO_LUN_A_VIE, lun(19, 59))).toBeNull();
    });

    it('una entrada de un día anterior se cierra a la hora de cierre de su día (PC apagada)', () => {
      const s = salidaAlCierre(lun(10), HORARIO_LUN_A_VIE, new Date(2026, 9, 14, 9, 0));
      expect(s?.getDate()).toBe(12);
      expect(s?.getHours()).toBe(20);
    });

    it('si ese día no abría, la salida es el fin del día', () => {
      const sab = new Date(2026, 9, 17, 10, 0);
      const s = salidaAlCierre(sab, HORARIO_LUN_A_VIE, new Date(2026, 9, 18, 9, 0));
      expect([s?.getDate(), s?.getHours(), s?.getMinutes()]).toEqual([17, 23, 59]);
    });

    it('si entró después del cierre, la salida es el fin del día', () => {
      const s = salidaAlCierre(lun(21, 30), HORARIO_LUN_A_VIE, new Date(2026, 9, 13, 8, 0));
      expect([s?.getDate(), s?.getHours()]).toEqual([12, 23]);
    });
  });
});