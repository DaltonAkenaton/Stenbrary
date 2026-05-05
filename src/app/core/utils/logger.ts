// ╔══════════════════════════════════════════════════════╗
// ║  logger.ts                                            ║
// ║  Stenbrary v3.19.0 — Logging dev-guarded              ║
// ║                                                       ║
// ║  Wrappers que solo emiten en isDevMode().             ║
// ║  En producción: silencio total → no expone PII        ║
// ║  (matrículas, datos de alumnos) en consola del cliente.║
// ║  Errores reales (log.error) sí pasan siempre — los    ║
// ║  necesitamos para diagnóstico en GlobalErrorHandler.  ║
// ╚══════════════════════════════════════════════════════╝

import { isDevMode } from '@angular/core';

/** Log informativo. Solo en dev. */
export function log(...args: unknown[]): void {
  if (isDevMode()) console.log(...args);
}

/** Warning. Solo en dev. */
export function logWarn(...args: unknown[]): void {
  if (isDevMode()) console.warn(...args);
}

/** Error. SIEMPRE — necesario para diagnóstico aunque la app esté en prod. */
export function logError(...args: unknown[]): void {
  console.error(...args);
}
