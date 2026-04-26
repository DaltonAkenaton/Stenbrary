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
import { Router } from '@angular/router';
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

type PresetRango = 'hoy' | 'semana' | 'semana-pasada' | 'mes-actual' | 'mes-pasado' | 'ultimos7' | 'ultimos14' | 'ultimos30' | 'ultimos90' | 'anio' | 'todo' | 'personalizado';

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
  topAlumnos: TopAlumno[] = [];
  insights: Insight[] = [];
  diaPredicho = '';
  datosDiarios?: DatosDiarios;
  distribucionMotivos?: DistribucionMotivos;
  datosCarreras: DatosCarrera[] = [];

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
    { key: 'semana', label: 'Esta semana' },
    { key: 'semana-pasada', label: 'Semana pasada' },
    { key: 'mes-actual', label: 'Este mes' },
    { key: 'mes-pasado', label: 'Mes pasado' },
    { key: 'ultimos7', label: 'Últimos 7 días' },
    { key: 'ultimos30', label: 'Últimos 30 días' },
    { key: 'ultimos90', label: 'Últimos 90 días' },
    { key: 'anio', label: 'Este año' },
    { key: 'personalizado', label: 'Personalizado' },
  ];

  private datosListos = false;

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
  ) {}

  async ngOnInit(): Promise<void> {
    this.kpiUmbralInactividad = this.configService.umbralInactividadDias || 30;
    await this.cargarDatos();
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

  setPreset(key: PresetRango): void {
    this.presetSeleccionado = key;
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
    this.cargarDatos();
  }

  setFiltroHora(): void {
    if (this.filtroHoraDesde > this.filtroHoraHasta) {
      this.toastService.warning('La hora "desde" debe ser anterior a "hasta"');
      return;
    }
    this.cargarDatos();
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
      this.estadisticasService.invalidarCache();

      const rango = await Promise.resolve(this.resolverRango(this.presetSeleccionado));
      this.rangoActivo = rango;
      const horaFiltro = this.horaFiltro;

      const [tendencia, heatmap, top, insights, prediccion, diarios, motivos, carreras, registrosCrudos] =
        await Promise.all([
          this.estadisticasService.compararTendencias(rango, horaFiltro),
          this.estadisticasService.generarHeatmap(this.heatmapPeriodo),
          this.estadisticasService.obtenerTopAlumnos(5, this.topPeriodo || undefined),
          this.estadisticasService.generarInsights(rango, horaFiltro, this.kpiUmbralInactividad),
          this.estadisticasService.predecirDiaOcupado(this.heatmapPeriodo),
          this.estadisticasService.obtenerRegistrosPorRango(rango, horaFiltro),
          this.estadisticasService.obtenerDistribucionMotivos(rango, horaFiltro),
          this.estadisticasService.analizarPorCarrera(rango, horaFiltro),
          this.estadisticasService.obtenerRegistrosCrudos(rango, horaFiltro),
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

      this.cargando = false;
      this.datosListos = true;

      await this.construirMesesDisponibles();
      setTimeout(() => this.renderizarGraficas(), 50);
    } catch (error) {
      console.error('❌ Error al cargar estadísticas avanzadas:', error);
      this.cargando = false;
    }
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
    }
  }

  /** Genera un PDF del rango activo del dashboard (lo que el usuario está viendo). */
  async exportarLoQueVeo(): Promise<void> {
    if (!this.rangoActivo) return;
    if (this.generandoReporte) return;
    this.generandoReporte = true;
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
      });
      this.toastService.success(`PDF generado (${delRango.length} registros)`);
    } catch (e) {
      console.error(e);
      this.toastService.error('No se pudo generar el PDF');
    } finally {
      this.generandoReporte = false;
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
  }

  private renderizarGraficaDiaria(): void {
    if (!this.chartDiarioRef || !this.datosDiarios) return;
    this.chartDiario?.destroy();
    this.chartDiario = null;
    const ctx = this.chartDiarioRef.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chartDiario = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosDiarios.etiquetas,
        datasets: [{
          label: 'Registros', data: this.datosDiarios.cantidades,
          backgroundColor: 'rgba(0, 200, 215, 0.6)', borderColor: '#00C8D7',
          borderWidth: 2, borderRadius: 8, borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
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
      },
    });
  }

  private renderizarGraficaMotivos(): void {
    if (!this.chartMotivosRef || !this.distribucionMotivos) return;
    this.chartMotivos?.destroy();
    this.chartMotivos = null;
    if (this.distribucionMotivos.cantidades.length === 0) return;
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
    this.chartCarreras?.destroy();
    this.chartCarreras = null;
    if (this.datosCarreras.length === 0) return;
    const ctx = this.chartCarrerasRef.nativeElement.getContext('2d');
    if (!ctx) return;
    const etiquetas = this.datosCarreras.map(d => this.abreviarCarrera(d.carrera));
    const cantidades = this.datosCarreras.map(d => d.totalVisitas);
    const colores = ['#00C8D7', '#0BC4B7', '#0EB07B', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F5A623'];
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

  obtenerCantidadHeatmap(dia: string, hora: number): number {
    const item = this.heatmapData.find(h => h.dia === dia && h.hora === hora);
    return item ? item.cantidad : 0;
  }

  obtenerClaseIntensidad(cantidad: number): string {
    if (cantidad === 0) return 'intensidad-0';
    const maximo = this.obtenerMaximoHeatmap();
    if (maximo === 0) return 'intensidad-0';
    const porcentaje = cantidad / maximo;
    if (porcentaje <= 0.2) return 'intensidad-1';
    if (porcentaje <= 0.4) return 'intensidad-2';
    if (porcentaje <= 0.7) return 'intensidad-3';
    return 'intensidad-4';
  }

  obtenerMaximoHeatmap(): number {
    if (this.heatmapData.length === 0) return 0;
    return Math.max(...this.heatmapData.map(h => h.cantidad));
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
