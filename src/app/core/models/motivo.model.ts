export interface Motivo {
  id?: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  color?: string;
  orden: number;
  activo: boolean;
  fechaCreacion?: Date;

  // ── Sync metadata (Fase 2.2 — opcional, retrocompat) ──
  _syncStatus?: 'pending' | 'synced' | 'rejected';
  _lastSyncedAt?: Date;
}