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

/**
 * Cada 30s eran ~120 peticiones por hora POR PESTAÑA ABIERTA, y como el
 * sondeo iba sin `apikey` todas volvían 401. En el dashboard de Supabase eso
 * se veía como 363 warnings en una hora y un "11.2% success rate": el ruido
 * tapaba cualquier fallo real. Un panel que miente al 96% no sirve para
 * monitorear nada.
 *
 * 3 minutos basta de sobra: los cambios de conexión reales ya llegan al
 * instante por los eventos `online`/`offline` y `visibilitychange`. Este
 * intervalo solo es la red de seguridad para el caso en que el sistema
 * operativo cree tener internet y no lo tenga (portal cautivo).
 */
const CHECK_INTERVAL_MS = 180_000;
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
  /**
   * La `apikey` va como query param, no como header: `mode: 'no-cors'` solo
   * admite cabeceras de la lista segura de CORS, así que un header `apikey`
   * se descarta en silencio y el endpoint responde 401. Sin ella el sondeo
   * igual servía —una respuesta opaca no distingue 200 de 401— pero dejaba
   * un rastro de errores en Supabase que no eran errores.
   *
   * La clave es publicable (`sb_publishable_*`, ya vive en el bundle y
   * respeta RLS), así que exponerla en la URL no agrega riesgo.
   */
  private readonly checkUrl =
    isSupabaseConfigured() && environment.supabase?.url
      ? `${environment.supabase.url}/auth/v1/health` +
        `?apikey=${encodeURIComponent(environment.supabase.anonKey ?? '')}`
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
    // Solo sondear con la pestaña visible. Una pestaña de fondo no necesita
    // saber si hay internet: nadie está viendo el indicador, y al volver a
    // ella el `visibilitychange` de arriba revalida al instante. Con varias
    // pestañas abiertas —lo normal— esto elimina la mayor parte del tráfico.
    setInterval(() => {
      if (document.hidden) return;
      void this.verificar();
    }, CHECK_INTERVAL_MS);
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
