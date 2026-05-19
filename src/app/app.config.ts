// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/app.config.ts                         ║
// ║  Stenbrary v3.6 — Con Global Error Handler            ║
// ║                                                      ║
// ║  NUEVO v3.6:                                         ║
// ║  - GlobalErrorHandler como ErrorHandler provider      ║
// ╚══════════════════════════════════════════════════════╝

import { ApplicationConfig, provideZoneChangeDetection, isDevMode, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { provideLottieOptions } from 'ngx-lottie';
import { Overlay } from '@angular/cdk/overlay';
import { MAT_TOOLTIP_SCROLL_STRATEGY, MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions } from '@angular/material/tooltip';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/services/global-error.handler';

// Cierra el tooltip al scrollear en lugar de reposicionarlo en cada frame.
// Evita el reflow continuo cuando hay muchos matTooltip en una vista
// (dashboard tenía lag perceptible al scrollear con ~18 tooltips activos).
const tooltipScrollStrategyFactory = (overlay: Overlay) => () => overlay.scrollStrategies.close();

const tooltipDefaults: MatTooltipDefaultOptions = {
  showDelay: 0,
  hideDelay: 0,
  touchendHideDelay: 1500,
  disableTooltipInteractivity: true,
};

// Lottie player se carga lazy (solo cuando un <ng-lottie> se monta).
// El bundle inicial NO crece — el chunk de lottie-web es separado y
// el SW lo cachea tras la primera carga, manteniendo el offline-first.
const lottiePlayerFactory = () => import('lottie-web');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideLottieOptions({ player: lottiePlayerFactory }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: tooltipDefaults },
    {
      provide: MAT_TOOLTIP_SCROLL_STRATEGY,
      useFactory: tooltipScrollStrategyFactory,
      deps: [Overlay],
    },
  ],
};