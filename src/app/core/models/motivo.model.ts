export interface Motivo {
  id?: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  color?: string;
  orden: number;
  activo: boolean;
  fechaCreacion?: Date;
}