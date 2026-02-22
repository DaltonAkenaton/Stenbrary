import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LoadingState {
  isLoading: boolean;
  message: string;
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
  show(message: string = 'Cargando...'): void {
    this.loadingSubject.next({
      isLoading: true,
      message
    });
  }

  /**
   * Ocultar indicador de carga
   */
  hide(): void {
    this.loadingSubject.next({
      isLoading: false,
      message: 'Cargando...'
    });
  }
}