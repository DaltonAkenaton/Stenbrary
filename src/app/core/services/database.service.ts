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
    // Si ya hay una inicialización en progreso, esperar a que termine
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Si ya está inicializada, retornar inmediatamente
    if (this.db) {
      return Promise.resolve();
    }

    // Crear nueva promesa de inicialización
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

  async obtenerRegistrosDeHoy(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

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
      // Contar por carrera
      const countCarrera = porCarrera.get(registro.carrera) || 0;
      porCarrera.set(registro.carrera, countCarrera + 1);

      // Contar por motivo
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
   * Obtener registros de un alumno específico por matrícula
   */
  async obtenerRegistrosPorAlumno(matricula: string): Promise<Registro[]> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const registros = await this.db.getAll('registros');
      
      // Filtrar registros del alumno y ordenar por fecha descendente
      const registrosDelAlumno = registros
        .filter((registro: Registro) => registro.matricula === matricula)
        .sort((a: Registro, b: Registro) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
      
      console.log(`📋 Registros del alumno ${matricula}:`, registrosDelAlumno.length);
      return registrosDelAlumno;
    } catch (error) {
      console.error('❌ Error al obtener registros del alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener un alumno por su matrícula
   */
  async obtenerAlumnoPorMatricula(matricula: string): Promise<Alumno | null> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      // Buscar por índice de matrícula
      const alumno = await this.db.getFromIndex('alumnos', 'by-matricula', matricula);
      
      if (alumno) {
        console.log('✅ Alumno encontrado:', alumno);
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
      
      // Asegurarse de que el ID esté presente
      alumnoActualizado.id = id;
      
      await this.db.put('alumnos', alumnoActualizado);
      
      console.log('✅ Alumno actualizado exitosamente:', alumnoActualizado);
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
      
      console.log('✅ Alumno desactivado:', alumno);
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
      
      console.log('✅ Alumno reactivado:', alumno);
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
      
      // Calcular estadísticas
      const totalVisitas = registros.length;
      const ultimaVisita = new Date(registros[0].fechaHora);
      const primeraVisita = new Date(registros[registros.length - 1].fechaHora);
      
      // Contar visitas por motivo
      const visitasPorMotivo = new Map<string, number>();
      registros.forEach((registro: Registro) => {
        if (registro.motivoNombre) {
          const count = visitasPorMotivo.get(registro.motivoNombre) || 0;
          visitasPorMotivo.set(registro.motivoNombre, count + 1);
        }
      });
      
      // Encontrar motivo más frecuente
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



// ==============================================================================
// RUTA: src/app/core/services/database.service.ts
// REEMPLAZAR LOS 4 MÉTODOS AL FINAL (líneas ~540-610)
// ==============================================================================

/**
 * Obtener todos los motivos (activos e inactivos)
 */
async obtenerTodosLosMotivos(): Promise<Motivo[]> {
  await this.inicializar();
  if (!this.db) throw new Error('Base de datos no inicializada');

  const motivos = await this.db.getAll('motivos');
  // Ordenar por orden
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
  console.log('✅ Motivo creado:', nuevoMotivo);
  return nuevoMotivo;
}

/**
 * Actualizar un motivo existente
 */
async actualizarMotivo(id: string, motivo: Motivo): Promise<void> {
  await this.inicializar();
  if (!this.db) throw new Error('Base de datos no inicializada');

  // Asegurar que el ID está presente
  motivo.id = id;

  await this.db.put('motivos', motivo);
  console.log('✅ Motivo actualizado:', motivo);
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
}