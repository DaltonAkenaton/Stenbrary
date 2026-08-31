// ╔══════════════════════════════════════════════════════╗
// ║  integridad.utils.spec.ts                            ║
// ║  Stenbrary — Tests de la revisión de datos           ║
// ║                                                      ║
// ║  Las dos fallas posibles, y las dos importan:         ║
// ║  un falso negativo deja pasar datos que ensucian las  ║
// ║  estadísticas; un falso positivo llena la lista de    ║
// ║  ruido hasta que el coordinador deja de revisarla.    ║
// ║                                                      ║
// ║  `ahora` se fija en cada caso: una revisión atada al  ║
// ║  reloj real produce tests que fallan solos con el     ║
// ║  paso del tiempo.                                     ║
// ╚══════════════════════════════════════════════════════╝

import { revisarIntegridad, ESTANCIA_MAXIMA_MIN } from './integridad.utils';
import { Alumno, Registro } from '../models';

const AHORA = new Date(2026, 7, 31, 12, 0, 0);

function alumno(matricula: string, id = `id-${matricula}`): Alumno {
  return {
    id,
    matricula,
    nombre: 'Ana',
    apellidoPaterno: 'Pérez',
    apellidoMaterno: 'López',
    carrera: 'ISC',
    grado: 5,
    grupo: 'A',
    turno: 'Matutino',
    activo: true,
    fechaRegistro: new Date(2026, 0, 1),
    datosExtra: {},
  } as Alumno;
}

function registro(id: string, over: Partial<Registro> = {}): Registro {
  return {
    id,
    alumnoId: 'id-2299990002',
    matricula: '2299990002',
    nombreCompleto: 'Ana Pérez',
    carrera: 'ISC',
    motivoId: 'm1',
    motivoNombre: 'Estudiar',
    fechaHora: new Date(2026, 7, 30, 10, 0),
    sincronizado: false,
    ...over,
  } as Registro;
}

const ALUMNOS = [alumno('2299990002')];

function tipos(problemas: { tipo: string }[]): string[] {
  return problemas.map(p => p.tipo).sort();
}

describe('revisarIntegridad', () => {
  it('datos sanos no producen ningún hallazgo', () => {
    const registros = [
      registro('r1'),
      registro('r2', {
        fechaHora: new Date(2026, 7, 30, 10, 0),
        horaSalida: new Date(2026, 7, 30, 12, 0),
        duracionMinutos: 120,
      }),
    ];
    expect(revisarIntegridad(ALUMNOS, registros, AHORA)).toEqual([]);
  });

  it('detecta fechas en el futuro', () => {
    // El caso real: el reloj del equipo mal ajustado. Estos registros además
    // quedaban fuera del rango "todos" antes del fix de v3.27.
    const registros = [registro('r1', { fechaHora: new Date(2027, 0, 1) })];
    const p = revisarIntegridad(ALUMNOS, registros, AHORA);
    expect(tipos(p)).toContain('fecha-futura');
    expect(p[0].gravedad).toBe('alta');
    expect(p[0].afectados).toBe(1);
  });

  it('tolera un desfase de minutos sin marcarlo', () => {
    // Sin tolerancia, un reloj adelantado 30 segundos marcaría cada visita
    // recién creada — ruido garantizado.
    const casiAhora = new Date(AHORA.getTime() + 60_000);
    const p = revisarIntegridad(ALUMNOS, [registro('r1', { fechaHora: casiAhora })], AHORA);
    expect(tipos(p)).not.toContain('fecha-futura');
  });

  it('detecta salida anterior a la entrada', () => {
    const registros = [registro('r1', {
      fechaHora: new Date(2026, 7, 30, 12, 0),
      horaSalida: new Date(2026, 7, 30, 10, 0),
    })];
    expect(tipos(revisarIntegridad(ALUMNOS, registros, AHORA))).toContain('salida-antes-de-entrada');
  });

  it('detecta duración negativa', () => {
    // Corrompe el promedio de permanencia de /estadisticas sin dar error.
    const registros = [registro('r1', { duracionMinutos: -45 })];
    expect(tipos(revisarIntegridad(ALUMNOS, registros, AHORA))).toContain('duracion-negativa');
  });

  it('detecta estancias imposibles pero no las largas y plausibles', () => {
    const larga = registro('r1', { duracionMinutos: ESTANCIA_MAXIMA_MIN - 1 });
    expect(tipos(revisarIntegridad(ALUMNOS, [larga], AHORA))).not.toContain('estancia-excesiva');

    const absurda = registro('r2', { duracionMinutos: ESTANCIA_MAXIMA_MIN + 1 });
    expect(tipos(revisarIntegridad(ALUMNOS, [absurda], AHORA))).toContain('estancia-excesiva');
  });

  it('detecta registros de matrículas que ya no existen', () => {
    const registros = [registro('r1', { matricula: '9999999999' })];
    expect(tipos(revisarIntegridad(ALUMNOS, registros, AHORA))).toContain('registro-huerfano');
  });

  it('los invitados NO son huérfanos', () => {
    // No tienen alumno por diseño. Marcarlos llenaría la lista con cada
    // visita externa que se haya registrado.
    const registros = [registro('r1', { matricula: 'INVITADO' })];
    expect(tipos(revisarIntegridad(ALUMNOS, registros, AHORA))).toEqual([]);
  });

  it('detecta matrículas repetidas entre alumnos', () => {
    const dos = [alumno('2299990002', 'id-a'), alumno('2299990002', 'id-b')];
    expect(tipos(revisarIntegridad(dos, [], AHORA))).toContain('matricula-duplicada');
  });

  it('detecta fechas inválidas sin reventar el resto de la revisión', () => {
    const registros = [
      registro('r1', { fechaHora: 'no-es-fecha' as any }),
      registro('r2', { duracionMinutos: -5 }),
    ];
    const t = tipos(revisarIntegridad(ALUMNOS, registros, AHORA));
    expect(t).toContain('fecha-invalida');
    expect(t).toContain('duracion-negativa');
  });

  it('agrupa por tipo y limita los ejemplos a tres', () => {
    // Con 500 registros rotos, listarlos todos haría ilegible la pantalla.
    const registros = Array.from({ length: 10 }, (_, i) =>
      registro(`r${i}`, { duracionMinutos: -1 }),
    );
    const p = revisarIntegridad(ALUMNOS, registros, AHORA);
    expect(p.length).toBe(1);
    expect(p[0].afectados).toBe(10);
    expect(p[0].ejemplos.length).toBe(3);
  });

  it('una base vacía no reporta nada', () => {
    expect(revisarIntegridad([], [], AHORA)).toEqual([]);
  });

  it('un registro puede acumular varios problemas a la vez', () => {
    const registros = [registro('r1', {
      fechaHora: new Date(2027, 0, 1),
      matricula: '8888888888',
      duracionMinutos: -10,
    })];
    const t = tipos(revisarIntegridad(ALUMNOS, registros, AHORA));
    expect(t).toContain('fecha-futura');
    expect(t).toContain('registro-huerfano');
    expect(t).toContain('duracion-negativa');
  });
});
