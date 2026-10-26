// ╔══════════════════════════════════════════════════════╗
// ║  usuarios.component.ts                               ║
// ║  Stenbrary — Fase 2.3.x (Gestión de usuarios)        ║
// ║                                                      ║
// ║  El coordinador asigna roles sin tocar SQL. Modelo   ║
// ║  de "invitación": el asistente inicia sesión una vez ║
// ║  (el trigger lo crea como `asistente`), aparece aquí ║
// ║  y el coordinador ajusta su rol.                     ║
// ║                                                      ║
// ║  Seguridad: el cambio de rol pasa por la RPC          ║
// ║  `set_user_role` (security definer) — la UI solo      ║
// ║  presenta; las salvaguardas viven en la BD.          ║
// ╚══════════════════════════════════════════════════════╝


import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/auth/auth.types';
import { ToastService } from '../../core/services/toast.service';
import { mensajeParaUsuario } from '../../core/utils/mensaje-error.utils';
import {
  RemoteDatabaseService,
  UsuarioPerfil,
} from '../../core/services/remote-database.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

/** Roles que un coordinador puede asignar (super_admin queda fuera por seguridad). */
const ROLES_ASIGNABLES: { valor: UserRole; etiqueta: string }[] = [
  { valor: 'coordinador', etiqueta: 'Coordinador' },
  { valor: 'asistente', etiqueta: 'Asistente' },
];

@Component({
    selector: 'app-usuarios',
    imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
],
    templateUrl: './usuarios.component.html',
    styleUrl: './usuarios.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuariosComponent implements OnInit {
  private readonly remote = inject(RemoteDatabaseService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  protected readonly rolesAsignables = ROLES_ASIGNABLES;

  protected readonly cargando = signal(true);
  protected readonly usuarios = signal<UsuarioPerfil[]>([]);
  /** Id de la fila que está guardando (para deshabilitar y mostrar spinner). */
  protected readonly guardandoId = signal<string | null>(null);

  protected readonly miId = computed(() => this.auth.currentUser()?.id ?? null);

  async ngOnInit(): Promise<void> {
    if (this.auth.isSignedIn()) {
      await this.cargar();
    }
    this.cargando.set(false);
  }

  protected irALogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/usuarios' } });
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.usuarios.set(await this.remote.listarUsuarios());
    } catch (err) {
      this.toast.error(mensajeParaUsuario(err, 'usuarios', 'No se pudieron cargar los usuarios.'));
    } finally {
      this.cargando.set(false);
    }
  }

  /** ¿La fila es editable? No editable: uno mismo y los super_admin. */
  protected editable(u: UsuarioPerfil): boolean {
    return u.id !== this.miId() && u.rol !== 'super_admin';
  }

  protected nombreMostrado(u: UsuarioPerfil): string {
    const local = (u.email ?? '').split('@')[0];
    const nombre = (u.nombre ?? '').trim();
    if (!nombre || nombre === local) return u.email || nombre || '(sin nombre)';
    return nombre;
  }

  protected rolLegible(rol: UserRole): string {
    switch (rol) {
      case 'super_admin': return 'Super admin';
      case 'coordinador': return 'Coordinador';
      case 'asistente':   return 'Asistente';
      case 'alumno':      return 'Alumno';
    }
  }

  /** Maneja el cambio desde el <select> de rol. */
  protected async onRolChange(u: UsuarioPerfil, event: Event): Promise<void> {
    const nuevoRol = (event.target as HTMLSelectElement).value as UserRole;
    if (nuevoRol === u.rol) return;

    const ok = await this.confirmar(
      `¿Cambiar a ${this.nombreMostrado(u)} a "${this.rolLegible(nuevoRol)}"?`,
      'El usuario verá el cambio la próxima vez que inicie sesión.',
    );
    if (!ok) {
      // Revertir el <select> al valor previo.
      (event.target as HTMLSelectElement).value = u.rol;
      return;
    }

    this.guardandoId.set(u.id);
    try {
      await this.remote.cambiarRolUsuario(u.id, nuevoRol);
      this.usuarios.update(list =>
        list.map(x => (x.id === u.id ? { ...x, rol: nuevoRol } : x)),
      );
      this.toast.success(`Rol actualizado: ${this.rolLegible(nuevoRol)}.`);
    } catch (err) {
      (event.target as HTMLSelectElement).value = u.rol;
      this.toast.error(mensajeParaUsuario(err, 'usuarios', 'No se pudo cambiar el rol.'));
    } finally {
      this.guardandoId.set(null);
    }
  }

  private confirmar(titulo: string, mensaje: string): Promise<boolean> {
    return new Promise(resolve => {
      const ref = this.dialog.open(ConfirmDialogComponent, {
        width: '420px',
        data: { titulo, mensaje, variante: 'warning', textoConfirmar: 'Cambiar rol' },
      });
      ref.afterClosed().subscribe(ok => resolve(!!ok));
    });
  }
}
