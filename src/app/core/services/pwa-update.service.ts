// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/pwa-update.service.ts   ║
// ║  Stenbrary v3.6 — Notificación de actualización PWA  ║
// ║                                                      ║
// ║  Detecta cuando hay una nueva versión desplegada en   ║
// ║  Netlify y muestra un banner para que el usuario      ║
// ║  actualice. Usa SwUpdate de @angular/service-worker.  ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, filter, first, interval, concat } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {

  /** true cuando hay una versión nueva lista para instalar */
  private hayActualizacion$ = new BehaviorSubject<boolean>(false);
  public actualizacionDisponible$ = this.hayActualizacion$.asObservable();

  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef,
  ) {}

  /**
   * Inicializar el listener de actualizaciones.
   * Llamar una vez desde AppComponent.ngOnInit().
   */
  iniciar(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('⚙️ Service Worker no habilitado (modo desarrollo)');
      return;
    }

    // Escuchar cuando hay una versión nueva lista
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(evt => {
        console.log('🆕 Nueva versión disponible:', evt.latestVersion.hash);
        this.hayActualizacion$.next(true);
      });

    // Revisar periódicamente (cada 60 segundos después de que la app esté estable)
    const appEstable$ = this.appRef.isStable.pipe(first(isStable => isStable));
    const cadaMinuto$ = interval(60_000);

    concat(appEstable$, cadaMinuto$).subscribe(async () => {
      try {
        await this.swUpdate.checkForUpdate();
      } catch (err) {
        // Silenciar — puede fallar si el SW no está registrado
      }
    });

    console.log('✅ PWA Update Service inicializado');
  }

  /**
   * Aplicar la actualización y recargar la página.
   */
  async aplicarActualizacion(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      document.location.reload();
    } catch (err) {
      // Fallback: recargar directamente
      document.location.reload();
    }
  }

  /**
   * Descartar la notificación (el usuario decide no actualizar ahora).
   */
  descartarActualizacion(): void {
    this.hayActualizacion$.next(false);
  }
}