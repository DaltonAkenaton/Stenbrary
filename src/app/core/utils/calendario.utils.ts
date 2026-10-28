// ╔══════════════════════════════════════════════════════╗
// ║  calendario.utils.ts                                  ║
// ║  Stenbrary v3.43.0 — Calendario escolar configurable   ║
// ║                                                       ║
// ║  Periodos (Primavera / Verano / Otoño) y               ║
// ║  días inhábiles, capturados a mano por el coordinador. ║
// ║  No se calculan con reglas: la universidad "usualmente"║
// ║  recorre los festivos al lunes o al viernes, pero no   ║
// ║  siempre — solo una lista editable lo refleja.         ║
// ║                                                       ║
// ║  Las fechas viajan como 'YYYY-MM-DD' (lo que da un     ║
// ║  <input type="date">) y se interpretan SIEMPRE en hora ║
// ║  local con parseFechaLocal. Funciones puras: `hoy`     ║
// ║  entra como parámetro.                                 ║
// ╚══════════════════════════════════════════════════════╝

import { parseFechaLocal } from './tiempo.utils';

export interface PeriodoEscolar {
  id: string;
  nombre: string;
  /** 'YYYY-MM-DD', inclusive. */
  inicio: string;
  /** 'YYYY-MM-DD', inclusive. */
  fin: string;
}

/** Un día o un rango de días sin actividad (festivo, vacaciones). */
export interface DiaInhabil {
  id: string;
  /** 'YYYY-MM-DD', inclusive. */
  desde: string;
  /** 'YYYY-MM-DD', inclusive. Igual a `desde` si es un solo día. */
  hasta: string;
  descripcion: string;
}

export interface CalendarioEscolar {
  periodos: PeriodoEscolar[];
  diasInhabiles: DiaInhabil[];
}

/**
 * Calendario escolar 2026 como punto de partida, leído del PDF oficial
 * "Calendario Escolar Administrativo 2026" (D-OP-01-04-01-VER-6). Es solo
 * un valor inicial: todo se edita en Configuración → Calendario escolar.
 *
 * Los periodos van SIN HUECOS entre sí (decisión del usuario, 2026-10-06):
 * así siempre hay un "periodo en curso" para las estadísticas. Las clases
 * de cada periodo empiezan después (19 ene, ~1 jun, 17 ago); los días
 * previos son de inscripciones y trámites, en los que la biblioteca abre.
 */
export const CALENDARIO_BASE_2026: CalendarioEscolar = {
  periodos: [
    { id: 'uat-2026-primavera', nombre: 'Primavera 2026', inicio: '2026-01-05', fin: '2026-05-31' },
    { id: 'uat-2026-verano', nombre: 'Verano 2026', inicio: '2026-06-01', fin: '2026-08-16' },
    { id: 'uat-2026-otono', nombre: 'Otoño 2026', inicio: '2026-08-17', fin: '2026-12-31' },
  ],
  diasInhabiles: [
    { id: 'uat-2026-01', desde: '2026-01-01', hasta: '2026-01-02', descripcion: 'Año Nuevo y vacaciones' },
    { id: 'uat-2026-02', desde: '2026-02-02', hasta: '2026-02-02', descripcion: 'Día de la Constitución' },
    { id: 'uat-2026-03', desde: '2026-03-16', hasta: '2026-03-16', descripcion: 'Natalicio de Benito Juárez' },
    { id: 'uat-2026-04', desde: '2026-03-30', hasta: '2026-04-10', descripcion: 'Semana Santa y días del contrato colectivo' },
    { id: 'uat-2026-05', desde: '2026-05-01', hasta: '2026-05-01', descripcion: 'Día del Trabajo' },
    { id: 'uat-2026-06', desde: '2026-05-05', hasta: '2026-05-05', descripcion: 'Batalla de Puebla' },
    { id: 'uat-2026-07', desde: '2026-05-15', hasta: '2026-05-15', descripcion: 'Día del Maestro' },
    { id: 'uat-2026-08', desde: '2026-07-20', hasta: '2026-07-31', descripcion: 'Vacaciones de verano' },
    { id: 'uat-2026-09', desde: '2026-09-16', hasta: '2026-09-16', descripcion: 'Día de la Independencia' },
    { id: 'uat-2026-10', desde: '2026-10-13', hasta: '2026-10-13', descripcion: 'Día libre de la universidad' },
    { id: 'uat-2026-11', desde: '2026-11-02', hasta: '2026-11-02', descripcion: 'Día de Muertos' },
    { id: 'uat-2026-12', desde: '2026-11-16', hasta: '2026-11-16', descripcion: 'Día de la Revolución' },
    { id: 'uat-2026-13', desde: '2026-12-16', hasta: '2026-12-31', descripcion: 'Vacaciones de invierno' },
  ],
};

