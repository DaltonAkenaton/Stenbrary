// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/utils/descarga.utils.ts          ║
// ║  Stenbrary — Comparación local ↔ nube                 ║
// ║                                                      ║
// ║  Motor de la bandeja de descarga. Funciones PURAS a  ║
// ║  propósito: la decisión de qué traer y qué está en   ║
// ║  conflicto es la parte que no puede equivocarse, y   ║
// ║  aislada de IndexedDB y de Supabase se puede probar  ║
// ║  con datos construidos a mano.                       ║
// ║                                                      ║
// ║  Modelo de sync supervisado (ver ROADMAP §Fase 2):   ║
// ║  el coordinador revisa antes de escribir. Aquí eso   ║
// ║  se traduce en clasificar, nunca en resolver solo.   ║
// ╚══════════════════════════════════════════════════════╝

import { Alumno, Registro, Motivo } from '../models';

/** Tablas que participan en la descarga. */
export type DescargaStore = 'motivos' | 'alumnos' | 'registros';

/**
 * Estado de una fila al comparar las dos copias.
 *
 * No existe "solo local": eso no es asunto de la descarga — lo cubre la
 * bandeja de subida. Incluirlo aquí solo generaría ruido.
 */
export type EstadoFila = 'nueva' | 'conflicto';

export interface FilaDescarga<T = unknown> {
  id: string;
  /** Texto legible para que el coordinador sepa qué está aceptando. */
  label: string;
  estado: EstadoFila;
  /** Versión de la nube. Es la que se escribiría si se acepta. */
  remoto: T;
  /** Versión local, solo cuando hay conflicto. */
  local?: T;
  /** Campos que difieren, para explicar el conflicto sin adivinar. */
  camposDistintos?: string[];
}

export interface DiffStore<T = unknown> {
  nuevas: FilaDescarga<T>[];
  conflictos: FilaDescarga<T>[];
}

export interface DiffCompleto {
  motivos: DiffStore<Motivo>;
  alumnos: DiffStore<Alumno>;
  registros: DiffStore<Registro>;
  /** Total de filas que se pueden traer sin pisar nada. */
  totalNuevas: number;
  /** Total que existe en ambos lados con contenido distinto. */
  totalConflictos: number;
}

// ═══════════════════════════════════════════════════════════
// COMPARACIÓN DE VALORES
// ═══════════════════════════════════════════════════════════

/**
 * Compara dos valores tolerando las diferencias de representación que
 * introduce el viaje por la red.
 *
 * Una fecha vuelve de Supabase como `Date` reconstruido desde un string ISO;
 * localmente es un `Date` creado en el navegador. Comparadas con `===` nunca
 * son iguales aunque representen el mismo instante, y toda la tabla saldría
 * marcada como conflicto. Se comparan por timestamp.
 *
 * `null` y `undefined` se tratan como equivalentes: Postgres devuelve `null`
 * donde el modelo local simplemente no tiene la propiedad, y esa diferencia
 * no es un cambio real de dato.
 */
