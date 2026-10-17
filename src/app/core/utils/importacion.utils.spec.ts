// ╔══════════════════════════════════════════════════════╗
// ║  importacion.utils.spec.ts                           ║
// ║  Los casos que fallaron con archivos tipo padrón     ║
// ║  real (2026-10-17). Cada test es uno de esos bugs.   ║
// ╚══════════════════════════════════════════════════════╝

import { camposFaltantes, detectarMapeo, normalizarEncabezado, parsearGrado, procesarFilas } from './importacion.utils';

const CARRERAS = ['Licenciatura en Derecho', 'Contador Público', 'Licenciatura en Enfermería'];
const TURNOS = ['Matutino', 'Vespertino', 'Mixto'];
const ENCABEZADOS = ['Matrícula', 'Nombre', 'Apellido Paterno', 'Apellido Materno', 'Carrera', 'Semestre', 'Grupo', 'Turno'];

function fila(valores: unknown[], encabezados = ENCABEZADOS): Record<string, unknown> {
  return Object.fromEntries(encabezados.map((h, i) => [h, valores[i] ?? '']));
}
function procesar(filas: unknown[][], existentes: string[] = [], encabezados = ENCABEZADOS) {
  return procesarFilas(filas.map(v => fila(v, encabezados)), detectarMapeo(encabezados), new Set(existentes), CARRERAS, TURNOS);
}

describe('importacion.utils', () => {
  describe('detectarMapeo', () => {
    it('reconoce los encabezados normales', () => {
      const m = detectarMapeo(ENCABEZADOS);
      expect(m.matricula).toBe('Matrícula');
      expect(m.apellidoPaterno).toBe('Apellido Paterno');
      expect(m.grado).toBe('Semestre');
    });

    it('"Cuenta" es la matrícula y NUNCA toma "Primer apellido" (antes: matrícula = apellido)', () => {
      const m = detectarMapeo(['Cuenta', 'Nombre(s)', 'Primer apellido', 'Segundo apellido', 'Programa educativo', 'Grado', 'Grupo', 'Turno']);
      expect(m.matricula).toBe('Cuenta');
      expect(m.nombre).toBe('Nombre(s)');
      expect(m.apellidoPaterno).toBe('Primer apellido');
      expect(m.apellidoMaterno).toBe('Segundo apellido');
      expect(m.carrera).toBe('Programa educativo');
    });

    it('lo que no reconoce queda vacío en vez de inventar una columna', () => {
      const m = detectarMapeo(['Folio', 'Nombre', 'Apellido Paterno', 'Carrera', 'Grado', 'Grupo', 'Turno']);
      expect(m.matricula).toBeNull();
      expect(camposFaltantes(m).map(c => c.campo)).toEqual(['matricula']);
    });

    it('el materno es opcional: no falta aunque no haya columna', () => {
      const m = detectarMapeo(['Matrícula', 'Nombre', 'Apellido Paterno', 'Carrera', 'Grado', 'Grupo', 'Turno']);
      expect(camposFaltantes(m)).toEqual([]);
    });

    it('normaliza encabezados con signos y acentos', () => {
      expect(normalizarEncabezado('No. de Cuenta')).toBe('no de cuenta');
      expect(normalizarEncabezado('APELLIDO_PATERNO')).toBe('apellido paterno');
    });
  });

  describe('procesarFilas', () => {
    it('acepta un alumno sin apellido materno (opcional, como en la puerta)', () => {
      const [f] = procesar([['2300100003', 'María José', 'De la Garza', '', 'Licenciatura en Enfermería', 1, 'C', 'Vespertino']]);
      expect(f.valido).toBeTrue();
      expect(f.apellidoMaterno).toBe('');
    });

    it('limpia y capitaliza nombres en MAYÚSCULAS o minúsculas', () => {
      const [a, b] = procesar([
        ['2300100002', 'JUAN CARLOS', 'PÉREZ', 'NÚÑEZ', 'Contador Público', 5, 'B', 'V'],
        ['2300100005', '  pedro   ', ' ramírez ', 'soto', 'Contador Público', 2, 'A', 'matutino'],
      ]);
      expect([a.nombre, a.apellidoPaterno, a.apellidoMaterno]).toEqual(['Juan Carlos', 'Pérez', 'Núñez']);
      expect([b.nombre, b.apellidoPaterno]).toEqual(['Pedro', 'Ramírez']);
      expect(a.turno).toBe('Vespertino');
    });

    it('quita la "a" de la matrícula, como la busca el escáner', () => {
      const [f] = procesar([['a2300100004', 'Luis', 'Treviño', 'Ruiz', 'Contador Público', 7, 'D', 'Mixto']]);
      expect(f.matricula).toBe('2300100004');
      expect(f.valido).toBeTrue();
    });

    it('acepta la matrícula como número de Excel', () => {
      const [f] = procesar([[2300100010, 'Ana', 'López', 'Ríos', 'Contador Público', 3, 'A', 'Matutino']]);
      expect(f.matricula).toBe('2300100010');
    });

    it('rechaza matrículas cortas con la misma regla del escáner (7 dígitos)', () => {
      const [f] = procesar([['12345', 'Ana', 'López', 'Ríos', 'Contador Público', 3, 'A', 'Matutino']]);
      expect(f.valido).toBeFalse();
    });

    it('detecta la matrícula repetida dentro del mismo archivo en la vista previa', () => {
      const r = procesar([
        ['2300100001', 'Ana', 'García', 'López', 'Contador Público', 3, 'A', 'Matutino'],
        ['2300100001', 'Otro', 'Mismo', 'Num', 'Contador Público', 4, 'A', 'Matutino'],
      ]);
      expect(r[0].valido).toBeTrue();
      expect(r[1].valido).toBeFalse();
      expect(r[1].errores.join()).toContain('fila 2');
    });

    it('marca las matrículas que ya existen en el sistema', () => {
      const [f] = procesar([['2300100001', 'Ana', 'García', 'López', 'Contador Público', 3, 'A', 'Matutino']], ['2300100001']);
      expect(f.valido).toBeFalse();
    });

    it('empareja la carrera con el catálogo sin importar mayúsculas ni acentos', () => {
      const [f] = procesar([['2300100005', 'Pedro', 'Ramírez', 'Soto', 'licenciatura en enfermeria', 2, 'A', 'Matutino']]);
      expect(f.carrera).toBe('Licenciatura en Enfermería');
      expect(f.avisos).toEqual([]);
    });

    it('una carrera fuera del catálogo se importa con aviso, no se rechaza', () => {
      const [f] = procesar([['2300100007', 'Carlos', 'Mendoza', 'Ríos', 'Lic. en TI e Inteligencia Artificial', 9, 'G', 'Matutino']]);
      expect(f.valido).toBeTrue();
      expect(f.avisos.length).toBe(1);
    });

    it('entiende grados como "2°" o "3er semestre"', () => {
      expect(parsearGrado('2°')).toBe(2);
      expect(parsearGrado('3er semestre')).toBe(3);
      expect(parsearGrado('')).toBe(0);
    });
  });
});
