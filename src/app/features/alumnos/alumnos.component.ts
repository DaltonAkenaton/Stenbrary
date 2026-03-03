// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/alumnos/alumnos.component.ts ║
// ║  Stenbrary v3.4 — Fix navegación + CSV seguro        ║
// ║                                                      ║
// ║  FIX v3.4:                                           ║
// ║  - verDetalle() navega con matricula (antes con id)  ║
// ║  - exportarCSV() escapa campos con comas/comillas    ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, signal } from '@angular/core';
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
  todosAlumnos: Alumno[] = [];
  cargando = true;

  // ─── FILTROS ───────────────────────────────────────────
  filtros = signal({
    busqueda: '',
    carrera: '',
    grado: '',
    grupo: '',
    turno: '',
  });

  // Opciones únicas extraídas de los datos reales
  carrerasUnicas = signal<string[]>([]);
  gradosUnicos = signal<number[]>([]);
  gruposUnicos = signal<string[]>([]);

  // ─── PAGINACIÓN ────────────────────────────────────────
  paginaActual = signal(0);
  filasPorPagina = 25;

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

  // ─── FILTRADO ──────────────────────────────────────────
  get alumnosFiltrados(): Alumno[] {
    const f = this.filtros();
    let resultado = [...this.todosAlumnos];

    if (f.busqueda.trim()) {
      const termino = f.busqueda.toLowerCase().trim();
      resultado = resultado.filter(a =>
        a.matricula.toLowerCase().includes(termino) ||
        a.nombre.toLowerCase().includes(termino) ||
        a.apellidoPaterno.toLowerCase().includes(termino) ||
        a.apellidoMaterno.toLowerCase().includes(termino) ||
        `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`.toLowerCase().includes(termino)
      );
    }

    if (f.carrera) resultado = resultado.filter(a => a.carrera === f.carrera);
    if (f.grado) resultado = resultado.filter(a => a.grado === Number(f.grado));
    if (f.grupo) resultado = resultado.filter(a => a.grupo === f.grupo);
    if (f.turno) resultado = resultado.filter(a => a.turno === f.turno);

    return resultado;
  }

  get alumnosPaginados(): Alumno[] {
    const inicio = this.paginaActual() * this.filasPorPagina;
    return this.alumnosFiltrados.slice(inicio, inicio + this.filasPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.alumnosFiltrados.length / this.filasPorPagina);
  }

  get hayFiltrosActivos(): boolean {
    const f = this.filtros();
    return !!(f.busqueda || f.carrera || f.grado || f.grupo || f.turno);
  }

  // ─── ACCIONES DE FILTRO ────────────────────────────────
  actualizarFiltro(campo: string, valor: string): void {
    this.filtros.update(f => ({ ...f, [campo]: valor }));
    this.paginaActual.set(0);
  }

  limpiarFiltros(): void {
    this.filtros.set({ busqueda: '', carrera: '', grado: '', grupo: '', turno: '' });
    this.paginaActual.set(0);
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

  /**
   * Escapa un campo para CSV: si contiene comas, comillas o saltos de línea,
   * lo envuelve en comillas dobles y duplica las comillas internas.
   */
  private escaparCSV(valor: string): string {
    if (valor.includes(',') || valor.includes('"') || valor.includes('\n')) {
      return `"${valor.replace(/"/g, '""')}"`;
    }
    return valor;
  }
}