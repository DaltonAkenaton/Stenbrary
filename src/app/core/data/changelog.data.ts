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
    version: '3.21.6',
    fecha: '2026-05-12',
    titulo: 'Feedback en toda la configuración',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Ahora todos los ajustes de Configuración muestran un mensaje de confirmación al cambiarlos. Antes algunos cambiaban en silencio y parecía que no servían — ahora siempre sabes qué pasó.',
      },
      {
        tipo: 'mejora',
        texto:
          'Para inputs continuos (slider de volumen, porcentaje de animación, segundos de pantalla, PIN, horarios, velocidad y cooldown del escáner) el mensaje aparece solo al terminar de ajustar, no en cada keystroke — sin saturar con avisos.',
      },
    ],
  },
  {
    version: '3.21.5',
    fecha: '2026-05-12',
    titulo: 'Feedback en cambios de configuración',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Al cambiar la velocidad o cooldown del escáner, el sistema confirma el nuevo valor con un mensaje breve.',
      },
      {
        tipo: 'feat',
        texto:
          'Al activar/desactivar "Saltar diálogo de confirmación", "Confirmar cierres automáticamente" o "Cerrar al final del horario", aparece un mensaje explicando qué pasará a partir de ahora.',
      },
    ],
  },
  {
    version: '3.21.4',
    fecha: '2026-05-12',
    titulo: 'Recordatorio más claro y con feedback',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'El texto del recordatorio de respaldo ahora especifica que el aviso aparece en el Resumen (pantalla principal), no en otro lugar.',
      },
      {
        tipo: 'feat',
        texto:
          'Retroalimentación al configurar el recordatorio: cada vez que cambias el modo, un día o la hora, aparece un mensaje confirmando el nuevo estado (ej. "Aviso programado: martes, viernes a las 11:21").',
      },
    ],
  },
  {
    version: '3.21.3',
    fecha: '2026-05-12',
    titulo: 'Minutos al detalle en el recordatorio',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'El selector de minutos del recordatorio ahora acepta cualquier valor del 00 al 59 (antes solo iba de 5 en 5). Si quieres poner el aviso a las 11:21 exactas, ya se puede.',
      },
    ],
  },
  {
    version: '3.21.2',
    fecha: '2026-05-12',
    titulo: 'Selector de hora del tema oscuro',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'El campo "Otra hora" del recordatorio de respaldo ya no usa el input nativo del navegador (que rompía el tema oscuro y era incómodo de manejar). Ahora son dos selectores estilizados — hora (00–23) y minutos (en intervalos de 5) — consistentes con el resto de la app.',
      },
    ],
  },
  {
    version: '3.21.1',
    fecha: '2026-05-12',
    titulo: 'Escáner instantáneo + ajustes finos',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nuevo preset "Instantáneo (recomendado)" en velocidad del escáner — el sistema detecta la credencial en cada frame de la cámara (lo más rápido posible). Ahora viene activado por defecto.',
      },
      {
        tipo: 'cambio',
        texto:
          'El card "Comportamiento del Escáner" antiguo ahora se llama "Detección de duplicados", que es lo que realmente controla. El de velocidad/cooldown queda como único "Comportamiento del escáner".',
      },
      {
        tipo: 'mejora',
        texto:
          'En el recordatorio de respaldo programado, la hora ahora tiene presets rápidos (08:00, 12:00, 14:00, 18:00, 20:00) además del selector libre.',
      },
    ],
  },
  {
    version: '3.21.0',
    fecha: '2026-05-12',
    titulo: 'Dashboard con insights + más control',
    destacado: true,
    resumen:
      'El resumen ahora cuenta una historia más rica del día: comparativa con ayer en "Accesos hoy", hora pico, alumnos nuevos del día, y un banner unificado que junta todos los avisos (respaldo, cierres automáticos, biblioteca cerrada, error de BD) en un solo lugar. Además, el botón "Exportar" del banner exporta directo sin abrir más ventanas. Y en Configuración se abrieron tres nuevos paneles: recordatorio de respaldo programado (días y hora), comportamiento del escáner (velocidad, espera, saltar confirmación, volumen) y cierre automático extendido (confirmar solo, cerrar al horario).',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Comparativa con ayer en el card "Accesos hoy": un chip indica si vienes con más o menos accesos que el mismo día anterior, con el porcentaje exacto.',
      },
      {
        tipo: 'feat',
        texto:
          'Nueva tira de mini-indicadores: alumnos nuevos hoy (clickeable, lleva a la lista de alumnos) y la franja horaria pico del día con cuántos accesos hubo.',
      },
      {
        tipo: 'feat',
        texto:
          'Banner unificado de avisos: ahora un solo lugar muestra el recordatorio de respaldo, los cierres automáticos pendientes, si la biblioteca está cerrada por horario, o si hay un problema con la base de datos. Cada uno se puede descartar de manera independiente.',
      },
      {
        tipo: 'feat',
        texto:
          'Actividades de hoy clickeables: tocar una actividad ("Estudiar", "Trabajo escolar", etc.) abre Registros con esa actividad ya filtrada.',
      },
      {
        tipo: 'feat',
        texto:
          'En "Últimas entradas" aparece un puntito verde junto a los alumnos que siguen dentro de la biblioteca (cuando el módulo de salida está activo).',
      },
      {
        tipo: 'feat',
        texto:
          'El nombre de la institución (si lo configuraste) ahora se muestra en el saludo del dashboard.',
      },
      {
        tipo: 'mejora',
        texto:
          'Las actividades ahora cuentan motivos múltiples: si un alumno eligió "Estudiar + Tarea", suma a las dos categorías, no solo a la principal.',
      },
      {
        tipo: 'mejora',
        texto:
          'Auto-refresh más responsable: deja de consumir recursos cuando cambias de pestaña, y vuelve a actualizar al instante en cuanto regresas al dashboard.',
      },
      {
        tipo: 'mejora',
        texto:
          'El botón "Actualizar" ya no oculta todo el dashboard mientras carga; refresca en silencio para no perder el contexto visual.',
      },
      {
        tipo: 'fix',
        texto:
          'El dashboard ya no carga TODA la historia de registros cada 30 segundos solo para contarlos. Ahora usa un conteo directo, lo que mejora el rendimiento mucho cuando hay miles de registros.',
      },
      {
        tipo: 'mejora',
        texto:
          'El saludo ("Buenos días/tardes/noches") se actualiza solo si dejas el dashboard abierto cruzando las 12:00 o las 18:00.',
      },
      {
        tipo: 'mejora',
        texto:
          'Mejor accesibilidad: los botones de refrescar, aforo y actividades tienen etiquetas legibles para lectores de pantalla.',
      },
      {
        tipo: 'fix',
        texto:
          'El botón "Exportar" del banner de respaldo ahora exporta el archivo directo sin llevarte a Configuración. Aparece "Exportando…" mientras corre y el aviso desaparece solo al terminar.',
      },
      {
        tipo: 'feat',
        texto:
          'Recordatorio de respaldo programado: además del modo por intervalo (cada N días), ahora puedes elegir días específicos de la semana y una hora exacta (ej. todos los viernes a las 18:00). El aviso desaparece automáticamente al exportar el respaldo del día.',
      },
      {
        tipo: 'feat',
        texto:
          'Comportamiento del escáner totalmente configurable desde /configuracion: velocidad de detección (rápido/normal/cuidadoso o valor libre en ms), espera entre escaneos (cooldown), opción de saltar el diálogo de confirmación (útil en quiosco) y slider de volumen del beep.',
      },
      {
        tipo: 'feat',
        texto:
          'Cierre automático extendido: nuevo toggle "Confirmar automáticamente" para que las salidas por timeout no requieran revisión manual, y "Cerrar al final del horario" para cerrar TODAS las entradas pendientes cuando la biblioteca termina su jornada.',
      },
      {
        tipo: 'mejora',
        texto:
          'Las horas de cierre automático ahora aceptan cualquier valor libre (no solo los presets) por la regla de flexibilidad — los presets son atajos, no restricciones.',
      },
    ],
  },
  {
    version: '3.20.0',
    fecha: '2026-05-07',
    titulo: 'Responsive total + animaciones de éxito',
    destacado: true,
    resumen:
      'Auditoría responsive completa de todo el sistema (laptops, tablets y celulares chicos como Xiaomi/Redmi) y rediseño de la pantalla de "Registro Exitoso": ahora 8 animaciones distintas con emojis gigantes, satélites orbitando, partículas y un cofre del tesoro que tiembla y se abre. Los alumnos van a querer escanear varias veces para ver cuál les toca.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          '8 animaciones de éxito distintas que se eligen al azar al registrar: 📚 Libro, 👍 Pulgar arriba, 🏆 Trofeo, 🎓 Graduación, ⭐ Estrella, 🎉 Fiesta, ✅ Check y 🎁 Cofre del tesoro. Cada una tiene su propio efecto: estrellas orbitando, confetti dorado, gorras de graduación volando, un cofre que tiembla y explota con tesoros saliendo, etc.',
      },
      {
        tipo: 'feat',
        texto:
          'Nueva sección "Probar animaciones" en Configuración → Tiempo de pantalla de éxito: 9 botones para previsualizar cada tema sin tener que registrar a alguien (uno por tema más "Aleatorio"). Tap en la pantalla cierra el preview.',
      },
      {
        tipo: 'feat',
        texto:
          'Tiempo de la pantalla de éxito ahora es configurable en /configuracion (presets: 2 s rápida, 5 s normal, 8 s lenta, 12 s quiosco) o cualquier valor libre. Por defecto dura 5 s.',
      },
      {
        tipo: 'feat',
        texto:
          'Toca la pantalla de éxito para saltar inmediatamente al scanner — útil cuando hay cola de alumnos esperando registrarse.',
      },
      {
        tipo: 'feat',
        texto:
          'Vibración háptica distinta por cada animación (en celulares con soporte): el cofre tiembla con 8 pulsos cortos, el trofeo simula un fanfare, la fiesta es ráfaga de 9 pulsos, etc. Cada tema se siente diferente también al tacto.',
      },
      {
        tipo: 'fix',
        texto:
          'Bug crítico arreglado: la barra inferior con motivos seleccionados (Cancelar/Registrar) aparecía en pantallas grandes (laptops/desktop) cuando solo debía verse en celulares. Ahora desktop muestra el panel lateral correctamente y el celular sigue con la barra abajo.',
      },
      {
        tipo: 'fix',
        texto:
          'En celulares pequeños (Xiaomi/Redmi y similares), la barra de selección de motivos ya no queda tapada por la barra inferior de navegación. Tiene scroll interno cuando hay muchas actividades seleccionadas para que los botones Cancelar/Registrar siempre se vean.',
      },
      {
        tipo: 'mejora',
        texto:
          'Sistema 100 % responsive auditado de cabo a rabo: tablas de Alumnos y Registros ahora hacen scroll horizontal en celular en lugar de romper el layout. Las gráficas de Estadísticas (12 meses de actividad) se desplazan horizontalmente cuando no caben. Los horarios de operación apilan en columna en pantallas chicas. El padding lateral se reduce de 24 a 16 px en celular para aprovechar el espacio.',
      },
      {
        tipo: 'mejora',
        texto:
          'Diálogos del sistema (confirmaciones, búsqueda, atajos) limitados a 95 % del ancho de pantalla — en celulares de 360 px ya no se desbordan.',
      },
      {
        tipo: 'mejora',
        texto:
          'La luz de fondo (mesh radial cyan) ya no desaparece durante la pantalla de éxito — se conserva detrás de la animación, manteniendo la atmósfera del sistema.',
      },
      {
        tipo: 'feat',
        texto:
          'Soporte para "Reducir movimiento" del sistema operativo: si el alumno o coordinador tiene activada esa preferencia (accesibilidad), las animaciones se desactivan globalmente y la pantalla de éxito muestra solo un fade-in del emoji.',
      },
      {
        tipo: 'feat',
        texto:
          'Estilos de impresión (Ctrl+P): si imprimes Registros, Alumnos o Detalle de Alumno desde el navegador, la app oculta automáticamente la barra lateral, topbar y botones, deja fondo blanco con texto negro y formatea las tablas para hoja A4.',
      },
      {
        tipo: 'mejora',
        texto:
          'Frase de celebración aleatoria ("¡Sigue así!", "¡Excelente hábito!", etc.) reposicionada como banner superior con badge en lugar de ocupar el centro — ya no choca con el emoji de éxito cuando se dispara.',
      },
      {
        tipo: 'mejora',
        texto:
          'Botones pequeños (chip de quitar motivo) ahora tienen área táctil ampliada a 44×44 px en celular sin cambiar su tamaño visual. Cumple recomendaciones de accesibilidad WCAG.',
      },
    ],
  },
  {
    version: '3.19.0',
    fecha: '2026-05-05',
    titulo: 'Endurecimiento: rendimiento, robustez y privacidad',
    destacado: true,
    resumen:
      'Pulido a fondo basado en code review profesional: la app responde más rápido en listas grandes, las salidas y los registros ya no pueden colisionar entre sí, y un banner avisa cuando la base local no está disponible (modo incógnito, almacenamiento bloqueado).',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Listados más rápidos: Alumnos, Registros, Inactivos, Resumen, Detalle de Alumno y En Biblioteca usan ahora detección de cambios optimizada y precomputan los textos que mostrarás. Notarás que el scroll no tiembla aunque haya miles de filas.',
      },
      {
        tipo: 'mejora',
        texto:
          'Sin pantallas en blanco si la base local falla: cuando IndexedDB no se puede abrir (modo incógnito, almacenamiento lleno, navegador restringido) aparece un banner rojo arriba con la causa y un botón para recargar.',
      },
      {
        tipo: 'fix',
        texto:
          'Las salidas de biblioteca ya no se pueden duplicar al cerrar dos veces seguidas o al usar "Cerrar todas" mientras alguien escanea: cada cambio se hace en una transacción atómica.',
      },
      {
        tipo: 'fix',
        texto:
          'Si abrías la app en dos pestañas a la vez por primera vez, los motivos por defecto podían duplicarse. Resuelto.',
      },
      {
        tipo: 'mejora',
        texto:
          'Persistencia del almacenamiento: la app pide al navegador que NO desaloje tu base de datos cuando hay presión de espacio. Importante para una PWA offline-first.',
      },
      {
        tipo: 'mejora',
        texto:
          'Excel y PDF ahora se descargan más rápido la primera vez que entras al sistema: las librerías pesadas (xlsx ~600 KB, jsPDF ~180 KB) se cargan solo cuando realmente exportás un reporte.',
      },
      {
        tipo: 'mejora',
        texto:
          'Validación más estricta de matrícula y datos de alumno al registrar: longitudes máximas, formato consistente con el scanner, mensajes de error específicos.',
      },
      {
        tipo: 'cambio',
        texto:
          'Logs internos ahora solo aparecen en modo desarrollo. En producción la consola del navegador queda limpia y no expone matrículas.',
      },
    ],
  },
  {
    version: '3.18.5',
    fecha: '2026-04-29',
    titulo: 'Estadísticas: clicks rápidos ya no acumulan lag',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Estadísticas: cuando hacías varios clicks rápidos en pestañas o períodos, las cargas se acumulaban y la pantalla se congelaba 2-3 segundos. Ahora solo se ejecuta la última solicitud y las anteriores se cancelan automáticamente.',
      },
    ],
  },
  {
    version: '3.18.4',
    fecha: '2026-04-29',
    titulo: 'Estadísticas: gráficas no se traban con muchos datos + caché 5 min',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Estadísticas: la gráfica "Registros por día" se trababa unos segundos cuando un día tenía cientos o miles de visitas. Antes Chart.js intentaba dibujar 3000 marcas en el eje vertical; ahora elige un paso óptimo automáticamente.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: el caché de datos pasa de 15 segundos a 5 minutos. Mientras estás explorando el dashboard, ya no se relee la base entera por cada cambio de período.',
      },
    ],
  },
  {
    version: '3.18.3',
    fecha: '2026-04-29',
    titulo: 'Estadísticas: arregla el lag intermitente al cambiar período/pestaña',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Estadísticas: el lag al cambiar de período (que después se quitaba solo) era por re-leer la base de datos completa cada vez. Ahora se reusa el caché en memoria — el cambio es casi instantáneo.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: las métricas que requieren recorrer todo el histórico (carrera en crecimiento, último registro) ahora se calculan después de pintar la pantalla — la primera vista es más rápida.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: ahora la consola del navegador muestra cuánto tarda cada paso de la carga (queries, cálculos, render). Útil para diagnosticar lentitud.',
      },
    ],
  },
  {
    version: '3.18.2',
    fecha: '2026-04-29',
    titulo: 'Estadísticas: gráficas siempre se ven al cambiar de pestaña',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Estadísticas: las gráficas ya no quedan en blanco al volver a una pestaña. La instancia de la gráfica se recrea correctamente cuando el navegador reemplaza el lienzo (canvas) entre pestañas.',
      },
    ],
  },
  {
    version: '3.18.1',
    fecha: '2026-04-29',
    titulo: 'Estadísticas: gráficas pintan correctamente en primera carga',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Estadísticas: las gráficas "Registros por día" y "Motivos de visita" ya se pintan correctamente al abrir la pestaña Resumen por primera vez. Antes podían quedar en blanco si el navegador no había terminado de pintar el DOM.',
      },
    ],
  },
  {
    version: '3.18.0',
    fecha: '2026-04-29',
    titulo: 'Estadísticas con pestañas: 0 lag y vista organizada',
    destacado: true,
    resumen:
      'El Dashboard Ejecutivo ahora se divide en 5 pestañas (Resumen, Calor & ritmo, Personas, Comparar, Reportes). Solo se carga lo que ves — el resto no consume recursos. Adiós al lag, todo se siente fluido incluso en la app instalada.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nueva navegación por pestañas en la parte superior. Cada pestaña agrupa lo que tiene sentido junto: Resumen (KPIs y tendencia), Calor & ritmo (heatmap y crecimiento 12m), Personas (carreras, turnos, top alumnos), Comparar (A vs B), Reportes (PDF). Cambio entre pestañas es instantáneo.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: rendimiento masivamente mejorado. Antes se cargaban 5 gráficas + 105 celdas + ~30 tooltips a la vez. Ahora solo se renderiza la pestaña activa, lo que reduce el trabajo del navegador a la quinta parte. Sin lag al hacer scroll.',
      },
      {
        tipo: 'fix',
        texto:
          'Comparador A vs B: el slot A se había perdido en una versión anterior. Ahora ambos slots (A y B) están completos con sus selects, fechas personalizadas, gráficas de motivos y tarjeta de diferencia.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: las gráficas se destruyen y recrean correctamente al cambiar entre pestañas. Antes podían quedar en blanco al volver a una pestaña ya visitada.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: el botón "Refrescar" y los exportadores de PDF ahora viven en su propia pestaña "Reportes" — más fácil de encontrar y no compite por espacio con los KPIs.',
      },
    ],
  },
  {
    version: '3.17.2',
    fecha: '2026-04-27',
    titulo: '0 lag, gráficas con datos vacíos y filtro por visitas en alumnos',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: scroll mucho más fluido. Quitamos animaciones infinitas (puntito latente y estrella) y aislamos cada tarjeta del repintado del scroll usando contain/content-visibility.',
      },
      {
        tipo: 'feat',
        texto:
          'Alumnos: nuevo filtro "Visitas (histórico)" con cuatro opciones: nunca han venido (0), vinieron solo 1 vez, pocas (2-4), frecuentes (5+). Resuelve el caso "quiero ver a los 8 alumnos que solo vinieron una vez".',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: cuando un período no tiene datos (ej. 7 días sin actividad), las gráficas ahora muestran un mensaje claro en lugar de quedarse en blanco o desaparecer.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: la sección "Visitas por carrera" ahora siempre se ve (antes desaparecía si no había datos). Si no hay carreras con visitas, muestra mensaje amigable.',
      },
    ],
  },
  {
    version: '3.17.1',
    fecha: '2026-04-27',
    titulo: 'Estadísticas más fluidas: sin parpadeo + textos amigables',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Estadísticas: las gráficas ya no desaparecen al cambiar de período. Ahora ves un aviso ' +
          '"Actualizando..." arriba sin que se borre lo que estabas viendo.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: todos los signos de interrogación (?) ahora explican las métricas en ' +
          'lenguaje claro y con ejemplos, sin tecnicismos. Cualquier persona los entiende.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: la tarjeta antes llamada "Churn temprano" ahora se llama "Vinieron solo 1 vez", ' +
          'que es lo que realmente significa.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: el lag al pasar el cursor sobre el mapa de calor desapareció. Las celdas ahora ' +
          'cambian de brillo en lugar de escalarse, evitando saltos de la pantalla.',
      },
    ],
  },
  {
    version: '3.17.0',
    fecha: '2026-04-27',
    titulo: 'Estadísticas nivel élite: métricas avanzadas + perf + drill-down',
    destacado: true,
    resumen:
      'Rediseño profundo del Dashboard Ejecutivo. Nuevas métricas: tiempo desde el último ' +
      'registro, carrera con mayor crecimiento, predicción de hoy al cierre, distribución por grado, ' +
      'combinaciones de motivos, día de la semana top, % de invitados, variación diaria. ' +
      'Click en celda del heatmap o barra del bar chart te lleva a /registros filtrados. ' +
      'El heatmap ahora usa percentiles (escala más justa). El PDF de turnos ya no muestra ' +
      'todo como "Sin turno". Botón Refrescar explícito. Permalinks por query params. Skeletons ' +
      'durante carga. Y mucho menos lag en cambio de filtro (Chart.js update in-place + ' +
      'precomputo de matrices).',
    cambios: [
      { tipo: 'fix',    texto: 'PDF "Distribución por turno" ya no muestra todo como "Sin turno". Hace fallback al alumno cuando el registro no tiene turno persistido.' },
      { tipo: 'feat',   texto: 'Estadísticas: 4 nuevas tarjetas de insights rápidos — Predicción de visitas hoy al cierre, Día más concurrido del período, Carrera en crecimiento, % de invitados.' },
      { tipo: 'feat',   texto: 'Estadísticas: tiempo desde el último registro mostrado en la tarjeta hero ("Último registro hace 23 minutos") con punto verde latente.' },
      { tipo: 'feat',   texto: 'Estadísticas: distribución por grado y combinaciones de motivos como dos nuevas mini-gráficas.' },
      { tipo: 'feat',   texto: 'Click en una celda del mapa de calor o en una barra del bar chart diario te lleva a /registros con el filtro de fecha y hora pre-aplicado.' },
      { tipo: 'feat',   texto: 'Botón "Refrescar" explícito al lado del exportar — útil cuando registras alumnos en otra pestaña.' },
      { tipo: 'feat',   texto: 'Pantallas de carga con esqueletos animados (skeleton screens) en lugar del spinner solo.' },
      { tipo: 'mejora', texto: 'Mapa de calor: la escala de intensidad ahora usa percentiles (cuartiles) en vez de % del máximo. Si una celda tiene un pico aislado, las demás ya no se ven todas en el nivel más bajo.' },
      { tipo: 'mejora', texto: 'Tasa de retención: el umbral se ajusta al rango (≤7 días=2 visitas, ≤30=3, ≤90=5, mayor=8). Antes era fijo en 3 — para "Hoy" siempre daba 0%.' },
      { tipo: 'mejora', texto: '"Una sola visita" (churn temprano) ahora cuenta alumnos con 1 visita en TODO su historial, no solo en el período. Lo anterior era engañoso para rangos cortos.' },
      { tipo: 'mejora', texto: 'KPI "Alumnos inactivos" ahora avisa visualmente que es global (etiqueta "global"), no del período filtrado.' },
      { tipo: 'mejora', texto: 'Variación diaria (coeficiente de variación %) en la tarjeta hero — indica si el flujo es estable o errático.' },
      { tipo: 'mejora', texto: 'Permalinks: el filtro activo se guarda en la URL. Si compartes el link, abre con los mismos filtros.' },
      { tipo: 'mejora', texto: 'Lectores de pantalla reciben descripciones textuales de las gráficas (aria-label dinámico).' },
      { tipo: 'mejora', texto: 'Performance: las gráficas de Chart.js ahora se actualizan in-place al cambiar filtros (antes se destruían y recreaban). Cambio de período es visiblemente más fluido.' },
      { tipo: 'mejora', texto: 'Performance: heatmap pre-computa matrices, percentiles y clases al cargar. Hover y scroll mucho más fluidos.' },
      { tipo: 'cambio', texto: 'Estadísticas: el campo "turno" ahora se persiste también en el registro al momento de crear (antes solo estaba en el alumno). Para registros viejos hay fallback automático.' },
    ],
  },
  {
    version: '3.16.0',
    fecha: '2026-04-26',
    titulo: 'PDF a la medida, comparador con animación, fix turnos y más opciones',
    destacado: true,
    resumen:
      'Ahora puedes elegir qué secciones incluir en el PDF (resumen, tabla, motivos, ' +
      'turnos, carreras, top alumnos), el comparador trae nuevos atajos como Ayer, ' +
      'Año pasado, Este semestre y Semestre anterior, se arregló la distribución por ' +
      'turno (antes mostraba todo como "sin turno"), el botón "Generando..." ya no ' +
      'se queda atascado, y se eliminaron tarjetas duplicadas en el dashboard.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nuevo botón "Personalizar PDF..." abre un diálogo con casillas ' +
          'para incluir o excluir cada sección (resumen, tabla de registros, top alumnos, ' +
          'distribución por carrera, motivo y turno). Ya no es "todo o nada".',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: el PDF ahora incluye una sección "Distribución por turno" con ' +
          'porcentajes de Matutino / Vespertino / Mixto.',
      },
      {
        tipo: 'feat',
        texto:
          'Comparador (estadísticas): nuevos atajos "Ayer", "Año pasado", "Este semestre" ' +
          'y "Semestre anterior" — útiles para "Hoy vs Ayer", "Este año vs el pasado", etc. ' +
          'Convención genérica de semestres: enero-junio y julio-diciembre.',
      },
      {
        tipo: 'feat',
        texto:
          'Comparador (estadísticas): animación de apertura suave (slide-down + fade-in), ' +
          'cada slot aparece con leve retraso para guiar la vista. Borde lateral cyan en A, ' +
          'teal en B para identificar rápido.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: "Distribución por turno" ya no muestra todo como "Sin turno". ' +
          'Los registros nuevos guardan el turno del alumno; los registros viejos lo ' +
          'recuperan automáticamente desde la ficha del alumno.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: el botón "Generando..." de los reportes predefinidos ya se ' +
          'reactiva correctamente al terminar. Antes podía quedar atascado en gris ' +
          'aunque el PDF ya se hubiera descargado.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: eliminadas las tarjetas duplicadas en la sección de insights ' +
          '(Alumnos Inactivos, Hora Pico y Tendencia ya estaban como KPIs fijos). Los ' +
          'insights ahora solo aparecen para alertas extraordinarias (crecimiento >50%, ' +
          'caída >50%, padrón con baja actividad >30%).',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: las gráficas ya no animan en cada cambio de filtro — solo en ' +
          'la primera carga. El cambio de período se siente instantáneo.',
      },
    ],
  },
  {
    version: '3.15.0',
    fecha: '2026-04-26',
    titulo: 'Dashboard Ejecutivo nivel élite — métricas avanzadas + perf',
    destacado: true,
    resumen:
      'Rediseño profundo del Dashboard Ejecutivo: tarjeta hero con número héroe ' +
      'animado y sparkline, 7 KPIs (incluyendo retención, tiempo de estancia, ' +
      'churn temprano), distribución por turno, crecimiento de los últimos 12 meses, ' +
      'estrella en el día/hora pico del heatmap, día/hora valle, y optimización ' +
      'profunda del scroll y rendering.',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: scroll completamente fluido. El mapa de calor antes hacía ' +
          'miles de búsquedas por segundo en cada movimiento — ahora todo está ' +
          'pre-calculado al cargar.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: tarjeta hero gigante con el total del período, gradient ' +
          'cyan-teal, animación de entrada y mini-gráfica (sparkline) de la ' +
          'evolución dentro del período.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nuevo KPI "Tiempo promedio de estancia" — cuánto duran ' +
          'las visitas en promedio (calculado de los registros con hora de salida).',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nuevo KPI "Tasa de retención" — % de alumnos del período ' +
          'que volvieron 3 o más veces. Indicador clave de fidelización.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nuevo KPI "Una sola visita" — alumnos que vinieron solo ' +
          'una vez (posible churn temprano).',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nuevo KPI "Motivo más frecuente" del período.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: gráfica "Distribución por turno" (Matutino / Vespertino / ' +
          'Mixto) con barras horizontales y porcentajes.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: gráfica "Crecimiento — últimos 12 meses" con barras ' +
          'mensuales para ver la salud del flujo a lo largo del año.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: estrella ★ dorada en la celda PICO del mapa de calor ' +
          '(el día y hora con más visitas dentro del período del mapa).',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nueva línea "Día/hora valle" debajo del heatmap — ' +
          'identifica el momento con menos actividad (útil para programar ' +
          'mantenimiento, eventos o limpieza).',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: gráfica diaria con tinte rojizo distintivo en columnas ' +
          'de domingo, fácil de distinguir de días lectivos.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: foco visible (focus rings) en todos los botones, soporte ' +
          'para usuarios con "reducir movimiento" activado, e iconos de sección ' +
          'unificados en cyan.',
      },
    ],
  },
  {
    version: '3.14.0',
    fecha: '2026-04-26',
    titulo: 'Dashboard Ejecutivo más claro, comparador A vs B y filtro por hora',
    destacado: true,
    resumen:
      'El Dashboard Ejecutivo ahora muestra siempre con claridad qué fechas estás viendo, ' +
      'qué se compara contra qué, y todas las métricas tienen un (?) que explica cómo se calculan. ' +
      'Puedes comparar dos períodos cualesquiera lado a lado (esta semana vs semana pasada, ' +
      'febrero vs abril, etc.), filtrar por hora del día y exportar el PDF de exactamente lo que ves.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nuevo banner siempre visible con las fechas exactas del período actual ' +
          '(p. ej. "Del 26 de marzo al 24 de abril de 2026 · 30 días") y contra qué período se ' +
          'está comparando la tendencia. Cero ambigüedad sobre qué se está viendo.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: comparador "Dos períodos lado a lado". Selecciona "Esta semana" vs ' +
          '"Semana pasada", o "Febrero" vs "Abril", o cualquier dos rangos arbitrarios para ' +
          'ver totales, alumnos únicos, hora pico, motivos y diferencia porcentual a la vez.',
      },
      {
        tipo: 'feat',
        texto:
          'Filtro por hora del día: en Estadísticas y en Registros. Marca un rango horario ' +
          '(ej. 7:00–14:00) para analizar solo el turno matutino. Útil para ver flujo del ' +
          'vespertino, horas pico específicas, etc.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: botón "Exportar PDF de lo que veo" — genera un reporte exactamente ' +
          'del rango y filtros activos arriba, no de un mes predefinido distinto.',
      },
      {
        tipo: 'feat',
        texto:
          'Estadísticas: nuevos atajos de período "Hoy", "Esta semana", "Este mes" y "Todo el ' +
          'historial". Antes había que ir a "Personalizado" para ver el histórico completo.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: cada métrica (Total registros, Hora pico, Tendencia, Inactivos, ' +
          'Heatmap, Top alumnos, etc.) tiene un icono (?) con tooltip explicando cómo se ' +
          'calcula y qué significa. Sin más adivinanzas.',
      },
      {
        tipo: 'mejora',
        texto:
          'Estadísticas: KPIs fijos siempre visibles (Total, Tendencia, Hora Pico, Inactivos, ' +
          'Alumnos únicos). Antes a veces aparecían 1, 2 o 3 tarjetas según los datos.',
      },
      {
        tipo: 'mejora',
        texto:
          'Tendencia: ahora muestra explícitamente las fechas del "Período anterior" contra ' +
          'el que se está comparando, además del actual.',
      },
      {
        tipo: 'mejora',
        texto:
          'Mapa de calor: aviso visible de que usa su propio rango independiente del filtro ' +
          'principal, y la predicción del día más concurrido aclara que se basa en ese mapa.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas: el contador de "Alumnos inactivos" ahora respeta el umbral configurado ' +
          'en /configuración. Antes estaba fijo en 30 días aunque tuvieras otro valor guardado.',
      },
      {
        tipo: 'cambio',
        texto:
          'Reportes predefinidos (diario/semanal/mensual/anual) se movieron al final del ' +
          'Dashboard Ejecutivo, separados del filtro principal. Son para informes históricos ' +
          'puntuales — el botón "Exportar PDF de lo que veo" cubre el caso del día a día.',
      },
    ],
  },
  {
    version: '3.13.0',
    fecha: '2026-04-25',
    titulo: 'Más rapidez en listados, identidad propia y nuevas acciones',
    destacado: true,
    resumen:
      'Listados de Registros y Alumnos ahora se sienten fluidos incluso con miles de filas. ' +
      'Se agregaron acciones útiles para alumnos inactivos, un filtro de "Ayer" y la app ya ' +
      'tiene su propio icono cuando la instalas como aplicación.',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Registros y Alumnos: el scroll y el cambio de filtros ahora se sienten fluidos ' +
          'incluso con decenas de miles de registros. Internamente las fechas y los textos ' +
          'que se muestran en cada fila se calculan una sola vez, no en cada movimiento.',
      },
      {
        tipo: 'mejora',
        texto:
          'Inactivos: el listado se mueve fluido aunque tengas cientos de alumnos en la lista. ' +
          'Búsqueda y filtros responden al instante.',
      },
      {
        tipo: 'feat',
        texto:
          'Inactivos: nuevo botón en cada fila/tarjeta para desactivar al alumno directamente ' +
          'desde aquí, sin tener que entrar a su perfil.',
      },
      {
        tipo: 'feat',
        texto:
          'Inactivos: nuevo botón "Excel" en la cabecera para exportar la lista visible ' +
          '(respeta los filtros de búsqueda y carrera).',
      },
      {
        tipo: 'feat',
        texto:
          'Registros: nuevo filtro rápido "Ayer" entre "Hoy" y "7 días". Útil para revisar ' +
          'el cierre del día anterior en un solo clic.',
      },
      {
        tipo: 'cambio',
        texto:
          'La app instalada (PWA) ahora muestra su propio icono y nombre "Stenbrary" en lugar ' +
          'del icono de Angular. Tema visual de la app actualizado al navy del sistema.',
      },
      {
        tipo: 'fix',
        texto:
          'Scanner manual: una matrícula con más de 12 dígitos ya no se aceptaba como válida. ' +
          'Ahora muestra el mensaje de error correcto.',
      },
    ],
  },
  {
    version: '3.12.1',
    fecha: '2026-04-20',
    titulo: 'Ronda 1 de pulido: bugs y detalles de uso',
    resumen:
      'Ajustes de detalle detectados durante pruebas manuales: selección múltiple más fluida ' +
      'en pantallas angostas, aforo que se actualiza solo al volver a la pestaña, filtros más ' +
      'completos en Alumnos y confirmaciones para no perder datos a medio capturar.',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'En Biblioteca: el aforo y la lista ahora se actualizan automáticamente al volver ' +
          'a la pestaña, sin necesidad de recargar. Además ya no se cuentan los registros ' +
          'cerrados automáticamente que están pendientes de revisión.',
      },
      {
        tipo: 'fix',
        texto:
          'En Biblioteca: el aviso "X entradas cerradas" ya no se repite cada vez que entras ' +
          'a la vista. Se muestra solo cuando realmente hay nuevas entradas que cerrar.',
      },
      {
        tipo: 'fix',
        texto:
          'Selección de actividades: en pantallas angostas ya puedes marcar varias ' +
          'actividades sin que la hoja inferior bloquee los clics. También se ve correctamente ' +
          'sobre la barra lateral en pantallas medianas.',
      },
      {
        tipo: 'fix',
        texto:
          'Scanner: el indicador de carga ya no se queda pegado al volver del acceso sin ' +
          'credencial u otros flujos. La pantalla queda lista para escanear de inmediato.',
      },
      {
        tipo: 'mejora',
        texto:
          'Registro de alumno: si escribes datos y presionas Cancelar, ahora pide ' +
          'confirmación antes de descartar lo capturado. Si el formulario está vacío cierra ' +
          'sin preguntar.',
      },
      {
        tipo: 'mejora',
        texto:
          'Alumnos: nuevo filtro Estado (Activos / Inactivos) y chips con botón X para ' +
          'quitar cada filtro individualmente sin tener que limpiar todos.',
      },
      {
        tipo: 'mejora',
        texto:
          'Configuración → Datos de prueba: al generar o limpiar datos el conteo en ' +
          '"Información del Sistema" se actualiza al terminar, y la etiqueta de progreso ' +
          'refleja si estás generando o eliminando.',
      },
    ],
  },
  {
    version: '3.12.0',
    fecha: '2026-04-18',
    titulo: 'Herramientas de seguimiento, edición y personalización',
    destacado: true,
    resumen:
      'Paquete grande de mejoras centrado en productividad diaria: cerrar la jornada en un clic, ' +
      'editar registros a mano, buscar alumnos desde cualquier pantalla, deshacer el último registro, ' +
      'reportes por periodo en PDF, insignias de asistencia, preselección de actividades recientes ' +
      'y atajos de teclado para moverte más rápido.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Cierre en lote al final del día: botón "Cerrar todas" en la vista En Biblioteca que ' +
          'registra la salida con la hora actual a todos los alumnos que aún tienen entrada abierta. ' +
          'Ideal para terminar la jornada sin escanear uno por uno.',
      },
      {
        tipo: 'feat',
        texto:
          'Edición manual de un registro: desde el historial (Registros y detalle de alumno) ' +
          'puedes corregir la hora de entrada, la hora de salida y las actividades de un registro. ' +
          'La duración se recalcula automáticamente.',
      },
      {
        tipo: 'feat',
        texto:
          'Búsqueda global en la barra superior: botón con atajo Ctrl+K que abre un buscador ' +
          'instantáneo de alumnos (por matrícula o nombre) y de registros del día. Navegas al ' +
          'detalle con un clic o con las teclas de flecha + Enter.',
      },
      {
        tipo: 'feat',
        texto:
          'Deshacer último registro: después de confirmar una actividad aparece un toast con ' +
          'botón "Deshacer" durante 30 segundos. Útil si se registra por error la actividad ' +
          'equivocada. (Oculto en modo quiosco para evitar borrados accidentales por alumnos).',
      },
      {
        tipo: 'feat',
        texto:
          'Reportes por periodo en PDF: en Estadísticas puedes elegir diario, semanal, mensual o ' +
          'anual y generar un PDF con resumen, top alumnos y actividades más frecuentes del periodo. ' +
          'Los visitantes ya aparecen contados aparte, sin mezclarse con los alumnos únicos.',
      },
      {
        tipo: 'feat',
        texto:
          'Atajos de teclado globales: Ctrl+K para búsqueda, Alt+1-6/0 para ir al Scanner, Resumen, ' +
          'Alumnos, Registros, Estadísticas, En Biblioteca y Configuración. Un nuevo icono de ayuda ' +
          'en la barra superior abre la lista completa (también con la tecla "?").',
      },
      {
        tipo: 'feat',
        texto:
          'Insignias y rachas en el detalle del alumno: 12 logros distribuidos en tres ' +
          'categorías (días consecutivos, horas acumuladas, visitas totales) con niveles ' +
          'bronce → plata → oro → platino. Una motivación sutil para asistencia recurrente.',
      },
      {
        tipo: 'mejora',
        texto:
          'Preselección de actividades recientes: al escanear a un alumno habitual se marcan ' +
          'automáticamente las actividades de su última visita (dentro de los últimos 30 días). ' +
          'Reduce clics a un solo paso de confirmación para quienes vienen a lo mismo.',
      },
      {
        tipo: 'mejora',
        texto:
          'El aviso de respaldo pendiente se movió del Scanner al Resumen. Ya no interrumpe el ' +
          'registro de alumnos y queda oculto en modo quiosco, donde antes aparecía sin necesidad.',
      },
    ],
  },
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
