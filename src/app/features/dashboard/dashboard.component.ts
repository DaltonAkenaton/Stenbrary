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

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
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
import { contarHastaMismaHora } from '../../core/utils/tiempo.utils';
import { contarMotivos } from '../../core/utils/estadisticas.utils';
import { diaInhabilEn } from '../../core/utils/calendario.utils';
import { esMatriculaPrueba } from '../../core/utils/datos-prueba.utils';

const FMT_HORA_DASH = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

/** Registro extendido con la hora ya formateada para evitar funciones en CD. */
type RegistroDashboard = Registro & {
  _horaStr: string;
  _adentro: boolean;
  _motivosStr: string;
};

interface QuickStat {
  icono: string;
  valor: number;
  etiqueta: string;
  subtexto: string;
  tooltip: string;
  color: string;
  ruta: string;
  /** Delta vs período anterior. Solo para "Accesos hoy". */
  delta?: {
    porcentaje: number;
    direccion: 'up' | 'down' | 'igual';
    /** Texto corto para el tooltip: "vs lunes pasado" / "vs ayer". */
    referencia: string;
    /** Valor crudo del período comparado, para mostrar en hover. */
    valorReferencia: number;
  };
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

interface HoraFlujo {
  /** 0–23 */
  hora: number;
  count: number;
  /** % del máximo de la serie, 0–100. Define la altura visual de la barra. */
  alturaPct: number;
  /** true si es la hora con más visitas. Se pinta diferente. */
  esPico: boolean;
  /** Hora formateada para mostrar: "07h", "14h". */
  label: string;
  /** Tooltip largo para hover. */
  tooltip: string;
}

/** Tono visual del insight — pinta el icono y el borde. */
type InsightTono = 'positivo' | 'neutro' | 'alerta';

interface InsightDia {
  texto: string;
  icono: string;
  tono: InsightTono;
}

type TipoAlerta = 'respaldo' | 'autoclose' | 'horario' | 'bd' | 'prueba';
interface Alerta {
  tipo: TipoAlerta;
  icono: string;
  titulo: string;
  detalle: string;
  cta?: { texto: string; icono: string; accion: () => void };
}

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private databaseService = inject(DatabaseService);
  aforoService = inject(AforoService);
  configService = inject(ConfigService);
  private estadisticasService = inject(EstadisticasAvanzadasService);
  private backupService = inject(BackupService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);


  cargando = true;

  // ─── Saludo dinámico ────────────────────────────────────
  saludo = '';

  // ─── Stats principales ──────────────────────────────────
  stats: QuickStat[] = [];

  // ─── Mini-stats (alumnos nuevos, hora pico, inactivos) ──
  miniStats: MiniStat[] = [];

  // ─── Flujo del día (mini-chart de barras por hora) ──────
  flujoDia: HoraFlujo[] = [];
  flujoDiaTotal = 0;
  flujoDiaPicoHora: number | null = null;

  // ─── Insight automático del día ─────────────────────────
  insightDia: InsightDia | null = null;

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

  /** Fecha (YYYY-MM-DD) usada en la última comparativa, para detectar cambio de día. */
  private fechaComparativaCacheada = '';
  /** Horas de entrada del mismo día de la semana pasada (referencia principal). */
  private fechasSemanaPasada: Date[] = [];
  /** Horas de entrada de ayer (fallback si la semana pasada no tiene datos). */
  private fechasAyer: Date[] = [];

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

  /** Alumnos de "Datos de prueba" en el padrón (se cuenta al cargar). */
  private alumnosDePrueba = 0;

