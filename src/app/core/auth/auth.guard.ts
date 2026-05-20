// ╔══════════════════════════════════════════════════════╗
// ║  auth.guard.ts                                       ║
// ║  Stenbrary — Guard de autenticación                  ║
// ║                                                      ║
// ║  Fase 2.0 — Fundación de auth.                       ║
// ║                                                      ║
// ║  Comportamiento:                                     ║
// ║  - local-only (sin Supabase configurado) → deja      ║
// ║    pasar siempre. Offline-first es innegociable.     ║
// ║  - signed-in → deja pasar.                           ║
// ║  - signed-out / loading → redirige a /login          ║
// ║    preservando returnUrl.                            ║
// ║                                                      ║
// ║  El control fino por rol (canRoles) vendrá en        ║
// ║  Fase 2.3 con un guard parametrizable.               ║
// ╚══════════════════════════════════════════════════════╝

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Modo solo-local: la app sigue funcionando como antes de Fase 2.
  if (auth.isLocalOnly()) return true;
  if (auth.isSignedIn()) return true;

  // Mientras carga la sesión inicial, bloqueamos suavemente — el guard se
  // re-evalúa cuando el signal cambia (Angular ya lo maneja con CanActivateFn).
  // Si ya terminó de cargar y no hay sesión, redirigir.
  if (auth.state().status === 'loading') return false;

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
