// ╔══════════════════════════════════════════════════════╗
// ║  quiosco.utils.ts                                    ║
// ║  Stenbrary v3.49.0 — Volver solo al modo quiosco     ║
// ║                                                      ║
// ║  Cierra el hueco de "el coordinador salió del        ║
// ║  quiosco y se le olvidó volver a activarlo": tras N  ║
// ║  minutos sin uso, el equipo regresa al escáner.      ║
// ╚══════════════════════════════════════════════════════╝

/** Rutas donde nunca se reactiva: el asistente inicial no debe interrumpirse. */
const RUTAS_EXCLUIDAS = ['/bienvenida', '/login'];

export interface EstadoQuiosco {
  /** El modo quiosco ya está encendido. */
  activo: boolean;
  /** Minutos sin uso configurados. 0 = función apagada. */
  minutos: number;
  /** Última interacción (ms epoch). */
  ultimaActividad: number;
  ahora: number;
  /** Ruta actual, sin query string. */
  ruta: string;
}

/** ¿Toca volver al modo quiosco? Función pura: el servicio solo la consulta. */
export function debeVolverAQuiosco(e: EstadoQuiosco): boolean {
  if (e.activo || !(e.minutos > 0)) return false;
  if (RUTAS_EXCLUIDAS.some(r => e.ruta.startsWith(r))) return false;
  return e.ahora - e.ultimaActividad >= e.minutos * 60_000;
}
