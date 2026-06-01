// ╔══════════════════════════════════════════════════════╗
// ║  app.routes.ts                                       ║
// ║  Stenbrary v3.6.2 — Rutas con guard de flujo         ║
// ║                                                      ║
// ║  FIX v3.6.2:                                         ║
// ║  - registroFlujoGuard en /seleccion-motivo            ║
// ║    (impide acceso directo sin escanear primero)       ║
// ║  - Ruta gestion-motivos sin espacio                   ║
// ║  - detalle-alumno/:matricula (no :id)                 ║
// ╚══════════════════════════════════════════════════════╝

import { Routes } from '@angular/router';
import { registroFlujoGuard } from './core/guards/registro-flujo.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/scanner',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
    title: 'Stenbrary — Iniciar sesión',
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
    canActivate: [registroFlujoGuard],
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
    canActivate: [roleGuard],
    title: 'Stenbrary — Estadísticas',
  },
  {
    path: 'gestion-motivos',
    loadComponent: () =>
      import('./features/gestion-motivos/gestion-motivos.component').then(m => m.GestionMotivosComponent),
    canActivate: [roleGuard],
    title: 'Stenbrary — Gestión de Motivos',
  },
  {
    // Shell con sidebar de 7 categorías + buscador. Cada categoría es un
    // sub-componente standalone en features/configuracion/categorias/.
    path: 'configuracion',
    loadComponent: () =>
      import('./features/configuracion/configuracion-v2.component').then(m => m.ConfiguracionV2Component),
    canActivate: [roleGuard],
    title: 'Stenbrary — Configuración',
  },
  {
    path: 'importar-alumnos',
    loadComponent: () =>
      import('./features/importar-alumnos/importar-alumnos.component').then(m => m.ImportarAlumnosComponent),
    canActivate: [roleGuard],
    title: 'Stenbrary — Importar Alumnos',
  },
  {
    path: 'presencia',
    loadComponent: () =>
      import('./features/presencia/presencia.component').then(m => m.PresenciaComponent),
    title: 'Stenbrary — En Biblioteca',
  },
  {
    path: 'novedades',
    loadComponent: () =>
      import('./features/novedades/novedades.component').then(m => m.NovedadesComponent),
    title: 'Stenbrary — Novedades',
  },
  {
    path: 'sincronizacion',
    loadComponent: () =>
      import('./features/sincronizacion/sincronizacion.component').then(m => m.SincronizacionComponent),
    canActivate: [roleGuard],
    title: 'Stenbrary — Sincronización',
  },
  {
    path: 'inactivos',
    loadComponent: () =>
      import('./features/inactivos/inactivos.component').then(m => m.InactivosComponent),
    canActivate: [roleGuard],
    title: 'Stenbrary — Inactivos',
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
    canActivate: [roleGuard],
    title: 'Stenbrary — Usuarios',
  },
  {
    path: 'acceso-denegado',
    loadComponent: () =>
      import('./features/acceso-denegado/acceso-denegado.component').then(m => m.AccesoDenegadoComponent),
    title: 'Stenbrary — Acceso denegado',
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