// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/alumnos/alumnos.component.ts ║
// ║  Stenbrary v3.4 — Fix navegación + CSV seguro        ║
// ║                                                      ║
// ║  FIX v3.4:                                           ║
// ║  - verDetalle() navega con matricula (antes con id)  ║
// ║  - exportarCSV() escapa campos con comas/comillas    ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, computed, signal, ChangeDetectionStrategy, inject } from '@angular/core';
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
import { MatMenuModule } from '@angular/material/menu';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Alumno } from '../../core/models';
import { ExportService } from '../../core/services/export.service';
import { logError } from '../../core/utils/logger';

/**
 * Versión enriquecida con strings precomputadas para que el template no
 * llame `nombreCompleto(a)` por cada fila en cada change-detection tick.
 */
type AlumnoRender = Alumno & {
  _nombreCompleto: string;
  _nombreLower: string;       // pre-bajo para búsqueda — evita toLowerCase() en filtro
  _matriculaLower: string;
  _apellidoPaternoLower: string;
  _apellidoMaternoLower: string;
  _nombreCompletoLower: string;
};

function buildAlumnoRender(a: Alumno): AlumnoRender {
  const nombreCompleto = `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`;
  return Object.assign(a, {
    _nombreCompleto: nombreCompleto,
    _nombreLower: a.nombre.toLowerCase(),
    _matriculaLower: a.matricula.toLowerCase(),
    _apellidoPaternoLower: a.apellidoPaterno.toLowerCase(),
    _apellidoMaternoLower: a.apellidoMaterno.toLowerCase(),
    _nombreCompletoLower: nombreCompleto.toLowerCase(),
  }) as AlumnoRender;
}

