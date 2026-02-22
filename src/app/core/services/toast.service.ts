import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
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
  success(message: string, duration: number = 3000): void {
    this.show('success', message, duration);
  }

  /**
   * Mostrar notificación de error
   */
  error(message: string, duration: number = 4000): void {
    this.show('error', message, duration);
  }

  /**
   * Mostrar notificación de advertencia
   */
  warning(message: string, duration: number = 3500): void {
    this.show('warning', message, duration);
  }

  /**
   * Mostrar notificación de información
   */
  info(message: string, duration: number = 3000): void {
    this.show('info', message, duration);
  }

  /**
   * Mostrar notificación genérica
   */
  private show(type: Toast['type'], message: string, duration: number): void {
    const toast: Toast = {
      id: this.generateId(),
      type,
      message,
      duration
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