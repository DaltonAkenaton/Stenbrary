// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/                        ║
// ║        estadisticas-avanzadas.service.ts             ║
// ║  Stenbrary v3.8.1 — Rangos reales + bucketing        ║
// ║                                                      ║
// ║  FIX v3.8.1:                                         ║
// ║  - Caché ya no se recursa a sí mismo                  ║
// ║  - Promesa en vuelo evita N queries simultáneas      ║
// ║  - Métodos aceptan RangoFechas (no solo "dias")       ║
// ║  - obtenerRegistrosPorRango() agrupa por             ║
// ║    día/semana/mes según el largo del período          ║
// ║  - compararTendencias() calcula período anterior     ║
// ║    automáticamente con la misma longitud              ║
// ║  - Boundaries de hora normalizados (00:00 / 23:59)    ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Registro, Alumno } from '../models';

/** Rango cerrado [inicio, fin] de fechas. */
export interface RangoFechas {
  inicio: Date;
  fin: Date;
}

export type Granularidad = 'dia' | 'semana' | 'mes';

export interface TendenciaComparativa {
  actual: number;
  anterior: number;
  cambio: number;
  porcentajeCambio: number;
  direccion: 'up' | 'down' | 'igual';
  /** Rango contra el que se está comparando (período anterior de la misma duración). */
  rangoAnterior: RangoFechas;
}

/** Resultado de la comparación lado-a-lado entre dos rangos arbitrarios. */
export interface ComparativaDosRangos {
  a: ComparativaSlice;
  b: ComparativaSlice;
  diferencia: {
    cambio: number;
    porcentaje: number;
    direccion: 'up' | 'down' | 'igual';
  };
}

export interface ComparativaSlice {
  rango: RangoFechas;
  totalRegistros: number;
  alumnosUnicos: number;
  promedioPorDia: number;
  horaPico: HeatmapData | null;
  motivos: DistribucionMotivos;
}

export interface HeatmapData {
  dia: string;
  hora: number;
  cantidad: number;
}

/** Resultado del heatmap con metadatos para que el componente pueda
 *  mostrar fechas exactas y un rango horario correcto. */
export interface HeatmapResultado {
  data: HeatmapData[];
  horas: number[];        // p. ej. [7, 8, ..., 21] o expandido si hay datos fuera
  rango: RangoFechas;     // rango real cubierto
  fechasPorDia: Map<string, Date[]>; // 'Lunes' → fechas concretas dentro del rango
}

export interface TopAlumno {
  alumno: Alumno;
  totalVisitas: number;
  ultimaVisita: Date;
  motivoFrecuente: string;
}

export interface Insight {
  tipo: 'warning' | 'info' | 'success';
  icono: string;
  titulo: string;
  descripcion: string;
}

/** Datos para gráfica de barras (puede ser por día, semana o mes). */
export interface DatosDiarios {
  etiquetas: string[];
  cantidades: number[];
  granularidad: Granularidad;
}

/** NUEVO: Datos para gráfica de dona/motivos */
export interface DistribucionMotivos {
  etiquetas: string[];      // ['Estudiar', 'Trabajo escolar', ...]
  cantidades: number[];     // [15, 8, ...]
  colores: string[];        // ['#00C8D7', '#0BC4B7', ...]
}

