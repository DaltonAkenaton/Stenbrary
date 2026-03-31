// ╔══════════════════════════════════════════════════════╗
// ║  dashboard.component.ts                              ║
// ║  Stenbrary v3.6.2 — Resumen / Vista General          ║
// ║                                                      ║
// ║  Alineado con dashboard.component.html v3.5.1:       ║
// ║  - saludo dinámico según hora del día                 ║
// ║  - Auto-refresh toggleable con indicador visual       ║
// ║  - Estado "actualizando" para spinner del botón       ║
// ║  - Accesos rápidos a todas las secciones              ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Registro, Motivo } from '../../core/models';

interface QuickStat {
  icono: string;
  valor: number;
  etiqueta: string;
  subtexto: string;
  tooltip: string;
  color: string;
  ruta: string;
}

interface ActividadHoy {
  nombre: string;
  icono: string;
  color: string;
  cantidad: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {

  cargando = true;

  // ─── Saludo dinámico ────────────────────────────────────
  saludo = '';

  // ─── Stats principales ──────────────────────────────────
  stats: QuickStat[] = [];

  // ─── Actividades de hoy (top motivos) ───────────────────
  actividadesHoy: ActividadHoy[] = [];

  // ─── Últimos 5 registros ────────────────────────────────
  ultimosRegistros: Registro[] = [];

  // ─── Hora del último registro ───────────────────────────
  ultimoRegistroHora = '';

  // ─── Auto-refresh ───────────────────────────────────────
  autoRefreshActivo = true;
  actualizando = false;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly REFRESH_MS = 30_000; // 30 segundos

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
  ) {}

  // ═══════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════

  async ngOnInit(): Promise<void> {
    this.generarSaludo();
    await this.cargarDatos();
    this.iniciarAutoRefresh();
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  // ═══════════════════════════════════════════════
  // SALUDO DINÁMICO
  // ═══════════════════════════════════════════════

  private generarSaludo(): void {
    const hora = new Date().getHours();

    if (hora >= 5 && hora < 12) {
      this.saludo = 'Buenos días';
    } else if (hora >= 12 && hora < 18) {
      this.saludo = 'Buenas tardes';
    } else {
      this.saludo = 'Buenas noches';
    }
  }

  // ═══════════════════════════════════════════════
  // AUTO-REFRESH
  // ═══════════════════════════════════════════════

  toggleAutoRefresh(): void {
    this.autoRefreshActivo = !this.autoRefreshActivo;

    if (this.autoRefreshActivo) {
      this.iniciarAutoRefresh();
    } else {
      this.detenerAutoRefresh();
    }
  }

  private iniciarAutoRefresh(): void {
    this.detenerAutoRefresh(); // Limpiar cualquier interval previo

    if (this.autoRefreshActivo) {
      this.refreshInterval = setInterval(async () => {
        await this.cargarDatos(true);
      }, this.REFRESH_MS);
    }
  }

  private detenerAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // ═══════════════════════════════════════════════
  // CARGA DE DATOS
  // ═══════════════════════════════════════════════

  async cargarDatos(silencioso = false): Promise<void> {
    try {
      if (!silencioso) {
        this.cargando = true;
      } else {
        this.actualizando = true;
      }

      const [alumnos, registrosHoy, todosRegistros, motivos] = await Promise.all([
        this.databaseService.obtenerTodosLosAlumnos(),
        this.databaseService.obtenerRegistrosDeHoy(),
        this.databaseService.obtenerTodosLosRegistros(),
        this.databaseService.obtenerMotivosActivos(),
      ]);

      // Stats cards
      this.stats = [
        {
          icono: 'today',
          valor: registrosHoy.length,
          etiqueta: 'Accesos hoy',
          subtexto: 'entradas registradas hoy',
          tooltip: 'Cuántos alumnos han ingresado a la biblioteca el día de hoy. Se reinicia a medianoche.',
          color: '#00C8D7',
          ruta: '/registros',
        },
        {
          icono: 'groups',
          valor: alumnos.length,
          etiqueta: 'Alumnos registrados',
          subtexto: 'en el sistema',
          tooltip: 'Total de alumnos dados de alta en el sistema. Puedes agregar más en "Registrar Alumno" o importar desde Excel.',
          color: '#0BC4B7',
          ruta: '/alumnos',
        },
        {
          icono: 'history',
          valor: todosRegistros.length,
          etiqueta: 'Visitas en total',
          subtexto: 'desde el inicio del sistema',
          tooltip: 'Número acumulado de accesos desde que se instaló el sistema. Incluye todos los días.',
          color: '#5DE4EC',
          ruta: '/registros',
        },
        {
          icono: 'category',
          valor: motivos.length,
          etiqueta: 'Tipos de actividad',
          subtexto: 'opciones de registro',
          tooltip: 'Actividades disponibles para que los alumnos elijan al ingresar (lectura, tareas, investigación, etc.). Gestiónalas en "Gestión de Motivos".',
          color: '#F5A623',
          ruta: '/gestion-motivos',
        },
      ];

      // Actividades de hoy (agrupar por motivo)
      const porMotivo = new Map<string, { cantidad: number; icono: string; color: string }>();
      registrosHoy.forEach(r => {
        const existente = porMotivo.get(r.motivoNombre);
        if (existente) {
          existente.cantidad++;
        } else {
          const motivo = motivos.find(m => m.nombre === r.motivoNombre);
          porMotivo.set(r.motivoNombre, {
            cantidad: 1,
            icono: motivo?.icono || 'label',
            color: motivo?.color || '#00C8D7',
          });
        }
      });

      this.actividadesHoy = Array.from(porMotivo.entries())
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 6);

      // Últimos 5 registros
      this.ultimosRegistros = registrosHoy
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
        .slice(0, 5);

      if (this.ultimosRegistros.length > 0) {
        const ultimo = new Date(this.ultimosRegistros[0].fechaHora);
        this.ultimoRegistroHora = ultimo.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else {
        this.ultimoRegistroHora = '';
      }

      this.cargando = false;
      this.actualizando = false;
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      this.cargando = false;
      this.actualizando = false;
    }
  }

  // ═══════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════

  navegar(ruta: string): void {
    this.router.navigate([ruta]);
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}