@Component({
    selector: 'app-alumnos',
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
        MatMenuModule,
    ],
    templateUrl: './alumnos.component.html',
    styleUrl: './alumnos.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlumnosComponent implements OnInit {
  private databaseService = inject(DatabaseService);
  private toastService = inject(ToastService);
  private exportService = inject(ExportService);
  private router = inject(Router);


  // ─── DATA ──────────────────────────────────────────────
  // Signal + computed: el filtrado se memoiza y solo se re-ejecuta si cambian
  // los filtros o la data base. Antes era un getter que recorría 2500 alumnos
  // decenas de veces por segundo en cada change detection.
  todosAlumnosSig = signal<AlumnoRender[]>([]);
  get todosAlumnos(): AlumnoRender[] { return this.todosAlumnosSig(); }
  set todosAlumnos(v: AlumnoRender[]) { this.todosAlumnosSig.set(v); }
  cargando = signal(true);

  // ─── FILTROS ───────────────────────────────────────────
  filtros = signal({
    busqueda: '',
    carrera: '',
    grado: '',
    grupo: '',
    turno: '',
    estado: '' as '' | 'activos' | 'inactivos',
    visitas: '' as '' | 'cero' | 'una' | 'pocas' | 'muchas' | 'rango',
    // v3.59.0: "Personalizado" — de N a M visitas; vacío = sin límite de ese lado.
    visitasMin: '',
    visitasMax: '',
  });

  /** Mapa matrícula → cantidad de visitas históricas (lazy: se rellena solo si se filtra por visitas). */
  private visitasPorMatricula = signal<Map<string, number>>(new Map());
  visitasCargadas = signal(false);

  // Opciones únicas extraídas de los datos reales
  carrerasUnicas = signal<string[]>([]);
  gradosUnicos = signal<number[]>([]);
  gruposUnicos = signal<string[]>([]);

  // ─── PAGINACIÓN ────────────────────────────────────────
  paginaActual = signal(0);
  filasPorPagina = 25;

  // ─── VISTA ─────────────────────────────────────────────
  vistaActual = signal<'lista' | 'cards'>('lista');

  toggleVista(): void {
    this.vistaActual.update(v => v === 'lista' ? 'cards' : 'lista');
  }

  // ─── TABLA ─────────────────────────────────────────────
  columnas: string[] = [
    'matricula', 'nombre', 'carrera', 'grado', 'grupo', 'turno', 'acciones',
  ];

  async ngOnInit(): Promise<void> {
    await this.cargarAlumnos();
    await this.aplicarFiltrosDeLaUrl();
  }

  /**
   * v3.59.0: Estadísticas → "Vinieron solo 1 vez" abre esta lista ya filtrada
   * (`?visitas=una&estado=activos`).
   */
  private async aplicarFiltrosDeLaUrl(): Promise<void> {
    const qp = this.router.parseUrl(this.router.url).queryParams;
    const visitas = ['cero', 'una', 'pocas', 'muchas'].includes(qp['visitas']) ? qp['visitas'] : '';
    const estado = ['activos', 'inactivos'].includes(qp['estado']) ? qp['estado'] : '';
    if (!visitas && !estado) return;
    if (visitas) await this.asegurarVisitasCargadas();
    this.filtros.update(f => ({ ...f, visitas, estado }));
  }

  // ─── CARGA DE DATOS ────────────────────────────────────
  /** Lazy-carga el mapa de visitas históricas (solo cuando el usuario activa filtro de visitas). */
  async asegurarVisitasCargadas(): Promise<void> {
    if (this.visitasCargadas()) return;
    try {
      const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
      const m = new Map<string, number>();
      for (const r of todosRegistros) {
        if (r.matricula === 'INVITADO') continue;
        m.set(r.matricula, (m.get(r.matricula) || 0) + 1);
      }
      this.visitasPorMatricula.set(m);
      this.visitasCargadas.set(true);
    } catch (e) {
      logError('No se pudieron cargar los conteos de visitas:', e);
    }
  }

  /** Total de visitas de un alumno (0 si nunca vino). Útil para mostrar en la fila. */
  visitasDe(matricula: string): number {
    return this.visitasPorMatricula().get(matricula) || 0;
  }

  async cargarAlumnos(): Promise<void> {
    try {
      this.cargando.set(true);
      const raw = await this.databaseService.obtenerTodosLosAlumnos();
      this.todosAlumnos = raw.map(buildAlumnoRender);

      // Extraer opciones únicas para los filtros
      const carreras = new Set<string>();
      const grados = new Set<number>();
      const grupos = new Set<string>();

      this.todosAlumnos.forEach(a => {
        if (a.carrera) carreras.add(a.carrera);
        if (a.grado) grados.add(a.grado);
        if (a.grupo) grupos.add(a.grupo);
      });

      this.carrerasUnicas.set([...carreras].sort());
      this.gradosUnicos.set([...grados].sort((a, b) => a - b));
      this.gruposUnicos.set([...grupos].sort());

      this.cargando.set(false);
    } catch (error) {
      logError('Error al cargar alumnos:', error);
      this.toastService.error('No se pudieron cargar los alumnos');
      this.cargando.set(false);
    }
  }

  // ─── FILTRADO (memoizado con computed) ─────────────────
  alumnosFiltradosSig = computed<AlumnoRender[]>(() => {
    const f = this.filtros();
    const todos = this.todosAlumnosSig();

    const termino = f.busqueda.trim().toLowerCase();
    const carrera = f.carrera;
    const gradoNum = f.grado ? Number(f.grado) : null;
    const grupo = f.grupo;
    const turno = f.turno;
    const estado = f.estado;
    const filtroVisitas = f.visitas;
    const mapaVisitas = this.visitasPorMatricula();

    // Una sola pasada en lugar de 5–6 .filter() encadenados
    const resultado: AlumnoRender[] = [];
    for (const a of todos) {
      if (carrera && a.carrera !== carrera) continue;
      if (gradoNum !== null && a.grado !== gradoNum) continue;
      if (grupo && a.grupo !== grupo) continue;
      if (turno && a.turno !== turno) continue;
      if (estado === 'activos' && a.activo === false) continue;
      if (estado === 'inactivos' && a.activo !== false) continue;
      if (filtroVisitas) {
        const v = mapaVisitas.get(a.matricula) || 0;
        if (filtroVisitas === 'cero' && v !== 0) continue;
        if (filtroVisitas === 'una' && v !== 1) continue;
        if (filtroVisitas === 'pocas' && (v < 2 || v > 4)) continue;
        if (filtroVisitas === 'muchas' && v < 5) continue;
        if (filtroVisitas === 'rango') {
          if (f.visitasMin !== '' && v < Number(f.visitasMin)) continue;
          if (f.visitasMax !== '' && v > Number(f.visitasMax)) continue;
        }
      }
      if (termino) {
        // Usa los _Lower precomputados en buildAlumnoRender — sin toLowerCase() por fila
        if (
          !a._matriculaLower.includes(termino) &&
          !a._nombreLower.includes(termino) &&
          !a._apellidoPaternoLower.includes(termino) &&
          !a._apellidoMaternoLower.includes(termino) &&
          !a._nombreCompletoLower.includes(termino)
        ) continue;
      }
      resultado.push(a);
    }
    return resultado;
  });

  get alumnosFiltrados(): AlumnoRender[] {
    return this.alumnosFiltradosSig();
  }

  alumnosPaginadosSig = computed<AlumnoRender[]>(() => {
    const inicio = this.paginaActual() * this.filasPorPagina;
    return this.alumnosFiltradosSig().slice(inicio, inicio + this.filasPorPagina);
  });

  get alumnosPaginados(): AlumnoRender[] {
    return this.alumnosPaginadosSig();
  }

  get totalPaginas(): number {
    return Math.ceil(this.alumnosFiltradosSig().length / this.filasPorPagina);
  }

  get hayFiltrosActivos(): boolean {
    const f = this.filtros();
    return !!(f.busqueda || f.carrera || f.grado || f.grupo || f.turno || f.estado || f.visitas);
  }

  // ─── ACCIONES DE FILTRO ────────────────────────────────
  actualizarFiltro(campo: string, valor: string): void {
    this.filtros.update(f => ({ ...f, [campo]: valor }));
    this.paginaActual.set(0);
  }

  /** Limpia un filtro individual sin tocar los demás. */
  limpiarFiltro(campo: 'busqueda' | 'carrera' | 'grado' | 'grupo' | 'turno' | 'estado' | 'visitas'): void {
    this.filtros.update(f => ({ ...f, [campo]: '', ...(campo === 'visitas' ? { visitasMin: '', visitasMax: '' } : {}) }));
    this.paginaActual.set(0);
  }

  limpiarFiltros(): void {
    this.filtros.set({
      busqueda: '', carrera: '', grado: '', grupo: '', turno: '', estado: '', visitas: '',
      visitasMin: '', visitasMax: '',
    });
    this.paginaActual.set(0);
  }

  /** Llamado desde el template cuando se selecciona filtro de visitas. */
  async onFiltroVisitasChange(valor: string): Promise<void> {
    if (valor) await this.asegurarVisitasCargadas();
    this.actualizarFiltro('visitas', valor);
  }

  /** Límite del rango de visitas: solo enteros ≥ 0; lo demás = sin límite. */
  actualizarRangoVisitas(campo: 'visitasMin' | 'visitasMax', valor: string | number | null): void {
    const n = Number(valor);
    const limpio = valor === null || valor === '' || !Number.isFinite(n) || n < 0 ? '' : String(Math.floor(n));
    this.actualizarFiltro(campo, limpio);
  }

  /** Texto de la ficha del rango: "15 a 20 visitas", "30+ visitas", "hasta 3 visitas". */
  get textoRangoVisitas(): string {
    const { visitasMin: min, visitasMax: max } = this.filtros();
    if (min !== '' && max !== '') return min === max ? `${min} visitas` : `${min} a ${max} visitas`;
    if (min !== '') return `${min}+ visitas`;
    if (max !== '') return `hasta ${max} visitas`;
    return 'Visitas: escribe un rango';
  }

  // ─── PAGINACIÓN ────────────────────────────────────────
  paginaAnterior(): void {
    if (this.paginaActual() > 0) this.paginaActual.update(p => p - 1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas - 1) this.paginaActual.update(p => p + 1);
  }

  // ─── NAVEGACIÓN ────────────────────────────────────────
  verDetalle(alumno: Alumno): void {
    // FIX v3.4: navegar con matrícula (antes enviaba alumno.id → UUID incompatible)
    this.router.navigate(['/detalle-alumno', alumno.matricula]);
  }

  irARegistrar(): void {
    this.router.navigate(['/registro-alumno']);
  }

  irAImportar(): void {
    this.router.navigate(['/importar-alumnos']);
  }

  // ─── UTILIDADES ────────────────────────────────────────
  // nombreCompleto se precomputa en buildAlumnoRender como `_nombreCompleto`.
  // El template lo lee directo: `{{ a._nombreCompleto }}` (sin invocar fn).

 async exportarCSV(): Promise<void> {
    const datos = this.alumnosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para exportar');
      return;
    }
    try {
      await this.exportService.exportarAlumnosXLSX(datos);
      this.toastService.success(`${datos.length} alumnos exportados a Excel`);
    } catch (err) {
      logError('Error al exportar alumnos:', err);
      this.toastService.error('No se pudo generar el archivo Excel');
    }
  }

}