// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/backup.service.ts       ║
// ║  Stenbrary v3.4.1 — Backup & Restore FIXED           ║
// ║                                                      ║
// ║  FIX v3.4.1:                                         ║
// ║  - Motivos: verifica duplicados por nombre antes     ║
// ║    de importar (evita duplicación)                   ║
// ║  - Nuevo: limpiarMotivosDuplicados() para arreglar   ║
// ║    datos ya duplicados                               ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Alumno, Registro, Motivo } from '../models';

export interface BackupData {
  meta: {
    version: string;
    fecha: string;
    app: string;
    totalAlumnos: number;
    totalRegistros: number;
    totalMotivos: number;
  };
  alumnos: Alumno[];
  registros: Registro[];
  motivos: Motivo[];
}

export interface ValidacionBackup {
  valido: boolean;
  errores: string[];
  datos?: BackupData;
}

export interface ResultadoImportacion {
  exitoso: boolean;
  alumnosImportados: number;
  registrosImportados: number;
  motivosImportados: number;
  alumnosOmitidos: number;
  motivosOmitidos: number;
  errores: string[];
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {

  constructor(private databaseService: DatabaseService) {}

  // ═══════════════════════════════════════════════
  // EXPORTAR
  // ═══════════════════════════════════════════════

  async exportarBackup(): Promise<BackupData> {
    const [alumnos, registros, motivos] = await Promise.all([
      this.databaseService.obtenerTodosLosAlumnos(),
      this.databaseService.obtenerTodosLosRegistros(),
      this.databaseService.obtenerTodosLosMotivos(),
    ]);

    return {
      meta: {
        version: '3.4',
        fecha: new Date().toISOString(),
        app: 'Stenbrary',
        totalAlumnos: alumnos.length,
        totalRegistros: registros.length,
        totalMotivos: motivos.length,
      },
      alumnos,
      registros,
      motivos,
    };
  }

  async descargarBackup(): Promise<{ exito: boolean; nombreArchivo: string }> {
    try {
      const backup = await this.exportarBackup();
      const fecha = new Date().toISOString().split('T')[0];
      const hora = new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit',
      }).replace(':', '');
      const nombreArchivo = `stenbrary_backup_${fecha}_${hora}.json`;

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      link.click();
      URL.revokeObjectURL(url);

      console.log('✅ Backup exportado:', nombreArchivo);
      return { exito: true, nombreArchivo };
    } catch (error) {
      console.error('❌ Error al exportar backup:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════
  // VALIDAR
  // ═══════════════════════════════════════════════

  validarArchivo(contenido: string): ValidacionBackup {
    const errores: string[] = [];
    let datos: any;

    try {
      datos = JSON.parse(contenido);
    } catch {
      return { valido: false, errores: ['El archivo no es un JSON válido'] };
    }

    if (!datos.meta) {
      errores.push('Falta el campo "meta" — no parece ser un backup de Stenbrary');
    } else if (datos.meta.app !== 'Stenbrary') {
      errores.push(`App desconocida: "${datos.meta.app}" (se esperaba "Stenbrary")`);
    }

    if (!Array.isArray(datos.alumnos)) errores.push('Falta el array "alumnos"');
    if (!Array.isArray(datos.registros)) errores.push('Falta el array "registros"');
    if (!Array.isArray(datos.motivos)) errores.push('Falta el array "motivos"');

    if (errores.length > 0) return { valido: false, errores };

    if (datos.alumnos.length > 0) {
      const sample = datos.alumnos[0];
      if (!sample.matricula || !sample.nombre) {
        errores.push('Los datos de alumnos no tienen la estructura esperada');
      }
    }

    if (errores.length > 0) return { valido: false, errores };

    return { valido: true, errores: [], datos: datos as BackupData };
  }

  // ═══════════════════════════════════════════════
  // IMPORTAR (FIX v3.4.1 — deduplicación)
  // ═══════════════════════════════════════════════

  async importarBackup(
    datos: BackupData,
    modo: 'merge' | 'replace' = 'merge'
  ): Promise<ResultadoImportacion> {
    const resultado: ResultadoImportacion = {
      exitoso: false,
      alumnosImportados: 0,
      registrosImportados: 0,
      motivosImportados: 0,
      alumnosOmitidos: 0,
      motivosOmitidos: 0,
      errores: [],
    };

    try {
      if (modo === 'replace') {
        await this.databaseService.limpiarTodosDatos();
        console.log('🗑️ Datos anteriores eliminados (modo replace)');
      }

      // ── Importar Motivos (FIX: deduplicar por nombre) ──
      const motivosExistentes = await this.databaseService.obtenerTodosLosMotivos();
      const nombresExistentes = new Set(
        motivosExistentes.map(m => m.nombre.toLowerCase().trim())
      );

      for (const motivo of datos.motivos) {
        const nombreNorm = motivo.nombre.toLowerCase().trim();

        if (nombresExistentes.has(nombreNorm)) {
          resultado.motivosOmitidos++;
          continue;
        }

        try {
          await this.databaseService.crearMotivo({
            nombre: motivo.nombre,
            descripcion: motivo.descripcion,
            icono: motivo.icono,
            color: motivo.color,
            orden: motivo.orden,
            activo: motivo.activo,
          });
          nombresExistentes.add(nombreNorm);
          resultado.motivosImportados++;
        } catch {
          resultado.motivosOmitidos++;
        }
      }

      // ── Importar Alumnos (deduplicar por matrícula) ──
      for (const alumno of datos.alumnos) {
        try {
          await this.databaseService.crearAlumno({
            matricula: alumno.matricula,
            nombre: alumno.nombre,
            apellidoPaterno: alumno.apellidoPaterno,
            apellidoMaterno: alumno.apellidoMaterno,
            carrera: alumno.carrera,
            grado: alumno.grado,
            grupo: alumno.grupo,
            turno: alumno.turno,
            activo: alumno.activo,
            email: alumno.email,
            telefono: alumno.telefono,
            notas: alumno.notas,
            datosExtra: alumno.datosExtra,
          });
          resultado.alumnosImportados++;
        } catch {
          resultado.alumnosOmitidos++;
        }
      }

      // ── Importar Registros ──
      for (const registro of datos.registros) {
        try {
          await this.databaseService.crearRegistro({
            alumnoId: registro.alumnoId,
            matricula: registro.matricula,
            nombreCompleto: registro.nombreCompleto,
            carrera: registro.carrera,
            motivoId: registro.motivoId,
            motivoNombre: registro.motivoNombre,
          });
          resultado.registrosImportados++;
        } catch (err: any) {
          resultado.errores.push(`Registro omitido: ${registro.matricula}`);
        }
      }

      resultado.exitoso = true;
      console.log('✅ Importación completada:', resultado);
      return resultado;
    } catch (error: any) {
      resultado.errores.push(`Error general: ${error.message}`);
      console.error('❌ Error durante importación:', error);
      return resultado;
    }
  }

  // ═══════════════════════════════════════════════
  // LIMPIAR DUPLICADOS (NUEVO v3.4.1)
  // ═══════════════════════════════════════════════

  /**
   * Encuentra y elimina motivos duplicados por nombre.
   * Conserva el que tiene menor orden (el original).
   * Reasigna órdenes consecutivos después de limpiar.
   */
  async limpiarMotivosDuplicados(): Promise<number> {
    const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();

    // Agrupar por nombre normalizado
    const grupos = new Map<string, Motivo[]>();
    todosMotivos.forEach(m => {
      const key = m.nombre.toLowerCase().trim();
      const grupo = grupos.get(key) || [];
      grupo.push(m);
      grupos.set(key, grupo);
    });

    let eliminados = 0;

    for (const [, grupo] of grupos) {
      if (grupo.length <= 1) continue;

      // Mantener el de menor orden (el original)
      grupo.sort((a, b) => a.orden - b.orden);

      for (let i = 1; i < grupo.length; i++) {
        if (grupo[i].id) {
          await this.databaseService.eliminarMotivo(grupo[i].id!);
          eliminados++;
          console.log(`🗑️ Duplicado eliminado: "${grupo[i].nombre}" (orden ${grupo[i].orden})`);
        }
      }
    }

    // Reasignar órdenes consecutivos
    if (eliminados > 0) {
      const motivosLimpios = await this.databaseService.obtenerTodosLosMotivos();
      for (let i = 0; i < motivosLimpios.length; i++) {
        if (motivosLimpios[i].orden !== i + 1) {
          await this.databaseService.actualizarMotivo(motivosLimpios[i].id!, {
            ...motivosLimpios[i],
            orden: i + 1,
          });
        }
      }
    }

    return eliminados;
  }

  /**
   * Cuenta cuántos motivos duplicados existen actualmente.
   */
  async contarMotivosDuplicados(): Promise<number> {
    const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();
    const grupos = new Map<string, number>();

    todosMotivos.forEach(m => {
      const key = m.nombre.toLowerCase().trim();
      grupos.set(key, (grupos.get(key) || 0) + 1);
    });

    let duplicados = 0;
    grupos.forEach(count => {
      if (count > 1) duplicados += count - 1;
    });

    return duplicados;
  }
}