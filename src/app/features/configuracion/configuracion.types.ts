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
  | 'datos'
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
    descripcion: 'Sonido, comportamiento de detección y cámara',
    keywords: [
      'sonido', 'audio', 'beep', 'volumen', 'mute', 'silenciar',
      'velocidad', 'cooldown', 'instantaneo', 'rapido',
      'confirmacion', 'saltar', 'directo',
      'camara', 'frontal', 'trasera', 'zoom',
    ],
  },
  {
    id: 'operacion',
    nombre: 'Operación',
    icono: 'meeting_room',
    descripcion: 'Registro de salida, aforo y detección de duplicados',
    keywords: [
      'salida', 'entrada', 'biblioteca', 'presencia',
      'cierre', 'automatico', 'horas',
      'aforo', 'capacidad', 'maximo', 'limite', 'lleno',
      'duplicado', 'doble', 'repetido', 'umbral',
    ],
  },
  {
    id: 'quiosco',
    nombre: 'Quiosco',
    icono: 'tablet_android',
    descripcion: 'Modo quiosco para tablets y horarios de operación',
    keywords: [
      'quiosco', 'kiosk', 'tablet', 'pin', 'bloqueo',
      'horario', 'apertura', 'cierre', 'dias', 'semana',
      'abierto', 'cerrado',
    ],
  },
  {
    id: 'experiencia',
    nombre: 'Experiencia',
    icono: 'celebration',
    descripcion: 'Animaciones, pantalla de éxito y alertas de inactividad',
    keywords: [
      'celebracion', 'animacion', 'confetti', 'confeti', 'frecuencia',
      'exito', 'pantalla', 'tiempo', 'segundos',
      'inactividad', 'inactivos', 'alerta', 'dias',
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
    id: 'datos',
    nombre: 'Datos',
    icono: 'storage',
    descripcion: 'Respaldo, backup, restore, limpieza y datos de prueba',
    keywords: [
      'respaldo', 'backup', 'recordatorio', 'programado',
      'restore', 'restaurar', 'importar', 'exportar', 'descargar',
      'limpieza', 'limpiar', 'eliminar', 'rango',
      'prueba', 'seed', 'generar', 'mantenimiento',
    ],
  },
  {
    id: 'avanzado',
    nombre: 'Avanzado',
    icono: 'warning',
    descripcion: 'Accesos directos y zona peligrosa',
    keywords: [
      'avanzado', 'accesos', 'directos', 'shortcuts',
      'peligro', 'eliminar', 'todo', 'danger', 'destruccion',
    ],
  },
];
