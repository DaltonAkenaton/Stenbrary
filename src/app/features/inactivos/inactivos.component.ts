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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DatabaseService } from '../../core/services/database.service';
import { ConfigService } from '../../core/services/config.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { ExportService } from '../../core/services/export.service';
import { Alumno } from '../../core/models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface AlumnoInactivo {
  alumno: Alumno;
  ultimaVisita: Date | null;
  diasSinVenir: number;
}

/**
 * Versión enriquecida con strings precomputadas para evitar que
 * `nombreCompleto`, `iniciales`, `formatearFecha` corran en cada
 * change-detection tick (que era el lag visible al scroll).
 */
interface AlumnoInactivoRender extends AlumnoInactivo {
  _nombreCompleto: string;
  _nombreLower: string;
  _iniciales: string;
  _ultimaVisitaStr: string; // "" si nunca
  _isFinite: boolean;
  _gravedad: 'normal' | 'medio' | 'alto' | 'nunca';
}

const FMT_FECHA_INACTIVO = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric',
});

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
    MatDialogModule,
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
  todos = signal<AlumnoInactivoRender[]>([]);
  cargando = signal(true);

  // ─── FILTROS / UI ─────────────────────────────────────
  busqueda = signal('');
  filtroCarrera = signal<string>('');
  orden = signal<OrdenMode>('dias-desc');
  vista = signal<VistaMode>('lista');

  /** Alumnos sobre el umbral (base sin filtros de búsqueda/carrera). */
  inactivosBase = computed(() => {
    const umbral = this.umbralDias();
    const todos = this.todos();
    const out: AlumnoInactivoRender[] = [];
    for (const i of todos) {
      if (i.diasSinVenir < umbral) continue;
      // Recalcular gravedad si el umbral cambió (depende del umbral actual)
      i._gravedad = this.calcularGravedad(i.diasSinVenir, umbral);
      out.push(i);
    }
    return out;
  });

  /** Carreras presentes en los inactivos base — para popular el select. */
  carrerasDisponibles = computed(() => {
    const set = new Set<string>();
    for (const i of this.inactivosBase()) {
      if (i.alumno.carrera) set.add(i.alumno.carrera);
    }
    return Array.from(set).sort();
  });

  /** Lista final tras búsqueda + carrera + orden. */
  inactivosFiltrados = computed(() => {
    const term = this.busqueda().trim().toLowerCase();
    const carrera = this.filtroCarrera();
    const ord = this.orden();
    const base = this.inactivosBase();

    // Una sola pasada de filtrado (sin construir Date ni llamar nombreCompleto)
    const lista: AlumnoInactivoRender[] = [];
    for (const i of base) {
      if (carrera && i.alumno.carrera !== carrera) continue;
      if (term) {
        if (!i._nombreLower.includes(term) && !i.alumno.matricula.toLowerCase().includes(term)) continue;
      }
      lista.push(i);
    }

    // Sort sobre la lista filtrada (no clonamos el array completo de base)
    return lista.sort((a, b) => {
      switch (ord) {
        case 'dias-desc': return b.diasSinVenir - a.diasSinVenir;
        case 'dias-asc':  return a.diasSinVenir - b.diasSinVenir;
        case 'nombre':    return a._nombreCompleto.localeCompare(b._nombreCompleto);
        case 'carrera':   return (a.alumno.carrera || '').localeCompare(b.alumno.carrera || '')
                                 || b.diasSinVenir - a.diasSinVenir;
      }
    });
  });

  nuncaHanVenido = computed(() => {
    let n = 0;
    for (const i of this.inactivosBase()) if (!isFinite(i.diasSinVenir)) n++;
    return n;
  });

  private calcularGravedad(dias: number, umbral: number): 'normal' | 'medio' | 'alto' | 'nunca' {
    if (!Number.isFinite(dias)) return 'nunca';
    if (dias >= umbral * 3) return 'alto';
    if (dias >= umbral * 2) return 'medio';
    return 'normal';
  }

  constructor(
    private db: DatabaseService,
    public configService: ConfigService,
    private router: Router,
    private toast: ToastService,
    private loading: LoadingService,
    private exportService: ExportService,
    private dialog: MatDialog,
  ) {
    this.umbralDias.set(this.configService.umbralInactividadDias || 30);
  }

  async ngOnInit(): Promise<void> {
    try {
      this.cargando.set(true);
      const lista = await this.db.obtenerAlumnosInactivos(1);
      this.todos.set(lista.map(i => this.enriquecer(i)));
    } catch (e) {
      console.error('❌ Error cargando inactivos', e);
      this.toast.error('No se pudo cargar la lista de inactivos');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Precomputa strings de display y datos derivados para cada alumno. */
  private enriquecer(i: AlumnoInactivo): AlumnoInactivoRender {
    const nombre = `${i.alumno.nombre} ${i.alumno.apellidoPaterno} ${i.alumno.apellidoMaterno}`.trim();
    const ini = `${(i.alumno.nombre || '').charAt(0)}${(i.alumno.apellidoPaterno || '').charAt(0)}`.toUpperCase();
    return {
      ...i,
      _nombreCompleto: nombre,
      _nombreLower: nombre.toLowerCase(),
      _iniciales: ini,
      _ultimaVisitaStr: i.ultimaVisita ? FMT_FECHA_INACTIVO.format(i.ultimaVisita) : '',
      _isFinite: Number.isFinite(i.diasSinVenir),
      _gravedad: this.calcularGravedad(i.diasSinVenir, this.umbralDias()),
    };
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

  /** Desactiva al alumno (soft delete: activo=false). Confirma antes. */
  async marcarComoInactivo(alumno: Alumno, ev: Event): Promise<void> {
    ev.stopPropagation();
    ev.preventDefault();

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titulo: '¿Desactivar alumno?',
        mensaje:
          `${this.nombreCompleto(alumno)} (${alumno.matricula}) dejará de aparecer ` +
          `en listados y búsquedas por defecto. Sus registros históricos se conservan. ` +
          `Puedes reactivarlo desde su perfil.`,
        variante: 'warning',
        textoConfirmar: 'Desactivar',
        icono: 'person_off',
      } as ConfirmDialogData,
    });

    const ok = await ref.afterClosed().toPromise();
    if (!ok) return;

    if (!alumno.id) {
      this.toast.error('Alumno sin id — no se puede desactivar');
      return;
    }

    try {
      this.loading.show('Desactivando alumno...');
      await this.db.desactivarAlumno(alumno.id);
      // Recargar la lista — el alumno desactivado dejará de aparecer
      // (obtenerAlumnosInactivos filtra activo !== false)
      const lista = await this.db.obtenerAlumnosInactivos(1);
      this.todos.set(lista.map(i => this.enriquecer(i)));
      this.toast.success(`${this.nombreCompleto(alumno)} fue desactivado`);
    } catch (e) {
      console.error('❌ Error al desactivar alumno', e);
      this.toast.error('No se pudo desactivar al alumno');
    } finally {
      this.loading.hide();
    }
  }

  /** Exporta la lista de inactivos visible (tras filtros) a Excel. */
  exportarExcel(): void {
    const lista = this.inactivosFiltrados();
    if (lista.length === 0) {
      this.toast.warning('No hay alumnos inactivos para exportar');
      return;
    }
    const alumnos = lista.map(i => i.alumno);
    const fecha = new Date().toISOString().slice(0, 10);
    this.exportService.exportarAlumnosXLSX(
      alumnos,
      `inactivos_${this.umbralDias()}d_${fecha}`,
    );
    this.toast.success(`${alumnos.length} alumnos exportados a Excel`);
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
