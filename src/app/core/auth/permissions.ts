// ╔══════════════════════════════════════════════════════╗
// ║  permissions.ts                                      ║
// ║  Stenbrary — Fase 2.3 (Roles y permisos)             ║
// ║                                                      ║
// ║  Fuente única de verdad del modelo de permisos.      ║
// ║  Tanto el roleGuard (defensa en BD/ruta) como el     ║
// ║  PermissionsService (UI condicional) consumen esto.  ║
// ║                                                      ║
// ║  Filosofía:                                          ║
// ║  - Si `isLocalOnly`, todo está permitido (sin auth   ║
// ║    no hay roles; la app sigue 100% offline-first).   ║
// ║  - Si `signed-out` y Supabase configurado, los       ║
// ║    guards redirigen a /login.                        ║
// ║  - Si `signed-in`, se aplican los permisos del rol.  ║
// ║  - Defense in depth: la UI esconde lo que el rol no  ║
// ║    puede hacer Y el guard impide el acceso si        ║
// ║    teclea la URL Y la BD rechaza vía RLS.            ║
// ╚══════════════════════════════════════════════════════╝

import { UserRole } from './auth.types';

/**
 * Acciones del sistema. Granularidad fina para que la UI esconda
 * botones específicos en vez de vistas completas (mejor UX que
 * "mostrar y denegar").
 *
 * Convenir al agregar: usa verbo + recurso. Si una acción solo se
 * dispara en una ruta, prefiere `canAccess(ruta)` sobre crear un
 * action key nuevo — evita explosión combinatoria.
 */
export type AppAction =
  // ── Alumnos ──
  | 'alumnos.crear'
  | 'alumnos.editar'
  | 'alumnos.desactivar'
  | 'alumnos.importarMasivo'
  // ── Registros ──
  | 'registros.editar'
  | 'registros.eliminar'
  | 'registros.eliminarMasivo'
  | 'registros.exportar'
  // ── Motivos ──
  | 'motivos.gestionar'
  // ── Configuración / sistema ──
  | 'configuracion.modificar'
  | 'datosPrueba.generar'
  | 'backup.exportar'
  | 'backup.importar'
  // ── Estadísticas ──
  | 'estadisticas.ver'
  // ── Sincronización ──
  | 'sync.subir'
  | 'sync.descartar';

/**
 * Permisos por acción → roles autorizados.
 *
 * Regla de oro: super_admin SIEMPRE aparece (puede todo). Si una
 * acción solo es del super_admin, ponerlo solo a él.
 */
const PERMISOS_POR_ACCION: Record<AppAction, readonly UserRole[]> = {
  // Alumnos
  'alumnos.crear':            ['super_admin', 'coordinador', 'asistente'],
  'alumnos.editar':           ['super_admin', 'coordinador'],
  'alumnos.desactivar':       ['super_admin', 'coordinador'],
  'alumnos.importarMasivo':   ['super_admin', 'coordinador'],
  // Registros
  'registros.editar':         ['super_admin', 'coordinador'],
  'registros.eliminar':       ['super_admin', 'coordinador'],
  'registros.eliminarMasivo': ['super_admin', 'coordinador'],
  'registros.exportar':       ['super_admin', 'coordinador'],
  // Motivos
  'motivos.gestionar':        ['super_admin', 'coordinador'],
  // Configuración / sistema
  'configuracion.modificar':  ['super_admin', 'coordinador'],
  'datosPrueba.generar':      ['super_admin', 'coordinador'],
  'backup.exportar':          ['super_admin', 'coordinador'],
  'backup.importar':          ['super_admin', 'coordinador'],
  // Estadísticas
  'estadisticas.ver':         ['super_admin', 'coordinador'],
  // Sincronización
  'sync.subir':               ['super_admin', 'coordinador'],
  'sync.descartar':           ['super_admin', 'coordinador'],
};

/**
 * Permisos por ruta → roles autorizados.
 *
 * Si una ruta NO está aquí, se considera **pública** (cualquier rol
 * o sin sesión puede entrar). El roleGuard solo se aplica donde sí
 * hay restricción declarada.
 */
const PERMISOS_POR_RUTA: Record<string, readonly UserRole[]> = {
  // Operación del personal — todos menos alumno
  '/scanner':           ['super_admin', 'coordinador', 'asistente'],
  '/registro-alumno':   ['super_admin', 'coordinador', 'asistente'],
  '/seleccion-motivo':  ['super_admin', 'coordinador', 'asistente'],
  '/dashboard':         ['super_admin', 'coordinador', 'asistente'],
  '/alumnos':           ['super_admin', 'coordinador', 'asistente'],
  '/registros':         ['super_admin', 'coordinador', 'asistente'],
  '/presencia':         ['super_admin', 'coordinador', 'asistente'],
  '/inactivos':         ['super_admin', 'coordinador', 'asistente'],
  // Admin — solo coordinador y super_admin
  '/estadisticas':      ['super_admin', 'coordinador'],
  '/gestion-motivos':   ['super_admin', 'coordinador'],
  '/configuracion':     ['super_admin', 'coordinador'],
  '/importar-alumnos':  ['super_admin', 'coordinador'],
  '/sincronizacion':    ['super_admin', 'coordinador'],
  // Públicas (no listadas): /login, /novedades, /acceso-denegado,
  // /detalle-alumno/:matricula
};

/**
 * Roles autorizados para una acción. Retorna readonly por convención.
 */
export function rolesPara(action: AppAction): readonly UserRole[] {
  return PERMISOS_POR_ACCION[action];
}

/**
 * Roles autorizados para una ruta. Retorna `null` si la ruta es pública
 * (no tiene restricción declarada).
 */
export function rolesParaRuta(ruta: string): readonly UserRole[] | null {
  // Tolerar query strings y trailing slash.
  const limpia = ruta.split('?')[0].replace(/\/$/, '') || '/';
  return PERMISOS_POR_RUTA[limpia] ?? null;
}

/**
 * ¿El rol dado puede ejecutar la acción?
 * Si `rol` es null (usuario no autenticado o local-only), retorna
 * `permitirSinRol` — por defecto true porque la app es offline-first.
 */
export function puede(
  action: AppAction,
  rol: UserRole | null,
  permitirSinRol = true,
): boolean {
  if (rol === null) return permitirSinRol;
  return PERMISOS_POR_ACCION[action].includes(rol);
}

/**
 * ¿El rol dado puede acceder a la ruta?
 * Mismo principio que `puede` para roles nulos.
 */
export function puedeAccederA(
  ruta: string,
  rol: UserRole | null,
  permitirSinRol = true,
): boolean {
  const roles = rolesParaRuta(ruta);
  if (roles === null) return true; // ruta pública
  if (rol === null) return permitirSinRol;
  return roles.includes(rol);
}
