import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../../core/services/database.service';
import { Alumno } from '../../../core/models';

@Component({
  selector: 'app-editar-alumno-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>edit</mat-icon>
      Editar Alumno
    </h2>

    <mat-dialog-content>
      <form [formGroup]="editarForm" class="form-container">
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Matrícula</mat-label>
          <input matInput [value]="data.alumno.matricula" readonly>
          <mat-icon matPrefix>badge</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre(s)</mat-label>
          <input matInput formControlName="nombre" placeholder="Juan">
          <mat-icon matPrefix>person</mat-icon>
          <mat-error *ngIf="campoInvalido('nombre')">
            {{ obtenerErrorCampo('nombre') }}
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Apellido Paterno</mat-label>
          <input matInput formControlName="apellidoPaterno" placeholder="Pérez">
          <mat-icon matPrefix>person</mat-icon>
          <mat-error *ngIf="campoInvalido('apellidoPaterno')">
            {{ obtenerErrorCampo('apellidoPaterno') }}
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Apellido Materno</mat-label>
          <input matInput formControlName="apellidoMaterno" placeholder="García">
          <mat-icon matPrefix>person</mat-icon>
          <mat-error *ngIf="campoInvalido('apellidoMaterno')">
            {{ obtenerErrorCampo('apellidoMaterno') }}
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Carrera/Licenciatura</mat-label>
          <mat-select formControlName="carrera">
            <mat-option *ngFor="let carrera of carreras" [value]="carrera">
              {{ carrera }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>school</mat-icon>
          <mat-error *ngIf="campoInvalido('carrera')">
            {{ obtenerErrorCampo('carrera') }}
          </mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Semestre</mat-label>
            <mat-select formControlName="grado">
              <mat-option *ngFor="let grado of grados" [value]="grado">
                {{ grado }}°
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>stairs</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Grupo</mat-label>
            <mat-select formControlName="grupo">
              <mat-option *ngFor="let grupo of grupos" [value]="grupo">
                {{ grupo }}
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>groups</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Turno</mat-label>
            <mat-select formControlName="turno">
              <mat-option *ngFor="let turno of turnos" [value]="turno">
                {{ turno }}
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>

        <div class="error-message" *ngIf="error">
          <mat-icon>error</mat-icon>
          <span>{{ error }}</span>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()" [disabled]="guardando">
        Cancelar
      </button>
      <button mat-raised-button color="primary" 
              (click)="guardar()" 
              [disabled]="editarForm.invalid || guardando">
        <mat-icon *ngIf="!guardando">save</mat-icon>
        <mat-icon *ngIf="guardando" class="spinning">hourglass_empty</mat-icon>
        {{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
      min-width: 500px;
    }

    .full-width {
      width: 100%;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(240, 82, 82, 0.1);
      border: 1px solid rgba(240, 82, 82, 0.3);
      border-radius: 12px;
      color: #F05252;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      color: #E8F4F8;

      mat-icon {
        color: #00C8D7;
      }
    }

    .spinning {
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .form-container {
        min-width: auto;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EditarAlumnoDialogComponent implements OnInit {
  editarForm!: FormGroup;
  guardando = false;
  error: string | null = null;

  carreras = [
    'Contador Público',
    'Licenciatura en Administración',
    'Licenciatura en Autotransporte de Carga',
    'Licenciatura en Comercio Exterior',
    'Licenciatura en Derecho',
    'Licenciatura en Enfermería',
    'Licenciatura en Psicología',
    'Licenciatura en Tecnologías de la Información'
  ];

  grados = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  grupos = ['A', 'B', 'C', 'D', 'E', 'F'];
  turnos: ('Matutino' | 'Vespertino' | 'Mixto')[] = ['Matutino', 'Vespertino', 'Mixto'];

  constructor(
    private fb: FormBuilder,
    private databaseService: DatabaseService,
    private dialogRef: MatDialogRef<EditarAlumnoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { alumno: Alumno }
  ) {}

  ngOnInit(): void {
    this.editarForm = this.fb.group({
      nombre: [this.data.alumno.nombre, [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: [this.data.alumno.apellidoPaterno, [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: [this.data.alumno.apellidoMaterno, [Validators.required, Validators.minLength(2)]],
      carrera: [this.data.alumno.carrera, Validators.required],
      grado: [this.data.alumno.grado, Validators.required],
      grupo: [this.data.alumno.grupo, Validators.required],
      turno: [this.data.alumno.turno, Validators.required]
    });
  }

  async guardar(): Promise<void> {
    if (this.editarForm.invalid) {
      this.error = 'Por favor completa todos los campos correctamente';
      this.marcarCamposComoTocados();
      return;
    }

    try {
      this.guardando = true;
      this.error = null;

      const formValue = this.editarForm.value;

      const alumnoActualizado: Alumno = {
        ...this.data.alumno,
        nombre: formValue.nombre.trim(),
        apellidoPaterno: formValue.apellidoPaterno.trim(),
        apellidoMaterno: formValue.apellidoMaterno.trim(),
        carrera: formValue.carrera,
        grado: Number(formValue.grado),
        grupo: formValue.grupo,
        turno: formValue.turno
      };

      await this.databaseService.actualizarAlumno(this.data.alumno.id!, alumnoActualizado);

      console.log('✅ Alumno actualizado exitosamente');
      this.dialogRef.close(true);

    } catch (error: any) {
      console.error('❌ Error al actualizar alumno:', error);
      this.error = 'Error al guardar los cambios. Intenta de nuevo.';
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.editarForm.controls).forEach(field => {
      const control = this.editarForm.get(field);
      control?.markAsTouched();
    });
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.editarForm.get(campo);
    if (control?.hasError('required')) return 'Este campo es obligatorio';
    if (control?.hasError('minlength')) return 'Mínimo 2 caracteres';
    return '';
  }

  campoInvalido(campo: string): boolean {
    const control = this.editarForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }
}