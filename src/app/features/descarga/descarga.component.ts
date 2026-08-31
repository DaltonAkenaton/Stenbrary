// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/descarga/                    ║
// ║        descarga.component.ts                         ║
// ║  Stenbrary — Bajar datos de la nube (Fase 2.2)       ║
// ║                                                      ║
// ║  Espejo de /sincronizacion. Dos secciones claras:    ║
// ║  lo que se puede traer sin riesgo, y lo que está en  ║
// ║  conflicto y NO se toca en esta versión.             ║
// ║                                                      ║
// ║  Comparar es solo lectura y no cambia nada — por eso ║
// ║  no pide confirmación. Traer sí la pide.             ║
// ╚══════════════════════════════════════════════════════╝

import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { DescargaService } from '../../core/services/descarga.service';
import { ToastService } from '../../core/services/toast.service';
import { AforoService } from '../../core/services/aforo.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DescargaStore, FilaDescarga } from '../../core/utils/descarga.utils';

/** Cuántas filas se listan por sección antes de resumir el resto. */
const TOPE_LISTA = 40;

@Component({
  selector: 'app-descarga',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  templateUrl: './descarga.component.html',
  styleUrl: './descarga.component.scss',
})
export class DescargaComponent {
  private readonly descarga = inject(DescargaService);
  private readonly toast = inject(ToastService);
  private readonly aforo = inject(AforoService);
  private readonly dialog = inject(MatDialog);

  protected readonly diff = this.descarga.diff;
  protected readonly progreso = this.descarga.progreso;
  protected readonly ultimaComparacion = this.descarga.ultimaComparacion;
  protected readonly hayAlgoQueTraer = this.descarga.hayAlgoQueTraer;
  protected readonly hayConflictos = this.descarga.hayConflictos;

  protected readonly disponible = this.descarga.disponible();
  protected readonly comparando = signal(false);
  protected readonly trayendo = signal(false);
  protected readonly tope = TOPE_LISTA;

  /** Conflicto expandido, para ver campo por campo sin abrir un dialog. */
  protected readonly conflictoAbierto = signal<string | null>(null);

  protected readonly ocupado = computed(() => this.comparando() || this.trayendo());

  protected readonly resumenNuevas = computed(() => {
    const d = this.diff();
    if (!d) return [];
    return [
      { store: 'motivos'   as DescargaStore, label: 'Motivos',   n: d.motivos.nuevas.length   },
      { store: 'alumnos'   as DescargaStore, label: 'Alumnos',   n: d.alumnos.nuevas.length   },
      { store: 'registros' as DescargaStore, label: 'Registros', n: d.registros.nuevas.length },
    ].filter(x => x.n > 0);
  });

  // ─── Comparar ───────────────────────────────────────────

  protected async comparar(): Promise<void> {
    if (this.ocupado()) return;
    this.comparando.set(true);
    try {
      const d = await this.descarga.comparar();
      if (d.totalNuevas === 0 && d.totalConflictos === 0) {
        this.toast.success('Tu copia local está al día con la nube.');
      } else {
        this.toast.info(
          `${d.totalNuevas} por traer · ${d.totalConflictos} en conflicto.`,
        );
      }
    } catch (err) {
      this.toast.error((err as Error)?.message ?? 'No se pudo comparar con la nube.');
    } finally {
      this.comparando.set(false);
    }
  }

  // ─── Traer ──────────────────────────────────────────────

  protected async traerTodo(): Promise<void> {
    const d = this.diff();
    if (!d || d.totalNuevas === 0 || this.ocupado()) return;

    const ok = await this.confirmar({
      titulo: `¿Traer ${d.totalNuevas} ${d.totalNuevas === 1 ? 'elemento' : 'elementos'}?`,
      mensaje:
        'Solo se agregarán elementos que no existen en este dispositivo. ' +
        'Nada de lo que ya tienes se modifica ni se borra.',
      variante: 'info',
      textoConfirmar: 'Traer',
      icono: 'cloud_download',
    });
    if (!ok) return;

    await this.ejecutarTraida(() => this.descarga.traerTodoLoNuevo());
  }

  protected async traerStore(store: DescargaStore, label: string): Promise<void> {
    const d = this.diff();
    if (!d || this.ocupado()) return;
    const ids = d[store].nuevas.map(f => f.id);
    if (ids.length === 0) return;

    const ok = await this.confirmar({
      titulo: `¿Traer ${ids.length} de ${label.toLowerCase()}?`,
      mensaje: 'Solo se agregan los que faltan en este dispositivo.',
      variante: 'info',
      textoConfirmar: 'Traer',
      icono: 'cloud_download',
    });
    if (!ok) return;

    await this.ejecutarTraida(() => this.descarga.traer({ [store]: ids }));
  }

  private async ejecutarTraida(accion: () => Promise<{
    traidos: number; fallidos: number;
    errores: { store: DescargaStore; label: string; message: string }[];
  }>): Promise<void> {
    this.trayendo.set(true);
    try {
      const r = await accion();
      // Pudieron entrar registros del día: la ocupación cambió.
      this.aforo.refrescar();

      if (r.fallidos === 0) {
        this.toast.success(`${r.traidos} ${r.traidos === 1 ? 'elemento traído' : 'elementos traídos'}.`);
      } else {
        this.toast.warning(
          `${r.traidos} traídos, ${r.fallidos} con problema. ` +
          `El primero: ${r.errores[0]?.message ?? 'sin detalle'}`,
        );
        console.warn('[descarga] errores:', r.errores);
      }
    } catch (err) {
      this.toast.error((err as Error)?.message ?? 'No se pudo traer los datos.');
    } finally {
      this.trayendo.set(false);
    }
  }

  // ─── UI ─────────────────────────────────────────────────

  protected alternarConflicto(id: string): void {
    this.conflictoAbierto.set(this.conflictoAbierto() === id ? null : id);
  }

  protected valorDe(fila: FilaDescarga, lado: 'local' | 'remoto', campo: string): string {
    const obj = (lado === 'local' ? fila.local : fila.remoto) as Record<string, unknown>;
    const v = obj?.[campo];
    if (v == null) return '—';
    if (v instanceof Date) return v.toLocaleString('es-MX');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  private async confirmar(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '420px', data });
    return !!(await ref.afterClosed().toPromise());
  }
}
