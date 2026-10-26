// ╔══════════════════════════════════════════════════════╗
// ║  database.service.spec.ts                            ║
// ║  Stenbrary v3.12.1 — Tests del DatabaseService       ║
// ║                                                      ║
// ║  Cobertura crítica:                                  ║
// ║  - Ventana por fecha (índice + fallback con strings) ║
// ║  - verificarRegistroReciente (duplicados)            ║
// ║  - obtenerEntradaAbiertaHoy (entrada sin salida)     ║
// ║  - registrarSalida (cálculo de duración)             ║
// ║  - cerrarEntradasAntiguas (cierre automático)        ║
// ║                                                      ║
// ║  Usa fake-indexeddb para aislar cada suite.          ║
// ╚══════════════════════════════════════════════════════╝

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { DatabaseService } from './database.service';
import { Alumno, Registro } from '../models';
import { parseFechaLocal } from '../utils/tiempo.utils';

/**
 * Reemplaza el indexedDB global por una instancia fresca entre tests
 * para garantizar aislamiento total (la DB se recrea por test).
 */
function resetIndexedDB() {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
}

function nuevoAlumno(matricula: string): Omit<Alumno, 'id' | 'fechaRegistro'> {
  return {
    matricula,
    nombre: 'Test',
    apellidoPaterno: 'Alumno',
    apellidoMaterno: 'Prueba',
    carrera: 'ISC',
    grado: 5,
    grupo: 'A',
    turno: 'Matutino',
    activo: true,
    datosExtra: {},
  };
}

