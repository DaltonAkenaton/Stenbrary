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
    version: '3.55.0',
    fecha: '2026-10-14',
    titulo: 'Rápido con años de datos',
    resumen: 'Probamos el sistema con dos años de visitas (120 000) y ajustamos lo que se ponía lento.',
    cambios: [
      {
        tipo: 'mejora',
        texto: 'El perfil de un alumno que viene mucho abre al instante: el historial muestra las 50 visitas más recientes y un botón "Mostrar más".',
      },
      {
        tipo: 'mejora',
        texto: 'Estadísticas, Registros y Alumnos inactivos cargan más rápido con mucho historial. Inactivos también muestra la lista por partes.',
      },
      {
        tipo: 'mejora',
        texto: 'Exportar a Excel es mucho más rápido y el archivo pesa tres veces menos, para que quepa en un correo.',
      },
      {
        tipo: 'feat',
        texto: 'Antes de un PDF con miles de visitas, el sistema pregunta si quieres incluir el detalle de cada una (cientos de páginas) o solo el resumen. Mientras se genera aparece el aviso "Generando…".',
      },
      {
        tipo: 'fix',
        texto: 'En la tabla del PDF salen todas las actividades de cada visita, no solo la primera, y las actividades renombradas aparecen con su nombre actual, igual que en pantalla.',
      },
      {
        tipo: 'fix',
        texto: 'El PDF de Registros ya no avisa "generado" antes de terminar, y si falla, lo dice.',
      },
    ],
  },
  {
    version: '3.54.0',
    fecha: '2026-10-14',
    titulo: 'La puerta, a prueba de prisas',
    cambios: [
      {
        tipo: 'fix',
        texto: 'Si alguien pasa su credencial mientras otro alumno elige su actividad, ya no se registra la visita del anterior por accidente.',
      },
      {
        tipo: 'feat',
        texto: 'Si un alumno deja a medias "elegir actividad" o el registro, la pantalla vuelve sola al escáner (90 segundos y 3 minutos sin uso). Si el siguiente pasa su credencial tras 20 segundos sin que nadie toque nada, se le atiende a él.',
      },
      {
        tipo: 'mejora',
        texto: 'Registro de alumnos nuevos: los nombres solo aceptan letras, se quitan espacios de sobra y se corrigen los escritos todo en mayúsculas o minúsculas ("juan carlos" → "Juan Carlos").',
      },
      {
        tipo: 'mejora',
        texto: 'El apellido materno ahora es opcional, para quien tiene un solo apellido.',
      },
      {
        tipo: 'fix',
        texto: 'Pasar una credencial con el diálogo del PIN abierto ya no cuenta como intento fallido.',
      },
      {
        tipo: 'mejora',
        texto: 'Si hay otra ventana de Stenbrary abierta con una versión anterior durante una actualización, se avisa en lugar de quedarse cargando.',
      },
    ],
  },
  {
    version: '3.53.0',
    fecha: '2026-10-14',
    titulo: 'Puerta y oficina, afinadas',
    cambios: [
      {
        tipo: 'mejora',
        texto: 'Importar el respaldo diario en la oficina tarda segundos, no minutos: solo se guarda lo que cambió.',
      },
      {
        tipo: 'feat',
        texto: 'Al combinar un respaldo, las visitas o alumnos borrados en el otro equipo también se borran aquí. "Reemplazar todo" sigue devolviendo exactamente lo que trae el archivo.',
      },
      {
        tipo: 'feat',
        texto: 'El resultado de importar dice cuántas visitas y alumnos nuevos llegaron.',
      },
      {
        tipo: 'fix',
        texto: 'El cierre automático de entradas sin salida ahora funciona aunque nadie abra "En Biblioteca" (por ejemplo, en el equipo de la puerta en modo quiosco), y también cierra las de la noche anterior.',
      },
      {
        tipo: 'fix',
        texto: 'Eliminar un alumno ahora borra también sus visitas, como avisaba el mensaje de confirmación.',
      },
      {
        tipo: 'mejora',
        texto: 'En modo quiosco ya no aparece el aviso de versión nueva: se actualiza solo cuando el escáner lleva 2 minutos sin uso.',
      },
      {
        tipo: 'mejora',
        texto: 'El diálogo del PIN muestra cuándo fue el último respaldo.',
      },
    ],
  },
  {
    version: '3.52.0',
    fecha: '2026-10-14',
    titulo: 'Seguridad local',
    resumen: 'Pensado para trabajar con dos equipos: uno en la puerta en modo quiosco y otro en la oficina.',
    cambios: [
      {
        tipo: 'feat',
        texto: 'Nueva Bitácora (Configuración → Bitácora): anota cuándo alguien sale del modo quiosco, escribe mal el PIN, edita o borra visitas y alumnos, o descarga e importa respaldos.',
      },
      {
        tipo: 'feat',
        texto: 'La bitácora viaja dentro del respaldo: al importarlo en la oficina, ves también lo que pasó en la puerta.',
      },
      {
        tipo: 'feat',
        texto: 'Ponle nombre a cada equipo ("Puerta", "Oficina") para saber en cuál pasó cada cosa.',
      },
      {
        tipo: 'mejora',
        texto: 'El PIN del modo quiosco se bloquea 5 minutos tras 5 intentos incorrectos, aunque se recargue la página.',
      },
      {
        tipo: 'feat',
        texto: 'Con el PIN correcto ahora puedes descargar el respaldo del día sin salir del modo quiosco.',
      },
    ],
  },
  {
    version: '3.51.0',
    fecha: '2026-10-14',
    titulo: 'Del registro al alumno',
    cambios: [
      {
        tipo: 'feat',
        texto: 'En Registros, al abrir el detalle de una visita, toca el nombre del alumno para ir a su perfil.',
      },
      {
        tipo: 'mejora',
        texto: 'El detalle de una visita muestra todas sus actividades, no solo la primera.',
      },
      {
        tipo: 'mejora',
        texto: 'En celulares, el menú "Más" abre más fluido: se quitaron efectos visuales pesados para teléfonos sencillos.',
      },
    ],
  },
  {
    version: '3.50.0',
    fecha: '2026-10-12',
    titulo: 'Respaldos entre equipos y borrar un registro',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Al importar un respaldo de otro equipo, las actividades se reconocen por su nombre. Antes, "Estudiar" podía ' +
          'aparecer dos veces en Estadísticas y algunos registros no se podían editar.',
      },
      {
        tipo: 'feat',
        texto: 'Ya puedes borrar un registro suelto: en Registros, toca el lápiz y luego "Eliminar".',
      },
      {
        tipo: 'fix',
        texto: 'El archivo de respaldo ahora se llama, por ejemplo, stenbrary_backup_2026-10-12_2144.json (antes llevaba "p.m." y un punto de más).',
      },
      {
        tipo: 'mejora',
        texto: 'La tecla Escape cierra los avisos del escáner, y se corrigieron textos ("los domingos", "1 persona", "1 registro").',
      },
      {
        tipo: 'fix',
        texto: 'Estadísticas: los títulos del mapa de calor, el top de alumnos y la tendencia ya no salen gigantes.',
      },
    ],
  },
  {
    version: '3.49.0',
    fecha: '2026-10-12',
    titulo: 'El quiosco vuelve solo',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Si sales del modo quiosco y dejas el equipo sin usar, puede volver solo al escáner tras los minutos que elijas. ' +
          'Así la administración no queda a la vista de los alumnos por un descuido. Se configura en Configuración → Quiosco.',
      },
      {
        tipo: 'mejora',
        texto: 'Configuración avisa si el PIN del quiosco sigue siendo el de fábrica (0000).',
      },
    ],
  },
  {
    version: '3.48.1',
    fecha: '2026-10-12',
    titulo: 'Nueva dirección',
    cambios: [
      {
        tipo: 'cambio',
        texto:
          'Stenbrary ahora se publica en stenbrary.pages.dev. Si la tienes instalada como app desde esta dirección, ' +
          'no tienes que hacer nada: las actualizaciones llegan solas.',
      },
    ],
  },
  {
    version: '3.48.0',
    fecha: '2026-10-12',
    titulo: 'Aviso de privacidad en el escáner',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Junto al lector aparece un aviso corto que explica a los alumnos para qué se usan sus datos. ' +
          'El texto se cambia, o el aviso se oculta, en Configuración → Escáner.',
      },
    ],
  },
  {
    version: '3.47.0',
    fecha: '2026-10-12',
    titulo: 'Estadísticas más claras',
    cambios: [
      {
        tipo: 'mejora',
        texto: 'La tarjeta "Alumnos inactivos" de Estadísticas abre la lista de inactivos con un clic.',
      },
      {
        tipo: 'feat',
        texto:
          'La gráfica de crecimiento ya no se limita a 12 meses: elige 3, 6, 12 o 24, o escribe cuántos meses quieres ver.',
      },
      {
        tipo: 'mejora',
        texto: 'Al comparar dos períodos, si en uno no hubo registros se dice claramente en lugar de mostrar ceros.',
      },
      {
        tipo: 'fix',
        texto:
          '"Carrera en crecimiento" ya no muestra un +100 % cuando la carrera no tuvo visitas antes: sin base no hay porcentaje.',
      },
      {
        tipo: 'fix',
        texto: '"Vinieron solo 1 vez" ya no cuenta a alumnos desactivados ni borrados.',
      },
      {
        tipo: 'mejora',
        texto: 'Los grados llegan hasta 12.º para los alumnos que se tardan más de 9 semestres.',
      },
      {
        tipo: 'mejora',
        texto:
          'La búsqueda rápida (Ctrl+K) incluye todas las pantallas del menú y el botón de cámara del escáner, ' +
          'y ya no ofrece "En Biblioteca" cuando el registro de salida está apagado.',
      },
      {
        tipo: 'mejora',
        texto: '"¿Cómo se calculan los números?" explica también "Vinieron solo 1 vez", "Carrera en crecimiento" y el resumen del crecimiento.',
      },
    ],
  },
  {
    version: '3.46.0',
    fecha: '2026-10-07',
    titulo: 'Comparaciones que tienen sentido',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Las comparaciones de Estadísticas usan la unidad anterior: esta semana contra la semana pasada, este mes contra ' +
          'el mes pasado, este periodo contra el periodo anterior, siempre al mismo avance. ' +
          'Antes, "esta semana" se comparaba con el fin de semana anterior.',
      },
      {
        tipo: 'fix',
        texto:
          'El aviso "Hay una nueva versión disponible" ahora sí aparece. Antes la app solo se actualizaba al recargarla, ' +
          'y una tablet en quiosco abierta todo el día no se enteraba.',
      },
      {
        tipo: 'mejora',
        texto: 'El mapa de calor usa el mismo período que el resto de la pantalla; se le puede dar un rango propio si se necesita.',
      },
      {
        tipo: 'feat',
        texto:
          'Calendario escolar: elige un año y pulsa "Cargar calendario UAT". Para 2026 carga el oficial; para otros años, ' +
          'una aproximación con las reglas habituales de la universidad (festivos que se recorren a lunes, Semana Santa, vacaciones) que luego ajustas.',
      },
      {
        tipo: 'mejora',
        texto: 'El Reporte del sistema explica qué revisa cada cosa y qué hacer con lo que encuentre.',
      },
      {
        tipo: 'cambio',
        texto: 'La opción de conexión con la nube queda oculta mientras el sistema funciona en modo local.',
      },
    ],
  },
  {
    version: '3.45.0',
    fecha: '2026-10-06',
    titulo: 'El lector manda',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nueva opción en Configuración → Escáner para mostrar u ocultar el botón "Usar la cámara". ' +
          'El sistema está pensado para un lector físico (USB o Bluetooth), más rápido y fiable; la cámara queda como respaldo.',
      },
    ],
  },
  {
    version: '3.44.1',
    fecha: '2026-10-06',
    titulo: 'Probado con un año de datos',
    resumen: 'Pusimos el sistema a prueba con miles de visitas y comprobamos cada número contra un cálculo hecho a mano. Estos son los ajustes que salieron.',
    cambios: [
      {
        tipo: 'mejora',
        texto: 'Los PDF pesan hasta 10 veces menos: el de un año completo pasó de 41 MB a 4 MB y ya se puede mandar por correo.',
      },
      {
        tipo: 'mejora',
        texto: 'Los PDF se nombran con su período (por ejemplo, reporte_stenbrary_2026-09-07_a_2026-10-06.pdf); antes se pisaban entre sí.',
      },
      {
        tipo: 'mejora',
        texto: 'El Excel de Registros incluye todas las actividades de cada visita, la hora de salida, la duración y si la salida fue estimada.',
      },
      {
        tipo: 'fix',
        texto: 'Los datos de prueba ya no crean visitas en horas que todavía no llegan.',
      },
      {
        tipo: 'fix',
        texto: 'Detalles de texto en Estadísticas: espacio que faltaba en el promedio, tendencia sin datos previos más corta y año en el período comparado.',
      },
    ],
  },
  {
    version: '3.44.0',
    fecha: '2026-10-06',
    titulo: 'Detalles que cuentan',
    resumen: 'La última ronda de la revisión de estadísticas: exportaciones con el título y el rango correctos, avisos cuando hay datos de prueba mezclados y varios ajustes para que cada texto diga exactamente lo que se calcula.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Si hay datos de prueba mezclados con los reales, el Resumen y Estadísticas lo avisan, con un acceso directo para limpiarlos.',
      },
      {
        tipo: 'fix',
        texto:
          'Exportar el Top de alumnos usa la cantidad que ves en pantalla (ya no dice siempre "Top 5") y el mismo rango de fechas, también el personalizado.',
      },
      {
        tipo: 'fix',
        texto:
          'En los PDF, la tabla de detalle se titula según lo que contiene: "visitas del período" o "visitas de estos alumnos".',
      },
      {
        tipo: 'fix',
        texto:
          'La tendencia trimestral del gráfico de 12 meses ya no muestra "↑ 100 %" cuando el trimestre anterior no tuvo visitas.',
      },
      {
        tipo: 'mejora',
        texto:
          'El Excel de Inactivos incluye la última visita y los días sin venir de cada alumno.',
      },
      {
        tipo: 'mejora',
        texto:
          'Diagnóstico detecta entradas de días anteriores que nunca se cerraron y cierres automáticos que nadie confirmó.',
      },
      {
        tipo: 'mejora',
        texto:
          'El umbral de duplicados acepta cualquier cantidad de minutos (0 lo desactiva), además de los atajos.',
      },
      {
        tipo: 'mejora',
        texto:
          'Con las alertas de inactividad desactivadas (umbral 0), Estadísticas ya no cuenta inactivos por su cuenta.',
      },
      {
        tipo: 'mejora',
        texto:
          'El Resumen respeta el horario configurado: no alerta "sin registros" antes de abrir ni en un día que no se abre.',
      },
      {
        tipo: 'cambio',
        texto:
          'El mapa de calor nombra sus rangos como lo que son (7, 30, 365 días…). El filtro por hora indica que incluye la hora final completa (hasta las 21:59). ' +
          'En Alumnos, el filtro "Inactivos" pasa a llamarse "Desactivados" para no confundirse con la página Inactivos.',
      },
      {
        tipo: 'fix',
        texto: 'Ya no se pueden crear dos actividades con el mismo nombre.',
      },
      {
        tipo: 'mejora',
        texto: 'Estadísticas lee la base de datos una sola vez por carga (antes, cuatro).',
      },
    ],
  },
  {
    version: '3.43.0',
    fecha: '2026-10-06',
    titulo: 'Calendario escolar',
    resumen: 'Ahora puedes capturar los periodos y los días inhábiles de la universidad. Las estadísticas los usan para mostrar "Este periodo" y "Periodo anterior", y el Resumen deja de alarmarse en días festivos.',
    destacado: true,
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nueva sección Configuración → Calendario escolar: periodos (Primavera, Verano, Otoño) y días inhábiles, ' +
          'todo editable a mano. Viene precargado con el calendario oficial UAT 2026.',
      },
      {
        tipo: 'cambio',
        texto:
          'En Estadísticas y en Comparar, "Este semestre" y "Semestre anterior" pasan a "Este periodo" y "Periodo anterior", ' +
          'con las fechas de tu calendario y el nombre del periodo en el botón.',
      },
      {
        tipo: 'mejora',
        texto:
          'En un día inhábil sin registros, el Resumen indica que es día inhábil en lugar de pedirte revisar el escáner.',
      },
      {
        tipo: 'mejora',
        texto:
          'La pantalla del calendario avisa si hay periodos encimados, días sin periodo o si el calendario ya no cubre la fecha de hoy.',
      },
    ],
  },
  {
    version: '3.42.0',
    fecha: '2026-10-06',
    titulo: 'Estadísticas con reglas claras',
    resumen: 'Cada número de Estadísticas tiene ahora una sola definición, la misma en todas las pantallas, y el sistema explica cómo se calcula. Al comparar contra el pasado, siempre se compara parejo.',
    cambios: [
      {
        tipo: 'cambio',
        texto:
          'El promedio por día se calcula solo con los días que hubo registros. ' +
          'Los domingos, festivos y vacaciones ya no lo bajan.',
      },
      {
        tipo: 'cambio',
        texto:
          'Si una visita marcó varios motivos, cuenta para cada uno. La gráfica de motivos ahora es de barras ' +
          'y muestra el porcentaje de visitas que incluyeron cada motivo. Renombrar un motivo ya no parte sus números en dos.',
      },
      {
        tipo: 'cambio',
        texto:
          'Las salidas que estima el sistema (cierre por tiempo o al cerrar la biblioteca) ya no cuentan en el tiempo de estancia, ' +
          'las horas acumuladas, los logros ni la constancia. En Registros aparecen marcadas como "(estimada)".',
      },
      {
        tipo: 'cambio',
        texto:
          'Los invitados ya no aparecen en carreras ni turnos; se indica aparte cuántas visitas de invitados hubo.',
      },
      {
        tipo: 'fix',
        texto:
          '"Alumnos inactivos" muestra la misma cifra en Estadísticas y en Inactivos: los que vinieron y dejaron de venir. ' +
          'Los que nunca han venido se cuentan aparte y se pueden mostrar u ocultar.',
      },
      {
        tipo: 'mejora',
        texto:
          'Al comparar un período que aún no termina (hoy, este mes) contra el anterior, el anterior se corta a la misma altura: ' +
          'mismo día y misma hora. El mes en curso ya no aparece como "mes más bajo".',
      },
      {
        tipo: 'mejora',
        texto:
          'La proyección "Hoy al cierre" usa cómo se comportaron los últimos días iguales a hoy. ' +
          'Si no hay suficiente historial, no se muestra.',
      },
      {
        tipo: 'fix',
        texto:
          'El día más concurrido se elige por promedio y no por suma, así no gana un día solo por repetirse más veces en el período.',
      },
      {
        tipo: 'fix',
        texto:
          'Los días del cambio de horario ya no cortan las rachas de los logros ni le quitan el domingo al reporte semanal.',
      },
      {
        tipo: 'fix',
        texto:
          'Cerrar entradas por tiempo, editar un registro o desactivar un alumno ahora sí se ofrece para subir a la nube.',
      },
    ],
  },
  {
    version: '3.41.1',
    fecha: '2026-10-06',
    titulo: 'Números que dicen la verdad',
    resumen: 'Revisamos a fondo las estadísticas y encontramos varios lugares donde la pantalla mostraba un dato que no era cierto. Esta versión corrige los más graves.',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Al elegir fechas a mano, el sistema tomaba el día anterior. Afectaba a "Eliminar registros", ' +
          'que borraba un día que no elegiste y conservaba el último que sí, y a la lista de Registros. ' +
          'Esa lista es la que se abre al hacer clic en una gráfica de Estadísticas, así que también enseñaba el día equivocado.',
      },
      {
        tipo: 'fix',
        texto:
          'Estadísticas ya no se queda con datos viejos: al volver del escáner, o tras registrar, borrar o importar, ' +
          'los números se actualizan solos. Además hay un botón de actualizar junto al título.',
      },
      {
        tipo: 'fix',
        texto:
          'En el Resumen, "Accesos hoy" se compara contra lo que llevaba el mismo día de la semana pasada a esta misma hora. ' +
          'Antes se comparaba contra el día completo y por las mañanas siempre parecía una caída.',
      },
      {
        tipo: 'fix',
        texto:
          'Cuando el período anterior no tuvo visitas, ya no aparece "↑ 0 % más" ni un "+100 %" inventado: ' +
          'se indica que no hay con qué comparar.',
      },
      {
        tipo: 'fix',
        texto:
          '"Últimos 7 días" abarca ahora 7 días (antes eran 8), tanto en Registros como al eliminar registros.',
      },
      {
        tipo: 'fix',
        texto:
          'El PDF de Registros indica en la cabecera el período que de verdad contiene. Después de las 6 de la tarde, ' +
          'las fechas y los nombres de archivo ya no salen con la fecha de mañana.',
      },
      {
        tipo: 'fix',
        texto:
          'El filtro por hora de Estadísticas ya no rechaza rangos válidos (por ejemplo, de 9:00 a 12:00).',
      },
    ],
  },
  {
    version: '3.41.0',
    fecha: '2026-09-04',
    titulo: 'La nube, cuando tú lo decidas',
    resumen: 'El sistema ya puede conectarse a la nube para respaldar datos, entrar desde varios equipos y dar acceso a asistentes con permisos distintos. La diferencia con antes es quién aprieta el botón: nadie te conecta por actualizar. La conexión se enciende desde Configuración, en el equipo que tú elijas y cuando tú quieras.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nueva sección "Conexión con la nube" en Configuración → Avanzado. ' +
          'Mientras esté apagada —y arranca apagada— el sistema funciona ' +
          'exactamente como hasta hoy: sin cuentas, sin iniciar sesión y sin ' +
          'necesitar Internet para nada.',
      },
      {
        tipo: 'feat',
        texto:
          'Al encenderla, las secciones de administración (Configuración, ' +
          'Estadísticas, Actividades, Importar) piden iniciar sesión y ' +
          'respetan el rol de cada persona. El escáner y el registro de ' +
          'visitas siguen funcionando sin Internet, como siempre.',
      },
      {
        tipo: 'feat',
        texto:
          'Salida de emergencia en la pantalla de inicio de sesión: si el ' +
          'correo con el enlace no llega o te quedas sin Internet, el botón ' +
          '"Usar sin cuenta" devuelve el equipo al modo de siempre. Nunca te ' +
          'quedas fuera de tu propio sistema.',
      },
      {
        tipo: 'cambio',
        texto:
          'Puedes volver al modo de siempre cuando quieras desde la misma ' +
          'sección. Los datos guardados en el equipo no se tocan, y lo que ya ' +
          'hayas subido sigue en la nube.',
      },
    ],
  },
  {
    version: '3.40.0',
    fecha: '2026-09-01',
    titulo: 'La presentación, de verdad',
    destacado: true,
    resumen: 'El modo presentación deja de ser una pantalla más de la aplicación: ahora ocupa toda la pantalla, tiene portada y cierre, ilustraciones dibujadas para el tamaño al que se ven, y transiciones que se sienten como pasar una diapositiva.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'El recorrido va a pantalla completa de verdad. Desaparecen el menú lateral, la barra de arriba y la de abajo: ya no se ve que estás dentro de una aplicación.',
      },
      {
        tipo: 'mejora',
        texto:
          'Ilustraciones nuevas, dibujadas una por una. Antes eran iconos pequeños agrandados, que a ese tamaño se ven planos y borrosos. Ahora cada función tiene una escena propia con movimiento: la credencial que se lee, el aforo que se llena, las filas que se filtran.',
      },
      {
        tipo: 'mejora',
        texto:
          'Al cambiar de diapositiva, la anterior se va y la nueva entra. Antes el texto cambiaba de golpe y no se sentía que hubieras avanzado.',
      },
      {
        tipo: 'fix',
        texto:
          'Al pasar de diapositiva ya no se ven los dos textos encimados un instante. El texto que sale termina de irse antes de que entre el siguiente, así que nunca se leen superpuestos.',
      },
      {
        tipo: 'fix',
        texto:
          'Al abrir una función desde el recorrido ya no se ve un destello con el listado completo antes de que cargue la pantalla. Lo mismo al salir: el listado ya no aparece un instante a pantalla completa antes de acomodarse.',
      },
      {
        tipo: 'feat',
        texto:
          'Vista general con todas las diapositivas en miniatura, para saltar directo a la que te preguntan sin pasarlas una por una delante de quien preguntó. Se abre con la tecla G o con el botón de la cuadrícula.',
      },
      {
        tipo: 'feat',
        texto:
          'Tecleando el número de una función se salta a ella al instante. El número es el que aparece abajo en cada diapositiva.',
      },
      {
        tipo: 'feat',
        texto:
          'La pantalla ya no se apaga sola mientras estás presentando, aunque la diapositiva lleve quince minutos puesta.',
      },
      {
        tipo: 'mejora',
        texto:
          'Con el avance automático encendido, el tramo de la diapositiva actual se va llenando: se ve cuánto queda antes de que cambie.',
      },
      {
        tipo: 'mejora',
        texto:
          '"Resumen del día" y "Exportar a Excel y PDF" tienen ahora su propia ilustración. Antes compartían dibujo con otra función y no se distinguían.',
      },
      {
        tipo: 'feat',
        texto:
          'El recorrido abre con una portada y termina con un cierre, para no tener que explicar de qué va antes de empezar ni quedarse en blanco al final.',
      },
      {
        tipo: 'feat',
        texto:
          'Avance automático: se deja puesto en una pantalla y va solo, cambiando de diapositiva cada 7 segundos. Útil para una jornada de puertas abiertas.',
      },
      {
        tipo: 'feat',
        texto:
          'Desde una tablet o un celular ya se puede deslizar con el dedo para pasar de diapositiva, además de las flechas.',
      },
      {
        tipo: 'mejora',
        texto:
          'La posición dentro del recorrido se muestra como una barra de tramos que se pulsan para saltar a cualquier punto, igual en computadora que en celular.',
      },
      {
        tipo: 'fix',
        texto:
          'El buscador del catálogo ignora los acentos de forma fiable: la comparación estaba escrita de una manera que podía romperse sin aviso al reformatear el archivo.',
      },
    ],
  },
  {
    version: '3.39.0',
    fecha: '2026-08-31',
    titulo: 'El recorrido, rediseñado',
    destacado: true,
    resumen: 'El modo presentación se rehizo de cero como composición: sin título de página ni número de versión compitiendo, con las ilustraciones ocupando de verdad su marco y las dos columnas relacionadas entre sí.',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Las ilustraciones ahora llenan su recuadro. Antes eran iconos pequeños flotando en un panel casi vacío, y eso se lee como algo sin terminar.',
      },
      {
        tipo: 'mejora',
        texto:
          'En modo presentación desaparecen el título de la página y el número de versión: en una presentación son ruido que compite con lo que se quiere mostrar. Queda una barra mínima con la posición y el botón de salir.',
      },
      {
        tipo: 'mejora',
        texto:
          'El número de diapositiva se movió arriba, donde tiene aire. Antes chocaba con la etiqueta de sección y lo cortaba el borde del panel.',
      },
      {
        tipo: 'mejora',
        texto:
          'La ilustración se inclina levemente hacia el texto, de modo que las dos columnas se leen como una composición y no como dos bloques puestos al lado.',
      },
    ],
  },
  {
    version: '3.38.0',
    fecha: '2026-08-31',
    titulo: 'Recorrido a pantalla completa y botones alcanzables en el celular',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'En el celular, los botones de guardar de algunos formularios (como Registrar Alumno) quedaban prácticamente pegados a la barra de navegación inferior, y al aparecer y desaparecer la barra de direcciones del navegador acababan tapados. Ahora se reserva espacio de sobra.',
      },
      {
        tipo: 'mejora',
        texto:
          'El recorrido guiado ya no deja media pantalla vacía: ocupa todo el alto, con la ilustración más grande, un resplandor de fondo y un número gigante detrás del título.',
      },
      {
        tipo: 'mejora',
        texto:
          'El recuadro de cada ilustración tiene ahora un marco de luz que gira, y las animaciones internas son más visibles.',
      },
      {
        tipo: 'mejora',
        texto:
          'En el celular, los puntos del recorrido se sustituyen por una barra de avance: quince puntos no caben, y aunque cupieran nadie acierta a tocar uno.',
      },
    ],
  },
  {
    version: '3.37.0',
    fecha: '2026-08-31',
    titulo: 'Más funciones en el recorrido y explicación de la constancia',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'El botón de Constancia ya no aparece apagado sin explicación cuando un alumno no tiene visitas. Ahora se puede pulsar y el sistema dice por qué todavía no está disponible: la constancia certifica visitas, así que aparecerá en cuanto el alumno entre por primera vez.',
      },
      {
        tipo: 'feat',
        texto:
          'El recorrido guiado suma el historial completo con filtros, el historial por alumno y los respaldos, cada uno con su propia ilustración animada.',
      },
      {
        tipo: 'cambio',
        texto:
          'El asistente de configuración sale del recorrido guiado: al presentar el sistema ya se ha visto en vivo, y repetirlo resta. Sigue disponible en el catálogo completo.',
      },
      {
        tipo: 'mejora',
        texto:
          'El catálogo de funciones tiene mucha más vida: las tarjetas entran en cascada, un destello las recorre al pasar el cursor, el icono reacciona, y el título tiene un reflejo que se mueve solo.',
      },
    ],
  },
  {
    version: '3.36.0',
    fecha: '2026-08-31',
    titulo: 'Recorrido guiado en "Qué puede hacer"',
    destacado: true,
    resumen: 'El modo presentación deja de ser una rejilla de tarjetas y pasa a ser un recorrido: una función por pantalla, con una ilustración animada de lo que hace y avance con las flechas del teclado.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Recorrido guiado: las 13 funciones principales se presentan una por pantalla, cada una con una ilustración animada que muestra la idea — la credencial pasando por el lector, el medidor de aforo llenándose, los datos subiendo y bajando de la nube.',
      },
      {
        tipo: 'feat',
        texto:
          'Se avanza con los botones, con las flechas del teclado o con un mando de presentación. Los puntos de abajo permiten saltar a cualquier función.',
      },
      {
        tipo: 'fix',
        texto:
          'Si habías elegido el modo quiosco, al pulsar "Empezar a usar Stenbrary" el sistema saltaba directo a la pantalla principal sin mostrar la animación final.',
      },
    ],
  },
  {
    version: '3.35.2',
    fecha: '2026-08-31',
    titulo: 'Correcciones del asistente',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Elegir "la tablet queda sola" en el paso del modo quiosco cerraba el asistente de golpe y saltaba a la pantalla principal, dejando la configuración a medias. Ahora el modo quiosco se activa al terminar, no en pleno paso.',
      },
      {
        tipo: 'fix',
        texto:
          '"Saltar y usar los valores por defecto" ahora pide confirmación. Está justo debajo del botón de continuar y era fácil pulsarlo sin querer, perdiendo todo lo configurado.',
      },
      {
        tipo: 'mejora',
        texto:
          'El asistente ya no tiene barra de desplazamiento. Cuando un paso es largo —como definir el horario día por día— lo que se desplaza es el contenido dentro de la tarjeta, y los botones de navegación quedan siempre a la vista.',
      },
    ],
  },
  {
    version: '3.35.1',
    fecha: '2026-08-31',
    titulo: 'Retroceder ahora se siente como retroceder',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Al pulsar Atrás en el asistente se veía la misma animación que al avanzar: la hoja se levantaba y se iba hacia la izquierda, que es justo el gesto de pasar página hacia adelante. Ahora la hoja anterior vuelve a caer desde el lomo por encima de la actual, que es como se retrocede en un libro de verdad.',
      },
      {
        tipo: 'mejora',
        texto:
          'El contenido de cada paso ya no se desplaza de lado mientras la página gira. Eran dos movimientos a la vez en direcciones distintas, y se leían como ruido; ahora solo aparece, y el giro de la hoja cuenta la dirección.',
      },
    ],
  },
  {
    version: '3.35.0',
    fecha: '2026-08-31',
    titulo: 'Paso de página suave y el libro que se cierra',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Cambiar de paso ya no se siente brusco. Antes la página nueva entraba volando desde el otro lado y se notaba un tirón; ahora se revela por debajo, como pasa de verdad al levantar una hoja.',
      },
      {
        tipo: 'cambio',
        texto:
          'La animación final ya no abre un libro: lo cierra. Acabas de recorrer sus páginas configurando, así que al terminar el libro se cierra y el nombre queda grabado en la portada, junto al de tu biblioteca.',
      },
      {
        tipo: 'mejora',
        texto:
          'La secuencia final dura ahora 6 segundos, con un barrido de luz sobre la portada. Se sigue pudiendo saltar con un toque.',
      },
      {
        tipo: 'fix',
        texto:
          'En pantallas pequeñas, si un paso del asistente era muy largo (por ejemplo al definir horarios día por día), el botón de continuar quedaba fuera de alcance y no se podía avanzar.',
      },
    ],
  },
  {
    version: '3.34.0',
    fecha: '2026-08-31',
    titulo: 'El asistente ahora es un libro',
    destacado: true,
    resumen: 'Stenbrary es un sistema de biblioteca, y el asistente ya lo parece: cada paso es una página encuadernada, avanzar es pasar página, y el arranque abre un libro del que sale la luz.',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Cada paso del asistente es ahora una página de libro, con lomo a la izquierda y el canto de las hojas a la derecha. Al avanzar, la página gira sobre el lomo como se pasa una hoja de verdad.',
      },
      {
        tipo: 'mejora',
        texto:
          'El fondo ya no son figuras abstractas: son libros flotando lentamente.',
      },
      {
        tipo: 'mejora',
        texto:
          'La secuencia de arranque empieza con un libro que se abre y deja salir la luz, de la que nace el nombre Stenbrary. Y va más pausada — de 2.6 a 4.4 segundos — para que cada momento se distinga.',
      },
    ],
  },
  {
    version: '3.33.0',
    fecha: '2026-08-31',
    titulo: 'El asistente, como un mazo de cartas — y arranque del sistema',
    destacado: true,
    resumen: 'Cada paso del asistente es ahora una carta: al avanzar, la actual se hunde hacia atrás y la siguiente sube al frente. Y al terminar, una secuencia de arranque marca el momento en que el sistema entra en funcionamiento.',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Los pasos del asistente se pasan como cartas de un mazo, con profundidad real: la que sale se hunde y la que entra viene desde el fondo. Detrás se ven dos cartas más, para que se sienta que hay un recorrido completo.',
      },
      {
        tipo: 'feat',
        texto:
          'Al terminar la configuración aparece una secuencia de arranque: la pantalla se oscurece, el nombre Stenbrary se dibuja letra por letra junto al de tu biblioteca, y el sistema entra en funcionamiento. Se puede saltar con un toque.',
      },
      {
        tipo: 'fix',
        texto:
          'Si avanzabas rápido por el asistente, el segundo clic se perdía sin ningún aviso. Ahora se puede encadenar un paso tras otro sin esperar a que termine la animación.',
      },
    ],
  },
  {
    version: '3.32.1',
    fecha: '2026-08-31',
    titulo: 'El asistente, con mucho más movimiento',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'El fondo del asistente ahora tiene figuras que flotan lentamente hacia arriba, muy tenues, para que la pantalla no se sienta estática mientras lees.',
      },
      {
        tipo: 'mejora',
        texto:
          'Al avanzar, el contenido entra deslizándose desde la derecha; al retroceder, desde la izquierda. Se percibe un recorrido con dirección en lugar de pantallas sueltas.',
      },
      {
        tipo: 'mejora',
        texto:
          'Nueva fila de puntos arriba que muestra en qué paso estás y cuántos faltan. El punto actual se alarga y late.',
      },
      {
        tipo: 'mejora',
        texto:
          'El icono de cada paso tiene ahora una corona de luz girando detrás, y los resplandores del fondo son más visibles.',
      },
    ],
  },
  {
    version: '3.32.0',
    fecha: '2026-08-31',
    titulo: 'Asistente con horarios por día, sonido y más vida',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'El asistente inicial ahora permite definir un horario distinto para cada día, sin tener que salir a Configuración. El caso típico —lunes a viernes igual y sábado diferente— se resuelve ahí mismo, y un resumen te confirma cómo quedó.',
      },
      {
        tipo: 'feat',
        texto:
          'Nuevo paso de sonido en el asistente: activar o desactivar el beep de confirmación, ajustar su volumen y probarlo antes de decidir.',
      },
      {
        tipo: 'mejora',
        texto:
          'El asistente se siente mucho más vivo: la tarjeta entra con movimiento, los botones responden al pasar el cursor y al pulsarlos, la opción elegida da un pequeño salto y la barra de progreso tiene un brillo que la recorre.',
      },
      {
        tipo: 'cambio',
        texto:
          'Se quitó el ajuste "Velocidad de detección". Solo servía para hacer la cámara MÁS lenta que su valor por defecto, que ya es lo más rápido posible.',
      },
      {
        tipo: 'cambio',
        texto:
          '"Espera entre escaneos" y "Saltar diálogo de confirmación" se movieron al bloque de ajustes de cámara: resultó que solo afectan a la cámara. El lector físico nunca muestra el diálogo y la entrada manual siempre lo muestra.',
      },
    ],
  },
  {
    version: '3.31.0',
    fecha: '2026-08-31',
    titulo: 'Catálogo de funciones y asistente a pantalla completa',
    destacado: true,
    resumen: 'Nueva pantalla "Qué puede hacer" con las 38 funciones del sistema explicadas en lenguaje claro, con un modo presentación para enseñarlo. Y el asistente inicial ahora ocupa toda la pantalla, sin menús alrededor.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nueva pantalla "Qué puede hacer": el catálogo completo de funciones del sistema, agrupadas por área y con buscador. Sirve para conocer el sistema, para enseñárselo a alguien y para que el personal nuevo sepa qué existe y dónde está.',
      },
      {
        tipo: 'feat',
        texto:
          'Modo presentación dentro de esa pantalla: muestra solo lo esencial en tarjetas grandes, pensado para enseñar el sistema en una reunión sin abrumar con la lista completa.',
      },
      {
        tipo: 'mejora',
        texto:
          'El asistente de configuración inicial ahora ocupa toda la pantalla, sin el menú lateral ni la barra superior. Se presenta como el primer arranque de un equipo nuevo.',
      },
      {
        tipo: 'mejora',
        texto:
          'El asistente tiene animaciones de entrada en cada paso y un fondo con movimiento suave. Respeta la preferencia del sistema de reducir animaciones.',
      },
    ],
  },
  {
    version: '3.30.0',
    fecha: '2026-08-31',
    titulo: 'Asistente de configuración y restablecer el sistema',
    destacado: true,
    resumen: 'Nuevo asistente que te guía paso a paso por los ajustes importantes la primera vez que abres Stenbrary. Y para empezar de cero, un botón que deja el sistema como recién instalado — con un respaldo obligatorio antes.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Asistente de configuración inicial. Al abrir Stenbrary por primera vez te pregunta lo justo —nombre de la biblioteca, si registras salidas, aforo, horario, modo quiosco y avisos— una cosa por pantalla y con un valor razonable ya puesto. Se puede saltar entero: los valores por defecto funcionan.',
      },
      {
        tipo: 'feat',
        texto:
          'Nuevo "Restablecer el sistema" en Configuración → Avanzado. Borra alumnos, visitas y toda la configuración, y abre el asistente para empezar de nuevo. Solo está disponible para el rol de super administrador.',
      },
      {
        tipo: 'feat',
        texto:
          'Antes de restablecer, el sistema OBLIGA a descargar un respaldo y a escribir la frase "BORRAR TODO". Además te muestra cuántos alumnos y visitas se van a perder, en números.',
      },
      {
        tipo: 'fix',
        texto:
          'La pantalla de Usuarios ya no falla al cargar. Mostraba un mensaje técnico y no listaba a nadie porque faltaba guardar el correo de cada cuenta.',
      },
      {
        tipo: 'mejora',
        texto:
          'Los errores técnicos ya no llegan al usuario tal cual. En vez de mensajes como "column user_profiles.email does not exist" ahora se explica en lenguaje claro qué pasó y qué hacer; el detalle técnico va al Reporte del sistema.',
      },
      {
        tipo: 'cambio',
        texto:
          'Los ajustes de cámara (cámara preferida y zoom) se agruparon en un bloque plegable marcado como "solo respaldo", ya que el lector físico es ahora la forma principal de escanear. Siguen disponibles por si el lector falla.',
      },
    ],
  },
  {
    version: '3.29.1',
    fecha: '2026-08-31',
    titulo: 'Revisión de datos en el Reporte del sistema',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nuevo botón "Revisar datos" en Reporte del sistema. Busca información que no puede ser correcta: visitas con fecha futura (pasa cuando el reloj del equipo está mal ajustado), salidas anteriores a la entrada, estancias de más de 14 horas, alumnos con matrícula repetida y visitas de matrículas que ya no existen.',
      },
      {
        tipo: 'mejora',
        texto:
          'Nada de eso da error en pantalla, pero desvía los promedios de las estadísticas. Ahora se puede revisar cuando quieras y el resultado queda incluido en el archivo del reporte.',
      },
      {
        tipo: 'mejora',
        texto:
          'El sistema también avisa si al registrar una salida la duración sale negativa, o si al importar alumnos las cuentas no cuadran con el archivo.',
      },
    ],
  },
  {
    version: '3.29.0',
    fecha: '2026-08-31',
    titulo: 'Reporte del sistema — los problemas ya no se pierden',
    destacado: true,
    resumen: 'El sistema ahora anota por su cuenta cuando algo no sale como se espera, aunque a simple vista todo parezca normal. En "Reporte del sistema" puedes descargar un archivo y enviarlo a soporte para que revisen qué pasó.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nueva pantalla "Reporte del sistema". Si algo falla mientras usas Stenbrary, queda anotado ahí automáticamente. Un botón descarga un archivo que puedes mandar por correo o WhatsApp a quien da soporte.',
      },
      {
        tipo: 'feat',
        texto:
          'El sistema se vigila a sí mismo en las operaciones delicadas: si dice que va a eliminar 54 registros y elimina 51, o si traes 100 elementos de la nube y llegan 98, lo detecta y lo anota aunque no aparezca ningún error en pantalla.',
      },
      {
        tipo: 'mejora',
        texto:
          'Antes los errores solo se enviaban a un servidor externo, y como no hay ninguno configurado, se perdían por completo. Ahora siempre quedan guardados en el propio equipo.',
      },
      {
        tipo: 'fix',
        texto:
          'Al eliminar registros, el botón y el conteo ya se actualizan solos. Antes había que tocar algún campo o cambiar de pantalla para que reflejaran el número real.',
      },
    ],
  },
  {
    version: '3.28.3',
    fecha: '2026-08-31',
    titulo: 'Bajar datos de la nube',
    destacado: true,
    resumen: 'Hasta ahora los datos solo podían subir. Ya se pueden traer de vuelta: la nueva pantalla "Bajar de la nube" compara lo que hay allá arriba con lo de este dispositivo y te deja traer lo que falte, sin tocar nada de lo que ya tienes.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nueva pantalla "Bajar de la nube". Compara los dos lados y te muestra qué falta en este dispositivo. Comparar solo lee: no cambia nada ni aquí ni en la nube, así que puedes hacerlo cuantas veces quieras.',
      },
      {
        tipo: 'feat',
        texto:
          'Puedes traer todo de una vez o por tipo (solo motivos, solo alumnos, solo registros). Antes de traer se muestra la lista de lo que llegaría, para que no sea a ciegas.',
      },
      {
        tipo: 'feat',
        texto:
          'Los elementos que existen en los dos lados con contenido distinto se marcan como "en conflicto" y se pueden abrir para ver campo por campo qué dice cada versión. Por seguridad NO se modifican: elegir cuál versión gana puede borrar trabajo, y esa decisión todavía es tuya.',
      },
      {
        tipo: 'fix',
        texto:
          'Los datos que traes de la nube ya no vuelven a aparecer como pendientes de subir. Antes, al bajar información quedaba marcada para subirla otra vez al mismo lugar del que venía, llenando la bandeja de sincronización de elementos innecesarios.',
      },
      {
        tipo: 'fix',
        texto:
          'Los accesos de invitado ya no aparecen como conflicto. Un invitado no tiene alumno asociado, y la nube y el dispositivo lo anotan de forma distinta — misma información, distinto formato.',
      },
      {
        tipo: 'fix',
        texto:
          'Corregido: en la primera prueba con datos reales aparecían más de 3,000 conflictos falsos. No eran diferencias de datos, sino la misma información guardada de forma distinta en la nube (un motivo suelto contra una lista de un motivo, por ejemplo). Ahora se comparan por significado y solo se marcan las diferencias de verdad.',
      },
      {
        tipo: 'mejora',
        texto:
          'Traer datos nunca sobrescribe: solo agrega lo que no existe en este dispositivo. Es imposible que la descarga pise algo que hayas capturado y aún no subido.',
      },
    ],
  },
  {
    version: '3.27.0',
    fecha: '2026-08-31',
    titulo: 'Lector de credenciales + respaldos que sí devuelven tu historial',
    destacado: true,
    resumen: 'El escáner físico ya es la forma principal de registrar entradas: pasas la credencial y listo, sin confirmar nada. Y se corrigió un problema serio en los respaldos: al restaurar uno, todos los registros quedaban con la fecha del día de la restauración en vez de su fecha real.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'La pantalla principal ahora está pensada para el lector de credenciales: muestra "Lector listo" en espera y una barra de progreso al leer. Ya no pide confirmar la matrícula — el lector no se equivoca, así que el registro es inmediato.',
      },
      {
        tipo: 'cambio',
        texto:
          'La cámara pasó a ser una opción de respaldo, disponible desde un enlace al pie de la pantalla. Sigue funcionando igual, con su confirmación de matrícula, para cuando no haya lector a la mano.',
      },
      {
        tipo: 'fix',
        texto:
          'Restaurar un respaldo ya NO borra el historial. Antes, todos los registros restaurados tomaban la fecha y hora del momento de la importación, y se perdían la hora de salida, la duración de la estancia, los motivos adicionales y el turno. Ahora el respaldo devuelve los datos exactamente como estaban.',
      },
      {
        tipo: 'fix',
        texto:
          'Restaurar el mismo respaldo dos veces ya no duplica alumnos ni registros.',
      },
      {
        tipo: 'fix',
        texto:
          'El lector dejaba de responder si un alumno registraba entrada y luego salida sin salir de la pantalla: su credencial quedaba bloqueada hasta recargar. Ya se puede escanear cuantas veces haga falta.',
      },
      {
        tipo: 'mejora',
        texto:
          'El lector en modo Bluetooth ya no descarta lecturas lentas. Antes, si la transmisión tardaba un poco más de lo normal, el escaneo se ignoraba sin mostrar ningún aviso.',
      },
      {
        tipo: 'mejora',
        texto:
          'Al importar alumnos ahora aparece una barra de progreso con el conteo ("120 / 500") en lugar de una pantalla que parecía congelada. Si la importación se interrumpe, puedes volver a cargar el mismo archivo: los alumnos ya guardados se detectan como duplicados y no se repiten.',
      },
      {
        tipo: 'fix',
        texto:
          'La eliminación de registros ya no muestra cifras desactualizadas. Antes, al terminar de borrar, la pantalla asumía que había quedado en cero sin volver a consultar; ahora relee la base y, si algún registro sobrevivió, lo dice en vez de ocultarlo.',
      },
      {
        tipo: 'fix',
        texto:
          '"Todos los registros" ahora abarca de verdad todos. Antes solo cubría de 2020 hasta hoy, así que los registros con fecha anterior o futura (por ejemplo, con el reloj del equipo mal ajustado) no se contaban ni se eliminaban, y la pantalla parecía equivocarse.',
      },
      {
        tipo: 'mejora',
        texto:
          'Eliminar muchos registros es notablemente más rápido, y la pantalla ahora muestra también cuántos registros hay en total en la base, para distinguir "no hay nada en este rango" de "no hay nada".',
      },
    ],
  },
  {
    version: '3.26.0',
    fecha: '2026-05-18',
    titulo: 'Resumen enriquecido — insight del día, flujo por hora y comparativa semanal',
    destacado: true,
    resumen: 'El Resumen ya no es solo una lista de números. Ahora cuenta la historia del día: una frase destaca lo más importante, un mini-chart muestra el ritmo hora por hora, y la comparativa principal ahora es contra el mismo día de la semana pasada (más justo que contra ayer).',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Insight automático del día arriba del Resumen: el sistema detecta lo más interesante (día activo, día tranquilo, hora pico, muchos invitados, sin registros recientes, etc.) y lo muestra en una sola frase con color según la importancia.',
      },
      {
        tipo: 'feat',
        texto:
          'Mini-chart "Flujo del día": barras por hora que muestran cuántos accesos hubo en cada franja. La hora pico se destaca en ámbar. Útil para ver de un vistazo si el día fue parejo o concentrado en ciertas horas. Respeta el horario configurado.',
      },
      {
        tipo: 'mejora',
        texto:
          'La comparativa del KPI "Accesos hoy" ahora es contra el MISMO día de la semana pasada (lunes vs lunes, etc.) en lugar de contra ayer. Es más justo porque elimina la estacionalidad semanal — los lunes y los viernes no son comparables.',
      },
    ],
  },
  {
    version: '3.25.1',
    fecha: '2026-05-18',
    titulo: 'Pulido: tooltips de estadísticas restaurados + textos más claros',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Tooltips de explicación restaurados en Estadísticas. Pasa el cursor sobre los iconos de "?" y verás qué significa cada métrica (variación diaria, tasa de retención, hora pico, etc.) sin tener que abrir la pantalla de fórmulas.',
      },
      {
        tipo: 'fix',
        texto:
          'En Ctrl+K, el comando del escáner ahora dice exactamente qué hace: "Procesar escaneos al instante" o "Pedir confirmación al escanear", con el estado actual visible. Antes el texto se entendía al revés.',
      },
      {
        tipo: 'cambio',
        texto:
          'Eliminada la versión clásica de Configuración (la que se accedía en /configuracion-legacy). El nuevo diseño con sidebar ya está validado.',
      },
    ],
  },
  {
    version: '3.25.0',
    fecha: '2026-05-18',
    titulo: 'Command palette Ctrl+K — busca, ejecuta y configura desde un solo lugar',
    destacado: true,
    resumen: 'La búsqueda global ahora hace mucho más que buscar alumnos. Ctrl+K abre un panel donde puedes navegar a cualquier sección, activar/desactivar settings (modo quiosco, celebración, sonido, etc.) y disparar acciones (exportar respaldo, limpiar duplicados…) sin perder tiempo en menús.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Ctrl+K (o Cmd+K en Mac) abre un command palette al estilo VS Code / Linear. Cuando no escribes nada, aparecen los 6 atajos más útiles como sugerencia. Cuando escribes, busca entre comandos, alumnos y registros del día en tiempo real.',
      },
      {
        tipo: 'feat',
        texto:
          'Toggles desde Ctrl+K: escribe "quiosco", "celebración", "sonido", "salida", "horario" o "saltar confirmación" y actívalo o desactívalo con Enter. El label dice exactamente qué va a pasar ("Activar modo quiosco" o "Desactivar modo quiosco").',
      },
      {
        tipo: 'feat',
        texto:
          'Acciones desde Ctrl+K: "exportar respaldo" descarga el .json sin abrir Configuración; "limpiar duplicados", "buscar actualizaciones", "generar datos de prueba", "eliminar registros por rango" y "restaurar respaldo" están todas a un par de teclas.',
      },
      {
        tipo: 'feat',
        texto:
          'Búsqueda fuzzy que ignora acentos — "celebracion" encuentra "Celebración" y "Reservas" encuentra registros con "ó" o sin ella. Cada resultado lleva un chip de color (Navegación, Configuración, Acciones, Alumno, Hoy) para identificarlo de un vistazo.',
      },
      {
        tipo: 'feat',
        texto:
          'Atajos directos a cada categoría de Configuración: "configuración escáner", "configuración datos", etc. te llevan a esa sección con un Enter — sin pasar por la pantalla principal.',
      },
    ],
  },
  {
    version: '3.24.0',
    fecha: '2026-05-18',
    titulo: 'Nueva configuración con sidebar y buscador',
    destacado: true,
    resumen: 'Configuración rediseñada al estilo de los sistemas profesionales (VS Code, GitHub). En lugar de una sola página larga, ahora tienes 7 categorías a la izquierda y un panel a la derecha. Encuentra cualquier opción en segundos.',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Configuración rediseñada: sidebar con 7 categorías (General, Escáner, Operación, Quiosco, Experiencia, Datos, Avanzado) + panel de la opción seleccionada. Adiós al scroll infinito.',
      },
      {
        tipo: 'feat',
        texto:
          'Buscador en el sidebar: escribe "quiosco", "celebración", "respaldo" o cualquier palabra y filtra las categorías que la contienen. Tu última categoría visitada se recuerda entre sesiones.',
      },
      {
        tipo: 'feat',
        texto:
          'URL con marcador de categoría — comparte un link directo a una sección (ej. /configuracion#datos abre Datos directamente). Útil para soporte.',
      },
      {
        tipo: 'mejora',
        texto:
          'Versión clásica de Configuración sigue disponible en /configuracion-legacy por si encuentras algo que no funcione igual. Avísanos y lo arreglamos antes de retirarla.',
      },
      {
        tipo: 'mejora',
        texto:
          'Tooltips en toda la app ya no causan lag al hacer scroll. El dashboard se siente fluido aunque haya muchos elementos con ayuda contextual.',
      },
    ],
  },
  {
    version: '3.23.2',
    fecha: '2026-05-12',
    titulo: 'Registro de alumnos nuevos también en quiosco + multi-tap para salir de quiosco',
    cambios: [
      {
        tipo: 'fix',
        texto:
          'Al escanear una credencial no registrada ya no aparece el toast "ID no reconocido" — el sistema te lleva al flujo de "Registrar alumno", incluso con "En Biblioteca" o el modo quiosco activos. /registro-alumno ya estaba permitido en quiosco, así que bloquearlo desde el escáner era inconsistente. Los visitantes siguen teniendo su propio botón "Acceso invitado".',
      },
      {
        tipo: 'feat',
        texto:
          'Nueva forma de pedir el PIN para salir del modo quiosco: 5 taps rápidos sobre el área del scanner (gap ≤ 600 ms) abren el diálogo del PIN. Sigue funcionando el long-press de 3 segundos.',
      },
    ],
  },
  {
    version: '3.23.0',
    fecha: '2026-05-12',
    titulo: 'Zoom inicial y cámara preferida del escáner',
    cambios: [
      {
        tipo: 'feat',
        texto:
          'Nuevo ajuste en Configuración → Comportamiento del escáner: define el zoom inicial al abrir el scanner (100%–300%, presets + porcentaje libre). El valor se recuerda entre sesiones y reemplaza al antiguo 200% automático.',
      },
      {
        tipo: 'feat',
        texto:
          'Nuevo selector de cámara preferida (Automática / Trasera / Frontal) en Configuración. En móviles o tablets con varias cámaras puedes fijar cuál usar; si la elegida no existe, el navegador hace fallback automático.',
      },
      {
        tipo: 'cambio',
        texto:
          'El zoom del escáner ahora arranca en 100% por defecto (antes 200×). Puedes seguir ajustándolo desde los botones del propio scanner o cambiar el default en Configuración.',
      },
    ],
  },
  {
    version: '3.22.0',
    fecha: '2026-05-12',
    titulo: 'Responsive 320–480px y check manual de actualizaciones',
    cambios: [
      {
        tipo: 'mejora',
        texto:
          'Refinamiento responsive en pantallas muy pequeñas (320–480px) para Dashboard Ejecutivo, Inactivos, Selección de Motivo, Registro de Alumno y la animación de éxito: títulos a tamaño justo, paneles sin scroll horizontal, controles que no se cortan y mejor uso del ancho disponible.',
      },
      {
        tipo: 'feat',
        texto:
          'En Dashboard Ejecutivo (≤480px) la gráfica diaria pasa de barras a sparkline (línea con área) para que 30 días caben sin amontonarse, con encabezado de pico/último bucket y footer con el rango de fechas.',
      },
      {
        tipo: 'feat',
        texto:
          'Nuevo método "buscar actualizaciones ahora" en el servicio PWA: permite cablear un botón manual de comprobación de versión en Configuración.',
      },
      {
        tipo: 'mejora',
        texto:
          'En "Datos de prueba": los textos largos del formulario pasan a hints debajo del input para no romper el layout en celulares chicos.',
      },
    ],
  },
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
