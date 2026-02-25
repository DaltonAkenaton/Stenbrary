// ╔══════════════════════════════════════════════════════╗
// ║  app.component.ts                                    ║
// ║  Shell principal con sidebar de navegación           ║
// ║  Stenbrary v3.2 — Cyan Cube                         ║
// ║                                                      ║
// ║  Sidebar reorganizado:                               ║
// ║  - Scanner (flujo principal)                         ║
// ║  - Registrar Alumno (acceso directo)                 ║
// ║  - Dashboard (registros + alumnos + estadísticas)    ║
// ║  - Dashboard Ejecutivo (gráficas avanzadas)          ║
// ║  - Gestión de Motivos                                ║
// ╚══════════════════════════════════════════════════════╝

import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgClass,
    MatIconModule,
    MatTooltipModule,
    MatRippleModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {

  // ─── ESTADO DEL SIDEBAR ──────────────────────────────────
  isSidebarExpanded = signal(false);

  toggleSidebar(): void {
    this.isSidebarExpanded.update(v => !v);
  }

  // ─── ESTADO DE CONEXIÓN ─────────────────────────────────
  isOnline = signal(navigator.onLine);

  private onlineHandler = () => this.isOnline.set(true);
  private offlineHandler = () => this.isOnline.set(false);

  ngOnInit(): void {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }

  // ─── ITEMS DE NAVEGACIÓN ─────────────────────────────────
  readonly navItems: NavItem[] = [
    {
      icon: 'qr_code_scanner',
      label: 'Registro de Actividad',
      route: '/scanner',
      exact: true,
    },
    {
      icon: 'person_add',
      label: 'Registrar Alumno',
      route: '/registro-alumno',
    },
    {
      icon: 'list_alt',
      label: 'Dashboard',
      route: '/dashboard',
    },
    {
      icon: 'bar_chart',
      label: 'Dashboard Ejecutivo',
      route: '/dashboard-ejecutivo',
    },
    {
      icon: 'category',
      label: 'Gestión de Motivos',
      route: '/gestion-motivos',
    },
  ];

  readonly alertNavItem: NavItem = {
    icon: 'notifications',
    label: 'Alertas',
    route: '/alertas',
  };

  // ─── TOPBAR ──────────────────────────────────────────────
  constructor(private router: Router) {}

  get currentPageTitle(): string {
    const map: Record<string, string> = {
      '/scanner':             'Registro de Actividad',
      '/registro-alumno':     'Registrar Alumno',
      '/seleccion-motivo':    'Seleccionar Actividad',
      '/dashboard':           'Dashboard',
      '/dashboard-ejecutivo': 'Dashboard Ejecutivo',
      '/gestion-motivos':     'Gestión de Motivos',
      '/alertas':             'Alertas',
    };
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/detalle-alumno')) return 'Detalle del Alumno';
    return map[url] ?? 'Stenbrary';
  }
}