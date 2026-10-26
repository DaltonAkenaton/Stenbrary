// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/report.service.ts       ║
// ║  Stenbrary v3.8.2 — Reportes PDF con sección Top      ║
// ║                                                      ║
// ║  MEJORAS:                                             ║
// ║  - El PDF muestra qué filtros se aplicaron            ║
// ║  - Soporta sección "Top Alumnos" en el ranking PDF    ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { Alumno, Motivo, Registro } from '../models';
// Solo tipos: el bundler no incluirá jspdf/jspdf-autotable en el chunk inicial.
// Los módulos se cargan dinámicamente en cargarPdfLib() — primer uso descarga
// jspdf (~150 KB) + autotable (~30 KB) on-demand.
import type jsPDF from 'jspdf';
import type autoTableT from 'jspdf-autotable';
import { fechaLocalISO } from '../utils/tiempo.utils';
import { contarMotivos, duracionReal, esInvitado, esSalidaEstimada, notaSumaActividades, resumirEstancia } from '../utils/estadisticas.utils';

// Formateadores creados una vez: `toLocaleDateString` arma uno por llamada y
// en tablas de miles de filas era la mayor parte del tiempo (ver export.service).
const FMT_FECHA = new Intl.DateTimeFormat('es-MX');
const FMT_FECHA_2D = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
const FMT_HORA = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

export type TipoReporte = 'diario' | 'semanal' | 'mensual' | 'anual' | 'personalizado';

export interface FiltrosReporte {
  busqueda?: string;
  carrera?: string;
  motivo?: string;
  /** Otros filtros ya descritos en palabras ("Solo visitantes", v3.58.0). */
  otros?: string[];
}

/** Datos mínimos de un alumno destacado para incluir en el PDF. */
export interface TopAlumnoReporte {
  posicion: number;
  matricula: string;
  nombreCompleto: string;
  carrera: string;
  totalVisitas: number;
  ultimaVisita: Date;
  motivoFrecuente: string;
}

/**
 * Secciones opcionales del PDF (v3.16.0). Si una flag es false, esa sección
 * se omite. Si `secciones` no se pasa, se incluyen las históricas (compat).
 */
export interface SeccionesReporte {
  resumen?: boolean;        // Total registros, alumnos únicos, fechas
  topAlumnos?: boolean;     // Tabla del top
  tablaRegistros?: boolean; // Detalle fila por fila (puede ser larga)
  carreras?: boolean;       // Resumen por carrera
  motivos?: boolean;        // Resumen por motivo
  turnos?: boolean;         // Resumen por turno (NUEVO v3.16.0)
}

export interface OpcionesReporte {
  tipo: TipoReporte;
  fechaInicio?: Date;
  fechaFin?: Date;
  titulo?: string;
  filtros?: FiltrosReporte;
  /** Si se pasa, el PDF añade una sección "Top Alumnos" antes del detalle. */
  topAlumnos?: TopAlumnoReporte[];
  /** v3.16.0: control granular de qué secciones incluir. */
  secciones?: SeccionesReporte;
  /**
   * Título de la tabla de detalle. Lo decide quien sabe QUÉ registros manda:
   * antes, con un Top presente, la tabla se titulaba "Detalle de Visitas del
   * Top" aunque contuviera todas las visitas del período (auditoría, O8).
   */
  tituloTabla?: string;
}

