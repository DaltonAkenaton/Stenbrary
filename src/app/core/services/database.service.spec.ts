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

/**
 * Reemplaza el indexedDB global por una instancia fresca entre tests
 * para garantizar aislamiento total (la DB se recrea por test).
 */
function resetIndexedDB() {
  (globalThis as any).indexedDB = new IDBFactory();
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
});
