// ╔══════════════════════════════════════════════════════╗
// ║  motivo-form-dialog.component.ts                     ║
// ║  Stenbrary v3.1 — Con campo de Descripción           ║
// ║                                                      ║
// ║  NUEVO: Campo 'descripcion' para que la coordinadora ║
// ║  pueda explicar qué es cada actividad/motivo.        ║
// ╚══════════════════════════════════════════════════════╝

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { Motivo } from '../../../core/models';

interface IconoOpcion {
  nombre: string;
  icono: string;
  color: string;
}

@Component({
  selector: 'app-motivo-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>
        <mat-icon>{{ esNuevo ? 'add_circle' : 'edit' }}</mat-icon>
        {{ esNuevo ? 'Nueva Actividad' : 'Editar Actividad' }}
      </h2>

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
            <mat-error *ngIf="motivoForm.get('nombre')?.hasError('required')">
              El nombre es obligatorio
            </mat-error>
            <mat-error *ngIf="motivoForm.get('nombre')?.hasError('minlength')">
              Mínimo 3 caracteres
            </mat-error>
          </mat-form-field>

          <!-- Descripción (NUEVO) -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Descripción (opcional)</mat-label>
            <textarea 
              matInput 
              formControlName="descripcion"
              placeholder="Ej: Evento de reclutamiento de Caterpillar con dinámicas y talleres"
              [maxlength]="200"
              rows="3"
              cdkTextareaAutosize
              cdkAutosizeMinRows="2"
              cdkAutosizeMaxRows="4">
            </textarea>
            <mat-icon matPrefix>description</mat-icon>
            <mat-hint align="start">
              Se mostrará al alumno antes de confirmar su registro
            </mat-hint>
            <mat-hint align="end">
              {{ motivoForm.get('descripcion')?.value?.length || 0 }}/200
            </mat-hint>
          </mat-form-field>

          <!-- Icono -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Icono</mat-label>
            <mat-select formControlName="icono">
              <mat-option *ngFor="let opcion of iconosDisponibles" [value]="opcion.icono">
                <mat-icon [style.color]="opcion.color">{{ opcion.icono }}</mat-icon>
                <span class="icono-nombre">{{ opcion.nombre }}</span>
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>insert_emoticon</mat-icon>
          </mat-form-field>

          <!-- Color -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Color</mat-label>
            <mat-select formControlName="color">
              <mat-option value="#00C8D7">
                <span class="color-preview" style="background: #00C8D7;"></span>
                Cyan
              </mat-option>
              <mat-option value="#0BC4B7">
                <span class="color-preview" style="background: #0BC4B7;"></span>
                Teal
              </mat-option>
              <mat-option value="#0EB07B">
                <span class="color-preview" style="background: #0EB07B;"></span>
                Verde
              </mat-option>
              <mat-option value="#F5A623">
                <span class="color-preview" style="background: #F5A623;"></span>
                Ámbar
              </mat-option>
              <mat-option value="#F05252">
                <span class="color-preview" style="background: #F05252;"></span>
                Rojo
              </mat-option>
              <mat-option value="#5DE4EC">
                <span class="color-preview" style="background: #5DE4EC;"></span>
                Celeste
              </mat-option>
              <mat-option value="#A0F0F5">
                <span class="color-preview" style="background: #A0F0F5;"></span>
                Hielo
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>palette</mat-icon>
          </mat-form-field>

          <!-- Preview -->
          <div class="preview-container">
            <h4>Vista Previa</h4>
            <div class="preview-motivo">
              <div class="preview-icon">
                <mat-icon [style.color]="motivoForm.get('color')?.value">
                  {{ motivoForm.get('icono')?.value || 'label' }}
                </mat-icon>
              </div>
              <div class="preview-info">
                <span class="preview-name">
                  {{ motivoForm.get('nombre')?.value || 'Nombre de la actividad' }}
                </span>
                <span class="preview-desc" *ngIf="motivoForm.get('descripcion')?.value">
                  {{ motivoForm.get('descripcion')?.value }}
                </span>
              </div>
            </div>
          </div>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancelar()" [disabled]="guardando">
          Cancelar
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="guardar()"
          [disabled]="motivoForm.invalid || guardando">
          <mat-icon *ngIf="!guardando">save</mat-icon>
          <mat-spinner diameter="20" *ngIf="guardando"></mat-spinner>
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 420px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 1.4rem;
      color: #E8F4F8;

      mat-icon {
        color: #00C8D7;
      }
    }

    mat-dialog-content {
      padding: 24px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    .icono-nombre {
      margin-left: 12px;
      vertical-align: middle;
    }

    .color-preview {
      display: inline-block;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      margin-right: 8px;
      vertical-align: middle;
      border: 1px solid rgba(0, 200, 215, 0.3);
    }

    .preview-container {
      margin-top: 16px;
      padding: 16px;
      background: #0D1626;
      border: 1px solid rgba(0, 200, 215, 0.10);
      border-radius: 12px;
      
      h4 {
        margin: 0 0 12px 0;
        font-size: 0.8rem;
        color: rgba(160, 200, 215, 0.40);
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
        font-family: 'Space Mono', monospace;
      }
      
      .preview-motivo {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        background: #142033;
        border-radius: 12px;
        border: 1px solid rgba(0, 200, 215, 0.10);
      }

      .preview-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: rgba(0, 200, 215, 0.08);
        border: 1px solid rgba(0, 200, 215, 0.20);
        border-radius: 10px;
        flex-shrink: 0;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .preview-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
        
      .preview-name {
        font-size: 1rem;
        font-weight: 600;
        color: #E8F4F8;
      }

      .preview-desc {
        font-size: 0.75rem;
        color: rgba(200, 230, 240, 0.55);
        line-height: 1.4;
      }
    }

    mat-dialog-actions {
      padding: 16px 0 0 0;
      margin: 0;
      
      button {
        margin-left: 8px;
      }
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    @media (max-width: 768px) {
      .dialog-container {
        min-width: auto;
      }
    }
  `]
})
export class MotivoFormDialogComponent implements OnInit {
  motivoForm!: FormGroup;
  guardando = false;
  esNuevo = true;

  iconosDisponibles: IconoOpcion[] = [
    { nombre: 'Libro', icono: 'menu_book', color: '#00C8D7' },
    { nombre: 'Estudiar', icono: 'school', color: '#00C8D7' },
    { nombre: 'Investigar', icono: 'science', color: '#0BC4B7' },
    { nombre: 'Leer', icono: 'auto_stories', color: '#5DE4EC' },
    { nombre: 'Computadora', icono: 'computer', color: '#00C8D7' },
    { nombre: 'Escribir', icono: 'create', color: '#0EB07B' },
    { nombre: 'Buscar', icono: 'search', color: '#0BC4B7' },
    { nombre: 'Grupos', icono: 'groups', color: '#F5A623' },
    { nombre: 'Tareas', icono: 'assignment', color: '#F5A623' },
    { nombre: 'Proyecto', icono: 'work', color: '#00C8D7' },
    { nombre: 'Examen', icono: 'quiz', color: '#F05252' },
    { nombre: 'Imprimir', icono: 'print', color: '#0BC4B7' },
    { nombre: 'WiFi', icono: 'wifi', color: '#0EB07B' },
    { nombre: 'Navegar', icono: 'language', color: '#0BC4B7' },
    { nombre: 'Consulta', icono: 'help', color: '#5DE4EC' },
    { nombre: 'Evento', icono: 'event', color: '#F5A623' },
    { nombre: 'Presentación', icono: 'slideshow', color: '#00C8D7' },
    { nombre: 'Reunión', icono: 'meeting_room', color: '#0BC4B7' },
    { nombre: 'Otro', icono: 'more_horiz', color: '#A0F0F5' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MotivoFormDialogComponent>,
    private databaseService: DatabaseService,
    private toastService: ToastService,
    @Inject(MAT_DIALOG_DATA) public data: { motivo: Motivo | null; esNuevo: boolean }
  ) {
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

  async guardar(): Promise<void> {
    if (this.motivoForm.invalid) return;

    try {
      this.guardando = true;

      const formValue = this.motivoForm.value;

      if (this.esNuevo) {
        const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();
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
        this.toastService.success(`Actividad "${formValue.nombre}" creada exitosamente`);
      } else {
        const motivoActualizado: Motivo = {
          ...this.data.motivo!,
          nombre: formValue.nombre.trim(),
          descripcion: formValue.descripcion?.trim() || undefined,
          icono: formValue.icono,
          color: formValue.color
        };

        await this.databaseService.actualizarMotivo(this.data.motivo!.id!, motivoActualizado);
        this.toastService.success(`Actividad "${formValue.nombre}" actualizada exitosamente`);
      }

      this.guardando = false;
      this.dialogRef.close(true);
    } catch (error) {
      console.error('❌ Error al guardar motivo:', error);
      this.guardando = false;
      this.toastService.error('Error al guardar la actividad. Intenta de nuevo.');
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}