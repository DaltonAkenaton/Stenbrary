// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/registros/                   ║
// ║        registros.component.ts                        ║
// ║  Stenbrary v3.4 — Fix exportación CSV                ║
// ║                                                      ║
// ║  FIX v3.4:                                           ║
// ║  - exportarCSV() escapa campos con comas/comillas    ║
// ╚══════════════════════════════════════════════════════╝
import { ReportService, TipoReporte } from '../../core/services/report.service';
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Registro, Alumno, Motivo } from '../../core/models';
import { ExportService } from '../../core/services/export.service';
import { RegistroDetalleDialogComponent } from '../detalle-alumno/registro-detalle-dialog/registro-detalle-dialog.component';
import { RegistroEditarDialogComponent, RegistroEditarResultado } from '../detalle-alumno/registro-editar-dialog/registro-editar-dialog.component';

type RangoFecha = 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo' | 'personalizado';

/**
 * Registro extendido con strings precomputadas para la tabla.
 * Construido una sola vez en `cargarDatos()`, evita formatear en cada render.
 */
type RegistroRender = Registro & {
  _fechaTs: number;
  _fechaDateStr: string;     // "12/04/2026"
  _horaEntradaStr: string;   // "14:30"
  _horaSalidaStr: string;    // "16:45" o ""
  _duracionStr: string;      // "2h 15m" o ""
};

const FMT_FECHA = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});
const FMT_HORA = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit', minute: '2-digit',
});

function formatearDuracionStr(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function buildRegistroRender(r: Registro): RegistroRender {
  const entrada = new Date(r.fechaHora);
  const salida = r.horaSalida ? new Date(r.horaSalida) : null;
  return Object.assign(r, {
    _fechaTs: entrada.getTime(),
    _fechaDateStr: FMT_FECHA.format(entrada),
    _horaEntradaStr: FMT_HORA.format(entrada),
    _horaSalidaStr: salida ? FMT_HORA.format(salida) : '',
    _duracionStr: r.duracionMinutos != null ? formatearDuracionStr(r.duracionMinutos) : '',
  }) as RegistroRender;
}

@Component({
  selector: 'app-registros',
  standalone: true,
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
  ],
  templateUrl: './registros.component.html',
  styleUrl: './registros.component.scss',
})
export class RegistrosComponent implements OnInit {

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
  });

  // Rango personalizado (signals para que disparen el computed)
  fechaPersonalizadaInicioSig = signal('');
  fechaPersonalizadaFinSig = signal('');
  get fechaPersonalizadaInicio(): string { return this.fechaPersonalizadaInicioSig(); }
  set fechaPersonalizadaInicio(v: string) { this.fechaPersonalizadaInicioSig.set(v); this.paginaActual.set(0); }
  get fechaPersonalizadaFin(): string { return this.fechaPersonalizadaFinSig(); }
  set fechaPersonalizadaFin(v: string) { this.fechaPersonalizadaFinSig.set(v); this.paginaActual.set(0); }

  carrerasUnicas = signal<string[]>([]);

  // ─── PAGINACIÓN ────────────────────────────────────────
  paginaActual = signal(0);
  filasPorPagina = 30;

  // ─── TABLA ─────────────────────────────────────────────
