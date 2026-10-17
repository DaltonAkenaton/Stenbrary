// ╔══════════════════════════════════════════════════════╗
// ║  bitacora.service.ts                                 ║
// ║  Stenbrary v3.52.0 — Bitácora local de acciones      ║
// ║                                                      ║
// ║  Anota lo que importa para saber si alguien tocó     ║
// ║  algo: salidas del quiosco, PIN fallidos, ediciones, ║
// ║  borrados, respaldos. Viaja dentro del respaldo, así ║
// ║  que la oficina ve lo que pasó en la puerta.         ║
// ║                                                      ║
// ║  `registrar()` nunca lanza: la bitácora no puede     ║
// ║  romper la acción que está anotando.                 ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { ConfigService } from './config.service';
import { AccionBitacora, EventoBitacora, Registro, Alumno } from '../models';
import { logError } from '../utils/logger';

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private readonly db = inject(DatabaseService);
  private readonly config = inject(ConfigService);

  /** `refId`: id de la visita o el alumno borrado, para repetir el borrado en el otro equipo. */
  registrar(accion: AccionBitacora, detalle = '', refId?: string): void {
    const evento: EventoBitacora = {
      id: uuidv4(),
      fechaHora: new Date().toISOString(),
      accion,
      detalle,
      equipo: this.config.nombreEquipo,
      ...(refId ? { refId } : {}),
    };
    this.db.agregarEventoBitacora(evento).catch(err => logError('❌ Bitácora:', err));
  }

  obtener(): Promise<EventoBitacora[]> {
    return this.db.obtenerBitacora();
  }
}

/**
 * Ids borrados según la bitácora (v3.53.0). El import los usa para no
 * revivir lo que se borró en cualquiera de los dos equipos. No incluye la
 * limpieza por rango de fechas: la puerta puede vaciar meses viejos para
 * aligerar su respaldo sin que la oficina, que es el archivo, los pierda.
 */
export function idsBorrados(eventos: readonly EventoBitacora[]): { registros: Set<string>; alumnos: Set<string> } {
  const registros = new Set<string>();
  const alumnos = new Set<string>();
  for (const e of eventos) {
    if (!e?.refId) continue;
    if (e.accion === 'registro-eliminado') registros.add(e.refId);
    else if (e.accion === 'alumno-eliminado') alumnos.add(e.refId);
  }
  return { registros, alumnos };
}

// ── Textos para el detalle ──────────────────────────────

const fmt = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

export function describirAlumno(
  a: Pick<Alumno, 'nombre' | 'apellidoPaterno' | 'apellidoMaterno' | 'matricula'>,
): string {
  const nombre = [a.nombre, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ');
  return `${nombre} (${a.matricula})`;
}

export function describirRegistro(r: Pick<Registro, 'nombreCompleto' | 'matricula' | 'fechaHora'>): string {
  const fecha = new Date(r.fechaHora);
  const cuando = Number.isNaN(fecha.getTime()) ? '' : `, visita del ${fmt.format(fecha)}`;
  return `${r.nombreCompleto || 'Sin nombre'} (${r.matricula})${cuando}`;
}

/** Etiqueta y grupo de cada acción, para la vista y sus filtros. */
export type GrupoBitacora = 'quiosco' | 'cambios' | 'respaldos';

export const ACCIONES_BITACORA: Record<AccionBitacora, { etiqueta: string; icono: string; grupo: GrupoBitacora; alerta?: boolean }> = {
  'quiosco-salir':       { etiqueta: 'Salió del modo quiosco',       icono: 'lock_open',      grupo: 'quiosco' },
  'quiosco-activar':     { etiqueta: 'Activó el modo quiosco',       icono: 'lock',           grupo: 'quiosco' },
  'quiosco-auto':        { etiqueta: 'El quiosco volvió solo',       icono: 'timer',          grupo: 'quiosco' },
  'pin-fallido':         { etiqueta: 'PIN incorrecto',               icono: 'password',       grupo: 'quiosco', alerta: true },
  'pin-bloqueado':       { etiqueta: 'PIN bloqueado por intentos',   icono: 'gpp_maybe',      grupo: 'quiosco', alerta: true },
  'pin-cambiado':        { etiqueta: 'Cambió el PIN',                icono: 'key',            grupo: 'quiosco' },
  'registro-editado':    { etiqueta: 'Editó una visita',             icono: 'edit',           grupo: 'cambios' },
  'registro-eliminado':  { etiqueta: 'Borró una visita',             icono: 'delete',         grupo: 'cambios', alerta: true },
  'registros-limpiados': { etiqueta: 'Limpió visitas por fechas',    icono: 'delete_sweep',   grupo: 'cambios', alerta: true },
  'alumno-editado':      { etiqueta: 'Editó un alumno',              icono: 'person',         grupo: 'cambios' },
  'alumno-eliminado':    { etiqueta: 'Borró un alumno',              icono: 'person_remove',  grupo: 'cambios', alerta: true },
  'alumno-desactivado':  { etiqueta: 'Desactivó un alumno',          icono: 'person_off',     grupo: 'cambios' },
  'alumno-reactivado':   { etiqueta: 'Reactivó un alumno',           icono: 'person_add',     grupo: 'cambios' },
  'motivo-eliminado':    { etiqueta: 'Borró una actividad',          icono: 'label_off',      grupo: 'cambios' },
  'alumnos-importados':  { etiqueta: 'Importó alumnos desde Excel',  icono: 'upload_file',    grupo: 'cambios' },
  'respaldo-exportado':  { etiqueta: 'Descargó un respaldo',         icono: 'download',       grupo: 'respaldos' },
  'respaldo-importado':  { etiqueta: 'Importó un respaldo',          icono: 'upload',         grupo: 'respaldos' },
  'datos-borrados':      { etiqueta: 'Borró todos los datos',        icono: 'delete_forever', grupo: 'respaldos', alerta: true },
};
