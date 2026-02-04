export interface Alumno {
  id?: string;
  matricula: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  carrera: string;
  grado: number;
  grupo: string;
  turno: 'Matutino' | 'Vespertino' | 'Mixto';
  activo: boolean;
  fechaRegistro: Date;
  fechaActualizacion?: Date;
}

export interface AlumnoCompleto extends Alumno {
  nombreCompleto: string;
}