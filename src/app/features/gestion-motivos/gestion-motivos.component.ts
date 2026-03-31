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

import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-gestion-motivos',
  standalone: true,
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
  styleUrl: './gestion-motivos.component.scss',
})
export class GestionMotivosComponent implements OnInit {
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

  constructor(
    private databaseService: DatabaseService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private dialog: MatDialog,
    private router: Router,
  ) {}

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
      this.toastService.error('Error al cargar los motivos');
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
        titulo: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} motivo?`,
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

    try {
      this.loadingService.show(`${accion === 'activar' ? 'Activando' : 'Desactivando'} motivo...`);

      await this.databaseService.actualizarMotivo(motivo.id!, {
        ...motivo,
        activo: !motivo.activo,
      });

      this.loadingService.hide();
      this.toastService.success(`Motivo ${accion === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
      await this.cargarMotivos();
    } catch (error) {
      console.error('❌ Error al cambiar estado:', error);
      this.loadingService.hide();
      this.toastService.error('Error al cambiar el estado del motivo');
    }
  }

  // ── Eliminar motivo ─────────────────────────────────────
  async eliminarMotivo(motivo: Motivo): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titulo: `¿Eliminar "${motivo.nombre}"?`,
        mensaje: 'Esta acción no se puede deshacer. Los registros existentes mantendrán el nombre del motivo.',
        variante: 'danger',
        textoConfirmar: 'Eliminar',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      this.loadingService.show('Eliminando motivo...');
      await this.databaseService.eliminarMotivo(motivo.id!);
      this.loadingService.hide();
      this.toastService.success('Motivo eliminado exitosamente');
      await this.cargarMotivos();
    } catch (error) {
      console.error('❌ Error al eliminar motivo:', error);
      this.loadingService.hide();
      this.toastService.error('Error al eliminar el motivo');
    }
  }

  // ── Reordenar ───────────────────────────────────────────
  async subirPrioridad(motivo: Motivo): Promise<void> {
    if (motivo.orden <= 1) {
      this.toastService.info('El motivo ya está en la primera posición');
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
      this.toastService.info('El motivo ya está en la última posición');
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