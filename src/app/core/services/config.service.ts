// ╔══════════════════════════════════════════════════════╗
// ║  config.service.ts                                   ║
// ║  Stenbrary v3.23.0 — Zoom default + preferencia cám  ║
// ║                                                      ║
// ║  Persiste ajustes en localStorage.                   ║
// ║  Gestiona, entre otros:                              ║
// ║  - zoomScannerDefault (1×–3×) y camaraPreferida      ║
// ║    (auto/environment/user) (v3.23)                   ║
// ║  - registroSalidaActivo / horasAutoSalida            ║
// ║  - nombreInstitucion / umbralDuplicadoMin            ║
// ║  - aforoMaximo / aforoModo                           ║
// ║  - modoQuiosco / quioscoPin                          ║
// ║  - horarioActivo / horarios / horarioModo            ║
// ║  - celebracionActiva / celebracionProbabilidad       ║
// ║  - umbralInactividadDias                             ║
// ║  - escaner* (velocidad/cooldown/saltar/beep)         ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, signal } from '@angular/core';
import { CalendarioEscolar, calendarioInicial } from '../utils/calendario.utils';
import { esHashPin } from '../utils/pin-hash.utils';

/** PBKDF2 de "0000" (600 000 iteraciones, sal aleatoria fija para el valor de fábrica). */
const PIN_FABRICA_HASH = 'pbkdf2-sha256$600000$VPmxMf9tIzImMOBepPDn8g==$SgjdGIcMpwNrPLU9ejdduEAITtBVPPcUObhWAXsLlaQ=';
import { CatalogoEscolar, catalogoInicial, copiarCatalogo, normalizarCatalogo } from '../utils/catalogos.utils';

/**
 * Modos de control de aforo:
 * - 'permitir': solo alerta visual/sonora, no bloquea (default)
 * - 'confirmar': bloquea con dialog de confirmación (override manual)
 * - 'bloquear': bloqueo duro, no permite registrar más entradas
 */
export type AforoModo = 'permitir' | 'confirmar' | 'bloquear';

/**
 * Modos de horario de operación:
 * - 'advertir': muestra toast de advertencia pero permite registrar
 * - 'bloquear': bloquea el registro fuera de horario
 */
export type HorarioModo = 'advertir' | 'bloquear';

/**
 * Modo de disparo del recordatorio de respaldo:
 * - 'intervalo': dispara cuando han pasado N días desde el último respaldo
 * - 'programado': dispara en días de semana específicos a una hora específica
 */
export type RecordatorioRespaldoModo = 'intervalo' | 'programado';

/**
 * Preferencia de cámara para el scanner:
 * - 'auto': sin preferencia (deja que el navegador escoja la primera disponible)
 * - 'environment': cámara trasera (móvil) — comportamiento histórico por defecto
 * - 'user': cámara frontal/selfie
 *
 * Si la cámara preferida no existe, el navegador hace fallback automático.
 */
export type CamaraPreferida = 'auto' | 'environment' | 'user';

/**
 * Horario de un día de la semana.
 * `cerrado=true` significa que la biblioteca no opera ese día.
 * `apertura`/`cierre` en formato 'HH:mm' 24h.
 */
export interface HorarioDia {
  cerrado: boolean;
  apertura: string;
  cierre: string;
}

/** Mapa por día de la semana: 0=domingo, 1=lunes, ..., 6=sábado */
export type HorariosSemana = Record<number, HorarioDia>;

const DEFAULT_HORARIOS: HorariosSemana = {
  0: { cerrado: true,  apertura: '09:00', cierre: '14:00' },
  1: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  2: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  3: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  4: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  5: { cerrado: false, apertura: '07:00', cierre: '20:00' },
  6: { cerrado: true,  apertura: '09:00', cierre: '14:00' },
};

interface AppConfig {
  registroSalidaActivo: boolean;
  horasAutoSalida: number;
  nombreInstitucion: string;
  /** Nombre de este equipo para la bitácora ("Puerta", "Oficina"). v3.52.0. */
  nombreEquipo: string;
  umbralDuplicadoMin: number;
  aforoMaximo: number;
  aforoModo: AforoModo;

