// ╔══════════════════════════════════════════════════════╗
// ║  estadisticas-avanzadas.service.spec.ts              ║
// ║  Stenbrary — Tests del motor de analítica            ║
// ║                                                      ║
// ║  Por qué existe:                                     ║
// ║  /estadisticas es la vista que el coordinador enseña ║
// ║  a directivos. Un número mal calculado ahí no rompe  ║
// ║  la app — se ve normal y es incorrecto. Es el peor   ║
// ║  tipo de bug: silencioso y con consecuencias.        ║
// ║                                                      ║
// ║  Estrategia: dataset sintético de distribución       ║
// ║  CONOCIDA sobre fechas fijas (no `hoy`), y se        ║
// ║  verifica que cada métrica devuelva el número que    ║
// ║  se puede contar a mano. Sin fechas relativas los    ║
// ║  tests no se rompen solos al pasar el tiempo.        ║
// ║                                                      ║
// ║  El DatabaseService va mockeado: aquí se prueba la   ║
// ║  ARITMÉTICA, no IndexedDB (eso ya lo cubre           ║
// ║  database.service.spec.ts).                          ║
// ╚══════════════════════════════════════════════════════╝

import { Injector, runInInjectionContext } from '@angular/core';
import { DatabaseService } from './database.service';
import {
  EstadisticasAvanzadasService,
  RangoFechas,
} from './estadisticas-avanzadas.service';
import { Alumno, Registro } from '../models';

// ═══════════════════════════════════════════════════════════
// DATASET SINTÉTICO
// ═══════════════════════════════════════════════════════════
// Semana ancla: lunes 2 de marzo de 2026 → domingo 8 de marzo.
// (2026-03-02 cae en lunes; verificado en el primer test.)
//
// Distribución que se puede contar a mano:
//
//   Lun 2  →  3 registros (10:00, 10:30, 10:45)
//   Mar 3  →  2 registros (14:00, 14:15)
//   Mié 4  →  1 registro  (10:00)
//   Jue 5  →  0
//   Vie 6  →  5 registros (10:00, 10:10, 10:20, 10:30, 21:00)
//   Sáb 7  →  0
//   Dom 8  →  0
//   ─────────────────────────────
//   TOTAL semana = 11 registros
//
// Semana previa (Lun 23 feb → Dom 1 mar) = 5 registros.
// Un registro suelto en enero para verificar que queda fuera de todo.

const ANCLA_LUNES = new Date(2026, 2, 2); // 2 de marzo de 2026

function fecha(dia: number, hora: number, minuto = 0): Date {
  return new Date(2026, 2, dia, hora, minuto, 0, 0);
}

function reg(
  id: string,
  matricula: string,
  carrera: string,
  motivoNombre: string,
  fechaHora: Date,
  extra: Partial<Registro> = {},
): Registro {
  return {
    id,
    alumnoId: `alumno-${matricula}`,
    matricula,
    nombreCompleto: `Alumno ${matricula}`,
    carrera,
    motivoId: `motivo-${motivoNombre}`,
    motivoNombre,
    fechaHora,
    sincronizado: false,
    ...extra,
  };
}

function alumno(matricula: string, nombre: string, carrera: string): Alumno {
  return {
    id: `alumno-${matricula}`,
    matricula,
    nombre,
    apellidoPaterno: 'Apellido',
    apellidoMaterno: 'Segundo',
    carrera,
    grado: 5,
    grupo: 'A',
    turno: 'Matutino',
    activo: true,
    fechaRegistro: new Date(2026, 0, 1),
    datosExtra: {},
  } as Alumno;
}

const ALUMNOS: Alumno[] = [
  alumno('2000000001', 'Ana', 'ISC'),
  alumno('2000000002', 'Beto', 'ISC'),
  alumno('2000000003', 'Caro', 'Derecho'),
  alumno('2000000004', 'Dani', 'Derecho'),
];

