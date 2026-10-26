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
import { Injector, runInInjectionContext } from '@angular/core';
import { IDBFactory } from 'fake-indexeddb';
import { DatabaseService } from './database.service';
import { BackupService, BackupData } from './backup.service';
import { ConfigService } from './config.service';
import { BitacoraService } from './bitacora.service';
import { Alumno, Registro } from '../models';
import { CatalogoEscolar, agregarCarrera, catalogoInicial } from '../utils/catalogos.utils';

function resetIndexedDB() {
  (globalThis as any).indexedDB = new IDBFactory();
}

/** ConfigService no participa en el round-trip; basta un doble inerte. */
const configStub = {} as any;
/** Lo que el servicio anota en la bitácora no es lo que se prueba aquí. */
const bitacoraStub = { registrar: () => undefined } as any;

/** BackupService usa inject(): se crea en un injector con sus dobles. */
function crearBackup(db: DatabaseService, config: unknown): BackupService {
  const injector = Injector.create({
    providers: [
      { provide: DatabaseService, useValue: db },
      { provide: ConfigService, useValue: config },
      { provide: BitacoraService, useValue: bitacoraStub },
    ],
  });
  return runInInjectionContext(injector, () => new BackupService());
}

function nuevoServicio(): { db: DatabaseService; backup: BackupService } {
  const db = new DatabaseService();
  return { db, backup: crearBackup(db, configStub) };
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

  // v3.62.0: antes la visita mala se omitía y el resto entraba; ahora el
  // archivo completo se rechaza antes de tocar la base.
  it('un registro con fechaHora inválida rechaza el respaldo: no se guarda con la fecha de hoy ni se importa nada', async () => {
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

    for (const modo of ['merge', 'replace'] as const) {
      const res = await backup.importarBackup(corrupto, modo);
      expect(res.exitoso).toBeFalse();
      expect(res.registrosImportados).toBe(0);
      expect(res.errores).toEqual(['Visita 1: la fecha de entrada falta o no es válida.']);
      expect((await db.obtenerTodosLosRegistros()).length).toBe(0);
    }
  });

  it('un respaldo inválido no cambia nada, ni al combinar ni al reemplazar (v3.62.0)', async () => {
    const { alumno, registro } = await sembrar();
    const antes = porJSON(await backup.exportarBackup());
    const roto = porJSON(antes);
    roto.alumnos = [...roto.alumnos, { ...roto.alumnos[0], id: 'otro-id' }];   // misma matrícula, otro alumno

    for (const modo of ['merge', 'replace'] as const) {
      const res = await backup.importarBackup(roto, modo);
      expect(res.exitoso).toBeFalse();
      expect(res.errores[0]).toContain('pertenece a otro alumno del archivo');
    }
    expect((await db.obtenerTodosLosAlumnos()).map(a => a.id)).toEqual([alumno.id!]);
    expect((await db.obtenerTodosLosRegistros()).map(r => r.id)).toEqual([registro.id]);
    expect((await db.obtenerTodosLosMotivos()).length).toBe(antes.motivos.length);
  });

  it('validarArchivo rechaza un JSON que no es respaldo y lista los motivos', () => {
    expect(backup.validarArchivo('{nope').errores).toEqual(['El archivo no es un JSON válido']);
    const v = backup.validarArchivo(JSON.stringify({ meta: { app: 'Stenbrary', version: '3.4', fecha: 'x' } }));
    expect(v.valido).toBeFalse();
    expect(v.errores[0]).toContain('fecha del respaldo');
  });

  it('combinar un respaldo vacío (instalación nueva) no borra ni cambia nada', async () => {
    const { registro } = await sembrar();
    const vacio: BackupData = {
      meta: { version: '3.4', fecha: new Date().toISOString(), app: 'Stenbrary', totalAlumnos: 0, totalRegistros: 0, totalMotivos: 0 },
      alumnos: [], registros: [], motivos: [],
    };
    const res = await backup.importarBackup(vacio, 'merge');
    expect(res.exitoso).toBeTrue();
    expect((await db.obtenerTodosLosRegistros()).map(r => r.id)).toEqual([registro.id]);
    expect((await db.obtenerTodosLosAlumnos()).length).toBe(1);
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

  describe('catálogo de carreras (v3.57.0)', () => {
    /** Doble con el catálogo en memoria, como ConfigService. */
    function conCatalogo(cat: CatalogoEscolar) {
      const cfg = { catalogoEscolar: cat, setCatalogoEscolar(c: CatalogoEscolar) { cfg.catalogoEscolar = c; } };
      return { cfg, servicio: crearBackup(db, cfg) };
    }

    it('viaja en el respaldo; combinar suma lo que falta y reemplazar trae el del archivo', async () => {
      const puerta = agregarCarrera(catalogoInicial(), 'Ingeniería Civil');
      if (!puerta.ok) throw new Error(puerta.error);
      const datos = porJSON(await conCatalogo(puerta.catalogo).servicio.exportarBackup());
      expect(datos.catalogoEscolar!.carreras.some(c => c.nombre === 'Ingeniería Civil')).toBeTrue();

      const oficina = conCatalogo(catalogoInicial());
      const r = await oficina.servicio.importarBackup(datos, 'merge');
      expect(r.catalogoNuevos).toBe(1);
      expect(oficina.cfg.catalogoEscolar.carreras.length).toBe(9);
      expect((await oficina.servicio.importarBackup(datos, 'merge')).catalogoNuevos).toBe(0);

      const otra = conCatalogo({ ...catalogoInicial(), grupos: ['Z'] });
      await otra.servicio.importarBackup(datos, 'replace');
      expect(otra.cfg.catalogoEscolar.grupos).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    });

    it('un respaldo sin catálogo no toca el de aquí', async () => {
      const aqui = conCatalogo({ ...catalogoInicial(), grupos: ['Z'] });
      const datos = porJSON(await aqui.servicio.exportarBackup());
      delete datos.catalogoEscolar;
      await aqui.servicio.importarBackup(datos, 'replace');
      expect(aqui.cfg.catalogoEscolar.grupos).toEqual(['Z']);
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

  // ═══════════════════════════════════════════════════════
  describe('combinar: gana la edición más reciente (v3.57.2)', () => {
    it('lo corregido aquí no lo deshace un respaldo con la versión vieja', async () => {
      const { registro } = await sembrar();
      const dePuerta = porJSON(await backup.exportarBackup());
      const corregida = new Date(2026, 1, 10, 12, 0);
      await db.actualizarRegistroManual(registro.id, { horaSalida: corregida });   // la oficina corrige

      const res = await backup.importarBackup(dePuerta, 'merge');
      expect(res.conservados).toBe(1);
      const [r] = await db.obtenerTodosLosRegistros();
      expect(new Date(r.horaSalida!).getTime()).toBe(corregida.getTime());

      // Si el del archivo se editó DESPUÉS, ese gana.
      const despues = porJSON(await backup.exportarBackup());
      despues.registros[0].horaSalida = new Date(2026, 1, 10, 13, 0);
      despues.registros[0].editadoEn = new Date(Date.now() + 60_000);
      await backup.importarBackup(porJSON(despues), 'merge');
      const [r2] = await db.obtenerTodosLosRegistros();
      expect(new Date(r2.horaSalida!).getHours()).toBe(13);
    });

    it('el cierre automático de aquí NO le gana a la salida real que llega de la puerta', async () => {
      const { alumno } = await sembrar();
      const entrada = new Date(Date.now() - 5 * 3_600_000);
      const abierta = { id: 'r-abierta', alumnoId: alumno.id, matricula: alumno.matricula, nombreCompleto: 'Ana',
        carrera: 'ISC', motivoId: 'm', motivoNombre: 'Estudiar', fechaHora: entrada, sincronizado: false } as Registro;
      await db.restaurarRegistro(abierta);
      const deLaPuerta = porJSON(await backup.exportarBackup());
      await db.cerrarEntradasAntiguas(2);                      // la oficina la cierra sola (estimada)

      const real = deLaPuerta.registros.find(r => r.id === 'r-abierta')!;
      real.horaSalida = new Date(entrada.getTime() + 60 * 60_000);
      real.duracionMinutos = 60;
      await backup.importarBackup(porJSON(deLaPuerta), 'merge');
      const r = (await db.obtenerTodosLosRegistros()).find(x => x.id === 'r-abierta')!;
      expect(r.duracionMinutos).toBe(60);
      expect(r.salidaEstimada).toBeFalsy();
    });

    it('"Reemplazar" escribe siempre, aunque lo de aquí sea más reciente', async () => {
      const { registro } = await sembrar();
      const archivo = porJSON(await backup.exportarBackup());
      await db.actualizarRegistroManual(registro.id, { horaSalida: new Date(2026, 1, 10, 12, 0) });
      const res = await backup.importarBackup(archivo, 'replace');
      expect(res.conservados).toBe(0);
      const [r] = await db.obtenerTodosLosRegistros();
      expect(new Date(r.horaSalida!).getTime()).toBe(FECHA_SALIDA.getTime());
    });
  });

  describe('corrección del nombre de una carrera entre equipos (v3.57.2)', () => {
    const renombre = (id: string, equipo: string) => ({
      id, fechaHora: '2026-10-14T20:00:00.000Z', accion: 'catalogo-cambiado' as const,
      detalle: 'ISC corregida', equipo, renombre: { de: 'ISC', a: 'Ing. Sistemas' },
    });

    it('corregida aquí, el respaldo de la puerta con el nombre viejo no la deshace', async () => {
      const { alumno } = await sembrar();
      const dePuerta = porJSON(await backup.exportarBackup());
      dePuerta.registros.push({ ...dePuerta.registros[0], id: 'r-nueva-puerta' });   // llegó después, nombre viejo
      await db.renombrarCarreraEnDatos('ISC', 'Ing. Sistemas');
      await db.agregarEventoBitacora(renombre('ev-ofi', 'Oficina'));

      await backup.importarBackup(porJSON(dePuerta), 'merge');
      const carreras = (await db.obtenerTodosLosRegistros()).map(r => r.carrera);
      expect(carreras.length).toBe(2);
      expect(new Set(carreras)).toEqual(new Set(['Ing. Sistemas']));
      expect((await db.obtenerAlumnoPorId(alumno.id!))!.carrera).toBe('Ing. Sistemas');
    });

    it('corregida en la puerta, al combinar se repite aquí', async () => {
      await sembrar();
      const dePuerta = porJSON(await backup.exportarBackup());
      dePuerta.alumnos.forEach(a => a.carrera = 'Ing. Sistemas');
      dePuerta.registros.forEach(r => r.carrera = 'Ing. Sistemas');
      dePuerta.bitacora = [renombre('ev-puerta', 'Puerta')];

      await backup.importarBackup(dePuerta, 'merge');
      expect((await db.obtenerTodosLosRegistros()).map(r => r.carrera)).toEqual(['Ing. Sistemas']);
      expect((await db.obtenerTodosLosAlumnos()).map(a => a.carrera)).toEqual(['Ing. Sistemas']);
    });
  });

  // v3.62.0: "Reemplazar" es UNA transacción. Antes borraba primero, escribía
  // después y volvía atrás con una copia en memoria (que no sobrevivía a
  // cerrar la pestaña). Aquí la escritura falla de verdad dentro de la
  // transacción, después de haber vaciado los stores y escrito parte.
  describe('"Reemplazar" atómico (v3.62.0)', () => {
    /** Visita que IndexedDB no puede guardar (DataCloneError), al final del lote. */
    function conVisitaImposible(archivo: BackupData): BackupData {
      const ok = Array.from({ length: 30 }, (_, i) => ({ ...archivo.registros[0], id: `nuevo-${i}` }));
      const imposible = { ...archivo.registros[0], id: 'imposible', extra: () => 1 } as unknown as Registro;
      return { ...archivo, alumnos: [{ ...archivo.alumnos[0], nombre: 'Cambiado' }], registros: [...ok, imposible] };
    }

    it('si una escritura falla a la mitad, alumnos, visitas, actividades y bitácora quedan exactamente como estaban', async () => {
      await sembrar();
      const antes = porJSON(await backup.exportarBackup());
      const bitacoraAntes = await db.obtenerBitacora();

      const res = await backup.importarBackup(conVisitaImposible(porJSON(antes)), 'replace');

      expect(res.exitoso).toBeFalse();
      expect(res.errores.join(' ')).toContain('No se cambió nada');
      const despues = porJSON(await backup.exportarBackup());
      expect(despues.alumnos).toEqual(antes.alumnos);
      expect(despues.registros).toEqual(antes.registros);
      expect(despues.motivos).toEqual(antes.motivos);
      expect(await db.obtenerBitacora()).toEqual(bitacoraAntes);
    });

    it('lo que estaba sigue intacto aunque la base tenga muchas visitas', async () => {
      const { alumno } = await sembrar();
      for (let i = 0; i < 200; i++) {
        await db.restaurarRegistro({ id: `previo-${i}`, alumnoId: alumno.id!, matricula: alumno.matricula, nombreCompleto: 'Ana',
          carrera: 'ISC', motivoId: 'm', motivoNombre: 'Estudiar', fechaHora: FECHA_VIEJA, sincronizado: false } as Registro);
      }
      const archivo = conVisitaImposible(porJSON(await backup.exportarBackup()));
      await backup.importarBackup(archivo, 'replace');
      expect((await db.obtenerTodosLosRegistros()).length).toBe(201);
      expect((await db.obtenerTodosLosAlumnos())[0].nombre).toBe('Ana');
    });

    it('sin actividades en el respaldo deja las de fábrica; con actividades repetidas por nombre, las funde', async () => {
      await sembrar();
      const archivo = porJSON(await backup.exportarBackup());
      archivo.motivos = [];
      expect((await backup.importarBackup(archivo, 'replace')).exitoso).toBeTrue();
      expect((await db.obtenerTodosLosMotivos()).map(m => m.nombre).sort())
        .toEqual(['Estudiar', 'Investigación', 'Otro', 'Pedir libro', 'Trabajo escolar']);

      archivo.motivos = [
        { id: 'm-a', nombre: 'Estudiar', icono: 'x', orden: 1, activo: true },
        { id: 'm-b', nombre: 'estudiar ', icono: 'x', orden: 2, activo: true },
      ];
      archivo.registros = [{ ...archivo.registros[0], motivoId: 'm-b', motivoIds: ['m-b'] }];
      const res = await backup.importarBackup(archivo, 'replace');
      expect(res.motivosImportados).toBe(1);
      expect(res.motivosOmitidos).toBe(1);
      expect((await db.obtenerTodosLosMotivos()).map(m => m.id)).toEqual(['m-a']);
      expect((await db.obtenerTodosLosRegistros())[0].motivoIds).toEqual(['m-a']);
    });
  });
});
