// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/diagnostico.service.ts  ║
// ║  Stenbrary — Bitácora de incidencias                 ║
// ║                                                      ║
// ║  El problema que resuelve:                           ║
// ║  quien usa el sistema no es quien lo programa. El    ║
// ║  coordinador y los alumnos de servicio social no van ║
// ║  a distinguir un bug de "así es esto" — van a        ║
// ║  reintentar y seguir. Sin registro, el defecto       ║
// ║  nunca llega al desarrollador.                       ║
// ║                                                      ║
// ║  Por eso graba SIEMPRE en local, sin configuración   ║
// ║  ni backend. `ErrorReporterService` solo enviaba a   ║
// ║  un endpoint remoto y, con el endpoint vacío (que    ║
// ║  es el caso en producción), tiraba la evidencia.     ║
// ║                                                      ║
// ║  Nada de esto interrumpe al usuario: anotar una      ║
// ║  incidencia jamás debe romper la tarea en curso.     ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type NivelIncidencia = 'anomalia' | 'error';

export interface Incidencia {
  id: string;
  timestamp: string;
  nivel: NivelIncidencia;
  /** Frase corta y estable — sirve para agrupar repeticiones. */
  mensaje: string;
  /** Dónde ocurrió, en términos del código: 'scanner', 'descarga', etc. */
  area: string;
  /** Datos mínimos para reproducir. Sin nombres ni matrículas completas. */
  contexto?: Record<string, unknown>;
  stack?: string;
  url: string;
  /** Cuántas veces se repitió exactamente lo mismo. */
  veces: number;
}

const STORAGE_KEY = 'stenbrary-diagnostico';
/** Tope de incidencias distintas guardadas. Las viejas se descartan. */
const MAX_INCIDENCIAS = 200;
/** Tope de caracteres del contexto serializado, para no reventar la cuota. */
const MAX_CONTEXTO_CHARS = 1000;

@Injectable({ providedIn: 'root' })
export class DiagnosticoService {
  private readonly incidenciasSignal = signal<Incidencia[]>(this.leerDeDisco());

  readonly incidencias = this.incidenciasSignal.asReadonly();
  readonly total = computed(() =>
    this.incidenciasSignal().reduce((suma, i) => suma + i.veces, 0),
  );
  readonly hayIncidencias = computed(() => this.incidenciasSignal().length > 0);
  readonly totalErrores = computed(() =>
    this.incidenciasSignal().filter(i => i.nivel === 'error').length,
  );

  /**
   * Registra una incidencia.
   *
   * Nunca lanza. Envolver todo en try/catch no es defensivo de más: si el
   * disco está lleno o el contexto no es serializable, perder la anotación es
   * aceptable — romper el registro de un alumno frente a la fila no lo es.
   */
  registrar(
    nivel: NivelIncidencia,
    area: string,
    mensaje: string,
    contexto?: Record<string, unknown>,
    stack?: string,
  ): void {
    try {
      const lista = [...this.incidenciasSignal()];

      // Agrupar por área + mensaje. Un bug que ocurre 400 veces debe verse
      // como "1 problema, 400 veces", no como 400 líneas que ocultan el resto.
      const existente = lista.find(i => i.area === area && i.mensaje === mensaje);
      if (existente) {
        existente.veces += 1;
        existente.timestamp = new Date().toISOString();
        if (contexto) existente.contexto = this.recortarContexto(contexto);
      } else {
        lista.unshift({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          nivel,
          area,
          mensaje: String(mensaje).slice(0, 300),
          contexto: contexto ? this.recortarContexto(contexto) : undefined,
          stack: stack?.slice(0, 2000),
          url: typeof location !== 'undefined' ? location.pathname : '',
          veces: 1,
        });
      }

      while (lista.length > MAX_INCIDENCIAS) lista.pop();

      this.incidenciasSignal.set(lista);
      this.guardarEnDisco(lista);
    } catch {
      /* Anotar nunca puede tumbar la operación en curso. */
    }
  }

  /** Atajo para el caso más común: algo salió distinto de lo esperado. */
  anomalia(area: string, mensaje: string, contexto?: Record<string, unknown>): void {
    this.registrar('anomalia', area, mensaje, contexto);
    if (!environment.production) {
      console.warn(`⚠️ [${area}] ${mensaje}`, contexto ?? '');
    }
  }

  error(area: string, mensaje: string, contexto?: Record<string, unknown>, stack?: string): void {
    this.registrar('error', area, mensaje, contexto, stack);
  }

  limpiar(): void {
    this.incidenciasSignal.set([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }

  /**
   * Reporte completo en JSON, listo para adjuntar a un correo o WhatsApp.
   *
   * Es el canal realista: el coordinador no va a abrir la consola del
   * navegador ni a describir un stack trace. Aprieta un botón, se le descarga
   * un archivo, lo manda.
   */
  construirReporte(): string {
    return JSON.stringify(
      {
        app: 'Stenbrary',
        generado: new Date().toISOString(),
        entorno: environment.production ? 'produccion' : 'desarrollo',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        pantalla:
          typeof window !== 'undefined'
            ? `${window.innerWidth}x${window.innerHeight}`
            : '',
        totalIncidencias: this.total(),
        incidencias: this.incidenciasSignal(),
      },
      null,
      2,
    );
  }

  /**
   * Recorta el contexto y descarta lo que no sea serializable.
   *
   * El contexto viaja fuera del equipo, así que quien llame a `anomalia()` no
   * debe meter datos personales — pero el tope también protege contra
   * arrastrar un objeto enorme sin querer.
   */
  private recortarContexto(contexto: Record<string, unknown>): Record<string, unknown> {
    try {
      const texto = JSON.stringify(contexto);
      if (texto.length <= MAX_CONTEXTO_CHARS) return JSON.parse(texto);
      return { _recortado: true, muestra: texto.slice(0, MAX_CONTEXTO_CHARS) };
    } catch {
      return { _noSerializable: true };
    }
  }

  private leerDeDisco(): Incidencia[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const datos = raw ? JSON.parse(raw) : [];
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  private guardarEnDisco(lista: Incidencia[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch {
      // Cuota llena: conservar solo las más recientes antes que perder todo.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, 20)));
      } catch {
        /* noop */
      }
    }
  }
}
