// ╔══════════════════════════════════════════════════════╗
// ║  validacion-respaldo.utils.ts                        ║
// ║  Stenbrary v3.62.0 — Validar el respaldo completo    ║
// ║                                                      ║
// ║  Antes solo se revisaba que existieran las listas y  ║
// ║  el PRIMER alumno: una visita sin fecha, un id       ║
// ║  repetido o un texto donde iba un número entraban    ║
// ║  tal cual, y algunos se descartaban en silencio a    ║
// ║  media importación. Ahora se revisa cada elemento    ║
// ║  ANTES de tocar la base: si algo no es válido, el    ║
// ║  archivo se rechaza completo y la base no cambia.    ║
// ║                                                      ║
// ║  Compatibilidad: se aceptan los respaldos de todas   ║
// ║  las versiones 3.x (sin bitácora, sin catálogo, sin  ║
// ║  equipo, sin motivos múltiples, materno vacío…).     ║
// ╚══════════════════════════════════════════════════════╝

import type { BackupData } from '../services/backup.service';

/** Tope del archivo: un año de una biblioteca grande (~50 000 visitas) pesa ~30 MB. */
export const MAX_BYTES_RESPALDO = 200 * 1024 * 1024;

/** Cuántos errores se listan; el resto se cuenta. */
const MAX_ERRORES_LISTADOS = 10;

const CLAVES_PERMITIDAS = new Set(['meta', 'alumnos', 'registros', 'motivos', 'bitacora', 'catalogoEscolar']);

export type ResultadoValidacionRespaldo =
  | { valido: true; datos: BackupData }
  | { valido: false; errores: string[] };

type Obj = Record<string, unknown>;

const esObjeto = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === 'string';
const textoNoVacio = (v: unknown): v is string => esTexto(v) && v.trim().length > 0;

/** Date, o texto ISO que se convierte en una fecha real. */
function esFecha(v: unknown): boolean {
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  if (!esTexto(v) || v.length > 40) return false;
  return !Number.isNaN(new Date(v).getTime());
}

class Errores {
  readonly lista: string[] = [];
  private total = 0;
  agregar(msg: string): void {
    this.total++;
    if (this.lista.length < MAX_ERRORES_LISTADOS) this.lista.push(msg);
  }
  get hay(): boolean { return this.total > 0; }
  resumen(): string[] {
    const extra = this.total - this.lista.length;
    return extra > 0 ? [...this.lista, `…y ${extra} error${extra === 1 ? '' : 'es'} más.`] : this.lista;
  }
}

/** Campos opcionales: si vienen, con el tipo correcto. */
function opcional(e: Errores, donde: string, o: Obj, campo: string, ok: (v: unknown) => boolean, tipo: string): void {
  if (o[campo] !== undefined && o[campo] !== null && !ok(o[campo])) e.agregar(`${donde}: "${campo}" debe ser ${tipo}.`);
}

const listaDeTextos = (v: unknown) => Array.isArray(v) && v.every(esTexto);
const numeroFinito = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const gradoValido = (v: unknown) => numeroFinito(v) || (esTexto(v) && /^\s*\d+\s*$/.test(v));
const esBooleano = (v: unknown) => typeof v === 'boolean';
const textosPlanos = (v: unknown) => esObjeto(v) && Object.values(v).every(x => esTexto(x) || x === null || x === undefined);

function validarMeta(e: Errores, meta: unknown): void {
  if (!esObjeto(meta)) { e.agregar('Falta el campo "meta": no parece ser un respaldo de Stenbrary.'); return; }
  if (meta['app'] !== 'Stenbrary') {
    e.agregar(`Programa desconocido: "${String(meta['app'] ?? '')}" (se esperaba "Stenbrary").`);
    return;
  }
  if (!esTexto(meta['version']) || !/^\d+\.\d+/.test(meta['version'])) {
    e.agregar('La versión del respaldo no es válida.');
  } else if (parseInt(meta['version'], 10) > 3) {
    e.agregar(`El respaldo es de un formato más nuevo (${meta['version']}): actualiza Stenbrary en este equipo.`);
  }
  if (!esFecha(meta['fecha'])) e.agregar('La fecha del respaldo no es válida.');
  opcional(e, 'meta', meta, 'equipo', esTexto, 'texto');
}

function idsUnicos(e: Errores, nombre: string, lista: Obj[]): void {
  const vistos = new Set<string>();
  for (const x of lista) {
    const id = x['id'];
    if (!esTexto(id)) continue;
    if (vistos.has(id)) e.agregar(`${nombre}: el id "${id}" está repetido.`);
    vistos.add(id);
  }
}

function validarAlumnos(e: Errores, alumnos: Obj[]): void {
  const duenoDe = new Map<string, string>();
  alumnos.forEach((a, i) => {
    const donde = `Alumno ${i + 1}`;
    if (!textoNoVacio(a['id'])) e.agregar(`${donde}: falta el id.`);
    if (!textoNoVacio(a['matricula']) || a['matricula'].length > 30) e.agregar(`${donde}: falta la matrícula o no es válida.`);
    if (!textoNoVacio(a['nombre'])) e.agregar(`${donde}: falta el nombre.`);
    for (const campo of ['apellidoPaterno', 'apellidoMaterno', 'carrera', 'grupo', 'turno', 'email', 'telefono', 'notas']) {
      opcional(e, donde, a, campo, esTexto, 'texto');
    }
    opcional(e, donde, a, 'grado', gradoValido, 'un número');
    opcional(e, donde, a, 'activo', esBooleano, 'sí/no');
    opcional(e, donde, a, 'fechaRegistro', esFecha, 'una fecha');
    opcional(e, donde, a, 'editadoEn', esFecha, 'una fecha');
    opcional(e, donde, a, 'datosExtra', textosPlanos, 'una lista de textos');

    // Dos alumnos distintos con la misma matrícula: el índice de la base es
    // único y uno de los dos se perdería sin aviso.
    if (esTexto(a['matricula']) && esTexto(a['id'])) {
      const otro = duenoDe.get(a['matricula']);
      if (otro && otro !== a['id']) e.agregar(`${donde}: la matrícula ${a['matricula']} pertenece a otro alumno del archivo.`);
      duenoDe.set(a['matricula'], a['id']);
    }
  });
  idsUnicos(e, 'Alumnos', alumnos);
}

