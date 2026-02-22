// ╔══════════════════════════════════════════════════════╗
// ║  app.component.ts                                    ║
// ║  Shell principal — Sidebar + Topbar + Contenido      ║
// ║  Stenbrary v3.0 — Cyan Cube                         ║
// ╚══════════════════════════════════════════════════════╝

import { Component, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { filter } from 'rxjs/operators';

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
export class AppComponent {

  isSidebarExpanded = signal(false);
  isMobile = signal(false);

  readonly navItems: NavItem[] = [
    { icon: 'qr_code_scanner',  label: 'Escáner',             route: '/scanner',          exact: true },
    { icon: 'person_add',       label: 'Registrar Alumno',    route: '/registro-alumno'   },
    { icon: 'check_circle',     label: 'Selección Actividad', route: '/seleccion-motivo'  },
    { icon: 'dashboard',        label: 'Dashboard',           route: '/dashboard'         },
  ];

  readonly alertNavItem: NavItem = {
    icon: 'notifications',
    label: 'Alertas',
    route: '/alertas',
  };

  constructor(private router: Router) {
    this.checkMobile();

    // Auto-cerrar sidebar en navegación (móvil)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile()) {
        this.isSidebarExpanded.set(false);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void { this.checkMobile(); }

  private checkMobile(): void {
    this.isMobile.set(window.innerWidth <= 768);
    if (this.isMobile()) {
      this.isSidebarExpanded.set(false);
    }
  }

  toggleSidebar(): void {
    this.isSidebarExpanded.update(v => !v);
  }

  closeSidebar(): void {
    this.isSidebarExpanded.set(false);
  }

  get currentPageTitle(): string {
    const map: Record<string, string> = {
      '/scanner':               'Registro de Actividad',
      '/registro-alumno':       'Registrar Alumno',
      '/seleccion-motivo':      'Seleccionar Actividad',
      '/dashboard':             'Dashboard',
      '/dashboard-ejecutivo':   'Dashboard Ejecutivo',
      '/gestion-motivos':       'Gestión de Motivos',
      '/alertas':               'Alertas',
    };
    const url = this.router.url.split('?')[0];
    // Manejar rutas con params como /detalle-alumno/:id
    if (url.startsWith('/detalle-alumno')) return 'Detalle Alumno';
    return map[url] ?? 'Stenbrary';
  }
}