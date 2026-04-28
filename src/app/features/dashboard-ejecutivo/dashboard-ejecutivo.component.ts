// ╔══════════════════════════════════════════════════════╗
// ║  dashboard-ejecutivo.component.ts                    ║
// ║  Stenbrary v3.14 — Claridad ejecutiva                ║
// ║                                                      ║
// ║  CAMBIOS v3.14:                                      ║
// ║  - Línea fija con rango activo + comparativo         ║
// ║  - KPIs fijos siempre visibles (4 tarjetas)          ║
// ║  - Tooltips explicativos (?) en cada métrica         ║
// ║  - Chip "Todo el historial" en selector de período   ║
// ║  - Filtro por hora (rango HH:00 a HH:00)             ║
// ║  - Comparador A vs B (dos rangos arbitrarios)        ║
// ║  - Predicción del heatmap aclara su rango fuente     ║
// ║  - "Exportar lo que veo" basado en rango activo      ║
// ║  - Umbral de inactividad usa el configurado          ║
// ╚══════════════════════════════════════════════════════╝

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ExportarPdfDialogComponent,
  ExportarPdfDialogData,
  ExportarPdfDialogResult,
} from './exportar-pdf-dialog/exportar-pdf-dialog.component';
import { SeccionesReporte } from '../../core/services/report.service';
import { Chart, registerables } from 'chart.js';
import {
  EstadisticasAvanzadasService,
  TendenciaComparativa,
  HeatmapData,
  HeatmapResultado,
  TopAlumno,
  Insight,
  DatosDiarios,
  DistribucionMotivos,
  DatosCarrera,
  RangoFechas,
  ComparativaDosRangos,
} from '../../core/services/estadisticas-avanzadas.service';
import { ExportService } from '../../core/services/export.service';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfigService } from '../../core/services/config.service';

Chart.register(...registerables);

type PresetRango = 'hoy' | 'ayer' | 'semana' | 'semana-pasada' | 'mes-actual' | 'mes-pasado' | 'ultimos7' | 'ultimos14' | 'ultimos30' | 'ultimos90' | 'anio' | 'anio-pasado' | 'semestre-actual' | 'semestre-pasado' | 'todo' | 'personalizado';

interface OpcionPreset {
  key: PresetRango;
  label: string;
}

