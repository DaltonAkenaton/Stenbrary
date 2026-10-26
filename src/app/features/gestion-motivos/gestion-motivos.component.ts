// ╔══════════════════════════════════════════════════════╗
// ║  gestion-motivos.component.ts                        ║
// ║  Stenbrary v3.6.2 — confirm() → ConfirmDialog        ║
// ║                                                      ║
// ║  FIX v3.6.2:                                         ║
// ║  - Reemplazado confirm() nativo por                  ║
// ║    ConfirmDialogComponent (consistencia visual)       ║
// ║  - Eliminada doble confirmación en eliminarMotivo     ║
// ║    (el dialog ya tiene variante danger + texto claro) ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { Motivo } from '../../core/models';
import { MotivoFormDialogComponent } from './motivo-form-dialog/motivo-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { BitacoraService } from '../../core/services/bitacora.service';

@Component({
    selector: 'app-gestion-motivos',
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatTooltipModule,
        MatDialogModule,
        MatTableModule,
    ],
    templateUrl: './gestion-motivos.component.html',
    styleUrl: './gestion-motivos.component.scss'
})
export class GestionMotivosComponent implements OnInit {
  private databaseService = inject(DatabaseService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  motivos: Motivo[] = [];
  cargando = true;
  filtroBusqueda = '';

  columnasMotivos: string[] = ['icono', 'nombre', 'prioridad', 'estado', 'acciones'];

  get motivosActivos(): number {
    return this.motivos.filter(m => m.activo).length;
  }

  get motivosInactivos(): number {
    return this.motivos.filter(m => !m.activo).length;
  }

  get motivosFiltrados(): Motivo[] {
    if (!this.filtroBusqueda.trim()) return this.motivos;
    const q = this.filtroBusqueda.toLowerCase().trim();
    return this.motivos.filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      (m.descripcion || '').toLowerCase().includes(q)
    );
  }

  private readonly bitacora = inject(BitacoraService);

  async ngOnInit(): Promise<void> {
    await this.cargarMotivos();
  }

  async cargarMotivos(): Promise<void> {
    try {
      this.cargando = true;
      this.motivos = await this.databaseService.obtenerTodosLosMotivos();
      this.cargando = false;
    } catch (error) {
      console.error('❌ Error al cargar motivos:', error);
      this.toastService.error('Error al cargar las actividades');
      this.cargando = false;
    }
  }

  abrirDialogNuevo(): void {
    const dialogRef = this.dialog.open(MotivoFormDialogComponent, {
      width: '500px',
      data: { motivo: null, esNuevo: true },
    });

    dialogRef.afterClosed().subscribe(async (resultado) => {
      if (resultado) await this.cargarMotivos();
    });
  }

  abrirDialogEditar(motivo: Motivo): void {
    const dialogRef = this.dialog.open(MotivoFormDialogComponent, {
      width: '500px',
      data: { motivo: { ...motivo }, esNuevo: false },
    });

    dialogRef.afterClosed().subscribe(async (resultado) => {
      if (resultado) await this.cargarMotivos();
    });
  }

