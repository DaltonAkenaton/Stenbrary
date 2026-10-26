// ╔══════════════════════════════════════════════════════╗
// ║  exportar-pdf-dialog.component.ts                    ║
// ║  Stenbrary v3.16.0 — PDF granular                    ║
// ║                                                      ║
// ║  Permite al coordinador elegir qué secciones incluir  ║
// ║  en el PDF (resumen, tabla, motivos, turnos, carreras,║
// ║  top alumnos). Por defecto todo marcado — el usuario  ║
// ║  desmarca lo que no quiere.                           ║
// ╚══════════════════════════════════════════════════════╝

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SeccionesReporte } from '../../../core/services/report.service';

export interface ExportarPdfDialogData {
  /** Cuántos registros se incluirán (preview para el usuario). */
  totalRegistros: number;
  /** Etiqueta del rango activo, p. ej. "del 1 al 30 de abril 2026". */
  rangoEtiqueta: string;
  /** Si hay top alumnos disponibles. */
  hayTopAlumnos: boolean;
}

export interface ExportarPdfDialogResult {
  secciones: SeccionesReporte;
}

interface OpcionSeccion {
  key: keyof SeccionesReporte;
  label: string;
  descripcion: string;
  icono: string;
}

@Component({
    selector: 'app-exportar-pdf-dialog',
    imports: [
        CommonModule, FormsModule, MatDialogModule, MatCheckboxModule,
        MatIconModule, MatButtonModule, MatTooltipModule,
    ],
    template: `
    <div class="dlg-header">
      <div class="dlg-icon"><mat-icon>picture_as_pdf</mat-icon></div>
      <div>
        <h2>Personalizar PDF</h2>
        <p class="subtitle">Elige qué secciones incluir en el reporte</p>
      </div>
    </div>

    <div class="dlg-context">
      <mat-icon>event</mat-icon>
      <div>
        <strong>{{ data.totalRegistros | number }}</strong> registros ·
        <span class="rango">{{ data.rangoEtiqueta }}</span>
      </div>
    </div>

    <div class="dlg-secciones">
      @for (op of opciones; track op.key) {
        <label class="seccion-row" [class.disabled]="esOpcionDeshabilitada(op.key)">
          <mat-checkbox
            [(ngModel)]="seleccion[op.key]"
            [disabled]="esOpcionDeshabilitada(op.key)"
            color="primary">
          </mat-checkbox>
          <div class="seccion-icon"><mat-icon>{{ op.icono }}</mat-icon></div>
          <div class="seccion-text">
            <div class="seccion-label">{{ op.label }}</div>
            <div class="seccion-desc">{{ op.descripcion }}</div>
          </div>
        </label>
      }
    </div>

    <div class="dlg-actions">
      <button mat-button (click)="marcarTodos(true)" class="btn-quick">
        <mat-icon>done_all</mat-icon> Todo
      </button>
      <button mat-button (click)="marcarTodos(false)" class="btn-quick">
        <mat-icon>remove_done</mat-icon> Nada
      </button>
      <button mat-button (click)="preset('ejecutivo')" class="btn-quick">
        <mat-icon>insights</mat-icon> Solo resumen
      </button>
      <span class="spacer"></span>
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-flat-button color="primary"
              (click)="generar()"
              [disabled]="!alMenosUna()">
        <mat-icon>download</mat-icon>
        Generar PDF
      </button>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      min-width: 460px;
      max-width: 560px;
      color: #E8F4F8;
    }

    .dlg-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(0, 200, 215, 0.10);
    }

    .dlg-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(240, 82, 82, 0.10);
      border: 1px solid rgba(240, 82, 82, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #F05252; font-size: 22px; width: 22px; height: 22px; }
    }

    h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #E8F4F8;
    }

    .subtitle {
      margin: 2px 0 0;
      color: rgba(200, 230, 240, 0.55);
      font-size: 0.85rem;
    }

    .dlg-context {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 16px 24px;
      padding: 10px 14px;
      background: rgba(0, 200, 215, 0.06);
      border: 1px solid rgba(0, 200, 215, 0.20);
      border-radius: 10px;
      font-size: 0.88rem;

      mat-icon {
        color: #00C8D7;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      strong { color: #00C8D7; }
      .rango { color: rgba(200, 230, 240, 0.7); }
    }

    .dlg-secciones {
      padding: 4px 24px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 50vh;
      overflow-y: auto;
    }

    .seccion-row {
      display: grid;
      grid-template-columns: auto auto 1fr;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;
      border: 1px solid transparent;

      &:hover:not(.disabled) {
        background: rgba(0, 200, 215, 0.05);
        border-color: rgba(0, 200, 215, 0.15);
      }

      &.disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .seccion-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(0, 200, 215, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #00C8D7; font-size: 18px; width: 18px; height: 18px; }
    }

    .seccion-text {
      min-width: 0;
    }

    .seccion-label {
      font-weight: 600;
      color: #E8F4F8;
      font-size: 0.95rem;
    }

    .seccion-desc {
      color: rgba(200, 230, 240, 0.55);
      font-size: 0.78rem;
      margin-top: 1px;
    }

    .dlg-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 14px 20px;
      border-top: 1px solid rgba(0, 200, 215, 0.10);
      flex-wrap: wrap;
    }

    .spacer { flex: 1; }

    .btn-quick {
      color: rgba(200, 230, 240, 0.65) !important;
      font-size: 0.78rem !important;
      mat-icon {
        font-size: 14px !important;
        width: 14px !important;
        height: 14px !important;
        margin-right: 2px;
      }
    }

    @media (max-width: 600px) {
      :host { min-width: unset; }
      .seccion-row { grid-template-columns: auto 1fr; }
      .seccion-icon { display: none; }
      .dlg-actions { padding: 12px 14px; }
    }
  `]
})
export class ExportarPdfDialogComponent {

