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

  constructor() {
    this.initDatabase();
  }

  // ==================== INICIALIZACIÓN ====================

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

  async obtenerAlumnoPorMatricula(matricula: string): Promise<Alumno | undefined> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    return await this.db.getFromIndex('alumnos', 'by-matricula', matricula);
  }

  async obtenerAlumnoPorId(id: string): Promise<Alumno | undefined> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    return await this.db.get('alumnos', id);
  }

  async obtenerTodosLosAlumnos(): Promise<Alumno[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    return await this.db.getAll('alumnos');
  }

  async actualizarAlumno(id: string, cambios: Partial<Alumno>): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const alumno = await this.db.get('alumnos', id);
    if (!alumno) throw new Error('Alumno no encontrado');

    const alumnoActualizado: Alumno = {
      ...alumno,
      ...cambios,
      fechaActualizacion: new Date()
    };

    await this.db.put('alumnos', alumnoActualizado);
    console.log('✅ Alumno actualizado:', id);
  }

  async eliminarAlumno(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    await this.db.delete('alumnos', id);
    console.log('✅ Alumno eliminado:', id);
  }

  // ==================== REGISTROS ====================

  async crearRegistro(registro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'>): Promise<Registro> {
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
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const registros = await this.db.getAll('registros');
    return registros.sort((a, b) => 
      new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
  }

  async obtenerRegistrosPorAlumno(alumnoId: string): Promise<Registro[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    return await this.db.getAllFromIndex('registros', 'by-alumno', alumnoId);
  }

  async obtenerRegistrosPorFecha(fecha: Date): Promise<Registro[]> {
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
    if (!this.db) throw new Error('Base de datos no inicializada');

    const motivos = await this.db.getAll('motivos');
    return motivos
      .filter(m => m.activo)
      .sort((a, b) => a.orden - b.orden);
  }

  async obtenerTodosLosMotivos(): Promise<Motivo[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const motivos = await this.db.getAll('motivos');
    return motivos.sort((a, b) => a.orden - b.orden);
  }

  async obtenerMotivoPorId(id: string): Promise<Motivo | undefined> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    return await this.db.get('motivos', id);
  }

  async crearMotivo(motivo: Omit<Motivo, 'id' | 'fechaCreacion'>): Promise<Motivo> {
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

  async actualizarMotivo(id: string, cambios: Partial<Motivo>): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const motivo = await this.db.get('motivos', id);
    if (!motivo) throw new Error('Motivo no encontrado');

    const motivoActualizado: Motivo = {
      ...motivo,
      ...cambios
    };

    await this.db.put('motivos', motivoActualizado);
    console.log('✅ Motivo actualizado:', id);
  }

  async eliminarMotivo(id: string): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    await this.db.delete('motivos', id);
    console.log('✅ Motivo eliminado:', id);
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
    if (!this.db) throw new Error('Base de datos no inicializada');

    const [alumnos, registros, motivos] = await Promise.all([
      this.db.count('alumnos'),
      this.db.count('registros'),
      this.db.count('motivos')
    ]);

    return { alumnos, registros, motivos };
  }
}