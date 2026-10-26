// ╔══════════════════════════════════════════════════════╗
// ║  pin-coordinador-dialog.component.ts                 ║
// ║  Stenbrary v3.57.0 — Confirmar con el PIN            ║
// ║                                                      ║
// ║  Lo piden las acciones que no se deshacen (eliminar   ║
// ║  registros por fechas, reemplazar con un respaldo,    ║
// ║  restablecer, herramientas de prueba) y cambiar el    ║
// ║  propio PIN. Mismo PIN y mismo límite de intentos     ║
// ║  que el quiosco (PinService).                         ║
// ║                                                      ║
// ║  Pasos: pin → (olvidé) código → PIN nuevo. Con        ║
// ║  `cambiarPin`/`soloCodigo`, tras el PIN sigue el      ║
// ║  paso nuevo en vez de cerrar.                         ║
// ║                                                      ║
// ║  Devuelve true si se autorizó.                        ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PinService } from '../../../core/services/pin.service';
import { BackupService } from '../../../core/services/backup.service';
import { LectorRafagaService } from '../../../core/services/lector-rafaga.service';
import { PIN_MAX_DIGITOS } from '../../../core/utils/quiosco.utils';
import { NuevoPinComponent } from './nuevo-pin.component';

export interface PinCoordinadorData {
  titulo: string;
  mensaje?: string;
  /** Texto del botón; por defecto "Continuar". */
  textoConfirmar?: string;
  icono?: string;
  /** Botón rojo: la acción borra algo. */
  peligro?: boolean;
  /** Ofrecer "Descargar respaldo" antes de confirmar. */
  ofrecerRespaldo?: boolean;
  /** Tras el PIN, pedir uno nuevo (Cambiar PIN). */
  cambiarPin?: boolean;
  /** Tras el PIN, generar un código de recuperación nuevo. */
  soloCodigo?: boolean;
}

type Paso = 'pin' | 'codigo' | 'nuevo';

