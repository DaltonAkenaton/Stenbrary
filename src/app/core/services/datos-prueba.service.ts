// ╔══════════════════════════════════════════════════════╗
// ║  datos-prueba.service.ts                             ║
// ║  Stenbrary — Generador de datos de prueba            ║
// ║                                                      ║
// ║  Infraestructura de testing manual: permite poblar    ║
// ║  la base con alumnos + registros realistas para       ║
// ║  validar vistas y performance con volumen.            ║
// ║                                                      ║
// ║  MODELO REALISTA (UAT — calendario 2026):             ║
// ║  - 3 períodos lectivos: primavera, verano, otoño.     ║
// ║  - Verano: solo 15% de alumnos activos (cursos).      ║
// ║  - Festivos oficiales y Semana Santa excluidos.       ║
// ║  - Domingo cerrado · sábado 30% operación.            ║
// ║  - Horario 7:00–22:00.                                ║
// ║  - Turnos ponderados 66/22/12 (mat/vesp/mixto).       ║
// ║                                                      ║
// ║  CONVENCIONES (para poder limpiar sin tocar datos     ║
// ║  reales):                                             ║
// ║  - Matrícula en rango PRUEBA_MATRICULA_BASE (9000001+) ║
// ║  - Registros marcados con dispositivo = 'SEED-TEST'   ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Alumno, Motivo } from '../models';
import { CARRERAS, GRADOS, GRUPOS } from '../constants/catalogos.constants';
import { esMatriculaPrueba, PRUEBA_DISPOSITIVO, PRUEBA_MATRICULA_BASE } from '../utils/datos-prueba.utils';

// Las marcas viven en utils para que estadísticas pueda reconocerlas sin
// depender de este servicio. Se re-exportan por compatibilidad.
export { PRUEBA_MATRICULA_BASE, PRUEBA_DISPOSITIVO } from '../utils/datos-prueba.utils';

export interface DatosPruebaConfig {
  cantidadAlumnos: number;              // e.g. 2500
  ventanaDias: number;                  // e.g. 900 (30 meses)
  registrosPorAlumnoPorMes: number;     // λ Poisson sobre meses lectivos
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

// ═══════════════════════════════════════════════
// CALENDARIO UAT (constantes — futura config per-universidad)
// ═══════════════════════════════════════════════

interface PeriodoLectivo {
  nombre: 'primavera' | 'verano' | 'otono';
  inicioMMDD: string;
  finMMDD: string;
  densidadFactor: number;
}

const PERIODOS_LECTIVOS_UAT: PeriodoLectivo[] = [
  { nombre: 'primavera', inicioMMDD: '01-12', finMMDD: '05-15', densidadFactor: 1.0 },
  { nombre: 'verano',    inicioMMDD: '06-01', finMMDD: '07-15', densidadFactor: 1.0 },
  { nombre: 'otono',     inicioMMDD: '08-17', finMMDD: '12-07', densidadFactor: 1.0 },
];

// Festivos oficiales MX + UAT (MM-DD)
const FESTIVOS_UAT_MMDD = [
  '01-01', // Año nuevo
  '02-05', // Día de la Constitución
  '03-16', // Natalicio de Juárez
  '05-01', // Día del Trabajo
  '05-05', // Batalla de Puebla
  '09-16', // Independencia
  '11-02', // Día de Muertos
  '11-16', // Revolución
  '12-12', // Virgen de Guadalupe
  '12-25', // Navidad
];

// Aproximación de Semana Santa (varía cada año, suficiente para datos de prueba)
const SEMANA_SANTA_INICIO_MMDD = '03-25';
const SEMANA_SANTA_FIN_MMDD = '04-05';

const HORA_APERTURA = 7;
const HORA_CIERRE = 22;

// Probabilidad de que un alumno esté activo durante el período de verano.
// Refleja "solo 200–400 de 2554 se inscriben a cursos de verano".
const PROB_ACTIVO_EN_VERANO = 0.15;

// Distribución realista de turnos (2/3 matutino típico UAT).
const TURNOS_PONDERADOS: { turno: 'Matutino' | 'Vespertino' | 'Mixto'; peso: number }[] = [
  { turno: 'Matutino',   peso: 0.66 },
  { turno: 'Vespertino', peso: 0.22 },
  { turno: 'Mixto',      peso: 0.12 },
];

// Caps técnicos del generador (flexibilidad — el coordinador manda).
const MAX_ALUMNOS = 3000;
const MAX_VENTANA_DIAS = 1095; // ~3 años
const MAX_LAMBDA_MENSUAL = 50;

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
   * Estima cuántos registros se generarán para una config dada.
   * Útil para mostrar al usuario ANTES de ejecutar (time estimate).
   */
  estimarRegistros(config: DatosPruebaConfig): number {
    const calendario = this.construirCalendario(config.ventanaDias);
    const diasLectivos = calendario.filter((d) => !d.esVerano).length;
    const diasVerano = calendario.filter((d) => d.esVerano).length;

    const lambdaNormal = config.registrosPorAlumnoPorMes * (diasLectivos / 30);
    const lambdaVerano = config.registrosPorAlumnoPorMes * (diasVerano / 30);

    const promedioPorAlumno =
      lambdaNormal + PROB_ACTIVO_EN_VERANO * lambdaVerano;
    return Math.round(config.cantidadAlumnos * promedioPorAlumno);
  }

