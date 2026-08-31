// ╔══════════════════════════════════════════════════════╗
// ║  backup.service.spec.ts                              ║
// ║  Stenbrary — Round-trip de respaldo y restauración   ║
// ║                                                      ║
// ║  Por qué existe:                                     ║
// ║  el backup es la ÚNICA red de seguridad del          ║
// ║  coordinador. Un export que se ve bien y un import   ║
// ║  que devuelve "exitoso: true" con el conteo correcto ║
// ║  puede aun así haber destruido el historial. Estos   ║
// ║  tests comparan el contenido, no el conteo.          ║
// ║                                                      ║
// ║  Regresión que cubren (encontrada en auditoría):     ║
// ║  importarBackup() reconstruía los registros con      ║
// ║  crearRegistro(), que estampa `fechaHora: new Date()`║
// ║  → toda la historia colapsaba al día de la           ║
// ║  restauración, y se perdían horaSalida,              ║
// ║  duracionMinutos, motivoIds/motivoNombres y turno.   ║
// ╚══════════════════════════════════════════════════════╝

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { DatabaseService } from './database.service';
import { BackupService, BackupData } from './backup.service';
import { Alumno, Registro } from '../models';

function resetIndexedDB() {
  (globalThis as any).indexedDB = new IDBFactory();
}

/** ConfigService no participa en el round-trip; basta un doble inerte. */
const configStub = {} as any;

function nuevoServicio(): { db: DatabaseService; backup: BackupService } {
  const db = new DatabaseService();
  return { db, backup: new BackupService(db, configStub) };
}

/** Simula el viaje real por disco: Date → string ISO y de vuelta. */
function porJSON(datos: BackupData): BackupData {
  return JSON.parse(JSON.stringify(datos));
}

const FECHA_VIEJA = new Date(2026, 1, 10, 9, 30, 0, 0);
const FECHA_SALIDA = new Date(2026, 1, 10, 11, 45, 0, 0);

