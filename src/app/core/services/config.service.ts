// ╔══════════════════════════════════════════════════════╗
// ║  config.service.ts                                   ║
// ║  Stenbrary v3.7.0 — Configuración de la aplicación  ║
// ║                                                      ║
// ║  Persiste ajustes en localStorage.                  ║
// ║  Actualmente gestiona:                               ║
// ║  - registroSalidaActivo: activa el módulo de         ║
// ║    presencia y el flujo de salida en el scanner      ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, signal } from '@angular/core';

interface AppConfig {
  registroSalidaActivo: boolean;
  // 0 = desactivado. Cualquier valor > 0 = horas antes de marcar cierre automático
  horasAutoSalida: number;
  // Nombre de la institución (aparece en la interfaz)
  nombreInstitucion: string;
  // Minutos para considerar un registro como duplicado en el scanner
  umbralDuplicadoMin: number;
}

const DEFAULT_CONFIG: AppConfig = {
  registroSalidaActivo: false,
  horasAutoSalida: 3,
  nombreInstitucion: '',
  umbralDuplicadoMin: 30,
};

const STORAGE_KEY = 'stenbrary-config';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig;

  // Signal reactivo: true cuando hay entradas cerradas automáticamente sin confirmar
  private _hayAutoClose = signal(false);
  readonly hayAutoClose = this._hayAutoClose.asReadonly();

  setHayAutoClose(valor: boolean): void {
    this._hayAutoClose.set(valor);
  }

  constructor() {
    this.config = this.cargar();
  }

  get registroSalidaActivo(): boolean {
    return this.config.registroSalidaActivo;
  }

  setRegistroSalidaActivo(valor: boolean): void {
    this.config.registroSalidaActivo = valor;
    this.guardar();
  }

  get horasAutoSalida(): number {
    return this.config.horasAutoSalida;
  }

  setHorasAutoSalida(horas: number): void {
    this.config.horasAutoSalida = horas;
    this.guardar();
  }

  get nombreInstitucion(): string {
    return this.config.nombreInstitucion;
  }

  setNombreInstitucion(nombre: string): void {
    this.config.nombreInstitucion = nombre.trim();
    this.guardar();
  }

  get umbralDuplicadoMin(): number {
    return this.config.umbralDuplicadoMin;
  }

  setUmbralDuplicadoMin(minutos: number): void {
    this.config.umbralDuplicadoMin = minutos;
    this.guardar();
  }

  private cargar(): AppConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch { /* silenciar */ }
    return { ...DEFAULT_CONFIG };
  }

  private guardar(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch { /* silenciar */ }
  }
}
