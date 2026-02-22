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
      <div 
        *ngFor="let toast of toasts" 
        [class]="'toast toast-' + toast.type"
        [@slideIn]>
        
        <div class="toast-icon">
          <mat-icon>{{ getIcon(toast.type) }}</mat-icon>
        </div>
        
        <div class="toast-content">
          <p class="toast-message">{{ toast.message }}</p>
        </div>
        
        <button class="toast-close" (click)="removeToast(toast.id)">
          <mat-icon>close</mat-icon>
        </button>
      </div>
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
      gap: 12px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background: white;
      animation: slideIn 0.3s ease-out;
      min-width: 300px;
      max-width: 400px;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
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
      border-radius: 50%;
      flex-shrink: 0;
    }

    .toast-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: white;
    }

    .toast-content {
      flex: 1;
    }

    .toast-message {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }

    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .toast-close:hover {
      opacity: 1;
    }

    .toast-close mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #666;
    }

    /* Success */
    .toast-success {
      border-left: 4px solid #4caf50;
    }

    .toast-success .toast-icon {
      background: #4caf50;
    }

    /* Error */
    .toast-error {
      border-left: 4px solid #f44336;
    }

    .toast-error .toast-icon {
      background: #f44336;
    }

    /* Warning */
    .toast-warning {
      border-left: 4px solid #ff9800;
    }

    .toast-warning .toast-icon {
      background: #ff9800;
    }

    /* Info */
    .toast-info {
      border-left: 4px solid #2196f3;
    }

    .toast-info .toast-icon {
      background: #2196f3;
    }

    /* Responsive */
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
  `]
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

    // Auto-remover después de la duración especificada
    const timer = setTimeout(() => {
      this.removeToast(toast.id);
    }, toast.duration);

    this.timers.set(toast.id, timer);
  }

  removeToast(id: string): void {
    // Limpiar timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    // Remover toast
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  getIcon(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  }
}