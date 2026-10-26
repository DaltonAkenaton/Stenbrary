// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/detalle-alumno/              ║
// ║        editar-alumno-dialog/                         ║
// ║        editar-alumno-dialog.component.ts             ║
// ║  Stenbrary v3.4 — Catálogo unificado + responsive    ║
// ║                                                      ║
// ║  FIX v3.4:                                           ║
// ║  - Carreras importadas desde catalogos.constants.ts  ║
// ║  - Responsive: min-width removido en mobile          ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, inject } from '@angular/core';
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
import { TURNOS } from '../../../core/constants/catalogos.constants';
import { gradosDe, opcionesCarrera } from '../../../core/utils/catalogos.utils';
import { ConfigService } from '../../../core/services/config.service';
import { logError } from '../../../core/utils/logger';
import { limpiarNombre } from '../../../core/utils/nombres.utils';
import { BitacoraService, describirAlumno } from '../../../core/services/bitacora.service';

@Component({
    selector: 'app-editar-alumno-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
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
          @if (campoInvalido('nombre')) {
            <mat-error>{{ obtenerErrorCampo('nombre') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Apellido Paterno</mat-label>
          <input matInput formControlName="apellidoPaterno" placeholder="Pérez">
          <mat-icon matPrefix>person</mat-icon>
          @if (campoInvalido('apellidoPaterno')) {
            <mat-error>{{ obtenerErrorCampo('apellidoPaterno') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Apellido Materno (opcional)</mat-label>
          <input matInput formControlName="apellidoMaterno" placeholder="García">
          <mat-icon matPrefix>person</mat-icon>
          @if (campoInvalido('apellidoMaterno')) {
            <mat-error>{{ obtenerErrorCampo('apellidoMaterno') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Carrera/Licenciatura</mat-label>
          <mat-select formControlName="carrera">
            @for (carrera of carreras; track carrera) {
              <mat-option [value]="carrera">{{ carrera }}</mat-option>
            }
          </mat-select>
          <mat-icon matPrefix>school</mat-icon>
          @if (campoInvalido('carrera')) {
            <mat-error>{{ obtenerErrorCampo('carrera') }}</mat-error>
          }
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Semestre</mat-label>
            <mat-select formControlName="grado">
              @for (grado of grados; track grado) {
                <mat-option [value]="grado">{{ grado }}°</mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>stairs</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Grupo</mat-label>
            <mat-select formControlName="grupo">
              @for (grupo of grupos; track grupo) {
                <mat-option [value]="grupo">{{ grupo }}</mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>groups</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Turno</mat-label>
            <mat-select formControlName="turno">
              @for (turno of turnos; track turno) {
                <mat-option [value]="turno">{{ turno }}</mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>

        @if (error) {
          <div class="error-message">
            <mat-icon>error</mat-icon>
            <span>{{ error }}</span>
          </div>
        }

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()" [disabled]="guardando">
        Cancelar
      </button>
      <button mat-raised-button color="primary"
              (click)="guardar()"
              [disabled]="editarForm.invalid || guardando">
        @if (guardando) {
          <mat-icon class="spinning">hourglass_empty</mat-icon>
        } @else {
          <mat-icon>save</mat-icon>
        }
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
      min-width: 400px;
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
  private fb = inject(FormBuilder);
  private databaseService = inject(DatabaseService);
  private dialogRef = inject<MatDialogRef<EditarAlumnoDialogComponent>>(MatDialogRef);
  data = inject<{
    alumno: Alumno;
}>(MAT_DIALOG_DATA);

  editarForm!: FormGroup;
  guardando = false;
  error: string | null = null;

  // v3.57.0: del catálogo editable. Se suman los valores que ya tiene el
  // alumno aunque no estén (carrera desactivada, grupo quitado): si no, el
  // select los dejaría en blanco y guardar los borraría.
  private readonly datos = inject<{ alumno: Alumno }>(MAT_DIALOG_DATA);
  private readonly catalogo = inject(ConfigService).catalogoEscolar;
  carreras = opcionesCarrera(this.catalogo, this.datos.alumno.carrera);
  grados = [...new Set([...gradosDe(this.catalogo), this.datos.alumno.grado].filter(g => g > 0))].sort((a, b) => a - b);
  grupos = this.datos.alumno.grupo && !this.catalogo.grupos.includes(this.datos.alumno.grupo)
    ? [...this.catalogo.grupos, this.datos.alumno.grupo] : this.catalogo.grupos;
  turnos = TURNOS;

  private readonly bitacora = inject(BitacoraService);

  ngOnInit(): void {
    this.editarForm = this.fb.group({
      nombre: [this.data.alumno.nombre, [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: [this.data.alumno.apellidoPaterno, [Validators.required, Validators.minLength(2)]],
      // Opcional desde v3.54.0: hay quien tiene un solo apellido.
      apellidoMaterno: [this.data.alumno.apellidoMaterno ?? ''],
      carrera: [this.data.alumno.carrera, Validators.required],
      grado: [this.data.alumno.grado, Validators.required],
      grupo: [this.data.alumno.grupo, Validators.required],
      turno: [this.data.alumno.turno, Validators.required],
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
        nombre: limpiarNombre(formValue.nombre),
        apellidoPaterno: limpiarNombre(formValue.apellidoPaterno),
        apellidoMaterno: limpiarNombre(formValue.apellidoMaterno),
        carrera: formValue.carrera,
        grado: Number(formValue.grado),
        grupo: formValue.grupo,
        turno: formValue.turno,
      };

      await this.databaseService.actualizarAlumno(this.data.alumno.id!, alumnoActualizado);
      this.bitacora.registrar('alumno-editado', describirAlumno(alumnoActualizado));

      this.dialogRef.close(true);
    } catch (error: any) {
      logError('❌ Error al actualizar alumno:', error);
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