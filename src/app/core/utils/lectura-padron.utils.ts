// ╔══════════════════════════════════════════════════════╗
// ║  lectura-padron.utils.ts                             ║
// ║  Stenbrary v3.62.0 — Leer el padrón con límites      ║
// ║                                                      ║
// ║  El archivo lo elige el coordinador, pero puede      ║
// ║  venir dañado, ser otra cosa con la extensión        ║
// ║  cambiada o ser enorme. Antes se leía completo en el ║
// ║  hilo principal: un archivo pesado congelaba la app  ║
// ║  y no había forma de cancelarlo.                     ║
// ║                                                      ║
// ║  Aquí se decide si el archivo se lee (formato,       ║
// ║  firma, tamaño) y se lee con límites. Lo ejecuta un  ║
// ║  Web Worker (lectura-padron.worker.ts) con tiempo    ║
// ║  máximo; si el navegador no tiene Workers, el        ║
// ║  componente lo llama directo. La validación de cada  ║
// ║  fila sigue en importacion.utils.ts.                 ║
// ╚══════════════════════════════════════════════════════╝

import * as XLSX from 'xlsx';

/**
 * Límites técnicos de seguridad, no ajustes del coordinador. Un padrón de
 * 20 000 alumnos en .xlsx pesa del orden de 1–2 MB y en .csv unos 2 MB: los
 * topes dejan holgura de 5–10× sobre el campus más grande previsible y cortan
 * antes de que un archivo anómalo agote la memoria de la pestaña.
 */
export interface LimitesPadron {
  maxBytes: number;
  maxFilas: number;
  maxColumnas: number;
  /** Ningún dato de un alumno (nombre, carrera, grupo…) se acerca a esto. */
  maxCaracteresCelda: number;
  /** Tiempo máximo de lectura en el Worker antes de cancelarla. */
  tiempoMaxMs: number;
}

export const LIMITES_PADRON: Readonly<LimitesPadron> = {
  maxBytes: 10 * 1024 * 1024,
  maxFilas: 20_000,
  maxColumnas: 60,
  maxCaracteresCelda: 300,
  tiempoMaxMs: 30_000,
};

export type TipoPadron = 'xlsx' | 'xls' | 'csv';

export type ValidacionArchivo =
  | { ok: true; tipo: TipoPadron }
  | { ok: false; error: string };

export type FilaCruda = Record<string, unknown>;

export type LecturaPadron =
  | { ok: true; hoja: string; filas: FilaCruda[] }
  | { ok: false; error: string };

/** Encabezados que, como clave de objeto, tocarían el prototipo. */
const ENCABEZADOS_PROHIBIDOS = new Set(['__proto__', 'constructor', 'prototype']);

export function tipoPorExtension(nombre: string): TipoPadron | null {
  const ext = /\.([a-z0-9]+)$/i.exec(nombre.trim())?.[1]?.toLowerCase();
  return ext === 'xlsx' || ext === 'xls' || ext === 'csv' ? ext : null;
}

const MB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');

const empiezaCon = (bytes: Uint8Array, firma: readonly number[]) =>
  bytes.length >= firma.length && firma.every((b, i) => bytes[i] === b);

/** ZIP: .xlsx (y .ods). */
const FIRMA_ZIP = [0x50, 0x4b, 0x03, 0x04];
/** OLE2: .xls binario de Excel 97–2003. */
const FIRMA_OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/** Texto: sin bytes nulos (o UTF-16 con su BOM). */
function pareceTexto(bytes: Uint8Array): boolean {
  if (empiezaCon(bytes, [0xff, 0xfe]) || empiezaCon(bytes, [0xfe, 0xff])) return true;
  return !bytes.includes(0);
}

/**
 * Decide si vale la pena leer el archivo. `cabecera` son sus primeros bytes
 * (bastan 4 KB): la extensión sola no dice nada, un .xlsx renombrado a .csv
 * o un ejecutable renombrado a .xlsx se detectan aquí.
 */
