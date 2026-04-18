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
      mensaje: `La biblioteca no opera los ${DIAS_NOMBRE[dia].toLowerCase()}.`,
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
      proximaApertura: `Hoy a las ${horarioDia.apertura}`,
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
