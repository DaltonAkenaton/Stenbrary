// ╔══════════════════════════════════════════════════════╗
// ║  flujo-puerta.utils.spec.ts                          ║
// ║  Stenbrary v3.54.0 — Flujos abandonados en la puerta ║
// ╚══════════════════════════════════════════════════════╝

import { FLUJO_CEDE_MS, decidirLecturaEnFlujo } from './flujo-puerta.utils';

describe('flujo-puerta.utils', () => {
  const base = { matriculaFlujo: '2200000001', leida: '2200000002', msSinInteraccion: 0 };

  it('su propia credencial otra vez: nada', () => {
    expect(decidirLecturaEnFlujo({ ...base, leida: '2200000001', msSinInteraccion: 999_999 })).toBe('misma');
  });

  it('alguien usando la pantalla: el siguiente espera', () => {
    expect(decidirLecturaEnFlujo({ ...base, msSinInteraccion: FLUJO_CEDE_MS - 1 })).toBe('esperar');
  });

  it('pantalla abandonada: se atiende al nuevo', () => {
    expect(decidirLecturaEnFlujo({ ...base, msSinInteraccion: FLUJO_CEDE_MS })).toBe('atender');
  });

  it('con el registro ya guardado, se atiende al nuevo de inmediato', () => {
    expect(decidirLecturaEnFlujo({ ...base, terminado: true })).toBe('atender');
    expect(decidirLecturaEnFlujo({ ...base, leida: '2200000001', terminado: true })).toBe('atender');
  });
});
