// ╔══════════════════════════════════════════════════════╗
// ║  registro-flujo.guard.ts                            ║
// ║  Stenbrary v3.6.2 — Guard de flujo de registro     ║
// ║                                                     ║
// ║  Protege /seleccion-motivo para que solo sea        ║
// ║  accesible si hay un alumno en sesión (es decir,    ║
// ║  si pasó por el scanner o registro primero).        ║
// ╚══════════════════════════════════════════════════════╝

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../services/toast.service';

/**
 * Guard funcional (Angular 18+) que verifica la existencia
 * de `alumnoActual` en sessionStorage antes de permitir
 * el acceso a la pantalla de selección de motivo.
 *
 * Si no hay alumno en sesión, redirige al scanner con un aviso.
 */
export const registroFlujoGuard: CanActivateFn = () => {
  const router = inject(Router);
  const toastService = inject(ToastService);

  const alumnoActual = sessionStorage.getItem('alumnoActual');

  if (alumnoActual) {
    try {
      // Validar que sea JSON válido
      JSON.parse(alumnoActual);
      return true;
    } catch {
      // Si el JSON está corrupto, limpiar y redirigir
      sessionStorage.removeItem('alumnoActual');
    }
  }

  toastService.warning('Primero escanea tu credencial');
  router.navigate(['/scanner']);
  return false;
};