// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/guards/registro-flujo.guard.ts   ║
// ║  Stenbrary v3.5 — Guard para flujo de registro       ║
// ║                                                      ║
// ║  Protege /seleccion-motivo: solo se puede acceder    ║
// ║  si hay un alumno en sessionStorage (escaneado o     ║
// ║  invitado). Si no, redirige a /scanner.              ║
// ║                                                      ║
// ║  Usa functional guard (Angular 14.2+), no class.     ║
// ╚══════════════════════════════════════════════════════╝

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../services/toast.service';

/**
 * Guard funcional que verifica si hay un alumno activo en sessionStorage.
 * Si no lo hay, redirige al scanner con un mensaje de error.
 */
export const registroFlujoGuard: CanActivateFn = () => {
  const router = inject(Router);
  const toastService = inject(ToastService);

  const alumnoJson = sessionStorage.getItem('alumnoActual');

  if (alumnoJson) {
    try {
      const alumno = JSON.parse(alumnoJson);
      // Verificar que tiene al menos matrícula y nombre
      if (alumno.matricula && alumno.nombre) {
        return true;
      }
    } catch {
      // JSON inválido → limpiar y redirigir
      sessionStorage.removeItem('alumnoActual');
    }
  }

  toastService.warning('Primero escanea o ingresa una matrícula');
  return router.createUrlTree(['/scanner']);
};