  // ── Cambiar estado (activar/desactivar) ─────────────────
  async cambiarEstado(motivo: Motivo): Promise<void> {
    const accion = motivo.activo ? 'desactivar' : 'activar';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titulo: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} actividad?`,
        mensaje: motivo.activo
          ? `"${motivo.nombre}" dejará de aparecer como opción de actividad para los alumnos.`
          : `"${motivo.nombre}" volverá a estar disponible como opción de actividad.`,
        variante: motivo.activo ? 'warning' : 'info',
        textoConfirmar: motivo.activo ? 'Desactivar' : 'Activar',
        icono: motivo.activo ? 'visibility_off' : 'visibility',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;
    await this.aplicarEstado(motivo, !motivo.activo);
  }

  /** Activa o desactiva sin preguntar (lo usan cambiarEstado y la alternativa de eliminar). */
  private async aplicarEstado(motivo: Motivo, activo: boolean): Promise<void> {
    try {
      this.loadingService.show(activo ? 'Activando actividad...' : 'Desactivando actividad...');

      await this.databaseService.actualizarMotivo(motivo.id!, {
        ...motivo,
        activo,
      });

      this.loadingService.hide();
      this.toastService.success(activo ? `"${motivo.nombre}" vuelve a aparecer como opción` : `"${motivo.nombre}" desactivada: ya no aparece como opción`);
      await this.cargarMotivos();
    } catch (error) {
      console.error('❌ Error al cambiar estado:', error);
      this.loadingService.hide();
      this.toastService.error('Error al cambiar el estado de la actividad');
    }
  }

  // ── Eliminar motivo ─────────────────────────────────────
  async eliminarMotivo(motivo: Motivo): Promise<void> {
    // v3.57.0: se cuenta por id (y por nombre solo en registros viejos sin
    // id). Por nombre, una actividad renombrada decía "0 registros" aunque
    // tuviera cientos de visitas guardadas con el nombre anterior.
    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    const registrosConMotivo = todosRegistros.filter(r => {
      const ids = r.motivoIds?.length ? r.motivoIds : [r.motivoId];
      if (motivo.id && ids.includes(motivo.id)) return true;
      const sinId = !r.motivoId && !r.motivoIds?.length;
      return sinId && (r.motivoNombre === motivo.nombre || !!r.motivoNombres?.includes(motivo.nombre));
    }).length;

    const usada = registrosConMotivo > 0;
    const mensajeUso = usada
      ? `Se ha usado en ${registrosConMotivo} visita${registrosConMotivo === 1 ? '' : 's'}. Esas visitas la conservan y en Estadísticas y reportes aparecerá como "${motivo.nombre} (actividad eliminada)".` +
        (motivo.activo ? ' Si solo quieres que deje de aparecer como opción, mejor desactívala.' : '')
      : 'Esta actividad no tiene visitas asociadas.';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titulo: `¿Eliminar "${motivo.nombre}"?`,
        mensaje: `${mensajeUso} Eliminar no se puede deshacer.`,
        variante: 'danger',
        textoConfirmar: 'Eliminar',
        ...(usada && motivo.activo
          ? { textoAlternativa: 'Desactivar', iconoAlternativa: 'visibility_off' }
          : {}),
      } as ConfirmDialogData,
    });

    const respuesta = await dialogRef.afterClosed().toPromise();
    if (respuesta === 'alternativa') {
      await this.aplicarEstado(motivo, false);
      return;
    }
    if (respuesta !== true) return;

    try {
      this.loadingService.show('Eliminando actividad...');
      await this.databaseService.eliminarMotivo(motivo.id!);
      this.bitacora.registrar('motivo-eliminado', motivo.nombre);
      this.loadingService.hide();
      this.toastService.success('Actividad eliminada');
      await this.cargarMotivos();
    } catch (error) {
      console.error('❌ Error al eliminar motivo:', error);
      this.loadingService.hide();
      this.toastService.error('Error al eliminar la actividad');
    }
  }

  // ── Reordenar ───────────────────────────────────────────
  async subirPrioridad(motivo: Motivo): Promise<void> {
    if (motivo.orden <= 1) {
      this.toastService.info('La actividad ya está en la primera posición');
      return;
    }

    try {
      const motivoAnterior = this.motivos.find(m => m.orden === motivo.orden - 1);
      if (!motivoAnterior) return;

      await this.databaseService.actualizarMotivo(motivo.id!, {
        ...motivo,
        orden: motivo.orden - 1,
      });

      await this.databaseService.actualizarMotivo(motivoAnterior.id!, {
        ...motivoAnterior,
        orden: motivoAnterior.orden + 1,
      });

      this.toastService.success('Orden actualizado');
      await this.cargarMotivos();
    } catch (error) {
      console.error('❌ Error al cambiar orden:', error);
      this.toastService.error('Error al cambiar el orden');
    }
  }

  async bajarPrioridad(motivo: Motivo): Promise<void> {
    if (motivo.orden >= this.motivos.length) {
      this.toastService.info('La actividad ya está en la última posición');
      return;
    }

    try {
      const motivoSiguiente = this.motivos.find(m => m.orden === motivo.orden + 1);
      if (!motivoSiguiente) return;

      await this.databaseService.actualizarMotivo(motivo.id!, {
        ...motivo,
        orden: motivo.orden + 1,
      });

      await this.databaseService.actualizarMotivo(motivoSiguiente.id!, {
        ...motivoSiguiente,
        orden: motivoSiguiente.orden - 1,
      });

      this.toastService.success('Orden actualizado');
      await this.cargarMotivos();
    } catch (error) {
      console.error('❌ Error al cambiar orden:', error);
      this.toastService.error('Error al cambiar el orden');
    }
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}