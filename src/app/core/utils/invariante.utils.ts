// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/utils/invariante.utils.ts        ║
// ║  Stenbrary — Invariantes (aserciones no fatales)     ║
// ║                                                      ║
// ║  Un invariante es una afirmación que el código da    ║
// ║  por cierta: "aquí ya debe haber un alumno", "este   ║
// ║  conteo no puede ser negativo". Cuando deja de       ║
// ║  cumplirse, algo se rompió antes — y sin una         ║
// ║  anotación, ese momento pasa inadvertido.            ║
// ║                                                      ║
// ║  REGLA: NUNCA lanzan.                                ║
// ║  Una aserción que revienta convierte un dato raro    ║
// ║  en una pantalla rota frente a la fila de alumnos.   ║
// ║  El sistema debe seguir funcionando; el defecto se   ║
// ║  anota y se revisa después.                          ║
// ║                                                      ║
// ║  Se leen en /diagnostico y se exportan desde ahí.    ║
// ╚══════════════════════════════════════════════════════╝

import { DiagnosticoService } from '../services/diagnostico.service';

/**
 * Referencia perezosa al servicio.
 *
 * Los invariantes se llaman desde funciones sueltas, fuera de un contexto de
 * inyección de Angular. Guardar la instancia una vez —la registra
 * `AppComponent` al arrancar— permite usarlos en cualquier parte sin
 * arrastrar el injector por toda la firma.
 */
let diagnostico: DiagnosticoService | null = null;

export function registrarDiagnostico(servicio: DiagnosticoService): void {
  diagnostico = servicio;
}

/** Anota una anomalía. Silenciosa si el servicio aún no se registró. */
export function reportarAnomalia(
  area: string,
  mensaje: string,
  contexto?: Record<string, unknown>,
): void {
  diagnostico?.anomalia(area, mensaje, contexto);
}

/**
 * Verifica una condición que el código da por cierta.
 *
 * Devuelve la propia condición para poder encadenarla:
 *
 *   if (!invariante(alumno != null, 'scanner', 'alumno ausente')) return;
 *
 * @returns `true` si se cumple; `false` si no (y queda anotada).
 */
export function invariante(
  condicion: boolean,
  area: string,
  mensaje: string,
  contexto?: Record<string, unknown>,
): boolean {
  if (!condicion) reportarAnomalia(area, mensaje, contexto);
  return condicion;
}

/**
 * Verifica que un valor exista, devolviéndolo con el tipo estrechado.
 *
 *   const alumno = esperado(await buscar(m), 'scanner', 'alumno no hallado');
 *   if (!alumno) return;
 */
export function esperado<T>(
  valor: T | null | undefined,
  area: string,
  mensaje: string,
  contexto?: Record<string, unknown>,
): T | null {
  if (valor === null || valor === undefined) {
    reportarAnomalia(area, mensaje, contexto);
    return null;
  }
  return valor;
}

/**
 * Comprueba que un resultado coincida con lo esperado.
 *
 * Pensado para operaciones masivas: "iba a borrar 54 y borré 51" es
 * exactamente el tipo de discrepancia que hoy pasaba desapercibida.
 */
export function coincide(
  obtenido: number,
  esperadoValor: number,
  area: string,
  mensaje: string,
  contexto?: Record<string, unknown>,
): boolean {
  if (obtenido !== esperadoValor) {
    reportarAnomalia(area, mensaje, { ...contexto, obtenido, esperado: esperadoValor });
    return false;
  }
  return true;
}

/**
 * Envuelve una operación para que un fallo quede anotado y no se pierda.
 *
 * Reemplaza al `catch {}` vacío, que es donde los defectos se van a morir en
 * silencio. Devuelve `respaldo` si la operación falla.
 */
export async function conRegistro<T>(
  area: string,
  mensaje: string,
  operacion: () => Promise<T>,
  respaldo: T,
): Promise<T> {
  try {
    return await operacion();
  } catch (err) {
    diagnostico?.error(area, mensaje, { detalle: (err as Error)?.message }, (err as Error)?.stack);
    return respaldo;
  }
}

/** Solo para tests: permite inyectar un doble y limpiar entre casos. */
export function _resetDiagnosticoParaTests(servicio: DiagnosticoService | null): void {
  diagnostico = servicio;
}