  /**
   * Genera alumnos y sus registros en una sola operación.
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
   * Elimina TODOS los datos de prueba (matrícula en rango o dispositivo SEED-TEST).
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
  // CALENDARIO: construcción y evaluación de días
  // ═══════════════════════════════════════════════

  /**
   * Expone el calendario computado (útil para UI / debugging).
   */
  construirCalendario(ventanaDias: number): DiaLectivo[] {
    const dias: DiaLectivo[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 0; i < ventanaDias; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const evaluacion = this.evaluarDia(fecha);
      if (evaluacion.lectivo) {
        dias.push({
          fecha,
          factor: evaluacion.factor,
          esVerano: evaluacion.esVerano,
        });
      }
    }
    return dias;
  }

  private evaluarDia(fecha: Date): {
    lectivo: boolean;
    factor: number;
    esVerano: boolean;
  } {
    const mmdd = this.toMMDD(fecha);
    const diaSemana = fecha.getDay();

    // Domingos cerrado.
    if (diaSemana === 0) return { lectivo: false, factor: 0, esVerano: false };

    // Festivos oficiales.
    if (FESTIVOS_UAT_MMDD.includes(mmdd)) {
      return { lectivo: false, factor: 0, esVerano: false };
    }

    // Semana Santa (aprox).
    if (mmdd >= SEMANA_SANTA_INICIO_MMDD && mmdd <= SEMANA_SANTA_FIN_MMDD) {
      return { lectivo: false, factor: 0, esVerano: false };
    }

    // Períodos lectivos.
    for (const p of PERIODOS_LECTIVOS_UAT) {
      if (mmdd >= p.inicioMMDD && mmdd <= p.finMMDD) {
        const esVerano = p.nombre === 'verano';
        let factor = p.densidadFactor;
        // Sábado: 30% de operación normal.
        if (diaSemana === 6) factor *= 0.3;
        return { lectivo: true, factor, esVerano };
      }
    }

    // Fuera de todo período (recesos inter-semestre).
    return { lectivo: false, factor: 0, esVerano: false };
  }

  private toMMDD(fecha: Date): string {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  }

  // ═══════════════════════════════════════════════
  // HELPERS INTERNOS
  // ═══════════════════════════════════════════════

  private esMatriculaPrueba(matricula: string): boolean {
    return esMatriculaPrueba(matricula);
  }

  private validarConfig(c: DatosPruebaConfig): void {
    if (c.cantidadAlumnos < 1 || c.cantidadAlumnos > MAX_ALUMNOS) {
      throw new Error(`cantidadAlumnos debe estar entre 1 y ${MAX_ALUMNOS}`);
    }
    if (c.ventanaDias < 1 || c.ventanaDias > MAX_VENTANA_DIAS) {
      throw new Error(`ventanaDias debe estar entre 1 y ${MAX_VENTANA_DIAS}`);
    }
    if (c.registrosPorAlumnoPorMes < 0.1 || c.registrosPorAlumnoPorMes > MAX_LAMBDA_MENSUAL) {
      throw new Error(`registrosPorAlumnoPorMes debe estar entre 0.1 y ${MAX_LAMBDA_MENSUAL}`);
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
      turno: this.pickTurnoPonderado(),
      activo: true,
      datosExtra: {},
    };
  }

  private pickTurnoPonderado(): 'Matutino' | 'Vespertino' | 'Mixto' {
    const r = Math.random();
    let acumulado = 0;
    for (const t of TURNOS_PONDERADOS) {
      acumulado += t.peso;
      if (r < acumulado) return t.turno;
    }
    return 'Matutino';
  }

