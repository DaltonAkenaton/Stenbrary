// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/report.service.ts       ║
// ║  Stenbrary v3.6 — Reportes PDF con filtros visibles   ║
// ║                                                      ║
// ║  MEJORA: El PDF muestra qué filtros se aplicaron      ║
// ║  Ej: "Filtrado por: Carrera = Lic. en TI,            ║
// ║       Actividad = Estudiar"                           ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Registro } from '../models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type TipoReporte = 'diario' | 'semanal' | 'mensual' | 'personalizado';

export interface FiltrosReporte {
  busqueda?: string;
  carrera?: string;
  motivo?: string;
}

export interface OpcionesReporte {
  tipo: TipoReporte;
  fechaInicio?: Date;
  fechaFin?: Date;
  titulo?: string;
  filtros?: FiltrosReporte;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {

  constructor(private databaseService: DatabaseService) {}

  async generarReporteAccesos(
    registros: Registro[],
    opciones: OpcionesReporte
  ): Promise<void> {
    const doc = new jsPDF('portrait', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;

    let y = this.dibujarHeader(doc, opciones, pageWidth, margin);
    y = this.dibujarResumen(doc, registros, y, margin, pageWidth);
    y = this.dibujarTablaRegistros(doc, registros, y, margin);

    y = this.verificarEspacioPagina(doc, y, 60);
    y = this.dibujarResumenCarreras(doc, registros, y, margin, pageWidth);

    y = this.verificarEspacioPagina(doc, y, 60);
    y = this.dibujarResumenMotivos(doc, registros, y, margin, pageWidth);

    this.dibujarFooterTodasPaginas(doc, pageWidth, margin);

    const nombreArchivo = this.generarNombreArchivo(opciones);
    doc.save(nombreArchivo);
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
    let y = startY;

    const totalRegistros = registros.length;
    const matriculasUnicas = new Set(registros.map(r => r.matricula)).size;
    const carrerasUnicas = new Set(registros.map(r => r.carrera)).size;
    const motivosUnicos = new Set(registros.map(r => r.motivoNombre)).size;

    const boxWidth = (pageWidth - margin * 2 - 12) / 4;
    const boxHeight = 22;
    const stats = [
      { valor: totalRegistros.toString(), label: 'Total Registros' },
      { valor: matriculasUnicas.toString(), label: 'Alumnos Únicos' },
      { valor: carrerasUnicas.toString(), label: 'Carreras' },
      { valor: motivosUnicos.toString(), label: 'Actividades' },
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
  // TABLA DE REGISTROS
  // ═══════════════════════════════════════════════

  private dibujarTablaRegistros(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number
  ): number {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Detalle de Registros', margin, startY);

    const datos = registros.map((r, i) => {
      const fecha = new Date(r.fechaHora);
      return [
        (i + 1).toString(),
        fecha.toLocaleDateString('es-MX'),
        fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        r.matricula,
        r.nombreCompleto,
        r.carrera.length > 25 ? r.carrera.substring(0, 23) + '...' : r.carrera,
        r.motivoNombre,
      ];
    });

    autoTable(doc, {
      startY: startY + 3,
      head: [['#', 'Fecha', 'Hora', 'Matrícula', 'Alumno', 'Carrera', 'Actividad']],
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
    margin: number,
    pageWidth: number
  ): number {
    const porCarrera = new Map<string, { visitas: number; alumnos: Set<string> }>();
    registros.forEach(r => {
      const data = porCarrera.get(r.carrera) || { visitas: 0, alumnos: new Set() };
      data.visitas++;
      data.alumnos.add(r.matricula);
      porCarrera.set(r.carrera, data);
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

    autoTable(doc, {
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
    pageWidth: number
  ): number {
    const porMotivo = new Map<string, number>();
    registros.forEach(r => {
      porMotivo.set(r.motivoNombre, (porMotivo.get(r.motivoNombre) || 0) + 1);
    });

    if (porMotivo.size === 0) return startY;

    const total = registros.length;
    const datos = Array.from(porMotivo.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([motivo, cantidad]) => [
        motivo,
        cantidad.toString(),
        ((cantidad / total) * 100).toFixed(1) + '%',
      ]);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen por Actividad', margin, startY);

    autoTable(doc, {
      startY: startY + 3,
      head: [['Actividad', 'Registros', '% del Total']],
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

    return (doc as any).lastAutoTable.finalY + 10;
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
      default: return `Fecha: ${formatear(hoy)}`;
    }
  }

  private generarNombreArchivo(opciones: OpcionesReporte): string {
    const fecha = new Date().toISOString().split('T')[0];
    return `reporte_${opciones.tipo}_stenbrary_${fecha}.pdf`;
  }
}