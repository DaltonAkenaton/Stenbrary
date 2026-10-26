// ╔══════════════════════════════════════════════════════╗
// ║  categorias/bitacora.component.ts                    ║
// ║  Categoría "Bitácora" del /configuración             ║
// ║  Stenbrary v3.52.0                                    ║
// ║                                                      ║
// ║  Qué se hizo, cuándo y en qué equipo. Incluye lo que ║
// ║  llegó en los respaldos de otros equipos, así que en ║
// ║  la oficina se ve lo que pasó en la puerta.          ║
// ║  Solo lectura: no hay botón para borrar eventos.     ║
// ║                                                      ║
// ║  v3.57.0: nombre del equipo con botón Guardar (antes  ║
// ║  se guardaba al salir del campo, sin aviso) y         ║
// ║  filtros por fechas y por texto.                      ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ConfigService } from '../../../core/services/config.service';
import { ToastService } from '../../../core/services/toast.service';
import { ACCIONES_BITACORA, BitacoraService, GrupoBitacora } from '../../../core/services/bitacora.service';
import { EventoBitacora } from '../../../core/models';
import { fechaLocalISO } from '../../../core/utils/tiempo.utils';

/** Minúsculas y sin acentos, para buscar "pin" en "PIN" o "credito" en "crédito". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

type Filtro = 'todo' | GrupoBitacora | 'alertas';

const POR_PAGINA = 50;

@Component({
    selector: 'app-config-bitacora',
    imports: [CommonModule, FormsModule, MatIconModule],
    templateUrl: './bitacora.component.html',
    styleUrls: ['../configuracion.styles.scss', './bitacora.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BitacoraCategoriaComponent implements OnInit {
  protected readonly config = inject(ConfigService);
  private readonly bitacora = inject(BitacoraService);
  private readonly toast = inject(ToastService);

  readonly acciones = ACCIONES_BITACORA;
  readonly filtros: { id: Filtro; etiqueta: string }[] = [
    { id: 'todo', etiqueta: 'Todo' },
    { id: 'alertas', etiqueta: 'Solo alertas' },
    { id: 'quiosco', etiqueta: 'Quiosco y PIN' },
    { id: 'cambios', etiqueta: 'Cambios a datos' },
    { id: 'respaldos', etiqueta: 'Respaldos' },
  ];

  readonly eventos = signal<EventoBitacora[]>([]);
  readonly cargando = signal(true);
  readonly filtro = signal<Filtro>('todo');
  readonly equipo = signal<string>('');
  readonly visibles = signal(POR_PAGINA);
  /** Fechas 'YYYY-MM-DD' (día local), vacías = sin límite. */
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly texto = signal('');
  readonly nombreEquipo = signal('');
  /** Lo escrito difiere de lo guardado: se avisa en vez de guardar a escondidas. */
  readonly sinGuardar = computed(() => this.nombreEquipo().trim() !== this.nombreGuardado());
  private readonly nombreGuardado = signal('');

  /** Equipos que aparecen en la bitácora; el filtro solo se muestra si hay más de uno. */
  readonly equipos = computed(() =>
    [...new Set(this.eventos().map(e => e.equipo || ''))].sort(),
  );

  readonly filtrados = computed(() => {
    const f = this.filtro();
    const eq = this.equipo();
    const desde = this.desde();
    const hasta = this.hasta();
    const q = normalizar(this.texto().trim());
    return this.eventos().filter(e => {
      const meta = ACCIONES_BITACORA[e.accion];
      if (!meta) return false;
      if (eq && (e.equipo || '') !== eq) return false;
      if (desde || hasta) {
        const d = new Date(e.fechaHora);
        if (Number.isNaN(d.getTime())) return false;
        const dia = fechaLocalISO(d);   // el día en México, no en UTC
        if (desde && dia < desde) return false;
        if (hasta && dia > hasta) return false;
      }
      if (q && !normalizar(`${meta.etiqueta} ${e.detalle} ${e.equipo}`).includes(q)) return false;
      if (f === 'todo') return true;
      if (f === 'alertas') return !!meta.alerta;
      return meta.grupo === f;
    });
  });

  readonly pagina = computed(() => this.filtrados().slice(0, this.visibles()));

  private readonly fmt = new Intl.DateTimeFormat('es-MX', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  async ngOnInit(): Promise<void> {
    this.nombreEquipo.set(this.config.nombreEquipo);
    this.nombreGuardado.set(this.config.nombreEquipo);
    await this.recargar();
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.eventos.set(await this.bitacora.obtener());
    } catch {
      this.toast.error('No se pudo leer la bitácora');
    } finally {
      this.cargando.set(false);
    }
  }

  setFiltro(f: Filtro): void {
    this.filtro.set(f);
    this.visibles.set(POR_PAGINA);
  }

  setEquipo(eq: string): void {
    this.equipo.set(this.equipo() === eq ? '' : eq);
    this.visibles.set(POR_PAGINA);
  }

  setDesde(v: string): void { this.desde.set(v || ''); this.visibles.set(POR_PAGINA); }
  setHasta(v: string): void { this.hasta.set(v || ''); this.visibles.set(POR_PAGINA); }
  setTexto(v: string): void { this.texto.set(v ?? ''); this.visibles.set(POR_PAGINA); }

  get hayFiltrosExtra(): boolean {
    return !!(this.desde() || this.hasta() || this.texto() || this.equipo() || this.filtro() !== 'todo');
  }

  limpiarFiltros(): void {
    this.filtro.set('todo');
    this.equipo.set('');
    this.desde.set('');
    this.hasta.set('');
    this.texto.set('');
    this.visibles.set(POR_PAGINA);
  }

  mostrarMas(): void {
    this.visibles.update(n => n + POR_PAGINA);
  }

  guardarNombreEquipo(): void {
    this.config.setNombreEquipo(this.nombreEquipo());
    const guardado = this.config.nombreEquipo;
    this.nombreEquipo.set(guardado);
    this.nombreGuardado.set(guardado);
    this.toast.success(guardado ? `Guardado: este equipo se llama "${guardado}"` : 'Nombre del equipo borrado');
  }

  fecha(e: EventoBitacora): string {
    const d = new Date(e.fechaHora);
    return Number.isNaN(d.getTime()) ? e.fechaHora : this.fmt.format(d);
  }

  etiquetaEquipo(eq: string): string {
    return eq || 'Sin nombre';
  }
}
