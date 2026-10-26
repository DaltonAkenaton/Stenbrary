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

import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { Registro, Alumno, Motivo } from '../models';
import { desplazarDias, diasCalendarioEntre as diasEntre } from '../utils/tiempo.utils';
import {
  calcularInactividad,
  contarUnaSolaVisita,
  contarMotivos,
  esInvitado,
  motivoMasFrecuente,
  promedioPorDiaConActividad,
  proyectarCierreHoy,
  ProyeccionDia,
} from '../utils/estadisticas.utils';
import { esRegistroDePrueba } from '../utils/datos-prueba.utils';

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
  /**
   * True cuando el período anterior tuvo 0 registros y el actual no: no hay
   * base para un porcentaje. La UI NO debe mostrar `porcentajeCambio` (vale 0
   * por convención) — antes se leía "↑ 0.0 % más que el período anterior".
   */
  sinReferencia: boolean;
  /** Rango contra el que se está comparando (período anterior de la misma duración). */
  rangoAnterior: RangoFechas;
  /**
   * True si el período actual sigue en curso (termina después de ahora):
   * entonces el anterior se corta a la MISMA altura — mismo día relativo y
   * misma hora — en vez de compararse completo (decisión P6).
   */
  alMismoAvance: boolean;
}

/** Resultado de la comparación lado-a-lado entre dos rangos arbitrarios. */
export interface ComparativaDosRangos {
  a: ComparativaSlice;
  b: ComparativaSlice;
  /**
   * Si uno de los dos períodos sigue en curso, el otro se recorta al mismo
   * avance (decisión P6). Aquí queda cuál y hasta cuándo, para decirlo en
   * pantalla. `null` si se compararon completos.
   */
  corte: { slot: 'a' | 'b'; hasta: Date } | null;
  diferencia: {
    cambio: number;
    porcentaje: number;
    direccion: 'up' | 'down' | 'igual';
    /** B tuvo 0 registros y A no: el porcentaje no significa nada. Ver `TendenciaComparativa`. */
    sinReferencia: boolean;
  };
}

export interface ComparativaSlice {
  rango: RangoFechas;
  totalRegistros: number;
  alumnosUnicos: number;
  /** Promedio entre los días con al menos un registro (decisión P4). */
  promedioPorDia: number;
  diasConActividad: number;
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
  /** 'Lunes' → cuántos lunes del rango tuvieron al menos un registro. */
  diasConActividad: Map<string, number>;
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
  /** Visitas que INCLUYERON cada motivo (una visita puede sumar a varios). */
  cantidades: number[];     // [15, 8, ...]
  colores: string[];        // ['#00C8D7', '#0BC4B7', ...]
  /** Visitas del período: el denominador de los porcentajes. */
  totalVisitas: number;
}

/** Paleta de respaldo para motivos sin color propio. */
const PALETA_MOTIVOS = [
  '#00C8D7', '#0BC4B7', '#0EB07B', '#34D399',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#F05252', '#F97316', '#F5A623', '#5DE4EC',
];

