// ╔══════════════════════════════════════════════════════╗
// ║  dashboard.component.ts                              ║
// ║  Stenbrary v3.21.0 — Resumen con insights            ║
// ║                                                      ║
// ║  CAMBIOS v3.21.0:                                    ║
// ║  - obtenerConteoTotal() en lugar de cargar TODO       ║
// ║  - Auto-refresh respeta document.visibilityState     ║
// ║  - Flag inFlight evita solapamiento de refreshes      ║
// ║  - Botón refresh manual no oculta el dashboard si    ║
// ║    ya hay datos (siempre silencioso)                  ║
// ║  - No muta Registro (usa spread)                      ║
// ║  - Map<nombre, Motivo> reemplaza .find() en loop     ║
// ║  - motivoIds[] múltiples se cuentan en actividades   ║
// ║  - Saludo se recalcula en cada cargarDatos           ║
// ║  - Comparativa vs ayer (delta de accesos)            ║
// ║  - Métricas: alumnos nuevos hoy, hora pico, inactivos║
// ║  - Banner unificado de alertas (respaldo, autoclose, ║
// ║    horario cerrado, BD error)                         ║
// ║  - nombreInstitucion visible en header               ║
// ║  - Empty state respeta modo quiosco                  ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../core/services/database.service';
import { AforoService } from '../../core/services/aforo.service';
import { ConfigService } from '../../core/services/config.service';
import { EstadisticasAvanzadasService } from '../../core/services/estadisticas-avanzadas.service';
import { BackupService } from '../../core/services/backup.service';
import { ToastService } from '../../core/services/toast.service';
import { Registro, Motivo } from '../../core/models';
import { verificarHorario } from '../../core/utils/horarios.utils';
import { logError } from '../../core/utils/logger';

const FMT_HORA_DASH = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

/** Registro extendido con la hora ya formateada para evitar funciones en CD. */
type RegistroDashboard = Registro & {
  _horaStr: string;
  _adentro: boolean;
};

interface QuickStat {
  icono: string;
  valor: number;
  etiqueta: string;
  subtexto: string;
  tooltip: string;
  color: string;
  ruta: string;
  /** Delta vs período anterior (porcentaje). Solo para "Accesos hoy". */
  delta?: { porcentaje: number; direccion: 'up' | 'down' | 'igual' };
}

interface ActividadHoy {
  motivoId?: string;
  nombre: string;
  icono: string;
  color: string;
  cantidad: number;
}

interface MiniStat {
  icono: string;
  valor: string | number;
  etiqueta: string;
  color: string;
  ruta?: string;
  tooltip: string;
}

