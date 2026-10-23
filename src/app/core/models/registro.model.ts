// ╔══════════════════════════════════════════════════════╗
// ║  registro.model.ts                                   ║
// ║  Stenbrary v3.6.2 — Con hora de salida               ║
// ║                                                      ║
// ║  NUEVO v3.6.2:                                       ║
// ║  - horaSalida?: Date — se llena cuando el alumno     ║
// ║    escanea de nuevo para registrar su salida          ║
// ║  - duracionMinutos?: number — calculado automático   ║
// ║                                                      ║
// ║  Retrocompatible: registros existentes sin estos      ║
// ║  campos siguen funcionando (son opcionales)           ║
// ╚══════════════════════════════════════════════════════╝

export interface Registro {
  id: string;
  alumnoId: string;
  matricula: string;
  nombreCompleto: string;
  carrera: string;

  // ── Motivo principal (retrocompat) ──
  motivoId: string;
  motivoNombre: string;

  // ── Múltiples motivos (v3.7.0) — incluye el principal ──
  motivoIds?: string[];
  motivoNombres?: string[];

  fechaHora: Date;
  dispositivo?: string;
  sincronizado: boolean;

  // ── Hora de salida (v3.6.2) ──
  horaSalida?: Date;
  duracionMinutos?: number;

  // ── Cierre automático (v3.7.0) ──
  // true cuando el sistema cerró la entrada por tiempo, no el alumno
  // (y el personal aún no lo revisó: confirmarlo lo vuelve false).
  cierreAutomatico?: boolean;

  // ── Salida estimada (v3.42.0) ──
  // true cuando `horaSalida` la puso el sistema (cierre por tiempo o al
  // horario), no el alumno. A diferencia de `cierreAutomatico`, NO se
  // borra al confirmar: confirmar significa "visto", no "medido". Las
  // duraciones estimadas no entran en promedios, horas acumuladas ni
  // constancias (decisión P3, docs/AUDITORIA-2026-10.md).
  salidaEstimada?: boolean;

  // ── Turno del alumno al momento del registro (v3.16.0) ──
  // Se copia desde Alumno.turno al crear. Permite analítica por turno
  // sin tener que hacer join en cada query. Para registros viejos sin
  // este campo, los componentes hacen fallback a Alumno.
  turno?: 'Matutino' | 'Vespertino' | 'Mixto';

  // ── Capturada a mano (v3.59.0) ──
  // true = se anotó en papel (se fue la luz, la PC estuvo apagada) y se
  // capturó después en Registros. Cuenta igual en las estadísticas.
  capturaManual?: boolean;

  // ── Sync metadata (Fase 2.2 — opcional, retrocompat) ──
  // `sincronizado: boolean` arriba queda como flag legacy; `_syncStatus`
  // es la fuente nueva (3 estados). Sin _syncStatus se asume `synced`.
  _syncStatus?: 'pending' | 'synced' | 'rejected';
  _lastSyncedAt?: Date;
  /**
   * Última vez que una PERSONA la creó o cambió (entrada, salida, corrección)
   * — v3.57.2. Al combinar un respaldo gana la más reciente. El cierre
   * automático NO la toca: si no, la salida estimada de la oficina le ganaba
   * a la salida real que llegaba de la puerta.
   */
  editadoEn?: Date;
}