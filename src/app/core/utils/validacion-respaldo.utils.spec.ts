// ╔══════════════════════════════════════════════════════╗
// ║  validacion-respaldo.utils.spec.ts — v3.62.0         ║
// ║  Respaldos de todas las versiones 3.x pasan; los     ║
// ║  malformados se rechazan completos con el motivo.    ║
// ╚══════════════════════════════════════════════════════╝

import { validarRespaldo } from './validacion-respaldo.utils';

const alumno = (id: string, matricula: string) => ({
  id, matricula, nombre: 'Ana', apellidoPaterno: 'Ruiz', apellidoMaterno: '', carrera: 'Derecho',
  grado: 3, grupo: 'A', turno: 'Matutino', activo: true, fechaRegistro: '2026-09-01T15:00:00.000Z',
});
const registro = (id: string, extra: Record<string, unknown> = {}) => ({
  id, alumnoId: 'a1', matricula: '2299990001', nombreCompleto: 'Ana Ruiz', carrera: 'Derecho',
  motivoId: 'm1', motivoNombre: 'Estudiar', motivoIds: ['m1'], motivoNombres: ['Estudiar'],
  fechaHora: '2026-09-02T16:00:00.000Z', sincronizado: false, ...extra,
});
const valido = () => ({
  meta: { version: '3.4', fecha: '2026-10-01T12:00:00.000Z', app: 'Stenbrary', totalAlumnos: 1, totalRegistros: 1, totalMotivos: 1, equipo: 'Puerta' },
  alumnos: [alumno('a1', '2299990001')],
  registros: [registro('r1', { horaSalida: '2026-09-02T17:30:00.000Z', duracionMinutos: 90 })],
  motivos: [{ id: 'm1', nombre: 'Estudiar', icono: 'menu_book', orden: 1, activo: true }],
  bitacora: [{ id: 'e1', fechaHora: '2026-10-01T12:00:00.000Z', accion: 'respaldo-exportado', detalle: 'x', equipo: 'Puerta' }],
  catalogoEscolar: { carreras: [], grupos: [], gradoMin: 1, gradoMax: 12 },
});

function errores(datos: unknown): string[] {
  const r = validarRespaldo(datos);
  return r.valido ? [] : r.errores;
}

describe('validarRespaldo', () => {
  it('acepta un respaldo actual completo', () => {
    expect(validarRespaldo(valido()).valido).toBeTrue();
  });

  it('acepta respaldos viejos: sin bitácora, catálogo, equipo ni motivos múltiples; motivo sin id', () => {
    const viejo: Record<string, unknown> = valido();
    delete viejo['bitacora'];
    delete viejo['catalogoEscolar'];
    delete (viejo['meta'] as Record<string, unknown>)['equipo'];
    viejo['registros'] = [{ ...registro('r1'), motivoIds: undefined, motivoNombres: undefined }];
    viejo['motivos'] = [{ nombre: 'Estudiar', icono: 'menu_book', orden: 1, activo: true }];
    expect(errores(viejo)).toEqual([]);
  });

  it('acepta listas vacías (instalación recién hecha)', () => {
    expect(errores({ ...valido(), alumnos: [], registros: [], motivos: [], bitacora: [] })).toEqual([]);
  });

  it('acepta el grado como texto numérico y fechas como Date', () => {
    const d = valido();
    (d.alumnos[0] as Record<string, unknown>)['grado'] = '5';
    (d.registros[0] as Record<string, unknown>)['fechaHora'] = new Date(2026, 8, 2);
    expect(errores(d)).toEqual([]);
  });

  it('rechaza lo que no es un objeto de respaldo', () => {
    expect(errores(null)[0]).toContain('no contiene un respaldo');
    expect(errores([valido()])[0]).toContain('no contiene un respaldo');
    expect(errores('texto')[0]).toContain('no contiene un respaldo');
  });

  it('rechaza el respaldo de otro programa y uno de un formato más nuevo', () => {
    expect(errores({ ...valido(), meta: { ...valido().meta, app: 'Otro' } })[0]).toContain('Programa desconocido');
    expect(errores({ ...valido(), meta: { ...valido().meta, version: '4.0' } })[0]).toContain('formato más nuevo');
    expect(errores({ ...valido(), meta: { ...valido().meta, fecha: 'ayer' } })[0]).toContain('fecha del respaldo');
  });

  it('rechaza secciones desconocidas y listas que no son listas', () => {
    expect(errores({ ...valido(), usuarios: [] })[0]).toContain('secciones desconocidas: "usuarios"');
    expect(errores({ ...valido(), alumnos: {} })[0]).toContain('"alumnos"');
    expect(errores({ ...valido(), registros: [1, 2] })[0]).toContain('"registros": el elemento 1');
  });

  it('rechaza un alumno sin id, sin matrícula o con tipos equivocados', () => {
    const e = errores({ ...valido(), alumnos: [{ ...alumno('', ''), grado: 'tercero', activo: 'sí' }] });
    expect(e).toContain('Alumno 1: falta el id.');
    expect(e).toContain('Alumno 1: falta la matrícula o no es válida.');
    expect(e).toContain('Alumno 1: "grado" debe ser un número.');
    expect(e).toContain('Alumno 1: "activo" debe ser sí/no.');
  });

  it('rechaza ids repetidos y dos alumnos con la misma matrícula', () => {
    expect(errores({ ...valido(), alumnos: [alumno('a1', '1'), alumno('a1', '2')] }))
      .toContain('Alumnos: el id "a1" está repetido.');
    expect(errores({ ...valido(), alumnos: [alumno('a1', '2299990001'), alumno('a2', '2299990001')] }))
      .toContain('Alumno 2: la matrícula 2299990001 pertenece a otro alumno del archivo.');
    expect(errores({ ...valido(), registros: [registro('r1'), registro('r1')] }))
      .toContain('Visitas: el id "r1" está repetido.');
  });

  it('rechaza visitas sin fecha válida, con motivos mal formados o duración negativa', () => {
    const e = errores({
      ...valido(),
      registros: [
        registro('r1', { fechaHora: 'no es fecha' }),
        registro('r2', { motivoIds: 'm1' }),
        registro('r3', { duracionMinutos: -5, horaSalida: 'x' }),
      ],
    });
    expect(e).toContain('Visita 1: la fecha de entrada falta o no es válida.');
    expect(e).toContain('Visita 2: "motivoIds" debe ser una lista de textos.');
    expect(e).toContain('Visita 3: "duracionMinutos" debe ser un número de minutos.');
    expect(e).toContain('Visita 3: "horaSalida" debe ser una fecha.');
  });

  it('rechaza actividades sin nombre y eventos de bitácora incompletos', () => {
    expect(errores({ ...valido(), motivos: [{ id: 'm1', nombre: ' ' }] })).toContain('Actividad 1: falta el nombre.');
    expect(errores({ ...valido(), bitacora: [{ id: 'e1' }] }))
      .toContain('Evento de bitácora 1: le falta el id, la acción o la fecha.');
  });

  it('lista hasta 10 errores y cuenta el resto', () => {
    const malos = Array.from({ length: 15 }, (_, i) => registro(`r${i}`, { fechaHora: 'x' }));
    const e = errores({ ...valido(), registros: malos });
    expect(e.length).toBe(11);
    expect(e[10]).toBe('…y 5 errores más.');
  });
});
