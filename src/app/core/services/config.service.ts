// ╔══════════════════════════════════════════════════════╗
// ║  config.service.ts                                   ║
// ║  Stenbrary v3.9.0 — Quiosco + Horarios               ║
// ║                                                      ║
// ║  Persiste ajustes en localStorage.                   ║
// ║  Gestiona:                                           ║
// ║  - registroSalidaActivo / horasAutoSalida            ║
// ║  - nombreInstitucion                                 ║
// ║  - umbralDuplicadoMin                                ║
// ║  - aforoMaximo / aforoModo                           ║
// ║  - modoQuiosco / quioscoPin (v3.9.0)                 ║
// ║  - horarioActivo / horarios / horarioModo (v3.9.0)   ║
// ║  - celebracionActiva / celebracionProbabilidad       ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, signal } from '@angular/core';

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
  umbralDuplicadoMin: number;
  aforoMaximo: number;
  aforoModo: AforoModo;

  // ── Modo quiosco (v3.9.0) ──
  modoQuiosco: boolean;
  /** PIN de 4 dígitos para salir del modo quiosco. Vacío = sin PIN (peligroso). */
  quioscoPin: string;

  // ── Horarios de operación (v3.9.0) ──
  horarioActivo: boolean;
  horarios: HorariosSemana;
  horarioModo: HorarioModo;

  // ── Animación celebratoria aleatoria (v3.9.0) ──
  celebracionActiva: boolean;
  /** Probabilidad 0-1 de mostrar animación al registrar. Default 0.08 (8%). */
  celebracionProbabilidad: number;

  // ── Alertas de inactividad (v3.10.0) ──
  /** Umbral de días sin venir para considerar a un alumno "inactivo". 0 = desactivado. */
  umbralInactividadDias: number;
}

const DEFAULT_CONFIG: AppConfig = {
  registroSalidaActivo: false,
  horasAutoSalida: 3,
  nombreInstitucion: '',
  umbralDuplicadoMin: 30,
  aforoMaximo: 0,
  aforoModo: 'permitir',
  modoQuiosco: false,
  quioscoPin: '0000',
  horarioActivo: false,
  horarios: DEFAULT_HORARIOS,
  horarioModo: 'advertir',
  celebracionActiva: true,
  celebracionProbabilidad: 0.08,
  umbralInactividadDias: 30,
};

const STORAGE_KEY = 'stenbrary-config';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig;

  // Signal reactivo: true cuando hay entradas cerradas automáticamente sin confirmar
  private _hayAutoClose = signal(false);
  readonly hayAutoClose = this._hayAutoClose.asReadonly();

  // Signal reactivo del modo quiosco para que la UI reaccione al toggle
  private _modoQuiosco = signal(false);
  readonly modoQuioscoSignal = this._modoQuiosco.asReadonly();

  setHayAutoClose(valor: boolean): void {
    this._hayAutoClose.set(valor);
  }

  constructor() {
    this.config = this.cargar();
    this._modoQuiosco.set(this.config.modoQuiosco);
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
    this.config.horasAutoSalida = horas;
    this.guardar();
  }

  get nombreInstitucion(): string {
    return this.config.nombreInstitucion;
  }

  setNombreInstitucion(nombre: string): void {
    this.config.nombreInstitucion = nombre.trim();
    this.guardar();
  }

  get umbralDuplicadoMin(): number {
    return this.config.umbralDuplicadoMin;
  }

  setUmbralDuplicadoMin(minutos: number): void {
    this.config.umbralDuplicadoMin = minutos;
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

  get quioscoPin(): string {
    return this.config.quioscoPin;
  }

  setQuioscoPin(pin: string): void {
    const limpio = (pin || '').replace(/\D/g, '').slice(0, 6);
    this.config.quioscoPin = limpio;
    this.guardar();
  }

  /** Verifica un PIN contra el almacenado. Si no hay PIN configurado, acepta cualquiera. */
  validarQuioscoPin(intento: string): boolean {
    if (!this.config.quioscoPin) return true;
    return intento === this.config.quioscoPin;
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
  // PERSISTENCIA
  // ═══════════════════════════════════════════════════════

  private cargar(): AppConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge profundo para horarios (cubre instalaciones viejas sin la clave)
        const horarios: HorariosSemana = { ...DEFAULT_HORARIOS, ...(parsed.horarios || {}) };
        return { ...DEFAULT_CONFIG, ...parsed, horarios };
      }
    } catch { /* silenciar */ }
    return { ...DEFAULT_CONFIG, horarios: { ...DEFAULT_HORARIOS } };
  }

  private guardar(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch { /* silenciar */ }
  }
}
