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
import { contarHastaMismaHora, desplazarDias, diasCalendarioEntre } from './tiempo.utils';

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

// ═══════════════════════════════════════════════════════
// MÉTRICAS DEL DASHBOARD EJECUTIVO (Tanda 3: blindaje)
// ═══════════════════════════════════════════════════════
// Antes vivían dentro del componente de 2800 líneas, sin un solo test.
// Aquí se calculan; el componente solo les pone colores y textos.

/**
 * Visitas mínimas para contar a un alumno como "recurrente", según el largo
 * del período: ≤7 días → 2, ≤30 → 3, ≤90 → 5, más → 8.
 */
export function umbralRetencionPara(diasDelRango: number): number {
  return diasDelRango <= 7 ? 2 : diasDelRango <= 30 ? 3 : diasDelRango <= 90 ? 5 : 8;
}

export interface TasaRetencion {
  /** % de alumnos únicos que vinieron `umbral` veces o más (0–100, entero). */
  porcentaje: number;
  recurrentes: number;
  unicos: number;
  umbral: number;
}

/** De los alumnos que vinieron en el período, cuántos vinieron `umbral` veces o más. Sin invitados. */
export function tasaRetencion(registros: Registro[], umbral: number): TasaRetencion {
  const visitas = new Map<string, number>();
  for (const r of registros) {
    if (esInvitado(r)) continue;
    visitas.set(r.matricula, (visitas.get(r.matricula) || 0) + 1);
  }
  let recurrentes = 0;
  visitas.forEach(v => { if (v >= umbral) recurrentes++; });
  return {
    porcentaje: visitas.size > 0 ? Math.round((recurrentes / visitas.size) * 100) : 0,
    recurrentes,
    unicos: visitas.size,
    umbral,
  };
}

export interface ParteDeDistribucion<K> {
  clave: K;
  cantidad: number;
  /** % del total de la distribución, 1 decimal. */
  porcentaje: number;
}

function repartir<K>(conteo: Map<K, number>): ParteDeDistribucion<K>[] {
  const total = [...conteo.values()].reduce((s, v) => s + v, 0);
  return [...conteo.entries()].map(([clave, cantidad]) => ({
    clave,
    cantidad,
    porcentaje: total > 0 ? parseFloat((cantidad / total * 100).toFixed(1)) : 0,
  }));
}

/**
 * Visitas de alumnos por turno (P5: sin invitados). Usa el turno guardado en
 * el registro; los anteriores a v3.16.0 no lo tienen y se toma el del alumno.
 */
export function distribucionPorTurno(
  registros: Registro[],
  turnoDelAlumno: (matricula: string) => string | undefined,
): ParteDeDistribucion<string>[] {
  const conteo = new Map<string, number>();
  for (const r of registros) {
    if (esInvitado(r)) continue;
    const t = r.turno || turnoDelAlumno(r.matricula) || 'Sin turno';
    conteo.set(t, (conteo.get(t) || 0) + 1);
  }
  return repartir(conteo).sort((a, b) => b.cantidad - a.cantidad);
}

/**
 * Visitas por grado. El registro no guarda el grado, así que se usa el
 * ACTUAL del alumno: una visita de hace un año cuenta en el grado de hoy.
 * Sin invitados ni alumnos borrados (no tienen grado).
 */
export function distribucionPorGrado(
  registros: Registro[],
  gradoDelAlumno: (matricula: string) => number | undefined,
): ParteDeDistribucion<number>[] {
  const conteo = new Map<number, number>();
  for (const r of registros) {
    if (esInvitado(r)) continue;
    const g = gradoDelAlumno(r.matricula);
    if (g != null) conteo.set(g, (conteo.get(g) || 0) + 1);
  }
  return repartir(conteo).sort((a, b) => a.clave - b.clave);
}

/** Las combinaciones de motivos más frecuentes (solo visitas con 2 o más distintos). */
export function combinacionesDeMotivos(registros: Registro[], limite = 5): ParteDeDistribucion<string>[] {
  const conteo = new Map<string, number>();
  for (const r of registros) {
    const nombres = r.motivoNombres;
    if (!nombres) continue;
    const distintos = [...new Set(nombres)].sort();
    if (distintos.length < 2) continue; // el mismo motivo repetido no es combinación
    const combo = distintos.join(' + ');
    conteo.set(combo, (conteo.get(combo) || 0) + 1);
  }
  return repartir(conteo).sort((a, b) => b.cantidad - a.cantidad).slice(0, limite);
}

/**
 * Coeficiente de variación (%) de las visitas diarias: qué tan parecidos son
 * los días entre sí. Ignora los días con 0 (cerrados), coherente con P4.
 * 0 si hay menos de 2 días con actividad.
 */
export function variacionDiaria(cantidadesPorDia: number[]): number {
  const valores = cantidadesPorDia.filter(v => v > 0);
  if (valores.length < 2) return 0;
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  const varianza = valores.reduce((s, v) => s + (v - media) ** 2, 0) / valores.length;
  return media > 0 ? Math.round((Math.sqrt(varianza) / media) * 100) : 0;
}