const REGISTROS: Registro[] = [
  // ── Semana ancla ──────────────────────────────────────────
  reg('r01', '2000000001', 'ISC', 'Estudiar', fecha(2, 10, 0)),
  reg('r02', '2000000002', 'ISC', 'Estudiar', fecha(2, 10, 30)),
  reg('r03', '2000000003', 'Derecho', 'Pedir libro', fecha(2, 10, 45)),
  reg('r04', '2000000001', 'ISC', 'Estudiar', fecha(3, 14, 0)),
  reg('r05', '2000000002', 'ISC', 'Investigación', fecha(3, 14, 15)),
  reg('r06', '2000000001', 'ISC', 'Estudiar', fecha(4, 10, 0)),
  reg('r07', '2000000001', 'ISC', 'Estudiar', fecha(6, 10, 0)),
  reg('r08', '2000000002', 'ISC', 'Pedir libro', fecha(6, 10, 10)),
  reg('r09', '2000000003', 'Derecho', 'Estudiar', fecha(6, 10, 20)),
  reg('r10', '2000000004', 'Derecho', 'Pedir libro', fecha(6, 10, 30)),
  // Invitado: NO tiene registro en `alumnos`. Sirve para verificar que el
  // top de alumnos no lo inventa ni truena al no encontrarlo.
  reg('r11', 'INVITADO', 'Visitante', 'Otro', fecha(6, 21, 0)),

  // ── Semana previa (para compararTendencias) ───────────────
  reg('p01', '2000000001', 'ISC', 'Estudiar', new Date(2026, 1, 24, 9, 0)),
  reg('p02', '2000000001', 'ISC', 'Estudiar', new Date(2026, 1, 24, 9, 5)),
  reg('p03', '2000000002', 'ISC', 'Estudiar', new Date(2026, 1, 24, 9, 10)),
  reg('p04', '2000000002', 'ISC', 'Estudiar', new Date(2026, 1, 25, 9, 0)),
  reg('p05', '2000000003', 'Derecho', 'Estudiar', new Date(2026, 1, 26, 9, 0)),

  // ── Muy fuera de rango ────────────────────────────────────
  reg('x01', '2000000001', 'ISC', 'Estudiar', new Date(2026, 0, 5, 10, 0)),
];

const MOTIVOS = [
  { id: 'motivo-Estudiar', nombre: 'Estudiar', icono: 'book', orden: 1, activo: true, color: '#AAAAAA' },
  { id: 'motivo-Pedir libro', nombre: 'Pedir libro', icono: 'menu_book', orden: 2, activo: true },
  // Desde v3.57.0 una actividad fuera del catálogo se marca "(actividad
  // eliminada)": el catálogo del mock tiene que traer todas las que usan los registros.
  { id: 'motivo-Investigación', nombre: 'Investigación', icono: 'search', orden: 3, activo: true },
  { id: 'motivo-Otro', nombre: 'Otro', icono: 'more_horiz', orden: 4, activo: true },
];

/** Mock mínimo: el servicio solo consume estos tres métodos. */
/** El servicio usa inject(): se crea en un injector con la BD doble. */
function crearServicio(db: unknown): EstadisticasAvanzadasService {
  const injector = Injector.create({ providers: [{ provide: DatabaseService, useValue: db }] });
  return runInInjectionContext(injector, () => new EstadisticasAvanzadasService());
}

function crearMockDb(registros: Registro[] = REGISTROS) {
  return {
    llamadasRegistros: 0,
    obtenerTodosLosRegistros(this: { llamadasRegistros: number }) {
      this.llamadasRegistros++;
      return Promise.resolve(registros.slice());
    },
    obtenerTodosLosAlumnos() {
      return Promise.resolve(ALUMNOS.slice());
    },
    obtenerTodosLosMotivos() {
      return Promise.resolve(MOTIVOS.slice());
    },
  };
}

