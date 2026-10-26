// ╔══════════════════════════════════════════════════════╗
// ║  quiosco-pin-dialog.component.ts                     ║
// ║  Stenbrary v3.57.0 — PIN del modo quiosco            ║
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
// ║  v3.57.0:                                            ║
// ║  - El límite de intentos pasa a PinService: lo       ║
// ║    comparte con los borrados que piden el mismo PIN. ║
// ║  - "¿Olvidaste el PIN?": el código de recuperación   ║
// ║    obliga a poner un PIN nuevo y luego desbloquea.   ║
// ║                                                      ║
// ║  Devuelve 'salir' o undefined.                       ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ConfigService } from '../../../core/services/config.service';
import { BackupService } from '../../../core/services/backup.service';
import { BitacoraService } from '../../../core/services/bitacora.service';
import { LectorRafagaService } from '../../../core/services/lector-rafaga.service';
import { PinService } from '../../../core/services/pin.service';
import { PIN_MAX_DIGITOS, textoUltimoRespaldo } from '../../../core/utils/quiosco.utils';
import { NuevoPinComponent } from '../../../shared/components/pin/nuevo-pin.component';

export type SalidaPinQuiosco = 'salir' | undefined;

type Paso = 'pin' | 'codigo' | 'nuevo' | 'menu';

@Component({
    selector: 'app-quiosco-pin-dialog',
    imports: [FormsModule, MatDialogModule, MatIconModule, NuevoPinComponent],
    template: `
    <div class="pin-dialog">
      @switch (paso()) {
        @case ('pin') {
          <div class="pin-header">
            <mat-icon>lock</mat-icon>
            <h2>Modo quiosco</h2>
          </div>

          @if (pinService.msBloqueo() > 0) {
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
              [maxlength]="PIN_MAX"
              class="pin-input"
              [class.pin-input-error]="error()"
              [(ngModel)]="pin"
              (keydown.enter)="confirmar()"
              (input)="error.set(false); lecturaIgnorada.set(false)"
              placeholder="••••" />

            @if (lecturaIgnorada()) {
              <p class="pin-desc">Se leyó una credencial: no cuenta como intento. Escribe el PIN.</p>
            }
            @if (error()) {
              <p class="pin-error">
                PIN incorrecto.
                @if (pinService.restantes() === 1) { Te queda 1 intento. }
                @else if (pinService.restantes() > 1) { Te quedan {{ pinService.restantes() }} intentos. }
              </p>
            }
            <button class="pin-link" (click)="error.set(false); paso.set('codigo')">¿Olvidaste el PIN?</button>
          }

          <div class="pin-actions">
            <button class="btn-cancel" (click)="dialogRef.close()">Cancelar</button>
            <button class="btn-confirm" (click)="confirmar()" [disabled]="!pin || pinService.msBloqueo() > 0 || verificando()">Continuar</button>
          </div>
        }

        @case ('codigo') {
          <div class="pin-header">
            <mat-icon>lock_reset</mat-icon>
            <h2>Recuperar el PIN</h2>
          </div>
          @if (!pinService.hayCodigo) {
            <p class="pin-aviso">
              <mat-icon>help</mat-icon>
              <span>Este equipo no tiene código de recuperación. Pide ayuda a quien instaló el sistema.</span>
            </p>
          } @else if (pinService.msBloqueo() > 0) {
            <p class="pin-bloqueo">
              <mat-icon>gpp_maybe</mat-icon>
              <span>Demasiados intentos. Espera <strong>{{ textoEspera() }}</strong> para volver a intentar.</span>
            </p>
          } @else {
            <p class="pin-desc">Escribe el código de recuperación que anotaste al poner el PIN (como XXXX-XXXX-XXXX). Después pondrás un PIN nuevo.</p>
            <input type="text" autocomplete="off" maxlength="20" class="pin-input codigo-input"
                   [class.pin-input-error]="error()"
                   [(ngModel)]="codigo" (keydown.enter)="confirmarCodigo()"
                   (input)="error.set(false)" placeholder="XXXX-XXXX-XXXX" />
            @if (error()) {
              <p class="pin-error">
                Código incorrecto.
                @if (pinService.restantes() === 1) { Te queda 1 intento. }
                @else if (pinService.restantes() > 1) { Te quedan {{ pinService.restantes() }} intentos. }
              </p>
            }
          }
          <div class="pin-actions">
            <button class="btn-cancel" (click)="error.set(false); paso.set('pin')">Volver</button>
            <button class="btn-confirm" (click)="confirmarCodigo()"
                    [disabled]="!pinService.hayCodigo || !codigo || pinService.msBloqueo() > 0 || verificando()">Continuar</button>
          </div>
        }

        @case ('nuevo') {
          <div class="pin-header">
            <mat-icon>lock_reset</mat-icon>
            <h2>PIN nuevo</h2>
          </div>
          <app-nuevo-pin (listo)="paso.set('menu')" (cancelar)="dialogRef.close()" />
        }

        @case ('menu') {
          <div class="pin-header">
            <mat-icon>lock_open</mat-icon>
            <h2>¿Qué quieres hacer?</h2>
          </div>

          <button class="opcion" (click)="descargarRespaldo()" [disabled]="descargando()">
            <mat-icon>download</mat-icon>
            <span>
              <strong>Descargar respaldo</strong>
              <small>El equipo sigue en modo quiosco. Último: {{ ultimoRespaldo() }}.</small>
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
      }
    </div>
  `,
    styleUrls: ['../../../shared/components/pin/pin-dialog.scss']
})
export class QuioscoPinDialogComponent implements OnInit, OnDestroy {
  pin = '';
  codigo = '';
  readonly PIN_MAX = PIN_MAX_DIGITOS;
  readonly paso = signal<Paso>('pin');
  readonly error = signal(false);
  readonly descargando = signal(false);
  readonly respaldoListo = signal('');
  readonly respaldoFallo = signal(false);

