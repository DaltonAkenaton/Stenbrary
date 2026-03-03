// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/dashboard-ejecutivo/         ║
// ║        dashboard-ejecutivo.component.ts              ║
// ║  Stenbrary v3.5 — Con gráficas Chart.js              ║
// ║                                                      ║
// ║  NUEVO v3.5:                                         ║
// ║  - Gráfica de barras: registros por día (7 días)    ║
// ║  - Gráfica de dona: distribución por motivos        ║
// ║  - Gráfica de barras horiz: visitas por carrera     ║
// ║  Chart.js se inicializa en AfterViewInit             ║
// ╚══════════════════════════════════════════════════════╝

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import {
  EstadisticasAvanzadasService,
  TendenciaComparativa,
  HeatmapData,
  TopAlumno,
  Insight,
  DatosDiarios,
  DistribucionMotivos,
  DatosCarrera,
} from '../../core/services/estadisticas-avanzadas.service';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-ejecutivo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './dashboard-ejecutivo.component.html',
  styleUrl: './dashboard-ejecutivo.component.scss',
})
export class DashboardEjecutivoComponent implements OnInit, AfterViewInit, OnDestroy {
  cargando = true;

  // Canvas refs
  @ViewChild('chartDiario') chartDiarioRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartMotivos') chartMotivosRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCarreras') chartCarrerasRef!: ElementRef<HTMLCanvasElement>;

  // Chart instances (para destruir)
  private chartDiario: Chart | null = null;
  private chartMotivos: Chart | null = null;
  private chartCarreras: Chart | null = null;

  // Datos existentes
  tendenciaSemanal?: TendenciaComparativa;
  heatmapData: HeatmapData[] = [];
  topAlumnos: TopAlumno[] = [];
  insights: Insight[] = [];
  diaPredicho = '';

  // Datos nuevos para gráficas
  datosDiarios?: DatosDiarios;
  distribucionMotivos?: DistribucionMotivos;
  datosCarreras: DatosCarrera[] = [];

  // Heatmap config
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  horasDelDia = Array.from({ length: 15 }, (_, i) => i + 7);

  // Flag para saber si los datos cargaron antes que la vista
  private datosListos = false;

  constructor(
    private estadisticasService: EstadisticasAvanzadasService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  ngAfterViewInit(): void {
    // Si los datos ya cargaron, renderizar gráficas
    if (this.datosListos) {
      setTimeout(() => this.renderizarGraficas(), 0);
    }
  }

  ngOnDestroy(): void {
    this.chartDiario?.destroy();
    this.chartMotivos?.destroy();
    this.chartCarreras?.destroy();
  }

  async cargarDatos(): Promise<void> {
    try {
      this.cargando = true;

      const [tendencia, heatmap, top, insights, prediccion, diarios, motivos, carreras] =
        await Promise.all([
          this.estadisticasService.compararTendencias(7, 7),
          this.estadisticasService.generarHeatmap(30),
          this.estadisticasService.obtenerTopAlumnos(5),
          this.estadisticasService.generarInsights(),
          this.estadisticasService.predecirDiaOcupado(),
          this.estadisticasService.obtenerRegistrosPorDia(7),
          this.estadisticasService.obtenerDistribucionMotivos(30),
          this.estadisticasService.analizarPorCarrera(),
        ]);

      this.tendenciaSemanal = tendencia;
      this.heatmapData = heatmap;
      this.topAlumnos = top;
      this.insights = insights;
      this.diaPredicho = prediccion;
      this.datosDiarios = diarios;
      this.distribucionMotivos = motivos;
      this.datosCarreras = carreras;

      this.cargando = false;
      this.datosListos = true;

      // Renderizar gráficas (puede que AfterViewInit ya haya corrido)
      setTimeout(() => this.renderizarGraficas(), 50);

      console.log('✅ Estadísticas avanzadas + gráficas cargadas');
    } catch (error) {
      console.error('❌ Error al cargar estadísticas avanzadas:', error);
      this.cargando = false;
    }
  }

  // ═══════════════════════════════════════════════
  // GRÁFICAS CHART.JS
  // ═══════════════════════════════════════════════

  private renderizarGraficas(): void {
    this.renderizarGraficaDiaria();
    this.renderizarGraficaMotivos();
    this.renderizarGraficaCarreras();
  }

  private renderizarGraficaDiaria(): void {
    if (!this.chartDiarioRef || !this.datosDiarios) return;

    this.chartDiario?.destroy();

    const ctx = this.chartDiarioRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartDiario = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosDiarios.etiquetas,
        datasets: [
          {
            label: 'Registros',
            data: this.datosDiarios.cantidades,
            backgroundColor: 'rgba(0, 200, 215, 0.6)',
            borderColor: '#00C8D7',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#142033',
            titleColor: '#E8F4F8',
            bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => items[0]?.label || '',
              label: (item) => `${item.raw} registros`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: {
              color: 'rgba(200, 230, 240, 0.5)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: {
              color: 'rgba(200, 230, 240, 0.4)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  private renderizarGraficaMotivos(): void {
    if (!this.chartMotivosRef || !this.distribucionMotivos) return;
    if (this.distribucionMotivos.cantidades.length === 0) return;

    this.chartMotivos?.destroy();

    const ctx = this.chartMotivosRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartMotivos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.distribucionMotivos.etiquetas,
        datasets: [
          {
            data: this.distribucionMotivos.cantidades,
            backgroundColor: this.distribucionMotivos.colores.map(c => c + 'CC'),
            borderColor: this.distribucionMotivos.colores,
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'rgba(200, 230, 240, 0.7)',
              font: { family: "'DM Sans', sans-serif", size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: '#142033',
            titleColor: '#E8F4F8',
            bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: (item) => {
                const total = (item.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const porcentaje = ((item.raw as number) / total * 100).toFixed(1);
                return ` ${item.label}: ${item.raw} (${porcentaje}%)`;
              },
            },
          },
        },
      },
    });
  }

  private renderizarGraficaCarreras(): void {
    if (!this.chartCarrerasRef || this.datosCarreras.length === 0) return;

    this.chartCarreras?.destroy();

    const ctx = this.chartCarrerasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Abreviar nombres largos
    const etiquetas = this.datosCarreras.map(d => this.abreviarCarrera(d.carrera));
    const cantidades = this.datosCarreras.map(d => d.totalVisitas);

    const colores = [
      '#00C8D7', '#0BC4B7', '#0EB07B', '#3B82F6',
      '#6366F1', '#8B5CF6', '#EC4899', '#F5A623',
    ];

    this.chartCarreras = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Visitas totales',
            data: cantidades,
            backgroundColor: cantidades.map((_, i) => (colores[i % colores.length]) + '99'),
            borderColor: cantidades.map((_, i) => colores[i % colores.length]),
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y', // Barras horizontales
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#142033',
            titleColor: '#E8F4F8',
            bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => {
                const index = items[0]?.dataIndex ?? 0;
                return this.datosCarreras[index]?.carrera || '';
              },
              label: (item) => {
                const index = item.dataIndex;
                const datos = this.datosCarreras[index];
                return [
                  `${item.raw} visitas totales`,
                  `${datos?.alumnosActivos || 0} alumnos`,
                  `${datos?.promedioVisitasPorAlumno || 0} promedio/alumno`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: {
              color: 'rgba(200, 230, 240, 0.4)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
              stepSize: 1,
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: 'rgba(200, 230, 240, 0.6)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
            },
          },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════
  // HELPERS EXISTENTES
  // ═══════════════════════════════════════════════

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

  obtenerIconoTendencia(): string {
    if (!this.tendenciaSemanal) return 'trending_flat';
    switch (this.tendenciaSemanal.direccion) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  obtenerColorTendencia(): string {
    if (!this.tendenciaSemanal) return 'neutral';
    switch (this.tendenciaSemanal.direccion) {
      case 'up': return 'success';
      case 'down': return 'warning';
      default: return 'neutral';
    }
  }

  obtenerTextoTendencia(): string {
    if (!this.tendenciaSemanal) return 'Sin cambios';
    const p = Math.abs(this.tendenciaSemanal.porcentajeCambio).toFixed(1);
    if (this.tendenciaSemanal.direccion === 'up') return `↑ ${p}% más que la semana anterior`;
    if (this.tendenciaSemanal.direccion === 'down') return `↓ ${p}% menos que la semana anterior`;
    return 'Sin cambios significativos';
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
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

  /** Altura dinámica: más carreras = más alto */
  get alturaGraficaCarreras(): number {
    return Math.max(200, this.datosCarreras.length * 48);
  }

  /**
   * Abreviar nombres de carrera largos para las etiquetas del eje Y.
   * Ej: "Ingeniería en Tecnologías de la Información" → "Ing. TI"
   */
  private abreviarCarrera(carrera: string): string {
    if (carrera.length <= 20) return carrera;

    const abreviaturas: Record<string, string> = {
      'Contador Público': 'C. Público',
      'Licenciatura en Administración': 'Lic. Admin.',
      'Ingeniería en Autotransporte de Carga': 'Ing. Autotrans.',
      'Licenciatura en Comercio Exterior': 'Lic. Com. Ext.',
      'Licenciatura en Derecho': 'Lic. Derecho',
      'Licenciatura en Enfermería': 'Lic. Enfermería',
      'Licenciatura en Psicología': 'Lic. Psicología',
      'Ingeniería en Tecnologías de la Información': 'Ing. TI',
    };

    return abreviaturas[carrera] || carrera.substring(0, 18) + '…';
  }
}