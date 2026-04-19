// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/shared/components/toast-container/    ║
// ║        toast-container.component.ts                  ║
// ║  Stenbrary v3.12.1 — Control-flow moderno            ║
// ║                                                      ║
// ║  Migración *ngIf/*ngFor → @if/@for (convención).     ║
// ║  Toast dark theme + acciones (undo) + auto-close.    ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts; track toast.id) {
        <div [class]="'toast toast-' + toast.type">
          <div class="toast-icon">
            <mat-icon>{{ getIcon(toast.type) }}</mat-icon>
          </div>

          <div class="toast-content">
            <p class="toast-message">{{ toast.message }}</p>
          </div>

          @if (toast.action) {
            <button class="toast-action" (click)="runAction(toast)">
              @if (toast.action.icon) {
                <mat-icon>{{ toast.action.icon }}</mat-icon>
              }
              {{ toast.action.label }}
            </button>
          }

          <button class="toast-close" (click)="removeToast(toast.id)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      background: #0f1a28;
      border: 1px solid rgba(200, 230, 240, 0.06);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35),
                  0 0 0 1px rgba(0, 0, 0, 0.1);
      animation: slideIn 300ms ease-out;
      min-width: 300px;
      max-width: 400px;
    }

    @keyframes slideIn {
      from {
        transform: translateX(120px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      flex-shrink: 0;
    }

    .toast-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .toast-content {
      flex: 1;
    }

    .toast-message {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.45;
      color: #E8F4F8;
      font-family: 'DM Sans', sans-serif;
    }

    .toast-action {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: rgba(0, 200, 215, 0.12);
      border: 1px solid rgba(0, 200, 215, 0.3);
      border-radius: 8px;
      color: #00C8D7;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms;
      flex-shrink: 0;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
      &:hover { background: rgba(0, 200, 215, 0.2); }
    }

    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.35;
      transition: opacity 200ms;
      flex-shrink: 0;
    }

    .toast-close:hover { opacity: 0.8; }

    .toast-close mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(200, 230, 240, 0.6);
    }

    /* ── Success ── */
    .toast-success {
      border-left: 3px solid #0BC4B7;
    }
    .toast-success .toast-icon {
      background: rgba(11, 196, 183, 0.12);
      mat-icon { color: #0BC4B7; }
    }

    /* ── Error ── */
    .toast-error {
      border-left: 3px solid #F05252;
    }
    .toast-error .toast-icon {
      background: rgba(240, 82, 82, 0.12);
      mat-icon { color: #F05252; }
    }

    /* ── Warning ── */
    .toast-warning {
      border-left: 3px solid #F5A623;
    }
    .toast-warning .toast-icon {
      background: rgba(245, 166, 35, 0.12);
      mat-icon { color: #F5A623; }
    }

    /* ── Info ── */
    .toast-info {
      border-left: 3px solid #3B82F6;
    }
    .toast-info .toast-icon {
      background: rgba(59, 130, 246, 0.12);
      mat-icon { color: #3B82F6; }
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .toast-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }

      .toast {
        min-width: auto;
        max-width: none;
      }
    }
  `],
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription?: Subscription;
  private timers = new Map<string, any>();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(toast => {
      this.addToast(toast);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.timers.forEach(timer => clearTimeout(timer));
  }

  addToast(toast: Toast): void {
    this.toasts.push(toast);

    const timer = setTimeout(() => {
      this.removeToast(toast.id);
    }, toast.duration);

    this.timers.set(toast.id, timer);
  }

  removeToast(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  runAction(toast: Toast): void {
    try {
      toast.action?.handler();
    } finally {
      this.removeToast(toast.id);
    }
  }

  getIcon(type: Toast['type']): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}