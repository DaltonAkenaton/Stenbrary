// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/alumnos/alumnos.component.ts ║
// ║  Stenbrary v3.4 — Fix navegación + CSV seguro        ║
// ║                                                      ║
// ║  FIX v3.4:                                           ║
// ║  - verDetalle() navega con matricula (antes con id)  ║
// ║  - exportarCSV() escapa campos con comas/comillas    ║
// ╚══════════════════════════════════════════════════════╝

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
import { MatMenuModule } from '@angular/material/menu';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Alumno } from '../../core/models';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-alumnos',
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
    MatMenuModule,
  ],
  templateUrl: './alumnos.component.html',
  styleUrl: './alumnos.component.scss',
})
export class AlumnosComponent implements OnInit {

  // ─── DATA ──────────────────────────────────────────────
  // Signal + computed: el filtrado se memoiza y solo se re-ejecuta si cambian
  // los filtros o la data base. Antes era un getter que recorría 2500 alumnos
  // decenas de veces por segundo en cada change detection.
  todosAlumnosSig = signal<Alumno[]>([]);
  get todosAlumnos(): Alumno[] { return this.todosAlumnosSig(); }
  set todosAlumnos(v: Alumno[]) { this.todosAlumnosSig.set(v); }
  cargando = true;

  // ─── FILTROS ───────────────────────────────────────────
  filtros = signal({
    busqueda: '',
    carrera: '',
    grado: '',
    grupo: '',
    turno: '',
    estado: '' as '' | 'activos' | 'inactivos',
    visitas: '' as '' | 'cero' | 'una' | 'pocas' | 'muchas',
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

  constructor(
  private databaseService: DatabaseService,
  private toastService: ToastService,
  private exportService: ExportService,  // ← AGREGAR
  private router: Router,
) {}

  async ngOnInit(): Promise<void> {
    await this.cargarAlumnos();
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
      console.error('No se pudieron cargar los conteos de visitas:', e);
    }
  }

  /** Total de visitas de un alumno (0 si nunca vino). Útil para mostrar en la fila. */
  visitasDe(matricula: string): number {
    return this.visitasPorMatricula().get(matricula) || 0;
  }

  async cargarAlumnos(): Promise<void> {
    try {
      this.cargando = true;
      this.todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();

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

      this.cargando = false;
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      this.cargando = false;
    }
  }

  // ─── FILTRADO (memoizado con computed) ─────────────────
  alumnosFiltradosSig = computed<Alumno[]>(() => {
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
    const resultado: Alumno[] = [];
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
      }
      if (termino) {
        const m = a.matricula.toLowerCase();
        const n = a.nombre.toLowerCase();
        const ap = a.apellidoPaterno.toLowerCase();
        const am = a.apellidoMaterno.toLowerCase();
        if (
          !m.includes(termino) &&
          !n.includes(termino) &&
          !ap.includes(termino) &&
          !am.includes(termino) &&
          !`${n} ${ap} ${am}`.includes(termino)
        ) continue;
      }
      resultado.push(a);
    }
    return resultado;
  });

  get alumnosFiltrados(): Alumno[] {
    return this.alumnosFiltradosSig();
  }

  alumnosPaginadosSig = computed<Alumno[]>(() => {
    const inicio = this.paginaActual() * this.filasPorPagina;
    return this.alumnosFiltradosSig().slice(inicio, inicio + this.filasPorPagina);
  });

  get alumnosPaginados(): Alumno[] {
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
    this.filtros.update(f => ({ ...f, [campo]: '' }));
    this.paginaActual.set(0);
  }

  limpiarFiltros(): void {
    this.filtros.set({
      busqueda: '', carrera: '', grado: '', grupo: '', turno: '', estado: '', visitas: '',
    });
    this.paginaActual.set(0);
  }

  /** Llamado desde el template cuando se selecciona filtro de visitas. */
  async onFiltroVisitasChange(valor: string): Promise<void> {
    if (valor) await this.asegurarVisitasCargadas();
    this.actualizarFiltro('visitas', valor);
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
  nombreCompleto(a: Alumno): string {
    return `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`;
  }

 exportarCSV(): void {
    const datos = this.alumnosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para exportar');
      return;
    }
    this.exportService.exportarAlumnosXLSX(datos);
    this.toastService.success(`${datos.length} alumnos exportados a Excel`);
  }

}