// ─── Crecimiento mes a mes ─────────────────────────────

export interface MesConteo {
  /** Primer día del mes, 00:00 local. */
  inicio: Date;
  cantidad: number;
}

/** Visitas de los últimos `meses` meses calendario; el último es el mes en curso. */
export function conteoMensual(registros: Registro[], hoy: Date = new Date(), meses = 12): MesConteo[] {
  const lista: MesConteo[] = [];
  const indice = new Map<string, MesConteo>();
  for (let i = meses - 1; i >= 0; i--) {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const m = { inicio, cantidad: 0 };
    lista.push(m);
    indice.set(`${inicio.getFullYear()}-${inicio.getMonth()}`, m);
  }
  for (const r of registros) {
    const d = new Date(r.fechaHora);
    const m = indice.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.cantidad++;
  }
  return lista;
}

/**
 * Visitas del mes anterior hasta el mismo día del mes y la misma hora que
 * `hoy` (31 de marzo → hasta el 28 de febrero). Es la base justa para
 * comparar el mes en curso, que va a medias (P6).
 */
export function mesAnteriorAlMismoDia(registros: Registro[], hoy: Date = new Date()): number {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  const corte = new Date(hoy.getFullYear(), hoy.getMonth() - 1, Math.min(hoy.getDate(), ultimoDia),
    hoy.getHours(), hoy.getMinutes(), hoy.getSeconds(), 999);
  let n = 0;
  for (const r of registros) {
    const t = new Date(r.fechaHora).getTime();
    if (t >= inicio.getTime() && t <= corte.getTime()) n++;
  }
  return n;
}

export type CambioMensual =
  | { tipo: 'porcentaje'; valor: number }
  /** Antes hubo 0 y ahora no: no hay base para un %. */
  | { tipo: 'nuevo' }
  | { tipo: 'ninguno' };

export interface ResumenCrecimiento {
  total: number;
  /** Promedio entre los meses con al menos una visita. */
  promedioMensual: number;
  /** Índice del mes con más visitas, o -1 si no hubo ninguna. */
  mejorIdx: number;
  /** Índice del mes cerrado con menos visitas (>0), o -1. El mes en curso no participa. */
  peorIdx: number;
  /** Cambio de cada mes contra el anterior; el mes en curso, al mismo avance. */
  cambios: CambioMensual[];
  /**
   * Últimos 3 meses CERRADOS contra los 3 previos; null sin historial.
   * `sinReferencia`: el trimestre previo tuvo 0 visitas — antes salía "↑ 100 %".
   */
  trimestre: { porcentaje: number; direccion: 'up' | 'down' | 'igual'; sinReferencia: boolean } | null;
}

function cambioEntre(actual: number, anterior: number | null): CambioMensual {
  if (anterior === null) return { tipo: 'ninguno' };
  if (anterior > 0) return { tipo: 'porcentaje', valor: ((actual - anterior) / anterior) * 100 };
  return actual > 0 ? { tipo: 'nuevo' } : { tipo: 'ninguno' };
}

export function resumirCrecimiento(cantidades: number[], anteriorAlMismoDia: number): ResumenCrecimiento {
  const n = cantidades.length;
  const total = cantidades.reduce((s, v) => s + v, 0);
  const conDatos = cantidades.filter(c => c > 0).length;

  let mejorIdx = -1;
  let peorIdx = -1;
  cantidades.forEach((c, i) => {
    if (c > 0 && (mejorIdx === -1 || c > cantidades[mejorIdx])) mejorIdx = i;
    if (i === n - 1) return; // el mes en curso está incompleto
    if (c > 0 && (peorIdx === -1 || c < cantidades[peorIdx])) peorIdx = i;
  });
  // Si el más bajo empata con el mejor, "más bajo" no dice nada.
  if (peorIdx !== -1 && mejorIdx !== -1 && cantidades[peorIdx] === cantidades[mejorIdx]) peorIdx = -1;

  const cambios = cantidades.map((c, i) => {
    if (i === 0) return cambioEntre(c, null);
    return cambioEntre(c, i === n - 1 ? anteriorAlMismoDia : cantidades[i - 1]);
  });

  let trimestre: ResumenCrecimiento['trimestre'] = null;
  const fin = n - 1; // excluye el mes en curso
  const ultimos = cantidades.slice(Math.max(0, fin - 3), fin);
  const previos = cantidades.slice(Math.max(0, fin - 6), Math.max(0, fin - 3));
  if (ultimos.length >= 2 && previos.length >= 2) {
    const a = ultimos.reduce((s, v) => s + v, 0);
    const b = previos.reduce((s, v) => s + v, 0);
    const porcentaje = b > 0 ? ((a - b) / b) * 100 : 0;
    const sinReferencia = b === 0 && a > 0;
    const direccion: 'up' | 'down' | 'igual' =
      sinReferencia ? 'up' : porcentaje > 2 ? 'up' : porcentaje < -2 ? 'down' : 'igual';
    trimestre = { porcentaje, direccion, sinReferencia };
  }

  return {
    total,
    promedioMensual: conDatos > 0 ? Math.round(total / conDatos) : 0,
    mejorIdx,
    peorIdx,
    cambios,
    trimestre,
  };
}

