// ╔══════════════════════════════════════════════════════╗
// ║  corregir-hora-dialog.component.ts                   ║
// ║  Stenbrary v3.57.0 — Corregir una salida estimada    ║
// ║                                                      ║
// ║  En "En Biblioteca", una salida que puso el sistema   ║
// ║  solo se podía confirmar tal cual. Si el personal     ║
// ║  sabe la hora real, escribirla es mejor que guardar   ║
// ║  una inventada: deja de ser estimada y su duración    ║
// ║  ya cuenta en los promedios (P3).                     ║
// ║                                                      ║
// ║  Devuelve la hora de salida elegida, o undefined.     ║
// ╚══════════════════════════════════════════════════════╝

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { salidaCorregida } from '../../core/utils/tiempo.utils';

export interface CorregirHoraData {
  nombre: string;
  entrada: Date;
  salidaEstimada: Date;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;

@Component({
    selector: 'app-corregir-hora-dialog',
    imports: [FormsModule, MatDialogModule, MatIconModule],
    template: `
    <div class="ch-dialog">
      <div class="ch-header">
        <mat-icon>edit_calendar</mat-icon>
        <h2>Corregir hora de salida</h2>
      </div>
      <p class="ch-desc">
        {{ data.nombre }} entró a las <strong>{{ horaEntrada }}</strong>. El sistema estimó la salida a las
        <strong>{{ horaEstimada }}</strong>. Escribe la hora real si la sabes.
      </p>
      <input type="time" class="ch-input" [(ngModel)]="hora" (ngModelChange)="error.set('')"
             (keydown.enter)="guardar()" />
      @if (error()) {
        <p class="ch-error">{{ error() }}</p>
      }
      <div class="ch-actions">
        <button class="ch-cancel" (click)="ref.close()">Cancelar</button>
        <button class="ch-ok" (click)="guardar()" [disabled]="!hora">Guardar hora real</button>
      </div>
    </div>
  `,
    styles: [`
    .ch-dialog { padding: 24px; background: #0d1626; border: 1px solid rgba(0,200,215,.15); border-radius: 16px; }
    .ch-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
      mat-icon { color: #00C8D7; } h2 { margin: 0; color: #E8F4F8; font-size: 1.05rem; } }
    .ch-desc { margin: 0 0 14px; color: rgba(200,230,240,.65); font-size: .85rem; line-height: 1.5; }
    .ch-input { width: 100%; padding: 12px 14px; background: #142033; border: 1px solid rgba(0,200,215,.22);
      border-radius: 10px; color: #E8F4F8; font-family: 'Space Mono', monospace; font-size: 1.2rem; color-scheme: dark; }
    .ch-error { margin: 8px 0 0; color: #F05252; font-size: .8rem; }
    .ch-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
    .ch-cancel, .ch-ok { padding: 10px 18px; border-radius: 10px; border: none; font: inherit; font-weight: 600; cursor: pointer; }
    .ch-cancel { background: rgba(200,230,240,.06); color: rgba(200,230,240,.6); }
    .ch-ok { background: linear-gradient(135deg, #00C8D7, #0BC4B7); color: #04090F; }
    .ch-ok:disabled { opacity: .4; cursor: not-allowed; }
  `]
})
export class CorregirHoraDialogComponent {
  readonly data = inject<CorregirHoraData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<CorregirHoraDialogComponent, Date>);
  readonly error = signal('');
  readonly horaEntrada = hhmm(new Date(this.data.entrada));
  readonly horaEstimada = hhmm(new Date(this.data.salidaEstimada));
  hora = this.horaEstimada;

  guardar(): void {
    const ahora = new Date();
    const d = salidaCorregida(this.hora, new Date(this.data.entrada), ahora);
    if (!d) {
      this.error.set(`Debe ser entre las ${this.horaEntrada} y ahora (${hhmm(ahora)}).`);
      return;
    }
    this.ref.close(d);
  }
}
