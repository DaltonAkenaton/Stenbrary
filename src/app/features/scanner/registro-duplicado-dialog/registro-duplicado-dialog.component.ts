// ╔══════════════════════════════════════════════════════╗
// ║  registro-duplicado-dialog.component.ts              ║
// ║  Stenbrary v3.6.2 — Duplicados + Salida              ║
// ║                                                      ║
// ║  Dialog que aparece cuando el alumno ya tiene un      ║
// ║  registro reciente. Ofrece 3 opciones:                ║
// ║    1. Registrar salida (actualiza registro existente) ║
// ║    2. Nuevo acceso (crea registro nuevo)              ║
// ║    3. Cancelar                                        ║
// ║                                                      ║
// ║  UBICACIÓN: features/scanner/registro-duplicado-dialog║
// ╚══════════════════════════════════════════════════════╝

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface RegistroDuplicadoData {
  nombreAlumno: string;
  matricula: string;
  motivoAnterior: string;
  horaRegistro: string;
  minutosTranscurridos: number;
  registroId: string;
  /** true si el registro ya tiene hora de salida */
  yaRegistroSalida: boolean;
}

/** Resultado del dialog */
export type RegistroDuplicadoResultado = 'salida' | 'nuevo' | 'cancelar';

@Component({
  selector: 'app-registro-duplicado-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="dialog-container">

      <div class="dialog-icon">
        <mat-icon>history</mat-icon>
      </div>

      <h2 class="dialog-title">Acceso reciente detectado</h2>

      <div class="registro-info">
        <div class="info-row">
          <span class="info-label">Alumno</span>
          <span class="info-value">{{ data.nombreAlumno }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Matrícula</span>
          <span class="info-value mono">{{ data.matricula }}</span>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <span class="info-label">Entrada</span>
          <span class="info-value highlight">hace {{ data.minutosTranscurridos }} min</span>
        </div>
        <div class="info-row">
          <span class="info-label">Actividad</span>
          <span class="info-value">{{ data.motivoAnterior }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Hora</span>
          <span class="info-value">{{ data.horaRegistro }}</span>
        </div>
      </div>

      <p class="dialog-message">
        @if (!data.yaRegistroSalida) {
          ¿Quieres registrar tu salida o un nuevo acceso?
        } @else {
          Ya registraste salida en este acceso. ¿Registrar un nuevo acceso?
        }
      </p>

      <div class="dialog-actions">
        @if (!data.yaRegistroSalida) {
          <button class="btn-salida" (click)="registrarSalida()">
            <mat-icon>logout</mat-icon>
            Registrar salida
          </button>
        }
        <button class="btn-nuevo" (click)="nuevoAcceso()">
          <mat-icon>login</mat-icon>
          Nuevo acceso
        </button>
      </div>

      <button class="btn-cancelar" (click)="cancelar()">
        Cancelar
      </button>

    </div>
  `,
  styles: [`
    :host {
      --navy-800:   #0D1626;
      --navy-700:   #142033;
      --cyan-500:   #00C8D7;
      --cyan-400:   #22D4E1;
      --teal-500:   #00A99E;
      --amber-400:  #F5A623;
      --amber-300:  #FFC857;
      --border-subtle: rgba(0, 200, 215, 0.10);
      --border-amber:  rgba(245, 166, 35, 0.30);
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
      gap: 14px;
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
      background: linear-gradient(135deg, rgba(245, 166, 35, 0.15), rgba(255, 200, 87, 0.08));
      border: 1px solid var(--border-amber);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px rgba(245, 166, 35, 0.10);
    }

    .dialog-icon mat-icon {
      font-size: 28px; width: 28px; height: 28px;
      color: var(--amber-300);
    }

    .dialog-title {
      font-family: var(--font-display);
      font-size: 19px; font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--text-primary); margin: 0;
    }

    .registro-info {
      width: 100%;
      background: var(--navy-700);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex; flex-direction: column; gap: 8px;
    }

    .info-row { display: flex; justify-content: space-between; align-items: center; }
    .info-label { font-family: var(--font-body); font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-family: var(--font-body); font-size: 14px; color: var(--text-secondary); font-weight: 500; }
    .info-value.mono { font-family: var(--font-mono); color: var(--cyan-400); letter-spacing: 1px; }
    .info-value.highlight { color: var(--amber-300); font-weight: 600; }
    .info-divider { height: 1px; background: var(--border-subtle); margin: 2px 0; }

    .dialog-message { font-family: var(--font-body); font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0; }

    .dialog-actions {
      display: flex; gap: 10px; width: 100%;
      margin-top: 4px; padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
    }

    .btn-salida, .btn-nuevo {
      flex: 1;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 11px 16px; border-radius: 10px;
      font-family: var(--font-body); font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; transition: all 200ms ease;
    }

    .btn-salida {
      background: linear-gradient(135deg, var(--amber-400), var(--amber-300));
      color: #1a0e00;
      box-shadow: 0 4px 16px rgba(245, 166, 35, 0.25);
    }
    .btn-salida:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(245, 166, 35, 0.35); }

    .btn-nuevo {
      background: linear-gradient(135deg, var(--cyan-500), var(--teal-500));
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }
    .btn-nuevo:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(0, 200, 215, 0.35); }

    .btn-cancelar {
      width: 100%; padding: 9px 16px; border-radius: 10px;
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; background: transparent; color: var(--text-muted);
      border: 1px solid var(--border-subtle); transition: all 200ms ease;
    }
    .btn-cancelar:hover { background: rgba(255,255,255,0.04); color: var(--text-secondary); }

    .btn-salida mat-icon, .btn-nuevo mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `]
})
export class RegistroDuplicadoDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<RegistroDuplicadoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RegistroDuplicadoData,
  ) {}

  registrarSalida(): void {
    this.dialogRef.close('salida' as RegistroDuplicadoResultado);
  }

  nuevoAcceso(): void {
    this.dialogRef.close('nuevo' as RegistroDuplicadoResultado);
  }

  cancelar(): void {
    this.dialogRef.close('cancelar' as RegistroDuplicadoResultado);
  }
}