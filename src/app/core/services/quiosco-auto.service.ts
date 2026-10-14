// ╔══════════════════════════════════════════════════════╗
// ║  quiosco-auto.service.ts                             ║
// ║  Stenbrary v3.49.0 — Volver solo al modo quiosco     ║
// ║                                                      ║
// ║  Escucha la actividad (clic, toque, tecla — el       ║
// ║  lector cuenta como tecla) y cada 15 s consulta      ║
// ║  debeVolverAQuiosco(). Los listeners solo guardan    ║
// ║  un número: costo nulo en equipos lentos.            ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfigService } from './config.service';
import { ToastService } from './toast.service';
import { debeVolverAQuiosco } from '../utils/quiosco.utils';
import { BitacoraService } from './bitacora.service';

const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
const REVISION_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class QuioscoAutoService {
  private readonly bitacora = inject(BitacoraService);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly zone = inject(NgZone);

  private ultimaActividad = Date.now();
  private iniciado = false;

  private readonly marcar = () => { this.ultimaActividad = Date.now(); };

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    // Fuera de la zona: ni los eventos ni el intervalo disparan detección de cambios.
    this.zone.runOutsideAngular(() => {
      for (const ev of EVENTOS) {
        document.addEventListener(ev, this.marcar, { passive: true, capture: true });
      }
      setInterval(() => this.revisar(), REVISION_MS);
    });
  }

  private revisar(): void {
    const volver = debeVolverAQuiosco({
      activo: this.config.modoQuiosco,
      minutos: this.config.quioscoAutoMinutos,
      ultimaActividad: this.ultimaActividad,
      ahora: Date.now(),
      ruta: this.router.url.split('?')[0],
    });
    if (!volver) return;
    this.zone.run(() => {
      // El effect de AppComponent lleva al escáner al encenderse el quiosco.
      this.config.setModoQuiosco(true);
      // Quedó abierto sin nadie: vale la pena que el coordinador lo sepa.
      this.bitacora.registrar('quiosco-auto', `Tras ${this.config.quioscoAutoMinutos} min sin uso`);
      this.toast.info('Modo quiosco reactivado por inactividad');
    });
  }
}
