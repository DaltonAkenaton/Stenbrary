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
import { hayCredencialesNube, isNubeActiva, setNubeActiva } from '../../../core/auth/supabase.client';
import { environment } from '../../../../environments/environment';

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

  /** Este build trae credenciales de Supabase (lo decide `environment.ts`). */
  readonly hayCredenciales = hayCredencialesNube();

  /**
   * Esta instalación encendió la nube. Se lee una vez al construir: cambiarlo
   * recarga la página, así que no necesita ser reactivo.
   */
  readonly nubeActiva = isNubeActiva();

  /**
   * La sección de la nube se ve si el build trae credenciales Y está
   * habilitada en `environment.mostrarConexionNube`, o si esta instalación
   * ya la tiene encendida (para que siempre se pueda apagar).
   */
  readonly mostrarSeccionNube =
    this.hayCredenciales && (environment.mostrarConexionNube || this.nubeActiva);

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

  // ─── Conexión con la nube ───────────────────────────────
  // Encender la nube cambia el comportamiento de los guards: a partir de ahí
  // la administración pide sesión. Por eso se confirma, se explica qué
  // cambia, y se recarga la página — `getSupabaseClient()` cachea y
  // `AuthService` fija su estado una sola vez, así que un cambio en caliente
  // dejaría media app con la idea vieja.

  async conectarNube(): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        titulo: '¿Conectar este equipo con la nube?',
        mensaje:
          'Las secciones de administración (Configuración, Estadísticas, ' +
          'Actividades, Importar) pasarán a pedir inicio de sesión. El escáner ' +
          'y el registro de visitas siguen funcionando sin Internet. Si te ' +
          'quedas fuera, puedes volver a modo solo-local desde la pantalla de ' +
          'inicio de sesión.',
        variante: 'warning',
        textoConfirmar: 'Conectar',
        icono: 'cloud_upload',
      } as ConfirmDialogData,
    });

    if (!(await ref.afterClosed().toPromise())) return;

    setNubeActiva(true);
    // Recarga dura y a /login: la sesión es lo primero que hará falta, y el
    // router de Angular no bastaría (hay que reconstruir el cliente).
    window.location.href = '/login';
  }

  async desconectarNube(): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        titulo: '¿Volver a modo solo-local?',
        mensaje:
          'Este equipo dejará de hablar con la nube: se cierra la sesión y ' +
          'nadie tendrá que iniciarla para administrar. Los datos de este ' +
          'navegador no se tocan, y lo que ya subiste sigue en la nube. ' +
          'Puedes volver a conectarlo cuando quieras.',
        variante: 'warning',
        textoConfirmar: 'Volver a solo-local',
        icono: 'cloud_off',
      } as ConfirmDialogData,
    });

    if (!(await ref.afterClosed().toPromise())) return;

    // Cerrar sesión primero: si no, queda dormida en localStorage y al
    // reconectar entraría con el usuario anterior sin pedir nada. Best-effort:
    // sin red `signOut` falla y da igual, la preferencia local manda.
    try {
      await this.auth.signOut();
    } catch {
      /* Sin red no se puede avisar al servidor; basta con apagar el interruptor. */
    }

    setNubeActiva(false);
    window.location.href = '/scanner';
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