  // ── Modo quiosco (v3.9.0) ──
  modoQuiosco: boolean;
  /**
   * PIN de 4–6 dígitos: sale del quiosco y autoriza borrados (v3.57.0).
   * Vacío = sin PIN (peligroso). Desde v3.62.0 se guarda su hash
   * (pin-hash.utils); un valor en texto plano es de una instalación vieja
   * y `PinService.migrar` lo convierte al arrancar.
   */
  quioscoPin: string;
  /** Dígitos del PIN, para mostrarlo sin guardarlo ("PIN de 4 dígitos", v3.62.0). */
  quioscoPinLargo: number;
  /** Sigue el PIN de fábrica (0000): Configuración pide cambiarlo (v3.62.0). */
  quioscoPinDeFabrica: boolean;
  /** Hash del código para reponer el PIN olvidado (v3.57.0). Vacío = no se ha generado. */
  quioscoCodigoRecuperacion: string;
  /** Minutos sin uso para volver solo al modo quiosco. 0 = apagado (v3.49.0). */
  quioscoAutoMinutos: number;

  // ── Horarios de operación (v3.9.0) ──
  horarioActivo: boolean;
  horarios: HorariosSemana;
  horarioModo: HorarioModo;

  // ── Animación celebratoria aleatoria (v3.9.0) ──
  celebracionActiva: boolean;
  /** Probabilidad 0-1 de mostrar animación al registrar. Default 0.08 (8%). */
  celebracionProbabilidad: number;

  // ── Animación de éxito al registrar (v3.20) ──
  /** Duración en ms de la pantalla de éxito antes de redirigir al scanner.
   *  El usuario puede tocar la pantalla para saltar a scanner antes. */
  tiempoExitoMs: number;

  // ── Alertas de inactividad (v3.10.0) ──
  /** Umbral de días sin venir para considerar a un alumno "inactivo". 0 = desactivado. */
  umbralInactividadDias: number;

  // ── Recordatorio de respaldo (v3.11.0 + extensión v3.21) ──
  /** Días sin exportar respaldo para mostrar recordatorio. 0 = desactivado. */
  umbralRecordatorioRespaldoDias: number;
  /** Timestamp (ms) del último respaldo exportado. 0 = nunca. */
  ultimoRespaldoTs: number;
  /** Modo de disparo: intervalo (cada N días) o programado (día(s)+hora). */
  recordatorioRespaldoModo: RecordatorioRespaldoModo;
  /** Hora 'HH:mm' a partir de la cual aparece el recordatorio en modo programado. */
  recordatorioRespaldoHora: string;
  /** Días de la semana (0=domingo..6=sábado) en modo programado. Vacío = nunca. */
  recordatorioRespaldoDiasSemana: number[];

  // ── Escáner customizable (v3.21) ──
  /** Intervalo entre intentos de escaneo en ms. Default 160 (rango sugerido 50–1000, libre). */
  escanerVelocidadMs: number;
  /** Cooldown tras detección antes de aceptar otro escaneo. Default 1500 ms. */
  escanerCooldownMs: number;
  /** Si true, no muestra el dialog de confirmación; procesa la matrícula directamente. */
  escanerSaltarConfirmacion: boolean;
  /**
   * Muestra el botón "¿Sin lector? Usar la cámara" en el escáner (v3.45.0).
   * El producto usa lector físico (más rápido y fiable que una webcam); la
   * cámara queda como respaldo y se puede ocultar. Default true: nadie se
   * queda sin forma de escanear al actualizar.
   */
  mostrarBotonCamara: boolean;
  /**
   * Aviso de privacidad bajo el escáner (v3.48.0): qué se hace con los datos
   * de quien se registra. Texto libre: lo ajusta el coordinador a como se
   * maneje su biblioteca. Default activo con un texto genérico.
   */
  avisoPrivacidadActivo: boolean;
  avisoPrivacidadTexto: string;
  /** Volumen del beep de escaneo. 0 = silencio, 1 = máximo. Default 0.15. */
  volumenBeep: number;

  // ── Cierre automático extendido (v3.21) ──
  /** Si true, al llegar la hora de cierre del horario operativo cierra todas las entradas pendientes. */
  cierreAlHorario: boolean;
  /** Si true, al cerrar por timeout no marca cierreAutomatico (no requiere revisión). */
  cierreAutoConfirmar: boolean;

