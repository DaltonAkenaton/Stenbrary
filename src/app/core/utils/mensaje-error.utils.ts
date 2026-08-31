// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/utils/mensaje-error.utils.ts     ║
// ║  Stenbrary — Traducción de errores técnicos          ║
// ║                                                      ║
// ║  El patrón `toast.error(err.message)` es cómodo para ║
// ║  quien programa y hostil para quien usa el sistema.  ║
// ║  Un coordinador que lee "column user_profiles.email  ║
// ║  does not exist" no aprende nada: no sabe si perdió  ║
// ║  datos, si fue culpa suya, ni qué hacer. Lo que hace ║
// ║  es dejar de usar la función.                        ║
// ║                                                      ║
// ║  Aquí se traduce a lenguaje humano y el detalle      ║
// ║  técnico se manda a /diagnostico, que es donde       ║
// ║  sirve — sin perderlo, que es lo importante.         ║
// ╚══════════════════════════════════════════════════════╝

import { reportarAnomalia } from './invariante.utils';

/** Texto crudo del error, venga como venga. */
function textoDe(err: unknown): string {
  if (typeof err === 'string') return err;
  const e = err as { message?: unknown; error_description?: unknown };
  if (typeof e?.message === 'string') return e.message;
  if (typeof e?.error_description === 'string') return e.error_description;
  return '';
}

/**
 * Reglas de traducción, de la más específica a la más general.
 *
 * Cada patrón mapea una familia de fallos reales a lo que el usuario
 * necesita saber: qué pasó y si puede hacer algo.
 */
const REGLAS: { patron: RegExp; mensaje: string }[] = [
  // ── Esquema desalineado (código más nuevo que la base) ──
  {
    patron: /column .* does not exist|relation .* does not exist|function .* does not exist/i,
    mensaje:
      'Esta parte del sistema necesita una actualización pendiente en el servidor. ' +
      'Tus datos están a salvo. Avisa a quien da soporte.',
  },
  // ── Permisos / RLS ──
  {
    patron: /row-level security|permission denied|not authorized|jwt|insufficient/i,
    mensaje: 'Tu cuenta no tiene permiso para hacer esto. Pide que te asignen el rol adecuado.',
  },
  // ── Sesión ──
  {
    patron: /invalid.*token|session.*expired|refresh.*token|not authenticated/i,
    mensaje: 'Tu sesión terminó. Vuelve a iniciar sesión para continuar.',
  },
  // ── Red ──
  {
    patron: /failed to fetch|network|net::err|timeout|aborted|econnrefused/i,
    mensaje: 'No se pudo conectar. Revisa tu conexión — los datos locales siguen a salvo.',
  },
  // ── Duplicados / restricciones ──
  {
    patron: /duplicate key|unique constraint|already exists/i,
    mensaje: 'Ese dato ya existe. Revisa si lo estás registrando dos veces.',
  },
  {
    patron: /foreign key|violates .* constraint/i,
    mensaje: 'No se puede guardar porque depende de otro dato que falta o fue eliminado.',
  },
  // ── Almacenamiento local ──
  {
    patron: /quota|storage.*full|exceeded/i,
    mensaje:
      'El almacenamiento del equipo está lleno. Haz un respaldo y elimina registros antiguos.',
  },
  {
    patron: /indexeddb|database.*not.*initialized|transaction.*inactive/i,
    mensaje: 'Hubo un problema con la base de datos local. Recarga la página e intenta de nuevo.',
  },
];

/**
 * Convierte un error en un mensaje para el usuario y anota el original.
 *
 * @param area Sección donde ocurrió, para agrupar en /diagnostico.
 * @param respaldo Qué decir cuando ninguna regla aplica. Debe describir la
 *   acción que falló ("No se pudieron cargar los usuarios."), no el error:
 *   al usuario le importa qué no pasó, no por qué.
 */
export function mensajeParaUsuario(err: unknown, area: string, respaldo: string): string {
  const crudo = textoDe(err);

  // El detalle técnico nunca se pierde: va a la bitácora aunque el usuario
  // solo vea la versión amable.
  if (crudo) {
    reportarAnomalia(area, crudo, { tipo: (err as { code?: string })?.code });
  }

  const regla = REGLAS.find(r => r.patron.test(crudo));
  return regla ? regla.mensaje : respaldo;
}
