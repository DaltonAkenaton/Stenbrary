// ╔══════════════════════════════════════════════════════╗
// ║  sync.service.ts                                     ║
// ║  Stenbrary — Fase 2.2.1 (bandeja con acciones)       ║
// ║                                                      ║
// ║  Orquestador del flujo "revisar → descartar / subir".║
// ║  El componente nunca habla con RemoteDatabaseService ║
// ║  directamente — todo pasa por aquí para que el       ║
// ║  manejo de errores, idempotencia y progreso vivan    ║
// ║  en una sola capa.                                   ║
// ║                                                      ║
// ║  Garantías:                                          ║
// ║  - Errores por fila (un fail no aborta el batch).    ║
// ║  - Filas exitosas → `synced`; filas con error → se   ║
// ║    quedan en `pending` para reintento. Solo el       ║
// ║    coordinador puede marcar `rejected` (descartar).  ║
// ║  - Orden de subida: motivos → alumnos → registros    ║
// ║    (respeta FKs del schema).                         ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, computed, inject, signal } from '@angular/core';

import { Alumno, Motivo, Registro } from '../models';
import { DatabaseService } from './database.service';
import { RemoteDatabaseService } from './remote-database.service';

export type SyncStore = 'alumnos' | 'registros' | 'motivos';

export interface PendientesPorTipo {
  alumnos: number;
  registros: number;
  motivos: number;
}

export interface PendientesDetallados {
  alumnos: Alumno[];
  registros: Registro[];
  motivos: Motivo[];
}

export interface SyncError {
  store: SyncStore;
  id: string;
  label: string;
  message: string;
}

export interface SyncProgreso {
  activo: boolean;
  store: SyncStore | null;
  /** Filas procesadas en el batch actual (cualquier tipo). */
  procesadas: number;
  /** Total de filas planeadas en el batch. */
  total: number;
}

export interface SyncResultado {
  subidos: number;
  fallidos: number;
  errores: SyncError[];
}

