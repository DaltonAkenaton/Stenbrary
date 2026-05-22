// ╔══════════════════════════════════════════════════════╗
// ║  categorias/avanzado.component.ts                    ║
// ║  Categoría "Avanzado" — accesos directos + zona      ║
// ║  peligrosa (eliminar TODO).                          ║
// ║  Stenbrary v3.24.0                                    ║
// ║                                                      ║
// ║  DESTRUCCION_HABILITADA queda en false por seguridad. ║
// ║  El botón de eliminar TODO sigue deshabilitado en UI  ║
// ║  hasta que el desarrollador lo active en el código.   ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingService } from '../../../core/services/loading.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/auth/auth.service';
import { RemoteDatabaseService } from '../../../core/services/remote-database.service';
import { SubirSupabaseDialogComponent } from '../dialogs/subir-supabase-dialog.component';

@Component({
  selector: 'app-config-avanzado',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './avanzado.component.html',
  styleUrls: ['../configuracion.styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvanzadoCategoriaComponent {

  // DEVELOPER FLAG: cambiar a true sólo en código para habilitar "eliminar todo".
  readonly DESTRUCCION_HABILITADA = false;

  procesando = false;

  // Sesión / Supabase — la sección "Subir a la nube" solo aparece si hay
  // sesión activa Y el backend está configurado.
  protected readonly auth = inject(AuthService);
  private readonly remote = inject(RemoteDatabaseService);
  readonly backendDisponible = this.remote.isAvailable();

  constructor(
    private databaseService: DatabaseService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private dialog: MatDialog,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  navegar(ruta: string): void {
    void this.router.navigate([ruta]);
  }

  abrirSubidaSupabase(): void {
    this.dialog.open(SubirSupabaseDialogComponent, {
      autoFocus: false,
      maxWidth: '92vw',
    });
  }

  async limpiarTodosDatos(): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titulo: '¿Eliminar TODOS los datos?',
        mensaje: 'Se borrarán todos los alumnos, registros y motivos. Los motivos por defecto se recrearán. Asegúrate de haber hecho un backup.',
        variante: 'danger',
        textoConfirmar: 'Eliminar todo',
        icono: 'delete_forever',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      this.procesando = true;
      this.cdr.markForCheck();
      this.loadingService.show('Eliminando todos los datos...');
      await this.databaseService.limpiarTodosDatos();
      this.loadingService.hide();
      this.toastService.success('Todos los datos han sido eliminados');
    } catch {
      this.loadingService.hide();
      this.toastService.error('Error al limpiar los datos');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }
}
