// ╔══════════════════════════════════════════════════════╗
// ║  aforo.service.ts                                    ║
// ║  Stenbrary v3.8.0 — Control de aforo                 ║
// ║                                                      ║
// ║  Mantiene un signal reactivo con la ocupación actual ║
// ║  (personas con entrada abierta hoy) y la capacidad   ║
// ║  máxima configurada. Estado derivado:                ║
// ║                                                      ║
// ║  - libre:    < 50 % de capacidad                     ║
// ║  - normal:   50-79 %                                 ║
// ║  - alto:     80-99 %                                 ║
// ║  - lleno:    100 %                                   ║
// ║  - sobreaforo: > 100 %                               ║
// ║                                                      ║
// ║  Requiere `registroSalidaActivo` y `aforoMaximo > 0` ║
// ║  para funcionar (ver ConfigService.aforoActivo).     ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, computed, signal } from '@angular/core';
import { DatabaseService } from './database.service';
import { ConfigService } from './config.service';

export type EstadoAforo = 'inactivo' | 'libre' | 'normal' | 'alto' | 'lleno' | 'sobreaforo';

@Injectable({ providedIn: 'root' })
export class AforoService {

  /** Ocupación actual (personas con entrada abierta hoy) */
  private _ocupacion = signal(0);
  readonly ocupacion = this._ocupacion.asReadonly();

  /** Capacidad máxima configurada */
  readonly capacidad = computed(() => this.configService.aforoMaximo);

  /** ¿Está activo el control de aforo? */
  readonly activo = computed(() => this.configService.aforoActivo);

  /** Lugares disponibles (capacidad - ocupación). Mínimo 0. */
  readonly disponibles = computed(() => {
    const cap = this.capacidad();
    if (cap <= 0) return 0;
    return Math.max(0, cap - this._ocupacion());
  });

  /** Porcentaje de ocupación 0..100+ */
  readonly porcentaje = computed(() => {
    const cap = this.capacidad();
    if (cap <= 0) return 0;
    return Math.round((this._ocupacion() / cap) * 100);
  });

  /** Estado semántico para colorear UI */
  readonly estado = computed<EstadoAforo>(() => {
    if (!this.activo()) return 'inactivo';
    const p = this.porcentaje();
    if (p > 100) return 'sobreaforo';
    if (p >= 100) return 'lleno';
    if (p >= 80) return 'alto';
    if (p >= 50) return 'normal';
    return 'libre';
  });

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
  ) {}

  /**
   * Recalcula la ocupación leyendo de la base de datos.
   * Llamar después de crear/cerrar registros o al entrar a vistas que muestran aforo.
   *
   * NOTA: descuenta las entradas ya cerradas por `cierreAutomatico` (esas
   * personas YA se fueron — solo esperan la confirmación manual del personal).
   * Si no las descontáramos, el aforo reportaría sobreaforo fantasma.
   */
  async refrescar(): Promise<void> {
    try {
      const abiertos = await this.databaseService.obtenerRegistrosAbiertoHoy();
      const ocupacionReal = abiertos.filter((r) => !r.horaSalida).length;
      this._ocupacion.set(ocupacionReal);
    } catch (error) {
      console.error('AforoService.refrescar:', error);
    }
  }

  /**
   * Setter directo (útil cuando ya tenemos el conteo, p.ej. en /presencia)
   * para evitar una segunda lectura de la BD.
   */
  setOcupacion(n: number): void {
    this._ocupacion.set(Math.max(0, n));
  }

  /** ¿Hay al menos un lugar disponible para una nueva entrada? */
  get hayCupo(): boolean {
    if (!this.activo()) return true;
    return this._ocupacion() < this.capacidad();
  }
}
