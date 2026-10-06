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
// NORMALIZACIÓN
// ═══════════════════════════════════════════════════════════
// El viaje a Postgres y de vuelta cambia la FORMA de algunos campos sin
// cambiar su SIGNIFICADO. Comparar la forma cruda marcaba como conflicto
// prácticamente cada fila: en la primera prueba real salieron 3024, todos
// falsos. Un conflicto falso es peor que inútil — entierra a los de verdad
// y entrena al coordinador a aceptar sin leer.
//
// Por eso se normalizan AMBOS lados antes de comparar. La versión que se
// escribe sigue siendo la remota original: normalizar es para decidir, no
// para guardar.

/**
 * `cierreAutomatico` y `salidaEstimada`: las columnas son `not null default
 * false`, así que la nube devuelve `false` donde el modelo local simplemente
 * no tiene el campo.
 *
 * `motivoIds` / `motivoNombres`: al subir, `construirMotivosPayload()` deriva
 * `[motivoId]` cuando no hay array. La nube reconstruye ese array desde la
 * tabla `registro_motivos` y lo devuelve siempre; local lo deja en
 * `undefined` cuando el registro tiene un solo motivo. Un motivo expresado
 * de dos maneras, no dos datos distintos.
 */
export function normalizarRegistro(r: Registro): Registro {
  return {
    ...r,
    cierreAutomatico: !!r.cierreAutomatico,
    salidaEstimada: !!r.salidaEstimada,
    motivoIds: r.motivoIds ?? (r.motivoId ? [r.motivoId] : undefined),
    motivoNombres: r.motivoNombres ?? (r.motivoNombre ? [r.motivoNombre] : undefined),
    // Un `alumnoId` sintético equivale a "sin alumno", que es exactamente lo
    // que la nube guarda. Ver `asUuidOrNull` en remote-database.service: el
    // acceso de invitado genera `invitado-<timestamp>`, que no es UUID y la
    // columna `alumno_id` (tipo uuid) recibe null. No es pérdida de dato: en
    // los invitados lo que identifica al registro es `matricula: 'INVITADO'`.
    //
    // Deliberadamente NO se ignora el campo entero: entre dos alumnos reales
    // un `alumnoId` distinto significa que el registro apunta a otra persona,
    // y eso sí es un conflicto que hay que ver.
    alumnoId: esIdSintetico(r.alumnoId) ? undefined : r.alumnoId,
  } as Registro;
}

/**
 * Regex de UUID v1–v5, el formato que produce `uuidv4()`.
 *
 * Se duplica a propósito en vez de importarla de `remote-database.service`:
 * este módulo es de funciones puras y no debe arrastrar el cliente de
 * Supabase solo para validar una cadena.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** `true` para ids que el local acepta pero Postgres no (p. ej. invitados). */
export function esIdSintetico(id: string | null | undefined): boolean {
  if (!id) return false;
  return !UUID_RE.test(id);
}

/** El alumno no necesita transformación; sus diferencias se filtran por campo. */
export function normalizarAlumno(a: Alumno): Alumno {
  return a;
}

export function normalizarMotivo(m: Motivo): Motivo {
  return { ...m, activo: !!m.activo };
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
  /** Se aplica a ambos lados SOLO para comparar; se guarda la fila original. */
  normalizar: (fila: T) => T = f => f,
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

    const camposDistintos = camposQueDifieren(
      normalizar(local), normalizar(remoto), camposIgnorados,
    );
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
    [], normalizarMotivo,
  );
  const alumnos = compararStore<Alumno>(
    local.alumnos, remoto.alumnos, a => a.id, labelAlumno,
    [
      // La nube no guarda `datosExtra` (campos personalizados del
      // coordinador): compararlo marcaría a todo alumno que los use.
      'datosExtra',
      // `fechaActualizacion` es el `updated_at` del servidor. El modelo local
      // no lo mantiene, así que NUNCA puede coincidir: comparándolo, los 503
      // alumnos salían en conflicto por un campo que no es dato de usuario.
      'fechaActualizacion',
    ],
    normalizarAlumno,
  );
  const registros = compararStore<Registro>(
    local.registros, remoto.registros, r => r.id, labelRegistro,
    [], normalizarRegistro,
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
