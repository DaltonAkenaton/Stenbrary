// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/pwa-update.service.ts   ║
// ║  Stenbrary v3.46.0 — Notificación de actualización PWA║
// ║                                                      ║
// ║  Detecta cuando hay una nueva versión desplegada y    ║
// ║  muestra un banner para que el usuario actualice.     ║
// ║  Usa SwUpdate de @angular/service-worker.             ║
// ║                                                      ║
// ║  FIX v3.46.0: `iniciar()` no lo llamaba nadie y,      ║
// ║  además, esperaba a que la app estuviera "estable",   ║
// ║  cosa que con los temporizadores de la app (auto-     ║
// ║  refresco, cierre por horario) puede no pasar nunca.  ║
// ║  Una tablet en quiosco abierta todo el día no se      ║
// ║  enteraba de las versiones nuevas. Comprobado con un  ║
// ║  despliegue A → B real (ronda de pruebas 2026-10).    ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, filter, timer } from 'rxjs';
import { log } from '../utils/logger';

/** Primera revisión tras arrancar (deja que el SW termine de registrarse). */
const PRIMERA_REVISION_MS = 60_000;
/** Cada cuánto se pregunta al servidor si hay versión nueva (solo baja ngsw.json). */
const REVISION_CADA_MS = 15 * 60_000;

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);


  /** true cuando hay una versión nueva lista para instalar */
  private hayActualizacion$ = new BehaviorSubject<boolean>(false);
  public actualizacionDisponible$ = this.hayActualizacion$.asObservable();

  private iniciado = false;

  /**
   * Inicializar el listener de actualizaciones.
   * Llamar una vez desde AppComponent.ngOnInit().
   */
  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    if (!this.swUpdate.isEnabled) {
      log('⚙️ Service Worker no habilitado (modo desarrollo)');
      return;
    }

    // Escuchar cuando hay una versión nueva lista
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(evt => {
        log('🆕 Nueva versión disponible:', evt.latestVersion.hash);
        this.hayActualizacion$.next(true);
      });

    // Revisión periódica por reloj, NO por `isStable`: con intervalos vivos
    // la app no se estabiliza nunca y la revisión no arrancaba.
    const cada = this.intervaloDeRevision();
    timer(Math.min(PRIMERA_REVISION_MS, cada), cada).subscribe(async () => {
      try {
        const hay = await this.swUpdate.checkForUpdate();
        log(`🔎 Revisión de versión: ${hay ? 'hay una nueva' : 'sin cambios'}`);
      } catch (e) {
        // No es grave (sin red, SW aún registrándose); se reintenta en la próxima.
        console.warn('Revisión de versión fallida:', e);
      }
    });

    log('✅ PWA Update Service inicializado');
  }

  /**
   * Intervalo de revisión. Se puede acortar SOLO para pruebas con la clave
   * `stenbrary-sw-revision-ms` en localStorage (mínimo 10 s): esperar 15 min
   * por cada prueba del aviso de actualización no es viable.
   */
  private intervaloDeRevision(): number {
    try {
      const n = Number(localStorage.getItem('stenbrary-sw-revision-ms'));
      if (Number.isFinite(n) && n >= 10_000) return n;
    } catch { /* localStorage bloqueado: se usa el intervalo normal */ }
    return REVISION_CADA_MS;
  }

  /** True si el Service Worker está activo (false en `ng serve`). */
  get habilitado(): boolean {
    return this.swUpdate.isEnabled;
  }

  /**
   * Buscar actualizaciones bajo demanda (botón en Configuración).
   * Devuelve true si se detectó una nueva versión lista para instalar.
   * No aplica la actualización; el llamador decide qué hacer.
   */
  async buscarActualizacionAhora(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) return false;
    try {
      const hay = await this.swUpdate.checkForUpdate();
      if (hay) this.hayActualizacion$.next(true);
      return hay;
    } catch {
      return false;
    }
  }

  /**
   * Aplicar la actualización y recargar la página.
   */
  async aplicarActualizacion(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      document.location.reload();
    } catch {
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