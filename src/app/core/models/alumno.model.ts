// ╔══════════════════════════════════════════════════════╗
// ║  alumno.model.ts                                     ║
// ║  Stenbrary v3.3 — Modelo extensible                  ║
// ║                                                      ║
// ║  NUEVO v3.3:                                         ║
// ║  - Campos opcionales: email, telefono, notas         ║
// ║  - datosExtra: Record para campos personalizados     ║
// ╚══════════════════════════════════════════════════════╝

export interface Alumno {
  id?: string;
  matricula: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  carrera: string;
  grado: number;
  grupo: string;
  turno: 'Matutino' | 'Vespertino' | 'Mixto';
  activo: boolean;
  fechaRegistro: Date;
  fechaActualizacion?: Date;

  // ── Campos opcionales extensibles (v3.3) ──
  email?: string;
  telefono?: string;
  notas?: string;

  // Campos dinámicos que la coordinadora puede agregar
  // Ej: { "CURP": "XXXX", "NSS": "1234" }
  datosExtra?: Record<string, string>;

  // ── Sync metadata (Fase 2.2 — opcional, retrocompat con datos viejos) ──
  // Sin _syncStatus se asume `synced` (datos pre-2.2 ya subidos por el
  // importador one-shot o nunca subidos pero no nos importa hasta editarlos).
  _syncStatus?: 'pending' | 'synced' | 'rejected';
  _lastSyncedAt?: Date;
}

export interface AlumnoCompleto extends Alumno {
  nombreCompleto: string;
}