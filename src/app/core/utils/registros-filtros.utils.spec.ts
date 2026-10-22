import { Alumno, Registro } from '../models';
import {
  coincideBusqueda, coincideDuracion, coincideSalida, coincideTipo,
  ordenarRegistros, sinAcentos, sugerirAlumnos,
} from './registros-filtros.utils';

function reg(p: Partial<Registro>): Registro {
  return {
    id: p.id ?? 'r', alumnoId: 'a', matricula: '2300100001', nombreCompleto: 'Ana López',
    carrera: 'TI', motivoId: 'm', motivoNombre: 'Estudiar', fechaHora: new Date('2026-09-01T10:00:00'),
    sincronizado: false, ...p,
  };
}
function alumno(matricula: string, nombre: string, ap: string, am = ''): Alumno {
  return { matricula, nombre, apellidoPaterno: ap, apellidoMaterno: am, carrera: 'TI', grado: 1, grupo: 'A', turno: 'Matutino', activo: true, fechaRegistro: new Date() };
}

describe('registros-filtros.utils', () => {
  it('sinAcentos', () => {
    expect(sinAcentos('  Martínez PEÑA ')).toBe('martinez pena');
  });

  it('tipo: alumno o visitante', () => {
    const v = reg({ matricula: 'INVITADO' });
    expect(coincideTipo(v, 'visitante')).toBeTrue();
    expect(coincideTipo(v, 'alumno')).toBeFalse();
    expect(coincideTipo(reg({}), 'alumno')).toBeTrue();
    expect(coincideTipo(v, '')).toBeTrue();
  });

  it('salida: real, puesta por el sistema o sin salida', () => {
    const real = reg({ horaSalida: new Date(), duracionMinutos: 30 });
    const sistema = reg({ horaSalida: new Date(), duracionMinutos: 30, salidaEstimada: true });
    const pendiente = reg({ horaSalida: new Date(), cierreAutomatico: true });
    const sin = reg({});
    expect([real, sistema, pendiente, sin].map(r => coincideSalida(r, 'real'))).toEqual([true, false, false, false]);
    expect([real, sistema, pendiente, sin].map(r => coincideSalida(r, 'sistema'))).toEqual([false, true, true, false]);
    expect([real, sistema, pendiente, sin].map(r => coincideSalida(r, 'sin'))).toEqual([false, false, false, true]);
  });

  it('duración: límites inclusivos; sin duración no entra si hay límite', () => {
    expect(coincideDuracion(reg({ duracionMinutos: 30 }), 30, 30)).toBeTrue();
    expect(coincideDuracion(reg({ duracionMinutos: 0 }), 0, null)).toBeTrue();
    expect(coincideDuracion(reg({ duracionMinutos: 29 }), 30, null)).toBeFalse();
    expect(coincideDuracion(reg({ duracionMinutos: 61 }), null, 60)).toBeFalse();
    expect(coincideDuracion(reg({}), null, 60)).toBeFalse();
    expect(coincideDuracion(reg({}), null, null)).toBeTrue();
  });

  it('búsqueda sin acentos por nombre o matrícula', () => {
    const r = reg({ nombreCompleto: 'José Martínez' });
    expect(coincideBusqueda(r, 'martinez')).toBeTrue();
    expect(coincideBusqueda(r, '23001')).toBeTrue();
    expect(coincideBusqueda(r, 'garza')).toBeFalse();
  });

  it('sugerencias: cada palabra en cualquier orden, sin acentos; primero los que empiezan igual', () => {
    const lista = [
      alumno('1', 'Ana', 'García', 'López'),
      alumno('2', 'Mariana', 'Pérez'),
      alumno('3', 'Diana', 'Garza'),
    ];
    expect(sugerirAlumnos(lista, 'ana').map(s => s.nombre)).toEqual(['Ana García López', 'Diana Garza', 'Mariana Pérez']);
    expect(sugerirAlumnos(lista, 'lopez ana').map(s => s.alumno.matricula)).toEqual(['1']);
    expect(sugerirAlumnos(lista, 'perez').map(s => s.nombre)).toEqual(['Mariana Pérez']);
    expect(sugerirAlumnos(lista, '  ')).toEqual([]);
    expect(sugerirAlumnos(lista, 'a', 2).length).toBe(2);
  });

  it('orden por duración: sin duración al final en ambos sentidos; empates por fecha', () => {
    const ts = (r: Registro) => new Date(r.fechaHora).getTime();
    const a = reg({ id: 'a', duracionMinutos: 30, fechaHora: new Date('2026-09-01T10:00:00') });
    const b = reg({ id: 'b', duracionMinutos: 90 });
    const c = reg({ id: 'c' });
    const d = reg({ id: 'd', duracionMinutos: 30, fechaHora: new Date('2026-09-02T10:00:00') });
    expect(ordenarRegistros([c, b, a, d], { campo: 'duracion', dir: 'asc' }, ts).map(r => r.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(ordenarRegistros([c, b, a, d], { campo: 'duracion', dir: 'desc' }, ts).map(r => r.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('orden por nombre y fecha, sin tocar la lista original', () => {
    const ts = (r: Registro) => new Date(r.fechaHora).getTime();
    const lista = [
      reg({ id: '1', nombreCompleto: 'Zoe', fechaHora: new Date('2026-09-03T10:00:00') }),
      reg({ id: '2', nombreCompleto: 'Álvaro', fechaHora: new Date('2026-09-01T10:00:00') }),
    ];
    expect(ordenarRegistros(lista, { campo: 'nombre', dir: 'asc' }, ts).map(r => r.id)).toEqual(['2', '1']);
    expect(ordenarRegistros(lista, { campo: 'fecha', dir: 'asc' }, ts).map(r => r.id)).toEqual(['2', '1']);
    expect(lista.map(r => r.id)).toEqual(['1', '2']);
  });
});
