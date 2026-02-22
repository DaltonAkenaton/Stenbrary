// ==============================================================================
// RUTA: src/app/app.routes.ts
// ==============================================================================

import { Routes } from '@angular/router';
import { ScannerComponent } from './features/scanner/scanner.component';
import { RegistroAlumnoComponent } from './features/registro-alumno/registro-alumno.component';
import { SeleccionMotivoComponent } from './features/seleccion-motivo/seleccion-motivo.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DetalleAlumnoComponent } from './features/detalle-alumno/detalle-alumno.component';
import { DashboardEjecutivoComponent } from './features/dashboard-ejecutivo/dashboard-ejecutivo.component';  
import { GestionMotivosComponent } from './features/gestion motivos/gestion-motivos.component';


export const routes: Routes = [
  { path: '', redirectTo: '/scanner', pathMatch: 'full' },
  { path: 'scanner', component: ScannerComponent },
  { path: 'registro-alumno', component: RegistroAlumnoComponent },
  { path: 'seleccion-motivo', component: SeleccionMotivoComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'detalle-alumno/:matricula', component: DetalleAlumnoComponent },
  { path: 'dashboard-ejecutivo', component: DashboardEjecutivoComponent },  
  { path: 'gestion-motivos', component: GestionMotivosComponent }, 
  { path: '**', redirectTo: '/scanner' }
];