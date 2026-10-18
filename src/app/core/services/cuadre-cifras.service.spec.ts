// ╔══════════════════════════════════════════════════════╗
// ║  cuadre-cifras.service.spec.ts                       ║
// ║  Stenbrary v3.57.0 — Autoverificación de cifras      ║
// ║  Base real (fake-indexeddb) + servicios reales: si    ║
// ║  todo cuadra, todo verde; si un camino se desvía,     ║
// ║  esa fila sale en rojo.                               ║
// ╚══════════════════════════════════════════════════════╝

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import { EstadisticasAvanzadasService } from './estadisticas-avanzadas.service';
import { CuadreCifrasService } from './cuadre-cifras.service';

describe('CuadreCifrasService', () => {
  let db: DatabaseService;
  let cuadre: CuadreCifrasService;
  let stats: EstadisticasAvanzadasService;

  beforeEach(async () => {
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    TestBed.configureTestingModule({});
    db = TestBed.inject(DatabaseService);
    stats = TestBed.inject(EstadisticasAvanzadasService);
    cuadre = TestBed.inject(CuadreCifrasService);
    await db.inicializar();

    const a = await db.crearAlumno({
      matricula: '2200000001', nombre: 'Ana', apellidoPaterno: 'P', apellidoMaterno: 'M',
      carrera: 'Derecho', grado: 1, grupo: 'A', turno: 'Matutino', activo: true,
    });
    await db.crearRegistro({ alumnoId: a.id!, matricula: '2200000001', nombreCompleto: 'Ana P M', carrera: 'Derecho', motivoId: 'm1', motivoNombre: 'Estudiar' });
    await db.crearRegistro({
      alumnoId: a.id!, matricula: '2200000001', nombreCompleto: 'Ana P M', carrera: 'Derecho', motivoId: 'm1', motivoNombre: 'Estudiar',
      motivoIds: ['m1', 'm2'], motivoNombres: ['Estudiar', 'Pedir libro'],
    });
    await db.crearRegistro({ alumnoId: 'inv', matricula: 'INVITADO', nombreCompleto: 'Visitante', carrera: 'Visitante', motivoId: 'm1', motivoNombre: 'Estudiar' });
  });

  it('con datos sanos todo cuadra, en los cuatro periodos', async () => {
    const r = await cuadre.verificar();
    expect(r.length).toBeGreaterThan(20);
    expect(r.filter(c => !c.ok)).toEqual([]);
    const hoy = r.find(c => c.periodo === 'Hoy' && c.descripcion.startsWith('Total'))!;
    expect(hoy.esperado).toBe(3);
  });

  it('si un camino se desvía, esa comprobación sale en rojo', async () => {
    spyOn(stats, 'analizarPorCarrera').and.resolveTo([]);
    const malas = (await cuadre.verificar()).filter(c => !c.ok);
    expect(malas.length).toBe(4);                          // una por periodo
    expect(malas.every(c => c.descripcion.includes('carrera'))).toBeTrue();
    expect(malas[0].esperado).toBe(3);
    expect(malas[0].obtenido).toBe(1);                     // solo el visitante
  });
});
