// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/registros/                   ║
// ║        registros.component.ts                        ║
// ║  Stenbrary v3.58.0 — Filtros por tipo, salida y      ║
// ║  duración; orden por columna; autocompletado.        ║
// ║                                                      ║
// ║  FIX v3.4:                                           ║
// ║  - exportarCSV() escapa campos con comas/comillas    ║
// ╚══════════════════════════════════════════════════════╝
import { ReportService, TipoReporte } from '../../core/services/report.service';
import { Component, OnInit, computed, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Registro, Alumno, Motivo } from '../../core/models';
import { ExportService } from '../../core/services/export.service';
import { RegistroDetalleDialogComponent } from '../detalle-alumno/registro-detalle-dialog/registro-detalle-dialog.component';
import { RegistroEditarDialogComponent, RegistroEditarSalida } from '../detalle-alumno/registro-editar-dialog/registro-editar-dialog.component';
import { AgregarVisitaDialogComponent } from './agregar-visita-dialog/agregar-visita-dialog.component';
import { firstValueFrom } from 'rxjs';
import { formatearDuracion, parseFechaLocal, rangoUltimosDias } from '../../core/utils/tiempo.utils';
import { esSalidaEstimada, incluyeMotivo } from '../../core/utils/estadisticas.utils';
import { logError } from '../../core/utils/logger';
import { BitacoraService, describirRegistro } from '../../core/services/bitacora.service';
import { LoadingService } from '../../core/services/loading.service';
import {
  CampoOrden, FiltroSalida, FiltroTipo, Orden, coincideBusqueda, coincideDuracion,
  coincideSalida, coincideTipo, ordenarRegistros, sinAcentos, sugerirAlumnos,
} from '../../core/utils/registros-filtros.utils';
import { cederPintado, elegirDetallePdf } from '../../shared/components/confirm-dialog/detalle-pdf';

type RangoFecha = 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo' | 'personalizado';

/**
 * Registro extendido para la tabla. `_fechaTs` se calcula al cargar (lo usa
 * el filtro); las strings de display, solo para las filas de la página
 * visible (`decorarParaTabla`): formatearlas para los 120 000 registros de
 * dos años costaba ~0.4 s al abrir la vista, para pintar 30 (prueba de
 * volumen, 2026-10). Una vez formateada, la fila conserva sus strings.
 */
type RegistroRender = Registro & {
  _fechaTs: number;
  _fechaDateStr?: string;     // "12/04/2026"
  _horaEntradaStr?: string;   // "14:30"
  _horaSalidaStr?: string;    // "16:45" o ""
  _duracionStr?: string;      // "2h 15m" o ""
  _motivosStr?: string;       // todas las actividades de la visita (P2)
};

const FMT_FECHA = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});
const FMT_HORA = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit', minute: '2-digit',
});

function buildRegistroRender(r: Registro): RegistroRender {
  return Object.assign(r, { _fechaTs: new Date(r.fechaHora).getTime() }) as RegistroRender;
}

function decorarParaTabla(r: RegistroRender): RegistroRender {
  if (r._fechaDateStr !== undefined) return r;
  const entrada = new Date(r._fechaTs);
  const salida = r.horaSalida ? new Date(r.horaSalida) : null;
  return Object.assign(r, {
    _motivosStr: (r.motivoNombres?.length ? r.motivoNombres : [r.motivoNombre]).join(', '),
    _fechaDateStr: FMT_FECHA.format(entrada),
    _horaEntradaStr: FMT_HORA.format(entrada),
    _horaSalidaStr: salida ? FMT_HORA.format(salida) : '',
    // Una salida que puso el sistema se marca: no es una estancia medida (P3).
    _duracionStr: r.duracionMinutos != null
      ? formatearDuracion(r.duracionMinutos, true) + (esSalidaEstimada(r) ? ' (estimada)' : '')
      : '',
  }) as RegistroRender;
}

