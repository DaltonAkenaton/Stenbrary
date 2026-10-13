// ╔══════════════════════════════════════════════════════╗
// ║  quiosco.utils.spec.ts                               ║
// ║  Stenbrary v3.49.0 — Volver solo al modo quiosco     ║
// ╚══════════════════════════════════════════════════════╝

import { debeVolverAQuiosco, EstadoQuiosco } from './quiosco.utils';

const MIN = 60_000;
const base: EstadoQuiosco = { activo: false, minutos: 10, ultimaActividad: 0, ahora: 10 * MIN, ruta: '/estadisticas' };

describe('quiosco.utils', () => {
  it('vuelve al cumplirse exactamente los minutos sin uso', () => {
    expect(debeVolverAQuiosco(base)).toBeTrue();
  });

  it('no vuelve un instante antes', () => {
    expect(debeVolverAQuiosco({ ...base, ahora: 10 * MIN - 1 })).toBeFalse();
  });

  it('0 minutos = función apagada', () => {
    expect(debeVolverAQuiosco({ ...base, minutos: 0, ahora: 999 * MIN })).toBeFalse();
  });

  it('no hace nada si el quiosco ya está activo', () => {
    expect(debeVolverAQuiosco({ ...base, activo: true })).toBeFalse();
  });

  it('no interrumpe el asistente inicial ni el login', () => {
    expect(debeVolverAQuiosco({ ...base, ruta: '/bienvenida' })).toBeFalse();
    expect(debeVolverAQuiosco({ ...base, ruta: '/login' })).toBeFalse();
  });
});