const SECCIONES_DEFAULT: Required<SeccionesReporte> = {
  resumen: true,
  topAlumnos: true,
  tablaRegistros: true,
  carreras: true,
  motivos: true,
  turnos: true,
};

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private databaseService = inject(DatabaseService);


  /** Cache para fallback de turno (registros viejos sin r.turno). */
  private turnoPorMatricula = new Map<string, string>();

  /** Cache de los módulos jspdf cargados dinámicamente. */
  private pdfLibPromise: Promise<{
    JsPDFCtor: typeof jsPDF;
    autoTableFn: typeof autoTableT;
  }> | null = null;

  /** Carga jspdf + jspdf-autotable on-demand y cachea el resultado. */
  private async cargarPdfLib(): Promise<{
    JsPDFCtor: typeof jsPDF;
    autoTableFn: typeof autoTableT;
  }> {
    if (!this.pdfLibPromise) {
      this.pdfLibPromise = (async () => {
        const [jsPdfMod, autoTableMod] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
        ]);
        const result = {
          JsPDFCtor: jsPdfMod.default,
          autoTableFn: autoTableMod.default,
        };
        // Cachear sincrónicamente para que _autoTable() pueda usarlo sin await
        this._autoTableFnCached = result.autoTableFn;
        return result;
      })();
    }
    return this.pdfLibPromise;
  }

  /**
   * Wrapper síncrono sobre autoTable. Usable solo después de haber esperado
   * `cargarPdfLib()` al menos una vez en el método público (la promesa quedó
   * cacheada). Si por error se llama antes, lanza para no producir un PDF
   * malformado silenciosamente.
   */
  private _autoTable(doc: jsPDF, opts: Parameters<typeof autoTableT>[1]): void {
    if (!this.pdfLibPromise) {
      throw new Error('cargarPdfLib() debe llamarse antes de _autoTable()');
    }
    // pdfLibPromise ya está resuelto (lo esperó el método público), pero
    // accedemos a la cache vía .then sincrónico no es posible; usamos un
    // truco: dado que es la misma microtask y la promesa ya está fulfilled,
    // resolvemos sincrónicamente con un workaround basado en cache propia.
    const fn = this._autoTableFnCached;
    if (!fn) {
      throw new Error('autoTable no está listo. ¿Olvidaste await cargarPdfLib()?');
    }
    fn(doc, opts);
  }

  /** Cache sincrónica del autoTableFn — se setea cuando cargarPdfLib resuelve. */
  private _autoTableFnCached: typeof autoTableT | null = null;

  async generarReporteAccesos(
    registros: Registro[],
    opciones: OpcionesReporte
  ): Promise<void> {
    const { JsPDFCtor } = await this.cargarPdfLib();
    // compress: jsPDF no comprime por omisión. Con 21 mil visitas el PDF
    // pesaba 41 MB, más que el límite de adjuntos del correo (ronda de
    // pruebas 2026-10).
    const doc = new JsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const secciones = { ...SECCIONES_DEFAULT, ...(opciones.secciones || {}) };

    // v3.17.0 — pre-cargar map matrícula→turno para fallback de registros
    // viejos sin r.turno (creados antes de v3.16.0).
    if (secciones.turnos) {
      try {
        const alumnos = await this.databaseService.obtenerTodosLosAlumnos();
        for (const a of alumnos) {
          if (a.turno) this.turnoPorMatricula.set(a.matricula, a.turno);
        }
      } catch { /* si falla, "Sin turno" para los registros viejos */ }
    }

    let y = this.dibujarHeader(doc, opciones, pageWidth, margin);

    if (secciones.resumen) {
      y = this.dibujarResumen(doc, registros, y, margin, pageWidth);
    }

    if (secciones.topAlumnos && opciones.topAlumnos && opciones.topAlumnos.length > 0) {
      y = this.verificarEspacioPagina(doc, y, 70);
      y = this.dibujarTopAlumnos(doc, opciones.topAlumnos, y, margin);
    }

    if (secciones.tablaRegistros) {
      y = this.verificarEspacioPagina(doc, y, 60);
      const tituloRegistros = opciones.tituloTabla ?? 'Detalle de Registros';
      y = this.dibujarTablaRegistros(doc, registros, y, margin, tituloRegistros);
    }

    if (secciones.carreras) {
      y = this.verificarEspacioPagina(doc, y, 60);
      y = this.dibujarResumenCarreras(doc, registros, y, margin);
    }

    if (secciones.motivos) {
      y = this.verificarEspacioPagina(doc, y, 60);
      // Con el catálogo, un motivo renombrado sale con su nombre actual, como en pantalla.
      const catalogo = await this.databaseService.obtenerTodosLosMotivos().catch(() => []);
      y = this.dibujarResumenMotivos(doc, registros, y, margin, catalogo);
    }

    if (secciones.turnos) {
      y = this.verificarEspacioPagina(doc, y, 60);
      // El valor devuelto ya no lo lee nadie: esta es la última sección.
      this.dibujarResumenTurnos(doc, registros, y, margin);
    }

    this.dibujarFooterTodasPaginas(doc, pageWidth, margin);

    const nombreArchivo = this.generarNombreArchivo(opciones);
    doc.save(nombreArchivo);
  }

  /**
   * Dibuja la sección de "Distribución por turno" (NUEVO v3.16.0).
   * Usa registro.turno si existe; si no, "Sin turno".
   */
  private dibujarResumenTurnos(
    doc: jsPDF,
    registros: Registro[],
    y: number,
    margin: number,
  ): number {
    if (registros.length === 0) return y;

    // P5: los invitados no son alumnos y no tienen turno.
    const deAlumnos = registros.filter(r => !esInvitado(r));
    const conteo = new Map<string, number>();
    for (const r of deAlumnos) {
      const t = (r as any).turno
        || this.turnoPorMatricula.get(r.matricula)
        || 'Sin turno';
      conteo.set(t, (conteo.get(t) || 0) + 1);
    }
    if (conteo.size === 0) return y;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Distribución por turno', margin, y);
    y += 6;

    const ordenado = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1]);
    const total = deAlumnos.length;
    const filas = ordenado.map(([turno, cant]) => [
      turno,
      String(cant),
      `${((cant / total) * 100).toFixed(1)}%`,
    ]);

    this._autoTable(doc, {
      startY: y,
      head: [['Turno', 'Visitas', '% del total']],
      body: filas,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 200, 215], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 250, 252] },
    });

    return (doc as any).lastAutoTable.finalY + 8;
  }

  // ═══════════════════════════════════════════════
  // HEADER CON FILTROS
  // ═══════════════════════════════════════════════

  private dibujarHeader(
    doc: jsPDF,
    opciones: OpcionesReporte,
    pageWidth: number,
    margin: number
  ): number {
    let y = 20;

    // Línea superior decorativa
    doc.setDrawColor(0, 200, 215);
    doc.setLineWidth(1.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Logo
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('STENBRARY', margin, y);

    // Subtítulo
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Sistema de Registro de Accesos — Biblioteca', margin, y + 6);

    // Fecha de generación (derecha)
    const ahora = new Date();
    const fechaGen = ahora.toLocaleString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    doc.setFontSize(8);
    doc.text(`Generado: ${fechaGen}`, pageWidth - margin, y, { align: 'right' });
    y += 14;

    // Título del reporte
    const titulo = opciones.titulo || this.obtenerTituloDefault(opciones);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(titulo, margin, y);
    y += 6;

    // Período
    const periodo = this.obtenerTextoPeriodo(opciones);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(periodo, margin, y);
    y += 5;

    // ── FILTROS APLICADOS ──
    const textoFiltros = this.construirTextoFiltros(opciones.filtros);
    if (textoFiltros) {
      y += 2;

      // Fondo para el badge de filtros
      const anchoTexto = doc.getTextWidth(textoFiltros) + 14;
      doc.setFillColor(255, 248, 230);
      doc.setDrawColor(245, 166, 35);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y - 4, Math.min(anchoTexto, pageWidth - margin * 2), 8, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 120, 0);
      doc.text(textoFiltros, margin + 4, y + 1);
      y += 8;
    }

    y += 3;

    // Línea separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    return y + 6;
  }

  /**
   * Construye el texto de filtros activos para mostrar en el PDF.
   * Retorna null si no hay filtros.
   */
  private construirTextoFiltros(filtros?: FiltrosReporte): string | null {
    if (!filtros) return null;

    const partes: string[] = [];

    if (filtros.carrera) {
      partes.push(`Carrera: ${filtros.carrera}`);
    }
    if (filtros.motivo) {
      partes.push(`Actividad: ${filtros.motivo}`);
    }
    if (filtros.busqueda) {
      partes.push(`Búsqueda: "${filtros.busqueda}"`);
    }
    partes.push(...(filtros.otros ?? []));

    if (partes.length === 0) return null;

    return `Filtrado por: ${partes.join(' · ')}`;
  }

  // ═══════════════════════════════════════════════
  // RESUMEN
  // ═══════════════════════════════════════════════

  private dibujarResumen(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number,
    pageWidth: number
  ): number {
    const y = startY;

    const totalRegistros = registros.length;
    const registrosAlumnos = registros.filter(r => r.matricula !== 'INVITADO');
    const registrosVisitantes = registros.filter(r => r.matricula === 'INVITADO');
    const alumnosUnicos = new Set(registrosAlumnos.map(r => r.matricula)).size;
    const visitasVisitantes = registrosVisitantes.length;
    const carrerasUnicas = new Set(
      registrosAlumnos.map(r => r.carrera).filter(c => c && c !== 'Visitante')
    ).size;

    const boxWidth = (pageWidth - margin * 2 - 12) / 4;
    const boxHeight = 22;
    const stats = [
      { valor: totalRegistros.toString(), label: 'Total Registros' },
      { valor: alumnosUnicos.toString(), label: 'Alumnos Únicos' },
      { valor: visitasVisitantes.toString(), label: 'Visitantes' },
      { valor: carrerasUnicas.toString(), label: 'Carreras' },
    ];

    stats.forEach((stat, i) => {
      const x = margin + i * (boxWidth + 4);
      doc.setFillColor(245, 248, 250);
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 160, 175);
      doc.text(stat.valor, x + boxWidth / 2, y + 10, { align: 'center' });

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(stat.label, x + boxWidth / 2, y + 17, { align: 'center' });
    });

    return y + boxHeight + 8;
  }

  // ═══════════════════════════════════════════════
  // SECCIÓN TOP ALUMNOS (ranking destacado)
  // ═══════════════════════════════════════════════

  private dibujarTopAlumnos(
    doc: jsPDF,
    top: TopAlumnoReporte[],
    startY: number,
    margin: number
  ): number {
    // Título de sección
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Alumnos Más Frecuentes', margin, startY);

    // Subtítulo descriptivo
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${top.length} alumno${top.length === 1 ? '' : 's'} con mayor cantidad de visitas en el período`,
      margin,
      startY + 4,
    );

    const datos = top.map(t => [
      `#${t.posicion}`,
      t.matricula,
      t.nombreCompleto,
      t.carrera.length > 28 ? t.carrera.substring(0, 26) + '…' : t.carrera,
      t.totalVisitas.toString(),
      t.motivoFrecuente,
      FMT_FECHA.format(new Date(t.ultimaVisita)),
    ]);

    this._autoTable(doc, {
      startY: startY + 7,
      head: [['Pos.', 'Matrícula', 'Alumno', 'Carrera', 'Visitas', 'Actividad Frecuente', 'Última Visita']],
      body: datos,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [245, 166, 35],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [255, 250, 240] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 11, fontStyle: 'bold', textColor: [180, 120, 0] },
        1: { cellWidth: 22, fontStyle: 'bold' },
        2: { cellWidth: 42 },
        3: { cellWidth: 38 },
        4: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
        5: { cellWidth: 30 },
        6: { halign: 'center' },
      },
      // Resalta el podio (top 3) con un fondo dorado tenue
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index < 3) {
          const intensidad = [0.18, 0.12, 0.07][data.row.index];
          data.cell.styles.fillColor = [
            255,
            Math.round(248 - 20 * intensidad),
            Math.round(220 - 40 * intensidad),
          ];
        }
      },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════
  // TABLA DE REGISTROS
  // ═══════════════════════════════════════════════

  private dibujarTablaRegistros(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number,
    titulo = 'Detalle de Registros'
  ): number {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(titulo, margin, startY);

    const datos = registros.map((r, i) => {
      const fecha = new Date(r.fechaHora);
      return [
        (i + 1).toString(),
        FMT_FECHA.format(fecha),
        FMT_HORA.format(fecha),
        r.matricula,
        r.nombreCompleto,
        // `|| ''`: un respaldo viejo sin carrera tronaba todo el PDF aquí.
        (r.carrera || '').length > 25 ? r.carrera.substring(0, 23) + '...' : (r.carrera || ''),
        // Todas las actividades, como el Excel y los conteos (P2); antes solo la principal.
        (r.motivoNombres?.length ? r.motivoNombres : [r.motivoNombre]).join(', '),
      ];
    });

    this._autoTable(doc, {
      startY: startY + 3,
      head: [['#', 'Fecha', 'Hora', 'Matrícula', 'Alumno', 'Carrera', 'Actividades']],
      body: datos,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [0, 160, 175],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { halign: 'center', cellWidth: 14 },
        3: { cellWidth: 22, fontStyle: 'bold' },
        4: { cellWidth: 38 },
        5: { cellWidth: 36 },
        6: { cellWidth: 24 },
      },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════
  // RESUMEN POR CARRERA
  // ═══════════════════════════════════════════════

  private dibujarResumenCarreras(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number
  ): number {
    const porCarrera = new Map<string, { visitas: number; alumnos: Set<string> }>();
    registros.forEach(r => {
      // Excluir visitantes del resumen por carrera (no tienen carrera real)
      if (esInvitado(r)) return;
      // Misma etiqueta que Estadísticas (`analizarPorCarrera`); antes salía "undefined".
      const carrera = r.carrera || 'Sin carrera';
      const data = porCarrera.get(carrera) || { visitas: 0, alumnos: new Set() };
      data.visitas++;
      data.alumnos.add(r.matricula);
      porCarrera.set(carrera, data);
    });

    if (porCarrera.size === 0) return startY;

    const datos = Array.from(porCarrera.entries())
      .sort((a, b) => b[1].visitas - a[1].visitas)
      .map(([carrera, data]) => [
        carrera,
        data.alumnos.size.toString(),
        data.visitas.toString(),
        (data.visitas / data.alumnos.size).toFixed(1),
      ]);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen por Carrera', margin, startY);

    this._autoTable(doc, {
      startY: startY + 3,
      head: [['Carrera', 'Alumnos', 'Visitas', 'Promedio/Alumno']],
      body: datos,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center', fontStyle: 'bold' },
        3: { halign: 'center' },
      },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════
  // RESUMEN POR MOTIVO
  // ═══════════════════════════════════════════════

  private dibujarResumenMotivos(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number,
    catalogo: Motivo[] = [],
  ): number {
    // P2: cada motivo de una visita suma. El % es "de las visitas, cuántas
    // incluyeron esta actividad" y la columna puede sumar más de 100 %.
    const conteo = contarMotivos(registros, catalogo);
    if (conteo.length === 0) return startY;

    const total = registros.length;
    const datos = conteo.map(c => [
      c.nombre,
      c.cantidad.toString(),
      ((c.cantidad / total) * 100).toFixed(1) + '%',
    ]);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen por Actividad', margin, startY);

    this._autoTable(doc, {
      startY: startY + 3,
      head: [['Actividad', 'Visitas que la incluyeron', '% de las visitas']],
      body: datos,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: [245, 166, 35], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        1: { halign: 'center', fontStyle: 'bold' },
        2: { halign: 'center' },
      },
    });

    // v3.57.0: la tabla se explica sola (suma > 100 % y actividades borradas).
    let y = (doc as any).lastAutoTable.finalY + 5;
    const notas = [
      notaSumaActividades(conteo, total),
      conteo.some(c => c.eliminada)
        ? '"(actividad eliminada)": ya no está en la lista de actividades, pero esas visitas sí ocurrieron y se cuentan.'
        : null,
    ].filter((n): n is string => !!n);
    if (notas.length > 0) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(110, 110, 110);
      const ancho = doc.internal.pageSize.getWidth() - margin * 2;
      for (const nota of notas) {
        const lineas = doc.splitTextToSize(nota, ancho);
        doc.text(lineas, margin, y);
        y += lineas.length * 3.6 + 1;
      }
      y += 4;
    } else {
      y += 5;
    }
    return y;
  }

  // ═══════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════

  private dibujarFooterTodasPaginas(doc: jsPDF, pageWidth: number, margin: number): void {
    const totalPaginas = doc.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('Stenbrary — Sistema de Registro de Accesos', margin, pageHeight - 9);
      doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
    }
  }

  private verificarEspacioPagina(doc: jsPDF, y: number, espacioRequerido: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + espacioRequerido > pageHeight - 20) {
      doc.addPage();
      return 20;
    }
    return y;
  }

  private obtenerTituloDefault(opciones: OpcionesReporte): string {
    switch (opciones.tipo) {
      case 'diario': return 'Reporte Diario de Accesos';
      case 'semanal': return 'Reporte Semanal de Accesos';
      case 'mensual': return 'Reporte Mensual de Accesos';
      case 'anual': return 'Reporte Anual de Accesos';
      default: return 'Reporte de Accesos';
    }
  }

  private obtenerTextoPeriodo(opciones: OpcionesReporte): string {
    const formatear = (d: Date) => d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    if (opciones.fechaInicio && opciones.fechaFin) {
      return `Período: ${formatear(opciones.fechaInicio)} — ${formatear(opciones.fechaFin)}`;
    }

    const hoy = new Date();
    switch (opciones.tipo) {
      case 'diario': return `Fecha: ${formatear(hoy)}`;
      case 'semanal': {
        const hace7 = new Date(hoy);
        hace7.setDate(hace7.getDate() - 7);
        return `Período: ${formatear(hace7)} — ${formatear(hoy)}`;
      }
      case 'mensual': {
        const hace30 = new Date(hoy);
        hace30.setDate(hace30.getDate() - 30);
        return `Período: ${formatear(hace30)} — ${formatear(hoy)}`;
      }
      case 'anual': {
        const hace365 = new Date(hoy);
        hace365.setDate(hace365.getDate() - 365);
        return `Período: ${formatear(hace365)} — ${formatear(hoy)}`;
      }
      default: return `Fecha: ${formatear(hoy)}`;
    }
  }

  /**
   * El nombre lleva el PERÍODO del reporte. Antes todos se llamaban
   * "reporte_personalizado_stenbrary_<hoy>.pdf" y dos reportes del mismo día
   * se pisaban al descargar (ronda de pruebas 2026-10).
   */
  private generarNombreArchivo(opciones: OpcionesReporte): string {
    if (opciones.fechaInicio && opciones.fechaFin) {
      const ini = fechaLocalISO(opciones.fechaInicio);
      const fin = fechaLocalISO(opciones.fechaFin);
      return ini === fin
        ? `reporte_stenbrary_${ini}.pdf`
        : `reporte_stenbrary_${ini}_a_${fin}.pdf`;
    }
    return `reporte_${opciones.tipo}_stenbrary_${fechaLocalISO()}.pdf`;
  }

  // ═══════════════════════════════════════════════
  // CONSTANCIA DE ALUMNO (PDF individual)
  // ═══════════════════════════════════════════════

  /**
   * Genera una constancia PDF con el historial de visitas de un alumno.
   * Incluye datos personales, período, stats (visitas, horas acumuladas)
   * y tabla cronológica descendente.
   */
  async generarConstanciaAlumno(
    alumno: Alumno,
    registros: Registro[],
    opciones?: {
      nombreInstitucion?: string;
      desde?: Date;
      hasta?: Date;
      folio?: string;
    }
  ): Promise<void> {
    const { JsPDFCtor } = await this.cargarPdfLib();
    // compress: jsPDF no comprime por omisión. Con 21 mil visitas el PDF
    // pesaba 41 MB, más que el límite de adjuntos del correo (ronda de
    // pruebas 2026-10).
    const doc = new JsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;

    // Filtrar por rango si viene
    const inicio = opciones?.desde ? new Date(opciones.desde) : null;
    if (inicio) inicio.setHours(0, 0, 0, 0);
    const fin = opciones?.hasta ? new Date(opciones.hasta) : null;
    if (fin) fin.setHours(23, 59, 59, 999);

    const registrosFiltrados = registros.filter(r => {
      const f = new Date(r.fechaHora);
      if (inicio && f < inicio) return false;
      if (fin && f > fin) return false;
      return true;
    });

    // Stats
    const totalVisitas = registrosFiltrados.length;
    // La constancia certifica horas: solo cuentan las salidas REALES. Las
    // que estimó el sistema (cierre por tiempo u horario) no se certifican
    // (decisión P3, docs/AUDITORIA-2026-10.md).
    const estancia = resumirEstancia(registrosFiltrados);
    const totalMinutos = estancia.totalMinutos;
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    // ── HEADER ──
    let y = 20;
    doc.setDrawColor(0, 200, 215);
    doc.setLineWidth(1.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('STENBRARY', margin, y);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Sistema de control de acceso a biblioteca', margin, y + 6);

    const institucion = (opciones?.nombreInstitucion || '').trim();
    if (institucion) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Institución: ${institucion}`, margin, y + 11);
    }

    const ahora = new Date();
    const fechaGen = ahora.toLocaleString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${fechaGen}`, pageWidth - margin, y, { align: 'right' });
    if (opciones?.folio) {
      doc.text(`Folio: ${opciones.folio}`, pageWidth - margin, y + 5, { align: 'right' });
    }
    y += institucion ? 20 : 16;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CONSTANCIA DE VISITAS A BIBLIOTECA', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // ── DATOS DEL ALUMNO ──
    const nombreCompleto = `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`.trim();

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    const introParrafo =
      `Por medio de la presente se hace constar que el/la alumno(a) ` +
      `${nombreCompleto}, con matrícula ${alumno.matricula} de la carrera de ` +
      `${alumno.carrera} (${alumno.grado}° ${alumno.grupo}, turno ${alumno.turno}), ` +
      `ha acudido a la biblioteca conforme al detalle que se presenta a continuación.`;

    const lineasIntro = doc.splitTextToSize(introParrafo, pageWidth - margin * 2);
    doc.text(lineasIntro, margin, y);
    y += lineasIntro.length * 5 + 4;

    // Período
    const formatear = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    let textoPeriodo: string;
    if (inicio && fin) {
      textoPeriodo = `Período: ${formatear(inicio)} — ${formatear(fin)}`;
    } else if (registrosFiltrados.length > 0) {
      const fechas = registrosFiltrados.map(r => new Date(r.fechaHora).getTime());
      textoPeriodo = `Período: ${formatear(new Date(Math.min(...fechas)))} — ${formatear(new Date(Math.max(...fechas)))}`;
    } else {
      textoPeriodo = 'Período: sin registros';
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(textoPeriodo, margin, y);
    y += 8;

    // ── STATS ──
    const statBoxW = (pageWidth - margin * 2 - 8) / 3;
    const statBoxH = 20;
    const dibujarStat = (x: number, etiqueta: string, valor: string) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, statBoxW, statBoxH, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(etiqueta, x + 4, y + 6);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(valor, x + 4, y + 15);
    };

    dibujarStat(margin, 'Visitas totales', String(totalVisitas));
    dibujarStat(margin + statBoxW + 4, 'Horas acumuladas', `${horas}h ${minutos}m`);
    dibujarStat(margin + (statBoxW + 4) * 2, 'Visitas con salida registrada', `${estancia.visitasMedidas}`);
    y += statBoxH + 8;

    // ── TABLA ──
    if (registrosFiltrados.length > 0) {
      const filas = registrosFiltrados
        .slice()
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
        .map(r => {
          const fecha = new Date(r.fechaHora);
          const motivo = r.motivoNombres?.join(', ') || r.motivoNombre || '—';
          const entrada = FMT_HORA.format(fecha);
          const salida = r.horaSalida
            ? FMT_HORA.format(new Date(r.horaSalida))
            : '—';
          const real = duracionReal(r);
          const dur = real !== null
            ? (real >= 60 ? `${Math.floor(real / 60)}h ${real % 60}m` : `${real}m`)
            : (r.horaSalida && esSalidaEstimada(r) ? 'sin registrar' : '—');
          return [
            FMT_FECHA_2D.format(fecha),
            entrada,
            salida,
            dur,
            motivo,
          ];
        });

      this._autoTable(doc, {
        startY: y,
        head: [['Fecha', 'Entrada', 'Salida', 'Duración', 'Actividad']],
        body: filas,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 200, 215], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
        },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Sin visitas registradas en el período.', margin, y);
      y += 10;
    }

    // ── CIERRE / FIRMA ──
    y = this.verificarEspacioPagina(doc, y, 40);
    y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Se extiende la presente constancia a los ${ahora.getDate()} días del mes de ` +
      `${ahora.toLocaleDateString('es-MX', { month: 'long' })} de ${ahora.getFullYear()}.`,
      margin, y
    );
    y += 20;

    // Línea de firma
    const anchoFirma = 70;
    const xFirma = (pageWidth - anchoFirma) / 2;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    doc.line(xFirma, y, xFirma + anchoFirma, y);
    y += 5;
    doc.setFontSize(9);
    doc.text('Coordinación de Biblioteca', pageWidth / 2, y, { align: 'center' });

    // Footer
    this.dibujarFooterTodasPaginas(doc, pageWidth, margin);

    const fechaSlug = fechaLocalISO(ahora);
    doc.save(`constancia_${alumno.matricula}_${fechaSlug}.pdf`);
  }
}
