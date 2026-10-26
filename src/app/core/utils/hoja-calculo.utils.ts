// ╔══════════════════════════════════════════════════════╗
// ║  hoja-calculo.utils.ts — Stenbrary v3.62.0           ║
// ║                                                      ║
// ║  Inyección de fórmulas ("CSV/formula injection"):    ║
// ║  un texto que escribió una persona (nombre, carrera, ║
// ║  actividad) y que empieza con `=`, `+`, `-` o `@`    ║
// ║  puede ejecutarse como fórmula al abrir el archivo   ║
// ║  en Excel o LibreOffice. En el .xlsx que genera      ║
// ║  Stenbrary esas celdas ya son texto (SheetJS no      ║
// ║  crea fórmulas a partir de strings), pero el archivo ║
// ║  se puede volver a guardar como CSV y ahí sí se      ║
// ║  evaluarían. Por eso, como recomienda OWASP, a esos  ║
// ║  textos se les antepone un apóstrofo al exportar.    ║
// ║                                                      ║
// ║  Solo afecta a la SALIDA: lo guardado en IndexedDB   ║
// ║  no cambia. Los números no se tocan. Los datos       ║
// ║  legítimos no empiezan así (los nombres se validan   ║
// ║  como letras), así que en la práctica no se ve.      ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Texto que una hoja de cálculo podría interpretar como fórmula: empieza
 * (tras espacios opcionales) con = + - @, o con sus formas de ancho completo
 * (U+FF1D, U+FF0B, U+FF0D, U+FF20), o directamente con tabulador o salto
 * de línea.
 */
const INICIO_PELIGROSO = /^(?:[ \u00a0]*[=+\-@\uff1d\uff0b\uff0d\uff20]|[\t\r\n])/;

/** El valor tal cual, o el texto con `'` delante si podría ser una fórmula. */
export function neutralizarCelda<T>(valor: T): T | string {
  return typeof valor === 'string' && INICIO_PELIGROSO.test(valor) ? `'${valor}` : valor;
}

/** Aplica `neutralizarCelda` a cada valor de una fila (los encabezados los pone el código). */
export function neutralizarFila<T extends Record<string, unknown>>(fila: T): T {
  const salida: Record<string, unknown> = {};
  for (const [columna, valor] of Object.entries(fila)) salida[columna] = neutralizarCelda(valor);
  return salida as T;
}
