// ╔══════════════════════════════════════════════════════╗
// ║  core/services/reloj.service.ts                       ║
// ║  Stenbrary v3.59.0 — Hora correcta sin depender de    ║
// ║  la computadora                                       ║
// ║                                                       ║
// ║  Con internet, toma la hora del servidor (cabecera    ║
// ║  Date de Cloudflare) al abrir, cada 30 min y al       ║
// ║  volver la conexión. Sin internet se queda con el     ║
// ║  último desfase. Si nunca hubo, se ajusta a mano con  ║
// ║  PIN. La corrección en sí está en reloj.utils.ts.     ║
// ║                                                       ║
// ║  Solo en producción: el servidor de desarrollo (y     ║
// ║  Playwright, que congela el reloj) daría un desfase   ║
// ║  falso.                                               ║
// ╚══════════════════════════════════════════════════════╝
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BitacoraService } from './bitacora.service';
import {
  AvisoReloj, EstadoReloj, desfaseActual, desfaseDesdeServidor, desfaseManual, describirDesfase,
  fijarDesfase, horaPc, leerEstadoReloj, revisarReloj,
} from '../utils/reloj.utils';

/** Correcciones mayores a esto quedan en la bitácora. */
const AVISAR_EN_BITACORA_MS = 5 * 60_000;
const CADA_MS = 30 * 60_000;

@Injectable({ providedIn: 'root' })
export class RelojService {
  private readonly bitacora = inject(BitacoraService);

  readonly estado = signal<EstadoReloj | null>(leerEstadoReloj(localStorage));
  readonly aviso = signal<AvisoReloj | null>(revisarReloj(this.estado()));
  readonly sincronizando = signal(false);

  private iniciado = false;

  iniciar(): void {
    if (this.iniciado || !environment.production) return;
    this.iniciado = true;
    void this.sincronizar();
    setInterval(() => void this.sincronizar(), CADA_MS);
    window.addEventListener('online', () => void this.sincronizar());
  }

  /** Pide la hora al servidor. Devuelve si lo logró. */
  async sincronizar(): Promise<boolean> {
    if (this.sincronizando() || !navigator.onLine) {
      this.revisar();
      return false;
    }
    this.sincronizando.set(true);
    try {
      const antes = horaPc();
      // HEAD sin caché y saltándose el service worker: si no, la cabecera Date
      // sería la de cuando se guardó la página.
      const r = await fetch(`/index.html?reloj=${antes}`, {
        method: 'HEAD', cache: 'no-store', headers: { 'ngsw-bypass': 'true' },
      });
      const despues = horaPc();
      const nuevo = desfaseDesdeServidor(r.headers.get('date'), antes, despues);
      if (nuevo === null) return false;
      this.aplicar({ desfaseMs: nuevo, fuente: 'internet', pcAlAjustar: despues });
      return true;
    } catch {
      return false;   // sin conexión real: se queda el último desfase
    } finally {
      this.sincronizando.set(false);
      this.revisar();
    }
  }

  /** "La hora real es…": para equipos que nunca tienen internet. */
  ajustarAMano(horaReal: Date): void {
    const pc = horaPc();
    this.aplicar({ desfaseMs: desfaseManual(horaReal, pc), fuente: 'manual', pcAlAjustar: pc }, true);
  }

  /** Vuelve a usar la hora de la computadora tal cual. */
  usarHoraDeLaPc(): void {
    fijarDesfase(null);
    this.estado.set(null);
    this.bitacora.registrar('reloj-ajustado', 'Volvió a usar la hora de la computadora');
    this.revisar();
  }

  revisar(): void {
    this.aviso.set(revisarReloj(this.estado()));
  }

  private aplicar(estado: EstadoReloj, manual = false): void {
    const cambio = Math.abs(estado.desfaseMs - desfaseActual());
    fijarDesfase(estado);
    this.estado.set(estado);
    if (manual || cambio > AVISAR_EN_BITACORA_MS) {
      this.bitacora.registrar('reloj-ajustado',
        `${manual ? 'Ajuste a mano' : 'Hora de internet'}: la computadora va ${describirDesfase(estado.desfaseMs)}`);
    }
    this.revisar();
  }
}
