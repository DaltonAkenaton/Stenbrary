// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/descarga.service.ts     ║
// ║  Stenbrary — Bajar datos de la nube (Fase 2.2)       ║
// ║                                                      ║
// ║  El espejo de SyncService: si subir es supervisado,  ║
// ║  bajar también. Este servicio compara y escribe SOLO ║
// ║  lo que el coordinador aceptó explícitamente.        ║
// ║                                                      ║
// ║  Regla de seguridad de esta versión: solo se         ║
// ║  escriben filas que NO existen localmente. Los       ║
// ║  conflictos se muestran pero no se resuelven —       ║
// ║  sobrescribir datos locales es la parte peligrosa y  ║
// ║  necesita su propio diseño con el coordinador.       ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, computed, inject, signal } from '@angular/core';
import { DatabaseService } from './database.service';
import { RemoteDatabaseService } from './remote-database.service';
import { Alumno, Motivo, Registro } from '../models';
import {
  DiffCompleto,
  DescargaStore,
  construirDiff,
} from '../utils/descarga.utils';
import { coincide, reportarAnomalia } from '../utils/invariante.utils';

export interface ProgresoDescarga {
  activo: boolean;
  /** Qué está pasando ahora, en lenguaje del coordinador. */
  etapa: string;
  procesadas: number;
  total: number;
}

export interface ResultadoDescarga {
  traidos: number;
  fallidos: number;
  errores: { store: DescargaStore; label: string; message: string }[];
}

const PROGRESO_INICIAL: ProgresoDescarga = {
  activo: false, etapa: '', procesadas: 0, total: 0,
};

function mensajeError(err: unknown): string {
  return (err as Error)?.message ?? String(err);
}

@Injectable({ providedIn: 'root' })
export class DescargaService {
  private readonly databaseService = inject(DatabaseService);
  private readonly remote = inject(RemoteDatabaseService);

  private readonly diffSignal = signal<DiffCompleto | null>(null);
  private readonly progresoSignal = signal<ProgresoDescarga>(PROGRESO_INICIAL);
  private readonly ultimaComparacionSignal = signal<Date | null>(null);

  readonly diff = this.diffSignal.asReadonly();
  readonly progreso = this.progresoSignal.asReadonly();
  readonly ultimaComparacion = this.ultimaComparacionSignal.asReadonly();

  readonly hayAlgoQueTraer = computed(() => (this.diffSignal()?.totalNuevas ?? 0) > 0);
  readonly hayConflictos = computed(() => (this.diffSignal()?.totalConflictos ?? 0) > 0);

  disponible(): boolean {
    return this.remote.isAvailable();
  }

  /**
   * Lee ambos lados y calcula el diff. No escribe nada.
   *
   * Es seguro llamarlo siempre que se quiera: la comparación es de solo
   * lectura, y verla es justamente lo que responde "¿qué hay allá arriba?".
   */
  async comparar(): Promise<DiffCompleto> {
    if (!this.remote.isAvailable()) {
      throw new Error('Backend no configurado. Inicia sesión para comparar con la nube.');
    }

    this.progresoSignal.set({
      activo: true, etapa: 'Leyendo datos locales...', procesadas: 0, total: 0,
    });

    try {
      const [motivosLocal, alumnosLocal, registrosLocal] = await Promise.all([
        this.databaseService.obtenerTodosLosMotivos(),
        this.databaseService.obtenerTodosLosAlumnos(),
        this.databaseService.obtenerTodosLosRegistros(),
      ]);

      this.progresoSignal.set({
        activo: true, etapa: 'Leyendo la nube...', procesadas: 0, total: 0,
      });

      const [motivosRemoto, alumnosRemoto] = await Promise.all([
        this.remote.obtenerTodosLosMotivos(),
        this.remote.obtenerTodosLosAlumnos(),
      ]);

      // Los registros van aparte y con reporte de avance: son la tabla
      // grande y la que se pagina, así que es donde el usuario espera.
      const registrosRemoto = await this.remote.obtenerTodosLosRegistros(acumulados => {
        this.progresoSignal.set({
          activo: true,
          etapa: 'Leyendo registros de la nube...',
          procesadas: acumulados,
          total: 0,
        });
      });

      this.progresoSignal.set({
        activo: true, etapa: 'Comparando...', procesadas: 0, total: 0,
      });

      const diff = construirDiff(
        { motivos: motivosLocal, alumnos: alumnosLocal, registros: registrosLocal },
        { motivos: motivosRemoto, alumnos: alumnosRemoto, registros: registrosRemoto },
      );

      this.diffSignal.set(diff);
      this.ultimaComparacionSignal.set(new Date());
      return diff;
    } finally {
      this.progresoSignal.set(PROGRESO_INICIAL);
    }
  }

