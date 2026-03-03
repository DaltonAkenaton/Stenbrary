// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/configuracion/               ║
// ║        configuracion.component.ts                    ║
// ║  Stenbrary v3.4.1 — Fix padding + limpiar duplicados ║
// ║                                                      ║
// ║  FIX v3.4.1:                                         ║
// ║  - Padding/margin corregidos en layout               ║
// ║  - Botón "Limpiar duplicados" en mantenimiento       ║
// ║  - Info card con conteo de duplicados si existen     ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import {
  BackupService,
  BackupData,
  ResultadoImportacion,
} from '../../core/services/backup.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="config-container">

      <!-- ═══ HEADER ═══ -->
      <div class="page-header">
        <div class="header-icon">
          <mat-icon>settings</mat-icon>
        </div>
        <div>
          <h1>Configuración</h1>
          <p class="subtitle">Gestión de datos, respaldos y sistema</p>
        </div>
      </div>

      <!-- ═══ INFO DEL SISTEMA ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>info</mat-icon>
          <h2>Información del Sistema</h2>
        </div>

        <div class="info-grid" *ngIf="!cargandoInfo">
          <div class="info-stat">
            <div class="stat-value cyan">{{ conteoAlumnos }}</div>
            <div class="stat-label">Alumnos registrados</div>
          </div>
          <div class="info-stat">
            <div class="stat-value teal">{{ conteoRegistros }}</div>
            <div class="stat-label">Registros de acceso</div>
          </div>
          <div class="info-stat">
            <div class="stat-value amber">{{ conteoMotivos }}</div>
            <div class="stat-label">Motivos / actividades</div>
          </div>
          <div class="info-stat">
            <div class="stat-value purple">{{ almacenamientoEstimado }}</div>
            <div class="stat-label">Almacenamiento usado</div>
          </div>
        </div>

        <!-- Alerta de duplicados -->
        <div class="alert-duplicates" *ngIf="motivosDuplicados > 0">
          <mat-icon>warning</mat-icon>
          <span>
            Se detectaron <strong>{{ motivosDuplicados }}</strong> motivos duplicados.
          </span>
          <button class="btn-inline" (click)="limpiarDuplicados()" [disabled]="procesando">
            Limpiar ahora
          </button>
        </div>

        <div class="info-meta">
          <span class="meta-chip">
            <mat-icon>code</mat-icon>
            Stenbrary v3.4
          </span>
          <span class="meta-chip">
            <mat-icon>storage</mat-icon>
            IndexedDB local
          </span>
          <span class="meta-chip">
            <mat-icon>phone_android</mat-icon>
            PWA Offline-First
          </span>
        </div>
      </mat-card>

      <!-- ═══ BACKUP ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>cloud_download</mat-icon>
          <h2>Respaldar Datos</h2>
        </div>
        <p class="section-desc">
          Descarga un archivo JSON con todos tus datos (alumnos, registros y motivos).
          Guárdalo en un lugar seguro. Podrás restaurarlo en cualquier momento.
        </p>
        <button class="btn-action btn-backup"
                (click)="exportarBackup()"
                [disabled]="procesando">
          <mat-icon>download</mat-icon>
          <span>{{ procesando ? 'Generando...' : 'Descargar Backup' }}</span>
        </button>
        <p class="section-hint">
          <mat-icon>schedule</mat-icon>
          {{ ultimoBackup ? 'Último backup: ' + ultimoBackup : 'No se ha hecho ningún backup desde esta sesión' }}
        </p>
      </mat-card>

      <!-- ═══ RESTORE ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>cloud_upload</mat-icon>
          <h2>Restaurar Datos</h2>
        </div>
        <p class="section-desc">
          Importa un archivo de backup previamente descargado.
          Los datos nuevos se agregarán sin borrar los existentes (duplicados se omiten).
        </p>

        <input type="file"
               #fileInput
               accept=".json"
               (change)="onArchivoSeleccionado($event)"
               style="display: none">

        <div class="restore-actions">
          <button class="btn-action btn-restore"
                  (click)="fileInput.click()"
                  [disabled]="procesando">
            <mat-icon>upload_file</mat-icon>
            <span>Seleccionar archivo JSON</span>
          </button>
        </div>

        <!-- Preview del archivo -->
        <div class="restore-preview" *ngIf="backupPreview">
          <div class="preview-header">
            <mat-icon>description</mat-icon>
            <span>{{ nombreArchivoSeleccionado }}</span>
          </div>
          <div class="preview-stats">
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalAlumnos }}</strong> alumnos
            </span>
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalRegistros }}</strong> registros
            </span>
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalMotivos }}</strong> motivos
            </span>
            <span class="preview-stat fecha">
              <mat-icon>event</mat-icon>
              {{ formatearFechaBackup(backupPreview.meta.fecha) }}
            </span>
          </div>
          <div class="preview-actions">
            <button class="btn-action btn-merge"
                    (click)="importarBackup('merge')"
                    [disabled]="procesando"
                    matTooltip="Agrega datos nuevos sin borrar los existentes">
              <mat-icon>merge_type</mat-icon>
              <span>Combinar datos</span>
            </button>
            <button class="btn-action btn-replace"
                    (click)="importarBackup('replace')"
                    [disabled]="procesando"
                    matTooltip="⚠️ Borra todo y reemplaza con el backup">
              <mat-icon>swap_horiz</mat-icon>
              <span>Reemplazar todo</span>
            </button>
            <button class="btn-action btn-cancel-preview"
                    (click)="cancelarImportacion()"
                    [disabled]="procesando">
              <mat-icon>close</mat-icon>
              <span>Cancelar</span>
            </button>
          </div>
        </div>

        <!-- Resultado -->
        <div class="import-result" *ngIf="resultadoImportacion"
             [class.success]="resultadoImportacion.exitoso">
          <mat-icon>{{ resultadoImportacion.exitoso ? 'check_circle' : 'error' }}</mat-icon>
          <div class="result-text">
            <strong>{{ resultadoImportacion.exitoso ? 'Importación exitosa' : 'Error en importación' }}</strong>
            <span *ngIf="resultadoImportacion.exitoso">
              {{ resultadoImportacion.alumnosImportados }} alumnos,
              {{ resultadoImportacion.registrosImportados }} registros,
              {{ resultadoImportacion.motivosImportados }} motivos importados
              <span *ngIf="resultadoImportacion.alumnosOmitidos > 0">
                · {{ resultadoImportacion.alumnosOmitidos }} alumnos omitidos (duplicados)
              </span>
              <span *ngIf="resultadoImportacion.motivosOmitidos > 0">
                · {{ resultadoImportacion.motivosOmitidos }} motivos omitidos (duplicados)
              </span>
            </span>
          </div>
        </div>
      </mat-card>

      <!-- ═══ MANTENIMIENTO ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>build</mat-icon>
          <h2>Mantenimiento</h2>
        </div>
        <p class="section-desc">
          Herramientas para mantener tus datos limpios y organizados.
        </p>
        <div class="maintenance-actions">
          <button class="btn-action btn-maintenance"
                  (click)="limpiarDuplicados()"
                  [disabled]="procesando">
            <mat-icon>content_copy</mat-icon>
            <span>Limpiar motivos duplicados</span>
          </button>
        </div>
      </mat-card>

      <!-- ═══ ZONA PELIGROSA ═══ -->
      <mat-card class="section-card danger-zone">
        <div class="section-header danger">
          <mat-icon>warning</mat-icon>
          <h2>Zona Peligrosa</h2>
        </div>
        <p class="section-desc">
          Estas acciones son irreversibles. Asegúrate de tener un backup antes de continuar.
        </p>
        <div class="danger-actions">
          <button class="btn-action btn-danger"
                  (click)="limpiarTodosDatos()"
                  [disabled]="procesando">
            <mat-icon>delete_forever</mat-icon>
            <span>Eliminar todos los datos</span>
          </button>
        </div>
      </mat-card>

    </div>
  `,
  styles: [`
    /* ── Container ── */
   .config-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 16px 48px;
}

    /* ── Page Header ── */
   .page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding-top: 4px;
}

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      background: rgba(0, 200, 215, 0.10);
      border: 1px solid rgba(0, 200, 215, 0.25);
      border-radius: 16px;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #00C8D7;
      }
    }

    h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #E8F4F8;
    }

    .subtitle {
      margin: 2px 0 0;
      font-size: 0.85rem;
      color: rgba(200, 230, 240, 0.5);
    }

    /* ── Section Cards ── */
    .section-card {
      background: #101c2c !important;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 16px;
      padding: 28px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;

      mat-icon {
        color: #00C8D7;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: #E8F4F8;
      }

      &.danger mat-icon { color: #F05252; }
      &.danger h2 { color: #F05252; }
    }

    .section-desc {
      margin: 0 0 20px;
      font-size: 0.85rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.5;
    }

    .section-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 14px 0 0;
      font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.35);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    /* ── Info Grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .info-stat {
      background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 12px;
      padding: 18px 14px;
      text-align: center;
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      font-family: 'Space Mono', monospace;
      line-height: 1;
      margin-bottom: 6px;

      &.cyan { color: #00C8D7; }
      &.teal { color: #0BC4B7; }
      &.amber { color: #F5A623; }
      &.purple { color: #8B5CF6; }
    }

    .stat-label {
      font-size: 0.72rem;
      color: rgba(200, 230, 240, 0.45);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* ── Duplicates Alert ── */
    .alert-duplicates {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: rgba(245, 166, 35, 0.08);
      border: 1px solid rgba(245, 166, 35, 0.2);
      border-radius: 12px;
      font-size: 0.85rem;
      color: #F5A623;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      strong {
        font-weight: 700;
      }
    }

    .btn-inline {
      background: rgba(245, 166, 35, 0.15);
      color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.3);
      border-radius: 8px;
      padding: 4px 12px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      font-family: 'DM Sans', sans-serif;
      transition: background 200ms;

      &:hover:not(:disabled) {
        background: rgba(245, 166, 35, 0.25);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .info-meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: rgba(0, 200, 215, 0.06);
      border: 1px solid rgba(0, 200, 215, 0.12);
      border-radius: 20px;
      font-size: 0.72rem;
      color: rgba(200, 230, 240, 0.6);
      font-weight: 500;

      mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
        color: #00C8D7;
      }
    }

    /* ── Action Buttons ── */
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border: none;
      border-radius: 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 200ms;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
      }
    }

    .btn-backup {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 24px rgba(0, 200, 215, 0.35);
      }
    }

    .btn-restore {
      background: rgba(0, 200, 215, 0.10);
      color: #00C8D7;
      border: 1px solid rgba(0, 200, 215, 0.25);

      &:hover:not(:disabled) {
        background: rgba(0, 200, 215, 0.18);
      }
    }

    .btn-merge {
      background: linear-gradient(135deg, #0BC4B7, #0EB07B);
      color: #04090F;
      box-shadow: 0 4px 12px rgba(11, 196, 183, 0.2);
    }

    .btn-replace {
      background: rgba(245, 166, 35, 0.12);
      color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.3);
    }

    .btn-cancel-preview {
      background: rgba(200, 230, 240, 0.06);
      color: rgba(200, 230, 240, 0.5);
      border: 1px solid rgba(200, 230, 240, 0.1);
    }

    .btn-maintenance {
      background: rgba(99, 102, 241, 0.10);
      color: #6366F1;
      border: 1px solid rgba(99, 102, 241, 0.25);

      &:hover:not(:disabled) {
        background: rgba(99, 102, 241, 0.18);
      }
    }

    .btn-danger {
      background: rgba(240, 82, 82, 0.10);
      color: #F05252;
      border: 1px solid rgba(240, 82, 82, 0.25);

      &:hover:not(:disabled) {
        background: rgba(240, 82, 82, 0.20);
      }
    }

    /* ── Restore Preview ── */
    .restore-preview {
      margin-top: 20px;
      padding: 18px;
      background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.15);
      border-radius: 12px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      font-weight: 600;
      color: #E8F4F8;
      font-size: 0.9rem;

      mat-icon { color: #00C8D7; }
    }

    .preview-stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .preview-stat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.82rem;
      color: rgba(200, 230, 240, 0.55);

      strong { color: #E8F4F8; }

      &.fecha {
        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
          color: rgba(200, 230, 240, 0.35);
        }
      }
    }

    .preview-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .restore-actions {
      display: flex;
      gap: 10px;
    }

    .maintenance-actions {
      display: flex;
      gap: 10px;
    }

    /* ── Import Result ── */
    .import-result {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 18px;
      padding: 14px 16px;
      background: rgba(240, 82, 82, 0.08);
      border: 1px solid rgba(240, 82, 82, 0.2);
      border-radius: 12px;
      color: #F05252;

      &.success {
        background: rgba(11, 196, 183, 0.08);
        border-color: rgba(11, 196, 183, 0.2);
        color: #0BC4B7;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .result-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.85rem;
        line-height: 1.4;
      }
    }

    /* ── Danger Zone ── */
    .danger-zone {
      border-color: rgba(240, 82, 82, 0.15);
    }

    .danger-actions {
      display: flex;
      gap: 10px;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .info-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .preview-actions {
        flex-direction: column;
      }

      .section-card {
        padding: 20px;
      }
    }

    @media (max-width: 480px) {
      .info-grid {
        grid-template-columns: 1fr 1fr;
      }

      .alert-duplicates {
        flex-wrap: wrap;
      }
    }
  `],
})
export class ConfiguracionComponent implements OnInit {

  cargandoInfo = true;
  procesando = false;

  // Info
  conteoAlumnos = 0;
  conteoRegistros = 0;
  conteoMotivos = 0;
  almacenamientoEstimado = '—';
  motivosDuplicados = 0;

  // Backup
  ultimoBackup = '';

  // Restore
  backupPreview: BackupData | null = null;
  nombreArchivoSeleccionado = '';
  resultadoImportacion: ResultadoImportacion | null = null;

  constructor(
    private databaseService: DatabaseService,
    private backupService: BackupService,
    private toastService: ToastService,
    private loadingService: LoadingService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarInfo();
  }

  // ═══════════════════════════════════════════════
  // INFO
  // ═══════════════════════════════════════════════

  async cargarInfo(): Promise<void> {
    try {
      this.cargandoInfo = true;

      const [conteo, duplicados] = await Promise.all([
        this.databaseService.obtenerConteoTotal(),
        this.backupService.contarMotivosDuplicados(),
      ]);

      this.conteoAlumnos = conteo.alumnos;
      this.conteoRegistros = conteo.registros;
      this.conteoMotivos = conteo.motivos;
      this.motivosDuplicados = duplicados;

      await this.estimarAlmacenamiento();

      this.cargandoInfo = false;
    } catch (error) {
      console.error('Error al cargar info:', error);
      this.cargandoInfo = false;
    }
  }

  private async estimarAlmacenamiento(): Promise<void> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / (1024 * 1024);
        if (usedMB < 1) {
          this.almacenamientoEstimado = `${Math.round((estimate.usage || 0) / 1024)} KB`;
        } else {
          this.almacenamientoEstimado = `${usedMB.toFixed(1)} MB`;
        }
      } else {
        this.almacenamientoEstimado = 'N/A';
      }
    } catch {
      this.almacenamientoEstimado = 'N/A';
    }
  }

  // ═══════════════════════════════════════════════
  // BACKUP
  // ═══════════════════════════════════════════════

  async exportarBackup(): Promise<void> {
    try {
      this.procesando = true;
      this.loadingService.show('Generando backup...');

      const resultado = await this.backupService.descargarBackup();

      this.loadingService.hide();
      this.procesando = false;
      this.ultimoBackup = new Date().toLocaleString('es-MX');
      this.toastService.success(`Backup descargado: ${resultado.nombreArchivo}`);
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al generar el backup');
    }
  }

  // ═══════════════════════════════════════════════
  // RESTORE
  // ═══════════════════════════════════════════════

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.backupPreview = null;
    this.resultadoImportacion = null;
    this.nombreArchivoSeleccionado = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      const contenido = reader.result as string;
      const validacion = this.backupService.validarArchivo(contenido);

      if (!validacion.valido) {
        this.toastService.error(validacion.errores[0]);
        return;
      }

      this.backupPreview = validacion.datos!;
      this.toastService.info('Archivo válido — revisa los datos antes de importar');
    };
    reader.onerror = () => {
      this.toastService.error('Error al leer el archivo');
    };
    reader.readAsText(file);

    input.value = '';
  }

  async importarBackup(modo: 'merge' | 'replace'): Promise<void> {
    if (!this.backupPreview) return;

    if (modo === 'replace') {
      const c1 = confirm(
        '⚠️ REEMPLAZAR TODO\n\n' +
        'Esto BORRARÁ todos los datos actuales y los reemplazará con el backup.\n\n' +
        '¿Estás seguro?'
      );
      if (!c1) return;

      const c2 = confirm('¿REALMENTE quieres borrar todo? Esta acción NO se puede deshacer.');
      if (!c2) return;
    }

    try {
      this.procesando = true;
      this.loadingService.show(
        modo === 'replace' ? 'Reemplazando datos...' : 'Combinando datos...'
      );

      this.resultadoImportacion = await this.backupService.importarBackup(
        this.backupPreview, modo
      );

      this.backupPreview = null;
      this.loadingService.hide();
      this.procesando = false;

      if (this.resultadoImportacion.exitoso) {
        this.toastService.success('Importación completada exitosamente');
        await this.cargarInfo();
      } else {
        this.toastService.error('Hubo errores durante la importación');
      }
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error durante la importación');
    }
  }

  cancelarImportacion(): void {
    this.backupPreview = null;
    this.resultadoImportacion = null;
    this.nombreArchivoSeleccionado = '';
  }

  // ═══════════════════════════════════════════════
  // MANTENIMIENTO
  // ═══════════════════════════════════════════════

  async limpiarDuplicados(): Promise<void> {
    try {
      this.procesando = true;
      this.loadingService.show('Limpiando motivos duplicados...');

      const eliminados = await this.backupService.limpiarMotivosDuplicados();

      this.loadingService.hide();
      this.procesando = false;

      if (eliminados > 0) {
        this.toastService.success(`${eliminados} motivos duplicados eliminados`);
      } else {
        this.toastService.info('No se encontraron motivos duplicados');
      }

      await this.cargarInfo();
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al limpiar duplicados');
    }
  }

  // ═══════════════════════════════════════════════
  // ZONA PELIGROSA
  // ═══════════════════════════════════════════════

  async limpiarTodosDatos(): Promise<void> {
    const c1 = confirm(
      '⚠️ ELIMINAR TODOS LOS DATOS\n\n' +
      'Esto borrará TODOS los alumnos, registros y motivos.\n' +
      'Los motivos por defecto se recrearán automáticamente.\n\n' +
      '¿Hiciste un backup? Si no, cancela y hazlo primero.'
    );
    if (!c1) return;

    const c2 = confirm('¿ÚLTIMA OPORTUNIDAD — realmente quieres borrar todo?');
    if (!c2) return;

    try {
      this.procesando = true;
      this.loadingService.show('Eliminando todos los datos...');

      await this.databaseService.limpiarTodosDatos();

      this.loadingService.hide();
      this.procesando = false;
      this.toastService.success('Todos los datos han sido eliminados');
      await this.cargarInfo();
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al limpiar los datos');
    }
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  formatearFechaBackup(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}