  // ── Zoom y cámara del scanner (v3.23) ──
  /** Zoom inicial al abrir el scanner. 1 = 100%, 3 = 300%. Default 1 (100%). */
  zoomScannerDefault: number;
  /** Preferencia de cámara (auto/trasera/frontal). Default 'auto'. */
  camaraPreferida: CamaraPreferida;

  // ── Calendario escolar (v3.43.0) ──
  /** Periodos y días inhábiles, capturados a mano. Default: UAT 2026. */
  calendarioEscolar: CalendarioEscolar;

  // ── Catálogos editables (v3.57.0) ──
  /** Carreras, grupos y rango de grados. Default: los que estaban fijos en el código. */
  catalogoEscolar: CatalogoEscolar;
}

/** Copia profunda: el calendario por defecto no debe mutarse al editar. */
function copiarCalendario(c: CalendarioEscolar): CalendarioEscolar {
  return {
    periodos: c.periodos.map(p => ({ ...p })),
    diasInhabiles: c.diasInhabiles.map(d => ({ ...d })),
  };
}

/** Texto inicial del aviso bajo el escáner; editable en Configuración → Escáner. */
export const AVISO_PRIVACIDAD_DEFAULT =
  'Registro de visitas de la biblioteca. Tus datos (matrícula, nombre y carrera) se usan únicamente para el control de ' +
  'acceso y las estadísticas internas de la biblioteca.';

const DEFAULT_CONFIG: AppConfig = {
  registroSalidaActivo: false,
  horasAutoSalida: 3,
  nombreInstitucion: '',
  nombreEquipo: '',
  umbralDuplicadoMin: 30,
  aforoMaximo: 0,
  aforoModo: 'permitir',
  modoQuiosco: false,
  // Hash de "0000" (v3.62.0): ni el PIN de fábrica se guarda en texto plano.
  quioscoPin: PIN_FABRICA_HASH,
  quioscoPinLargo: 4,
  quioscoPinDeFabrica: true,
  quioscoCodigoRecuperacion: '',
  quioscoAutoMinutos: 0,
  horarioActivo: false,
  horarios: DEFAULT_HORARIOS,
  horarioModo: 'advertir',
  celebracionActiva: true,
  celebracionProbabilidad: 0.08,
  tiempoExitoMs: 5000,
  umbralInactividadDias: 30,
  umbralRecordatorioRespaldoDias: 14,
  ultimoRespaldoTs: 0,
  recordatorioRespaldoModo: 'intervalo',
  recordatorioRespaldoHora: '18:00',
  recordatorioRespaldoDiasSemana: [5], // viernes
  escanerVelocidadMs: 0,
  escanerCooldownMs: 1500,
  escanerSaltarConfirmacion: false,
  mostrarBotonCamara: true,
  avisoPrivacidadActivo: true,
  avisoPrivacidadTexto: AVISO_PRIVACIDAD_DEFAULT,
  volumenBeep: 0.15,
  cierreAlHorario: false,
  cierreAutoConfirmar: false,
  zoomScannerDefault: 1,
  camaraPreferida: 'auto',
  calendarioEscolar: calendarioInicial(),
  catalogoEscolar: catalogoInicial(),
};

const STORAGE_KEY = 'stenbrary-config';

