// ╔══════════════════════════════════════════════════════╗
// ║  datos-prueba.component.ts                           ║
// ║  Stenbrary — Generador de datos de prueba in-app     ║
// ║                                                      ║
// ║  Sección embebible en /configuracion. Permite al      ║
// ║  coordinador poblar la base con alumnos + registros   ║
// ║  sintéticos (rango matrícula 9000001+, dispositivo    ║
// ║  SEED-TEST) para probar el sistema con volumen real.  ║
// ║                                                      ║
// ║  Usa el modelo UAT del servicio (3 períodos, verano   ║
// ║  con pocos inscritos, vacaciones respetadas,          ║
// ║  horario 7–22, turnos ponderados 2/3 matutino).       ║
// ║                                                      ║
// ║  FLEXIBILIDAD (CLAUDE.md): presets como atajos +      ║
// ║  inputs libres con rangos naturales.                  ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, signal, computed, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DatosPruebaService,
  DatosPruebaConfig,
  DatosPruebaProgreso,
  ConteoDatosPrueba,
} from '../../core/services/datos-prueba.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

type PresetVolumen =
  | 'personalizado'
  | 'pequeno'
  | 'medio'
  | 'uat'
  | 'historico12m'
  | 'historico30m';

interface PresetConfig {
  label: string;
  descripcion: string;
  config: DatosPruebaConfig;
}

const PRESETS: Record<Exclude<PresetVolumen, 'personalizado'>, PresetConfig> = {
  pequeno: {
    label: 'Pequeño',
    descripcion: '100 alumnos · 30 días · ligero',
    config: { cantidadAlumnos: 100, ventanaDias: 30, registrosPorAlumnoPorMes: 2 },
  },
  medio: {
    label: 'Medio',
    descripcion: '500 alumnos · 180 días · ~6 meses',
    config: { cantidadAlumnos: 500, ventanaDias: 180, registrosPorAlumnoPorMes: 2 },
  },
  uat: {
    label: 'Tu universidad (UAT)',
    descripcion: '2554 alumnos · 30 días · caso real',
    config: { cantidadAlumnos: 2554, ventanaDias: 30, registrosPorAlumnoPorMes: 2 },
  },
  historico12m: {
    label: 'Histórico 12 meses',
    descripcion: '2500 alumnos · 365 días',
    config: { cantidadAlumnos: 2500, ventanaDias: 365, registrosPorAlumnoPorMes: 1.5 },
  },
  historico30m: {
    label: 'Histórico 30 meses (extremo)',
    descripcion: '2500 alumnos · 900 días · prueba de carga',
    config: { cantidadAlumnos: 2500, ventanaDias: 900, registrosPorAlumnoPorMes: 1.5 },
  },
};

// Estimación empírica: 2 writes IndexedDB por registro × ~5ms ≈ 10ms/registro.
const MS_POR_REGISTRO = 10;
// Crear alumnos: ~5ms cada uno.
const MS_POR_ALUMNO = 5;