/** NUEVO: Datos para gráfica de carreras */
export interface DatosCarrera {
  carrera: string;
  totalVisitas: number;
  alumnosActivos: number;
  promedioVisitasPorAlumno: number;
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasAvanzadasService {

  // Cache para evitar cargas múltiples en paralelo (8 queries simultáneas)
  private registrosCache: Registro[] | null = null;
  private cacheTimestamp = 0;
  private cacheInFlight: Promise<Registro[]> | null = null;
  private readonly CACHE_TTL = 15_000; // 15 segundos

  constructor(private databaseService: DatabaseService) {}

  /**
   * Obtiene todos los registros con caché de corta duración.
   * Las llamadas concurrentes comparten una única promesa en vuelo
   * para evitar N queries simultáneas a IndexedDB.
   */
  private async obtenerRegistrosConCache(): Promise<Registro[]> {
    const ahora = Date.now();
    if (this.registrosCache && (ahora - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.registrosCache;
    }
    if (this.cacheInFlight) {
      return this.cacheInFlight;
    }
    this.cacheInFlight = this.databaseService.obtenerTodosLosRegistros()
      .then(registros => {
        this.registrosCache = registros;
        this.cacheTimestamp = Date.now();
        return registros;
      })
      .finally(() => {
        this.cacheInFlight = null;
      });
    return this.cacheInFlight;
  }

  /** Invalida el caché manualmente */
  invalidarCache(): void {
    this.registrosCache = null;
    this.cacheTimestamp = 0;
    this.cacheInFlight = null;
  }

  // ═══════════════════════════════════════════════
  // HELPERS DE RANGOS
  // ═══════════════════════════════════════════════

  /** Crea un rango "últimos N días" anclado en hoy, con boundaries de día completos. */
  crearRangoUltimosDias(dias: number): RangoFechas {
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);
    const inicio = new Date(fin);
    inicio.setDate(fin.getDate() - (dias - 1));
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fin };
  }

