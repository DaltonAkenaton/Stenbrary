// ╔══════════════════════════════════════════════════════╗
// ║  pin.service.ts                                      ║
// ║  Stenbrary v3.62.0 — PIN del coordinador             ║
// ║                                                      ║
// ║  El mismo PIN del quiosco autoriza ahora los borrados ║
// ║  (decisión del usuario, 2026-10-17). Por eso el       ║
// ║  límite de intentos vive aquí y no en un diálogo: el  ║
// ║  del quiosco y el de "Eliminar registros" comparten   ║
// ║  la cuenta — si no, 5 fallos en uno y 5 en el otro    ║
// ║  serían 10 intentos cada 5 min.                       ║
// ║                                                      ║
// ║  En la Fase 2 lo reemplazan los roles (roleGuard);    ║
// ║  los diálogos solo preguntan `verificar…()`.          ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject, signal } from '@angular/core';
import { ConfigService } from './config.service';
import { BitacoraService } from './bitacora.service';
import {
  IntentosPin, PIN_BLOQUEO_MS, PIN_MAX_FALLOS,
  codigoRecuperacionCoincide, esPinValido, generarCodigoRecuperacion,
  leerIntentosPin, msBloqueoPin, normalizarCodigoRecuperacion, normalizarIntentosPin, registrarFalloPin,
} from '../utils/quiosco.utils';
import { esHashPin, hashSecreto, secretoCoincide } from '../utils/pin-hash.utils';

const CLAVE_INTENTOS = 'stenbrary-pin-intentos';

export type ResultadoPin = 'ok' | 'fallo' | 'bloqueado';

@Injectable({ providedIn: 'root' })
export class PinService {
  private readonly config = inject(ConfigService);
  private readonly bitacora = inject(BitacoraService);

  /** Milisegundos de bloqueo que faltan; 0 = se puede intentar. */
  readonly msBloqueo = signal(0);
  /** Intentos que quedan antes del bloqueo. */
  readonly restantes = signal(PIN_MAX_FALLOS);

  private intentos: IntentosPin = this.leer();

  /**
   * v3.62.0: guardar un PIN (hash) tarda unos cientos de milisegundos. Los
   * cambios y las verificaciones se encadenan aquí para que una
   * verificación nunca compare contra un PIN a medio guardar.
   */
  private cola: Promise<unknown> = Promise.resolve();

  private enCola<T>(tarea: () => Promise<T>): Promise<T> {
    const r = this.cola.then(tarea, tarea);
    this.cola = r.catch(() => undefined);
    return r;
  }

  /** Sin PIN configurado cualquiera pasa: los diálogos lo avisan. */
  get hayPin(): boolean {
    return this.config.hayPin;
  }

  get hayCodigo(): boolean {
    return this.config.hayCodigoRecuperacion;
  }

  /**
   * Instalaciones de antes de v3.62.0 guardaban el PIN y el código en texto
   * plano. Se convierten en hash una sola vez, al arrancar (AppComponent);
   * mientras tanto la verificación acepta el valor viejo y lo convierte.
   */
  migrar(): Promise<void> {
    return this.enCola(() => this.migrarSinCola());
  }

  /** Ya dentro de la cola (la usa también `verificar`). */
  private async migrarSinCola(): Promise<void> {
    const { pin, codigo } = this.config.pinGuardado;
    const pinViejo = !!pin && !esHashPin(pin);
    const codigoViejo = !!codigo && !esHashPin(codigo);
    if (!pinViejo && !codigoViejo) return;
    // Los dos hashes primero y después se guardan juntos: nunca queda uno
    // migrado y el otro en texto plano.
    const [hashPin, hashCodigo] = await Promise.all([
      pinViejo ? hashSecreto(pin) : null,
      codigoViejo ? hashSecreto(normalizarCodigoRecuperacion(codigo)) : null,
    ]);
    if (hashCodigo) this.config.guardarCodigoHash(hashCodigo);
    if (hashPin) this.config.guardarPinHash(hashPin, pin.length, pin === '0000');
  }

