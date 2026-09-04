// ╔══════════════════════════════════════════════════════╗
// ║  supabase.client.ts                                  ║
// ║  Stenbrary — Cliente Supabase singleton              ║
// ║                                                      ║
// ║  Fase 2.0 — Fundación de auth.                       ║
// ║  v3.41.0 — La nube es opt-in POR INSTALACIÓN.        ║
// ║                                                      ║
// ║  Una sola instancia compartida por toda la app.      ║
// ║  Si las credenciales están vacías retornamos null:   ║
// ║  el resto del código debe tolerarlo (modo            ║
// ║  "solo-local" — sigue funcionando contra IndexedDB). ║
// ║                                                      ║
// ║  Hay DOS condiciones, y separarlas es el punto:      ║
// ║                                                      ║
// ║  1. `hayCredencialesNube()` — este BUILD trae url +  ║
// ║     anonKey. Lo decide quien compila.                ║
// ║  2. `isNubeActiva()` — ESTA instalación encendió la  ║
// ║     nube. Lo decide el coordinador, y por defecto    ║
// ║     está en NO.                                      ║
// ║                                                      ║
// ║  Sin la (2), publicar un build con credenciales      ║
// ║  cambiaría el comportamiento de todas las            ║
// ║  instalaciones a la vez: `roleGuard` empieza a       ║
// ║  exigir sesión, y la sesión llega por magic link,    ║
// ║  que necesita Internet y un correo que llegue. Una   ║
// ║  app cuyo diferencial es operar sin red no puede     ║
// ║  pedir red para abrir Configuración por el hecho de  ║
// ║  haber desplegado. El interruptor lo mueve el        ║
// ║  coordinador cuando ya tiene cuenta.                 ║
// ╚══════════════════════════════════════════════════════╝

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

let cachedClient: SupabaseClient | null = null;

/**
 * Preferencia por instalación. Clave propia en vez de entrar a
 * `stenbrary-config`: este módulo lo leen funciones sueltas fuera de la
 * inyección de dependencias (`getSupabaseClient` corre en el inicializador
 * de campo de `AuthService`), así que no puede depender de `ConfigService`.
 * Mismo patrón que `stenbrary-sonido-activo`.
 */
const NUBE_ACTIVA_KEY = 'stenbrary-nube-activa';

/** ¿Este build trae credenciales? Lo decide `environment.ts`, no el usuario. */
export function hayCredencialesNube(): boolean {
  return !!(environment.supabase?.url && environment.supabase?.anonKey);
}

/**
 * ¿El coordinador encendió la nube en ESTA instalación?
 * Default `false`: una instalación recién actualizada no cambia de
 * comportamiento sola.
 */
export function isNubeActiva(): boolean {
  try {
    return localStorage.getItem(NUBE_ACTIVA_KEY) === 'true';
  } catch {
    // localStorage bloqueado (modo privado con cookies restringidas):
    // caer a solo-local es la degradación segura.
    return false;
  }
}

/**
 * Enciende o apaga la nube en esta instalación.
 *
 * No intenta reconfigurar el cliente en caliente: `getSupabaseClient()`
 * cachea y `AuthService` fija su estado inicial una sola vez, así que
 * media app quedaría con la idea vieja. Quien llame a esto debe recargar
 * la página; los componentes que lo usan lo hacen explícitamente.
 */
export function setNubeActiva(activa: boolean): void {
  try {
    localStorage.setItem(NUBE_ACTIVA_KEY, activa ? 'true' : 'false');
  } catch {
    /* Sin localStorage no hay preferencia que guardar — queda en solo-local. */
  }
}

/**
 * Devuelve el cliente Supabase si la app debe hablar con el backend,
 * o `null` si opera en modo solo-local.
 *
 * El cliente se crea una sola vez y se reutiliza. PKCE flow para
 * mayor seguridad en la SPA; sesión persistida en localStorage
 * (key custom para no chocar con otras apps en mismo dominio).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  if (!isSupabaseConfigured()) return null;

  cachedClient = createClient(environment.supabase.url, environment.supabase.anonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'stenbrary-auth',
      // Silencia el warning "Acquiring an exclusive Navigator LockManager
      // lock immediately failed" de supabase-js. El SDK intenta tomar un
      // lock global para coordinar el refresh del JWT entre pestañas; en
      // una PWA típica de Stenbrary (1 pestaña activa) no aporta y
      // produce ruido en consola. Le pasamos un lock pass-through.
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  });

  return cachedClient;
}

/**
 * Indica si el backend está configurado **y encendido**. Útil para guards y
 * UI que necesitan decidir entre flujo local-only y flujo auth.
 *
 * Si esto es `false` la app entera se comporta como antes de Fase 2: sin
 * login, sin roles, sin sondeos de red.
 */
export function isSupabaseConfigured(): boolean {
  return hayCredencialesNube() && isNubeActiva();
}
