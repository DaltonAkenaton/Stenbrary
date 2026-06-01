// ╔══════════════════════════════════════════════════════╗
// ║  connectivity.service.ts                             ║
// ║  Stenbrary — Estado de conexión real                 ║
// ║                                                      ║
// ║  `navigator.onLine` solo sabe si hay un adaptador de ║
// ║  red activo, NO si hay internet de verdad (un cable  ║
// ║  conectado a un router sin salida marca "online").   ║
// ║  Por eso el indicador del topbar mostraba verde sin  ║
// ║  conexión real.                                      ║
// ║                                                      ║
// ║  Aquí combinamos la señal del navegador (negativo    ║
// ║  rápido y fiable) con un sondeo activo periódico al  ║
// ║  backend (positivo confirmado). Si no hay Supabase   ║
// ║  configurado, caemos a `navigator.onLine`.           ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { isSupabaseConfigured } from '../auth/supabase.client';

const CHECK_INTERVAL_MS = 30_000;
const CHECK_TIMEOUT_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly onlineSignal = signal(navigator.onLine);
  /** `true` solo si hay conexión real confirmada (o navigator.onLine en
   *  modo solo-local). Reactivo para el indicador del topbar. */
  readonly online = this.onlineSignal.asReadonly();

  /**
   * Endpoint a sondear. Usamos el health de Supabase porque es lo que
   * realmente importa para sincronizar y ya es un origen permitido (no
   * añade dependencias ni riesgos de CSP). Sin backend → null.
   */
  private readonly checkUrl =
    isSupabaseConfigured() && environment.supabase?.url
      ? `${environment.supabase.url}/auth/v1/health`
      : null;

  constructor() {
    // Offline del navegador = señal dura: sin adaptador no hay nada que sondear.
    window.addEventListener('offline', () => this.onlineSignal.set(false));
    // Al recuperar el adaptador, confirmar con un sondeo real.
    window.addEventListener('online', () => void this.verificar());
    // Al volver a la pestaña, revalidar (pudo cambiar mientras estaba oculta).
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void this.verificar();
    });
    setInterval(() => void this.verificar(), CHECK_INTERVAL_MS);
    void this.verificar();
  }

  /** Comprobación inmediata. Devuelve el estado resultante. */
  async verificar(): Promise<boolean> {
    if (!navigator.onLine) {
      this.onlineSignal.set(false);
      return false;
    }
    if (!this.checkUrl) {
      this.onlineSignal.set(true);
      return true;
    }
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
      // no-cors: solo nos importa si la petición llega (respuesta opaca);
      // no leemos el cuerpo. cache:no-store evita falsos positivos del SW.
      await fetch(this.checkUrl, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      this.onlineSignal.set(true);
      return true;
    } catch {
      this.onlineSignal.set(false);
      return false;
    }
  }
}
