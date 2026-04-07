// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/                        ║
// ║        estadisticas-avanzadas.service.ts             ║
// ║  Stenbrary v3.5 — Con datos para gráficas            ║
// ║                                                      ║
// ║  NUEVO v3.5:                                         ║
// ║  - obtenerRegistrosPorDia() → barras diarias         ║
// ║  - obtenerDistribucionMotivos() → dona               ║
// ║  - analizarPorCarrera() mejorado → barras horiz.     ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Registro, Alumno } from '../models';

export interface TendenciaComparativa {
  actual: number;
  anterior: number;
  cambio: number;
  porcentajeCambio: number;
  direccion: 'up' | 'down' | 'igual';
}

export interface HeatmapData {
  dia: string;
  hora: number;
  cantidad: number;
}

export interface TopAlumno {
  alumno: Alumno;
  totalVisitas: number;
  ultimaVisita: Date;
  motivoFrecuente: string;
}

export interface Insight {
  tipo: 'warning' | 'info' | 'success';
  icono: string;
  titulo: string;
  descripcion: string;
}

/** NUEVO: Datos para gráfica de barras diarias */
export interface DatosDiarios {
  etiquetas: string[];      // ['Lun 24', 'Mar 25', ...]
  cantidades: number[];     // [5, 12, 8, ...]
}

/** NUEVO: Datos para gráfica de dona/motivos */
export interface DistribucionMotivos {
  etiquetas: string[];      // ['Estudiar', 'Trabajo escolar', ...]
  cantidades: number[];     // [15, 8, ...]
  colores: string[];        // ['#00C8D7', '#0BC4B7', ...]
}

/** NUEVO: Datos para gráfica de carreras */
export interface DatosCarrera {
  carrera: string;
  totalVisitas: number;
  alumnosActivos: number;
  promedioVisitasPorAlumno: number;
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasAvanzadasService {

  // Cache para evitar cargas múltiples en paralelo (8 queries simultáneas)
  private registrosCache: Registro[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 15_000; // 15 segundos

  constructor(private databaseService: DatabaseService) {}

  /** Obtiene todos los registros con caché de corta duración */
  private async obtenerRegistrosConCache(): Promise<Registro[]> {
    const ahora = Date.now();
    if (this.registrosCache && (ahora - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.registrosCache;
    }
    this.registrosCache = await this.obtenerRegistrosConCache();
    this.cacheTimestamp = ahora;
    return this.registrosCache;
  }

  /** Invalida el caché manualmente */
  invalidarCache(): void {
    this.registrosCache = null;
    this.cacheTimestamp = 0;
  }

  // ═══════════════════════════════════════════════
  // DATOS PARA GRÁFICAS (NUEVO v3.5)
  // ═══════════════════════════════════════════════

  /**
   * Registros por día de los últimos N días.
   * Para gráfica de barras.
   */
  async obtenerRegistrosPorDia(dias: number = 7): Promise<DatosDiarios> {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    const todosRegistros = await this.obtenerRegistrosConCache();

    const etiquetas: string[] = [];
    const cantidades: number[] = [];
    const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);
      fecha.setHours(0, 0, 0, 0);

      const fin = new Date(fecha);
      fin.setHours(23, 59, 59, 999);

      const cantidad = todosRegistros.filter(r => {
        const f = new Date(r.fechaHora);
        return f >= fecha && f <= fin;
      }).length;

      const diaCorto = diasCortos[fecha.getDay()];
      const numDia = fecha.getDate();
      etiquetas.push(`${diaCorto} ${numDia}`);
      cantidades.push(cantidad);
    }

    return { etiquetas, cantidades };
  }

  /**
   * Distribución por motivos en los últimos N días.
   * Para gráfica de dona.
   */
  async obtenerDistribucionMotivos(dias: number = 30): Promise<DistribucionMotivos> {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - dias);

    const todosRegistros = await this.obtenerRegistrosConCache();
    const motivos = await this.databaseService.obtenerTodosLosMotivos();

    const registrosPeriodo = todosRegistros.filter(r =>
      new Date(r.fechaHora) >= inicio
    );

    // Contar por motivo
    const conteo = new Map<string, number>();
    registrosPeriodo.forEach(r => {
      const nombre = r.motivoNombre || 'Sin motivo';
      conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
    });

    // Ordenar de mayor a menor
    const ordenado = Array.from(conteo.entries())
      .sort((a, b) => b[1] - a[1]);

    // Mapear colores de los motivos
    const coloresPaleta = [
      '#00C8D7', '#0BC4B7', '#0EB07B', '#34D399',
      '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
      '#F05252', '#F97316', '#F5A623', '#5DE4EC',
    ];

    const etiquetas: string[] = [];
    const cantidades: number[] = [];
    const colores: string[] = [];

    ordenado.forEach(([nombre, cantidad], index) => {
      etiquetas.push(nombre);
      cantidades.push(cantidad);

      // Buscar color del motivo, si no hay usar paleta cíclica
      const motivoDB = motivos.find(m => m.nombre === nombre);
      colores.push(motivoDB?.color || coloresPaleta[index % coloresPaleta.length]);
    });

    return { etiquetas, cantidades, colores };
  }