/** Defensa contra un localStorage editado a mano o corrupto. */
function esCalendarioValido(c: unknown): c is CalendarioEscolar {
  const x = c as CalendarioEscolar | undefined;
  return !!x && Array.isArray(x.periodos) && Array.isArray(x.diasInhabiles);
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig;

  // Signal reactivo: true cuando hay entradas cerradas automáticamente sin confirmar
  private _hayAutoClose = signal(false);
  readonly hayAutoClose = this._hayAutoClose.asReadonly();

  // Signal reactivo del modo quiosco para que la UI reaccione al toggle
  private _modoQuiosco = signal(false);
  readonly modoQuioscoSignal = this._modoQuiosco.asReadonly();

  // Signal reactivo del timestamp del último respaldo — permite que el banner
  // de recordatorio desaparezca inmediatamente al exportar un backup.
  private _ultimoRespaldoTs = signal(0);
  readonly ultimoRespaldoSignal = this._ultimoRespaldoTs.asReadonly();

  // Signal del calendario: Estadísticas y Resumen reaccionan al editarlo.
  private _calendario = signal<CalendarioEscolar>(copiarCalendario(calendarioInicial()));
  readonly calendarioSignal = this._calendario.asReadonly();

  // Signal del catálogo: los formularios y la importación leen las opciones de aquí.
  private _catalogo = signal<CatalogoEscolar>(catalogoInicial());
  readonly catalogoSignal = this._catalogo.asReadonly();

  setHayAutoClose(valor: boolean): void {
    this._hayAutoClose.set(valor);
  }

  constructor() {
    this.config = this.cargar();
    this._modoQuiosco.set(this.config.modoQuiosco);
    this._ultimoRespaldoTs.set(this.config.ultimoRespaldoTs);
    this._calendario.set(copiarCalendario(this.config.calendarioEscolar));
    this._catalogo.set(copiarCatalogo(this.config.catalogoEscolar));
  }

  // ═══════════════════════════════════════════════════════
  // CATÁLOGOS (v3.57.0)
  // ═══════════════════════════════════════════════════════

  get catalogoEscolar(): CatalogoEscolar {
    return this._catalogo();
  }

  setCatalogoEscolar(cat: CatalogoEscolar): void {
    const limpio = normalizarCatalogo(cat);
    this.config.catalogoEscolar = copiarCatalogo(limpio);
    this._catalogo.set(limpio);
    this.guardar();
  }

  // ═══════════════════════════════════════════════════════
  // CALENDARIO ESCOLAR (v3.43.0)
  // ═══════════════════════════════════════════════════════

  get calendarioEscolar(): CalendarioEscolar {
    return this._calendario();
  }

  /** Reemplaza el calendario completo (la pantalla edita una copia y la guarda entera). */
  setCalendarioEscolar(cal: CalendarioEscolar): void {
    this.config.calendarioEscolar = copiarCalendario(cal);
    this._calendario.set(copiarCalendario(cal));
    this.guardar();
  }

  get registroSalidaActivo(): boolean {
    return this.config.registroSalidaActivo;
  }

  setRegistroSalidaActivo(valor: boolean): void {
    this.config.registroSalidaActivo = valor;
    this.guardar();
  }

  get horasAutoSalida(): number {
    return this.config.horasAutoSalida;
  }

  setHorasAutoSalida(horas: number): void {
    // Validar aquí y no solo en la pantalla: un input vacío llegaba como
    // null y quedaba guardado (M16). Se aceptan fracciones (2.5 h).
    const n = Number(horas);
    this.config.horasAutoSalida = Number.isFinite(n) ? Math.max(0, n) : 0;
    this.guardar();
  }

  get nombreInstitucion(): string {
    return this.config.nombreInstitucion;
  }

  setNombreInstitucion(nombre: string): void {
    // Limita a 120 caracteres para evitar que un pegado accidental contamine
    // localStorage o haga overflow en headers de PDF/Excel.
    this.config.nombreInstitucion = (nombre || '').trim().slice(0, 120);
    this.guardar();
  }

  /** "Puerta", "Oficina"… Identifica el equipo en la bitácora y en sus respaldos (v3.52.0). */
  get nombreEquipo(): string {
    return this.config.nombreEquipo;
  }

  setNombreEquipo(nombre: string): void {
    this.config.nombreEquipo = (nombre || '').trim().slice(0, 40);
    this.guardar();
  }

  get umbralDuplicadoMin(): number {
    return this.config.umbralDuplicadoMin;
  }

  setUmbralDuplicadoMin(minutos: number): void {
    const n = Number(minutos);
    this.config.umbralDuplicadoMin = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    this.guardar();
  }

  get aforoMaximo(): number {
    return this.config.aforoMaximo;
  }

  setAforoMaximo(valor: number): void {
    this.config.aforoMaximo = Math.max(0, Math.floor(valor) || 0);
    this.guardar();
  }

  get aforoModo(): AforoModo {
    return this.config.aforoModo;
  }

  setAforoModo(modo: AforoModo): void {
    this.config.aforoModo = modo;
    this.guardar();
  }

  /** El control de aforo está activo cuando hay capacidad > 0 y el módulo de salida está activo */
  get aforoActivo(): boolean {
    return this.config.aforoMaximo > 0 && this.config.registroSalidaActivo;
  }

  // ═══════════════════════════════════════════════════════
  // MODO QUIOSCO (v3.9.0)
  // ═══════════════════════════════════════════════════════

  get modoQuiosco(): boolean {
    return this.config.modoQuiosco;
  }

  setModoQuiosco(valor: boolean): void {
    this.config.modoQuiosco = valor;
    this._modoQuiosco.set(valor);
    this.guardar();
  }

  // ── PIN (v3.62.0: con hash) ──
  // Lo guardado es el hash del PIN y del código; solo PinService lo compara
  // y lo cambia. Las pantallas preguntan si hay PIN, cuántos dígitos tiene
  // y si sigue el de fábrica.

  get hayPin(): boolean {
    return !!this.config.quioscoPin;
  }

  get hayCodigoRecuperacion(): boolean {
    return !!this.config.quioscoCodigoRecuperacion;
  }

  get quioscoPinLargo(): number {
    return this.config.quioscoPinLargo ?? 0;
  }

  get quioscoPinDeFabrica(): boolean {
    return !!this.config.quioscoPinDeFabrica;
  }

  /** Para PinService: el valor guardado (hash, o texto plano de una instalación vieja). */
  get pinGuardado(): { pin: string; codigo: string } {
    return { pin: this.config.quioscoPin ?? '', codigo: this.config.quioscoCodigoRecuperacion ?? '' };
  }

  /** Para PinService: solo acepta hashes, nunca un PIN en texto plano. */
  guardarPinHash(hash: string, largo: number, deFabrica = false): void {
    if (!esHashPin(hash)) throw new Error('El PIN solo se guarda con hash');
    this.config.quioscoPin = hash;
    this.config.quioscoPinLargo = largo;
    this.config.quioscoPinDeFabrica = deFabrica;
    this.guardar();
  }

  /** Para PinService: hash del código de recuperación. */
  guardarCodigoHash(hash: string): void {
    if (!esHashPin(hash)) throw new Error('El código solo se guarda con hash');
    this.config.quioscoCodigoRecuperacion = hash;
    this.guardar();
  }

  /** Minutos sin uso para reactivar el quiosco solo. 0 = apagado. */
  get quioscoAutoMinutos(): number {
    return this.config.quioscoAutoMinutos;
  }

  setQuioscoAutoMinutos(min: number): void {
    const n = Math.round(Number(min));
    this.config.quioscoAutoMinutos = Number.isFinite(n) ? Math.min(Math.max(n, 0), 240) : 0;
    this.guardar();
  }

  // ═══════════════════════════════════════════════════════
  // HORARIOS DE OPERACIÓN (v3.9.0)
  // ═══════════════════════════════════════════════════════

  get horarioActivo(): boolean {
    return this.config.horarioActivo;
  }

  setHorarioActivo(valor: boolean): void {
    this.config.horarioActivo = valor;
    this.guardar();
  }

  get horarios(): HorariosSemana {
    return this.config.horarios;
  }

  setHorarioDia(dia: number, horario: HorarioDia): void {
    this.config.horarios = { ...this.config.horarios, [dia]: { ...horario } };
    this.guardar();
  }

  get horarioModo(): HorarioModo {
    return this.config.horarioModo;
  }

  setHorarioModo(modo: HorarioModo): void {
    this.config.horarioModo = modo;
    this.guardar();
  }

  // ═══════════════════════════════════════════════════════
  // CELEBRACIÓN (v3.9.0)
  // ═══════════════════════════════════════════════════════

  get celebracionActiva(): boolean {
    return this.config.celebracionActiva;
  }

  setCelebracionActiva(valor: boolean): void {
    this.config.celebracionActiva = valor;
    this.guardar();
  }

  get celebracionProbabilidad(): number {
    return this.config.celebracionProbabilidad;
  }

  setCelebracionProbabilidad(valor: number): void {
    this.config.celebracionProbabilidad = Math.max(0, Math.min(1, valor));
    this.guardar();
  }

  // ═══════════════════════════════════════════════════════
  // TIEMPO DE PANTALLA DE ÉXITO (v3.20)
  // ═══════════════════════════════════════════════════════

  get tiempoExitoMs(): number {
    return this.config.tiempoExitoMs;
  }

  /** Acepta cualquier valor positivo en ms. La UI sugiere 1000–15000 pero
   *  por principio de flexibilidad no se cap arriba — el coordinador manda. */
  setTiempoExitoMs(ms: number): void {
    const num = Math.max(500, Math.floor(ms) || 0);
    this.config.tiempoExitoMs = num;
    this.guardar();
  }

  // ═══════════════════════════════════════════════════════
  // ALERTAS DE INACTIVIDAD (v3.10.0)
  // ═══════════════════════════════════════════════════════

  get umbralInactividadDias(): number {
    return this.config.umbralInactividadDias;
  }

  setUmbralInactividadDias(dias: number): void {
    this.config.umbralInactividadDias = Math.max(0, Math.floor(dias) || 0);
    this.guardar();
  }

  /** true cuando la función de alertas de inactividad está habilitada (umbral > 0). */
  get alertasInactividadActivas(): boolean {
    return this.config.umbralInactividadDias > 0;
  }

  // ═══════════════════════════════════════════════════════
  // RECORDATORIO DE RESPALDO (v3.11.0)
  // ═══════════════════════════════════════════════════════

  get umbralRecordatorioRespaldoDias(): number {
    return this.config.umbralRecordatorioRespaldoDias;
  }

  setUmbralRecordatorioRespaldoDias(dias: number): void {
    this.config.umbralRecordatorioRespaldoDias = Math.max(0, Math.floor(dias) || 0);
    this.guardar();
  }

  get ultimoRespaldoTs(): number {
    return this.config.ultimoRespaldoTs;
  }

  /** Marca el respaldo como hecho ahora. Llamar desde BackupService al exportar. */
  registrarRespaldoHecho(): void {
    this.config.ultimoRespaldoTs = Date.now();
    this._ultimoRespaldoTs.set(this.config.ultimoRespaldoTs);
    this.guardar();
  }

  /** Días transcurridos desde el último respaldo. null si nunca se ha hecho. */
  diasSinRespaldo(): number | null {
    const ts = this.config.ultimoRespaldoTs;
    if (!ts) return null;
    const ms = Date.now() - ts;
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  /**
   * true cuando hay que mostrar el recordatorio. Soporta dos modos:
   *
   *  - 'intervalo': si pasó N días desde el último respaldo (o nunca se hizo).
   *  - 'programado': si hoy es uno de los días configurados, ya pasó la hora
   *    configurada, y NO se ha respaldado HOY.
   */
  get recordatorioRespaldoPendiente(): boolean {
    if (this.config.recordatorioRespaldoModo === 'programado') {
      const dias = this.config.recordatorioRespaldoDiasSemana || [];
      if (dias.length === 0) return false;

      const ahora = new Date();
      if (!dias.includes(ahora.getDay())) return false;

      const [hh, mm] = (this.config.recordatorioRespaldoHora || '00:00')
        .split(':').map(n => parseInt(n, 10) || 0);
      const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
      const objetivoMin = hh * 60 + mm;
      if (ahoraMin < objetivoMin) return false;

      // Suprimir si ya se respaldó hoy
      const ts = this.config.ultimoRespaldoTs;
      if (ts > 0) {
        const u = new Date(ts);
        const mismoDia =
          u.getFullYear() === ahora.getFullYear() &&
          u.getMonth() === ahora.getMonth() &&
          u.getDate() === ahora.getDate();
        if (mismoDia) return false;
      }
      return true;
    }

    // Modo 'intervalo' (default)
    const umbral = this.config.umbralRecordatorioRespaldoDias;
    if (umbral <= 0) return false;
    const dias = this.diasSinRespaldo();
    if (dias === null) return true;
    return dias >= umbral;
  }

  // ═══════════════════════════════════════════════════════
  // RECORDATORIO PROGRAMADO (v3.21)
  // ═══════════════════════════════════════════════════════

  get recordatorioRespaldoModo(): RecordatorioRespaldoModo {
    return this.config.recordatorioRespaldoModo;
  }

  setRecordatorioRespaldoModo(modo: RecordatorioRespaldoModo): void {
    this.config.recordatorioRespaldoModo = modo;
    this.guardar();
  }

  get recordatorioRespaldoHora(): string {
    return this.config.recordatorioRespaldoHora;
  }

  setRecordatorioRespaldoHora(hhmm: string): void {
    // Sanitizar 'HH:mm' con clamp; si inválido, usar 09:00
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    if (!m) { this.config.recordatorioRespaldoHora = '09:00'; }
    else {
      const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
      const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
      this.config.recordatorioRespaldoHora = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    }
    this.guardar();
  }

  get recordatorioRespaldoDiasSemana(): number[] {
    return [...this.config.recordatorioRespaldoDiasSemana];
  }

  setRecordatorioRespaldoDiasSemana(dias: number[]): void {
    const limpios = Array.from(new Set(
      (dias || []).map(d => Math.floor(d)).filter(d => d >= 0 && d <= 6),
    )).sort();
    this.config.recordatorioRespaldoDiasSemana = limpios;
    this.guardar();
  }

  toggleRecordatorioRespaldoDia(dia: number): void {
    const actuales = new Set(this.config.recordatorioRespaldoDiasSemana);
    if (actuales.has(dia)) actuales.delete(dia);
    else actuales.add(dia);
    this.setRecordatorioRespaldoDiasSemana(Array.from(actuales));
  }

  // ═══════════════════════════════════════════════════════
  // ESCÁNER CUSTOMIZABLE (v3.21)
  // ═══════════════════════════════════════════════════════

  get escanerVelocidadMs(): number {
    return this.config.escanerVelocidadMs;
  }

  setEscanerVelocidadMs(ms: number): void {
    // 0 = sin throttle (cada frame del rAF). Sin tope arriba por flexibilidad.
    const n = Math.floor(Number(ms));
    this.config.escanerVelocidadMs = Math.max(0, isNaN(n) ? 0 : n);
    this.guardar();
  }

  get escanerCooldownMs(): number {
    return this.config.escanerCooldownMs;
  }

  setEscanerCooldownMs(ms: number): void {
    this.config.escanerCooldownMs = Math.max(0, Math.floor(ms) || 0);
    this.guardar();
  }

  get mostrarBotonCamara(): boolean {
    return this.config.mostrarBotonCamara;
  }

  setMostrarBotonCamara(valor: boolean): void {
    this.config.mostrarBotonCamara = valor;
    this.guardar();
  }

  get avisoPrivacidadActivo(): boolean {
    return this.config.avisoPrivacidadActivo;
  }

  setAvisoPrivacidadActivo(valor: boolean): void {
    this.config.avisoPrivacidadActivo = valor;
    this.guardar();
  }

  get avisoPrivacidadTexto(): string {
    return this.config.avisoPrivacidadTexto;
  }

  /** Vacío = vuelve al texto por defecto (un aviso en blanco no informa nada). */
  setAvisoPrivacidadTexto(texto: string): void {
    this.config.avisoPrivacidadTexto = texto.trim() || AVISO_PRIVACIDAD_DEFAULT;
    this.guardar();
  }

  get escanerSaltarConfirmacion(): boolean {
    return this.config.escanerSaltarConfirmacion;
  }

  setEscanerSaltarConfirmacion(valor: boolean): void {
    this.config.escanerSaltarConfirmacion = valor;
    this.guardar();
  }

  get volumenBeep(): number {
    return this.config.volumenBeep;
  }

  setVolumenBeep(valor: number): void {
    const n = Number(valor);
    if (!isFinite(n)) return;
    this.config.volumenBeep = Math.min(1, Math.max(0, n));
    this.guardar();
  }

  // ═══════════════════════════════════════════════════════
  // CIERRE AUTOMÁTICO EXTENDIDO (v3.21)
  // ═══════════════════════════════════════════════════════

  get cierreAlHorario(): boolean {
    return this.config.cierreAlHorario;
  }

  setCierreAlHorario(valor: boolean): void {
    this.config.cierreAlHorario = valor;
    this.guardar();
  }

  get cierreAutoConfirmar(): boolean {
    return this.config.cierreAutoConfirmar;
  }

  setCierreAutoConfirmar(valor: boolean): void {
    this.config.cierreAutoConfirmar = valor;
    this.guardar();
  }

  // ═══════════════════════════════════════════════════════
  // ZOOM Y CÁMARA DEL SCANNER (v3.23)
  // ═══════════════════════════════════════════════════════

  get zoomScannerDefault(): number {
    return this.config.zoomScannerDefault;
  }

  /** Acepta valores entre 1× y 3× (rango natural del zoom por software).
   *  El scanner clampa internamente al máximo real de la cámara al aplicarlo. */
  setZoomScannerDefault(valor: number): void {
    const n = Number(valor);
    if (!isFinite(n)) return;
    this.config.zoomScannerDefault = Math.min(3, Math.max(1, n));
    this.guardar();
  }

  get camaraPreferida(): CamaraPreferida {
    return this.config.camaraPreferida;
  }

  setCamaraPreferida(valor: CamaraPreferida): void {
    if (valor !== 'auto' && valor !== 'environment' && valor !== 'user') return;
    this.config.camaraPreferida = valor;
    this.guardar();
  }

  // ═══════════════════════════════════════════════════════
  // PERSISTENCIA
  // ═══════════════════════════════════════════════════════

  /**
   * Devuelve toda la configuración a sus valores de fábrica.
   *
   * Usado por `RestablecerService`. Reasigna el objeto en memoria y refresca
   * los signals: sin esto, la app seguiría operando con los ajustes viejos
   * (modo quiosco, PIN, aforo) hasta que alguien recargara la página.
   */
  restablecerTodo(): void {
    this.config = {
      ...DEFAULT_CONFIG,
      horarios: { ...DEFAULT_HORARIOS },
      calendarioEscolar: copiarCalendario(calendarioInicial()),
      catalogoEscolar: catalogoInicial(),
    };
    this.guardar();
    this._calendario.set(copiarCalendario(this.config.calendarioEscolar));
    this._catalogo.set(copiarCatalogo(this.config.catalogoEscolar));
    this._modoQuiosco.set(this.config.modoQuiosco);
    this._ultimoRespaldoTs.set(this.config.ultimoRespaldoTs);
    this._hayAutoClose.set(false);
  }

  private cargar(): AppConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge profundo para horarios (cubre instalaciones viejas sin la clave)
        const horarios: HorariosSemana = { ...DEFAULT_HORARIOS, ...(parsed.horarios || {}) };
        // Instalaciones previas a v3.43.0 no tienen calendario: reciben el del
        // año en curso (oficial 2026 o el típico calculado), igual que una nueva.
        const calendarioEscolar = copiarCalendario(
          esCalendarioValido(parsed.calendarioEscolar) ? parsed.calendarioEscolar : calendarioInicial(),
        );
        // Instalaciones previas a v3.57.0: el catálogo que estaba fijo en el código.
        const catalogoEscolar = normalizarCatalogo(parsed.catalogoEscolar);
        // Instalaciones previas a v3.62.0: PIN en texto plano y sin largo ni
        // marca de fábrica. Se deducen aquí; PinService.migrar() lo convierte
        // en hash al arrancar.
        const pinViejo = typeof parsed.quioscoPin === 'string' && !esHashPin(parsed.quioscoPin)
          ? { quioscoPinLargo: parsed.quioscoPin.length, quioscoPinDeFabrica: parsed.quioscoPin === '0000' }
          : {};
        return { ...DEFAULT_CONFIG, ...parsed, ...pinViejo, horarios, calendarioEscolar, catalogoEscolar };
      }
    } catch { /* silenciar */ }
    return { ...DEFAULT_CONFIG, horarios: { ...DEFAULT_HORARIOS }, calendarioEscolar: copiarCalendario(calendarioInicial()), catalogoEscolar: catalogoInicial() };
  }

  private guardar(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch { /* silenciar */ }
  }
}
