// ╔══════════════════════════════════════════════════════╗
// ║  flujo-puerta.utils.ts                               ║
// ║  Stenbrary v3.54.0 — Flujos abandonados en la puerta ║
// ║                                                      ║
// ║  Un alumno escanea, entra a "elegir actividad" o al  ║
// ║  registro de alumno nuevo… y se va. En quiosco nada  ║
// ║  regresaba al escáner: el siguiente veía la pantalla ║
// ║  (y los datos) del anterior, y su lectura se perdía. ║
// ╚══════════════════════════════════════════════════════╝

/** Sin tocar nada este tiempo, una lectura de OTRA credencial reemplaza el flujo. */
export const FLUJO_CEDE_MS = 20_000;
/** Sin tocar nada este tiempo, el flujo se cancela solo y vuelve al escáner. */
export const ABANDONO_MOTIVO_MS = 90_000;
export const ABANDONO_REGISTRO_MS = 3 * 60_000;

export type LecturaEnFlujo =
  /** Pasó su propia credencial otra vez: no hay nada que hacer. */
  | 'misma'
  /** Alguien está usando la pantalla: la lectura del siguiente espera. */
  | 'esperar'
  /** La pantalla quedó abandonada (o ya terminó): atender al nuevo. */
  | 'atender';

export function decidirLecturaEnFlujo(p: {
  matriculaFlujo: string | null;
  leida: string;
  msSinInteraccion: number;
  /** El registro ya se guardó y solo queda la pantalla de éxito. */
  terminado?: boolean;
}): LecturaEnFlujo {
  if (p.terminado) return 'atender';
  if (p.matriculaFlujo && p.leida === p.matriculaFlujo) return 'misma';
  return p.msSinInteraccion >= FLUJO_CEDE_MS ? 'atender' : 'esperar';
}

/** Clave de sessionStorage con la matrícula que el escáner debe procesar al llegar. */
export const CLAVE_LECTURA_PENDIENTE = 'lecturaPendiente';
