// ╔══════════════════════════════════════════════════════╗
// ║  descarga.utils.spec.ts                              ║
// ║  Stenbrary — Tests del motor de comparación          ║
// ║                                                      ║
// ║  Lo que se protege aquí:                             ║
// ║  un falso "nueva" duplica datos; un falso            ║
// ║  "conflicto" ahoga al coordinador en ruido hasta que ║
// ║  deja de leer la lista y acepta todo. Las dos fallas ║
// ║  son silenciosas, así que van cubiertas.             ║
// ╚══════════════════════════════════════════════════════╝

import {
  valoresIguales,
  camposQueDifieren,
  compararStore,
  construirDiff,
  labelAlumno,
  labelRegistro,
} from './descarga.utils';
import { Alumno, Motivo, Registro } from '../models';

function alumno(id: string, over: Partial<Alumno> = {}): Alumno {
  return {
    id,
    matricula: '2299990002',
    nombre: 'Ana',
    apellidoPaterno: 'Hernández',
    apellidoMaterno: 'Villanueva',
    carrera: 'ISC',
    grado: 5,
    grupo: 'A',
    turno: 'Matutino',
    activo: true,
    fechaRegistro: new Date(2026, 0, 15),
    datosExtra: {},
    ...over,
  } as Alumno;
}

function registro(id: string, over: Partial<Registro> = {}): Registro {
  return {
    id,
    alumnoId: 'alumno-1',
    matricula: '2299990002',
    nombreCompleto: 'Ana Hernández',
    carrera: 'ISC',
    motivoId: 'motivo-1',
    motivoNombre: 'Estudiar',
    fechaHora: new Date(2026, 1, 10, 9, 30),
    sincronizado: false,
    ...over,
  } as Registro;
}

function motivo(id: string, over: Partial<Motivo> = {}): Motivo {
  return { id, nombre: 'Estudiar', icono: 'menu_book', orden: 1, activo: true, ...over };
}

