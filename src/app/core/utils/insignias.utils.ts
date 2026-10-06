// ╔══════════════════════════════════════════════════════╗
// ║  insignias.utils.ts                                  ║
// ║  Stenbrary v3.11.0 — Insignias y rachas              ║
// ║                                                      ║
// ║  Calcula logros de un alumno a partir de sus         ║
// ║  registros: rachas de visita consecutivas, horas     ║
// ║  acumuladas y total de visitas.                      ║
// ╚══════════════════════════════════════════════════════╝

import { Registro } from '../models';
import { duracionReal } from './estadisticas.utils';

export interface Insignia {
  id: string;
  categoria: 'racha' | 'horas' | 'visitas';
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  umbral: number;
  obtenida: boolean;
}

export interface LogrosAlumno {
  rachaActual: number;
  rachaMaxima: number;
  horasAcumuladas: number;
  totalVisitas: number;
  insignias: Insignia[];
  insigniasObtenidas: Insignia[];
  proximaInsignia: Insignia | null;
}

const INSIGNIAS_RACHA: Omit<Insignia, 'obtenida'>[] = [
  { id: 'racha-3',  categoria: 'racha', nombre: 'Constancia',   descripcion: '3 días seguidos',    icono: 'local_fire_department', color: '#CD7F32', umbral: 3  },
  { id: 'racha-7',  categoria: 'racha', nombre: 'Semana Plena', descripcion: '7 días seguidos',    icono: 'local_fire_department', color: '#C0C0C0', umbral: 7  },
  { id: 'racha-14', categoria: 'racha', nombre: 'Habitual',     descripcion: '14 días seguidos',   icono: 'local_fire_department', color: '#F5A623', umbral: 14 },
  { id: 'racha-30', categoria: 'racha', nombre: 'Imparable',    descripcion: '30 días seguidos',   icono: 'local_fire_department', color: '#E5E4E2', umbral: 30 },
];

const INSIGNIAS_HORAS: Omit<Insignia, 'obtenida'>[] = [
  { id: 'horas-10',  categoria: 'horas', nombre: 'Lector',   descripcion: '10 horas en biblioteca',  icono: 'auto_stories',  color: '#CD7F32', umbral: 10  },
  { id: 'horas-25',  categoria: 'horas', nombre: 'Asiduo',   descripcion: '25 horas acumuladas',     icono: 'auto_stories',  color: '#C0C0C0', umbral: 25  },
  { id: 'horas-50',  categoria: 'horas', nombre: 'Experto',  descripcion: '50 horas de estudio',     icono: 'auto_stories',  color: '#F5A623', umbral: 50  },
  { id: 'horas-100', categoria: 'horas', nombre: 'Leyenda',  descripcion: '100 horas acumuladas',    icono: 'auto_stories',  color: '#E5E4E2', umbral: 100 },
];

const INSIGNIAS_VISITAS: Omit<Insignia, 'obtenida'>[] = [
  { id: 'visitas-10',  categoria: 'visitas', nombre: 'Primeros Pasos', descripcion: '10 visitas',   icono: 'trending_up', color: '#CD7F32', umbral: 10  },
  { id: 'visitas-50',  categoria: 'visitas', nombre: 'Fiel',            descripcion: '50 visitas',   icono: 'trending_up', color: '#C0C0C0', umbral: 50  },
  { id: 'visitas-100', categoria: 'visitas', nombre: 'Centenaria',      descripcion: '100 visitas',  icono: 'trending_up', color: '#F5A623', umbral: 100 },
  { id: 'visitas-250', categoria: 'visitas', nombre: 'Veterana',        descripcion: '250 visitas',  icono: 'trending_up', color: '#E5E4E2', umbral: 250 },
];

const TODAS_INSIGNIAS = [...INSIGNIAS_RACHA, ...INSIGNIAS_HORAS, ...INSIGNIAS_VISITAS];

/**
 * Calcula racha de visitas consecutivas (en días) terminando hoy o ayer.
 * Si el último día con visita es más viejo que "ayer", la racha actual es 0.
 */
function calcularRachas(registros: Registro[]): { actual: number; maxima: number } {
  if (registros.length === 0) return { actual: 0, maxima: 0 };

  const diasUnicos = new Set<string>();
  for (const r of registros) {
    const d = new Date(r.fechaHora);
    diasUnicos.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  // Medianoches en UTC: entre dos fechas consecutivas hay SIEMPRE 24 h.
  // Con medianoches locales, el día del cambio de horario (Nuevo Laredo lo
  // conserva) mide 23 o 25 h y la racha se cortaba sin motivo.
  const fechas = [...diasUnicos].map(k => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m, d);
  }).sort((a, b) => a - b);

  const UN_DIA = 86400000;

  let maxima = 1;
  let actual = 1;
  for (let i = 1; i < fechas.length; i++) {
    if (fechas[i] - fechas[i - 1] === UN_DIA) {
      actual++;
      maxima = Math.max(maxima, actual);
    } else {
      actual = 1;
    }
  }

  const hoy = new Date();
  const hoyTs = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const ultimo = fechas[fechas.length - 1];
  const diffDias = Math.round((hoyTs - ultimo) / UN_DIA);

  let rachaActual = 0;
  if (diffDias <= 1) {
    rachaActual = 1;
    for (let i = fechas.length - 2; i >= 0; i--) {
      if (fechas[i + 1] - fechas[i] === UN_DIA) rachaActual++;
      else break;
    }
  }

  return { actual: rachaActual, maxima };
}

export function calcularLogros(registros: Registro[]): LogrosAlumno {
  const { actual: rachaActual, maxima: rachaMaxima } = calcularRachas(registros);

  // Solo salidas reales: las estimadas por el sistema no son horas que el
  // alumno haya demostrado (P3).
  const minutos = registros.reduce((acc, r) => acc + (duracionReal(r) ?? 0), 0);
  const horasAcumuladas = Math.round((minutos / 60) * 10) / 10;

  const totalVisitas = registros.length;

  const insignias: Insignia[] = TODAS_INSIGNIAS.map(i => {
    let valor = 0;
    if (i.categoria === 'racha') valor = Math.max(rachaActual, rachaMaxima);
    else if (i.categoria === 'horas') valor = horasAcumuladas;
    else if (i.categoria === 'visitas') valor = totalVisitas;
    return { ...i, obtenida: valor >= i.umbral };
  });

  const obtenidas = insignias.filter(i => i.obtenida);

  // Próxima: la más cercana sin obtener
  const pendientes = insignias.filter(i => !i.obtenida).sort((a, b) => {
    const diffA = a.umbral - valorCategoria(a.categoria, rachaActual, rachaMaxima, horasAcumuladas, totalVisitas);
    const diffB = b.umbral - valorCategoria(b.categoria, rachaActual, rachaMaxima, horasAcumuladas, totalVisitas);
    return diffA - diffB;
  });

  return {
    rachaActual,
    rachaMaxima,
    horasAcumuladas,
    totalVisitas,
    insignias,
    insigniasObtenidas: obtenidas,
    proximaInsignia: pendientes[0] ?? null,
  };
}

function valorCategoria(cat: Insignia['categoria'], rActual: number, rMax: number, horas: number, visitas: number): number {
  if (cat === 'racha') return Math.max(rActual, rMax);
  if (cat === 'horas') return horas;
  return visitas;
}
