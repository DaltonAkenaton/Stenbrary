import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/scanner',
    pathMatch: 'full'
  },
  {
    path: 'scanner',
    loadComponent: () => import('./features/scanner/scanner.component')
      .then(m => m.ScannerComponent),
    title: 'Stenbrary - Registro'
  },
  {
    path: 'registro-alumno',
    loadComponent: () => import('./features/registro-alumno/registro-alumno.component')
      .then(m => m.RegistroAlumnoComponent),
    title: 'Stenbrary - Nuevo Alumno'
  },
  {
    path: 'seleccion-motivo',
    loadComponent: () => import('./features/seleccion-motivo/seleccion-motivo.component')
      .then(m => m.SeleccionMotivoComponent),
    title: 'Stenbrary - Motivo de Visita'
  },
  {
    path: '**',
    redirectTo: '/scanner'
  }
];