// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/global-error.handler.ts ║
// ║  Stenbrary v3.6 — Manejo global de errores           ║
// ║                                                      ║
// ║  Captura errores no manejados (promises rechazadas,  ║
// ║  errores de componentes, etc.) y:                    ║
// ║  1. Los loguea en consola con contexto               ║
// ║  2. Muestra un toast amigable al usuario             ║
// ║  3. Evita que la app se rompa visualmente            ║
// ║                                                      ║
// ║  Se registra en app.config.ts como provider.         ║
// ╚══════════════════════════════════════════════════════╝

import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { ToastService } from './toast.service';
import { ErrorReporterService } from './error-reporter.service';
import { DiagnosticoService } from './diagnostico.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);
  private reporter = inject(ErrorReporterService);
  private diagnostico = inject(DiagnosticoService);

  /** Errores recientes para evitar spam de toasts */
  private erroresRecientes = new Set<string>();

  /**
   * Ruta actual como "área". No es perfecto —el error pudo originarse en un
   * servicio compartido— pero saber en qué pantalla estaba el usuario es el
   * primer dato útil para reproducir, y es gratis.
   */
  private areaDesdeUrl(): string {
    if (typeof location === 'undefined') return 'desconocida';
    return location.pathname.split('/').filter(Boolean)[0] ?? 'inicio';
  }

  handleError(error: any): void {
    // Extraer mensaje legible
    const mensaje = this.extraerMensaje(error);

    // Log completo en consola (para debug)
    console.error('🔴 Error no manejado:', error);

    // Bitácora LOCAL — siempre, sin configuración. Es lo primero porque
    // `reporter.report()` hace no-op cuando el endpoint está vacío, que es
    // el caso en producción: sin esto, todo error en manos del coordinador
    // se perdía sin dejar rastro. Se lee y se exporta desde /diagnostico.
    this.diagnostico.error(
      this.areaDesdeUrl(),
      mensaje,
      { tipo: error?.name ?? typeof error },
      error?.stack,
    );

    // Reporte remoto (no-op si no hay endpoint configurado).
    // Se dispara incluso para errores repetidos — el dedupe de abajo
    // es solo para el toast, no para métricas reales.
    this.reporter.report(error);

    // Evitar mostrar el mismo error repetidamente
    if (this.erroresRecientes.has(mensaje)) return;
    this.erroresRecientes.add(mensaje);
    setTimeout(() => this.erroresRecientes.delete(mensaje), 5000);

    // Mostrar toast amigable (debe correr dentro de NgZone)
    this.ngZone.run(() => {
      // No mostrar errores de red como errores críticos
      if (this.esErrorDeRed(error)) {
        this.toastService.warning('Problema de conexión. Los datos se guardan localmente.');
      } else if (this.esErrorDeChunk(error)) {
        // Error de carga de módulo — generalmente por nueva versión
        this.toastService.info('Hay una nueva versión disponible. Recarga la página.');
      } else {
        this.toastService.error('Ocurrió un error inesperado. Intenta de nuevo.');
      }
    });
  }

  private extraerMensaje(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.rejection?.message) return error.rejection.message;
    return 'Error desconocido';
  }

  private esErrorDeRed(error: any): boolean {
    const msg = this.extraerMensaje(error).toLowerCase();
    return (
      error instanceof TypeError && msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('offline') ||
      msg.includes('failed to fetch') ||
      msg.includes('net::err')
    );
  }

  private esErrorDeChunk(error: any): boolean {
    const msg = this.extraerMensaje(error).toLowerCase();
    return (
      msg.includes('loading chunk') ||
      msg.includes('chunkloaderror') ||
      msg.includes('failed to load')
    );
  }
}