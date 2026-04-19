import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastAction {
  label: string;
  handler: () => void;
  icon?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
  action?: ToastAction;
}

export interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toasts$ = this.toastSubject.asObservable();

  /**
   * Mostrar notificación de éxito
   */
  success(message: string, durationOrOpts: number | ToastOptions = 3000): void {
    this.show('success', message, durationOrOpts, 3000);
  }

  /**
   * Mostrar notificación de error
   */
  error(message: string, durationOrOpts: number | ToastOptions = 4000): void {
    this.show('error', message, durationOrOpts, 4000);
  }

  /**
   * Mostrar notificación de advertencia
   */
  warning(message: string, durationOrOpts: number | ToastOptions = 3500): void {
    this.show('warning', message, durationOrOpts, 3500);
  }

  /**
   * Mostrar notificación de información
   */
  info(message: string, durationOrOpts: number | ToastOptions = 3000): void {
    this.show('info', message, durationOrOpts, 3000);
  }

  /**
   * Mostrar notificación genérica
   */
  private show(
    type: Toast['type'],
    message: string,
    durationOrOpts: number | ToastOptions,
    defaultDuration: number,
  ): void {
    let duration = defaultDuration;
    let action: ToastAction | undefined;
    if (typeof durationOrOpts === 'number') {
      duration = durationOrOpts;
    } else if (durationOrOpts) {
      duration = durationOrOpts.duration ?? defaultDuration;
      action = durationOrOpts.action;
    }

    const toast: Toast = {
      id: this.generateId(),
      type,
      message,
      duration,
      action,
    };

    this.toastSubject.next(toast);
  }

  /**
   * Generar ID único para cada toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}