// ╔══════════════════════════════════════════════════════╗
// ║  estadisticas.utils.ts                                ║
// ║  Stenbrary v3.42.0 — Definiciones únicas de métricas   ║
// ║                                                       ║
// ║  Funciones puras: sin BD, sin Angular, sin "ahora"     ║
// ║  implícito (se recibe como parámetro). Cada métrica    ║
// ║  que aparece en más de una pantalla se calcula AQUÍ,   ║
// ║  una vez. Antes, "alumnos inactivos" tenía dos         ║
// ║  definiciones y daba dos números distintos con el      ║
// ║  mismo título (auditoría 2026-10, R6).                 ║
// ║                                                       ║
// ║  Decisiones de producto que implementa (ver            ║
// ║  docs/AUDITORIA-2026-10.md, sección ❓):                ║
// ║  - P1 inactivos = vinieron y dejaron de venir;         ║
// ║    "nunca han venido" va aparte.                       ║
// ║  - P2 cada motivo de una visita suma un punto.         ║
// ║  - P3 las salidas estimadas no cuentan como estancia.  ║
// ║  - P4 promedio por día = entre días con actividad.     ║
// ║  - P5 los invitados no son alumnos: fuera de carreras, ║
// ║    turnos y grados.                                    ║
// ║  - P8 proyección del día con el historial real.        ║
// ╚══════════════════════════════════════════════════════╝

import { Alumno, Motivo, Registro } from '../models';
import { contarHastaMismaHora, diasCalendarioEntre } from './tiempo.utils';

export const MATRICULA_INVITADO = 'INVITADO';

export function esInvitado(r: Pick<Registro, 'matricula'>): boolean {
  return r.matricula === MATRICULA_INVITADO;
}

// ═══════════════════════════════════════════════════════
// P3 — DURACIONES REALES
// ═══════════════════════════════════════════════════════

/**
 * True si la hora de salida la puso el sistema. `cierreAutomatico` cubre
 * los cierres pendientes de confirmar anteriores a v3.42.0, que no tenían
 * la marca permanente.
 */
export function esSalidaEstimada(r: Pick<Registro, 'salidaEstimada' | 'cierreAutomatico'>): boolean {
  return r.salidaEstimada === true || r.cierreAutomatico === true;
}

/** Minutos de estancia MEDIDOS, o `null` si no hay salida real. */
export function duracionReal(r: Registro): number | null {
  if (typeof r.duracionMinutos !== 'number' || r.duracionMinutos <= 0) return null;
  if (esSalidaEstimada(r)) return null;
  return r.duracionMinutos;
}

export interface ResumenEstancia {
  /** Minutos sumados, solo de salidas reales. */
  totalMinutos: number;
  /** Visitas con salida real (las que entran en el promedio). */
  visitasMedidas: number;
  /** Visitas cuya salida fue estimada por el sistema (excluidas). */
  visitasEstimadas: number;
  /** Promedio en minutos, redondeado; 0 si no hay mediciones. */
  promedioMinutos: number;
}

export function resumirEstancia(registros: Registro[]): ResumenEstancia {
  let totalMinutos = 0;
  let visitasMedidas = 0;
  let visitasEstimadas = 0;
  for (const r of registros) {
    const d = duracionReal(r);
    if (d !== null) {
      totalMinutos += d;
      visitasMedidas++;
    } else if (r.horaSalida && esSalidaEstimada(r)) {
      visitasEstimadas++;
    }
  }
  return {
    totalMinutos,
    visitasMedidas,
    visitasEstimadas,
    promedioMinutos: visitasMedidas > 0 ? Math.round(totalMinutos / visitasMedidas) : 0,
  };
}

// ═══════════════════════════════════════════════════════
// P2 — MOTIVOS
// ═══════════════════════════════════════════════════════

export interface ConteoMotivo {
  /** Id del motivo, o el nombre si el registro no trae id. */
  clave: string;
  /** Nombre ACTUAL del motivo si existe en el catálogo; si no, el guardado. */
  nombre: string;
  /** Visitas que incluyeron este motivo. */
  cantidad: number;
  color?: string;
}

/**
 * Cuenta motivos: una visita con 3 motivos suma un punto a cada uno, así
 * que las cantidades suman MÁS que el total de visitas — los porcentajes
 * se leen como "% de visitas que incluyeron este motivo" (decisión P2).
 *
 * Se agrupa por id, no por nombre: renombrar un motivo partía sus
 * estadísticas en dos (auditoría 2026-10, O12). El nombre que se muestra
 * es el actual del catálogo.
 */