  /** Crea un rango que cubre TODO el historial (desde el primer registro hasta hoy). */
  async crearRangoHistorico(): Promise<RangoFechas> {
    const todos = await this.obtenerRegistrosConCache();
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);
    if (todos.length === 0) {
      const inicio = new Date(fin);
      inicio.setDate(fin.getDate() - 30);
      inicio.setHours(0, 0, 0, 0);
      return { inicio, fin };
    }
    const minTs = todos.reduce(
      (min, r) => Math.min(min, new Date(r.fechaHora).getTime()),
      Date.now(),
    );
    const inicio = new Date(minTs);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fin };
  }

  /** Rango del mes actual (1° del mes a hoy). */
  crearRangoMesActual(): RangoFechas {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0, 0);
    const fin = new Date(hoy);
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
  }

  /** Normaliza un rango asegurando boundaries de día completos. */
  normalizarRango(inicio: Date, fin: Date): RangoFechas {
    const i = new Date(inicio);
    i.setHours(0, 0, 0, 0);
    const f = new Date(fin);
    f.setHours(23, 59, 59, 999);
    return { inicio: i, fin: f };
  }

  /** Calcula el rango anterior de la misma longitud, inmediatamente previo al actual. */
  rangoAnteriorMismaLongitud(actual: RangoFechas): RangoFechas {
    const ms = actual.fin.getTime() - actual.inicio.getTime();
    const fin = new Date(actual.inicio.getTime() - 1);
    const inicio = new Date(fin.getTime() - ms);
    return { inicio, fin };
  }

  /** Cantidad de días (inclusivo) que cubre un rango. */
  diasEnRango(rango: RangoFechas): number {
    const ms = rango.fin.getTime() - rango.inicio.getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  }

  /** Decide la granularidad de buckets ideal según el largo del período. */
  granularidadParaRango(rango: RangoFechas): Granularidad {
    const dias = this.diasEnRango(rango);
    if (dias <= 31) return 'dia';
    if (dias <= 180) return 'semana';
    return 'mes';
  }

  private filtrarPorRango(
    registros: Registro[],
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Registro[] {
    const ini = rango.inicio.getTime();
    const fin = rango.fin.getTime();
    if (!horaFiltro) {
      return registros.filter(r => {
        const t = new Date(r.fechaHora).getTime();
        return t >= ini && t <= fin;
      });
    }
    const { desde, hasta } = horaFiltro;
    return registros.filter(r => {
      const d = new Date(r.fechaHora);
      const t = d.getTime();
      if (t < ini || t > fin) return false;
      const h = d.getHours();
      return h >= desde && h <= hasta;
    });
  }

  /** Hora pico calculada desde un slice ya filtrado de registros (público). */
  calcularHoraPicoEnRango(registros: Registro[]): HeatmapData | null {
    return this.calcularHoraPicoDesdeRegistros(registros);
  }

  /** Cuenta registros en un rango (con filtro horario opcional). */
  async contarRegistrosEnRango(
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<number> {
    const todos = await this.obtenerRegistrosConCache();
    return this.filtrarPorRango(todos, rango, horaFiltro).length;
  }

  /** Devuelve los registros crudos de un rango (con filtro horario opcional). */
  async obtenerRegistrosCrudos(
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<Registro[]> {
    const todos = await this.obtenerRegistrosConCache();
    return this.filtrarPorRango(todos, rango, horaFiltro);
  }

  // ═══════════════════════════════════════════════
  // DATOS PARA GRÁFICAS (NUEVO v3.5)
  // ═══════════════════════════════════════════════

  /**
   * Registros agrupados según el largo del rango:
   * ≤31 días → por día, ≤180 → por semana, > → por mes.
   * Para gráfica de barras.
   */
  async obtenerRegistrosPorRango(
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<DatosDiarios> {
    const todosRegistros = await this.obtenerRegistrosConCache();
    const registros = this.filtrarPorRango(todosRegistros, rango, horaFiltro);
    const granularidad = this.granularidadParaRango(rango);

    if (granularidad === 'dia') {
      return this.bucketPorDia(registros, rango);
    }
    if (granularidad === 'semana') {
      return this.bucketPorSemana(registros, rango);
    }
    return this.bucketPorMes(registros, rango);
  }

  private bucketPorDia(registros: Registro[], rango: RangoFechas): DatosDiarios {
    const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const etiquetas: string[] = [];
    const cantidades: number[] = [];
    const conteo = new Map<string, number>();

    registros.forEach(r => {
      const f = new Date(r.fechaHora);
      const key = `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
      conteo.set(key, (conteo.get(key) || 0) + 1);
    });

    const cursor = new Date(rango.inicio);
    const fin = rango.fin;
    while (cursor <= fin) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      etiquetas.push(`${diasCortos[cursor.getDay()]} ${cursor.getDate()}`);
      cantidades.push(conteo.get(key) || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return { etiquetas, cantidades, granularidad: 'dia' };
  }

  private bucketPorSemana(registros: Registro[], rango: RangoFechas): DatosDiarios {
    // Agrupa por semana ISO (lunes como inicio).
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const inicioDeSemana = (d: Date): Date => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      const dow = x.getDay(); // 0=Dom..6=Sab
      const diff = (dow === 0 ? -6 : 1 - dow); // mover a lunes
      x.setDate(x.getDate() + diff);
      return x;
    };

    const conteo = new Map<number, number>();
    registros.forEach(r => {
      const k = inicioDeSemana(new Date(r.fechaHora)).getTime();
      conteo.set(k, (conteo.get(k) || 0) + 1);
    });

    const etiquetas: string[] = [];
    const cantidades: number[] = [];
    const cursor = inicioDeSemana(rango.inicio);
    const finMs = rango.fin.getTime();

    while (cursor.getTime() <= finMs) {
      const k = cursor.getTime();
      etiquetas.push(`${cursor.getDate()} ${meses[cursor.getMonth()]}`);
      cantidades.push(conteo.get(k) || 0);
      cursor.setDate(cursor.getDate() + 7);
    }

    return { etiquetas, cantidades, granularidad: 'semana' };
  }

  private bucketPorMes(registros: Registro[], rango: RangoFechas): DatosDiarios {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const conteo = new Map<string, number>();

    registros.forEach(r => {
      const f = new Date(r.fechaHora);
      const key = `${f.getFullYear()}-${f.getMonth()}`;
      conteo.set(key, (conteo.get(key) || 0) + 1);
    });

    const etiquetas: string[] = [];
    const cantidades: number[] = [];
    const cursor = new Date(rango.inicio.getFullYear(), rango.inicio.getMonth(), 1);
    const finCursor = new Date(rango.fin.getFullYear(), rango.fin.getMonth(), 1);

    while (cursor <= finCursor) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      const yy = cursor.getFullYear().toString().slice(-2);
      etiquetas.push(`${meses[cursor.getMonth()]} ${yy}`);
      cantidades.push(conteo.get(key) || 0);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { etiquetas, cantidades, granularidad: 'mes' };
  }

  /**
   * Distribución por motivos dentro de un rango.
   * Para gráfica de dona.
   */
  async obtenerDistribucionMotivos(
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<DistribucionMotivos> {
    const todosRegistros = await this.obtenerRegistrosConCache();
    const motivos = await this.databaseService.obtenerTodosLosMotivos();

    const registrosPeriodo = this.filtrarPorRango(todosRegistros, rango, horaFiltro);

    // Contar por motivo
    const conteo = new Map<string, number>();
    registrosPeriodo.forEach(r => {
      const nombre = r.motivoNombre || 'Sin motivo';
      conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
    });

    // Ordenar de mayor a menor
    const ordenado = Array.from(conteo.entries())
      .sort((a, b) => b[1] - a[1]);

    // Mapear colores de los motivos
    const coloresPaleta = [
      '#00C8D7', '#0BC4B7', '#0EB07B', '#34D399',
      '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
      '#F05252', '#F97316', '#F5A623', '#5DE4EC',
    ];

    const etiquetas: string[] = [];
    const cantidades: number[] = [];
    const colores: string[] = [];

    ordenado.forEach(([nombre, cantidad], index) => {
      etiquetas.push(nombre);
      cantidades.push(cantidad);

      // Buscar color del motivo, si no hay usar paleta cíclica
      const motivoDB = motivos.find(m => m.nombre === nombre);
      colores.push(motivoDB?.color || coloresPaleta[index % coloresPaleta.length]);
    });

    return { etiquetas, cantidades, colores };
  }

  // ═══════════════════════════════════════════════
  // MÉTODOS EXISTENTES (sin cambios)
  // ═══════════════════════════════════════════════

  /**
   * Compara el rango actual contra el rango inmediatamente previo de la
   * misma longitud (auto-calculado).
   */
  async compararTendencias(
    rangoActual: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<TendenciaComparativa> {
    const rangoAnterior = this.rangoAnteriorMismaLongitud(rangoActual);
    const todosRegistros = await this.obtenerRegistrosConCache();

    const actual = this.filtrarPorRango(todosRegistros, rangoActual, horaFiltro).length;
    const anterior = this.filtrarPorRango(todosRegistros, rangoAnterior, horaFiltro).length;

    const cambio = actual - anterior;
    const porcentajeCambio = anterior > 0 ? (cambio / anterior) * 100 : 0;

    let direccion: 'up' | 'down' | 'igual' = 'igual';
    if (cambio > 0) direccion = 'up';
    if (cambio < 0) direccion = 'down';

    return { actual, anterior, cambio, porcentajeCambio, direccion, rangoAnterior };
  }

  /**
   * Compara dos rangos arbitrarios (p. ej. "esta semana" vs "semana pasada",
   * o "febrero" vs "abril"). Devuelve los totales, distribución de motivos
   * y top alumnos de cada uno, para que la UI los presente lado a lado.
   */
  async compararDosRangos(
    rangoA: RangoFechas,
    rangoB: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<ComparativaDosRangos> {
    const todos = await this.obtenerRegistrosConCache();
    const motivosBD = await this.databaseService.obtenerTodosLosMotivos();

    const regsA = this.filtrarPorRango(todos, rangoA, horaFiltro);
    const regsB = this.filtrarPorRango(todos, rangoB, horaFiltro);

    const distribucion = (regs: Registro[]): DistribucionMotivos => {
      const conteo = new Map<string, number>();
      regs.forEach(r => conteo.set(r.motivoNombre || 'Sin motivo',
        (conteo.get(r.motivoNombre || 'Sin motivo') || 0) + 1));
      const orden = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1]);
      const paleta = ['#00C8D7', '#0BC4B7', '#0EB07B', '#34D399', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F05252', '#F97316', '#F5A623', '#5DE4EC'];
      return {
        etiquetas: orden.map(o => o[0]),
        cantidades: orden.map(o => o[1]),
        colores: orden.map(([n], i) => motivosBD.find(m => m.nombre === n)?.color || paleta[i % paleta.length]),
      };
    };

    const alumnosUnicos = (regs: Registro[]): number => {
      const set = new Set<string>();
      regs.forEach(r => { if (r.matricula !== 'INVITADO') set.add(r.matricula); });
      return set.size;
    };

    const promedioPorDia = (regs: Registro[], rango: RangoFechas): number => {
      const dias = this.diasEnRango(rango);
      return dias > 0 ? parseFloat((regs.length / dias).toFixed(1)) : 0;
    };

    const totalA = regsA.length;
    const totalB = regsB.length;
    const cambio = totalA - totalB;
    const porcentaje = totalB > 0 ? (cambio / totalB) * 100 : 0;
    let direccion: 'up' | 'down' | 'igual' = 'igual';
    if (cambio > 0) direccion = 'up';
    if (cambio < 0) direccion = 'down';

    return {
      a: {
        rango: rangoA,
        totalRegistros: totalA,
        alumnosUnicos: alumnosUnicos(regsA),
        promedioPorDia: promedioPorDia(regsA, rangoA),
        horaPico: this.calcularHoraPicoDesdeRegistros(regsA),
        motivos: distribucion(regsA),
      },
      b: {
        rango: rangoB,
        totalRegistros: totalB,
        alumnosUnicos: alumnosUnicos(regsB),
        promedioPorDia: promedioPorDia(regsB, rangoB),
        horaPico: this.calcularHoraPicoDesdeRegistros(regsB),
        motivos: distribucion(regsB),
      },
      diferencia: { cambio, porcentaje, direccion },
    };
  }

  async generarHeatmap(diasPeriodo: number = 30): Promise<HeatmapResultado> {
    const rango = this.crearRangoUltimosDias(diasPeriodo);
    const todosRegistros = await this.obtenerRegistrosConCache();
    const registrosPeriodo = this.filtrarPorRango(todosRegistros, rango);

    const heatmapMap = new Map<string, number>();

    // Auto-expansión del rango horario: por defecto 7-21, pero si hay
    // registros fuera (biblioteca con horario nocturno, eventos especiales,
    // etc.) se ensancha para no perderlos.
    let minHora = 7;
    let maxHora = 21;

    registrosPeriodo.forEach(registro => {
      const fecha = new Date(registro.fechaHora);
      const dia = this.obtenerNombreDia(fecha.getDay());
      const hora = fecha.getHours();
      if (hora < minHora) minHora = hora;
      if (hora > maxHora) maxHora = hora;
      const key = `${dia}-${hora}`;
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
    });

    const horas: number[] = [];
    for (let h = minHora; h <= maxHora; h++) horas.push(h);

    const heatmapData: HeatmapData[] = [];
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    diasSemana.forEach(dia => {
      horas.forEach(hora => {
        const key = `${dia}-${hora}`;
        heatmapData.push({ dia, hora, cantidad: heatmapMap.get(key) || 0 });
      });
    });

    // Mapa día → fechas concretas dentro del rango (para mostrar
    // p. ej. "Lunes 1 abr" cuando el período es de exactamente 7 días).
    const fechasPorDia = new Map<string, Date[]>();
    diasSemana.forEach(d => fechasPorDia.set(d, []));
    const cursor = new Date(rango.inicio);
    cursor.setHours(12, 0, 0, 0); // mediodía evita líos de DST
    while (cursor.getTime() <= rango.fin.getTime()) {
      const nombre = this.obtenerNombreDia(cursor.getDay());
      fechasPorDia.get(nombre)!.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return { data: heatmapData, horas, rango, fechasPorDia };
  }

  async obtenerTopAlumnos(limite: number = 10, dias?: number): Promise<TopAlumno[]> {
    let registrosFiltrados = await this.obtenerRegistrosConCache();
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();

    if (dias && dias > 0) {
      const rango = this.crearRangoUltimosDias(dias);
      registrosFiltrados = this.filtrarPorRango(registrosFiltrados, rango);
    }

    const registrosPorMatricula = new Map<string, Registro[]>();

    registrosFiltrados.forEach(registro => {
      const registros = registrosPorMatricula.get(registro.matricula) || [];
      registros.push(registro);
      registrosPorMatricula.set(registro.matricula, registros);
    });

    const topAlumnos: TopAlumno[] = [];

    registrosPorMatricula.forEach((registros, matricula) => {
      const alumno = todosAlumnos.find(a => a.matricula === matricula);
      if (!alumno) return;

      const motivosCount = new Map<string, number>();
      registros.forEach(r => {
        motivosCount.set(r.motivoNombre, (motivosCount.get(r.motivoNombre) || 0) + 1);
      });

      let motivoFrecuente = 'N/A';
      let maxCount = 0;
      motivosCount.forEach((count, motivo) => {
        if (count > maxCount) {
          maxCount = count;
          motivoFrecuente = motivo;
        }
      });

      const ultimaVisita = new Date(
        Math.max(...registros.map(r => new Date(r.fechaHora).getTime()))
      );

      topAlumnos.push({ alumno, totalVisitas: registros.length, ultimaVisita, motivoFrecuente });
    });

    return topAlumnos.sort((a, b) => b.totalVisitas - a.totalVisitas).slice(0, limite);
  }

  async generarInsights(
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
    umbralInactividadDias: number = 30,
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Solo insights EXTRAORDINARIOS (alertas que no duplican KPIs fijos).
    // Los KPIs ya muestran tendencia, hora pico e inactivos; aquí solo
    // levantamos la mano cuando el cambio es DRAMÁTICO (>50%).
    const tendencia = await this.compararTendencias(rango, horaFiltro);
    if (tendencia.direccion === 'up' && tendencia.porcentajeCambio > 50) {
      insights.push({
        tipo: 'success',
        icono: 'rocket_launch',
        titulo: 'Crecimiento extraordinario',
        descripcion: `Las visitas crecieron ${tendencia.porcentajeCambio.toFixed(0)}% vs. el período anterior. Vale la pena investigar qué cambió.`,
      });
    } else if (tendencia.direccion === 'down' && Math.abs(tendencia.porcentajeCambio) > 50) {
      insights.push({
        tipo: 'warning',
        icono: 'priority_high',
        titulo: 'Caída crítica de actividad',
        descripcion: `Las visitas cayeron ${Math.abs(tendencia.porcentajeCambio).toFixed(0)}% vs. el período anterior. Revisa si hay un problema operativo o estacional.`,
      });
    }

    // Pre-cargar para los insights siguientes
    const todosRegistros = await this.obtenerRegistrosConCache();

    // Alumnos inactivos: usa el umbral configurado por el coordinador.
    const umbral = Math.max(1, umbralInactividadDias);
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    const alumnosActivos = todosAlumnos.filter(a => a.activo);
    const limite = new Date();
    limite.setDate(limite.getDate() - umbral);
    limite.setHours(0, 0, 0, 0);

    const matriculasConActividadReciente = new Set<string>();
    const matriculasConHistorial = new Set<string>();
    todosRegistros.forEach(r => {
      matriculasConHistorial.add(r.matricula);
      if (new Date(r.fechaHora) >= limite) {
        matriculasConActividadReciente.add(r.matricula);
      }
    });

    let alumnosSinVisitasRecientes = 0;
    for (const alumno of alumnosActivos) {
      if (
        matriculasConHistorial.has(alumno.matricula) &&
        !matriculasConActividadReciente.has(alumno.matricula)
      ) {
        alumnosSinVisitasRecientes++;
      }
    }

    // El KPI fijo de "Alumnos Inactivos" arriba ya muestra el dato.
    // Acá solo lanzamos alerta si la situación es seria (>30% del padrón
    // activo está inactivo — eso significa un problema grande).
    const totalActivos = alumnosActivos.length;
    const proporcion = totalActivos > 0 ? alumnosSinVisitasRecientes / totalActivos : 0;
    if (proporcion > 0.30) {
      insights.push({
        tipo: 'warning',
        icono: 'warning_amber',
        titulo: 'Padrón con baja actividad',
        descripcion: `${(proporcion * 100).toFixed(0)}% de los alumnos activos (${alumnosSinVisitasRecientes} de ${totalActivos}) no ha visitado en ${umbral}+ días. Considera campañas de reactivación.`,
      });
    }

    return insights;
  }

  /** Devuelve la cuenta de alumnos inactivos según el umbral. Helper público. */
  async contarAlumnosInactivos(umbralInactividadDias: number = 30): Promise<number> {
    const umbral = Math.max(1, umbralInactividadDias);
    const todosRegistros = await this.obtenerRegistrosConCache();
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    const alumnosActivos = todosAlumnos.filter(a => a.activo);
    const limite = new Date();
    limite.setDate(limite.getDate() - umbral);
    limite.setHours(0, 0, 0, 0);

    const matRecientes = new Set<string>();
    const matHistorial = new Set<string>();
    todosRegistros.forEach(r => {
      matHistorial.add(r.matricula);
      if (new Date(r.fechaHora) >= limite) matRecientes.add(r.matricula);
    });

    let cuenta = 0;
    for (const a of alumnosActivos) {
      if (matHistorial.has(a.matricula) && !matRecientes.has(a.matricula)) cuenta++;
    }
    return cuenta;
  }

  async analizarPorCarrera(
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<DatosCarrera[]> {
    const todos = await this.obtenerRegistrosConCache();
    const registrosFiltrados = this.filtrarPorRango(todos, rango, horaFiltro);

    const carrerasMap = new Map<string, { visitas: number; alumnos: Set<string> }>();

    registrosFiltrados.forEach(registro => {
      const carrera = registro.carrera || 'Sin carrera';
      const data = carrerasMap.get(carrera) || { visitas: 0, alumnos: new Set() };
      data.visitas++;
      data.alumnos.add(registro.matricula);
      carrerasMap.set(carrera, data);
    });

    return Array.from(carrerasMap.entries())
      .map(([carrera, data]) => ({
        carrera,
        totalVisitas: data.visitas,
        alumnosActivos: data.alumnos.size,
        promedioVisitasPorAlumno:
          data.alumnos.size > 0
            ? parseFloat((data.visitas / data.alumnos.size).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalVisitas - a.totalVisitas);
  }

  /** Hora pico calculada a partir de un slice ya filtrado de registros. */
  private calcularHoraPicoDesdeRegistros(registros: Registro[]): HeatmapData | null {
    if (registros.length === 0) return null;
    const conteo = new Map<string, HeatmapData>();
    registros.forEach(r => {
      const f = new Date(r.fechaHora);
      const dia = this.obtenerNombreDia(f.getDay());
      const hora = f.getHours();
      const key = `${dia}-${hora}`;
      const item = conteo.get(key) || { dia, hora, cantidad: 0 };
      item.cantidad++;
      conteo.set(key, item);
    });
    let pico: HeatmapData | null = null;
    conteo.forEach(item => {
      if (!pico || item.cantidad > pico.cantidad) pico = item;
    });
    return pico;
  }

  async predecirDiaOcupado(dias: number = 30): Promise<string> {
    const heatmap = await this.generarHeatmap(dias);
    const visitasPorDia = new Map<string, number>();
    heatmap.data.forEach(item => {
      visitasPorDia.set(item.dia, (visitasPorDia.get(item.dia) || 0) + item.cantidad);
    });

    let diaOcupado = 'Lunes';
    let maxVisitas = 0;
    visitasPorDia.forEach((visitas, dia) => {
      if (visitas > maxVisitas) {
        maxVisitas = visitas;
        diaOcupado = dia;
      }
    });

    return diaOcupado;
  }

  private obtenerNombreDia(dia: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dia];
  }

  private encontrarHoraPico(heatmap: HeatmapData[]): HeatmapData | null {
    if (heatmap.length === 0) return null;
    return heatmap.reduce((max, current) => current.cantidad > max.cantidad ? current : max);
  }
}