// ╔══════════════════════════════════════════════════════╗
// ║  registro-detalle-dialog.component.ts                ║
// ║  Stenbrary v3.6.3 — Dialog detalle de registro       ║
// ║                                                      ║
// ║  Muestra todos los campos de un Registro:            ║
// ║  entrada, salida, duración, motivo, dispositivo      ║
// ╚══════════════════════════════════════════════════════╝

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Registro } from '../../../core/models';

export interface RegistroDetalleDialogData {
  registro: Registro;
}

@Component({
  selector: 'app-registro-detalle-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>receipt_long</mat-icon>
      Detalle del Registro
    </h2>

    <mat-dialog-content class="dialog-content">

      <div class="alumno-header">
        <mat-icon class="avatar-icon">account_circle</mat-icon>
        <div>
          <p class="alumno-nombre">{{ data.registro.nombreCompleto }}</p>
          <p class="alumno-meta">
            <span class="mono">{{ data.registro.matricula }}</span>
            &nbsp;·&nbsp;{{ data.registro.carrera }}
          </p>
        </div>
      </div>

      <div class="info-grid">

        <div class="info-row">
          <div class="info-item">
            <mat-icon>login</mat-icon>
            <div>
              <span class="label">Entrada</span>
              <span class="value">{{ formatearFechaCompleta(data.registro.fechaHora) }}</span>
            </div>
          </div>

          <div class="info-item">
            <mat-icon>logout</mat-icon>
            <div>
              <span class="label">Salida</span>
              <span class="value" [class.sin-dato]="!data.registro.horaSalida">
                {{ data.registro.horaSalida ? formatearHora(data.registro.horaSalida) : 'No registrada' }}
              </span>
            </div>
          </div>
        </div>

        <div class="info-row">
          <div class="info-item">
            <mat-icon>timer</mat-icon>
            <div>
              <span class="label">Duración</span>
              <span class="value" [class.sin-dato]="!data.registro.duracionMinutos">
                {{ data.registro.duracionMinutos ? formatearDuracion(data.registro.duracionMinutos) : 'No disponible' }}
              </span>
            </div>
          </div>

          <div class="info-item">
            <mat-icon>category</mat-icon>
            <div>
              <span class="label">Actividad</span>
              <span class="value motivo-badge">{{ data.registro.motivoNombre }}</span>
            </div>
          </div>
        </div>

        <div class="info-row" *ngIf="data.registro.dispositivo">
          <div class="info-item full-width">
            <mat-icon>devices</mat-icon>
            <div>
              <span class="label">Dispositivo</span>
              <span class="value">{{ data.registro.dispositivo }}</span>
            </div>
          </div>
        </div>

      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cerrar()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 20px 24px 12px;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--navy-100, #e2e8f0);
    }

    .dialog-content {
      padding: 8px 24px 16px;
      min-width: 340px;
    }

    .alumno-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(0, 200, 215, 0.08);
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 3px solid var(--cyan-500, #00C8D7);
    }

    .avatar-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: var(--cyan-500, #00C8D7);
      opacity: 0.85;
    }

    .alumno-nombre {
      margin: 0;
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--navy-100, #e2e8f0);
    }

    .alumno-meta {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: var(--navy-400, #94a3b8);
    }

    .mono {
      font-family: monospace;
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .info-item.full-width {
      grid-column: 1 / -1;
    }

    .info-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-top: 1px;
      color: var(--cyan-500, #00C8D7);
      opacity: 0.7;
      flex-shrink: 0;
    }

    .info-item div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--navy-400, #94a3b8);
      font-weight: 500;
    }

    .value {
      font-size: 0.88rem;
      color: var(--navy-100, #e2e8f0);
      font-weight: 500;
    }

    .value.sin-dato {
      color: var(--navy-500, #64748b);
      font-style: italic;
      font-weight: 400;
    }

    .motivo-badge {
      color: var(--cyan-500, #00C8D7);
    }

    mat-dialog-actions {
      padding: 8px 16px 16px;
    }
  `],
})
export class RegistroDetalleDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RegistroDetalleDialogData,
    private dialogRef: MatDialogRef<RegistroDetalleDialogComponent>,
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }

  formatearFechaCompleta(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-MX', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatearDuracion(minutos: number): string {
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}
