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
import { RestablecerDialogComponent } from '../restablecer-dialog.component';
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

  // ─── Restablecer de fábrica ─────────────────────────────
  // Sustituye al viejo "Eliminar todos los datos", que estaba apagado con
  // una constante de código: eso no es una salvaguarda, es una función que
  // no existe. Aquí la protección es real y en tiempo de ejecución —
  // rol máximo + respaldo obligatorio + frase escrita a mano.

  /**
   * Solo el rol máximo. En modo solo-local (sin backend) no hay sesión ni
   * roles, así que se permite: quien tiene la laptop en la mano ya puede
   * borrar la base desde el navegador, y bloquearlo solo estorbaría.
   */
  get puedeRestablecer(): boolean {
    const rol = this.auth.currentRole();
    return !this.backendDisponible || rol === 'super_admin';
  }

  async restablecerSistema(): Promise<void> {
    if (!this.puedeRestablecer) return;

    const ref = this.dialog.open(RestablecerDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      disableClose: true,   // salir por accidente a media confirmación, no
      autoFocus: false,
    });

    const resultado = await ref.afterClosed().toPromise();
    if (!resultado) return;

    this.toastService.success(
      `Sistema restablecido. Se borraron ${resultado.registrosBorrados} visitas ` +
      `y ${resultado.alumnosBorrados} alumnos.`,
    );
    // Al asistente y no al scanner: acaba de quedar sin configuración, y
    // dejarlo ahí con todo en valores por defecto y sin explicar nada es
    // como entregarle un sistema distinto sin avisar.
    void this.router.navigate(['/bienvenida']);
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
