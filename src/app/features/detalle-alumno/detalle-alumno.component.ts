import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { EditarAlumnoDialogComponent } from './editar-alumno-dialog/editar-alumno-dialog.component';

interface EstadisticasAlumno {
  totalVisitas: number;
  ultimaVisita: Date | null;
  motivoFrecuente: string;
  promedioSemanal: number;
  visitasPorMotivo: { motivo: string; cantidad: number }[];
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
    MatTooltipModule
  ],
  templateUrl: './detalle-alumno.component.html',
  styleUrl: './detalle-alumno.component.scss'
})
export class DetalleAlumnoComponent implements OnInit, OnDestroy {
  alumno: Alumno | null = null;
  registros: Registro[] = [];
  estadisticas: EstadisticasAlumno | null = null;
  cargando = true;
  error: string | null = null;

  // Columnas de la tabla de registros
  columnasRegistros: string[] = ['fechaHora', 'motivo', 'acciones'];

  constructor(
  private route: ActivatedRoute,
  private router: Router,
  private databaseService: DatabaseService,
  public dialog: MatDialog,
  private toastService: ToastService,      // ← AGREGAR
  private loadingService: LoadingService   // ← AGREGAR
) {}

  async ngOnInit(): Promise<void> {
    // Obtener matrícula de la URL
    const matricula = this.route.snapshot.paramMap.get('matricula');
    
    if (!matricula) {
      this.error = 'No se especificó una matrícula';
      this.cargando = false;
      return;
    }

    await this.cargarDatosAlumno(matricula);
  }

  async cargarDatosAlumno(matricula: string): Promise<void> {
    try {
      this.cargando = true;
          this.loadingService.show('Cargando datos del alumno...');  // ← AGREGAR
      this.error = null;

      // Cargar alumno
      this.alumno = await this.databaseService.obtenerAlumnoPorMatricula(matricula);

      if (!this.alumno) {
        this.error = 'Alumno no encontrado';
        this.cargando = false;
        return;
      }

      // Cargar registros del alumno
      this.registros = await this.databaseService.obtenerRegistrosPorAlumno(matricula);

      // Calcular estadísticas
      this.calcularEstadisticas();

      console.log('✅ Datos del alumno cargados:', this.alumno);
      console.log('📊 Registros encontrados:', this.registros.length);

      this.cargando = false;
          this.loadingService.hide();  // ← AGREGAR AL FINAL DEL TRY
    } catch (error) {

    this.loadingService.hide();  // ← AGREGAR AL INICIO
    this.toastService.error('Error al cargar datos del alumno');  // ← AGREGAR


      console.error('❌ Error al cargar datos del alumno:', error);
      this.error = 'Error al cargar la información del alumno';
      this.cargando = false;
    }
  }










  calcularEstadisticas(): void {
    if (!this.registros.length) {
      this.estadisticas = {
        totalVisitas: 0,
        ultimaVisita: null,
        motivoFrecuente: 'N/A',
        promedioSemanal: 0,
        visitasPorMotivo: []
      };
      return;
    }

    // Total de visitas
    const totalVisitas = this.registros.length;

    // Última visita
    const ultimaVisita = new Date(
      Math.max(...this.registros.map(r => new Date(r.fechaHora).getTime()))
    );

    // Contar visitas por motivo
    const motivosCount = new Map<string, number>();
    this.registros.forEach(registro => {
      if (registro.motivoNombre) {
        const count = motivosCount.get(registro.motivoNombre) || 0;
        motivosCount.set(registro.motivoNombre, count + 1);
      }
    });

    // Motivo más frecuente
    let motivoFrecuente = 'N/A';
    let maxCount = 0;
    motivosCount.forEach((count, motivo) => {
      if (count > maxCount) {
        maxCount = count;
        motivoFrecuente = motivo;
      }
    });

    // Visitas por motivo (array ordenado)
    const visitasPorMotivo = Array.from(motivosCount.entries())
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Promedio semanal
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
      visitasPorMotivo
    };
  }

  obtenerNombreCompleto(): string {
    if (!this.alumno) return '';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;
  }

  formatearFecha(fecha: Date): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearFechaCorta(fecha: Date): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  abrirDialogEditar(): void {
    if (!this.alumno) return;

    const dialogRef = this.dialog.open(EditarAlumnoDialogComponent, {
      width: '600px',
      data: { alumno: this.alumno }
    });

    dialogRef.afterClosed().subscribe(async (resultado) => {
      if (resultado) {
        // Recargar datos del alumno
        await this.cargarDatosAlumno(this.alumno!.matricula);
      }
    });
  }






 // ==============================================================================
// MÉTODO: desactivarAlumno
// REEMPLAZAR COMPLETO
// ==============================================================================

async desactivarAlumno(): Promise<void> {
  if (!this.alumno) return;
  
  const confirmar = confirm(
    `¿Estás seguro de desactivar al alumno ${this.obtenerNombreCompleto()}?\n\n` +
    'El alumno no podrá registrar nuevos accesos, pero su historial se mantendrá.'
  );
  
  if (!confirmar) return;
  
  try {
    this.loadingService.show('Desactivando alumno...');
    
    await this.databaseService.actualizarAlumno(this.alumno.id!, {
      ...this.alumno,
      activo: false
    });
    
    console.log('✅ Alumno desactivado correctamente');
    
    this.loadingService.hide();
    this.toastService.success('Alumno desactivado exitosamente');
    
    // Volver al dashboard
    this.router.navigate(['/dashboard']);
    
  } catch (error) {
    console.error('❌ Error al desactivar alumno:', error);
    this.loadingService.hide();
    this.toastService.error('Error al desactivar el alumno. Intenta de nuevo.');
  }
}

// ==============================================================================
// MÉTODO: reactivarAlumno
// REEMPLAZAR COMPLETO
// ==============================================================================

async reactivarAlumno(): Promise<void> {
  if (!this.alumno) return;
  
  const confirmar = confirm(
    `¿Reactivar al alumno ${this.obtenerNombreCompleto()}?`
  );
  
  if (!confirmar) return;
  
  try {
    this.loadingService.show('Reactivando alumno...');
    
    await this.databaseService.actualizarAlumno(this.alumno.id!, {
      ...this.alumno,
      activo: true
    });
    
    console.log('✅ Alumno reactivado correctamente');
    
    this.loadingService.hide();
    this.toastService.success('Alumno reactivado exitosamente');
    
    // Recargar datos
    await this.cargarDatosAlumno(this.alumno.matricula);
    
  } catch (error) {
    console.error('❌ Error al reactivar alumno:', error);
    this.loadingService.hide();
    this.toastService.error('Error al reactivar el alumno. Intenta de nuevo.');
  }
}











verRegistroDetalle(registro: Registro): void {
  // Mostrar información detallada del registro
  console.log('Ver detalle del registro:', registro);
  this.toastService.info(
    `Registro: ${this.formatearFecha(registro.fechaHora)} - ${registro.motivoNombre}`
  );
}

  volver(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    // Limpiar recursos si es necesario
  }





}