export function contarMotivos(registros: Registro[], catalogo: Motivo[] = []): ConteoMotivo[] {
  const porId = new Map(catalogo.filter(m => m.id).map(m => [m.id as string, m]));
  const conteo = new Map<string, ConteoMotivo>();

  for (const r of registros) {
    const ids = r.motivoIds && r.motivoIds.length > 0 ? r.motivoIds : [r.motivoId];
    const nombres = r.motivoIds && r.motivoIds.length > 0 ? (r.motivoNombres ?? []) : [r.motivoNombre];
    const vistos = new Set<string>();
    ids.forEach((id, i) => {
      const guardado = nombres[i] || r.motivoNombre || 'Sin motivo';
      const clave = id || guardado;
      if (vistos.has(clave)) return; // un motivo repetido en la misma visita cuenta una vez
      vistos.add(clave);
      const enCatalogo = id ? porId.get(id) : undefined;
      const item = conteo.get(clave);
      if (item) item.cantidad++;
      else conteo.set(clave, {
        clave,
        nombre: enCatalogo?.nombre ?? guardado,
        cantidad: 1,
        color: enCatalogo?.color,
      });
    });
  }
  return [...conteo.values()].sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
}

/** El motivo con más visitas, o `null` si no hay. */
export function motivoMasFrecuente(registros: Registro[], catalogo: Motivo[] = []): ConteoMotivo | null {
  return contarMotivos(registros, catalogo)[0] ?? null;
}

/** ¿La visita incluyó este motivo (por nombre)? Para filtros de /registros. */
export function incluyeMotivo(r: Registro, nombre: string): boolean {
  if (r.motivoNombres && r.motivoNombres.length > 0) return r.motivoNombres.includes(nombre);
  return r.motivoNombre === nombre;
}

// ═══════════════════════════════════════════════════════
// P4 — DÍAS CON ACTIVIDAD
// ═══════════════════════════════════════════════════════

