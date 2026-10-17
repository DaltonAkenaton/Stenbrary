// ╔══════════════════════════════════════════════════════╗
// ║  horarios.utils.ts                                   ║
// ║  Stenbrary v3.9.0 — Validación de horario operativo  ║
// ║                                                      ║
// ║  Helpers puros para verificar si una fecha cae       ║
// ║  dentro del horario operativo configurado.           ║
// ╚══════════════════════════════════════════════════════╝

import { HorariosSemana, HorarioDia } from '../services/config.service';

const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export interface VerificacionHorario {
  abierto: boolean;
  /** Mensaje legible para mostrar al usuario (cuando está cerrado). */
  mensaje?: string;
  /** Próxima apertura programada (si está cerrado). */
  proximaApertura?: string;
}

/**
 * Convierte 'HH:mm' a minutos desde medianoche.
 * Devuelve NaN si el formato es inválido.
 */
function aMinutos(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return NaN;
  return h * 60 + min;
}

/**
 * Verifica si una fecha cae dentro del horario operativo configurado.
 * Si el rango cruza medianoche (cierre < apertura), se asume que el cierre
 * es del día siguiente (no soportado actualmente — se valida solo dentro del día).
 */
export function verificarHorario(
  fecha: Date,
  horarios: HorariosSemana,
): VerificacionHorario {
  const dia = fecha.getDay();
  const horarioDia: HorarioDia | undefined = horarios[dia];

  if (!horarioDia || horarioDia.cerrado) {
    return {
      abierto: false,
      mensaje: `La biblioteca no opera los ${plural(DIAS_NOMBRE[dia].toLowerCase())}.`,
      proximaApertura: buscarProximaApertura(fecha, horarios),
    };
  }

  const apertura = aMinutos(horarioDia.apertura);
  const cierre = aMinutos(horarioDia.cierre);

  if (isNaN(apertura) || isNaN(cierre)) {
    // Configuración inválida → tratar como abierto para no bloquear por error de configuración
    return { abierto: true };
  }

  const ahora = fecha.getHours() * 60 + fecha.getMinutes();

  if (ahora < apertura) {
    return {
      abierto: false,
      mensaje: `Aún no abre. Horario de hoy: ${horarioDia.apertura} a ${horarioDia.cierre}.`,
      proximaApertura: `hoy a las ${horarioDia.apertura}`,
    };
  }

  if (ahora >= cierre) {
    return {
      abierto: false,
      mensaje: `Ya cerró. Horario de hoy: ${horarioDia.apertura} a ${horarioDia.cierre}.`,
      proximaApertura: buscarProximaApertura(fecha, horarios),
    };
  }

  return { abierto: true };
}

/**
 * Busca el próximo día con apertura programada.
 * Devuelve string legible o undefined si toda la semana está cerrada.
 */
function buscarProximaApertura(desde: Date, horarios: HorariosSemana): string | undefined {
  for (let offset = 1; offset <= 7; offset++) {
    const fecha = new Date(desde);
    fecha.setDate(fecha.getDate() + offset);
    const dia = fecha.getDay();
    const h = horarios[dia];
    if (h && !h.cerrado && !isNaN(aMinutos(h.apertura))) {
      const nombre = offset === 1 ? 'mañana' : DIAS_NOMBRE[dia].toLowerCase();
      return `${nombre} a las ${h.apertura}`;
    }
  }
  return undefined;
}

/** Lista de etiquetas de días, índice 0 = domingo. Útil para UI. */
export const DIAS_SEMANA = DIAS_NOMBRE;

/** "domingo" → "domingos"; lunes a viernes ya terminan en s. */
function plural(dia: string): string {
  return dia.endsWith('s') ? dia : dia + 's';
}

/**
 * Momento en que le tocaba salir a quien entró en `entrada` y nunca registró
 * salida, si ya pasó: la hora de cierre de ESE día. Si ese día no abría, no
 * tiene horario válido o la persona entró después del cierre, el fin de ese
 * día. `null` si todavía no llega ese momento.
 *
 * Para "Cerrar al final del horario" (v3.57.0). Antes la salida era el
 * instante en que corría la revisión (con la pestaña en segundo plano, horas
 * después del cierre) y solo se miraba hoy: con la PC apagada a la hora de
 * cierre, esas entradas quedaban abiertas para siempre.
 */
export function salidaAlCierre(entrada: Date, horarios: HorariosSemana, ahora: Date): Date | null {
  const finDelDia = new Date(entrada);
  finDelDia.setHours(23, 59, 59, 999);
  let salida = finDelDia;
  const h = horarios[entrada.getDay()];
  const m = h && !h.cerrado ? /^(\d{1,2}):(\d{2})$/.exec(h.cierre || '') : null;
  if (m) {
    const cierre = new Date(entrada);
    cierre.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    if (cierre.getTime() > entrada.getTime()) salida = cierre;
  }
  return salida.getTime() <= ahora.getTime() ? salida : null;
}
