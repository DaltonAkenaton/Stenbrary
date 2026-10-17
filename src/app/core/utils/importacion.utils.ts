// ╔══════════════════════════════════════════════════════╗
// ║  importacion.utils.ts                                ║
// ║  Stenbrary v3.57.0 — Importar el padrón sin sorpresas║
// ║                                                      ║
// ║  Antes vivía dentro del componente y, con archivos   ║
// ║  de prueba como los de un padrón real, falló así     ║
// ║  (2026-10-17):                                       ║
// ║  - columna "Cuenta" → caía al alias "id", que hacía  ║
// ║    match parcial con "apellIDo": matrícula = apellido,║
// ║    marcada como VÁLIDA;                              ║
// ║  - apellido materno obligatorio (en la puerta es     ║
// ║    opcional desde v3.54);                            ║
// ║  - "JUAN PÉREZ" se guardaba en mayúsculas;           ║
// ║  - "a2299990001" se guardaba con la "a" y el escáner ║
// ║    nunca la encontraba;                              ║
// ║  - duplicados dentro del archivo no se veían en la   ║
// ║    vista previa;                                     ║
// ║  - "licenciatura en derecho" quedaba como otra       ║
// ║    carrera y partía las estadísticas.                ║
// ╚══════════════════════════════════════════════════════╝

import { MATRICULA_CONFIG, validarMatricula } from './matricula.utils';
import { esNombreValido, limpiarNombre } from './nombres.utils';

export type CampoImportacion =
  | 'matricula' | 'nombre' | 'apellidoPaterno' | 'apellidoMaterno'
  | 'carrera' | 'grado' | 'grupo' | 'turno';

export interface DefCampo {
  campo: CampoImportacion;
  etiqueta: string;
  obligatorio: boolean;
  /** Nombres de columna que se reconocen, ya normalizados (minúsculas, sin acentos ni signos). */
  alias: string[];
}

/**
 * El orden importa: los apellidos van antes que el nombre para que una
 * columna "Nombre del alumno" no se coma "Apellido…" en la pasada parcial.
 * Ningún alias es una palabra corta ambigua ("id" fue el bug).
 */
export const CAMPOS_IMPORTACION: readonly DefCampo[] = [
  { campo: 'matricula', etiqueta: 'Matrícula', obligatorio: true,
    alias: ['matricula', 'no matricula', 'numero de matricula', 'cuenta', 'no cuenta', 'no de cuenta',
            'numero de cuenta', 'num cuenta', 'no control', 'no de control', 'numero de control', 'expediente', 'clave'] },
  { campo: 'apellidoPaterno', etiqueta: 'Apellido paterno', obligatorio: true,
    alias: ['apellido paterno', 'paterno', 'ap paterno', 'primer apellido', 'apellido 1', 'apellido1'] },
  { campo: 'apellidoMaterno', etiqueta: 'Apellido materno', obligatorio: false,
    alias: ['apellido materno', 'materno', 'ap materno', 'segundo apellido', 'apellido 2', 'apellido2'] },
  { campo: 'nombre', etiqueta: 'Nombre(s)', obligatorio: true,
    alias: ['nombre', 'nombres', 'nombre s', 'primer nombre', 'nombre del alumno', 'name'] },
  { campo: 'carrera', etiqueta: 'Carrera', obligatorio: true,
    alias: ['carrera', 'licenciatura', 'programa', 'programa educativo', 'plan de estudios'] },
  { campo: 'grado', etiqueta: 'Grado / semestre', obligatorio: true,
    alias: ['grado', 'semestre', 'cuatrimestre', 'nivel'] },
  { campo: 'grupo', etiqueta: 'Grupo', obligatorio: true,
    alias: ['grupo', 'seccion', 'section'] },
  { campo: 'turno', etiqueta: 'Turno', obligatorio: true,
    alias: ['turno', 'jornada', 'shift'] },
];

export type MapeoColumnas = Record<CampoImportacion, string | null>;