function validarRegistros(e: Errores, registros: Obj[]): void {
  registros.forEach((r, i) => {
    const donde = `Visita ${i + 1}`;
    if (!textoNoVacio(r['id'])) e.agregar(`${donde}: falta el id.`);
    if (!textoNoVacio(r['matricula'])) e.agregar(`${donde}: falta la matrícula.`);
    if (!esFecha(r['fechaHora'])) e.agregar(`${donde}: la fecha de entrada falta o no es válida.`);
    for (const campo of ['alumnoId', 'nombreCompleto', 'carrera', 'motivoId', 'motivoNombre', 'dispositivo', 'turno']) {
      opcional(e, donde, r, campo, esTexto, 'texto');
    }
    opcional(e, donde, r, 'motivoIds', listaDeTextos, 'una lista de textos');
    opcional(e, donde, r, 'motivoNombres', listaDeTextos, 'una lista de textos');
    opcional(e, donde, r, 'horaSalida', esFecha, 'una fecha');
    opcional(e, donde, r, 'editadoEn', esFecha, 'una fecha');
    opcional(e, donde, r, 'duracionMinutos', v => numeroFinito(v) && (v as number) >= 0, 'un número de minutos');
    for (const campo of ['sincronizado', 'cierreAutomatico', 'salidaEstimada', 'capturaManual']) {
      opcional(e, donde, r, campo, esBooleano, 'sí/no');
    }
  });
  idsUnicos(e, 'Visitas', registros);
}

function validarMotivos(e: Errores, motivos: Obj[]): void {
  motivos.forEach((m, i) => {
    const donde = `Actividad ${i + 1}`;
    if (!textoNoVacio(m['nombre'])) e.agregar(`${donde}: falta el nombre.`);
    for (const campo of ['id', 'icono', 'color', 'descripcion']) opcional(e, donde, m, campo, esTexto, 'texto');
    opcional(e, donde, m, 'orden', numeroFinito, 'un número');
    opcional(e, donde, m, 'activo', esBooleano, 'sí/no');
  });
  idsUnicos(e, 'Actividades', motivos);
}

function validarBitacora(e: Errores, eventos: Obj[]): void {
  eventos.forEach((ev, i) => {
    const donde = `Evento de bitácora ${i + 1}`;
    if (!textoNoVacio(ev['id']) || !textoNoVacio(ev['accion']) || !esFecha(ev['fechaHora'])) {
      e.agregar(`${donde}: le falta el id, la acción o la fecha.`);
    }
    for (const campo of ['detalle', 'equipo', 'refId']) opcional(e, donde, ev, campo, esTexto, 'texto');
  });
}

/** Una colección: lista de objetos. */
function coleccion(e: Errores, nombre: string, valor: unknown, obligatoria: boolean): Obj[] | null {
  if (valor === undefined && !obligatoria) return [];
  if (!Array.isArray(valor)) { e.agregar(`Falta la lista "${nombre}" o no es una lista.`); return null; }
  const malos = valor.findIndex(x => !esObjeto(x));
  if (malos >= 0) { e.agregar(`"${nombre}": el elemento ${malos + 1} no es un registro válido.`); return null; }
  return valor as Obj[];
}

/**
 * Valida un respaldo ya convertido de JSON. Devuelve los datos tipados solo
 * si TODO el archivo es válido; si no, los motivos (los primeros 10).
 */
export function validarRespaldo(datos: unknown): ResultadoValidacionRespaldo {
  const e = new Errores();
  if (!esObjeto(datos)) return { valido: false, errores: ['El archivo no contiene un respaldo de Stenbrary.'] };

  validarMeta(e, datos['meta']);
  if (e.hay) return { valido: false, errores: e.resumen() };

  const extra = Object.keys(datos).filter(k => !CLAVES_PERMITIDAS.has(k));
  if (extra.length > 0) e.agregar(`El respaldo trae secciones desconocidas: ${extra.map(k => `"${k}"`).join(', ')}.`);

  const alumnos = coleccion(e, 'alumnos', datos['alumnos'], true);
  const registros = coleccion(e, 'registros', datos['registros'], true);
  const motivos = coleccion(e, 'motivos', datos['motivos'], true);
  const bitacora = coleccion(e, 'bitacora', datos['bitacora'], false);
  if (datos['catalogoEscolar'] !== undefined && !esObjeto(datos['catalogoEscolar'])) {
    e.agregar('El catálogo de carreras no es válido.');
  }

  if (alumnos) validarAlumnos(e, alumnos);
  if (registros) validarRegistros(e, registros);
  if (motivos) validarMotivos(e, motivos);
  if (bitacora) validarBitacora(e, bitacora);

  return e.hay ? { valido: false, errores: e.resumen() } : { valido: true, datos: datos as unknown as BackupData };
}
