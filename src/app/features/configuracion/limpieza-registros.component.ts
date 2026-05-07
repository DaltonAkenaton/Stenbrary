// ╔══════════════════════════════════════════════════════╗
// ║  limpieza-registros.component.ts                     ║
// ║  Stenbrary v3.6.2 — Eliminación masiva               ║
// ║                                                      ║
// ║  Componente standalone para eliminar registros por    ║
// ║  rango de fecha. Muestra preview (conteo) antes de    ║
// ║  confirmar con ConfirmDialog variante danger.         ║
// ║                                                      ║
// ║  OPCIONES DE INTEGRACIÓN:                            ║
// ║  A) Embeber en configuracion.component.html:          ║
// ║     <app-limpieza-registros />                        ║
// ║  B) Usar como sección standalone en una ruta propia   ║
// ║                                                      ║
// ║  UBICACIÓN: features/configuracion/                   ║
// ║             limpieza-registros.component.ts            ║
// ╚══════════════════════════════════════════════════════╝

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type RangoPreset = 'personalizado' | 'hoy' | 'semana' | 'mes' | '3meses' | '6meses' | 'todo';

@Component({
  selector: 'app-limpieza-registros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="limpieza-container">

      <!-- Header -->
      <div class="section-header">
        <div class="section-icon danger">
          <mat-icon>delete_sweep</mat-icon>
        </div>
        <div>
          <h3>Eliminación de registros</h3>
          <p class="section-desc">Elimina registros de acceso por rango de fecha</p>
        </div>
      </div>

      <!-- Selector de rango predefinido -->
      <div class="rango-selector">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rango de tiempo</mat-label>
          <mat-select [(ngModel)]="rangoSeleccionado" (ngModelChange)="onRangoChange()">
            <mat-option value="hoy">Registros de hoy</mat-option>
            <mat-option value="semana">Últimos 7 días</mat-option>
            <mat-option value="mes">Últimos 30 días</mat-option>
            <mat-option value="3meses">Últimos 3 meses</mat-option>
            <mat-option value="6meses">Últimos 6 meses</mat-option>
            <mat-option value="todo">Todos los registros</mat-option>
            <mat-option value="personalizado">Rango personalizado</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Fechas personalizadas -->
      @if (rangoSeleccionado === 'personalizado') {
        <div class="fechas-custom">
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput type="date" [(ngModel)]="fechaDesde" (ngModelChange)="actualizarConteo()">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput type="date" [(ngModel)]="fechaHasta" (ngModelChange)="actualizarConteo()">
          </mat-form-field>
        </div>
      }

      <!-- Preview de conteo -->
      @if (conteoCalculado) {
        <div class="preview-box" [class.tiene-datos]="conteoRegistros > 0">
          <mat-icon>{{ conteoRegistros > 0 ? 'inventory_2' : 'check_circle' }}</mat-icon>
          <div class="preview-info">
            @if (conteoRegistros > 0) {
              <span class="preview-count">{{ conteoRegistros }}</span>
              <span class="preview-label">registros encontrados en este rango</span>
            } @else {
              <span class="preview-label">No hay registros en este rango</span>
            }
          </div>
        </div>
      }

      @if (consultando) {
        <div class="preview-box">
          <mat-icon class="spinning">sync</mat-icon>
          <span class="preview-label">Calculando...</span>
        </div>
      }

      <!-- Botón de acción -->
      <button
        class="btn-danger-action"
        [disabled]="!conteoCalculado || conteoRegistros === 0 || consultando"
        (click)="confirmarEliminacion()">
        <mat-icon>delete_forever</mat-icon>
        Eliminar {{ conteoRegistros }} registro{{ conteoRegistros !== 1 ? 's' : '' }}
      </button>

      <!-- Nota de seguridad -->
      <p class="nota-seguridad">
        <mat-icon>info</mat-icon>
        Esta acción es irreversible. Se recomienda hacer un backup antes de eliminar.
      </p>

    </div>
  `,
  styles: [`
    :host {
      --navy-700: #142033;
      --navy-600: #1C2E47;
      --cyan-400: #22D4E1;
      --danger-color: #FC8181;
      --danger-bg: rgba(240, 82, 82, 0.08);
      --danger-border: rgba(240, 82, 82, 0.20);
      --border-subtle: rgba(0, 200, 215, 0.10);
      --text-primary: #E8F4F8;
      --text-secondary: rgba(200, 230, 240, 0.65);
      --text-muted: rgba(160, 200, 215, 0.40);
      --font-body: 'DM Sans', sans-serif;
      --font-mono: 'Space Mono', monospace;
    }

    .limpieza-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .section-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .section-icon.danger {
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
    }

    .section-icon.danger mat-icon {
      color: var(--danger-color);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    h3 {
      font-family: var(--font-body);
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .section-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin: 2px 0 0;
    }

    .rango-selector {
      margin-top: 4px;
    }

    .full-width {
      width: 100%;
    }

    .fechas-custom {
      display: flex;
      gap: 12px;
    }

    .fechas-custom mat-form-field {
      flex: 1;
    }

    /* En móvil los dos date-pickers no caben en una fila — apilar en column. */
    @media (max-width: 480px) {
      .fechas-custom {
        flex-direction: column;
      }
    }

    .preview-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      background: var(--navy-700);
      border: 1px solid var(--border-subtle);
    }

    .preview-box.tiene-datos {
      border-color: var(--danger-border);
      background: var(--danger-bg);
    }

    .preview-box mat-icon {
      color: var(--text-muted);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .preview-box.tiene-datos mat-icon {
      color: var(--danger-color);
    }

    .preview-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .preview-count {
      font-family: var(--font-mono);
      font-size: 20px;
      font-weight: 700;
      color: var(--danger-color);
    }

    .preview-label {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .btn-danger-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 20px;
      border-radius: 12px;
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: linear-gradient(135deg, #E53E3E, #FC5555);
      color: #fff;
      box-shadow: 0 4px 16px rgba(240, 82, 82, 0.25);
      transition: all 200ms ease;
    }

    .btn-danger-action:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(240, 82, 82, 0.35);
    }

    .btn-danger-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-danger-action mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .nota-seguridad {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
    }

    .nota-seguridad mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class LimpiezaRegistrosComponent {

  rangoSeleccionado: RangoPreset = 'mes';
  fechaDesde = '';
  fechaHasta = '';

  conteoRegistros = 0;
  conteoCalculado = false;
  consultando = false;

  constructor(
    private databaseService: DatabaseService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private dialog: MatDialog,
  ) {}

  // ═══════════════════════════════════════════════
  // CAMBIO DE RANGO
  // ═══════════════════════════════════════════════

  async onRangoChange(): Promise<void> {
    if (this.rangoSeleccionado === 'personalizado') {
      // Esperar a que el usuario llene las fechas
      this.conteoCalculado = false;
      this.conteoRegistros = 0;
      return;
    }
    await this.actualizarConteo();
  }

  // ═══════════════════════════════════════════════
  // CALCULAR CONTEO
  // ═══════════════════════════════════════════════

  async actualizarConteo(): Promise<void> {
    const rango = this.calcularRango();
    if (!rango) {
      this.conteoCalculado = false;
      return;
    }

    try {
      this.consultando = true;
      this.conteoRegistros = await this.databaseService.contarRegistrosPorRango(
        rango.inicio,
        rango.fin
      );
      this.conteoCalculado = true;
      this.consultando = false;
    } catch (error) {
      console.error('Error al contar registros:', error);
      this.consultando = false;
      this.toastService.error('Error al consultar registros');
    }
  }

  // ═══════════════════════════════════════════════
  // CONFIRMAR Y ELIMINAR
  // ═══════════════════════════════════════════════

  async confirmarEliminacion(): Promise<void> {
    const rango = this.calcularRango();
    if (!rango || this.conteoRegistros === 0) return;

    const rangoTexto = this.obtenerTextoRango();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titulo: `¿Eliminar ${this.conteoRegistros} registro${this.conteoRegistros !== 1 ? 's' : ''}?`,
        mensaje: `Se eliminarán permanentemente todos los registros de acceso del periodo: ${rangoTexto}. Los datos de alumnos NO se verán afectados.`,
        variante: 'danger',
        textoConfirmar: 'Eliminar registros',
        icono: 'delete_forever',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      this.loadingService.show('Eliminando registros...');

      const eliminados = await this.databaseService.eliminarRegistrosPorRango(
        rango.inicio,
        rango.fin
      );

      this.loadingService.hide();
      this.toastService.success(`${eliminados} registros eliminados exitosamente`);

      // Resetear estado
      this.conteoRegistros = 0;
      this.conteoCalculado = false;
    } catch (error) {
      console.error('Error al eliminar registros:', error);
      this.loadingService.hide();
      this.toastService.error('Error al eliminar registros. Intenta de nuevo.');
    }
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  private calcularRango(): { inicio: Date; fin: Date } | null {
    const hoy = new Date();
    let inicio: Date;
    const fin = new Date(hoy);

    switch (this.rangoSeleccionado) {
      case 'hoy':
        inicio = new Date(hoy);
        break;
      case 'semana':
        inicio = new Date(hoy);
        inicio.setDate(inicio.getDate() - 7);
        break;
      case 'mes':
        inicio = new Date(hoy);
        inicio.setDate(inicio.getDate() - 30);
        break;
      case '3meses':
        inicio = new Date(hoy);
        inicio.setMonth(inicio.getMonth() - 3);
        break;
      case '6meses':
        inicio = new Date(hoy);
        inicio.setMonth(inicio.getMonth() - 6);
        break;
      case 'todo':
        inicio = new Date(2020, 0, 1); // Fecha muy atrás para cubrir todo
        break;
      case 'personalizado':
        if (!this.fechaDesde || !this.fechaHasta) return null;
        inicio = new Date(this.fechaDesde);
        return { inicio, fin: new Date(this.fechaHasta) };
      default:
        return null;
    }

    return { inicio, fin };
  }

  private obtenerTextoRango(): string {
    const opciones: Record<RangoPreset, string> = {
      hoy: 'Hoy',
      semana: 'Últimos 7 días',
      mes: 'Últimos 30 días',
      '3meses': 'Últimos 3 meses',
      '6meses': 'Últimos 6 meses',
      todo: 'TODOS los registros',
      personalizado: `${this.fechaDesde} a ${this.fechaHasta}`,
    };
    return opciones[this.rangoSeleccionado] || '';
  }
}