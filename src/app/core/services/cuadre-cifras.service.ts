// ╔══════════════════════════════════════════════════════╗
// ║  cuadre-cifras.service.ts                            ║
// ║  Stenbrary v3.57.0 — Autoverificación de cifras      ║
// ║                                                      ║
// ║  Pedido del usuario: "el miedo es que el coordinador  ║
// ║  tenga información falsa". Las cifras de cada         ║
// ║  pantalla salen por caminos distintos (el índice de   ║
// ║  la base, la caché de Estadísticas, las barras, el    ║
// ║  mapa de calor, las carreras). Si un día uno se       ║
// ║  desvía, aquí se ve en rojo en vez de descubrirlo     ║
// ║  en un reporte entregado.                             ║
// ║                                                      ║
// ║  Se corre a petición desde Diagnóstico. No corrige    ║
// ║  nada: compara y avisa.                               ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { EstadisticasAvanzadasService, RangoFechas } from './estadisticas-avanzadas.service';
import { desplazarDias } from '../utils/tiempo.utils';
import { esInvitado } from '../utils/estadisticas.utils';

export interface ComprobacionCifra {
  periodo: string;
  /** Qué se compara, en palabras del coordinador. */
  descripcion: string;
  esperado: number;
  obtenido: number;
  ok: boolean;
}

/** Arma una comprobación: `esperado` es la cifra de referencia (el total). */
export function comprobar(periodo: string, descripcion: string, esperado: number, obtenido: number): ComprobacionCifra {
  return { periodo, descripcion, esperado, obtenido, ok: esperado === obtenido };
}

const suma = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

@Injectable({ providedIn: 'root' })
export class CuadreCifrasService {
  private readonly db = inject(DatabaseService);
  private readonly stats = inject(EstadisticasAvanzadasService);

  async verificar(ahora: Date = new Date()): Promise<ComprobacionCifra[]> {
    const finHoy = new Date(ahora);
    finHoy.setHours(23, 59, 59, 999);
    const inicioHoy = new Date(ahora);
    inicioHoy.setHours(0, 0, 0, 0);

    const periodos: { nombre: string; rango: RangoFechas }[] = [
      { nombre: 'Hoy', rango: { inicio: inicioHoy, fin: finHoy } },
      { nombre: 'Últimos 7 días', rango: { inicio: desplazarDias(inicioHoy, -6), fin: finHoy } },
      { nombre: 'Este mes', rango: { inicio: new Date(ahora.getFullYear(), ahora.getMonth(), 1), fin: finHoy } },
      { nombre: 'Todo el historial', rango: await this.stats.crearRangoHistorico() },
    ];

    const resultado: ComprobacionCifra[] = [];
    for (const { nombre, rango } of periodos) {
      // Referencia: lo que cuenta la base directamente (el mismo camino que
      // "Eliminar registros" y la lista de Registros por fechas).
      const base = await this.db.contarRegistrosPorRango(rango.inicio, rango.fin);

      const total = await this.stats.contarRegistrosEnRango(rango);
      resultado.push(comprobar(nombre, 'Total de Estadísticas = registros guardados en esas fechas', base, total));

      const barras = await this.stats.obtenerRegistrosPorRango(rango);
      resultado.push(comprobar(nombre, 'Suma de las barras de la gráfica de visitas = total', base, suma(barras.cantidades)));

      const mapa = await this.stats.generarHeatmap(0, rango);
      resultado.push(comprobar(nombre, 'Suma del mapa de calor = total', base, suma(mapa.data.map(d => d.cantidad))));

      const crudos = await this.stats.obtenerRegistrosCrudos(rango);
      const invitados = crudos.filter(esInvitado).length;
      const carreras = await this.stats.analizarPorCarrera(rango);
      resultado.push(comprobar(nombre, 'Visitas por carrera + visitantes = total', base,
        suma(carreras.map(c => c.totalVisitas)) + invitados));

      const motivos = await this.stats.obtenerDistribucionMotivos(rango);
      // Cada visita tiene al menos una actividad, así que ninguna actividad
      // puede estar en más visitas que el total, y el denominador es el total.
      resultado.push(comprobar(nombre, 'Visitas de la gráfica de actividades = total', base, motivos.totalVisitas));
      const sinActividad = crudos.filter(r => !(r.motivoIds?.length || r.motivoId || r.motivoNombre)).length;
      resultado.push(comprobar(nombre, 'Visitas sin ninguna actividad', 0, sinActividad));

      if (nombre === 'Hoy') {
        const resumen = (await this.db.obtenerRegistrosDeHoy()).length;
        resultado.push(comprobar(nombre, 'Visitas del Resumen = total de hoy', base, resumen));
      }
    }
    return resultado;
  }
}
