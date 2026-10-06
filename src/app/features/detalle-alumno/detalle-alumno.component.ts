// ╔══════════════════════════════════════════════════════╗
// ║  detalle-alumno.component.ts                         ║
// ║  Stenbrary v3.6.2 — confirm() → ConfirmDialog        ║
// ║                                                      ║
// ║  FIX v3.6.2:                                         ║
// ║  - Lee :matricula de la ruta                          ║
// ║  - confirm() reemplazado por ConfirmDialogComponent   ║
// ║  - Código limpio sin residuos de merge                ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { diasCalendarioEntre, formatearDuracion } from '../../core/utils/tiempo.utils';
import { contarMotivos, resumirEstancia } from '../../core/utils/estadisticas.utils';
import { Motivo } from '../../core/models';
import { logError } from '../../core/utils/logger';

/**
 * Registro extendido con la fecha ya formateada — evita que
 * `formatearFecha(registro.fechaHora)` corra por cada fila en cada CD tick.
 */
type RegistroDetalle = Registro & { _fechaStr: string };

const FMT_DET = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});
const FMT_DET_CORTO = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric',
});

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleAlumnoComponent implements OnInit {
  alumno: Alumno | null = null;
  registros: RegistroDetalle[] = [];
  estadisticas: EstadisticasAlumno | null = null;
  logros: LogrosAlumno | null = null;
  cargando = true;
  error: string | null = null;
  enBibliotecaAhora = false;

  // Strings precomputadas (se actualizan al cargar/recargar). Reemplazan a
  // las funciones que el template llamaba en cada CD tick.
  nombreCompletoStr = '';
  fechaRegistroStr = '';
  ultimaVisitaStr = '';
  diasDesdeUltimaVisitaNum = 0;
  diasDesdeUltimaVisitaStr = '';
  totalHorasStr = '';
  duracionPromedioStr = '';
  tooltipPromedioSemanalStr = '';

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
    private cdr: ChangeDetectorRef,
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
        this.cdr.markForCheck();
        return;
      }

      const [rawRegistros, catalogo] = await Promise.all([
        this.databaseService.obtenerRegistrosPorAlumno(matricula),
        this.databaseService.obtenerTodosLosMotivos(),
      ]);
      this.catalogoMotivos = catalogo;
      this.registros = rawRegistros.map(r =>
        Object.assign(r, { _fechaStr: FMT_DET.format(new Date(r.fechaHora)) })
      ) as RegistroDetalle[];
      this.calcularEstadisticas();
      this.logros = calcularLogros(this.registros);
      this.precomputarDisplay();

      // Verificar si el alumno está actualmente en la biblioteca
      if (this.configService.registroSalidaActivo) {
        const entradaAbierta = await this.databaseService.obtenerEntradaAbiertaHoy(matricula);
        this.enBibliotecaAhora = !!entradaAbierta && !entradaAbierta.cierreAutomatico;
      }

      this.cargando = false;
      this.loadingService.hide();
      this.cdr.markForCheck();
    } catch (error) {
      this.loadingService.hide();
      this.toastService.error('Error al cargar datos del alumno');
      logError('❌ Error al cargar datos del alumno:', error);
      this.error = 'Error al cargar la información del alumno';
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  /** Pre-computa todas las strings de display para evitar funciones en CD. */
  private precomputarDisplay(): void {
    if (this.alumno) {
      this.nombreCompletoStr = `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;
      this.fechaRegistroStr = this.alumno.fechaRegistro
        ? FMT_DET_CORTO.format(new Date(this.alumno.fechaRegistro))
        : '';
    } else {
      this.nombreCompletoStr = '';
      this.fechaRegistroStr = '';
    }

    if (this.estadisticas?.ultimaVisita) {
      this.ultimaVisitaStr = FMT_DET_CORTO.format(new Date(this.estadisticas.ultimaVisita));
      // Días de calendario, igual que la página Inactivos: el mismo alumno
      // no puede llevar 29 días aquí y 30 allá según la hora (P1).
      const dias = Math.max(0, diasCalendarioEntre(new Date(this.estadisticas.ultimaVisita), new Date()));
      this.diasDesdeUltimaVisitaNum = dias;
      this.diasDesdeUltimaVisitaStr = `${dias} ${dias === 1 ? 'día' : 'días'}`;
    } else {
      this.ultimaVisitaStr = '';
      this.diasDesdeUltimaVisitaNum = 0;
      this.diasDesdeUltimaVisitaStr = '';
    }

    if (this.estadisticas) {
      this.totalHorasStr = formatearDuracion(this.estadisticas.totalMinutos);
      this.duracionPromedioStr = formatearDuracion(Math.round(this.estadisticas.duracionPromedio));
      const v = this.estadisticas.totalVisitas;
      const p = this.estadisticas.promedioSemanal;
      this.tooltipPromedioSemanalStr = this.registros.length
        ? `En promedio, el alumno visita la biblioteca ${p} ${p === 1 ? 'vez' : 'veces'} por semana. ` +
          `Cálculo: ${v} visitas totales entre las semanas transcurridas ` +
          `desde su primera visita hasta la última.`
        : '';
    } else {
      this.totalHorasStr = '';
      this.duracionPromedioStr = '';
      this.tooltipPromedioSemanalStr = '';
    }
  }

  // ═══════════════════════════════════════════════
  // ESTADÍSTICAS
  // ═══════════════════════════════════════════════

  /** Catálogo de motivos, para mostrar nombres actuales (un motivo renombrado no se parte). */
  private catalogoMotivos: Motivo[] = [];

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

    // Solo salidas reales (P3): las estimadas por el sistema no cuentan
    // como horas ni entran en el promedio.
    const estancia = resumirEstancia(this.registros);
    const totalMinutos = estancia.totalMinutos;
    const duracionPromedio = estancia.visitasMedidas > 0 ? totalMinutos / estancia.visitasMedidas : 0;

    const totalVisitas = this.registros.length;

    const ultimaVisita = new Date(
      Math.max(...this.registros.map(r => new Date(r.fechaHora).getTime()))
    );

    // P2: cada motivo de una visita suma; agrupado por id con el nombre actual.
    const conteo = contarMotivos(this.registros, this.catalogoMotivos);
    const motivoFrecuente = conteo[0]?.nombre ?? 'N/A';
    const visitasPorMotivo = conteo.map(c => ({ motivo: c.nombre, cantidad: c.cantidad }));

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
      visitasConDuracion: estancia.visitasMedidas,
      duracionPromedio,
    };
  }

  // Formatos legacy: ahora se centralizan en core/utils/tiempo.utils.ts
  // (formatearDuracion). Las strings de display se calculan en
  // precomputarDisplay() y se exponen como propiedades simples.

  async descargarConstancia(): Promise<void> {
    if (!this.alumno) return;

    // La constancia certifica visitas: sin visitas no hay nada que certificar.
    // Se explica en lugar de dejar el botón apagado sin decir nada — un
    // control deshabilitado deja al usuario adivinando si le falta un
    // permiso, si el sistema falló o si tiene que hacer algo antes.
    if (!this.registros.length) {
      this.toastService.info(
        `${this.alumno.nombre} todavía no tiene visitas registradas. ` +
        `La constancia certifica sus visitas a la biblioteca, así que estará ` +
        `disponible en cuanto entre por primera vez.`,
      );
      return;
    }

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
        titulo: `¿Desactivar a ${this.nombreCompletoStr}?`,
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
        titulo: `¿Reactivar a ${this.nombreCompletoStr}?`,
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
        titulo: `¿Eliminar a ${this.nombreCompletoStr}?`,
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
  // Las strings de display (nombreCompletoStr, fechaRegistroStr, …) se
  // calculan una sola vez en precomputarDisplay() después de cargarDatosAlumno().
}