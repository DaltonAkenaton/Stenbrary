// ╔══════════════════════════════════════════════════════╗
// ║  configuracion.types.ts                              ║
// ║  Stenbrary v3.24.0 — Tipos compartidos del refactor  ║
// ║                                                      ║
// ║  Define las categorías del sidebar del nuevo shell   ║
// ║  de configuración (rediseño v4.0). Cada categoría     ║
// ║  corresponde a un sub-componente standalone en        ║
// ║  features/configuracion/categorias/.                  ║
// ╚══════════════════════════════════════════════════════╝

export type CategoriaConfigId =
  | 'general'
  | 'escaner'
  | 'operacion'
  | 'quiosco'
  | 'experiencia'
  | 'calendario'
  | 'catalogos'
  | 'datos'
  | 'bitacora'
  | 'avanzado';

export interface CategoriaConfig {
  id: CategoriaConfigId;
  /** Nombre visible en el sidebar. */
  nombre: string;
  /** Material icon. */
  icono: string;
  /** Subtítulo corto bajo el header del panel. */
  descripcion: string;
  /** Lista de "tags" buscables: si el usuario busca por palabra clave, matchea contra esto. */
  keywords: string[];
}

export const CATEGORIAS_CONFIG: CategoriaConfig[] = [
  {
    id: 'general',
    nombre: 'General',
    icono: 'settings',
    descripcion: 'Información del sistema e identidad de la institución',
    keywords: [
      'info', 'sistema', 'alumnos', 'registros', 'motivos', 'almacenamiento',
      'institucion', 'nombre', 'pdf', 'version', 'actualizacion', 'update',
    ],
  },
  {
    id: 'escaner',
    nombre: 'Escáner',
    icono: 'qr_code_scanner',
    descripcion: 'Sonido, cámara y aviso de privacidad',
    keywords: [
      'sonido', 'audio', 'beep', 'volumen', 'mute', 'silenciar',
      'velocidad', 'cooldown', 'instantaneo', 'rapido',
      'confirmacion', 'saltar', 'directo',
      'camara', 'frontal', 'trasera', 'zoom',
      'privacidad', 'aviso', 'datos personales',
    ],
  },
  {
    id: 'operacion',
    nombre: 'Operación',
    icono: 'meeting_room',
    descripcion: 'Horario, registro de salida, aforo, duplicados e inactividad',
    keywords: [
      'horario', 'apertura', 'cierre', 'dias', 'semana', 'abierto', 'cerrado',
      'salida', 'entrada', 'biblioteca', 'presencia',
      'automatico', 'horas',
      'aforo', 'capacidad', 'maximo', 'limite', 'lleno',
      'duplicado', 'doble', 'repetido', 'umbral',
      'inactividad', 'inactivos', 'alerta',
    ],
  },
  {
    id: 'quiosco',
    nombre: 'Quiosco',
    icono: 'tablet_android',
    descripcion: 'Modo quiosco para tablets y PIN del coordinador',
    keywords: [
      'quiosco', 'kiosk', 'tablet', 'pin', 'bloqueo', 'volver', 'seguridad',
      'codigo', 'recuperacion', 'olvide', 'contraseña',
    ],
  },
  {
    id: 'experiencia',
    nombre: 'Experiencia',
    icono: 'celebration',
    descripcion: 'Animaciones y pantalla de éxito',
    keywords: [
      'celebracion', 'animacion', 'confetti', 'confeti', 'frecuencia',
      'exito', 'pantalla', 'tiempo', 'segundos',
    ],
  },
  {
    id: 'calendario',
    nombre: 'Calendario escolar',
    icono: 'event',
    descripcion: 'Periodos (Primavera, Verano, Otoño) y días inhábiles',
    keywords: [
      'calendario', 'periodo', 'semestre', 'primavera', 'verano', 'otono', 'otoño',
      'festivo', 'feriado', 'inhabil', 'vacaciones', 'ciclo', 'escolar', 'uat',
    ],
  },
  {
    id: 'catalogos',
    nombre: 'Catálogos',
    icono: 'list_alt',
    descripcion: 'Carreras, grupos y grados que se ofrecen al registrar e importar',
    keywords: [
      'catalogo', 'carrera', 'carreras', 'licenciatura', 'grupo', 'grupos', 'grado', 'grados',
      'semestre', 'renombrar', 'desactivar', 'agregar',
    ],
  },
  {
    id: 'datos',
    nombre: 'Datos',
    icono: 'storage',
    descripcion: 'Respaldo, restaurar y eliminar registros por fechas',
    keywords: [
      'respaldo', 'backup', 'recordatorio', 'programado',
      'restore', 'restaurar', 'importar', 'exportar', 'descargar',
      'limpieza', 'limpiar', 'eliminar', 'rango',
      'mantenimiento',
    ],
  },
  {
    id: 'bitacora',
    nombre: 'Bitácora',
    icono: 'history',
    descripcion: 'Qué se hizo, cuándo y en qué equipo',
    keywords: [
      'bitacora', 'historial', 'auditoria', 'registro', 'acciones', 'seguridad',
      'equipo', 'nombre', 'puerta', 'oficina', 'pin', 'quiosco', 'borrado', 'quien',
    ],
  },
  {
    id: 'avanzado',
    nombre: 'Avanzado',
    icono: 'warning',
    descripcion: 'Accesos directos, herramientas de prueba y restablecer',
    keywords: [
      'avanzado', 'accesos', 'directos', 'shortcuts',
      'peligro', 'restablecer', 'fabrica', 'prueba', 'seed', 'generar', 'herramientas',
    ],
  },
];
