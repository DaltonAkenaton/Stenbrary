// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/export.service.ts       ║
// ║  Stenbrary v3.5.1 — Exportación a Excel (XLSX)       ║
// ║                                                      ║
// ║  Servicio reutilizable que genera archivos Excel      ║
// ║  con formato profesional. Usa librería xlsx.          ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Registro, Alumno } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ExportService {

  /**
   * Exporta registros a archivo Excel con formato.
   */
  exportarRegistrosXLSX(registros: Registro[], nombreArchivo?: string): void {
    if (registros.length === 0) return;

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
   */
  exportarAlumnosXLSX(alumnos: Alumno[], nombreArchivo?: string): void {
    if (alumnos.length === 0) return;

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
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');

    const nombre = nombreArchivo || `alumnos_stenbrary_${this.fechaHoy()}`;
    XLSX.writeFile(wb, `${nombre}.xlsx`);
  }

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }
}