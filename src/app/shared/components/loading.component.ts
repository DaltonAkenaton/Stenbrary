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
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="loading-overlay" *ngIf="isLoading">
      <div class="loading-content">
        <mat-spinner diameter="52"></mat-spinner>
        <p class="loading-text">{{ message }}</p>
      </div>
    </div>
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
  private subscription?: Subscription;

  constructor(private loadingService: LoadingService) {}

  ngOnInit(): void {
    this.subscription = this.loadingService.loading$.subscribe(state => {
      this.isLoading = state.isLoading;
      this.message = state.message;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}