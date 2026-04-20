// ╔══════════════════════════════════════════════════════╗
// ║  datos-prueba.service.ts                             ║
// ║  Stenbrary — Generador de datos de prueba            ║
// ║                                                      ║
// ║  Infraestructura de testing manual: permite poblar    ║
// ║  la base con alumnos + registros realistas para       ║
// ║  validar vistas y performance con volumen.            ║
// ║                                                      ║
// ║  CONVENCIONES (para poder limpiar sin tocar datos     ║
// ║  reales):                                             ║
// ║  - Matrícula en rango PRUEBA_MATRICULA_BASE (9000001+) ║
// ║  - Registros marcados con dispositivo = 'SEED-TEST'   ║
// ║                                                      ║
// ║  Llama a DatabaseService.crearAlumno() / crearRegistro║
// ║  directamente (mismo código de producción), para que  ║
// ║  cualquier bug de índices/validación/refresh salga a  ║
// ║  la luz con volumen real.                             ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Alumno, Registro, Motivo } from '../models';
import { CARRERAS, GRADOS, GRUPOS, TURNOS } from '../constants/catalogos.constants';

export const PRUEBA_MATRICULA_BASE = 9000001;
export const PRUEBA_DISPOSITIVO = 'SEED-TEST';

export interface DatosPruebaConfig {
  cantidadAlumnos: number;      // e.g. 100
  ventanaDias: number;          // e.g. 30
  densidadMedia: number;        // registros promedio por alumno (Poisson λ)
}

export interface DatosPruebaProgreso {
  fase: 'alumnos' | 'registros' | 'listo';
  actual: number;
  total: number;
}

export interface ConteoDatosPrueba {
  alumnos: number;
  registros: number;
}

const NOMBRES = [
  'Alejandro', 'María', 'José', 'Ana', 'Luis', 'Carmen', 'Juan', 'Sofía',
  'Carlos', 'Laura', 'Miguel', 'Daniela', 'Fernando', 'Valeria', 'Diego',
  'Camila', 'Jorge', 'Regina', 'Andrés', 'Fernanda', 'Ricardo', 'Paulina',
  'Javier', 'Alejandra', 'Eduardo', 'Mónica', 'Rodrigo', 'Isabella',
  'Mauricio', 'Ximena', 'Pablo', 'Gabriela', 'Héctor', 'Lucía',
];

const APELLIDOS = [
  'García', 'Hernández', 'López', 'Martínez', 'González', 'Rodríguez',
  'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez',
  'Díaz', 'Reyes', 'Cruz', 'Morales', 'Ortiz', 'Gutiérrez', 'Chávez',
  'Ruiz', 'Álvarez', 'Mendoza', 'Vázquez', 'Jiménez', 'Moreno', 'Muñoz',
  'Aguilar', 'Castillo', 'Romero', 'Silva', 'Castro', 'Navarro', 'Vega',
];

@Injectable({ providedIn: 'root' })
export class DatosPruebaService {
  constructor(private db: DatabaseService) {}

  /**
   * Cuenta alumnos y registros marcados como de prueba.
   * Útil para mostrar estado actual en la UI.
   */
  async contarDatosPrueba(): Promise<ConteoDatosPrueba> {
    const [alumnos, registros] = await Promise.all([
      this.db.obtenerTodosLosAlumnos(),
      this.db.obtenerTodosLosRegistros(),
    ]);

    const alumnosPrueba = alumnos.filter((a) => this.esMatriculaPrueba(a.matricula));
    const registrosPrueba = registros.filter(
      (r) => r.dispositivo === PRUEBA_DISPOSITIVO || this.esMatriculaPrueba(r.matricula),
    );

    return { alumnos: alumnosPrueba.length, registros: registrosPrueba.length };
  }

