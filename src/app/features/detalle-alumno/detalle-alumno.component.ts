// ╔══════════════════════════════════════════════════════╗
// ║  detalle-alumno.component.ts                         ║
// ║  Stenbrary v3.6.2 — confirm() → ConfirmDialog        ║
// ║                                                      ║
// ║  FIX v3.6.2:                                         ║
// ║  - Lee :matricula de la ruta                          ║
// ║  - confirm() reemplazado por ConfirmDialogComponent   ║
// ║  - Código limpio sin residuos de merge                ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigService } from '../../core/services/config.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Registro } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { ReportService } from '../../core/services/report.service';
import { EditarAlumnoDialogComponent } from './editar-alumno-dialog/editar-alumno-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RegistroDetalleDialogComponent } from './registro-detalle-dialog/registro-detalle-dialog.component';
import { RegistroEditarDialogComponent, RegistroEditarResultado } from './registro-editar-dialog/registro-editar-dialog.component';
import { calcularLogros, LogrosAlumno } from '../../core/utils/insignias.utils';

interface EstadisticasAlumno {
  totalVisitas: number;
  ultimaVisita: Date | null;
  motivoFrecuente: string;
  promedioSemanal: number;
  visitasPorMotivo: { motivo: string; cantidad: number }[];
  totalMinutos: number;
  visitasConDuracion: number;
  duracionPromedio: number;
}

@Component({
  selector: 'app-detalle-alumno',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './detalle-alumno.component.html',
  styleUrl: './detalle-alumno.component.scss',
})
export class DetalleAlumnoComponent implements OnInit, OnDestroy {
  alumno: Alumno | null = null;
  registros: Registro[] = [];
  estadisticas: EstadisticasAlumno | null = null;
  logros: LogrosAlumno | null = null;
  cargando = true;
  error: string | null = null;
  enBibliotecaAhora = false;

  columnasRegistros: string[] = ['fechaHora', 'motivo', 'acciones'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService,
    public dialog: MatDialog,
    private toastService: ToastService,
    private loadingService: LoadingService,
    public configService: ConfigService,
    private reportService: ReportService,
  ) {}

  // ═══════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════

  async ngOnInit(): Promise<void> {
    const matricula = this.route.snapshot.paramMap.get('matricula');

    if (!matricula) {
      this.error = 'No se especificó un alumno';
      this.cargando = false;
      return;
    }

    await this.cargarDatosAlumno(matricula);
  }

  ngOnDestroy(): void {}

  // ═══════════════════════════════════════════════
  // CARGA DE DATOS
  // ═══════════════════════════════════════════════

  async cargarDatosAlumno(matricula: string): Promise<void> {
    try {
      this.cargando = true;
      this.loadingService.show('Cargando datos del alumno...');
      this.error = null;

      this.alumno = await this.databaseService.obtenerAlumnoPorMatricula(matricula);

      if (!this.alumno) {
        this.error = 'Alumno no encontrado';
        this.cargando = false;
        this.loadingService.hide();
        return;
      }

      this.registros = await this.databaseService.obtenerRegistrosPorAlumno(matricula);
      this.calcularEstadisticas();
      this.logros = calcularLogros(this.registros);

      // Verificar si el alumno está actualmente en la biblioteca
      if (this.configService.registroSalidaActivo) {
        const entradaAbierta = await this.databaseService.obtenerEntradaAbiertaHoy(matricula);
        this.enBibliotecaAhora = !!entradaAbierta && !entradaAbierta.cierreAutomatico;
      }

      this.cargando = false;
      this.loadingService.hide();
    } catch (error) {
      this.loadingService.hide();
      this.toastService.error('Error al cargar datos del alumno');
      console.error('❌ Error al cargar datos del alumno:', error);
      this.error = 'Error al cargar la información del alumno';
      this.cargando = false;
    }
  }

  // ═══════════════════════════════════════════════
  // ESTADÍSTICAS
  // ═══════════════════════════════════════════════

