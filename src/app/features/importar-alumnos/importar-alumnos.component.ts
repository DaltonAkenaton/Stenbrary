// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/importar-alumnos/            ║
// ║        importar-alumnos.component.ts                 ║
// ║  Stenbrary v3.5 — Importación masiva desde Excel     ║
// ║                                                      ║
// ║  Flujo:                                              ║
// ║  1. Seleccionar archivo .xlsx/.xls/.csv              ║
// ║  2. Preview con tabla y validación por fila          ║
// ║  3. Importar válidos, omitir duplicados              ║
// ║  4. Resultado con conteos                            ║
// ╚══════════════════════════════════════════════════════╝

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as XLSX from 'xlsx';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { CARRERAS, TURNOS } from '../../core/constants/catalogos.constants';

/** Una fila parseada del Excel con estado de validación */
interface FilaImportacion {
  fila: number;
  matricula: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  carrera: string;
  grado: number;
  grupo: string;
  turno: string;
  valido: boolean;
  errores: string[];
}

interface ResultadoImportacion {
  total: number;
  importados: number;
  duplicados: number;
  invalidos: number;
  errores: string[];
}

@Component({
  selector: 'app-importar-alumnos',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="importar-container">

      <!-- Header -->
      <div class="page-header">
        <button mat-icon-button class="back-btn" (click)="volver()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-icon">
          <mat-icon>upload_file</mat-icon>
        </div>
        <div>
          <h1>Importar Alumnos</h1>
          <p class="subtitle">Carga masiva desde archivo Excel o CSV</p>
        </div>
      </div>

      <!-- ═══ PASO 1: SELECCIONAR ARCHIVO ═══ -->
      @if (paso === 'seleccionar') {
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>description</mat-icon>
          <h2>Seleccionar Archivo</h2>
        </div>

        <p class="section-desc">
          Sube un archivo Excel (.xlsx, .xls) o CSV con los datos de los alumnos.
          El archivo debe tener las siguientes columnas:
        </p>

        <div class="columnas-requeridas">
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Matrícula</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Nombre</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Apellido Paterno</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Apellido Materno</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Carrera</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Grado</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Grupo</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Turno</span>
          </div>
        </div>

        <input type="file"
               #fileInput
               accept=".xlsx,.xls,.csv"
               (change)="onArchivoSeleccionado($event)"
               style="display: none">


               <div class="upload-actions">
          <button class="btn-action btn-template" (click)="descargarPlantilla()">
            <mat-icon>table_chart</mat-icon>
            <span>Descargar plantilla</span>
          </button>
          <button class="btn-action btn-upload" (click)="fileInput.click()">
            <mat-icon>cloud_upload</mat-icon>
            <span>Seleccionar archivo</span>
          </button>
        </div>


        

        <div class="template-hint">
          <mat-icon>lightbulb</mat-icon>
          <span>
            <strong>Consejo:</strong> Los nombres de columna no necesitan ser exactos.
            El sistema detecta automáticamente columnas como "Matricula", "MATRÍCULA",
            "No. Control", "Apellido_Paterno", etc.
          </span>
        </div>
      </mat-card>
      }

      <!-- ═══ PASO 2: PREVIEW ═══ -->
      @if (paso === 'preview') {
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>table_chart</mat-icon>
          <h2>Vista Previa</h2>
          <span class="archivo-nombre">{{ nombreArchivo }}</span>
        </div>

        <!-- Resumen de validación -->
        <div class="validacion-resumen">
          <div class="resumen-item validos">
            <mat-icon>check_circle</mat-icon>
            <strong>{{ filasValidas }}</strong> válidos
          </div>
          @if (filasInvalidas > 0) {
            <div class="resumen-item invalidos">
              <mat-icon>error</mat-icon>
              <strong>{{ filasInvalidas }}</strong> con errores
            </div>
          }
          <div class="resumen-item total">
            <mat-icon>list</mat-icon>
            <strong>{{ filas.length }}</strong> filas totales
          </div>
        </div>

        <!-- Tabla de preview -->
        <div class="table-container">
          <table mat-table [dataSource]="filas" class="preview-table">

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let fila">
                @if (fila.valido) {
                  <mat-icon class="icon-ok">check_circle</mat-icon>
                } @else {
                  <mat-icon class="icon-error"
                            [matTooltip]="fila.errores.join(', ')">error</mat-icon>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="fila">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let fila">{{ fila.fila }}</td>
            </ng-container>

            <ng-container matColumnDef="matricula">
              <th mat-header-cell *matHeaderCellDef>Matrícula</th>
              <td mat-cell *matCellDef="let fila"
                  [class.celda-error]="tieneError(fila, 'Matrícula')">
                {{ fila.matricula || '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let fila">{{ fila.nombre || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="apellidos">
              <th mat-header-cell *matHeaderCellDef>Apellidos</th>
              <td mat-cell *matCellDef="let fila">
                {{ fila.apellidoPaterno || '—' }} {{ fila.apellidoMaterno || '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="carrera">
              <th mat-header-cell *matHeaderCellDef>Carrera</th>
              <td mat-cell *matCellDef="let fila"
                  [class.celda-error]="tieneError(fila, 'Carrera')">
                {{ fila.carrera || '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="grado">
              <th mat-header-cell *matHeaderCellDef>Grado</th>
              <td mat-cell *matCellDef="let fila">{{ fila.grado || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="grupo">
              <th mat-header-cell *matHeaderCellDef>Grupo</th>
              <td mat-cell *matCellDef="let fila">{{ fila.grupo || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="turno">
              <th mat-header-cell *matHeaderCellDef>Turno</th>
              <td mat-cell *matCellDef="let fila"
                  [class.celda-error]="tieneError(fila, 'Turno')">
                {{ fila.turno || '—' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columnasPreview"></tr>
            <tr mat-row *matRowDef="let row; columns: columnasPreview;"
                [class.fila-invalida]="!row.valido"></tr>
          </table>
        </div>

        <!-- Acciones -->
        <div class="preview-actions">
          <button class="btn-action btn-cancel" (click)="cancelar()">
            <mat-icon>close</mat-icon>
            <span>Cancelar</span>
          </button>
          <button class="btn-action btn-import"
                  (click)="importar()"
                  [disabled]="filasValidas === 0 || importando">
            <mat-icon>{{ importando ? 'hourglass_empty' : 'file_download' }}</mat-icon>
            <span>{{ importando ? 'Importando...' : 'Importar ' + filasValidas + ' alumnos' }}</span>
          </button>
        </div>
      </mat-card>
      }

      <!-- ═══ PASO 3: RESULTADO ═══ -->
      @if (paso === 'resultado' && resultado) {
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon [class.icon-ok]="resultado.importados > 0"
                    [class.icon-error]="resultado.importados === 0">
            {{ resultado.importados > 0 ? 'check_circle' : 'error' }}
          </mat-icon>
          <h2>Importación {{ resultado.importados > 0 ? 'Completada' : 'Sin Resultados' }}</h2>
        </div>

        <div class="resultado-grid">
          @if (resultado.importados > 0) {
            <div class="resultado-stat exito">
              <div class="resultado-valor">{{ resultado.importados }}</div>
              <div class="resultado-label">Importados</div>
            </div>
          }
          @if (resultado.duplicados > 0) {
            <div class="resultado-stat duplicado">
              <div class="resultado-valor">{{ resultado.duplicados }}</div>
              <div class="resultado-label">Duplicados (omitidos)</div>
            </div>
          }
          @if (resultado.invalidos > 0) {
            <div class="resultado-stat error">
              <div class="resultado-valor">{{ resultado.invalidos }}</div>
              <div class="resultado-label">Inválidos (omitidos)</div>
            </div>
          }
        </div>

        <div class="resultado-actions">
          <button class="btn-action btn-secondary" (click)="importarOtro()">
            <mat-icon>upload_file</mat-icon>
            <span>Importar otro archivo</span>
          </button>
          <button class="btn-action btn-primary" (click)="irAAlumnos()">
            <mat-icon>groups</mat-icon>
            <span>Ver alumnos</span>
          </button>
        </div>
      </mat-card>
      }

    </div>
  `,
  styles: [`
    .importar-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1000px;
      margin: 0 auto;
      padding: 8px 16px 48px;
    }

    /* ── Header ── */
    .page-header {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .back-btn {
      color: rgba(200, 230, 240, 0.5) !important;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: rgba(0, 200, 215, 0.10);
      border: 1px solid rgba(0, 200, 215, 0.25);
      border-radius: 14px;
      flex-shrink: 0;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #00C8D7;
      }
    }

    h1 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
      color: #E8F4F8;
    }

    .subtitle {
      margin: 2px 0 0;
      font-size: 0.82rem;
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
      margin-bottom: 16px;

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

      .archivo-nombre {
        margin-left: auto;
        font-size: 0.78rem;
        color: rgba(200, 230, 240, 0.4);
        font-family: 'Space Mono', monospace;
      }
    }

    .section-desc {
      margin: 0 0 16px;
      font-size: 0.85rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.5;
    }

    /* ── Columnas requeridas ── */
    .columnas-requeridas {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 24px;
    }

    .col-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 500;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &.obligatorio {
        background: rgba(0, 200, 215, 0.06);
        border: 1px solid rgba(0, 200, 215, 0.15);
        color: #00C8D7;

        mat-icon { color: #0BC4B7; }
      }
    }
.upload-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-template {
      background: rgba(99, 102, 241, 0.10);
      color: #6366F1;
      border: 1px solid rgba(99, 102, 241, 0.25);

      &:hover:not(:disabled) {
        background: rgba(99, 102, 241, 0.18);
      }
    }
    /* ── Buttons ── */
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 24px;
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
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
      }
    }

    .btn-upload {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }

    .btn-import {
      background: linear-gradient(135deg, #0BC4B7, #0EB07B);
      color: #04090F;
      box-shadow: 0 4px 16px rgba(11, 196, 183, 0.25);
    }

    .btn-cancel {
      background: rgba(200, 230, 240, 0.06);
      color: rgba(200, 230, 240, 0.5);
      border: 1px solid rgba(200, 230, 240, 0.1);
    }

    .btn-primary {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }

    .btn-secondary {
      background: rgba(0, 200, 215, 0.10);
      color: #00C8D7;
      border: 1px solid rgba(0, 200, 215, 0.25);
    }

    /* ── Template hint ── */
    .template-hint {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 20px;
      padding: 14px 16px;
      background: rgba(99, 102, 241, 0.06);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 12px;
      font-size: 0.8rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.5;

      mat-icon {
        color: #6366F1;
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      strong { color: #6366F1; }
    }

    /* ── Validación resumen ── */
    .validacion-resumen {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .resumen-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 0.85rem;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.validos {
        background: rgba(11, 196, 183, 0.08);
        color: #0BC4B7;
      }
      &.invalidos {
        background: rgba(240, 82, 82, 0.08);
        color: #F05252;
      }
      &.total {
        background: rgba(200, 230, 240, 0.04);
        color: rgba(200, 230, 240, 0.5);
      }
    }

    /* ── Tabla preview ── */
    .table-container {
      overflow-x: auto;
      margin-bottom: 20px;
      border-radius: 12px;
      border: 1px solid rgba(0, 200, 215, 0.08);
      max-height: 420px;
      overflow-y: auto;
    }

    .preview-table {
      width: 100%;
      background: transparent !important;

      th {
        background: #0a1420 !important;
        color: rgba(200, 230, 240, 0.6) !important;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 600;
        border-bottom: 1px solid rgba(0, 200, 215, 0.1) !important;
      }

      td {
        color: #E8F4F8;
        font-size: 0.82rem;
        border-bottom: 1px solid rgba(200, 230, 240, 0.04) !important;
      }
    }

    .fila-invalida td {
      opacity: 0.5;
    }

    .celda-error {
      color: #F05252 !important;
      font-weight: 600;
    }

    .icon-ok { color: #0BC4B7 !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }
    .icon-error { color: #F05252 !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }

    /* ── Preview actions ── */
    .preview-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    /* ── Resultado ── */
    .resultado-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .resultado-stat {
      flex: 1;
      padding: 20px;
      border-radius: 14px;
      text-align: center;

      .resultado-valor {
        font-size: 2rem;
        font-weight: 800;
        font-family: 'Space Mono', monospace;
        line-height: 1;
        margin-bottom: 6px;
      }

      .resultado-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.7;
      }

      &.exito {
        background: rgba(11, 196, 183, 0.08);
        border: 1px solid rgba(11, 196, 183, 0.2);
        .resultado-valor { color: #0BC4B7; }
        color: #0BC4B7;
      }

      &.duplicado {
        background: rgba(245, 166, 35, 0.08);
        border: 1px solid rgba(245, 166, 35, 0.2);
        .resultado-valor { color: #F5A623; }
        color: #F5A623;
      }

      &.error {
        background: rgba(240, 82, 82, 0.08);
        border: 1px solid rgba(240, 82, 82, 0.2);
        .resultado-valor { color: #F05252; }
        color: #F05252;
      }
    }

    .resultado-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .columnas-requeridas {
        gap: 6px;
      }

      .table-container {
        max-height: 300px;
      }

      .resultado-grid {
        flex-direction: column;
      }

      .preview-actions,
      .resultado-actions {
        flex-direction: column;
      }
    }
  `],
})
export class ImportarAlumnosComponent {

  paso: 'seleccionar' | 'preview' | 'resultado' = 'seleccionar';
  nombreArchivo = '';
  importando = false;

  // Preview
  filas: FilaImportacion[] = [];
  columnasPreview = ['estado', 'fila', 'matricula', 'nombre', 'apellidos', 'carrera', 'grado', 'grupo', 'turno'];

  // Matrículas ya existentes en BD (pre-validación)
  private matriculasExistentes = new Set<string>();

  // Resultado
  resultado: ResultadoImportacion | null = null;

  constructor(
    private databaseService: DatabaseService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private router: Router,
  ) {}

  // ═══════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════

  get filasValidas(): number {
    return this.filas.filter(f => f.valido).length;
  }

  get filasInvalidas(): number {
    return this.filas.filter(f => !f.valido).length;
  }

  // ═══════════════════════════════════════════════
  // PASO 1: SELECCIONAR ARCHIVO
  // ═══════════════════════════════════════════════

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.nombreArchivo = file.name;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Pre-cargar matrículas existentes en BD para validar duplicados
        const alumnosExistentes = await this.databaseService.obtenerTodosLosAlumnos();
        this.matriculasExistentes = new Set(alumnosExistentes.map(a => a.matricula));

        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Tomar la primera hoja
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convertir a JSON (filas como objetos)
        const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonData.length === 0) {
          this.toastService.error('El archivo está vacío o no tiene datos');
          return;
        }

        this.procesarDatos(jsonData);
        this.paso = 'preview';
        this.toastService.info(`${jsonData.length} filas encontradas en "${sheetName}"`);
      } catch (error) {
        console.error('Error al parsear archivo:', error);
        this.toastService.error('Error al leer el archivo. Verifica que sea un Excel o CSV válido.');
      }
    };
    reader.onerror = () => {
      this.toastService.error('Error al leer el archivo');
    };
    reader.readAsArrayBuffer(file);

    // Reset para poder seleccionar el mismo archivo
    input.value = '';
  }

  // ═══════════════════════════════════════════════
  // PROCESAMIENTO Y MAPEO DE COLUMNAS
  // ═══════════════════════════════════════════════

  private procesarDatos(jsonData: any[]): void {
    // Detectar columnas automáticamente
    const primeraFila = jsonData[0];
    const columnas = Object.keys(primeraFila);

    const mapeo = {
      matricula: this.detectarColumna(columnas, ['matricula', 'matrícula', 'no. control', 'no control', 'numero de control', 'número de control', 'no_control', 'id']),
      nombre: this.detectarColumna(columnas, ['nombre', 'nombres', 'name', 'primer nombre']),
      apellidoPaterno: this.detectarColumna(columnas, ['apellido paterno', 'apellido_paterno', 'paterno', 'ap paterno', 'ap_paterno', 'primer apellido']),
      apellidoMaterno: this.detectarColumna(columnas, ['apellido materno', 'apellido_materno', 'materno', 'ap materno', 'ap_materno', 'segundo apellido']),
      carrera: this.detectarColumna(columnas, ['carrera', 'licenciatura', 'programa', 'programa educativo', 'programa_educativo']),
      grado: this.detectarColumna(columnas, ['grado', 'semestre', 'cuatrimestre', 'nivel', 'periodo']),
      grupo: this.detectarColumna(columnas, ['grupo', 'seccion', 'sección', 'section', 'aula']),
      turno: this.detectarColumna(columnas, ['turno', 'horario', 'jornada', 'shift']),
    };

    console.log('📋 Mapeo de columnas detectado:', mapeo);

    this.filas = jsonData.map((row, index) => {
      const fila: FilaImportacion = {
        fila: index + 2, // +2 porque fila 1 es el header en Excel
        matricula: this.limpiarTexto(row[mapeo.matricula] || ''),
        nombre: this.limpiarTexto(row[mapeo.nombre] || ''),
        apellidoPaterno: this.limpiarTexto(row[mapeo.apellidoPaterno] || ''),
        apellidoMaterno: this.limpiarTexto(row[mapeo.apellidoMaterno] || ''),
        carrera: this.limpiarTexto(row[mapeo.carrera] || ''),
        grado: this.parsearNumero(row[mapeo.grado]),
        grupo: this.limpiarTexto(row[mapeo.grupo] || '').toUpperCase(),
        turno: this.normalizarTurno(this.limpiarTexto(row[mapeo.turno] || '')),
        valido: true,
        errores: [],
      };

      // Validar
      this.validarFila(fila);

      return fila;
    });
  }

  /**
   * Detecta cuál columna del Excel corresponde a un campo.
   * Busca por coincidencia parcial (case-insensitive).
   */
  private detectarColumna(columnas: string[], nombres: string[]): string {
    for (const nombre of nombres) {
      const encontrada = columnas.find(c =>
        c.toLowerCase().trim().includes(nombre.toLowerCase())
      );
      if (encontrada) return encontrada;
    }
    // Si no detecta, buscar match exacto (sin acentos)
    for (const nombre of nombres) {
      const sinAcentos = this.quitarAcentos(nombre);
      const encontrada = columnas.find(c =>
        this.quitarAcentos(c.toLowerCase().trim()) === sinAcentos
      );
      if (encontrada) return encontrada;
    }
    // Fallback: devolver el nombre original del primer intento
    return nombres[0];
  }

  private quitarAcentos(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private limpiarTexto(valor: any): string {
    return String(valor).trim();
  }

  private parsearNumero(valor: any): number {
    const num = parseInt(String(valor), 10);
    return isNaN(num) ? 0 : num;
  }

  private normalizarTurno(turno: string): string {
    const t = turno.toLowerCase().trim();
    if (t.includes('matut') || t === 'm' || t === 'tm') return 'Matutino';
    if (t.includes('vespert') || t === 'v' || t === 'tv') return 'Vespertino';
    if (t.includes('mixt') || t.includes('noct') || t === 'x') return 'Mixto';
    // Si ya viene correcto
    if (TURNOS.includes(turno as any)) return turno;
    return turno; // Dejar como está, la validación lo atrapará
  }

  // ═══════════════════════════════════════════════
  // VALIDACIÓN
  // ═══════════════════════════════════════════════

  private validarFila(fila: FilaImportacion): void {
    fila.errores = [];

    if (!fila.matricula || fila.matricula.length < 3) {
      fila.errores.push('Matrícula vacía o muy corta');
    }

    if (!fila.nombre) fila.errores.push('Nombre vacío');
    if (!fila.apellidoPaterno) fila.errores.push('Apellido Paterno vacío');
    if (!fila.apellidoMaterno) fila.errores.push('Apellido Materno vacío');

    if (!fila.carrera) {
      fila.errores.push('Carrera vacía');
    }

    if (!fila.grado || fila.grado < 1 || fila.grado > 12) {
      fila.errores.push('Grado inválido (debe ser 1-12)');
    }

    if (!fila.grupo) fila.errores.push('Grupo vacío');

    if (!TURNOS.includes(fila.turno as any)) {
      fila.errores.push(`Turno inválido: "${fila.turno}" (usar Matutino, Vespertino o Mixto)`);
    }

    // Verificar duplicados DENTRO del mismo archivo
    const duplicadoInterno = this.filas?.find(f =>
      f !== fila && f.matricula === fila.matricula && fila.matricula !== ''
    );
    if (duplicadoInterno) {
      fila.errores.push(`Matrícula duplicada en fila ${duplicadoInterno.fila}`);
    }

    // Verificar si ya existe en la base de datos
    if (fila.matricula && this.matriculasExistentes.has(fila.matricula)) {
      fila.errores.push('Matrícula ya registrada en el sistema');
    }

    fila.valido = fila.errores.length === 0;
  }

  // ═══════════════════════════════════════════════
  // PASO 3: IMPORTAR
  // ═══════════════════════════════════════════════

  async importar(): Promise<void> {
    const validas = this.filas.filter(f => f.valido);
    if (validas.length === 0) return;

    try {
      this.importando = true;
      this.loadingService.show(`Importando ${validas.length} alumnos...`);

      const resultado: ResultadoImportacion = {
        total: validas.length,
        importados: 0,
        duplicados: 0,
        invalidos: this.filasInvalidas,
        errores: [],
      };

      for (const fila of validas) {
        try {
          await this.databaseService.crearAlumno({
            matricula: fila.matricula,
            nombre: fila.nombre,
            apellidoPaterno: fila.apellidoPaterno,
            apellidoMaterno: fila.apellidoMaterno,
            carrera: fila.carrera,
            grado: fila.grado,
            grupo: fila.grupo,
            turno: fila.turno as 'Matutino' | 'Vespertino' | 'Mixto',
            activo: true,
          });
          resultado.importados++;
        } catch (error: any) {
          // Matrícula duplicada en la base de datos
          resultado.duplicados++;
        }
      }

      this.resultado = resultado;
      this.paso = 'resultado';
      this.loadingService.hide();
      this.importando = false;

      if (resultado.importados > 0) {
        this.toastService.success(`${resultado.importados} alumnos importados exitosamente`);
      } else {
        this.toastService.warning('No se importaron alumnos nuevos (todos duplicados)');
      }

      console.log('✅ Importación completada:', resultado);
    } catch (error) {
      this.loadingService.hide();
      this.importando = false;
      this.toastService.error('Error durante la importación');
    }
  }

  // ═══════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════

  cancelar(): void {
    this.paso = 'seleccionar';
    this.filas = [];
    this.nombreArchivo = '';
  }

  importarOtro(): void {
    this.paso = 'seleccionar';
    this.filas = [];
    this.nombreArchivo = '';
    this.resultado = null;
  }

  irAAlumnos(): void {
    this.router.navigate(['/alumnos']);
  }

  volver(): void {
    this.router.navigate(['/alumnos']);
  }

  /** Helper: Angular templates no soportan arrow functions */
  tieneError(fila: FilaImportacion, campo: string): boolean {
    return fila.errores.some(e => e.includes(campo));
  }


    descargarPlantilla(): void {
    const headers = ['Matrícula', 'Nombre', 'Apellido Paterno', 'Apellido Materno', 'Carrera', 'Grado', 'Grupo', 'Turno'];
    const ejemplo = ['a2299990003', 'Juan', 'García', 'López', 'Contador Público', '4', 'A', 'Matutino'];

    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 16 }, // Matrícula
      { wch: 14 }, // Nombre
      { wch: 18 }, // Apellido Paterno
      { wch: 18 }, // Apellido Materno
      { wch: 30 }, // Carrera
      { wch: 8 },  // Grado
      { wch: 8 },  // Grupo
      { wch: 14 }, // Turno
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
    XLSX.writeFile(wb, 'plantilla_alumnos_stenbrary.xlsx');

    this.toastService.info('Plantilla descargada — llénala y súbela');
  }
}

