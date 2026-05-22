// ╔══════════════════════════════════════════════════════╗
// ║  import-supabase.service.ts                          ║
// ║  Stenbrary — Fase 2.1 (Importador one-shot)          ║
// ║                                                      ║
// ║  Sube todo el IndexedDB local a Supabase             ║
// ║  manteniendo los UUIDs originales. Idempotente:      ║
// ║  reejecutar la misma operación no duplica            ║
// ║  (upsert por id en el adapter + en la función SQL).  ║
// ║                                                      ║
// ║  Pensado como puente de validación en 2.1.           ║
// ║  La sincronización continua + supervisión por        ║
// ║  el coordinador llegan con el sync engine (2.2).     ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';

import { DatabaseService } from './database.service';
import { RemoteDatabaseService } from './remote-database.service';
import { log, logError } from '../utils/logger';

export interface ImportPreview {
  local: { alumnos: number; registros: number; motivos: number };
  remote: { alumnos: number; registros: number; motivos: number };
}

export interface ImportProgressEvent {
  fase: 'motivos' | 'alumnos' | 'registros' | 'done';
  procesados: number;
  total: number;
  /** Mensaje de error si hubo problemas con la fila actual. */
  error?: string;
}

export interface ImportReport {
  motivos: { subidos: number; errores: number };
  alumnos: { subidos: number; errores: number };
  registros: { subidos: number; errores: number };
  /** Errores acumulados (max 20 para no inflar memoria). */
  detalleErrores: string[];
}

@Injectable({ providedIn: 'root' })
export class ImportSupabaseService {
  constructor(
    private local: DatabaseService,
    private remote: RemoteDatabaseService,
  ) {}

  /**
   * Preview previo a la corrida. Muestra el estado local vs remoto para
   * que el coordinador sepa qué se va a subir.
   */
  async preview(): Promise<ImportPreview> {
    const [local, remote] = await Promise.all([
      this.local.obtenerConteoTotal(),
      this.remote.obtenerConteos(),
    ]);
    return { local, remote };
  }

  /**
   * Sube todo a Supabase en orden: motivos → alumnos → registros.
   * Razón del orden: registros referencian a alumnos y motivos (FK).
   * Si una fila falla, seguimos con las demás y agregamos al reporte.
   *
   * `onProgress` permite actualizar UI de barra de progreso sin
   * acoplar el servicio a Angular signals.
   */
  async runImport(
    onProgress?: (evt: ImportProgressEvent) => void,
  ): Promise<ImportReport> {
    if (!this.remote.isAvailable()) {
      throw new Error('Supabase no está configurado (modo solo-local).');
    }

    const report: ImportReport = {
      motivos: { subidos: 0, errores: 0 },
      alumnos: { subidos: 0, errores: 0 },
      registros: { subidos: 0, errores: 0 },
      detalleErrores: [],
    };

    const registrarError = (contexto: string, err: unknown): void => {
      const msg = err instanceof Error ? err.message : String(err);
      if (report.detalleErrores.length < 20) {
        report.detalleErrores.push(`${contexto}: ${msg}`);
      }
      logError(`[import] ${contexto}:`, err);
    };

    // ─── Fase 1: motivos ────────────────────────────────────
    const motivos = await this.local.obtenerTodosLosMotivos();
    for (let i = 0; i < motivos.length; i++) {
      try {
        await this.remote.upsertMotivo(motivos[i]);
        report.motivos.subidos++;
      } catch (err) {
        report.motivos.errores++;
        registrarError(`motivo "${motivos[i].nombre}"`, err);
      }
      onProgress?.({ fase: 'motivos', procesados: i + 1, total: motivos.length });
    }
    log('[import] motivos OK:', report.motivos);

    // ─── Fase 2: alumnos ────────────────────────────────────
    const alumnos = await this.local.obtenerTodosLosAlumnos();
    for (let i = 0; i < alumnos.length; i++) {
      try {
        await this.remote.upsertAlumno(alumnos[i]);
        report.alumnos.subidos++;
      } catch (err) {
        report.alumnos.errores++;
        registrarError(`alumno ${alumnos[i].matricula}`, err);
      }
      onProgress?.({ fase: 'alumnos', procesados: i + 1, total: alumnos.length });
    }
    log('[import] alumnos OK:', report.alumnos);

    // ─── Fase 3: registros (con sus motivos múltiples) ──────
    const registros = await this.local.obtenerTodosLosRegistros();
    for (let i = 0; i < registros.length; i++) {
      const reg = registros[i];
      try {
        // Construir lista de motivos: usar motivoIds/Nombres si existe;
        // si no, caer al motivoId principal solo. Cubre registros viejos
        // sin motivos múltiples (retrocompat).
        const motivosLista =
          reg.motivoIds && reg.motivoNombres && reg.motivoIds.length > 0
            ? reg.motivoIds.map((id, idx) => ({
                motivoId: id,
                nombre: reg.motivoNombres?.[idx] ?? reg.motivoNombre,
                orden: idx,
              }))
            : reg.motivoId
              ? [{ motivoId: reg.motivoId, nombre: reg.motivoNombre, orden: 0 }]
              : [];

        await this.remote.crearRegistroCompleto(reg, motivosLista);
        report.registros.subidos++;
      } catch (err) {
        report.registros.errores++;
        registrarError(`registro ${reg.matricula} @ ${reg.fechaHora}`, err);
      }
      onProgress?.({ fase: 'registros', procesados: i + 1, total: registros.length });
    }
    log('[import] registros OK:', report.registros);

    onProgress?.({ fase: 'done', procesados: 0, total: 0 });
    return report;
  }
}