export function validarArchivoPadron(
  nombre: string,
  tamano: number,
  cabecera: Uint8Array,
  limites = LIMITES_PADRON,
): ValidacionArchivo {
  const tipo = tipoPorExtension(nombre);
  if (!tipo) return { ok: false, error: 'Formato no admitido: usa un archivo .xlsx, .xls o .csv.' };
  if (tamano <= 0) return { ok: false, error: 'El archivo está vacío.' };
  if (tamano > limites.maxBytes) {
    return {
      ok: false,
      error: `El archivo pesa ${MB(tamano)} MB y el máximo es ${MB(limites.maxBytes)} MB. ` +
        'Divide el padrón en varios archivos o guárdalo sin imágenes ni hojas extra.',
    };
  }

  const firmaValida =
    tipo === 'xlsx' ? empiezaCon(cabecera, FIRMA_ZIP)
    // Muchos sistemas escolares exportan ".xls" que en realidad es HTML o XML:
    // se aceptan si son texto; SheetJS los lee.
    : tipo === 'xls' ? empiezaCon(cabecera, FIRMA_OLE) || pareceTexto(cabecera)
    : pareceTexto(cabecera);
  if (!firmaValida) {
    return {
      ok: false,
      error: `El contenido no corresponde a un archivo .${tipo}: puede estar dañado o tener la extensión cambiada. ` +
        'Ábrelo en Excel y vuelve a guardarlo como .xlsx.',
    };
  }
  return { ok: true, tipo };
}

/**
 * Lee la primera hoja del padrón y la devuelve como filas (encabezado → valor).
 * Corta antes de procesar si el archivo excede los límites: no devuelve una
 * parte del padrón, devuelve el motivo.
 */
export function leerPadron(datos: ArrayBuffer | Uint8Array, limites = LIMITES_PADRON): LecturaPadron {
  let libro: XLSX.WorkBook;
  try {
    libro = XLSX.read(datos, {
      type: 'array',
      dense: true,
      // Solo valores: sin fórmulas, estilos, HTML ni formatos que no se usan.
      cellFormula: false, cellHTML: false, cellStyles: false, cellNF: false, cellText: false,
      bookVBA: false,
      // Leer una fila más del máximo permite saber que se pasó sin leerlo todo.
      sheetRows: limites.maxFilas + 2,
    });
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo: está dañado o no es una hoja de cálculo.' };
  }

  const hoja = libro.SheetNames[0];
  const sheet = hoja ? libro.Sheets[hoja] : undefined;
  if (!sheet) return { ok: false, error: 'El archivo no tiene hojas con datos.' };

  // `!fullref` es el tamaño real de la hoja aunque `sheetRows` la haya recortado.
  const rango = sheet['!fullref'] ?? sheet['!ref'];
  if (rango) {
    const r = XLSX.utils.decode_range(rango);
    const filasDatos = r.e.r - r.s.r;          // sin el encabezado
    if (filasDatos > limites.maxFilas) {
      return {
        ok: false,
        error: `La hoja "${hoja}" tiene ${filasDatos.toLocaleString('es-MX')} filas y el máximo es ` +
          `${limites.maxFilas.toLocaleString('es-MX')}. Divide el padrón en varios archivos.`,
      };
    }
    if (r.e.c - r.s.c + 1 > limites.maxColumnas) {
      return {
        ok: false,
        error: `La hoja "${hoja}" tiene ${r.e.c - r.s.c + 1} columnas y el máximo es ${limites.maxColumnas}. ` +
          'Deja solo las columnas del alumno.',
      };
    }
  }

  // El encabezado se revisa como arreglo, antes de convertir las filas en objetos.
  const primeraFila = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
  if (primeraFila) primeraFila.e.r = primeraFila.s.r;
  const encabezado = (primeraFila
    ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: primeraFila })[0] ?? []
    : []).map(c => String(c ?? '').trim());
  const prohibido = encabezado.find(c => ENCABEZADOS_PROHIBIDOS.has(c.toLowerCase()));
  if (prohibido) return { ok: false, error: `El encabezado de columna "${prohibido}" no está permitido.` };

  const filas = XLSX.utils.sheet_to_json<FilaCruda>(sheet, { defval: '' });
  if (filas.length === 0) return { ok: false, error: 'El archivo está vacío o no tiene datos.' };

  for (let i = 0; i < filas.length; i++) {
    for (const [columna, valor] of Object.entries(filas[i])) {
      if (typeof valor === 'string' && valor.length > limites.maxCaracteresCelda) {
        return {
          ok: false,
          error: `La fila ${i + 2}, columna "${columna}", tiene ${valor.length} caracteres ` +
            `(máximo ${limites.maxCaracteresCelda}). Revisa que el archivo sea el padrón de alumnos.`,
        };
      }
    }
  }
  return { ok: true, hoja, filas };
}