  /**
   * Genera alumnos y sus registros en una sola operación.
   * Reporta progreso vía callback opcional.
   */
  async generarDatos(
    config: DatosPruebaConfig,
    onProgress?: (p: DatosPruebaProgreso) => void,
  ): Promise<{ alumnosCreados: number; registrosCreados: number }> {
    this.validarConfig(config);

    const motivos = await this.db.obtenerMotivosActivos();
    if (motivos.length === 0) {
      throw new Error('No hay motivos activos. Crea al menos uno antes de generar datos.');
    }

    // ── FASE 1: Alumnos ──
    const alumnosCreados: Alumno[] = [];
    for (let i = 0; i < config.cantidadAlumnos; i++) {
      const matricula = String(PRUEBA_MATRICULA_BASE + i);
      const existente = await this.db.obtenerAlumnoPorMatricula(matricula);
      if (existente) {
        alumnosCreados.push(existente);
      } else {
        const alumno = await this.db.crearAlumno(this.construirAlumno(matricula));
        alumnosCreados.push(alumno);
      }
      onProgress?.({ fase: 'alumnos', actual: i + 1, total: config.cantidadAlumnos });
    }

    // ── FASE 2: Registros ──
    const planRegistros = this.planificarRegistros(alumnosCreados, config, motivos);
    let registrosCreados = 0;
    for (const plan of planRegistros) {
      await this.crearRegistroPlanificado(plan);
      registrosCreados++;
      onProgress?.({ fase: 'registros', actual: registrosCreados, total: planRegistros.length });
    }

    onProgress?.({ fase: 'listo', actual: registrosCreados, total: planRegistros.length });

    return { alumnosCreados: alumnosCreados.length, registrosCreados };
  }

  /**
   * Elimina TODOS los datos de prueba:
   * - Registros con dispositivo = SEED-TEST o matrícula en el rango.
   * - Alumnos con matrícula en el rango de prueba.
   * No toca motivos, configuración, ni datos reales.
   */
  async limpiarDatosPrueba(
    onProgress?: (p: DatosPruebaProgreso) => void,
  ): Promise<ConteoDatosPrueba> {
    const [alumnos, registros] = await Promise.all([
      this.db.obtenerTodosLosAlumnos(),
      this.db.obtenerTodosLosRegistros(),
    ]);

    const registrosPrueba = registros.filter(
      (r) => r.dispositivo === PRUEBA_DISPOSITIVO || this.esMatriculaPrueba(r.matricula),
    );
    const alumnosPrueba = alumnos.filter((a) => this.esMatriculaPrueba(a.matricula));

    // Primero registros (FK-lite hacia alumno)
    for (let i = 0; i < registrosPrueba.length; i++) {
      await this.db.eliminarRegistro(registrosPrueba[i].id);
      onProgress?.({ fase: 'registros', actual: i + 1, total: registrosPrueba.length });
    }

    for (let i = 0; i < alumnosPrueba.length; i++) {
      const id = alumnosPrueba[i].id;
      if (id) await this.db.eliminarAlumno(id);
      onProgress?.({ fase: 'alumnos', actual: i + 1, total: alumnosPrueba.length });
    }

    onProgress?.({ fase: 'listo', actual: 0, total: 0 });

    return { alumnos: alumnosPrueba.length, registros: registrosPrueba.length };
  }

  // ═══════════════════════════════════════════════
  // HELPERS INTERNOS
  // ═══════════════════════════════════════════════

  private esMatriculaPrueba(matricula: string): boolean {
    const n = Number(matricula);
    return Number.isFinite(n) && n >= PRUEBA_MATRICULA_BASE && n < PRUEBA_MATRICULA_BASE + 100_000;
  }

  private validarConfig(c: DatosPruebaConfig): void {
    if (c.cantidadAlumnos < 1 || c.cantidadAlumnos > 1000) {
      throw new Error('cantidadAlumnos debe estar entre 1 y 1000');
    }
    if (c.ventanaDias < 1 || c.ventanaDias > 365) {
      throw new Error('ventanaDias debe estar entre 1 y 365');
    }
    if (c.densidadMedia < 0.1 || c.densidadMedia > 50) {
      throw new Error('densidadMedia debe estar entre 0.1 y 50');
    }
  }

  private construirAlumno(matricula: string): Omit<Alumno, 'id' | 'fechaRegistro'> {
    return {
      matricula,
      nombre: this.pick(NOMBRES),
      apellidoPaterno: this.pick(APELLIDOS),
      apellidoMaterno: this.pick(APELLIDOS),
      carrera: this.pick(CARRERAS),
      grado: this.pick(GRADOS),
      grupo: this.pick(GRUPOS),
      turno: this.pick(TURNOS as readonly string[]) as 'Matutino' | 'Vespertino' | 'Mixto',
      activo: true,
      datosExtra: {},
    };
  }

