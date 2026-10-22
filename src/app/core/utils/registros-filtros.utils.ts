// ╔══════════════════════════════════════════════════════╗
// ║  core/utils/registros-filtros.utils.ts                ║
// ║  Stenbrary v3.58.0 — Filtros y orden de /registros    ║
// ║                                                       ║
// ║  Pedido en la verificación de agosto–septiembre       ║
// ║  (2026-10-22): filtrar por alumno/visitante, por tipo ║
// ║  de salida y por duración, ordenar por columna y      ║
// ║  sugerir alumnos al escribir (sin saber el nombre     ║
// ║  exacto ni sus acentos).                              ║
// ╚══════════════════════════════════════════════════════╝
import { Alumno, Registro } from '../models';
import { esInvitado, esSalidaEstimada } from './estadisticas.utils';

export type FiltroTipo = '' | 'alumno' | 'visitante';
export type FiltroSalida = '' | 'real' | 'sistema' | 'sin';
export type CampoOrden = 'fecha' | 'matricula' | 'nombre' | 'carrera' | 'duracion';
export interface Orden { campo: CampoOrden; dir: 'asc' | 'desc'; }

/** Minúsculas y sin acentos: "Martínez" y "martinez" son lo mismo. */
export function sinAcentos(texto: string): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function coincideTipo(r: Pick<Registro, 'matricula'>, tipo: FiltroTipo): boolean {
  if (!tipo) return true;
  return tipo === 'visitante' ? esInvitado(r) : !esInvitado(r);
}

/**
 * real = salida marcada por una persona; sistema = la puso el cierre
 * automático o el cierre al horario (P3); sin = sigue sin salida.
 */
export function coincideSalida(r: Registro, salida: FiltroSalida): boolean {
  if (!salida) return true;
  if (!r.horaSalida) return salida === 'sin';
  return salida === (esSalidaEstimada(r) ? 'sistema' : 'real');
}

/**
 * Duración en minutos dentro de [min, max] (ambos opcionales, inclusivos).
 * Con algún límite puesto, una visita sin duración no entra: no se sabe
 * cuánto duró.
 */
export function coincideDuracion(r: Pick<Registro, 'duracionMinutos'>, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  if (typeof r.duracionMinutos !== 'number') return false;
  if (min !== null && r.duracionMinutos < min) return false;
  if (max !== null && r.duracionMinutos > max) return false;
  return true;
}

/** Texto libre sobre matrícula y nombre, sin importar acentos. */
export function coincideBusqueda(r: Pick<Registro, 'matricula' | 'nombreCompleto'>, terminoNormalizado: string): boolean {
  if (!terminoNormalizado) return true;
  return r.matricula.toLowerCase().includes(terminoNormalizado)
    || sinAcentos(r.nombreCompleto).includes(terminoNormalizado);
}

const nombreDe = (a: Alumno) => [a.nombre, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ');

/**
 * Alumnos que coinciden con lo escrito, para el autocompletado. Cada
 * palabra escrita tiene que aparecer en el nombre o la matrícula ("ana gar"
 * encuentra a "Ana García López"). Primero los que empiezan igual.
 */
export function sugerirAlumnos(alumnos: Alumno[], texto: string, limite = 8): { alumno: Alumno; nombre: string }[] {
  const palabras = sinAcentos(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];
  const resultado: { alumno: Alumno; nombre: string; clave: string }[] = [];
  for (const alumno of alumnos) {
    const nombre = nombreDe(alumno);
    const clave = sinAcentos(nombre) + ' ' + alumno.matricula;
    if (palabras.every(p => clave.includes(p))) resultado.push({ alumno, nombre, clave });
  }
  const primera = palabras[0];
  resultado.sort((a, b) =>
    Number(!a.clave.startsWith(primera)) - Number(!b.clave.startsWith(primera))
    || a.nombre.localeCompare(b.nombre, 'es'));
  return resultado.slice(0, limite).map(({ alumno, nombre }) => ({ alumno, nombre }));
}

/**
 * Ordena una COPIA. Las visitas sin duración van al final en los dos
 * sentidos: no son "las más cortas". Empates: de la más nueva a la más vieja.
 */
export function ordenarRegistros<T extends Registro>(lista: T[], orden: Orden, fechaTs: (r: T) => number): T[] {
  const signo = orden.dir === 'asc' ? 1 : -1;
  const porFecha = (a: T, b: T) => fechaTs(b) - fechaTs(a);
  const comparar: Record<CampoOrden, (a: T, b: T) => number> = {
    fecha: (a, b) => signo * (fechaTs(a) - fechaTs(b)),
    matricula: (a, b) => signo * a.matricula.localeCompare(b.matricula),
    nombre: (a, b) => signo * a.nombreCompleto.localeCompare(b.nombreCompleto, 'es', { sensitivity: 'base' }),
    carrera: (a, b) => signo * (a.carrera ?? '').localeCompare(b.carrera ?? '', 'es'),
    duracion: (a, b) => {
      const da = typeof a.duracionMinutos === 'number', db = typeof b.duracionMinutos === 'number';
      if (da !== db) return da ? -1 : 1;
      return da ? signo * (a.duracionMinutos! - b.duracionMinutos!) : 0;
    },
  };
  return [...lista].sort((a, b) => comparar[orden.campo](a, b) || porFecha(a, b));
}