// ─── Mapa de calor ─────────────────────────────────────

/**
 * Cortes p25 / p50 / p75 de las celdas CON visitas: los colores del mapa de
 * calor se reparten por cuartos de la lista ordenada, no como % del máximo
 * (una celda atípica aplastaba al resto).
 */
export function cuartilesDeCeldas(valores: number[]): { p25: number; p50: number; p75: number } {
  const v = valores.filter(x => x > 0).sort((a, b) => a - b);
  const p = (q: number) => (v.length === 0 ? 0 : v[Math.min(v.length - 1, Math.floor(v.length * q))]);
  return { p25: p(0.25), p50: p(0.5), p75: p(0.75) };
}

/** Nivel 0–4 de una celda según los cuartiles. */
export function nivelDeIntensidad(cantidad: number, c: { p25: number; p50: number; p75: number }): 0 | 1 | 2 | 3 | 4 {
  if (cantidad <= 0) return 0;
  if (cantidad <= c.p25) return 1;
  if (cantidad <= c.p50) return 2;
  if (cantidad <= c.p75) return 3;
  return 4;
}

// ═══════════════════════════════════════════════════════
// PERÍODO ANTERIOR POR UNIDAD (v3.46.0)
// ═══════════════════════════════════════════════════════
// "Esta semana" (lunes–martes) se comparaba con los 2 días previos: el
// sábado y el domingo. "Este mes" (1–6) con los últimos 6 días del mes
// anterior. "Este periodo" (Otoño) con un trozo de Primavera. La regla de
// "misma cantidad de días hacia atrás" solo tiene sentido para rangos
// móviles (7/30/90 días, hoy). Para unidades de calendario lo que se
// compara es la UNIDAD ANTERIOR AL MISMO AVANCE (reportado por el usuario
// con capturas, 2026-10-06).

export type UnidadDeComparacion =
  | { tipo: 'semana' }
  | { tipo: 'mes' }
  | { tipo: 'anio' }
  /** `anterior` = rango del periodo escolar previo; null si no hay. */
  | { tipo: 'periodo'; anterior: { inicio: Date; fin: Date } | null };

function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

/** Misma hora, `meses` meses atrás/adelante; el día se recorta al último del mes (31 mar → 28 feb). */
function desplazarMeses(fecha: Date, meses: number): Date {
  const objetivo = new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1,
    fecha.getHours(), fecha.getMinutes(), fecha.getSeconds(), fecha.getMilliseconds());
  objetivo.setDate(Math.min(fecha.getDate(), ultimoDiaDelMes(objetivo.getFullYear(), objetivo.getMonth())));
  return objetivo;
}

function esFinDeMes(d: Date): boolean {
  return d.getDate() === ultimoDiaDelMes(d.getFullYear(), d.getMonth()) && d.getHours() === 23;
}

/**
 * El rango con el que se compara `actual` cuando es una unidad de
 * calendario, AL MISMO AVANCE: si `actual` todavía no termina, el anterior
 * se corta en el mismo punto relativo (mismo día de la semana / del mes /
 * del año / del periodo, misma hora).
 */
export function rangoAnteriorDeUnidad(
  unidad: UnidadDeComparacion,
  actual: { inicio: Date; fin: Date },
  ahora: Date = new Date(),
): { inicio: Date; fin: Date } | null {
  const finEfectivo = actual.fin.getTime() > ahora.getTime() ? ahora : actual.fin;

  switch (unidad.tipo) {
    case 'semana':
      return { inicio: desplazarDias(actual.inicio, -7), fin: desplazarDias(finEfectivo, -7) };

    case 'mes': {
      const inicio = desplazarMeses(actual.inicio, -1);
      // Mes completo contra mes completo: el 30 de abril se compara con el 31 de marzo, no con el 30.
      const fin = esFinDeMes(finEfectivo)
        ? new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0, 23, 59, 59, 999)
        : desplazarMeses(finEfectivo, -1);
      return { inicio, fin };
    }

    case 'anio':
      return { inicio: desplazarMeses(actual.inicio, -12), fin: desplazarMeses(finEfectivo, -12) };

    case 'periodo': {
      if (!unidad.anterior) return null;
      // Mismo número de días desde el inicio de cada periodo, misma hora.
      const dias = diasCalendarioEntre(actual.inicio, finEfectivo);
      const fin = desplazarDias(unidad.anterior.inicio, dias);
      fin.setHours(finEfectivo.getHours(), finEfectivo.getMinutes(), finEfectivo.getSeconds(), finEfectivo.getMilliseconds());
      return {
        inicio: new Date(unidad.anterior.inicio),
        fin: fin.getTime() < unidad.anterior.fin.getTime() ? fin : new Date(unidad.anterior.fin),
      };
    }
  }
}
