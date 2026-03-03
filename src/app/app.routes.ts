// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/app.routes.ts                        ║
// ║  Stenbrary v3.5 — Con importación masiva             ║
// ║                                                      ║
// ║  NUEVO v3.5:                                         ║
// ║  - /importar-alumnos → ImportarAlumnosComponent      ║
// ╚══════════════════════════════════════════════════════╝

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/scanner',
    pathMatch: 'full',
  },
  {
    path: 'scanner',
    loadComponent: () =>
      import('./features/scanner/scanner.component').then(m => m.ScannerComponent),
    title: 'Stenbrary — Registro',
  },
  {
    path: 'registro-alumno',
    loadComponent: () =>
      import('./features/registro-alumno/registro-alumno.component').then(m => m.RegistroAlumnoComponent),
    title: 'Stenbrary — Nuevo Alumno',
  },
  {
    path: 'seleccion-motivo',
    loadComponent: () =>
      import('./features/seleccion-motivo/seleccion-motivo.component').then(m => m.SeleccionMotivoComponent),
    title: 'Stenbrary — Actividad',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Stenbrary — Resumen',
  },
  {
    path: 'alumnos',
    loadComponent: () =>
      import('./features/alumnos/alumnos.component').then(m => m.AlumnosComponent),
    title: 'Stenbrary — Alumnos',
  },
  {
    path: 'registros',
    loadComponent: () =>
      import('./features/registros/registros.component').then(m => m.RegistrosComponent),
    title: 'Stenbrary — Registros',
  },
  {
    path: 'estadisticas',
    loadComponent: () =>
      import('./features/dashboard-ejecutivo/dashboard-ejecutivo.component').then(m => m.DashboardEjecutivoComponent),
    title: 'Stenbrary — Estadísticas',
  },
  {
    path: 'gestion-motivos',
    loadComponent: () =>
      import('./features/gestion motivos/gestion-motivos.component').then(m => m.GestionMotivosComponent),
    title: 'Stenbrary — Gestión de Motivos',
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./features/configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
    title: 'Stenbrary — Configuración',
  },
  {
    path: 'importar-alumnos',
    loadComponent: () =>
      import('./features/importar-alumnos/importar-alumnos.component').then(m => m.ImportarAlumnosComponent),
    title: 'Stenbrary — Importar Alumnos',
  },
  {
    path: 'detalle-alumno/:matricula',
    loadComponent: () =>
      import('./features/detalle-alumno/detalle-alumno.component').then(m => m.DetalleAlumnoComponent),
    title: 'Stenbrary — Detalle del Alumno',
  },
  {
    path: '**',
    redirectTo: '/scanner',
  },
];