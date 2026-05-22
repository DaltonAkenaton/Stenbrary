// ╔══════════════════════════════════════════════════════╗
// ║  remote-database.service.ts                          ║
// ║  Stenbrary — Fase 2.1 (Modelo de datos espejo)       ║
// ║                                                      ║
// ║  Adapter contra Supabase con la misma forma          ║
// ║  pública que `DatabaseService` local — para que el   ║
// ║  futuro `SyncService` (Fase 2.2) o un feature flag   ║
// ║  puedan swappear sin tocar a los consumidores.       ║
// ║                                                      ║
// ║  En Fase 2.1 NO espejamos toda la API del local —    ║
// ║  solo lo necesario para el importador one-shot y     ║
// ║  validación end-to-end del schema. La paridad        ║
// ║  completa llega con el sync engine (Fase 2.2).       ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Alumno, Motivo, Registro } from '../models';
import { getSupabaseClient } from '../auth/supabase.client';
import { log, logError } from '../utils/logger';

/**
 * Filas tal como viajan por la API REST de Supabase (snake_case).
 * Mantenemos estos tipos privados al servicio: el resto de la app
 * sigue usando los modelos TS originales (camelCase).
 */
interface AlumnoRow {
  id: string;
  organization_id: string | null;
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  carrera: string;
  grado: number;
  grupo: string;
  turno: 'Matutino' | 'Vespertino' | 'Mixto';
  activo: boolean;
  fecha_registro: string;
  fecha_actualizacion: string;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  datos_extra: Record<string, string>;
}

interface MotivoRow {
  id: string;
  organization_id: string | null;
  nombre: string;
  descripcion: string | null;
  icono: string;
  color: string | null;
  orden: number;
  activo: boolean;
  fecha_creacion: string;
}

interface RegistroRow {
  id: string;
  organization_id: string | null;
  alumno_id: string;
  matricula: string;
  nombre_completo: string;
  carrera: string;
  turno: 'Matutino' | 'Vespertino' | 'Mixto' | null;
  motivo_principal_id: string | null;
  motivo_principal_nombre: string;
  fecha_hora: string;
  hora_salida: string | null;
  duracion_minutos: number | null;
  cierre_automatico: boolean;
  dispositivo: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

interface RegistroMotivoRow {
  registro_id: string;
  motivo_id: string;
  motivo_nombre_snapshot: string;
  orden: number;
  organization_id: string | null;
}

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

/** Regex permisivo para UUID v1-v5 (es lo que `uuidv4()` genera). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Devuelve el string si es un UUID válido, null si no.
 * Usado para IDs sintéticos como `invitado-<timestamp>` que no son UUIDs
 * pero el local los acepta — al subir a Postgres deben ir como null.
 */
function asUuidOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return UUID_RE.test(value) ? value : null;
}

// ────────────────────────────────────────────────────────
// Mappers — fila SQL ↔ modelo TS
// ────────────────────────────────────────────────────────

function alumnoFromRow(row: AlumnoRow): Alumno {
  return {
    id: row.id,
    matricula: row.matricula,
    nombre: row.nombre,
    apellidoPaterno: row.apellido_paterno,
    apellidoMaterno: row.apellido_materno,
    carrera: row.carrera,
    grado: row.grado,
    grupo: row.grupo,
    turno: row.turno,
    activo: row.activo,
    fechaRegistro: new Date(row.fecha_registro),
    fechaActualizacion: new Date(row.fecha_actualizacion),
    email: row.email ?? undefined,
    telefono: row.telefono ?? undefined,
    notas: row.notas ?? undefined,
    datosExtra: row.datos_extra ?? {},
  };
}

function alumnoToRow(a: Alumno, organizationId: string | null): Partial<AlumnoRow> {
  return {
    id: a.id,
    organization_id: organizationId,
    matricula: a.matricula,
    nombre: a.nombre,
    apellido_paterno: a.apellidoPaterno,
    apellido_materno: a.apellidoMaterno,
    carrera: a.carrera,
    grado: a.grado,
    grupo: a.grupo,
    turno: a.turno,
    activo: a.activo,
    fecha_registro: a.fechaRegistro.toISOString(),
    email: a.email ?? null,
    telefono: a.telefono ?? null,
    notas: a.notas ?? null,
    datos_extra: a.datosExtra ?? {},
  };
}

