// ╔══════════════════════════════════════════════════════╗
// ║  registro-editar-dialog.component.ts                 ║
// ║  Stenbrary v3.11.0 — Edición manual de registro      ║
// ║                                                      ║
// ║  - Editar hora de entrada / salida (o limpiar salida)║
// ║  - Cambiar motivos (múltiples, v3.7.0+)              ║
// ║  - Valida que salida >= entrada si se especifica     ║
// ╚══════════════════════════════════════════════════════╝

import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatabaseService } from '../../../core/services/database.service';
import { Motivo, Registro } from '../../../core/models';

export interface RegistroEditarDialogData {
  registro: Registro;
}

export interface RegistroEditarResultado {
  fechaHora: Date;
  horaSalida: Date | null;
  motivoIds: string[];
  motivoNombres: string[];
  motivoId: string;
  motivoNombre: string;
}

@Component({
  selector: 'app-registro-editar-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>edit_calendar</mat-icon>
      Editar Registro
    </h2>

    <mat-dialog-content class="dialog-content">

      <div class="alumno-header">
        <mat-icon>account_circle</mat-icon>
        <div>
          <p class="alumno-nombre">{{ data.registro.nombreCompleto }}</p>
          <p class="alumno-meta mono">{{ data.registro.matricula }}</p>
        </div>
      </div>

      <div class="form-grid">

        <label class="field">
          <span class="field-label">
            <mat-icon>login</mat-icon>
            Entrada
          </span>
          <input type="datetime-local" [(ngModel)]="fechaEntradaInput" />
        </label>

        <label class="field">
          <span class="field-label">
            <mat-icon>logout</mat-icon>
            Salida
          </span>
          <div class="salida-row">
            <input type="datetime-local" [(ngModel)]="fechaSalidaInput" />
            @if (fechaSalidaInput) {
              <button type="button" class="btn-clear" (click)="fechaSalidaInput = ''"
                      matTooltip="Dejar en curso">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
          <span class="field-hint">Vacío = entrada en curso</span>
        </label>

        <div class="field">
          <span class="field-label">
            <mat-icon>category</mat-icon>
            Actividad
          </span>
          <div class="motivos-grid">
            @for (m of motivos(); track m.id!) {
              <button type="button" class="motivo-chip"
                      [class.selected]="motivoIdsSeleccionados().includes(m.id!)"
                      (click)="toggleMotivo(m.id!)">
                <mat-icon>{{ m.icono || 'label' }}</mat-icon>
                {{ m.nombre }}
              </button>
            }
          </div>
          @if (motivoIdsSeleccionados().length === 0) {
            <span class="field-hint error">Selecciona al menos una actividad</span>
          }
        </div>

      </div>

      @if (errorTexto()) {
        <div class="error-box">
          <mat-icon>error_outline</mat-icon>
          {{ errorTexto() }}
        </div>
      }

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cerrar()">Cancelar</button>
      <button mat-raised-button color="primary"
              (click)="guardar()"
              [disabled]="!puedeGuardar()">
        Guardar cambios
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex; align-items: center; gap: 8px;
      margin: 0; padding: 20px 24px 12px;
      font-size: 1.1rem; font-weight: 600; color: #E8F4F8;
    }

    .dialog-content {
      padding: 8px 24px 16px;
      min-width: 380px; max-width: 520px;
    }

    .alumno-header {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; margin-bottom: 20px;
      background: rgba(0, 200, 215, 0.08);
      border-left: 3px solid #00C8D7;
      border-radius: 8px;

      mat-icon {
        font-size: 32px; width: 32px; height: 32px;
        line-height: 32px; color: #00C8D7;
        flex-shrink: 0;
      }
      > div { min-width: 0; }
    }
    .alumno-nombre,
    .alumno-meta {
      overflow-wrap: anywhere;
    }
    .alumno-nombre { margin: 0; font-weight: 600; font-size: .95rem; color: #E8F4F8; }
    .alumno-meta { margin: 2px 0 0; font-size: .78rem; color: rgba(200,230,240,.55); }
    .mono { font-family: 'Space Mono', monospace; }

    .form-grid {
      display: flex; flex-direction: column; gap: 16px;
    }

    .field {
      display: flex; flex-direction: column; gap: 6px;
    }
    .field-label {
      display: flex; align-items: center; gap: 6px;
      font-size: .78rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: .05em;
      color: rgba(200,230,240,.65);
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #00C8D7; }
    }
    .field-hint {
      font-size: .72rem; color: rgba(200,230,240,.45);
      &.error { color: #F05252; }
    }
    .field input[type="datetime-local"] {
      padding: 10px 12px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(0,200,215,.2);
      border-radius: 8px;
      font-family: 'DM Sans', sans-serif; font-size: .9rem; color: #E8F4F8;
      color-scheme: dark;
      &:focus { outline: none; border-color: #00C8D7; }
    }

    .salida-row {
      display: flex; gap: 8px; align-items: center;
      input { flex: 1; }
    }
    .btn-clear {
      display: flex; align-items: center; justify-content: center;
      width: 38px; height: 38px;
      background: rgba(240,82,82,.08);
      border: 1px solid rgba(240,82,82,.25);
      border-radius: 8px; color: #F05252;
      cursor: pointer; transition: background 150ms;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { background: rgba(240,82,82,.18); }
    }

    .motivos-grid {
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .motivo-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px;
      background: rgba(0,200,215,.06);
      border: 1px solid rgba(0,200,215,.18);
      border-radius: 20px;
      color: rgba(200,230,240,.7);
      font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 500;
      cursor: pointer; transition: all 150ms;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { border-color: rgba(0,200,215,.45); color: #E8F4F8; }
      &.selected {
        background: rgba(0,200,215,.18);
        border-color: #00C8D7;
        color: #00C8D7;
      }
    }

    .error-box {
      display: flex; align-items: center; gap: 8px;
      margin-top: 14px; padding: 10px 14px;
      background: rgba(240,82,82,.10);
      border: 1px solid rgba(240,82,82,.25);
      border-radius: 8px;
      color: #F05252; font-size: .85rem;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    mat-dialog-actions { padding: 8px 16px 16px; }

    @media (max-width: 480px) {
      .dialog-content { min-width: 0; }
    }
  `],
})
export class RegistroEditarDialogComponent implements OnInit {
  fechaEntradaInput = '';
  fechaSalidaInput = '';
  motivos = signal<Motivo[]>([]);
  motivoIdsSeleccionados = signal<string[]>([]);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RegistroEditarDialogData,
    private dialogRef: MatDialogRef<RegistroEditarDialogComponent, RegistroEditarResultado>,
    private databaseService: DatabaseService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.fechaEntradaInput = this.toLocalInput(this.data.registro.fechaHora);
    this.fechaSalidaInput = this.data.registro.horaSalida
      ? this.toLocalInput(this.data.registro.horaSalida)
      : '';

    const todos = await this.databaseService.obtenerMotivosActivos();
    this.motivos.set(todos);

    const ids = this.data.registro.motivoIds?.length
      ? this.data.registro.motivoIds
      : [this.data.registro.motivoId];
    this.motivoIdsSeleccionados.set([...ids]);
  }

  toggleMotivo(id: string): void {
    const actuales = this.motivoIdsSeleccionados();
    if (actuales.includes(id)) {
      this.motivoIdsSeleccionados.set(actuales.filter(x => x !== id));
    } else {
      this.motivoIdsSeleccionados.set([...actuales, id]);
    }
  }

  errorTexto(): string | null {
    if (!this.fechaEntradaInput) return 'La hora de entrada es obligatoria';
    if (this.fechaSalidaInput) {
      const entrada = new Date(this.fechaEntradaInput).getTime();
      const salida = new Date(this.fechaSalidaInput).getTime();
      if (salida < entrada) return 'La salida no puede ser anterior a la entrada';
    }
    return null;
  }

  puedeGuardar(): boolean {
    return !this.errorTexto() && this.motivoIdsSeleccionados().length > 0;
  }

  guardar(): void {
    if (!this.puedeGuardar()) return;

    const idsSel = this.motivoIdsSeleccionados();
    const motivosSel = this.motivos().filter(m => idsSel.includes(m.id!));
    const nombres = motivosSel.map(m => m.nombre);
    const principal = motivosSel[0];

    const resultado: RegistroEditarResultado = {
      fechaHora: new Date(this.fechaEntradaInput),
      horaSalida: this.fechaSalidaInput ? new Date(this.fechaSalidaInput) : null,
      motivoIds: idsSel,
      motivoNombres: nombres,
      motivoId: principal.id!,
      motivoNombre: principal.nombre,
    };
    this.dialogRef.close(resultado);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private toLocalInput(fecha: Date | string): string {
    const d = new Date(fecha);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