describe('BackupService — round-trip', () => {
  let db: DatabaseService;
  let backup: BackupService;

  beforeEach(async () => {
    resetIndexedDB();
    ({ db, backup } = nuevoServicio());
    await db.inicializar();
  });

  /** Siembra un alumno y un registro histórico completo. */
  async function sembrar(): Promise<{ alumno: Alumno; registro: Registro }> {
    const alumno = await db.crearAlumno({
      matricula: '2299990002',
      nombre: 'Ana',
      apellidoPaterno: 'Hernández',
      apellidoMaterno: 'Villanueva',
      carrera: 'ISC',
      grado: 5,
      grupo: 'A',
      turno: 'Matutino',
      activo: true,
      datosExtra: {},
    } as any);

    // Registro histórico con TODOS los campos opcionales poblados: es
    // justamente lo que la importación anterior tiraba a la basura.
    const registro: Registro = {
      id: 'registro-historico-1',
      alumnoId: alumno.id,
      matricula: alumno.matricula,
      nombreCompleto: 'Ana Hernández Villanueva',
      carrera: 'ISC',
      motivoId: 'motivo-estudiar',
      motivoNombre: 'Estudiar',
      motivoIds: ['motivo-estudiar', 'motivo-investigacion'],
      motivoNombres: ['Estudiar', 'Investigación'],
      fechaHora: FECHA_VIEJA,
      horaSalida: FECHA_SALIDA,
      duracionMinutos: 135,
      turno: 'Matutino',
      dispositivo: 'LECTOR-USB',
      sincronizado: false,
    } as Registro;

    await db.restaurarRegistro(registro);
    return { alumno, registro };
  }

  // ═══════════════════════════════════════════════════════
  it('exporta todo lo que hay en la base', async () => {
    await sembrar();
    const datos = await backup.exportarBackup();
    expect(datos.alumnos.length).toBe(1);
    expect(datos.registros.length).toBe(1);
    expect(datos.meta.totalRegistros).toBe(1);
  });

  it('restaurar en base vacía conserva la fecha original del registro', async () => {
    // EL bug: la historia entera colapsaba al día de la importación.
    await sembrar();
    const exportado = porJSON(await backup.exportarBackup());

    resetIndexedDB();
    ({ db, backup } = nuevoServicio());
    await db.inicializar();

    const res = await backup.importarBackup(exportado, 'merge');
    expect(res.exitoso).toBe(true);
    expect(res.registrosImportados).toBe(1);

    const [r] = await db.obtenerTodosLosRegistros();
    expect(new Date(r.fechaHora).getTime()).toBe(FECHA_VIEJA.getTime());
  });

  it('restaurar conserva salida, duración, motivos múltiples y turno', async () => {
    await sembrar();
    const exportado = porJSON(await backup.exportarBackup());

    resetIndexedDB();
    ({ db, backup } = nuevoServicio());
    await db.inicializar();
    await backup.importarBackup(exportado, 'merge');

    const [r] = await db.obtenerTodosLosRegistros();
    expect(new Date(r.horaSalida!).getTime()).toBe(FECHA_SALIDA.getTime());
    expect(r.duracionMinutos).toBe(135);
    expect(r.motivoIds).toEqual(['motivo-estudiar', 'motivo-investigacion']);
    expect(r.motivoNombres).toEqual(['Estudiar', 'Investigación']);
    expect(r.turno as string).toBe('Matutino');
    expect(r.dispositivo).toBe('LECTOR-USB');
  });

  it('las fechas se revivon como Date, no como string ISO', async () => {
    // Guardar strings fabricaría justo los registros que obligan a
    // DatabaseService a mantener el fallback getAll()+filter.
    await sembrar();
    const exportado = porJSON(await backup.exportarBackup());

    resetIndexedDB();
    ({ db, backup } = nuevoServicio());
    await db.inicializar();
    await backup.importarBackup(exportado, 'merge');

    const [r] = await db.obtenerTodosLosRegistros();
    expect(r.fechaHora instanceof Date).toBe(true);
    expect(r.horaSalida instanceof Date).toBe(true);
    const [a] = await db.obtenerTodosLosAlumnos();
    expect(a.fechaRegistro instanceof Date).toBe(true);
  });

  it('el alumno conserva su id, así que los registros siguen enlazados', async () => {
    const { alumno } = await sembrar();
    const exportado = porJSON(await backup.exportarBackup());

    resetIndexedDB();
    ({ db, backup } = nuevoServicio());
    await db.inicializar();
    await backup.importarBackup(exportado, 'merge');

    const [a] = await db.obtenerTodosLosAlumnos();
    const [r] = await db.obtenerTodosLosRegistros();
    expect(a.id).toBe(alumno.id);
    expect(r.alumnoId).toBe(a.id!);
  });

  it('reimportar el mismo backup no duplica nada (idempotencia)', async () => {
    await sembrar();
    const exportado = porJSON(await backup.exportarBackup());

    resetIndexedDB();
    ({ db, backup } = nuevoServicio());
    await db.inicializar();

    await backup.importarBackup(exportado, 'merge');
    await backup.importarBackup(exportado, 'merge');

    expect((await db.obtenerTodosLosRegistros()).length).toBe(1);
    expect((await db.obtenerTodosLosAlumnos()).length).toBe(1);
  });

  it('omite el alumno cuando la matrícula ya pertenece a otra persona', async () => {
    await sembrar();
    const exportado = porJSON(await backup.exportarBackup());

    resetIndexedDB();
    ({ db, backup } = nuevoServicio());
    await db.inicializar();
    // Otro alumno, misma matrícula, id distinto: no debe sobrescribirse.
    await db.crearAlumno({
      matricula: '2299990002',
      nombre: 'Persona',
      apellidoPaterno: 'Distinta',
      apellidoMaterno: 'Totalmente',
      carrera: 'Derecho',
      grado: 1,
      grupo: 'B',
      turno: 'Vespertino',
      activo: true,
      datosExtra: {},
    } as any);

    const res = await backup.importarBackup(exportado, 'merge');
    expect(res.alumnosOmitidos).toBe(1);
    expect(res.alumnosImportados).toBe(0);

    const [a] = await db.obtenerTodosLosAlumnos();
    expect(a.nombre).toBe('Persona'); // el existente sobrevive intacto
  });

  it('un registro con fechaHora inválida se reporta, no se guarda con la fecha de hoy', async () => {
    const corrupto: BackupData = {
      meta: { version: '3.4', fecha: new Date().toISOString(), app: 'Stenbrary',
              totalAlumnos: 0, totalRegistros: 1, totalMotivos: 0 },
      alumnos: [],
      motivos: [],
      registros: [{
        id: 'roto-1',
        alumnoId: 'x',
        matricula: '2299990005',
        nombreCompleto: 'Sin Fecha',
        carrera: 'ISC',
        motivoId: 'm',
        motivoNombre: 'Estudiar',
        fechaHora: 'no-es-una-fecha' as any,
        sincronizado: false,
      } as Registro],
    };

    const res = await backup.importarBackup(corrupto, 'merge');
    expect(res.registrosImportados).toBe(0);
    expect(res.errores.length).toBe(1);
    expect((await db.obtenerTodosLosRegistros()).length).toBe(0);
  });
});
