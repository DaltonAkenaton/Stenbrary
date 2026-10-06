// ╔══════════════════════════════════════════════════════╗
// ║  command-palette.service.ts                          ║
// ║  Stenbrary v3.25.0 — Catálogo de comandos para Ctrl+K║
// ║                                                      ║
// ║  Provee 3 tipos de comando al global-search:          ║
// ║   - navegacion: cambia ruta                           ║
// ║   - toggle: alterna un setting binario y muestra      ║
// ║     "Activar"/"Desactivar" dinámicamente              ║
// ║   - accion: dispara una operación (export, etc.)      ║
// ║                                                      ║
// ║  Cada comando tiene `keywords[]` que permiten         ║
// ║  buscarlo por sinónimos sin depender del label exacto.║
// ║                                                      ║
// ║  Cuando se agregue una nueva categoría de config o    ║
// ║  setting global, agregar su comando aquí — no en el   ║
// ║  dialog, que solo renderiza.                          ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfigService } from './config.service';
import { SoundService } from './sound.service';
import { BackupService } from './backup.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';
import { PwaUpdateService } from './pwa-update.service';

export type CommandGrupo = 'Navegación' | 'Configuración' | 'Acciones';
export type CommandTipo = 'navegacion' | 'toggle' | 'accion';

export interface Command {
  id: string;
  /** Texto principal. Si es función, se evalúa cada vez (toggles). */
  label: string | (() => string);
  /** Subtexto opcional con contexto o estado actual. */
  descripcion?: string | (() => string);
  /** Material icon. */
  icono: string;
  grupo: CommandGrupo;
  tipo: CommandTipo;
  /** Palabras clave para búsqueda fuzzy — sin acentos, en minúsculas. */
  keywords: string[];
  /** Si false, el comando se oculta del catálogo en este momento. */
  visible?: () => boolean;
  /** Lo que pasa al ejecutar. Debe ser idempotente y rápido. */
  ejecutar: () => void | Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {

  private router = inject(Router);
  private configService = inject(ConfigService);
  private soundService = inject(SoundService);
  private backupService = inject(BackupService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private pwaUpdateService = inject(PwaUpdateService);

  /**
   * Devuelve el catálogo completo de comandos disponibles AHORA. El cliente
   * debe llamar este método cada vez que abre el palette — los comandos
   * `toggle` y los que dependen de `visible()` cambian con el estado.
   */
  getCommands(): Command[] {
    return [
      ...this.comandosNavegacion(),
      ...this.comandosConfiguracion(),
      ...this.comandosAcciones(),
    ].filter(c => !c.visible || c.visible());
  }

  // ═══════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════

  private comandosNavegacion(): Command[] {
    const nav = (id: string, label: string, icono: string, ruta: string, keywords: string[]): Command => ({
      id, label, icono, ruta, keywords,
      grupo: 'Navegación', tipo: 'navegacion',
      descripcion: ruta,
      ejecutar: () => void this.router.navigateByUrl(ruta),
    } as Command & { ruta: string });

    return [
      nav('nav-scanner',     'Ir a Scanner',           'qr_code_scanner', '/scanner',         ['scanner', 'escanear', 'inicio', 'registrar']),
      nav('nav-dashboard',   'Ir a Resumen',           'dashboard',       '/dashboard',       ['resumen', 'dashboard', 'home']),
      nav('nav-alumnos',     'Ir a Alumnos',           'groups',          '/alumnos',         ['alumnos', 'lista', 'estudiantes']),
      nav('nav-registros',   'Ir a Registros',         'history',         '/registros',       ['registros', 'historial', 'accesos']),
      nav('nav-estadisticas','Ir a Estadísticas',      'bar_chart',       '/estadisticas',    ['estadisticas', 'graficas', 'analitica', 'ejecutivo']),
      nav('nav-presencia',   'Ir a En Biblioteca',     'meeting_room',    '/presencia',       ['presencia', 'biblioteca', 'dentro', 'adentro'],),
      nav('nav-motivos',     'Ir a Gestión de Motivos','category',        '/gestion-motivos', ['motivos', 'actividades', 'categorias']),
      nav('nav-importar',    'Ir a Importar Alumnos',  'upload_file',     '/importar-alumnos',['importar', 'excel', 'xlsx', 'bulk']),
      nav('nav-inactivos',   'Ir a Inactivos',         'notifications_paused','/inactivos',   ['inactivos', 'ausentes', 'sin', 'venir']),
      nav('nav-novedades',   'Ir a Novedades',         'campaign',        '/novedades',       ['novedades', 'changelog', 'cambios', 'version']),
      nav('nav-config',      'Ir a Configuración',     'settings',        '/configuracion',   ['configuracion', 'ajustes', 'settings', 'opciones']),

      // Atajos directos a cada categoría de config
      nav('nav-config-general',     'Configuración → General',     'settings',          '/configuracion#general',     ['general', 'info', 'institucion']),
      nav('nav-config-escaner',     'Configuración → Escáner',     'qr_code_scanner',   '/configuracion#escaner',     ['escaner', 'sonido', 'camara', 'beep']),
      nav('nav-config-operacion',   'Configuración → Operación',   'meeting_room',      '/configuracion#operacion',   ['operacion', 'salida', 'aforo', 'duplicados']),
      nav('nav-config-quiosco',     'Configuración → Quiosco',     'tablet_android',    '/configuracion#quiosco',     ['quiosco', 'kiosk', 'horario', 'pin']),
      nav('nav-config-experiencia', 'Configuración → Experiencia', 'celebration',       '/configuracion#experiencia', ['experiencia', 'celebracion', 'animacion', 'inactividad']),
      nav('nav-config-calendario',  'Configuración → Calendario escolar', 'event',      '/configuracion#calendario',  ['calendario', 'periodo', 'semestre', 'festivo', 'inhabil', 'vacaciones']),
      nav('nav-config-datos',       'Configuración → Datos',       'storage',           '/configuracion#datos',       ['datos', 'respaldo', 'backup', 'restore', 'limpieza']),
      nav('nav-config-avanzado',    'Configuración → Avanzado',    'warning',           '/configuracion#avanzado',    ['avanzado', 'peligro', 'eliminar']),
    ];
  }

  // ═══════════════════════════════════════════════
  // CONFIGURACIÓN (toggles)
  // ═══════════════════════════════════════════════

  private comandosConfiguracion(): Command[] {
    return [
      // ─── Modo quiosco ─────────────────────────────
      {
        id: 'toggle-quiosco',
        label: () => this.configService.modoQuiosco ? 'Desactivar modo quiosco' : 'Activar modo quiosco',
        descripcion: () => this.configService.modoQuiosco ? 'Activado' : 'Desactivado',
        icono: 'tablet_android',
        grupo: 'Configuración',
        tipo: 'toggle',
        keywords: ['quiosco', 'kiosk', 'tablet', 'modo', 'activar', 'desactivar'],
        ejecutar: () => {
          const nuevo = !this.configService.modoQuiosco;
          this.configService.setModoQuiosco(nuevo);
          this.toastService.info(
            nuevo
              ? 'Modo quiosco activado — pulsación larga + PIN para salir'
              : 'Modo quiosco desactivado',
          );
        },
      },

      // ─── Celebración ──────────────────────────────
      {
        id: 'toggle-celebracion',
        label: () => this.configService.celebracionActiva ? 'Desactivar animación celebratoria' : 'Activar animación celebratoria',
        descripcion: () => this.configService.celebracionActiva
          ? `Frecuencia: ${Math.round(this.configService.celebracionProbabilidad * 100)}%`
          : 'Desactivada',
        icono: 'celebration',
        grupo: 'Configuración',
        tipo: 'toggle',
        keywords: ['celebracion', 'animacion', 'confeti', 'fiesta'],
        ejecutar: () => {
          const nuevo = !this.configService.celebracionActiva;
          this.configService.setCelebracionActiva(nuevo);
          this.toastService.info(
            nuevo ? 'Animación celebratoria activada' : 'Animación celebratoria desactivada',
          );
        },
      },

      // ─── Sonido ───────────────────────────────────
      {
        id: 'toggle-sonido',
        label: () => this.soundService.habilitado ? 'Desactivar sonido' : 'Activar sonido',
        descripcion: () => this.soundService.habilitado
          ? `Volumen: ${Math.round(this.configService.volumenBeep * 100)}%`
          : 'Desactivado',
        icono: 'volume_up',
        grupo: 'Configuración',
        tipo: 'toggle',
        keywords: ['sonido', 'beep', 'audio', 'mute', 'silenciar', 'volumen'],
        ejecutar: () => {
          const nuevo = this.soundService.toggle();
          this.toastService.info(nuevo ? 'Sonido activado' : 'Sonido desactivado');
        },
      },

      // ─── Registro de salida ───────────────────────
      {
        id: 'toggle-salida',
        label: () => this.configService.registroSalidaActivo
          ? 'Desactivar registro de salida'
          : 'Activar registro de salida',
        descripcion: () => this.configService.registroSalidaActivo
          ? 'Módulo "En Biblioteca" activo'
          : 'Sin registro de salida',
        icono: 'sensor_door',
        grupo: 'Configuración',
        tipo: 'toggle',
        keywords: ['salida', 'entrada', 'biblioteca', 'presencia', 'modulo'],
        ejecutar: () => {
          const nuevo = !this.configService.registroSalidaActivo;
          this.configService.setRegistroSalidaActivo(nuevo);
          this.toastService.info(
            nuevo
              ? 'Registro de salida activado — aparece "En Biblioteca" en el menú'
              : 'Registro de salida desactivado',
          );
        },
      },

      // ─── Horarios ─────────────────────────────────
      {
        id: 'toggle-horario',
        label: () => this.configService.horarioActivo
          ? 'Desactivar horarios de operación'
          : 'Activar horarios de operación',
        descripcion: () => this.configService.horarioActivo
          ? `Modo: ${this.configService.horarioModo === 'bloquear' ? 'bloquear' : 'advertir'}`
          : 'Sin horario',
        icono: 'schedule',
        grupo: 'Configuración',
        tipo: 'toggle',
        keywords: ['horario', 'apertura', 'cierre', 'dias', 'semana'],
        ejecutar: () => {
          const nuevo = !this.configService.horarioActivo;
          this.configService.setHorarioActivo(nuevo);
          this.toastService.info(nuevo ? 'Horarios activados' : 'Horarios desactivados');
        },
      },

      // ─── Escáner: saltar confirmación ─────────────
      // El setting interno se llama `escanerSaltarConfirmacion` (true = saltar
      // = instantáneo). Los labels expuestos al coordinador NO usan la palabra
      // "saltar" porque confunde — usamos "modo instantáneo" como sinónimo.
      {
        id: 'toggle-escaner-instantaneo',
        label: () => this.configService.escanerSaltarConfirmacion
          ? 'Pedir confirmación al escanear (modo seguro)'
          : 'Procesar escaneos al instante (sin confirmar)',
        descripcion: () => this.configService.escanerSaltarConfirmacion
          ? 'Ahora mismo: instantáneo. Clic para pedir confirmación.'
          : 'Ahora mismo: pide confirmación. Clic para hacer instantáneo.',
        icono: 'flash_on',
        grupo: 'Configuración',
        tipo: 'toggle',
        keywords: ['confirmacion', 'saltar', 'instantaneo', 'directo', 'escaner', 'rapido', 'sin'],
        ejecutar: () => {
          const nuevo = !this.configService.escanerSaltarConfirmacion;
          this.configService.setEscanerSaltarConfirmacion(nuevo);
          this.toastService.success(
            nuevo
              ? 'Escáner en modo instantáneo — procesa sin pedir confirmación'
              : 'Escáner en modo seguro — pedirá confirmación antes de procesar',
          );
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // ACCIONES
  // ═══════════════════════════════════════════════

  private comandosAcciones(): Command[] {
    return [
      // ─── Exportar respaldo ────────────────────────
      {
        id: 'accion-exportar-backup',
        label: 'Exportar respaldo ahora',
        descripcion: 'Descarga un .json con alumnos + registros + motivos',
        icono: 'cloud_download',
        grupo: 'Acciones',
        tipo: 'accion',
        keywords: ['exportar', 'backup', 'respaldo', 'descargar', 'guardar'],
        ejecutar: async () => {
          try {
            this.loadingService.show('Generando respaldo...');
            const r = await this.backupService.descargarBackup();
            this.loadingService.hide();
            this.toastService.success(`Respaldo descargado: ${r.nombreArchivo}`);
          } catch {
            this.loadingService.hide();
            this.toastService.error('Error al generar el respaldo');
          }
        },
      },

      // ─── Limpiar motivos duplicados ───────────────
      {
        id: 'accion-limpiar-duplicados',
        label: 'Limpiar motivos duplicados',
        descripcion: 'Elimina actividades con el mismo nombre',
        icono: 'content_copy',
        grupo: 'Acciones',
        tipo: 'accion',
        keywords: ['limpiar', 'duplicados', 'motivos', 'mantenimiento'],
        ejecutar: async () => {
          try {
            this.loadingService.show('Limpiando duplicados...');
            const eliminados = await this.backupService.limpiarMotivosDuplicados();
            this.loadingService.hide();
            if (eliminados > 0) {
              this.toastService.success(`${eliminados} motivos duplicados eliminados`);
            } else {
              this.toastService.info('No se encontraron motivos duplicados');
            }
          } catch {
            this.loadingService.hide();
            this.toastService.error('Error al limpiar duplicados');
          }
        },
      },

      // ─── Buscar actualización ─────────────────────
      {
        id: 'accion-buscar-actualizacion',
        label: 'Buscar actualizaciones de Stenbrary',
        descripcion: 'Consulta al servidor si hay versión nueva',
        icono: 'system_update',
        grupo: 'Acciones',
        tipo: 'accion',
        keywords: ['actualizar', 'update', 'version', 'nueva', 'instalar'],
        visible: () => this.pwaUpdateService.habilitado,
        ejecutar: async () => {
          try {
            const hay = await this.pwaUpdateService.buscarActualizacionAhora();
            if (hay) {
              this.toastService.success('Nueva versión encontrada — actualizando...');
              setTimeout(() => this.pwaUpdateService.aplicarActualizacion(), 800);
            } else {
              this.toastService.info('Ya tienes la versión más reciente');
            }
          } catch {
            this.toastService.error('No se pudo verificar actualizaciones');
          }
        },
      },

      // ─── Atajos a flujos del config ───────────────
      {
        id: 'accion-datos-prueba',
        label: 'Generar datos de prueba',
        descripcion: 'Abre la herramienta en Configuración → Datos',
        icono: 'science',
        grupo: 'Acciones',
        tipo: 'accion',
        keywords: ['datos', 'prueba', 'seed', 'generar', 'demo', 'test'],
        ejecutar: () => void this.router.navigateByUrl('/configuracion#datos'),
      },
      {
        id: 'accion-limpieza-rango',
        label: 'Eliminar registros por rango',
        descripcion: 'Abre la herramienta en Configuración → Datos',
        icono: 'delete_sweep',
        grupo: 'Acciones',
        tipo: 'accion',
        keywords: ['eliminar', 'limpiar', 'rango', 'fechas', 'masivo', 'registros'],
        ejecutar: () => void this.router.navigateByUrl('/configuracion#datos'),
      },
      {
        id: 'accion-restaurar-backup',
        label: 'Restaurar desde un archivo de respaldo',
        descripcion: 'Abre el flujo de import en Configuración → Datos',
        icono: 'cloud_upload',
        grupo: 'Acciones',
        tipo: 'accion',
        keywords: ['restaurar', 'importar', 'cargar', 'recuperar', 'json'],
        ejecutar: () => void this.router.navigateByUrl('/configuracion#datos'),
      },
    ];
  }
}
