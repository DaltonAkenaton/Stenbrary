// ╔══════════════════════════════════════════════════════╗
// ║  nombres.utils.ts                                    ║
// ║  Stenbrary v3.54.0 — Nombres que escriben los alumnos║
// ║                                                      ║
// ║  Sin el Excel de la UAT, cada alumno se registra     ║
// ║  solo en la puerta. Llegaba "juan  carlos",          ║
// ║  "GARCIA" o "Ana2": búsquedas que fallan, reportes y ║
// ║  constancias con mayúsculas al azar.                 ║
// ╚══════════════════════════════════════════════════════╝

/** Letras (con acentos y ñ), espacios, guion, apóstrofo y punto; empieza con letra. */
export const PATRON_NOMBRE = /^\p{L}[\p{L}' .-]*$/u;

/** Partículas que van en minúscula dentro de un nombre ("de la Garza"). */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'van', 'von', 'da', 'di']);

function capitalizar(palabra: string): string {
  // "maría-josé" → "María-José"; "o'neil" → "O'Neil"
  return palabra.replace(/(^|[-'])(\p{L})/gu, (_m, sep: string, letra: string) => sep + letra.toLocaleUpperCase('es-MX'));
}

/**
 * Quita espacios de sobra y, si el texto vino TODO en mayúsculas o TODO en
 * minúsculas, lo capitaliza. Si ya mezcla ("McAllen", "de la Garza"), se
 * respeta: la persona lo escribió así a propósito.
 */
export function limpiarNombre(texto: string | null | undefined): string {
  const t = (texto ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const hayMinusculas = /\p{Ll}/u.test(t);
  const hayMayusculas = /\p{Lu}/u.test(t);
  if (hayMinusculas && hayMayusculas) return t;
  return t
    .toLocaleLowerCase('es-MX')
    .split(' ')
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : capitalizar(p)))
    .join(' ');
}

/**
 * ¿Es un nombre aceptable? Se evalúa ya sin espacios de sobra: un espacio al
 * inicio (muy común al teclear) no debe dar "solo letras" — la E2E lo pescó.
 * Vacío cuenta como válido; lo obligatorio lo decide quien llama.
 */
export function esNombreValido(texto: string | null | undefined): boolean {
  const t = (texto ?? '').replace(/\s+/g, ' ').trim();
  return t === '' || PATRON_NOMBRE.test(t);
}