  /**
   * Trae a la base local las filas seleccionadas por id.
   *
   * Solo acepta ids que el último `comparar()` haya clasificado como
   * **nuevas**. Un id que no esté en esa lista se ignora en silencio: es la
   * garantía de que esta ruta no puede sobrescribir nada, ni por un bug de
   * la UI ni por un diff obsoleto.
   *
   * El orden importa — motivos y alumnos antes que registros, porque los
   * registros los referencian.
   */
  async traer(seleccion: {
    motivos?: string[];
    alumnos?: string[];
    registros?: string[];
  }): Promise<ResultadoDescarga> {
    const diff = this.diffSignal();
    if (!diff) {
      throw new Error('Primero hay que comparar con la nube.');
    }

    const motivos = this.filtrarNuevas(diff.motivos.nuevas, seleccion.motivos);
    const alumnos = this.filtrarNuevas(diff.alumnos.nuevas, seleccion.alumnos);
    const registros = this.filtrarNuevas(diff.registros.nuevas, seleccion.registros);

    const total = motivos.length + alumnos.length + registros.length;
    const errores: ResultadoDescarga['errores'] = [];
    let traidos = 0;
    let procesadas = 0;

    if (total === 0) return { traidos: 0, fallidos: 0, errores: [] };

    const avanzar = (etapa: string) => {
      procesadas += 1;
      this.progresoSignal.set({ activo: true, etapa, procesadas, total });
    };

    this.progresoSignal.set({
      activo: true, etapa: 'Guardando...', procesadas: 0, total,
    });

    try {
      for (const fila of motivos) {
        try {
          await this.databaseService.restaurarMotivo(fila.remoto as Motivo, 'nube');
          traidos += 1;
        } catch (err) {
          errores.push({ store: 'motivos', label: fila.label, message: mensajeError(err) });
        }
        avanzar('Guardando motivos...');
      }

      for (const fila of alumnos) {
        try {
          const guardado = await this.databaseService.restaurarAlumno(fila.remoto as Alumno, 'nube');
          if (guardado) {
            traidos += 1;
          } else {
            errores.push({
              store: 'alumnos',
              label: fila.label,
              message: 'La matrícula ya pertenece a otro alumno local.',
            });
          }
        } catch (err) {
          errores.push({ store: 'alumnos', label: fila.label, message: mensajeError(err) });
        }
        avanzar('Guardando alumnos...');
      }

      for (const fila of registros) {
        try {
          await this.databaseService.restaurarRegistro(fila.remoto as Registro, 'nube');
          traidos += 1;
        } catch (err) {
          errores.push({ store: 'registros', label: fila.label, message: mensajeError(err) });
        }
        avanzar('Guardando registros...');
      }
    } finally {
      this.progresoSignal.set(PROGRESO_INICIAL);
    }

    // Invariante: lo aceptado es lo que se guardó. Un desajuste aquí
    // significa que el coordinador cree tener datos que no bajaron — el peor
    // caso posible en una herramienta de respaldo, y hoy sería invisible.
    coincide(
      traidos, total,
      'descarga',
      'Se trajeron menos elementos de los seleccionados',
      { fallidos: errores.length, primerError: errores[0]?.message },
    );

    // El diff quedó obsoleto en cuanto se escribió: recalcularlo evita que la
    // pantalla siga ofreciendo traer algo que ya está.
    await this.comparar().catch(err => {
      // Antes esto era un catch vacío. Fallar aquí deja la pantalla mostrando
      // un diff viejo, y el coordinador vuelve a "traer" lo que ya trajo.
      reportarAnomalia('descarga', 'No se pudo recalcular tras traer datos', {
        detalle: (err as Error)?.message,
      });
    });

    return { traidos, fallidos: errores.length, errores };
  }

  /** Intersección entre lo seleccionado y lo que el diff marcó como nuevo. */
  private filtrarNuevas<T>(
    nuevas: { id: string; label: string; remoto: T }[],
    ids: string[] | undefined,
  ) {
    if (!ids || ids.length === 0) return [];
    const set = new Set(ids);
    return nuevas.filter(f => set.has(f.id));
  }

  /** Atajo: traer todo lo clasificado como nuevo. */
  async traerTodoLoNuevo(): Promise<ResultadoDescarga> {
    const diff = this.diffSignal();
    if (!diff) throw new Error('Primero hay que comparar con la nube.');
    return this.traer({
      motivos: diff.motivos.nuevas.map(f => f.id),
      alumnos: diff.alumnos.nuevas.map(f => f.id),
      registros: diff.registros.nuevas.map(f => f.id),
    });
  }
}
