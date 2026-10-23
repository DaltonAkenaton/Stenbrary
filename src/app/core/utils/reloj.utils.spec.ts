import {
  crearDateCorregido, desfaseDesdeServidor, desfaseManual, describirDesfase, leerEstadoReloj, revisarReloj,
  CLAVE_RELOJ, EstadoReloj,
} from './reloj.utils';

describe('reloj.utils', () => {
  describe('crearDateCorregido', () => {
    const PC = new Date('2026-10-22T12:00:00Z').getTime();
    // Un Date "de la PC" fijo, para que las pruebas no dependan de la hora real.
    const Pc = crearDateCorregido(Date, () => 0);
    (Pc as unknown as { now: () => number }).now = () => PC;
    let desfase = 7 * 60_000;
    const D = crearDateCorregido(Pc, () => desfase);

    it('sin argumentos y en now(), la hora de la PC más el desfase', () => {
      expect(new D().getTime()).toBe(PC + 7 * 60_000);
      expect(D.now()).toBe(PC + 7 * 60_000);
    });

    it('una fecha dada no se mueve', () => {
      expect(new D('2026-09-01T10:00:00Z').toISOString()).toBe('2026-09-01T10:00:00.000Z');
      expect(new D(2026, 8, 1, 10).getHours()).toBe(10);
      expect(new D(0).getTime()).toBe(0);
    });

    it('sigue siendo un Date de verdad', () => {
      const d = new D();
      expect(d instanceof Date).toBeTrue();
      expect(d instanceof D).toBeTrue();
      expect(new Date() instanceof D).toBeTrue();
      expect(D.UTC(2026, 0, 1)).toBe(Date.UTC(2026, 0, 1));
      expect(D.parse('2026-01-01T00:00:00Z')).toBe(Date.parse('2026-01-01T00:00:00Z'));
      expect(typeof (D as unknown as () => string)()).toBe('string');
      expect(isNaN(new D('no es fecha').getTime())).toBeTrue();
    });

    it('el desfase nuevo vale desde ese momento', () => {
      desfase = -60_000;
      expect(new D().getTime()).toBe(PC - 60_000);
      desfase = 7 * 60_000;
    });
  });

  describe('desfaseDesdeServidor', () => {
    const servidor = 'Thu, 22 Oct 2026 18:00:00 GMT';
    const t = Date.parse(servidor);

    it('PC 7 minutos adelantada → desfase negativo de 7 min (± el segundo de la cabecera)', () => {
      const pc = t + 7 * 60_000;
      const d = desfaseDesdeServidor(servidor, pc - 100, pc + 100)!;
      expect(Math.abs(d + 7 * 60_000)).toBeLessThanOrEqual(1000);
    });

    it('PC atrasada un día → desfase positivo', () => {
      const pc = t - 86_400_000;
      expect(desfaseDesdeServidor(servidor, pc, pc + 200)!).toBeGreaterThan(86_399_000);
    });

    it('sin cabecera, cabecera inválida o respuesta demasiado lenta: no hay desfase', () => {
      expect(desfaseDesdeServidor(null, 0, 10)).toBeNull();
      expect(desfaseDesdeServidor('basura', 0, 10)).toBeNull();
      expect(desfaseDesdeServidor(servidor, t, t + 6000)).toBeNull();
      expect(desfaseDesdeServidor(servidor, t, t - 1)).toBeNull();
    });
  });

  it('desfaseManual: lo que hay que sumarle a la PC para llegar a la hora escrita', () => {
    const pc = new Date(2026, 9, 22, 14, 7).getTime();
    expect(desfaseManual(new Date(2026, 9, 22, 14, 0), pc)).toBe(-7 * 60_000);
  });

  describe('revisarReloj', () => {
    const ajuste: EstadoReloj = { desfaseMs: 1000, fuente: 'internet', pcAlAjustar: 1_000_000_000_000 };

    it('sin ajuste nunca: "nunca"', () => {
      expect(revisarReloj(null, 1)).toBe('nunca');
    });
    it('la PC quedó antes del ajuste (le cambiaron la hora o se reinició el reloj)', () => {
      expect(revisarReloj(ajuste, ajuste.pcAlAjustar - 3_600_000)).toBe('cambiaron-hora');
      expect(revisarReloj(ajuste, ajuste.pcAlAjustar - 30_000)).toBeNull();   // un poco de vaivén no cuenta
    });
    it('más de 14 días sin verificar', () => {
      expect(revisarReloj(ajuste, ajuste.pcAlAjustar + 15 * 86_400_000)).toBe('sin-verificar-hace-mucho');
      expect(revisarReloj(ajuste, ajuste.pcAlAjustar + 13 * 86_400_000)).toBeNull();
    });
  });

  it('leerEstadoReloj ignora valores corruptos', () => {
    const s = (v: string | null) => ({ getItem: (k: string) => (k === CLAVE_RELOJ ? v : null) });
    expect(leerEstadoReloj(s(null))).toBeNull();
    expect(leerEstadoReloj(s('{no json'))).toBeNull();
    expect(leerEstadoReloj(s('{"desfaseMs":"x","fuente":"internet","pcAlAjustar":1}'))).toBeNull();
    expect(leerEstadoReloj(s('{"desfaseMs":5,"fuente":"manual","pcAlAjustar":1}'))?.desfaseMs).toBe(5);
  });

  it('describirDesfase', () => {
    expect(describirDesfase(-7 * 60_000)).toBe('7 min adelantada');
    expect(describirDesfase(125 * 60_000)).toBe('2 h 5 min atrasada');
    expect(describirDesfase(20_000)).toBe('al minuto');
  });
});
