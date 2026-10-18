// ╔══════════════════════════════════════════════════════╗
// ║  quiosco.utils.ts                                    ║
// ║  Stenbrary v3.52.0 — Quiosco: volver solo + PIN      ║
// ║                                                      ║
// ║  Cierra el hueco de "el coordinador salió del        ║
// ║  quiosco y se le olvidó volver a activarlo": tras N  ║
// ║  minutos sin uso, el equipo regresa al escáner.      ║
// ╚══════════════════════════════════════════════════════╝

import { diasCalendarioEntre } from './tiempo.utils';

/** Rutas donde nunca se reactiva: el asistente inicial no debe interrumpirse. */
const RUTAS_EXCLUIDAS = ['/bienvenida', '/login'];

export interface EstadoQuiosco {
  /** El modo quiosco ya está encendido. */
  activo: boolean;
  /** Minutos sin uso configurados. 0 = función apagada. */
  minutos: number;
  /** Última interacción (ms epoch). */
  ultimaActividad: number;
  ahora: number;
  /** Ruta actual, sin query string. */
  ruta: string;
}

/** ¿Toca volver al modo quiosco? Función pura: el servicio solo la consulta. */
export function debeVolverAQuiosco(e: EstadoQuiosco): boolean {
  if (e.activo || !(e.minutos > 0)) return false;
  if (RUTAS_EXCLUIDAS.some(r => e.ruta.startsWith(r))) return false;
  return e.ahora - e.ultimaActividad >= e.minutos * 60_000;
}

// ── Límite de intentos del PIN (v3.52.0) ────────────────
// Sin límite, un PIN de 4 dígitos se adivina probando: el diálogo aceptaba
// intentos sin fin. Con 5 por cada 5 minutos, probar las 10 000 combinaciones
// llevaría días frente a la puerta, y la bitácora anota cada bloqueo.

export const PIN_MAX_FALLOS = 5;
export const PIN_BLOQUEO_MS = 5 * 60_000;

export interface IntentosPin {
  /** Fallos seguidos desde el último acierto o el último bloqueo. */
  fallos: number;
  /** Hasta cuándo no se aceptan intentos (ms epoch). 0 = sin bloqueo. */
  bloqueadoHasta: number;
}

export const INTENTOS_PIN_INICIAL: IntentosPin = { fallos: 0, bloqueadoHasta: 0 };

/** Milisegundos que faltan de bloqueo; 0 si se puede intentar. */
export function msBloqueoPin(e: IntentosPin, ahora: number): number {
  return Math.min(PIN_BLOQUEO_MS, Math.max(0, e.bloqueadoHasta - ahora));
}

/**
 * Si el reloj del equipo se atrasó, el fin del bloqueo puede quedar a horas o
 * días: se recorta a un bloqueo completo desde ahora, para que no quede trabado.
 */
export function normalizarIntentosPin(e: IntentosPin, ahora: number): IntentosPin {
  return e.bloqueadoHasta > ahora + PIN_BLOQUEO_MS ? { ...e, bloqueadoHasta: ahora + PIN_BLOQUEO_MS } : e;
}

/** Suma un fallo; al llegar al tope, bloquea y reinicia la cuenta. */
export function registrarFalloPin(e: IntentosPin, ahora: number): IntentosPin {
  const fallos = e.fallos + 1;
  if (fallos >= PIN_MAX_FALLOS) return { fallos: 0, bloqueadoHasta: ahora + PIN_BLOQUEO_MS };
  return { fallos, bloqueadoHasta: 0 };
}

/** Lee el estado guardado tolerando basura (localStorage lo puede editar cualquiera). */
export function leerIntentosPin(crudo: string | null): IntentosPin {
  try {
    const p = JSON.parse(crudo ?? '');
    const fallos = Number(p?.fallos);
    const hasta = Number(p?.bloqueadoHasta);
    return {
      fallos: Number.isFinite(fallos) && fallos > 0 ? Math.floor(fallos) : 0,
      bloqueadoHasta: Number.isFinite(hasta) && hasta > 0 ? hasta : 0,
    };
  } catch {
    // Vacío o corrupto: empezar de cero.
    return { ...INTENTOS_PIN_INICIAL };
  }
}

// ── Último respaldo, para el diálogo del PIN (v3.53.0) ──
// En la puerta, en quiosco, el recordatorio de respaldo del Resumen no se ve
// nunca: el diálogo del PIN es donde se descarga, así que ahí se avisa.

/** "hoy a las 18:02", "ayer", "hace 3 días" o "nunca". */
export function textoUltimoRespaldo(ts: number, ahora: Date = new Date()): string {
  if (!(ts > 0)) return 'nunca';
  const fecha = new Date(ts);
  const dias = diasCalendarioEntre(fecha, ahora);
  if (dias <= 0) {
    return `hoy a las ${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  }
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

// ── Reglas del PIN y código de recuperación (v3.57.0) ───
// El asistente aceptaba 4–8 dígitos, Configuración 4–6 y el guardado cortaba
// a 6: un PIN de 8 escrito en el asistente se guardaba recortado y no volvía
// a abrir el quiosco. Una sola regla, aquí.

export const PIN_MIN_DIGITOS = 4;
export const PIN_MAX_DIGITOS = 6;

export function esPinValido(pin: string): boolean {
  const p = pin ?? '';
  return /^[0-9]+$/.test(p) && p.length >= PIN_MIN_DIGITOS && p.length <= PIN_MAX_DIGITOS;
}

/**
 * Sin I, O, 0 ni 1: se confunden al copiarlo a mano de un papel. 32 símbolos,
 * así que cada byte aleatorio da uno sin sesgo (`& 31`).
 */
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO_CODIGO = 12;

/**
 * Código de recuperación del PIN: "K7QM-2XPA-9TDF". Se anota en papel al poner
 * el PIN; si el PIN se olvida, lo reemplaza una vez y obliga a poner otro.
 * `bytes` solo se pasa en las pruebas.
 */
export function generarCodigoRecuperacion(
  bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(LARGO_CODIGO)),
): string {
  let codigo = '';
  for (let i = 0; i < LARGO_CODIGO; i++) {
    if (i > 0 && i % 4 === 0) codigo += '-';
    codigo += ALFABETO_CODIGO[(bytes[i] ?? 0) & 31];
  }
  return codigo;
}

/** Mayúsculas y sin guiones ni espacios: se puede escribir como venga. */
export function normalizarCodigoRecuperacion(texto: string): string {
  return (texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function codigoRecuperacionCoincide(intento: string, guardado: string): boolean {
  const g = normalizarCodigoRecuperacion(guardado);
  return g.length === LARGO_CODIGO && normalizarCodigoRecuperacion(intento) === g;
}
