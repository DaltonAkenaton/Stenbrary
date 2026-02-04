import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirmacion-matricula-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-icon">
        <mat-icon>qr_code_2</mat-icon>
      </div>
      
      <h2 mat-dialog-title>¿Esta es tu matrícula?</h2>
      
      <mat-dialog-content>
        <div class="matricula-display">
          {{ data.matricula }}
        </div>
        <p class="dialog-message">
          Por favor verifica que la matrícula sea correcta antes de continuar.
        </p>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="cancelar()" color="warn">
          <mat-icon>close</mat-icon>
          Cancelar
        </button>
        <button mat-raised-button (click)="confirmar()" color="primary">
          <mat-icon>check</mat-icon>
          Confirmar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 16px;
      text-align: center;
    }

    .dialog-icon {
      margin-bottom: 16px;
      
      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #3f51b5;
      }
    }

    h2 {
      margin: 0 0 16px 0;
      font-size: 1.5rem;
      color: #333;
    }

    .matricula-display {
      background: #f5f5f5;
      border: 2px solid #3f51b5;
      border-radius: 8px;
      padding: 24px;
      margin: 16px 0;
      font-size: 2rem;
      font-weight: 700;
      color: #3f51b5;
      letter-spacing: 2px;
    }

    .dialog-message {
      color: #666;
      margin: 16px 0;
      font-size: 0.95rem;
    }

    mat-dialog-actions {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      gap: 8px;
      
      button {
        mat-icon {
          margin-right: 4px;
        }
      }
    }
  `]
})
export class ConfirmacionMatriculaDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacionMatriculaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { matricula: string }
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}