function motivoFromRow(row: MotivoRow): Motivo {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? undefined,
    icono: row.icono,
    color: row.color ?? undefined,
    orden: row.orden,
    activo: row.activo,
    fechaCreacion: new Date(row.fecha_creacion),
  };
}

function motivoToRow(m: Motivo, organizationId: string | null): Partial<MotivoRow> {
  return {
    id: m.id,
    organization_id: organizationId,
    nombre: m.nombre,
    descripcion: m.descripcion ?? null,
    icono: m.icono,
    color: m.color ?? null,
    orden: m.orden,
    activo: m.activo,
    fecha_creacion: (m.fechaCreacion ?? new Date()).toISOString(),
  };
}

/**
 * Construye un Registro completo combinando la fila base + sus motivos.
 * `motivos` puede venir vacío si el adapter no joineó (modo lite).
 */
function registroFromRow(row: RegistroRow, motivos: RegistroMotivoRow[] = []): Registro {
  const motivosOrdenados = [...motivos].sort((a, b) => a.orden - b.orden);

  return {
    id: row.id,
    alumnoId: row.alumno_id,
    matricula: row.matricula,
    nombreCompleto: row.nombre_completo,
    carrera: row.carrera,
    motivoId: row.motivo_principal_id ?? '',
    motivoNombre: row.motivo_principal_nombre,
    motivoIds: motivosOrdenados.length > 0 ? motivosOrdenados.map(m => m.motivo_id) : undefined,
    motivoNombres:
      motivosOrdenados.length > 0 ? motivosOrdenados.map(m => m.motivo_nombre_snapshot) : undefined,
    fechaHora: new Date(row.fecha_hora),
    horaSalida: row.hora_salida ? new Date(row.hora_salida) : undefined,
    duracionMinutos: row.duracion_minutos ?? undefined,
    cierreAutomatico: row.cierre_automatico,
    dispositivo: row.dispositivo ?? undefined,
    turno: row.turno ?? undefined,
    // `sincronizado` no existe en el modelo remoto — siempre true por construcción.
    sincronizado: true,
  };
}

