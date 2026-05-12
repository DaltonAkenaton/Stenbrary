// ╔══════════════════════════════════════════════════════╗
// ║  sound.service.ts                                    ║
// ║  Stenbrary v3.21 — Volumen configurable              ║
// ║                                                      ║
// ║  Genera un "beep" sutil usando Web Audio API          ║
// ║  (sin archivos de audio externos).                    ║
// ║  Configurable: on/off + volumen vía ConfigService.    ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject } from '@angular/core';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class SoundService {

  private audioContext: AudioContext | null = null;
  private readonly STORAGE_KEY = 'stenbrary-sonido-activo';
  private configService = inject(ConfigService);

  /**
   * Si el sonido está habilitado.
   * Se persiste en localStorage para recordar preferencia.
   */
  get habilitado(): boolean {
    const valor = localStorage.getItem(this.STORAGE_KEY);
    // Por defecto activado si no hay preferencia guardada
    return valor === null ? true : valor === 'true';
  }

  set habilitado(valor: boolean) {
    localStorage.setItem(this.STORAGE_KEY, String(valor));
  }

  /**
   * Alterna el estado del sonido.
   * Retorna el nuevo estado.
   */
  toggle(): boolean {
    this.habilitado = !this.habilitado;
    return this.habilitado;
  }

  /**
   * Reproduce un beep de éxito (registro completado).
   * Tono agudo y corto — 880Hz, 120ms.
   */
  beepExito(): void {
    this.reproducirTono(880, 0.12, 'sine');
  }

  /**
   * Reproduce un beep de salida registrada.
   * Dos tonos cortos descendentes — "bi-bop".
   */
  beepSalida(): void {
    this.reproducirTono(660, 0.08, 'sine');
    setTimeout(() => {
      this.reproducirTono(440, 0.12, 'sine');
    }, 100);
  }

  /**
   * Reproduce un beep de error/advertencia.
   * Tono grave y corto — 300Hz, 200ms.
   */
  beepError(): void {
    this.reproducirTono(300, 0.2, 'square');
  }

  /**
   * Reproduce un beep de escaneo detectado.
   * Tono medio muy corto — 1200Hz, 60ms.
   */
  beepScan(): void {
    this.reproducirTono(1200, 0.06, 'sine');
  }

  /**
   * Genera un tono usando Web Audio API.
   * No necesita archivos de audio externos.
   */
  private reproducirTono(
    frecuencia: number,
    duracion: number,
    tipo: OscillatorType
  ): void {
    if (!this.habilitado) return;
    if (this.configService.volumenBeep <= 0) return;

    try {
      // Crear AudioContext lazily (requiere interacción del usuario)
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Si el contexto está suspendido (política del navegador), intentar reanudar
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = tipo;
      oscillator.frequency.setValueAtTime(frecuencia, this.audioContext.currentTime);

      // Volumen configurable (default 0.15). Si el coordinador lo subió a 1
      // suena fuerte; si está en 0 no reproduce nada.
      const vol = Math.max(0.0001, this.configService.volumenBeep);
      gainNode.gain.setValueAtTime(vol, this.audioContext.currentTime);
      // Fade out para evitar "click" al final
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        this.audioContext.currentTime + duracion
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duracion);
    } catch (error) {
      // Silenciar errores — el sonido es opcional
      console.warn('SoundService: no se pudo reproducir sonido', error);
    }
  }
}