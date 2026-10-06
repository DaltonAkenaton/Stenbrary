// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/export.service.ts       ║
// ║  Stenbrary v3.19.0 — Exportación a Excel (XLSX)       ║
// ║                                                      ║
// ║  CAMBIOS v3.19.0:                                    ║
// ║  - import() dinámico de xlsx (~600 KB) → solo se     ║
// ║    descarga cuando el usuario realmente exporta;     ║
// ║    el initial bundle adelgaza ese tamaño.            ║
// ║                                                      ║
// ║  Servicio reutilizable que genera archivos Excel.    ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { Registro, Alumno } from '../models';
import { fechaLocalISO } from '../utils/tiempo.utils';

@Injectable({
  providedIn: 'root',
})
export class ExportService {

  /** Cache del módulo xlsx para no reimportar entre exports consecutivos. */
  private xlsxModulePromise: Promise<typeof import('xlsx')> | null = null;

  private cargarXlsx(): Promise<typeof import('xlsx')> {
    if (!this.xlsxModulePromise) {
      this.xlsxModulePromise = import('xlsx');
    }
    return this.xlsxModulePromise;
  }

  /**
   * Exporta registros a archivo Excel con formato.
   */
  async exportarRegistrosXLSX(registros: Registro[], nombreArchivo?: string): Promise<void> {
    if (registros.length === 0) return;
    const XLSX = await this.cargarXlsx();

    const datos = registros.map(r => {
      const d = new Date(r.fechaHora);
      return {
        'Fecha': d.toLocaleDateString('es-MX'),
        'Hora': d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        'Matrícula': r.matricula,
        'Alumno': r.nombreCompleto,
        'Carrera': r.carrera,
        'Actividad': r.motivoNombre,
      };
    });

    const ws = XLSX.utils.json_to_sheet(datos);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 12 }, // Fecha
      { wch: 8 },  // Hora
      { wch: 16 }, // Matrícula
      { wch: 32 }, // Alumno
      { wch: 30 }, // Carrera
      { wch: 18 }, // Actividad
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    const nombre = nombreArchivo || `registros_stenbrary_${this.fechaHoy()}`;
    XLSX.writeFile(wb, `${nombre}.xlsx`);
  }

  /**
   * Exporta alumnos a archivo Excel con formato.
   *
   * `columnasExtra` añade columnas al final de cada fila (p. ej. Inactivos
   * agrega "Última visita" y "Días sin venir", que son su razón de ser).
   */
  async exportarAlumnosXLSX(
    alumnos: Alumno[],
    nombreArchivo?: string,
    columnasExtra?: (a: Alumno) => Record<string, string | number>,
  ): Promise<void> {
    if (alumnos.length === 0) return;
    const XLSX = await this.cargarXlsx();

    const datos = alumnos.map(a => ({
      'Matrícula': a.matricula,
      'Nombre': a.nombre,
      'Apellido Paterno': a.apellidoPaterno,
      'Apellido Materno': a.apellidoMaterno,
      'Carrera': a.carrera,
      'Grado': a.grado,
      'Grupo': a.grupo,
      'Turno': a.turno,
      'Activo': a.activo ? 'Sí' : 'No',
      'Fecha Registro': new Date(a.fechaRegistro).toLocaleDateString('es-MX'),
      ...(columnasExtra ? columnasExtra(a) : {}),
    }));

    const ws = XLSX.utils.json_to_sheet(datos);

    ws['!cols'] = [
      { wch: 16 }, // Matrícula
      { wch: 14 }, // Nombre
      { wch: 18 }, // Apellido Paterno
      { wch: 18 }, // Apellido Materno
      { wch: 30 }, // Carrera
      { wch: 8 },  // Grado
      { wch: 8 },  // Grupo
      { wch: 14 }, // Turno
      { wch: 8 },  // Activo
      { wch: 14 }, // Fecha Registro
      ...(columnasExtra ? [{ wch: 16 }, { wch: 14 }] : []),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');

    const nombre = nombreArchivo || `alumnos_stenbrary_${this.fechaHoy()}`;
    XLSX.writeFile(wb, `${nombre}.xlsx`);
  }

  private fechaHoy(): string {
    return fechaLocalISO();
  }
}
