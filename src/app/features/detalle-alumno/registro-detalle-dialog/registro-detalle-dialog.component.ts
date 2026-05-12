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
              <span class="value"
                    [class.sin-dato]="!data.registro.horaSalida"
                    [class.en-curso]="!data.registro.horaSalida">
                {{ data.registro.horaSalida ? formatearHora(data.registro.horaSalida) : 'En curso…' }}
              </span>
            </div>
          </div>
        </div>

        <div class="info-row">
          <div class="info-item">
            <mat-icon>{{ data.registro.horaSalida ? 'timer' : 'hourglass_top' }}</mat-icon>
            <div>
              <span class="label">Duración</span>
              <span class="value"
                    [class.sin-dato]="!data.registro.horaSalida"
                    [class.en-curso]="!data.registro.horaSalida">
                {{ textoDuracion() }}
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

        @if (data.registro.dispositivo) {
          <div class="info-row">
            <div class="info-item full-width">
              <mat-icon>devices</mat-icon>
              <div>
                <span class="label">Dispositivo</span>
                <span class="value">{{ data.registro.dispositivo }}</span>
              </div>
            </div>
          </div>
        }

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

      > div { min-width: 0; flex: 1; }
    }

    .avatar-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      line-height: 36px;
      color: var(--cyan-500, #00C8D7);
      opacity: 0.85;
      flex-shrink: 0;
    }

    .alumno-nombre {
      margin: 0;
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--navy-100, #e2e8f0);
      overflow-wrap: anywhere;
    }

    .alumno-meta {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: var(--navy-400, #94a3b8);
      overflow-wrap: anywhere;
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

    .value.en-curso {
      color: #F5A623;
      font-style: normal;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .motivo-badge {
      color: var(--cyan-500, #00C8D7);
    }

    mat-dialog-actions {
      padding: 8px 16px 16px;
    }

    @media (max-width: 480px) {
      h2[mat-dialog-title] { padding: 16px 16px 8px; font-size: 1rem; }
      .dialog-content { min-width: 0; padding: 8px 16px 12px; }
      .alumno-header { padding: 10px 12px; gap: 10px; margin-bottom: 14px; }
      .avatar-icon { font-size: 28px; width: 28px; height: 28px; line-height: 28px; }
      .alumno-nombre { font-size: 0.88rem; }
      .alumno-meta { font-size: 0.74rem; }
      .info-row { grid-template-columns: 1fr; gap: 8px; }
      .info-grid { gap: 8px; }
      .info-item { padding: 8px 10px; }
      .label { font-size: 0.65rem; }
      .value { font-size: 0.82rem; }
      mat-dialog-actions { padding: 6px 12px 12px; }
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
    const total = Math.max(0, Math.floor(minutos));
    if (total < 1) return '< 1 min';
    if (total < 60) return `${total} min`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  /**
   * Texto de duración robusto:
   * - Sin horaSalida → "En curso…"
   * - Con ambas fechas → usa duracionMinutos; si viene vacío, lo
   *   recalcula desde las fechas para no mostrar "No disponible".
   */
  textoDuracion(): string {
    const reg = this.data.registro;
    if (!reg.horaSalida) return 'En curso…';

    const minutosGuardados = reg.duracionMinutos;
    if (typeof minutosGuardados === 'number' && minutosGuardados >= 0) {
      return this.formatearDuracion(minutosGuardados);
    }

    const entrada = new Date(reg.fechaHora).getTime();
    const salida = new Date(reg.horaSalida).getTime();
    if (isNaN(entrada) || isNaN(salida) || salida < entrada) {
      return 'En curso…';
    }
    const diffMin = Math.round((salida - entrada) / 60000);
    return this.formatearDuracion(diffMin);
  }
}