  calcularEstadisticas(): void {
    if (!this.registros.length) {
      this.estadisticas = {
        totalVisitas: 0,
        ultimaVisita: null,
        motivoFrecuente: 'N/A',
        promedioSemanal: 0,
        visitasPorMotivo: [],
        totalMinutos: 0,
        visitasConDuracion: 0,
        duracionPromedio: 0,
      };
      return;
    }

    const conDuracion = this.registros.filter(
      r => typeof r.duracionMinutos === 'number' && r.duracionMinutos > 0
    );
    const totalMinutos = conDuracion.reduce((a, r) => a + (r.duracionMinutos || 0), 0);
    const duracionPromedio = conDuracion.length > 0 ? totalMinutos / conDuracion.length : 0;

    const totalVisitas = this.registros.length;

    const ultimaVisita = new Date(
      Math.max(...this.registros.map(r => new Date(r.fechaHora).getTime()))
    );

    const motivosCount = new Map<string, number>();
    this.registros.forEach(registro => {
      if (registro.motivoNombre) {
        const count = motivosCount.get(registro.motivoNombre) || 0;
        motivosCount.set(registro.motivoNombre, count + 1);
      }
    });

    let motivoFrecuente = 'N/A';
    let maxCount = 0;
    motivosCount.forEach((count, motivo) => {
      if (count > maxCount) {
        maxCount = count;
        motivoFrecuente = motivo;
      }
    });

    const visitasPorMotivo = Array.from(motivosCount.entries())
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const primeraVisita = new Date(
      Math.min(...this.registros.map(r => new Date(r.fechaHora).getTime()))
    );
    const diasTranscurridos = Math.max(
      1,
      Math.floor((ultimaVisita.getTime() - primeraVisita.getTime()) / (1000 * 60 * 60 * 24))
    );
    const semanasTranscurridas = Math.max(1, diasTranscurridos / 7);
    const promedioSemanal = parseFloat((totalVisitas / semanasTranscurridas).toFixed(1));

    this.estadisticas = {
      totalVisitas,
      ultimaVisita,
      motivoFrecuente,
      promedioSemanal,
      visitasPorMotivo,
      totalMinutos,
      visitasConDuracion: conDuracion.length,
      duracionPromedio,
    };
  }

