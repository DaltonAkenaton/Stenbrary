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
import { FormulasInfoDialogComponent } from './formulas-info-dialog/formulas-info-dialog.component';
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
import {
  diaSemanaMasConcurrido,
  esInvitado,
  motivoMasFrecuente,
  promedioPorDiaConActividad,
  ProyeccionDia,
  resumirEstancia,
} from '../../core/utils/estadisticas.utils';
import { Motivo } from '../../core/models';
import { periodoActual, periodoAnterior, PeriodoResuelto } from '../../core/utils/calendario.utils';
import { desplazarDias, fechaLocalISO } from '../../core/utils/tiempo.utils';

Chart.register(...registerables);

type PresetRango = 'hoy' | 'ayer' | 'semana' | 'semana-pasada' | 'mes-actual' | 'mes-pasado' | 'ultimos7' | 'ultimos14' | 'ultimos30' | 'ultimos90' | 'anio' | 'anio-pasado' | 'periodo-actual' | 'periodo-anterior' | 'todo' | 'personalizado';

/** Enlaces viejos (?p=semestre-actual) siguen funcionando: ahora son periodos del calendario. */
const PRESETS_RENOMBRADOS: Record<string, PresetRango> = {
  'semestre-actual': 'periodo-actual',
  'semestre-pasado': 'periodo-anterior',
};

/** Pestañas del Dashboard Ejecutivo (v3.18.0). */
export type TabKey = 'resumen' | 'calor' | 'personas' | 'comparar' | 'reportes';

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
  // ─── Sistema de tabs (v3.18.0) ───────────────────
  // Solo se renderiza la pestaña activa → ~75% menos elementos pintados a la vez,
  // 1 chart canvas a la vez en lugar de 5+. Cambio entre tabs es instantáneo.
  tabActiva: TabKey = 'resumen';
  readonly tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'resumen',   label: 'Resumen',     icon: 'dashboard' },
    { key: 'calor',     label: 'Calor & ritmo', icon: 'local_fire_department' },
    { key: 'personas',  label: 'Personas',    icon: 'groups' },
    { key: 'comparar',  label: 'Comparar',    icon: 'compare_arrows' },
    { key: 'reportes',  label: 'Reportes',    icon: 'picture_as_pdf' },
  ];

  /** True solo en la PRIMERA carga (muestra skeletons). */
  cargando = true;
  /** True durante recargas posteriores (no oculta el contenido, solo overlay sutil). */
  recargando = false;

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


  // UI Pre-calculada para la tendencia
  tendenciaUI = { color: 'neutral', icono: 'trending_flat', texto: 'Sin cambios' };

  // Datos
  tendencia?: TendenciaComparativa;
  heatmapData: HeatmapData[] = [];
  heatmapHoras: number[] = [];
  heatmapRango: RangoFechas | null = null;
  heatmapFechasPorDia = new Map<string, Date[]>();
  /** Pre-computado: matriz [día][hora] → cantidad. Evita .find() en cada render. */
  heatmapMatriz: Record<string, Record<number, number>> = {};
  /** Pre-computado: matriz [día][hora] → clase de intensidad. */
  heatmapClases: Record<string, Record<number, string>> = {};
  /** Pre-computado: máximo del heatmap (no Math.max() en cada llamada). */
  heatmapMaximo = 0;
  /** Totales por fila (día) y por columna (hora) para mostrar al margen del heatmap. */
  heatmapTotalesPorDia: Record<string, number> = {};
  heatmapTotalesPorHora: Record<number, number> = {};
  heatmapTotalGeneral = 0;
  /** Cantidad de visitas en la celda valle (la mínima > 0 del heatmap). */
  heatmapValleCantidad: number | null = null;
  /** Día y hora del pico (para marcar con estrella). */
  heatmapPicoDia: string | null = null;
  heatmapPicoHora: number | null = null;
  /** Día/hora valle (mínimo dentro de horas con datos). */
  heatmapValleDia: string | null = null;
  heatmapValleHora: number | null = null;

  topAlumnos: (TopAlumno & { nombreCompletoStr?: string; ultimaVisitaStr?: string })[] = [];
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

  // ─── Pre-cómputo para el template (evita funciones en CD) ──
sparkRegistrosPoints = '';   // SVG polyline pre-calculado
sparkRegistrosArea = '';     // SVG polygon pre-calculado
/** Matriz flat para el @for del heatmap: evita 4 llamadas por celda */
heatmapFilas: {
  dia: string;
  etiqueta: string;
  totalDia: number;
  totalDiaTooltip: string;
  celdas: {
    hora: number;
    cantidad: number;
    clase: string;
    esPico: boolean;
    tooltip: string;
    clickeable: boolean;
  }[];
}[] = [];