export function valoresIguales(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : new Date(a as string).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(b as string).getTime();
    return !isNaN(ta) && !isNaN(tb) && ta === tb;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => valoresIguales(v, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every(k =>
      valoresIguales((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    );
  }

  return false;
}

/**
 * Campos en los que difieren dos versiones de la misma fila.
 *
 * `camposIgnorados` existe porque hay metadatos que SIEMPRE difieren por
 * construcción y marcarlos sería mentir: `sincronizado` es true en todo lo
 * que viene de la nube, y `_syncStatus` / `_lastSyncedAt` son bookkeeping
 * local que el servidor no conoce.
 */
export function camposQueDifieren<T extends object>(
  local: T,
  remoto: T,
  camposIgnorados: string[] = [],
): string[] {
  const ignorar = new Set(['sincronizado', '_syncStatus', '_lastSyncedAt', ...camposIgnorados]);
  const claves = new Set([...Object.keys(local), ...Object.keys(remoto)]);
  const distintos: string[] = [];

  claves.forEach(k => {
    if (ignorar.has(k)) return;
    const vl = (local as Record<string, unknown>)[k];
    const vr = (remoto as Record<string, unknown>)[k];
    if (!valoresIguales(vl, vr)) distintos.push(k);
  });

  return distintos.sort();
}

// ═══════════════════════════════════════════════════════════
// DIFF POR STORE
// ═══════════════════════════════════════════════════════════

/**
 * Clasifica las filas remotas frente a las locales.
 *
 * - **nueva**: está en la nube y no localmente → se puede traer sin riesgo.
 * - **conflicto**: está en ambas con contenido distinto → decide el humano.
 *
 * Las filas remotas sin `id` se descartan: sin clave estable no hay forma de
 * saber si ya existen, y traerlas duplicaría en cada descarga.
 */
export function compararStore<T extends object>(
  locales: T[],
  remotas: T[],
  idDe: (fila: T) => string | undefined,
  labelDe: (fila: T) => string,
  camposIgnorados: string[] = [],
): DiffStore<T> {
  const porId = new Map<string, T>();
  locales.forEach(fila => {
    const id = idDe(fila);
    if (id) porId.set(id, fila);
  });

  const nuevas: FilaDescarga<T>[] = [];
  const conflictos: FilaDescarga<T>[] = [];

  remotas.forEach(remoto => {
    const id = idDe(remoto);
    if (!id) return;

    const local = porId.get(id);
    if (!local) {
      nuevas.push({ id, label: labelDe(remoto), estado: 'nueva', remoto });
      return;
    }

    const camposDistintos = camposQueDifieren(local, remoto, camposIgnorados);
    if (camposDistintos.length > 0) {
      conflictos.push({
        id,
        label: labelDe(remoto),
        estado: 'conflicto',
        remoto,
        local,
        camposDistintos,
      });
    }
    // Idénticas → no aparecen. No hay nada que decidir sobre ellas.
  });

  return { nuevas, conflictos };
}

// ═══════════════════════════════════════════════════════════
// ETIQUETAS
// ═══════════════════════════════════════════════════════════

export function labelMotivo(m: Motivo): string {
  return m.nombre;
}

export function labelAlumno(a: Alumno): string {
  return `${a.matricula} — ${a.nombre} ${a.apellidoPaterno}`.trim();
}

export function labelRegistro(r: Registro): string {
  const f = new Date(r.fechaHora);
  const fecha = isNaN(f.getTime())
    ? 'fecha inválida'
    : f.toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
  return `${r.matricula} — ${fecha}`;
}

// ═══════════════════════════════════════════════════════════
// DIFF COMPLETO
// ═══════════════════════════════════════════════════════════

export function construirDiff(
  local: { motivos: Motivo[]; alumnos: Alumno[]; registros: Registro[] },
  remoto: { motivos: Motivo[]; alumnos: Alumno[]; registros: Registro[] },
): DiffCompleto {
  const motivos = compararStore<Motivo>(
    local.motivos, remoto.motivos, m => m.id, labelMotivo,
  );
  const alumnos = compararStore<Alumno>(
    local.alumnos, remoto.alumnos, a => a.id, labelAlumno,
    // La nube no guarda `datosExtra` (campos personalizados del coordinador),
    // así que compararlo marcaría como conflicto a todo alumno que los use.
    ['datosExtra'],
  );
  const registros = compararStore<Registro>(
    local.registros, remoto.registros, r => r.id, labelRegistro,
  );

  return {
    motivos,
    alumnos,
    registros,
    totalNuevas: motivos.nuevas.length + alumnos.nuevas.length + registros.nuevas.length,
    totalConflictos:
      motivos.conflictos.length + alumnos.conflictos.length + registros.conflictos.length,
  };
}