  private calcularAlertas(): Alerta[] {
    const lista: Alerta[] = [];
    const enQuiosco = this.configService.modoQuioscoSignal();

    // 0. Datos de prueba mezclados con los reales (O13): todas las cifras
    //    los incluyen hasta que se limpian. Oculto en quiosco.
    if (!enQuiosco && this.alumnosDePrueba > 0) {
      lista.push({
        tipo: 'prueba',
        icono: 'science',
        titulo: 'Hay datos de prueba',
        detalle: `${this.alumnosDePrueba} alumnos de prueba y sus visitas se cuentan en todas las cifras. Quítalos cuando termines de probar.`,
        cta: {
          texto: 'Ir a limpiar',
          icono: 'arrow_forward',
          accion: () => this.router.navigate(['/configuracion'], { fragment: 'datos' }),
        },
      });
    }

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

      this.alumnosDePrueba = alumnos.filter(a => esMatriculaPrueba(a.matricula)).length;

      // Refrescar aforo en paralelo (no bloquea)
      if (this.aforoService.activo()) {
        void this.aforoService.refrescar();
      }

      // Map motivo-por-nombre para O(1) en agrupación
      const motivosPorNombre = new Map<string, Motivo>(
        motivos.map(m => [m.nombre, m]),
      );

      // Comparativa vs MISMO DÍA de la semana pasada (referencia principal).
      // Fallback a "ayer" si la semana pasada no tiene datos (sistema reciente).
      // Solo se recarga al cambiar de día — los conteos históricos son inmutables.
      const hoyKey = this.fechaKey(new Date());
      if (this.fechaComparativaCacheada !== hoyKey) {
        try {
          const semanaPasada = new Date();
          semanaPasada.setDate(semanaPasada.getDate() - 7);
          const ayer = new Date();
          ayer.setDate(ayer.getDate() - 1);
          const [regsSemana, regsAyer] = await Promise.all([
            this.databaseService.obtenerRegistrosPorFecha(semanaPasada),
            this.databaseService.obtenerRegistrosPorFecha(ayer),
          ]);
          this.fechasSemanaPasada = regsSemana.map(r => new Date(r.fechaHora));
          this.fechasAyer = regsAyer.map(r => new Date(r.fechaHora));
          this.fechaComparativaCacheada = hoyKey;
        } catch {
          this.fechasSemanaPasada = [];
          this.fechasAyer = [];
        }
      }

      // ─── Stats principales con delta en "Accesos hoy" ─
      this.stats = [
        {
          icono: 'today',
          valor: registrosHoy.length,
          etiqueta: 'Accesos hoy',
          subtexto: 'entradas registradas hoy',
          tooltip: 'Visitas registradas hoy (alumnos e invitados; si alguien entra dos veces, cuenta dos). Se reinicia a medianoche.',
          color: '#00C8D7',
          ruta: '/registros',
          delta: this.calcularDeltaComparativa(registrosHoy.length),
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
          tooltip: 'Actividades disponibles para que los alumnos elijan al ingresar. Gestiónalas en "Gestión de Actividades".',
          color: '#F5A623',
          ruta: '/gestion-motivos',
        },
      ];

      // ─── Mini-stats: nuevos hoy / hora pico / inactivos ─
      this.miniStats = this.calcularMiniStats(alumnos, registrosHoy);

      // ─── Flujo del día (barras por hora) ─────────────
      this.calcularFlujoDia(registrosHoy);

      // ─── Insight automático del día ──────────────────
      this.insightDia = this.calcularInsightDia(registrosHoy);

      // ─── Actividades de hoy ─────────────────────────
      // Misma cuenta que Estadísticas (P2): cada motivo de una visita suma,
      // agrupado por id con el nombre actual del catálogo.
      const todasActividades = contarMotivos(registrosHoy, motivos).map(c => {
        const m = motivosPorNombre.get(c.nombre);
        return {
          nombre: c.nombre,
          cantidad: c.cantidad,
          icono: m?.icono || 'label',
          color: c.color || m?.color || '#00C8D7',
          motivoId: m?.id,
        };
      });
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
        // Todas las actividades de la visita (P2), no solo la principal.
        _motivosStr: (r.motivoNombres?.length ? r.motivoNombres : [r.motivoNombre]).join(', '),
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

  /**
   * Calcula el delta vs la mejor referencia disponible, AL MISMO AVANCE:
   * lo que va de hoy contra lo que llevaba el día de referencia a esta
   * misma hora. Antes se comparaba contra el día de referencia completo y
   * a media mañana salía "↓ 75 %" casi siempre (auditoría 2026-10, R5).
   * - Si la semana pasada tuvo datos, compara vs ese mismo día (lunes vs
   *   lunes elimina la estacionalidad semanal).
   * - Si no, cae a "ayer" (sistema nuevo o semana atípica).
   * - Si la referencia a esta hora es 0, no hay base para un porcentaje y no
   *   se muestra delta (antes salía un "+100 %" inventado).
   */
  private calcularDeltaComparativa(actual: number): QuickStat['delta'] {
    const usarSemana = this.fechasSemanaPasada.length > 0;
    const referenciaValor = contarHastaMismaHora(usarSemana ? this.fechasSemanaPasada : this.fechasAyer);
    const nombreDia = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date().getDay()];
    const referenciaTexto = usarSemana ? `vs ${nombreDia} pasado a esta hora` : 'vs ayer a esta hora';

    if (referenciaValor === 0) return undefined;

    const pct = Math.round(((actual - referenciaValor) / referenciaValor) * 100);
    let direccion: 'up' | 'down' | 'igual' = 'igual';
    if (pct > 0) direccion = 'up';
    else if (pct < 0) direccion = 'down';
    return {
      porcentaje: Math.abs(pct),
      direccion,
      referencia: referenciaTexto,
      valorReferencia: referenciaValor,
    };
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
        // "Dados de alta", no "nuevos": el día que se importa el padrón son
        // miles y "3000 alumnos nuevos hoy" se lee como que vinieron.
        etiqueta: nuevos === 1 ? 'alumno dado de alta hoy' : 'alumnos dados de alta hoy',
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

  /**
   * Calcula el flujo del día (visitas por hora) para el mini-chart.
   *
   * Rango visible: respeta el horario de operación configurado para el día
   * actual; si no hay horario activo, usa 7–22 como ventana razonable.
   * En cualquier caso, expande la ventana para incluir cualquier hora con
   * registros (un alumno entró antes de abrir, por ejemplo).
   */
  private calcularFlujoDia(registrosHoy: Registro[]): void {
    if (registrosHoy.length === 0) {
      this.flujoDia = [];
      this.flujoDiaTotal = 0;
      this.flujoDiaPicoHora = null;
      return;
    }

    // Contar registros por hora
    const counts = new Array<number>(24).fill(0);
    for (const r of registrosHoy) {
      const h = new Date(r.fechaHora).getHours();
      counts[h]++;
    }

    // Determinar rango visible
    let minHora = 7;
    let maxHora = 22;
    const diaHoy = new Date().getDay();
    if (this.configService.horarioActivo) {
      const horario = this.configService.horarios[diaHoy];
      if (horario && !horario.cerrado) {
        const [hAp] = horario.apertura.split(':').map(Number);
        const [hCi] = horario.cierre.split(':').map(Number);
        if (!isNaN(hAp)) minHora = hAp;
        if (!isNaN(hCi)) maxHora = Math.max(hCi, hAp);
      }
    }
    // Expandir si hay registros fuera del horario configurado
    for (let h = 0; h < 24; h++) {
      if (counts[h] > 0) {
        if (h < minHora) minHora = h;
        if (h > maxHora) maxHora = h;
      }
    }

    const max = Math.max(...counts);
    const picoHora = counts.indexOf(max);

    const flujo: HoraFlujo[] = [];
    for (let h = minHora; h <= maxHora; h++) {
      const c = counts[h];
      const alturaPct = max > 0 ? Math.round((c / max) * 100) : 0;
      const horaStr = this.pad2(h);
      flujo.push({
        hora: h,
        count: c,
        alturaPct,
        esPico: c > 0 && h === picoHora,
        label: `${horaStr}h`,
        tooltip: c === 0
          ? `${horaStr}:00 — sin registros`
          : `${horaStr}:00 — ${c} ${c === 1 ? 'acceso' : 'accesos'}`,
      });
    }

    this.flujoDia = flujo;
    this.flujoDiaTotal = registrosHoy.length;
    this.flujoDiaPicoHora = max > 0 ? picoHora : null;
  }

  /**
   * Detecta el patrón más interesante del día y lo expresa en una frase corta.
   *
   * Sistema de reglas en orden de prioridad — se muestra la PRIMERA que
   * aplica. La idea es no abrumar: una sola observación, la más relevante.
   *
   * Si en el futuro queremos rotar entre varios insights del mismo día,
   * convertir esto en un array y agregar un timer en el template.
   */
  private calcularInsightDia(registrosHoy: Registro[]): InsightDia | null {
    const ahora = new Date();
    const horaActual = ahora.getHours();

    // ─── Regla 0: día inhábil del calendario escolar ─
    // Un festivo sin registros es lo esperado: no hay que alarmar con
    // "verifica el escáner". Se captura en Configuración → Calendario escolar.
    const inhabil = diaInhabilEn(this.configService.calendarioEscolar, ahora);
    if (inhabil && registrosHoy.length === 0) {
      return {
        texto: `Hoy es día inhábil${inhabil.descripcion ? ` (${inhabil.descripcion})` : ''} — sin registros es lo normal.`,
        icono: 'event_busy',
        tono: 'neutro',
      };
    }

    // Ventana de operación de HOY: la del horario configurado si está activo;
    // si no, 8–20 como referencia. Antes era siempre 8–20 (M8).
    const ventana = this.ventanaOperacionHoy(ahora);

    // ─── Regla 1: sin registros aún (alerta si ya pasó la apertura) ─
    if (registrosHoy.length === 0) {
      if (ventana === null) {
        return {
          texto: 'Hoy la biblioteca no abre según el horario configurado.',
          icono: 'event_busy',
          tono: 'neutro',
        };
      }
      // Antes de abrir (y en la primera hora) es normal no tener registros.
      if (horaActual < ventana.apertura + 1) {
        return {
          texto: 'Aún sin registros — la biblioteca todavía no abre.',
          icono: 'bedtime',
          tono: 'neutro',
        };
      }
      if (horaActual >= ventana.cierre) {
        return {
          texto: 'Hoy no hubo registros.',
          icono: 'bedtime',
          tono: 'neutro',
        };
      }
      return {
        texto: `Sin registros hasta ahora (${this.pad2(horaActual)}h) — verifica que el escáner esté operando.`,
        icono: 'report_problem',
        tono: 'alerta',
      };
    }

    // ─── Regla 2: día atípico vs semana pasada (>30% diferencia) ─
    // Al mismo avance del día (ver calcularDeltaComparativa). Con menos de
    // 10 accesos de referencia el porcentaje es ruido (2 vs 3 = "+50 %").
    const refSemana = contarHastaMismaHora(this.fechasSemanaPasada, ahora);
    // Solo con esta comparación hecha (y dentro de ±30 %) se puede decir
    // "día dentro de lo normal". Antes la frase salía por defecto: con 7
    // accesos contra 0 del viernes pasado decía "normal" sin medir nada.
    const comparadoConSemanaPasada = refSemana >= 10;
    if (comparadoConSemanaPasada) {
      const pctDif = Math.round(((registrosHoy.length - refSemana) / refSemana) * 100);
      const nombreDia = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][ahora.getDay()];

      if (pctDif >= 30) {
        return {
          texto: `Día activo: ${pctDif}% más accesos que el ${nombreDia} pasado a esta hora.`,
          icono: 'trending_up',
          tono: 'positivo',
        };
      }
      if (pctDif <= -30) {
        return {
          texto: `Día tranquilo: ${Math.abs(pctDif)}% menos accesos que el ${nombreDia} pasado a esta hora.`,
          icono: 'trending_down',
          tono: 'neutro',
        };
      }
    }

    // ─── Regla 3: alta concentración temporal (>60% en 2 horas) ─
    if (this.flujoDia.length > 0 && registrosHoy.length >= 10) {
      // counts ordenados desc
      const top2 = [...this.flujoDia]
        .sort((a, b) => b.count - a.count)
        .slice(0, 2);
      const sumaTop2 = top2[0].count + (top2[1]?.count ?? 0);
      const pctConcentracion = Math.round((sumaTop2 / registrosHoy.length) * 100);
      if (pctConcentracion >= 60) {
        const h1 = Math.min(top2[0].hora, top2[1]?.hora ?? top2[0].hora);
        const h2 = Math.max(top2[0].hora, top2[1]?.hora ?? top2[0].hora);
        // Solo se habla de un rango si las dos horas son seguidas; si no,
        // "entre 9 y 14 h" sugería un bloque continuo que no existe (M9).
        const cuando = h2 - h1 <= 1
          ? `entre ${this.pad2(h1)} y ${this.pad2(h2 + 1)}h`
          : `a las ${this.pad2(h1)}h y a las ${this.pad2(h2)}h`;
        return {
          texto: `Actividad muy concentrada: ${pctConcentracion}% de los accesos ${cuando}.`,
          icono: 'bolt',
          tono: 'neutro',
        };
      }
    }

    // ─── Regla 4: muchos invitados (>30%) ─
    const invitados = registrosHoy.filter(r => r.matricula === 'INVITADO').length;
    const pctInvitados = Math.round((invitados / registrosHoy.length) * 100);
    if (invitados >= 5 && pctInvitados >= 30) {
      return {
        texto: `Día con muchos visitantes: ${pctInvitados}% de los accesos son invitados (${invitados} de ${registrosHoy.length}).`,
        icono: 'person_outline',
        tono: 'neutro',
      };
    }

    // ─── Regla 5: actividad sin pausas largas ─
    // Último registro hace > 2 horas en horario operativo (8am–8pm)
    if (ventana && horaActual >= ventana.apertura && horaActual < ventana.cierre && this.ultimoRegistroHora) {
      const ultimoReg = this.ultimosRegistros[0];
      if (ultimoReg) {
        const minutosDesde = Math.floor((ahora.getTime() - new Date(ultimoReg.fechaHora).getTime()) / 60000);
        if (minutosDesde >= 120) {
          const horas = Math.floor(minutosDesde / 60);
          return {
            texto: `Sin nuevos accesos desde las ${this.ultimoRegistroHora} (hace ${horas}h ${minutosDesde % 60}m).`,
            icono: 'pause_circle',
            tono: 'neutro',
          };
        }
      }
    }

    // ─── Regla 6: hora pico identificada (positivo si ya pasó) ─
    if (this.flujoDiaPicoHora !== null && horaActual > this.flujoDiaPicoHora) {
      const picoCount = this.flujoDia.find(h => h.hora === this.flujoDiaPicoHora)?.count ?? 0;
      if (picoCount >= 5) {
        return {
          texto: `Hora pico del día: ${this.pad2(this.flujoDiaPicoHora)}–${this.pad2(this.flujoDiaPicoHora + 1)}h (${picoCount} accesos).`,
          icono: 'whatshot',
          tono: 'positivo',
        };
      }
    }

    // ─── Regla 7 (default): resumen; "normal" solo si se comparó (regla 2) ─
    return {
      texto: `${registrosHoy.length} ${registrosHoy.length === 1 ? 'acceso registrado' : 'accesos registrados'} hasta ahora` +
        (comparadoConSemanaPasada ? ' — día dentro de lo normal.' : '.'),
      icono: 'check_circle',
      tono: 'positivo',
    };
  }

  /**
   * Horas de apertura y cierre de hoy. Con horario activo, las del día
   * (`null` si hoy está cerrado); sin horario, 8–20 como referencia.
   */
  private ventanaOperacionHoy(ahora: Date): { apertura: number; cierre: number } | null {
    if (!this.configService.horarioActivo) return { apertura: 8, cierre: 20 };
    const h = this.configService.horarios[ahora.getDay()];
    if (!h || h.cerrado) return null;
    const apertura = Number(h.apertura.split(':')[0]);
    const cierre = Number(h.cierre.split(':')[0]);
    if (!Number.isFinite(apertura) || !Number.isFinite(cierre)) return { apertura: 8, cierre: 20 };
    return { apertura, cierre };
  }

  // ═══════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════

  // Se queda como getter aunque hoy devuelva una constante: es el punto por
  // donde entrará la lógica de permisos cuando haya roles (Fase 2.3 en
  // docs/ROADMAP.md). Convertirlo en un campo `readonly`, que es lo que pide
  // la regla, borraría esa intención del código.
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
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