  // ═══════════════════════════════════════════════
  // MÉTODOS EXISTENTES (sin cambios)
  // ═══════════════════════════════════════════════

  async compararTendencias(
    diasActual: number = 7,
    diasAnterior: number = 7
  ): Promise<TendenciaComparativa> {
    const hoy = new Date();

    const inicioActual = new Date(hoy);
    inicioActual.setDate(hoy.getDate() - diasActual);

    const inicioAnterior = new Date(inicioActual);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasAnterior);
    const finAnterior = new Date(inicioActual);
    finAnterior.setDate(finAnterior.getDate() - 1);

    const todosRegistros = await this.obtenerRegistrosConCache();

    const registrosActuales = todosRegistros.filter(r => {
      const fecha = new Date(r.fechaHora);
      return fecha >= inicioActual && fecha <= hoy;
    });

    const registrosAnteriores = todosRegistros.filter(r => {
      const fecha = new Date(r.fechaHora);
      return fecha >= inicioAnterior && fecha <= finAnterior;
    });

    const actual = registrosActuales.length;
    const anterior = registrosAnteriores.length;
    const cambio = actual - anterior;
    const porcentajeCambio = anterior > 0 ? (cambio / anterior) * 100 : 0;

    let direccion: 'up' | 'down' | 'igual' = 'igual';
    if (cambio > 0) direccion = 'up';
    if (cambio < 0) direccion = 'down';

