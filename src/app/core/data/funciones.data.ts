// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/data/funciones.data.ts           ║
// ║  Stenbrary — Catálogo de capacidades del sistema     ║
// ║                                                      ║
// ║  Alimenta la vista /funciones. Sirve a cuatro        ║
// ║  públicos a la vez:                                   ║
// ║  - el coordinador, que decide si el sistema le vale;  ║
// ║  - el personal y los alumnos de servicio social, que  ║
// ║    necesitan saber qué existe y dónde está;           ║
// ║  - otra universidad que lo evalúe (Fase 5);           ║
// ║  - y el propio desarrollador, porque el sistema ya    ║
// ║    tiene más funciones de las que caben en la cabeza. ║
// ║                                                      ║
// ║  REGLA DE REDACCIÓN: se describe lo que la función    ║
// ║  RESUELVE, no cómo está hecha. "Detecta quién dejó de ║
// ║  venir" y no "query indexada sobre fechaHora". Si una ║
// ║  frase solo la entiende quien programó esto, sobra.   ║
// ║                                                      ║
// ║  Al agregar una función nueva al sistema, agrégala    ║
// ║  aquí. Una capacidad que nadie sabe que existe es     ║
// ║  trabajo tirado.                                      ║
// ╚══════════════════════════════════════════════════════╝

export type AreaFuncion = 'operacion' | 'consulta' | 'administracion' | 'datos' | 'tecnico';

/**
 * Motivos disponibles para el recorrido guiado.
 *
 * Cada valor tiene su escena SVG en
 * `features/funciones/ilustracion/ilustracion.component.html` y sus
 * animaciones en el `.scss` de al lado. Añadir un valor aquí sin añadir la
 * escena no rompe nada: cae al motivo genérico (el icono, enmarcado).
 */
export type DemoVisual =
  | 'escaneo'    // credencial pasando por el lector
  | 'salida'     // entrada y salida con tiempo
  | 'aforo'      // medidor llenándose
  | 'grafica'    // tendencia que se dibuja sobre barras
  | 'resumen'    // tablero del día: cifras y una barra
  | 'alerta'     // señal que pulsa
  | 'nube'       // subida y bajada
  | 'archivo'    // filas de una hoja que entran al sistema
  | 'exportar'   // el sistema saca Excel y PDF
  | 'offline'    // sin red, todo sigue
  | 'tablet'     // pantalla sola en la entrada
  | 'roles'      // personas con distintos permisos
  | 'listado'    // filas apareciendo bajo un filtro
  | 'perfil'     // ficha de una persona con su historial
  | 'respaldo';  // escudo que guarda una copa

export interface Funcion {
  titulo: string;
  /** Una o dos frases, en lenguaje del usuario final. */
  descripcion: string;
  icono: string;
  area: AreaFuncion;
  /** Dónde se usa. Ruta interna si se puede abrir directamente. */
  donde: string;
  ruta?: string;
  /** Se resalta en la presentación al coordinador. */
  destacada?: boolean;
  /**
   * Motivo visual del recorrido guiado.
   *
   * Son ilustraciones abstractas animadas, no capturas de pantalla: una
   * captura queda desactualizada en cuanto cambia la interfaz, y con este
   * sistema cambiando cada semana acabaría mintiendo. Un motivo abstracto
   * comunica la IDEA y no envejece.
   */
  demo?: DemoVisual;
  /**
   * Solo existe con la conexión a la nube (v3.57.0). Mientras la UAT use el
   * sistema en local se oculta, igual que en Configuración: anunciar algo que
   * no se puede abrir confunde.
   */
  requiereNube?: boolean;
}

export interface GrupoFunciones {
  area: AreaFuncion;
  titulo: string;
  descripcion: string;
  icono: string;
}

