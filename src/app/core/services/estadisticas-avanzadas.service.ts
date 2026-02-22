// ==============================================================================
// RUTA: src/app/core/services/estadisticas-avanzadas.service.ts
// ==============================================================================

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

@Injectable({
  providedIn: 'root'
})
export class EstadisticasAvanzadasService {

  constructor(private databaseService: DatabaseService) {}

  /**
   * Comparar tendencias entre dos períodos
   */
  async compararTendencias(
    diasActual: number = 7,
    diasAnterior: number = 7
  ): Promise<TendenciaComparativa> {
    const hoy = new Date();
    
    // Período actual
    const inicioActual = new Date(hoy);
    inicioActual.setDate(hoy.getDate() - diasActual);
    
    // Período anterior
    const inicioAnterior = new Date(inicioActual);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasAnterior);
    const finAnterior = new Date(inicioActual);
    finAnterior.setDate(finAnterior.getDate() - 1);
    
    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    
    // Registros período actual
    const registrosActuales = todosRegistros.filter(r => {
      const fecha = new Date(r.fechaHora);
      return fecha >= inicioActual && fecha <= hoy;
    });
    
    // Registros período anterior
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
    
    return {
      actual,
      anterior,
      cambio,
      porcentajeCambio,
      direccion
    };
  }

  /**
   * Generar datos para heatmap (días x horas)
   */
  async generarHeatmap(diasPeriodo: number = 30): Promise<HeatmapData[]> {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - diasPeriodo);
    
    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    const registrosPeriodo = todosRegistros.filter(r => {
      const fecha = new Date(r.fechaHora);
      return fecha >= inicio && fecha <= hoy;
    });
    
    // Agrupar por día de la semana y hora
    const heatmapMap = new Map<string, number>();
    
    registrosPeriodo.forEach(registro => {
      const fecha = new Date(registro.fechaHora);
      const dia = this.obtenerNombreDia(fecha.getDay());
      const hora = fecha.getHours();
      const key = `${dia}-${hora}`;
      
      const count = heatmapMap.get(key) || 0;
      heatmapMap.set(key, count + 1);
    });
    
    // Convertir a array
    const heatmapData: HeatmapData[] = [];
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    diasSemana.forEach(dia => {
      for (let hora = 7; hora <= 21; hora++) {
        const key = `${dia}-${hora}`;
        heatmapData.push({
          dia,
          hora,
          cantidad: heatmapMap.get(key) || 0
        });
      }
    });
    
    return heatmapData;
  }

  /**
   * Obtener top alumnos más frecuentes
   */
  async obtenerTopAlumnos(limite: number = 10): Promise<TopAlumno[]> {
    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    
    // Agrupar registros por matrícula
    const registrosPorMatricula = new Map<string, Registro[]>();
    
    todosRegistros.forEach(registro => {
      const registros = registrosPorMatricula.get(registro.matricula) || [];
      registros.push(registro);
      registrosPorMatricula.set(registro.matricula, registros);
    });
    
    // Crear top alumnos
    const topAlumnos: TopAlumno[] = [];
    
    registrosPorMatricula.forEach((registros, matricula) => {
      const alumno = todosAlumnos.find(a => a.matricula === matricula);
      if (!alumno) return;
      
      // Calcular motivo más frecuente
      const motivosCount = new Map<string, number>();
      registros.forEach(r => {
        const count = motivosCount.get(r.motivoNombre) || 0;
        motivosCount.set(r.motivoNombre, count + 1);
      });
      
      let motivoFrecuente = 'N/A';
      let maxCount = 0;
      motivosCount.forEach((count, motivo) => {
        if (count > maxCount) {
          maxCount = count;
          motivoFrecuente = motivo;
        }
      });
      
      // Última visita
      const ultimaVisita = new Date(
        Math.max(...registros.map(r => new Date(r.fechaHora).getTime()))
      );
      
      topAlumnos.push({
        alumno,
        totalVisitas: registros.length,
        ultimaVisita,
        motivoFrecuente
      });
    });
    
    // Ordenar por total de visitas descendente
    return topAlumnos
      .sort((a, b) => b.totalVisitas - a.totalVisitas)
      .slice(0, limite);
  }

  /**
   * Generar insights automáticos
   */
  async generarInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    // Tendencia semanal
    const tendencia = await this.compararTendencias(7, 7);
    if (tendencia.direccion === 'up' && tendencia.porcentajeCambio > 10) {
      insights.push({
        tipo: 'success',
        icono: 'trending_up',
        titulo: 'Tendencia al Alza',
        descripcion: `Las visitas aumentaron ${tendencia.porcentajeCambio.toFixed(1)}% esta semana comparado con la anterior`
      });
    } else if (tendencia.direccion === 'down' && Math.abs(tendencia.porcentajeCambio) > 10) {
      insights.push({
        tipo: 'warning',
        icono: 'trending_down',
        titulo: 'Disminución de Visitas',
        descripcion: `Las visitas disminuyeron ${Math.abs(tendencia.porcentajeCambio).toFixed(1)}% esta semana`
      });
    }
    
    // Hora pico
    const heatmap = await this.generarHeatmap(30);
    const horaPico = this.encontrarHoraPico(heatmap);
    if (horaPico) {
      insights.push({
        tipo: 'info',
        icono: 'schedule',
        titulo: 'Hora Pico Detectada',
        descripcion: `${horaPico.dia} a las ${horaPico.hora}:00 hrs es el momento más concurrido (${horaPico.cantidad} visitas promedio)`
      });
    }
    
    // Alumnos inactivos
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
        descripcion: `${alumnosSinVisitasRecientes} alumnos no han visitado en los últimos 30 días`
      });
    }
    
    return insights;
  }

  /**
   * Análisis por carrera
   */
  async analizarPorCarrera(): Promise<{
    carrera: string;
    totalVisitas: number;
    alumnosActivos: number;
    promedioVisitasPorAlumno: number;
  }[]> {
    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    
    const carrerasMap = new Map<string, {
      visitas: number;
      alumnos: Set<string>;
    }>();
    
    todosRegistros.forEach(registro => {
      const data = carrerasMap.get(registro.carrera) || {
        visitas: 0,
        alumnos: new Set()
      };
      
      data.visitas++;
      data.alumnos.add(registro.matricula);
      carrerasMap.set(registro.carrera, data);
    });
    
    const resultado = Array.from(carrerasMap.entries()).map(([carrera, data]) => ({
      carrera,
      totalVisitas: data.visitas,
      alumnosActivos: data.alumnos.size,
      promedioVisitasPorAlumno: data.visitas / data.alumnos.size
    }));
    
    return resultado.sort((a, b) => b.totalVisitas - a.totalVisitas);
  }

  /**
   * Predecir día ocupado
   */
  async predecirDiaOcupado(): Promise<string> {
    const heatmap = await this.generarHeatmap(30);
    
    // Agrupar por día
    const visitasPorDia = new Map<string, number>();
    heatmap.forEach(item => {
      const total = visitasPorDia.get(item.dia) || 0;
      visitasPorDia.set(item.dia, total + item.cantidad);
    });
    
    // Encontrar día con más visitas
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

  // Helpers privados

  private obtenerNombreDia(dia: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dia];
  }

  private encontrarHoraPico(heatmap: HeatmapData[]): HeatmapData | null {
    if (heatmap.length === 0) return null;
    
    return heatmap.reduce((max, current) => 
      current.cantidad > max.cantidad ? current : max
    );
  }
}