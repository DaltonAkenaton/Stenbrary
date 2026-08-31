// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/shared/components/loading/            ║
// ║        loading.component.ts                          ║
// ║  Stenbrary v3.6 — Dark theme fix                     ║
// ║                                                      ║
// ║  FIX: Fondo blanco → dark theme consistente          ║
// ║  - Overlay oscuro con blur                           ║
// ║  - Card oscura con borde cyan                        ║
// ║  - Spinner cyan en vez de morado                     ║
// ║  - Texto claro                                       ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { LoadingService, LoadingProgreso } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if (isLoading) {
      <div class="loading-overlay">
        <div class="loading-content" [class.con-progreso]="progreso">
          @if (progreso) {
            <!-- Barra determinada: el usuario ve que avanza y cuánto falta. -->
            <div class="prog-cabecera">
              <span class="prog-msg">{{ message }}</span>
              <span class="prog-cuenta">{{ progreso.actual }} / {{ progreso.total }}</span>
            </div>
            <div class="prog-riel">
              <span class="prog-barra" [style.width.%]="porcentaje"></span>
            </div>
            <p class="prog-detalle">
              {{ progreso.detalle || 'No cierres esta ventana hasta que termine.' }}
            </p>
          } @else {
            <mat-spinner diameter="52"></mat-spinner>
            <p class="loading-text">{{ message }}</p>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(4, 9, 15, 0.70);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      backdrop-filter: blur(4px);
      animation: fadeIn 200ms ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      padding: 36px 48px;
      background: #101c2c;
      border: 1px solid rgba(0, 200, 215, 0.15);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                  0 0 0 1px rgba(0, 200, 215, 0.05);
    }

    .loading-text {
      margin: 0;
      font-size: 0.92rem;
      color: rgba(200, 230, 240, 0.7);
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
    }

    .loading-content.con-progreso {
      align-items: stretch;
      gap: 12px;
      min-width: 320px;
      max-width: min(440px, 88vw);
    }

    .prog-cabecera {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
    }

    .prog-msg {
      font-size: 0.92rem;
      font-weight: 600;
      color: #E8F4F8;
      font-family: 'DM Sans', sans-serif;
    }

    .prog-cuenta {
      font-family: 'Space Mono', monospace;
      font-size: 0.82rem;
      color: #22D4E1;
      white-space: nowrap;
    }

    .prog-riel {
      height: 6px;
      border-radius: 999px;
      background: rgba(0, 200, 215, 0.12);
      overflow: hidden;
    }

    .prog-barra {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #00C8D7, #0BC4B7);
      transition: width 180ms ease-out;
    }

    .prog-detalle {
      margin: 0;
      font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.55);
      font-family: 'DM Sans', sans-serif;
    }

    ::ng-deep .loading-content .mat-mdc-progress-spinner circle,
    ::ng-deep .loading-content .mdc-circular-progress__determinate-circle,
    ::ng-deep .loading-content .mdc-circular-progress__indeterminate-circle-graphic {
      stroke: #00C8D7 !important;
    }
  `],
})
export class LoadingComponent implements OnInit, OnDestroy {
  isLoading = false;
  message = 'Cargando...';
  progreso?: LoadingProgreso;
  private subscription?: Subscription;

  /** Acotado a 0–100: un total mal calculado no debe desbordar la barra. */
  get porcentaje(): number {
    if (!this.progreso || this.progreso.total <= 0) return 0;
    const p = (this.progreso.actual / this.progreso.total) * 100;
    return Math.max(0, Math.min(100, p));
  }

  constructor(private loadingService: LoadingService) {}

  ngOnInit(): void {
    this.subscription = this.loadingService.loading$.subscribe(state => {
      this.isLoading = state.isLoading;
      this.message = state.message;
      this.progreso = state.progreso;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}