 export const CARRERAS: string[] = [
  'Contador Público',
  'Licenciatura en Administración',
  'Licenciatura en Autotransporte de Carga',
  'Licenciatura en Comercio Exterior',
  'Licenciatura en Derecho',
  'Licenciatura en Enfermería',
  'Licenciatura en Psicología',
  'Licenciatura en Tecnologías de la Información',
];

export const TURNOS = ['Matutino', 'Vespertino', 'Mixto'] as const;
export type Turno = typeof TURNOS[number];

export const GRADOS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const GRUPOS: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];