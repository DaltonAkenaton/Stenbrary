// ╔══════════════════════════════════════════════════════╗
// ║  quiosco-pin-dialog.component.ts                     ║
// ║  Stenbrary v3.52.0 — PIN del modo quiosco            ║
// ║                                                      ║
// ║  DISEÑO:                                             ║
// ║  - No expone opciones administrativas adicionales    ║
// ║    (como /presencia) para no arriesgar que el PIN    ║
// ║    se filtre delante de alumnos durante consultas    ║
// ║    frecuentes.                                       ║
// ║                                                      ║
// ║  v3.52.0:                                            ║
// ║  - 5 fallos seguidos bloquean 5 min (persistido en   ║
// ║    localStorage: recargar no lo reinicia).           ║
// ║  - Con el PIN correcto: "Salir del quiosco" o        ║
// ║    "Descargar respaldo" SIN salir — la rutina diaria ║
// ║    de llevar el respaldo a la oficina ya no deja la  ║
// ║    puerta abierta.                                   ║
// ║  - Fallos, bloqueos y salidas van a la bitácora.     ║
// ║                                                      ║
// ║  Devuelve 'salir' o undefined.                       ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ConfigService } from '../../../core/services/config.service';
import { BackupService } from '../../../core/services/backup.service';
import { BitacoraService } from '../../../core/services/bitacora.service';
import {
  IntentosPin, PIN_BLOQUEO_MS, PIN_MAX_FALLOS,
  leerIntentosPin, msBloqueoPin, normalizarIntentosPin, registrarFalloPin,
} from '../../../core/utils/quiosco.utils';

const CLAVE_INTENTOS = 'stenbrary-pin-intentos';

export type SalidaPinQuiosco = 'salir' | undefined;

