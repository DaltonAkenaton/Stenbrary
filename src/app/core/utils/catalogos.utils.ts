// ╔══════════════════════════════════════════════════════╗
// ║  catalogos.utils.ts                                  ║
// ║  Stenbrary v3.57.0 — Catálogos editables             ║
// ║                                                      ║
// ║  Carreras, grupos y grados dejaron de ser constantes  ║
// ║  de código: la carrera de TI cambió de nombre y no    ║
// ║  había forma de reflejarlo sin una versión nueva.     ║
// ║  (ESTADO.md §2.3.1; prerequisito de la Fase 5.)       ║
// ║                                                      ║
// ║  Funciones puras: ConfigService guarda, la pantalla   ║
// ║  edita una copia, el respaldo combina.                ║
// ║  Los turnos siguen fijos: Estadísticas reparte por    ║
// ║  ellos y nadie pidió cambiarlos.                      ║
// ╚══════════════════════════════════════════════════════╝

import { CARRERAS, GRADOS, GRUPOS } from '../constants/catalogos.constants';

export interface CarreraCatalogo {
  /** Estable: renombrar no cambia el id (Fase 2: fila de una tabla). */
  id: string;
  nombre: string;
  /** Inactiva = ya no se ofrece al registrar ni al importar; sus datos siguen. */
  activa: boolean;
}

export interface CatalogoEscolar {
  carreras: CarreraCatalogo[];
  grupos: string[];
  gradoMin: number;
  gradoMax: number;
}

