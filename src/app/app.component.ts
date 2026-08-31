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

import { Component, signal, OnInit, OnDestroy, effect, HostListener, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ConfigService } from './core/services/config.service';
import { ChangelogService } from './core/services/changelog.service';
import { DatabaseService } from './core/services/database.service';
import { SyncService } from './core/services/sync.service';
import { ConnectivityService } from './core/services/connectivity.service';
import { AuthService } from './core/auth/auth.service';
import { PermissionsService } from './core/auth/permissions.service';
import { computed } from '@angular/core';
import { GlobalSearchDialogComponent } from './shared/components/global-search/global-search-dialog.component';
import { KeyboardShortcutsDialogComponent } from './shared/components/keyboard-shortcuts/keyboard-shortcuts-dialog.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';
import { ToastService } from './core/services/toast.service';
import { DiagnosticoService } from './core/services/diagnostico.service';
import { RestablecerService } from './core/services/restablecer.service';
import { registrarDiagnostico } from './core/utils/invariante.utils';

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
    MatMenuModule,
    MatButtonModule,
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
  // Conexión REAL (sondeo activo), no solo navigator.onLine. Ver
  // ConnectivityService — registra sus propios listeners globales.
  private readonly connectivity = inject(ConnectivityService);
  readonly isOnline = this.connectivity.online;

  // ─── PWA UPDATE ─────────────────────────────────────────
  hayActualizacion = false;

  private routerSub: Subscription | null = null;

  // ─── CIERRE POR HORARIO (v3.21) ─────────────────────────
  private cierrePorHorarioInterval: ReturnType<typeof setInterval> | null = null;
  /** Última fecha (YYYY-MM-DD) en la que ya se ejecutó el cierre por horario. */
  private ultimoCierrePorHorarioDia = '';

  // ─── SESIÓN / AUTH ──────────────────────────────────────
  // Inicial del nombre (o '?') para el avatar del topbar.
  readonly inicialUsuario = computed(() => {
    const nombre = this.authService.currentUser()?.nombre ?? '';
    return nombre.trim().charAt(0).toUpperCase() || '?';
  });

  /**
   * Nombre a mostrar en el topbar. El trigger de Supabase pone
   * `nombre = parte-local-del-email` cuando no hay nombre real (p.ej.
   * "dalton.akenaton"). En ese caso mostramos el email completo, más
   * informativo, hasta que /usuarios permita asignar un nombre real.
   */
  readonly nombreMostrado = computed(() => {
    const u = this.authService.currentUser();
    if (!u) return '';
    const nombre = (u.nombre ?? '').trim();
    const local = (u.email ?? '').split('@')[0];
    if (!nombre || nombre === local) return u.email || nombre;
    return nombre;
  });

  /** Etiqueta legible del rol — pendiente de traducción si llegan más. */
  readonly rolLegible = computed(() => {
    const rol = this.authService.currentRole();
    switch (rol) {
      case 'super_admin': return 'Super admin';
      case 'coordinador': return 'Coordinador';
      case 'asistente':   return 'Asistente';
      case 'alumno':      return 'Alumno';
      default:            return '';
    }
  });

  constructor(
    private router: Router,
    private swUpdate: SwUpdate,
    private dialog: MatDialog,
    public configService: ConfigService,
    public changelogService: ChangelogService,
    public databaseService: DatabaseService,
    public syncService: SyncService,
    private toastService: ToastService,
    private diagnosticoService: DiagnosticoService,
    private restablecerService: RestablecerService,
    // Bootstrap del AuthService: al inyectarlo aquí se inicializa al
    // arrancar la app y empieza a escuchar onAuthStateChange (necesario
    // para capturar el callback del magic link aunque el usuario no esté
    // en /login). Si Supabase no está configurado, queda en local-only.
    public authService: AuthService,
    public permisos: PermissionsService,
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

    // Refrescar el conteo de pendientes (badge del sidebar) en tiempo real:
    // el effect depende de `cambiosSync` (se incrementa en cada mutación
    // local) y de `isSignedIn`. Así el badge se actualiza al registrar,
    // editar o subir/descartar — sin esperar a re-login ni a entrar a
    // /sincronizacion.
    effect(() => {
      this.databaseService.cambiosSync(); // dependencia reactiva
      if (this.authService.isSignedIn()) {
        void this.syncService.refrescarConteos();
      }
    });
  }

  /**
   * Lleva al asistente inicial, pero SOLO en una instalación realmente nueva.
   *
   * La condición es doble a propósito: falta la marca de setup **y** la base
   * está vacía. Con solo la marca, cualquiera que ya venía usando el sistema
   * —que nunca la tuvo— se encontraría el asistente de golpe y con riesgo de
   * pisar su configuración. La base vacía es lo que distingue "nunca lo he
   * usado" de "actualicé la app".
   */
  private async ofrecerAsistenteInicial(): Promise<void> {
    try {
      if (this.restablecerService.setupCompletado()) return;
      if (this.configService.modoQuioscoSignal()) return; // no en la tablet pública

      const conteo = await this.databaseService.obtenerConteoTotal();
      if ((conteo.alumnos ?? 0) > 0 || (conteo.registros ?? 0) > 0) {
        // Ya hay datos: no es una instalación nueva. Se marca como hecho para
        // no volver a preguntar en cada arranque.
        this.restablecerService.marcarSetupCompletado();
        return;
      }

      const url = this.router.url.split('?')[0];
      if (url.startsWith('/bienvenida')) return;
      void this.router.navigate(['/bienvenida']);
    } catch {
      // Si algo falla aquí, lo peor que puede pasar es no mostrar el
      // asistente. Nunca debe impedir que la app arranque.
    }
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
    // Publica el servicio de diagnóstico para las funciones sueltas de
    // `invariante.utils`. Se hace aquí, en el arranque, porque esos helpers
    // se llaman desde código sin contexto de inyección de Angular.
    registrarDiagnostico(this.diagnosticoService);

    void this.ofrecerAsistenteInicial();

    // El estado de conexión lo maneja ConnectivityService (listeners +
    // sondeo activo) — ya no registramos online/offline aquí.

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

  // ─── SESIÓN: navegar a login / cerrar sesión ────────────
  irALogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.signOut();
    this.toastService.info('Sesión cerrada');
    // Volver al scanner: la app sigue 100% operativa offline-first sin
    // sesión. Evita quedarse varado en una vista protegida (p.ej. tras
    // cerrar sesión estando en /acceso-denegado).
    this.router.navigate(['/scanner']);
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

    const consulta: NavItem[] = [
      { icon: 'dashboard',             label: 'Resumen',      route: '/dashboard'    },
      { icon: 'groups',                label: 'Alumnos',      route: '/alumnos'      },
      { icon: 'history',               label: 'Registros',    route: '/registros'    },
      { icon: 'bar_chart',             label: 'Estadísticas', route: '/estadisticas' },
      { icon: 'notifications_paused', label: 'Inactivos',    route: '/inactivos'    },
    ];

    return [
      { title: 'Operación',      items: this.filtrarPorPermisos(operacion) },
      { title: 'Consulta',       items: this.filtrarPorPermisos(consulta) },
      { title: 'Administración', items: this.itemsAdministracion() },
    ];
  }

  /**
   * Items de la sección Administración. `Sincronización` solo aparece si
   * el usuario tiene sesión activa con backend (Fase 2.2 spike).
   * Cada item se filtra por permisos antes de devolver.
   */
  private itemsAdministracion(): NavItem[] {
    const items: NavItem[] = [
      { icon: 'category', label: 'Gestión de Motivos', route: '/gestion-motivos' },
      { icon: 'campaign', label: 'Novedades',          route: '/novedades'       },
    ];

    if (this.authService.isSignedIn()) {
      items.push({ icon: 'cloud_sync', label: 'Sincronización', route: '/sincronizacion' });
      items.push({ icon: 'cloud_download', label: 'Bajar de la nube', route: '/descarga' });

      items.push({ icon: 'group', label: 'Usuarios', route: '/usuarios' });
    }

    items.push({ icon: 'health_and_safety', label: 'Reporte del sistema', route: '/diagnostico' });


    items.push({ icon: 'settings', label: 'Configuración', route: '/configuracion' });
    return this.filtrarPorPermisos(items);
  }

  /**
   * Filtra una lista de items dejando solo los que el rol actual puede
   * abrir. En modo local-only o sin sesión pasa todo (PermissionsService
   * respeta la filosofía offline-first).
   */
  private filtrarPorPermisos(items: NavItem[]): NavItem[] {
    return items.filter(it => this.permisos.canAccessRoute(it.route));
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

    return this.filtrarPorPermisos(items);
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
      '/sincronizacion':    'Sincronización',
      '/descarga':          'Bajar de la nube',
      '/diagnostico':       'Reporte del sistema',
      '/usuarios':          'Usuarios',
    };
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/detalle-alumno')) return 'Detalle del Alumno';
    return map[url] ?? 'Stenbrary';
  }
}