interface Intervalo { inicio: Date; fin: Date }

/** [00:00 del primer día, 23:59:59.999 del último], o null si alguna fecha no es válida. */
function intervalo(desde: string, hasta: string): Intervalo | null {
  const inicio = parseFechaLocal(desde);
  const fin = parseFechaLocal(hasta);
  if (!inicio || !fin) return null;
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
}

/** Rango de fechas de un periodo, listo para filtrar registros. */
export function rangoDePeriodo(p: PeriodoEscolar): Intervalo | null {
  return intervalo(p.inicio, p.fin);
}

function periodosValidosOrdenados(cal: CalendarioEscolar): { periodo: PeriodoEscolar; rango: Intervalo }[] {
  return cal.periodos
    .map(periodo => ({ periodo, rango: rangoDePeriodo(periodo) }))
    .filter((x): x is { periodo: PeriodoEscolar; rango: Intervalo } =>
      x.rango !== null && x.rango.inicio <= x.rango.fin)
    .sort((a, b) => a.rango.inicio.getTime() - b.rango.inicio.getTime());
}

export interface PeriodoResuelto {
  periodo: PeriodoEscolar;
  rango: Intervalo;
  /** True si `hoy` no cae en ningún periodo y se devolvió el último que terminó. */
  terminado: boolean;
}

/**
 * El periodo en curso. Si `hoy` cae en un hueco entre periodos (o después
 * del último), se devuelve el último que terminó, marcado `terminado`, para
 * que "Este periodo" siempre muestre algo con sentido. `null` si no hay
 * periodos o todos son futuros.
 */
export function periodoActual(cal: CalendarioEscolar, hoy: Date = new Date()): PeriodoResuelto | null {
  const lista = periodosValidosOrdenados(cal);
  const t = hoy.getTime();
  const enCurso = lista.find(x => x.rango.inicio.getTime() <= t && t <= x.rango.fin.getTime());
  if (enCurso) return { ...enCurso, terminado: false };
  const pasados = lista.filter(x => x.rango.fin.getTime() < t);
  const ultimo = pasados[pasados.length - 1];
  return ultimo ? { ...ultimo, terminado: true } : null;
}

/** El periodo que terminó justo antes de que empezara `referencia`. */
export function periodoAnterior(cal: CalendarioEscolar, referencia: PeriodoEscolar): PeriodoResuelto | null {
  const ref = rangoDePeriodo(referencia);
  if (!ref) return null;
  const previos = periodosValidosOrdenados(cal).filter(x => x.rango.fin.getTime() < ref.inicio.getTime());
  const anterior = previos[previos.length - 1];
  return anterior ? { ...anterior, terminado: true } : null;
}

