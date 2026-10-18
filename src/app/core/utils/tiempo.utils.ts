// ╔══════════════════════════════════════════════════════╗
// ║  tiempo.utils.ts                                      ║
// ║  Stenbrary v3.19.0 — Helpers de fecha y duración      ║
// ║                                                       ║
// ║  Centraliza el formateo de duraciones ("Xh Ym") y     ║
// ║  el cálculo del rango de un día (00:00 → 23:59) que   ║
// ║  estaban duplicados en 6+ archivos.                   ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Formatea una duración en minutos a string legible.
 *
 * @param minutos - Duración en minutos (entero ≥ 0).
 * @param modoCorto - Si true: "1h 5m". Si false (default): "1h 5min" (o "5 min" sin horas).
 * @returns String formateado. Ejemplos:
 *   - 0   → "0 min"  (o "0m" en corto)
 *   - 45  → "45 min" (o "45m")
 *   - 60  → "1h"
 *   - 90  → "1h 30min" (o "1h 30m")
 */
export function formatearDuracion(minutos: number, modoCorto = false): string {
  if (!minutos || minutos < 1) return modoCorto ? '0m' : '0 min';
  if (minutos < 60) return modoCorto ? `${minutos}m` : `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (m === 0) return `${h}h`;
  return modoCorto ? `${h}h ${m}m` : `${h}h ${m}min`;
}

/**
 * Devuelve el rango [00:00:00.000, 23:59:59.999] del día dado (default: hoy).
 * Útil para queries IndexedDB con `IDBKeyRange.bound(inicio, fin)`.
 */
export function rangoDelDia(fecha: Date = new Date()): { inicio: Date; fin: Date } {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
}

/**
 * Devuelve el inicio del día dado (00:00:00.000). Default: hoy.
 */
export function inicioDelDia(fecha: Date = new Date()): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ═══════════════════════════════════════════════════════
// FECHAS DE CALENDARIO ('YYYY-MM-DD') — SIEMPRE EN HORA LOCAL
// ═══════════════════════════════════════════════════════
//
// `new Date('2026-10-03')` NO es el 3 de octubre a medianoche local: el
// estándar interpreta las fechas sin hora como medianoche UTC, que en
// México son las 18:00 del día ANTERIOR. Y `toISOString()` hace el viaje
// inverso: después de las 18:00 locales devuelve la fecha de mañana.
//
// Eso desfasaba un día los filtros de /registros (todos los "clic para ver
// registros" de Estadísticas mostraban el día anterior) y el borrado por
// rango de Configuración (borraba un día que no se eligió). Auditoría
// 2026-10, R1/R2/O15. Los tests de CI corrían en UTC, donde el desfase
// es cero, y por eso nunca falló nada.
//
// Regla: todo string de un <input type="date"> o de la URL entra por
// `parseFechaLocal`, y todo string de fecha que se genere sale de
// `fechaLocalISO`. Nunca `new Date(string)` ni `toISOString().split('T')`.

/**
 * Convierte 'YYYY-MM-DD' en la medianoche LOCAL de ese día.
 * Devuelve `null` si el texto no es una fecha de calendario válida
 * (incluye fechas imposibles como '2026-02-31').
 */
export function parseFechaLocal(texto: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((texto ?? '').trim());
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  // new Date(2026, 1, 31) "rueda" al 3 de marzo: se rechaza en vez de aceptar otro día.
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return d;
}

/** 'YYYY-MM-DD' del día LOCAL de `fecha` (default: hoy). */
export function fechaLocalISO(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Rango [00:00 del primer día, 23:59:59.999 de hoy] que cubre `dias` días
 * de calendario contando hoy. "Últimos 7 días" = hoy y los 6 anteriores;
 * antes se restaban 7 y salían 8 días (auditoría 2026-10, O14).
 */
export function rangoUltimosDias(dias: number, hoy: Date = new Date()): { inicio: Date; fin: Date } {
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - (Math.max(1, Math.floor(dias)) - 1));
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(hoy);
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
}

/**
 * Cuántas de `fechas` ocurrieron, dentro de su propio día, a la misma hora
 * del día que `referencia` o antes. Sirve para comparar "lo que va de hoy"
 * contra otro día al MISMO avance: comparar 30 accesos a las 10:00 contra
 * el lunes pasado COMPLETO daba "−75 %" todas las mañanas (auditoría
 * 2026-10, R5).
 */
export function contarHastaMismaHora(fechas: Date[], referencia: Date = new Date()): number {
  const corte = minutosDelDia(referencia);
  let n = 0;
  for (const f of fechas) {
    if (minutosDelDia(f) <= corte) n++;
  }
  return n;
}

function minutosDelDia(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/**
 * Días de calendario entre la fecha de `desde` y la de `hasta` (hora local),
 * ignorando la hora: del lunes 23:00 al martes 08:00 es 1 día. Cuenta con
 * fechas y no con milisegundos para que los días de 23 o 25 h del cambio
 * de horario (Nuevo Laredo lo conserva) no descuadren el resultado.
 */
export function diasCalendarioEntre(desde: Date, hasta: Date): number {
  const a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * La misma hora de reloj, `dias` días de calendario después (o antes, si es
 * negativo). Restar `dias × 24 h` en milisegundos corre una hora los rangos
 * que cruzan el cambio de horario; `setDate` no.
 */
export function desplazarDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

/**
 * La hora escrita, el mismo día de la entrada. `null` si es inválida, antes
 * de la entrada o después de ahora.
 * Corrige una salida estimada en "En Biblioteca" (v3.57.0).
 */
export function salidaCorregida(hora: string, entrada: Date, ahora: Date): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora ?? '');
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  const d = new Date(entrada);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  // Misma hora y minuto de la entrada vale (0 min); antes, no.
  const entradaMin = new Date(entrada);
  entradaMin.setSeconds(0, 0);
  if (d.getTime() < entradaMin.getTime() || d.getTime() > ahora.getTime()) return null;
  return d;
}
