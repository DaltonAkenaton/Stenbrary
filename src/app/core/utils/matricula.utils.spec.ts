// ╔══════════════════════════════════════════════════════╗
// ║  matricula.utils.spec.ts                             ║
// ║  Stenbrary v3.12.1 — Tests de validación matrícula   ║
// ╚══════════════════════════════════════════════════════╝

import {
  MATRICULA_CONFIG,
  validarMatricula,
  esMatriculaValidaScanner,
  normalizarMatricula,
} from './matricula.utils';

describe('matricula.utils', () => {
  describe('validarMatricula', () => {
    it('rechaza cadena vacía', () => {
      const r = validarMatricula('');
      expect(r.valida).toBeFalse();
      expect(r.error).toContain('requerida');
    });

    it('rechaza null/undefined como cadena vacía', () => {
      expect(validarMatricula(null as any).valida).toBeFalse();
      expect(validarMatricula(undefined as any).valida).toBeFalse();
    });

    it('acepta INVITADO en mayúsculas', () => {
      const r = validarMatricula('INVITADO');
      expect(r.valida).toBeTrue();
      expect(r.matriculaLimpia).toBe('INVITADO');
    });

    it('acepta INVITADO en minúsculas (case-insensitive)', () => {
      const r = validarMatricula('invitado');
      expect(r.valida).toBeTrue();
      expect(r.matriculaLimpia).toBe('INVITADO');
    });

    it('acepta matrícula numérica sin prefijo', () => {
      const r = validarMatricula('2299990001');
      expect(r.valida).toBeTrue();
      expect(r.matriculaLimpia).toBe('2299990001');
      expect(r.prefijo).toBe('');
    });

    it('acepta matrícula con prefijo "a"', () => {
      const r = validarMatricula('a2299990001');
      expect(r.valida).toBeTrue();
      expect(r.matriculaLimpia).toBe('2299990001');
      expect(r.prefijo).toBe('a');
    });

    it('acepta matrícula con prefijo "A" mayúsculas', () => {
      const r = validarMatricula('A2299990001');
      expect(r.valida).toBeTrue();
      expect(r.matriculaLimpia).toBe('2299990001');
      expect(r.prefijo).toBe('A');
    });

    it('hace trim de espacios al inicio/fin', () => {
      const r = validarMatricula('  2299990001  ');
      expect(r.valida).toBeTrue();
      expect(r.matriculaLimpia).toBe('2299990001');
    });

    it('rechaza longitud menor al mínimo', () => {
      const r = validarMatricula('123456');
      expect(r.valida).toBeFalse();
      expect(r.error).toContain(`${MATRICULA_CONFIG.minDigitos}`);
    });

    it('acepta exactamente el mínimo de dígitos', () => {
      const r = validarMatricula('1234567');
      expect(r.valida).toBeTrue();
    });

    it('acepta exactamente el máximo de dígitos', () => {
      const max = '1'.repeat(MATRICULA_CONFIG.maxDigitos);
      const r = validarMatricula(max);
      expect(r.valida).toBeTrue();
    });

    it('rechaza longitud mayor al máximo', () => {
      const tooLong = '1'.repeat(MATRICULA_CONFIG.maxDigitos + 1);
      const r = validarMatricula(tooLong);
      expect(r.valida).toBeFalse();
      expect(r.error).toContain(`${MATRICULA_CONFIG.maxDigitos}`);
    });

    it('rechaza formato con letras no reconocidas', () => {
      const r = validarMatricula('xyz123456');
      expect(r.valida).toBeFalse();
      expect(r.error).toContain('Formato no reconocido');
    });

    it('rechaza matrícula con prefijo válido pero parte no numérica', () => {
      const r = validarMatricula('aXXXXX123');
      expect(r.valida).toBeFalse();
      expect(r.error).toContain('solo números');
    });

    it('rechaza matrícula con caracteres especiales', () => {
      const r = validarMatricula('2223-410337');
      expect(r.valida).toBeFalse();
    });
  });

  describe('esMatriculaValidaScanner', () => {
    it('acepta solo dígitos con longitud >= mínima', () => {
      expect(esMatriculaValidaScanner('2299990001')).toBeTrue();
    });

    it('rechaza cadena vacía', () => {
      expect(esMatriculaValidaScanner('')).toBeFalse();
    });

    it('rechaza longitud menor a mínimo', () => {
      expect(esMatriculaValidaScanner('12345')).toBeFalse();
    });

    it('rechaza matrícula con prefijo (scanner no acepta letras)', () => {
      expect(esMatriculaValidaScanner('a2299990001')).toBeFalse();
    });

    it('rechaza caracteres no numéricos', () => {
      expect(esMatriculaValidaScanner('2223-410337')).toBeFalse();
    });

    it('acepta con espacios externos (se trimean)', () => {
      expect(esMatriculaValidaScanner('  2299990001  ')).toBeTrue();
    });
  });

  describe('normalizarMatricula', () => {
    it('quita prefijo "a"', () => {
      expect(normalizarMatricula('a2299990001')).toBe('2299990001');
    });

    it('quita prefijo "A"', () => {
      expect(normalizarMatricula('A2299990001')).toBe('2299990001');
    });

    it('deja intacta una matrícula sin prefijo', () => {
      expect(normalizarMatricula('2299990001')).toBe('2299990001');
    });

    it('hace trim antes de normalizar', () => {
      expect(normalizarMatricula('  a2299990001  ')).toBe('2299990001');
    });

    it('maneja cadena vacía sin error', () => {
      expect(normalizarMatricula('')).toBe('');
    });
  });
});
