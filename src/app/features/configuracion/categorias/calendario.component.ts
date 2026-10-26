// ╔══════════════════════════════════════════════════════╗
// ║  categorias/calendario.component.ts                  ║
// ║  Categoría "Calendario escolar" de /configuración    ║
// ║  Stenbrary v3.43.0                                    ║
// ║                                                      ║
// ║  Periodos (Primavera / Verano / Otoño) y días         ║
// ║  inhábiles, capturados a mano. Se edita un BORRADOR   ║
// ║  y se guarda entero: así un error a medio capturar    ║
// ║  no deja las estadísticas apuntando a fechas rotas.   ║
// ║  Precarga: calendario UAT 2026 (core/utils/           ║
// ║  calendario.utils.ts).                                ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '../../../core/services/config.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CALENDARIO_UAT_2026,
  CalendarioEscolar,
  calendarioTipicoUat,
  DiaInhabil,
  PeriodoEscolar,
  periodoActual,
  revisarCalendario,
} from '../../../core/utils/calendario.utils';
import { fechaLocalISO, parseFechaLocal } from '../../../core/utils/tiempo.utils';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

function copiar(c: CalendarioEscolar): CalendarioEscolar {
  return {
    periodos: c.periodos.map(p => ({ ...p })),
    diasInhabiles: c.diasInhabiles.map(d => ({ ...d })),
  };
}

const FMT_CORTA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

