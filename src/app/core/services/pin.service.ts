// ╔══════════════════════════════════════════════════════╗
// ║  pin.service.ts                                      ║
// ║  Stenbrary v3.57.0 — PIN del coordinador             ║
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
  leerIntentosPin, msBloqueoPin, normalizarIntentosPin, registrarFalloPin,
} from '../utils/quiosco.utils';

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

  /** Sin PIN configurado cualquiera pasa: los diálogos lo avisan. */
  get hayPin(): boolean {
    return !!this.config.quioscoPin;
  }

  get hayCodigo(): boolean {
    return !!this.config.quioscoCodigoRecuperacion;
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

  verificarPin(pin: string): ResultadoPin {
    return this.verificar(this.config.validarQuioscoPin(pin), 'PIN');
  }

  /** El código cuenta contra los mismos intentos que el PIN. */
  verificarCodigo(codigo: string): ResultadoPin {
    const r = this.verificar(codigoRecuperacionCoincide(codigo, this.config.quioscoCodigoRecuperacion), 'Código de recuperación');
    if (r === 'ok') this.bitacora.registrar('pin-recuperado', 'Se pidió un PIN nuevo');
    return r;
  }

  /** Guarda un PIN nuevo y devuelve su código de recuperación (también nuevo). */
  establecerPin(pin: string): string {
    if (!esPinValido(pin)) throw new Error('PIN inválido');
    this.config.setQuioscoPin(pin);
    const codigo = generarCodigoRecuperacion();
    this.config.setQuioscoCodigoRecuperacion(codigo);
    this.bitacora.registrar('pin-cambiado', `${pin.length} dígitos; código de recuperación nuevo`);
    return codigo;
  }

  /** Código nuevo sin tocar el PIN: el anterior deja de servir. */
  generarCodigoNuevo(): string {
    const codigo = generarCodigoRecuperacion();
    this.config.setQuioscoCodigoRecuperacion(codigo);
    this.bitacora.registrar('codigo-generado', 'El código anterior deja de servir');
    return codigo;
  }

  private verificar(correcto: boolean, que: string): ResultadoPin {
    this.actualizar();
    if (this.msBloqueo() > 0) return 'bloqueado';
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
