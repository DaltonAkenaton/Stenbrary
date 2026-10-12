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

// La carrera dura 9 semestres, pero hay alumnos rezagados en 10.º–12.º. El
// importador ya aceptaba hasta 12; los formularios se quedaban en 10.
export const GRADOS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const GRUPOS: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];