export interface Registro {
  id: string;
  alumnoId: string;
  matricula: string;
  nombreCompleto: string;
  carrera: string;
  motivoId: string;
  motivoNombre: string;
  fechaHora: Date;
  dispositivo?: string;
  sincronizado: boolean;
}