type TipoAlerta = 'respaldo' | 'autoclose' | 'horario' | 'bd';
interface Alerta {
  tipo: TipoAlerta;
  icono: string;
  titulo: string;
  detalle: string;
  cta?: { texto: string; icono: string; accion: () => void };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy {

  cargando = true;

  // ─── Saludo dinámico ────────────────────────────────────
  saludo = '';

  // ─── Stats principales ──────────────────────────────────
  stats: QuickStat[] = [];

  // ─── Mini-stats (alumnos nuevos, hora pico, inactivos) ──
  miniStats: MiniStat[] = [];

  // ─── Actividades de hoy (top motivos) ───────────────────
  actividadesHoy: ActividadHoy[] = [];
  totalActividadesDistintas = 0;

  // ─── Últimos 5 registros (con hora pre-formateada) ──────
  ultimosRegistros: RegistroDashboard[] = [];

  // ─── Hora del último registro ───────────────────────────
  ultimoRegistroHora = '';

  // ─── Banner unificado de alertas ────────────────────────
  alertas: Alerta[] = [];
  private alertasDescartadasSesion = new Set<TipoAlerta>();

  // ─── Auto-refresh ───────────────────────────────────────
  autoRefreshActivo = true;
  actualizando = false;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly REFRESH_MS = 30_000;

  /** Evita que dos refreshes se solapen si uno tarda > REFRESH_MS. */
  private inFlight = false;

  /** Fecha (YYYY-MM-DD) usada en la última comparativa con "ayer", para detectar cambio de día. */
  private fechaAyerCacheada = '';
  private registrosAyerCount = 0;

  constructor(
    private databaseService: DatabaseService,
    public aforoService: AforoService,
    public configService: ConfigService,
    private estadisticasService: EstadisticasAvanzadasService,
    private backupService: BackupService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Estado interno del botón "Exportar" del banner — evita doble clic. */
  exportandoRespaldo = false;

  async exportarRespaldoDesdeBanner(): Promise<void> {
    if (this.exportandoRespaldo) return;
    this.exportandoRespaldo = true;
    this.cdr.markForCheck();
    try {
      const { nombreArchivo } = await this.backupService.descargarBackup();
      this.toastService.success(`Respaldo exportado: ${nombreArchivo}`);
      // La alerta desaparece sola: registrarRespaldoHecho actualizó el signal
      // y recordatorioRespaldoPendiente pasa a false en el próximo recálculo.
      this.alertas = this.calcularAlertas();
    } catch (error) {
      logError('Error al exportar backup desde dashboard:', error);
      this.toastService.error('No se pudo exportar el respaldo. Revisa la consola.');
    } finally {
      this.exportandoRespaldo = false;
      this.cdr.markForCheck();
    }
  }

  // ═══════════════════════════════════════════════
  // BANNER UNIFICADO DE ALERTAS
  // ═══════════════════════════════════════════════

  descartarAlerta(tipo: TipoAlerta): void {
    this.alertasDescartadasSesion.add(tipo);
    this.alertas = this.alertas.filter(a => a.tipo !== tipo);
    this.cdr.markForCheck();
  }

  private calcularAlertas(): Alerta[] {
    const lista: Alerta[] = [];
    const enQuiosco = this.configService.modoQuioscoSignal();

    // 1. Respaldo pendiente (oculto en quiosco)
    if (!enQuiosco && this.configService.recordatorioRespaldoPendiente) {
      void this.configService.ultimoRespaldoSignal();
      lista.push({
        tipo: 'respaldo',
        icono: 'cloud_off',
        titulo: 'Respaldo pendiente',
        detalle: this.textoRecordatorioRespaldo(),
        cta: {
          texto: 'Exportar',
          icono: 'download',
          accion: () => void this.exportarRespaldoDesdeBanner(),
        },
      });
    }

    // 2. Cierres automáticos pendientes de confirmación
    if (this.configService.hayAutoClose()) {
      lista.push({
        tipo: 'autoclose',
        icono: 'lock_clock',
        titulo: 'Cierres automáticos',
        detalle: 'Hay entradas cerradas por el sistema. Revísalas y confírmalas.',
        cta: {
          texto: 'Ver',
          icono: 'arrow_forward',
          accion: () => this.router.navigate(['/presencia']),
        },
      });
    }

    // 3. Horario cerrado (solo si horarios están activos)
    if (this.configService.horarioActivo) {
      const v = verificarHorario(new Date(), this.configService.horarios);
      if (!v.abierto && v.mensaje) {
        lista.push({
          tipo: 'horario',
          icono: 'do_not_disturb_on',
          titulo: 'Biblioteca cerrada',
          detalle: v.proximaApertura ? `${v.mensaje} Abre ${v.proximaApertura}.` : v.mensaje,
        });
      }
    }

    // 4. Error de BD
    const bdErr = this.databaseService.bdError();
    if (bdErr) {
      lista.push({
        tipo: 'bd',
        icono: 'error',
        titulo: 'Problema con la base de datos',
        detalle: bdErr,
      });
    }

    return lista.filter(a => !this.alertasDescartadasSesion.has(a.tipo));
  }

  private textoRecordatorioRespaldo(): string {
    const dias = this.configService.diasSinRespaldo();
    if (dias === null) return 'Aún no has hecho ningún respaldo. Exporta tus datos para evitar pérdidas.';
    if (dias === 0)   return 'Hoy no has respaldado. Exporta tus datos antes de cerrar la sesión.';
    if (dias === 1)   return 'Hace 1 día sin respaldar. Exporta tus datos para evitar pérdidas.';
    return `Hace ${dias} días sin respaldar. Exporta tus datos para evitar pérdidas.`;
  }

  // ═══════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════

  async ngOnInit(): Promise<void> {
    this.generarSaludo();
    await this.cargarDatos();
    this.iniciarAutoRefresh();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // ═══════════════════════════════════════════════
  // SALUDO DINÁMICO
  // ═══════════════════════════════════════════════

  private generarSaludo(): void {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) this.saludo = 'Buenos días';
    else if (hora >= 12 && hora < 18) this.saludo = 'Buenas tardes';
    else this.saludo = 'Buenas noches';
  }

  get institucion(): string {
    return this.configService.nombreInstitucion;
  }

  // ═══════════════════════════════════════════════
  // AUTO-REFRESH (respeta visibilitychange)
  // ═══════════════════════════════════════════════

  toggleAutoRefresh(): void {
    this.autoRefreshActivo = !this.autoRefreshActivo;
    if (this.autoRefreshActivo) this.iniciarAutoRefresh();
    else this.detenerAutoRefresh();
  }

  private iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    if (!this.autoRefreshActivo) return;
    if (document.hidden) return; // no arrancar si la pestaña está oculta

    this.refreshInterval = setInterval(() => {
      if (document.hidden) return;
      void this.cargarDatos(true);
    }, this.REFRESH_MS);
  }

  private detenerAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.detenerAutoRefresh();
      return;
    }
    if (this.autoRefreshActivo) {
      void this.cargarDatos(true);
      this.iniciarAutoRefresh();
    }
  };

  // ═══════════════════════════════════════════════
  // CARGA DE DATOS
  // ═══════════════════════════════════════════════

  /** Acción del botón refresh: siempre silencioso si ya hay datos cargados. */
  refrescarManual(): void {
    void this.cargarDatos(!this.cargando);
  }

  async cargarDatos(silencioso = false): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = true;

    try {
      if (!silencioso) this.cargando = true;
      else this.actualizando = true;

      this.generarSaludo();

      const [alumnos, registrosHoy, conteo, motivos] = await Promise.all([
        this.databaseService.obtenerTodosLosAlumnos(),
        this.databaseService.obtenerRegistrosDeHoy(),
        this.databaseService.obtenerConteoTotal(),
        this.databaseService.obtenerMotivosActivos(),
      ]);

      // Refrescar aforo en paralelo (no bloquea)
      if (this.aforoService.activo()) {
        void this.aforoService.refrescar();
      }

      // Map motivo-por-nombre para O(1) en agrupación
      const motivosPorNombre = new Map<string, Motivo>(
        motivos.map(m => [m.nombre, m]),
      );

      // Comparativa vs ayer (cargada solo si cambió la fecha)
      const hoyKey = this.fechaKey(new Date());
      if (this.fechaAyerCacheada !== hoyKey) {
        try {
          const ayer = new Date();
          ayer.setDate(ayer.getDate() - 1);
          const regsAyer = await this.databaseService.obtenerRegistrosPorFecha(ayer);
          this.registrosAyerCount = regsAyer.length;
          this.fechaAyerCacheada = hoyKey;
        } catch {
          this.registrosAyerCount = 0;
        }
      }

      // ─── Stats principales con delta en "Accesos hoy" ─
      this.stats = [
        {
          icono: 'today',
          valor: registrosHoy.length,
          etiqueta: 'Accesos hoy',
          subtexto: 'entradas registradas hoy',
          tooltip: 'Cuántos alumnos han ingresado a la biblioteca el día de hoy. Se reinicia a medianoche.',
          color: '#00C8D7',
          ruta: '/registros',
          delta: this.calcularDelta(registrosHoy.length, this.registrosAyerCount),
        },
        {
          icono: 'groups',
          valor: alumnos.length,
          etiqueta: 'Alumnos registrados',
          subtexto: 'en el sistema',
          tooltip: 'Total de alumnos dados de alta en el sistema. Puedes agregar más en "Registrar Alumno" o importar desde Excel.',
          color: '#0BC4B7',
          ruta: '/alumnos',
        },
        {
          icono: 'history',
          valor: conteo.registros,
          etiqueta: 'Visitas en total',
          subtexto: 'desde el inicio del sistema',
          tooltip: 'Número acumulado de accesos desde que se instaló el sistema. Incluye todos los días.',
          color: '#5DE4EC',
          ruta: '/registros',
        },
        {
          icono: 'category',
          valor: motivos.length,
          etiqueta: 'Tipos de actividad',
          subtexto: 'opciones de registro',
          tooltip: 'Actividades disponibles para que los alumnos elijan al ingresar. Gestiónalas en "Gestión de Motivos".',
          color: '#F5A623',
          ruta: '/gestion-motivos',
        },
      ];

      // ─── Mini-stats: nuevos hoy / hora pico / inactivos ─
      this.miniStats = this.calcularMiniStats(alumnos, registrosHoy);

      // ─── Actividades de hoy (agrupar por motivo, soporta motivoIds[]) ─
      const porMotivo = new Map<string, { cantidad: number; icono: string; color: string; motivoId?: string }>();
      for (const r of registrosHoy) {
        // v3.7+: registros multi-motivo. Si motivoNombres está, usarlos todos;
        // si no, caer al motivoNombre principal (retrocompat).
        const nombres = (r.motivoNombres && r.motivoNombres.length > 0)
          ? r.motivoNombres
          : [r.motivoNombre];

        for (const nombre of nombres) {
          if (!nombre) continue;
          const existente = porMotivo.get(nombre);
          if (existente) {
            existente.cantidad++;
          } else {
            const m = motivosPorNombre.get(nombre);
            porMotivo.set(nombre, {
              cantidad: 1,
              icono: m?.icono || 'label',
              color: m?.color || '#00C8D7',
              motivoId: m?.id,
            });
          }
        }
      }

      const todasActividades = Array.from(porMotivo.entries())
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad);
      this.totalActividadesDistintas = todasActividades.length;
      this.actividadesHoy = todasActividades.slice(0, 6);

      // ─── Últimos 5 registros (spread, no mutación) ────
      const ordenados = [...registrosHoy]
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
        .slice(0, 5);
      this.ultimosRegistros = ordenados.map(r => ({
        ...r,
        _horaStr: FMT_HORA_DASH.format(new Date(r.fechaHora)),
        _adentro: !r.horaSalida,
      }));

      this.ultimoRegistroHora = this.ultimosRegistros[0]?._horaStr ?? '';

      // ─── Banner unificado ─────────────────────────────
      this.alertas = this.calcularAlertas();

      this.cargando = false;
      this.actualizando = false;
      this.cdr.markForCheck();
    } catch (error) {
      logError('Error al cargar dashboard:', error);
      this.cargando = false;
      this.actualizando = false;
      this.cdr.markForCheck();
    } finally {
      this.inFlight = false;
    }
  }

  private calcularDelta(actual: number, anterior: number): QuickStat['delta'] {
    if (anterior === 0 && actual === 0) return { porcentaje: 0, direccion: 'igual' };
    if (anterior === 0) return { porcentaje: 100, direccion: 'up' };
    const pct = Math.round(((actual - anterior) / anterior) * 100);
    let direccion: 'up' | 'down' | 'igual' = 'igual';
    if (pct > 0) direccion = 'up';
    else if (pct < 0) direccion = 'down';
    return { porcentaje: Math.abs(pct), direccion };
  }

  private calcularMiniStats(alumnos: { fechaRegistro: Date }[], registrosHoy: Registro[]): MiniStat[] {
    const mini: MiniStat[] = [];

    // 1. Alumnos nuevos hoy
    const hoyKey = this.fechaKey(new Date());
    const nuevos = alumnos.filter(a => {
      if (!a.fechaRegistro) return false;
      return this.fechaKey(new Date(a.fechaRegistro)) === hoyKey;
    }).length;
    if (nuevos > 0) {
      mini.push({
        icono: 'person_add',
        valor: nuevos,
        etiqueta: nuevos === 1 ? 'alumno nuevo hoy' : 'alumnos nuevos hoy',
        color: '#0BC4B7',
        ruta: '/alumnos',
        tooltip: 'Alumnos dados de alta en el sistema el día de hoy.',
      });
    }

    // 2. Hora pico de hoy
    if (registrosHoy.length > 0) {
      const pico = this.estadisticasService.calcularHoraPicoEnRango(registrosHoy);
      if (pico) {
        const h = pico.hora;
        const rango = `${this.pad2(h)}:00–${this.pad2((h + 1) % 24)}:00`;
        mini.push({
          icono: 'trending_up',
          valor: rango,
          etiqueta: `hora pico (${pico.cantidad} ${pico.cantidad === 1 ? 'acceso' : 'accesos'})`,
          color: '#F5A623',
          tooltip: 'Franja horaria con más entradas registradas hoy.',
        });
      }
    }

    return mini;
  }

  private fechaKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  private pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  // ═══════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════

  get permiteCtaActividades(): boolean {
    // En quiosco solo el flujo operativo es accesible; el CTA al scanner sigue siendo válido.
    // Si hubiéramos puesto otros CTA (importar, etc.) los gatearíamos aquí.
    return true;
  }

  // ═══════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════

  navegar(ruta: string, queryParams?: Record<string, string>): void {
    void this.router.navigate([ruta], queryParams ? { queryParams } : undefined);
  }

  navegarActividad(a: ActividadHoy): void {
    if (!a.nombre) return;
    void this.router.navigate(['/registros'], { queryParams: { motivo: a.nombre } });
  }
}
