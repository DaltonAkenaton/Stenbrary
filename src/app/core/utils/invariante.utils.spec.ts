// ╔══════════════════════════════════════════════════════╗
// ║  invariante.utils.spec.ts                            ║
// ║  Stenbrary — Tests de invariantes y bitácora         ║
// ║                                                      ║
// ║  Lo crítico que se protege:                          ║
// ║  1. Que NUNCA lancen. Un invariante que revienta      ║
// ║     convierte un dato raro en una pantalla rota       ║
// ║     frente a la fila de alumnos — peor que el bug.   ║
// ║  2. Que la anotación sobreviva a un localStorage      ║
// ║     lleno o a un contexto no serializable.           ║
// ╚══════════════════════════════════════════════════════╝

import {
  invariante,
  esperado,
  coincide,
  conRegistro,
  reportarAnomalia,
  registrarDiagnostico,
  _resetDiagnosticoParaTests,
} from './invariante.utils';
import { DiagnosticoService } from '../services/diagnostico.service';

describe('invariante.utils', () => {
  let servicio: DiagnosticoService;

  beforeEach(() => {
    localStorage.removeItem('stenbrary-diagnostico');
    servicio = new DiagnosticoService();
    registrarDiagnostico(servicio);
  });

  afterEach(() => {
    _resetDiagnosticoParaTests(null);
    localStorage.removeItem('stenbrary-diagnostico');
  });

  // ═══════════════════════════════════════════════════════
  describe('invariante()', () => {
    it('no anota nada cuando se cumple', () => {
      expect(invariante(true, 'scanner', 'todo bien')).toBe(true);
      expect(servicio.incidencias().length).toBe(0);
    });

    it('anota y devuelve false cuando no se cumple', () => {
      expect(invariante(false, 'scanner', 'faltó el alumno')).toBe(false);
      const [inc] = servicio.incidencias();
      expect(inc.area).toBe('scanner');
      expect(inc.mensaje).toBe('faltó el alumno');
      expect(inc.nivel).toBe('anomalia');
    });

    it('NUNCA lanza, ni con contexto imposible de serializar', () => {
      // Un objeto circular reventaría un JSON.stringify ingenuo. Anotar no
      // puede tumbar la operación que se estaba haciendo.
      const circular: Record<string, unknown> = { nombre: 'x' };
      circular['self'] = circular;
      expect(() => invariante(false, 'scanner', 'raro', circular)).not.toThrow();
      expect(servicio.incidencias().length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  describe('esperado()', () => {
    it('deja pasar el valor cuando existe', () => {
      expect(esperado({ id: 1 }, 'alumnos', 'sin alumno')).toEqual({ id: 1 });
      expect(servicio.incidencias().length).toBe(0);
    });

    it('anota y devuelve null con null o undefined', () => {
      expect(esperado(null, 'alumnos', 'sin alumno')).toBeNull();
      expect(esperado(undefined, 'alumnos', 'sin alumno 2')).toBeNull();
      expect(servicio.incidencias().length).toBe(2);
    });

    it('NO trata 0 ni cadena vacía como ausentes', () => {
      // Confundirlos haría que un conteo legítimo de 0 se reportara como
      // fallo, llenando la bitácora de ruido.
      expect(esperado(0, 'x', 'cero')).toBe(0);
      expect(esperado('', 'x', 'vacio')).toBe('');
      expect(servicio.incidencias().length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  describe('coincide()', () => {
    it('pasa en silencio cuando los números cuadran', () => {
      expect(coincide(54, 54, 'limpieza-registros', 'borrado parcial')).toBe(true);
      expect(servicio.incidencias().length).toBe(0);
    });

    it('anota el obtenido y el esperado cuando no cuadran', () => {
      expect(coincide(51, 54, 'limpieza-registros', 'borrado parcial')).toBe(false);
      const [inc] = servicio.incidencias();
      expect(inc.contexto?.['obtenido']).toBe(51);
      expect(inc.contexto?.['esperado']).toBe(54);
    });
  });

  // ═══════════════════════════════════════════════════════
  describe('conRegistro()', () => {
    it('devuelve el valor cuando la operación funciona', async () => {
      const r = await conRegistro('x', 'falló', async () => 42, 0);
      expect(r).toBe(42);
      expect(servicio.incidencias().length).toBe(0);
    });

    it('anota y devuelve el respaldo cuando falla, sin propagar', async () => {
      // Reemplaza al `catch {}` vacío, que es donde los defectos se mueren
      // en silencio.
      const r = await conRegistro('descarga', 'no se pudo leer', async () => {
        throw new Error('red caída');
      }, -1);
      expect(r).toBe(-1);
      const [inc] = servicio.incidencias();
      expect(inc.nivel).toBe('error');
      expect(inc.contexto?.['detalle']).toBe('red caída');
    });
  });

  // ═══════════════════════════════════════════════════════
  describe('sin servicio registrado', () => {
    it('los helpers siguen funcionando y no lanzan', () => {
      // Pasa en el arranque, antes de que AppComponent registre el servicio.
      // Perder una anotación temprana es aceptable; romper el arranque no.
      _resetDiagnosticoParaTests(null);
      expect(() => reportarAnomalia('x', 'sin servicio')).not.toThrow();
      expect(invariante(false, 'x', 'sin servicio')).toBe(false);
      expect(esperado(null, 'x', 'sin servicio')).toBeNull();
    });
  });
});

describe('DiagnosticoService', () => {
  let servicio: DiagnosticoService;

  beforeEach(() => {
    localStorage.removeItem('stenbrary-diagnostico');
    servicio = new DiagnosticoService();
  });

  afterEach(() => localStorage.removeItem('stenbrary-diagnostico'));

  it('agrupa repeticiones en vez de acumular líneas', () => {
    // Un bug que ocurre 400 veces debe leerse como "1 problema, 400 veces".
    // Si no, entierra a los demás y la lista se vuelve inservible.
    for (let i = 0; i < 5; i++) servicio.anomalia('scanner', 'lectura vacía');
    expect(servicio.incidencias().length).toBe(1);
    expect(servicio.incidencias()[0].veces).toBe(5);
    expect(servicio.total()).toBe(5);
  });

  it('separa incidencias distintas de la misma área', () => {
    servicio.anomalia('scanner', 'lectura vacía');
    servicio.anomalia('scanner', 'matrícula inválida');
    expect(servicio.incidencias().length).toBe(2);
  });

  it('sobrevive al reinicio de la app', () => {
    servicio.anomalia('descarga', 'algo raro');
    const otro = new DiagnosticoService();
    expect(otro.incidencias().length).toBe(1);
    expect(otro.incidencias()[0].mensaje).toBe('algo raro');
  });

  it('recorta un contexto enorme en vez de reventar la cuota', () => {
    servicio.anomalia('x', 'grande', { basura: 'a'.repeat(5000) });
    const [inc] = servicio.incidencias();
    expect(inc.contexto?.['_recortado']).toBe(true);
  });

  it('el reporte exportado es JSON válido con lo necesario para reproducir', () => {
    servicio.anomalia('scanner', 'lectura vacía', { intento: 3 });
    const reporte = JSON.parse(servicio.construirReporte());
    expect(reporte.app).toBe('Stenbrary');
    expect(reporte.incidencias.length).toBe(1);
    expect(reporte.incidencias[0].contexto.intento).toBe(3);
    expect(reporte.userAgent).toBeDefined();
  });

  it('limpiar deja la bitácora vacía y borra el respaldo en disco', () => {
    servicio.anomalia('x', 'algo');
    servicio.limpiar();
    expect(servicio.incidencias()).toEqual([]);
    expect(new DiagnosticoService().incidencias()).toEqual([]);
  });

  it('tolera datos corruptos en localStorage', () => {
    // Una versión vieja, otra pestaña, o el usuario editando a mano.
    localStorage.setItem('stenbrary-diagnostico', '{no es json');
    expect(() => new DiagnosticoService()).not.toThrow();
    expect(new DiagnosticoService().incidencias()).toEqual([]);
  });
});