describe('EstadisticasAvanzadasService', () => {
  let service: EstadisticasAvanzadasService;
  let mockDb: ReturnType<typeof crearMockDb>;
  let semana: RangoFechas;

  beforeEach(() => {
    mockDb = crearMockDb();
    service = crearServicio(mockDb);
    semana = service.normalizarRango(ANCLA_LUNES, new Date(2026, 2, 8));
  });

  // ═══════════════════════════════════════════════════════
  // PREMISA DEL DATASET
  // ═══════════════════════════════════════════════════════
  describe('premisa del dataset', () => {
    it('la fecha ancla es lunes (si esto falla, todo lo demás miente)', () => {
      expect(ANCLA_LUNES.getDay()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  // HELPERS DE RANGO
  // ═══════════════════════════════════════════════════════
  describe('helpers de rango', () => {
    it('normalizarRango abre en 00:00:00.000 y cierra en 23:59:59.999', () => {
      expect(semana.inicio.getHours()).toBe(0);
      expect(semana.inicio.getMinutes()).toBe(0);
      expect(semana.inicio.getMilliseconds()).toBe(0);
      expect(semana.fin.getHours()).toBe(23);
      expect(semana.fin.getMinutes()).toBe(59);
      expect(semana.fin.getMilliseconds()).toBe(999);
    });

    it('diasEnRango cuenta de forma inclusiva', () => {
      expect(service.diasEnRango(semana)).toBe(7);
      const unDia = service.normalizarRango(ANCLA_LUNES, ANCLA_LUNES);
      expect(service.diasEnRango(unDia)).toBe(1);
    });

    it('granularidadParaRango cambia de bucket en los umbrales correctos', () => {
      const rangoDe = (dias: number) =>
        service.normalizarRango(
          new Date(2026, 0, 1),
          new Date(2026, 0, 1 + (dias - 1)),
        );
      expect(service.granularidadParaRango(rangoDe(31))).toBe('dia');
      expect(service.granularidadParaRango(rangoDe(32))).toBe('semana');
      expect(service.granularidadParaRango(rangoDe(180))).toBe('semana');
      expect(service.granularidadParaRango(rangoDe(181))).toBe('mes');
    });

    it('rangoAnteriorMismaLongitud no se traslapa y cubre los mismos días de calendario', () => {
      const previo = service.rangoAnteriorMismaLongitud(semana, new Date(2026, 5, 1));
      // Termina justo antes de que empiece el actual: sin solapamiento ni hueco.
      expect(previo.fin.getTime()).toBe(semana.inicio.getTime() - 1);
      // Misma cantidad de DÍAS, no de milisegundos: la semana del 2 al 8 de
      // marzo de 2026 incluye el cambio de horario de la frontera (8 de marzo)
      // y dura una hora menos que la anterior.
      expect(service.diasEnRango(previo)).toBe(service.diasEnRango(semana));
      // Y cae exactamente en la semana previa: lunes 23 de febrero, 00:00.
      expect(previo.inicio.getDate()).toBe(23);
      expect(previo.inicio.getMonth()).toBe(1);
      expect(previo.inicio.getHours()).toBe(0);
    });

    it('con el período en curso, corta el anterior a la misma altura (P6)', () => {
      // Hoy es miércoles 4 de marzo a las 10:00; el rango "semana" llega hasta el domingo 8.
      const ahora = new Date(2026, 2, 4, 10, 0);
      const previo = service.rangoAnteriorMismaLongitud(semana, ahora);
      // Mismo avance una semana antes: hasta el miércoles 25 de febrero a las 10:00.
      expect(previo.fin.getDate()).toBe(25);
      expect(previo.fin.getMonth()).toBe(1);
      expect(previo.fin.getHours()).toBe(10);
      expect(previo.inicio.getDate()).toBe(23);
    });
  });

  // ═══════════════════════════════════════════════════════
  // FILTRADO
  // ═══════════════════════════════════════════════════════
  describe('filtrado por rango', () => {
    it('cuenta solo los registros dentro del rango', async () => {
      expect(await service.contarRegistrosEnRango(semana)).toBe(11);
    });

    it('incluye los registros que caen exactamente en los bordes', async () => {
      const bordes = [
        reg('b1', '2000000001', 'ISC', 'Estudiar', new Date(2026, 2, 2, 0, 0, 0, 0)),
        reg('b2', '2000000001', 'ISC', 'Estudiar', new Date(2026, 2, 8, 23, 59, 59, 999)),
        // Un milisegundo fuera por cada lado: deben quedar excluidos.
        reg('b3', '2000000001', 'ISC', 'Estudiar', new Date(2026, 2, 1, 23, 59, 59, 999)),
        reg('b4', '2000000001', 'ISC', 'Estudiar', new Date(2026, 2, 9, 0, 0, 0, 0)),
      ];
      const svc = crearServicio(crearMockDb(bordes));
      expect(await svc.contarRegistrosEnRango(semana)).toBe(2);
    });

    it('el filtro horario acota por hora del día', async () => {
      // Solo los dos registros de las 14:xx del martes.
      const total = await service.contarRegistrosEnRango(semana, { desde: 14, hasta: 15 });
      expect(total).toBe(2);
    });

    it('tolera fechaHora serializada como string (registros viejos)', async () => {
      // IndexedDB tiene registros antiguos con fechaHora en ISO string —
      // por eso DatabaseService conserva el fallback getAll()+filter.
      // La analítica tiene que sobrevivir a los mismos datos.
      const conStrings = [
        reg('s1', '2000000001', 'ISC', 'Estudiar',
            new Date(2026, 2, 3, 10, 0).toISOString() as unknown as Date),
        reg('s2', '2000000001', 'ISC', 'Estudiar',
            new Date(2026, 0, 3, 10, 0).toISOString() as unknown as Date),
      ];
      const svc = crearServicio(crearMockDb(conStrings));
      expect(await svc.contarRegistrosEnRango(semana)).toBe(1);
    });

    it('la búsqueda binaria da lo mismo que recorrer todo (fechas repetidas, inválidas y desordenadas)', async () => {
      // El índice por fecha de la caché (prueba de volumen 2026-10) no puede
      // cambiar ni un conteo: se compara contra el filtro lineal de siempre.
      const base = new Date(2026, 2, 1).getTime();
      const regs: Registro[] = [];
      for (let i = 0; i < 400; i++) {
        // Paso de 37 min sobre ~10 días, mezclado; cada 5.º repite el anterior.
        const t = base + ((i * 7919) % 400) * 37 * 60_000;
        regs.push(reg(`q${i}`, '2000000001', 'ISC', 'Estudiar', new Date(i % 5 === 0 && i > 0 ? t - 37 * 60_000 : t)));
      }
      regs.push(reg('nan1', '2000000001', 'ISC', 'Estudiar', new Date('basura')));
      regs.push(reg('nan2', '2000000001', 'ISC', 'Estudiar', 'tampoco' as unknown as Date));
      const svc = crearServicio(crearMockDb(regs));

      const lineal = (r: RangoFechas, h?: { desde: number; hasta: number }) => regs.filter(x => {
        const d = new Date(x.fechaHora);
        const t = d.getTime();
        if (!(t >= r.inicio.getTime() && t <= r.fin.getTime())) return false;
        return !h || (d.getHours() >= h.desde && d.getHours() <= h.hasta);
      }).map(x => x.id).sort();

      const rangos: RangoFechas[] = [
        svc.normalizarRango(new Date(2026, 2, 3), new Date(2026, 2, 5)),
        { inicio: new Date(regs[10].fechaHora), fin: new Date(regs[20].fechaHora) }, // bordes exactos
        svc.normalizarRango(new Date(2025, 0, 1), new Date(2027, 0, 1)),            // todo
        svc.normalizarRango(new Date(2030, 0, 1), new Date(2030, 0, 2)),            // nada
      ];
      for (const r of rangos) {
        for (const h of [undefined, { desde: 9, hasta: 13 }]) {
          const ids = (await svc.obtenerRegistrosCrudos(r, h)).map(x => x.id).sort();
          expect(ids).toEqual(lineal(r, h));
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // BUCKETING PARA GRÁFICAS
  // ═══════════════════════════════════════════════════════
  describe('obtenerRegistrosPorRango (barras)', () => {
    it('agrupa por día y respeta los días vacíos', async () => {
      const datos = await service.obtenerRegistrosPorRango(semana);
      expect(datos.granularidad).toBe('dia');
      expect(datos.etiquetas.length).toBe(7);
      expect(datos.cantidades).toEqual([3, 2, 1, 0, 5, 0, 0]);
    });

    it('la suma de los buckets es igual al total del rango', async () => {
      const datos = await service.obtenerRegistrosPorRango(semana);
      const suma = datos.cantidades.reduce((a, b) => a + b, 0);
      expect(suma).toBe(await service.contarRegistrosEnRango(semana));
    });

    it('etiquetas y cantidades siempre tienen la misma longitud', async () => {
      // Si se desalinean, la gráfica pinta valores bajo la etiqueta equivocada
      // — un error que se ve perfectamente normal en pantalla.
      for (const dias of [7, 45, 400]) {
        const rango = service.normalizarRango(
          new Date(2026, 0, 1),
          new Date(2026, 0, 1 + (dias - 1)),
        );
        const datos = await service.obtenerRegistrosPorRango(rango);
        expect(datos.etiquetas.length).toBe(datos.cantidades.length);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // TENDENCIAS
  // ═══════════════════════════════════════════════════════
  describe('compararTendencias', () => {
    it('compara contra el período previo de la misma longitud', async () => {
      const t = await service.compararTendencias(semana);
      expect(t.actual).toBe(11);
      expect(t.anterior).toBe(5);
      expect(t.cambio).toBe(6);
      expect(t.porcentajeCambio).toBeCloseTo(120, 5);
      expect(t.direccion).toBe('up');
    });

    it('no devuelve Infinity ni NaN cuando el período previo está vacío', async () => {
      // División por cero: el caso de la primera semana de uso del sistema.
      const enero = service.normalizarRango(new Date(2026, 0, 5), new Date(2026, 0, 5));
      const t = await service.compararTendencias(enero);
      expect(t.anterior).toBe(0);
      expect(Number.isFinite(t.porcentajeCambio)).toBe(true);
      expect(t.porcentajeCambio).toBe(0);
    });

    it('marca sinReferencia cuando antes hubo 0 y ahora no, para que la UI no diga "↑ 0 %"', async () => {
      // El 5 de enero tiene 1 registro (x01) y el 4 de enero ninguno.
      const enero = service.normalizarRango(new Date(2026, 0, 5), new Date(2026, 0, 5));
      const t = await service.compararTendencias(enero);
      expect(t.actual).toBe(1);
      expect(t.sinReferencia).toBe(true);

      const conBase = await service.compararTendencias(semana);
      expect(conBase.sinReferencia).toBe(false);

      // 0 contra 0 no es "nuevo": es "sin cambios".
      const vacio = service.normalizarRango(new Date(2025, 5, 1), new Date(2025, 5, 7));
      expect((await service.compararTendencias(vacio)).sinReferencia).toBe(false);
    });

    it('el comparador corta el período completo al avance del que sigue en curso (P6)', async () => {
      // A = semana del 2 al 8 de marzo, consultada el miércoles 4 a las 10:00.
      // B = semana anterior completa. Sin corte serían 6 contra 5: A parecería
      // apenas +20 % con medio período por delante.
      const ahora = new Date(2026, 2, 4, 10, 0);
      const semanaPrevia = service.normalizarRango(new Date(2026, 1, 23), new Date(2026, 2, 1));
      const c = await service.compararDosRangos(semana, semanaPrevia, null, ahora);
      // A hasta ahora: lun 2 (3) + mar 3 (2) + mié 4 10:00 (1) = 6.
      expect(c.a.totalRegistros).toBe(6);
      // B hasta el miércoles 25 a las 10:00: mar 24 (3) + mié 25 9:00 (1) = 4.
      expect(c.b.totalRegistros).toBe(4);
      expect(c.corte?.slot).toBe('b');
      expect(c.corte?.hasta.getDate()).toBe(25);
      // Promedio por día CON ACTIVIDAD (P4): 6 visitas en 3 días.
      expect(c.a.promedioPorDia).toBe(2);
      expect(c.a.diasConActividad).toBe(3);
    });

    it('dos períodos ya cerrados se comparan completos', async () => {
      const semanaPrevia = service.normalizarRango(new Date(2026, 1, 23), new Date(2026, 2, 1));
      const c = await service.compararDosRangos(semana, semanaPrevia, null, new Date(2026, 5, 1));
      expect(c.corte).toBeNull();
      expect(c.a.totalRegistros).toBe(11);
      expect(c.b.totalRegistros).toBe(5);
    });

    it('el comparador A vs B también marca sinReferencia si B está vacío', async () => {
      const vacioB = service.normalizarRango(new Date(2025, 5, 1), new Date(2025, 5, 7));
      const c = await service.compararDosRangos(semana, vacioB);
      expect(c.diferencia.sinReferencia).toBe(true);
      expect((await service.compararDosRangos(semana, semana)).diferencia.sinReferencia).toBe(false);
    });

    it('marca dirección "igual" cuando no hay cambio', async () => {
      const vacio = service.normalizarRango(new Date(2025, 5, 1), new Date(2025, 5, 7));
      const t = await service.compararTendencias(vacio);
      expect(t.cambio).toBe(0);
      expect(t.direccion).toBe('igual');
    });
  });

  // ═══════════════════════════════════════════════════════
  // MOTIVOS
  // ═══════════════════════════════════════════════════════
  describe('obtenerDistribucionMotivos', () => {
    it('ordena de mayor a menor y suma el total del rango', async () => {
      const d = await service.obtenerDistribucionMotivos(semana);
      expect(d.etiquetas[0]).toBe('Estudiar');
      expect(d.cantidades[0]).toBe(6);
      expect(d.etiquetas[1]).toBe('Pedir libro');
      expect(d.cantidades[1]).toBe(3);
      expect(d.cantidades.reduce((a, b) => a + b, 0)).toBe(11);
    });

    it('los tres arrays quedan alineados', async () => {
      const d = await service.obtenerDistribucionMotivos(semana);
      expect(d.etiquetas.length).toBe(d.cantidades.length);
      expect(d.etiquetas.length).toBe(d.colores.length);
    });

    it('usa el color del motivo si existe y la paleta si no', async () => {
      const d = await service.obtenerDistribucionMotivos(semana);
      expect(d.colores[0]).toBe('#AAAAAA'); // Estudiar trae color propio
      expect(d.colores[1]).toBeTruthy();    // Pedir libro cae en la paleta
    });

    it('CONTRATO: cada motivo de una visita suma (decisión P2, 2026-10-06)', async () => {
      // Antes este test fijaba lo contrario —solo contaba el principal— y
      // avisaba que trondría el día que se decidiera contar todos. Ese día
      // llegó: el usuario decidió que una visita con dos motivos suma un
      // punto a cada uno. Las cantidades pueden sumar más que las visitas;
      // por eso `totalVisitas` viaja aparte como denominador.
      const multi = [
        reg('m1', '2000000001', 'ISC', 'Estudiar', fecha(3, 10, 0), {
          motivoIds: ['motivo-Estudiar', 'motivo-Investigación'],
          motivoNombres: ['Estudiar', 'Investigación'],
        }),
      ];
      const svc = crearServicio(crearMockDb(multi));
      const d = await svc.obtenerDistribucionMotivos(semana);
      expect(d.etiquetas).toEqual(['Estudiar', 'Investigación']);
      expect(d.cantidades).toEqual([1, 1]);
      expect(d.totalVisitas).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  // TOP ALUMNOS
  // ═══════════════════════════════════════════════════════
  describe('obtenerTopAlumnos', () => {
    it('ordena por visitas y calcula el motivo más frecuente', async () => {
      const top = await service.obtenerTopAlumnos(10, undefined, semana);
      expect(top.length).toBe(4);
      expect(top[0].alumno.matricula).toBe('2000000001');
      expect(top[0].totalVisitas).toBe(4);
      expect(top[0].motivoFrecuente).toBe('Estudiar');
      expect(top[1].totalVisitas).toBe(3);
      expect(top[3].totalVisitas).toBe(1);
    });

    it('omite matrículas sin alumno registrado (invitados)', async () => {
      const top = await service.obtenerTopAlumnos(10, undefined, semana);
      expect(top.some(t => t.alumno.matricula === 'INVITADO')).toBe(false);
    });

    it('respeta el límite', async () => {
      const top = await service.obtenerTopAlumnos(2, undefined, semana);
      expect(top.length).toBe(2);
    });

    it('la última visita es la más reciente del rango', async () => {
      const top = await service.obtenerTopAlumnos(10, undefined, semana);
      const ana = top.find(t => t.alumno.matricula === '2000000001')!;
      expect(ana.ultimaVisita.getDate()).toBe(6); // viernes 6, no el registro de enero
      expect(ana.ultimaVisita.getMonth()).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════
  // CARRERAS
  // ═══════════════════════════════════════════════════════
  describe('analizarPorCarrera', () => {
    it('cuenta visitas totales y alumnos únicos por separado', async () => {
      const carreras = await service.analizarPorCarrera(semana);
      const isc = carreras.find(c => c.carrera === 'ISC')!;
      expect(isc.totalVisitas).toBe(7);
      expect(isc.alumnosActivos).toBe(2);
      expect(isc.promedioVisitasPorAlumno).toBe(3.5);

      const derecho = carreras.find(c => c.carrera === 'Derecho')!;
      expect(derecho.totalVisitas).toBe(3);
      expect(derecho.alumnosActivos).toBe(2);
      expect(derecho.promedioVisitasPorAlumno).toBe(1.5);
    });

    it('ordena de mayor a menor por visitas', async () => {
      const carreras = await service.analizarPorCarrera(semana);
      expect(carreras[0].carrera).toBe('ISC');
      for (let i = 1; i < carreras.length; i++) {
        expect(carreras[i - 1].totalVisitas).toBeGreaterThanOrEqual(carreras[i].totalVisitas);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // HEATMAP
  // ═══════════════════════════════════════════════════════
  describe('generarHeatmap', () => {
    it('cubre 7 días × las horas del rango, sin huecos', async () => {
      const h = await service.generarHeatmap(30, semana);
      expect(h.horas).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
      expect(h.data.length).toBe(7 * h.horas.length);
    });

    it('la suma de las celdas es el total de registros del rango', async () => {
      const h = await service.generarHeatmap(30, semana);
      const suma = h.data.reduce((a, c) => a + c.cantidad, 0);
      expect(suma).toBe(11);
    });

    it('ensancha el rango horario si hay registros fuera de 7–21', async () => {
      // Biblioteca con evento nocturno: si no se expandiera, esos registros
      // desaparecerían de la gráfica sin aviso.
      const nocturno = [
        reg('n1', '2000000001', 'ISC', 'Estudiar', fecha(3, 23, 0)),
        reg('n2', '2000000001', 'ISC', 'Estudiar', fecha(3, 5, 0)),
      ];
      const svc = crearServicio(crearMockDb(nocturno));
      const h = await svc.generarHeatmap(30, semana);
      expect(h.horas[0]).toBe(5);
      expect(h.horas[h.horas.length - 1]).toBe(23);
      const suma = h.data.reduce((a, c) => a + c.cantidad, 0);
      expect(suma).toBe(2);
    });

    it('fechasPorDia asigna cada fecha del rango a su día de la semana', async () => {
      const h = await service.generarHeatmap(30, semana);
      const lunes = h.fechasPorDia.get('Lunes')!;
      expect(lunes.length).toBe(1);
      expect(lunes[0].getDate()).toBe(2);
    });
  });

  describe('hora pico y día ocupado', () => {
    it('calcularHoraPicoEnRango devuelve null sin registros', () => {
      expect(service.calcularHoraPicoEnRango([])).toBeNull();
    });

    it('encuentra la celda día+hora con más visitas', async () => {
      const registros = await service.obtenerRegistrosCrudos(semana);
      const pico = service.calcularHoraPicoEnRango(registros)!;
      expect(pico.dia).toBe('Viernes');
      expect(pico.hora).toBe(10);
      expect(pico.cantidad).toBe(4);
    });

    it('predecirDiaOcupadoDesde elige el día con más visitas totales', async () => {
      const h = await service.generarHeatmap(30, semana);
      expect(service.predecirDiaOcupadoDesde(h)).toBe('Viernes');
    });

    it('predecirDiaOcupadoDesde devuelve cadena vacía si no hay datos', async () => {
      const svc = crearServicio(crearMockDb([]));
      const h = await svc.generarHeatmap(30, semana);
      expect(svc.predecirDiaOcupadoDesde(h)).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════
  // CACHÉ
  // ═══════════════════════════════════════════════════════
  describe('caché de registros', () => {
    it('las llamadas concurrentes comparten una sola query', async () => {
      // El dashboard dispara ~8 métricas a la vez al montar. Sin la promesa
      // en vuelo compartida serían 8 lecturas completas de IndexedDB.
      await Promise.all([
        service.contarRegistrosEnRango(semana),
        service.obtenerRegistrosPorRango(semana),
        service.analizarPorCarrera(semana),
        service.generarHeatmap(30, semana),
      ]);
      expect(mockDb.llamadasRegistros).toBe(1);
    });

    it('invalidarCache fuerza una relectura', async () => {
      await service.contarRegistrosEnRango(semana);
      expect(mockDb.llamadasRegistros).toBe(1);
      await service.contarRegistrosEnRango(semana);
      expect(mockDb.llamadasRegistros).toBe(1); // sirvió del caché

      service.invalidarCache();
      await service.contarRegistrosEnRango(semana);
      expect(mockDb.llamadasRegistros).toBe(2);
    });

    it('una escritura en la BD descarta la caché aunque no haya vencido el TTL', async () => {
      // Antes: volver del escáner a /estadisticas mostraba hasta 5 min de
      // datos viejos porque nadie invalidaba (auditoría 2026-10, R3).
      let version = 0;
      const db = { ...crearMockDb(), llamadasRegistros: 0, versionDatos: () => version };
      const svc = crearServicio(db);

      await svc.contarRegistrosEnRango(semana);
      await svc.contarRegistrosEnRango(semana);
      expect(db.llamadasRegistros).toBe(1);

      version++; // p. ej. se escaneó un alumno
      await svc.contarRegistrosEnRango(semana);
      expect(db.llamadasRegistros).toBe(2);

      await svc.contarRegistrosEnRango(semana);
      expect(db.llamadasRegistros).toBe(2); // sin más cambios, vuelve a servir de caché
    });
  });

  describe('crearRangoHistorico', () => {
    it('ignora fechas inválidas en vez de dejar todo el histórico en 0', async () => {
      const conBasura = [
        ...REGISTROS,
        reg('bad', '2000000001', 'ISC', 'Estudiar', new Date('no-es-fecha')),
      ];
      const svc = crearServicio(crearMockDb(conBasura));
      const rango = await svc.crearRangoHistorico();
      expect(Number.isFinite(rango.inicio.getTime())).toBe(true);
      // El registro más viejo válido es x01, del 5 de enero.
      expect(rango.inicio.getTime()).toBe(new Date(2026, 0, 5).getTime());
      expect(await svc.contarRegistrosEnRango(rango)).toBe(REGISTROS.length);
    });
  });

  // ═══════════════════════════════════════════════════════
  // ROBUSTEZ CON DATOS VACÍOS
  // ═══════════════════════════════════════════════════════
  describe('sistema recién instalado (cero registros)', () => {
    let vacio: EstadisticasAvanzadasService;

    beforeEach(() => {
      vacio = crearServicio(crearMockDb([]));
    });

    it('ninguna métrica truena ni devuelve NaN', async () => {
      expect(await vacio.contarRegistrosEnRango(semana)).toBe(0);

      const barras = await vacio.obtenerRegistrosPorRango(semana);
      expect(barras.cantidades.every(c => c === 0)).toBe(true);

      const motivos = await vacio.obtenerDistribucionMotivos(semana);
      expect(motivos.etiquetas).toEqual([]);

      const top = await vacio.obtenerTopAlumnos(10, undefined, semana);
      expect(top).toEqual([]);

      const carreras = await vacio.analizarPorCarrera(semana);
      expect(carreras).toEqual([]);

      const t = await vacio.compararTendencias(semana);
      expect(Number.isFinite(t.porcentajeCambio)).toBe(true);
    });
  });
});