  formatearHoras(minutos: number): string {
    if (!minutos || minutos < 1) return '0m';
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  diasDesdeUltimaVisita(): number {
    if (!this.estadisticas?.ultimaVisita) return 0;
    const ms = Date.now() - new Date(this.estadisticas.ultimaVisita).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  tooltipPromedioSemanal(): string {
    if (!this.estadisticas || !this.registros.length) return '';
    const v = this.estadisticas.totalVisitas;
    const p = this.estadisticas.promedioSemanal;
    return (
      `En promedio, el alumno visita la biblioteca ${p} ${p === 1 ? 'vez' : 'veces'} por semana. ` +
      `Cálculo: ${v} visitas totales entre las semanas transcurridas ` +
      `desde su primera visita hasta la última.`
    );
  }

  async descargarConstancia(): Promise<void> {
    if (!this.alumno) return;
    try {
      this.loadingService.show('Generando constancia...');
      await this.reportService.generarConstanciaAlumno(this.alumno, this.registros, {
        nombreInstitucion: this.configService.nombreInstitucion,
        folio: `${this.alumno.matricula}-${Date.now().toString(36).toUpperCase()}`,
      });
      this.loadingService.hide();
      this.toastService.success('Constancia generada');
    } catch (error) {
      this.loadingService.hide();
      console.error('❌ Error al generar constancia:', error);
      this.toastService.error('No se pudo generar la constancia');
    }
  }

  // ═══════════════════════════════════════════════
  // ACCIONES
  // ═══════════════════════════════════════════════

  abrirDialogEditar(): void {
    if (!this.alumno) return;

    const dialogRef = this.dialog.open(EditarAlumnoDialogComponent, {
      width: '600px',
      data: { alumno: this.alumno },
    });

    dialogRef.afterClosed().subscribe(async (resultado) => {
      if (resultado && this.alumno) {
        await this.cargarDatosAlumno(this.alumno.matricula);
      }
    });
  }

  async desactivarAlumno(): Promise<void> {
    if (!this.alumno) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titulo: `¿Desactivar a ${this.obtenerNombreCompleto()}?`,
        mensaje: 'El alumno no podrá registrar nuevos accesos, pero su historial se mantendrá intacto.',
        variante: 'warning',
        textoConfirmar: 'Desactivar',
        icono: 'person_off',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      this.loadingService.show('Desactivando alumno...');

      await this.databaseService.actualizarAlumno(this.alumno.id!, {
        ...this.alumno,
        activo: false,
      });

      this.loadingService.hide();
      this.toastService.success('Alumno desactivado exitosamente');
      this.router.navigate(['/alumnos']);
    } catch (error) {
      console.error('❌ Error al desactivar alumno:', error);
      this.loadingService.hide();
      this.toastService.error('Error al desactivar el alumno. Intenta de nuevo.');
    }
  }

  async reactivarAlumno(): Promise<void> {
    if (!this.alumno) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titulo: `¿Reactivar a ${this.obtenerNombreCompleto()}?`,
        mensaje: 'El alumno podrá registrar accesos nuevamente.',
        variante: 'info',
        textoConfirmar: 'Reactivar',
        icono: 'person',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      this.loadingService.show('Reactivando alumno...');

      await this.databaseService.actualizarAlumno(this.alumno.id!, {
        ...this.alumno,
        activo: true,
      });

      this.loadingService.hide();
      this.toastService.success('Alumno reactivado exitosamente');
      await this.cargarDatosAlumno(this.alumno.matricula);
    } catch (error) {
      console.error('❌ Error al reactivar alumno:', error);
      this.loadingService.hide();
      this.toastService.error('Error al reactivar el alumno. Intenta de nuevo.');
    }
  }

  async eliminarAlumno(): Promise<void> {
    if (!this.alumno) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titulo: `¿Eliminar a ${this.obtenerNombreCompleto()}?`,
        mensaje: 'Esta acción es permanente e irreversible. Se eliminarán el perfil del alumno y todos sus registros de acceso.',
        variante: 'danger',
        textoConfirmar: 'Eliminar permanentemente',
        icono: 'delete_forever',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      this.loadingService.show('Eliminando alumno...');
      await this.databaseService.eliminarAlumno(this.alumno.id!);
      this.loadingService.hide();
      this.toastService.success('Alumno eliminado permanentemente');
      this.router.navigate(['/alumnos']);
    } catch (error) {
      console.error('❌ Error al eliminar alumno:', error);
      this.loadingService.hide();
      this.toastService.error('Error al eliminar el alumno. Intenta de nuevo.');
    }
  }

  verRegistroDetalle(registro: Registro): void {
    this.dialog.open(RegistroDetalleDialogComponent, {
      width: '480px',
      data: { registro },
    });
  }

  async editarRegistro(registro: Registro, ev?: Event): Promise<void> {
    ev?.stopPropagation();
    const ref = this.dialog.open(RegistroEditarDialogComponent, {
      width: '520px',
      data: { registro },
    });
    const resultado = await ref.afterClosed().toPromise() as RegistroEditarResultado | undefined;
    if (!resultado) return;

    try {
      this.loadingService.show('Guardando cambios...');
      await this.databaseService.actualizarRegistroManual(registro.id, resultado);
      this.loadingService.hide();
      this.toastService.success('Registro actualizado');
      if (this.alumno) await this.cargarDatosAlumno(this.alumno.matricula);
    } catch {
      this.loadingService.hide();
      this.toastService.error('No se pudo actualizar el registro');
    }
  }

  // ═══════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════

  volver(): void {
    this.router.navigate(['/alumnos']);
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  obtenerNombreCompleto(): string {
    if (!this.alumno) return '';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatearFechaCorta(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}