describe('descarga.utils — valoresIguales', () => {
  it('trata null y undefined como equivalentes', () => {
    // Postgres devuelve null donde el modelo local no tiene la propiedad.
    expect(valoresIguales(null, undefined)).toBe(true);
    expect(valoresIguales(undefined, null)).toBe(true);
  });

  it('compara fechas por instante, no por identidad', () => {
    // La fecha de la nube se reconstruye desde un string ISO; la local se
    // creó en el navegador. Con === nunca serían iguales y TODA la tabla
    // saldría marcada como conflicto.
    const a = new Date(2026, 1, 10, 9, 30);
    const b = new Date(a.getTime());
    expect(valoresIguales(a, b)).toBe(true);
    expect(valoresIguales(a, a.toISOString())).toBe(true);
    expect(valoresIguales(a, new Date(a.getTime() + 1))).toBe(false);
  });

  it('no considera iguales dos fechas inválidas', () => {
    expect(valoresIguales(new Date('x'), new Date('y'))).toBe(false);
  });

  it('compara arrays por contenido y orden', () => {
    expect(valoresIguales(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(valoresIguales(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(valoresIguales(['a'], ['a', 'b'])).toBe(false);
  });

  it('compara objetos en profundidad', () => {
    expect(valoresIguales({ x: { y: 1 } }, { x: { y: 1 } })).toBe(true);
    expect(valoresIguales({ x: { y: 1 } }, { x: { y: 2 } })).toBe(false);
    expect(valoresIguales({ x: 1 }, { x: 1, z: 2 })).toBe(false);
  });

  it('distingue 0, false y cadena vacía de null', () => {
    expect(valoresIguales(0, null)).toBe(false);
    expect(valoresIguales(false, null)).toBe(false);
    expect(valoresIguales('', null)).toBe(false);
  });
});

describe('descarga.utils — camposQueDifieren', () => {
  it('ignora los metadatos de sync', () => {
    // `sincronizado` es true en TODO lo que viene de la nube por
    // construcción. Marcarlo haría que cada fila pareciera un conflicto.
    const local = registro('r1', { sincronizado: false, _syncStatus: 'pending' } as any);
    const remoto = registro('r1', { sincronizado: true, _syncStatus: 'synced' } as any);
    expect(camposQueDifieren(local, remoto)).toEqual([]);
  });

  it('reporta los campos que sí cambiaron, ordenados', () => {
    const local = alumno('a1', { carrera: 'ISC', grado: 5 });
    const remoto = alumno('a1', { carrera: 'Derecho', grado: 7 });
    expect(camposQueDifieren(local, remoto)).toEqual(['carrera', 'grado']);
  });

  it('detecta un campo presente solo en un lado', () => {
    const local = registro('r1');
    const remoto = registro('r1', { duracionMinutos: 45 });
    expect(camposQueDifieren(local, remoto)).toEqual(['duracionMinutos']);
  });

  it('respeta camposIgnorados', () => {
    const local = alumno('a1', { carrera: 'ISC' });
    const remoto = alumno('a1', { carrera: 'Derecho' });
    expect(camposQueDifieren(local, remoto, ['carrera'])).toEqual([]);
  });
});

describe('descarga.utils — compararStore', () => {
  it('marca como nueva lo que solo está en la nube', () => {
    const diff = compararStore<Motivo>(
      [motivo('m1')],
      [motivo('m1'), motivo('m2', { nombre: 'Investigación' })],
      m => m.id, m => m.nombre,
    );
    expect(diff.nuevas.length).toBe(1);
    expect(diff.nuevas[0].id).toBe('m2');
    expect(diff.conflictos).toEqual([]);
  });

  it('las filas idénticas no aparecen en ninguna lista', () => {
    // Si aparecieran, el coordinador tendría que revisar miles de filas
    // sobre las que no hay nada que decidir.
    const diff = compararStore<Motivo>(
      [motivo('m1')], [motivo('m1')], m => m.id, m => m.nombre,
    );
    expect(diff.nuevas).toEqual([]);
    expect(diff.conflictos).toEqual([]);
  });

  it('marca conflicto cuando el mismo id difiere, con los campos', () => {
    const diff = compararStore<Motivo>(
      [motivo('m1', { nombre: 'Estudiar' })],
      [motivo('m1', { nombre: 'Estudio individual' })],
      m => m.id, m => m.nombre,
    );
    expect(diff.nuevas).toEqual([]);
    expect(diff.conflictos.length).toBe(1);
    expect(diff.conflictos[0].camposDistintos).toEqual(['nombre']);
    expect(diff.conflictos[0].local).toBeDefined();
  });

  it('ignora filas remotas sin id', () => {
    // Sin clave estable no hay forma de saber si ya existen: traerlas
    // duplicaría en cada descarga.
    const diff = compararStore<Motivo>(
      [], [motivo(undefined as any), motivo('m2')], m => m.id, m => m.nombre,
    );
    expect(diff.nuevas.length).toBe(1);
    expect(diff.nuevas[0].id).toBe('m2');
  });

  it('lo que solo existe localmente no aparece', () => {
    // Eso es asunto de la bandeja de SUBIDA, no de la de descarga.
    const diff = compararStore<Motivo>(
      [motivo('m1'), motivo('solo-local')], [motivo('m1')], m => m.id, m => m.nombre,
    );
    expect(diff.nuevas).toEqual([]);
    expect(diff.conflictos).toEqual([]);
  });
});

describe('descarga.utils — construirDiff', () => {
  const vacio = { motivos: [], alumnos: [], registros: [] };

  it('base local vacía: todo lo remoto es nuevo y no hay conflictos', () => {
    // Es el caso "instalé la app en otra laptop y quiero mis datos".
    const diff = construirDiff(vacio, {
      motivos: [motivo('m1')],
      alumnos: [alumno('a1')],
      registros: [registro('r1'), registro('r2')],
    });
    expect(diff.totalNuevas).toBe(4);
    expect(diff.totalConflictos).toBe(0);
  });

  it('copias idénticas producen un diff completamente vacío', () => {
    const datos = {
      motivos: [motivo('m1')],
      alumnos: [alumno('a1')],
      registros: [registro('r1')],
    };
    // Copia profunda: mismos valores, distintas instancias — como pasa de
    // verdad al traer las filas por la red.
    const copia = {
      motivos: [motivo('m1')],
      alumnos: [alumno('a1')],
      registros: [registro('r1')],
    };
    const diff = construirDiff(datos, copia);
    expect(diff.totalNuevas).toBe(0);
    expect(diff.totalConflictos).toBe(0);
  });

  it('no marca conflicto por datosExtra, que la nube no guarda', () => {
    const local = {
      ...vacio,
      alumnos: [alumno('a1', { datosExtra: { beca: 'sí', tutor: 'Pérez' } })],
    };
    const remoto = { ...vacio, alumnos: [alumno('a1', { datosExtra: {} })] };
    expect(construirDiff(local, remoto).totalConflictos).toBe(0);
  });

  it('separa nuevas de conflictos en la misma corrida', () => {
    const local = {
      ...vacio,
      alumnos: [alumno('a1', { carrera: 'ISC' })],
    };
    const remoto = {
      ...vacio,
      alumnos: [alumno('a1', { carrera: 'Derecho' }), alumno('a2')],
    };
    const diff = construirDiff(local, remoto);
    expect(diff.totalNuevas).toBe(1);
    expect(diff.totalConflictos).toBe(1);
    expect(diff.alumnos.nuevas[0].id).toBe('a2');
    expect(diff.alumnos.conflictos[0].id).toBe('a1');
  });

  it('un registro que solo difiere en `sincronizado` no es conflicto', () => {
    // El caso más común: la fila ya se subió, volvió igual, y el único
    // cambio es la bandera local de sync.
    const local = { ...vacio, registros: [registro('r1', { sincronizado: false })] };
    const remoto = { ...vacio, registros: [registro('r1', { sincronizado: true })] };
    expect(construirDiff(local, remoto).totalConflictos).toBe(0);
  });
});

describe('descarga.utils — etiquetas', () => {
  it('el alumno se identifica por matrícula y nombre', () => {
    expect(labelAlumno(alumno('a1'))).toContain('2299990002');
    expect(labelAlumno(alumno('a1'))).toContain('Ana');
  });

  it('el registro no truena con una fecha inválida', () => {
    const roto = registro('r1', { fechaHora: 'no-es-fecha' as any });
    expect(labelRegistro(roto)).toContain('fecha inválida');
  });
});
