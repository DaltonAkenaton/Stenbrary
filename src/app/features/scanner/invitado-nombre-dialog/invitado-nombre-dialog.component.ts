// ╔══════════════════════════════════════════════════════╗
// ║  invitado-nombre-dialog.component.ts                 ║
// ║  Stenbrary v3.7.0 — Dialog nombre de invitado        ║
// ║                                                      ║
// ║  Permite registrar un nombre opcional al ingresar    ║
// ║  como visitante sin credencial.                      ║
// ╚══════════════════════════════════════════════════════╝

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-invitado-nombre-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>person_outline</mat-icon>
      Acceso de Visitante
    </h2>

    <mat-dialog-content>
      <p class="hint">
        Registra tu nombre para identificarte en el historial,
        o continúa de forma anónima.
      </p>

      <mat-form-field appearance="outline" class="nombre-field">
        <mat-label>Nombre del visitante</mat-label>
        <mat-icon matPrefix>badge</mat-icon>
        <input
          matInput
          [(ngModel)]="nombre"
          placeholder="Ej: Juan García"
          maxlength="60"
          (keyup.enter)="confirmar()">
        <mat-hint align="end">{{ nombre.length }}/60</mat-hint>
        @if (mostrarError) {
          <mat-error>Escribe tu nombre o usa "Sin nombre"</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="anonimo()">
        <mat-icon>visibility_off</mat-icon>
        Sin nombre
      </button>
      <button mat-flat-button color="primary" (click)="confirmar()"
              [disabled]="nombre.trim().length === 0">
        <mat-icon>check</mat-icon>
        Continuar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 20px 24px 8px;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--navy-100, #e2e8f0);
    }

    mat-dialog-content {
      padding: 4px 24px 8px;
      overflow: visible;
    }

    .hint {
      margin: 0 0 16px;
      font-size: 0.83rem;
      color: var(--navy-400, #94a3b8);
      line-height: 1.5;
    }

    .nombre-field {
      width: 100%;
    }

    mat-dialog-actions {
      padding: 8px 16px 16px;
      gap: 8px;
    }
  `],
})
export class InvitadoNombreDialogComponent {
  nombre = '';
  mostrarError = false;

  constructor(private dialogRef: MatDialogRef<InvitadoNombreDialogComponent>) {}

  confirmar(): void {
    if (!this.nombre.trim()) {
      this.mostrarError = true;
      return;
    }
    this.dialogRef.close(this.nombre.trim());
  }

  anonimo(): void {
    this.dialogRef.close(null);
  }
}
