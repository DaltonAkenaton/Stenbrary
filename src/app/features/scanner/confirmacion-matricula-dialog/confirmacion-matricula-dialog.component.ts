// ╔══════════════════════════════════════════════════════╗
// ║  confirmacion-matricula-dialog.component.ts          ║
// ║  Stenbrary v2.0 — Cyan Cube                         ║
// ║  Solo cambios de estilos. Lógica intacta.           ║
// ╚══════════════════════════════════════════════════════╝

import { Component, inject, signal } from '@angular/core';
import { LectorRafagaService } from '../../../core/services/lector-rafaga.service';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-confirmacion-matricula-dialog',
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule
    ],
    template: `
    <div class="dialog-container">

      <!-- Ícono -->
      <div class="dialog-icon">
        <mat-icon>badge</mat-icon>
      </div>

      <!-- Título -->
      <h2 class="dialog-title">¿Esta es tu matrícula?</h2>

      <!-- Matrícula destacada -->
      <div class="matricula-display">
        {{ data.matricula }}
      </div>

      <!-- Mensaje -->
      <p class="dialog-message">
        Verifica que el código sea correcto antes de continuar.
      </p>
      @if (lecturaIgnorada()) {
        <p class="dialog-message lectura-ignorada">
          Se pasó otra credencial: primero confirma o cancela esta matrícula.
        </p>
      }

      <!-- Acciones -->
      <div class="dialog-actions">
        <button class="btn-cancel" (click)="cancelar()">
          <mat-icon>close</mat-icon>
          Cancelar
        </button>
        <!-- cdkFocusInitial: el foco iba al primer botón (Cancelar) y el
             segundo Enter de "matrícula + Enter + Enter" CANCELABA (v3.57.0). -->
        <button class="btn-confirm" cdkFocusInitial (click)="confirmar()">
          <mat-icon>check</mat-icon>
          Confirmar
        </button>
      </div>

    </div>
  `,
    styles: [`
    /* Tokens del design system — definidos inline para que el dialog
       funcione correctamente dentro del CDK overlay sin depender
       del SCSS externo */
    :host {
      --navy-800:   #0D1626;
      --navy-700:   #142033;
      --navy-600:   #1C2E47;
      --cyan-500:   #00C8D7;
      --cyan-400:   #22D4E1;
      --teal-500:   #00A99E;
      --border-subtle: rgba(0, 200, 215, 0.10);
      --border-glow:   rgba(0, 200, 215, 0.32);
      --text-primary:   #E8F4F8;
      --text-secondary: rgba(200, 230, 240, 0.65);
      --text-muted:     rgba(160, 200, 215, 0.40);
      --font-display: 'Syne', sans-serif;
      --font-body:    'DM Sans', sans-serif;
      --font-mono:    'Space Mono', monospace;
    }

    .dialog-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 28px 24px 24px;
      background: var(--navy-800);
      color: var(--text-primary);
      border-radius: 18px;
      text-align: center;
    }

    .dialog-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: linear-gradient(135deg,
        rgba(0, 200, 215, 0.15),
        rgba(0, 169, 158, 0.10)
      );
      border: 1px solid var(--border-glow);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px rgba(0, 200, 215, 0.12);
    }

    .dialog-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--cyan-400);
    }

    .dialog-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--text-primary);
      margin: 0;
    }

    .matricula-display {
      width: 100%;
      background: var(--navy-700);
      border: 1px solid var(--border-glow);
      border-radius: 12px;
      padding: 20px 24px;
      font-family: var(--font-mono);
      font-size: 22px;
      font-weight: 700;
      color: var(--cyan-400);
      letter-spacing: 3px;
      box-shadow: inset 0 0 0 1px var(--border-subtle),
                  0 0 20px rgba(0, 200, 215, 0.06);
    }

    .dialog-message {
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0;
    }

    .dialog-actions {
      display: flex;
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
      background: rgba(240, 82, 82, 0.10);
      color: #FC8181;
      border: 1px solid rgba(240, 82, 82, 0.25);
    }

    .btn-cancel:hover {
      background: rgba(240, 82, 82, 0.20);
    }

    .btn-confirm {
      background: linear-gradient(135deg, var(--cyan-500), var(--teal-500));
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }

    .btn-confirm:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(0, 200, 215, 0.35);
    }

    .lectura-ignorada {
      color: #F5A623;
      font-weight: 600;
    }

    .btn-cancel mat-icon,
    .btn-confirm mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class ConfirmacionMatriculaDialogComponent {
  dialogRef = inject<MatDialogRef<ConfirmacionMatriculaDialogComponent>>(MatDialogRef);
  data = inject<{
    matricula: string;
}>(MAT_DIALOG_DATA);

  /** Se pasó una credencial con el diálogo abierto: se descartó. */
  readonly lecturaIgnorada = signal(false);

  constructor() {
    const dialogRef = this.dialogRef;

    // Con el foco en "Confirmar", el Enter que manda el lector al final de
    // OTRA credencial confirmaría la de este alumno (el bug de v3.54.0, en
    // otra pantalla). El servicio reconoce la ráfaga y se come su Enter.
    const dejarDeEscuchar = inject(LectorRafagaService).escuchar(() => this.lecturaIgnorada.set(true));
    dialogRef.afterClosed().subscribe(() => dejarDeEscuchar());
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}