/** Comparación sin mayúsculas, acentos ni espacios dobles. */
export function claveCatalogo(texto: string): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function idDesdeNombre(nombre: string, usados: Set<string>): string {
  const base = 'car-' + (claveCatalogo(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x');
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  usados.add(id);
  return id;
}

/** El catálogo de fábrica (el que estaba fijo en el código hasta v3.56). */
export function catalogoInicial(): CatalogoEscolar {
  const usados = new Set<string>();
  return {
    carreras: CARRERAS.map(nombre => ({ id: idDesdeNombre(nombre, usados), nombre, activa: true })),
    grupos: [...GRUPOS],
    gradoMin: Math.min(...GRADOS),
    gradoMax: Math.max(...GRADOS),
  };
}

export function copiarCatalogo(c: CatalogoEscolar): CatalogoEscolar {
  return { carreras: c.carreras.map(x => ({ ...x })), grupos: [...c.grupos], gradoMin: c.gradoMin, gradoMax: c.gradoMax };
}

/**
 * Lee un catálogo guardado tolerando basura (localStorage o un respaldo lo
 * puede traer roto). Lo que no sirve se descarta; si no queda nada útil,
 * el de fábrica.
 */
export function normalizarCatalogo(crudo: unknown): CatalogoEscolar {
  const base = catalogoInicial();
  const c = crudo as Partial<CatalogoEscolar> | null | undefined;
  if (!c || typeof c !== 'object') return base;

  const usados = new Set<string>();
  const vistos = new Set<string>();
  const carreras: CarreraCatalogo[] = [];
  for (const x of Array.isArray(c.carreras) ? c.carreras : []) {
    const nombre = typeof x?.nombre === 'string' ? x.nombre.replace(/\s+/g, ' ').trim() : '';
    if (!nombre || vistos.has(claveCatalogo(nombre))) continue;
    vistos.add(claveCatalogo(nombre));
    const id = typeof x.id === 'string' && x.id && !usados.has(x.id) ? x.id : idDesdeNombre(nombre, usados);
    usados.add(id);
    carreras.push({ id, nombre, activa: x.activa !== false });
  }

  const grupos = normalizarGrupos(Array.isArray(c.grupos) ? c.grupos : []);
  let gradoMin = Math.round(Number(c.gradoMin));
  let gradoMax = Math.round(Number(c.gradoMax));
  if (!Number.isFinite(gradoMin) || gradoMin < 1) gradoMin = base.gradoMin;
  if (!Number.isFinite(gradoMax) || gradoMax > 20) gradoMax = base.gradoMax;
  if (gradoMax < gradoMin) [gradoMin, gradoMax] = [base.gradoMin, base.gradoMax];

  return {
    carreras: carreras.length > 0 ? carreras : base.carreras,
    grupos: grupos.length > 0 ? grupos : base.grupos,
    gradoMin,
    gradoMax,
  };
}

function normalizarGrupos(lista: unknown[]): string[] {
  const out: string[] = [];
  for (const g of lista) {
    const t = typeof g === 'string' ? g.trim().toUpperCase() : '';
    if (t && t.length <= 10 && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Nombres de las carreras que se ofrecen al registrar e importar. */
export function carrerasActivas(c: CatalogoEscolar): string[] {
  return c.carreras.filter(x => x.activa).map(x => x.nombre);
}

/**
 * Las opciones de un formulario de edición: las activas, más la que ya
 * tiene el alumno aunque esté inactiva o fuera del catálogo (si no, el
 * select la borraría al guardar).
 */
export function opcionesCarrera(c: CatalogoEscolar, actual?: string): string[] {
  const activas = carrerasActivas(c);
  if (actual && !activas.some(n => claveCatalogo(n) === claveCatalogo(actual))) return [...activas, actual];
  return activas;
}

export function gradosDe(c: CatalogoEscolar): number[] {
  const out: number[] = [];
  for (let g = c.gradoMin; g <= c.gradoMax; g++) out.push(g);
  return out;
}

/** La carrera del catálogo (activa o no) con ese nombre, sin importar acentos. */
export function buscarCarrera(c: CatalogoEscolar, nombre: string): CarreraCatalogo | undefined {
  const k = claveCatalogo(nombre);
  return c.carreras.find(x => claveCatalogo(x.nombre) === k);
}

export type ResultadoEdicion = { ok: true; catalogo: CatalogoEscolar } | { ok: false; error: string };

export function agregarCarrera(c: CatalogoEscolar, nombre: string): ResultadoEdicion {
  const limpio = (nombre ?? '').replace(/\s+/g, ' ').trim();
  if (limpio.length < 3) return { ok: false, error: 'Escribe el nombre de la carrera.' };
  const existe = buscarCarrera(c, limpio);
  if (existe) {
    return { ok: false, error: existe.activa ? `"${existe.nombre}" ya está en el catálogo.` : `"${existe.nombre}" ya existe, desactivada: actívala.` };
  }
  const nuevo = copiarCatalogo(c);
  nuevo.carreras.push({ id: idDesdeNombre(limpio, new Set(c.carreras.map(x => x.id))), nombre: limpio, activa: true });
  return { ok: true, catalogo: nuevo };
}

export function renombrarCarrera(c: CatalogoEscolar, id: string, nombre: string): ResultadoEdicion {
  const limpio = (nombre ?? '').replace(/\s+/g, ' ').trim();
  if (limpio.length < 3) return { ok: false, error: 'Escribe el nombre nuevo.' };
  const otra = buscarCarrera(c, limpio);
  if (otra && otra.id !== id) return { ok: false, error: `Ya hay una carrera llamada "${otra.nombre}".` };
  const nuevo = copiarCatalogo(c);
  const x = nuevo.carreras.find(y => y.id === id);
  if (!x) return { ok: false, error: 'La carrera ya no existe.' };
  x.nombre = limpio;
  return { ok: true, catalogo: nuevo };
}

export function alternarCarrera(c: CatalogoEscolar, id: string): ResultadoEdicion {
  const nuevo = copiarCatalogo(c);
  const x = nuevo.carreras.find(y => y.id === id);
  if (!x) return { ok: false, error: 'La carrera ya no existe.' };
  if (x.activa && nuevo.carreras.filter(y => y.activa).length === 1) {
    return { ok: false, error: 'Tiene que quedar al menos una carrera activa.' };
  }
  x.activa = !x.activa;
  return { ok: true, catalogo: nuevo };
}

export function agregarGrupo(c: CatalogoEscolar, grupo: string): ResultadoEdicion {
  const g = (grupo ?? '').trim().toUpperCase();
  if (!g) return { ok: false, error: 'Escribe el grupo.' };
  if (g.length > 10) return { ok: false, error: 'Máximo 10 caracteres.' };
  if (c.grupos.includes(g)) return { ok: false, error: `El grupo ${g} ya existe.` };
  const nuevo = copiarCatalogo(c);
  nuevo.grupos.push(g);
  return { ok: true, catalogo: nuevo };
}

export function quitarGrupo(c: CatalogoEscolar, grupo: string): ResultadoEdicion {
  if (c.grupos.length <= 1) return { ok: false, error: 'Tiene que quedar al menos un grupo.' };
  const nuevo = copiarCatalogo(c);
  nuevo.grupos = nuevo.grupos.filter(g => g !== grupo);
  return { ok: true, catalogo: nuevo };
}

export function cambiarRangoGrados(c: CatalogoEscolar, min: number, max: number): ResultadoEdicion {
  const a = Math.round(Number(min));
  const b = Math.round(Number(max));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b > 20) return { ok: false, error: 'Los grados van de 1 a 20.' };
  if (b < a) return { ok: false, error: 'El grado máximo no puede ser menor que el mínimo.' };
  return { ok: true, catalogo: { ...copiarCatalogo(c), gradoMin: a, gradoMax: b } };
}

/**
 * Combinar el catálogo que llega en un respaldo con el local. Manda el local
 * (es el equipo donde se está trabajando): solo se agregan las carreras y
 * grupos que no tiene. Una carrera renombrada en el otro equipo llega con el
 * mismo id: se respeta el nombre local para no pisar un cambio de aquí.
 */
export function combinarCatalogos(local: CatalogoEscolar, remoto: CatalogoEscolar): { catalogo: CatalogoEscolar; nuevos: number } {
  const nuevo = copiarCatalogo(local);
  const ids = new Set(nuevo.carreras.map(x => x.id));
  let nuevos = 0;
  for (const x of remoto.carreras) {
    if (ids.has(x.id) || buscarCarrera(nuevo, x.nombre)) continue;
    nuevo.carreras.push({ ...x });
    ids.add(x.id);
    nuevos++;
  }
  for (const g of remoto.grupos) if (!nuevo.grupos.includes(g)) { nuevo.grupos.push(g); nuevos++; }
  nuevo.gradoMin = Math.min(nuevo.gradoMin, remoto.gradoMin);
  nuevo.gradoMax = Math.max(nuevo.gradoMax, remoto.gradoMax);
  return { catalogo: nuevo, nuevos };
}
