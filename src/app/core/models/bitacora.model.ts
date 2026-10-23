// ╔══════════════════════════════════════════════════════╗
// ║  bitacora.model.ts                                   ║
// ║  Stenbrary v3.52.0 — Bitácora local de acciones      ║
// ║                                                      ║
// ║  Qué se hizo, cuándo y en qué equipo. El "quién"     ║
// ║  llega con las cuentas de la Fase 2: entonces este   ║
// ║  modelo gana un `usuarioId` y nada más cambia.       ║
// ╚══════════════════════════════════════════════════════╝

export type AccionBitacora =
  | 'quiosco-salir'
  | 'quiosco-activar'
  | 'quiosco-auto'
  | 'pin-fallido'
  | 'pin-bloqueado'
  | 'pin-cambiado'
  | 'pin-recuperado'
  | 'codigo-generado'
  | 'registro-agregado'
  | 'registro-editado'
  | 'registro-eliminado'
  | 'registros-limpiados'
  | 'alumno-editado'
  | 'alumno-eliminado'
  | 'alumno-desactivado'
  | 'alumno-reactivado'
  | 'motivo-eliminado'
  | 'alumnos-importados'
  | 'catalogo-cambiado'
  | 'respaldo-exportado'
  | 'respaldo-importado'
  | 'datos-borrados'
  | 'reloj-ajustado';

export interface EventoBitacora {
  id: string;
  /** ISO 8601 (UTC): ordena bien como texto y sobrevive al JSON del respaldo. */
  fechaHora: string;
  accion: AccionBitacora;
  /** Texto legible: "Ana López (2200000001), visita del 05/10/2026 10:00". */
  detalle: string;
  /** Nombre del equipo que lo hizo ("Puerta", "Oficina"); vacío si no se configuró. */
  equipo: string;
  /**
   * Id de lo afectado, solo en borrados de una visita o un alumno (v3.53.0).
   * Al importar el respaldo, el otro equipo aplica el mismo borrado: sin
   * esto, una visita basura borrada en la puerta seguía para siempre en la
   * oficina (el import combina, nunca quita).
   */
  refId?: string;
  /**
   * Corrección del nombre de una carrera, solo en "catalogo-cambiado"
   * (v3.57.2). Como los borrados: al combinar, el otro equipo la repite y
   * traduce las visitas que lleguen con el nombre viejo. Sin esto, el
   * respaldo de la puerta volvía a meter el nombre viejo en la oficina.
   */
  renombre?: { de: string; a: string };
}