@Component({
    selector: 'app-datos-prueba',
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
        MatProgressBarModule,
        MatTooltipModule,
    ],
    template: `
    <div class="seed-container">

      <!-- Header -->
      <div class="section-header">
        <div class="section-icon accent">
          <mat-icon>science</mat-icon>
        </div>
        <div>
          <h3>Datos de prueba</h3>
          <p class="section-desc">
            Genera alumnos y registros sintéticos con calendario real UAT
            (3 períodos, vacaciones, festivos, horario 7–22).
            Matrículas <code>9000001+</code> · fácil de limpiar.
          </p>
        </div>
      </div>

      <!-- Conteo actual -->
      @if (cargandoConteo()) {
        <div class="status-box">
          <mat-icon class="spinning">sync</mat-icon>
          <span>Consultando estado...</span>
        </div>
      } @else if (conteo().alumnos === 0 && conteo().registros === 0) {
        <div class="status-box">
          <mat-icon>info</mat-icon>
          <span>Aún no hay datos de prueba cargados.</span>
        </div>
      } @else {
        <div class="status-box active">
          <mat-icon>inventory_2</mat-icon>
          <div class="status-info">
            <span class="status-count">{{ conteo().alumnos }} alumnos</span>
            <span class="status-sep">·</span>
            <span class="status-count">{{ conteo().registros }} registros</span>
            <span class="status-label">de prueba cargados</span>
          </div>
        </div>
      }

      <!-- Preset -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Volumen</mat-label>
        <mat-select [(ngModel)]="presetSeleccionado" (ngModelChange)="onPresetChange()">
          @for (p of presetsKeys; track p) {
            <mat-option [value]="p">
              {{ presets[p].label }} — {{ presets[p].descripcion }}
            </mat-option>
          }
          <mat-option value="personalizado">Personalizado</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Controles libres — los textos largos van como mat-hint debajo
           para no competir con el input numérico en pantallas chicas. -->
      <div class="controles-libres">
        <mat-form-field appearance="outline">
          <mat-label>Cantidad de alumnos</mat-label>
          <input
            matInput
            type="number"
            min="1"
            max="3000"
            [(ngModel)]="config.cantidadAlumnos"
            (ngModelChange)="onConfigChange()"
            [disabled]="generando()">
          <mat-hint align="end">máx 3000</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ventana temporal</mat-label>
          <input
            matInput
            type="number"
            min="1"
            max="1095"
            [(ngModel)]="config.ventanaDias"
            (ngModelChange)="onConfigChange()"
            [disabled]="generando()">
          <span matSuffix>d</span>
          <mat-hint align="end">días hacia atrás (máx 3 años)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Registros por alumno / mes</mat-label>
          <input
            matInput
            type="number"
            min="0.1"
            max="50"
            step="0.1"
            [(ngModel)]="config.registrosPorAlumnoPorMes"
            (ngModelChange)="onConfigChange()"
            [disabled]="generando()">
          <span matSuffix>λ</span>
        </mat-form-field>
      </div>

      <!-- Estimación -->
      <div class="estimacion">
        <mat-icon>insights</mat-icon>
        <div class="estimacion-texto">
          <div>
            ~<strong>{{ estimadoRegistros() }}</strong> registros para
            <strong>{{ config.cantidadAlumnos }}</strong> alumnos en
            <strong>{{ config.ventanaDias }}</strong> días.
          </div>
          <div class="estimacion-tiempo">
            Tiempo estimado: <strong>{{ tiempoEstimadoLabel() }}</strong>
            @if (advertenciaTiempo()) {
              <span class="advertencia">· {{ advertenciaTiempo() }}</span>
            }
          </div>
        </div>
      </div>

      <!-- Progreso -->
      @if (generando() && progreso()) {
        <div class="progreso-box">
          <div class="progreso-label">
            <span>{{ etiquetaFase(progreso()!.fase, operacion()) }}</span>
            <span class="progreso-count">{{ progreso()!.actual }} / {{ progreso()!.total }}</span>
          </div>
          <mat-progress-bar
            mode="determinate"
            [value]="porcentajeProgreso()">
          </mat-progress-bar>
        </div>
      }

      <!-- Acciones -->
      <div class="acciones">
        <button
          class="btn-primary-action"
          [disabled]="generando() || !configValida()"
          (click)="generar()">
          <mat-icon>auto_awesome</mat-icon>
          @if (!generando()) {
            <span>Generar datos de prueba</span>
          } @else {
            <span>Generando...</span>
          }
        </button>

        <button
          class="btn-danger-ghost"
          [disabled]="generando() || (conteo().alumnos === 0 && conteo().registros === 0)"
          (click)="confirmarLimpieza()">
          <mat-icon>delete_sweep</mat-icon>
          <span>Limpiar datos de prueba</span>
        </button>
      </div>

      <!-- Nota -->
      <p class="nota">
        <mat-icon>shield</mat-icon>
        Los datos de prueba no tocan alumnos reales ni motivos ni configuración.
        Se identifican por matrícula (<code>9000001+</code>) y etiqueta
        <code>dispositivo: SEED-TEST</code>.
      </p>

    </div>
  `,
    styles: [`
    :host {
      --navy-700: #142033;
      --navy-600: #1C2E47;
      --cyan-500: #00C8D7;
      --cyan-400: #22D4E1;
      --danger-color: #FC8181;
      --danger-bg: rgba(240, 82, 82, 0.08);
      --danger-border: rgba(240, 82, 82, 0.20);
      --accent-bg: rgba(0, 200, 215, 0.08);
      --accent-border: rgba(0, 200, 215, 0.22);
      --border-subtle: rgba(0, 200, 215, 0.10);
      --text-primary: #E8F4F8;
      --text-secondary: rgba(200, 230, 240, 0.65);
      --text-muted: rgba(160, 200, 215, 0.40);
      --warn-color: #F5A623;
      --font-body: 'DM Sans', sans-serif;
      --font-mono: 'Space Mono', monospace;
    }

    .seed-container {
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

    .section-icon.accent {
      background: var(--accent-bg);
      border: 1px solid var(--accent-border);
    }

    .section-icon.accent mat-icon {
      color: var(--cyan-500);
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
      line-height: 1.5;
    }

    .section-desc code, .nota code {
      font-family: var(--font-mono);
      font-size: 11.5px;
      padding: 1px 6px;
      background: rgba(0, 200, 215, 0.10);
      border-radius: 4px;
      color: var(--cyan-400);
    }

    .status-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: var(--navy-700);
      border: 1px solid var(--border-subtle);
      font-size: 13px;
      color: var(--text-secondary);
    }

    .status-box.active {
      border-color: var(--accent-border);
      background: var(--accent-bg);
    }

    .status-box mat-icon {
      color: var(--text-muted);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .status-box.active mat-icon {
      color: var(--cyan-500);
    }

    .status-info {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
    }

    .status-count {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--cyan-400);
      font-size: 14px;
    }

    .status-sep {
      color: var(--text-muted);
    }

    .status-label {
      color: var(--text-secondary);
      font-size: 13px;
    }

    .full-width {
      width: 100%;
    }

    .controles-libres {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    /* Form-fields ocupan toda la celda del grid — sin esto su width
       natural deja al matSuffix saliendo del card en pantallas chicas. */
    .controles-libres mat-form-field {
      width: 100%;
    }

    .estimacion {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      background: var(--navy-700);
      border: 1px dashed var(--border-subtle);
      border-radius: 10px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .estimacion mat-icon {
      color: var(--cyan-500);
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-top: 2px;
    }

    .estimacion-texto {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .estimacion-tiempo {
      font-size: 12px;
      color: var(--text-muted);
    }

    .advertencia {
      color: var(--warn-color);
      font-weight: 600;
    }

    .estimacion strong {
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .progreso-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px;
      background: var(--accent-bg);
      border: 1px solid var(--accent-border);
      border-radius: 10px;
    }

    .progreso-label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-primary);
    }

    .progreso-count {
      font-family: var(--font-mono);
      color: var(--cyan-400);
    }

    .acciones {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-primary-action, .btn-danger-ghost {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 13px 20px;
      border-radius: 12px;
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 200ms ease;
      flex: 1;
      min-width: 220px;
    }

    .btn-primary-action {
      background: linear-gradient(135deg, #00C8D7, #22D4E1);
      color: #0A1420;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }

    .btn-primary-action:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(0, 200, 215, 0.35);
    }

    .btn-danger-ghost {
      background: transparent;
      color: var(--danger-color);
      border: 1px solid var(--danger-border);
    }

    .btn-danger-ghost:hover:not(:disabled) {
      background: var(--danger-bg);
    }

    .btn-primary-action:disabled, .btn-danger-ghost:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-primary-action mat-icon, .btn-danger-ghost mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Inline (no flex) para que los <code> interpolados fluyan con el
       texto en lugar de volverse flex items separados que rompen el
       párrafo en columnas estrechas en 320px. */
    .nota {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }

    .nota mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      vertical-align: middle;
      margin-right: 8px;
      position: relative;
      top: -1px;
    }

    .nota code {
      white-space: nowrap;
      display: inline-block;
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
export class DatosPruebaComponent implements OnInit {
  private datosPruebaService = inject(DatosPruebaService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);

  presets = PRESETS;
  presetsKeys = Object.keys(PRESETS) as Exclude<PresetVolumen, 'personalizado'>[];

  presetSeleccionado: PresetVolumen = 'medio';
  config: DatosPruebaConfig = { ...PRESETS.medio.config };

  @Output() datosCambiaron = new EventEmitter<void>();

  conteo = signal<ConteoDatosPrueba>({ alumnos: 0, registros: 0 });
  cargandoConteo = signal(true);
  generando = signal(false);
  operacion = signal<'generando' | 'limpiando' | null>(null);
  progreso = signal<DatosPruebaProgreso | null>(null);

  porcentajeProgreso = computed(() => {
    const p = this.progreso();
    if (!p || p.total === 0) return 0;
    return Math.round((p.actual / p.total) * 100);
  });

  estimadoRegistros = computed(() => {
    if (!this.configValida()) return 0;
    try {
      return this.datosPruebaService.estimarRegistros(this.config);
    } catch {
      return 0;
    }
  });

  tiempoEstimadoLabel = computed(() => {
    const regs = this.estimadoRegistros();
    const ms = this.config.cantidadAlumnos * MS_POR_ALUMNO + regs * MS_POR_REGISTRO;
    const seg = ms / 1000;
    if (seg < 60) return `~${Math.round(seg)} segundos`;
    const min = seg / 60;
    if (min < 60) return `~${min.toFixed(1)} minutos`;
    const hr = min / 60;
    return `~${hr.toFixed(1)} horas`;
  });

  advertenciaTiempo = computed(() => {
    const regs = this.estimadoRegistros();
    if (regs > 80000) return 'Proceso muy largo. Déjalo correr en segundo plano.';
    if (regs > 30000) return 'Proceso largo. Paciencia.';
    return '';
  });

  configValida = computed(() => {
    const c = this.config;
    return (
      c.cantidadAlumnos >= 1 && c.cantidadAlumnos <= 3000 &&
      c.ventanaDias >= 1 && c.ventanaDias <= 1095 &&
      c.registrosPorAlumnoPorMes >= 0.1 && c.registrosPorAlumnoPorMes <= 50
    );
  });

  async ngOnInit(): Promise<void> {
    await this.refrescarConteo();
  }

  onPresetChange(): void {
    if (this.presetSeleccionado !== 'personalizado') {
      this.config = { ...PRESETS[this.presetSeleccionado].config };
    }
  }

  onConfigChange(): void {
    this.presetSeleccionado = 'personalizado';
  }

  etiquetaFase(
    fase: DatosPruebaProgreso['fase'],
    op: 'generando' | 'limpiando' | null,
  ): string {
    if (op === 'limpiando') {
      switch (fase) {
        case 'alumnos': return 'Eliminando alumnos...';
        case 'registros': return 'Eliminando registros...';
        case 'listo': return 'Completado';
      }
    }
    switch (fase) {
      case 'alumnos': return 'Creando alumnos...';
      case 'registros': return 'Generando registros...';
      case 'listo': return 'Completado';
    }
  }

  async generar(): Promise<void> {
    if (!this.configValida() || this.generando()) return;

    const confirmado = await this.confirmar({
      titulo: 'Generar datos de prueba',
      mensaje:
        `Se crearán ~${this.config.cantidadAlumnos} alumnos y ` +
        `~${this.estimadoRegistros()} registros (${this.tiempoEstimadoLabel()}). ` +
        `Respeta calendario UAT: vacaciones, festivos, verano con 15% asistencia. ` +
        `No afecta datos reales.`,
      variante: 'info',
      textoConfirmar: 'Generar',
      icono: 'auto_awesome',
    });
    if (!confirmado) return;

    this.generando.set(true);
    this.operacion.set('generando');
    this.progreso.set({ fase: 'alumnos', actual: 0, total: this.config.cantidadAlumnos });

    try {
      const resultado = await this.datosPruebaService.generarDatos(this.config, (p) =>
        this.progreso.set(p),
      );
      this.toast.success(
        `Listo: ${resultado.alumnosCreados} alumnos y ${resultado.registrosCreados} registros creados`,
      );
      await this.refrescarConteo();
      this.datosCambiaron.emit();
    } catch (err) {
      console.error('[DatosPrueba] Error al generar:', err);
      this.toast.error(
        err instanceof Error ? err.message : 'Error al generar datos de prueba',
      );
    } finally {
      this.generando.set(false);
      this.operacion.set(null);
      this.progreso.set(null);
    }
  }

  async confirmarLimpieza(): Promise<void> {
    if (this.generando()) return;
    const { alumnos, registros } = this.conteo();

    const confirmado = await this.confirmar({
      titulo: 'Eliminar datos de prueba',
      mensaje: `Se eliminarán ${alumnos} alumnos y ${registros} registros marcados como de prueba. Los datos reales no se tocan.`,
      variante: 'danger',
      textoConfirmar: 'Eliminar prueba',
      icono: 'delete_sweep',
    });
    if (!confirmado) return;

    this.generando.set(true);
    this.operacion.set('limpiando');
    this.progreso.set({ fase: 'registros', actual: 0, total: registros });

    try {
      const borrados = await this.datosPruebaService.limpiarDatosPrueba((p) =>
        this.progreso.set(p),
      );
      this.toast.success(
        `${borrados.registros} registros y ${borrados.alumnos} alumnos eliminados`,
      );
      await this.refrescarConteo();
      this.datosCambiaron.emit();
    } catch (err) {
      console.error('[DatosPrueba] Error al limpiar:', err);
      this.toast.error('Error al limpiar datos de prueba');
    } finally {
      this.generando.set(false);
      this.operacion.set(null);
      this.progreso.set(null);
    }
  }

  private async refrescarConteo(): Promise<void> {
    this.cargandoConteo.set(true);
    try {
      const c = await this.datosPruebaService.contarDatosPrueba();
      this.conteo.set(c);
    } finally {
      this.cargandoConteo.set(false);
    }
  }

  private async confirmar(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '420px', data });
    return (await ref.afterClosed().toPromise()) === true;
  }
}