/** El día inhábil que cubre `fecha`, o null. */
export function diaInhabilEn(cal: CalendarioEscolar, fecha: Date): DiaInhabil | null {
  const t = fecha.getTime();
  for (const d of cal.diasInhabiles) {
    const r = intervalo(d.desde, d.hasta);
    if (r && r.inicio.getTime() <= t && t <= r.fin.getTime()) return d;
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// VALIDACIÓN (lo que la pantalla de Configuración advierte)
// ═══════════════════════════════════════════════════════

export interface AvisoCalendario {
  tipo: 'error' | 'aviso';
  mensaje: string;
}

/**
 * Revisa el calendario capturado. Los `error` impiden guardar un periodo
 * (fechas inválidas o al revés); los `aviso` se muestran pero se respetan:
 * el coordinador manda sobre los defaults.
 */
export function revisarCalendario(cal: CalendarioEscolar, hoy: Date = new Date()): AvisoCalendario[] {
  const avisos: AvisoCalendario[] = [];

  for (const p of cal.periodos) {
    const r = rangoDePeriodo(p);
    if (!p.nombre.trim()) avisos.push({ tipo: 'error', mensaje: 'Hay un periodo sin nombre.' });
    if (!r) avisos.push({ tipo: 'error', mensaje: `"${p.nombre || 'Sin nombre'}" tiene una fecha inválida.` });
    else if (r.inicio > r.fin) avisos.push({ tipo: 'error', mensaje: `"${p.nombre}" termina antes de empezar.` });
  }
  for (const d of cal.diasInhabiles) {
    const r = intervalo(d.desde, d.hasta);
    if (!r) avisos.push({ tipo: 'error', mensaje: `"${d.descripcion || 'Día inhábil'}" tiene una fecha inválida.` });
    else if (r.inicio > r.fin) avisos.push({ tipo: 'error', mensaje: `"${d.descripcion}" termina antes de empezar.` });
  }

  const lista = periodosValidosOrdenados(cal);
  for (let i = 1; i < lista.length; i++) {
    const prev = lista[i - 1];
    const act = lista[i];
    if (act.rango.inicio <= prev.rango.fin) {
      avisos.push({ tipo: 'aviso', mensaje: `"${prev.periodo.nombre}" y "${act.periodo.nombre}" se enciman.` });
      continue;
    }
    // Hueco = algún día de calendario entre el fin de uno y el inicio del otro.
    const diaSiguiente = new Date(prev.rango.fin);
    diaSiguiente.setDate(diaSiguiente.getDate() + 1);
    diaSiguiente.setHours(0, 0, 0, 0);
    if (diaSiguiente.getTime() < act.rango.inicio.getTime()) {
      avisos.push({
        tipo: 'aviso',
        mensaje: `Hay días sin periodo entre "${prev.periodo.nombre}" y "${act.periodo.nombre}". ` +
          'En esos días "Este periodo" mostrará el último que terminó.',
      });
    }
  }

  if (lista.length > 0) {
    const ultimoFin = lista[lista.length - 1].rango.fin;
    if (hoy.getTime() > ultimoFin.getTime()) {
      avisos.push({
        tipo: 'aviso',
        mensaje: 'El calendario ya no cubre la fecha de hoy. Captura los periodos del nuevo ciclo.',
      });
    }
  }
  return avisos;
}

// ═══════════════════════════════════════════════════════
// CALENDARIO TÍPICO PARA CUALQUIER AÑO (v3.46.0)
// ═══════════════════════════════════════════════════════
// El PDF oficial sale una vez al año y no siempre a tiempo. Este generador
// reproduce el patrón del calendario 2026 con reglas, para que el
// coordinador arranque con fechas cercanas a las reales y solo ajuste lo
// que la universidad haya movido ese año. ES UNA APROXIMACIÓN: la pantalla lo dice.
//
// Reglas (sacadas del PDF 2026; verificadas contra él en los tests):
// - Periodos sin huecos: Primavera 1 ene–31 may; Verano 1 jun hasta el día
//   antes del inicio de Otoño; Otoño desde el TERCER lunes de agosto
//   (inicio de clases) hasta el 31 dic.
// - Festivos de ley con lunes "recorridos": primer lunes de febrero,
//   tercer lunes de marzo y tercer lunes de noviembre.
// - Semana Santa: del lunes de la semana santa al viernes de la semana
//   siguiente (la universidad suma días del contrato colectivo). Depende de la
//   fecha de Pascua, que se calcula.
// - Verano: las dos semanas antes del primer lunes de agosto.
// - Invierno: 16–31 de diciembre. Año Nuevo: del 1 de enero al viernes
//   anterior al primer lunes de clases.

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sumarDias(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** El n-ésimo lunes (1 = primero) del mes. `mes` 0–11. */
function lunesNumero(anio: number, mes: number, n: number): Date {
  const primero = new Date(anio, mes, 1);
  const hastaLunes = (8 - primero.getDay()) % 7; // 0 si el 1 ya es lunes
  return new Date(anio, mes, 1 + hastaLunes + (n - 1) * 7);
}

/** Domingo de Pascua (algoritmo anónimo gregoriano / Meeus). */
export function domingoDePascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

/** Calendario aproximado de la universidad para `anio`, con las reglas de arriba. */
export function calendarioTipico(anio: number): CalendarioEscolar {
  const inicioOtono = lunesNumero(anio, 7, 3);
  const primerLunesAgosto = lunesNumero(anio, 7, 1);
  const pascua = domingoDePascua(anio);
  // Primer lunes con clases tras Año Nuevo (el 1 y el 2 son de vacaciones).
  const primerLunesHabil = sumarDias(new Date(anio, 0, 3), (8 - new Date(anio, 0, 3).getDay()) % 7);
  const dia = (mes: number, d: number) => iso(new Date(anio, mes, d));
  const un = (id: string, f: Date | string, descripcion: string): DiaInhabil => {
    const x = typeof f === 'string' ? f : iso(f);
    return { id: `tipico-${anio}-${id}`, desde: x, hasta: x, descripcion };
  };
  const rango = (id: string, desde: Date, hasta: Date, descripcion: string): DiaInhabil =>
    ({ id: `tipico-${anio}-${id}`, desde: iso(desde), hasta: iso(hasta), descripcion });

  return {
    periodos: [
      { id: `tipico-${anio}-primavera`, nombre: `Primavera ${anio}`, inicio: dia(0, 1), fin: dia(4, 31) },
      { id: `tipico-${anio}-verano`, nombre: `Verano ${anio}`, inicio: dia(5, 1), fin: iso(sumarDias(inicioOtono, -1)) },
      { id: `tipico-${anio}-otono`, nombre: `Otoño ${anio}`, inicio: iso(inicioOtono), fin: dia(11, 31) },
    ],
    diasInhabiles: [
      // Hasta el viernes anterior al primer lunes de clases (nunca antes del 1 de enero).
      rango('anio-nuevo', new Date(anio, 0, 1),
        sumarDias(primerLunesHabil, -3) < new Date(anio, 0, 1) ? new Date(anio, 0, 1) : sumarDias(primerLunesHabil, -3),
        'Año Nuevo y vacaciones'),
      un('constitucion', lunesNumero(anio, 1, 1), 'Día de la Constitución'),
      un('juarez', lunesNumero(anio, 2, 3), 'Natalicio de Benito Juárez'),
      rango('semana-santa', sumarDias(pascua, -6), sumarDias(pascua, 5), 'Semana Santa y días del contrato colectivo'),
      un('trabajo', dia(4, 1), 'Día del Trabajo'),
      un('puebla', dia(4, 5), 'Batalla de Puebla'),
      un('maestro', dia(4, 15), 'Día del Maestro'),
      rango('verano', sumarDias(primerLunesAgosto, -14), sumarDias(primerLunesAgosto, -3), 'Vacaciones de verano'),
      un('independencia', dia(8, 16), 'Día de la Independencia'),
      un('uat', dia(9, 13), 'Día libre de la universidad (verificar con el calendario oficial)'),
      un('muertos', dia(10, 2), 'Día de Muertos'),
      un('revolucion', lunesNumero(anio, 10, 3), 'Día de la Revolución'),
      rango('invierno', new Date(anio, 11, 16), new Date(anio, 11, 31), 'Vacaciones de invierno'),
    ],
  };
}

/**
 * Calendario con el que arranca una instalación: el oficial si es el año
 * que tenemos capturado del PDF (2026), el típico calculado si no.
 */
export function calendarioInicial(hoy: Date = new Date()): CalendarioEscolar {
  return hoy.getFullYear() === 2026 ? CALENDARIO_BASE_2026 : calendarioTipico(hoy.getFullYear());
}
