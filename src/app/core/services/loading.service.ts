import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Avance de una operación larga, para pintar barra determinada. */
export interface LoadingProgreso {
  actual: number;
  total: number;
  /** Línea secundaria, p. ej. "No cierres esta ventana". */
  detalle?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
  /** Ausente = spinner indeterminado (operación de duración desconocida). */
  progreso?: LoadingProgreso;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<LoadingState>({
    isLoading: false,
    message: 'Cargando...'
  });

  public loading$ = this.loadingSubject.asObservable();

  /**
   * Mostrar indicador de carga
   */
  show(message = 'Cargando...'): void {
    this.loadingSubject.next({
      isLoading: true,
      message
    });
  }

  /**
   * Actualiza el avance de una operación larga (barra determinada).
   *
   * Un spinner indeterminado durante 40 segundos es indistinguible de una
   * app colgada: el usuario cierra la pestaña a media escritura. Con conteo
   * visible sabe que hay avance y cuánto falta.
   *
   * Llamar tan seguido como haga falta: `BehaviorSubject` solo empuja el
   * estado nuevo, no reconstruye el overlay.
   */
  progress(actual: number, total: number, message: string, detalle?: string): void {
    this.loadingSubject.next({
      isLoading: true,
      message,
      progreso: { actual, total, detalle },
    });
  }

  /**
   * Ocultar indicador de carga
   */
  hide(): void {
    this.loadingSubject.next({
      isLoading: false,
      message: 'Cargando...',
      progreso: undefined,
    });
  }
}