  private planificarRegistros(
    alumnos: Alumno[],
    config: DatosPruebaConfig,
    motivos: Motivo[],
  ): PlanRegistro[] {
    const plan: PlanRegistro[] = [];
    const ahora = Date.now();
    const ventanaMs = config.ventanaDias * 24 * 60 * 60 * 1000;

    for (const alumno of alumnos) {
      const cantidad = Math.max(0, this.poisson(config.densidadMedia));
      for (let i = 0; i < cantidad; i++) {
        // Fecha aleatoria en la ventana, entre 7:00 y 20:00
        const fechaBase = new Date(ahora - Math.random() * ventanaMs);
        fechaBase.setHours(7 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60), 0, 0);

        // Distribución de estado: 60% cerrado (sesión normal),
        // 25% abierto (sin salida registrada), 15% estancia larga (3–7h)
        const dado = Math.random();
        let horaSalida: Date | undefined;

        if (dado < 0.60) {
          const duracionMin = 15 + Math.floor(Math.random() * 120);
          horaSalida = new Date(fechaBase.getTime() + duracionMin * 60 * 1000);
        } else if (dado < 0.85) {
          horaSalida = undefined;
        } else {
          const duracionMin = 180 + Math.floor(Math.random() * 240);
          horaSalida = new Date(fechaBase.getTime() + duracionMin * 60 * 1000);
        }

        // Motivos: 70% 1 motivo, 25% 2 motivos, 5% 3 motivos
        const cantMotivos = Math.random() < 0.70 ? 1 : Math.random() < 0.83 ? 2 : 3;
        const motivosSel = this.sample(motivos, cantMotivos);

        plan.push({
          alumno,
          fechaBase,
          horaSalida,
          motivos: motivosSel,
        });
      }
    }

    // Si un alumno no salió, al menos le damos un registro de "hoy" para que no quede vacío
    const alumnosConRegistro = new Set(plan.map((p) => p.alumno.id));
    for (const alumno of alumnos) {
      if (!alumnosConRegistro.has(alumno.id)) {
        const fecha = new Date();
        fecha.setHours(7 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60), 0, 0);
        plan.push({
          alumno,
          fechaBase: fecha,
          horaSalida: undefined,
          motivos: [motivos[0]],
        });
      }
    }

    return plan;
  }

  private async crearRegistroPlanificado(plan: PlanRegistro): Promise<void> {
    // 1) Crear registro (fechaHora = now por limitación de crearRegistro)
    const motivoPrincipal = plan.motivos[0];
    const motivoIds = plan.motivos.map((m) => m.id!);
    const motivoNombres = plan.motivos.map((m) => m.nombre);

    const reg = await this.db.crearRegistro({
      alumnoId: plan.alumno.id!,
      matricula: plan.alumno.matricula,
      nombreCompleto: this.nombreCompleto(plan.alumno),
      carrera: plan.alumno.carrera,
      motivoId: motivoPrincipal.id!,
      motivoNombre: motivoPrincipal.nombre,
      ...(motivoIds.length > 1 ? { motivoIds, motivoNombres } : {}),
      dispositivo: PRUEBA_DISPOSITIVO,
    });

    // 2) Ajustar fecha real + salida vía actualizarRegistroManual
    const cambios: { fechaHora?: Date; horaSalida?: Date | null } = { fechaHora: plan.fechaBase };
    if (plan.horaSalida) {
      cambios.horaSalida = plan.horaSalida;
    }
    await this.db.actualizarRegistroManual(reg.id, cambios);
  }

  private nombreCompleto(a: Alumno): string {
    return `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`.trim();
  }

  // ── Utilidades estadísticas ──

  private pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private sample<T>(arr: readonly T[], n: number): T[] {
    const copia = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && copia.length > 0; i++) {
      const idx = Math.floor(Math.random() * copia.length);
      out.push(copia.splice(idx, 1)[0]);
    }
    return out;
  }

  /**
   * Poisson con método de Knuth. Suficiente para λ pequeño (<30).
   * Produce distribución natural: la mayoría cerca de la media,
   * pocos valores muy altos (heavy users), pocos en 0.
   */
  private poisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }
}

interface PlanRegistro {
  alumno: Alumno;
  fechaBase: Date;
  horaSalida: Date | undefined;
  motivos: Motivo[];
}