export const GRUPOS_FUNCIONES: GrupoFunciones[] = [
  {
    area: 'operacion',
    titulo: 'El día a día',
    descripcion: 'Lo que ocurre cada vez que un alumno entra a la biblioteca.',
    icono: 'sensors',
  },
  {
    area: 'consulta',
    titulo: 'Consultar y analizar',
    descripcion: 'Responder preguntas sobre lo que pasó, sin abrir un Excel.',
    icono: 'insights',
  },
  {
    area: 'administracion',
    titulo: 'Administrar',
    descripcion: 'Ajustar el sistema a cómo funciona tu biblioteca.',
    icono: 'tune',
  },
  {
    area: 'datos',
    titulo: 'Datos y respaldos',
    descripcion: 'Meter información, sacarla y no perderla nunca.',
    icono: 'inventory_2',
  },
  {
    area: 'tecnico',
    titulo: 'Bajo el capó',
    descripcion: 'Cosas que no se ven pero sostienen todo lo demás.',
    icono: 'shield',
  },
];

export const FUNCIONES: Funcion[] = [
  // ─────────────── OPERACIÓN ───────────────
  {
    titulo: 'Registro con lector de credencial',
    descripcion:
      'El alumno pasa su credencial por el lector y queda registrado al instante. No hay que confirmar ni tocar la pantalla.',
    icono: 'barcode_reader',
    area: 'operacion',
    donde: 'Pantalla principal',
    ruta: '/scanner',
    destacada: true,
    demo: 'escaneo',
  },
  {
    titulo: 'Entrada manual',
    descripcion:
      'Si un alumno olvidó su credencial, escribe su matrícula y presiona Enter dos veces (una para buscarla, otra para confirmar). El registro queda igual de completo.',
    icono: 'keyboard',
    area: 'operacion',
    donde: 'Pantalla principal',
    ruta: '/scanner',
  },
  {
    titulo: 'La puerta no se traba',
    descripcion:
      'Si alguien deja la pantalla a medias, vuelve sola al escáner. Si el siguiente alumno pasa su credencial mientras otro elige, el sistema lo atiende sin perder ninguna de las dos.',
    icono: 'door_front',
    area: 'operacion',
    donde: 'Pantalla principal',
    ruta: '/scanner',
  },
  {
    titulo: 'Lectura por cámara',
    descripcion:
      'Respaldo para cuando no hay lector a la mano. Lee el código de barras con la cámara del equipo.',
    icono: 'photo_camera',
    area: 'operacion',
    donde: 'Pantalla principal, al pie',
    ruta: '/scanner',
  },
  {
    titulo: 'Actividad de la visita',
    descripcion:
      'Cada acceso guarda para qué vino el alumno: estudiar, pedir un libro, trabajo escolar… Se pueden elegir varios.',
    icono: 'category',
    area: 'operacion',
    donde: 'Después de escanear',
  },
  {
    titulo: 'Registro de salida y tiempo de estancia',
    descripcion:
      'Al volver a escanear se marca la salida y el sistema calcula cuánto tiempo estuvo. Opcional: se puede trabajar solo con entradas.',
    icono: 'logout',
    area: 'operacion',
    donde: 'Pantalla principal',
    destacada: true,
    demo: 'salida',
  },
  {
    titulo: 'Control de aforo en vivo',
    descripcion:
      'Muestra cuánta gente hay dentro en cada momento. Al llegar al límite puede avisar, pedir confirmación o impedir el paso.',
    icono: 'groups',
    area: 'operacion',
    donde: 'Pantalla principal y En Biblioteca',
    ruta: '/presencia',
    destacada: true,
    demo: 'aforo',
  },
  {
    titulo: 'Acceso de visitantes',
    descripcion:
      'Ponentes, personal externo o padres de familia entran sin credencial, dejando su nombre.',
    icono: 'person_outline',
    area: 'operacion',
    donde: 'Pantalla principal',
    ruta: '/scanner',
  },
  {
    titulo: 'Horario de operación',
    descripcion:
      'Se define qué días y a qué horas abre. Fuera de ese horario el sistema avisa, o directamente no registra.',
    icono: 'schedule',
    area: 'operacion',
    donde: 'Configuración → Operación',
  },
  {
    titulo: 'Cierre automático de entradas',
    descripcion:
      'Quien se va sin marcar salida no queda dentro para siempre: el sistema cierra su visita al pasar las horas que definas, o a la hora de cierre. Esas salidas quedan marcadas como estimadas y en En Biblioteca se pueden confirmar o corregir.',
    icono: 'auto_delete',
    area: 'operacion',
    donde: 'Configuración → Operación',
  },
  {
    titulo: 'Modo quiosco',
    descripcion:
      'La tablet queda sola en la entrada mostrando solo la pantalla de escaneo. Para salir hace falta el PIN, que se bloquea tras 5 intentos fallidos. Con el PIN se descarga el respaldo del día sin salir, y si alguien sale y lo olvida, vuelve solo tras unos minutos sin uso.',
    icono: 'tablet_android',
    area: 'operacion',
    donde: 'Configuración → Quiosco',
    destacada: true,
    demo: 'tablet',
  },

  // ─────────────── CONSULTA ───────────────
  {
    titulo: 'Resumen del día',
    descripcion:
      'De un vistazo: cuántos accesos van hoy, a qué hora fue el pico y cómo va comparado con el mismo día de la semana pasada.',
    icono: 'dashboard',
    area: 'consulta',
    donde: 'Resumen',
    ruta: '/dashboard',
    destacada: true,
    demo: 'resumen',
  },
  {
    titulo: 'Estadísticas',
    descripcion:
      'Tendencias por período (semana, mes o periodo escolar), mapa de calor de horas y días, top de alumnos, distribución por carrera y por actividad, y una proyección de cuántas visitas habrá hoy al cierre.',
    icono: 'insights',
    area: 'consulta',
    donde: 'Estadísticas',
    ruta: '/estadisticas',
    destacada: true,
    demo: 'grafica',
  },
  {
    titulo: 'Comparar dos períodos',
    descripcion:
      'Este periodo contra el anterior, marzo contra abril, esta semana contra la pasada. Lado a lado.',
    icono: 'compare_arrows',
    area: 'consulta',
    donde: 'Estadísticas',
    ruta: '/estadisticas',
  },
  {
    titulo: 'Quién está dentro ahora',
    descripcion:
      'Lista en vivo de las personas que entraron y todavía no han salido, con cuánto tiempo llevan.',
    icono: 'how_to_reg',
    area: 'consulta',
    donde: 'En Biblioteca',
    ruta: '/presencia',
  },
  {
    titulo: 'Alumnos que dejaron de venir',
    descripcion:
      'Detecta a quienes no aparecen desde hace más de los días que definas. Útil para seguimiento académico.',
    icono: 'notifications_active',
    area: 'consulta',
    donde: 'Inactivos',
    ruta: '/inactivos',
    destacada: true,
    demo: 'alerta',
  },
  {
    titulo: 'Historial por alumno',
    descripcion:
      'Todas las visitas de una persona, sus actividades habituales, sus horarios y sus insignias. Desde ahí se descarga su constancia de asistencia.',
    icono: 'person_search',
    area: 'consulta',
    donde: 'Alumnos → seleccionar uno',
    ruta: '/alumnos',
    destacada: true,
    demo: 'perfil',
  },
  {
    titulo: 'Historial completo con filtros',
    descripcion:
      'Todos los accesos registrados, filtrables por fecha, carrera, turno o actividad.',
    icono: 'history',
    area: 'consulta',
    donde: 'Registros',
    ruta: '/registros',
    destacada: true,
    demo: 'listado',
  },
  {
    titulo: 'Búsqueda rápida',
    descripcion:
      'Ctrl+K abre un buscador que lleva a cualquier pantalla, alumno o ajuste sin navegar por menús.',
    icono: 'search',
    area: 'consulta',
    donde: 'Cualquier pantalla',
  },

  // ─────────────── ADMINISTRACIÓN ───────────────
  {
    titulo: 'Actividades personalizables',
    descripcion:
      'Las actividades se crean, renombran, reordenan y desactivan según lo que tenga sentido en tu biblioteca. Si borras una, sus visitas la conservan y los reportes la marcan como eliminada.',
    icono: 'category',
    area: 'administracion',
    donde: 'Gestión de Actividades',
    ruta: '/gestion-motivos',
  },
  {
    titulo: 'Roles y permisos',
    descripcion:
      'Cuatro niveles: super administrador, coordinador, asistente y alumno. Cada uno ve y puede hacer lo que le corresponde.',
    icono: 'admin_panel_settings',
    area: 'administracion',
    donde: 'Usuarios',
    ruta: '/usuarios',
    destacada: true,
    demo: 'roles',
    requiereNube: true,
  },
  {
    titulo: 'Asistente de configuración',
    descripcion:
      'Guía paso a paso para dejar el sistema listo en minutos, sin pasar por decenas de ajustes.',
    icono: 'auto_fix_high',
    area: 'administracion',
    donde: 'Al instalar, o tras restablecer',
    ruta: '/bienvenida',
    // Fuera del recorrido a propósito: al presentar el sistema el asistente
    // ya se acaba de ver en vivo, así que dedicarle una diapositiva es
    // contar dos veces lo mismo. Sigue en el catálogo.
  },
  {
    titulo: 'Configuración detallada',
    descripcion:
      'Diez categorías con todos los ajustes finos: general, escáner, operación, quiosco, experiencia, calendario, catálogos, datos, bitácora y avanzado.',
    icono: 'settings',
    area: 'administracion',
    donde: 'Configuración',
    ruta: '/configuracion',
  },
  {
    titulo: 'PIN del coordinador',
    descripcion:
      'El mismo PIN del modo quiosco autoriza lo que no se deshace: eliminar registros, reemplazar con un respaldo, restablecer. Si se olvida, un código de recuperación anotado en papel permite poner uno nuevo.',
    icono: 'password',
    area: 'administracion',
    donde: 'Configuración → Quiosco',
  },
  {
    titulo: 'Calendario escolar',
    descripcion:
      'Los periodos del año y los días inhábiles. Estadísticas filtra por "periodo actual" y "periodo anterior", y el Resumen no compara un festivo contra un día normal.',
    icono: 'calendar_month',
    area: 'administracion',
    donde: 'Configuración → Calendario',
  },
  {
    titulo: 'Catálogos de carreras, grupos y grados',
    descripcion:
      'Las carreras se agregan, renombran o desactivan sin tocar el sistema. Al renombrar se elige si es una corrección (cambia también lo anterior) o una carrera nueva que convive con la vieja.',
    icono: 'list_alt',
    area: 'administracion',
    donde: 'Configuración → Catálogos',
  },
  {
    titulo: 'Bitácora',
    descripcion:
      'Qué se hizo, cuándo y en qué equipo: salidas del quiosco, PIN incorrectos, visitas y alumnos editados o borrados, importaciones y respaldos. Se filtra por tipo, fechas, equipo y texto, y no se puede borrar.',
    icono: 'history_edu',
    area: 'administracion',
    donde: 'Configuración → Bitácora',
  },
  {
    titulo: 'Aviso de privacidad',
    descripcion:
      'Un texto breve junto al lector que explica a los alumnos qué datos se guardan y para qué.',
    icono: 'privacy_tip',
    area: 'administracion',
    donde: 'Configuración → Escáner',
  },
  {
    titulo: 'Restablecer el sistema',
    descripcion:
      'Deja todo como recién instalado. Pide el PIN, un respaldo obligatorio y escribir una frase de confirmación.',
    icono: 'restart_alt',
    area: 'administracion',
    donde: 'Configuración → Avanzado',
  },
  {
    titulo: 'Historial de novedades',
    descripcion:
      'Cada mejora del sistema queda documentada en lenguaje claro, con su fecha.',
    icono: 'campaign',
    area: 'administracion',
    donde: 'Novedades',
    ruta: '/novedades',
  },

  // ─────────────── DATOS ───────────────
  {
    titulo: 'Importar alumnos desde Excel',
    descripcion:
      'Carga masiva desde un archivo. Muestra qué columna usará para cada dato y deja corregirla, limpia los nombres, detecta matrículas repetidas y avisa de los errores antes de importar.',
    icono: 'upload_file',
    area: 'datos',
    donde: 'Importar Alumnos',
    ruta: '/importar-alumnos',
    destacada: true,
    demo: 'archivo',
  },
  {
    titulo: 'Exportar a Excel y PDF',
    descripcion:
      'Cualquier listado o reporte se saca en Excel para trabajarlo, o en PDF para entregarlo.',
    icono: 'download',
    area: 'datos',
    donde: 'Registros, Alumnos y Estadísticas',
    destacada: true,
    demo: 'exportar',
  },
  {
    titulo: 'Respaldo y restauración',
    descripcion:
      'Un archivo con todo: alumnos, visitas, actividades y bitácora. Restaurarlo devuelve la información exactamente como estaba; combinarlo junta los datos de la puerta y la oficina sin duplicar, y lo borrado en un equipo también se borra en el otro.',
    icono: 'backup',
    area: 'datos',
    donde: 'Configuración → Datos',
    destacada: true,
    demo: 'respaldo',
  },
  {
    titulo: 'Recordatorio de respaldo',
    descripcion:
      'El sistema avisa si llevas demasiados días sin respaldar. Se configura por intervalo o por día y hora fijos.',
    icono: 'event_repeat',
    area: 'datos',
    donde: 'Configuración → Datos',
  },
  {
    titulo: 'Eliminación por rango de fechas',
    descripcion:
      'Borrar registros antiguos con vista previa del conteo. Pide el PIN del coordinador y ofrece descargar un respaldo antes.',
    icono: 'delete_sweep',
    area: 'datos',
    donde: 'Configuración → Datos',
  },
  {
    titulo: 'Copia en la nube',
    descripcion:
      'Los datos se pueden subir a un servidor y volver a bajar en otro equipo. Tú revisas y apruebas qué se sube y qué se baja.',
    icono: 'cloud_sync',
    area: 'datos',
    donde: 'Sincronización y Bajar de la nube',
    ruta: '/sincronizacion',
    destacada: true,
    demo: 'nube',
    requiereNube: true,
  },
  {
    titulo: 'Datos de prueba',
    descripcion:
      'Genera alumnos y visitas ficticias con un patrón realista, para probar el sistema o hacer demostraciones. Se abren con el PIN del coordinador.',
    icono: 'science',
    area: 'datos',
    donde: 'Configuración → Avanzado → Herramientas de prueba',
  },

  // ─────────────── TÉCNICO ───────────────
  {
    titulo: 'Funciona sin internet',
    descripcion:
      'Todo se guarda en el propio equipo. Si se cae la red, el sistema sigue registrando con normalidad.',
    icono: 'wifi_off',
    area: 'tecnico',
    donde: 'Siempre activo',
    destacada: true,
    demo: 'offline',
  },
  {
    titulo: 'Se instala como aplicación',
    descripcion:
      'Se puede instalar en la computadora o la tablet y abrirse como cualquier programa, sin pasar por el navegador.',
    icono: 'install_desktop',
    area: 'tecnico',
    donde: 'Desde el navegador',
  },
  {
    titulo: 'Reporte de incidencias',
    descripcion:
      'Si algo falla, el sistema lo anota solo. Un botón descarga un archivo para enviar a soporte, sin tener que explicar nada.',
    icono: 'health_and_safety',
    area: 'tecnico',
    donde: 'Reporte del sistema',
    ruta: '/diagnostico',
  },
  {
    titulo: 'Verificación de cifras',
    descripcion:
      'Compara los totales entre la base de datos, Estadísticas y el Resumen (hoy, 7 días, el mes y todo el historial). Si algo no cuadra sale en rojo, antes de entregar un reporte.',
    icono: 'rule',
    area: 'tecnico',
    donde: 'Reporte del sistema',
    ruta: '/diagnostico',
  },
  {
    titulo: 'Revisión de datos',
    descripcion:
      'Busca información imposible —visitas con fecha futura, salidas antes de la entrada— que desviaría las estadísticas sin dar ningún error.',
    icono: 'fact_check',
    area: 'tecnico',
    donde: 'Reporte del sistema',
    ruta: '/diagnostico',
  },
  {
    titulo: 'Funciona en celular, tablet y computadora',
    descripcion:
      'La misma aplicación se adapta a cualquier pantalla, sin instalar versiones distintas.',
    icono: 'devices',
    area: 'tecnico',
    donde: 'Siempre activo',
  },
];

/** El catálogo que se muestra: sin lo que necesita la nube si este equipo no la tiene (v3.57.0). */
export function funcionesVisibles(nubeVisible: boolean): Funcion[] {
  return FUNCIONES.filter(f => nubeVisible || !f.requiereNube);
}