  readonly opciones: OpcionSeccion[] = [
    { key: 'resumen',        label: 'Resumen ejecutivo', descripcion: 'Total de visitas, alumnos únicos y rango de fechas.', icono: 'fact_check' },
    { key: 'topAlumnos',     label: 'Top alumnos',       descripcion: 'Los 10 alumnos con más visitas en el período.',       icono: 'emoji_events' },
    { key: 'tablaRegistros', label: 'Tabla de registros',descripcion: 'Lista detallada de cada visita (puede ser largo).',   icono: 'list_alt' },
    { key: 'carreras',       label: 'Distribución por carrera', descripcion: 'Conteo y porcentaje de visitas por carrera.',  icono: 'school' },
    { key: 'motivos',        label: 'Distribución por actividad',  descripcion: 'Conteo y porcentaje por actividad.',     icono: 'pie_chart' },
    { key: 'turnos',         label: 'Distribución por turno',   descripcion: 'Matutino / Vespertino / Mixto con porcentajes.',icono: 'work_history' },
  ];

  seleccion: Required<SeccionesReporte> = {
    resumen: true, topAlumnos: true, tablaRegistros: true,
    carreras: true, motivos: true, turnos: true,
  };

  constructor(
    private dialogRef: MatDialogRef<ExportarPdfDialogComponent, ExportarPdfDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: ExportarPdfDialogData,
  ) {
    if (!data.hayTopAlumnos) {
      this.seleccion.topAlumnos = false;
    }
  }

  esOpcionDeshabilitada(key: keyof SeccionesReporte): boolean {
    if (key === 'topAlumnos' && !this.data.hayTopAlumnos) return true;
    return false;
  }

  marcarTodos(valor: boolean): void {
    for (const op of this.opciones) {
      if (this.esOpcionDeshabilitada(op.key)) continue;
      this.seleccion[op.key] = valor;
    }
  }

  /** Preset "Solo resumen" — el ejecutivo que no quiere detalle. */
  preset(name: 'ejecutivo'): void {
    if (name === 'ejecutivo') {
      this.seleccion = {
        resumen: true, topAlumnos: false, tablaRegistros: false,
        carreras: true, motivos: true, turnos: true,
      };
      if (this.data.hayTopAlumnos) this.seleccion.topAlumnos = true;
    }
  }

  alMenosUna(): boolean {
    return Object.values(this.seleccion).some(v => v === true);
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  generar(): void {
    this.dialogRef.close({ secciones: this.seleccion });
  }
}