  /**
   * Relee el estado guardado. Los diálogos lo llaman al abrir y cada segundo:
   * otra pestaña o el otro diálogo pudieron cambiarlo, y el bloqueo vence solo.
   */
  actualizar(): void {
    this.intentos = normalizarIntentosPin(this.leer(), Date.now());
    if (this.intentos.bloqueadoHasta > 0 && msBloqueoPin(this.intentos, Date.now()) === 0) {
      this.intentos = { fallos: 0, bloqueadoHasta: 0 };   // terminó el bloqueo
    }
    this.guardar();
    this.msBloqueo.set(msBloqueoPin(this.intentos, Date.now()));
    this.restantes.set(PIN_MAX_FALLOS - this.intentos.fallos);
  }

  /** Sin PIN configurado, cualquiera pasa (los diálogos lo avisan). */
  verificarPin(pin: string): Promise<ResultadoPin> {
    return this.enCola(async () => {
      if (!this.hayPin) return 'ok';
      return this.verificar(() => secretoCoincide(pin, this.config.pinGuardado.pin), 'PIN');
    });
  }

  /** El código cuenta contra los mismos intentos que el PIN. */
  verificarCodigo(codigo: string): Promise<ResultadoPin> {
    return this.enCola(async () => {
      const guardado = this.config.pinGuardado.codigo;
      const normalizado = normalizarCodigoRecuperacion(codigo);
      // El código viejo en texto plano conserva su comparación de siempre.
      const coincide = () => esHashPin(guardado)
        ? secretoCoincide(normalizado, guardado)
        : Promise.resolve(codigoRecuperacionCoincide(codigo, guardado));
      const r = await this.verificar(coincide, 'Código de recuperación');
      if (r === 'ok') this.bitacora.registrar('pin-recuperado', 'Se pidió un PIN nuevo');
      return r;
    });
  }

  /**
   * Guarda un PIN nuevo (su hash) y devuelve su código de recuperación,
   * también nuevo. `codigo` lo pasa el asistente inicial, que ya lo mostró.
   */
  establecerPin(pin: string, codigo = generarCodigoRecuperacion()): Promise<string> {
    if (!esPinValido(pin)) return Promise.reject(new Error('PIN inválido'));
    return this.enCola(async () => {
      const [hashPin, hashCodigo] = await Promise.all([
        hashSecreto(pin), hashSecreto(normalizarCodigoRecuperacion(codigo)),
      ]);
      this.config.guardarPinHash(hashPin, pin.length, false);
      this.config.guardarCodigoHash(hashCodigo);
      this.bitacora.registrar('pin-cambiado', `${pin.length} dígitos; código de recuperación nuevo`);
      return codigo;
    });
  }

  /** Código nuevo sin tocar el PIN: el anterior deja de servir. */
  generarCodigoNuevo(): Promise<string> {
    return this.enCola(async () => {
      const codigo = generarCodigoRecuperacion();
      this.config.guardarCodigoHash(await hashSecreto(normalizarCodigoRecuperacion(codigo)));
      this.bitacora.registrar('codigo-generado', 'El código anterior deja de servir');
      return codigo;
    });
  }

  private async verificar(coincide: () => Promise<boolean>, que: string): Promise<ResultadoPin> {
    this.actualizar();
    if (this.msBloqueo() > 0) return 'bloqueado';
    const correcto = await coincide();
    // Un PIN viejo en texto plano que acaba de coincidir se guarda ya con hash.
    if (correcto) await this.migrarSinCola();
    if (correcto) {
      this.intentos = { fallos: 0, bloqueadoHasta: 0 };
      this.guardar();
      this.actualizar();
      return 'ok';
    }
    this.intentos = registrarFalloPin(this.intentos, Date.now());
    this.guardar();
    if (this.intentos.bloqueadoHasta > 0) {
      this.bitacora.registrar('pin-bloqueado', `${PIN_MAX_FALLOS} intentos fallidos; bloqueado ${PIN_BLOQUEO_MS / 60_000} min`);
    } else {
      this.bitacora.registrar('pin-fallido', `${que} incorrecto: intento ${this.intentos.fallos} de ${PIN_MAX_FALLOS}`);
    }
    this.actualizar();
    return 'fallo';
  }

  private leer(): IntentosPin {
    try {
      return leerIntentosPin(localStorage.getItem(CLAVE_INTENTOS));
    } catch {
      // Sin localStorage el límite vive solo en memoria.
      return this.intentos ?? leerIntentosPin(null);
    }
  }

  private guardar(): void {
    try {
      localStorage.setItem(CLAVE_INTENTOS, JSON.stringify(this.intentos));
    } catch {
      // Ídem: sin almacenamiento, el límite queda en memoria.
    }
  }
}
