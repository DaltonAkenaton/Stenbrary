// ╔══════════════════════════════════════════════════════╗
// ║  database.service.ts                                 ║
// ║  Stenbrary v3.6.2 — IndexedDB optimizado             ║
// ║                                                      ║
// ║  FIX v3.6.2:                                         ║
// ║  - obtenerRegistrosDeHoy() usa índice by-fecha       ║
// ║  - obtenerRegistrosPorFecha() usa índice by-fecha    ║
// ║  - obtenerRegistrosPorAlumno() usa índice by-matricula║
// ║  - Antes: getAll() + filter en memoria (O(n))        ║
// ║  - Ahora: getAllFromIndex() con IDBKeyRange (O(k))   ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { Alumno, Registro, Motivo } from '../models';

// Definir esquema de la base de datos
interface StenbraryDB extends DBSchema {
  alumnos: {
    key: string;
    value: Alumno;
    indexes: {
      'by-matricula': string;
      'by-carrera': string;
    };
  };
  registros: {
    key: string;
    value: Registro;
    indexes: {
      'by-fecha': Date;
      'by-alumno': string;
      'by-matricula': string;
    };
  };
  motivos: {
    key: string;
    value: Motivo;
    indexes: {
      'by-orden': number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: IDBPDatabase<StenbraryDB> | null = null;
  private readonly DB_NAME = 'stenbrary-db';
  private readonly DB_VERSION = 1;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.inicializar();
  }

  // ==================== INICIALIZACIÓN ====================

  async inicializar(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.db) {
      return Promise.resolve();
    }

    this.initializationPromise = this.initDatabase();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async initDatabase(): Promise<void> {
    try {
      this.db = await openDB<StenbraryDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Store de alumnos
          if (!db.objectStoreNames.contains('alumnos')) {
            const alumnosStore = db.createObjectStore('alumnos', {
              keyPath: 'id'
            });
            alumnosStore.createIndex('by-matricula', 'matricula', { unique: true });
            alumnosStore.createIndex('by-carrera', 'carrera');
          }

          // Store de registros
          if (!db.objectStoreNames.contains('registros')) {
            const registrosStore = db.createObjectStore('registros', {
              keyPath: 'id'
            });
            registrosStore.createIndex('by-fecha', 'fechaHora');
            registrosStore.createIndex('by-alumno', 'alumnoId');
            registrosStore.createIndex('by-matricula', 'matricula');
          }

          // Store de motivos
          if (!db.objectStoreNames.contains('motivos')) {
            const motivosStore = db.createObjectStore('motivos', {
              keyPath: 'id'
            });
            motivosStore.createIndex('by-orden', 'orden');
          }
        },
      });

      console.log('✅ Base de datos inicializada correctamente');

