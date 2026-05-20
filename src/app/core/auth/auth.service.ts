// ╔══════════════════════════════════════════════════════╗
// ║  auth.service.ts                                     ║
// ║  Stenbrary — Servicio de autenticación               ║
// ║                                                      ║
// ║  Fase 2.0 — Fundación de auth (Supabase).            ║
// ║                                                      ║
// ║  Estado reactivo con signals.                        ║
// ║                                                      ║
// ║  Reglas:                                             ║
// ║  - Si Supabase NO está configurado → estado          ║
// ║    'local-only' permanente, la app sigue 100%        ║
// ║    funcional contra IndexedDB (offline-first).       ║
// ║  - Magic link es el único flow soportado en Fase 2.0 ║
// ║    (password viene si el cliente lo pide; OAuth      ║
// ║    queda para Fase 2.4 con portal alumno).           ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, computed, signal } from '@angular/core';
import {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';

import {
  AuthState,
  AuthUser,
  UserRole,
} from './auth.types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.client';

const REDIRECT_PATH = '/login';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase: SupabaseClient | null = getSupabaseClient();

  /** Estado completo de auth. Fuente única de verdad. */
  private readonly stateSignal = signal<AuthState>({
    status: isSupabaseConfigured() ? 'loading' : 'local-only',
    user: null,
    error: null,
  });

  /** Acceso de lectura al estado completo. */
  readonly state = this.stateSignal.asReadonly();

  /** Usuario actual (o null si no hay sesión). */
  readonly currentUser = computed(() => this.stateSignal().user);

  /** Sesión activa con perfil cargado. */
  readonly isSignedIn = computed(() => this.stateSignal().status === 'signed-in');

  /**
   * Modo "solo local" — la app funciona contra IndexedDB sin Supabase.
   * Útil para guards: si está activo, no redirigir a /login.
   */
  readonly isLocalOnly = computed(() => this.stateSignal().status === 'local-only');

  /** Rol actual (o null). */
  readonly currentRole = computed<UserRole | null>(
    () => this.stateSignal().user?.rol ?? null,
  );

  constructor() {
    if (!this.supabase) return;

    void this.bootstrap();

    // Reacciona a cambios de sesión (login, logout, refresh, magic link callback).
    this.supabase.auth.onAuthStateChange((event, session) => {
      void this.handleAuthChange(event, session);
    });
  }

  // ────────────────────────────────────────────────────────
  // API pública
  // ────────────────────────────────────────────────────────

  /**
   * Envía un magic link al correo. El usuario hace click, regresa a la app,
   * Supabase detecta la sesión vía PKCE (`detectSessionInUrl: true`).
   */
  async signInWithMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.supabase) {
      return { ok: false, error: 'Modo solo-local: no hay backend configurado.' };
    }

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { ok: false, error: 'Ingresa un correo válido.' };
    }

    const { error } = await this.supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        // Volver al login para que la pantalla muestre el resultado al regresar.
        emailRedirectTo: `${window.location.origin}${REDIRECT_PATH}`,
      },
    });

    if (error) {
      this.stateSignal.update((s) => ({ ...s, error: error.message }));
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async signOut(): Promise<void> {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
    // onAuthStateChange se encarga de actualizar el signal.
  }

  /** Recarga el perfil desde la BD (útil tras editar rol/organización). */
  async refreshProfile(): Promise<void> {
    if (!this.supabase) return;
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      await this.loadProfile(data.session);
    }
  }

  // ────────────────────────────────────────────────────────
  // Privado
  // ────────────────────────────────────────────────────────

  private async bootstrap(): Promise<void> {
    if (!this.supabase) return;
    const { data, error } = await this.supabase.auth.getSession();

    if (error) {
      this.stateSignal.set({
        status: 'signed-out',
        user: null,
        error: error.message,
      });
      return;
    }

    if (data.session) {
      await this.loadProfile(data.session);
    } else {
      this.stateSignal.set({ status: 'signed-out', user: null, error: null });
    }
  }

  private async handleAuthChange(
    event: AuthChangeEvent,
    session: Session | null,
  ): Promise<void> {
    if (event === 'SIGNED_OUT' || !session) {
      this.stateSignal.set({ status: 'signed-out', user: null, error: null });
      return;
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      await this.loadProfile(session);
    }
  }

  /**
   * Combina la sesión de auth con el perfil de `user_profiles` y
   * monta el `AuthUser` que la app consume.
   */
  private async loadProfile(session: Session): Promise<void> {
    if (!this.supabase) return;

    const authUser = session.user;
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('rol, nombre, organization_id, matricula')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) {
      // Sesión existe pero el perfil no — trigger debe crearlo automáticamente.
      // Si llegamos aquí es bug de schema, fallo del trigger handle_new_user
      // o policy RLS mal configurada (caso real visto: recursión infinita en
      // profiles_select devolvía 500). Por eso logueamos a consola para que
      // el próximo fallo no pase silencioso como "sesión cerrada misteriosa".
      console.error('[AuthService] No se pudo cargar user_profiles:', error);
      this.stateSignal.set({
        status: 'signed-out',
        user: null,
        error:
          error?.message ?? 'No se encontró perfil para esta sesión. Avisa al administrador.',
      });
      return;
    }

    const user: AuthUser = {
      id: authUser.id,
      email: authUser.email ?? '',
      rol: profile.rol as UserRole,
      nombre: profile.nombre ?? '',
      organizationId: profile.organization_id ?? null,
      matricula: profile.matricula ?? null,
    };

    this.stateSignal.set({ status: 'signed-in', user, error: null });
  }
}
