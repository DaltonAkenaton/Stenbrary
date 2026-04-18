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
    version: '3.11.0',
    fecha: '2026-04-18',
    titulo: 'Lector USB, salida de visitantes y aviso de respaldo',
    destacado: true,
    resumen:
      'Tres mejoras enfocadas en operación diaria: compatibilidad con escáneres USB ' +
      'físicos, una forma clara de cerrar la visita de quien no trae credencial, y un ' +
      'recordatorio visible cuando hace falta exportar una copia de seguridad.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Soporte para escáneres USB tipo teclado (HID). Si conectas un lector de código ' +
          'de barras USB, ahora funciona sin abrir la cámara: el scanner detecta el tipeo ' +
          'rápido terminado en Enter y procesa la matrícula con el mismo flujo de siempre. ' +
          'No interfiere con el campo manual ni con los diálogos abiertos.',
      },
      {
        tipo: 'feat',
        texto:
          'Salida autónoma de visitante: cuando hay visitantes con entrada abierta, en la ' +
          'pantalla del scanner aparece el botón "Marcar salida de visitante" con un contador. ' +
          'Abre una lista táctil con el nombre y la hora de llegada — el visitante (o el ' +
          'encargado) toca su nombre y se cierra su registro. Útil sobre todo en modo quiosco ' +
          'donde la vista "En Biblioteca" está oculta.',
      },
      {
        tipo: 'feat',
        texto:
          'Recordatorio de respaldo: el sistema te avisa en la pantalla del scanner si pasan ' +
          'más de N días sin exportar una copia de seguridad. El umbral se ajusta en ' +
          'Configuración → Recordatorio de respaldo (presets 7/14/30/60 días + input libre, ' +
          '0 = desactivado). El aviso se descarta por sesión o permanentemente exportando el ' +
          'respaldo. Ideal para no perder datos si se borra el caché del navegador.',
      },
      {
        tipo: 'mejora',
        texto:
          'El scanner ya no vuelve a abrir la cámara después de cancelar una confirmación si ' +
          'la detección vino del lector USB o del campo manual. Menos parpadeo, menos consumo ' +
          'innecesario de cámara en instalaciones que no la usan.',
      },
    ],
  },
  {
    version: '3.10.1',
    fecha: '2026-04-17',
    titulo: 'Ajustes de visibilidad y UX',
    resumen:
      'Mejoras pequeñas pero de alto impacto para que la coordinadora siempre sepa qué pasó en ' +
      'el sistema: feedback explícito al guardar, confirmación visual de salida (útil con el ' +
      'dispositivo en silencio), y manejo correcto del caso del visitante que no tiene credencial.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Confirmación visual de salida: al registrar una salida, aparece un "check verde" con el ' +
          'nombre del alumno y la duración de su estancia. Se disipa solo en menos de 2 segundos y ' +
          'no bloquea al siguiente usuario — pensado para bibliotecas donde el dispositivo suele ' +
          'estar en silencio.',
      },
      {
        tipo: 'feat',
        texto:
          'Nombre de institución editable desde Configuración → Identidad de la Institución. Ese ' +
          'es el texto que aparece en la constancia PDF. Si lo dejas vacío, los documentos se ' +
          'generan sin etiqueta institucional.',
      },
      {
        tipo: 'mejora',
        texto:
          'Manejo de visitantes en modo salida: si se escanea un ID no reconocido mientras el ' +
          'módulo de salida (o el modo quiosco) está activo, el sistema muestra "ID no reconocido. ' +
          'Si es visitante, contacte al encargado" en lugar de redirigir a registro de alumno.',
      },
      {
        tipo: 'fix',
        texto:
          'Detalle de registro: la Duración ya no muestra "No disponible". Si el alumno aún está ' +
          'en la biblioteca (sin salida registrada) aparece "En curso…" resaltado; si ya salió, se ' +
          'muestra el tiempo real en formato "Xh Ymin", recalculándolo desde las fechas si el ' +
          'valor guardado viniera vacío.',
      },
      {
        tipo: 'mejora',
        texto:
          'Feedback al guardar el umbral default en la vista de Inactivos: ahora aparece un toast ' +
          '"Configuración predeterminada actualizada" en lugar de desaparecer el botón sin aviso.',
      },
    ],
  },
  {
    version: '3.10.0',
    fecha: '2026-04-16',
    titulo: 'Horas acumuladas + Constancias + Alertas de inactividad',
    destacado: true,
    resumen:
      'Tres funciones pensadas para darle peso administrativo al sistema: ahora cada alumno ' +
      'acumula horas de biblioteca visibles en su perfil, la coordinación puede descargar una ' +
      'constancia PDF oficial con ese historial, y una nueva vista de "Inactivos" identifica a ' +
      'quienes llevan tiempo sin venir — con umbral totalmente configurable.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Horas acumuladas por alumno: en el perfil aparecen dos nuevas tarjetas — horas totales ' +
          '(suma de la duración de todas las visitas con salida registrada) y duración promedio ' +
          'por visita. Solo aparecen si el registro de salida está activo.',
      },
      {
        tipo: 'feat',
        texto:
          'Constancia PDF del alumno: botón "Constancia" en el perfil genera un documento oficial ' +
          'con datos personales, período de visitas, stats y tabla cronológica completa. Listo ' +
          'para entregar como comprobante a servicio social o tutores.',
      },
      {
        tipo: 'feat',
        texto:
          'Nueva vista Inactivos (menú Consulta): lista los alumnos activos que no han venido en ' +
          'X días. El umbral se ajusta en vivo (presets 7/15/30/60/90/180 + input libre sin ' +
          'límites arbitrarios) y se puede guardar como default del sistema. Los alumnos que ' +
          'nunca han venido aparecen marcados aparte.',
      },
      {
        tipo: 'feat',
        texto:
          'Salida autónoma en Modo Quiosco: ahora el alumno puede marcar su salida sin coordinador. ' +
          'Al re-escanear su credencial con una entrada activa, aparece un dialog grande, ' +
          'touch-friendly, con saludo personalizado y dos botones claros: "Marcar mi salida" ' +
          '(principal, destacado) y "Es una visita nueva" (secundario). El "Cancelar" queda ' +
          'discreto para evitar errores y el flujo nunca registra duplicados por accidente.',
      },
      {
        tipo: 'mejora',
        texto:
          'Vista de Inactivos renovada: buscador por nombre/matrícula, filtro por carrera, ' +
          'ordenamiento (más/menos inactivos, nombre, carrera), toggle lista/tarjetas, ' +
          'badge de gravedad con tres niveles (normal/medio/alto/nunca) y tema oscuro ' +
          'consistente con el resto del sistema.',
      },
      {
        tipo: 'mejora',
        texto:
          'Perfil del alumno: las estadísticas ahora incluyen tooltips explicativos y subtítulos ' +
          'con contexto (cuántos días desde la última visita, cómo se calcula el promedio semanal, ' +
          'etc.). Adiós a los números sin explicación.',
      },
      {
        tipo: 'fix',
        texto:
          'Constancia PDF: el encabezado ya no pinta el nombre de institución como subtítulo ' +
          'principal (causaba confusión si quedaba con un valor de prueba). Ahora muestra ' +
          '"Sistema de control de acceso a biblioteca" fijo y, si hay nombre de institución ' +
          'configurado, aparece debajo con etiqueta "Institución: ..." claramente identificada.',
      },
      {
        tipo: 'mejora',
        texto:
          'Principio de flexibilidad: los ajustes numéricos del sistema ofrecen valores sugeridos ' +
          'como atajos pero siempre permiten escribir cualquier número dentro del rango natural. ' +
          'El coordinador manda sobre los defaults.',
      },
    ],
  },
  {
    version: '3.9.0',
    fecha: '2026-04-16',
    titulo: 'Modo Quiosco + Horarios + Animación celebratoria',
    destacado: true,
    resumen:
      'Tres funciones nuevas pensadas para instituciones que dejan el sistema corriendo todo el día: ' +
      'Modo Quiosco para tablets dedicadas, Horarios de Operación para evitar registros fuera de ' +
      'turno, y una animación celebratoria sorpresa al estilo Microsoft Teams para darle calidez al flujo.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Modo Quiosco: activable desde Configuración. Oculta menú, barra superior y barra inferior ' +
          'para dejar solo el scanner. Al activar el modo, el sistema redirige automáticamente al ' +
          'scanner. Se sale con pulsación larga (3 s) + PIN configurable de 4 a 6 dígitos. ' +
          'Los alumnos registran salida normalmente re-escaneando su credencial — el scanner ya ' +
          'detecta entradas abiertas y ofrece el dialog de salida.',
      },
      {
        tipo: 'feat',
        texto:
          'Horarios de Operación: define apertura y cierre por día de la semana. Fuera de horario el ' +
          'sistema puede solo advertir (toast) o bloquear el registro por completo. Ideal para evitar ' +
          'registros accidentales antes de abrir o después de cerrar.',
      },
      {
        tipo: 'feat',
        texto:
          'Animación celebratoria: al registrar un acceso aparece, de vez en cuando, una lluvia de ' +
          'confeti con una frase motivadora — como los reconocimientos de Microsoft Teams. ' +
          'Hay atajos rápidos (3%, 8%, 15%, 30%) y un input libre para elegir cualquier ' +
          'porcentaje entre 0 y 100%. Puede desactivarse por completo.',
      },
      {
        tipo: 'mejora',
        texto:
          'Configuración: reorganización de secciones para agrupar lo operativo (aforo, quiosco, horarios) ' +
          'arriba y dejar mantenimiento y respaldos más abajo.',
      },
    ],
  },
  {
    version: '3.8.1',
    fecha: '2026-04-07',
    titulo: 'Estadísticas reparadas + UI pulida',
    resumen:
      'Reparación profunda del módulo de Estadísticas y un par de detalles de UI: ahora el ' +
      'rango de fechas personalizado funciona de verdad, las gráficas se agrupan inteligentemente ' +
      'en períodos largos y el menú lateral ya no oculta el botón de Configuración.',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Estadísticas: el dashboard ya no se traba en blanco. Había una recursión en el caché ' +
          'que impedía cargar los datos en algunas situaciones.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: el rango personalizado ahora respeta las fechas que elijas. Antes solo ' +
          'tomaba el número de días y los aplicaba "desde hoy hacia atrás", ignorando tu selección.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: la gráfica de registros se agrupa automáticamente por día, semana o mes ' +
          'según el largo del período, para que se entienda bien incluso en rangos largos.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: la comparación de tendencia ahora calcula correctamente el período ' +
          'anterior con la misma duración que el actual, sea predefinido o personalizado.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: cargas más rápidas. El caché ya no dispara 8 consultas simultáneas a ' +
          'la base de datos al abrir el dashboard.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: las gráficas de motivos y carreras ya no muestran datos "fantasma" al ' +
          'cambiar a un período sin información.',
      },
      {
        tipo: 'fix',
        texto:
          'Menú lateral: el botón de Configuración ya no se ocultaba al expandir el menú con ' +
          'el botón de Novedades visible.',
      },
      {
        tipo: 'mejora',
        texto:
          'Configuración → Aforo: el campo de capacidad máxima ahora usa un selector con botones ' +
          '+ y − en vez del input feo con flechas nativas.',
      },
    ],
  },
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