/** "No. de Cuenta" → "no de cuenta"; "Nombre(s)" → "nombre s"; "APELLIDO_PATERNO" → "apellido paterno". */
export function normalizarEncabezado(texto: string): string {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/**
 * Qué columna del archivo corresponde a cada campo. Primero coincidencia
 * EXACTA (normalizada) para todos los campos; luego, para los que falten,
 * que el encabezado contenga el alias como palabras completas. Una columna
 * se usa una sola vez. Lo que no se reconozca queda en `null`: la vista
 * previa lo muestra y deja elegirlo a mano.
 */
export function detectarMapeo(columnas: readonly string[]): MapeoColumnas {
  const mapeo = Object.fromEntries(CAMPOS_IMPORTACION.map(c => [c.campo, null])) as MapeoColumnas;
  const usadas = new Set<string>();
  const norm = columnas.map(c => ({ original: c, n: normalizarEncabezado(c) }));

  for (const def of CAMPOS_IMPORTACION) {
    const col = norm.find(c => !usadas.has(c.original) && def.alias.includes(c.n));
    if (col) { mapeo[def.campo] = col.original; usadas.add(col.original); }
  }
  for (const def of CAMPOS_IMPORTACION) {
    if (mapeo[def.campo]) continue;
    const col = norm.find(c => !usadas.has(c.original) &&
      def.alias.some(a => new RegExp(`(^| )${a}( |$)`).test(c.n)));
    if (col) { mapeo[def.campo] = col.original; usadas.add(col.original); }
  }
  return mapeo;
}

/** Campos obligatorios sin columna asignada (bloquean la importación). */
export function camposFaltantes(mapeo: MapeoColumnas): DefCampo[] {
  return CAMPOS_IMPORTACION.filter(d => d.obligatorio && !mapeo[d.campo]);
}

export interface FilaImportacion {
  /** Número de fila en el Excel (la 1 es el encabezado). */
  fila: number;
  matricula: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  carrera: string;
  grado: number;
  grupo: string;
  turno: string;
  valido: boolean;
  /** Impiden importar la fila. */
  errores: string[];
  /** Se importa, pero conviene revisarlo (p. ej. carrera fuera del catálogo). */
  avisos: string[];
}

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function normalizarTurno(valor: string): string {
  const t = sinAcentos(valor);
  if (!t) return '';
  if (t.startsWith('matut') || t === 'm' || t === 'tm') return 'Matutino';
  if (t.startsWith('vespert') || t === 'v' || t === 'tv') return 'Vespertino';
  if (t.startsWith('mixt') || t.startsWith('noct') || t === 'x') return 'Mixto';
  return valor.trim();
}

/** 3 / "3" / "3°" / "3er" / "3º semestre" → 3. Sin número → 0. */
export function parsearGrado(valor: unknown): number {
  const m = /\d+/.exec(String(valor ?? ''));
  return m ? parseInt(m[0], 10) : 0;
}

const texto = (v: unknown) => String(v ?? '').trim();

/**
 * Convierte las filas crudas del archivo en filas validadas y normalizadas,
 * con las MISMAS reglas que el registro en la puerta: matrícula como la
 * busca el escáner (sin la "a"), nombres limpios y capitalizados, materno
 * opcional. La carrera se empareja con el catálogo sin importar mayúsculas
 * ni acentos; si no está, se importa con un aviso.
 */
export function procesarFilas(
  filas: readonly Record<string, unknown>[],
  mapeo: MapeoColumnas,
  matriculasExistentes: ReadonlySet<string>,
  carrerasCatalogo: readonly string[],
  turnosValidos: readonly string[],
  gradoMax = 12,
): FilaImportacion[] {
  const carreraPorClave = new Map(carrerasCatalogo.map(c => [sinAcentos(c), c]));
  const valor = (row: Record<string, unknown>, campo: CampoImportacion) => {
    const col = mapeo[campo];
    return col ? row[col] : '';
  };

  const resultado = filas.map((row, i): FilaImportacion => {
    const errores: string[] = [];
    const avisos: string[] = [];

    const crudaMat = texto(valor(row, 'matricula'));
    const v = validarMatricula(crudaMat);
    let matricula = v.matriculaLimpia;
    if (!crudaMat) errores.push('Matrícula vacía');
    else if (matricula === MATRICULA_CONFIG.matriculaInvitado) { errores.push('"INVITADO" no es una matrícula de alumno'); matricula = ''; }
    else if (!v.valida) errores.push(`Matrícula: ${v.error}`);

    const nombre = limpiarNombre(texto(valor(row, 'nombre')));
    const apellidoPaterno = limpiarNombre(texto(valor(row, 'apellidoPaterno')));
    const apellidoMaterno = limpiarNombre(texto(valor(row, 'apellidoMaterno')));
    if (!nombre) errores.push('Nombre vacío');
    else if (!esNombreValido(nombre)) errores.push('Nombre con caracteres no válidos');
    if (!apellidoPaterno) errores.push('Apellido paterno vacío');
    else if (!esNombreValido(apellidoPaterno)) errores.push('Apellido paterno con caracteres no válidos');
    if (apellidoMaterno && !esNombreValido(apellidoMaterno)) errores.push('Apellido materno con caracteres no válidos');

    const crudaCarrera = texto(valor(row, 'carrera')).replace(/\s+/g, ' ');
    let carrera = crudaCarrera;
    if (!crudaCarrera) errores.push('Carrera vacía');
    else {
      const enCatalogo = carreraPorClave.get(sinAcentos(crudaCarrera));
      if (enCatalogo) carrera = enCatalogo;
      else avisos.push(`Carrera "${crudaCarrera}" no está en el catálogo: se importará tal cual`);
    }

    const grado = parsearGrado(valor(row, 'grado'));
    if (grado < 1 || grado > gradoMax) errores.push(`Grado inválido (debe ser 1–${gradoMax})`);

    const grupo = texto(valor(row, 'grupo')).toUpperCase();
    if (!grupo) errores.push('Grupo vacío');

    const turno = normalizarTurno(texto(valor(row, 'turno')));
    if (!turnosValidos.includes(turno)) errores.push(`Turno inválido: "${turno}" (usar ${turnosValidos.join(', ')})`);

    if (matricula && matriculasExistentes.has(matricula)) errores.push('Matrícula ya registrada en el sistema');

    return { fila: i + 2, matricula, nombre, apellidoPaterno, apellidoMaterno, carrera, grado, grupo, turno,
             valido: false, errores, avisos };
  });

  // Duplicados dentro del archivo: se calcula con todas las filas ya armadas
  // (antes se buscaba en el arreglo de la importación ANTERIOR y no veía nada).
  const primera = new Map<string, number>();
  for (const f of resultado) {
    if (!f.matricula) continue;
    const previa = primera.get(f.matricula);
    if (previa === undefined) primera.set(f.matricula, f.fila);
    else f.errores.push(`Matrícula repetida (ya está en la fila ${previa})`);
  }
  for (const f of resultado) f.valido = f.errores.length === 0;
  return resultado;
}
