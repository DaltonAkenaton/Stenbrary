// ╔══════════════════════════════════════════════════════╗
// ║  nuevo-pin.component.ts                              ║
// ║  Stenbrary v3.57.0 — PIN nuevo + código de           ║
// ║  recuperación                                        ║
// ║                                                      ║
// ║  Va dentro de los diálogos del PIN (quiosco y         ║
// ║  coordinador). Pide el PIN dos veces, lo guarda y     ║
// ║  muestra el código de recuperación UNA vez: no se     ║
// ║  vuelve a enseñar, para que no lo lea quien pase      ║
// ║  por Configuración. Con `soloCodigo` no pide PIN:     ║
// ║  solo genera un código nuevo.                         ║
// ╚══════════════════════════════════════════════════════╝

import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PinService } from '../../../core/services/pin.service';
import { PIN_MAX_DIGITOS, PIN_MIN_DIGITOS, esPinValido } from '../../../core/utils/quiosco.utils';

@Component({
    selector: 'app-nuevo-pin',
    imports: [FormsModule, MatIconModule],
    template: `
    @if (!codigo()) {
      <p class="pin-desc">{{ PIN_MIN }} a {{ PIN_MAX }} dígitos. Evita fechas y números fáciles como 1234.</p>
      <input class="pin-input nuevo-pin-1" type="password" inputmode="numeric" autocomplete="off"
             [maxlength]="PIN_MAX" placeholder="PIN nuevo"
             [(ngModel)]="pin1" (input)="error.set('')" />
      <input class="pin-input nuevo-pin-2" type="password" inputmode="numeric" autocomplete="off"
             [maxlength]="PIN_MAX" placeholder="Repítelo" style="margin-top: 10px;"
             [(ngModel)]="pin2" (input)="error.set('')" (keydown.enter)="guardar()" />
      @if (error()) {
        <p class="pin-error">{{ error() }}</p>
      }
      <div class="pin-actions">
        <button class="btn-cancel" (click)="cancelar.emit()">Cancelar</button>
        <button class="btn-confirm" (click)="guardar()" [disabled]="!pin1 || !pin2">Guardar PIN</button>
      </div>
    } @else {
      <p class="pin-desc">
        @if (!soloCodigo) { <strong>PIN guardado.</strong> }
        Este es tu <strong>código de recuperación</strong>. Si olvidas el PIN, con él pones uno nuevo.
      </p>
      <p class="codigo-recuperacion">{{ codigo() }}</p>
      <p class="pin-aviso">
        <mat-icon>edit_note</mat-icon>
        <span>Anótalo en papel junto con el PIN y guárdalo <strong>fuera de este equipo</strong>.
        No se vuelve a mostrar; si lo pierdes, genera otro desde Configuración → Quiosco.</span>
      </p>
      <div class="pin-actions">
        <button class="btn-confirm" (click)="listo.emit()">Ya lo anoté</button>
      </div>
    }
  `,
    styleUrls: ['./pin-dialog.scss'],
    styles: [`
    .codigo-recuperacion {
      margin: 4px 0 14px; padding: 14px;
      background: #142033;
      border: 1px dashed rgba(0, 200, 215, 0.45);
      border-radius: 10px;
      color: #E8F4F8;
      font-family: 'Space Mono', monospace;
      font-size: 1.3rem; letter-spacing: 0.12em;
      text-align: center; user-select: all;
    }
  `]
})
export class NuevoPinComponent implements OnInit {
  /** Solo generar un código nuevo, sin cambiar el PIN. */
  @Input() soloCodigo = false;
  @Output() readonly listo = new EventEmitter<void>();
  @Output() readonly cancelar = new EventEmitter<void>();

  private readonly pinService = inject(PinService);
  readonly PIN_MIN = PIN_MIN_DIGITOS;
  readonly PIN_MAX = PIN_MAX_DIGITOS;

  pin1 = '';
  pin2 = '';
  readonly error = signal('');
  readonly codigo = signal('');

  ngOnInit(): void {
    if (this.soloCodigo) this.codigo.set(this.pinService.generarCodigoNuevo());
  }

  guardar(): void {
    if (!esPinValido(this.pin1)) {
      this.error.set(`Deben ser de ${PIN_MIN_DIGITOS} a ${PIN_MAX_DIGITOS} dígitos, solo números.`);
      return;
    }
    if (this.pin1 !== this.pin2) {
      this.error.set('Los dos PIN no coinciden.');
      this.pin2 = '';
      return;
    }
    this.codigo.set(this.pinService.establecerPin(this.pin1));
  }
}
