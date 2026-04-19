// ╔══════════════════════════════════════════════════════╗
// ║  insignias.utils.spec.ts                             ║
// ║  Stenbrary v3.12.1 — Tests de logros e insignias     ║
// ╚══════════════════════════════════════════════════════╝

import { calcularLogros } from './insignias.utils';
import { Registro } from '../models';

function reg(fecha: Date, duracionMinutos = 60): Registro {
  return {
    id: 'r-' + fecha.getTime(),
    alumnoId: 'a1',
    matricula: '2299990001',
    nombreCompleto: 'Test Alumno',
    carrera: 'ISC',
    motivoId: 'm1',
    motivoNombre: 'Estudiar',
    fechaHora: fecha,
    sincronizado: false,
    duracionMinutos,
  };
}

function diaAtras(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

describe('insignias.utils', () => {
  describe('calcularLogros', () => {
    it('devuelve ceros con lista vacía', () => {
      const l = calcularLogros([]);
      expect(l.rachaActual).toBe(0);
      expect(l.rachaMaxima).toBe(0);
      expect(l.horasAcumuladas).toBe(0);
      expect(l.totalVisitas).toBe(0);
      expect(l.insigniasObtenidas.length).toBe(0);
    });

    it('con un solo registro de hoy: racha actual 1, máxima 1', () => {
      const l = calcularLogros([reg(diaAtras(0))]);
      expect(l.rachaActual).toBe(1);
      expect(l.rachaMaxima).toBe(1);
      expect(l.totalVisitas).toBe(1);
    });

    it('con un solo registro de ayer: racha actual 1 (aún viva)', () => {
      const l = calcularLogros([reg(diaAtras(1))]);
      expect(l.rachaActual).toBe(1);
    });

    it('último registro hace 3 días: racha actual 0', () => {
      const l = calcularLogros([reg(diaAtras(3))]);
      expect(l.rachaActual).toBe(0);
      expect(l.rachaMaxima).toBe(1);
    });

    it('tres días consecutivos terminando hoy: racha actual 3 → insignia "Constancia"', () => {
      const regs = [reg(diaAtras(2)), reg(diaAtras(1)), reg(diaAtras(0))];
      const l = calcularLogros(regs);
      expect(l.rachaActual).toBe(3);
      expect(l.rachaMaxima).toBe(3);
      const racha3 = l.insignias.find(i => i.id === 'racha-3');
      expect(racha3?.obtenida).toBeTrue();
    });

    it('racha rota por un gap: actual se reinicia pero máxima conserva', () => {
      // Días: hace 10, 9, 8 (racha de 3) + hoy (racha nueva de 1)
      const regs = [
        reg(diaAtras(10)),
        reg(diaAtras(9)),
        reg(diaAtras(8)),
        reg(diaAtras(0)),
      ];
      const l = calcularLogros(regs);
      expect(l.rachaMaxima).toBe(3);
      expect(l.rachaActual).toBe(1);
    });

    it('visitas múltiples el mismo día cuentan como un solo día en racha', () => {
      const hoy1 = diaAtras(0);
      const hoy2 = new Date(hoy1);
      hoy2.setHours(15, 0, 0, 0);
      const regs = [reg(diaAtras(1)), reg(hoy1), reg(hoy2)];
      const l = calcularLogros(regs);
      expect(l.rachaActual).toBe(2);
      expect(l.totalVisitas).toBe(3);
    });

    it('suma horasAcumuladas con redondeo a 1 decimal', () => {
      const regs = [reg(diaAtras(1), 45), reg(diaAtras(0), 30)]; // 75 min = 1.25h → 1.3h (redondeo)
      const l = calcularLogros(regs);
      // (75/60)*10 = 12.5 → redondea a 13 → /10 = 1.3
      expect(l.horasAcumuladas).toBe(1.3);
    });

    it('ignora registros sin duracionMinutos (tratados como 0)', () => {
      const r: Registro = { ...reg(diaAtras(0)), duracionMinutos: undefined };
      const l = calcularLogros([r]);
      expect(l.horasAcumuladas).toBe(0);
    });

    it('insignia de visitas: 10 visitas → "Primeros Pasos" obtenida', () => {
      const regs = Array.from({ length: 10 }, (_, i) => reg(diaAtras(i)));
      const l = calcularLogros(regs);
      expect(l.totalVisitas).toBe(10);
      const visitas10 = l.insignias.find(i => i.id === 'visitas-10');
      expect(visitas10?.obtenida).toBeTrue();
    });

    it('proximaInsignia es la más cercana no obtenida', () => {
      const regs = [reg(diaAtras(0))]; // 1 visita, 1h, racha 1
      const l = calcularLogros(regs);
      expect(l.proximaInsignia).not.toBeNull();
      // La más cercana debería ser racha-3 (faltan 2) sobre horas-10 (faltan 9) y visitas-10 (faltan 9)
      expect(l.proximaInsignia?.id).toBe('racha-3');
    });

    it('proximaInsignia es null cuando todas están obtenidas', () => {
      // Forzar 250 visitas, 100h, racha 30 todas obtenidas
      const regs: Registro[] = [];
      // 30 días consecutivos
      for (let i = 0; i < 30; i++) regs.push(reg(diaAtras(i), 200)); // 200min × 30 = 6000min = 100h
      // Rellenar hasta 250 visitas con días adicionales
      for (let i = 30; i < 250; i++) regs.push(reg(diaAtras(i + 30), 0));
      const l = calcularLogros(regs);
      expect(l.totalVisitas).toBe(250);
      expect(l.horasAcumuladas).toBeGreaterThanOrEqual(100);
      expect(l.rachaMaxima).toBeGreaterThanOrEqual(30);
      expect(l.proximaInsignia).toBeNull();
    });
  });
});
