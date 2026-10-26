// ╔══════════════════════════════════════════════════════╗
// ║  confirm-dialog.component.ts                         ║
// ║  Stenbrary v3.6.2 — Dialog reutilizable              ║
// ║                                                      ║
// ║  3 variantes: danger / warning / info                ║
// ║  Reemplaza confirm() nativo del navegador            ║
// ║                                                      ║
// ║  USO:                                                ║
// ║  const ref = this.dialog.open(ConfirmDialogComponent,║
// ║    { width: '380px', data: {                         ║
// ║        titulo: '¿Eliminar?',                         ║
// ║        mensaje: 'Esta acción no se puede deshacer.', ║
// ║        variante: 'danger',                           ║
// ║        textoConfirmar: 'Eliminar',                   ║
// ║    }});                                              ║
// ║  ref.afterClosed().subscribe(ok => { if (ok) ... }); ║
// ║                                                      ║
// ║  UBICACIÓN: shared/components/confirm-dialog/        ║
// ╚══════════════════════════════════════════════════════╝

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  variante?: 'danger' | 'warning' | 'info';
  textoConfirmar?: string;
  textoCancelar?: string;
  icono?: string;
  /**
   * Tercer botón con la opción recomendada en vez de la peligrosa (v3.57.0):
   * "Desactivar" en lugar de "Eliminar". Cierra con `'alternativa'`.
   */
  textoAlternativa?: string;
  iconoAlternativa?: string;
}

@Component({
    selector: 'app-confirm-dialog',
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
    ],
    template: `
    <div class="dialog-container">

      <!-- Ícono -->
      <div class="dialog-icon" [class]="'dialog-icon icon-' + variante">
        <mat-icon>{{ iconoFinal }}</mat-icon>
      </div>

      <!-- Título -->
      <h2 class="dialog-title">{{ data.titulo }}</h2>

      <!-- Mensaje -->
      <p class="dialog-message">{{ data.mensaje }}</p>

      <!-- Acciones -->
      <div class="dialog-actions">
        <button class="btn-cancel" (click)="cancelar()">
          <mat-icon>close</mat-icon>
          {{ data.textoCancelar || 'Cancelar' }}
        </button>
        @if (data.textoAlternativa) {
          <button class="btn-confirm btn-info btn-alternativa" (click)="alternativa()">
            <mat-icon>{{ data.iconoAlternativa || 'check' }}</mat-icon>
            {{ data.textoAlternativa }}
          </button>
        }
        <button [class]="'btn-confirm btn-' + variante" (click)="confirmar()">
          <mat-icon>{{ iconoBoton }}</mat-icon>
          {{ data.textoConfirmar || 'Confirmar' }}
        </button>
      </div>

    </div>
  `,
    styles: [`
    :host {
      --navy-800:   #0D1626;
      --navy-700:   #142033;
      --cyan-500:   #00C8D7;
      --cyan-400:   #22D4E1;
      --teal-500:   #00A99E;
      --border-subtle: rgba(0, 200, 215, 0.10);
      --text-primary:   #E8F4F8;
      --text-secondary: rgba(200, 230, 240, 0.65);
      --text-muted:     rgba(160, 200, 215, 0.40);
      --font-display: 'Syne', sans-serif;
      --font-body:    'DM Sans', sans-serif;

      /* Variante danger */
      --danger-bg:     rgba(240, 82, 82, 0.12);
      --danger-border: rgba(240, 82, 82, 0.30);
      --danger-color:  #FC8181;
      --danger-glow:   rgba(240, 82, 82, 0.10);
      --danger-btn-bg: linear-gradient(135deg, #E53E3E, #FC5555);

      /* Variante warning */
      --warning-bg:     rgba(245, 166, 35, 0.12);
      --warning-border: rgba(245, 166, 35, 0.30);
      --warning-color:  #FFC857;
      --warning-glow:   rgba(245, 166, 35, 0.10);
      --warning-btn-bg: linear-gradient(135deg, #F5A623, #FFC857);

      /* Variante info */
      --info-bg:     rgba(0, 200, 215, 0.12);
      --info-border: rgba(0, 200, 215, 0.30);
      --info-color:  #22D4E1;
      --info-glow:   rgba(0, 200, 215, 0.10);
      --info-btn-bg: linear-gradient(135deg, #00C8D7, #00A99E);
    }

    .dialog-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      padding: 28px 24px 24px;
      background: var(--navy-800);
      color: var(--text-primary);
      border-radius: 18px;
      text-align: center;
    }

    /* ── Ícono con variantes ── */
    .dialog-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-danger {
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      box-shadow: 0 0 24px var(--danger-glow);
    }
    .icon-danger mat-icon { color: var(--danger-color); }

    .icon-warning {
      background: var(--warning-bg);
      border: 1px solid var(--warning-border);
      box-shadow: 0 0 24px var(--warning-glow);
    }
    .icon-warning mat-icon { color: var(--warning-color); }

    .icon-info {
      background: var(--info-bg);
      border: 1px solid var(--info-border);
      box-shadow: 0 0 24px var(--info-glow);
    }
    .icon-info mat-icon { color: var(--info-color); }

    .dialog-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .dialog-title {
      font-family: var(--font-display);
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--text-primary);
      margin: 0;
    }

    .dialog-message {
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
      margin: 0;
      max-width: 320px;
    }

    .dialog-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      width: 100%;
      margin-top: 4px;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
    }

    .btn-cancel,
    .btn-confirm {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 11px 16px;
      border-radius: 10px;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 200ms ease;
    }

    .btn-cancel {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }
    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    /* ── Botón confirmar con variantes ── */
    .btn-danger {
      background: var(--danger-btn-bg);
      color: #fff;
      box-shadow: 0 4px 16px var(--danger-glow);
    }
    .btn-danger:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(240, 82, 82, 0.30);
    }

    .btn-warning {
      background: var(--warning-btn-bg);
      color: #1a0e00;
      box-shadow: 0 4px 16px var(--warning-glow);
    }
    .btn-warning:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(245, 166, 35, 0.30);
    }

    .btn-info {
      background: var(--info-btn-bg);
      color: #04090F;
      box-shadow: 0 4px 16px var(--info-glow);
    }
    .btn-info:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(0, 200, 215, 0.30);
    }

    .btn-cancel mat-icon,
    .btn-confirm mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class ConfirmDialogComponent {

  variante: 'danger' | 'warning' | 'info';

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {
    this.variante = data.variante || 'info';
  }

  /** Ícono principal del dialog */
  get iconoFinal(): string {
    if (this.data.icono) return this.data.icono;
    switch (this.variante) {
      case 'danger':  return 'warning';
      case 'warning': return 'help_outline';
      case 'info':    return 'info';
    }
  }

  /** Ícono del botón de confirmar */
  get iconoBoton(): string {
    switch (this.variante) {
      case 'danger':  return 'delete';
      case 'warning': return 'check';
      case 'info':    return 'check';
    }
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  alternativa(): void {
    this.dialogRef.close('alternativa');
  }
}