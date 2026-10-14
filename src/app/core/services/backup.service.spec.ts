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
/** Lo que el servicio anota en la bitácora no es lo que se prueba aquí. */
const bitacoraStub = { registrar: () => undefined } as any;

function nuevoServicio(): { db: DatabaseService; backup: BackupService } {
  const db = new DatabaseService();
  return { db, backup: new BackupService(db, configStub, bitacoraStub) };
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

  describe('estado de sync según el origen', () => {
    // El origen decide si la fila queda pendiente de subir. Confundirlo tiene
    // consecuencias opuestas en cada dirección, así que va fijado por test.
    it('restaurar desde un respaldo deja la fila PENDIENTE de subir', async () => {
      // Un respaldo JSON nunca estuvo en la nube: si quedara como `synced`,
      // esos datos no se subirían nunca y se perderían al cambiar de equipo.
      await sembrar();
      const exportado = porJSON(await backup.exportarBackup());

      resetIndexedDB();
      ({ db, backup } = nuevoServicio());
      await db.inicializar();
      await backup.importarBackup(exportado, 'merge');

      const [r] = await db.obtenerTodosLosRegistros();
      expect(r._syncStatus).toBe('pending');
    });

    it('restaurar desde la nube deja la fila como SINCRONIZADA', async () => {
      // Viene del servidor: marcarla pendiente haría que la bandeja de subida
      // la ofreciera de vuelta al lugar del que acaba de llegar. Con volumen
      // real son miles de filas de ruido.
      await sembrar();
      const [original] = await db.obtenerTodosLosRegistros();

      resetIndexedDB();
      ({ db, backup } = nuevoServicio());
      await db.inicializar();

      await db.restaurarRegistro(original, 'nube');
      const [r] = await db.obtenerTodosLosRegistros();
      expect(r._syncStatus).toBe('synced');
      expect(r._lastSyncedAt).toBeDefined();
    });

    it('el default sigue siendo `backup` para no cambiar el comportamiento existente', async () => {
      await sembrar();
      const [original] = await db.obtenerTodosLosRegistros();
      resetIndexedDB();
      ({ db, backup } = nuevoServicio());
      await db.inicializar();

      await db.restaurarRegistro(original);
      const [r] = await db.obtenerTodosLosRegistros();
      expect(r._syncStatus).toBe('pending');
    });

    it('alumnos y motivos siguen la misma regla', async () => {
      const { alumno: a } = await sembrar();
      resetIndexedDB();
      ({ db, backup } = nuevoServicio());
      await db.inicializar();

      await db.restaurarAlumno(a, 'nube');
      const [guardado] = await db.obtenerTodosLosAlumnos();
      expect(guardado._syncStatus).toBe('synced');

      const m = await db.restaurarMotivo(
        { id: 'motivo-x', nombre: 'Prueba', icono: 'book', orden: 9, activo: true },
        'nube',
      );
      expect(m._syncStatus).toBe('synced');
    });
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

  // ═══════════════════════════════════════════════════════
  // Respaldo de OTRA instalación (v3.50.0): cada base crea sus motivos
  // default con ids propios. Es el caso diario de "equipo de la puerta →
  // PC del coordinador".
  describe('motivos de otra instalación', () => {
    async function respaldoDeOtraInstalacion(): Promise<{ datos: BackupData; idOrigen: string }> {
      resetIndexedDB(); // la otra instalación tiene su propia base
      const otra = nuevoServicio();
      await otra.db.inicializar();
      const estudiar = (await otra.db.obtenerTodosLosMotivos()).find(m => m.nombre === 'Estudiar')!;
      await otra.db.restaurarRegistro({
        id: 'r-puerta-1', alumnoId: 'a', matricula: '2299990002', nombreCompleto: 'Ana', carrera: 'ISC',
        motivoId: estudiar.id!, motivoNombre: 'Estudiar', motivoIds: [estudiar.id!], motivoNombres: ['Estudiar'],
        fechaHora: FECHA_VIEJA, sincronizado: false,
      } as Registro);
      const datos = porJSON(await otra.backup.exportarBackup());
      resetIndexedDB(); // y esta, la suya: motivos default con otros ids
      ({ db, backup } = nuevoServicio());
      await db.inicializar();
      return { datos, idOrigen: estudiar.id! };
    }

    it('al combinar, los registros apuntan al motivo local del mismo nombre', async () => {
      const { datos, idOrigen } = await respaldoDeOtraInstalacion();
      const local = (await db.obtenerTodosLosMotivos()).find(m => m.nombre === 'Estudiar')!;
      expect(local.id).not.toBe(idOrigen);

      await backup.importarBackup(datos, 'merge');

      const [r] = await db.obtenerTodosLosRegistros();
      expect(r.motivoId).toBe(local.id!);
      expect(r.motivoIds).toEqual([local.id!]);
      expect((await db.obtenerTodosLosMotivos()).length).toBe(5); // sin "Estudiar" duplicado
    });

    it('al reemplazar, se restaura el catálogo del respaldo con sus ids', async () => {
      const { datos, idOrigen } = await respaldoDeOtraInstalacion();

      await backup.importarBackup(datos, 'replace');

      const motivos = await db.obtenerTodosLosMotivos();
      expect(motivos.length).toBe(5);
      expect(motivos.find(m => m.nombre === 'Estudiar')!.id).toBe(idOrigen);
      expect((await db.obtenerTodosLosRegistros())[0].motivoId).toBe(idOrigen);
    });
  });

  describe('bitácora (v3.52.0)', () => {
    const evento = {
      id: 'ev-1', fechaHora: '2026-10-14T20:00:00.000Z',
      accion: 'registro-eliminado' as const, detalle: 'Ana (2299990002)', equipo: 'Puerta',
    };

    it('viaja en el respaldo y combinar dos veces no la duplica', async () => {
      await db.agregarEventoBitacora(evento);
      const datos = porJSON(await backup.exportarBackup());
      expect(datos.bitacora).toEqual([evento]);

      resetIndexedDB();
      ({ db, backup } = nuevoServicio());
      await db.inicializar();
      await backup.importarBackup(datos, 'merge');
      await backup.importarBackup(datos, 'merge');
      expect(await db.obtenerBitacora()).toEqual([evento]);
    });

    it('sobrevive a "reemplazar" y a borrar todos los datos', async () => {
      await db.agregarEventoBitacora(evento);
      await backup.importarBackup(porJSON(await backup.exportarBackup()), 'replace');
      await db.limpiarTodosDatos();
      expect(await db.obtenerBitacora()).toEqual([evento]);
    });

    it('un respaldo viejo sin bitácora se importa igual', async () => {
      const datos = porJSON(await backup.exportarBackup());
      delete datos.bitacora;
      expect(backup.validarArchivo(JSON.stringify(datos)).valido).toBeTrue();
      expect((await backup.importarBackup(datos, 'merge')).exitoso).toBeTrue();
    });

    it('al combinar a diario cuenta solo lo nuevo', async () => {
      await sembrar();
      const datos = porJSON(await backup.exportarBackup());
      const r = await backup.importarBackup(datos, 'merge');
      expect(r.registrosNuevos).toBe(0);
      expect(r.alumnosNuevos).toBe(0);
      expect(r.registrosImportados).toBe(1);
    });

    describe('borrados entre equipos (v3.53.0)', () => {
      /** La oficina ya tiene la visita; luego la puerta la borra y manda su respaldo. */
      async function puertaBorra(): Promise<{ registro: Registro; datos: BackupData }> {
        const { registro } = await sembrar();
        const ayer = porJSON(await backup.exportarBackup());
        // "Puerta": borra la visita y anota el borrado.
        await db.eliminarRegistro(registro.id);
        await db.agregarEventoBitacora({
          id: 'ev-borrado', fechaHora: '2026-10-14T20:00:00.000Z', accion: 'registro-eliminado',
          detalle: 'Ana', equipo: 'Puerta', refId: registro.id,
        });
        const hoy = porJSON(await backup.exportarBackup());
        // "Oficina": tenía el respaldo de ayer.
        resetIndexedDB();
        ({ db, backup } = nuevoServicio());
        await db.inicializar();
        await backup.importarBackup(ayer, 'merge');
        expect((await db.obtenerTodosLosRegistros()).length).toBe(1);
        return { registro, datos: hoy };
      }

      it('combinar aplica en la oficina la visita borrada en la puerta', async () => {
        const { datos } = await puertaBorra();
        const r = await backup.importarBackup(datos, 'merge');
        expect(r.borradosAplicados).toBe(1);
        expect(await db.obtenerTodosLosRegistros()).toEqual([]);
      });

      it('lo borrado no revive con un respaldo viejo que aún la trae', async () => {
        const { registro, datos } = await puertaBorra();
        await backup.importarBackup(datos, 'merge');
        const viejo = porJSON(await backup.exportarBackup());
        viejo.registros = [{ ...registro, fechaHora: FECHA_VIEJA } as Registro];
        await backup.importarBackup(porJSON(viejo), 'merge');
        expect(await db.obtenerTodosLosRegistros()).toEqual([]);
      });

      it('"Reemplazar todo" devuelve exactamente lo del archivo (restaurar tras borrar por error)', async () => {
        const { registro } = await sembrar();
        const antes = porJSON(await backup.exportarBackup());
        await db.eliminarRegistro(registro.id);
        await db.agregarEventoBitacora({
          id: 'ev-error', fechaHora: '2026-10-14T20:00:00.000Z', accion: 'registro-eliminado',
          detalle: 'Ana', equipo: 'Oficina', refId: registro.id,
        });
        await backup.importarBackup(antes, 'replace');
        expect((await db.obtenerTodosLosRegistros()).map(x => x.id)).toEqual([registro.id]);
      });
    });

    it('al pasar el tope descarta los eventos más viejos', async () => {
      for (let i = 0; i < 4; i++) {
        await db.agregarEventoBitacora({ ...evento, id: `ev-${i}`, fechaHora: `2026-10-1${i}T10:00:00.000Z` });
      }
      await db.recortarBitacora(2);
      expect((await db.obtenerBitacora()).map(e => e.id)).toEqual(['ev-3', 'ev-2']);
    });
  });
});
