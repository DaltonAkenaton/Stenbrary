// ╔══════════════════════════════════════════════════════╗
// ║  estadisticas.utils.spec.ts                           ║
// ║  Definiciones únicas de métricas (auditoría 2026-10)   ║
// ║                                                       ║
// ║  Cada describe fija una decisión de producto (P1–P8   ║
// ║  de docs/AUDITORIA-2026-10.md) con datos contados a    ║
// ║  mano. Si un test truena, alguien cambió una           ║
// ║  definición: que sea a propósito.                      ║
// ╚══════════════════════════════════════════════════════╝

import { Alumno, Motivo, Registro } from '../models';
import {
  calcularInactividad,
  rangoAnteriorDeUnidad,
  combinacionesDeMotivos,
  conteoMensual,
  cuartilesDeCeldas,
  distribucionPorGrado,
  distribucionPorTurno,
  mesAnteriorAlMismoDia,
  nivelDeIntensidad,
  resumirCrecimiento,
  tasaRetencion,
  umbralRetencionPara,
  variacionDiaria,
  contarMotivos,
  diaSemanaMasConcurrido,
  diasConActividad,
  duracionReal,
  incluyeMotivo,
  promedioPorDiaConActividad,
  proyectarCierreHoy,
  resumirEstancia,
} from './estadisticas.utils';

let seq = 0;
function reg(fechaHora: Date, extra: Partial<Registro> = {}): Registro {
  seq++;
  return {
    id: `r${seq}`,
    alumnoId: 'a1',
    matricula: '2000000001',
    nombreCompleto: 'Ana',
    carrera: 'ISC',
    motivoId: 'm-estudiar',
    motivoNombre: 'Estudiar',
    fechaHora,
    sincronizado: false,
    ...extra,
  };
}

function alumno(matricula: string, extra: Partial<Alumno> = {}): Alumno {
  return {
    id: `a-${matricula}`, matricula, nombre: 'N', apellidoPaterno: 'P', apellidoMaterno: 'M',
    carrera: 'ISC', grado: 1, grupo: 'A', turno: 'Matutino', activo: true,
    fechaRegistro: new Date(2026, 0, 1), datosExtra: {}, ...extra,
  } as Alumno;
}

