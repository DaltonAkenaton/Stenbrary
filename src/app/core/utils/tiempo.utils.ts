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