@Component({
  selector: 'app-dashboard-ejecutivo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatDialogModule,
  ],
  templateUrl: './dashboard-ejecutivo.component.html',
  styleUrl: './dashboard-ejecutivo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardEjecutivoComponent implements OnInit, AfterViewInit, OnDestroy {
  cargando = true;

  // Canvas refs
  @ViewChild('chartDiario') chartDiarioRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartMotivos') chartMotivosRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCarreras') chartCarrerasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCompararA') chartCompararARef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCompararB') chartCompararBRef?: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private chartDiario: Chart | null = null;
  private chartMotivos: Chart | null = null;
  private chartCarreras: Chart | null = null;
  private chartCompararA: Chart | null = null;
  private chartCompararB: Chart | null = null;

  // Datos
  tendencia?: TendenciaComparativa;
  heatmapData: HeatmapData[] = [];
  heatmapHoras: number[] = [];
  heatmapRango: RangoFechas | null = null;
  heatmapFechasPorDia: Map<string, Date[]> = new Map();
  /** Pre-computado: matriz [día][hora] → cantidad. Evita .find() en cada render. */
  heatmapMatriz: Record<string, Record<number, number>> = {};
  /** Pre-computado: matriz [día][hora] → clase de intensidad. */
  heatmapClases: Record<string, Record<number, string>> = {};
  /** Pre-computado: máximo del heatmap (no Math.max() en cada llamada). */
  heatmapMaximo = 0;
  /** Día y hora del pico (para marcar con estrella). */
  heatmapPicoDia: string | null = null;
  heatmapPicoHora: number | null = null;
  /** Día/hora valle (mínimo dentro de horas con datos). */
  heatmapValleDia: string | null = null;
  heatmapValleHora: number | null = null;

  topAlumnos: TopAlumno[] = [];
  insights: Insight[] = [];
  diaPredicho = '';
  datosDiarios?: DatosDiarios;
  /** Para gráfica diaria: índices de etiquetas que son domingo (resaltar). */
  diariosDomingoIdx: number[] = [];
  distribucionMotivos?: DistribucionMotivos;
  datosCarreras: DatosCarrera[] = [];

  // ─── Sparklines (cache de últimos N puntos por KPI) ──
  sparkRegistros: number[] = [];
  sparkAlumnosUnicos: number[] = [];
  sparkPromedio: number[] = [];

  // ─── Métricas nuevas (Tier B) ────────────────────
  kpiTiempoEstanciaPromedio = 0; // minutos
  kpiTasaRetencion = 0; // % alumnos con ≥N visitas (N = umbralRetencion)
  kpiUmbralRetencion = 3;
  kpiCrecimiento12m: { mes: string; cantidad: number }[] = [];
  kpiDistribucionTurnos: { turno: string; cantidad: number; porcentaje: number; color: string }[] = [];
  kpiTopMotivo: { nombre: string; cantidad: number; porcentaje: number } | null = null;
  kpiAlumnosUnaSolaVisita = 0;

  // ─── v3.17.0: nuevas métricas Tier B ─────────────
  kpiUltimoRegistroHace = ''; // "hace 23 minutos"
  kpiPctInvitados = 0;
  kpiCarreraTopCrecimiento: { carrera: string; cambio: number; porcentaje: number } | null = null;
  kpiPrediccionHoy = 0; // proyección al cierre
  kpiPrediccionHoyConfianza: 'alta' | 'media' | 'baja' = 'baja';
  kpiDiaSemanaTop = '';
  kpiDistribucionGrado: { grado: number; cantidad: number; porcentaje: number }[] = [];
  kpiCombinacionesMotivos: { combo: string; cantidad: number; porcentaje: number }[] = [];
  kpiVariacionDiaria = 0; // coeficiente de variación %

  // ─── KPIs fijos derivados ─────────────────────────
  kpiTotalRegistros = 0;
  kpiAlumnosUnicos = 0;
  kpiPromedioPorDia = 0;
  kpiHoraPico: HeatmapData | null = null;
  kpiAlumnosInactivos = 0;
  kpiUmbralInactividad = 30;

  // ─── Selector de período (PRESETS) ────────────────
  presetSeleccionado: PresetRango = 'ultimos30';
  fechaInicio = '';
  fechaFin = '';
  rangoActivo: RangoFechas | null = null;

  opcionesPreset: OpcionPreset[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes-actual', label: 'Este mes' },
    { key: 'ultimos7', label: '7 días' },
    { key: 'ultimos30', label: '30 días' },
    { key: 'ultimos90', label: '90 días' },
    { key: 'anio', label: 'Este año' },
    { key: 'todo', label: 'Todo el historial' },
    { key: 'personalizado', label: 'Personalizado' },
  ];

  // ─── Filtro por hora ──────────────────────────────
  filtroHoraActivo = false;
  filtroHoraDesde = 7;
  filtroHoraHasta = 21;
  horasDisponibles: number[] = Array.from({ length: 24 }, (_, i) => i);

  // ─── Heatmap config (sub-filtro independiente) ────
  heatmapPeriodo = 30;
  opcionesHeatmap = [
    { dias: 7,   label: 'Esta semana' },
    { dias: 14,  label: '2 semanas' },
    { dias: 30,  label: 'Este mes' },
    { dias: 90,  label: '3 meses' },
    { dias: 180, label: '6 meses' },
    { dias: 365, label: 'Este año' },
  ];

  // ─── Top alumnos config (sub-filtro independiente) ─
  topPeriodo = 30;
  opcionesTopPeriodo = [
    { dias: 7,   label: '7 días' },
    { dias: 30,  label: '30 días' },
    { dias: 90,  label: '90 días' },
    { dias: 365, label: 'Este año' },
    { dias: 0,   label: 'Todo' },
  ];

  // ─── Reporte por período (movido al fondo) ────────
  tipoReporte: 'diario' | 'semanal' | 'mensual' | 'anual' = 'mensual';
  mesesDisponibles: { valor: string; label: string }[] = [];
  aniosDisponibles: { valor: string; label: string }[] = [];
  mesReporteSeleccionado = '';
  anioReporteSeleccionado = '';
  fechaReporteDiario = '';
  fechaReporteSemana = '';
  generandoReporte = false;

  // ─── Comparador A vs B ────────────────────────────
  compararAbierto = false;
  presetA: PresetRango = 'mes-actual';
  presetB: PresetRango = 'mes-pasado';
  fechaInicioA = '';
  fechaFinA = '';
  fechaInicioB = '';
  fechaFinB = '';
  comparativa: ComparativaDosRangos | null = null;
  cargandoComparativa = false;

  opcionesComparador: OpcionPreset[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'ayer', label: 'Ayer' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'semana-pasada', label: 'Semana pasada' },
    { key: 'mes-actual', label: 'Este mes' },
    { key: 'mes-pasado', label: 'Mes pasado' },
    { key: 'semestre-actual', label: 'Este semestre' },
    { key: 'semestre-pasado', label: 'Semestre anterior' },
    { key: 'ultimos7', label: 'Últimos 7 días' },
    { key: 'ultimos30', label: 'Últimos 30 días' },
    { key: 'ultimos90', label: 'Últimos 90 días' },
    { key: 'anio', label: 'Este año' },
    { key: 'anio-pasado', label: 'Año pasado' },
    { key: 'personalizado', label: 'Personalizado' },
  ];

  private datosListos = false;
  /** True solo en el primer renderizado de gráficas; los re-renders no animan. */
  private primerRenderHecho = false;

  // ─── Helpers de rango por preset ──────────────────
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  private nombresMes = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  constructor(
    private estadisticasService: EstadisticasAvanzadasService,
    private exportService: ExportService,
    private databaseService: DatabaseService,
    private toastService: ToastService,
    private configService: ConfigService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private ngZone: NgZone,
  ) {}

  async ngOnInit(): Promise<void> {
    this.kpiUmbralInactividad = this.configService.umbralInactividadDias || 30;
    // Tier D25: leer estado de la URL antes de cargar
    this.leerUrlParams();
    // Pre-cargar mapas matrícula→turno y matrícula→grado
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    for (const a of todosAlumnos) {
      if (a.turno) this.turnoPorMatricula.set(a.matricula, a.turno);
      if (typeof a.grado === 'number') this.gradoPorMatricula.set(a.matricula, a.grado);
    }
    await this.cargarDatos();
    await this.cargarCrecimiento12m();
    this.cdr.markForCheck();
  }

  ngAfterViewInit(): void {
    if (this.datosListos) {
      setTimeout(() => this.renderizarGraficas(), 0);
    }
  }

  ngOnDestroy(): void {
    this.chartDiario?.destroy();
    this.chartMotivos?.destroy();
    this.chartCarreras?.destroy();
    this.chartCompararA?.destroy();
    this.chartCompararB?.destroy();
  }

  // ═══════════════════════════════════════════════
  // RANGOS POR PRESET
  // ═══════════════════════════════════════════════

  /** Resuelve el rango actual a partir del preset seleccionado y filtros. */
  private resolverRango(preset: PresetRango, ini?: string, fin?: string): RangoFechas | Promise<RangoFechas> {
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

    switch (preset) {
      case 'hoy':
        return { inicio: inicioHoy, fin: finHoy };

      case 'ayer': {
        const ayer = new Date(inicioHoy);
        ayer.setDate(ayer.getDate() - 1);
        const ayerFin = new Date(ayer);
        ayerFin.setHours(23, 59, 59, 999);
        return { inicio: ayer, fin: ayerFin };
      }

      case 'semana': {
        // Lunes a hoy
        const dow = hoy.getDay();
        const diff = dow === 0 ? -6 : 1 - dow;
        const inicio = new Date(inicioHoy);
        inicio.setDate(inicio.getDate() + diff);
        return { inicio, fin: finHoy };
      }

      case 'semana-pasada': {
        const dow = hoy.getDay();
        const diff = dow === 0 ? -6 : 1 - dow;
        const lunesEsta = new Date(inicioHoy);
        lunesEsta.setDate(lunesEsta.getDate() + diff);
        const inicio = new Date(lunesEsta);
        inicio.setDate(inicio.getDate() - 7);
        const fin = new Date(lunesEsta);
        fin.setDate(fin.getDate() - 1);
        fin.setHours(23, 59, 59, 999);
        return { inicio, fin };
      }

      case 'mes-actual':
        return this.estadisticasService.crearRangoMesActual();

      case 'mes-pasado': {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1, 0, 0, 0, 0);
        const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);
        return { inicio, fin };
      }

      case 'ultimos7':
        return this.estadisticasService.crearRangoUltimosDias(7);

      case 'ultimos14':
        return this.estadisticasService.crearRangoUltimosDias(14);

      case 'ultimos30':
        return this.estadisticasService.crearRangoUltimosDias(30);

      case 'ultimos90':
        return this.estadisticasService.crearRangoUltimosDias(90);

      case 'anio': {
        const inicio = new Date(hoy.getFullYear(), 0, 1, 0, 0, 0, 0);
        return { inicio, fin: finHoy };
      }

      case 'anio-pasado': {
        const y = hoy.getFullYear() - 1;
        return {
          inicio: new Date(y, 0, 1, 0, 0, 0, 0),
          fin: new Date(y, 11, 31, 23, 59, 59, 999),
        };
      }

      case 'semestre-actual': {
        // Convención genérica: 1er semestre = ene-jun, 2do semestre = jul-dic
        const m = hoy.getMonth();
        const y = hoy.getFullYear();
        if (m < 6) {
          return {
            inicio: new Date(y, 0, 1, 0, 0, 0, 0),
            fin: new Date(y, 5, 30, 23, 59, 59, 999),
          };
        }
        return {
          inicio: new Date(y, 6, 1, 0, 0, 0, 0),
          fin: new Date(y, 11, 31, 23, 59, 59, 999),
        };
      }

      case 'semestre-pasado': {
        const m = hoy.getMonth();
        const y = hoy.getFullYear();
        if (m < 6) {
          // Estamos en 1er sem; el anterior es 2do sem del año pasado
          return {
            inicio: new Date(y - 1, 6, 1, 0, 0, 0, 0),
            fin: new Date(y - 1, 11, 31, 23, 59, 59, 999),
          };
        }
        // Estamos en 2do sem; el anterior es 1er sem de este año
        return {
          inicio: new Date(y, 0, 1, 0, 0, 0, 0),
          fin: new Date(y, 5, 30, 23, 59, 59, 999),
        };
      }

      case 'todo':
        return this.estadisticasService.crearRangoHistorico();

      case 'personalizado': {
        const fi = ini || this.fechaInicio;
        const ff = fin || this.fechaFin;
        if (!fi || !ff) return this.estadisticasService.crearRangoUltimosDias(30);
        return this.estadisticasService.normalizarRango(
          new Date(fi + 'T00:00:00'),
          new Date(ff + 'T00:00:00'),
        );
      }
    }
  }

  /** Filtro de hora actual (o null si está apagado). */
  get horaFiltro(): { desde: number; hasta: number } | null {
    if (!this.filtroHoraActivo) return null;
    return { desde: this.filtroHoraDesde, hasta: this.filtroHoraHasta };
  }

  // ═══════════════════════════════════════════════
  // LABELS DINÁMICOS
  // ═══════════════════════════════════════════════

  formatearFechaLarga(d: Date): string {
    return d.toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  formatearFechaCorta(d: Date): string {
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  /** Texto humano del rango actual: "del 26 mar al 24 abr 2026 (30 días)". */
  get labelRangoActivo(): string {
    if (!this.rangoActivo) return '';
    const fi = this.formatearFechaLarga(this.rangoActivo.inicio);
    const ff = this.formatearFechaLarga(this.rangoActivo.fin);
    const dias = this.estadisticasService.diasEnRango(this.rangoActivo);
    return `Del ${fi} al ${ff} · ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  /** Texto del rango anterior contra el que se compara la tendencia. */
  get labelRangoComparativo(): string {
    if (!this.tendencia?.rangoAnterior) return '';
    const fi = this.formatearFechaCorta(this.tendencia.rangoAnterior.inicio);
    const ff = this.formatearFechaCorta(this.tendencia.rangoAnterior.fin);
    return `Comparado contra: del ${fi} al ${ff}`;
  }

  /** Si el rango cae mayormente en un mes, devuelve "abril 2026". */
  get labelMesPrincipal(): string {
    if (!this.rangoActivo) return '';
    const ini = this.rangoActivo.inicio;
    const fin = this.rangoActivo.fin;
    if (ini.getFullYear() === fin.getFullYear() && ini.getMonth() === fin.getMonth()) {
      return `${this.nombresMes[ini.getMonth()]} ${ini.getFullYear()}`;
    }
    return '';
  }

  get labelFiltroHora(): string {
    if (!this.filtroHoraActivo) return '';
    return `Solo ${this.formatHora(this.filtroHoraDesde)}–${this.formatHora(this.filtroHoraHasta)}`;
  }

  formatHora(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  get labelRegistrosDiarios(): string {
    const g = this.datosDiarios?.granularidad;
    const sufijo = g === 'mes' ? 'por mes' : g === 'semana' ? 'por semana' : 'por día';
    return `Registros ${sufijo}`;
  }

  get labelTendencia(): string {
    if (!this.rangoActivo) return 'Tendencia';
    const dias = this.estadisticasService.diasEnRango(this.rangoActivo);
    if (dias <= 14) return 'Tendencia semanal';
    if (dias <= 90) return 'Tendencia del período';
    return 'Tendencia anual';
  }

  get labelHeatmap(): string {
    const op = this.opcionesHeatmap.find(o => o.dias === this.heatmapPeriodo);
    return `Mapa de calor — ${op?.label || this.heatmapPeriodo + ' días'}`;
  }

  get sublabelHeatmap(): string {
    if (!this.heatmapRango) return '';
    return `${this.formatearFechaLarga(this.heatmapRango.inicio)} — ${this.formatearFechaLarga(this.heatmapRango.fin)}`;
  }

  etiquetaDia(dia: string): string {
    const fechas = this.heatmapFechasPorDia.get(dia);
    if (!fechas || fechas.length !== 1) return dia;
    const f = fechas[0];
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${dia} ${f.getDate()} ${meses[f.getMonth()]}`;
  }

  get labelTopAlumnos(): string {
    if (this.topPeriodo === 0) return 'Top 5 alumnos — Histórico completo';
    const op = this.opcionesTopPeriodo.find(o => o.dias === this.topPeriodo);
    return `Top 5 alumnos — ${op?.label || this.topPeriodo + ' días'}`;
  }

  // ═══════════════════════════════════════════════
  // HANDLERS DE FILTROS
  // ═══════════════════════════════════════════════

  /** Tier C22: refresca explícitamente desde la BD. */
  async refrescarDatos(): Promise<void> {
    this.estadisticasService.invalidarCache();
    await this.cargarDatos();
    this.toastService.success('Datos actualizados');
  }

  /** Tier C18: click en celda del heatmap → /registros con filtros pre-aplicados. */
  drillHeatmap(dia: string, hora: number): void {
    if (this.obtenerCantidadHeatmap(dia, hora) === 0) return;
    // Convertir nombre día → número (0=Dom..6=Sab)
    const idxDia = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      .indexOf(dia);
    if (idxDia < 0) return;
    // Buscar la próxima fecha de ese día dentro del rango del heatmap
    const fechas = this.heatmapFechasPorDia.get(dia) || [];
    if (fechas.length === 0) return;
    const fecha = fechas[fechas.length - 1]; // la más reciente
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    this.router.navigate(['/registros'], {
      queryParams: {
        fecha: `${yyyy}-${mm}-${dd}`,
        hora: hora,
      },
    });
  }

  /** Tier C18: click en barra del bar chart diario → drill-down a /registros. */
  drillDia(idx: number): void {
    if (!this.rangoActivo || !this.datosDiarios) return;
    if (this.datosDiarios.granularidad !== 'dia') return;
    const fecha = new Date(this.rangoActivo.inicio);
    fecha.setDate(fecha.getDate() + idx);
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    this.router.navigate(['/registros'], { queryParams: { fecha: `${yyyy}-${mm}-${dd}` } });
  }

  /** Tier D23: descripción textual de una gráfica para lectores de pantalla. */
  ariaDescripcionDiaria(): string {
    if (!this.datosDiarios || this.datosDiarios.cantidades.length === 0)
      return 'Gráfica de barras sin datos';
    const total = this.datosDiarios.cantidades.reduce((s, v) => s + v, 0);
    const max = Math.max(...this.datosDiarios.cantidades);
    const idxMax = this.datosDiarios.cantidades.indexOf(max);
    return `Gráfica de barras de registros por ${this.datosDiarios.granularidad}. ` +
           `Total: ${total}. ` +
           `Pico en ${this.datosDiarios.etiquetas[idxMax]} con ${max} registros.`;
  }

  ariaDescripcionMotivos(): string {
    if (!this.distribucionMotivos || this.distribucionMotivos.cantidades.length === 0)
      return 'Gráfica circular sin datos';
    const total = this.distribucionMotivos.cantidades.reduce((s, v) => s + v, 0);
    return this.distribucionMotivos.etiquetas
      .map((e, i) => `${e}: ${this.distribucionMotivos!.cantidades[i]} (${(this.distribucionMotivos!.cantidades[i] / total * 100).toFixed(0)}%)`)
      .join('. ');
  }

  ariaDescripcionCarreras(): string {
    if (this.datosCarreras.length === 0) return 'Sin datos por carrera';
    return this.datosCarreras.slice(0, 5)
      .map(c => `${c.carrera}: ${c.totalVisitas} visitas`)
      .join('. ');
  }

  setPreset(key: PresetRango): void {
    this.presetSeleccionado = key;
    this.actualizarUrl();
    if (key === 'personalizado') {
      if (!this.fechaInicio || !this.fechaFin) {
        const hoy = new Date();
        const hace30 = new Date(hoy);
        hace30.setDate(hoy.getDate() - 30);
        this.fechaFin = hoy.toISOString().split('T')[0];
        this.fechaInicio = hace30.toISOString().split('T')[0];
      }
      // No recargar hasta que aplique
      return;
    }
    this.cargarDatos();
  }

  aplicarRangoPersonalizado(): void {
    if (!this.fechaInicio || !this.fechaFin) return;
    if (new Date(this.fechaInicio) > new Date(this.fechaFin)) {
      this.toastService.warning('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }
    this.cargarDatos();
  }

  toggleFiltroHora(): void {
    this.filtroHoraActivo = !this.filtroHoraActivo;
    this.actualizarUrl();
    this.cargarDatos();
  }

  setFiltroHora(): void {
    if (this.filtroHoraDesde > this.filtroHoraHasta) {
      this.toastService.warning('La hora "desde" debe ser anterior a "hasta"');
      return;
    }
    this.actualizarUrl();
    this.cargarDatos();
  }

  /** Tier D25: persiste el estado en query params (permalinks). */
  private actualizarUrl(): void {
    const params: any = { p: this.presetSeleccionado };
    if (this.presetSeleccionado === 'personalizado') {
      if (this.fechaInicio) params.ini = this.fechaInicio;
      if (this.fechaFin) params.fin = this.fechaFin;
    }
    if (this.filtroHoraActivo) {
      params.hd = this.filtroHoraDesde;
      params.hh = this.filtroHoraHasta;
    }
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Tier D25: lee el estado inicial desde query params. */
  private leerUrlParams(): void {
    const qp = this.activatedRoute.snapshot.queryParamMap;
    const p = qp.get('p') as PresetRango | null;
    if (p) this.presetSeleccionado = p;
    const ini = qp.get('ini'); if (ini) this.fechaInicio = ini;
    const fin = qp.get('fin'); if (fin) this.fechaFin = fin;
    const hd = qp.get('hd'); const hh = qp.get('hh');
    if (hd !== null && hh !== null) {
      this.filtroHoraActivo = true;
      this.filtroHoraDesde = +hd;
      this.filtroHoraHasta = +hh;
    }
  }

  get fechaMaxima(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ─── Heatmap período ─────────────────────────────
  setHeatmapPeriodo(dias: number): void {
    this.heatmapPeriodo = dias;
    this.cargarHeatmap();
  }

  private async cargarHeatmap(): Promise<void> {
    this.estadisticasService.invalidarCache();
    const resultado = await this.estadisticasService.generarHeatmap(this.heatmapPeriodo);
    this.aplicarHeatmap(resultado);
    this.diaPredicho = await this.estadisticasService.predecirDiaOcupado(this.heatmapPeriodo);
  }

  private aplicarHeatmap(resultado: HeatmapResultado): void {
    this.heatmapData = resultado.data;
    this.heatmapHoras = resultado.horas;
    this.heatmapRango = resultado.rango;
    this.heatmapFechasPorDia = resultado.fechasPorDia;

    // Pre-computar matriz [día][hora] → cantidad para acceso O(1)
    const matriz: Record<string, Record<number, number>> = {};
    let maximo = 0;
    let picoCantidad = -1;
    let picoDia: string | null = null;
    let picoHora: number | null = null;
    let valleCantidad = Infinity;
    let valleDia: string | null = null;
    let valleHora: number | null = null;

    for (const dia of this.diasSemana) {
      matriz[dia] = {};
      for (const hora of this.heatmapHoras) {
        matriz[dia][hora] = 0;
      }
    }
    for (const item of resultado.data) {
      if (matriz[item.dia] && matriz[item.dia][item.hora] !== undefined) {
        matriz[item.dia][item.hora] = item.cantidad;
        if (item.cantidad > maximo) maximo = item.cantidad;
        if (item.cantidad > picoCantidad) {
          picoCantidad = item.cantidad;
          picoDia = item.dia;
          picoHora = item.hora;
        }
        if (item.cantidad > 0 && item.cantidad < valleCantidad) {
          valleCantidad = item.cantidad;
          valleDia = item.dia;
          valleHora = item.hora;
        }
      }
    }

    // Tier A7: usar PERCENTILES (p25, p50, p75, p90) en vez de % de máximo.
    // Ventaja: si una celda tiene 1000 visitas y el resto 5, ya no todo se ve
    // intensidad-1 — la escala se ajusta a la distribución real.
    const valoresNoCero: number[] = [];
    for (const dia of this.diasSemana) {
      for (const hora of this.heatmapHoras) {
        const v = matriz[dia][hora];
        if (v > 0) valoresNoCero.push(v);
      }
    }
    valoresNoCero.sort((a, b) => a - b);
    const p = (q: number): number => {
      if (valoresNoCero.length === 0) return 0;
      const idx = Math.min(valoresNoCero.length - 1, Math.floor(valoresNoCero.length * q));
      return valoresNoCero[idx];
    };
    const p25 = p(0.25);
    const p50 = p(0.50);
    const p75 = p(0.75);
    const p90 = p(0.90);

    const clases: Record<string, Record<number, string>> = {};
    for (const dia of this.diasSemana) {
      clases[dia] = {};
      for (const hora of this.heatmapHoras) {
        clases[dia][hora] = this.calcularClaseIntensidadPercentil(
          matriz[dia][hora], p25, p50, p75, p90,
        );
      }
    }

    this.heatmapMatriz = matriz;
    this.heatmapClases = clases;
    this.heatmapMaximo = maximo;
    this.heatmapPicoDia = picoCantidad > 0 ? picoDia : null;
    this.heatmapPicoHora = picoCantidad > 0 ? picoHora : null;
    this.heatmapValleDia = isFinite(valleCantidad) ? valleDia : null;
    this.heatmapValleHora = isFinite(valleCantidad) ? valleHora : null;
  }

  private calcularClaseIntensidadPercentil(
    cantidad: number, p25: number, p50: number, p75: number, p90: number,
  ): string {
    if (cantidad === 0) return 'intensidad-0';
    if (cantidad <= p25) return 'intensidad-1';
    if (cantidad <= p50) return 'intensidad-2';
    if (cantidad <= p75) return 'intensidad-3';
    return 'intensidad-4';
  }

  // ─── Top alumnos período ─────────────────────────
  setTopPeriodo(dias: number): void {
    this.topPeriodo = dias;
    this.cargarTopAlumnos();
  }

  private async cargarTopAlumnos(): Promise<void> {
    this.estadisticasService.invalidarCache();
    this.topAlumnos = await this.estadisticasService.obtenerTopAlumnos(
      5, this.topPeriodo || undefined
    );
  }

  // ═══════════════════════════════════════════════
  // CARGA PRINCIPAL
  // ═══════════════════════════════════════════════

  async cargarDatos(): Promise<void> {
    try {
      this.cargando = true;

      const rango = await Promise.resolve(this.resolverRango(this.presetSeleccionado));
      this.rangoActivo = rango;
      const horaFiltro = this.horaFiltro;

      // Tier S3 v3.17.0: una sola lectura del cache + las queries que dependen
      // de OTROS rangos (heatmap, top, predicción) van en paralelo.
      const [registrosCrudos, heatmap, top, prediccion] = await Promise.all([
        this.estadisticasService.obtenerRegistrosCrudos(rango, horaFiltro),
        this.estadisticasService.generarHeatmap(this.heatmapPeriodo),
        this.estadisticasService.obtenerTopAlumnos(5, this.topPeriodo || undefined),
        this.estadisticasService.predecirDiaOcupado(this.heatmapPeriodo),
      ]);

      // Las métricas del rango se derivan del array ya filtrado (rápido, en JS).
      const [tendencia, insights, diarios, motivos, carreras] = await Promise.all([
        this.estadisticasService.compararTendencias(rango, horaFiltro),
        this.estadisticasService.generarInsights(rango, horaFiltro, this.kpiUmbralInactividad),
        this.estadisticasService.obtenerRegistrosPorRango(rango, horaFiltro),
        this.estadisticasService.obtenerDistribucionMotivos(rango, horaFiltro),
        this.estadisticasService.analizarPorCarrera(rango, horaFiltro),
      ]);

      this.tendencia = tendencia;
      this.aplicarHeatmap(heatmap);
      this.topAlumnos = top;
      this.insights = insights;
      this.diaPredicho = prediccion;
      this.datosDiarios = diarios;
      this.distribucionMotivos = motivos;
      this.datosCarreras = carreras;

      // KPIs derivados
      this.kpiTotalRegistros = registrosCrudos.length;
      const matriculasUnicas = new Set<string>();
      registrosCrudos.forEach(r => { if (r.matricula !== 'INVITADO') matriculasUnicas.add(r.matricula); });
      this.kpiAlumnosUnicos = matriculasUnicas.size;
      const dias = this.estadisticasService.diasEnRango(rango);
      this.kpiPromedioPorDia = dias > 0 ? parseFloat((registrosCrudos.length / dias).toFixed(1)) : 0;
      this.kpiHoraPico = this.estadisticasService.calcularHoraPicoEnRango(registrosCrudos);

      // Alumnos inactivos: lo extrae del insight (ya lo calcula con el umbral correcto)
      const insightInactivos = insights.find(i => i.titulo === 'Alumnos Inactivos');
      if (insightInactivos) {
        const m = insightInactivos.descripcion.match(/^(\d+)/);
        this.kpiAlumnosInactivos = m ? parseInt(m[1], 10) : 0;
      } else {
        this.kpiAlumnosInactivos = 0;
      }

      // ─── TIER B: métricas avanzadas (rango actual) ──
      this.calcularMetricasAvanzadas(registrosCrudos, rango);
      this.calcularSparklines(registrosCrudos, rango);
      this.calcularDistribucionGrado(registrosCrudos);
      this.calcularCombinacionesMotivos(registrosCrudos);
      this.calcularVariacionDiaria(diarios);
      this.calcularDiaSemanaTop(registrosCrudos);
      this.calcularPctInvitados(registrosCrudos);
      this.calcularPrediccionHoy(registrosCrudos);
      // diariosDomingoIdx (Tier A: tinte de domingos en barras diarias)
      this.diariosDomingoIdx = this.calcularDomingosDelGrafico(rango, diarios);

      // Métricas que requieren histórico completo se calculan async aparte
      // (no bloquean la primera renderización).
      this.calcularMetricasGlobales(rango, horaFiltro);

      this.cargando = false;
      this.datosListos = true;
      this.cdr.markForCheck();

      await this.construirMesesDisponibles();
      setTimeout(() => this.renderizarGraficas(), 50);
    } catch (error) {
      console.error('❌ Error al cargar estadísticas avanzadas:', error);
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  /** Cache de matrícula → turno para fallback de registros viejos sin r.turno. */
  private turnoPorMatricula: Map<string, string> = new Map();

  /** Tier B: tiempo estancia, retención, distribución turnos, top motivo, una sola visita, crecimiento 12m. */
  private calcularMetricasAvanzadas(registros: any[], rango: RangoFechas): void {
    // Tiempo estancia promedio
    const conDuracion = registros.filter(r => typeof r.duracionMinutos === 'number' && r.duracionMinutos > 0);
    this.kpiTiempoEstanciaPromedio = conDuracion.length > 0
      ? Math.round(conDuracion.reduce((s, r) => s + r.duracionMinutos, 0) / conDuracion.length)
      : 0;

    // Retención adaptativa al rango (Tier A5):
    //   ≤7 días → ≥2 visitas, ≤30 → ≥3, ≤90 → ≥5, >90 → ≥8
    const dias = this.estadisticasService.diasEnRango(rango);
    const umbralRetencion = dias <= 7 ? 2 : dias <= 30 ? 3 : dias <= 90 ? 5 : 8;
    this.kpiUmbralRetencion = umbralRetencion;

    const visitasPorMatricula = new Map<string, number>();
    for (const r of registros) {
      if (r.matricula === 'INVITADO') continue;
      visitasPorMatricula.set(r.matricula, (visitasPorMatricula.get(r.matricula) || 0) + 1);
    }
    const totalUnicos = visitasPorMatricula.size;
    let recurrentes = 0;
    visitasPorMatricula.forEach(v => {
      if (v >= umbralRetencion) recurrentes++;
    });
    this.kpiTasaRetencion = totalUnicos > 0 ? Math.round((recurrentes / totalUnicos) * 100) : 0;

    // "Una sola visita" REAL (Tier A6): alumnos con exactamente 1 visita HISTÓRICA total.
    // (El cálculo se hace en cargarMetricasGlobales(), aquí no toca tocar.)

    // Distribución por turno: usa r.turno si existe, fallback al join con alumnos
    // (registros viejos pre-v3.16.0 no tienen turno propagado).
    const turnos = new Map<string, number>();
    for (const r of registros) {
      const t = r.turno || this.turnoPorMatricula.get(r.matricula) || 'Sin turno';
      turnos.set(t, (turnos.get(t) || 0) + 1);
    }
    const totalTurnos = registros.length;
    const coloresTurno: Record<string, string> = {
      'Matutino': '#0BC4B7', 'Vespertino': '#F5A623', 'Mixto': '#6366F1', 'Sin turno': '#64748B',
    };
    this.kpiDistribucionTurnos = Array.from(turnos.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([turno, cantidad]) => ({
        turno, cantidad,
        porcentaje: totalTurnos > 0 ? parseFloat((cantidad / totalTurnos * 100).toFixed(1)) : 0,
        color: coloresTurno[turno] || '#64748B',
      }));

    // Top motivo del período
    const motivos = new Map<string, number>();
    for (const r of registros) {
      const m = r.motivoNombre || 'Sin motivo';
      motivos.set(m, (motivos.get(m) || 0) + 1);
    }
    let topMotivoNombre = ''; let topMotivoCantidad = 0;
    motivos.forEach((c, n) => { if (c > topMotivoCantidad) { topMotivoCantidad = c; topMotivoNombre = n; } });
    this.kpiTopMotivo = topMotivoCantidad > 0 ? {
      nombre: topMotivoNombre, cantidad: topMotivoCantidad,
      porcentaje: registros.length > 0 ? parseFloat((topMotivoCantidad / registros.length * 100).toFixed(1)) : 0,
    } : null;
  }

  /** Tier B: crecimiento mensual (últimos 12 meses, independiente del filtro). */
  private async cargarCrecimiento12m(): Promise<void> {
    const todos = await this.databaseService.obtenerTodosLosRegistros();
    const hoy = new Date();
    const meses: { mes: string; cantidad: number; key: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const nombresAbr = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      meses.push({ mes: `${nombresAbr[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`, cantidad: 0, key });
    }
    const mapa = new Map(meses.map(m => [m.key, m]));
    for (const r of todos) {
      const d = new Date(r.fechaHora);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const mes = mapa.get(k);
      if (mes) mes.cantidad++;
    }
    this.kpiCrecimiento12m = meses.map(({ mes, cantidad }) => ({ mes, cantidad }));
  }

  /** Tier A: sparklines — últimos N puntos para mostrar mini-trazos junto a KPIs. */
  private calcularSparklines(registros: any[], rango: RangoFechas): void {
    // Spark de registros: dividir el rango en buckets (máx 30)
    const dias = this.estadisticasService.diasEnRango(rango);
    const buckets = Math.min(30, Math.max(7, dias));
    const inicioMs = rango.inicio.getTime();
    const finMs = rango.fin.getTime();
    const ancho = (finMs - inicioMs) / buckets;

    const counts = new Array(buckets).fill(0);
    const unicosPorBucket: Set<string>[] = Array.from({ length: buckets }, () => new Set());
    for (const r of registros) {
      const t = new Date(r.fechaHora).getTime();
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor((t - inicioMs) / ancho)));
      counts[idx]++;
      if (r.matricula !== 'INVITADO') unicosPorBucket[idx].add(r.matricula);
    }
    this.sparkRegistros = counts;
    this.sparkAlumnosUnicos = unicosPorBucket.map(s => s.size);
    // Promedio: registros por bucket dividido entre días que cubre cada bucket
    const diasPorBucket = Math.max(1, dias / buckets);
    this.sparkPromedio = counts.map(c => parseFloat((c / diasPorBucket).toFixed(1)));
  }

  /** Altura % para una barra del crecimiento 12m (relativa al máximo). */
  alturaBarraCrecimiento(cantidad: number): number {
    if (this.kpiCrecimiento12m.length === 0) return 0;
    const max = Math.max(...this.kpiCrecimiento12m.map(m => m.cantidad), 1);
    return Math.max(2, (cantidad / max) * 100);
  }

  // ─── v3.17.0 — Métricas Tier B ────────────────────────────────

  /** Tier B11: distribución por grado (1°, 2°, 3°, etc.). */
  private calcularDistribucionGrado(registros: any[]): void {
    const conteo = new Map<number, number>();
    for (const r of registros) {
      // El registro NO tiene grado. Hacer fallback al alumno (alumnoTurno cache parcial).
      // Para grado necesitamos otro mapa. Lo generamos al vuelo si no existe.
      const grado = this.gradoPorMatricula.get(r.matricula);
      if (grado != null) {
        conteo.set(grado, (conteo.get(grado) || 0) + 1);
      }
    }
    const total = Array.from(conteo.values()).reduce((s, v) => s + v, 0);
    this.kpiDistribucionGrado = Array.from(conteo.entries())
      .map(([grado, cantidad]) => ({
        grado, cantidad,
        porcentaje: total > 0 ? parseFloat((cantidad / total * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.grado - b.grado);
  }

  /** Tier B14: combinaciones de motivos más frecuentes (cuando hay multi-motivo). */
  private calcularCombinacionesMotivos(registros: any[]): void {
    const conteo = new Map<string, number>();
    for (const r of registros) {
      const motivos = r.motivoNombres && r.motivoNombres.length > 1
        ? [...r.motivoNombres].sort().join(' + ')
        : null;
      if (motivos) {
        conteo.set(motivos, (conteo.get(motivos) || 0) + 1);
      }
    }
    const totalCombos = Array.from(conteo.values()).reduce((s, v) => s + v, 0);
    this.kpiCombinacionesMotivos = Array.from(conteo.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([combo, cantidad]) => ({
        combo, cantidad,
        porcentaje: totalCombos > 0 ? parseFloat((cantidad / totalCombos * 100).toFixed(1)) : 0,
      }));
  }

  /** Variación diaria (coeficiente de variación %): qué tan estable es el flujo. */
  private calcularVariacionDiaria(diarios: DatosDiarios): void {
    if (diarios.granularidad !== 'dia' || diarios.cantidades.length < 2) {
      this.kpiVariacionDiaria = 0;
      return;
    }
    const valores = diarios.cantidades.filter(v => v > 0);
    if (valores.length < 2) { this.kpiVariacionDiaria = 0; return; }
    const media = valores.reduce((s, v) => s + v, 0) / valores.length;
    const varianza = valores.reduce((s, v) => s + (v - media) ** 2, 0) / valores.length;
    const std = Math.sqrt(varianza);
    this.kpiVariacionDiaria = media > 0 ? Math.round((std / media) * 100) : 0;
  }

  /** Día de la semana con más visitas en el período. */
  private calcularDiaSemanaTop(registros: any[]): void {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const conteo = new Array(7).fill(0);
    for (const r of registros) {
      const d = new Date(r.fechaHora).getDay();
      conteo[d]++;
    }
    let maxIdx = 0;
    for (let i = 1; i < 7; i++) if (conteo[i] > conteo[maxIdx]) maxIdx = i;
    this.kpiDiaSemanaTop = conteo[maxIdx] > 0 ? dias[maxIdx] : '';
  }

  /** Tier B12: % invitados vs alumnos del período. */
  private calcularPctInvitados(registros: any[]): void {
    if (registros.length === 0) { this.kpiPctInvitados = 0; return; }
    const invitados = registros.filter(r => r.matricula === 'INVITADO').length;
    this.kpiPctInvitados = parseFloat((invitados / registros.length * 100).toFixed(1));
  }

  /**
   * Tier B13: predicción del total de hoy al cierre.
   * Si el rango no incluye hoy → 0. Si lo incluye, extrapolar usando el
   * ritmo de la hora actual respecto al ritmo histórico esperado.
   */
  private calcularPrediccionHoy(registros: any[]): void {
    if (!this.rangoActivo) { this.kpiPrediccionHoy = 0; return; }
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    // ¿El rango activo incluye hoy?
    if (this.rangoActivo.fin < inicioHoy || this.rangoActivo.inicio > finHoy) {
      this.kpiPrediccionHoy = 0;
      this.kpiPrediccionHoyConfianza = 'baja';
      return;
    }

    // Visitas de HOY
    const hoyMs = inicioHoy.getTime();
    const ahoraMs = ahora.getTime();
    const visitasHoy = registros.filter(r => {
      const t = new Date(r.fechaHora).getTime();
      return t >= hoyMs && t <= ahoraMs;
    }).length;

    // Estimación simple: si llevamos N% del horario, proyectar a 100%.
    // Asumir horario abierto 7:00-22:00 (15 horas) — fallback genérico.
    // TODO: leer del configService.horarios cuando esté implementado.
    const horaActual = ahora.getHours() + ahora.getMinutes() / 60;
    const horaApertura = 7;
    const horaCierre = 22;
    if (horaActual <= horaApertura) {
      this.kpiPrediccionHoy = 0;
      this.kpiPrediccionHoyConfianza = 'baja';
      return;
    }
    if (horaActual >= horaCierre) {
      this.kpiPrediccionHoy = visitasHoy;
      this.kpiPrediccionHoyConfianza = 'alta';
      return;
    }
    const fraccionTranscurrida = (horaActual - horaApertura) / (horaCierre - horaApertura);
    this.kpiPrediccionHoy = visitasHoy > 0
      ? Math.round(visitasHoy / Math.max(0.05, fraccionTranscurrida))
      : 0;
    this.kpiPrediccionHoyConfianza = fraccionTranscurrida >= 0.5 ? 'alta'
      : fraccionTranscurrida >= 0.25 ? 'media' : 'baja';
  }

  /** Tier B9 + B10: métricas globales (último registro absoluto + carrera con mayor crecimiento). */
  private async calcularMetricasGlobales(rango: RangoFechas, horaFiltro: { desde: number; hasta: number } | null): Promise<void> {
    try {
      const todos = await this.databaseService.obtenerTodosLosRegistros();

      // Tier B9: hace cuánto tiempo el último registro
      if (todos.length > 0) {
        const masReciente = todos.reduce((max, r) => {
          const t = new Date(r.fechaHora).getTime();
          return t > max ? t : max;
        }, 0);
        this.kpiUltimoRegistroHace = this.formatHaceTiempo(Date.now() - masReciente);
      } else {
        this.kpiUltimoRegistroHace = 'sin registros aún';
      }

      // Tier A6: "Una sola visita" REAL — alumnos con 1 visita histórica total.
      const visitasHistoricasPorMat = new Map<string, number>();
      for (const r of todos) {
        if (r.matricula === 'INVITADO') continue;
        visitasHistoricasPorMat.set(r.matricula, (visitasHistoricasPorMat.get(r.matricula) || 0) + 1);
      }
      let unaSolaReal = 0;
      visitasHistoricasPorMat.forEach(v => { if (v === 1) unaSolaReal++; });
      this.kpiAlumnosUnaSolaVisita = unaSolaReal;

      // Tier B10: carrera con mayor crecimiento vs período anterior.
      const rangoAnterior = this.estadisticasService.rangoAnteriorMismaLongitud(rango);
      const inA = rango.inicio.getTime(), fnA = rango.fin.getTime();
      const inB = rangoAnterior.inicio.getTime(), fnB = rangoAnterior.fin.getTime();

      const aplicaHora = (d: Date): boolean => {
        if (!horaFiltro) return true;
        const h = d.getHours();
        return h >= horaFiltro.desde && h <= horaFiltro.hasta;
      };

      const carrerasA = new Map<string, number>();
      const carrerasB = new Map<string, number>();
      for (const r of todos) {
        const d = new Date(r.fechaHora);
        const t = d.getTime();
        if (!aplicaHora(d)) continue;
        const c = r.carrera || 'Sin carrera';
        if (t >= inA && t <= fnA) carrerasA.set(c, (carrerasA.get(c) || 0) + 1);
        else if (t >= inB && t <= fnB) carrerasB.set(c, (carrerasB.get(c) || 0) + 1);
      }

      let mejor: { carrera: string; cambio: number; porcentaje: number } | null = null;
      carrerasA.forEach((cantA, carrera) => {
        const cantB = carrerasB.get(carrera) || 0;
        const cambio = cantA - cantB;
        const porc = cantB > 0 ? (cambio / cantB) * 100 : (cantA > 0 ? 100 : 0);
        if (cambio > 0 && cantA >= 5 && (!mejor || porc > mejor.porcentaje)) {
          mejor = { carrera, cambio, porcentaje: parseFloat(porc.toFixed(1)) };
        }
      });
      this.kpiCarreraTopCrecimiento = mejor;

      this.cdr.markForCheck();
    } catch (e) {
      console.warn('No se pudo calcular métricas globales:', e);
    }
  }

  /** "hace 23 minutos", "hace 2 horas", "ayer", etc. */
  private formatHaceTiempo(ms: number): string {
    const seg = Math.floor(ms / 1000);
    const min = Math.floor(seg / 60);
    const hr = Math.floor(min / 60);
    const dias = Math.floor(hr / 24);
    if (seg < 60) return 'hace unos segundos';
    if (min < 60) return `hace ${min} minuto${min === 1 ? '' : 's'}`;
    if (hr < 24) return `hace ${hr} hora${hr === 1 ? '' : 's'}`;
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;
    if (dias < 30) return `hace ${Math.floor(dias / 7)} semana${Math.floor(dias / 7) === 1 ? '' : 's'}`;
    if (dias < 365) return `hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) === 1 ? '' : 'es'}`;
    return `hace ${Math.floor(dias / 365)} año${Math.floor(dias / 365) === 1 ? '' : 's'}`;
  }

  /** Cache global matrícula → grado (igual que turnoPorMatricula). */
  private gradoPorMatricula: Map<string, number> = new Map();

  /** Tier A: índices del array `etiquetas` que corresponden a domingo. */
  private calcularDomingosDelGrafico(rango: RangoFechas, diarios: DatosDiarios): number[] {
    if (diarios.granularidad !== 'dia') return [];
    const idxs: number[] = [];
    const cursor = new Date(rango.inicio);
    let i = 0;
    while (cursor <= rango.fin && i < diarios.etiquetas.length) {
      if (cursor.getDay() === 0) idxs.push(i);
      cursor.setDate(cursor.getDate() + 1);
      i++;
    }
    return idxs;
  }

  // ═══════════════════════════════════════════════
  // COMPARADOR A vs B
  // ═══════════════════════════════════════════════

  toggleComparador(): void {
    this.compararAbierto = !this.compararAbierto;
    if (this.compararAbierto && !this.comparativa) {
      this.compararAhora();
    }
  }

  setPresetComparador(slot: 'a' | 'b', key: PresetRango): void {
    if (slot === 'a') this.presetA = key;
    else this.presetB = key;
    if (key === 'personalizado') {
      const hoy = new Date();
      const hace30 = new Date(hoy);
      hace30.setDate(hoy.getDate() - 30);
      const hoyStr = hoy.toISOString().split('T')[0];
      const hace30Str = hace30.toISOString().split('T')[0];
      if (slot === 'a') {
        this.fechaInicioA ||= hace30Str;
        this.fechaFinA ||= hoyStr;
      } else {
        this.fechaInicioB ||= hace30Str;
        this.fechaFinB ||= hoyStr;
      }
      return;
    }
    this.compararAhora();
  }

  async compararAhora(): Promise<void> {
    this.cargandoComparativa = true;
    try {
      const rangoA = await Promise.resolve(this.resolverRango(this.presetA, this.fechaInicioA, this.fechaFinA));
      const rangoB = await Promise.resolve(this.resolverRango(this.presetB, this.fechaInicioB, this.fechaFinB));
      this.comparativa = await this.estadisticasService.compararDosRangos(rangoA, rangoB, this.horaFiltro);
      setTimeout(() => this.renderizarGraficasComparador(), 50);
    } catch (e) {
      console.error('❌ Error en comparativa:', e);
      this.toastService.error('No se pudo generar la comparativa');
    } finally {
      this.cargandoComparativa = false;
    }
  }

  labelRangoComparado(slot: 'a' | 'b'): string {
    const c = this.comparativa;
    if (!c) return '';
    const r = slot === 'a' ? c.a.rango : c.b.rango;
    return `${this.formatearFechaLarga(r.inicio)} — ${this.formatearFechaLarga(r.fin)}`;
  }

  // ═══════════════════════════════════════════════
  // REPORTE POR PERIODO
  // ═══════════════════════════════════════════════

  private async construirMesesDisponibles(): Promise<void> {
    const todos = await this.databaseService.obtenerTodosLosRegistros();
    const meses = new Set<string>();
    const años = new Set<string>();
    for (const r of todos) {
      const d = new Date(r.fechaHora);
      meses.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      años.add(String(d.getFullYear()));
    }
    const hoy = new Date();
    meses.add(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`);
    años.add(String(hoy.getFullYear()));
    const mesesOrdenados = [...meses].sort().reverse();
    const añosOrdenados = [...años].sort().reverse();
    this.mesesDisponibles = mesesOrdenados.map(valor => {
      const [y, m] = valor.split('-').map(Number);
      return { valor, label: `${this.nombresMes[m - 1]} ${y}` };
    });
    this.aniosDisponibles = añosOrdenados.map(valor => ({ valor, label: valor }));
    if (!this.mesReporteSeleccionado && this.mesesDisponibles.length > 0) {
      this.mesReporteSeleccionado = this.mesesDisponibles[0].valor;
    }
    if (!this.anioReporteSeleccionado && this.aniosDisponibles.length > 0) {
      this.anioReporteSeleccionado = this.aniosDisponibles[0].valor;
    }
    if (!this.fechaReporteDiario) {
      const y = hoy.getFullYear();
      const m = String(hoy.getMonth() + 1).padStart(2, '0');
      const d = String(hoy.getDate()).padStart(2, '0');
      this.fechaReporteDiario = `${y}-${m}-${d}`;
    }
    if (!this.fechaReporteSemana) {
      this.fechaReporteSemana = this.fechaReporteDiario;
    }
  }

  private inicioDia(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  private finDia(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
  private inicioSemana(d: Date): Date {
    const x = this.inicioDia(d);
    const dow = x.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    x.setDate(x.getDate() + diff);
    return x;
  }

  private calcularRangoReporte(): { inicio: Date; fin: Date; etiqueta: string } | null {
    if (this.tipoReporte === 'diario') {
      if (!this.fechaReporteDiario) return null;
      const d = new Date(this.fechaReporteDiario + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      return {
        inicio: this.inicioDia(d), fin: this.finDia(d),
        etiqueta: d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
      };
    }
    if (this.tipoReporte === 'semanal') {
      if (!this.fechaReporteSemana) return null;
      const d = new Date(this.fechaReporteSemana + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      const inicio = this.inicioSemana(d);
      const fin = this.finDia(new Date(inicio.getTime() + 6 * 86400000));
      const fmt = (x: Date) => x.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      return { inicio, fin, etiqueta: `Semana del ${fmt(inicio)} al ${fmt(fin)} ${fin.getFullYear()}` };
    }
    if (this.tipoReporte === 'mensual') {
      if (!this.mesReporteSeleccionado) return null;
      const [y, m] = this.mesReporteSeleccionado.split('-').map(Number);
      return {
        inicio: new Date(y, m - 1, 1, 0, 0, 0, 0),
        fin: new Date(y, m, 0, 23, 59, 59, 999),
        etiqueta: `${this.nombresMes[m - 1]} ${y}`,
      };
    }
    if (this.tipoReporte === 'anual') {
      if (!this.anioReporteSeleccionado) return null;
      const y = Number(this.anioReporteSeleccionado);
      return {
        inicio: new Date(y, 0, 1, 0, 0, 0, 0),
        fin: new Date(y, 11, 31, 23, 59, 59, 999),
        etiqueta: `Año ${y}`,
      };
    }
    return null;
  }

  get puedeGenerarReporte(): boolean {
    return !!this.calcularRangoReporte();
  }

  get labelBotonReporte(): string {
    const tipo = this.tipoReporte;
    const t = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    return this.generandoReporte ? 'Generando...' : `Reporte ${t.toLowerCase()}`;
  }

  private calcularTopDelMes(registrosMes: any[], limite: number) {
    const porMat = new Map<string, any[]>();
    for (const r of registrosMes) {
      const arr = porMat.get(r.matricula) || [];
      arr.push(r);
      porMat.set(r.matricula, arr);
    }
    const top: any[] = [];
    porMat.forEach((regs, mat) => {
      if (mat === 'INVITADO') return;
      const motivos = new Map<string, number>();
      regs.forEach(r => motivos.set(r.motivoNombre, (motivos.get(r.motivoNombre) || 0) + 1));
      let motivoFrecuente = 'N/A'; let maxC = 0;
      motivos.forEach((c, m) => { if (c > maxC) { maxC = c; motivoFrecuente = m; } });
      const ultima = new Date(Math.max(...regs.map(r => new Date(r.fechaHora).getTime())));
      top.push({
        posicion: 0, matricula: mat, nombreCompleto: regs[0].nombreCompleto,
        carrera: regs[0].carrera, totalVisitas: regs.length, ultimaVisita: ultima, motivoFrecuente,
      });
    });
    top.sort((a, b) => b.totalVisitas - a.totalVisitas);
    return top.slice(0, limite).map((t, i) => ({ ...t, posicion: i + 1 }));
  }

  async generarReportePeriodo(): Promise<void> {
    if (this.generandoReporte) return;
    const rango = this.calcularRangoReporte();
    if (!rango) {
      this.toastService.warning('Selecciona un periodo válido');
      return;
    }
    this.generandoReporte = true;
    try {
      const todos = await this.databaseService.obtenerTodosLosRegistros();
      const delRango = todos.filter(r => {
        const t = new Date(r.fechaHora).getTime();
        return t >= rango.inicio.getTime() && t <= rango.fin.getTime();
      });
      if (delRango.length === 0) {
        this.toastService.warning('No hay registros en el periodo seleccionado');
        return;
      }
      const topParaReporte = this.calcularTopDelMes(delRango, 10);
      const { ReportService } = await import('../../core/services/report.service');
      const reportService = new ReportService(this.databaseService);
      const titulosPorTipo: Record<string, string> = {
        diario: `Reporte Diario — ${rango.etiqueta}`,
        semanal: `Reporte Semanal — ${rango.etiqueta}`,
        mensual: `Reporte Mensual — ${rango.etiqueta}`,
        anual: `Reporte Anual — ${rango.etiqueta}`,
      };
      await reportService.generarReporteAccesos(delRango, {
        tipo: this.tipoReporte,
        titulo: titulosPorTipo[this.tipoReporte],
        fechaInicio: rango.inicio,
        fechaFin: rango.fin,
        topAlumnos: topParaReporte,
      });
      this.toastService.success(`Reporte generado (${delRango.length} registros)`);
    } catch (e) {
      console.error(e);
      this.toastService.error('No se pudo generar el reporte');
    } finally {
      this.generandoReporte = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Genera el PDF del rango activo (todo incluido).
   * Para personalizar secciones, usar `personalizarPdf()`.
   */
  async exportarLoQueVeo(): Promise<void> {
    await this.generarPdfRangoActivo();
  }

  /** Abre el dialog de personalización antes de generar. */
  async personalizarPdf(): Promise<void> {
    if (!this.rangoActivo || this.generandoReporte) return;
    const ref = this.dialog.open<ExportarPdfDialogComponent, ExportarPdfDialogData, ExportarPdfDialogResult>(
      ExportarPdfDialogComponent,
      {
        data: {
          totalRegistros: this.kpiTotalRegistros,
          rangoEtiqueta: `${this.formatearFechaLarga(this.rangoActivo.inicio)} — ${this.formatearFechaLarga(this.rangoActivo.fin)}`,
          hayTopAlumnos: this.topAlumnos.length > 0,
        },
        panelClass: 'pdf-dialog-panel',
      },
    );
    const result = await ref.afterClosed().toPromise();
    if (!result) return;
    await this.generarPdfRangoActivo(result.secciones);
  }

  /** Genera el PDF del rango activo, opcionalmente con secciones específicas. */
  private async generarPdfRangoActivo(secciones?: SeccionesReporte): Promise<void> {
    if (!this.rangoActivo) return;
    if (this.generandoReporte) return;
    this.generandoReporte = true;
    this.cdr.markForCheck();
    try {
      const todos = await this.databaseService.obtenerTodosLosRegistros();
      const horaFiltro = this.horaFiltro;
      const ini = this.rangoActivo.inicio.getTime();
      const fin = this.rangoActivo.fin.getTime();
      const delRango = todos.filter(r => {
        const d = new Date(r.fechaHora);
        const t = d.getTime();
        if (t < ini || t > fin) return false;
        if (horaFiltro) {
          const h = d.getHours();
          if (h < horaFiltro.desde || h > horaFiltro.hasta) return false;
        }
        return true;
      });
      if (delRango.length === 0) {
        this.toastService.warning('No hay registros en el rango activo');
        return;
      }
      const topParaReporte = this.calcularTopDelMes(delRango, 10);
      const { ReportService } = await import('../../core/services/report.service');
      const reportService = new ReportService(this.databaseService);
      const sufijo = horaFiltro ? ` (${this.formatHora(horaFiltro.desde)}–${this.formatHora(horaFiltro.hasta)})` : '';
      await reportService.generarReporteAccesos(delRango, {
        tipo: 'personalizado',
        titulo: `Dashboard ejecutivo — ${this.formatearFechaCorta(this.rangoActivo.inicio)} a ${this.formatearFechaCorta(this.rangoActivo.fin)}${sufijo}`,
        fechaInicio: this.rangoActivo.inicio,
        fechaFin: this.rangoActivo.fin,
        topAlumnos: topParaReporte,
        secciones,
      });
      this.toastService.success(`PDF generado (${delRango.length} registros)`);
    } catch (e) {
      console.error(e);
      this.toastService.error('No se pudo generar el PDF');
    } finally {
      this.generandoReporte = false;
      this.cdr.markForCheck();
    }
  }

  // ═══════════════════════════════════════════════
  // EXPORTAR TOP ALUMNOS
  // ═══════════════════════════════════════════════

  async exportarTopExcel(): Promise<void> {
    if (this.topAlumnos.length === 0) return;
    const registros = await this.obtenerRegistrosTopAlumnos();
    this.exportService.exportarRegistrosXLSX(
      registros,
      `top_alumnos_stenbrary_${new Date().toISOString().split('T')[0]}`
    );
    this.toastService.success('Excel exportado correctamente');
  }

  async exportarTopPDF(): Promise<void> {
    if (this.topAlumnos.length === 0) return;
    const { ReportService } = await import('../../core/services/report.service');
    const reportService = new ReportService(this.databaseService);
    const registros = await this.obtenerRegistrosTopAlumnos();
    const hoy = new Date();
    let inicio: Date;
    if (this.topPeriodo > 0) {
      inicio = this.estadisticasService.crearRangoUltimosDias(this.topPeriodo).inicio;
    } else {
      const fechas = registros.map(r => new Date(r.fechaHora).getTime());
      inicio = fechas.length > 0
        ? new Date(Math.min(...fechas))
        : new Date(hoy.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
    const topParaReporte = this.topAlumnos.map((t, i) => ({
      posicion: i + 1, matricula: t.alumno.matricula,
      nombreCompleto: this.obtenerNombreCompleto(t),
      carrera: t.alumno.carrera, totalVisitas: t.totalVisitas,
      ultimaVisita: t.ultimaVisita, motivoFrecuente: t.motivoFrecuente,
    }));
    await reportService.generarReporteAccesos(registros, {
      tipo: 'personalizado',
      titulo: 'Top 5 Alumnos Más Frecuentes',
      fechaInicio: inicio, fechaFin: hoy,
      topAlumnos: topParaReporte,
    });
    this.toastService.success('PDF exportado correctamente');
  }

  private async obtenerRegistrosTopAlumnos() {
    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    const matriculasTop = new Set(this.topAlumnos.map(t => t.alumno.matricula));
    let registros = todosRegistros.filter(r => matriculasTop.has(r.matricula));
    if (this.topPeriodo > 0) {
      const rango = this.estadisticasService.crearRangoUltimosDias(this.topPeriodo);
      const ini = rango.inicio.getTime();
      const fin = rango.fin.getTime();
      registros = registros.filter(r => {
        const t = new Date(r.fechaHora).getTime();
        return t >= ini && t <= fin;
      });
    }
    return registros.sort((a, b) =>
      new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
  }

  // ═══════════════════════════════════════════════
  // GRÁFICAS CHART.JS
  // ═══════════════════════════════════════════════

  private renderizarGraficas(): void {
    this.renderizarGraficaDiaria();
    this.renderizarGraficaMotivos();
    this.renderizarGraficaCarreras();
    this.primerRenderHecho = true;
  }

  /** Duración de animación: full en primer mount (600ms), 0 en re-renders. */
  private get animDuracion(): number {
    return this.primerRenderHecho ? 0 : 600;
  }

  private renderizarGraficaDiaria(): void {
    if (!this.chartDiarioRef || !this.datosDiarios) return;

    const domingoSet = new Set(this.diariosDomingoIdx);
    const cantidades = this.datosDiarios.cantidades;
    const bg = cantidades.map((_, i) =>
      domingoSet.has(i) ? 'rgba(240, 82, 82, 0.35)' : 'rgba(0, 200, 215, 0.6)');
    const border = cantidades.map((_, i) =>
      domingoSet.has(i) ? '#F05252' : '#00C8D7');

    // Tier S2 v3.17.0: update in-place si la chart ya existe
    if (this.chartDiario && this.primerRenderHecho) {
      this.chartDiario.data.labels = this.datosDiarios.etiquetas;
      this.chartDiario.data.datasets[0].data = cantidades;
      this.chartDiario.data.datasets[0].backgroundColor = bg;
      this.chartDiario.data.datasets[0].borderColor = border;
      this.chartDiario.update('none');
      return;
    }

    this.chartDiario?.destroy();
    this.chartDiario = null;
    const ctx = this.chartDiarioRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartDiario = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosDiarios.etiquetas,
        datasets: [{
          label: 'Registros', data: cantidades,
          backgroundColor: bg, borderColor: border,
          borderWidth: 2, borderRadius: 8, borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: this.animDuracion },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#142033', titleColor: '#E8F4F8', bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)', borderWidth: 1, cornerRadius: 10,
            padding: 12, displayColors: false,
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
              maxRotation: this.datosDiarios.granularidad === 'dia' && this.datosDiarios.etiquetas.length > 14 ? 45 : 0,
              autoSkip: true, maxTicksLimit: 18,
            },
          },
          y: {
            beginAtZero: true, grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: {
              color: 'rgba(200, 230, 240, 0.4)',
              font: { family: "'DM Sans', sans-serif", size: 11 }, stepSize: 1,
            },
          },
        },
        // Tier C18: click en barra → drill-down a /registros del día
        onClick: (_, elements) => {
          if (elements.length > 0 && this.datosDiarios?.granularidad === 'dia') {
            this.ngZone.run(() => this.drillDia(elements[0].index));
          }
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (target) target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        },
      },
    });
  }

  private renderizarGraficaMotivos(): void {
    if (!this.chartMotivosRef || !this.distribucionMotivos) return;

    if (this.distribucionMotivos.cantidades.length === 0) {
      this.chartMotivos?.destroy();
      this.chartMotivos = null;
      return;
    }

    // Tier S2: update in-place
    if (this.chartMotivos && this.primerRenderHecho) {
      this.chartMotivos.data.labels = this.distribucionMotivos.etiquetas;
      this.chartMotivos.data.datasets[0].data = this.distribucionMotivos.cantidades;
      this.chartMotivos.data.datasets[0].backgroundColor =
        this.distribucionMotivos.colores.map(c => c + 'CC');
      this.chartMotivos.data.datasets[0].borderColor = this.distribucionMotivos.colores;
      this.chartMotivos.update('none');
      return;
    }

    this.chartMotivos?.destroy();
    this.chartMotivos = null;
    const ctx = this.chartMotivosRef.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chartMotivos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.distribucionMotivos.etiquetas,
        datasets: [{
          data: this.distribucionMotivos.cantidades,
          backgroundColor: this.distribucionMotivos.colores.map(c => c + 'CC'),
          borderColor: this.distribucionMotivos.colores,
          borderWidth: 2, hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        animation: { duration: this.animDuracion },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'rgba(200, 230, 240, 0.7)',
              font: { family: "'DM Sans', sans-serif", size: 12 },
              padding: 16, usePointStyle: true, pointStyleWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: '#142033', titleColor: '#E8F4F8', bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)', borderWidth: 1, cornerRadius: 10, padding: 12,
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
    if (!this.chartCarrerasRef) return;

    if (this.datosCarreras.length === 0) {
      this.chartCarreras?.destroy();
      this.chartCarreras = null;
      return;
    }

    const etiquetas = this.datosCarreras.map(d => this.abreviarCarrera(d.carrera));
    const cantidades = this.datosCarreras.map(d => d.totalVisitas);
    const colores = ['#00C8D7', '#0BC4B7', '#0EB07B', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F5A623'];

    // Tier S2: update in-place
    if (this.chartCarreras && this.primerRenderHecho) {
      this.chartCarreras.data.labels = etiquetas;
      this.chartCarreras.data.datasets[0].data = cantidades;
      this.chartCarreras.data.datasets[0].backgroundColor =
        cantidades.map((_, i) => (colores[i % colores.length]) + '99');
      this.chartCarreras.data.datasets[0].borderColor =
        cantidades.map((_, i) => colores[i % colores.length]);
      this.chartCarreras.update('none');
      return;
    }

    this.chartCarreras?.destroy();
    this.chartCarreras = null;
    const ctx = this.chartCarrerasRef.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chartCarreras = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          label: 'Visitas totales', data: cantidades,
          backgroundColor: cantidades.map((_, i) => (colores[i % colores.length]) + '99'),
          borderColor: cantidades.map((_, i) => colores[i % colores.length]),
          borderWidth: 2, borderRadius: 8, borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        animation: { duration: this.animDuracion },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#142033', titleColor: '#E8F4F8', bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)', borderWidth: 1, cornerRadius: 10,
            padding: 12, displayColors: false,
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
            beginAtZero: true, grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: {
              color: 'rgba(200, 230, 240, 0.4)',
              font: { family: "'DM Sans', sans-serif", size: 11 }, stepSize: 1,
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

  private renderizarGraficasComparador(): void {
    if (!this.comparativa) return;
    this.renderizarDonutComparador('a', this.comparativa.a.motivos);
    this.renderizarDonutComparador('b', this.comparativa.b.motivos);
  }

  private renderizarDonutComparador(slot: 'a' | 'b', motivos: DistribucionMotivos): void {
    const ref = slot === 'a' ? this.chartCompararARef : this.chartCompararBRef;
    if (!ref) return;
    const chartActual = slot === 'a' ? this.chartCompararA : this.chartCompararB;
    chartActual?.destroy();
    if (slot === 'a') this.chartCompararA = null; else this.chartCompararB = null;
    if (motivos.cantidades.length === 0) return;
    const ctx = ref.nativeElement.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: motivos.etiquetas,
        datasets: [{
          data: motivos.cantidades,
          backgroundColor: motivos.colores.map(c => c + 'CC'),
          borderColor: motivos.colores, borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        animation: { duration: 400 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(200, 230, 240, 0.7)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
              padding: 10, usePointStyle: true, pointStyleWidth: 10, boxWidth: 10,
            },
          },
          tooltip: {
            backgroundColor: '#142033', titleColor: '#E8F4F8', bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)', borderWidth: 1, cornerRadius: 10, padding: 10,
          },
        },
      },
    });
    if (slot === 'a') this.chartCompararA = chart; else this.chartCompararB = chart;
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  /** Lectura O(1) desde la matriz pre-computada (antes era .find() O(n) por celda). */
  obtenerCantidadHeatmap(dia: string, hora: number): number {
    return this.heatmapMatriz[dia]?.[hora] ?? 0;
  }

  esClickeableHeatmap(dia: string, hora: number): boolean {
    return this.obtenerCantidadHeatmap(dia, hora) > 0;
  }

  /** Ancho amplificado de barras de combinaciones (para que se vean al ser %s pequeños). */
  anchoCombo(porcentaje: number): number {
    return Math.min(100, porcentaje * 4);
  }

  /** Tooltip de celda heatmap (precomputado para evitar `>` en template). */
  tooltipHeatmap(dia: string, hora: number): string {
    const cantidad = this.obtenerCantidadHeatmap(dia, hora);
    const pico = this.esPicoHeatmap(dia, hora);
    let txt = `${dia} ${this.formatHora(hora)} — ${cantidad} visitas`;
    if (pico) txt += ' · PICO DEL PERÍODO';
    if (cantidad > 0) txt += ' (clic para ver registros)';
    return txt;
  }

  obtenerClaseIntensidad(dia: string, hora: number): string {
    return this.heatmapClases[dia]?.[hora] ?? 'intensidad-0';
  }

  esPicoHeatmap(dia: string, hora: number): boolean {
    return this.heatmapPicoDia === dia && this.heatmapPicoHora === hora;
  }

  obtenerIconoTendencia(): string {
    if (!this.tendencia) return 'trending_flat';
    switch (this.tendencia.direccion) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  obtenerColorTendencia(): string {
    if (!this.tendencia) return 'neutral';
    switch (this.tendencia.direccion) {
      case 'up': return 'success';
      case 'down': return 'warning';
      default: return 'neutral';
    }
  }

  obtenerTextoTendencia(): string {
    if (!this.tendencia) return 'Sin cambios';
    const p = Math.abs(this.tendencia.porcentajeCambio).toFixed(1);
    if (this.tendencia.direccion === 'up') return `↑ ${p}% más que el período anterior`;
    if (this.tendencia.direccion === 'down') return `↓ ${p}% menos que el período anterior`;
    return 'Sin cambios significativos';
  }

  iconoComparativa(direccion: 'up' | 'down' | 'igual'): string {
    if (direccion === 'up') return 'trending_up';
    if (direccion === 'down') return 'trending_down';
    return 'trending_flat';
  }

  colorComparativa(direccion: 'up' | 'down' | 'igual'): string {
    if (direccion === 'up') return 'success';
    if (direccion === 'down') return 'warning';
    return 'neutral';
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  /** Formatea minutos a "1h 25m" o "45 min". */
  formatearDuracionMin(minutos: number): string {
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  /** Sparkline: convierte un array de números a un path SVG escalado a (w,h). */
  sparkPath(values: number[], w: number, h: number): string {
    if (values.length === 0) return '';
    const max = Math.max(...values, 1);
    const stepX = values.length > 1 ? w / (values.length - 1) : 0;
    return values.map((v, i) => {
      const x = i * stepX;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  /** Sparkline área: agrega cierre al baseline para usar como polígono fill. */
  sparkArea(values: number[], w: number, h: number): string {
    const path = this.sparkPath(values, w, h);
    if (!path) return '';
    return `0,${h} ${path} ${w},${h}`;
  }

  /** Tier A: marca columna (índice) como domingo en el bar chart diario. */
  esDomingoEnGrafica(idx: number): boolean {
    return this.diariosDomingoIdx.includes(idx);
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

  get alturaGraficaCarreras(): number {
    return Math.max(200, this.datosCarreras.length * 48);
  }

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