// ────────────────────────────────────────────────────────
// Servicio
// ────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RemoteDatabaseService {
  private readonly supabase: SupabaseClient | null = getSupabaseClient();

  /**
   * Indica si el adapter puede operar. Útil para que el importador o
   * futuros consumidores no asuman backend.
   */
  isAvailable(): boolean {
    return this.supabase !== null;
  }

  private requireClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase no está configurado (modo solo-local).');
    }
    return this.supabase;
  }

  // ─── ALUMNOS ────────────────────────────────────────────

  async obtenerTodosLosAlumnos(): Promise<Alumno[]> {
    const sb = this.requireClient();
    const { data, error } = await sb
      .from('alumnos')
      .select('*')
      .order('fecha_registro', { ascending: false });

    if (error) {
      logError('[remote] obtenerTodosLosAlumnos:', error);
      throw error;
    }
    return (data ?? []).map(alumnoFromRow as (row: AlumnoRow) => Alumno);
  }

  async obtenerAlumnoPorMatricula(matricula: string): Promise<Alumno | undefined> {
    const sb = this.requireClient();
    const { data, error } = await sb
      .from('alumnos')
      .select('*')
      .eq('matricula', matricula)
      .maybeSingle();

    if (error) {
      logError('[remote] obtenerAlumnoPorMatricula:', error);
      throw error;
    }
    return data ? alumnoFromRow(data as AlumnoRow) : undefined;
  }

  /**
   * Upsert por id. Útil para el importador (idempotente: re-corrida no duplica).
   * El trigger `set_organization_id_from_auth` rellena `organization_id` si va null.
   */
  async upsertAlumno(alumno: Alumno): Promise<Alumno> {
    const sb = this.requireClient();
    const payload = alumnoToRow(alumno, null);

    const { data, error } = await sb
      .from('alumnos')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      logError('[remote] upsertAlumno:', error);
      throw error;
    }
    log('[remote] upsertAlumno OK:', alumno.matricula);
    return alumnoFromRow(data as AlumnoRow);
  }

  // ─── MOTIVOS ────────────────────────────────────────────

  async obtenerMotivosActivos(): Promise<Motivo[]> {
    const sb = this.requireClient();
    const { data, error } = await sb
      .from('motivos')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      logError('[remote] obtenerMotivosActivos:', error);
      throw error;
    }
    return (data ?? []).map(motivoFromRow as (row: MotivoRow) => Motivo);
  }

  async upsertMotivo(motivo: Motivo): Promise<Motivo> {
    const sb = this.requireClient();
    const payload = motivoToRow(motivo, null);

    const { data, error } = await sb
      .from('motivos')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      logError('[remote] upsertMotivo:', error);
      throw error;
    }
    log('[remote] upsertMotivo OK:', motivo.nombre);
    return motivoFromRow(data as MotivoRow);
  }

  // ─── REGISTROS ──────────────────────────────────────────

  async obtenerRegistrosDeHoy(): Promise<Registro[]> {
    const sb = this.requireClient();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const { data, error } = await sb
      .from('registros')
      .select('*, registro_motivos(*)')
      .gte('fecha_hora', hoy.toISOString())
      .lt('fecha_hora', manana.toISOString())
      .order('fecha_hora', { ascending: false });

    if (error) {
      logError('[remote] obtenerRegistrosDeHoy:', error);
      throw error;
    }

    return (data ?? []).map(row => {
      const { registro_motivos: motivos = [], ...base } = row as RegistroRow & {
        registro_motivos: RegistroMotivoRow[];
      };
      return registroFromRow(base as RegistroRow, motivos);
    });
  }

  /**
   * Crea un registro + sus motivos atómicamente via función SQL
   * `crear_registro_completo(payload jsonb) returns uuid`.
   *
   * El cliente no necesita transaccionar — la BD lo hace.
   */
  async crearRegistroCompleto(
    registro: Registro,
    motivos: { motivoId: string; nombre: string; orden: number }[],
  ): Promise<string> {
    const sb = this.requireClient();

    // Saneo de IDs: el flujo "acceso invitado" genera `alumnoId` como
    // `invitado-<timestamp>` (no es uuid). Lo enviamos como null — el
    // schema acepta `alumno_id is null` para registros de invitados.
    const payload = {
      registro: {
        id: asUuidOrNull(registro.id),
        organization_id: null,
        alumno_id: asUuidOrNull(registro.alumnoId),
        matricula: registro.matricula,
        nombre_completo: registro.nombreCompleto,
        carrera: registro.carrera,
        turno: registro.turno ?? '',
        motivo_principal_id: asUuidOrNull(registro.motivoId),
        motivo_principal_nombre: registro.motivoNombre,
        fecha_hora: registro.fechaHora.toISOString(),
        hora_salida: registro.horaSalida ? registro.horaSalida.toISOString() : '',
        cierre_automatico: registro.cierreAutomatico ?? false,
        dispositivo: registro.dispositivo ?? null,
      },
      motivos: motivos
        // Filtramos motivos con id no-uuid (defensa). Lo normal es que sean uuid.
        .filter(m => asUuidOrNull(m.motivoId) !== null)
        .map(m => ({
          motivo_id: m.motivoId,
          nombre_snapshot: m.nombre,
          orden: m.orden,
        })),
    };

    const { data, error } = await sb.rpc('crear_registro_completo', { payload });

    if (error) {
      logError('[remote] crearRegistroCompleto:', error);
      throw error;
    }
    log('[remote] crearRegistroCompleto OK:', registro.matricula);
    return data as string;
  }

  // ─── DIAGNÓSTICO ────────────────────────────────────────

  /**
   * Cuenta filas en cada tabla. Útil para el importador (preview)
   * y para mostrar al coordinador qué hay en la nube.
   */
  async obtenerConteos(): Promise<{ alumnos: number; registros: number; motivos: number }> {
    const sb = this.requireClient();

    const [alumnosRes, registrosRes, motivosRes] = await Promise.all([
      sb.from('alumnos').select('*', { count: 'exact', head: true }),
      sb.from('registros').select('*', { count: 'exact', head: true }),
      sb.from('motivos').select('*', { count: 'exact', head: true }),
    ]);

    return {
      alumnos: alumnosRes.count ?? 0,
      registros: registrosRes.count ?? 0,
      motivos: motivosRes.count ?? 0,
    };
  }
}
