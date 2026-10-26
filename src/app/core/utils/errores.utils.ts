// ╔══════════════════════════════════════════════════════╗
// ║  errores.utils.ts — Stenbrary v3.62.0                ║
// ║                                                      ║
// ║  Lo que llega a un `catch` o al ErrorHandler puede   ║
// ║  ser un Error, un texto, un DOMException o una       ║
// ║  promesa rechazada envuelta ({ rejection }). Antes   ║
// ║  cada sitio lo leía como `any`; aquí se lee una vez. ║
// ╚══════════════════════════════════════════════════════╝

interface ConDatos { name?: unknown; message?: unknown; stack?: unknown; rejection?: unknown }

const texto = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

/** Nombre, mensaje y pila de cualquier valor lanzado (también de `{ rejection }`). */
export function leerError(error: unknown): { name: string; message: string; stack?: string } {
  if (typeof error === 'string') return { name: '', message: error };
  const e = (typeof error === 'object' && error !== null ? error : {}) as ConDatos;
  const r = (typeof e.rejection === 'object' && e.rejection !== null ? e.rejection : {}) as ConDatos;
  return {
    name: texto(e.name) ?? texto(r.name) ?? '',
    message: texto(e.message) ?? texto(r.message) ?? '',
    stack: texto(e.stack) ?? texto(r.stack),
  };
}