@Component({
  selector: 'app-quiosco-pin-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  template: `
    <div class="pin-dialog">
      @if (!desbloqueado()) {
        <div class="pin-header">
          <mat-icon>lock</mat-icon>
          <h2>Modo quiosco</h2>
        </div>

        @if (msBloqueo() > 0) {
          <p class="pin-bloqueo">
            <mat-icon>gpp_maybe</mat-icon>
            <span>Demasiados intentos. Espera <strong>{{ textoEspera() }}</strong> para volver a intentar.</span>
          </p>
        } @else {
          <p class="pin-desc">Ingresa el PIN del coordinador.</p>

          <input
            type="password"
            inputmode="numeric"
            autocomplete="off"
            maxlength="6"
            class="pin-input"
            [class.pin-input-error]="error()"
            [(ngModel)]="pin"
            (keydown.enter)="confirmar()"
            (input)="error.set(false)"
            placeholder="••••" />

          @if (error()) {
            <p class="pin-error">
              PIN incorrecto.
              @if (restantes() === 1) { Te queda 1 intento. }
              @else if (restantes() > 1) { Te quedan {{ restantes() }} intentos. }
            </p>
          }
        }

        <div class="pin-actions">
          <button class="btn-cancel" (click)="dialogRef.close()">Cancelar</button>
          <button class="btn-confirm" (click)="confirmar()" [disabled]="!pin || msBloqueo() > 0">Continuar</button>
        </div>
      } @else {
        <div class="pin-header">
          <mat-icon>lock_open</mat-icon>
          <h2>¿Qué quieres hacer?</h2>
        </div>

        <button class="opcion" (click)="descargarRespaldo()" [disabled]="descargando()">
          <mat-icon>download</mat-icon>
          <span>
            <strong>Descargar respaldo</strong>
            <small>El equipo sigue en modo quiosco.</small>
          </span>
        </button>
        @if (respaldoListo()) {
          <p class="pin-ok"><mat-icon>check_circle</mat-icon> {{ respaldoListo() }}</p>
        }
        @if (respaldoFallo()) {
          <p class="pin-error">No se pudo descargar el respaldo. Intenta de nuevo.</p>
        }

        <button class="opcion" (click)="salir()">
          <mat-icon>logout</mat-icon>
          <span>
            <strong>Salir del modo quiosco</strong>
            <small>Abre todo el sistema en este equipo.</small>
          </span>
        </button>

        <div class="pin-actions">
          <button class="btn-cancel" (click)="dialogRef.close()">{{ respaldoListo() ? 'Listo' : 'Cancelar' }}</button>
        </div>
      }
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
    .pin-bloqueo {
      display: flex; gap: 10px; align-items: flex-start;
      margin: 8px 0 0; padding: 12px 14px;
      background: rgba(245, 166, 35, 0.08);
      border: 1px solid rgba(245, 166, 35, 0.3);
      border-radius: 10px;
      color: #F5C26B; font-size: 0.85rem; line-height: 1.45;
      mat-icon { flex-shrink: 0; font-size: 20px; width: 20px; height: 20px; }
    }
    .opcion {
      display: flex; align-items: center; gap: 12px;
      width: 100%; margin-top: 12px; padding: 14px 16px;
      background: #142033;
      border: 1px solid rgba(0, 200, 215, 0.18);
      border-radius: 12px;
      color: #E8F4F8; font-family: inherit; text-align: left;
      cursor: pointer; transition: background .15s, border-color .15s;
      mat-icon { color: #00C8D7; flex-shrink: 0; }
      span { display: flex; flex-direction: column; gap: 2px; }
      strong { font-size: 0.92rem; }
      small { color: rgba(200, 230, 240, 0.55); font-size: 0.78rem; }
    }
    .opcion:hover:not(:disabled) { background: #1a2a42; border-color: rgba(0, 200, 215, 0.4); }
    .opcion:disabled { opacity: 0.5; cursor: progress; }
    .pin-ok {
      display: flex; align-items: center; gap: 6px;
      margin: 8px 2px 0; color: #0EB07B; font-size: 0.8rem;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
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
export class QuioscoPinDialogComponent implements OnInit, OnDestroy {
  pin = '';
  readonly error = signal(false);
  readonly restantes = signal(PIN_MAX_FALLOS);
  readonly msBloqueo = signal(0);
  readonly desbloqueado = signal(false);
  readonly descargando = signal(false);
  readonly respaldoListo = signal('');
  readonly respaldoFallo = signal(false);

  readonly dialogRef = inject(MatDialogRef<QuioscoPinDialogComponent, SalidaPinQuiosco>);
  private readonly configService = inject(ConfigService);
  private readonly backupService = inject(BackupService);
  private readonly bitacora = inject(BitacoraService);

  private intentos: IntentosPin = leerIntentosPin(null);
  private reloj: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.intentos = normalizarIntentosPin(this.leer(), Date.now());
    this.guardar();
    this.restantes.set(PIN_MAX_FALLOS - this.intentos.fallos);
    this.actualizarBloqueo();
    // Cuenta regresiva visible mientras dure el bloqueo.
    this.reloj = setInterval(() => this.actualizarBloqueo(), 1000);
  }

  ngOnDestroy(): void {
    if (this.reloj) clearInterval(this.reloj);
  }

  textoEspera(): string {
    const s = Math.ceil(this.msBloqueo() / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  confirmar(): void {
    if (!this.pin || this.msBloqueo() > 0) return;
    if (this.configService.validarQuioscoPin(this.pin)) {
      this.intentos = { fallos: 0, bloqueadoHasta: 0 };
      this.guardar();
      this.desbloqueado.set(true);
      return;
    }
    this.intentos = registrarFalloPin(this.intentos, Date.now());
    this.guardar();
    this.pin = '';
    this.error.set(true);
    if (this.intentos.bloqueadoHasta > 0) {
      this.bitacora.registrar('pin-bloqueado', `${PIN_MAX_FALLOS} intentos fallidos; bloqueado ${PIN_BLOQUEO_MS / 60_000} min`);
      this.restantes.set(PIN_MAX_FALLOS);
      this.actualizarBloqueo();
    } else {
      this.bitacora.registrar('pin-fallido', `Intento ${this.intentos.fallos} de ${PIN_MAX_FALLOS}`);
      this.restantes.set(PIN_MAX_FALLOS - this.intentos.fallos);
    }
  }

  async descargarRespaldo(): Promise<void> {
    this.descargando.set(true);
    this.respaldoFallo.set(false);
    try {
      const { nombreArchivo } = await this.backupService.descargarBackup();
      this.respaldoListo.set(`Descargado: ${nombreArchivo}`);
    } catch {
      this.respaldoListo.set('');
      this.respaldoFallo.set(true);
    } finally {
      this.descargando.set(false);
    }
  }

  salir(): void {
    this.bitacora.registrar('quiosco-salir');
    this.dialogRef.close('salir');
  }

  private actualizarBloqueo(): void {
    const ms = msBloqueoPin(this.intentos, Date.now());
    this.msBloqueo.set(ms);
    if (ms === 0 && this.error() && this.intentos.bloqueadoHasta > 0) {
      // Terminó el bloqueo: se limpia el aviso para empezar de nuevo.
      this.intentos = { fallos: 0, bloqueadoHasta: 0 };
      this.guardar();
      this.error.set(false);
    }
  }

  private leer(): IntentosPin {
    try {
      return leerIntentosPin(localStorage.getItem(CLAVE_INTENTOS));
    } catch {
      // Sin localStorage el límite vive solo mientras el diálogo esté abierto.
      return leerIntentosPin(null);
    }
  }

  private guardar(): void {
    try {
      localStorage.setItem(CLAVE_INTENTOS, JSON.stringify(this.intentos));
    } catch {
      // Ídem: sin almacenamiento, el límite queda en memoria.
    }
  }
}