const PROGRESO_INICIAL: SyncProgreso = {
  activo: false,
  store: null,
  procesadas: 0,
  total: 0,
};

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly databaseService = inject(DatabaseService);
  private readonly remoteDatabaseService = inject(RemoteDatabaseService);

  // ─── Estado reactivo ────────────────────────────────────────
  private readonly conteosSignal = signal<PendientesPorTipo>({
    alumnos: 0,
    registros: 0,
    motivos: 0,
  });
  private readonly detalleSignal = signal<PendientesDetallados>({
    alumnos: [],
    registros: [],
    motivos: [],
  });
  private readonly progresoSignal = signal<SyncProgreso>(PROGRESO_INICIAL);
  private readonly ultimosErroresSignal = signal<SyncError[]>([]);

  readonly conteos = this.conteosSignal.asReadonly();
  readonly detalle = this.detalleSignal.asReadonly();
  readonly progreso = this.progresoSignal.asReadonly();
  readonly ultimosErrores = this.ultimosErroresSignal.asReadonly();

  readonly totalPendientes = computed(() => {
    const c = this.conteosSignal();
    return c.alumnos + c.registros + c.motivos;
  });

  readonly subiendo = computed(() => this.progresoSignal().activo);

  // ─── Lectura ────────────────────────────────────────────────

  async refrescar(): Promise<void> {
    const [conteos, detalle] = await Promise.all([
      this.databaseService.obtenerConteoPendientes(),
      this.obtenerDetalle(),
    ]);
    this.conteosSignal.set(conteos);
    this.detalleSignal.set(detalle);
  }

  async refrescarConteos(): Promise<void> {
    const conteos = await this.databaseService.obtenerConteoPendientes();
    this.conteosSignal.set(conteos);
  }

  private async obtenerDetalle(): Promise<PendientesDetallados> {
    const [alumnos, registros, motivos] = await Promise.all([
      this.databaseService.obtenerAlumnosPendientes(),
      this.databaseService.obtenerRegistrosPendientes(),
      this.databaseService.obtenerMotivosPendientes(),
    ]);
    return { alumnos, registros, motivos };
  }

  // ─── Acciones del coordinador ───────────────────────────────

  /**
   * Marca filas como `rejected` — no se subirán al próximo batch.
   * No elimina la fila local; el coordinador puede seguir editándola
   * (lo cual la volvería a marcar `pending`).
   */
  async descartar(store: SyncStore, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    for (const id of ids) {
      await this.databaseService.marcarComoRechazado(store, id);
    }
    await this.refrescar();
  }

  /**
   * Sube las filas seleccionadas al backend en el orden correcto de FKs.
   * Retorna resumen (subidos / fallidos / errores). El batch nunca aborta
   * por una fila individual.
   */
  async subir(seleccion: {
    motivos?: string[];
    alumnos?: string[];
    registros?: string[];
  }): Promise<SyncResultado> {
    if (!this.remoteDatabaseService.isAvailable()) {
      throw new Error('Backend no configurado. Inicia sesión para subir cambios.');
    }

    const detalle = this.detalleSignal();
    const motivosObjs = filtrarPorIds(detalle.motivos, seleccion.motivos);
    const alumnosObjs = filtrarPorIds(detalle.alumnos, seleccion.alumnos);
    const registrosObjs = filtrarPorIds(detalle.registros, seleccion.registros);

    const total = motivosObjs.length + alumnosObjs.length + registrosObjs.length;
    if (total === 0) {
      return { subidos: 0, fallidos: 0, errores: [] };
    }

    this.progresoSignal.set({ activo: true, store: null, procesadas: 0, total });
    const errores: SyncError[] = [];
    let subidos = 0;
    let procesadas = 0;

    const avanzar = (store: SyncStore) => {
      procesadas += 1;
      this.progresoSignal.set({ activo: true, store, procesadas, total });
    };

    try {
      // ── 1. Motivos primero (registros pueden referenciarlos) ──
      for (const motivo of motivosObjs) {
        try {
          await this.remoteDatabaseService.upsertMotivo(motivo);
          await this.databaseService.marcarComoSincronizado('motivos', motivo.id!);
          subidos += 1;
        } catch (err) {
          errores.push({
            store: 'motivos',
            id: motivo.id ?? '?',
            label: motivo.nombre,
            message: mensajeError(err),
          });
        }
        avanzar('motivos');
      }

      // ── 2. Alumnos (registros los referencian) ──
      for (const alumno of alumnosObjs) {
        try {
          await this.remoteDatabaseService.upsertAlumno(alumno);
          await this.databaseService.marcarComoSincronizado('alumnos', alumno.id!);
          subidos += 1;
        } catch (err) {
          errores.push({
            store: 'alumnos',
            id: alumno.id ?? '?',
            label: `${alumno.matricula} — ${alumno.nombre} ${alumno.apellidoPaterno}`,
            message: mensajeError(err),
          });
        }
        avanzar('alumnos');
      }

      // ── 3. Registros al final (dependen de los anteriores) ──
      for (const registro of registrosObjs) {
        try {
          const motivosPayload = construirMotivosPayload(registro);
          await this.remoteDatabaseService.crearRegistroCompleto(registro, motivosPayload);
          await this.databaseService.marcarComoSincronizado('registros', registro.id);
          subidos += 1;
        } catch (err) {
          errores.push({
            store: 'registros',
            id: registro.id,
            label: `${registro.matricula} — ${formatearFecha(registro.fechaHora)}`,
            message: mensajeError(err),
          });
        }
        avanzar('registros');
      }
    } finally {
      this.progresoSignal.set(PROGRESO_INICIAL);
      this.ultimosErroresSignal.set(errores);
      await this.refrescar();
    }

    return { subidos, fallidos: errores.length, errores };
  }

  /** Atajo para subir todos los pendientes actuales. */
  async subirTodo(): Promise<SyncResultado> {
    const detalle = this.detalleSignal();
    return this.subir({
      motivos: detalle.motivos.map(m => m.id!).filter(Boolean),
      alumnos: detalle.alumnos.map(a => a.id!).filter(Boolean),
      registros: detalle.registros.map(r => r.id),
    });
  }

  /** Limpia el panel de errores tras revisión del coordinador. */
  limpiarErrores(): void {
    this.ultimosErroresSignal.set([]);
  }
}

// ─── Helpers privados al módulo ─────────────────────────────

function filtrarPorIds<T extends { id?: string }>(
  filas: T[],
  ids: string[] | undefined,
): T[] {
  if (!ids || ids.length === 0) return [];
  const set = new Set(ids);
  return filas.filter(f => f.id !== undefined && set.has(f.id));
}

function construirMotivosPayload(
  registro: Registro,
): { motivoId: string; nombre: string; orden: number }[] {
  // Preferir el array múltiple (v3.7.0+). Fallback al motivo principal.
  const ids = registro.motivoIds ?? (registro.motivoId ? [registro.motivoId] : []);
  const nombres =
    registro.motivoNombres ?? (registro.motivoNombre ? [registro.motivoNombre] : []);

  return ids.map((id, i) => ({
    motivoId: id,
    nombre: nombres[i] ?? registro.motivoNombre ?? '',
    orden: i,
  }));
}

function mensajeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Error desconocido';
}

function formatearFecha(fecha: Date | string): string {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
