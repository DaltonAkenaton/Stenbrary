// ╔══════════════════════════════════════════════════════╗
// ║  motivo-form-dialog.component.ts                     ║
// ║  Stenbrary v3.2 — Dialog mejorado                    ║
// ║                                                      ║
// ║  FIXES v3.2:                                         ║
// ║  - Title: padding-top para evitar clipping           ║
// ║  - 12 colores disponibles (antes 7)                  ║
// ║  - Color swatches visuales en vez de dropdown        ║
// ║  - Preview con glow del color seleccionado           ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { Motivo } from '../../../core/models';

interface IconoOpcion {
  nombre: string;
  icono: string;
  categoria: string;
}

interface ColorOpcion {
  nombre: string;
  valor: string;
}

@Component({
    selector: 'app-motivo-form-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatTooltipModule
    ],
    template: `
    <div class="dialog-wrapper">

      <!-- Header con icono decorativo -->
      <div class="dialog-header">
        <div class="header-icon" [class.editing]="!esNuevo">
          <mat-icon>{{ esNuevo ? 'add_circle' : 'edit' }}</mat-icon>
        </div>
        <div class="header-text">
          <h2>{{ esNuevo ? 'Nueva Actividad' : 'Editar Actividad' }}</h2>
          <p>{{ esNuevo ? 'Agrega una actividad disponible para los alumnos' : 'Modifica los datos de esta actividad' }}</p>
        </div>
      </div>

      <mat-dialog-content>
        <form [formGroup]="motivoForm">
          
          <!-- Nombre -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre de la Actividad</mat-label>
            <input 
              matInput 
              formControlName="nombre"
              placeholder="Ej: Estudiar, Expo FEMA, Taller Caterpillar"
              [maxlength]="50">
            <mat-icon matPrefix>label</mat-icon>
            <mat-hint align="end">
              {{ motivoForm.get('nombre')?.value?.length || 0 }}/50
            </mat-hint>
            @if (motivoForm.get('nombre')?.hasError('required')) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
            @if (motivoForm.get('nombre')?.hasError('minlength')) {
              <mat-error>Mínimo 3 caracteres</mat-error>
            }
          </mat-form-field>

          <!-- Descripción -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Descripción (opcional)</mat-label>
            <textarea 
              matInput 
              formControlName="descripcion"
              placeholder="Ej: Evento de reclutamiento con dinámicas y talleres"
              [maxlength]="200"
              rows="3"
              cdkTextareaAutosize
              cdkAutosizeMinRows="2"
              cdkAutosizeMaxRows="4">
            </textarea>
            <mat-icon matPrefix>description</mat-icon>
            <mat-hint>Se mostrará al alumno antes de confirmar su registro</mat-hint>
            <mat-hint align="end">
              {{ motivoForm.get('descripcion')?.value?.length || 0 }}/200
            </mat-hint>
          </mat-form-field>

          <!-- Icono -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Icono</mat-label>
            <mat-select formControlName="icono">
              @for (opcion of iconosDisponibles; track opcion.icono) {
                <mat-option [value]="opcion.icono">
                  <mat-icon [style.color]="motivoForm.get('color')?.value || '#00C8D7'">
                    {{ opcion.icono }}
                  </mat-icon>
                  <span class="icono-nombre">{{ opcion.nombre }}</span>
                </mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>insert_emoticon</mat-icon>
          </mat-form-field>

          <!-- Color — Swatches visuales -->
          <div class="color-section">
            <label class="color-label">Color</label>
            <div class="color-swatches">
              @for (color of coloresDisponibles; track color.valor) {
                <button
                  type="button"
                  class="color-swatch"
                  [class.active]="motivoForm.get('color')?.value === color.valor"
                  [style.background]="color.valor"
                  [matTooltip]="color.nombre"
                  (click)="seleccionarColor(color.valor)">
                  @if (motivoForm.get('color')?.value === color.valor) {
                    <mat-icon>check</mat-icon>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Preview -->
          <div class="preview-section">
            <span class="preview-label">Vista previa</span>
            <div class="preview-card"
              [style.border-color]="(motivoForm.get('color')?.value || '#00C8D7') + '40'">
              <div class="preview-icon-wrap"
                [style.background]="(motivoForm.get('color')?.value || '#00C8D7') + '18'"
                [style.border-color]="(motivoForm.get('color')?.value || '#00C8D7') + '35'">
                <mat-icon [style.color]="motivoForm.get('color')?.value || '#00C8D7'">
                  {{ motivoForm.get('icono')?.value || 'label' }}
                </mat-icon>
              </div>
              <div class="preview-text">
                <span class="preview-name">
                  {{ motivoForm.get('nombre')?.value || 'Nombre de la actividad' }}
                </span>
                @if (motivoForm.get('descripcion')?.value) {
                  <span class="preview-desc">
                    {{ motivoForm.get('descripcion')?.value }}
                  </span>
                }
              </div>
            </div>
          </div>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button class="btn-cancel" (click)="cancelar()" [disabled]="guardando">
          Cancelar
        </button>
        <button 
          class="btn-save"
          (click)="guardar()"
          [disabled]="motivoForm.invalid || guardando">
          @if (!guardando) {
            <mat-icon>save</mat-icon>
            <span>Guardar</span>
          } @else {
            <mat-spinner diameter="18"></mat-spinner>
            <span>Guardando...</span>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .dialog-wrapper {
      min-width: 460px;
      max-width: 520px;
    }

    /* ── Header ── */
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0 16px;
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

      &.editing {
        background: rgba(245, 166, 35, 0.10);
        border-color: rgba(245, 166, 35, 0.25);

        mat-icon { color: #F5A623; }
      }
    }

    .header-text {
      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #E8F4F8;
        line-height: 1.3;
      }

      p {
        margin: 2px 0 0;
        font-size: 0.78rem;
        color: rgba(200, 230, 240, 0.55);
      }
    }

    mat-dialog-content {
      padding: 8px 0 0;
      max-height: 60vh;
    }

    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }

    .icono-nombre {
      margin-left: 12px;
      vertical-align: middle;
    }

    /* ── Color Swatches ── */
    .color-section {
      margin-bottom: 16px;
    }

    .color-label {
      display: block;
      font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.55);
      margin-bottom: 8px;
      font-weight: 500;
    }

    .color-swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .color-swatch {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 200ms ease;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #04090F;
        font-weight: bold;
      }

      &:hover {
        transform: scale(1.12);
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
      }

      &.active {
        border-color: #E8F4F8;
        transform: scale(1.12);
        box-shadow: 0 0 16px currentColor;
      }
    }

    /* ── Preview ── */
    .preview-section {
      margin-top: 16px;
      padding: 14px;
      background: #0D1626;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 14px;
    }

    .preview-label {
      display: block;
      font-size: 0.7rem;
      color: rgba(160, 200, 215, 0.45);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.06em;
      font-family: 'Space Mono', monospace;
      margin-bottom: 10px;
    }

    .preview-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      background: #142033;
      border-radius: 12px;
      border: 1px solid rgba(0, 200, 215, 0.10);
      transition: border-color 300ms;
    }

    .preview-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid;
      flex-shrink: 0;
      transition: all 300ms;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .preview-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .preview-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #E8F4F8;
    }

    .preview-desc {
      font-size: 0.72rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.4;
    }

    /* ── Actions ── */
    mat-dialog-actions {
      padding: 16px 0 4px;
      margin: 0;
      gap: 8px;
    }

    .btn-cancel {
      color: rgba(200, 230, 240, 0.6) !important;
      font-weight: 500;
    }

    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      border: none;
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 200ms;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(0, 200, 215, 0.35);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      mat-spinner { display: inline-block; }
    }

    @media (max-width: 768px) {
      .dialog-wrapper {
        min-width: auto;
        max-width: 100%;
      }
    }
  `]
})
export class MotivoFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<MotivoFormDialogComponent>>(MatDialogRef);
  private databaseService = inject(DatabaseService);
  private toastService = inject(ToastService);
  data = inject<{
    motivo: Motivo | null;
    esNuevo: boolean;
}>(MAT_DIALOG_DATA);

  motivoForm!: FormGroup;
  guardando = false;
  esNuevo = true;

  // ── Iconos disponibles (ampliado) ──
  iconosDisponibles: IconoOpcion[] = [
    { nombre: 'Libro', icono: 'menu_book', categoria: 'Lectura' },
    { nombre: 'Estudiar', icono: 'school', categoria: 'Académico' },
    { nombre: 'Investigar', icono: 'science', categoria: 'Académico' },
    { nombre: 'Leer', icono: 'auto_stories', categoria: 'Lectura' },
    { nombre: 'Computadora', icono: 'computer', categoria: 'Tecnología' },
    { nombre: 'Escribir', icono: 'create', categoria: 'Académico' },
    { nombre: 'Buscar', icono: 'search', categoria: 'General' },
    { nombre: 'Grupos', icono: 'groups', categoria: 'Social' },
    { nombre: 'Tareas', icono: 'assignment', categoria: 'Académico' },
    { nombre: 'Proyecto', icono: 'work', categoria: 'Profesional' },
    { nombre: 'Examen', icono: 'quiz', categoria: 'Académico' },
    { nombre: 'Imprimir', icono: 'print', categoria: 'Servicio' },
    { nombre: 'WiFi', icono: 'wifi', categoria: 'Servicio' },
    { nombre: 'Navegar', icono: 'language', categoria: 'Tecnología' },
    { nombre: 'Consulta', icono: 'help', categoria: 'General' },
    { nombre: 'Evento', icono: 'event', categoria: 'Evento' },
    { nombre: 'Presentación', icono: 'slideshow', categoria: 'Evento' },
    { nombre: 'Reunión', icono: 'meeting_room', categoria: 'Social' },
    { nombre: 'Pedir Libro', icono: 'bookmark', categoria: 'Lectura' },
    { nombre: 'Trabajo', icono: 'engineering', categoria: 'Profesional' },
    { nombre: 'Otro', icono: 'more_horiz', categoria: 'General' }
  ];

  // ── 12 colores (ampliado de 7 a 12) ──
  coloresDisponibles: ColorOpcion[] = [
    { nombre: 'Cyan', valor: '#00C8D7' },
    { nombre: 'Teal', valor: '#0BC4B7' },
    { nombre: 'Verde', valor: '#0EB07B' },
    { nombre: 'Esmeralda', valor: '#34D399' },
    { nombre: 'Azul', valor: '#3B82F6' },
    { nombre: 'Índigo', valor: '#6366F1' },
    { nombre: 'Violeta', valor: '#8B5CF6' },
    { nombre: 'Rosa', valor: '#EC4899' },
    { nombre: 'Rojo', valor: '#F05252' },
    { nombre: 'Naranja', valor: '#F97316' },
    { nombre: 'Ámbar', valor: '#F5A623' },
    { nombre: 'Celeste', valor: '#5DE4EC' },
  ];

  constructor() {
    const data = this.data;

    this.esNuevo = data.esNuevo;
  }

  ngOnInit(): void {
    this.motivoForm = this.fb.group({
      nombre: [
        this.data.motivo?.nombre || '',
        [Validators.required, Validators.minLength(3)]
      ],
      descripcion: [
        this.data.motivo?.descripcion || '',
        [Validators.maxLength(200)]
      ],
      icono: [
        this.data.motivo?.icono || 'menu_book',
        Validators.required
      ],
      color: [
        this.data.motivo?.color || '#00C8D7',
        Validators.required
      ]
    });
  }

  seleccionarColor(color: string): void {
    this.motivoForm.get('color')?.setValue(color);
  }

  async guardar(): Promise<void> {
    if (this.motivoForm.invalid) return;

    try {
      this.guardando = true;

      const formValue = this.motivoForm.value;
      const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();

      // Dos motivos con el mismo nombre son indistinguibles para el alumno
      // y en los reportes (M17). Se compara sin mayúsculas ni acentos.
      const normalizar = (t: string) =>
        t.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nombreNuevo = normalizar(formValue.nombre ?? '');
      const repetido = todosMotivos.find(m =>
        m.id !== this.data.motivo?.id && normalizar(m.nombre) === nombreNuevo);
      if (repetido) {
        this.toastService.warning(
          `Ya existe la actividad "${repetido.nombre}"${repetido.activo ? '' : ' (desactivada)'}. Usa otro nombre.`);
        this.guardando = false;
        return;
      }

      if (this.esNuevo) {
        const maxOrden = todosMotivos.length > 0
          ? Math.max(...todosMotivos.map(m => m.orden))
          : 0;

        const nuevoMotivo: Omit<Motivo, 'id'> = {
          nombre: formValue.nombre.trim(),
          descripcion: formValue.descripcion?.trim() || undefined,
          icono: formValue.icono,
          color: formValue.color,
          activo: true,
          orden: maxOrden + 1
        };

        await this.databaseService.crearMotivo(nuevoMotivo);
        this.toastService.success(`Actividad "${formValue.nombre}" creada`);
      } else {
        const motivoActualizado: Motivo = {
          ...this.data.motivo!,
          nombre: formValue.nombre.trim(),
          descripcion: formValue.descripcion?.trim() || undefined,
          icono: formValue.icono,
          color: formValue.color
        };

        await this.databaseService.actualizarMotivo(this.data.motivo!.id!, motivoActualizado);
        this.toastService.success(`Actividad "${formValue.nombre}" actualizada`);
      }

      this.guardando = false;
      this.dialogRef.close(true);
    } catch (error) {
      console.error('❌ Error al guardar motivo:', error);
      this.guardando = false;
      this.toastService.error('Error al guardar. Intenta de nuevo.');
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}