  private planificarRegistros(
    alumnos: Alumno[],
    config: DatosPruebaConfig,
    motivos: Motivo[],
  ): PlanRegistro[] {
    const plan: PlanRegistro[] = [];
    const calendario = this.construirCalendario(config.ventanaDias);
    if (calendario.length === 0) return plan;

    // Días lectivos NO-verano (la mayoría de alumnos solo usa estos)
    const diasNormales = calendario.filter((d) => !d.esVerano);
    const pesoTotalNormal = diasNormales.reduce((s, d) => s + d.factor, 0);
    const pesoTotalCompleto = calendario.reduce((s, d) => s + d.factor, 0);

    // λ Poisson para cada alumno: registros/mes × (meses lectivos equivalentes)
    // Usa días-factor como proxy de "meses lectivos ponderados".
    const lambdaNormal = config.registrosPorAlumnoPorMes * (pesoTotalNormal / 30);
    const lambdaCompleto = config.registrosPorAlumnoPorMes * (pesoTotalCompleto / 30);

    for (const alumno of alumnos) {
      const activoEnVerano = Math.random() < PROB_ACTIVO_EN_VERANO;
      const lambda = activoEnVerano ? lambdaCompleto : lambdaNormal;
      const pool = activoEnVerano ? calendario : diasNormales;
      if (pool.length === 0) continue;

      const cantidad = Math.max(0, this.poisson(lambda));
      for (let i = 0; i < cantidad; i++) {
        const fechaBase = this.pickFechaPonderada(pool);
        const { horaSalida, tipoEstado } = this.generarDuracion(fechaBase);
        const motivosSel = this.seleccionarMotivos(motivos);

        plan.push({
          alumno,
          fechaBase,
          horaSalida,
          motivos: motivosSel,
        });

        // Evita "warning" lint por var no usada
        void tipoEstado;
      }
    }

    // Garantiza que ningún alumno quede vacío (un registro HOY abierto).
    const alumnosConRegistro = new Set(plan.map((p) => p.alumno.id));
    for (const alumno of alumnos) {
      if (!alumnosConRegistro.has(alumno.id)) {
        const fecha = new Date();
        fecha.setHours(
          HORA_APERTURA + Math.floor(Math.random() * (HORA_CIERRE - HORA_APERTURA)),
          Math.floor(Math.random() * 60),
          0,
          0,
        );
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

  private pickFechaPonderada(pool: DiaLectivo[]): Date {
    const pesoTotal = pool.reduce((s, d) => s + d.factor, 0);
    let r = Math.random() * pesoTotal;
    let elegido = pool[0];
    for (const d of pool) {
      r -= d.factor;
      if (r <= 0) {
        elegido = d;
        break;
      }
    }
    const fecha = new Date(elegido.fecha);
    const hora = HORA_APERTURA + Math.floor(Math.random() * (HORA_CIERRE - HORA_APERTURA));
    const min = Math.floor(Math.random() * 60);
    fecha.setHours(hora, min, 0, 0);
    return fecha;
  }

  private generarDuracion(fechaBase: Date): {
    horaSalida: Date | undefined;
    tipoEstado: 'corta' | 'abierta' | 'larga';
  } {
    const dado = Math.random();
    if (dado < 0.60) {
      const duracionMin = 15 + Math.floor(Math.random() * 120);
      const horaSalida = this.acotarAHorario(
        new Date(fechaBase.getTime() + duracionMin * 60 * 1000),
      );
      return { horaSalida, tipoEstado: 'corta' };
    }
    if (dado < 0.85) {
      return { horaSalida: undefined, tipoEstado: 'abierta' };
    }
    const duracionMin = 180 + Math.floor(Math.random() * 240);
    const horaSalida = this.acotarAHorario(
      new Date(fechaBase.getTime() + duracionMin * 60 * 1000),
    );
    return { horaSalida, tipoEstado: 'larga' };
  }

  /**
   * No permite que horaSalida cruce la hora de cierre.
   */
  private acotarAHorario(fecha: Date): Date {
    const cierre = new Date(fecha);
    cierre.setHours(HORA_CIERRE, 0, 0, 0);
    return fecha > cierre ? cierre : fecha;
  }

  private seleccionarMotivos(motivos: Motivo[]): Motivo[] {
    const cantMotivos = Math.random() < 0.70 ? 1 : Math.random() < 0.83 ? 2 : 3;
    return this.sample(motivos, cantMotivos);
  }

  private async crearRegistroPlanificado(plan: PlanRegistro): Promise<void> {
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
      ...(plan.alumno.turno ? { turno: plan.alumno.turno } : {}),
      dispositivo: PRUEBA_DISPOSITIVO,
    });

    const cambios: { fechaHora?: Date; horaSalida?: Date | null } = {
      fechaHora: plan.fechaBase,
    };
    if (plan.horaSalida) {
      cambios.horaSalida = plan.horaSalida;
    }
    await this.db.actualizarRegistroManual(reg.id, cambios);
  }

  private nombreCompleto(a: Alumno): string {
    return `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`.trim();
  }

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
   * Poisson con método de Knuth. Suficiente para λ pequeño–medio.
   * Para λ muy alto (>30) tiende a ser lento; usa aproximación normal.
   */
  private poisson(lambda: number): number {
    if (lambda > 30) {
      // Aproximación normal: Z ~ N(0,1), X = λ + √λ · Z
      const z = this.normal();
      return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
    }
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  private normal(): number {
    // Box-Muller
    const u1 = Math.random() || 1e-12;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

interface PlanRegistro {
  alumno: Alumno;
  fechaBase: Date;
  horaSalida: Date | undefined;
  motivos: Motivo[];
}

export interface DiaLectivo {
  fecha: Date;    // 00:00 del día
  factor: number; // densidad relativa (1.0 = normal, <1.0 sábado, etc.)
  esVerano: boolean;
}
