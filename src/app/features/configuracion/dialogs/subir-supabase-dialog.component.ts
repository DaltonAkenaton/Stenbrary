// ╔══════════════════════════════════════════════════════╗
// ║  subir-supabase-dialog.component.ts                  ║
// ║  Stenbrary — Fase 2.1 (Importador one-shot — UI)     ║
// ║                                                      ║
// ║  Diálogo con 3 estados:                              ║
// ║  - preview: muestra conteos local vs remoto,         ║
// ║    permite confirmar.                                ║
// ║  - running: barra de progreso por fase.              ║
// ║  - done: resumen + cerrar.                           ║
// ║                                                      ║
// ║  Idempotente: si el usuario re-corre, la BD no       ║
// ║  duplica (UPSERT en el adapter y la función SQL).    ║
// ╚══════════════════════════════════════════════════════╝

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  ImportPreview,
  ImportProgressEvent,
  ImportReport,
  ImportSupabaseService,
} from '../../../core/services/import-supabase.service';

type Estado = 'cargando-preview' | 'preview' | 'running' | 'done' | 'error';

@Component({
    selector: 'app-subir-supabase-dialog',
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './subir-supabase-dialog.component.html',
    styleUrl: './subir-supabase-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubirSupabaseDialogComponent {
  private readonly importer = inject(ImportSupabaseService);
  private readonly dialogRef = inject(MatDialogRef<SubirSupabaseDialogComponent>);

  protected readonly estado = signal<Estado>('cargando-preview');
  protected readonly preview = signal<ImportPreview | null>(null);
  protected readonly progreso = signal<ImportProgressEvent | null>(null);
  protected readonly reporte = signal<ImportReport | null>(null);
  protected readonly errorMsg = signal<string | null>(null);

  constructor() {
    void this.cargarPreview();
  }

  private async cargarPreview(): Promise<void> {
    try {
      const p = await this.importer.preview();
      this.preview.set(p);
      this.estado.set('preview');
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : String(err));
      this.estado.set('error');
    }
  }

  protected async iniciar(): Promise<void> {
    this.estado.set('running');
    try {
      const reporte = await this.importer.runImport(evt => this.progreso.set(evt));
      this.reporte.set(reporte);
      this.estado.set('done');
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : String(err));
      this.estado.set('error');
    }
  }

  protected cerrar(): void {
    this.dialogRef.close(this.reporte());
  }

  /** Texto humano para la fase actual del progreso. */
  protected etiquetaFase(fase: ImportProgressEvent['fase']): string {
    switch (fase) {
      case 'motivos':   return 'Subiendo motivos…';
      case 'alumnos':   return 'Subiendo alumnos…';
      case 'registros': return 'Subiendo registros…';
      case 'done':      return 'Finalizando…';
    }
  }

  /** Porcentaje 0-100 para la barra de progreso. */
  protected porcentaje(): number {
    const p = this.progreso();
    if (!p || p.total === 0) return 0;
    return Math.round((p.procesados / p.total) * 100);
  }
}
