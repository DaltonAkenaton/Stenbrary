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
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/services/global-error.handler';

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
  ],
};