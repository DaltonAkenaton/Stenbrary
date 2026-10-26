// ╔══════════════════════════════════════════════════════╗
// ║  inactivos.component.ts                              ║
// ║  Stenbrary v3.10.0 — Alertas de inactividad          ║
// ║                                                      ║
// ║  Lista alumnos que no han venido en un umbral        ║
// ║  configurable de días. Umbral en vivo (presets +     ║
// ║  input libre). Soporta búsqueda, filtro por carrera, ║
// ║  ordenamiento y dos vistas (lista / tarjetas).       ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';

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
import { fechaLocalISO } from '../../core/utils/tiempo.utils';
import { BitacoraService, describirAlumno } from '../../core/services/bitacora.service';

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
    imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDialogModule
],
    templateUrl: './inactivos.component.html',
    styleUrl: './inactivos.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InactivosComponent implements OnInit {
  private db = inject(DatabaseService);
  configService = inject(ConfigService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private loading = inject(LoadingService);
  private exportService = inject(ExportService);
  private dialog = inject(MatDialog);


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

  /**
   * Si se muestran también los alumnos que nunca han venido. Por defecto no:
   * "inactivo" es quien vino y dejó de venir (decisión P1); los que nunca
   * han venido suelen ser importados del padrón y van aparte.
   */
  incluirNuncaVinieron = signal(false);

  /** Inactivos con historial: la cifra que también muestra Estadísticas. */
  inactivosConHistorial = computed(() =>
    this.todos().filter(i => Number.isFinite(i.diasSinVenir) && i.diasSinVenir >= this.umbralDias()).length,
  );

  /** Alumnos sobre el umbral (base sin filtros de búsqueda/carrera). */
  inactivosBase = computed(() => {
    const umbral = this.umbralDias();
    const todos = this.todos();
    const conNunca = this.incluirNuncaVinieron();
    const out: AlumnoInactivoRender[] = [];
    for (const i of todos) {
      if (i.diasSinVenir < umbral) continue;
      if (!Number.isFinite(i.diasSinVenir) && !conNunca) continue;
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

  /**
   * Se pinta por tandas: con la matrícula completa importada, la lista con
   * "nunca vinieron" pasa de 2 000 filas, cada una con enlace e íconos. El
   * límite va atado a la lista que lo amplió: si cambia un filtro, la lista
   * es otra y se vuelve a la primera tanda sin un `effect`.
   */
  private static readonly TANDA = 60;
  private limite = signal<{ lista: unknown; n: number }>({ lista: null, n: InactivosComponent.TANDA });

  private limiteActual(lista: unknown): number {
    const s = this.limite();
    return s.lista === lista ? s.n : InactivosComponent.TANDA;
  }

  inactivosVisibles = computed(() => {
    const lista = this.inactivosFiltrados();
    return lista.slice(0, this.limiteActual(lista));
  });

  mostrarMas(): void {
    const lista = this.inactivosFiltrados();
    this.limite.set({ lista, n: this.limiteActual(lista) + InactivosComponent.TANDA });
  }

  nuncaHanVenido = computed(() => {
    let n = 0;
    for (const i of this.todos()) if (!Number.isFinite(i.diasSinVenir)) n++;
    return n;
  });

  private calcularGravedad(dias: number, umbral: number): 'normal' | 'medio' | 'alto' | 'nunca' {
    if (!Number.isFinite(dias)) return 'nunca';
    if (dias >= umbral * 3) return 'alto';
    if (dias >= umbral * 2) return 'medio';
    return 'normal';
  }

  private readonly bitacora = inject(BitacoraService);

  constructor() {
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
      this.bitacora.registrar('alumno-desactivado', `${describirAlumno(alumno)}, desde Inactivos`);
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
  async exportarExcel(): Promise<void> {
    const lista = this.inactivosFiltrados();
    if (lista.length === 0) {
      this.toast.warning('No hay alumnos inactivos para exportar');
      return;
    }
    const alumnos = lista.map(i => i.alumno);
    const porMatricula = new Map(lista.map(i => [i.alumno.matricula, i]));
    const fecha = fechaLocalISO();
    try {
      // Sin "Última visita" ni "Días sin venir", el Excel de inactivos era
      // una lista de alumnos cualquiera (M13).
      await this.exportService.exportarAlumnosXLSX(
        alumnos,
        `inactivos_${this.umbralDias()}d_${fecha}`,
        a => {
          const i = porMatricula.get(a.matricula);
          const nunca = !i || !Number.isFinite(i.diasSinVenir);
          return {
            'Última visita': nunca ? 'Nunca' : i!._ultimaVisitaStr,
            'Días sin venir': nunca ? '—' : i!.diasSinVenir,
          };
        },
      );
      this.toast.success(`${alumnos.length} alumnos exportados a Excel`);
    } catch {
      this.toast.error('No se pudo generar el archivo Excel');
    }
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

  // Un solo formateador: se llama por cada alumno de la lista (miles).
  private static readonly FMT_FECHA = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  formatearFecha(fecha: Date): string {
    return InactivosComponent.FMT_FECHA.format(new Date(fecha));
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
