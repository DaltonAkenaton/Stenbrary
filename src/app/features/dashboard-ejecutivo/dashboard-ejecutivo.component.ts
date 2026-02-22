import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { 
  EstadisticasAvanzadasService, 
  TendenciaComparativa, 
  HeatmapData, 
  TopAlumno,
  Insight 
} from '../../core/services/estadisticas-avanzadas.service';

@Component({
  selector: 'app-dashboard-ejecutivo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard-ejecutivo.component.html',
  styleUrl: './dashboard-ejecutivo.component.scss'
})
export class DashboardEjecutivoComponent implements OnInit {
  cargando = true;
  
  // Datos
  tendenciaSemanal?: TendenciaComparativa;
  heatmapData: HeatmapData[] = [];
  topAlumnos: TopAlumno[] = [];
  insights: Insight[] = [];
  diaPredicho = '';
  
  // Heatmap config
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  horasDelDia = Array.from({ length: 15 }, (_, i) => i + 7); // 7am a 9pm

  constructor(
    private estadisticasService: EstadisticasAvanzadasService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    try {
      this.cargando = true;

      // Cargar datos en paralelo
      const [tendencia, heatmap, top, insights, prediccion] = await Promise.all([
        this.estadisticasService.compararTendencias(7, 7),
        this.estadisticasService.generarHeatmap(30),
        this.estadisticasService.obtenerTopAlumnos(5),
        this.estadisticasService.generarInsights(),
        this.estadisticasService.predecirDiaOcupado()
      ]);

      this.tendenciaSemanal = tendencia;
      this.heatmapData = heatmap;
      this.topAlumnos = top;
      this.insights = insights;
      this.diaPredicho = prediccion;

      console.log('✅ Estadísticas avanzadas cargadas');
      this.cargando = false;

    } catch (error) {
      console.error('❌ Error al cargar estadísticas avanzadas:', error);
      this.cargando = false;
    }
  }

  // Helpers para el heatmap

  obtenerCantidadHeatmap(dia: string, hora: number): number {
    const item = this.heatmapData.find(h => h.dia === dia && h.hora === hora);
    return item ? item.cantidad : 0;
  }

  obtenerClaseIntensidad(cantidad: number): string {
    if (cantidad === 0) return 'intensidad-0';
    if (cantidad <= 2) return 'intensidad-1';
    if (cantidad <= 5) return 'intensidad-2';
    if (cantidad <= 10) return 'intensidad-3';
    return 'intensidad-4';
  }

  obtenerMaximoHeatmap(): number {
    if (this.heatmapData.length === 0) return 0;
    return Math.max(...this.heatmapData.map(h => h.cantidad));
  }

  // Helpers para tendencias

  obtenerIconoTendencia(): string {
    if (!this.tendenciaSemanal) return 'trending_flat';
    
    switch (this.tendenciaSemanal.direccion) {
      case 'up':
        return 'trending_up';
      case 'down':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }

  obtenerColorTendencia(): string {
    if (!this.tendenciaSemanal) return 'neutral';
    
    switch (this.tendenciaSemanal.direccion) {
      case 'up':
        return 'success';
      case 'down':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  obtenerTextoTendencia(): string {
    if (!this.tendenciaSemanal) return 'Sin cambios';
    
    const porcentaje = Math.abs(this.tendenciaSemanal.porcentajeCambio).toFixed(1);
    
    if (this.tendenciaSemanal.direccion === 'up') {
      return `↑ ${porcentaje}% más que la semana anterior`;
    } else if (this.tendenciaSemanal.direccion === 'down') {
      return `↓ ${porcentaje}% menos que la semana anterior`;
    }
    
    return 'Sin cambios significativos';
  }

  // Helpers para UI

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short'
    });
  }

  obtenerNombreCompleto(alumno: TopAlumno): string {
    return `${alumno.alumno.nombre} ${alumno.alumno.apellidoPaterno} ${alumno.alumno.apellidoMaterno}`;
  }

  verDetalleAlumno(alumno: TopAlumno): void {
    this.router.navigate(['/detalle-alumno', alumno.alumno.matricula]);
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}