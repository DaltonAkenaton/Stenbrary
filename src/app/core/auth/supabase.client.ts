// ╔══════════════════════════════════════════════════════╗
// ║  supabase.client.ts                                  ║
// ║  Stenbrary — Cliente Supabase singleton              ║
// ║                                                      ║
// ║  Fase 2.0 — Fundación de auth.                       ║
// ║                                                      ║
// ║  Una sola instancia compartida por toda la app.      ║
// ║  Si las credenciales están vacías retornamos null:   ║
// ║  el resto del código debe tolerarlo (modo            ║
// ║  "solo-local" — sigue funcionando contra IndexedDB). ║
// ╚══════════════════════════════════════════════════════╝

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

let cachedClient: SupabaseClient | null = null;

/**
 * Devuelve el cliente Supabase si hay credenciales configuradas,
 * o `null` si la app debe operar en modo solo-local.
 *
 * El cliente se crea una sola vez y se reutiliza. PKCE flow para
 * mayor seguridad en la SPA; sesión persistida en localStorage
 * (key custom para no chocar con otras apps en mismo dominio).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = environment.supabase?.url;
  const anonKey = environment.supabase?.anonKey;

  if (!url || !anonKey) return null;

  cachedClient = createClient(url, anonKey, {
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
 * Indica si el backend está configurado. Útil para guards y UI
 * que necesitan decidir entre flujo local-only y flujo auth.
 */
export function isSupabaseConfigured(): boolean {
  return !!(environment.supabase?.url && environment.supabase?.anonKey);
}