function claveDia(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Días de calendario distintos con al menos un registro. Es el divisor del
 * "promedio por día": si hubo registros, la biblioteca abrió; así quedan
 * fuera solos los domingos, festivos y vacaciones (decisión P4).
 */
export function diasConActividad(registros: Registro[]): number {
  const dias = new Set<string>();
  for (const r of registros) {
    const d = new Date(r.fechaHora);
    if (!isNaN(d.getTime())) dias.add(claveDia(d));
  }
  return dias.size;
}

export function promedioPorDiaConActividad(registros: Registro[]): { promedio: number; dias: number } {
  const dias = diasConActividad(registros);
  return {
    dias,
    promedio: dias > 0 ? parseFloat((registros.length / dias).toFixed(1)) : 0,
  };
}

/**
 * Día de la semana más concurrido EN PROMEDIO (visitas ÷ días de ese tipo
 * con actividad). Sumar sin dividir le daba hasta +25 % a los días que
 * caían 5 veces en el rango contra los que caían 4 (auditoría 2026-10, O3).
 * Devuelve el índice 0=domingo … 6=sábado, o `null`.
 */
export function diaSemanaMasConcurrido(registros: Registro[]): number | null {
  const visitas = new Array<number>(7).fill(0);
  const dias: Set<string>[] = Array.from({ length: 7 }, () => new Set<string>());
  for (const r of registros) {
    const d = new Date(r.fechaHora);
    if (isNaN(d.getTime())) continue;
    visitas[d.getDay()]++;
    dias[d.getDay()].add(claveDia(d));
  }
  let mejor: number | null = null;
  let mejorPromedio = 0;
  for (let i = 0; i < 7; i++) {
    const n = dias[i].size;
    if (n === 0) continue;
    const prom = visitas[i] / n;
    if (prom > mejorPromedio) {
      mejorPromedio = prom;
      mejor = i;
    }
  }
  return mejor;
}

// ═══════════════════════════════════════════════════════
// P1 — INACTIVIDAD
// ═══════════════════════════════════════════════════════

export interface AlumnoInactivo {
  alumno: Alumno;
  /** null = nunca ha venido. */
  ultimaVisita: Date | null;
  /** Días de calendario desde la última visita; Infinity si nunca vino. */
  diasSinVenir: number;
}

export interface ResultadoInactividad {
  /** Vinieron al menos una vez y llevan `umbral` días o más sin venir. */
  inactivos: AlumnoInactivo[];
  /** Activos en el padrón sin ninguna visita (p. ej. importados de Excel). */
  nuncaVinieron: AlumnoInactivo[];
}

/**
 * Única definición de "alumno inactivo" del sistema (decisión P1):
 * - el alumno no está desactivado (`activo !== false`);
 * - vino al menos una vez;
 * - su última visita fue hace `umbralDias` días de calendario o más.
 *
 * Los que nunca han venido se devuelven aparte: casi siempre son alumnos
 * importados del padrón que aún no estrenan la biblioteca, no alumnos que
 * "se perdieron". Se cuentan en días de calendario (no en bloques de 24 h)
 * para que el resultado no cambie según la hora a la que se consulta.
 */
export function calcularInactividad(
  alumnos: Alumno[],
  registros: Registro[],
  umbralDias: number,
  ahora: Date = new Date(),
): ResultadoInactividad {
  const umbral = Math.max(1, Math.floor(umbralDias) || 1);
  const ultima = new Map<string, number>();
  for (const r of registros) {
    const t = new Date(r.fechaHora).getTime();
    if (!Number.isFinite(t)) continue;
    const prev = ultima.get(r.matricula);
    if (prev === undefined || t > prev) ultima.set(r.matricula, t);
  }

  const inactivos: AlumnoInactivo[] = [];
  const nuncaVinieron: AlumnoInactivo[] = [];
  for (const alumno of alumnos) {
    if (alumno.activo === false) continue;
    const t = ultima.get(alumno.matricula);
    if (t === undefined) {
      nuncaVinieron.push({ alumno, ultimaVisita: null, diasSinVenir: Infinity });
      continue;
    }
    const ultimaVisita = new Date(t);
    const diasSinVenir = diasCalendarioEntre(ultimaVisita, ahora);
    if (diasSinVenir >= umbral) inactivos.push({ alumno, ultimaVisita, diasSinVenir });
  }
  inactivos.sort((a, b) => b.diasSinVenir - a.diasSinVenir);
  return { inactivos, nuncaVinieron };
}

// ═══════════════════════════════════════════════════════
// P8 — PROYECCIÓN DEL DÍA
// ═══════════════════════════════════════════════════════

export interface ProyeccionDia {
  /** Visitas estimadas al cierre de hoy. */
  total: number;
  /** Fracción del día que suele haber llegado a esta hora (0–1). */
  fraccionTipica: number;
  /** Cuántos días del historial sostienen la estimación. */
  diasBase: number;
  confianza: 'alta' | 'media' | 'baja';
}

/** Mínimo de días comparables para atreverse a proyectar. */
export const PROYECCION_MIN_DIAS = 4;
/** Cuántos días anteriores del mismo tipo se usan como máximo. */
const PROYECCION_MAX_DIAS = 8;
/** Hasta cuántas semanas atrás se buscan. */
const PROYECCION_SEMANAS = 10;

/**
 * Proyecta el total de hoy con el ritmo REAL de días parecidos: los
 * últimos (hasta 8) días con actividad del mismo día de la semana, dentro
 * de las últimas 10 semanas. De ellos se toma qué fracción del total del
 * día suele haber llegado a esta hora, y se extrapola lo que va de hoy.
 *
 * Sustituye a la extrapolación lineal con horario fijo de 7 a 22 h, que
 * ignoraba el horario configurado y suponía un flujo parejo (decisión P8).
 *
 * Devuelve `null` —y la UI no muestra nada— cuando no hay base:
 * menos de 4 días comparables, nada llegado aún a esta hora en ellos, o
 * hoy sin visitas. Un número inventado es peor que ninguno.
 *
 * La confianza sale de qué tan bien habría acertado este mismo método en
 * los días de la base: error medio < 15 % alta, < 30 % media, si no baja.
 */
export function proyectarCierreHoy(registros: Registro[], ahora: Date = new Date()): ProyeccionDia | null {
  const inicioHoy = new Date(ahora);
  inicioHoy.setHours(0, 0, 0, 0);
  const desde = new Date(inicioHoy);
  desde.setDate(desde.getDate() - PROYECCION_SEMANAS * 7);

  const dow = ahora.getDay();
  let visitasHoy = 0;
  const porDia = new Map<string, Date[]>();
  for (const r of registros) {
    const d = new Date(r.fechaHora);
    const t = d.getTime();
    if (!Number.isFinite(t)) continue;
    if (t >= inicioHoy.getTime()) {
      if (t <= ahora.getTime()) visitasHoy++;
      continue;
    }
    if (t < desde.getTime() || d.getDay() !== dow) continue;
    const k = claveDia(d);
    const lista = porDia.get(k);
    if (lista) lista.push(d); else porDia.set(k, [d]);
  }
  if (visitasHoy === 0) return null;

  // Los más recientes primero: el ritmo de hace 2 meses pesa menos que el de la semana pasada.
  const base = [...porDia.values()]
    .sort((a, b) => b[0].getTime() - a[0].getTime())
    .slice(0, PROYECCION_MAX_DIAS);
  if (base.length < PROYECCION_MIN_DIAS) return null;

  let sumaHasta = 0;
  let sumaTotal = 0;
  const pares = base.map(fechas => {
    const hasta = contarHastaMismaHora(fechas, ahora);
    sumaHasta += hasta;
    sumaTotal += fechas.length;
    return { hasta, total: fechas.length };
  });
  if (sumaHasta === 0) return null; // a esta hora normalmente aún no llega nadie

  const fraccion = sumaHasta / sumaTotal;
  const errores = pares.map(p => Math.abs(p.hasta / fraccion - p.total) / p.total);
  const errorMedio = errores.reduce((s, e) => s + e, 0) / errores.length;

  return {
    total: Math.max(visitasHoy, Math.round(visitasHoy / fraccion)),
    fraccionTipica: fraccion,
    diasBase: base.length,
    confianza: errorMedio < 0.15 ? 'alta' : errorMedio < 0.3 ? 'media' : 'baja',
  };
}
