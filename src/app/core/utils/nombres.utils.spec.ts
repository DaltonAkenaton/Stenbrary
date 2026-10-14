// ╔══════════════════════════════════════════════════════╗
// ║  nombres.utils.spec.ts                               ║
// ║  Stenbrary v3.54.0                                   ║
// ╚══════════════════════════════════════════════════════╝

import { PATRON_NOMBRE, esNombreValido, limpiarNombre } from './nombres.utils';

describe('nombres.utils', () => {
  it('capitaliza lo que llega todo en minúsculas o mayúsculas', () => {
    expect(limpiarNombre('juan carlos')).toBe('Juan Carlos');
    expect(limpiarNombre('GARCÍA')).toBe('García');
    expect(limpiarNombre('ÑUÑEZ')).toBe('Ñuñez');
  });

  it('quita espacios de sobra', () => {
    expect(limpiarNombre('  juan    carlos ')).toBe('Juan Carlos');
  });

  it('partículas en minúscula, salvo al inicio', () => {
    expect(limpiarNombre('DE LA GARZA')).toBe('De la Garza');
    expect(limpiarNombre('maría de los ángeles')).toBe('María de los Ángeles');
  });

  it('guion y apóstrofo', () => {
    expect(limpiarNombre('maría-josé')).toBe('María-José');
    expect(limpiarNombre("o'neil")).toBe("O'Neil");
  });

  it('respeta lo que ya viene con mayúsculas a propósito', () => {
    expect(limpiarNombre('McAllen')).toBe('McAllen');
    expect(limpiarNombre('de la Garza')).toBe('de la Garza');
  });

  it('vacío se queda vacío', () => {
    expect(limpiarNombre('   ')).toBe('');
    expect(limpiarNombre(null)).toBe('');
  });

  it('el patrón acepta nombres reales y rechaza números y símbolos', () => {
    for (const ok of ['Ana', 'María José', 'Ñuñez', "O'Neil", 'García-López', 'Ma. Elena']) {
      expect(PATRON_NOMBRE.test(ok)).withContext(ok).toBeTrue();
    }
    for (const mal of ['Ana2', '2200000001', '@na', '-Ana', 'Ana_Luz']) {
      expect(PATRON_NOMBRE.test(mal)).withContext(mal).toBeFalse();
    }
  });

  it('los espacios de sobra no invalidan el nombre', () => {
    expect(esNombreValido('  juan   carlos ')).toBeTrue();
    expect(esNombreValido('')).toBeTrue();
    expect(esNombreValido(' ana2')).toBeFalse();
  });
});
