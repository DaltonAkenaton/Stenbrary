// ╔══════════════════════════════════════════════════════╗
// ║  changelog.service.ts                                ║
// ║  Stenbrary v3.8.0 — Notificación de novedades        ║
// ║                                                      ║
// ║  Compara la versión actual del CHANGELOG con la      ║
// ║  última versión que el usuario marcó como vista       ║
// ║  (persistido en localStorage). Expone un signal       ║
// ║  reactivo `hayNovedades` que la UI consume para       ║
// ║  mostrar badges en el sidebar y configuración.       ║
// ║                                                      ║
// ║  Flujo:                                              ║
// ║  1. Al iniciar, carga `versionVista` de localStorage.║
// ║  2. Si difiere de `versionActual().version`, marca   ║
// ║     `hayNovedades = true`.                           ║
// ║  3. Cuando el usuario abre /novedades, se llama      ║
// ║     `marcarComoVista()` y el badge desaparece.       ║
// ║                                                      ║
// ║  Caso especial — primera instalación:                 ║
// ║  Si nunca se ha guardado nada (usuario nuevo), NO    ║
// ║  mostramos badge: el usuario no tiene "novedades"    ║
// ║  porque acaba de instalar la app. Se marca la        ║
// ║  versión actual como vista automáticamente.          ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, computed, signal } from '@angular/core';
import { CHANGELOG, VersionChangelog, versionActual } from '../data/changelog.data';

const STORAGE_KEY = 'stenbrary-changelog-vista';

@Injectable({ providedIn: 'root' })
export class ChangelogService {

  /** Versión que el usuario marcó como vista (string vacío si nunca lo abrió). */
  private _versionVista = signal<string>('');

  /** Hay una versión más reciente que la última vista por el usuario. */
  readonly hayNovedades = computed(() => {
    const vista = this._versionVista();
    if (!vista) return false; // primera instalación: no contamos como novedad
    return vista !== versionActual().version;
  });

  /** Versión actual de la aplicación (primera del array de changelog). */
  readonly versionActualSignal = computed(() => versionActual());

  /** Todo el historial (más reciente primero). */
  readonly historial = CHANGELOG;

  constructor() {
    this.cargar();
  }

  /**
   * Marca la versión actual como vista. Llamar cuando el usuario
   * abra la vista de Novedades.
   */
  marcarComoVista(): void {
    const v = versionActual().version;
    this._versionVista.set(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch { /* silenciar */ }
  }

  /**
   * Devuelve solo las versiones nuevas desde la última vista por el usuario.
   * Útil si en algún momento queremos resaltarlas.
   */
  versionesNuevas(): VersionChangelog[] {
    const vista = this._versionVista();
    if (!vista) return [];
    const idx = CHANGELOG.findIndex(v => v.version === vista);
    if (idx <= 0) return [];
    return CHANGELOG.slice(0, idx);
  }

  private cargar(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this._versionVista.set(stored);
      } else {
        // Primera instalación: marcar la versión actual como vista
        // para no abrumar al usuario nuevo con un badge de bienvenida.
        const v = versionActual().version;
        this._versionVista.set(v);
        localStorage.setItem(STORAGE_KEY, v);
      }
    } catch { /* silenciar */ }
  }
}
