// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/dashboard/                   ║
// ║        dashboard.component.ts                        ║
// ║  Stenbrary v3.5.1 — Auto-refresh + accesos rápidos   ║
// ║                                                      ║
// ║  NUEVO:                                              ║
// ║  - Auto-refresh cada 30s (toggle on/off)             ║
// ║  - Indicador visual cuando se está actualizando      ║
// ║  - Accesos rápidos: + Importar, Configuración        ║
// ║  - Saludo según hora del día                         ║
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
  color: string;
  ruta: string;
}

interface ActividadHoy {
  nombre: string;
  icono: string;
  color: string;
  cantidad: number;
}

const AUTO_REFRESH_MS = 30_000; // 30 segundos

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
  actualizando = false;

  // Auto-refresh
  autoRefreshActivo = true;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Stats principales
  stats: QuickStat[] = [];

  // Actividades de hoy
  actividadesHoy: ActividadHoy[] = [];

  // Últimos registros
  ultimosRegistros: Registro[] = [];
  ultimoRegistroHora = '';

  // Saludo
  saludo = '';

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    this.saludo = this.obtenerSaludo();
    await this.cargarDatos();
    this.iniciarAutoRefresh();
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  // ─── AUTO-REFRESH ────────────────────────────────────

  toggleAutoRefresh(): void {
    this.autoRefreshActivo = !this.autoRefreshActivo;
    if (this.autoRefreshActivo) {
      this.iniciarAutoRefresh();
    } else {
      this.detenerAutoRefresh();
    }
  }

  private iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    if (!this.autoRefreshActivo) return;

    this.refreshInterval = setInterval(async () => {
      if (!this.cargando) {
        this.actualizando = true;
        await this.cargarDatos(true);
        this.actualizando = false;
      }
    }, AUTO_REFRESH_MS);
  }

  private detenerAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // ─── CARGA DE DATOS ──────────────────────────────────

  async cargarDatos(silencioso = false): Promise<void> {
    try {
      if (!silencioso) this.cargando = true;

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
          etiqueta: 'Registros hoy',
          color: '#00C8D7',
          ruta: '/registros',
        },
        {
          icono: 'groups',
          valor: alumnos.length,
          etiqueta: 'Alumnos',
          color: '#0BC4B7',
          ruta: '/alumnos',
        },
        {
          icono: 'history',
          valor: todosRegistros.length,
          etiqueta: 'Registros totales',
          color: '#5DE4EC',
          ruta: '/registros',
        },
        {
          icono: 'category',
          valor: motivos.length,
          etiqueta: 'Actividades',
          color: '#F5A623',
          ruta: '/gestion-motivos',
        },
      ];

      // Actividades de hoy
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
      }

      this.cargando = false;
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      this.cargando = false;
    }
  }

  // ─── UTILIDADES ──────────────────────────────────────

  navegar(ruta: string): void {
    this.router.navigate([ruta]);
  }

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private obtenerSaludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}