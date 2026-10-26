// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/configuracion/               ║
// ║        restablecer-dialog.component.ts               ║
// ║  Stenbrary — Confirmación de borrado total           ║
// ║                                                      ║
// ║  Tres barreras, cada una para un modo de fallo real: ║
// ║                                                      ║
// ║  1. Respaldo obligatorio — quien pulsa esto suele    ║
// ║     estar seguro de que no lo necesita, y es quien   ║
// ║     más lo va a necesitar.                           ║
// ║  2. Escribir una frase — un clic se da por reflejo o ║
// ║     por accidente; escribir "BORRAR TODO" no.        ║
// ║  3. Decir en números qué se pierde — "3186 visitas"  ║
// ║     pesa mucho más que "todos los datos".            ║
// ╚══════════════════════════════════════════════════════╝

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { RestablecerService, FRASE_CONFIRMACION } from '../../core/services/restablecer.service';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { mensajeParaUsuario } from '../../core/utils/mensaje-error.utils';

@Component({
    selector: 'app-restablecer-dialog',
    imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
    template: `
    <div class="rd">
      <div class="rd-head">
        <mat-icon>warning</mat-icon>
        <h2>Restablecer el sistema</h2>
      </div>

      <p class="rd-intro">
        Esto deja Stenbrary como recién instalado.
        <strong>No se puede deshacer.</strong>
      </p>

      <!-- Qué se pierde, en números concretos -->
      <div class="rd-perdida">
        <div class="rd-dato">
          <span class="rd-num">{{ alumnos() }}</span>
          <span class="rd-lbl">alumnos</span>
        </div>
        <div class="rd-dato">
          <span class="rd-num">{{ registros() }}</span>
          <span class="rd-lbl">visitas registradas</span>
        </div>
      </div>
      <p class="rd-nota">
        También se borran los motivos personalizados, toda la configuración
        (incluido el PIN del quiosco) y el historial de incidencias.
      </p>

      <!-- Paso 1: respaldo -->
      <div class="rd-paso" [class.hecho]="respaldoHecho()">
        <mat-icon>{{ respaldoHecho() ? 'check_circle' : 'looks_one' }}</mat-icon>
        <div class="rd-paso-cuerpo">
          <strong>Descarga un respaldo primero</strong>
          <p>Es obligatorio. Con ese archivo puedes recuperar todo después.</p>
          <button class="rd-btn secundario" (click)="descargarRespaldo()"
                  [disabled]="descargando()">
            <mat-icon>download</mat-icon>
            {{ respaldoHecho() ? 'Descargar otra vez' : 'Descargar respaldo' }}
          </button>
        </div>
      </div>

      <!-- Paso 2: frase -->
      <div class="rd-paso" [class.hecho]="fraseOk()" [class.inactivo]="!respaldoHecho()">
        <mat-icon>{{ fraseOk() ? 'check_circle' : 'looks_two' }}</mat-icon>
        <div class="rd-paso-cuerpo">
          <strong>Escribe <code>{{ frase }}</code> para confirmar</strong>
          <input class="rd-input" type="text" [(ngModel)]="texto"
                 [disabled]="!respaldoHecho()"
                 placeholder="Escribe aquí" autocomplete="off" spellcheck="false">
        </div>
      </div>

      <div class="rd-nav">
        <button class="rd-btn secundario" (click)="cancelar()">Cancelar</button>
        <button class="rd-btn peligro" (click)="confirmar()"
                [disabled]="!puedeBorrar() || borrando()">
          <mat-icon>delete_forever</mat-icon>
          {{ borrando() ? 'Borrando…' : 'Borrar todo y empezar de cero' }}
        </button>
      </div>
    </div>
  `,
    styles: [`
    .rd {
      display: flex; flex-direction: column; gap: 14px;
      padding: 4px; font-family: 'DM Sans', sans-serif;
      color: rgba(200, 230, 240, 0.68);
    }
    .rd-head { display: flex; align-items: center; gap: 10px; }
    .rd-head mat-icon { color: #F05252; }
    .rd-head h2 {
      margin: 0; font-family: 'Space Grotesk', sans-serif;
      font-size: 19px; font-weight: 700; color: #E8F4F8;
    }
    .rd-intro { margin: 0; font-size: 14px; line-height: 1.6; }
    .rd-intro strong { color: #FC8181; }

    .rd-perdida {
      display: flex; gap: 12px;
      padding: 12px; border-radius: 12px;
      background: rgba(240, 82, 82, 0.06);
      border: 1px solid rgba(240, 82, 82, 0.20);
    }
    .rd-dato { flex: 1; display: flex; flex-direction: column; align-items: center; }
    .rd-num {
      font-family: 'Space Mono', monospace; font-size: 22px;
      font-weight: 700; color: #FC8181;
    }
    .rd-lbl { font-size: 11px; color: rgba(160, 200, 215, 0.52); }
    .rd-nota { margin: 0; font-size: 12px; line-height: 1.5; color: rgba(160, 200, 215, 0.52); }

    .rd-paso {
      display: flex; gap: 10px; padding: 12px;
      border: 1px solid rgba(0, 200, 215, 0.10);
      border-radius: 12px;
      transition: opacity 150ms, border-color 150ms;
    }
    .rd-paso.inactivo { opacity: 0.45; }
    .rd-paso.hecho { border-color: rgba(14, 176, 123, 0.35); }
    .rd-paso > mat-icon { color: rgba(160, 200, 215, 0.52); flex-shrink: 0; }
    .rd-paso.hecho > mat-icon { color: #0EB07B; }
    .rd-paso-cuerpo { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
    .rd-paso-cuerpo strong { font-size: 13px; color: #E8F4F8; font-weight: 600; }
    .rd-paso-cuerpo p { margin: 0; font-size: 12px; line-height: 1.5; }
    .rd-paso-cuerpo code {
      font-family: 'Space Mono', monospace; color: #22D4E1;
      background: rgba(0, 200, 215, 0.08); padding: 1px 6px; border-radius: 4px;
    }

    .rd-input {
      width: 100%; padding: 10px 12px;
      background: #080E1A; border: 1px solid rgba(0, 200, 215, 0.10);
      border-radius: 8px; color: #E8F4F8;
      font-family: 'Space Mono', monospace; font-size: 14px;
    }
    .rd-input:focus { outline: none; border-color: rgba(0, 200, 215, 0.32); }
    .rd-input:disabled { opacity: 0.5; cursor: not-allowed; }

    .rd-nav { display: flex; gap: 8px; margin-top: 4px; }
    .rd-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 11px 16px; border-radius: 10px;
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: all 150ms; border: 1px solid transparent;
    }
    .rd-btn mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .rd-btn.secundario {
      background: transparent; border-color: rgba(0, 200, 215, 0.10);
      color: rgba(200, 230, 240, 0.68);
    }
    .rd-btn.secundario:hover:not(:disabled) { color: #E8F4F8; border-color: rgba(0, 200, 215, 0.32); }
    .rd-btn.peligro { flex: 1; background: #F05252; color: #04090F; }
    .rd-btn.peligro:hover:not(:disabled) { filter: brightness(1.08); }
    .rd-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class RestablecerDialogComponent {
  private readonly ref = inject(MatDialogRef<RestablecerDialogComponent>);
  private readonly servicio = inject(RestablecerService);
  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);

  protected readonly frase = FRASE_CONFIRMACION;
  protected texto = '';

  protected readonly alumnos = signal(0);
  protected readonly registros = signal(0);
  protected readonly respaldoHecho = signal(false);
  protected readonly descargando = signal(false);
  protected readonly borrando = signal(false);

  constructor() {
    void this.cargarConteos();
  }

  private async cargarConteos(): Promise<void> {
    try {
      const c = await this.db.obtenerConteoTotal();
      this.alumnos.set(c.alumnos ?? 0);
      this.registros.set(c.registros ?? 0);
    } catch {
      // Si no se pueden leer, se muestran ceros. No bloquea el flujo, pero
      // tampoco inventa cifras.
    }
  }

  protected fraseOk(): boolean {
    return this.texto.trim().toUpperCase() === this.frase;
  }

  /** Las dos barreras son acumulativas: sin respaldo, la frase no basta. */
  protected puedeBorrar(): boolean {
    return this.respaldoHecho() && this.fraseOk();
  }

  protected async descargarRespaldo(): Promise<void> {
    this.descargando.set(true);
    try {
      const ok = await this.servicio.descargarRespaldoPrevio();
      this.respaldoHecho.set(ok);
      if (ok) this.toast.success('Respaldo descargado. Guárdalo en un lugar seguro.');
      else this.toast.error('No se pudo generar el respaldo. No continúes sin él.');
    } catch (err) {
      this.toast.error(mensajeParaUsuario(err, 'configuracion', 'No se pudo generar el respaldo.'));
    } finally {
      this.descargando.set(false);
    }
  }

  protected async confirmar(): Promise<void> {
    if (!this.puedeBorrar() || this.borrando()) return;
    this.borrando.set(true);
    try {
      const r = await this.servicio.restablecer();
      this.ref.close(r);
    } catch (err) {
      this.toast.error(mensajeParaUsuario(err, 'configuracion', 'No se pudo restablecer el sistema.'));
      this.borrando.set(false);
    }
  }

  protected cancelar(): void {
    this.ref.close(null);
  }
}
