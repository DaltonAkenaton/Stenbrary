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
// ║  v3.57.2: escucha al lector. Con el foco en "Marcar   ║
// ║  mi salida", el Enter de la credencial del siguiente  ║
// ║  alumno registraba la salida del anterior.            ║
// ║                                                      ║
// ║  UBICACIÓN: features/scanner/registro-duplicado-dialog║
// ╚══════════════════════════════════════════════════════╝

import { Component, Inject, inject, signal } from '@angular/core';
import { LectorRafagaService } from '../../../core/services/lector-rafaga.service';
import { CLAVE_LECTURA_PENDIENTE, decidirLecturaEnFlujo } from '../../../core/utils/flujo-puerta.utils';
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
  /** true cuando el dialog se abre en modo quiosco: botones gigantes, texto amigable, sin Cancelar explícito */
  modoQuiosco?: boolean;
}

/** Resultado del dialog */
export type RegistroDuplicadoResultado = 'salida' | 'nuevo' | 'cancelar';

@Component({
    selector: 'app-registro-duplicado-dialog',
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
    ],
    template: `
    <div class="dialog-container" [class.quiosco]="data.modoQuiosco" (pointerdown)="tocado()">

      <div class="dialog-icon">
        <mat-icon>{{ data.modoQuiosco ? 'waving_hand' : 'history' }}</mat-icon>
      </div>

      <h2 class="dialog-title">
        @if (data.modoQuiosco) {
          ¡Hola, {{ data.nombreAlumno }}!
        } @else {
          Acceso reciente detectado
        }
      </h2>

      @if (data.modoQuiosco) {
        <p class="quiosco-subtitle">
          Ya tienes una entrada activa desde hace
          <strong>{{ data.minutosTranscurridos }} min</strong>.
        </p>
      } @else {
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
      }

      <p class="dialog-message">
        @if (data.modoQuiosco) {
          @if (!data.yaRegistroSalida) {
            ¿Qué quieres hacer?
          } @else {
            Ya marcaste tu salida. ¿Nuevo acceso?
          }
        } @else {
          @if (!data.yaRegistroSalida) {
            ¿Quieres registrar tu salida o un nuevo acceso?
          } @else {
            Ya registraste salida en este acceso. ¿Registrar un nuevo acceso?
          }
        }
      </p>

      @if (lecturaIgnorada()) {
        <p class="dialog-message lectura-ignorada">
          Se pasó otra credencial: primero elige una opción o cierra este aviso.
        </p>
      }

      <div class="dialog-actions" [class.vertical]="data.modoQuiosco">
        @if (!data.yaRegistroSalida) {
          <button class="btn-salida" (click)="registrarSalida()">
            <mat-icon>logout</mat-icon>
            @if (data.modoQuiosco) {
              Marcar mi salida
            } @else {
              Registrar salida
            }
          </button>
        }
        <button class="btn-nuevo" (click)="nuevoAcceso()">
          <mat-icon>login</mat-icon>
          @if (data.modoQuiosco) {
            Es una visita nueva
          } @else {
            Nuevo acceso
          }
        </button>
      </div>

      <button class="btn-cancelar" (click)="cancelar()">
        @if (data.modoQuiosco) {
          No era yo — cerrar
        } @else {
          Cancelar
        }
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
    .dialog-message.lectura-ignorada { color: var(--amber-300); font-weight: 600; }

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

    /* ═══ MODO QUIOSCO: touch-friendly + amigable para el alumno ═══ */
    .dialog-container.quiosco {
      gap: 20px;
      padding: 36px 28px 28px;
      max-width: 440px;
    }

    .dialog-container.quiosco .dialog-icon {
      width: 88px; height: 88px;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(0, 200, 215, 0.20), rgba(0, 169, 158, 0.10));
      border-color: rgba(0, 200, 215, 0.35);
      box-shadow: 0 0 32px rgba(0, 200, 215, 0.18);
    }

    .dialog-container.quiosco .dialog-icon mat-icon {
      font-size: 44px; width: 44px; height: 44px;
      color: var(--cyan-400);
    }

    .dialog-container.quiosco .dialog-title {
      font-size: 26px;
      letter-spacing: -0.4px;
      line-height: 1.15;
    }

    .quiosco-subtitle {
      font-family: var(--font-body);
      font-size: 15px;
      color: var(--text-secondary);
      margin: -4px 0 0;
      text-align: center;
      line-height: 1.4;
    }

    .quiosco-subtitle strong {
      color: var(--amber-300);
      font-weight: 700;
    }

    .dialog-container.quiosco .dialog-message {
      font-size: 15px;
      color: var(--text-secondary);
    }

    .dialog-actions.vertical {
      flex-direction: column;
      gap: 12px;
      padding-top: 20px;
    }

    .dialog-container.quiosco .btn-salida,
    .dialog-container.quiosco .btn-nuevo {
      width: 100%;
      padding: 18px 20px;
      font-size: 16px;
      font-weight: 700;
      border-radius: 14px;
      gap: 10px;
    }

    .dialog-container.quiosco .btn-salida mat-icon,
    .dialog-container.quiosco .btn-nuevo mat-icon {
      font-size: 22px; width: 22px; height: 22px;
    }

    /* En quiosco, la salida es la acción esperada — destacar más */
    .dialog-container.quiosco .btn-salida {
      order: -1;
      padding: 22px 20px;
      font-size: 18px;
      box-shadow: 0 6px 22px rgba(245, 166, 35, 0.35);
    }

    /* "Nueva visita" como secundario: estilo más sobrio en quiosco */
    .dialog-container.quiosco .btn-nuevo {
      background: transparent;
      border: 1.5px solid rgba(0, 200, 215, 0.35);
      color: var(--cyan-400);
      box-shadow: none;
    }

    .dialog-container.quiosco .btn-nuevo:hover {
      background: rgba(0, 200, 215, 0.08);
      transform: none;
      box-shadow: none;
    }

    /* Cancelar: muy discreto — el alumno no debe usarlo salvo error */
    .dialog-container.quiosco .btn-cancelar {
      margin-top: 4px;
      font-size: 12px;
      color: var(--text-muted);
      border-color: transparent;
      background: transparent;
      padding: 6px 12px;
      opacity: 0.6;
    }

    .dialog-container.quiosco .btn-cancelar:hover {
      opacity: 1;
      background: rgba(255,255,255,0.03);
    }
  `]
})
export class RegistroDuplicadoDialogComponent {
  /** Se pasó otra credencial mientras alguien usaba el diálogo: se descartó. */
  readonly lecturaIgnorada = signal(false);
  private ultimoToque = Date.now();

  constructor(
    public dialogRef: MatDialogRef<RegistroDuplicadoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RegistroDuplicadoData,
  ) {
    // El servicio se come el Enter del lector. Misma regla que "elegir
    // actividad": si nadie toca el diálogo en 20 s, la credencial de otro
    // alumno lo cierra y el escáner la atiende.
    const dejarDeEscuchar = inject(LectorRafagaService).escuchar(leida => {
      const decision = decidirLecturaEnFlujo({
        matriculaFlujo: this.data.matricula,
        leida,
        msSinInteraccion: Date.now() - this.ultimoToque,
      });
      if (decision === 'atender') {
        sessionStorage.setItem(CLAVE_LECTURA_PENDIENTE, leida);
        this.cancelar();
      } else {
        this.lecturaIgnorada.set(true);
      }
    });
    dialogRef.afterClosed().subscribe(() => dejarDeEscuchar());
  }

  tocado(): void {
    this.ultimoToque = Date.now();
  }

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