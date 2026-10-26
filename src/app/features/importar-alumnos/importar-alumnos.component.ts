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

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { TURNOS } from '../../core/constants/catalogos.constants';
import { ConfigService } from '../../core/services/config.service';
import { agregarCarrera, buscarCarrera } from '../../core/utils/catalogos.utils';
import { BitacoraService } from '../../core/services/bitacora.service';
import {
  CAMPOS_IMPORTACION, CampoImportacion, DefCampo, FilaImportacion, MapeoColumnas,
  camposFaltantes, detectarMapeo, procesarFilas,
} from '../../core/utils/importacion.utils';

interface ResultadoImportacion {
  total: number;
  importados: number;
  duplicados: number;
  invalidos: number;
  errores: string[];
}

@Component({
    selector: 'app-importar-alumnos',
    imports: [
        CommonModule,
        FormsModule,
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
            El sistema reconoce columnas como "Matrícula", "Cuenta", "No. de control",
            "Primer apellido" o "Programa educativo", y en la vista previa puedes
            corregir qué columna se usa para cada dato.
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

        <!-- Columnas: qué columna del archivo se usó para cada campo -->
        <div class="mapeo">
          <p class="mapeo-titulo">
            <mat-icon>view_column</mat-icon>
            Columnas del archivo — revisa que cada dato salga de la columna correcta
          </p>
          <div class="mapeo-grid">
            @for (def of campos; track def.campo) {
              <label class="mapeo-item" [class.mapeo-falta]="def.obligatorio && !mapeo[def.campo]">
                <span>{{ def.etiqueta }}{{ def.obligatorio ? '' : ' (opcional)' }}</span>
                <select [ngModel]="mapeo[def.campo] ?? ''" (ngModelChange)="cambiarMapeo(def.campo, $event)">
                  <option value="">— no usar —</option>
                  @for (col of columnasArchivo; track col) {
                    <option [value]="col">{{ col }}</option>
                  }
                </select>
              </label>
            }
          </div>
          @if (faltantes.length > 0) {
            <p class="mapeo-aviso">
              <mat-icon>error</mat-icon>
              Elige la columna de: {{ etiquetasFaltantes }}. Sin eso no se puede importar.
            </p>
          }
        </div>

        <!-- Carreras que no están en el catálogo (v3.57.0) -->
        @if (carrerasNuevas.length > 0) {
          <div class="mapeo carreras-nuevas">
            <p class="mapeo-titulo">
              <mat-icon class="icon-aviso">warning</mat-icon>
              Carreras que no están en el catálogo. Se importan tal cual; agrégalas si son válidas,
              o corrige el Excel si están mal escritas.
            </p>
            @for (c of carrerasNuevas; track c.nombre) {
              <div class="carrera-nueva">
                <span><strong>{{ c.nombre }}</strong> · {{ c.filas }} {{ c.filas === 1 ? 'fila' : 'filas' }}</span>
                <button mat-stroked-button type="button" (click)="agregarCarreraAlCatalogo(c.nombre)">
                  <mat-icon>playlist_add</mat-icon> Agregar al catálogo
                </button>
              </div>
            }
          </div>
        }

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
                @if (fila.valido && fila.avisos.length > 0) {
                  <mat-icon class="icon-aviso" [matTooltip]="fila.avisos.join(', ')">warning</mat-icon>
                } @else if (fila.valido) {
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
                {{ fila.apellidoPaterno || '—' }} {{ fila.apellidoMaterno }}
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
                  [disabled]="filasValidas === 0 || importando || faltantes.length > 0">
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
    .icon-aviso { color: #F5A623 !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }

    /* ── Mapeo de columnas ── */
    .mapeo {
      margin-bottom: 20px;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid rgba(0, 200, 215, 0.15);
      background: rgba(0, 200, 215, 0.04);
    }
    .mapeo-titulo {
      display: flex; align-items: center; gap: 8px;
      margin: 0 0 12px; font-size: 0.85rem; color: rgba(200, 230, 240, 0.8);
    }
    .mapeo-titulo mat-icon { font-size: 18px; width: 18px; height: 18px; color: #00C8D7; }
    .mapeo-grid {
      display: grid; gap: 10px;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    }
    .mapeo-item { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: rgba(200, 230, 240, 0.6); }
    .mapeo-item select {
      padding: 7px 8px; border-radius: 8px; font-size: 0.85rem;
      background: #0F1A2A; color: #E8F4F8; border: 1px solid rgba(200, 230, 240, 0.15);
    }
    .mapeo-falta span { color: #F05252; font-weight: 600; }
    .mapeo-falta select { border-color: #F05252; }
    .mapeo-aviso {
      display: flex; align-items: center; gap: 6px;
      margin: 12px 0 0; font-size: 0.82rem; color: #F05252;
    }
    .mapeo-aviso mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .carrera-nueva {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
      padding: 6px 0; font-size: 0.85rem;
    }

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
  `]
})
export class ImportarAlumnosComponent {
  private databaseService = inject(DatabaseService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);


  paso: 'seleccionar' | 'preview' | 'resultado' = 'seleccionar';
  nombreArchivo = '';
  importando = false;

  // Preview
  filas: FilaImportacion[] = [];
  columnasPreview = ['estado', 'fila', 'matricula', 'nombre', 'apellidos', 'carrera', 'grado', 'grupo', 'turno'];

  /** Filas tal como vienen del archivo: se reprocesan si cambia el mapeo de columnas. */
  private filasCrudas: Record<string, unknown>[] = [];
  readonly campos = CAMPOS_IMPORTACION;
  columnasArchivo: string[] = [];
  mapeo: MapeoColumnas = detectarMapeo([]);
  faltantes: DefCampo[] = [];

  get etiquetasFaltantes(): string {
    return this.faltantes.map(f => f.etiqueta).join(', ');
  }

  // Matrículas ya existentes en BD (pre-validación)
  private matriculasExistentes = new Set<string>();

  // Resultado
  resultado: ResultadoImportacion | null = null;

  private readonly bitacora = inject(BitacoraService);
  private readonly configService = inject(ConfigService);

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

  private procesarDatos(jsonData: Record<string, unknown>[]): void {
    this.filasCrudas = jsonData;
    this.columnasArchivo = Object.keys(jsonData[0] ?? {});
    // Detección automática; la vista previa muestra el resultado y deja corregirlo.
    this.mapeo = detectarMapeo(this.columnasArchivo);
    this.reprocesar();
  }

  /** Normaliza y valida todas las filas con el mapeo actual (importacion.utils). */
  private reprocesar(): void {
    this.faltantes = camposFaltantes(this.mapeo);
    // v3.57.0: del catálogo editable. Se emparejan también las desactivadas
    // (un padrón viejo las trae) para no partir la carrera en dos nombres.
    const cat = this.configService.catalogoEscolar;
    this.filas = procesarFilas(
      this.filasCrudas, this.mapeo, this.matriculasExistentes, cat.carreras.map(c => c.nombre), TURNOS,
      cat.gradoMax, cat.gradoMin,
    );
    const fuera = new Map<string, number>();
    for (const f of this.filas) {
      if (f.carrera && !buscarCarrera(cat, f.carrera)) fuera.set(f.carrera, (fuera.get(f.carrera) ?? 0) + 1);
    }
    this.carrerasNuevas = [...fuera.entries()].map(([nombre, filas]) => ({ nombre, filas }));
  }

  /** Carreras del archivo que no están en el catálogo (v3.57.0). */
  carrerasNuevas: { nombre: string; filas: number }[] = [];

  /** "Agregar al catálogo" desde la vista previa: queda disponible para registrar. */
  agregarCarreraAlCatalogo(nombre: string): void {
    const r = agregarCarrera(this.configService.catalogoEscolar, nombre);
    if (!r.ok) { this.toastService.warning(r.error); return; }
    this.configService.setCatalogoEscolar(r.catalogo);
    this.bitacora.registrar('catalogo-cambiado', `Carrera agregada desde la importación: ${nombre}`);
    this.toastService.success(`"${nombre}" agregada al catálogo`);
    this.reprocesar();
  }

  cambiarMapeo(campo: CampoImportacion, columna: string): void {
    this.mapeo = { ...this.mapeo, [campo]: columna || null };
    this.reprocesar();
  }

  // ═══════════════════════════════════════════════
  // PASO 3: IMPORTAR
  // ═══════════════════════════════════════════════

  async importar(): Promise<void> {
    const validas = this.filas.filter(f => f.valido);
    if (validas.length === 0) return;

    try {
      this.importando = true;

      const resultado: ResultadoImportacion = {
        total: validas.length,
        importados: 0,
        duplicados: 0,
        invalidos: this.filasInvalidas,
        errores: [],
      };

      // Progreso real. Antes era un spinner con texto fijo: con 500+ alumnos
      // la pantalla se veía congelada varios segundos y no había forma de
      // distinguirla de una app colgada.
      //
      // Sobre interrumpir a media importación (cerrar pestaña, navegar, que
      // se apague el equipo): cada alumno se escribe en su propia transacción
      // de IndexedDB, así que NO hay corrupción — quedan los ya escritos y
      // faltan los demás. Y volver a correr el mismo archivo es seguro: el
      // índice `by-matricula` es único, los ya existentes caen en el catch y
      // se cuentan como duplicados. La importación es reanudable por diseño.
      this.loadingService.progress(
        0, validas.length,
        'Importando alumnos...',
        'Si se interrumpe, puedes volver a cargar el mismo archivo sin duplicar.',
      );

      let procesados = 0;
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
        } catch {
          // Matrícula duplicada en la base de datos
          resultado.duplicados++;
        }

        procesados++;
        // Refrescar cada 10 filas (y siempre en la última): pintar 500 veces
        // cuesta más que la propia escritura y hace la barra más lenta que
        // el trabajo que reporta.
        if (procesados % 10 === 0 || procesados === validas.length) {
          this.loadingService.progress(
            procesados, validas.length,
            'Importando alumnos...',
            'Si se interrumpe, puedes volver a cargar el mismo archivo sin duplicar.',
          );
          // Ceder el hilo para que el navegador pinte el avance.
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (resultado.importados > 0) {
        void this.bitacora.registrar('alumnos-importados',
          `${resultado.importados} alumnos desde "${this.nombreArchivo}"` +
          (resultado.duplicados ? `, ${resultado.duplicados} ya existían` : ''));
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
    } catch {
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
    // Sin la "a": así la busca el escáner (antes el ejemplo inducía a guardarla con prefijo).
    const ejemplo = ['2299990003', 'Juan', 'García', 'López', 'Contador Público', '4', 'A', 'Matutino'];

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

