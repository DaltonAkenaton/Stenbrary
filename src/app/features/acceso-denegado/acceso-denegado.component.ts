// ╔══════════════════════════════════════════════════════╗
// ║  acceso-denegado.component.ts                        ║
// ║  Stenbrary — Fase 2.3 (Roles y permisos)             ║
// ║                                                      ║
// ║  Pantalla a la que redirige `roleGuard` cuando el    ║
// ║  rol actual no tiene permiso para una ruta. Le dice  ║
// ║  al usuario qué intentó abrir, qué rol necesita y    ║
// ║  cómo volver.                                        ║
// ║                                                      ║
// ║  Defense in depth: la UI ya oculta los items, pero   ║
// ║  si alguien teclea la URL llegará aquí en vez de a   ║
// ║  un 404 confuso o un crash silencioso.               ║
// ╚══════════════════════════════════════════════════════╝

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import { UserRole } from '../../core/auth/auth.types';

@Component({
  selector: 'app-acceso-denegado',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './acceso-denegado.component.html',
  styleUrl: './acceso-denegado.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccesoDenegadoComponent {
  protected readonly auth = inject(AuthService);
  protected readonly permisos = inject(PermissionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Query params como signal (Angular 18 interop con rxjs). */
  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: { ruta: '', roles: '' },
  });

  protected readonly rutaIntentada = computed(() => this.queryParams()['ruta'] ?? '');

  protected readonly rolesPermitidos = computed<UserRole[]>(() => {
    const raw = this.queryParams()['roles'] ?? '';
    return raw.split(',').filter(Boolean) as UserRole[];
  });

  protected readonly rolesLegibles = computed(() =>
    this.rolesPermitidos().map(this.rolLegible).filter(Boolean).join(', '),
  );

  private rolLegible(rol: UserRole): string {
    switch (rol) {
      case 'super_admin': return 'Super admin';
      case 'coordinador': return 'Coordinador';
      case 'asistente':   return 'Asistente';
      case 'alumno':      return 'Alumno';
    }
  }

  protected volverAlInicio(): void {
    this.router.navigate(['/scanner']);
  }

  protected async cerrarSesion(): Promise<void> {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
