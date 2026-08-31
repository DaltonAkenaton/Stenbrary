// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/utils/integridad.utils.ts        ║
// ║  Stenbrary — Revisión de datos imposibles            ║
// ║                                                      ║
// ║  Qué busca: datos que NO PUEDEN ser correctos.        ║
// ║  Una salida anterior a la entrada, una estancia de    ║
// ║  30 horas, una visita con fecha del año que viene.    ║
// ║                                                      ║
// ║  Por qué importa: nada de esto lanza un error. La     ║
// ║  app funciona, la pantalla se ve bien, y las          ║
// ║  estadísticas mienten. Es el tipo de defecto que el   ║
// ║  coordinador nunca va a reportar porque no tiene      ║
// ║  forma de notarlo.                                    ║
// ║                                                      ║
// ║  Deliberadamente NO incluye "se borraron muchos       ║
// ║  registros" ni "se editaron muchos alumnos": eso son  ║
// ║  acciones legítimas, y mezclarlas aquí llenaría la    ║
// ║  lista de ruido hasta volverla inservible. Eso es     ║
// ║  auditoría (Activity Log, ESTADO §2.1), no            ║
// ║  diagnóstico.                                         ║
// ╚══════════════════════════════════════════════════════╝

import { Alumno, Registro } from '../models';

export type GravedadProblema = 'alta' | 'media' | 'baja';

export interface ProblemaIntegridad {
  tipo: string;
  /** Redactado para el coordinador, no para el desarrollador. */
  descripcion: string;
  gravedad: GravedadProblema;
  afectados: number;
  /** Hasta 3 casos concretos, para poder ir a verlos. */
  ejemplos: string[];
}

/**
 * Estancia máxima plausible, en minutos.
 *
 * Por encima de esto casi siempre es una entrada que nadie cerró y que el
 * cierre automático no alcanzó. 14 h cubre con holgura una biblioteca
 * universitaria que abre 7–22.
 */
export const ESTANCIA_MAXIMA_MIN = 14 * 60;

/** Margen de tolerancia para relojes desajustados antes de marcar "futuro". */
const TOLERANCIA_FUTURO_MIN = 5;

function ejemplosDe(items: string[]): string[] {
  return items.slice(0, 3);
}

/**
 * Revisa la consistencia de los datos y devuelve solo los problemas hallados.
 *
 * `ahora` es parámetro y no `new Date()` interno para que los tests puedan
 * fijar el instante: una revisión que depende del reloj real produce tests
 * que fallan solos al pasar el tiempo.
 */
export function revisarIntegridad(
  alumnos: Alumno[],
  registros: Registro[],
  ahora: Date = new Date(),
): ProblemaIntegridad[] {
  const problemas: ProblemaIntegridad[] = [];
  const limiteFuturo = ahora.getTime() + TOLERANCIA_FUTURO_MIN * 60_000;

  const fechasInvalidas: string[] = [];
  const enFuturo: string[] = [];
  const salidaAntesDeEntrada: string[] = [];
  const estanciaAbsurda: string[] = [];
  const duracionNegativa: string[] = [];
  const huerfanos: string[] = [];

  const matriculasConocidas = new Set(alumnos.map(a => a.matricula));

  registros.forEach(r => {
    const etiqueta = `${r.matricula} (${r.id.slice(0, 8)})`;
    const entrada = new Date(r.fechaHora);

    if (isNaN(entrada.getTime())) {
      fechasInvalidas.push(etiqueta);
      return; // Sin fecha válida, el resto de comprobaciones no aplica.
    }

    if (entrada.getTime() > limiteFuturo) enFuturo.push(etiqueta);

    if (r.horaSalida) {
      const salida = new Date(r.horaSalida);
      if (!isNaN(salida.getTime())) {
        if (salida.getTime() < entrada.getTime()) salidaAntesDeEntrada.push(etiqueta);
      }
    }

    if (typeof r.duracionMinutos === 'number') {
      if (r.duracionMinutos < 0) duracionNegativa.push(etiqueta);
      else if (r.duracionMinutos > ESTANCIA_MAXIMA_MIN) estanciaAbsurda.push(etiqueta);
    }

    // Los invitados no tienen alumno por diseño: no son huérfanos.
    if (r.matricula !== 'INVITADO' && !matriculasConocidas.has(r.matricula)) {
      huerfanos.push(etiqueta);
    }
  });

  // Matrículas repetidas: el índice `by-matricula` es único, así que si esto
  // aparece es que los datos entraron por una vía que lo esquivó.
  const vistas = new Map<string, number>();
  alumnos.forEach(a => vistas.set(a.matricula, (vistas.get(a.matricula) ?? 0) + 1));
  const duplicadas = [...vistas.entries()].filter(([, n]) => n > 1).map(([m]) => m);

  if (fechasInvalidas.length) {
    problemas.push({
      tipo: 'fecha-invalida',
      descripcion: 'Hay visitas guardadas sin una fecha válida. No aparecerán en las estadísticas.',
      gravedad: 'alta',
      afectados: fechasInvalidas.length,
      ejemplos: ejemplosDe(fechasInvalidas),
    });
  }

  if (enFuturo.length) {
    problemas.push({
      tipo: 'fecha-futura',
      descripcion:
        'Hay visitas con fecha posterior a hoy. Suele pasar cuando el reloj del equipo está mal ajustado.',
      gravedad: 'alta',
      afectados: enFuturo.length,
      ejemplos: ejemplosDe(enFuturo),
    });
  }

  if (salidaAntesDeEntrada.length) {
    problemas.push({
      tipo: 'salida-antes-de-entrada',
      descripcion: 'Hay visitas cuya hora de salida es anterior a la de entrada.',
      gravedad: 'alta',
      afectados: salidaAntesDeEntrada.length,
      ejemplos: ejemplosDe(salidaAntesDeEntrada),
    });
  }

  if (duracionNegativa.length) {
    problemas.push({
      tipo: 'duracion-negativa',
      descripcion:
        'Hay visitas con una duración negativa. El promedio de permanencia que muestran las estadísticas está mal por esto.',
      gravedad: 'alta',
      afectados: duracionNegativa.length,
      ejemplos: ejemplosDe(duracionNegativa),
    });
  }

  if (estanciaAbsurda.length) {
    problemas.push({
      tipo: 'estancia-excesiva',
      descripcion: `Hay visitas de más de ${Math.round(ESTANCIA_MAXIMA_MIN / 60)} horas. Casi siempre son entradas que nadie cerró.`,
      gravedad: 'media',
      afectados: estanciaAbsurda.length,
      ejemplos: ejemplosDe(estanciaAbsurda),
    });
  }

  if (huerfanos.length) {
    problemas.push({
      tipo: 'registro-huerfano',
      descripcion:
        'Hay visitas de matrículas que ya no existen en la lista de alumnos. Puede que se haya eliminado al alumno sin sus registros.',
      gravedad: 'media',
      afectados: huerfanos.length,
      ejemplos: ejemplosDe(huerfanos),
    });
  }

  if (duplicadas.length) {
    problemas.push({
      tipo: 'matricula-duplicada',
      descripcion: 'Hay matrículas repetidas entre los alumnos. Sus visitas pueden estar mezcladas.',
      gravedad: 'alta',
      afectados: duplicadas.length,
      ejemplos: ejemplosDe(duplicadas),
    });
  }

  return problemas;
}
