// ╔══════════════════════════════════════════════════════╗
// ║  quiosco-pin-dialog.component.ts                     ║
// ║  Stenbrary v3.9.0 — PIN para desactivar modo quiosco ║
// ║                                                      ║
// ║  DISEÑO:                                             ║
// ║  - Solo valida PIN y devuelve true/false.            ║
// ║  - No expone opciones administrativas adicionales    ║
// ║    (como /presencia) para no arriesgar que el PIN    ║
// ║    se filtre delante de alumnos durante consultas    ║
// ║    frecuentes.                                       ║
// ║  - Si el coordinador quiere consultar /presencia,    ║
// ║    desactiva el modo, consulta, y reactiva.          ║
// ╚══════════════════════════════════════════════════════╝

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ConfigService } from '../../../core/services/config.service';

@Component({
  selector: 'app-quiosco-pin-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  template: `
    <div class="pin-dialog">
      <div class="pin-header">
        <mat-icon>lock</mat-icon>
        <h2>Desactivar modo quiosco</h2>
      </div>
      <p class="pin-desc">Ingresa el PIN configurado para restaurar la navegación completa.</p>

      <input
        #pinInput
        type="password"
        inputmode="numeric"
        autocomplete="off"
        maxlength="6"
        class="pin-input"
        [class.pin-input-error]="error"
        [(ngModel)]="pin"
        (keydown.enter)="confirmar()"
        (input)="error = false"
        placeholder="••••" />

      @if (error) {
        <p class="pin-error">PIN incorrecto. Intenta de nuevo.</p>
      }

      <div class="pin-actions">
        <button class="btn-cancel" (click)="dialogRef.close(false)">Cancelar</button>
        <button class="btn-confirm" (click)="confirmar()" [disabled]="!pin">Desbloquear</button>
      </div>
    </div>
  `,
  styles: [`
    .pin-dialog {
      padding: 28px 24px;
      background: #0d1626;
      border: 1px solid rgba(0, 200, 215, 0.15);
      border-radius: 16px;
      min-width: 300px;
    }
    .pin-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
      mat-icon { color: #00C8D7; font-size: 22px; width: 22px; height: 22px; }
      h2 { margin: 0; color: #E8F4F8; font-size: 1.05rem; font-weight: 700; }
    }
    .pin-desc {
      margin: 0 0 18px;
      color: rgba(200, 230, 240, 0.6);
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .pin-input {
      width: 100%;
      padding: 14px 16px;
      background: #142033;
      border: 1px solid rgba(0, 200, 215, 0.22);
      border-radius: 10px;
      color: #E8F4F8;
      font-family: 'Space Mono', monospace;
      font-size: 1.4rem;
      letter-spacing: 0.4em;
      text-align: center;
      transition: border-color .2s, box-shadow .2s;
    }
    .pin-input:focus {
      outline: none;
      border-color: rgba(0, 200, 215, 0.55);
      box-shadow: 0 0 0 3px rgba(0, 200, 215, 0.10);
    }
    .pin-input-error {
      border-color: rgba(240, 82, 82, 0.55);
      box-shadow: 0 0 0 3px rgba(240, 82, 82, 0.10);
    }
    .pin-error {
      margin: 8px 0 0;
      color: #F05252;
      font-size: 0.8rem;
    }
    .pin-actions {
      display: flex; justify-content: flex-end; gap: 10px;
      margin-top: 20px;
    }
    .btn-cancel, .btn-confirm {
      padding: 10px 18px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background .15s;
    }
    .btn-cancel {
      background: rgba(200, 230, 240, 0.06);
      color: rgba(200, 230, 240, 0.6);
    }
    .btn-cancel:hover { background: rgba(200, 230, 240, 0.12); }
    .btn-confirm {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
    }
    .btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
})
export class QuioscoPinDialogComponent {
  pin = '';
  error = false;

  dialogRef = inject(MatDialogRef<QuioscoPinDialogComponent, boolean>);
  private configService = inject(ConfigService);

  confirmar(): void {
    if (!this.pin) return;
    if (this.configService.validarQuioscoPin(this.pin)) {
      this.dialogRef.close(true);
    } else {
      this.error = true;
      this.pin = '';
    }
  }
}