async function crearRegistroConFecha(
  db: DatabaseService,
  matricula: string,
  fecha: Date,
  extras: Partial<Registro> = {},
): Promise<Registro> {
  // crearRegistro siempre usa new Date(). Para simular fechas arbitrarias
  // creamos y luego sobreescribimos vía actualizarRegistroManual.
  const r = await db.crearRegistro({
    alumnoId: 'a-' + matricula,
    matricula,
    nombreCompleto: 'Test Alumno',
    carrera: 'ISC',
    motivoId: 'm1',
    motivoNombre: 'Estudiar',
  });
  await db.actualizarRegistroManual(r.id, { fechaHora: fecha, ...extras });
  return { ...r, fechaHora: fecha, ...extras };
}

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(async () => {
    resetIndexedDB();
    db = new DatabaseService();
    await db.inicializar();
  });

  describe('eliminarAlumno (v3.53.0)', () => {
    async function alumnoConVisitas(matricula: string, visitas: number) {
      const a = await db.crearAlumno({
        matricula, nombre: 'Ana', apellidoPaterno: 'P', apellidoMaterno: 'M',
        carrera: 'ISC', grado: 1, grupo: 'A', turno: 'Matutino', activo: true,
      } as Parameters<DatabaseService['crearAlumno']>[0]);
      for (let i = 0; i < visitas; i++) {
        const r = await db.crearRegistro({
          alumnoId: a.id!, matricula, nombreCompleto: 'Ana P M', carrera: 'ISC', motivoId: 'm1', motivoNombre: 'Estudiar',
        });
        expect(r.id).toBeTruthy();
      }
      return a;
    }

    it('borra al alumno y sus visitas, como promete el diálogo', async () => {
      const ana = await alumnoConVisitas('2200000001', 3);
      await alumnoConVisitas('2200000002', 2);
      expect(await db.eliminarAlumno(ana.id!)).toBe(3);
      const quedan = await db.obtenerTodosLosRegistros();
      expect(quedan.length).toBe(2);
      expect(quedan.every(r => r.matricula === '2200000002')).toBeTrue();
      expect(await db.obtenerAlumnoPorMatricula('2200000001')).toBeNull();
    });

    it('también las visitas con su matrícula y otro alumnoId (de un respaldo)', async () => {
      const ana = await alumnoConVisitas('2200000001', 1);
      await crearRegistroConFecha(db, '2200000001', new Date(2026, 2, 10, 12, 0));
      expect(await db.eliminarAlumno(ana.id!)).toBe(2);
      expect(await db.eliminarAlumno('no-existe', { porMatricula: false })).toBe(0);
    });
  });

  describe('catálogos: contar y corregir el nombre de una carrera (v3.57.0)', () => {
    it('cuenta por carrera y el renombre cambia alumnos y visitas, nada más', async () => {
      const a = await db.crearAlumno({ ...nuevoAlumno('2200000001'), carrera: 'Lic. en TI' } as Parameters<DatabaseService['crearAlumno']>[0]);
      await db.crearAlumno({ ...nuevoAlumno('2200000002'), carrera: 'Derecho' } as Parameters<DatabaseService['crearAlumno']>[0]);
      await db.crearRegistro({ alumnoId: a.id!, matricula: '2200000001', nombreCompleto: 'X', carrera: 'Lic. en TI', motivoId: 'm1', motivoNombre: 'Estudiar' });
      await db.crearRegistro({ alumnoId: a.id!, matricula: '2200000001', nombreCompleto: 'X', carrera: 'Lic. en TI', motivoId: 'm1', motivoNombre: 'Estudiar' });
      await db.crearRegistro({ alumnoId: 'inv', matricula: 'INVITADO', nombreCompleto: 'Y', carrera: 'Visitante', motivoId: 'm1', motivoNombre: 'Estudiar' });

      const antes = await db.contarPorCarrera();
      expect(antes.get('Lic. en TI')).toEqual({ alumnos: 1, visitas: 2 });
      expect(antes.has('Visitante')).toBeFalse();              // los invitados no son de ninguna carrera

      const version = db.versionDatos();
      expect(await db.renombrarCarreraEnDatos('Lic. en TI', 'Lic. en TI e IA')).toEqual({ alumnos: 1, registros: 2 });
      expect(db.versionDatos()).toBeGreaterThan(version);
      const despues = await db.contarPorCarrera();
      expect(despues.has('Lic. en TI')).toBeFalse();
      expect(despues.get('Lic. en TI e IA')).toEqual({ alumnos: 1, visitas: 2 });
      expect(despues.get('Derecho')).toEqual({ alumnos: 1, visitas: 0 });
      expect(await db.renombrarCarreraEnDatos('No existe', 'Otra')).toEqual({ alumnos: 0, registros: 0 });
    });
  });

  describe('eliminarRegistrosPorRango con fechas de un <input type="date">', () => {
    // Regresión de la auditoría 2026-10 (R2): el componente convertía
    // '2026-03-10' con new Date(), que es medianoche UTC; en México eso
    // corría el borrado un día hacia atrás. Con parseFechaLocal, elegir
    // 10 → 12 de marzo borra exactamente esos tres días.
    it('borra los días elegidos y ni uno más', async () => {
      const dias = [9, 10, 11, 12, 13];
      for (const d of dias) {
        await crearRegistroConFecha(db, '1000001', new Date(2026, 2, d, 12, 0));
      }
      const eliminados = await db.eliminarRegistrosPorRango(
        parseFechaLocal('2026-03-10')!,
        parseFechaLocal('2026-03-12')!,
      );
      expect(eliminados).toBe(3);
      const quedan = (await db.obtenerTodosLosRegistros())
        .map(r => new Date(r.fechaHora).getDate())
        .sort((a, b) => a - b);
      expect(quedan).toEqual([9, 13]);
    });

    it('incluye registros a primera y última hora de los días límite', async () => {
      await crearRegistroConFecha(db, '1000001', new Date(2026, 2, 10, 0, 5));
      await crearRegistroConFecha(db, '1000001', new Date(2026, 2, 12, 23, 55));
      const eliminados = await db.eliminarRegistrosPorRango(
        parseFechaLocal('2026-03-10')!,
        parseFechaLocal('2026-03-12')!,
      );
      expect(eliminados).toBe(2);
    });
  });

  describe('versionDatos', () => {
    it('sube después de cada escritura que cambia lo que muestran las estadísticas', async () => {
      const v0 = db.versionDatos();
      const r = await db.crearRegistro({
        alumnoId: 'a-1', matricula: '1000001', nombreCompleto: 'Test',
        carrera: 'ISC', motivoId: 'm1', motivoNombre: 'Estudiar',
      });
      const v1 = db.versionDatos();
      expect(v1).toBeGreaterThan(v0);

      await db.registrarSalida(r.id);
      const v2 = db.versionDatos();
      expect(v2).toBeGreaterThan(v1);

      await db.eliminarRegistro(r.id);
      expect(db.versionDatos()).toBeGreaterThan(v2);
    });

    it('no sube en lecturas', async () => {
      const v0 = db.versionDatos();
      await db.obtenerTodosLosRegistros();
      await db.obtenerRegistrosDeHoy();
      expect(db.versionDatos()).toBe(v0);
    });
  });

  describe('obtenerRegistrosDeHoy', () => {
    it('devuelve vacío sin registros', async () => {
      const r = await db.obtenerRegistrosDeHoy();
      expect(r).toEqual([]);
    });

    it('incluye un registro recién creado (hoy, vía índice)', async () => {
      await db.crearAlumno(nuevoAlumno('1000001'));
      await db.crearRegistro({
        alumnoId: 'a1',
        matricula: '1000001',
        nombreCompleto: 'X',
        carrera: 'ISC',
        motivoId: 'm1',
        motivoNombre: 'Estudiar',
      });
      const r = await db.obtenerRegistrosDeHoy();
      expect(r.length).toBe(1);
      expect(r[0].matricula).toBe('1000001');
    });

    it('excluye registros de ayer', async () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      await crearRegistroConFecha(db, '1000002', ayer);
      const r = await db.obtenerRegistrosDeHoy();
      expect(r.length).toBe(0);
    });
  });

  describe('obtenerRegistrosPorFecha', () => {
    it('encuentra registros de un día específico', async () => {
      const hoy = new Date();
      hoy.setHours(10, 30, 0, 0);
      await crearRegistroConFecha(db, '1000003', hoy);
      const r = await db.obtenerRegistrosPorFecha(new Date());
      expect(r.length).toBe(1);
    });

    it('no mezcla registros de días distintos', async () => {
      const hoy = new Date();
      hoy.setHours(12, 0, 0, 0);
      const hace5dias = new Date();
      hace5dias.setDate(hace5dias.getDate() - 5);

      await crearRegistroConFecha(db, '1000004', hoy);
      await crearRegistroConFecha(db, '1000005', hace5dias);

      const r = await db.obtenerRegistrosPorFecha(new Date());
      expect(r.length).toBe(1);
      expect(r[0].matricula).toBe('1000004');
    });
  });

  describe('verificarRegistroReciente', () => {
    it('retorna null si no hay registro', async () => {
      const r = await db.verificarRegistroReciente('9999999');
      expect(r).toBeNull();
    });

    it('retorna el registro si está dentro del umbral', async () => {
      const hace10min = new Date(Date.now() - 10 * 60 * 1000);
      await crearRegistroConFecha(db, '1000006', hace10min);
      const r = await db.verificarRegistroReciente('1000006', 30);
      expect(r).not.toBeNull();
      expect(r!.matricula).toBe('1000006');
    });

    it('retorna null si el registro está fuera del umbral', async () => {
      const hace45min = new Date(Date.now() - 45 * 60 * 1000);
      await crearRegistroConFecha(db, '1000007', hace45min);
      const r = await db.verificarRegistroReciente('1000007', 30);
      expect(r).toBeNull();
    });

    it('retorna el más reciente cuando hay varios', async () => {
      const hace20min = new Date(Date.now() - 20 * 60 * 1000);
      const hace5min = new Date(Date.now() - 5 * 60 * 1000);
      await crearRegistroConFecha(db, '1000008', hace20min, {
        motivoNombre: 'Antiguo',
      });
      await crearRegistroConFecha(db, '1000008', hace5min, {
        motivoNombre: 'Reciente',
      });
      const r = await db.verificarRegistroReciente('1000008', 30);
      expect(r!.motivoNombre).toBe('Reciente');
    });
  });

  describe('obtenerEntradaAbiertaHoy', () => {
    it('retorna null si no hay entrada abierta', async () => {
      const r = await db.obtenerEntradaAbiertaHoy('1000009');
      expect(r).toBeNull();
    });

    it('retorna entrada del día sin horaSalida', async () => {
      await db.crearRegistro({
        alumnoId: 'a9',
        matricula: '1000010',
        nombreCompleto: 'X',
        carrera: 'ISC',
        motivoId: 'm1',
        motivoNombre: 'Estudiar',
      });
      const r = await db.obtenerEntradaAbiertaHoy('1000010');
      expect(r).not.toBeNull();
      expect(r!.horaSalida).toBeUndefined();
    });

    it('excluye entradas que ya tienen salida', async () => {
      const reg = await db.crearRegistro({
        alumnoId: 'a10',
        matricula: '1000011',
        nombreCompleto: 'X',
        carrera: 'ISC',
        motivoId: 'm1',
        motivoNombre: 'Estudiar',
      });
      await db.registrarSalida(reg.id);
      const r = await db.obtenerEntradaAbiertaHoy('1000011');
      expect(r).toBeNull();
    });
  });

  describe('registrarSalida', () => {
    it('calcula duracionMinutos desde fechaHora hasta ahora', async () => {
      const hace30min = new Date(Date.now() - 30 * 60 * 1000);
      const reg = await crearRegistroConFecha(db, '1000012', hace30min);
      const cerrado = await db.registrarSalida(reg.id);
      expect(cerrado.horaSalida).toBeDefined();
      // Tolerancia por delay de I/O (±2 min).
      expect(cerrado.duracionMinutos!).toBeGreaterThanOrEqual(28);
      expect(cerrado.duracionMinutos!).toBeLessThanOrEqual(32);
    });

    it('lanza si el registro ya tiene salida', async () => {
      const reg = await db.crearRegistro({
        alumnoId: 'a12',
        matricula: '1000013',
        nombreCompleto: 'X',
        carrera: 'ISC',
        motivoId: 'm1',
        motivoNombre: 'Estudiar',
      });
      await db.registrarSalida(reg.id);
      await expectAsync(db.registrarSalida(reg.id)).toBeRejected();
    });

    it('lanza si el registro no existe', async () => {
      await expectAsync(db.registrarSalida('no-existe')).toBeRejected();
    });
  });

  describe('cerrarEntradasAntiguas', () => {
    // Congelamos "ahora" al mediodía para que "hace N horas" siempre
    // caiga en el día actual (evita flake entre 00:00 y ~05:00 AM).
    const ahoraFijo = (() => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      return d;
    })();

    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(ahoraFijo);
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('cierra entradas que superan el umbral (entrada antigua hoy)', async () => {
      // Entrada abierta de hace 5h (hoy, supera el umbral de 4h)
      const hace5h = new Date(ahoraFijo.getTime() - 5 * 60 * 60 * 1000);
      await crearRegistroConFecha(db, '1000014', hace5h);

      const cerrados = await db.cerrarEntradasAntiguas(4);
      expect(cerrados).toBe(1);

      const abierta = await db.obtenerEntradaAbiertaHoy('1000014');
      // Ahora está cerrada → obtenerEntradaAbiertaHoy la filtra.
      expect(abierta).toBeNull();
    });

    it('no cierra entradas dentro del umbral', async () => {
      const hace1h = new Date(ahoraFijo.getTime() - 60 * 60 * 1000);
      await crearRegistroConFecha(db, '1000015', hace1h);
      const cerrados = await db.cerrarEntradasAntiguas(4);
      expect(cerrados).toBe(0);
    });

    it('no hace nada si horasUmbral <= 0 (feature off)', async () => {
      const hace10h = new Date(ahoraFijo.getTime() - 10 * 60 * 60 * 1000);
      await crearRegistroConFecha(db, '1000016', hace10h);
      const cerrados = await db.cerrarEntradasAntiguas(0);
      expect(cerrados).toBe(0);
    });
    it('marca la salida como estimada y la marca sobrevive a la confirmación (P3)', async () => {
      const hace5h = new Date(ahoraFijo.getTime() - 5 * 60 * 60 * 1000);
      const r = await crearRegistroConFecha(db, '1000017', hace5h);
      await db.marcarComoSincronizado('registros', r.id);

      await db.cerrarEntradasAntiguas(4);
      let guardado = (await db.obtenerTodosLosRegistros()).find(x => x.id === r.id)!;
      expect(guardado.salidaEstimada).toBe(true);
      expect(guardado.cierreAutomatico).toBe(true);
      // Ya estaba en la nube: el cierre tiene que volver a ofrecerse para subir.
      expect(guardado._syncStatus).toBe('pending');

      // Confirmar = "visto". La duración sigue siendo una suposición.
      await db.confirmarCierreAutomatico(r.id);
      guardado = (await db.obtenerTodosLosRegistros()).find(x => x.id === r.id)!;
      expect(guardado.cierreAutomatico).toBe(false);
      expect(guardado.salidaEstimada).toBe(true);
    });

    it('cierra la entrada de anoche que venció después de medianoche (v3.53.0)', async () => {
      // Ayer 21:30 + umbral 3 h = hoy 00:30. Antes solo se miraba "hoy" y
      // esta entrada quedaba abierta para siempre.
      const ayer2130 = new Date(ahoraFijo);
      ayer2130.setDate(ayer2130.getDate() - 1);
      ayer2130.setHours(21, 30, 0, 0);
      const r = await crearRegistroConFecha(db, '1000019', ayer2130);

      expect(await db.cerrarEntradasAntiguas(3)).toBe(1);
      const guardado = (await db.obtenerTodosLosRegistros()).find(x => x.id === r.id)!;
      expect(guardado.duracionMinutos).toBe(180);
      expect(guardado.salidaEstimada).toBe(true);
      // De un día anterior: Presencia no la mostraría, así que no queda pendiente de revisar.
      expect(guardado.cierreAutomatico).toBe(false);
    });

    it('no toca entradas de hace más de 7 días', async () => {
      const hace10d = new Date(ahoraFijo);
      hace10d.setDate(hace10d.getDate() - 10);
      await crearRegistroConFecha(db, '1000020', hace10d);
      expect(await db.cerrarEntradasAntiguas(3)).toBe(0);
    });

    it('corregir la salida a mano la vuelve real', async () => {
      const hace5h = new Date(ahoraFijo.getTime() - 5 * 60 * 60 * 1000);
      const r = await crearRegistroConFecha(db, '1000018', hace5h);
      await db.cerrarEntradasAntiguas(4);
      const corregido = await db.actualizarRegistroManual(r.id, {
        horaSalida: new Date(hace5h.getTime() + 45 * 60 * 1000),
      });
      expect(corregido.salidaEstimada).toBe(false);
      expect(corregido.duracionMinutos).toBe(45);
    });
  });

  describe('cerrarAlFinDelHorario (v3.57.0)', () => {
    const ahoraFijo = (() => { const d = new Date(); d.setHours(21, 0, 0, 0); return d; })();
    // Cierre fijo a las 20:00 cualquier día (la regla real vive en salidaAlCierre).
    const alCierre = (e: Date) => {
      const c = new Date(e); c.setHours(20, 0, 0, 0);
      return c > e && c.getTime() <= Date.now() ? c : null;
    };

    beforeEach(() => { jasmine.clock().install(); jasmine.clock().mockDate(ahoraFijo); });
    afterEach(() => jasmine.clock().uninstall());

    it('cierra a la hora de cierre, no al momento de la revisión, y queda por revisar si es de hoy', async () => {
      const hoy10 = new Date(ahoraFijo); hoy10.setHours(10, 0, 0, 0);
      const r = await crearRegistroConFecha(db, '1000040', hoy10);
      expect(await db.cerrarAlFinDelHorario(alCierre)).toBe(1);
      const g = (await db.obtenerTodosLosRegistros()).find(x => x.id === r.id)!;
      expect(new Date(g.horaSalida!).getHours()).toBe(20);
      expect(g.duracionMinutos).toBe(600);
      expect(g.salidaEstimada).toBeTrue();
      expect(g.cierreAutomatico).toBeTrue();
    });

    it('se pone al día con entradas de días anteriores (PC apagada a la hora de cierre)', async () => {
      const ayer10 = new Date(ahoraFijo); ayer10.setDate(ayer10.getDate() - 1); ayer10.setHours(10, 0, 0, 0);
      const r = await crearRegistroConFecha(db, '1000041', ayer10);
      expect(await db.cerrarAlFinDelHorario(alCierre)).toBe(1);
      const g = (await db.obtenerTodosLosRegistros()).find(x => x.id === r.id)!;
      expect(new Date(g.horaSalida!).getDate()).toBe(ayer10.getDate());
      expect(g.cierreAutomatico).toBeFalse();   // de un día anterior: ya confirmada
    });

    it('no toca entradas cuyo cierre todavía no llega ni las que ya tienen salida', async () => {
      await crearRegistroConFecha(db, '1000042', new Date(ahoraFijo.getTime() - 30 * 60_000)); // 20:30, entró tras el cierre
      const r = await crearRegistroConFecha(db, '1000043', new Date(ahoraFijo.getTime() - 5 * 3_600_000));
      await db.registrarSalida(r.id);
      expect(await db.cerrarAlFinDelHorario(alCierre)).toBe(0);
    });
  });

  describe('cambios que deben volver a subir a la nube', () => {
    it('desactivar un alumno ya sincronizado lo deja pendiente de subir', async () => {
      const a = await db.crearAlumno(nuevoAlumno('1000020'));
      await db.marcarComoSincronizado('alumnos', a.id!);
      await db.desactivarAlumno(a.id!);
      const guardado = await db.obtenerAlumnoPorMatricula('1000020');
      expect(guardado!.activo).toBe(false);
      expect(guardado!._syncStatus).toBe('pending');
    });

    it('editar un registro ya sincronizado lo deja pendiente de subir', async () => {
      const r = await crearRegistroConFecha(db, '1000021', new Date(2026, 2, 2, 10));
      await db.marcarComoSincronizado('registros', r.id);
      await db.actualizarRegistroManual(r.id, { motivoNombre: 'Pedir libro' });
      const guardado = (await db.obtenerTodosLosRegistros()).find(x => x.id === r.id)!;
      expect(guardado._syncStatus).toBe('pending');
    });
  });

  describe('obtenerAlumnoPorMatricula', () => {
    it('devuelve null si no existe', async () => {
      const a = await db.obtenerAlumnoPorMatricula('9999999');
      expect(a).toBeNull();
    });

    it('encuentra un alumno creado', async () => {
      await db.crearAlumno(nuevoAlumno('1000017'));
      const a = await db.obtenerAlumnoPorMatricula('1000017');
      expect(a).not.toBeNull();
      expect(a!.matricula).toBe('1000017');
    });
  });
  describe('crearAlumnosLote: el padrón en una sola transacción (v3.62.0)', () => {
    it('guarda todos y omite las matrículas que ya existen o se repiten en el archivo', async () => {
      await db.crearAlumno(nuevoAlumno('2299990001'));
      const r = await db.crearAlumnosLote([
        nuevoAlumno('2299990001'), nuevoAlumno('2299990002'), nuevoAlumno('2299990003'), nuevoAlumno('2299990002'),
      ]);
      expect(r).toEqual({ creados: 2, duplicados: 2 });
      expect((await db.obtenerTodosLosAlumnos()).map(a => a.matricula).sort())
        .toEqual(['2299990001', '2299990002', '2299990003']);
    });

    it('si una fila falla, no se guarda ninguna (no queda la importación a medias)', async () => {
      // Una función no se puede guardar en IndexedDB (DataCloneError):
      // falla la tercera escritura, después de dos que ya se habían hecho.
      const rota = { ...nuevoAlumno('2299990013'), datosExtra: { x: (() => 1) as unknown as string } };
      await expectAsync(db.crearAlumnosLote([
        nuevoAlumno('2299990011'), nuevoAlumno('2299990012'), rota, nuevoAlumno('2299990014'),
      ])).toBeRejected();
      expect(await db.obtenerTodosLosAlumnos()).toEqual([]);
    });

    it('volver a cargar el mismo archivo no duplica nada', async () => {
      const lote = [nuevoAlumno('2299990021'), nuevoAlumno('2299990022')];
      await db.crearAlumnosLote(lote);
      expect(await db.crearAlumnosLote(lote)).toEqual({ creados: 0, duplicados: 2 });
      expect((await db.obtenerTodosLosAlumnos()).length).toBe(2);
    });
  });
});
