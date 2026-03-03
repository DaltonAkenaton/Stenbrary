// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/constants/catalogos.constants.ts ║
// ║  Stenbrary v3.4 — Catálogos centralizados            ║
// ║                                                      ║
// ║  Fuente única de verdad para carreras, grados,       ║
// ║  grupos y turnos. Importar desde aquí en todos       ║
// ║  los formularios y filtros del sistema.               ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Catálogo oficial de carreras.
 * ⚠️ Modificar SOLO aquí — se refleja en registro, edición y filtros.
 */
export const CARRERAS: string[] = [
  'Contador Público',
  'Licenciatura en Administración',
  'Ingeniería en Autotransporte de Carga',
  'Licenciatura en Comercio Exterior',
  'Licenciatura en Derecho',
  'Licenciatura en Enfermería',
  'Licenciatura en Psicología',
  'Ingeniería en Tecnologías de la Información',
];

/** Grados/semestres disponibles */
export const GRADOS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Grupos disponibles */
export const GRUPOS: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Turnos válidos (debe coincidir con el tipo en alumno.model.ts) */
export const TURNOS: ('Matutino' | 'Vespertino' | 'Mixto')[] = [
  'Matutino',
  'Vespertino',
  'Mixto',
];