/** Distribución de motivos (decisión P2: cada motivo de una visita suma). */
function distribucionDe(registros: Registro[], catalogo: Motivo[]): DistribucionMotivos {
  const conteo = contarMotivos(registros, catalogo);
  return {
    etiquetas: conteo.map(c => c.nombre),
    cantidades: conteo.map(c => c.cantidad),
    colores: conteo.map((c, i) => c.color || PALETA_MOTIVOS[i % PALETA_MOTIVOS.length]),
    totalVisitas: registros.length,
  };
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
  private databaseService = inject(DatabaseService);


  // Cache para evitar cargas múltiples en paralelo (8 queries simultáneas)
  private registrosCache: Registro[] | null = null;
  private cacheTimestamp = 0;
  private cacheInFlight: Promise<Registro[]> | null = null;
  private readonly CACHE_TTL = 300_000; // 5 minutos — los registros no cambian
                                        // mientras navegas en /estadisticas.

  /**
   * Obtiene todos los registros con caché de corta duración.
   * Las llamadas concurrentes comparten una única promesa en vuelo
   * para evitar N queries simultáneas a IndexedDB.
   */
  private async obtenerRegistrosConCache(): Promise<Registro[]> {
    this.descartarCacheSiCambiaronLosDatos();
    const ahora = Date.now();
    if (this.registrosCache && (ahora - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.registrosCache;
    }
    if (this.cacheInFlight) {
      return this.cacheInFlight;
    }
    const version = this.versionActual();
    this.cacheInFlight = this.databaseService.obtenerTodosLosRegistros()
      .then(registros => {
        this.indexarCache(registros);
        this.registrosCache = registros;
        this.cacheTimestamp = Date.now();
        this.versionCache = version;
        return registros;
      })
      .finally(() => {
        this.cacheInFlight = null;
      });
    return this.cacheInFlight;
  }

  /**
   * Índice por fecha de la caché: los registros con fecha válida, de más
   * reciente a más antiguo, y sus timestamps en paralelo. `filtrarPorRango`
   * lo recorre con búsqueda binaria en vez de construir un Date por cada uno
   * de los 120 000 registros en cada llamada (~0.5 s por carga de
   * /estadisticas en la prueba de volumen, 2026-10). Se reordena aquí y no se
   * confía en el orden de la BD: una fecha inválida rompe cualquier sort.
   */
  private cacheOrdenado: Registro[] = [];
  private cacheTs: Float64Array = new Float64Array(0);

  private indexarCache(registros: Registro[]): void {
    const pares: { t: number; r: Registro }[] = [];
    for (const r of registros) {
      const t = new Date(r.fechaHora).getTime();
      if (Number.isFinite(t)) pares.push({ t, r });
    }
    pares.sort((a, b) => b.t - a.t);
    this.cacheOrdenado = pares.map(p => p.r);
    this.cacheTs = Float64Array.from(pares, p => p.t);
  }

  /** Primera posición con timestamp <= `t` (el arreglo va en orden descendente). */
  private posicionDesde(t: number): number {
    let lo = 0;
    let hi = this.cacheTs.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.cacheTs[mid] > t) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  /** Versión de los datos con la que se llenó la caché (ver `DatabaseService.versionDatos`). */
  private versionCache = -1;

  /** Tolerante a mocks sin la señal: sin versión, la caché solo vence por TTL. */
  private versionActual(): number {
    return this.databaseService.versionDatos?.() ?? 0;
  }

  /**
   * Una escritura en esta pestaña (escaneo, salida, borrado, importación)
   * deja la caché vieja aunque no haya vencido el TTL. Antes de esto, volver
   * del escáner a /estadisticas mostraba hasta 5 minutos de datos atrasados
   * (auditoría 2026-10, R3).
   */
  private descartarCacheSiCambiaronLosDatos(): void {
    if (this.versionCache !== -1 && this.versionCache !== this.versionActual()) {
      this.invalidarCache();
    }
  }

  /**
   * Todos los registros, de la misma caché que usan las métricas. Las
   * pantallas deben pedirlos aquí y no a la BD: /estadisticas leía la base
   * completa 4 veces por carga (auditoría 2026-10, M19).
   */
  obtenerRegistros(): Promise<Registro[]> {
    return this.obtenerRegistrosConCache();
  }

  /** Invalida el caché manualmente */
  invalidarCache(): void {
    this.versionCache = -1;
    this.registrosCache = null;
    this.cacheOrdenado = [];
    this.cacheTs = new Float64Array(0);
    this.cacheTimestamp = 0;
    this.cacheInFlight = null;
    this.alumnosCache = null;
    this.alumnosCacheTs = 0;
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
    // Una sola fecha inválida volvía NaN el mínimo y dejaba todo el preset
    // "Todo el historial" en 0 (auditoría 2026-10, O16). Se ignoran: el
    // Diagnóstico ya las reporta aparte.
    const minTs = todos.reduce((min, r) => {
      const t = new Date(r.fechaHora).getTime();
      return Number.isFinite(t) ? Math.min(min, t) : min;
    }, Date.now());
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

  /**
   * El período inmediatamente anterior, de los mismos días de calendario.
   *
   * Si el actual sigue en curso (termina después de `ahora`), el anterior
   * se corta al MISMO avance: "últimos 7 días" a las 10:00 se compara con
   * los 7 días previos hasta las 10:00 del último, no completos (P6).
   *
   * Se desplaza por días de calendario, no restando milisegundos: en
   * Nuevo Laredo hay horario de verano y un rango que cruza el cambio
   * quedaba corrido una hora.
   */
  rangoAnteriorMismaLongitud(actual: RangoFechas, ahora: Date = new Date()): RangoFechas {
    const dias = this.diasEnRango(actual);
    const finEfectivo = actual.fin.getTime() > ahora.getTime() ? ahora : actual.fin;
    return {
      inicio: desplazarDias(actual.inicio, -dias),
      fin: desplazarDias(finEfectivo, -dias),
    };
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
    if (registros === this.registrosCache) {
      // Tramo [ini, fin] del índice: de la posición de `fin` a la de `ini`.
      const tramo = this.cacheOrdenado.slice(this.posicionDesde(fin), this.posicionDesde(ini - 1));
      if (!horaFiltro) return tramo;
      const { desde, hasta } = horaFiltro;
      return tramo.filter(r => {
        const h = new Date(r.fechaHora).getHours();
        return h >= desde && h <= hasta;
      });
    }
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
    return distribucionDe(this.filtrarPorRango(todosRegistros, rango, horaFiltro), motivos);
  }

  /**
   * Compara el rango actual contra el rango inmediatamente previo de la
   * misma longitud (auto-calculado).
   */
  async compararTendencias(
    rangoActual: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
    ahora: Date = new Date(),
    /**
     * Rango contra el que comparar. Para unidades de calendario (semana,
     * mes, año, periodo) lo calcula quien sabe cuál es la unidad
     * (`rangoAnteriorDeUnidad`); si no se pasa, los mismos días hacia atrás.
     */
    rangoAnteriorDado?: RangoFechas | null,
  ): Promise<TendenciaComparativa> {
    const rangoAnterior = rangoAnteriorDado ?? this.rangoAnteriorMismaLongitud(rangoActual, ahora);
    const todosRegistros = await this.obtenerRegistrosConCache();

    const actual = this.filtrarPorRango(todosRegistros, rangoActual, horaFiltro).length;
    const anterior = this.filtrarPorRango(todosRegistros, rangoAnterior, horaFiltro).length;

    const cambio = actual - anterior;
    const porcentajeCambio = anterior > 0 ? (cambio / anterior) * 100 : 0;

    let direccion: 'up' | 'down' | 'igual' = 'igual';
    if (cambio > 0) direccion = 'up';
    if (cambio < 0) direccion = 'down';

    const sinReferencia = anterior === 0 && actual > 0;
    const alMismoAvance = rangoActual.fin.getTime() > ahora.getTime();
    return { actual, anterior, cambio, porcentajeCambio, direccion, sinReferencia, rangoAnterior, alMismoAvance };
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
    ahora: Date = new Date(),
  ): Promise<ComparativaDosRangos> {
    const todos = await this.obtenerRegistrosConCache();
    const motivosBD = await this.databaseService.obtenerTodosLosMotivos();

    // P6: si un período sigue en curso, el otro se corta al mismo avance
    // (mismo número de días desde su inicio, misma hora). "Este mes" al
    // día 5 contra "mes pasado" completo daba −85 % casi siempre.
    const enCurso = (r: RangoFechas) =>
      r.inicio.getTime() <= ahora.getTime() && r.fin.getTime() > ahora.getTime();
    const cortarAlAvanceDe = (base: RangoFechas, otro: RangoFechas): RangoFechas => {
      const desdeInicio = diasEntre(base.inicio, ahora);
      const hasta = desplazarDias(otro.inicio, desdeInicio);
      hasta.setHours(ahora.getHours(), ahora.getMinutes(), ahora.getSeconds(), ahora.getMilliseconds());
      return { inicio: otro.inicio, fin: hasta.getTime() < otro.fin.getTime() ? hasta : otro.fin };
    };

    let efA = rangoA;
    let efB = rangoB;
    let corte: ComparativaDosRangos['corte'] = null;
    if (enCurso(rangoA) && !enCurso(rangoB)) {
      efA = { inicio: rangoA.inicio, fin: ahora };
      efB = cortarAlAvanceDe(rangoA, rangoB);
      if (efB.fin.getTime() < rangoB.fin.getTime()) corte = { slot: 'b', hasta: efB.fin };
    } else if (enCurso(rangoB) && !enCurso(rangoA)) {
      efB = { inicio: rangoB.inicio, fin: ahora };
      efA = cortarAlAvanceDe(rangoB, rangoA);
      if (efA.fin.getTime() < rangoA.fin.getTime()) corte = { slot: 'a', hasta: efA.fin };
    }

    const regsA = this.filtrarPorRango(todos, efA, horaFiltro);
    const regsB = this.filtrarPorRango(todos, efB, horaFiltro);

    const alumnosUnicos = (regs: Registro[]): number => {
      const set = new Set<string>();
      regs.forEach(r => { if (!esInvitado(r)) set.add(r.matricula); });
      return set.size;
    };

    const slice = (rango: RangoFechas, regs: Registro[]): ComparativaSlice => {
      const { promedio, dias } = promedioPorDiaConActividad(regs);
      return {
        rango,
        totalRegistros: regs.length,
        alumnosUnicos: alumnosUnicos(regs),
        promedioPorDia: promedio,
        diasConActividad: dias,
        horaPico: this.calcularHoraPicoDesdeRegistros(regs),
        motivos: distribucionDe(regs, motivosBD),
      };
    };

    const totalA = regsA.length;
    const totalB = regsB.length;
    const cambio = totalA - totalB;
    const porcentaje = totalB > 0 ? (cambio / totalB) * 100 : 0;
    let direccion: 'up' | 'down' | 'igual' = 'igual';
    if (cambio > 0) direccion = 'up';
    if (cambio < 0) direccion = 'down';

    return {
      a: slice(efA, regsA),
      b: slice(efB, regsB),
      corte,
      diferencia: { cambio, porcentaje, direccion, sinReferencia: totalB === 0 && totalA > 0 },
    };
  }

  async generarHeatmap(
    diasPeriodo = 30,
    rangoCustom?: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<HeatmapResultado> {
    // Si se pasa un rango explícito (el del filtro principal o uno propio), úsalo;
    // si no, deriva el rango de los últimos N días.
    const rango = rangoCustom ?? this.crearRangoUltimosDias(diasPeriodo);
    const todosRegistros = await this.obtenerRegistrosConCache();
    const registrosPeriodo = this.filtrarPorRango(todosRegistros, rango, horaFiltro);

    const heatmapMap = new Map<string, number>();
    const fechasConActividad = new Map<string, Set<string>>();

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
      const fechas = fechasConActividad.get(dia) ?? new Set<string>();
      fechas.add(`${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`);
      fechasConActividad.set(dia, fechas);
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

    const diasConActividad = new Map<string, number>();
    diasSemana.forEach(d => diasConActividad.set(d, fechasConActividad.get(d)?.size ?? 0));

    return { data: heatmapData, horas, rango, fechasPorDia, diasConActividad };
  }

  /** Cache local de alumnos (válido durante CACHE_TTL igual que registros). */
  private alumnosCache: Alumno[] | null = null;
  private alumnosCacheTs = 0;
  private async obtenerAlumnosConCache(): Promise<Alumno[]> {
    this.descartarCacheSiCambiaronLosDatos();
    const ahora = Date.now();
    if (this.alumnosCache && (ahora - this.alumnosCacheTs) < this.CACHE_TTL) {
      return this.alumnosCache;
    }
    this.alumnosCache = await this.databaseService.obtenerTodosLosAlumnos();
    this.alumnosCacheTs = ahora;
    return this.alumnosCache;
  }

  async obtenerTopAlumnos(
    limite = 10,
    dias?: number,
    rangoCustom?: RangoFechas,
    /** Filtro de hora del período principal (cuando el Top lo sigue). */
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<TopAlumno[]> {
    let registrosFiltrados = await this.obtenerRegistrosConCache();
    const todosAlumnos = await this.obtenerAlumnosConCache();
    const motivosBD = await this.databaseService.obtenerTodosLosMotivos();

    // Si se pasa un rango explícito (modo personalizado), úsalo;
    // sino y hay días (preset), filtrar por últimos N. Si nada, sin filtro.
    if (rangoCustom) {
      registrosFiltrados = this.filtrarPorRango(registrosFiltrados, rangoCustom, horaFiltro);
    } else if (dias && dias > 0) {
      const rango = this.crearRangoUltimosDias(dias);
      registrosFiltrados = this.filtrarPorRango(registrosFiltrados, rango, horaFiltro);
    }

    const registrosPorMatricula = new Map<string, Registro[]>();

    registrosFiltrados.forEach(registro => {
      const registros = registrosPorMatricula.get(registro.matricula) || [];
      registros.push(registro);
      registrosPorMatricula.set(registro.matricula, registros);
    });

    // v3.18.6: indexar alumnos por matrícula UNA vez (era O(n²) con .find()
    // dentro del forEach; ahora O(n) con el Map).
    const alumnosPorMatricula = new Map<string, Alumno>();
    todosAlumnos.forEach(a => alumnosPorMatricula.set(a.matricula, a));

    const topAlumnos: TopAlumno[] = [];

    registrosPorMatricula.forEach((registros, matricula) => {
      const alumno = alumnosPorMatricula.get(matricula);
      if (!alumno) return;

      const motivoFrecuente = motivoMasFrecuente(registros, motivosBD)?.nombre ?? 'N/A';

      const ultimaVisita = new Date(
        Math.max(...registros.map(r => new Date(r.fechaHora).getTime()))
      );

      topAlumnos.push({ alumno, totalVisitas: registros.length, ultimaVisita, motivoFrecuente });
    });

    // Empate en visitas → primero quien vino más recientemente. Antes dependía
    // del orden de llegada de los registros: con 4 alumnos empatados en el 5.º
    // lugar, cuál salía no estaba escrito en ninguna parte.
    return topAlumnos
      .sort((a, b) => b.totalVisitas - a.totalVisitas || b.ultimaVisita.getTime() - a.ultimaVisita.getTime())
      .slice(0, limite);
  }

  async generarInsights(
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
    umbralInactividadDias = 30,
    inactividadDesactivada = false,
    /**
     * El mismo período de referencia que la tarjeta de tendencia. Sin él,
     * "Este mes" (1–7 oct) decía "Sin datos previos" arriba (1–7 sep = 0) y
     * aquí "crecieron 200 %" contra los 7 días previos: dos comparaciones
     * distintas en la misma pantalla.
     */
    rangoAnterior?: RangoFechas | null,
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Solo insights EXTRAORDINARIOS (alertas que no duplican KPIs fijos).
    // Los KPIs ya muestran tendencia, hora pico e inactivos; aquí solo
    // levantamos la mano cuando el cambio es DRAMÁTICO (>50%).
    const tendencia = await this.compararTendencias(rango, horaFiltro, new Date(), rangoAnterior);
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

    // Inactividad con la definición única (P1): sobre los alumnos que han
    // venido alguna vez. Los importados que nunca han venido no "se
    // perdieron" y no deben disparar una alerta de reactivación.
    const umbral = Math.max(1, umbralInactividadDias);
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    const { inactivos, nuncaVinieron } = calcularInactividad(todosAlumnos, todosRegistros, umbral);
    const conHistorial = todosAlumnos.filter(a => a.activo !== false).length - nuncaVinieron.length;
    const proporcion = conHistorial > 0 ? inactivos.length / conHistorial : 0;
    if (!inactividadDesactivada && proporcion > 0.30) {
      insights.push({
        tipo: 'warning',
        icono: 'warning_amber',
        titulo: 'Muchos alumnos dejaron de venir',
        descripcion: `${(proporcion * 100).toFixed(0)}% de los alumnos que han venido alguna vez (${inactivos.length} de ${conHistorial}) lleva ${umbral} días o más sin volver. Considera campañas de reactivación.`,
      });
    }

    return insights;
  }

  /**
   * Inactividad con la definición única del sistema (P1): la misma que usa
   * la página /inactivos. `inactivos` = vinieron y llevan `umbral` días o
   * más sin volver; `nuncaVinieron` va aparte.
   */
  async contarInactividad(
    umbralInactividadDias = 30,
  ): Promise<{ inactivos: number; nuncaVinieron: number; unaSolaVisita: number }> {
    const todosRegistros = await this.obtenerRegistrosConCache();
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    const r = calcularInactividad(todosAlumnos, todosRegistros, umbralInactividadDias);
    return {
      inactivos: r.inactivos.length,
      nuncaVinieron: r.nuncaVinieron.length,
      unaSolaVisita: contarUnaSolaVisita(todosAlumnos, todosRegistros),
    };
  }

  /**
   * Registros generados por "Datos de prueba". Si hay, las cifras están
   * mezcladas con datos inventados y la pantalla tiene que decirlo (O13).
   */
  async contarRegistrosDePrueba(): Promise<number> {
    return (await this.obtenerRegistrosConCache()).filter(esRegistroDePrueba).length;
  }

  /** Proyección del total de hoy con el historial real (P8). `null` = no hay base. */
  async proyectarHoy(ahora: Date = new Date()): Promise<ProyeccionDia | null> {
    // La proyección mira 10 semanas atrás; se le pasa ese tramo (con holgura)
    // en vez del historial completo.
    const todos = await this.obtenerRegistrosConCache();
    const rango = this.normalizarRango(desplazarDias(ahora, -12 * 7), ahora);
    return proyectarCierreHoy(this.filtrarPorRango(todos, rango), ahora);
  }

  async analizarPorCarrera(
    rango: RangoFechas,
    horaFiltro?: { desde: number; hasta: number } | null,
  ): Promise<DatosCarrera[]> {
    const todos = await this.obtenerRegistrosConCache();
    const registrosFiltrados = this.filtrarPorRango(todos, rango, horaFiltro);

    const carrerasMap = new Map<string, { visitas: number; alumnos: Set<string> }>();

    registrosFiltrados.forEach(registro => {
      // P5: los invitados no son alumnos y no tienen carrera. Antes salían
      // como "Visitante": 40 visitas de "1 alumno" (todos con la matrícula
      // INVITADO). Se cuentan aparte en la pantalla.
      if (esInvitado(registro)) return;
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

  /**
   * v3.18.6: ya NO re-construye el heatmap (era trabajo duplicado).
   * Recibe directamente el HeatmapResultado ya calculado.
   */
  predecirDiaOcupadoDesde(heatmap: HeatmapResultado): string {
    // Promedio por día con actividad, no suma: en 30 días hay martes que
    // salen 5 veces y lunes 4, y sumar le regalaba +25 % al martes (O3).
    const totales = new Map<string, number>();
    heatmap.data.forEach(item => {
      totales.set(item.dia, (totales.get(item.dia) || 0) + item.cantidad);
    });
    const visitasPorDia = new Map<string, number>();
    totales.forEach((total, dia) => {
      const dias = heatmap.diasConActividad?.get(dia) ?? 0;
      if (dias > 0) visitasPorDia.set(dia, total / dias);
    });

    let diaOcupado = '';
    let maxVisitas = 0;
    visitasPorDia.forEach((visitas, dia) => {
      if (visitas > maxVisitas) {
        maxVisitas = visitas;
        diaOcupado = dia;
      }
    });
    return maxVisitas > 0 ? diaOcupado : '';
  }

  /** Versión legacy que acepta días. Internamente reusa la nueva. */
  async predecirDiaOcupado(dias = 30): Promise<string> {
    const heatmap = await this.generarHeatmap(dias);
    return this.predecirDiaOcupadoDesde(heatmap);
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