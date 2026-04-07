// ╔══════════════════════════════════════════════════════╗
// ║  app.component.ts                                    ║
// ║  Shell principal con sidebar de navegación           ║
// ║  Stenbrary v3.6.2                                    ║
// ║                                                      ║
// ║  FIX v3.6.2:                                         ║
// ║  - Eliminado alertNavItem (ruta no existía)           ║
// ║  - PWA Update integrado (hayActualizacion + métodos) ║
// ║  - Sidebar agrupado por secciones (navSections)       ║
// ║  - Configuración en sección Administración            ║
// ╚══════════════════════════════════════════════════════╝

import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ConfigService } from './core/services/config.service';
import { ChangelogService } from './core/services/changelog.service';

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
    MatIconModule,
    MatTooltipModule,
    MatRippleModule
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

  cerrarSidebar(): void {
    this.isSidebarExpanded.set(false);
  }

  // ─── ESTADO DE CONEXIÓN ─────────────────────────────────
  isOnline = signal(navigator.onLine);

  private onlineHandler = () => this.isOnline.set(true);
  private offlineHandler = () => this.isOnline.set(false);

  // ─── PWA UPDATE ─────────────────────────────────────────
  hayActualizacion = false;

  private routerSub: Subscription | null = null;

  constructor(
    private router: Router,
    private swUpdate: SwUpdate,
    public configService: ConfigService,
    public changelogService: ChangelogService,
  ) {}

  ngOnInit(): void {
    // Listeners de conexión
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    // Listener de actualizaciones PWA
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          console.log('🔄 Nueva versión disponible');
          this.hayActualizacion = true;
        });
    }

    // Auto-cerrar sidebar en móvil al navegar
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (window.innerWidth < 768) {
          this.isSidebarExpanded.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    this.routerSub?.unsubscribe();
  }

  actualizarApp(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => {
        console.log('✅ Actualización aplicada, recargando...');
        document.location.reload();
      });
    }
  }

  descartarActualizacion(): void {
    this.hayActualizacion = false;
  }

  // ─── NAVEGACIÓN POR SECCIONES ────────────────────────────
  get navSections(): NavSection[] {
    const operacion: NavItem[] = [
      { icon: 'qr_code_scanner', label: 'Registro de Actividad', route: '/scanner', exact: true },
      { icon: 'person_add',      label: 'Registrar Alumno',      route: '/registro-alumno' },
    ];

    if (this.configService.registroSalidaActivo) {
      operacion.push({ icon: 'sensor_door', label: 'En Biblioteca', route: '/presencia' });
    }

    return [
      { title: 'Operación', items: operacion },
      {
        title: 'Consulta',
        items: [
          { icon: 'dashboard',  label: 'Resumen',      route: '/dashboard'    },
          { icon: 'groups',     label: 'Alumnos',      route: '/alumnos'      },
          { icon: 'history',    label: 'Registros',    route: '/registros'    },
          { icon: 'bar_chart',  label: 'Estadísticas', route: '/estadisticas' },
        ],
      },
      {
        title: 'Administración',
        items: [
          { icon: 'category', label: 'Gestión de Motivos', route: '/gestion-motivos' },
          { icon: 'campaign', label: 'Novedades',          route: '/novedades'       },
          { icon: 'settings', label: 'Configuración',      route: '/configuracion'   },
        ],
      },
    ];
  }

  // Flat list para compatibilidad
  get navItems(): NavItem[] {
    return this.navSections.flatMap(s => s.items);
  }

  // ─── BOTTOM NAV (móvil) ──────────────────────────────────
  get bottomNavItems(): NavItem[] {
    const items: NavItem[] = [
      { icon: 'qr_code_scanner', label: 'Scanner',   route: '/scanner',  exact: true },
      { icon: 'dashboard',       label: 'Resumen',   route: '/dashboard'             },
      { icon: 'groups',          label: 'Alumnos',   route: '/alumnos'               },
    ];

    if (this.configService.registroSalidaActivo) {
      items.push({ icon: 'sensor_door', label: 'Biblioteca', route: '/presencia' });
    } else {
      items.push({ icon: 'history', label: 'Registros', route: '/registros' });
    }

    return items;
  }

  // ─── TOPBAR ──────────────────────────────────────────────
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
      '/importar-alumnos':  'Importar Alumnos',
      '/presencia':         'En Biblioteca Ahora',
    };
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/detalle-alumno')) return 'Detalle del Alumno';
    return map[url] ?? 'Stenbrary';
  }
}