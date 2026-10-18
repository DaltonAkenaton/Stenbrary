// ╔══════════════════════════════════════════════════════╗
// ║  salida-visitante-dialog.component.ts                ║
// ║  Stenbrary v3.11.0 — Salida autónoma de visitante    ║
// ║                                                      ║
// ║  Lista los visitantes (matricula='INVITADO') con     ║
// ║  entrada abierta hoy y permite marcarles salida sin  ║
// ║  necesidad de credencial. Útil sobre todo en modo    ║
// ║  quiosco, donde /presencia está oculta.              ║
// ╚══════════════════════════════════════════════════════╝

import { Component, Inject, signal, computed, inject } from '@angular/core';
import { LectorRafagaService } from '../../../core/services/lector-rafaga.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Registro } from '../../../core/models';

export interface SalidaVisitanteData {
  visitantes: Registro[];
}

export interface SalidaVisitanteResultado {
  registroId: string;
  nombre: string;
}

@Component({
  selector: 'app-salida-visitante-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dlg-root">
      <div class="dlg-header">
        <mat-icon>logout</mat-icon>
        <div>
          <h2>Salida de visitante</h2>
          <p>Toca tu nombre para registrar tu salida</p>
        </div>
      </div>

      <div class="dlg-search">
        <mat-icon>search</mat-icon>
        <input type="text"
               [(ngModel)]="filtro"
               (ngModelChange)="filtroSignal.set($event)"
               placeholder="Buscar por nombre…"
               autocomplete="off"
               spellcheck="false" />
      </div>

      @if (lecturaIgnorada()) {
        <p class="dlg-aviso">
          Se pasó una credencial: los alumnos marcan su salida pasándola en el
          escáner. Cierra esta lista y vuelve a pasarla.
        </p>
      }

      <div class="dlg-list" role="list">
        @if (filtrados().length === 0) {
          <div class="dlg-empty">
            <mat-icon>person_off</mat-icon>
            <p>No hay visitantes coincidentes</p>
          </div>
        } @else {
          @for (v of filtrados(); track v.id) {
            <button class="dlg-item" role="listitem" (click)="seleccionar(v)">
              <div class="dlg-item-avatar">
                <mat-icon>person</mat-icon>
              </div>
              <div class="dlg-item-body">
                <span class="dlg-item-name">{{ v.nombreCompleto || 'Visitante' }}</span>
                <span class="dlg-item-meta">
                  Entró {{ formatearHora(v.fechaHora) }} · {{ tiempoTranscurrido(v.fechaHora) }}
                </span>
              </div>
              <mat-icon class="dlg-item-arrow">logout</mat-icon>
            </button>
          }
        }
      </div>

      <div class="dlg-actions">
        <button mat-button (click)="cancelar()">Cancelar</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dlg-root {
      display: flex; flex-direction: column;
      max-height: 78vh;
      background: #0F1A2E;
      color: #E5EDF7;
      font-family: 'DM Sans', sans-serif;
    }
    .dlg-header {
      display: flex; align-items: center; gap: 14px;
      padding: 20px 22px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .dlg-header mat-icon {
      font-size: 32px; width: 32px; height: 32px;
      color: #00C8D7;
    }
    .dlg-header h2 {
      margin: 0; font-size: 18px; font-weight: 700;
      font-family: 'Space Grotesk', sans-serif;
    }
    .dlg-header p {
      margin: 2px 0 0; font-size: 13px; color: #93A5BE;
    }

    .dlg-search {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 22px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .dlg-search mat-icon { color: #6B7E96; }
    .dlg-search input {
      flex: 1; background: transparent; border: none; outline: none;
      color: #E5EDF7; font-size: 14px; font-family: inherit;
    }
    .dlg-search input::placeholder { color: #6B7E96; }

    .dlg-aviso { margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: #F5A623; font-weight: 600; }
    .dlg-list {
      flex: 1; min-height: 120px;
      overflow-y: auto;
      padding: 8px;
    }
    .dlg-item {
      width: 100%;
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      color: inherit;
      cursor: pointer;
      margin-bottom: 8px;
      text-align: left;
      transition: background .15s, border-color .15s;
      font-family: inherit;
    }
    .dlg-item:hover {
      background: rgba(0,200,215,0.08);
      border-color: rgba(0,200,215,0.35);
    }
    .dlg-item-avatar {
      width: 38px; height: 38px;
      border-radius: 50%;
      display: grid; place-items: center;
      background: rgba(255,255,255,0.06);
    }
    .dlg-item-avatar mat-icon { color: #93A5BE; }
    .dlg-item-body {
      flex: 1;
      display: flex; flex-direction: column; gap: 2px;
    }
    .dlg-item-name { font-weight: 600; font-size: 15px; }
    .dlg-item-meta { font-size: 12px; color: #93A5BE; }
    .dlg-item-arrow { color: #00C8D7; }

    .dlg-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 12px;
      color: #6B7E96;
    }
    .dlg-empty mat-icon { font-size: 36px; width: 36px; height: 36px; }
    .dlg-empty p { margin: 0; font-size: 14px; }

    .dlg-actions {
      padding: 12px 18px;
      display: flex; justify-content: flex-end;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
  `],
})
export class SalidaVisitanteDialogComponent {
  filtro = '';
  filtroSignal = signal('');

  filtrados = computed(() => {
    const term = this.filtroSignal().trim().toLowerCase();
    if (!term) return this.data.visitantes;
    return this.data.visitantes.filter(v =>
      (v.nombreCompleto || '').toLowerCase().includes(term)
    );
  });

  constructor(
    public dialogRef: MatDialogRef<SalidaVisitanteDialogComponent, SalidaVisitanteResultado | null>,
    @Inject(MAT_DIALOG_DATA) public data: SalidaVisitanteData,
  ) {
    // v3.57.2: la credencial de un alumno escribía sus dígitos en la
    // búsqueda (y la lista quedaba vacía). Se borran; esta lista es solo
    // para visitantes, el alumno marca su salida desde el escáner.
    const dejarDeEscuchar = inject(LectorRafagaService).escuchar(leida => {
      this.filtro = this.filtro.replace(new RegExp('[aA]?' + leida), '').trim();
      this.filtroSignal.set(this.filtro);
      this.lecturaIgnorada.set(true);
    });
    dialogRef.afterClosed().subscribe(() => dejarDeEscuchar());
  }

  readonly lecturaIgnorada = signal(false);

  seleccionar(v: Registro): void {
    this.dialogRef.close({
      registroId: v.id,
      nombre: v.nombreCompleto || 'Visitante',
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  formatearHora(fecha: Date | string): string {
    const d = new Date(fecha);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  tiempoTranscurrido(fecha: Date | string): string {
    const d = new Date(fecha);
    const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
    if (min < 1) return 'recién llegó';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `hace ${h}h ${m}m` : `hace ${h}h`;
  }
}