columnas: string[] = [
      'fechaHora', 'matricula', 'nombre', 'carrera',
      'motivo', 'salida', 'duracion', 'acciones'
    ];
  constructor(
  private databaseService: DatabaseService,
  private toastService: ToastService,
  private exportService: ExportService,
  private reportService: ReportService,
  private router: Router,
  private dialog: MatDialog,
) {}

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
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
      this.motivos = motivos;

      const carreras = new Set<string>();
      alumnos.forEach(a => { if (a.carrera) carreras.add(a.carrera); });
      this.carrerasUnicas.set([...carreras].sort());

      this.cargando = false;
    } catch (error) {
      console.error('Error al cargar registros:', error);
      this.cargando = false;
    }
  }

  // ─── FILTRADO (memoizado con computed) ─────────────────
  // Una sola pasada por los 90k registros por cambio de filtro/data.
  registrosFiltradosSig = computed<RegistroRender[]>(() => {
    const f = this.filtros();
    const todos = this.todosRegistros();

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
      const d = new Date(inicioHoy); d.setDate(d.getDate() - 7);
      tsMin = d.getTime();
    } else if (f.rangoFecha === 'mes') {
      const d = new Date(inicioHoy); d.setDate(d.getDate() - 30);
      tsMin = d.getTime();
    } else if (f.rangoFecha === 'personalizado') {
      const ini = this.fechaPersonalizadaInicioSig();
      const fin = this.fechaPersonalizadaFinSig();
      if (ini) { const d = new Date(ini); d.setHours(0, 0, 0, 0); tsMin = d.getTime(); }
      if (fin) { const d = new Date(fin); d.setHours(23, 59, 59, 999); tsMax = d.getTime(); }
    }

    const termino = f.busqueda.trim().toLowerCase();
    const motivoFiltro = f.motivo;
    const carreraFiltro = f.carrera;

    // Una sola pasada, sin construir Date objects (usa _fechaTs precomputado)
    const resultado: RegistroRender[] = [];
    for (const r of todos) {
      if (r._fechaTs < tsMin || r._fechaTs > tsMax) continue;
      if (motivoFiltro && r.motivoNombre !== motivoFiltro) continue;
      if (carreraFiltro && r.carrera !== carreraFiltro) continue;
      if (termino) {
        const m = r.matricula.toLowerCase();
        const n = r.nombreCompleto.toLowerCase();
        if (!m.includes(termino) && !n.includes(termino)) continue;
      }
      resultado.push(r);
    }
    return resultado;
  });

  get registrosFiltrados(): RegistroRender[] {
    return this.registrosFiltradosSig();
  }

  registrosPaginadosSig = computed<RegistroRender[]>(() => {
    const inicio = this.paginaActual() * this.filasPorPagina;
    return this.registrosFiltradosSig().slice(inicio, inicio + this.filasPorPagina);
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
    return !!(f.busqueda || f.motivo || f.carrera);
  }

  // ─── ACCIONES ──────────────────────────────────────────
  actualizarFiltro(campo: string, valor: string): void {
    this.filtros.update(f => ({ ...f, [campo]: valor }));
    this.paginaActual.set(0);
  }

  limpiarFiltros(): void {
    this.filtros.set({ busqueda: '', rangoFecha: 'hoy', motivo: '', carrera: '' });
    this.paginaActual.set(0);
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 0) this.paginaActual.update(p => p - 1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas - 1) this.paginaActual.update(p => p + 1);
  }

  // ─── FORMATO ───────────────────────────────────────────
  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-MX', {
      hour: '2-digit', minute: '2-digit',
    });
  }


  formatearDuracion(minutos: number): string {                    
      if (minutos < 60) return `${minutos} min`;                    
      const h = Math.floor(minutos / 60);                           
      const m = minutos % 60;                                       
      return m > 0 ? `${h}h ${m}m` : `${h}h`;                      
    }   


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
      data: { registro },
    });
  }

  // ─── EDITAR ────────────────────────────────────────────
  async editarRegistro(registro: Registro, ev?: Event): Promise<void> {
    ev?.stopPropagation();
    const ref = this.dialog.open(RegistroEditarDialogComponent, {
      width: '520px',
      data: { registro },
    });
    const resultado = await ref.afterClosed().toPromise() as RegistroEditarResultado | undefined;
    if (!resultado) return;

    try {
      await this.databaseService.actualizarRegistroManual(registro.id, resultado);
      this.toastService.success('Registro actualizado');
      await this.cargarDatos();
    } catch {
      this.toastService.error('No se pudo actualizar el registro');
    }
  }

  // ─── EXPORTAR CSV (FIX v3.4: escapar campos) ──────────
  exportarCSV(): void {
    const datos = this.registrosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para exportar');
      return;
    }
    this.exportService.exportarRegistrosXLSX(datos);
    this.toastService.success(`${datos.length} registros exportados a Excel`);
  }

  


  generarPDF(): void {
    const datos = this.registrosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para generar el reporte');
      return;
    }

    const tipoMap: Record<string, TipoReporte> = {
      'hoy': 'diario',
      'semana': 'semanal',
      'mes': 'mensual',
      'todo': 'personalizado',
    };

    const f = this.filtros();
    const tipo = tipoMap[f.rangoFecha] || 'personalizado';

    this.reportService.generarReporteAccesos(datos, {
      tipo,
      filtros: {
        busqueda: f.busqueda || undefined,
        carrera: f.carrera || undefined,
        motivo: f.motivo || undefined,
      },
    });
    this.toastService.success(`Reporte PDF generado (${datos.length} registros)`);
  }



}