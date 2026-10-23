// ╔══════════════════════════════════════════════════════╗
// ║  visita-manual.utils.ts — Stenbrary v3.59.0          ║
// ║                                                      ║
// ║  Visitas anotadas en papel (se fue la luz, la PC de  ║
// ║  la puerta estuvo apagada) que se capturan después   ║
// ║  en Registros. Funciones puras: validar la fecha y   ║
// ║  las horas, y avisar si ya hay una visita parecida   ║
// ║  (el papel y el escáner pueden traer la misma).      ║
// ╚══════════════════════════════════════════════════════╝

import { Registro } from '../models';
import { parseFechaLocal } from './tiempo.utils';

export interface HorasVisitaManual {
  /** `YYYY-MM-DD` (input type="date"). */
  fecha: string;
  /** `HH:MM` (input type="time"). */
  entrada: string;
  /** `HH:MM`, o vacío si no se anotó la salida. */
  salida: string;
}

export type VisitaManualValidada =
  | { entrada: Date; salida?: Date; error?: undefined }
  | { error: string };

function aHora(fecha: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  if (h > 23 || min > 59) return null;
  const d = new Date(fecha);
  d.setHours(h, min, 0, 0);
  return d;
}

/** Fecha y horas del formulario → fechas; o el motivo por el que no se puede guardar. */
export function validarVisitaManual(datos: HorasVisitaManual, ahora: Date): VisitaManualValidada {
  const dia = parseFechaLocal(datos.fecha);
  if (!dia) return { error: 'Escribe la fecha de la visita.' };
  const entrada = aHora(dia, datos.entrada);
  if (!entrada) return { error: 'Escribe la hora de entrada.' };
  if (entrada.getTime() > ahora.getTime()) return { error: 'La entrada no puede ser en el futuro.' };
  if (!datos.salida.trim()) return { entrada };
  const salida = aHora(dia, datos.salida);
  if (!salida) return { error: 'La hora de salida no es válida.' };
  if (salida.getTime() <= entrada.getTime()) return { error: 'La salida tiene que ser después de la entrada.' };
  if (salida.getTime() > ahora.getTime()) return { error: 'La salida no puede ser en el futuro.' };
  return { entrada, salida };
}

/**
 * Una visita de la misma matrícula a menos de `minutos` de esa entrada: el
 * papel y el escáner pueden traer la misma (la luz volvió a media mañana).
 * Para un visitante sin matrícula se compara el nombre.
 */
export function visitaParecida(
  registros: Pick<Registro, 'matricula' | 'nombreCompleto' | 'fechaHora'>[],
  quien: { matricula: string; nombreCompleto: string },
  entrada: Date,
  minutos: number,
): Pick<Registro, 'matricula' | 'nombreCompleto' | 'fechaHora'> | undefined {
  const margen = Math.max(0, minutos) * 60_000;
  const nombre = quien.nombreCompleto.trim().toLowerCase();
  return registros.find(r => {
    const mismo = quien.matricula === 'INVITADO'
      ? r.matricula === 'INVITADO' && r.nombreCompleto.trim().toLowerCase() === nombre
      : r.matricula === quien.matricula;
    return mismo && Math.abs(new Date(r.fechaHora).getTime() - entrada.getTime()) <= margen;
  });
}
