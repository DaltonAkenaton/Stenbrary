// ╔══════════════════════════════════════════════════════╗
// ║  changelog.data.ts                                   ║
// ║  Stenbrary — Historial de versiones                  ║
// ║                                                      ║
// ║  Fuente única de verdad de las novedades del         ║
// ║  sistema. Cada release agrega una entrada arriba.    ║
// ║                                                      ║
// ║  CONVENCIONES (importantes — no romper):             ║
// ║  - El primer elemento del array es la versión más    ║
// ║    reciente. NO ordenar después; respetar el orden.  ║
// ║  - `version` debe coincidir con package.json.        ║
// ║  - `fecha` en formato 'YYYY-MM-DD'.                  ║
// ║  - `cambios` ordenados por importancia (lo más       ║
// ║    relevante arriba).                                ║
// ║  - Texto en lenguaje claro para usuarios finales,    ║
// ║    no jerga técnica.                                 ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Tipos de cambio:
 * - feat:   nueva funcionalidad visible para el usuario
 * - fix:    corrección de un error
 * - mejora: optimización o refinamiento de algo existente
 * - cambio: ajuste neutro (renombrado, reorganización, etc.)
 */
export type TipoCambio = 'feat' | 'fix' | 'mejora' | 'cambio';

export interface CambioChangelog {
  tipo: TipoCambio;
  texto: string;
}

export interface VersionChangelog {
  version: string;
  fecha: string;          // 'YYYY-MM-DD'
  titulo?: string;        // opcional, p.ej. "Control de Aforo"
  destacado?: boolean;    // marca releases mayores (badge "Nuevo")
  resumen?: string;       // párrafo introductorio opcional
  cambios: CambioChangelog[];
}

/**
 * Historial de versiones — más reciente primero.
 *
 * IMPORTANTE: al agregar una nueva versión:
 *   1. Insertarla al INICIO del array
 *   2. Actualizar `version` en package.json
 *   3. Verificar que la fecha sea correcta
 */
export const CHANGELOG: VersionChangelog[] = [
  {
    version: '3.8.0',
    fecha: '2026-04-07',
    titulo: 'Control de Aforo',
    destacado: true,
    resumen:
      'Esta versión introduce el control de aforo configurable: ahora puedes definir la capacidad ' +
      'máxima del recinto y cómo debe reaccionar el sistema cuando se alcance. Pensado para ' +
      'cumplir normas de seguridad y para que cada institución adapte el sistema a su realidad.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nuevo control de aforo configurable desde Configuración. Define la capacidad máxima ' +
          '(en personas) y elige uno de tres modos: Solo alertar, Confirmar o Bloquear.',
      },
      {
        tipo: 'feat',
        texto:
          'Indicador visual de aforo en el Scanner: muestra ocupación actual, lugares disponibles ' +
          'y porcentaje, con barra de progreso que cambia de color (cyan → ámbar → rojo) según el llenado.',
      },
      {
        tipo: 'feat',
        texto:
          'Tarjeta de aforo destacada en la vista "En Biblioteca", con estadísticas detalladas ' +
          'y alerta automática cuando se alcanza la capacidad máxima.',
      },
      {
        tipo: 'feat',
        texto:
          'Tarjeta de aforo en el Resumen (dashboard) con acceso directo a la vista de presencia.',
      },
      {
        tipo: 'feat',
        texto:
          'Sección de Novedades del Sistema (esta misma vista): historial completo de cambios, ' +
          'mejoras y correcciones de cada versión publicada.',
      },
      {
        tipo: 'mejora',
        texto:
          'Importación masiva de alumnos: ahora valida contra la base de datos antes de importar. ' +
          'Las matrículas que ya existen aparecen marcadas en la vista previa, no solo al fallar.',
      },
      {
        tipo: 'mejora',
        texto:
          'Resumen: indicador "y N más" cuando hay más de 6 actividades distintas registradas en el día.',
      },
      {
        tipo: 'mejora',
        texto:
          'Gestión de motivos: al intentar eliminar un motivo, el sistema muestra cuántos registros ' +
          'lo usan antes de confirmar.',
      },
      {
        tipo: 'fix',
        texto:
          'Vista "En Biblioteca": los visitantes ahora aparecen correctamente con su nombre real ' +
          '(antes mostraba "Visitante Externo" genérico).',
      },
      {
        tipo: 'fix',
        texto:
          'Validación de nombre de visitante en el dialog de acceso sin credencial: ya no permite ' +
          'continuar con el campo vacío salvo que se elija explícitamente el botón "Sin nombre".',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas avanzadas: el heatmap ahora muestra diferencias visuales reales en cualquier ' +
          'rango de tiempo (intensidad relativa al máximo del período seleccionado).',
      },
    ],
  },
];

/**
 * Helper: la versión actual (la primera del array).
 */
export function versionActual(): VersionChangelog {
  return CHANGELOG[0];
}
