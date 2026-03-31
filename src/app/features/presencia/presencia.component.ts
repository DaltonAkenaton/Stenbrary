// ╔══════════════════════════════════════════════════════╗
// ║  presencia.component.ts                              ║
// ║  Stenbrary v3.7.0 — Alumnos en Biblioteca            ║
// ║                                                      ║
// ║  - Vista cards (default) / lista (toggle)            ║
// ║  - Clic en card/fila = registrar salida              ║
// ║  - Búsqueda por nombre o matrícula                   ║
// ║  - Auto-refresco cada 30 s + cierre automático       ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatRippleModule } from '@angular/material/core';
import { DatabaseService } from '../../core/services/database.service';
import { ConfigService } from '../../core/services/config.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { SoundService } from '../../core/services/sound.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Registro } from '../../core/models';

const REFRESH_MS = 30_000;

@Component({
  selector: 'app-presencia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatRippleModule,
  ],
  template: `
    <div class="presencia-container">

      <!-- HEADER -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>sensor_door</mat-icon>
          </div>
          <div>
            <h1>En Biblioteca Ahora</h1>
            <p class="header-subtitle" *ngIf="!cargando">
              @if (registrosFiltrados.length > 0) {
                <span class="count-badge">{{ registrosFiltrados.length }}</span>
                {{ registrosFiltrados.length === 1 ? 'alumno presente' : 'alumnos presentes' }}
                @if (busqueda) { · filtrado de {{ registros.length }} }
              } @else if (registros.length > 0) {
                Sin resultados para "{{ busqueda }}"
              } @else {
                Ningún alumno en este momento
              }
            </p>
          </div>
        </div>

        <div class="header-actions">
          <!-- Toggle vista -->
          <div class="view-toggle">
            <button [class.active]="vistaCards" (click)="vistaCards = true"
                    matTooltip="Vista tarjetas">
              <mat-icon>grid_view</mat-icon>
            </button>
            <button [class.active]="!vistaCards" (click)="vistaCards = false"
                    matTooltip="Vista lista">
              <mat-icon>view_list</mat-icon>
            </button>
          </div>
          <button class="btn-outline" (click)="cargar()" [disabled]="cargando"
                  matTooltip="Actualizar">
            <mat-icon>refresh</mat-icon>
            <span class="btn-text">Actualizar</span>
          </button>
        </div>
      </div>

      <!-- BUSCADOR -->
      <div class="search-bar">
        <mat-icon class="search-icon">search</mat-icon>
        <input
          type="text"
          placeholder="Buscar por nombre o matrícula..."
          [(ngModel)]="busqueda">
        @if (busqueda) {
          <button class="clear-btn" (click)="busqueda = ''">
            <mat-icon>close</mat-icon>
          </button>
        }
      </div>

      <!-- LOADING -->
      @if (cargando) {
        <div class="loading-state">
          <mat-spinner diameter="36"></mat-spinner>
          <p>Cargando...</p>
        </div>
      }

      <!-- VISTA CARDS -->
      @if (!cargando && vistaCards && registrosFiltrados.length > 0) {
        <div class="cards-grid">
          @for (r of registrosFiltrados; track r.id) {
            <div class="alumno-card" (click)="pedirSalida(r)" matRipple
                 matTooltip="Toca para registrar salida"
                 [class.cierre-auto]="r.cierreAutomatico">

              <div class="card-avatar">
                <mat-icon>account_circle</mat-icon>
              </div>

              <div class="card-nombre">{{ r.nombreCompleto }}</div>
              <div class="card-matricula mono">{{ r.matricula }}</div>
              <div class="card-carrera">{{ r.carrera }}</div>

              <div class="card-motivos">
                @for (m of getMotivos(r); track m) {
                  <span class="motivo-chip">{{ m }}</span>
                }
              </div>

              <div class="card-tiempo">
                <mat-icon>login</mat-icon>
                <div>
                  <span class="hora">{{ formatearHora(r.fechaHora) }}</span>
                  <span class="elapsed">{{ calcularTiempo(r.fechaHora) }}</span>
                </div>
              </div>

                @if (r.cierreAutomatico) {
                <div class="card-auto-badge">
                  <mat-icon>warning</mat-icon>
                  Salida automática estimada — confirmar
                </div>
              } @else {
                <div class="card-salida-hint">
                  <mat-icon>logout</mat-icon>
                  Registrar salida
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- VISTA LISTA -->
      @if (!cargando && !vistaCards && registrosFiltrados.length > 0) {
        <div class="lista-container">
          @for (r of registrosFiltrados; track r.id) {
            <div class="lista-row" (click)="pedirSalida(r)" matRipple
                 [class.cierre-auto]="r.cierreAutomatico">

              <mat-icon class="row-avatar">account_circle</mat-icon>

              <div class="row-info">
                <span class="row-nombre">{{ r.nombreCompleto }}</span>
                <span class="row-meta mono">{{ r.matricula }}</span>
              </div>

              <div class="row-carrera">{{ r.carrera }}</div>

              <div class="row-motivos">
                @for (m of getMotivos(r); track m) {
                  <span class="motivo-chip-sm">{{ m }}</span>
                }
              </div>

              <div class="row-tiempo">
                <span class="hora mono">{{ formatearHora(r.fechaHora) }}</span>
                <span class="elapsed">{{ calcularTiempo(r.fechaHora) }}</span>
              </div>

              <mat-icon class="row-exit-icon" matTooltip="Registrar salida">logout</mat-icon>
            </div>
          }
        </div>
      }

      <!-- EMPTY -->
      @if (!cargando && registros.length === 0) {
        <div class="empty-state">
          <mat-icon>meeting_room</mat-icon>
          <h3>La biblioteca está vacía</h3>
          <p>No hay alumnos con entrada activa en este momento.</p>
        </div>
      }

      @if (!cargando && registros.length > 0 && registrosFiltrados.length === 0) {
        <div class="empty-state">
          <mat-icon>search_off</mat-icon>
          <h3>Sin resultados</h3>
          <p>No hay coincidencias para "{{ busqueda }}"</p>
        </div>
      }

    </div>

    <!-- Hint fijo al pie de pantalla -->
    <div class="refresh-hint-fixed">
      <mat-icon>schedule</mat-icon>
      Actualización automática cada 30 s &nbsp;·&nbsp; Toca un alumno para registrar su salida
    </div>
  `,
  styles: [`
    .presencia-container {
      display: flex; flex-direction: column; gap: 20px;
      max-width: 1000px; margin: 0 auto; padding: 16px 16px 56px;
    }

    /* ── HEADER ── */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .header-icon {
      display: flex; align-items: center; justify-content: center;
      width: 52px; height: 52px; flex-shrink: 0;
      background: rgba(0,200,215,.10); border: 1px solid rgba(0,200,215,.25);
      border-radius: 16px;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #00C8D7; }
    }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #E8F4F8; }
    .header-subtitle {
      margin: 3px 0 0; font-size: .85rem; color: rgba(200,230,240,.55);
      display: flex; align-items: center; gap: 6px;
    }
    .count-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 22px; height: 22px; padding: 0 6px;
      background: rgba(0,200,215,.15); border: 1px solid rgba(0,200,215,.3);
      border-radius: 12px; font-size: .78rem; font-weight: 700; color: #00C8D7;
    }
    .header-actions { display: flex; align-items: center; gap: 10px; }

    /* ── VIEW TOGGLE ── */
    .view-toggle {
      display: flex; border: 1px solid rgba(0,200,215,.2); border-radius: 10px;
      overflow: hidden;
      button {
        display: flex; align-items: center; justify-content: center;
        width: 36px; height: 36px; background: transparent;
        border: none; cursor: pointer; transition: background 150ms;
        color: rgba(200,230,240,.4);
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
        &.active { background: rgba(0,200,215,.15); color: #00C8D7; }
        &:hover:not(.active) { background: rgba(0,200,215,.06); }
      }
    }

    .btn-outline {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
      background: rgba(0,200,215,.08); border: 1px solid rgba(0,200,215,.2);
      border-radius: 10px; color: #00C8D7;
      font-family: 'DM Sans', sans-serif; font-size: .85rem; font-weight: 600;
      cursor: pointer; transition: background 200ms;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover:not(:disabled) { background: rgba(0,200,215,.15); }
      &:disabled { opacity: .4; cursor: not-allowed; }
    }
    @media (max-width: 480px) { .btn-text { display: none; } }

    /* ── SEARCH ── */
    .search-bar {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(0,200,215,.1); border-radius: 12px;
    }
    .search-icon { font-size: 18px; width: 18px; height: 18px; color: rgba(0,200,215,.5); }
    .search-bar input {
      flex: 1; background: transparent; border: none; outline: none;
      font-family: 'DM Sans', sans-serif; font-size: .9rem; color: #E8F4F8;
      &::placeholder { color: rgba(200,230,240,.3); }
    }
    .clear-btn {
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; background: transparent;
      border: none; cursor: pointer; color: rgba(200,230,240,.4);
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    /* ── LOADING ── */
    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 48px 0;
      color: rgba(200,230,240,.45); font-size: .88rem;
    }

    /* ── SHARED ── */
    .motivo-chip {
      display: inline-block; padding: 3px 9px;
      background: rgba(0,200,215,.08); border: 1px solid rgba(0,200,215,.15);
      border-radius: 20px; font-size: .72rem; font-weight: 500; color: #00C8D7;
      white-space: nowrap;
    }
    .motivo-chip-sm {
      display: inline-block; padding: 2px 7px;
      background: rgba(0,200,215,.08); border: 1px solid rgba(0,200,215,.12);
      border-radius: 20px; font-size: .7rem; color: #00C8D7; white-space: nowrap;
    }
    .mono { font-family: monospace; }
    .hora { font-size: .85rem; font-weight: 600; color: #E8F4F8; font-family: monospace; }
    .elapsed { font-size: .72rem; color: rgba(200,230,240,.45); }

    /* ── CARDS GRID ── */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }

    .alumno-card {
      display: flex; flex-direction: column; gap: 10px;
      padding: 18px; cursor: pointer;
      background: #101c2c;
      border: 1px solid rgba(0,200,215,.08);
      border-radius: 16px; transition: border-color 180ms, transform 150ms;
      position: relative; overflow: hidden;

      &:hover {
        border-color: rgba(0,200,215,.25);
        transform: translateY(-2px);
        .card-salida-hint { opacity: 1; }
      }

      &.cierre-auto { border-color: rgba(245,166,35,.15); }
    }

    .card-avatar mat-icon {
      font-size: 40px; width: 40px; height: 40px;
      color: rgba(0,200,215,.35);
    }
    .card-nombre {
      font-size: .95rem; font-weight: 700; color: #E8F4F8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .card-matricula { font-size: .78rem; color: rgba(200,230,240,.5); }
    .card-carrera { font-size: .78rem; color: rgba(200,230,240,.45); }
    .card-motivos { display: flex; flex-wrap: wrap; gap: 5px; }
    .card-tiempo {
      display: flex; align-items: center; gap: 6px; margin-top: 4px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; color: rgba(0,200,215,.4); }
      div { display: flex; flex-direction: column; gap: 1px; }
    }

    .card-salida-hint {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 10px; margin-top: 4px;
      background: rgba(0,200,215,.08); border-radius: 8px;
      font-size: .75rem; font-weight: 600; color: rgba(0,200,215,.7);
      opacity: 0; transition: opacity 180ms;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    /* ── LISTA ── */
    .lista-container { display: flex; flex-direction: column; gap: 8px; }

    .lista-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; cursor: pointer;
      background: #101c2c;
      border: 1px solid rgba(0,200,215,.08);
      border-radius: 12px; transition: border-color 150ms;

      &:hover { border-color: rgba(0,200,215,.22); }
      &.cierre-auto { border-color: rgba(245,166,35,.12); }
    }

    .row-avatar {
      font-size: 32px; width: 32px; height: 32px; flex-shrink: 0;
      color: rgba(0,200,215,.35);
    }
    .row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .row-nombre { font-size: .9rem; font-weight: 600; color: #E8F4F8; }
    .row-meta { font-size: .75rem; color: rgba(200,230,240,.45); }
    .row-carrera { font-size: .8rem; color: rgba(200,230,240,.5); flex-shrink: 0; }
    .row-motivos { display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0; }
    .row-tiempo { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
    .row-exit-icon {
      font-size: 18px; width: 18px; height: 18px; flex-shrink: 0;
      color: rgba(240,82,82,.5); transition: color 150ms;
      .lista-row:hover & { color: rgba(240,82,82,.85); }
    }

    @media (max-width: 600px) {
      .row-carrera, .row-motivos { display: none; }
    }

    /* ── EMPTY ── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 56px 24px; text-align: center;
      mat-icon { font-size: 50px; width: 50px; height: 50px; color: rgba(0,200,215,.2); }
      h3 { margin: 0; font-size: 1.1rem; color: rgba(200,230,240,.6); }
      p { margin: 0; font-size: .85rem; color: rgba(200,230,240,.35); }
    }

    /* ── HINT FIJO ── */
    .refresh-hint-fixed {
      position: fixed; bottom: 0; left: 64px; right: 0;
      display: flex; align-items: center; justify-content: center; gap: 5px;
      padding: 5px 16px;
      background: rgba(4, 9, 15, 0.88);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(255,255,255,.05);
      font-size: .7rem; color: rgba(200,230,240,.28);
      z-index: 10;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    @media (max-width: 768px) {
      .refresh-hint-fixed { bottom: 58px; left: 0; }
    }

    /* ── CARD AUTO-BADGE ── */
    .card-auto-badge {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 10px; margin-top: 4px;
      background: rgba(245,166,35,.10); border-radius: 8px;
      font-size: .72rem; font-weight: 600; color: #F5A623;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
  `],
})
export class PresenciaComponent implements OnInit, OnDestroy {
  registros: Registro[] = [];
  cargando = true;
  vistaCards = true;
  busqueda = '';

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  ahora = new Date();

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private soundService: SoundService,
    private dialog: MatDialog,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
    this.refreshTimer = setInterval(() => this.cargar(), REFRESH_MS);
    this.tickTimer = setInterval(() => { this.ahora = new Date(); }, 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
  }

