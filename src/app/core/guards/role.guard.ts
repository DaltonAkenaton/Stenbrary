// ╔══════════════════════════════════════════════════════╗
// ║  role.guard.ts                                       ║
// ║  Stenbrary — Fase 2.3 (Roles y permisos)             ║
// ║                                                      ║
// ║  Guard parametrizable que protege rutas por rol.     ║
// ║                                                      ║
// ║  Uso:                                                ║
// ║    {                                                 ║
// ║      path: 'configuracion',                          ║
// ║      canActivate: [roleGuard],                       ║
// ║      data: { roles: ['super_admin', 'coordinador'] },║
// ║      ...                                             ║
// ║    }                                                 ║
// ║                                                      ║
// ║  Si la ruta no declara `data.roles`, el guard cae al ║
// ║  mapa central de `permissions.ts` (usando la URL).   ║
// ║  Así puedes elegir: declarar inline (más explícito)  ║
// ║  o confiar en la matriz central (más DRY).           ║
// ╚══════════════════════════════════════════════════════╝

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth.types';
import { rolesParaRuta } from '../auth/permissions';
import { ToastService } from '../services/toast.service';

interface RoleGuardData {
  roles?: UserRole[];
}

export const roleGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  // ── 0. Esperar al bootstrap inicial ──
  // Sin esto, al refrescar una ruta protegida el guard corre mientras auth
  // está en 'loading' (isSignedIn = false) y rebota a /login un instante
  // antes de rehidratar la sesión (flash de "inicia sesión"). `ready`
  // resuelve apenas termina el bootstrap (o de inmediato en local-only).
  await auth.ready;

  // ── 1. Modo local-only: la app sigue siendo 100% offline-first ──
  // Sin backend no hay roles que aplicar. Coherente con la filosofía
  // del producto (el coordinador puede operar sin Internet).
  if (auth.isLocalOnly()) return true;

  // ── 2. Sin sesión y Supabase configurado → /login ──
  if (!auth.isSignedIn()) {
    toast.warning('Inicia sesión para continuar.');
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  // ── 3. Determinar roles autorizados ──
  // Prioridad: data.roles inline > mapa central por ruta.
  const data = route.data as RoleGuardData;
  const rolesDeclarados = data?.roles;
  const rolesPermitidos = rolesDeclarados ?? rolesParaRuta(state.url);

  // Si nadie restringe explícitamente, dejar pasar (ruta pública aún
  // bajo el guard — caso raro, pero permite reutilizar el guard).
  if (!rolesPermitidos || rolesPermitidos.length === 0) return true;

  // ── 4. Validar rol actual ──
  const rolActual = auth.currentRole();
  if (rolActual && rolesPermitidos.includes(rolActual)) return true;

  // ── 5. Denegar — redirigir a /acceso-denegado con contexto ──
  router.navigate(['/acceso-denegado'], {
    queryParams: {
      ruta: state.url,
      roles: rolesPermitidos.join(','),
    },
  });
  return false;
};