  readonly dialogRef = inject(MatDialogRef<QuioscoPinDialogComponent, SalidaPinQuiosco>);
  readonly pinService = inject(PinService);
  private readonly configService = inject(ConfigService);
  private readonly backupService = inject(BackupService);
  private readonly bitacora = inject(BitacoraService);
  private readonly lector = inject(LectorRafagaService);
  private dejarDeEscuchar: (() => void) | null = null;
  /** Se pasó una credencial mientras el diálogo estaba abierto (v3.54.0). */
  readonly lecturaIgnorada = signal(false);

  /** Se actualiza solo al descargar: la señal de ConfigService cambia. */
  readonly ultimoRespaldo = computed(() => textoUltimoRespaldo(this.configService.ultimoRespaldoSignal()));

  private reloj: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.pinService.actualizar();
    // Cuenta regresiva visible mientras dure el bloqueo.
    this.reloj = setInterval(() => this.pinService.actualizar(), 1000);

    // v3.54.0: si un alumno pasa su credencial mientras el coordinador escribe
    // el PIN, los dígitos caían en este campo y el Enter contaba como intento
    // fallido (cinco de esos y el PIN se bloqueaba). Se descarta la lectura.
    this.dejarDeEscuchar = this.lector.escuchar(() => {
      this.pin = '';
      this.error.set(false);
      this.lecturaIgnorada.set(true);
    });
  }

  ngOnDestroy(): void {
    this.dejarDeEscuchar?.();
    if (this.reloj) clearInterval(this.reloj);
  }

  textoEspera(): string {
    const s = Math.ceil(this.pinService.msBloqueo() / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /** v3.62.0: comprobar el hash tarda unos cientos de ms; no se envía dos veces. */
  readonly verificando = signal(false);

  async confirmar(): Promise<void> {
    if (!this.pin || this.pinService.msBloqueo() > 0 || this.verificando()) return;
    this.verificando.set(true);
    const r = await this.pinService.verificarPin(this.pin).finally(() => this.verificando.set(false));
    if (r === 'ok') {
      this.paso.set('menu');
      return;
    }
    this.pin = '';
    this.error.set(r === 'fallo');
  }

  async confirmarCodigo(): Promise<void> {
    if (!this.codigo || this.verificando()) return;
    this.verificando.set(true);
    const r = await this.pinService.verificarCodigo(this.codigo).finally(() => this.verificando.set(false));
    if (r === 'ok') {
      this.paso.set('nuevo');
      return;
    }
    this.codigo = '';
    this.error.set(r === 'fallo');
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
}
