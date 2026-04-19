// ╔══════════════════════════════════════════════════════╗
// ║  dashboard-ejecutivo.component.ts                    ║
// ║  Stenbrary v4.1 — Rangos dinámicos + export          ║
// ║                                                      ║
// ║  MEJORAS v4.1:                                       ║
// ║  - Títulos de gráficas dinámicos (no hardcodeados)   ║
// ║  - Período se aplica a TODAS las secciones           ║
// ║  - Heatmap con selector de rango histórico           ║
// ║  - Top alumnos con rango + export Excel/PDF          ║
// ║  - Visitas por carrera con rango                     ║
// ║  - Hora pico por período seleccionado                ║
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
import { FormsModule } from '@angular/forms';
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
  HeatmapResultado,
  TopAlumno,
  Insight,
  DatosDiarios,
  DistribucionMotivos,
  DatosCarrera,
  RangoFechas,
} from '../../core/services/estadisticas-avanzadas.service';
import { ExportService } from '../../core/services/export.service';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';

Chart.register(...registerables);

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

  // Chart instances
  private chartDiario: Chart | null = null;
  private chartMotivos: Chart | null = null;
  private chartCarreras: Chart | null = null;

  // Datos
  tendenciaSemanal?: TendenciaComparativa;
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

  // ─── Selector de período global ──────────────────
  periodoSeleccionado = 30;
  rangoPersonalizado = false;
  fechaInicio = '';
  fechaFin = '';
  opcionesPeriodo = [
    { dias: 7,   label: '7 días' },
    { dias: 14,  label: '14 días' },
    { dias: 30,  label: '30 días' },
    { dias: 90,  label: '90 días' },
    { dias: 365, label: 'Este año' },
  ];

  // ─── Heatmap config ──────────────────────────────
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  heatmapPeriodo = 30;
  opcionesHeatmap = [
    { dias: 7,   label: 'Esta semana' },
    { dias: 14,  label: '2 semanas' },
    { dias: 30,  label: 'Este mes' },
    { dias: 90,  label: '3 meses' },
    { dias: 180, label: '6 meses' },
    { dias: 365, label: 'Este año' },
  ];

  // ─── Top alumnos config ──────────────────────────
  topPeriodo = 30;
  opcionesTopPeriodo = [
    { dias: 7,   label: '7 días' },
    { dias: 30,  label: '30 días' },
    { dias: 90,  label: '90 días' },
    { dias: 365, label: 'Este año' },
    { dias: 0,   label: 'Todo' },
  ];

  // ─── Reporte por período ─────────────────────────
  tipoReporte: 'diario' | 'semanal' | 'mensual' | 'anual' = 'mensual';
  mesesDisponibles: { valor: string; label: string }[] = [];
  aniosDisponibles: { valor: string; label: string }[] = [];
  mesReporteSeleccionado = '';
  anioReporteSeleccionado = '';
  /** Fecha para reporte diario (YYYY-MM-DD). Default: hoy. */
  fechaReporteDiario = '';
  /** Fecha que define la semana (cualquier día dentro de ella). */
  fechaReporteSemana = '';
  generandoReporte = false;

  private datosListos = false;

  constructor(
    private estadisticasService: EstadisticasAvanzadasService,
    private exportService: ExportService,
    private databaseService: DatabaseService,
    private toastService: ToastService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
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
  }

  // ═══════════════════════════════════════════════
  // LABELS DINÁMICOS
  // ═══════════════════════════════════════════════

  /** Rango actual del selector global — fuente única de verdad. */
  get rangoActual(): RangoFechas {
    if (this.rangoPersonalizado && this.fechaInicio && this.fechaFin) {
      return this.estadisticasService.normalizarRango(
        new Date(this.fechaInicio + 'T00:00:00'),
        new Date(this.fechaFin + 'T00:00:00'),
      );
    }
    return this.estadisticasService.crearRangoUltimosDias(this.periodoSeleccionado);
  }

  get labelPeriodo(): string {
    if (this.rangoPersonalizado && this.fechaInicio && this.fechaFin) {
      const fi = new Date(this.fechaInicio + 'T00:00:00');
      const ff = new Date(this.fechaFin + 'T00:00:00');
      return `${this.formatearFecha(fi)} — ${this.formatearFecha(ff)}`;
    }
    if (this.periodoSeleccionado === 365) return 'Últimos 365 días';
    return `Últimos ${this.periodoSeleccionado} días`;
  }

  get labelRegistrosDiarios(): string {
    const g = this.datosDiarios?.granularidad;
    const sufijo =
      g === 'mes' ? 'por mes' :
      g === 'semana' ? 'por semana' :
      'por día';
    return `Registros ${sufijo} — ${this.labelPeriodo}`;
  }

  get labelMotivos(): string {
    return `Motivos (${this.labelPeriodo})`;
  }

  get labelCarreras(): string {
    return `Visitas por Carrera — ${this.labelPeriodo}`;
  }

  get labelTendencia(): string {
    const dias = this.estadisticasService.diasEnRango(this.rangoActual);
    if (dias <= 14) return 'Tendencia Semanal';
    if (dias <= 90) return 'Tendencia del Período';
    return 'Tendencia Anual';
  }

  get labelHeatmap(): string {
    const op = this.opcionesHeatmap.find(o => o.dias === this.heatmapPeriodo);
    return `Mapa de Calor — ${op?.label || this.heatmapPeriodo + ' días'}`;
  }

  /** Subtítulo del heatmap con las fechas exactas del rango. */
  get sublabelHeatmap(): string {
    if (!this.heatmapRango) return '';
    const fi = this.heatmapRango.inicio;
    const ff = this.heatmapRango.fin;
    const fmt = (d: Date) => d.toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return `Del ${fmt(fi)} al ${fmt(ff)}`;
  }

  /**
   * Etiqueta para una fila del heatmap.
   * Si el período tiene exactamente 1 ocurrencia de cada día (semana de 7),
   * agrega la fecha concreta — p. ej. "Lunes 1 abr".
   * Si tiene varias ocurrencias, solo muestra el nombre del día.
   */
  etiquetaDia(dia: string): string {
    const fechas = this.heatmapFechasPorDia.get(dia);
    if (!fechas || fechas.length !== 1) return dia;
    const f = fechas[0];
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${dia} ${f.getDate()} ${meses[f.getMonth()]}`;
  }

  get labelTopAlumnos(): string {
    if (this.topPeriodo === 0) return 'Top 5 Alumnos Más Frecuentes — Histórico';
    const op = this.opcionesTopPeriodo.find(o => o.dias === this.topPeriodo);
    return `Top 5 Alumnos Más Frecuentes — ${op?.label || this.topPeriodo + ' días'}`;
  }

  // ═══════════════════════════════════════════════
  // PERÍODO GLOBAL
  // ═══════════════════════════════════════════════

  setPeriodo(dias: number): void {
    this.periodoSeleccionado = dias;
    this.rangoPersonalizado = false;
    this.cargarDatos();
  }

  toggleRangoPersonalizado(): void {
    this.rangoPersonalizado = !this.rangoPersonalizado;
    if (this.rangoPersonalizado && (!this.fechaInicio || !this.fechaFin)) {
      // Defaults: último mes
      const hoy = new Date();
      const hace30 = new Date(hoy);
      hace30.setDate(hoy.getDate() - 30);
      this.fechaFin = hoy.toISOString().split('T')[0];
      this.fechaInicio = hace30.toISOString().split('T')[0];
    }
  }

  aplicarRangoPersonalizado(): void {
    if (!this.fechaInicio || !this.fechaFin) return;
    const inicio = new Date(this.fechaInicio + 'T00:00:00');
    const fin = new Date(this.fechaFin + 'T00:00:00');
    if (inicio > fin) {
      this.toastService.warning('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }
    // El rango se lee directamente desde rangoActual; solo recargamos.
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
    // Refresh real desde DB: si el usuario registró actividad nueva,
    // el cambio de período del heatmap también debe reflejarlo.
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
    const rango = this.rangoActual;
    try {
      this.cargando = true;
      // Invalidar caché para que un cambio de período (o entrar al dashboard
      // tras registrar actividad nueva) refleje datos frescos.
      this.estadisticasService.invalidarCache();

      const [tendencia, heatmap, top, insights, prediccion, diarios, motivos, carreras] =
        await Promise.all([
          this.estadisticasService.compararTendencias(rango),
          this.estadisticasService.generarHeatmap(this.heatmapPeriodo),
          this.estadisticasService.obtenerTopAlumnos(5, this.topPeriodo || undefined),
          this.estadisticasService.generarInsights(rango),
          this.estadisticasService.predecirDiaOcupado(this.heatmapPeriodo),
          this.estadisticasService.obtenerRegistrosPorRango(rango),
          this.estadisticasService.obtenerDistribucionMotivos(rango),
          this.estadisticasService.analizarPorCarrera(rango),
        ]);

      this.tendenciaSemanal = tendencia;
      this.aplicarHeatmap(heatmap);
      this.topAlumnos = top;
      this.insights = insights;
      this.diaPredicho = prediccion;
      this.datosDiarios = diarios;
      this.distribucionMotivos = motivos;
      this.datosCarreras = carreras;

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
  // REPORTE POR PERIODO (diario/semanal/mensual/anual)
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

    // Incluir el actual aunque no tenga registros
    const hoy = new Date();
    meses.add(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`);
    años.add(String(hoy.getFullYear()));

    const mesesOrdenados = [...meses].sort().reverse();
    const añosOrdenados = [...años].sort().reverse();
    const nombresMes = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    this.mesesDisponibles = mesesOrdenados.map(valor => {
      const [y, m] = valor.split('-').map(Number);
      return { valor, label: `${nombresMes[m - 1]} ${y}` };
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

  /** Inicio del día local (00:00:00). */
  private inicioDia(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  /** Fin del día local (23:59:59.999). */
  private finDia(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  /** Lunes de la semana que contiene a `d` (ISO: lunes a domingo). */
  private inicioSemana(d: Date): Date {
    const x = this.inicioDia(d);
    const dow = x.getDay(); // 0=dom, 1=lun, ..., 6=sáb
    const diff = dow === 0 ? -6 : 1 - dow;
    x.setDate(x.getDate() + diff);
    return x;
  }

  /** Calcula el rango [inicio, fin] y la etiqueta humana para el reporte actual. */
  private calcularRangoReporte(): { inicio: Date; fin: Date; etiqueta: string } | null {
    const nombresMes = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    if (this.tipoReporte === 'diario') {
      if (!this.fechaReporteDiario) return null;
      const d = new Date(this.fechaReporteDiario + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      return {
        inicio: this.inicioDia(d),
        fin: this.finDia(d),
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
        etiqueta: `${nombresMes[m - 1]} ${y}`,
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
    switch (this.tipoReporte) {
      case 'diario': return this.generandoReporte ? 'Generando...' : 'Reporte diario';
      case 'semanal': return this.generandoReporte ? 'Generando...' : 'Reporte semanal';
      case 'mensual': return this.generandoReporte ? 'Generando...' : 'Reporte mensual';
      case 'anual':   return this.generandoReporte ? 'Generando...' : 'Reporte anual';
    }
  }

  private calcularTopDelMes(registrosMes: any[], limite: number) {
    const porMat = new Map<string, any[]>();
    for (const r of registrosMes) {
      const arr = porMat.get(r.matricula) || [];
      arr.push(r);
      porMat.set(r.matricula, arr);
    }

    const top: Array<{
      posicion: number; matricula: string; nombreCompleto: string;
      carrera: string; totalVisitas: number; ultimaVisita: Date; motivoFrecuente: string;
    }> = [];

    porMat.forEach((regs, mat) => {
      if (mat === 'INVITADO') return;
      const motivos = new Map<string, number>();
      regs.forEach(r => motivos.set(r.motivoNombre, (motivos.get(r.motivoNombre) || 0) + 1));
      let motivoFrecuente = 'N/A'; let maxC = 0;
      motivos.forEach((c, m) => { if (c > maxC) { maxC = c; motivoFrecuente = m; } });
      const ultima = new Date(Math.max(...regs.map(r => new Date(r.fechaHora).getTime())));
      top.push({
        posicion: 0,
        matricula: mat,
        nombreCompleto: regs[0].nombreCompleto,
        carrera: regs[0].carrera,
        totalVisitas: regs.length,
        ultimaVisita: ultima,
        motivoFrecuente,
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
      // Histórico: usa la fecha del registro más antiguo (o 1 año atrás como fallback).
      const fechas = registros.map(r => new Date(r.fechaHora).getTime());
      inicio = fechas.length > 0
        ? new Date(Math.min(...fechas))
        : new Date(hoy.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // Mapear topAlumnos al shape que espera el report service
    const topParaReporte = this.topAlumnos.map((t, i) => ({
      posicion: i + 1,
      matricula: t.alumno.matricula,
      nombreCompleto: this.obtenerNombreCompleto(t),
      carrera: t.alumno.carrera,
      totalVisitas: t.totalVisitas,
      ultimaVisita: t.ultimaVisita,
      motivoFrecuente: t.motivoFrecuente,
    }));

    await reportService.generarReporteAccesos(registros, {
      tipo: 'personalizado',
      titulo: 'Top 5 Alumnos Más Frecuentes',
      fechaInicio: inicio,
      fechaFin: hoy,
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
              maxRotation: this.datosDiarios.granularidad === 'dia' &&
                           this.datosDiarios.etiquetas.length > 14 ? 45 : 0,
              autoSkip: true,
              maxTicksLimit: 18,
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

    // Destruir SIEMPRE antes de cualquier early-return: evita que la
    // gráfica anterior quede "fantasma" al cambiar a un período sin datos.
    this.chartMotivos?.destroy();
    this.chartMotivos = null;

    if (this.distribucionMotivos.cantidades.length === 0) return;

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
    if (!this.chartCarrerasRef) return;

    // Destruir SIEMPRE antes del early-return por datos vacíos.
    this.chartCarreras?.destroy();
    this.chartCarreras = null;

    if (this.datosCarreras.length === 0) return;

    const ctx = this.chartCarrerasRef.nativeElement.getContext('2d');
    if (!ctx) return;

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
        indexAxis: 'y',
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
    if (this.tendenciaSemanal.direccion === 'up') return `↑ ${p}% más que el período anterior`;
    if (this.tendenciaSemanal.direccion === 'down') return `↓ ${p}% menos que el período anterior`;
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
