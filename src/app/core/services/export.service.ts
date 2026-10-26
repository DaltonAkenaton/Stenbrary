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
// ║                                                      ║
// ║  v3.62.0: cada texto pasa por `neutralizarFila`      ║
// ║  (inyección de fórmulas) y los libros se arman en    ║
// ║  `libroRegistros`/`libroAlumnos`, aparte de la       ║
// ║  descarga, para poder inspeccionarlos en pruebas.    ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { Registro, Alumno } from '../models';
import { fechaLocalISO } from '../utils/tiempo.utils';
import { duracionReal, esSalidaEstimada } from '../utils/estadisticas.utils';
import { neutralizarFila } from '../utils/hoja-calculo.utils';

type Xlsx = typeof import('xlsx');

// Formateadores creados una vez. `toLocaleDateString('es-MX')` arma uno nuevo
// en cada llamada: con 120 000 visitas el Excel tardaba ~16 s solo en las
// fechas, contra ~0.4 s así (mismo texto; prueba de volumen 2026-10).
const FMT_FECHA = new Intl.DateTimeFormat('es-MX');
const FMT_HORA = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

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
    const wb = this.libroRegistros(XLSX, registros);
    const nombre = nombreArchivo || `registros_stenbrary_${this.fechaHoy()}`;
    // Sin `compression` SheetJS guarda el ZIP sin comprimir: 120 000 visitas
    // pesaban 53 MB, demasiado para un correo.
    XLSX.writeFile(wb, `${nombre}.xlsx`, { compression: true });
  }

  /** El libro de visitas, sin descargarlo (lo usan las pruebas). */
  libroRegistros(XLSX: Xlsx, registros: Registro[]): import('xlsx').WorkBook {
    const hora = (x: Date) => FMT_HORA.format(x);
    const datos = registros.map(r => {
      const d = new Date(r.fechaHora);
      const real = duracionReal(r);
      return neutralizarFila({
        'Fecha': FMT_FECHA.format(d),
        'Hora': hora(d),
        'Matrícula': r.matricula,
        'Alumno': r.nombreCompleto,
        'Carrera': r.carrera,
        'Turno': r.turno ?? '',
        // Todas las actividades de la visita, no solo la principal (P2).
        'Actividades': (r.motivoNombres?.length ? r.motivoNombres : [r.motivoNombre]).join(', '),
        'Salida': r.horaSalida ? hora(new Date(r.horaSalida)) : '',
        // Minutos solo si la salida la registró una persona (P3).
        'Duración (min)': real ?? '',
        'Salida estimada': r.horaSalida && esSalidaEstimada(r) ? 'Sí' : '',
        'Capturada a mano': r.capturaManual ? 'Sí' : '',
      });
    });

    const ws = XLSX.utils.json_to_sheet(datos);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 12 }, // Fecha
      { wch: 8 },  // Hora
      { wch: 16 }, // Matrícula
      { wch: 32 }, // Alumno
      { wch: 30 }, // Carrera
      { wch: 12 }, // Turno
      { wch: 30 }, // Actividades
      { wch: 8 },  // Salida
      { wch: 14 }, // Duración
      { wch: 14 }, // Salida estimada
      { wch: 16 }, // Capturada a mano
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    // v3.57.0: el archivo se explica solo. El coordinador preguntó qué era
    // "Salida estimada"; quien reciba el Excel por correo no tiene a quién.
    const notas = XLSX.utils.aoa_to_sheet([
      ['Columna', 'Qué significa'],
      ['Fecha / Hora', 'Cuándo entró el alumno. Es la hora que usa Stenbrary (verificada por internet o ajustada a mano), no necesariamente la del reloj de la computadora.'],
      ['Actividades', 'Todas las que marcó en esa visita, separadas por comas. Una visita puede tener varias.'],
      ['Salida', 'Hora de salida. Vacía si nadie la registró y el sistema no la cerró.'],
      ['Duración (min)', 'Minutos dentro de la biblioteca. Solo cuando la salida la registró una persona; vacía si la salida es estimada.'],
      ['Salida estimada', '"Sí" = la salida la puso el sistema (cierre automático por tiempo o al final del horario), no el alumno. Por eso no se usa para calcular promedios de estancia.'],
      ['Capturada a mano', '"Sí" = la visita se anotó en papel (por ejemplo, se fue la luz) y se capturó después en Registros.'],
      ['Matrícula INVITADO', 'Visitante sin matrícula (no es alumno registrado).'],
      [],
      ['Generado', `${FMT_FECHA.format(new Date())} ${hora(new Date())} · ${registros.length} visitas`],
    ]);
    notas['!cols'] = [{ wch: 20 }, { wch: 110 }];
    XLSX.utils.book_append_sheet(wb, notas, 'Notas');
    return wb;
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
    const wb = this.libroAlumnos(XLSX, alumnos, columnasExtra);
    const nombre = nombreArchivo || `alumnos_stenbrary_${this.fechaHoy()}`;
    XLSX.writeFile(wb, `${nombre}.xlsx`, { compression: true });
  }

  /** El libro de alumnos, sin descargarlo (lo usan las pruebas). */
  libroAlumnos(
    XLSX: Xlsx,
    alumnos: Alumno[],
    columnasExtra?: (a: Alumno) => Record<string, string | number>,
  ): import('xlsx').WorkBook {
    const datos = alumnos.map(a => neutralizarFila({
      'Matrícula': a.matricula,
      'Nombre': a.nombre,
      'Apellido Paterno': a.apellidoPaterno,
      'Apellido Materno': a.apellidoMaterno,
      'Carrera': a.carrera,
      'Grado': a.grado,
      'Grupo': a.grupo,
      'Turno': a.turno,
      'Activo': a.activo ? 'Sí' : 'No',
      'Fecha Registro': FMT_FECHA.format(new Date(a.fechaRegistro)),
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
    return wb;
  }

  private fechaHoy(): string {
    return fechaLocalISO();
  }
}