@Component({
    selector: 'app-registros',
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTableModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatAutocompleteModule,
    ],
    templateUrl: './registros.component.html',
    styleUrl: './registros.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrosComponent implements OnInit {
  private databaseService = inject(DatabaseService);
  private toastService = inject(ToastService);
  private exportService = inject(ExportService);
  private reportService = inject(ReportService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private dialog = inject(MatDialog);


  // ─── DATA ──────────────────────────────────────────────
  // Signals para que `computed()` se invalide automáticamente en filtros.
  // Cada registro precomputa lo que mostrará la tabla — evita que
  // `formatearFecha`/`formatearHora` se ejecuten en cada change-detection
  // tick (con 30 filas × 8 columnas eso era el lag del scroll).
  todosRegistros = signal<RegistroRender[]>([]);
  todosAlumnos: Alumno[] = [];
  motivos: Motivo[] = [];
  cargando = true;

  // ─── FILTROS ───────────────────────────────────────────
  filtros = signal({
    busqueda: '',
    rangoFecha: 'hoy' as RangoFecha,
    motivo: '',
    carrera: '',
    horaActiva: false,
    horaDesde: 7,
    horaHasta: 21,
    /** Día de la semana 0..6 (0=Dom). null = sin filtro. Llega por query-param
     *  desde el drill-down del heatmap del dashboard. */
    diaSemana: null as number | null,
    // v3.58.0 — pedidos en la verificación de agosto–septiembre.
    tipo: '' as FiltroTipo,
    salida: '' as FiltroSalida,
    duracionMin: null as number | null,
    duracionMax: null as number | null,
  });

  /** De la más nueva a la más vieja = el orden en que llegan de la base. */
  orden = signal<Orden>({ campo: 'fecha', dir: 'desc' });

  private alumnosSig = signal<Alumno[]>([]);
  /** Alumnos que coinciden con lo escrito en la búsqueda (autocompletado). */
  sugerencias = computed(() => {
    const texto = this.filtros().busqueda;
    if (sinAcentos(texto).length < 2) return [];
    return sugerirAlumnos(this.alumnosSig(), texto);
  });

  horasDisponibles: number[] = Array.from({ length: 24 }, (_, i) => i);
  /** Pre-formateado para el <select> — evita formatHora(h) en cada opción. */
  opcionesHoras: { v: number; label: string }[] =
    Array.from({ length: 24 }, (_, i) => ({ v: i, label: `${String(i).padStart(2, '0')}:00` }));

  // Rango personalizado (signals para que disparen el computed)
  fechaPersonalizadaInicioSig = signal('');
  fechaPersonalizadaFinSig = signal('');
  get fechaPersonalizadaInicio(): string { return this.fechaPersonalizadaInicioSig(); }
  set fechaPersonalizadaInicio(v: string) { this.fechaPersonalizadaInicioSig.set(v); this.paginaActual.set(0); }
  get fechaPersonalizadaFin(): string { return this.fechaPersonalizadaFinSig(); }
  set fechaPersonalizadaFin(v: string) { this.fechaPersonalizadaFinSig.set(v); this.paginaActual.set(0); }

  formatHora(h: number): string { return `${String(h).padStart(2, '0')}:00`; }

  carrerasUnicas = signal<string[]>([]);

  // ─── PAGINACIÓN ────────────────────────────────────────
  paginaActual = signal(0);
  filasPorPagina = 30;

  // ─── TABLA ─────────────────────────────────────────────
columnas: string[] = [
      'fechaHora', 'matricula', 'nombre', 'carrera',
      'motivo', 'salida', 'duracion', 'acciones'
    ];
  private readonly bitacora = inject(BitacoraService);
  private readonly loading = inject(LoadingService);

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
    // Aplicar filtros desde queryParams (drill-down del heatmap del dashboard).
    this.aplicarFiltrosDesdeUrl();
  }

  /** Lee fecha/desde/hasta/hora/dow desde la URL y los aplica como filtros. */
  private aplicarFiltrosDesdeUrl(): void {
    const qp = this.activatedRoute.snapshot.queryParamMap;
    const fecha = qp.get('fecha');
    const desde = qp.get('desde');
    const hasta = qp.get('hasta');
    const hora = qp.get('hora');
    const horaDesde = qp.get('hora_desde');
    const horaHasta = qp.get('hora_hasta');
    const dowStr = qp.get('dow');
    const motivo = qp.get('motivo');

    let cambio = false;

    if (motivo) {
      this.filtros.update(f => ({ ...f, motivo }));
      cambio = true;
    }

    if (fecha || desde || hasta) {
      this.filtros.update(f => ({ ...f, rangoFecha: 'personalizado' }));
      if (fecha) {
        this.fechaPersonalizadaInicioSig.set(fecha);
        this.fechaPersonalizadaFinSig.set(fecha);
      } else {
        if (desde) this.fechaPersonalizadaInicioSig.set(desde);
        if (hasta) this.fechaPersonalizadaFinSig.set(hasta);
      }
      cambio = true;
    }

    if (hora !== null && hora !== '') {
      const h = +hora;
      if (h >= 0 && h <= 23) {
        this.filtros.update(f => ({
          ...f, horaActiva: true, horaDesde: h, horaHasta: h,
        }));
        cambio = true;
      }
    } else if (horaDesde !== null || horaHasta !== null) {
      const hd = horaDesde !== null ? +horaDesde : 0;
      const hh = horaHasta !== null ? +horaHasta : 23;
      this.filtros.update(f => ({
        ...f, horaActiva: true, horaDesde: hd, horaHasta: hh,
      }));
      cambio = true;
    }

    if (dowStr !== null && dowStr !== '') {
      const dow = +dowStr;
      if (dow >= 0 && dow <= 6) {
        this.filtros.update(f => ({ ...f, diaSemana: dow }));
        cambio = true;
      }
    }

    if (cambio) {
      this.paginaActual.set(0);
    }
  }

  // ─── CARGA ─────────────────────────────────────────────
  async cargarDatos(): Promise<void> {
    try {
      this.cargando = true;

      const [registros, alumnos, motivos] = await Promise.all([
        this.databaseService.obtenerTodosLosRegistros(),
        this.databaseService.obtenerTodosLosAlumnos(),
        this.databaseService.obtenerMotivosActivos(),
      ]);

      // Precomputar timestamp y strings de display una sola vez por registro
      this.todosRegistros.set(registros.map(buildRegistroRender));
      this.todosAlumnos = alumnos;
      this.alumnosSig.set(alumnos);
      this.motivos = motivos;

      const carreras = new Set<string>();
      alumnos.forEach(a => { if (a.carrera) carreras.add(a.carrera); });
      this.carrerasUnicas.set([...carreras].sort());

      this.cargando = false;
    } catch (error) {
      logError('Error al cargar registros:', error);
      this.toastService.error('No se pudieron cargar los registros');
      this.cargando = false;
    }
  }

  // ─── FILTRADO (memoizado con computed) ─────────────────
  /**
   * Rango de fechas del filtro activo, en ms. Lo comparten la lista y el
   * PDF: antes el PDF calculaba su propio "período" (o ponía la fecha de
   * hoy) y la cabecera no coincidía con las filas.
   */
  private rangoFiltroTs(f = this.filtros()): { tsMin: number; tsMax: number } {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    let tsMin = -Infinity;
    let tsMax = Infinity;

    if (f.rangoFecha === 'hoy') {
      tsMin = inicioHoy.getTime();
    } else if (f.rangoFecha === 'ayer') {
      const ayer = new Date(inicioHoy); ayer.setDate(ayer.getDate() - 1);
      tsMin = ayer.getTime();
      tsMax = inicioHoy.getTime() - 1;
    } else if (f.rangoFecha === 'semana') {
      // "7 días" = hoy y los 6 anteriores (antes salían 8).
      tsMin = rangoUltimosDias(7).inicio.getTime();
    } else if (f.rangoFecha === 'mes') {
      tsMin = rangoUltimosDias(30).inicio.getTime();
    } else if (f.rangoFecha === 'personalizado') {
      // Hora LOCAL: `new Date('YYYY-MM-DD')` es medianoche UTC y en México
      // mostraba el día anterior — incluidos todos los drill-down del
      // dashboard ejecutivo (auditoría 2026-10, R1).
      const ini = parseFechaLocal(this.fechaPersonalizadaInicioSig());
      const fin = parseFechaLocal(this.fechaPersonalizadaFinSig());
      if (ini) tsMin = ini.getTime();
      if (fin) { fin.setHours(23, 59, 59, 999); tsMax = fin.getTime(); }
    }

    return { tsMin, tsMax };
  }

  // Una sola pasada por los 90k registros por cambio de filtro/data.
  // rangoFiltroTs() lee los signals de fechas: el computed depende de ellos.
  registrosFiltradosSig = computed<RegistroRender[]>(() => {
    const f = this.filtros();
    const todos = this.todosRegistros();
    const { tsMin, tsMax } = this.rangoFiltroTs(f);

    const termino = sinAcentos(f.busqueda);
    const motivoFiltro = f.motivo;
    const carreraFiltro = f.carrera;
    const horaActiva = f.horaActiva;
    const horaDesde = f.horaDesde;
    const horaHasta = f.horaHasta;
    const diaSemana = f.diaSemana;

    // Una sola pasada, sin construir Date objects (usa _fechaTs precomputado)
    const resultado: RegistroRender[] = [];
    for (const r of todos) {
      if (r._fechaTs < tsMin || r._fechaTs > tsMax) continue;
      // Cualquier motivo de la visita, no solo el principal: así la lista
      // coincide con los conteos del Resumen y de Estadísticas (P2).
      if (motivoFiltro && !incluyeMotivo(r, motivoFiltro)) continue;
      if (carreraFiltro && r.carrera !== carreraFiltro) continue;
      if (horaActiva || diaSemana !== null) {
        const d = new Date(r._fechaTs);
        if (horaActiva) {
          const h = d.getHours();
          if (h < horaDesde || h > horaHasta) continue;
        }
        if (diaSemana !== null && d.getDay() !== diaSemana) continue;
      }
      if (!coincideBusqueda(r, termino)) continue;
      if (!coincideTipo(r, f.tipo)) continue;
      if (!coincideSalida(r, f.salida)) continue;
      if (!coincideDuracion(r, f.duracionMin, f.duracionMax)) continue;
      resultado.push(r);
    }
    const orden = this.orden();
    // El orden por defecto es el de la base: no se paga un sort de 120 000 filas.
    if (orden.campo === 'fecha' && orden.dir === 'desc') return resultado;
    return ordenarRegistros(resultado, orden, r => r._fechaTs);
  });

  get registrosFiltrados(): RegistroRender[] {
    return this.registrosFiltradosSig();
  }

  registrosPaginadosSig = computed<RegistroRender[]>(() => {
    const inicio = this.paginaActual() * this.filasPorPagina;
    return this.registrosFiltradosSig().slice(inicio, inicio + this.filasPorPagina).map(decorarParaTabla);
  });

  get registrosPaginados(): RegistroRender[] {
    return this.registrosPaginadosSig();
  }

  get totalPaginas(): number {
    return Math.ceil(this.registrosFiltradosSig().length / this.filasPorPagina);
  }

  get finPagina(): number {
    return Math.min((this.paginaActual() + 1) * this.filasPorPagina, this.registrosFiltradosSig().length);
  }

  get hayFiltrosActivos(): boolean {
    const f = this.filtros();
    return !!(f.busqueda || f.motivo || f.carrera || f.horaActiva || f.diaSemana !== null
      || f.tipo || f.salida || f.duracionMin !== null || f.duracionMax !== null);
  }

  // ─── ACCIONES ──────────────────────────────────────────
  actualizarFiltro(campo: string, valor: string): void {
    this.filtros.update(f => ({ ...f, [campo]: valor }));
    this.paginaActual.set(0);
  }

  /** Minutos de duración: vacío = sin límite; negativo no tiene sentido. */
  setDuracion(campo: 'duracionMin' | 'duracionMax', valor: string | number | null): void {
    const n = valor === null || valor === '' ? null : Math.max(0, Math.floor(+valor));
    this.filtros.update(f => ({ ...f, [campo]: n !== null && Number.isFinite(n) ? n : null }));
    this.paginaActual.set(0);
  }

  /** Clic en el encabezado: ordena por esa columna; otro clic invierte. */
  ordenarPor(campo: CampoOrden): void {
    this.orden.update(o => o.campo === campo
      ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      // Fecha y duración empiezan por lo más reciente / más largo; texto, de la A a la Z.
      : { campo, dir: campo === 'fecha' || campo === 'duracion' ? 'desc' : 'asc' });
    this.paginaActual.set(0);
  }

  iconoOrden(campo: CampoOrden): string {
    const o = this.orden();
    if (o.campo !== campo) return 'unfold_more';
    return o.dir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  limpiarFiltros(): void {
    this.filtros.set({
      busqueda: '', rangoFecha: 'hoy', motivo: '', carrera: '',
      horaActiva: false, horaDesde: 7, horaHasta: 21,
      diaSemana: null,
      tipo: '', salida: '', duracionMin: null, duracionMax: null,
    });
    this.fechaPersonalizadaInicioSig.set('');
    this.fechaPersonalizadaFinSig.set('');
    this.paginaActual.set(0);
    // Limpiar también la URL para que no quede colgada de un drill anterior.
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {},
      replaceUrl: true,
    });
  }

  toggleFiltroHora(): void {
    this.filtros.update(f => ({ ...f, horaActiva: !f.horaActiva }));
    this.paginaActual.set(0);
  }

  setHoraDesde(h: number): void {
    this.filtros.update(f => ({ ...f, horaDesde: h }));
    this.paginaActual.set(0);
  }

  setHoraHasta(h: number): void {
    this.filtros.update(f => ({ ...f, horaHasta: h }));
    this.paginaActual.set(0);
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 0) this.paginaActual.update(p => p - 1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas - 1) this.paginaActual.update(p => p + 1);
  }

  // ─── FORMATO ───────────────────────────────────────────
  // Las strings de display (_fechaDateStr, _horaEntradaStr, _duracionStr)
  // se calculan en decorarParaTabla(), solo para la página visible. Los formatos se centralizan
  // en core/utils/tiempo.utils.ts (formatearDuracion).

  get etiquetaRango(): string {
    const map: Record<RangoFecha, string> = {
      hoy: 'Hoy',
      ayer: 'Ayer',
      semana: 'Últimos 7 días',
      mes: 'Últimos 30 días',
      todo: 'Todo el historial',
      personalizado: 'Rango personalizado',
    };
    return map[this.filtros().rangoFecha];
  }

  // ─── DETALLE ───────────────────────────────────────────
  verDetalle(registro: Registro): void {
    this.dialog.open(RegistroDetalleDialogComponent, {
      width: '480px',
      data: { registro, enlazarAlumno: true },
    });
  }

  // ─── AGREGAR A MANO (v3.59.0) ──────────────────────────
  /** Visitas anotadas en papel: se capturan una tras otra en el diálogo. */
  async agregarVisitas(): Promise<void> {
    const ref = this.dialog.open(AgregarVisitaDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: { alumnos: this.alumnosSig(), registros: this.todosRegistros() },
    });
    const agregadas = await firstValueFrom(ref.afterClosed());
    if (agregadas) {
      this.toastService.success(agregadas === 1 ? 'Se agregó 1 visita' : `Se agregaron ${agregadas} visitas`);
      await this.cargarDatos();
    }
  }

  // ─── EDITAR ────────────────────────────────────────────
  async editarRegistro(registro: Registro, ev?: Event): Promise<void> {
    ev?.stopPropagation();
    const ref = this.dialog.open(RegistroEditarDialogComponent, {
      width: '520px',
      data: { registro },
    });
    const resultado = await ref.afterClosed().toPromise() as RegistroEditarSalida | undefined;
    if (!resultado) return;
    if (resultado === 'eliminado') {
      this.toastService.success('Registro eliminado');
      await this.cargarDatos();
      return;
    }

    try {
      await this.databaseService.actualizarRegistroManual(registro.id, resultado);
      this.bitacora.registrar('registro-editado', describirRegistro(registro));
      this.toastService.success('Registro actualizado');
      await this.cargarDatos();
    } catch {
      this.toastService.error('No se pudo actualizar el registro');
    }
  }

  // ─── EXPORTAR XLSX (lazy-load del módulo xlsx) ──────────
  async exportarCSV(): Promise<void> {
    const datos = this.registrosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para exportar');
      return;
    }
    try {
      this.loading.show('Generando Excel…');
      await cederPintado();
      await this.exportService.exportarRegistrosXLSX(datos);
      this.toastService.success(`${datos.length} registros exportados a Excel`);
    } catch (err) {
      logError('Error al exportar registros:', err);
      this.toastService.error('No se pudo generar el archivo Excel');
    } finally {
      this.loading.hide();
    }
  }

  /** Los filtros de v3.58.0, en palabras, para la cabecera del PDF. */
  private describirFiltrosExtra(f: ReturnType<RegistrosComponent['filtros']>): string[] {
    const partes: string[] = [];
    if (f.tipo) partes.push(f.tipo === 'visitante' ? 'Solo visitantes' : 'Solo alumnos');
    if (f.salida) partes.push({ real: 'Salida real', sistema: 'Salida puesta por el sistema', sin: 'Sin salida' }[f.salida]);
    // Solo caracteres WinAnsi: la Helvetica de jsPDF no trae "∞" ni "–", y
    // uno solo vuelve ilegible toda la línea de filtros (revisión v3.58.0).
    const { duracionMin: min, duracionMax: max } = f;
    if (min !== null && max !== null) partes.push(`Duración: ${min} a ${max} min`);
    else if (min !== null) partes.push(`Duración: desde ${min} min`);
    else if (max !== null) partes.push(`Duración: hasta ${max} min`);
    return partes;
  }

  /** Evita un segundo clic mientras jsPDF trabaja (bloquea el hilo). */
  generandoPdf = false;

  async generarPDF(): Promise<void> {
    const datos = this.registrosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para generar el reporte');
      return;
    }
    if (this.generandoPdf) return;

    const eleccion = await elegirDetallePdf(this.dialog, datos.length);
    if (!eleccion) return;

    const tipoMap: Record<string, TipoReporte> = {
      'hoy': 'diario',
      'semana': 'semanal',
      'mes': 'mensual',
      'todo': 'personalizado',
    };

    const f = this.filtros();
    const tipo = tipoMap[f.rangoFecha] || 'personalizado';

    // Mismo rango que la lista. Sin límite (p. ej. "Todo"), el período
    // real son las fechas de los datos (ya no vienen siempre de más nuevo a
    // más viejo: la tabla se puede ordenar por otra columna).
    const { tsMin, tsMax } = this.rangoFiltroTs(f);
    let primero = Infinity, ultimo = -Infinity;
    for (const r of datos) { if (r._fechaTs < primero) primero = r._fechaTs; if (r._fechaTs > ultimo) ultimo = r._fechaTs; }
    const fechaInicio = new Date(Number.isFinite(tsMin) ? tsMin : primero);
    const fechaFin = new Date(Number.isFinite(tsMax) ? tsMax : ultimo);

    // Antes no se esperaba: el aviso de "generado" salía antes que el PDF y
    // un fallo de jsPDF no se le mostraba a nadie.
    this.generandoPdf = true;
    this.loading.show('Generando PDF…');
    try {
      await cederPintado();
      await this.reportService.generarReporteAccesos(datos, {
        tipo,
        fechaInicio,
        fechaFin,
        filtros: {
          busqueda: f.busqueda || undefined,
          carrera: f.carrera || undefined,
          motivo: f.motivo || undefined,
          otros: this.describirFiltrosExtra(f),
        },
        ...(eleccion === 'resumen' ? { secciones: { tablaRegistros: false } } : {}),
      });
      this.toastService.success(`Reporte PDF generado (${datos.length} registros)`);
    } catch (err) {
      logError('Error al generar el PDF de registros:', err);
      this.toastService.error('No se pudo generar el PDF');
    } finally {
      this.generandoPdf = false;
      this.loading.hide();
    }
  }



}