    return { actual, anterior, cambio, porcentajeCambio, direccion };
  }

  async generarHeatmap(diasPeriodo: number = 30): Promise<HeatmapData[]> {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - diasPeriodo);

    const todosRegistros = await this.obtenerRegistrosConCache();
    const registrosPeriodo = todosRegistros.filter(r => {
      const fecha = new Date(r.fechaHora);
      return fecha >= inicio && fecha <= hoy;
    });

    const heatmapMap = new Map<string, number>();

    registrosPeriodo.forEach(registro => {
      const fecha = new Date(registro.fechaHora);
      const dia = this.obtenerNombreDia(fecha.getDay());
      const hora = fecha.getHours();
      const key = `${dia}-${hora}`;
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
    });

    const heatmapData: HeatmapData[] = [];
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    diasSemana.forEach(dia => {
      for (let hora = 7; hora <= 21; hora++) {
        const key = `${dia}-${hora}`;
        heatmapData.push({ dia, hora, cantidad: heatmapMap.get(key) || 0 });
      }
    });

    return heatmapData;
  }

  async obtenerTopAlumnos(limite: number = 10, dias?: number): Promise<TopAlumno[]> {
    let registrosFiltrados = await this.obtenerRegistrosConCache();
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();

    if (dias) {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - dias);
      registrosFiltrados = registrosFiltrados.filter(r => new Date(r.fechaHora) >= inicio);
    }

    const registrosPorMatricula = new Map<string, Registro[]>();

    registrosFiltrados.forEach(registro => {
      const registros = registrosPorMatricula.get(registro.matricula) || [];
      registros.push(registro);
      registrosPorMatricula.set(registro.matricula, registros);
    });

    const topAlumnos: TopAlumno[] = [];

    registrosPorMatricula.forEach((registros, matricula) => {
      const alumno = todosAlumnos.find(a => a.matricula === matricula);
      if (!alumno) return;

      const motivosCount = new Map<string, number>();
      registros.forEach(r => {
        motivosCount.set(r.motivoNombre, (motivosCount.get(r.motivoNombre) || 0) + 1);
      });

      let motivoFrecuente = 'N/A';
      let maxCount = 0;
      motivosCount.forEach((count, motivo) => {
        if (count > maxCount) {
          maxCount = count;
          motivoFrecuente = motivo;
        }
      });

      const ultimaVisita = new Date(
        Math.max(...registros.map(r => new Date(r.fechaHora).getTime()))
      );

      topAlumnos.push({ alumno, totalVisitas: registros.length, ultimaVisita, motivoFrecuente });
    });

    return topAlumnos.sort((a, b) => b.totalVisitas - a.totalVisitas).slice(0, limite);
  }

  async generarInsights(dias: number = 30): Promise<Insight[]> {
    const insights: Insight[] = [];

    const tendencia = await this.compararTendencias(dias, dias);
    if (tendencia.direccion === 'up' && tendencia.porcentajeCambio > 10) {
      insights.push({
        tipo: 'success',
        icono: 'trending_up',
        titulo: 'Tendencia al Alza',
        descripcion: `Las visitas aumentaron ${tendencia.porcentajeCambio.toFixed(1)}% en este período comparado con el anterior`,
      });
    } else if (tendencia.direccion === 'down' && Math.abs(tendencia.porcentajeCambio) > 10) {
      insights.push({
        tipo: 'warning',
        icono: 'trending_down',
        titulo: 'Disminución de Visitas',
        descripcion: `Las visitas disminuyeron ${Math.abs(tendencia.porcentajeCambio).toFixed(1)}% en este período`,
      });
    }

    const heatmap = await this.generarHeatmap(dias);
    const horaPico = this.encontrarHoraPico(heatmap);
    if (horaPico) {
      insights.push({
        tipo: 'info',
        icono: 'schedule',
        titulo: 'Hora Pico Detectada',
        descripcion: `${horaPico.dia} a las ${horaPico.hora}:00 hrs es el momento más concurrido (${horaPico.cantidad} visitas)`,
      });
    }

    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    const alumnosActivos = todosAlumnos.filter(a => a.activo);
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    let alumnosSinVisitasRecientes = 0;
    for (const alumno of alumnosActivos) {
      const registros = await this.databaseService.obtenerRegistrosPorAlumno(alumno.matricula);
      const tieneVisitasRecientes = registros.some(r => new Date(r.fechaHora) > hace30Dias);
      if (!tieneVisitasRecientes && registros.length > 0) {
        alumnosSinVisitasRecientes++;
      }
    }

    if (alumnosSinVisitasRecientes > 0) {
      insights.push({
        tipo: 'info',
        icono: 'people_outline',
        titulo: 'Alumnos Inactivos',
        descripcion: `${alumnosSinVisitasRecientes} alumnos no han visitado en los últimos 30 días`,
      });
    }

    return insights;
  }

  async analizarPorCarrera(dias?: number): Promise<DatosCarrera[]> {
    let registrosFiltrados = await this.obtenerRegistrosConCache();

    if (dias) {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - dias);
      registrosFiltrados = registrosFiltrados.filter(r => new Date(r.fechaHora) >= inicio);
    }

    const carrerasMap = new Map<string, { visitas: number; alumnos: Set<string> }>();

    registrosFiltrados.forEach(registro => {
      const data = carrerasMap.get(registro.carrera) || { visitas: 0, alumnos: new Set() };
      data.visitas++;
      data.alumnos.add(registro.matricula);
      carrerasMap.set(registro.carrera, data);
    });

    return Array.from(carrerasMap.entries())
      .map(([carrera, data]) => ({
        carrera,
        totalVisitas: data.visitas,
        alumnosActivos: data.alumnos.size,
        promedioVisitasPorAlumno: parseFloat((data.visitas / data.alumnos.size).toFixed(1)),
      }))
      .sort((a, b) => b.totalVisitas - a.totalVisitas);
  }

  async predecirDiaOcupado(dias: number = 30): Promise<string> {
    const heatmap = await this.generarHeatmap(dias);
    const visitasPorDia = new Map<string, number>();
    heatmap.forEach(item => {
      visitasPorDia.set(item.dia, (visitasPorDia.get(item.dia) || 0) + item.cantidad);
    });

    let diaOcupado = 'Lunes';
    let maxVisitas = 0;
    visitasPorDia.forEach((visitas, dia) => {
      if (visitas > maxVisitas) {
        maxVisitas = visitas;
        diaOcupado = dia;
      }
    });

    return diaOcupado;
  }

  private obtenerNombreDia(dia: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dia];
  }

  private encontrarHoraPico(heatmap: HeatmapData[]): HeatmapData | null {
    if (heatmap.length === 0) return null;
    return heatmap.reduce((max, current) => current.cantidad > max.cantidad ? current : max);
  }
}