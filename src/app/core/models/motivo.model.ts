export interface Motivo {
  id: string;
  nombre: string;
  icono?: string;
  orden: number;
  activo: boolean;
  fechaCreacion: Date;
}