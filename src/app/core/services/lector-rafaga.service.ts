// ╔══════════════════════════════════════════════════════╗
// ║  lector-rafaga.service.ts                            ║
// ║  Stenbrary v3.54.0 — El lector fuera del escáner     ║
// ║                                                      ║
// ║  El lector USB "teclea" la matrícula muy rápido y    ║
// ║  manda Enter. En el escáner eso lo atiende su propio ║
// ║  listener; en "elegir actividad" y en el registro de ║
// ║  alumno nuevo nadie lo escuchaba: los dígitos caían  ║
// ║  en el campo con foco y el Enter podía presionar el  ║
// ║  botón enfocado (p. ej. "Registrar" del alumno       ║
// ║  anterior). Este servicio reconoce la ráfaga, se     ║
// ║  come el Enter y avisa a la pantalla que escucha.    ║
// ║                                                      ║
// ║  Solo hay un oyente a la vez: la pantalla activa.    ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, NgZone, inject } from '@angular/core';
import { MATRICULA_CONFIG, esMatriculaValidaScanner, normalizarMatricula } from '../utils/matricula.utils';
import { decidirLecturaEnFlujo } from '../utils/flujo-puerta.utils';

/** Igual que el escáner: cubre el modo Bluetooth del lector. */
const MAX_GAP_MS = 150;
const MAX_TOTAL_MS = 3000;

@Injectable({ providedIn: 'root' })
export class LectorRafagaService {
  private readonly zone = inject(NgZone);

  private oyente: ((matricula: string) => void) | null = null;
  private instalado = false;
  private buffer = '';
  private inicio = 0;
  private ultima = 0;

  /** Registra la pantalla activa. Devuelve la función para dejar de escuchar. */
  escuchar(cb: (matricula: string) => void): () => void {
    this.instalar();
    this.oyente = cb;
    this.buffer = '';
    return () => {
      if (this.oyente === cb) this.oyente = null;
      this.buffer = '';
    };
  }

  private instalar(): void {
    if (this.instalado) return;
    this.instalado = true;
    // Captura y fuera de la zona: cada tecla solo actualiza tres números.
    this.zone.runOutsideAngular(() => {
      document.addEventListener('keydown', this.onKey, true);
      for (const ev of ['keypress', 'keyup', 'click'] as const) {
        document.addEventListener(ev, this.trasEnterDelLector, true);
      }
    });
  }

  /** Cuándo se comió el último Enter del lector. */
  private enterDelLectorTs = 0;

  /**
   * Cancelar el keydown no basta: Chrome activa el botón enfocado con un
   * "click" de teclado que llega después (la prueba E2E lo demostró: el Enter
   * del siguiente alumno registraba al anterior). Lo que llegue justo tras
   * ese Enter — keypress, keyup o un click de teclado (`detail === 0`) — se
   * descarta también.
   */
  private readonly trasEnterDelLector = (e: Event): void => {
    if (performance.now() - this.enterDelLectorTs > 300) return;
    const esTecladoEnter = e instanceof KeyboardEvent && e.key === 'Enter';
    const esClickDeTeclado = e instanceof MouseEvent && e.type === 'click' && e.detail === 0;
    if (!esTecladoEnter && !esClickDeTeclado) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  // ── Vigilar un flujo de la puerta ───────────────────────
  // Para "elegir actividad" y el registro de alumno nuevo: si nadie toca la
  // pantalla en `abandonoMs`, se cancela; si llega la lectura de otra
  // credencial, se decide con `decidirLecturaEnFlujo` (flujo-puerta.utils).

  private ultimaHumana = Date.now();

  vigilarFlujo(o: {
    abandonoMs: number;
    matricula: () => string | null;
    /** Ya se guardó; solo queda la pantalla de éxito. */
    terminado: () => boolean;
    /** Guardando en este momento: no interrumpir. */
    ocupado: () => boolean;
    abandonar: (motivo: 'inactividad' | 'nueva-lectura', leida?: string) => void;
    avisar: (texto: string) => void;
  }): () => void {
    this.ultimaHumana = Date.now();
    const marcar = () => { this.ultimaHumana = Date.now(); };

    const dejarDeEscuchar = this.escuchar(leida => {
      if (o.ocupado()) return;
      const decision = decidirLecturaEnFlujo({
        matriculaFlujo: o.matricula(),
        leida,
        msSinInteraccion: Date.now() - this.ultimaHumana,
        terminado: o.terminado(),
      });
      if (decision === 'atender') o.abandonar('nueva-lectura', leida);
      else if (decision === 'misma') o.avisar('Ya pasaste tu credencial: termina aquí tu registro.');
      else o.avisar('Hay un registro en curso. Pasa tu credencial en un momento.');
    });

    let revision: ReturnType<typeof setInterval> | null = null;
    this.zone.runOutsideAngular(() => {
      document.addEventListener('pointerdown', marcar, true);
      revision = setInterval(() => {
        if (o.terminado() || o.ocupado()) return;
        if (Date.now() - this.ultimaHumana >= o.abandonoMs) {
          this.zone.run(() => o.abandonar('inactividad'));
        }
      }, 5000);
    });

    return () => {
      dejarDeEscuchar();
      document.removeEventListener('pointerdown', marcar, true);
      if (revision) clearInterval(revision);
    };
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    // Cualquier tecla que no sea un dígito es una persona (los dígitos son
    // ambiguos: el lector también los manda).
    if (e.key.length !== 1 || !/[0-9]/.test(e.key)) {
      if (e.key !== 'Enter') this.ultimaHumana = Date.now();
    }
    if (!this.oyente) return;
    const ahora = performance.now();
    if (ahora - this.ultima > MAX_GAP_MS) this.buffer = '';

    if (e.key === 'Enter') {
      const candidata = normalizarMatricula(this.buffer);
      const rapida = ahora - this.inicio <= MAX_TOTAL_MS;
      this.buffer = '';
      const esRafaga = rapida && /^\d+$/.test(candidata) && candidata.length >= MATRICULA_CONFIG.minDigitos;
      if (esRafaga) {
        // El Enter es del lector, no de la persona: que no presione nada.
        // También el de un código que no es matrícula (el ISBN de un libro,
        // v3.57.2): ese no se atiende, pero tampoco debe confirmar nada.
        e.preventDefault();
        e.stopImmediatePropagation();
        this.enterDelLectorTs = ahora;
        if (esMatriculaValidaScanner(candidata)) {
          const cb = this.oyente;
          this.zone.run(() => cb(candidata));
        }
      }
      return;
    }

    if (e.key.length === 1 && /[0-9aA]/.test(e.key)) {
      if (!this.buffer) this.inicio = ahora;
      this.buffer += e.key;
      this.ultima = ahora;
    } else if (e.key.length === 1) {
      this.buffer = ''; // una letra o espacio: es una persona escribiendo
    }
  };
}