formatHora(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  // ─── Métricas nuevas (Tier B) ────────────────────
  kpiTiempoEstanciaPromedio = 0; // minutos
  kpiTiempoEstanciaStr = '';
  /** Visitas con salida real que entraron en el promedio. */
  kpiVisitasMedidas = 0;
  /** Visitas con salida estimada por el sistema: excluidas del promedio (P3). */
  kpiVisitasEstimadas = 0;
  kpiTasaRetencion = 0; // % alumnos con ≥N visitas (N = umbralRetencion)
  kpiUmbralRetencion = 3;
  kpiCrecimiento12m: { mes: string; cantidad: number }[] = [];

  /** Datos enriquecidos por barra: altura, flags, MoM, tooltip ya calculados. */
  crecimiento12mBarras: {
    mes: string;
    cantidad: number;
    altura: number;
    esMejor: boolean;
    esPeor: boolean;
    esActual: boolean;
    cambioMoM: number | null; // null para el primer mes (no hay anterior)
    cambioMoMStr: string;
    tooltip: string;
  }[] = [];

  // ─── Resumen del crecimiento 12m ────────────────────
  crecimiento12mTotal = 0;
  crecimiento12mPromedio = 0;
  crecimiento12mMejorMes: { mes: string; cantidad: number } | null = null;
  crecimiento12mPeorMes: { mes: string; cantidad: number } | null = null;
  /** Tendencia trimestral: últimos 3 meses vs los 3 previos. */
  crecimiento12mTendencia: {
    porcentaje: number;
    direccion: 'up' | 'down' | 'igual';
    texto: string;
    color: 'success' | 'warning' | 'neutral';
    icono: string;
    rangoActual: string;   // "ene–mar 2026"
    rangoAnterior: string; // "oct–dic 2025"
  } | null = null;
  /** Frase tipo "Crecimiento sostenido", "Flujo estable", etc. */
  crecimiento12mAnalisis = '';
  kpiDistribucionTurnos: { turno: string; cantidad: number; porcentaje: number; color: string }[] = [];
  kpiTopMotivo: { nombre: string; cantidad: number; porcentaje: number } | null = null;
  kpiAlumnosUnaSolaVisita = 0;

  // ─── v3.17.0: nuevas métricas Tier B ─────────────
  kpiUltimoRegistroHace = ''; // "hace 23 minutos"
  kpiPctInvitados = 0;
  kpiCarreraTopCrecimiento: { carrera: string; cambio: number; porcentaje: number } | null = null;
  /** Proyección del total de hoy con el historial real (P8). null = no hay base. */
  kpiProyeccionHoy: ProyeccionDia | null = null;
  kpiDiaSemanaTop = '';
  kpiDistribucionGrado: { grado: number; cantidad: number; porcentaje: number }[] = [];
  kpiCombinacionesMotivos: { combo: string; cantidad: number; porcentaje: number; anchoStr?: string }[] = [];
  kpiVariacionDiaria = 0; // coeficiente de variación %

  // ─── KPIs fijos derivados ─────────────────────────
  kpiTotalRegistros = 0;
  kpiAlumnosUnicos = 0;
  kpiPromedioPorDia = 0;
  /** Días con al menos un registro: el divisor del promedio (P4). */
  kpiDiasConActividad = 0;
  /** Visitas de invitados del período (no entran en carreras/turnos/grados, P5). */
  kpiVisitasInvitados = 0;
  kpiHoraPico: HeatmapData | null = null;
  kpiAlumnosInactivos = 0;
  /** Alumnos del padrón sin ninguna visita (P1: se muestran aparte). */
  kpiNuncaVinieron = 0;
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
    { key: 'periodo-actual', label: 'Este periodo' },
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
  /** Pre-formateado para los <select> de hora — evita formatHora(h) por opción. */
  opcionesHoras: { v: number; label: string }[] =
    Array.from({ length: 24 }, (_, i) => ({ v: i, label: `${String(i).padStart(2, '0')}:00` }));

  // ─── Heatmap config (sub-filtro independiente) ────
  heatmapPeriodo = 30;
  /** Modo de selección: preset (botones) o personalizado (rango libre). */
  heatmapModo: 'preset' | 'personalizado' = 'preset';
  heatmapFechaInicio = '';
  heatmapFechaFin = '';
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
  /** Modo período: preset o personalizado (rango libre). */
  topPeriodoModo: 'preset' | 'personalizado' = 'preset';
  topFechaInicio = '';
  topFechaFin = '';
  /** Cantidad de alumnos a mostrar (input libre, no solo presets). */
  topLimite = 5;
  opcionesTopLimite = [5, 10, 25, 50, 100];
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
    { key: 'periodo-actual', label: 'Este periodo' },
    { key: 'periodo-anterior', label: 'Periodo anterior' },
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
    try {
      this.kpiUmbralInactividad = this.configService.umbralInactividadDias || 30;
      this.actualizarEtiquetasPeriodo();
      this.leerUrlParams();
      // La caché del servicio sobrevive a la navegación y no ve lo que
      // escribió otra pestaña (quiosco abierto aparte): al entrar, datos frescos.
      this.estadisticasService.invalidarCache();
      const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
      for (const a of todosAlumnos) {
        if (a.turno) this.turnoPorMatricula.set(a.matricula, a.turno);
        if (typeof a.grado === 'number') this.gradoPorMatricula.set(a.matricula, a.grado);
      }
      // Carga inicial directa (sin debounce, no hay clicks que coalescer).
      await this.cargarDatosInterno();
      await this.cargarCrecimiento12m();
      // Deeplink ?tab=comparar: poblar la comparativa también al entrar.
      if (this.tabActiva === 'comparar' && !this.comparativa) {
        this.compararAhora();
      }
      this.cdr.markForCheck();
    } catch (err) {
      // Sin este catch, un fallo de IndexedDB (incógnito, almacenamiento
      // bloqueado, cuota llena) dejaba la pantalla con cargando=true para
      // siempre. El banner global de bdError ya alerta al usuario; aquí solo
      // reseteamos los flags para mostrar el estado vacío.
      console.error('Error al inicializar dashboard ejecutivo:', err);
      this.cargando = false;
      this.recargando = false;
      this.toastService.error('No se pudieron cargar las estadísticas');
      this.cdr.markForCheck();
    }
  }

  ngAfterViewInit(): void {
    if (this.datosListos) {
      requestAnimationFrame(() => requestAnimationFrame(() => this.renderizarGraficas()));
    }
    this.esMovilActual = this.esMovilViewport();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.chartDiario?.destroy();
    this.chartMotivos?.destroy();
    this.chartCarreras?.destroy();
    this.chartCompararA?.destroy();
    this.chartCompararB?.destroy();
  }

  /**
   * Al volver a esta pestaña (p. ej. tras escanear en el quiosco abierto en
   * otra), lo que se ve puede estar atrasado: se relee sin pedirlo.
   */
  private onVisibilityChange = (): void => {
    if (document.hidden || !this.datosListos) return;
    this.estadisticasService.invalidarCache();
    void this.cargarDatos();
    void this.cargarCrecimiento12m().then(() => this.cdr.markForCheck());
  };

  /** Estado actual del breakpoint móvil; se re-evalúa en resize. */
  private esMovilActual = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  /** True si el viewport está en modo móvil (sparkline). */
  private esMovilViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 480;
  }

  /** Si cruzamos el threshold de 480px, hay que recrear el chart diario
   *  (de bar a line o viceversa). Debounce para evitar trabajo durante
   *  arrastres continuos del borde de la ventana. */
  private onResize = (): void => {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      const movilAhora = this.esMovilViewport();
      if (movilAhora !== this.esMovilActual) {
        this.esMovilActual = movilAhora;
        if (this.datosListos && this.tabActiva === 'resumen') {
          this.ngZone.runOutsideAngular(() => this.renderizarGraficaDiaria());
        }
        this.cdr.markForCheck();
      }
    }, 200);
  };

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

      // Periodos del calendario escolar (Configuración → Calendario escolar).
      // Antes era "semestre" fijo ene–jun / jul–dic, que no corresponde a la
      // UAT (Primavera, Verano, Otoño). Sin periodos capturados, cae a "este
      // mes" y lo avisa en vez de inventar fechas.
      case 'periodo-actual': {
        const p = periodoActual(this.configService.calendarioEscolar, hoy);
        return p ? this.rangoDePeriodoResuelto(p) : this.sinCalendario();
      }

      case 'periodo-anterior': {
        const cal = this.configService.calendarioEscolar;
        const actual = periodoActual(cal, hoy);
        const anterior = actual ? periodoAnterior(cal, actual.periodo) : null;
        return anterior ? this.rangoDePeriodoResuelto(anterior) : this.sinCalendario();
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

  private rangoDePeriodoResuelto(p: PeriodoResuelto): RangoFechas {
    return { inicio: p.rango.inicio, fin: p.rango.fin };
  }

  /** Sin periodo que mostrar: "este mes" y un aviso con la salida. */
  private sinCalendario(): RangoFechas {
    this.toastService.warning(
      'No hay un periodo capturado para esa fecha. Mostrando este mes. ' +
      'Captúralo en Configuración → Calendario escolar.',
    );
    return this.estadisticasService.crearRangoMesActual();
  }

  /** Pone el nombre real en los botones: "Este periodo (Otoño 2026)". */
  private actualizarEtiquetasPeriodo(): void {
    const cal = this.configService.calendarioEscolar;
    const actual = periodoActual(cal);
    const anterior = actual ? periodoAnterior(cal, actual.periodo) : null;
    const etiquetaActual = actual
      ? `Este periodo (${actual.periodo.nombre}${actual.terminado ? ', terminado' : ''})`
      : 'Este periodo';
    const etiquetaAnterior = anterior ? `Periodo anterior (${anterior.periodo.nombre})` : 'Periodo anterior';
    for (const lista of [this.opcionesPreset, this.opcionesComparador]) {
      for (const op of lista) {
        if (op.key === 'periodo-actual') op.label = etiquetaActual;
        if (op.key === 'periodo-anterior') op.label = etiquetaAnterior;
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

  formatearHoraMin(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  formatearFechaCorta(d: Date): string {
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  /** "ene–mar 2026" o "dic 2025 – feb 2026" si cruzan año. */
  private formatearRangoMeses(inicio: Date, fin: Date): string {
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const mi = meses[inicio.getMonth()];
    const mf = meses[fin.getMonth()];
    const yi = inicio.getFullYear();
    const yf = fin.getFullYear();
    if (yi === yf) {
      return mi === mf ? `${mi} ${yf}` : `${mi}–${mf} ${yf}`;
    }
    return `${mi} ${yi} – ${mf} ${yf}`;
  }

  // LABELS DINÁMICOS ESTÁTICOS
  labelRangoActivo = '';
  labelRangoComparativo = '';
  labelMesPrincipal = '';
  labelFiltroHora = '';
  labelRegistrosDiarios = '';
  labelTendencia = '';
  labelHeatmap = '';
  sublabelHeatmap = '';
  labelTopAlumnos = '';
  
  // (Mantén tus funciones formatearFechaLarga y etiquetaDia normales, esas están bien)


  kpiHoraPicoStr = '';
  comparativaUI: any = null;


  etiquetaDia(dia: string): string {
    const fechas = this.heatmapFechasPorDia.get(dia);
    if (!fechas || fechas.length !== 1) return dia;
    const f = fechas[0];
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${dia} ${f.getDate()} ${meses[f.getMonth()]}`;
  }


  // ═══════════════════════════════════════════════
  // HANDLERS DE FILTROS
  // ═══════════════════════════════════════════════

  /** Tier C22: refresca explícitamente desde la BD. */
  async refrescarDatos(): Promise<void> {
    this.estadisticasService.invalidarCache();
    await Promise.all([this.cargarDatos(), this.cargarCrecimiento12m()]);
    this.cdr.markForCheck();
    this.toastService.success('Datos actualizados');
  }

  /** Click en celda del heatmap → /registros filtrado por TODAS las fechas
   *  de ese día de la semana dentro del período + la hora exacta. */
  drillHeatmap(dia: string, hora: number): void {
    if (this.obtenerCantidadHeatmap(dia, hora) === 0) return;
    const fechas = this.heatmapFechasPorDia.get(dia) || [];
    if (fechas.length === 0) return;
    // Mandamos rango completo del heatmap (desde primera fecha del DOW hasta
    // la última) + dow + hora exacta. /registros filtra por DOW además del rango.
    const desde = this.toIsoDate(fechas[0]);
    const hasta = this.toIsoDate(fechas[fechas.length - 1]);
    const dow = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      .indexOf(dia);
    this.router.navigate(['/registros'], {
      queryParams: {
        desde,
        hasta,
        dow,
        hora,
      },
    });
  }

  /** Click en el "Total" del día (fila): /registros filtrado por DOW completo. */
  drillTotalDia(dia: string): void {
    const total = this.heatmapTotalesPorDia[dia] ?? 0;
    if (total === 0) return;
    const fechas = this.heatmapFechasPorDia.get(dia) || [];
    if (fechas.length === 0) return;
    const dow = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      .indexOf(dia);
    this.router.navigate(['/registros'], {
      queryParams: {
        desde: this.toIsoDate(fechas[0]),
        hasta: this.toIsoDate(fechas[fechas.length - 1]),
        dow,
      },
    });
  }

  /** Click en el "Total" de la hora (columna): /registros filtrado por hora
   *  exacta dentro del rango completo del heatmap. */
  drillTotalHora(hora: number): void {
    const total = this.heatmapTotalesPorHora[hora] ?? 0;
    if (total === 0 || !this.heatmapRango) return;
    this.router.navigate(['/registros'], {
      queryParams: {
        desde: this.toIsoDate(this.heatmapRango.inicio),
        hasta: this.toIsoDate(this.heatmapRango.fin),
        hora,
      },
    });
  }

  private toIsoDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

  /** Pico (máximo) del rango actual — para encabezado sparkline móvil. */
  get picoDiarioInfo(): { valor: number; etiqueta: string } | null {
    if (!this.datosDiarios || this.datosDiarios.cantidades.length === 0) return null;
    const max = Math.max(...this.datosDiarios.cantidades);
    const idx = this.datosDiarios.cantidades.indexOf(max);
    return { valor: max, etiqueta: this.datosDiarios.etiquetas[idx] };
  }

  /** Último bucket (día/semana/mes más reciente) — encabezado sparkline móvil. */
  get ultimoDiarioInfo(): { valor: number; etiqueta: string } | null {
    if (!this.datosDiarios || this.datosDiarios.cantidades.length === 0) return null;
    const n = this.datosDiarios.cantidades.length;
    return {
      valor: this.datosDiarios.cantidades[n - 1],
      etiqueta: this.datosDiarios.etiquetas[n - 1],
    };
  }

  /** Rango compacto "12 abr — 11 may" para el footer del sparkline móvil. */
  get labelRangoSparkline(): string {
    if (!this.rangoActivo) return '';
    return `${this.formatearFechaCorta(this.rangoActivo.inicio)} — ${this.formatearFechaCorta(this.rangoActivo.fin)}`;
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
      return 'Gráfica de motivos sin datos';
    // % de visitas que incluyeron cada motivo (P2), no del total de marcas.
    const total = this.distribucionMotivos.totalVisitas || 1;
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
        this.fechaFin = fechaLocalISO(hoy);
        this.fechaInicio = fechaLocalISO(hace30);
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
    const params: any = { p: this.presetSeleccionado, tab: this.tabActiva };
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
    const p = qp.get('p');
    if (p) this.presetSeleccionado = PRESETS_RENOMBRADOS[p] ?? (p as PresetRango);
    const ini = qp.get('ini'); if (ini) this.fechaInicio = ini;
    const fin = qp.get('fin'); if (fin) this.fechaFin = fin;
    const hd = qp.get('hd'); const hh = qp.get('hh');
    if (hd !== null && hh !== null) {
      this.filtroHoraActivo = true;
      this.filtroHoraDesde = +hd;
      this.filtroHoraHasta = +hh;
    }
    const tab = qp.get('tab') as TabKey | null;
    if (tab && this.tabs.some(t => t.key === tab)) this.tabActiva = tab;
  }

  /**
   * Cambia de pestaña. NO recarga datos — solo cambia visibilidad.
   * Re-renderiza las gráficas de la pestaña destino tras el render
   * (los charts necesitan que su canvas esté en el DOM).
   */
  setTab(tab: TabKey): void {
    if (tab === this.tabActiva) return;

    // Destruir charts de la tab que estamos abandonando — sus <canvas>
    // dejan de existir en el DOM al cambiar el @if y la instancia queda
    // apuntando a un canvas huérfano (esto causaba que las gráficas no
    // se pintaran al volver). Esto también libera memoria.
    this.destruirChartsDeTab(this.tabActiva);

    this.tabActiva = tab;
    this.actualizarUrl();
    this.cdr.markForCheck();

    // Si entran a la pestaña Comparar y aún no hay datos, dispararla.
    // (Antes solo se calculaba al cambiar un preset → si entrabas con A/B
    // ya seteados por defecto, la pantalla se quedaba vacía.)
    if (tab === 'comparar' && !this.comparativa && !this.cargandoComparativa) {
      this.compararAhora();
    }

    // Doble RAF garantiza que Angular pintó el DOM y el navegador hizo
    // layout antes de que Chart.js intente medir el canvas.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.ngZone.runOutsideAngular(() => {
        this.renderizarGraficasDeTab(tab);
      });
    }));
  }

  private destruirChartsDeTab(tab: TabKey): void {
    if (tab === 'resumen') {
      this.chartDiario?.destroy(); this.chartDiario = null;
      this.chartMotivos?.destroy(); this.chartMotivos = null;
    } else if (tab === 'personas') {
      this.chartCarreras?.destroy(); this.chartCarreras = null;
    } else if (tab === 'comparar') {
      this.chartCompararA?.destroy(); this.chartCompararA = null;
      this.chartCompararB?.destroy(); this.chartCompararB = null;
    }
  }

  private renderizarGraficasDeTab(tab: TabKey): void {
    if (tab === 'resumen') {
      this.renderizarGraficaDiaria();
      this.renderizarGraficaMotivos();
    } else if (tab === 'personas') {
      this.renderizarGraficaCarreras();
    } else if (tab === 'comparar') {
      this.renderizarGraficasComparador();
    }
  }

  get fechaMaxima(): string {
    return fechaLocalISO();
  }

  // ─── Heatmap período ─────────────────────────────
  setHeatmapPeriodo(dias: number): void {
    this.heatmapPeriodo = dias;
    this.heatmapModo = 'preset';
    this.cargarHeatmap();
  }

  /** Activa el modo personalizado del heatmap. Si no hay fechas, prepopula. */
  activarHeatmapPersonalizado(): void {
    this.heatmapModo = 'personalizado';
    if (!this.heatmapFechaInicio || !this.heatmapFechaFin) {
      const hoy = new Date();
      const hace30 = new Date(hoy);
      hace30.setDate(hoy.getDate() - 30);
      this.heatmapFechaFin = fechaLocalISO(hoy);
      this.heatmapFechaInicio = fechaLocalISO(hace30);
    }
    this.cdr.markForCheck();
  }

  /** Aplica el rango personalizado del heatmap. */
  aplicarHeatmapPersonalizado(): void {
    if (!this.heatmapFechaInicio || !this.heatmapFechaFin) {
      this.toastService.warning('Selecciona ambas fechas');
      return;
    }
    if (new Date(this.heatmapFechaInicio) > new Date(this.heatmapFechaFin)) {
      this.toastService.warning('La fecha de inicio debe ser anterior a la de fin');
      return;
    }
    this.cargarHeatmap();
  }

  private async cargarHeatmap(): Promise<void> {
    // v3.18.3: NO invalidar cache aquí — solo cambia el período del heatmap,
    // los registros base son los mismos. Antes esto forzaba re-leer TODA la
    // BD por cada cambio de período del heatmap (lag visible).
    const rangoCustom = this.rangoHeatmapPersonalizado();
    const resultado = await this.estadisticasService.generarHeatmap(
      this.heatmapPeriodo, rangoCustom);
    this.aplicarHeatmap(resultado);
    // Reusar el resultado en vez de re-pedir el heatmap (evita doble query).
    this.diaPredicho = this.estadisticasService.predecirDiaOcupadoDesde(resultado);
    this.actualizarLabelsHeatmap();
    this.cdr.markForCheck();
  }

  /** Devuelve el rango personalizado del heatmap o undefined si está en preset. */
  private rangoHeatmapPersonalizado(): RangoFechas | undefined {
    if (this.heatmapModo !== 'personalizado') return undefined;
    if (!this.heatmapFechaInicio || !this.heatmapFechaFin) return undefined;
    return this.estadisticasService.normalizarRango(
      new Date(this.heatmapFechaInicio + 'T00:00:00'),
      new Date(this.heatmapFechaFin + 'T00:00:00'),
    );
  }

  /** Actualiza los labels visibles del heatmap (título y fecha bajo el título). */
  private actualizarLabelsHeatmap(): void {
    if (this.heatmapModo === 'personalizado' && this.heatmapRango) {
      this.labelHeatmap = `Mapa de calor — Rango personalizado`;
    } else {
      const opHeatmap = this.opcionesHeatmap.find(o => o.dias === this.heatmapPeriodo);
      this.labelHeatmap = `Mapa de calor — ${opHeatmap?.label || this.heatmapPeriodo + ' días'}`;
    }
    this.sublabelHeatmap = this.heatmapRango
      ? `${this.formatearFechaLarga(this.heatmapRango.inicio)} — ${this.formatearFechaLarga(this.heatmapRango.fin)}`
      : '';
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

    // Tier A7: usar PERCENTILES (p25, p50, p75) en vez de % de máximo.
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

    const clases: Record<string, Record<number, string>> = {};
    for (const dia of this.diasSemana) {
      clases[dia] = {};
      for (const hora of this.heatmapHoras) {
        clases[dia][hora] = this.calcularClaseIntensidadPercentil(
          matriz[dia][hora], p25, p50, p75,
        );
      }
    }

    // Totales por fila (día), por columna (hora) y total general.
    const totalesDia: Record<string, number> = {};
    const totalesHora: Record<number, number> = {};
    let totalGeneral = 0;
    for (const dia of this.diasSemana) {
      let sumDia = 0;
      for (const hora of this.heatmapHoras) {
        const v = matriz[dia][hora];
        sumDia += v;
        totalesHora[hora] = (totalesHora[hora] || 0) + v;
      }
      totalesDia[dia] = sumDia;
      totalGeneral += sumDia;
    }

    this.heatmapMatriz = matriz;
    this.heatmapClases = clases;
    this.heatmapMaximo = maximo;
    this.heatmapPicoDia = picoCantidad > 0 ? picoDia : null;
    this.heatmapPicoHora = picoCantidad > 0 ? picoHora : null;
    this.heatmapValleDia = isFinite(valleCantidad) ? valleDia : null;
    this.heatmapValleHora = isFinite(valleCantidad) ? valleHora : null;
    this.heatmapValleCantidad = isFinite(valleCantidad) ? valleCantidad : null;
    this.heatmapTotalesPorDia = totalesDia;
    this.heatmapTotalesPorHora = totalesHora;
    this.heatmapTotalGeneral = totalGeneral;

    // CRÍTICO: la matriz/clases deben estar asignadas ANTES de pre-computar
    // las filas — antes esto se llamaba dentro del for de arriba leyendo
    // `this.heatmapMatriz` viejo (o {}) → todas las celdas salían en 0.
    this.precalcularFilasHeatmap();
  }

  // Cinco niveles (0 a 4) salen de tres umbrales más el cero: p90 sobraba y
  // no se consultaba, todo lo que pasa de p75 cae en `intensidad-4`.
  private calcularClaseIntensidadPercentil(
    cantidad: number, p25: number, p50: number, p75: number,
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
    this.topPeriodoModo = 'preset';
    this.cargarTopAlumnos();
  }

  /** Activa el modo personalizado del top alumnos (rango libre). */
  activarTopPersonalizado(): void {
    this.topPeriodoModo = 'personalizado';
    if (!this.topFechaInicio || !this.topFechaFin) {
      const hoy = new Date();
      const hace90 = new Date(hoy);
      hace90.setDate(hoy.getDate() - 90);
      this.topFechaFin = fechaLocalISO(hoy);
      this.topFechaInicio = fechaLocalISO(hace90);
    }
    this.cdr.markForCheck();
  }

  aplicarTopPersonalizado(): void {
    if (!this.topFechaInicio || !this.topFechaFin) {
      this.toastService.warning('Selecciona ambas fechas');
      return;
    }
    if (new Date(this.topFechaInicio) > new Date(this.topFechaFin)) {
      this.toastService.warning('La fecha de inicio debe ser anterior a la de fin');
      return;
    }
    this.cargarTopAlumnos();
  }

  /** Aplica el cambio de límite (cantidad de alumnos a mostrar). */
  setTopLimite(n: number): void {
    const limite = Math.max(1, Math.min(1000, Math.floor(n || 5)));
    if (limite !== this.topLimite) {
      this.topLimite = limite;
      this.cargarTopAlumnos();
    }
  }

  private async cargarTopAlumnos(): Promise<void> {
    const rangoCustom = this.rangoTopPersonalizado();
    const top = await this.estadisticasService.obtenerTopAlumnos(
      this.topLimite,
      rangoCustom ? undefined : (this.topPeriodo || undefined),
      rangoCustom,
    );

    this.topAlumnos = top.map(item => ({
      ...item,
      nombreCompletoStr: this.obtenerNombreCompleto(item),
      ultimaVisitaStr: this.formatearFecha(item.ultimaVisita)
    }));

    this.actualizarLabelTopAlumnos();
    this.cdr.markForCheck();
  }

  private rangoTopPersonalizado(): RangoFechas | undefined {
    if (this.topPeriodoModo !== 'personalizado') return undefined;
    if (!this.topFechaInicio || !this.topFechaFin) return undefined;
    return this.estadisticasService.normalizarRango(
      new Date(this.topFechaInicio + 'T00:00:00'),
      new Date(this.topFechaFin + 'T00:00:00'),
    );
  }

  private actualizarLabelTopAlumnos(): void {
    const cantidad = `Top ${this.topLimite}`;
    if (this.topPeriodoModo === 'personalizado' && this.topFechaInicio && this.topFechaFin) {
      const fi = this.formatearFechaCorta(new Date(this.topFechaInicio + 'T00:00:00'));
      const ff = this.formatearFechaCorta(new Date(this.topFechaFin + 'T00:00:00'));
      this.labelTopAlumnos = `${cantidad} alumnos — ${fi} a ${ff}`;
      return;
    }
    this.labelTopAlumnos = this.topPeriodo === 0
      ? `${cantidad} alumnos — Histórico completo`
      : `${cantidad} alumnos — ${this.opcionesTopPeriodo.find(o => o.dias === this.topPeriodo)?.label || this.topPeriodo + ' días'}`;
  }

  // ═══════════════════════════════════════════════
  // CARGA PRINCIPAL
  // ═══════════════════════════════════════════════

  /**
   * Wrapper público con debounce: agrupa clicks rápidos en una sola carga.
   * v3.18.5 fix: antes 5 clicks en 200ms disparaban 5 cargarDatos paralelos
   * que se serializaban en IndexedDB acumulando latencia (>2s). Ahora solo
   * la última gana y se ejecuta tras 80ms de inactividad.
   */
  private _debounceTimer: any = null;
  private _cargaSeq = 0;

  cargarDatos(): Promise<void> {
    return new Promise((resolve) => {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._debounceTimer = null;
        this.cargarDatosInterno().then(resolve);
      }, 80);
    });
  }

  private async cargarDatosInterno(): Promise<void> {
    const mySeq = ++this._cargaSeq;
    const T0 = performance.now();
    // Helper: si llegó otra carga después de esta, abortar silenciosamente
    const cancelado = () => mySeq !== this._cargaSeq;
    try {
      // Solo mostrar skeletons en la PRIMERA carga; en recargas usar overlay.
      if (!this.datosListos) {
        this.cargando = true;
      } else {
        this.recargando = true;
      }
      this.cdr.markForCheck();

      const rango = await Promise.resolve(this.resolverRango(this.presetSeleccionado));
      this.rangoActivo = rango;
      const horaFiltro = this.horaFiltro;

      const TQ = performance.now();
      // Tier S3 v3.17.0: una sola lectura del cache + las queries que dependen
      // de OTROS rangos (heatmap, top, predicción) van en paralelo.
      // v3.18.6: predecirDiaOcupado() reconstruía el heatmap internamente
      // (trabajo duplicado en paralelo). Ahora derivamos la predicción del
      // mismo heatmap que ya cargamos.
      const rangoHeatmapCustom = this.rangoHeatmapPersonalizado();
      const rangoTopCustom = this.rangoTopPersonalizado();
      const [registrosCrudos, heatmap, top] = await Promise.all([
        this.estadisticasService.obtenerRegistrosCrudos(rango, horaFiltro),
        this.estadisticasService.generarHeatmap(this.heatmapPeriodo, rangoHeatmapCustom),
        this.estadisticasService.obtenerTopAlumnos(
          this.topLimite,
          rangoTopCustom ? undefined : (this.topPeriodo || undefined),
          rangoTopCustom,
        ),
      ]);
      const prediccion = this.estadisticasService.predecirDiaOcupadoDesde(heatmap);
      const TQ1 = performance.now();
      console.log(`⏱ [stats] queries fase 1: ${(TQ1 - TQ).toFixed(0)}ms (${registrosCrudos.length} registros)`);
      if (cancelado()) { console.log('🛑 carga obsoleta (clicks rápidos), abortando'); return; }

      const TQ2a = performance.now();
      // Las métricas del rango se derivan del array ya filtrado (rápido, en JS).
      const [tendencia, insights, diarios, motivos, carreras] = await Promise.all([
        this.estadisticasService.compararTendencias(rango, horaFiltro),
        this.estadisticasService.generarInsights(rango, horaFiltro, this.kpiUmbralInactividad),
        this.estadisticasService.obtenerRegistrosPorRango(rango, horaFiltro),
        this.estadisticasService.obtenerDistribucionMotivos(rango, horaFiltro),
        this.estadisticasService.analizarPorCarrera(rango, horaFiltro),
      ]);
      console.log(`⏱ [stats] queries fase 2: ${(performance.now() - TQ2a).toFixed(0)}ms`);
      if (cancelado()) return;

      this.tendencia = tendencia;

      this.tendenciaUI = {
        color: this.obtenerColorTendencia(),
        icono: this.obtenerIconoTendencia(),
        texto: this.obtenerTextoTendencia()
      };

      this.aplicarHeatmap(heatmap);
      // BUGFIX: antes asignaba `top` crudo (sin nombreCompletoStr/ultimaVisitaStr)
      // → en la primera carga y al cambiar el rango global, el top alumnos
      // mostraba el <h3> vacío hasta que el usuario tocaba un chip de período.
      this.topAlumnos = top.map(item => ({
        ...item,
        nombreCompletoStr: this.obtenerNombreCompleto(item),
        ultimaVisitaStr: this.formatearFecha(item.ultimaVisita),
      }));
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
      // P4: entre los días que abrió y hubo registros, no entre días naturales.
      const promedio = promedioPorDiaConActividad(registrosCrudos);
      this.kpiPromedioPorDia = promedio.promedio;
      this.kpiDiasConActividad = promedio.dias;
      this.kpiHoraPico = this.estadisticasService.calcularHoraPicoEnRango(registrosCrudos);
      this.kpiHoraPicoStr = this.kpiHoraPico 
        ? `${this.kpiHoraPico.dia} ${this.formatHora(this.kpiHoraPico.hora)}` 
        : '';

      // Alumnos inactivos: el servicio ya no emite un insight con la cantidad
      // (solo lo emite cuando >30% del padrón está inactivo, con otro título).
      // Llamar al método dedicado que cuenta directamente.
      // P1: la misma definición que la página /inactivos.
      const inactividad = await this.estadisticasService.contarInactividad(this.kpiUmbralInactividad);
      this.kpiAlumnosInactivos = inactividad.inactivos;
      this.kpiNuncaVinieron = inactividad.nuncaVinieron;

      const TM = performance.now();
      // ─── TIER B: métricas avanzadas (rango actual) ──
      this.calcularMetricasAvanzadas(registrosCrudos, rango);
      this.calcularSparklines(registrosCrudos, rango);
      this.calcularDistribucionGrado(registrosCrudos);
      this.calcularCombinacionesMotivos(registrosCrudos);
      this.calcularVariacionDiaria(diarios);
      this.calcularDiaSemanaTop(registrosCrudos);
      this.calcularPctInvitados(registrosCrudos);
      await this.calcularPrediccionHoy();
      // diariosDomingoIdx (Tier A: tinte de domingos en barras diarias)
      this.diariosDomingoIdx = this.calcularDomingosDelGrafico(rango, diarios);




//  NUEVO: Pre-calcular todos los textos dinámicos una sola vez
      const fi = this.formatearFechaLarga(this.rangoActivo.inicio);
      const ff = this.formatearFechaLarga(this.rangoActivo.fin);
      this.labelRangoActivo = `Del ${fi} al ${ff} · ${dias} ${dias === 1 ? 'día' : 'días'}`;
      this.labelRangoComparativo = this.tendencia?.rangoAnterior
        ? `Comparado contra: del ${this.formatearFechaCorta(this.tendencia.rangoAnterior.inicio)} al ${this.formatearFechaCorta(this.tendencia.rangoAnterior.fin)}` +
          // P6: el período actual va a medias; el anterior se cortó a la misma altura.
          (this.tendencia.alMismoAvance ? ` hasta las ${this.formatearHoraMin(this.tendencia.rangoAnterior.fin)} (al mismo avance)` : '')
        : '';
      this.labelMesPrincipal = (this.rangoActivo.inicio.getFullYear() === this.rangoActivo.fin.getFullYear() && this.rangoActivo.inicio.getMonth() === this.rangoActivo.fin.getMonth()) ? `${this.nombresMes[this.rangoActivo.inicio.getMonth()]} ${this.rangoActivo.inicio.getFullYear()}` : '';
      this.labelFiltroHora = this.filtroHoraActivo ? `Solo ${this.formatHora(this.filtroHoraDesde)}–${this.formatHora(this.filtroHoraHasta)}` : '';
      const g = this.datosDiarios?.granularidad;
      this.labelRegistrosDiarios = `Registros ${g === 'mes' ? 'por mes' : g === 'semana' ? 'por semana' : 'por día'}`;
      this.labelTendencia = dias <= 14 ? 'Tendencia semanal' : dias <= 90 ? 'Tendencia del período' : 'Tendencia anual';
      this.actualizarLabelsHeatmap();
      this.actualizarLabelTopAlumnos();


      console.log(`⏱ [stats] cálculos JS: ${(performance.now() - TM).toFixed(0)}ms`);

      this.cargando = false;
      this.recargando = false;
      this.datosListos = true;
      this.cdr.markForCheck();

      // Métricas que requieren histórico completo se calculan async DESPUÉS
      // de mostrar los datos del rango (no bloquean la 1ª pintura).
      // Diferimos al siguiente tick para liberar el hilo principal.
      requestAnimationFrame(() => {
        this.calcularMetricasGlobales(rango, horaFiltro);
      });

      await this.construirMesesDisponibles();
      // Doble RAF garantiza que Angular ya pintó el DOM (los @if y los canvas)
      // antes de que Chart.js intente pintar.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const TR = performance.now();
        this.renderizarGraficas();
        console.log(`⏱ [stats] render charts: ${(performance.now() - TR).toFixed(0)}ms · TOTAL: ${(performance.now() - T0).toFixed(0)}ms`);
      }));
    } catch (error) {
      console.error('❌ Error al cargar estadísticas avanzadas:', error);
      this.cargando = false;
      this.recargando = false;
      this.cdr.markForCheck();
    }
  }

  /** Cache de matrícula → turno para fallback de registros viejos sin r.turno. */
  private turnoPorMatricula = new Map<string, string>();

  /** Tier B: tiempo estancia, retención, distribución turnos, top motivo, una sola visita, crecimiento 12m. */
  private calcularMetricasAvanzadas(registros: any[], rango: RangoFechas): void {
    // Tiempo de estancia: solo salidas reales. Las que estimó el sistema
    // (cierre por tiempo u horario) son una suposición y no cuentan (P3).
    const estancia = resumirEstancia(registros);
    this.kpiTiempoEstanciaPromedio = estancia.promedioMinutos;
    this.kpiVisitasMedidas = estancia.visitasMedidas;
    this.kpiVisitasEstimadas = estancia.visitasEstimadas;
    this.kpiTiempoEstanciaStr = this.formatearDuracionMin(this.kpiTiempoEstanciaPromedio);
    
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
    // P5: los invitados no son alumnos y no tienen turno.
    const turnos = new Map<string, number>();
    let totalTurnos = 0;
    for (const r of registros) {
      if (esInvitado(r)) continue;
      const t = r.turno || this.turnoPorMatricula.get(r.matricula) || 'Sin turno';
      turnos.set(t, (turnos.get(t) || 0) + 1);
      totalTurnos++;
    }
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

    // Top motivo del período. P2: cuenta todos los motivos de cada visita,
    // y el % se lee como "% de visitas que lo incluyeron".
    const top = this.distribucionMotivos;
    this.kpiTopMotivo = top && top.cantidades.length > 0 ? {
      nombre: top.etiquetas[0],
      cantidad: top.cantidades[0],
      porcentaje: top.totalVisitas > 0
        ? parseFloat((top.cantidades[0] / top.totalVisitas * 100).toFixed(1)) : 0,
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

    // El mes en curso va a medias: su cambio se mide contra el mes anterior
    // hasta el mismo día y hora, no contra el mes completo (P6). Antes salía
    // "−80 %" y "MES MÁS BAJO" en cuanto empezaba un mes.
    const finComparable = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
    finComparable.setDate(Math.min(hoy.getDate(), ultimoDiaMesAnterior));
    finComparable.setHours(hoy.getHours(), hoy.getMinutes(), hoy.getSeconds(), 999);
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).getTime();
    this.mesAnteriorAlMismoDia = todos.filter(r => {
      const t = new Date(r.fechaHora).getTime();
      return t >= inicioMesAnterior && t <= finComparable.getTime();
    }).length;

    // Las alturas y todo el resto del análisis 12m se computan aquí.
    this.calcularResumenCrecimiento12m();
  }

  /** Visitas del mes anterior hasta el mismo día y hora que hoy (para el mes en curso). */
  private mesAnteriorAlMismoDia = 0;

  /** Computa los KPIs y barras enriquecidas del crecimiento 12m. */
  private calcularResumenCrecimiento12m(): void {
    const datos = this.kpiCrecimiento12m;
    if (datos.length === 0) {
      this.crecimiento12mBarras = [];
      this.crecimiento12mTotal = 0;
      this.crecimiento12mPromedio = 0;
      this.crecimiento12mMejorMes = null;
      this.crecimiento12mPeorMes = null;
      this.crecimiento12mTendencia = null;
      this.crecimiento12mAnalisis = '';
      return;
    }

    const cantidades = datos.map(d => d.cantidad);
    const max = Math.max(...cantidades, 1);
    const total = cantidades.reduce((s, v) => s + v, 0);
    const mesesConDatos = cantidades.filter(c => c > 0).length || 1;

    // Mejor / peor mes (peor solo entre meses con datos > 0)
    let mejorIdx = 0;
    let peorIdx = -1;
    for (let i = 0; i < datos.length; i++) {
      if (datos[i].cantidad > datos[mejorIdx].cantidad) mejorIdx = i;
      // El mes en curso no compite por "más bajo": está incompleto.
      if (i === datos.length - 1) continue;
      if (datos[i].cantidad > 0 &&
          (peorIdx === -1 || datos[i].cantidad < datos[peorIdx].cantidad)) {
        peorIdx = i;
      }
    }
    const mejor = datos[mejorIdx];
    const peor = peorIdx >= 0 ? datos[peorIdx] : null;
    // El último mes del array es el actual (currente).
    const idxActual = datos.length - 1;

    this.crecimiento12mTotal = total;
    this.crecimiento12mPromedio = Math.round(total / mesesConDatos);
    this.crecimiento12mMejorMes = mejor.cantidad > 0 ? mejor : null;
    this.crecimiento12mPeorMes = peor && peor.cantidad !== mejor.cantidad ? peor : null;

    // Barras enriquecidas (altura + flags + MoM + tooltip)
    this.crecimiento12mBarras = datos.map((m, i) => {
      const altura = Math.max(2, (m.cantidad / max) * 100);
      const esMesEnCurso = i === datos.length - 1;
      const anterior = i === 0 ? null
        : esMesEnCurso ? this.mesAnteriorAlMismoDia : datos[i - 1].cantidad;
      let cambioMoM: number | null = null;
      let cambioMoMStr = '';
      if (anterior !== null && anterior > 0) {
        cambioMoM = ((m.cantidad - anterior) / anterior) * 100;
        const signo = cambioMoM > 0 ? '+' : '';
        cambioMoMStr = `${signo}${cambioMoM.toFixed(0)}%`;
      } else if (anterior === 0 && m.cantidad > 0) {
        // Sin base no hay porcentaje: se marca "nuevo", sin cifra.
        cambioMoM = null;
        cambioMoMStr = 'nuevo';
      }
      const esMejor = i === mejorIdx && m.cantidad > 0;
      const esPeor = peor !== null && i === peorIdx && peor.cantidad !== mejor.cantidad;
      const esActual = i === idxActual;
      let tooltip = `${m.mes}: ${m.cantidad} visitas`;
      if (cambioMoMStr) {
        tooltip += esMesEnCurso
          ? ` · ${cambioMoMStr} vs el mes anterior a estas alturas (${anterior} visitas)`
          : ` · ${cambioMoMStr} vs mes anterior`;
      }
      if (esMejor) tooltip += ' · MEJOR MES';
      if (esPeor) tooltip += ' · MES MÁS BAJO';
      if (esActual) tooltip += ' · MES EN CURSO';
      return { ...m, altura, esMejor, esPeor, esActual, cambioMoM, cambioMoMStr, tooltip };
    });

    // Tendencia trimestral: últimos 3 meses (excluyendo el actual que está incompleto)
    // vs los 3 meses previos. Si hay menos historial, comparar lo que haya.
    const finalIdx = datos.length - 1; // mes actual (incompleto)
    const iniA = Math.max(0, finalIdx - 3);
    const iniB = Math.max(0, finalIdx - 6);
    const ult3 = datos.slice(iniA, finalIdx); // 3 meses cerrados
    const prev3 = datos.slice(iniB, iniA);
    if (ult3.length >= 2 && prev3.length >= 2) {
      const sumA = ult3.reduce((s, x) => s + x.cantidad, 0);
      const sumB = prev3.reduce((s, x) => s + x.cantidad, 0);
      let porcentaje = 0;
      let direccion: 'up' | 'down' | 'igual' = 'igual';
      if (sumB > 0) {
        porcentaje = ((sumA - sumB) / sumB) * 100;
      } else if (sumA > 0) {
        porcentaje = 100;
      }
      if (porcentaje > 2) direccion = 'up';
      else if (porcentaje < -2) direccion = 'down';
      const absPct = Math.abs(porcentaje).toFixed(0);

      // Derivar rangos de fechas reales a partir de los índices del array.
      // datos[finalIdx] es el mes actual (incompleto, no entra en el cálculo).
      // El array está ordenado de más viejo (idx 0) a más reciente (idx 11).
      const hoy = new Date();
      const fechaDeIdx = (idx: number): Date =>
        new Date(hoy.getFullYear(), hoy.getMonth() - (finalIdx - idx), 1);
      const rangoActual = this.formatearRangoMeses(
        fechaDeIdx(iniA), fechaDeIdx(finalIdx - 1));
      const rangoAnterior = this.formatearRangoMeses(
        fechaDeIdx(iniB), fechaDeIdx(iniA - 1));

      let texto: string;
      let color: 'success' | 'warning' | 'neutral';
      let icono: string;
      if (direccion === 'up') {
        texto = `↑ ${absPct}% último trimestre vs anterior`;
        color = 'success';
        icono = 'trending_up';
      } else if (direccion === 'down') {
        texto = `↓ ${absPct}% último trimestre vs anterior`;
        color = 'warning';
        icono = 'trending_down';
      } else {
        texto = 'Flujo estable los últimos 6 meses';
        color = 'neutral';
        icono = 'trending_flat';
      }
      this.crecimiento12mTendencia = {
        porcentaje, direccion, texto, color, icono, rangoActual, rangoAnterior,
      };
    } else {
      this.crecimiento12mTendencia = null;
    }

    // Análisis automático corto
    if (this.crecimiento12mTendencia?.direccion === 'up' &&
        Math.abs(this.crecimiento12mTendencia.porcentaje) > 25) {
      this.crecimiento12mAnalisis =
        'Crecimiento sostenido — el flujo del último trimestre supera claramente al previo.';
    } else if (this.crecimiento12mTendencia?.direccion === 'down' &&
               Math.abs(this.crecimiento12mTendencia.porcentaje) > 25) {
      this.crecimiento12mAnalisis =
        'Caída sostenida — conviene revisar qué cambió en los últimos meses.';
    } else if (this.crecimiento12mTendencia?.direccion === 'igual') {
      this.crecimiento12mAnalisis =
        'Flujo estable — el comportamiento se mantiene parejo a lo largo del año.';
    } else if (this.crecimiento12mTendencia) {
      this.crecimiento12mAnalisis =
        'Variación moderada — hay movimiento, pero sin un patrón fuerte de subida o bajada.';
    } else {
      this.crecimiento12mAnalisis = '';
    }
  }


  /** Pre-computa la matriz flat del heatmap para el template (sin funciones en CD). */
private precalcularFilasHeatmap(): void {
  this.heatmapFilas = this.diasSemana.map(dia => {
    const totalDia = this.heatmapTotalesPorDia[dia] ?? 0;
    return {
      dia,
      etiqueta: this.etiquetaDia(dia),
      totalDia,
      totalDiaTooltip: `Total de ${dia}: ${totalDia} visitas en el período mostrado`,
      celdas: this.heatmapHoras.map(hora => {
        const cantidad   = this.heatmapMatriz[dia]?.[hora] ?? 0;
        const esPico     = this.heatmapPicoDia === dia && this.heatmapPicoHora === hora;
        const clickeable = cantidad > 0;
        let tooltip      = `${dia} ${this.formatHora(hora)} — ${cantidad} visitas`;
        if (esPico)     tooltip += ' · PICO DEL PERÍODO ★';
        if (clickeable) tooltip += ' (clic para ver registros)';
        return {
          hora,
          cantidad,
          clase: this.heatmapClases[dia]?.[hora] ?? 'intensidad-0',
          esPico,
          tooltip,
          clickeable,
        };
      }),
    };
  });
}


  /** Tier A: sparklines — últimos N puntos para mostrar mini-trazos junto a KPIs. */
  private calcularSparklines(registros: any[], rango: RangoFechas): void {
    // Spark de registros: dividir el rango en buckets (máx 30)
    const dias = this.estadisticasService.diasEnRango(rango);
    const buckets = Math.min(30, Math.max(7, dias));
    const inicioMs = rango.inicio.getTime();
    const finMs = rango.fin.getTime();
    const ancho = (finMs - inicioMs) / buckets;
      const diasPorBucket = Math.max(1, dias / buckets); // ← vive aquí

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
  this.sparkPromedio = counts.map(c => parseFloat((c / diasPorBucket).toFixed(1)));

  // ✅ FIX: pre-calcular SVG paths UNA SOLA VEZ
  this.sparkRegistrosPoints = this.sparkPath(this.sparkRegistros, 200, 60);
  this.sparkRegistrosArea   = this.sparkArea(this.sparkRegistros, 200, 60);
  
  
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
      .map(([combo, cantidad]) => {
        const porcentaje = totalCombos > 0 ? parseFloat((cantidad / totalCombos * 100).toFixed(1)) : 0;
        return {
          combo, 
          cantidad,
          porcentaje,
          anchoStr: this.anchoCombo(porcentaje) + '%' // <-- NUEVO: Pre-calculamos el ancho css
        };
      });
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

  /**
   * Día de la semana más concurrido EN PROMEDIO por día con actividad, no
   * por suma: en 30 días algunos días de la semana caen 5 veces y otros 4 (O3).
   */
  private calcularDiaSemanaTop(registros: any[]): void {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const idx = diaSemanaMasConcurrido(registros);
    this.kpiDiaSemanaTop = idx === null ? '' : dias[idx];
  }

  /** Tier B12: % invitados vs alumnos del período. */
  private calcularPctInvitados(registros: any[]): void {
    if (registros.length === 0) { this.kpiPctInvitados = 0; this.kpiVisitasInvitados = 0; return; }
    const invitados = registros.filter(r => r.matricula === 'INVITADO').length;
    this.kpiVisitasInvitados = invitados;
    this.kpiPctInvitados = parseFloat((invitados / registros.length * 100).toFixed(1));
  }

  /**
   * Proyección del total de hoy (P8). Solo si el rango activo incluye hoy.
   * Usa TODO el historial (no el filtro de hora): compara con los últimos
   * días del mismo tipo y qué parte del día suelen llevar a esta hora. Sin
   * al menos 4 días comparables, no se muestra.
   */
  private async calcularPrediccionHoy(): Promise<void> {
    this.kpiProyeccionHoy = null;
    if (!this.rangoActivo) return;
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
    if (this.rangoActivo.fin < inicioHoy || this.rangoActivo.inicio > finHoy) return;
    this.kpiProyeccionHoy = await this.estadisticasService.proyectarHoy(ahora);
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
        if (esInvitado(r)) continue; // P5
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

    this.ngZone.run(() => this.cdr.markForCheck());
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
  private gradoPorMatricula = new Map<string, number>();

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
      const hoyStr = fechaLocalISO(hoy);
      const hace30Str = fechaLocalISO(hace30);
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
      
      // 🚀 NUEVO: Pre-calcular todos los textos de la pestaña "Comparar"
      this.comparativaUI = {
        labelA: `${this.formatearFechaLarga(this.comparativa.a.rango.inicio)} — ${this.formatearFechaLarga(this.comparativa.a.rango.fin)}`,
        labelB: `${this.formatearFechaLarga(this.comparativa.b.rango.inicio)} — ${this.formatearFechaLarga(this.comparativa.b.rango.fin)}`,
        horaPicoA: this.comparativa.a.horaPico ? `${this.comparativa.a.horaPico.dia} ${this.formatHora(this.comparativa.a.horaPico.hora)}` : '',
        horaPicoB: this.comparativa.b.horaPico ? `${this.comparativa.b.horaPico.dia} ${this.formatHora(this.comparativa.b.horaPico.hora)}` : '',
        iconoDif: this.iconoComparativa(this.comparativa.diferencia.direccion),
        colorDif: this.colorComparativa(this.comparativa.diferencia.direccion)
      };

      setTimeout(() => this.renderizarGraficasComparador(), 50);
    } catch (e) {
      console.error('❌ Error en comparativa:', e);
      this.toastService.error('No se pudo generar la comparativa');
    } finally {
      this.cargandoComparativa = false;
      this.cdr.markForCheck(); // Es buena práctica avisar a Angular que terminaste
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
      // 6 días de calendario, no 6 × 24 h: la semana del cambio de horario
      // de noviembre perdía el domingo.
      const fin = this.finDia(desplazarDias(inicio, 6));
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

  private calcularTopDelMes(registrosMes: any[], limite: number, catalogo: Motivo[] = []) {
    const porMat = new Map<string, any[]>();
    for (const r of registrosMes) {
      const arr = porMat.get(r.matricula) || [];
      arr.push(r);
      porMat.set(r.matricula, arr);
    }
    const top: any[] = [];
    porMat.forEach((regs, mat) => {
      if (mat === 'INVITADO') return;
      const motivoFrecuente = motivoMasFrecuente(regs, catalogo)?.nombre ?? 'N/A';
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
      const topParaReporte = this.calcularTopDelMes(
        delRango, 10, await this.databaseService.obtenerTodosLosMotivos());
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
      const topParaReporte = this.calcularTopDelMes(
        delRango, 10, await this.databaseService.obtenerTodosLosMotivos());
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
    await this.exportService.exportarRegistrosXLSX(
      registros,
      `top_alumnos_stenbrary_${fechaLocalISO()}`
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

  /**
   * Renderiza SOLO las gráficas de la tab activa.
   * Antes intentaba pintar las 3, pero `chartCarreras` solo está en
   * la tab "Personas" y `chartDiario`/`chartMotivos` solo en "Resumen",
   * así que llamarlas todas siempre era inútil (y causaba que se
   * intentaran pintar canvas que no estaban en el DOM).
   */
  private renderizarGraficas(): void {
    // NUEVO: Inicializar las gráficas fuera de Angular para que sus 
    // eventos touch/scroll no congelen la aplicación.
    this.ngZone.runOutsideAngular(() => {
      this.renderizarGraficasDeTab(this.tabActiva);
    });
    this.primerRenderHecho = true;
  }

  /** Duración de animación: corta en primer mount (200ms), 0 en re-renders.
   * Antes 600ms — bajado a 200 para que no se sienta lag en primera carga. */
  private get animDuracion(): number {
    return this.primerRenderHecho ? 0 : 200;
  }

  private renderizarGraficaDiaria(): void {
    if (!this.chartDiarioRef || !this.datosDiarios) return;
    const canvas = this.chartDiarioRef.nativeElement;
    // Si el canvas no está en el DOM (tab cambiada), no hacemos nada.
    if (!canvas.isConnected) return;

    const domingoSet = new Set(this.diariosDomingoIdx);
    const cantidades = this.datosDiarios.cantidades;
    const bg = cantidades.map((_, i) =>
      domingoSet.has(i) ? 'rgba(240, 82, 82, 0.35)' : 'rgba(0, 200, 215, 0.6)');
    const border = cantidades.map((_, i) =>
      domingoSet.has(i) ? '#F05252' : '#00C8D7');

    // En ≤480px usamos sparkline (line + área) en lugar de barras: 30 barras
    // diarias en 320px de ancho se ven amontonadas. La línea con área aprovecha
    // el ancho completo y deja respirar la lectura.
    const esMovil = typeof window !== 'undefined' && window.innerWidth <= 480;
    const tipoDeseado: 'bar' | 'line' = esMovil ? 'line' : 'bar';

    // Si la chart actual apunta a un canvas distinto, o el tipo cambió (rotación
    // del dispositivo, resize), destruir y recrear.
    const tipoActual = (this.chartDiario?.config as { type?: string } | undefined)?.type;
    if (this.chartDiario && (this.chartDiario.canvas !== canvas || tipoActual !== tipoDeseado)) {
      this.chartDiario.destroy();
      this.chartDiario = null;
    }

    // Update in-place si la chart sigue ligada al canvas vivo Y el tipo coincide
    if (this.chartDiario) {
      this.chartDiario.data.labels = this.datosDiarios.etiquetas;
      this.chartDiario.data.datasets[0].data = cantidades;
      if (tipoDeseado === 'bar') {
        this.chartDiario.data.datasets[0].backgroundColor = bg;
        this.chartDiario.data.datasets[0].borderColor = border;
      }
      this.chartDiario.update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (esMovil) {
      // Sparkline minimalista: línea con área, sin ejes, sin grid.
      this.chartDiario = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.datosDiarios.etiquetas,
          datasets: [{
            label: 'Registros',
            data: cantidades,
            borderColor: '#00C8D7',
            backgroundColor: 'rgba(0, 200, 215, 0.18)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#00C8D7',
            pointHoverBorderColor: '#04090F',
            pointHoverBorderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: this.animDuracion },
          interaction: { mode: 'index', intersect: false },
          layout: { padding: { left: 4, right: 4, top: 8, bottom: 0 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#142033', titleColor: '#E8F4F8', bodyColor: '#E8F4F8',
              borderColor: 'rgba(0, 200, 215, 0.3)', borderWidth: 1, cornerRadius: 10,
              padding: 10, displayColors: false,
              callbacks: {
                title: (items) => items[0]?.label || '',
                label: (item) => `${item.raw} registros`,
              },
            },
          },
          scales: {
            x: { display: false },
            y: { display: false, beginAtZero: true },
          },
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
    } else {
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
          interaction: { mode: 'index', intersect: false },
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
                font: { family: "'DM Sans', sans-serif", size: 11 }, precision: 0,
              },
            },
          },
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













  }

  /**
   * Motivos en barras horizontales, no en dona (P2): cada motivo de una
   * visita suma, así que las partes ya no forman un todo del 100 % y una
   * dona daría a entender que sí. El % de cada barra es "de las visitas
   * del período, cuántas incluyeron este motivo".
   */
  private renderizarGraficaMotivos(): void {
    if (!this.chartMotivosRef || !this.distribucionMotivos) return;
    const canvas = this.chartMotivosRef.nativeElement;
    if (!canvas.isConnected) return;

    if (this.distribucionMotivos.cantidades.length === 0) {
      this.chartMotivos?.destroy();
      this.chartMotivos = null;
      return;
    }

    this.chartMotivos?.destroy();
    this.chartMotivos = null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.chartMotivos = this.crearGraficaMotivos(ctx, this.distribucionMotivos, this.animDuracion);
  }

  /** Barras horizontales de motivos; la usan el Resumen y el comparador A/B. */
  private crearGraficaMotivos(
    ctx: CanvasRenderingContext2D,
    motivos: DistribucionMotivos,
    animacion: number,
  ): Chart {
    const total = motivos.totalVisitas;
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: motivos.etiquetas,
        datasets: [{
          data: motivos.cantidades,
          backgroundColor: motivos.colores.map(c => c + 'CC'),
          borderColor: motivos.colores,
          borderWidth: 2, borderRadius: 6, borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        animation: { duration: animacion },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#142033', titleColor: '#E8F4F8', bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)', borderWidth: 1, cornerRadius: 10, padding: 12,
            displayColors: false,
            callbacks: {
              label: (item) => {
                const pct = total > 0 ? ((item.raw as number) / total * 100).toFixed(1) : '0';
                return ` ${item.raw} visitas · ${pct}% de las visitas`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true, grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: { color: 'rgba(200, 230, 240, 0.4)', precision: 0,
                     font: { family: "'DM Sans', sans-serif", size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: 'rgba(200, 230, 240, 0.7)',
                     font: { family: "'DM Sans', sans-serif", size: 12 } },
          },
        },
      },
    });
  }

  private renderizarGraficaCarreras(): void {
    if (!this.chartCarrerasRef) return;
    const canvas = this.chartCarrerasRef.nativeElement;
    if (!canvas.isConnected) return;

    if (this.datosCarreras.length === 0) {
      this.chartCarreras?.destroy();
      this.chartCarreras = null;
      return;
    }

    const etiquetas = this.datosCarreras.map(d => this.abreviarCarrera(d.carrera));
    const cantidades = this.datosCarreras.map(d => d.totalVisitas);
    const colores = ['#00C8D7', '#0BC4B7', '#0EB07B', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F5A623'];

    if (this.chartCarreras && this.chartCarreras.canvas !== canvas) {
      this.chartCarreras.destroy();
      this.chartCarreras = null;
    }

    if (this.chartCarreras) {
      this.chartCarreras.data.labels = etiquetas;
      this.chartCarreras.data.datasets[0].data = cantidades;
      this.chartCarreras.data.datasets[0].backgroundColor =
        cantidades.map((_, i) => (colores[i % colores.length]) + '99');
      this.chartCarreras.data.datasets[0].borderColor =
        cantidades.map((_, i) => colores[i % colores.length]);
      this.chartCarreras.update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
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
        interaction: { mode: 'index', intersect: false },
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
              font: { family: "'DM Sans', sans-serif", size: 11 }, precision: 0,
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
    const chart = this.crearGraficaMotivos(ctx, motivos, 400);
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
    if (this.tendencia.sinReferencia) return 'fiber_new';
    switch (this.tendencia.direccion) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  obtenerColorTendencia(): string {
    if (!this.tendencia) return 'neutral';
    if (this.tendencia.sinReferencia) return 'neutral';
    switch (this.tendencia.direccion) {
      case 'up': return 'success';
      case 'down': return 'warning';
      default: return 'neutral';
    }
  }

  obtenerTextoTendencia(): string {
    if (!this.tendencia) return 'Sin cambios';
    // Sin registros antes no hay base para un porcentaje: cualquier número
    // (0 %, 100 %, ∞) sería inventado. Se dice lo que pasó, sin cifra.
    if (this.tendencia.sinReferencia) return 'Sin registros en el período anterior para comparar';
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

  /** Abre el modal con las fórmulas de cálculo de cada métrica. */
  abrirInfoFormulas(): void {
    this.dialog.open(FormulasInfoDialogComponent, {
      panelClass: 'pdf-dialog-panel',
      maxWidth: '720px',
      width: '92vw',
      autoFocus: false,
    });
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
