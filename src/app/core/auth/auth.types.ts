// ╔══════════════════════════════════════════════════════╗
// ║  auth.types.ts                                       ║
// ║  Stenbrary — Tipos del módulo de autenticación       ║
// ║                                                      ║
// ║  Fase 2.0 — Fundación de auth (Supabase).            ║
// ║  Tipos compartidos por AuthService, guards, UI.      ║
// ║                                                      ║
// ║  Diseñados para sobrevivir a la transición           ║
// ║  single-tenant → multi-tenant (Fase 2.5): cada       ║
// ║  perfil ya carga su organization_id desde el día 1.  ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Roles del sistema. Espejo del enum `user_role` en Postgres.
 * El orden refleja jerarquía descendente — útil para checks
 * de tipo `rol >= 'asistente'` si llega a hacer falta.
 */
export type UserRole = 'super_admin' | 'coordinador' | 'asistente' | 'alumno';

/**
 * Perfil enriquecido del usuario autenticado. Se construye
 * combinando `auth.users` (Supabase) + `public.user_profiles`
 * (nuestro schema). Lo que el resto de la app consume.
 */
export interface AuthUser {
  /** UUID de Supabase auth (auth.users.id). */
  id: string;
  /** Correo de la sesión activa. */
  email: string;
  /** Rol asignado al usuario en su organización. */
  rol: UserRole;
  /** Nombre legible para UI ("Hola, María"). */
  nombre: string;
  /** Organización a la que pertenece. Nullable solo para super_admin. */
  organizationId: string | null;
  /** Solo para rol `alumno` — enlaza con el `Alumno` local (matrícula). */
  matricula: string | null;
}

/**
 * Estado de la sesión de auth en cualquier momento.
 *
 * - `local-only`: no hay Supabase configurado o el usuario eligió
 *   operar sin login. La app sigue 100% funcional contra IndexedDB.
 * - `signed-out`: hay backend pero nadie logueado.
 * - `signed-in`: usuario autenticado, perfil cargado.
 * - `loading`: verificando sesión persistida al arrancar.
 */
export type AuthStatus = 'local-only' | 'signed-out' | 'signed-in' | 'loading';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Mensaje del último error (para UI). null si todo OK. */
  error: string | null;
}

/**
 * Organización (tenant). En Fase 2.0 hay una sola; en Fase 2.5
 * la UI permitirá cambiar entre las que el usuario pertenezca.
 */
export interface Organization {
  id: string;
  nombre: string;
  slug: string;
  createdAt: string;
}