describe('estadisticas.utils', () => {
  // ─── P3 ───────────────────────────────────────────────
  describe('P3 — duraciones reales', () => {
    const real = reg(new Date(2026, 2, 2, 10), { horaSalida: new Date(2026, 2, 2, 11), duracionMinutos: 60 });
    const estimada = reg(new Date(2026, 2, 2, 10), {
      horaSalida: new Date(2026, 2, 2, 14), duracionMinutos: 240, salidaEstimada: true,
    });
    // Cierre automático anterior a v3.42.0: aún sin la marca permanente.
    const pendienteViejo = reg(new Date(2026, 2, 2, 10), {
      horaSalida: new Date(2026, 2, 2, 14), duracionMinutos: 240, cierreAutomatico: true,
    });
    const abierta = reg(new Date(2026, 2, 2, 10));

    it('solo cuenta como estancia la salida registrada por una persona', () => {
      expect(duracionReal(real)).toBe(60);
      expect(duracionReal(estimada)).toBeNull();
      expect(duracionReal(pendienteViejo)).toBeNull();
      expect(duracionReal(abierta)).toBeNull();
    });

    it('el promedio ignora las estimadas y dice cuántas dejó fuera', () => {
      const r = resumirEstancia([real, estimada, pendienteViejo, abierta]);
      // Con las estimadas el promedio sería (60+240+240)/3 = 180 min: el triple.
      expect(r.promedioMinutos).toBe(60);
      expect(r.totalMinutos).toBe(60);
      expect(r.visitasMedidas).toBe(1);
      expect(r.visitasEstimadas).toBe(2);
    });
  });

  // ─── P2 ───────────────────────────────────────────────
  describe('P2 — motivos', () => {
    const catalogo: Motivo[] = [
      { id: 'm-estudiar', nombre: 'Estudio individual', icono: 'book', orden: 1, activo: true, color: '#111111' },
      { id: 'm-libro', nombre: 'Pedir libro', icono: 'book', orden: 2, activo: true },
    ];

    it('una visita con dos motivos suma un punto a cada uno', () => {
      const r = contarMotivos([
        reg(new Date(2026, 2, 2), {
          motivoIds: ['m-estudiar', 'm-libro'], motivoNombres: ['Estudiar', 'Pedir libro'],
        }),
        reg(new Date(2026, 2, 3)),
      ], catalogo);
      expect(r.map(c => [c.clave, c.cantidad])).toEqual([['m-estudiar', 2], ['m-libro', 1]]);
    });

    it('agrupa por id y muestra el nombre actual: renombrar no parte la estadística', () => {
      // Los registros guardaron "Estudiar"; el motivo hoy se llama "Estudio individual".
      const r = contarMotivos([reg(new Date(2026, 2, 2)), reg(new Date(2026, 2, 3))], catalogo);
      expect(r.length).toBe(1);
      expect(r[0].nombre).toBe('Estudio individual');
      expect(r[0].cantidad).toBe(2);
      expect(r[0].color).toBe('#111111');
    });

    it('un motivo repetido dentro de la misma visita cuenta una sola vez', () => {
      const r = contarMotivos([reg(new Date(2026, 2, 2), {
        motivoIds: ['m-estudiar', 'm-estudiar'], motivoNombres: ['Estudiar', 'Estudiar'],
      })]);
      expect(r[0].cantidad).toBe(1);
    });

    it('sin catálogo usa el nombre guardado en el registro', () => {
      expect(contarMotivos([reg(new Date(2026, 2, 2))])[0].nombre).toBe('Estudiar');
    });

    it('el filtro por motivo encuentra también los secundarios', () => {
      const multi = reg(new Date(2026, 2, 2), {
        motivoIds: ['m-estudiar', 'm-libro'], motivoNombres: ['Estudiar', 'Pedir libro'],
      });
      expect(incluyeMotivo(multi, 'Pedir libro')).toBe(true);
      expect(incluyeMotivo(reg(new Date(2026, 2, 2)), 'Pedir libro')).toBe(false);
    });
  });

  // ─── P4 / O3 ──────────────────────────────────────────
  describe('P4 — días con actividad', () => {
    it('divide entre los días que hubo registros, no entre días naturales', () => {
      // 6 visitas en 2 días distintos dentro de una semana de 7.
      const regs = [
        reg(new Date(2026, 2, 2, 9)), reg(new Date(2026, 2, 2, 10)), reg(new Date(2026, 2, 2, 23, 59)),
        reg(new Date(2026, 2, 5, 9)), reg(new Date(2026, 2, 5, 10)), reg(new Date(2026, 2, 5, 11)),
      ];
      expect(diasConActividad(regs)).toBe(2);
      expect(promedioPorDiaConActividad(regs)).toEqual({ promedio: 3, dias: 2 });
    });

    it('sin registros el promedio es 0, no NaN', () => {
      expect(promedioPorDiaConActividad([])).toEqual({ promedio: 0, dias: 0 });
    });

    it('el día más concurrido se decide por promedio, no por suma', () => {
      // Marzo 2026: martes 3, 10, 17, 24, 31 (5) con 2 visitas cada uno = 10;
      // lunes 2, 9, 16 (3) con 3 visitas cada uno = 9. Sumando gana el martes;
      // en promedio (3 contra 2) gana el lunes, que es lo verdadero.
      const regs: Registro[] = [];
      for (const d of [3, 10, 17, 24, 31]) for (let i = 0; i < 2; i++) regs.push(reg(new Date(2026, 2, d, 10 + i)));
      for (const d of [2, 9, 16]) for (let i = 0; i < 3; i++) regs.push(reg(new Date(2026, 2, d, 10 + i)));
      expect(diaSemanaMasConcurrido(regs)).toBe(1); // lunes
      expect(diaSemanaMasConcurrido([])).toBeNull();
    });
  });

  // ─── P1 ───────────────────────────────────────────────
  describe('P1 — inactividad', () => {
    const ahora = new Date(2026, 9, 31, 15, 0);
    const alumnos = [
      alumno('1'), // última visita hace exactamente 30 días
      alumno('2'), // vino ayer
      alumno('3'), // nunca vino
      alumno('4', { activo: false }), // desactivado: no cuenta en nada
      alumno('5'), // hace 29 días, a última hora
    ];
    const registros = [
      reg(new Date(2026, 9, 1, 8, 0), { matricula: '1' }),
      reg(new Date(2026, 9, 30, 20, 0), { matricula: '2' }),
      reg(new Date(2025, 0, 1), { matricula: '4' }),
      reg(new Date(2026, 9, 2, 21, 59), { matricula: '5' }),
    ];

    it('inactivo = vino alguna vez y lleva el umbral o más en días de calendario', () => {
      const r = calcularInactividad(alumnos, registros, 30, ahora);
      expect(r.inactivos.map(i => i.alumno.matricula)).toEqual(['1']);
      expect(r.inactivos[0].diasSinVenir).toBe(30);
    });

    it('los que nunca vinieron van aparte y los desactivados no aparecen', () => {
      const r = calcularInactividad(alumnos, registros, 30, ahora);
      expect(r.nuncaVinieron.map(i => i.alumno.matricula)).toEqual(['3']);
      expect([...r.inactivos, ...r.nuncaVinieron].some(i => i.alumno.matricula === '4')).toBe(false);
    });

    it('el resultado no cambia según la hora de la consulta', () => {
      // Con bloques de 24 h, el alumno 5 pasaba de 28 a 29 días a las 21:59.
      const temprano = calcularInactividad(alumnos, registros, 29, new Date(2026, 9, 31, 7, 0));
      const tarde = calcularInactividad(alumnos, registros, 29, new Date(2026, 9, 31, 23, 0));
      expect(temprano.inactivos.map(i => i.alumno.matricula))
        .toEqual(tarde.inactivos.map(i => i.alumno.matricula));
    });
  });

  // ─── P8 ───────────────────────────────────────────────
  describe('P8 — proyección del día', () => {
    // Martes 6 de octubre de 2026, 12:00. Historial: 6 martes anteriores,
    // cada uno con 4 visitas a las 9:00 y 6 a las 15:00 (10 en total).
    const ahora = new Date(2026, 9, 6, 12, 0);
    function historial(martes: number): Registro[] {
      const regs: Registro[] = [];
      for (let k = 1; k <= martes; k++) {
        const d = new Date(2026, 9, 6 - 7 * k);
        for (let i = 0; i < 4; i++) regs.push(reg(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, i)));
        for (let i = 0; i < 6; i++) regs.push(reg(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 15, i)));
      }
      return regs;
    }
    const hoy = (n: number) => Array.from({ length: n }, (_, i) => reg(new Date(2026, 9, 6, 9, i)));

    it('extrapola con la fracción del día que suele haber llegado a esta hora', () => {
      // A las 12:00 los martes llevan 4 de 10 (40 %). Hoy van 8 → ~20.
      const p = proyectarCierreHoy([...historial(6), ...hoy(8)], ahora)!;
      expect(p.fraccionTipica).toBeCloseTo(0.4, 5);
      expect(p.total).toBe(20);
      expect(p.diasBase).toBe(6);
      expect(p.confianza).toBe('alta'); // los 6 martes fueron idénticos
    });

    it('no proyecta sin al menos 4 días comparables', () => {
      expect(proyectarCierreHoy([...historial(3), ...hoy(8)], ahora)).toBeNull();
    });

    it('no proyecta si hoy no hay visitas o si a esta hora normalmente no llega nadie', () => {
      expect(proyectarCierreHoy(historial(6), ahora)).toBeNull();
      expect(proyectarCierreHoy([...historial(6), ...hoy(3)], new Date(2026, 9, 6, 8, 0))).toBeNull();
    });

    it('nunca proyecta menos de lo que ya llegó', () => {
      const p = proyectarCierreHoy([...historial(6), ...hoy(8)], new Date(2026, 9, 6, 23, 0))!;
      expect(p.total).toBeGreaterThanOrEqual(8);
    });
  });

  // ─── Tanda 3: métricas que antes vivían en el componente ───
  describe('retención', () => {
    it('el mínimo de visitas crece con el largo del período', () => {
      expect(umbralRetencionPara(7)).toBe(2);
      expect(umbralRetencionPara(30)).toBe(3);
      expect(umbralRetencionPara(90)).toBe(5);
      expect(umbralRetencionPara(365)).toBe(8);
    });

    it('% de alumnos que vinieron el mínimo o más, sin invitados', () => {
      const regs = [
        ...[1, 2, 3].map(d => reg(new Date(2026, 2, d), { matricula: 'A' })), // 3 visitas
        reg(new Date(2026, 2, 1), { matricula: 'B' }),                       // 1 visita
        ...[1, 2, 3, 4].map(d => reg(new Date(2026, 2, d), { matricula: 'INVITADO' })),
      ];
      expect(tasaRetencion(regs, 3)).toEqual({ porcentaje: 50, recurrentes: 1, unicos: 2, umbral: 3 });
      expect(tasaRetencion([], 3).porcentaje).toBe(0);
    });
  });

  describe('distribuciones de alumnos (P5)', () => {
    it('turno: usa el del registro y, si falta, el del alumno; sin invitados', () => {
      const regs = [
        reg(new Date(2026, 2, 1), { matricula: 'A', turno: 'Matutino' }),
        reg(new Date(2026, 2, 1), { matricula: 'B' }), // viejo, sin turno guardado
        reg(new Date(2026, 2, 1), { matricula: 'INVITADO' }),
      ];
      const r = distribucionPorTurno(regs, m => (m === 'B' ? 'Vespertino' : undefined));
      expect(r.map(t => [t.clave, t.cantidad, t.porcentaje])).toEqual([
        ['Matutino', 1, 50], ['Vespertino', 1, 50],
      ]);
    });

    it('grado: por el grado actual, ordenado, sin quien no tiene grado', () => {
      const regs = [
        reg(new Date(2026, 2, 1), { matricula: 'A' }),
        reg(new Date(2026, 2, 2), { matricula: 'A' }),
        reg(new Date(2026, 2, 1), { matricula: 'B' }),
        reg(new Date(2026, 2, 1), { matricula: 'BORRADO' }),
      ];
      const grados: Record<string, number> = { A: 7, B: 3 };
      const r = distribucionPorGrado(regs, m => grados[m]);
      expect(r.map(g => [g.clave, g.cantidad])).toEqual([[3, 1], [7, 2]]);
      expect(r[1].porcentaje).toBeCloseTo(66.7, 1);
    });
  });

  describe('combinaciones de motivos', () => {
    it('cuenta solo visitas con 2+ motivos distintos, sin importar el orden', () => {
      const regs = [
        reg(new Date(2026, 2, 1), { motivoNombres: ['Estudiar', 'Pedir libro'] }),
        reg(new Date(2026, 2, 1), { motivoNombres: ['Pedir libro', 'Estudiar'] }),
        reg(new Date(2026, 2, 1), { motivoNombres: ['Estudiar', 'Estudiar'] }), // repetido: no es combo
        reg(new Date(2026, 2, 1), { motivoNombres: ['Estudiar'] }),
      ];
      const r = combinacionesDeMotivos(regs);
      expect(r).toEqual([{ clave: 'Estudiar + Pedir libro', cantidad: 2, porcentaje: 100 }]);
    });
  });

  describe('variación diaria', () => {
    it('es el coeficiente de variación de los días con visitas', () => {
      expect(variacionDiaria([10, 10, 10])).toBe(0);
      // media 15, desviación 5 → 33 %
      expect(variacionDiaria([10, 20, 0, 0])).toBe(33);
      expect(variacionDiaria([10, 0, 0])).toBe(0);
    });
  });

  describe('crecimiento mes a mes', () => {
    it('cuenta los últimos 12 meses terminando en el mes en curso', () => {
      const hoy = new Date(2026, 9, 6);
      const regs = [
        reg(new Date(2026, 9, 1)), reg(new Date(2026, 8, 30)),
        reg(new Date(2025, 10, 15)), reg(new Date(2025, 9, 31)), // octubre 2025: fuera
      ];
      const m = conteoMensual(regs, hoy);
      expect(m.length).toBe(12);
      expect(m[0].inicio.getMonth()).toBe(10); // noviembre 2025
      expect(m[0].cantidad).toBe(1);
      expect(m[10].cantidad).toBe(1); // septiembre
      expect(m[11].cantidad).toBe(1); // octubre
    });

    it('el mes anterior "al mismo día" se recorta a fin de mes si hace falta', () => {
      // 31 de marzo → febrero hasta el 28.
      const regs = [reg(new Date(2026, 1, 28, 9)), reg(new Date(2026, 1, 10)), reg(new Date(2026, 2, 1))];
      expect(mesAnteriorAlMismoDia(regs, new Date(2026, 2, 31, 12))).toBe(2);
      // 10 de marzo 08:00 → febrero hasta el 10 a las 08:00 (la visita del 10 a las 00:00 entra).
      expect(mesAnteriorAlMismoDia(regs, new Date(2026, 2, 10, 8))).toBe(1);
    });

    it('el mes en curso no es "más bajo" y se compara al mismo avance', () => {
      const cantidades = [0, 0, 0, 0, 0, 0, 100, 120, 80, 110, 90, 15];
      const r = resumirCrecimiento(cantidades, 20);
      expect(r.mejorIdx).toBe(7);
      expect(r.peorIdx).toBe(8);        // 80, no los 15 del mes en curso
      expect(r.cambios[11]).toEqual({ tipo: 'porcentaje', valor: -25 }); // 15 vs 20 al mismo día
      expect(r.cambios[6]).toEqual({ tipo: 'nuevo' });                   // 0 → 100
      expect(r.promedioMensual).toBe(86); // 515 / 6 meses con datos
    });

    it('si el trimestre anterior tuvo 0, no inventa "+100 %"', () => {
      const r = resumirCrecimiento([0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 5], 0);
      expect(r.trimestre?.sinReferencia).toBe(true);
      expect(r.trimestre?.porcentaje).toBe(0);
    });
  });

  describe('mapa de calor', () => {
    it('reparte los colores por cuartos de las celdas con visitas', () => {
      const c = cuartilesDeCeldas([0, 0, 1, 2, 3, 4, 100]);
      expect(c).toEqual({ p25: 2, p50: 3, p75: 4 });
      expect(nivelDeIntensidad(0, c)).toBe(0);
      expect(nivelDeIntensidad(1, c)).toBe(1);
      expect(nivelDeIntensidad(3, c)).toBe(2);
      expect(nivelDeIntensidad(4, c)).toBe(3);
      // La celda atípica no aplasta a las demás: solo ella es "muy alto".
      expect(nivelDeIntensidad(100, c)).toBe(4);
    });
  });

  // ─── Comparación por unidad (v3.46.0) ─────────────────
  describe('rangoAnteriorDeUnidad', () => {
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const dia = (a: number, m: number, d: number, h = 0, min = 0) => new Date(a, m - 1, d, h, min);
    const finDe = (a: number, m: number, d: number) => new Date(a, m - 1, d, 23, 59, 59, 999);

    it('esta semana (lun–mar) contra lun–mar de la semana pasada, no contra el fin de semana', () => {
      // Captura del usuario: martes 6 oct 2026 19:59; antes salía "del 03-oct al 04-oct".
      const ahora = dia(2026, 10, 6, 19, 59);
      const r = rangoAnteriorDeUnidad({ tipo: 'semana' }, { inicio: dia(2026, 10, 5), fin: finDe(2026, 10, 6) }, ahora)!;
      expect(iso(r.inicio)).toBe('2026-09-28 00:00');
      expect(iso(r.fin)).toBe('2026-09-29 19:59');
    });

    it('este mes (1–6) contra el 1–6 del mes pasado', () => {
      const ahora = dia(2026, 10, 6, 10, 0);
      const r = rangoAnteriorDeUnidad({ tipo: 'mes' }, { inicio: dia(2026, 10, 1), fin: finDe(2026, 10, 6) }, ahora)!;
      expect(iso(r.inicio)).toBe('2026-09-01 00:00');
      expect(iso(r.fin)).toBe('2026-09-06 10:00');
    });

    it('un mes completo contra el mes anterior completo, aunque tengan distintos días', () => {
      const r = rangoAnteriorDeUnidad({ tipo: 'mes' }, { inicio: dia(2026, 3, 1), fin: finDe(2026, 3, 31) }, dia(2026, 10, 6))!;
      expect(iso(r.inicio)).toBe('2026-02-01 00:00');
      expect(iso(r.fin)).toBe('2026-02-28 23:59');
      const abril = rangoAnteriorDeUnidad({ tipo: 'mes' }, { inicio: dia(2026, 4, 1), fin: finDe(2026, 4, 30) }, dia(2026, 10, 6))!;
      expect(iso(abril.fin)).toBe('2026-03-31 23:59');
    });

    it('el 31 de marzo a media jornada se compara con el 28 de febrero', () => {
      const r = rangoAnteriorDeUnidad({ tipo: 'mes' }, { inicio: dia(2026, 3, 1), fin: finDe(2026, 3, 31) }, dia(2026, 3, 31, 12))!;
      expect(iso(r.fin)).toBe('2026-02-28 12:00');
    });

    it('este año contra el mismo tramo del año pasado', () => {
      const ahora = dia(2026, 10, 6, 9, 30);
      const r = rangoAnteriorDeUnidad({ tipo: 'anio' }, { inicio: dia(2026, 1, 1), fin: finDe(2026, 10, 6) }, ahora)!;
      expect(iso(r.inicio)).toBe('2025-01-01 00:00');
      expect(iso(r.fin)).toBe('2025-10-06 09:30');
    });

    it('este periodo contra el periodo anterior, mismos días desde su inicio', () => {
      // Otoño desde el 17 ago; hoy 6 oct = día 50. Verano empezó el 1 jun → hasta el 21 jul.
      const ahora = dia(2026, 10, 6, 19, 57);
      const verano = { inicio: dia(2026, 6, 1), fin: finDe(2026, 8, 16) };
      const r = rangoAnteriorDeUnidad({ tipo: 'periodo', anterior: verano },
        { inicio: dia(2026, 8, 17), fin: finDe(2026, 12, 31) }, ahora)!;
      expect(iso(r.inicio)).toBe('2026-06-01 00:00');
      expect(iso(r.fin)).toBe('2026-07-21 19:57');
    });

    it('si el periodo anterior es más corto que el avance, se toma completo', () => {
      const corto = { inicio: dia(2026, 6, 1), fin: finDe(2026, 6, 10) };
      const r = rangoAnteriorDeUnidad({ tipo: 'periodo', anterior: corto },
        { inicio: dia(2026, 8, 17), fin: finDe(2026, 12, 31) }, dia(2026, 10, 6))!;
      expect(iso(r.fin)).toBe('2026-06-10 23:59');
    });

    it('sin periodo anterior no inventa uno', () => {
      expect(rangoAnteriorDeUnidad({ tipo: 'periodo', anterior: null },
        { inicio: dia(2026, 8, 17), fin: finDe(2026, 12, 31) })).toBeNull();
    });
  });
});
