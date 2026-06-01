// ╔══════════════════════════════════════════════════════╗
// ║  permissions.service.ts                              ║
// ║  Stenbrary — Fase 2.3 (Roles y permisos)             ║
// ║                                                      ║
// ║  Capa reactiva sobre `permissions.ts`. La UI         ║
// ║  consume signals; los guards consumen las funciones  ║
// ║  puras directamente.                                 ║
// ║                                                      ║
// ║  Diseñado para ser barato — todos los `can*` son     ║
// ║  computed signals, no recalculan si el rol no        ║
// ║  cambió.                                             ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { AppAction, puede, puedeAccederA } from './permissions';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly auth = inject(AuthService);

  /**
   * `null` cuando no hay sesión o estamos en modo local-only.
   * La UI debe interpretar null como "sin restricción" (offline-first).
   */
  private readonly rol = computed(() => this.auth.currentRole());

  /** En modo local-only no aplicamos permisos — la app es offline-first. */
  private readonly sinRestriccion = computed(
    () => this.auth.isLocalOnly() || !this.auth.isSignedIn(),
  );

  /** Helper genérico para checar acciones. */
  can(action: AppAction): boolean {
    if (this.sinRestriccion()) return true;
    return puede(action, this.rol());
  }

  /** Helper genérico para checar rutas. */
  canAccessRoute(ruta: string): boolean {
    if (this.sinRestriccion()) return true;
    return puedeAccederA(ruta, this.rol());
  }

  // ── Atajos como signals (para template-friendly bindings) ──
  // Mantengo solo los más usados — el resto se consulta vía `can(action)`.

  readonly canConfigurar = computed(() => this.can('configuracion.modificar'));
  readonly canGestionarMotivos = computed(() => this.can('motivos.gestionar'));
  readonly canVerEstadisticas = computed(() => this.can('estadisticas.ver'));
  readonly canSincronizar = computed(() => this.can('sync.subir'));
  readonly canImportarAlumnos = computed(() => this.can('alumnos.importarMasivo'));
  readonly canEliminarRegistros = computed(() => this.can('registros.eliminar'));
  readonly canExportarBackup = computed(() => this.can('backup.exportar'));

  /** Rol legible para UI ("Coordinador", "Asistente"…). */
  readonly rolLegible = computed(() => {
    switch (this.rol()) {
      case 'super_admin': return 'Super admin';
      case 'coordinador': return 'Coordinador';
      case 'asistente':   return 'Asistente';
      case 'alumno':      return 'Alumno';
      default:            return '';
    }
  });
}
