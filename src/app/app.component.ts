// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/app.component.ts                     ║
// ║  Shell principal con sidebar de navegación           ║
// ║  Stenbrary v3.4 — Con Configuración                  ║
// ║                                                      ║
// ║  CAMBIO v3.4:                                        ║
// ║  - Eliminado "Alertas" (no implementado)             ║
// ║  - Agregado "Configuración" en sección Admin         ║
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

interface NavSection {
  title: string;
  items: NavItem[];
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

  // ─── NAVEGACIÓN POR SECCIONES ────────────────────────────
  readonly navSections: NavSection[] = [
    {
      title: 'Operación',
      items: [
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
      ],
    },
    {
      title: 'Consulta',
      items: [
        {
          icon: 'dashboard',
          label: 'Resumen',
          route: '/dashboard',
        },
        {
          icon: 'groups',
          label: 'Alumnos',
          route: '/alumnos',
        },
        {
          icon: 'history',
          label: 'Registros',
          route: '/registros',
        },
        {
          icon: 'bar_chart',
          label: 'Estadísticas',
          route: '/estadisticas',
        },
      ],
    },
    {
      title: 'Administración',
      items: [
        {
          icon: 'category',
          label: 'Gestión de Motivos',
          route: '/gestion-motivos',
        },
        {
          icon: 'settings',
          label: 'Configuración',
          route: '/configuracion',
        },
      ],
    },
  ];

  // Flat list for template
  get navItems(): NavItem[] {
    return this.navSections.flatMap(s => s.items);
  }

  // ─── TOPBAR ──────────────────────────────────────────────
  constructor(private router: Router) {}

  get currentPageTitle(): string {
    const map: Record<string, string> = {
      '/scanner':           'Registro de Actividad',
      '/registro-alumno':   'Registrar Alumno',
      '/seleccion-motivo':  'Seleccionar Actividad',
      '/dashboard':         'Resumen',
      '/alumnos':           'Alumnos',
      '/registros':         'Registros',
      '/estadisticas':      'Estadísticas',
      '/gestion-motivos':   'Gestión de Motivos',
      '/configuracion':     'Configuración',
    };
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/detalle-alumno')) return 'Detalle del Alumno';
    return map[url] ?? 'Stenbrary';
  }
}