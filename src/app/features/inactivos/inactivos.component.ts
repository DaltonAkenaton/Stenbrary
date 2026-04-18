// ╔══════════════════════════════════════════════════════╗
// ║  inactivos.component.ts                              ║
// ║  Stenbrary v3.10.0 — Alertas de inactividad          ║
// ║                                                      ║
// ║  Lista alumnos que no han venido en un umbral        ║
// ║  configurable de días. Umbral en vivo (presets +     ║
// ║  input libre). Soporta búsqueda, filtro por carrera, ║
// ║  ordenamiento y dos vistas (lista / tarjetas).       ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { DatabaseService } from '../../core/services/database.service';
import { ConfigService } from '../../core/services/config.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { Alumno } from '../../core/models';

interface AlumnoInactivo {
  alumno: Alumno;
  ultimaVisita: Date | null;
  diasSinVenir: number;
}

type VistaMode = 'lista' | 'cards';
type OrdenMode = 'dias-desc' | 'dias-asc' | 'nombre' | 'carrera';

@Component({
  selector: 'app-inactivos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './inactivos.component.html',
  styleUrl: './inactivos.component.scss',
})
export class InactivosComponent implements OnInit {

  readonly presets = [7, 15, 30, 60, 90, 180];
  readonly opcionesOrden: { valor: OrdenMode; etiqueta: string; icono: string }[] = [
    { valor: 'dias-desc', etiqueta: 'Más inactivos primero', icono: 'arrow_downward' },
    { valor: 'dias-asc',  etiqueta: 'Menos inactivos primero', icono: 'arrow_upward' },
    { valor: 'nombre',    etiqueta: 'Nombre A–Z',              icono: 'sort_by_alpha' },
    { valor: 'carrera',   etiqueta: 'Por carrera',             icono: 'school' },
  ];

  umbralDias = signal(30);
  todos = signal<AlumnoInactivo[]>([]);
  cargando = signal(true);

  // ─── FILTROS / UI ─────────────────────────────────────
  busqueda = signal('');
  filtroCarrera = signal<string>('');
  orden = signal<OrdenMode>('dias-desc');
  vista = signal<VistaMode>('lista');

  /** Alumnos sobre el umbral (base sin filtros de búsqueda/carrera). */
  inactivosBase = computed(() =>
    this.todos().filter(i => i.diasSinVenir >= this.umbralDias())
  );

  /** Carreras presentes en los inactivos base — para popular el select. */
  carrerasDisponibles = computed(() => {
    const set = new Set<string>();
    this.inactivosBase().forEach(i => { if (i.alumno.carrera) set.add(i.alumno.carrera); });
    return Array.from(set).sort();
  });

  /** Lista final tras búsqueda + carrera + orden. */
  inactivosFiltrados = computed(() => {
    const term = this.busqueda().trim().toLowerCase();
    const carrera = this.filtroCarrera();

    let lista = this.inactivosBase().filter(i => {
      if (carrera && i.alumno.carrera !== carrera) return false;
      if (term) {
        const nombre = this.nombreCompleto(i.alumno).toLowerCase();
        const matricula = i.alumno.matricula.toLowerCase();
        if (!nombre.includes(term) && !matricula.includes(term)) return false;
      }
      return true;
    });

    // Orden
    const ord = this.orden();
    lista = [...lista].sort((a, b) => {
      switch (ord) {
        case 'dias-desc': return b.diasSinVenir - a.diasSinVenir;
        case 'dias-asc':  return a.diasSinVenir - b.diasSinVenir;
        case 'nombre':    return this.nombreCompleto(a.alumno).localeCompare(this.nombreCompleto(b.alumno));
        case 'carrera':   return (a.alumno.carrera || '').localeCompare(b.alumno.carrera || '')
                                 || b.diasSinVenir - a.diasSinVenir;
      }
    });

    return lista;
  });

  nuncaHanVenido = computed(() =>
    this.inactivosBase().filter(i => !isFinite(i.diasSinVenir)).length
  );

  constructor(
    private db: DatabaseService,
    public configService: ConfigService,
    private router: Router,
    private toast: ToastService,
    private loading: LoadingService,
  ) {
    this.umbralDias.set(this.configService.umbralInactividadDias || 30);
  }

  async ngOnInit(): Promise<void> {
    try {
      this.cargando.set(true);
      const lista = await this.db.obtenerAlumnosInactivos(1);
      this.todos.set(lista);
    } catch (e) {
      console.error('❌ Error cargando inactivos', e);
      this.toast.error('No se pudo cargar la lista de inactivos');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── HANDLERS ─────────────────────────────────────────

  setUmbral(valor: number): void {
    const n = Math.max(1, Math.min(3650, Math.floor(valor) || 1));
    this.umbralDias.set(n);
  }

  guardarComoDefault(): void {
    this.configService.setUmbralInactividadDias(this.umbralDias());
    this.toast.success(
      `Configuración predeterminada actualizada (${this.umbralDias()} días)`,
    );
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroCarrera.set('');
  }

  setVista(v: VistaMode): void {
    this.vista.set(v);
  }

  // ─── HELPERS ──────────────────────────────────────────

  nombreCompleto(a: Alumno): string {
    return `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`.trim();
  }

  iniciales(a: Alumno): string {
    const n = (a.nombre || '').charAt(0);
    const p = (a.apellidoPaterno || '').charAt(0);
    return `${n}${p}`.toUpperCase();
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  isFinite(n: number): boolean {
    return Number.isFinite(n);
  }

  gravedadBadge(dias: number): 'normal' | 'medio' | 'alto' | 'nunca' {
    if (!Number.isFinite(dias)) return 'nunca';
    const umbral = this.umbralDias();
    if (dias >= umbral * 3) return 'alto';
    if (dias >= umbral * 2) return 'medio';
    return 'normal';
  }
}
