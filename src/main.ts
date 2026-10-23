import { bootstrapApplication } from '@angular/platform-browser';
import { instalarReloj } from './app/core/utils/reloj.utils';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Antes que nada: desde aquí todo el sistema usa la hora corregida (v3.59.0).
instalarReloj();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
