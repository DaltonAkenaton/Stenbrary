// ╔══════════════════════════════════════════════════════════════════╗
// ║  core/utils/reloj.utils.ts                                        ║
// ║  Stenbrary v3.59.0 — La hora del sistema no depende del reloj     ║
// ║  de la computadora                                                 ║
// ║                                                                    ║
// ║  Las computadoras de la facultad suelen tener la hora mal          ║
// ║  (pedido del usuario, 2026-10-22). Toda visita, "hoy", horario y   ║
// ║  cierre automático sale de la hora: si la PC va 7 min adelantada,  ║
// ║  TODO va 7 min adelantado, y una fecha mal pone visitas en otro    ║
// ║  día.                                                              ║
// ║                                                                    ║
// ║  Solución: un DESFASE (hora correcta − hora de la PC) que se       ║
// ║  aplica en UN solo lugar, reemplazando `Date` al arrancar          ║
// ║  (`instalarReloj`, en main.ts). Así las 38 partes del código que   ║
// ║  leen la hora usan la misma, sin tocarlas una por una: si unas     ║
// ║  usaran la corregida y otras la de la PC, una visita de las 23:58  ║
// ║  podía caer en un día y el filtro de "hoy" en otro.                ║
// ║                                                                    ║
// ║  El desfase sale de internet (cabecera Date del servidor,          ║
// ║  RelojService) o de un ajuste a mano con PIN. Se guarda: sin       ║
// ║  internet se sigue usando el último.                               ║
// ╚══════════════════════════════════════════════════════════════════╝

export const CLAVE_RELOJ = 'stenbrary-reloj';

export interface EstadoReloj {
  /** Hora correcta − hora de la PC, en ms. Positivo = la PC va atrasada. */
  desfaseMs: number;
  fuente: 'internet' | 'manual';
  /** Hora de la PC (sin corregir) al fijar el desfase: para detectar que la cambiaron. */
  pcAlAjustar: number;
}

const DateOriginal = Date;
let desfase = 0;

/** Hora de la PC tal cual, sin corregir. */
export function horaPc(): number {
  return DateOriginal.now();
}

export function desfaseActual(): number {
  return desfase;
}

/**
 * Un `Date` que, sin argumentos (y en `Date.now()`), da la hora de la PC
 * más el desfase. Con argumentos se comporta igual que el original: una
 * fecha guardada no se mueve. `instanceof Date`, `Date.UTC`, `Date.parse` y
 * llamar `Date()` sin `new` siguen funcionando.
 */
export function crearDateCorregido(Original: DateConstructor, desfaseMs: () => number): DateConstructor {
  function DateCorregido(this: unknown, ...args: unknown[]): unknown {
    if (!new.target) return new Original(Original.now() + desfaseMs()).toString();
    return Reflect.construct(Original, args.length ? args : [Original.now() + desfaseMs()], new.target);
  }
  Object.setPrototypeOf(DateCorregido, Original);
  DateCorregido.prototype = Original.prototype;
  (DateCorregido as unknown as { now: () => number }).now = () => Original.now() + desfaseMs();
  return DateCorregido as unknown as DateConstructor;
}

export function leerEstadoReloj(storage: Pick<Storage, 'getItem'>): EstadoReloj | null {
  try {
    const e = JSON.parse(storage.getItem(CLAVE_RELOJ) || 'null');
    if (e && Number.isFinite(e.desfaseMs) && Number.isFinite(e.pcAlAjustar)
        && (e.fuente === 'internet' || e.fuente === 'manual')) return e;
  } catch {
    // Valor corrupto: se ignora y se usa la hora de la PC.
  }
  return null;
}

let instalado = false;

/** Se llama una vez en main.ts, antes de que arranque Angular. */
export function instalarReloj(storage: Pick<Storage, 'getItem'> = localStorage): void {
  desfase = leerEstadoReloj(storage)?.desfaseMs ?? 0;
  if (instalado) return;
  instalado = true;
  globalThis.Date = crearDateCorregido(DateOriginal, () => desfase);
}

/** Fija un desfase nuevo: vale desde este momento para todo el sistema. */
export function fijarDesfase(estado: EstadoReloj | null, storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage): void {
  desfase = estado?.desfaseMs ?? 0;
  try {
    if (estado) storage.setItem(CLAVE_RELOJ, JSON.stringify(estado));
    else storage.removeItem(CLAVE_RELOJ);
  } catch {
    // Sin almacenamiento el desfase vale solo hasta recargar.
  }
}

/** Una respuesta que tardó más que esto no da una hora confiable. */
export const IDA_Y_VUELTA_MAX_MS = 5000;

/**
 * Desfase a partir de la cabecera `Date` del servidor (resolución de 1 s:
 * se toma la mitad de ese segundo) y la hora de la PC antes y después de la
 * petición (la respuesta se generó, en promedio, a la mitad del viaje).
 */
export function desfaseDesdeServidor(cabeceraDate: string | null, pcAntes: number, pcDespues: number): number | null {
  if (!cabeceraDate) return null;
  const servidor = Date.parse(cabeceraDate);
  if (!Number.isFinite(servidor)) return null;
  if (pcDespues < pcAntes || pcDespues - pcAntes > IDA_Y_VUELTA_MAX_MS) return null;
  return Math.round(servidor + 500 - (pcAntes + pcDespues) / 2);
}

/** Desfase para que "ahora" sea la hora que alguien escribió a mano. */
export function desfaseManual(horaReal: Date, pc: number = horaPc()): number {
  return horaReal.getTime() - pc;
}

export type AvisoReloj = 'nunca' | 'cambiaron-hora' | 'sin-verificar-hace-mucho';

/** Días sin poder verificar la hora antes de avisar. */
export const DIAS_SIN_VERIFICAR = 14;

/**
 * ¿Se puede confiar en la hora? `nunca`: no hay desfase guardado (sin
 * internet ni ajuste manual). `cambiaron-hora`: el reloj de la PC está
 * ANTES de cuando se ajustó, así que alguien lo cambió o se reinició (pila
 * del BIOS) y el desfase guardado ya no sirve. `sin-verificar-hace-mucho`:
 * el desfase es viejo y los relojes se van moviendo.
 */
export function revisarReloj(estado: EstadoReloj | null, pc: number = horaPc()): AvisoReloj | null {
  if (!estado) return 'nunca';
  if (pc < estado.pcAlAjustar - 60_000) return 'cambiaron-hora';
  if (pc - estado.pcAlAjustar > DIAS_SIN_VERIFICAR * 86_400_000) return 'sin-verificar-hace-mucho';
  return null;
}

/** "7 min adelantada", "2 h 5 min atrasada", "al minuto". */
export function describirDesfase(desfaseMs: number): string {
  const min = Math.round(Math.abs(desfaseMs) / 60_000);
  if (min === 0) return 'al minuto';
  const texto = min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`;
  // Desfase positivo = a la PC le falta tiempo = va atrasada.
  return `${texto} ${desfaseMs > 0 ? 'atrasada' : 'adelantada'}`;
}
