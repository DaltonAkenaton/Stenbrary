import { validarVisitaManual, visitaParecida } from './visita-manual.utils';

describe('visita-manual.utils', () => {
  const ahora = new Date(2026, 9, 23, 14, 0);

  describe('validarVisitaManual', () => {
    it('arma entrada y salida del mismo día, en hora local', () => {
      const r = validarVisitaManual({ fecha: '2026-10-21', entrada: '9:05', salida: '10:30' }, ahora);
      expect(r.error).toBeUndefined();
      if (r.error !== undefined) return;
      expect(r.entrada).toEqual(new Date(2026, 9, 21, 9, 5));
      expect(r.salida).toEqual(new Date(2026, 9, 21, 10, 30));
    });

    it('la salida es opcional', () => {
      const r = validarVisitaManual({ fecha: '2026-10-21', entrada: '09:00', salida: ' ' }, ahora);
      expect(r.error).toBeUndefined();
      if (r.error === undefined) expect(r.salida).toBeUndefined();
    });

    it('pide fecha y hora de entrada válidas', () => {
      expect(validarVisitaManual({ fecha: '', entrada: '09:00', salida: '' }, ahora).error).toContain('fecha');
      expect(validarVisitaManual({ fecha: '2026-10-21', entrada: '', salida: '' }, ahora).error).toContain('entrada');
      expect(validarVisitaManual({ fecha: '2026-10-21', entrada: '25:00', salida: '' }, ahora).error).toContain('entrada');
    });

    it('la salida tiene que ser después de la entrada', () => {
      expect(validarVisitaManual({ fecha: '2026-10-21', entrada: '10:00', salida: '10:00' }, ahora).error)
        .toContain('después');
      expect(validarVisitaManual({ fecha: '2026-10-21', entrada: '10:00', salida: '09:00' }, ahora).error)
        .toContain('después');
    });

    it('no acepta horas en el futuro', () => {
      expect(validarVisitaManual({ fecha: '2026-10-23', entrada: '15:00', salida: '' }, ahora).error).toContain('futuro');
      expect(validarVisitaManual({ fecha: '2026-10-23', entrada: '13:00', salida: '14:30' }, ahora).error).toContain('futuro');
      expect(validarVisitaManual({ fecha: '2026-10-23', entrada: '13:00', salida: '13:59' }, ahora).error).toBeUndefined();
    });
  });

  describe('visitaParecida', () => {
    const registros = [
      { matricula: '2300100001', nombreCompleto: 'Valeria Garza', fechaHora: new Date(2026, 9, 21, 9, 20) },
      { matricula: 'INVITADO', nombreCompleto: 'Juan Pérez', fechaHora: new Date(2026, 9, 21, 11, 0) },
    ];

    it('encuentra la misma matrícula dentro del margen', () => {
      const quien = { matricula: '2300100001', nombreCompleto: 'Valeria Garza' };
      expect(visitaParecida(registros, quien, new Date(2026, 9, 21, 9, 0), 30)).toBe(registros[0]);
      expect(visitaParecida(registros, quien, new Date(2026, 9, 21, 8, 30), 30)).toBeUndefined();
      expect(visitaParecida(registros, { ...quien, matricula: '2300100002' }, new Date(2026, 9, 21, 9, 0), 30))
        .toBeUndefined();
    });

    it('a un visitante lo compara por nombre, sin importar mayúsculas', () => {
      expect(visitaParecida(registros, { matricula: 'INVITADO', nombreCompleto: 'juan pérez ' },
        new Date(2026, 9, 21, 11, 10), 30)).toBe(registros[1]);
      expect(visitaParecida(registros, { matricula: 'INVITADO', nombreCompleto: 'Ana' },
        new Date(2026, 9, 21, 11, 10), 30)).toBeUndefined();
    });
  });
});
