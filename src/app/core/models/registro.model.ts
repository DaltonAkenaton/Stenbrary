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
  motivoId: string;
  motivoNombre: string;
  fechaHora: Date;
  dispositivo?: string;
  sincronizado: boolean;

  // ── Hora de salida (v3.6.2) ──
  horaSalida?: Date;
  duracionMinutos?: number;
}