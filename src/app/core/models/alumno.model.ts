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
}

export interface AlumnoCompleto extends Alumno {
  nombreCompleto: string;
}