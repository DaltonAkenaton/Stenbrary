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
  cierreAutomatico?: boolean;
}