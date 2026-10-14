// ╔══════════════════════════════════════════════════════╗
// ║  quiosco.utils.spec.ts                               ║
// ║  Stenbrary v3.52.0 — Quiosco: volver solo + PIN      ║
// ╚══════════════════════════════════════════════════════╝

import {
  debeVolverAQuiosco, EstadoQuiosco, INTENTOS_PIN_INICIAL, PIN_BLOQUEO_MS, PIN_MAX_FALLOS,
  leerIntentosPin, msBloqueoPin, normalizarIntentosPin, registrarFalloPin,
} from './quiosco.utils';

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

describe('quiosco.utils — intentos del PIN', () => {
  const T = 1_000_000;

  it('los primeros fallos solo cuentan; el quinto bloquea 5 minutos', () => {
    let e = INTENTOS_PIN_INICIAL;
    for (let i = 1; i < PIN_MAX_FALLOS; i++) {
      e = registrarFalloPin(e, T);
      expect(msBloqueoPin(e, T)).toBe(0);
    }
    e = registrarFalloPin(e, T);
    expect(msBloqueoPin(e, T)).toBe(PIN_BLOQUEO_MS);
    expect(e.fallos).toBe(0);
  });

  it('el bloqueo se acaba solo', () => {
    const e = { fallos: 0, bloqueadoHasta: T + PIN_BLOQUEO_MS };
    expect(msBloqueoPin(e, T + PIN_BLOQUEO_MS - 1)).toBe(1);
    expect(msBloqueoPin(e, T + PIN_BLOQUEO_MS)).toBe(0);
  });

  it('atrasar el reloj no deja el PIN trabado más de un bloqueo', () => {
    const atrasado = T - 24 * 60 * MIN;
    const e = normalizarIntentosPin({ fallos: 0, bloqueadoHasta: T + PIN_BLOQUEO_MS }, atrasado);
    expect(msBloqueoPin(e, atrasado)).toBe(PIN_BLOQUEO_MS);
    expect(msBloqueoPin(e, atrasado + PIN_BLOQUEO_MS)).toBe(0);
  });

  it('lee el estado guardado y tolera basura', () => {
    expect(leerIntentosPin('{"fallos":3,"bloqueadoHasta":42}')).toEqual({ fallos: 3, bloqueadoHasta: 42 });
    expect(leerIntentosPin(null)).toEqual(INTENTOS_PIN_INICIAL);
    expect(leerIntentosPin('no es json')).toEqual(INTENTOS_PIN_INICIAL);
    expect(leerIntentosPin('{"fallos":-2,"bloqueadoHasta":"x"}')).toEqual(INTENTOS_PIN_INICIAL);
  });
});