@Component({
    selector: 'app-config-calendario',
    imports: [FormsModule, MatIconModule, MatTooltipModule],
    templateUrl: './calendario.component.html',
    styleUrls: ['../configuracion.styles.scss', './calendario.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarioCategoriaComponent {
  readonly configService = inject(ConfigService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  /** Copia de trabajo. No toca la configuración hasta "Guardar". */
  readonly borrador = signal<CalendarioEscolar>(copiar(this.configService.calendarioEscolar));
  /** Firma del último guardado, para saber si hay cambios pendientes. */
  private readonly guardado = signal(JSON.stringify(this.configService.calendarioEscolar));

  readonly hayCambios = computed(() => JSON.stringify(this.borrador()) !== this.guardado());
  readonly avisos = computed(() => revisarCalendario(this.borrador()));
  readonly hayErrores = computed(() => this.avisos().some(a => a.tipo === 'error'));

  /** Qué periodo verían hoy las estadísticas con lo GUARDADO. */
  readonly periodoHoy = computed(() => periodoActual(this.configService.calendarioSignal()));

  // ─── Periodos ──────────────────────────────────────────
  agregarPeriodo(): void {
    const actual = this.borrador();
    // Propone empezar el día siguiente al fin del último periodo: así lo
    // natural es capturarlos sin huecos.
    const ultimoFin = actual.periodos
      .map(p => parseFechaLocal(p.fin))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const inicio = ultimoFin ? new Date(ultimoFin) : new Date();
    if (ultimoFin) inicio.setDate(inicio.getDate() + 1);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 4);
    const nuevo: PeriodoEscolar = { id: uuidv4(), nombre: '', inicio: fechaLocalISO(inicio), fin: fechaLocalISO(fin) };
    this.borrador.set({ ...actual, periodos: [...actual.periodos, nuevo] });
  }

  actualizarPeriodo(id: string, campo: 'nombre' | 'inicio' | 'fin', valor: string): void {
    const actual = this.borrador();
    this.borrador.set({
      ...actual,
      periodos: actual.periodos.map(p => (p.id === id ? { ...p, [campo]: valor ?? '' } : p)),
    });
  }

  quitarPeriodo(id: string): void {
    const actual = this.borrador();
    this.borrador.set({ ...actual, periodos: actual.periodos.filter(p => p.id !== id) });
  }

  // ─── Días inhábiles ────────────────────────────────────
  agregarDiaInhabil(): void {
    const actual = this.borrador();
    const hoy = fechaLocalISO();
    const nuevo: DiaInhabil = { id: uuidv4(), desde: hoy, hasta: hoy, descripcion: '' };
    this.borrador.set({ ...actual, diasInhabiles: [...actual.diasInhabiles, nuevo] });
  }

  actualizarDiaInhabil(id: string, campo: 'desde' | 'hasta' | 'descripcion', valor: string): void {
    const actual = this.borrador();
    this.borrador.set({
      ...actual,
      diasInhabiles: actual.diasInhabiles.map(d => {
        if (d.id !== id) return d;
        const editado = { ...d, [campo]: valor ?? '' };
        // Si se mueve el inicio más allá del fin, se arrastra el fin: es lo
        // que el coordinador quiere al recorrer un festivo de un solo día.
        if (campo === 'desde' && editado.hasta < editado.desde) editado.hasta = editado.desde;
        return editado;
      }),
    });
  }

  quitarDiaInhabil(id: string): void {
    const actual = this.borrador();
    this.borrador.set({ ...actual, diasInhabiles: actual.diasInhabiles.filter(d => d.id !== id) });
  }

  // ─── Guardar / descartar / restaurar ───────────────────
  guardar(): void {
    if (this.hayErrores()) {
      this.toast.warning('Corrige los errores marcados antes de guardar.');
      return;
    }
    const ordenado = this.ordenado(this.borrador());
    this.configService.setCalendarioEscolar(ordenado);
    this.borrador.set(copiar(ordenado));
    this.guardado.set(JSON.stringify(ordenado));
    this.toast.success('Calendario escolar guardado');
  }

  descartar(): void {
    this.borrador.set(copiar(this.configService.calendarioEscolar));
  }

  /** Años que se ofrecen: el actual y el siguiente (para preparar el ciclo nuevo). */
  readonly aniosDisponibles = [new Date().getFullYear(), new Date().getFullYear() + 1];
  anioACargar = new Date().getFullYear();

  /**
   * Carga el calendario de la UAT para el año elegido: el OFICIAL si lo
   * tenemos capturado (2026) y, si no, el TÍPICO calculado con las reglas
   * del calendario oficial (festivos recorridos, Semana Santa, vacaciones).
   */
  async cargarCalendarioUat(): Promise<void> {
    const anio = Number(this.anioACargar);
    const oficial = anio === 2026;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        titulo: oficial ? '¿Cargar el calendario oficial UAT 2026?' : `¿Cargar el calendario típico UAT ${anio}?`,
        mensaje: (oficial
          ? 'Se usará el calendario oficial UAT 2026.'
          : `Es una APROXIMACIÓN calculada con las reglas habituales de la UAT (festivos que se recorren a lunes, ` +
            `Semana Santa, vacaciones). Compárala con el calendario oficial ${anio} y ajusta lo que la universidad haya movido.`) +
          ' Reemplaza lo que tienes en pantalla y no se guarda hasta que pulses "Guardar".',
        variante: 'warning',
        textoConfirmar: 'Cargar',
        icono: 'event_repeat',
      } as ConfirmDialogData,
    });
    if (!(await ref.afterClosed().toPromise())) return;
    this.borrador.set(copiar(oficial ? CALENDARIO_UAT_2026 : calendarioTipicoUat(anio)));
  }

  // ─── Helpers de vista ──────────────────────────────────
  fechaLegible(iso: string): string {
    const d = parseFechaLocal(iso);
    return d ? FMT_CORTA.format(d) : iso;
  }

  private ordenado(c: CalendarioEscolar): CalendarioEscolar {
    return {
      periodos: [...c.periodos]
        .map(p => ({ ...p, nombre: p.nombre.trim() }))
        .sort((a, b) => a.inicio.localeCompare(b.inicio)),
      diasInhabiles: [...c.diasInhabiles]
        .map(d => ({ ...d, descripcion: d.descripcion.trim() }))
        .sort((a, b) => a.desde.localeCompare(b.desde)),
    };
  }
}