      // Crear motivos por defecto si no existen
      await this.crearMotivosDefault();
    } catch (error) {
      console.error('❌ Error al inicializar base de datos:', error);
      throw error;
    }
  }

  private async crearMotivosDefault(): Promise<void> {
    if (!this.db) return;

    const motivos = await this.db.getAll('motivos');

    if (motivos.length === 0) {
      const motivosDefault: Motivo[] = [
        {
          id: uuidv4(),
          nombre: 'Estudiar',
          icono: 'menu_book',
          orden: 1,
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: uuidv4(),
          nombre: 'Pedir libro',
          icono: 'book',
          orden: 2,
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: uuidv4(),
          nombre: 'Trabajo escolar',
          icono: 'assignment',
          orden: 3,
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: uuidv4(),
          nombre: 'Investigación',
          icono: 'search',
          orden: 4,
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: uuidv4(),
          nombre: 'Otro',
          icono: 'more_horiz',
          orden: 5,
          activo: true,
          fechaCreacion: new Date()
        }
      ];

      for (const motivo of motivosDefault) {
        await this.db.add('motivos', motivo);
      }

      console.log('✅ Motivos por defecto creados');
    }
  }

  // ==================== ALUMNOS ====================

  async crearAlumno(alumno: Omit<Alumno, 'id' | 'fechaRegistro'>): Promise<Alumno> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const nuevoAlumno: Alumno = {
      ...alumno,
      id: uuidv4(),
      activo: true,
      fechaRegistro: new Date()
    };

    await this.db.add('alumnos', nuevoAlumno);
    console.log('✅ Alumno creado:', nuevoAlumno.matricula);
    return nuevoAlumno;
  }

  async obtenerAlumnoPorId(id: string): Promise<Alumno | undefined> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    return await this.db.get('alumnos', id);
  }

  async obtenerTodosLosAlumnos(): Promise<Alumno[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    return await this.db.getAll('alumnos');
  }

  async eliminarAlumno(id: string): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    await this.db.delete('alumnos', id);
    console.log('✅ Alumno eliminado:', id);
  }

  // ==================== REGISTROS ====================

  async crearRegistro(registro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'>): Promise<Registro> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const nuevoRegistro: Registro = {
      ...registro,
      id: uuidv4(),
      fechaHora: new Date(),
      sincronizado: false
    };

    await this.db.add('registros', nuevoRegistro);
    console.log('✅ Registro creado para:', nuevoRegistro.matricula);
    return nuevoRegistro;
  }

  /**
   * Obtener registros de hoy.
   *
   * NOTA SOBRE ÍNDICES: Usamos getAll + filter porque IndexedDB almacena
   * las fechas como objetos Date serializados. Para que IDBKeyRange funcione
   * correctamente con fechas, se necesitaría que TODOS los registros existentes
   * tengan fechaHora como Date nativo (no como string ISO).
   *
   * Si tu base de datos tiene registros antiguos con fechas como string,
   * el IDBKeyRange no los encontrará. Por seguridad, mantenemos getAll + filter
   * que funciona con ambos formatos, y agregamos la versión optimizada como
   * método alternativo para bases de datos limpias.
   */
  async obtenerRegistrosDeHoy(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Intentar usar índice primero (más rápido con datos limpios)
    try {
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      const rango = IDBKeyRange.bound(hoy, manana, false, true);
      const registrosIndexados = await this.db.getAllFromIndex('registros', 'by-fecha', rango);

      // Si encontramos resultados con índice, usarlos
      if (registrosIndexados.length > 0) {
        return registrosIndexados;
      }
    } catch {
      // Si falla el índice, continuar con fallback
    }

    // Fallback: getAll + filter (funciona con fechas string e Date)
    const todosLosRegistros = await this.db.getAll('registros');

    return todosLosRegistros.filter(registro => {
      const fechaRegistro = new Date(registro.fechaHora);
      fechaRegistro.setHours(0, 0, 0, 0);
      return fechaRegistro.getTime() === hoy.getTime();
    });
  }

  async obtenerTodosLosRegistros(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const registros = await this.db.getAll('registros');
    return registros.sort((a, b) =>
      new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
  }

  async obtenerRegistrosPorFecha(fecha: Date): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    // Intentar usar índice primero
    try {
      const rango = IDBKeyRange.bound(inicio, fin);
      const registrosIndexados = await this.db.getAllFromIndex('registros', 'by-fecha', rango);
      if (registrosIndexados.length > 0) {
        return registrosIndexados;
      }
    } catch {
      // Fallback si el índice falla
    }

    // Fallback: getAll + filter
    const todosLosRegistros = await this.db.getAll('registros');

    return todosLosRegistros.filter(registro => {
      const fechaRegistro = new Date(registro.fechaHora);
      return fechaRegistro >= inicio && fechaRegistro <= fin;
    });
  }

  // ==================== MOTIVOS ====================

  async obtenerMotivosActivos(): Promise<Motivo[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const motivos = await this.db.getAll('motivos');
    return motivos
      .filter(m => m.activo)
      .sort((a, b) => a.orden - b.orden);
  }

  async obtenerMotivoPorId(id: string): Promise<Motivo | undefined> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    return await this.db.get('motivos', id);
  }

  // ==================== ESTADÍSTICAS ====================

  async obtenerEstadisticasHoy(): Promise<{
    totalRegistros: number;
    porCarrera: Map<string, number>;
    porMotivo: Map<string, number>;
  }> {
    const registrosHoy = await this.obtenerRegistrosDeHoy();

    const porCarrera = new Map<string, number>();
    const porMotivo = new Map<string, number>();

    registrosHoy.forEach(registro => {
      const countCarrera = porCarrera.get(registro.carrera) || 0;
      porCarrera.set(registro.carrera, countCarrera + 1);

      const countMotivo = porMotivo.get(registro.motivoNombre) || 0;
      porMotivo.set(registro.motivoNombre, countMotivo + 1);
    });

    return {
      totalRegistros: registrosHoy.length,
      porCarrera,
      porMotivo
    };
  }

  // ==================== UTILIDADES ====================

  async limpiarTodosDatos(): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    await this.db.clear('alumnos');
    await this.db.clear('registros');
    await this.db.clear('motivos');

    // Recrear motivos por defecto
    await this.crearMotivosDefault();

    console.log('✅ Todos los datos han sido limpiados');
  }

  async obtenerConteoTotal(): Promise<{
    alumnos: number;
    registros: number;
    motivos: number;
  }> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const [alumnos, registros, motivos] = await Promise.all([
      this.db.count('alumnos'),
      this.db.count('registros'),
      this.db.count('motivos')
    ]);

    return { alumnos, registros, motivos };
  }

  // ==================== GESTIÓN DE ALUMNOS ====================

  /**
   * Obtener registros de un alumno específico por matrícula.
   * Usa el índice by-matricula para búsqueda eficiente.
   */
  async obtenerRegistrosPorAlumno(matricula: string): Promise<Registro[]> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      // Usar índice by-matricula (más eficiente que getAll + filter)
      let registrosDelAlumno: Registro[];

      try {
        registrosDelAlumno = await this.db.getAllFromIndex('registros', 'by-matricula', matricula);
      } catch {
        // Fallback si el índice falla
        const todosRegistros = await this.db.getAll('registros');
        registrosDelAlumno = todosRegistros.filter(r => r.matricula === matricula);
      }

      // Ordenar por fecha descendente
      registrosDelAlumno.sort((a, b) =>
        new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
      );

      console.log(`📋 Registros del alumno ${matricula}:`, registrosDelAlumno.length);
      return registrosDelAlumno;
    } catch (error) {
      console.error('❌ Error al obtener registros del alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener un alumno por su matrícula.
   * Usa el índice by-matricula.
   */
  async obtenerAlumnoPorMatricula(matricula: string): Promise<Alumno | null> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const alumno = await this.db.getFromIndex('alumnos', 'by-matricula', matricula);

      if (alumno) {
        console.log('✅ Alumno encontrado:', alumno.matricula);
        return alumno;
      }

      console.log('⚠️ Alumno no encontrado con matrícula:', matricula);
      return null;
    } catch (error) {
      console.error('❌ Error al obtener alumno por matrícula:', error);
      throw error;
    }
  }

  /**
   * Actualizar información de un alumno
   */
  async actualizarAlumno(id: string, alumnoActualizado: Alumno): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      alumnoActualizado.id = id;

      await this.db.put('alumnos', alumnoActualizado);

      console.log('✅ Alumno actualizado exitosamente:', alumnoActualizado.matricula);
    } catch (error) {
      console.error('❌ Error al actualizar alumno:', error);
      throw new Error('No se pudo actualizar el alumno');
    }
  }

  /**
   * Desactivar un alumno (soft delete)
   */
  async desactivarAlumno(id: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const alumno = await this.db.get('alumnos', id);

      if (!alumno) {
        throw new Error('Alumno no encontrado');
      }

      alumno.activo = false;
      await this.db.put('alumnos', alumno);

      console.log('✅ Alumno desactivado:', alumno.matricula);
    } catch (error) {
      console.error('❌ Error al desactivar alumno:', error);
      throw error;
    }
  }

  /**
   * Reactivar un alumno
   */
  async reactivarAlumno(id: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const alumno = await this.db.get('alumnos', id);

      if (!alumno) {
        throw new Error('Alumno no encontrado');
      }

      alumno.activo = true;
      await this.db.put('alumnos', alumno);

      console.log('✅ Alumno reactivado:', alumno.matricula);
    } catch (error) {
      console.error('❌ Error al reactivar alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de un alumno
   */
  async obtenerEstadisticasAlumno(matricula: string): Promise<{
    totalVisitas: number;
    ultimaVisita: Date | null;
    primeraVisita: Date | null;
    motivoMasFrecuente: string;
    visitasPorMotivo: Map<string, number>;
  }> {
    try {
      const registros = await this.obtenerRegistrosPorAlumno(matricula);

      if (registros.length === 0) {
        return {
          totalVisitas: 0,
          ultimaVisita: null,
          primeraVisita: null,
          motivoMasFrecuente: 'N/A',
          visitasPorMotivo: new Map()
        };
      }

      const totalVisitas = registros.length;
      const ultimaVisita = new Date(registros[0].fechaHora);
      const primeraVisita = new Date(registros[registros.length - 1].fechaHora);

      const visitasPorMotivo = new Map<string, number>();
      registros.forEach((registro: Registro) => {
        if (registro.motivoNombre) {
          const count = visitasPorMotivo.get(registro.motivoNombre) || 0;
          visitasPorMotivo.set(registro.motivoNombre, count + 1);
        }
      });

      let motivoMasFrecuente = 'N/A';
      let maxCount = 0;
      visitasPorMotivo.forEach((count, motivo) => {
        if (count > maxCount) {
          maxCount = count;
          motivoMasFrecuente = motivo;
        }
      });

      return {
        totalVisitas,
        ultimaVisita,
        primeraVisita,
        motivoMasFrecuente,
        visitasPorMotivo
      };
    } catch (error) {
      console.error('❌ Error al obtener estadísticas del alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los motivos (activos e inactivos)
   */
  async obtenerTodosLosMotivos(): Promise<Motivo[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const motivos = await this.db.getAll('motivos');
    return motivos.sort((a: Motivo, b: Motivo) => a.orden - b.orden);
  }

  /**
   * Crear un nuevo motivo
   */
  async crearMotivo(motivo: Omit<Motivo, 'id'>): Promise<Motivo> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const nuevoMotivo: Motivo = {
      ...motivo,
      id: uuidv4(),
      fechaCreacion: new Date()
    };

    await this.db.add('motivos', nuevoMotivo);
    console.log('✅ Motivo creado:', nuevoMotivo.nombre);
    return nuevoMotivo;
  }

  /**
   * Actualizar un motivo existente
   */
  async actualizarMotivo(id: string, motivo: Motivo): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    motivo.id = id;

    await this.db.put('motivos', motivo);
    console.log('✅ Motivo actualizado:', motivo.nombre);
  }

  /**
   * Eliminar un motivo
   */
  async eliminarMotivo(id: string): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    await this.db.delete('motivos', id);
    console.log('✅ Motivo eliminado:', id);
  }


  // ╔══════════════════════════════════════════════════════════════════════╗
// ║  MÉTODOS NUEVOS PARA database.service.ts                           ║
// ║  Stenbrary v3.6.2 — Duplicados + Registro de salida               ║
// ║                                                                    ║
// ║  DÓNDE AGREGAR: En database.service.ts, dentro de la clase         ║
// ║  DatabaseService, después de obtenerAlumnoPorMatricula()           ║
// ║  (antes de actualizarAlumno)                                       ║
// ╚══════════════════════════════════════════════════════════════════════╝


  // ==================== DETECCIÓN DE DUPLICADOS ====================

  /**
   * Verifica si un alumno tiene un registro reciente (últimos N minutos)
   * que NO tenga hora de salida registrada (sesión abierta).
   *
   * @param matricula - Matrícula del alumno
   * @param minutosUmbral - Minutos hacia atrás para buscar (default: 30)
   * @returns El registro abierto más reciente, o null
   */
  async verificarRegistroReciente(
    matricula: string,
    minutosUmbral: number = 30
  ): Promise<Registro | null> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const ahora = new Date();
      const limite = new Date(ahora.getTime() - (minutosUmbral * 60 * 1000));

      // Obtener registros del alumno
      let registrosAlumno: Registro[];

      try {
        registrosAlumno = await this.db.getAllFromIndex('registros', 'by-matricula', matricula);
      } catch {
        const todosRegistros = await this.db.getAll('registros');
        registrosAlumno = todosRegistros.filter(r => r.matricula === matricula);
      }

      // Buscar el registro más reciente dentro del umbral
      let registroMasReciente: Registro | null = null;
      let fechaMasReciente = 0;

      for (const registro of registrosAlumno) {
        const fechaRegistro = new Date(registro.fechaHora);

        if (fechaRegistro >= limite) {
          const timestamp = fechaRegistro.getTime();
          if (timestamp > fechaMasReciente) {
            fechaMasReciente = timestamp;
            registroMasReciente = registro;
          }
        }
      }

      if (registroMasReciente) {
        const minutosTranscurridos = Math.round(
          (ahora.getTime() - fechaMasReciente) / (1000 * 60)
        );
        console.log(
          `⚠️ Registro reciente para ${matricula}: ` +
          `hace ${minutosTranscurridos} min — ${registroMasReciente.motivoNombre}` +
          (registroMasReciente.horaSalida ? ' (salida ya registrada)' : ' (sin salida)')
        );
      }

      return registroMasReciente;
    } catch (error) {
      console.error('❌ Error al verificar registro reciente:', error);
      // No bloquear el flujo — permitir el registro
      return null;
    }
  }

  /**
   * Elimina un registro por id. Usado por el "Deshacer" del scanner.
   */
  async eliminarRegistro(registroId: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      await this.db.delete('registros', registroId);
    } catch (error) {
      console.error('❌ Error al eliminar registro:', error);
      throw error;
    }
  }

  // ==================== EDICIÓN MANUAL ====================

  /**
   * Edita manualmente un registro existente (hora entrada, salida, motivos).
   * Recalcula duracionMinutos si ambas fechas están presentes. Limpia
   * cierreAutomatico al confirmarse manualmente.
   */
  async actualizarRegistroManual(
    registroId: string,
    cambios: {
      fechaHora?: Date;
      horaSalida?: Date | null;
      motivoIds?: string[];
      motivoNombres?: string[];
      motivoId?: string;
      motivoNombre?: string;
    }
  ): Promise<Registro> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const registro = await this.db.get('registros', registroId);
      if (!registro) throw new Error('Registro no encontrado');

      if (cambios.fechaHora) registro.fechaHora = new Date(cambios.fechaHora);

      if (cambios.horaSalida === null) {
        registro.horaSalida = undefined;
        registro.duracionMinutos = undefined;
      } else if (cambios.horaSalida) {
        registro.horaSalida = new Date(cambios.horaSalida);
      }

      if (registro.horaSalida) {
        const ms = new Date(registro.horaSalida).getTime() - new Date(registro.fechaHora).getTime();
        registro.duracionMinutos = Math.max(0, Math.round(ms / 60000));
        registro.cierreAutomatico = false;
      }

      if (cambios.motivoIds) registro.motivoIds = cambios.motivoIds;
      if (cambios.motivoNombres) registro.motivoNombres = cambios.motivoNombres;
      if (cambios.motivoId) registro.motivoId = cambios.motivoId;
      if (cambios.motivoNombre) registro.motivoNombre = cambios.motivoNombre;

      await this.db.put('registros', registro);
      return registro;
    } catch (error) {
      console.error('❌ Error al actualizar registro:', error);
      throw error;
    }
  }

  // ==================== REGISTRO DE SALIDA ====================

  /**
   * Registra la hora de salida en un registro existente.
   * Calcula automáticamente la duración en minutos.
   *
   * @param registroId - ID del registro a actualizar
   * @returns El registro actualizado con horaSalida y duracionMinutos
   */
  async registrarSalida(registroId: string): Promise<Registro> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const registro = await this.db.get('registros', registroId);

      if (!registro) {
        throw new Error('Registro no encontrado');
      }

      if (registro.horaSalida) {
        throw new Error('Este registro ya tiene hora de salida');
      }

      // Calcular hora de salida y duración
      const ahora = new Date();
      const entrada = new Date(registro.fechaHora);
      const duracionMs = ahora.getTime() - entrada.getTime();
      const duracionMinutos = Math.round(duracionMs / (1000 * 60));

      // Actualizar registro
      registro.horaSalida = ahora;
      registro.duracionMinutos = duracionMinutos;

      await this.db.put('registros', registro);

      console.log(
        `✅ Salida registrada para ${registro.matricula}: ` +
        `${duracionMinutos} min de estancia`
      );

      return registro;
    } catch (error) {
      console.error('❌ Error al registrar salida:', error);
      throw error;
    }
  }



  // ==================== PRESENCIA EN BIBLIOTECA ====================

  /**
   * Devuelve el registro abierto más reciente del día para un alumno.
   * "Abierto" = sin horaSalida. Usado por el scanner cuando
   * registroSalidaActivo está habilitado.
   */
  async obtenerEntradaAbiertaHoy(matricula: string): Promise<Registro | null> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);

      const registros = await this.db.getAllFromIndex('registros', 'by-matricula', matricula);

      const abiertos = registros
        .filter(r => !r.horaSalida && new Date(r.fechaHora) >= inicioHoy)
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());

      return abiertos[0] ?? null;
    } catch (error) {
      console.error('❌ Error al buscar entrada abierta:', error);
      return null;
    }
  }

  /**
   * Devuelve todos los registros del día sin hora de salida
   * (excluyendo invitados). Usado por el módulo de Presencia.
   */
  async obtenerRegistrosAbiertoHoy(): Promise<Registro[]> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      let registrosHoy: Registro[];
      try {
        const rango = IDBKeyRange.bound(hoy, manana, false, true);
        registrosHoy = await this.db.getAllFromIndex('registros', 'by-fecha', rango);
        if (!registrosHoy.length) throw new Error('fallback');
      } catch {
        const todos = await this.db.getAll('registros');
        registrosHoy = todos.filter(r => new Date(r.fechaHora) >= hoy);
      }

      // Incluye entradas sin salida Y entradas cerradas automáticamente
      // (cierreAutomatico = true) que aún requieren confirmación del personal
      // Incluye visitantes (INVITADO) para que aparezcan en presencia
      return registrosHoy
        .filter(r => !r.horaSalida || r.cierreAutomatico === true)
        .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
    } catch (error) {
      console.error('❌ Error al obtener registros abiertos:', error);
      return [];
    }
  }

  /**
   * Cierra automáticamente entradas abiertas más antiguas que `horasUmbral`.
   * Marca cierreAutomatico = true y estima horaSalida como fechaHora + umbral.
   * Retorna la cantidad de entradas cerradas.
   * Si horasUmbral <= 0, no hace nada (feature desactivado).
   */
  async cerrarEntradasAntiguas(horasUmbral: number): Promise<number> {
    if (horasUmbral <= 0) return 0;
    try {
      await this.inicializar();
      if (!this.db) return 0;

      const abiertas = await this.obtenerRegistrosAbiertoHoy();
      const limiteMs = horasUmbral * 60 * 60 * 1000;
      const ahora = Date.now();
      let cerrados = 0;

      for (const r of abiertas) {
        const edad = ahora - new Date(r.fechaHora).getTime();
        if (edad >= limiteMs) {
          r.horaSalida = new Date(new Date(r.fechaHora).getTime() + limiteMs);
          r.duracionMinutos = horasUmbral * 60;
          r.cierreAutomatico = true;
          await this.db.put('registros', r);
          cerrados++;
        }
      }

      if (cerrados > 0) {
        console.log(`🔒 Cierre automático: ${cerrados} entrada(s) cerrada(s) tras ${horasUmbral}h`);
      }
      return cerrados;
    } catch (error) {
      console.error('❌ Error en cierre automático:', error);
      return 0;
    }
  }

  /**
   * Confirma un cierre automático: el personal revisó y acepta la salida estimada.
   * Quita el flag cierreAutomatico para que desaparezca de la vista de Presencia.
   */
  async confirmarCierreAutomatico(registroId: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) return;
      const r = await this.db.get('registros', registroId);
      if (r) {
        r.cierreAutomatico = false;
        await this.db.put('registros', r);
      }
    } catch (error) {
      console.error('❌ Error al confirmar cierre automático:', error);
      throw error;
    }
  }

  // ==================== ELIMINACIÓN MASIVA ====================

  /**
   * Elimina registros dentro de un rango de fechas.
   * Retorna la cantidad de registros eliminados.
   *
   * @param fechaInicio - Inicio del rango (inclusive)
   * @param fechaFin - Fin del rango (inclusive)
   * @returns Número de registros eliminados
   */
  async eliminarRegistrosPorRango(fechaInicio: Date, fechaFin: Date): Promise<number> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      // Normalizar fechas
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);

      // Obtener todos los registros
      const todosRegistros = await this.db.getAll('registros');

      // Filtrar los que caen dentro del rango
      const registrosAEliminar = todosRegistros.filter(registro => {
        const fecha = new Date(registro.fechaHora);
        return fecha >= inicio && fecha <= fin;
      });

      // Eliminar uno por uno (IndexedDB no tiene DELETE WHERE)
      const tx = this.db.transaction('registros', 'readwrite');
      for (const registro of registrosAEliminar) {
        await tx.store.delete(registro.id);
      }
      await tx.done;

      console.log(`🗑️ ${registrosAEliminar.length} registros eliminados (${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()})`);

      return registrosAEliminar.length;
    } catch (error) {
      console.error('❌ Error al eliminar registros por rango:', error);
      throw error;
    }
  }

  /**
   * Cuenta registros dentro de un rango de fechas (sin eliminar).
   * Útil para preview antes de eliminar.
   */
  async contarRegistrosPorRango(fechaInicio: Date, fechaFin: Date): Promise<number> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);

      const todosRegistros = await this.db.getAll('registros');

      return todosRegistros.filter(registro => {
        const fecha = new Date(registro.fechaHora);
        return fecha >= inicio && fecha <= fin;
      }).length;
    } catch (error) {
      console.error('❌ Error al contar registros:', error);
      return 0;
    }
  }

  /**
   * Suma horas acumuladas de un alumno a partir de `duracionMinutos`.
   * Ignora registros sin duración (entradas sin salida).
   * Si se pasan `desde`/`hasta` filtra por rango (inclusive).
   */
  async obtenerHorasAcumuladas(
    matricula: string,
    desde?: Date,
    hasta?: Date
  ): Promise<{
    totalMinutos: number;
    totalHoras: number;
    visitasConDuracion: number;
    duracionPromedio: number;
  }> {
    try {
      const registros = await this.obtenerRegistrosPorAlumno(matricula);

      const inicio = desde ? new Date(desde) : null;
      if (inicio) inicio.setHours(0, 0, 0, 0);
      const fin = hasta ? new Date(hasta) : null;
      if (fin) fin.setHours(23, 59, 59, 999);

      const conDuracion = registros.filter(r => {
        if (typeof r.duracionMinutos !== 'number' || r.duracionMinutos <= 0) return false;
        const fecha = new Date(r.fechaHora);
        if (inicio && fecha < inicio) return false;
        if (fin && fecha > fin) return false;
        return true;
      });

      const totalMinutos = conDuracion.reduce((acc, r) => acc + (r.duracionMinutos || 0), 0);
      const visitasConDuracion = conDuracion.length;
      const duracionPromedio = visitasConDuracion > 0 ? totalMinutos / visitasConDuracion : 0;

      return {
        totalMinutos,
        totalHoras: totalMinutos / 60,
        visitasConDuracion,
        duracionPromedio,
      };
    } catch (error) {
      console.error('❌ Error al calcular horas acumuladas:', error);
      return { totalMinutos: 0, totalHoras: 0, visitasConDuracion: 0, duracionPromedio: 0 };
    }
  }

  /**
   * Devuelve alumnos activos cuya última visita supera `diasUmbral` días
   * (o que nunca han visitado, en cuyo caso `ultimaVisita` es null y
   * `diasSinVenir` es Infinity → ordenados al final como "nunca").
   * Ordenado por `diasSinVenir` descendente.
   */
  async obtenerAlumnosInactivos(diasUmbral: number): Promise<Array<{
    alumno: Alumno;
    ultimaVisita: Date | null;
    diasSinVenir: number;
  }>> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const alumnos = await this.db.getAll('alumnos');
      const activos = alumnos.filter(a => a.activo !== false);
      const todosRegistros = await this.db.getAll('registros');

      const ahora = Date.now();
      const MS_DIA = 1000 * 60 * 60 * 24;

      // Mapa matricula → última fecha
      const ultimaPorMatricula = new Map<string, number>();
      for (const r of todosRegistros) {
        const t = new Date(r.fechaHora).getTime();
        const prev = ultimaPorMatricula.get(r.matricula);
        if (prev === undefined || t > prev) ultimaPorMatricula.set(r.matricula, t);
      }

      const resultado = activos
        .map(alumno => {
          const t = ultimaPorMatricula.get(alumno.matricula);
          if (t === undefined) {
            return { alumno, ultimaVisita: null, diasSinVenir: Infinity };
          }
          const dias = Math.floor((ahora - t) / MS_DIA);
          return { alumno, ultimaVisita: new Date(t), diasSinVenir: dias };
        })
        .filter(r => r.diasSinVenir >= diasUmbral)
        .sort((a, b) => b.diasSinVenir - a.diasSinVenir);

      console.log(`😴 Alumnos inactivos (≥${diasUmbral}d):`, resultado.length);
      return resultado;
    } catch (error) {
      console.error('❌ Error al obtener alumnos inactivos:', error);
      return [];
    }
  }
}