@Component({
    selector: 'app-pin-coordinador-dialog',
    imports: [FormsModule, MatDialogModule, MatIconModule, NuevoPinComponent],
    template: `
    <div class="pin-dialog">
      <div class="pin-header">
        <mat-icon>{{ paso() === 'pin' ? (data.icono || 'lock') : 'lock_reset' }}</mat-icon>
        <h2>{{ paso() === 'pin' ? data.titulo : paso() === 'codigo' ? 'Recuperar el PIN' : (data.soloCodigo ? 'Código de recuperación' : 'PIN nuevo') }}</h2>
      </div>

      @switch (paso()) {
        @case ('pin') {
          @if (data.mensaje) {
            <p class="pin-desc">{{ data.mensaje }}</p>
          }

          @if (data.ofrecerRespaldo) {
            <button class="opcion" (click)="descargarRespaldo()" [disabled]="descargando()">
              <mat-icon>download</mat-icon>
              <span>
                <strong>Descargar respaldo antes</strong>
                <small>Si te equivocas, con él recuperas todo.</small>
              </span>
            </button>
            @if (respaldoListo()) {
              <p class="pin-ok"><mat-icon>check_circle</mat-icon> {{ respaldoListo() }}</p>
            }
            @if (respaldoFallo()) {
              <p class="pin-error">No se pudo descargar el respaldo. Intenta de nuevo.</p>
            }
            <div style="height: 16px;"></div>
          }

          @if (!pinService.hayPin) {
            <p class="pin-aviso">
              <mat-icon>warning</mat-icon>
              <span>Este equipo no tiene PIN: cualquiera puede hacer esto. Ponlo en Configuración → Quiosco.</span>
            </p>
          } @else if (pinService.msBloqueo() > 0) {
            <p class="pin-bloqueo">
              <mat-icon>gpp_maybe</mat-icon>
              <span>Demasiados intentos. Espera <strong>{{ textoEspera() }}</strong> para volver a intentar.</span>
            </p>
          } @else {
            @if (pinRepuesto()) {
              <p class="pin-ok"><mat-icon>check_circle</mat-icon> PIN nuevo guardado. Escríbelo para continuar.</p>
            }
            <p class="pin-desc" style="margin-bottom: 10px;">Confirma con el PIN del coordinador (el mismo del modo quiosco).</p>
            <input type="password" inputmode="numeric" autocomplete="off" [maxlength]="PIN_MAX"
                   class="pin-input" [class.pin-input-error]="error()"
                   [(ngModel)]="pin" (keydown.enter)="confirmarPin()"
                   (input)="error.set(false); lecturaIgnorada.set(false)" placeholder="••••" />
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
            <button class="pin-link" (click)="irACodigo()">¿Olvidaste el PIN?</button>
          }

          <div class="pin-actions">
            <button class="btn-cancel" (click)="ref.close(false)">Cancelar</button>
            <button class="btn-confirm pin-confirmar" [class.btn-peligro]="data.peligro"
                    (click)="confirmarPin()"
                    [disabled]="pinService.hayPin && (!pin || pinService.msBloqueo() > 0)">
              {{ data.textoConfirmar || 'Continuar' }}
            </button>
          </div>
        }

        @case ('codigo') {
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
            <button class="btn-cancel" (click)="paso.set('pin'); error.set(false)">Volver</button>
            <button class="btn-confirm" (click)="confirmarCodigo()"
                    [disabled]="!pinService.hayCodigo || !codigo || pinService.msBloqueo() > 0">Continuar</button>
          </div>
        }

        @case ('nuevo') {
          <app-nuevo-pin [soloCodigo]="!!data.soloCodigo && !porRecuperacion"
                         (listo)="alTerminarNuevo()" (cancelar)="ref.close(false)" />
        }
      }
    </div>
  `,
    styleUrls: ['./pin-dialog.scss']
})
export class PinCoordinadorDialogComponent implements OnInit, OnDestroy {
  readonly data = inject<PinCoordinadorData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<PinCoordinadorDialogComponent, boolean>);
  readonly pinService = inject(PinService);
  private readonly backup = inject(BackupService);
  private readonly lector = inject(LectorRafagaService);
  readonly PIN_MAX = PIN_MAX_DIGITOS;

  readonly paso = signal<Paso>('pin');
  readonly error = signal(false);
  readonly lecturaIgnorada = signal(false);
  readonly descargando = signal(false);
  readonly respaldoListo = signal('');
  readonly respaldoFallo = signal(false);
  readonly pinRepuesto = signal(false);
  pin = '';
  codigo = '';
  /** Entró con el código: el paso nuevo siempre pide PIN, aunque fuera `soloCodigo`. */
  porRecuperacion = false;

  private reloj: ReturnType<typeof setInterval> | null = null;
  private dejarDeEscuchar: (() => void) | null = null;

  ngOnInit(): void {
    this.pinService.actualizar();
    this.reloj = setInterval(() => this.pinService.actualizar(), 1000);
    // Una credencial leída con el diálogo abierto no es un intento (v3.54.0).
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

  confirmarPin(): void {
    if (this.pinService.hayPin) {
      if (!this.pin) return;
      const r = this.pinService.verificarPin(this.pin);
      if (r !== 'ok') {
        this.pin = '';
        this.error.set(r === 'fallo');
        return;
      }
    }
    if (this.data.cambiarPin || this.data.soloCodigo) {
      this.paso.set('nuevo');
    } else {
      this.ref.close(true);
    }
  }

  irACodigo(): void {
    this.error.set(false);
    this.paso.set('codigo');
  }

  confirmarCodigo(): void {
    if (!this.codigo) return;
    const r = this.pinService.verificarCodigo(this.codigo);
    if (r !== 'ok') {
      this.codigo = '';
      this.error.set(r === 'fallo');
      return;
    }
    this.porRecuperacion = true;
    this.paso.set('nuevo');
  }

  /**
   * Cambiar PIN o código: terminó. Una acción que borra, no: se vuelve a pedir
   * el PIN recién puesto, para que "Ya lo anoté" no dispare el borrado sin
   * volver a ver qué se iba a hacer.
   */
  alTerminarNuevo(): void {
    if (this.data.cambiarPin || this.data.soloCodigo) {
      this.ref.close(true);
      return;
    }
    this.pin = '';
    this.error.set(false);
    this.pinRepuesto.set(true);
    this.paso.set('pin');
  }

  async descargarRespaldo(): Promise<void> {
    this.descargando.set(true);
    this.respaldoFallo.set(false);
    try {
      const { nombreArchivo } = await this.backup.descargarBackup();
      this.respaldoListo.set(`Descargado: ${nombreArchivo}`);
    } catch {
      this.respaldoListo.set('');
      this.respaldoFallo.set(true);
    } finally {
      this.descargando.set(false);
    }
  }
}