  async cargar(): Promise<void> {
    try {
      this.cargando = true;
      // Primero ejecutar cierre automático si está configurado
      const horas = this.configService.horasAutoSalida;
      if (horas > 0) {
        const cerrados = await this.databaseService.cerrarEntradasAntiguas(horas);
        if (cerrados > 0) {
          this.toastService.info(`${cerrados} entrada(s) cerradas automáticamente tras ${horas}h`);
        }
      }
      this.registros = await this.databaseService.obtenerRegistrosAbiertoHoy();
      this.ahora = new Date();
      // Actualizar badge en sidebar
      this.configService.setHayAutoClose(
        this.registros.some(r => r.cierreAutomatico === true)
      );
    } catch {
      this.toastService.error('Error al cargar la presencia');
    } finally {
      this.cargando = false;
    }
  }

  get registrosFiltrados(): Registro[] {
    if (!this.busqueda.trim()) return this.registros;
    const t = this.busqueda.toLowerCase().trim();
    return this.registros.filter(r =>
      r.nombreCompleto.toLowerCase().includes(t) ||
      r.matricula.toLowerCase().includes(t)
    );
  }

  async pedirSalida(registro: Registro): Promise<void> {
    const esCierreAuto = registro.cierreAutomatico === true;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titulo: esCierreAuto ? 'Confirmar salida estimada' : 'Registrar salida',
        mensaje: esCierreAuto
          ? `El sistema estimó la salida de ${registro.nombreCompleto} a las ${this.formatearHora(registro.horaSalida!)} por superar ${this.configService.horasAutoSalida}h sin registrar salida. ¿Confirmar y cerrar este registro?`
          : `${registro.nombreCompleto} — ${this.calcularTiempo(registro.fechaHora)} en biblioteca.`,
        variante: esCierreAuto ? 'warning' : 'info',
        textoConfirmar: esCierreAuto ? 'Confirmar y cerrar' : 'Confirmar salida',
        icono: esCierreAuto ? 'warning' : 'logout',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      this.loadingService.show('Registrando...');

      if (esCierreAuto) {
        await this.databaseService.confirmarCierreAutomatico(registro.id);
        this.loadingService.hide();
        this.toastService.success('Registro confirmado y cerrado');
      } else {
        const actualizado = await this.databaseService.registrarSalida(registro.id);
        this.loadingService.hide();
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        this.soundService.beepSalida();
        const dur = actualizado.duracionMinutos ?? 0;
        const texto = dur < 60 ? `${dur} min` : `${Math.floor(dur / 60)}h ${dur % 60}m`;
        this.toastService.success(`Salida registrada — ${texto} de estancia`);
      }

      this.registros = this.registros.filter(r => r.id !== registro.id);
      this.configService.setHayAutoClose(this.registros.some(r => r.cierreAutomatico === true));
    } catch {
      this.loadingService.hide();
      this.toastService.error('Error al registrar la salida');
    }
  }

  getMotivos(r: Registro): string[] {
    return r.motivoNombres?.length ? r.motivoNombres : [r.motivoNombre];
  }

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  calcularTiempo(fechaEntrada: Date): string {
    const min = Math.round((this.ahora.getTime() - new Date(fechaEntrada).getTime()) / 60_000);
    if (min < 1) return 'Recién llegó';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}
