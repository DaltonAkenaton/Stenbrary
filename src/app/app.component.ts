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

import { Component, signal, OnInit, OnDestroy, effect, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ConfigService } from './core/services/config.service';
import { ChangelogService } from './core/services/changelog.service';
import { DatabaseService } from './core/services/database.service';
import { AuthService } from './core/auth/auth.service';
import { GlobalSearchDialogComponent } from './shared/components/global-search/global-search-dialog.component';
import { KeyboardShortcutsDialogComponent } from './shared/components/keyboard-shortcuts/keyboard-shortcuts-dialog.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';
import { ToastService } from './core/services/toast.service';

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
    MatRippleModule,
    MatDialogModule,
    ToastContainerComponent,
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

  // ─── CIERRE POR HORARIO (v3.21) ─────────────────────────
  private cierrePorHorarioInterval: ReturnType<typeof setInterval> | null = null;
  /** Última fecha (YYYY-MM-DD) en la que ya se ejecutó el cierre por horario. */
  private ultimoCierrePorHorarioDia = '';

  constructor(
    private router: Router,
    private swUpdate: SwUpdate,
    private dialog: MatDialog,
    public configService: ConfigService,
    public changelogService: ChangelogService,
    public databaseService: DatabaseService,
    private toastService: ToastService,
    // Bootstrap del AuthService: al inyectarlo aquí se inicializa al
    // arrancar la app y empieza a escuchar onAuthStateChange (necesario
    // para capturar el callback del magic link aunque el usuario no esté
    // en /login). Si Supabase no está configurado, queda en local-only.
    _authService: AuthService,
  ) {
    // Al activar modo quiosco desde cualquier ruta, llevar inmediatamente al scanner
    effect(() => {
      if (this.configService.modoQuioscoSignal()) {
        const url = this.router.url.split('?')[0];
        if (!this.rutasPermitidasEnQuiosco().some(r => url.startsWith(r))) {
          this.router.navigate(['/scanner']);
        }
      }
    });
  }

  /** Rutas accesibles mientras el modo quiosco está activo.
   *  Solo el flujo de registro del alumno. Para consultar /presencia u otras
   *  vistas admin, el coordinador debe desactivar el modo (PIN) primero —
   *  así se evita exponer el PIN al teclearlo frente a alumnos en consultas
   *  frecuentes. */
  private rutasPermitidasEnQuiosco(): string[] {
    return ['/scanner', '/seleccion-motivo', '/registro-alumno'];
  }

  ngOnInit(): void {
    // Listeners de conexión
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    // Cierre automático al cierre del horario operativo
    this.iniciarCierrePorHorario();
    document.addEventListener('visibilitychange', this.checkCierrePorHorario);

    // Listener de actualizaciones PWA
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.hayActualizacion = true;
        });
    }

    // Auto-cerrar sidebar en móvil al navegar + forzar /scanner en modo quiosco
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((evt) => {
        if (window.innerWidth < 768) {
          this.isSidebarExpanded.set(false);
        }

        // En modo quiosco, redirigir a /scanner cualquier ruta que no sea
        // parte del flujo (scanner, selección, registro) ni /presencia cuando
        // el registro de salida está activo (acceso admin vía PIN).
        if (this.configService.modoQuioscoSignal()) {
          const url = (evt as NavigationEnd).urlAfterRedirects.split('?')[0];
          if (!this.rutasPermitidasEnQuiosco().some(r => url.startsWith(r))) {
            this.router.navigate(['/scanner']);
          }
        }
      });
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    document.removeEventListener('visibilitychange', this.checkCierrePorHorario);
    this.routerSub?.unsubscribe();
    if (this.cierrePorHorarioInterval) {
      clearInterval(this.cierrePorHorarioInterval);
      this.cierrePorHorarioInterval = null;
    }
  }

  // ═══════════════════════════════════════════════════════
  // CIERRE POR HORARIO OPERATIVO (v3.21)
  // ═══════════════════════════════════════════════════════
  // Polling de baja frecuencia (60 s): si está activo el cierre por horario y
  // ya pasó la hora de cierre del día, cierra todas las entradas abiertas.
  // Idempotente vía `ultimoCierrePorHorarioDia`.

  private iniciarCierrePorHorario(): void {
    this.cierrePorHorarioInterval = setInterval(() => {
      void this.checkCierrePorHorario();
    }, 60_000);
    // Disparo inmediato al cargar (cubre el caso de abrir la app después
    // de la hora de cierre, p. ej. en la mañana siguiente).
    void this.checkCierrePorHorario();
  }

  private checkCierrePorHorario = async (): Promise<void> => {
    if (document.hidden) return;
    if (!this.configService.cierreAlHorario) return;
    if (!this.configService.horarioActivo) return;
    if (!this.configService.registroSalidaActivo) return;

    const ahora = new Date();
    const diaKey = `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}`;
    if (this.ultimoCierrePorHorarioDia === diaKey) return;

    const horarioDia = this.configService.horarios[ahora.getDay()];
    if (!horarioDia || horarioDia.cerrado) return;

    const m = /^(\d{1,2}):(\d{2})$/.exec(horarioDia.cierre || '');
    if (!m) return;
    const cierreMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    if (ahoraMin < cierreMin) return;

    // Pasó la hora de cierre. Cerrar y marcar el día.
    this.ultimoCierrePorHorarioDia = diaKey;
    try {
      const cerrados = await this.databaseService.cerrarTodasLasEntradasAbiertas(
        this.configService.cierreAutoConfirmar,
      );
      if (cerrados > 0) {
        const sufijo = this.configService.cierreAutoConfirmar ? '' : ' (revísalas en Biblioteca)';
        this.toastService.info(`Horario cerrado: ${cerrados} entrada(s) cerrada(s)${sufijo}`);
      }
    } catch {
      // Reintentaremos en el siguiente tick si falla
      this.ultimoCierrePorHorarioDia = '';
    }
  };

  actualizarApp(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => {
        document.location.reload();
      });
    }
  }

  descartarActualizacion(): void {
    this.hayActualizacion = false;
  }

  /** Llamado por el banner de error de BD para reintentar la apertura. */
  recargarApp(): void {
    document.location.reload();
  }

  // ─── BÚSQUEDA GLOBAL (Ctrl+K / icono topbar) ────────────
  abrirBusquedaGlobal(): void {
    if (this.configService.modoQuioscoSignal()) return;
    if (this.dialog.openDialogs.some(d => d.componentInstance instanceof GlobalSearchDialogComponent)) {
      return;
    }
    this.dialog.open(GlobalSearchDialogComponent, {
      width: 'auto',
      maxWidth: '92vw',
      autoFocus: false,
      panelClass: 'global-search-panel',
    });
  }

  // ─── AYUDA DE ATAJOS (? o icono topbar) ─────────────────
  abrirAyudaAtajos(): void {
    if (this.configService.modoQuioscoSignal()) return;
    if (this.dialog.openDialogs.some(d => d.componentInstance instanceof KeyboardShortcutsDialogComponent)) {
      return;
    }
    this.dialog.open(KeyboardShortcutsDialogComponent, {
      maxWidth: '92vw',
      autoFocus: false,
      panelClass: 'keyboard-shortcuts-panel',
    });
  }

  /** Mapa Alt+N → ruta de navegación rápida. */
  private readonly atajosNavegacion: Record<string, string> = {
    '1': '/scanner',
    '2': '/dashboard',
    '3': '/alumnos',
    '4': '/registros',
    '5': '/estadisticas',
    '6': '/presencia',
    '0': '/configuracion',
  };

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(ev: KeyboardEvent): void {
    // Si hay un campo editable con foco, ignorar shortcuts de letra/número sueltos
    // (Ctrl+K y Alt+N se disparan de todos modos — no colisionan con typing).
    const target = ev.target as HTMLElement | null;
    const enCampoEditable = !!target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );

    // Ctrl/Cmd + K → búsqueda global
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      this.abrirBusquedaGlobal();
      return;
    }

    // En modo quiosco no se activan más atajos — evita navegación accidental
    // al conectarse un escáner USB que emite teclas.
    if (this.configService.modoQuioscoSignal()) return;

    // '?' → ayuda de atajos (solo si no estás escribiendo)
    if (!enCampoEditable && ev.key === '?' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      ev.preventDefault();
      this.abrirAyudaAtajos();
      return;
    }

    // Alt + número → navegación rápida
    if (ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) {
      const ruta = this.atajosNavegacion[ev.key];
      if (ruta) {
        // /presencia solo si el módulo de salida está activo
        if (ruta === '/presencia' && !this.configService.registroSalidaActivo) return;
        ev.preventDefault();
        this.router.navigate([ruta]);
      }
    }
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
          { icon: 'dashboard',             label: 'Resumen',      route: '/dashboard'    },
          { icon: 'groups',                label: 'Alumnos',      route: '/alumnos'      },
          { icon: 'history',               label: 'Registros',    route: '/registros'    },
          { icon: 'bar_chart',             label: 'Estadísticas', route: '/estadisticas' },
          { icon: 'notifications_paused', label: 'Inactivos',    route: '/inactivos'    },
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
      '/novedades':         'Novedades',
      '/inactivos':         'Alumnos Inactivos',
    };
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/detalle-alumno')) return 'Detalle del Alumno';
    return map[url] ?? 'Stenbrary';
  }
}