// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/registro-alumno/             ║
// ║        registro-alumno.component.ts                  ║
// ║  Stenbrary v3.4 — Catálogo unificado                 ║
// ║                                                      ║
// ║  FIX v3.4:                                           ║
// ║  - Carreras, grados, grupos y turnos importados      ║
// ║    desde catalogos.constants.ts (fuente única)       ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { CARRERAS, GRADOS, GRUPOS, TURNOS } from '../../core/constants/catalogos.constants';
import { validarMatricula, MATRICULA_CONFIG, normalizarMatricula } from '../../core/utils/matricula.utils';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-registro-alumno',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './registro-alumno.component.html',
  styleUrl: './registro-alumno.component.scss',
})
export class RegistroAlumnoComponent implements OnInit {
  registroForm!: FormGroup;
  cargando = false;
  error: string | null = null;

  matricula = '';
  matriculaBloqueada = false;
  vieneDelScanner = false;

  // FIX v3.4: Catálogos centralizados (fuente única de verdad)
  carreras = CARRERAS;
  grados = GRADOS;
  grupos = GRUPOS;
  turnos = TURNOS;

  constructor(
    private fb: FormBuilder,
    private databaseService: DatabaseService,
    private router: Router,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    const matriculaTemp = sessionStorage.getItem('matriculaTemp');

    if (matriculaTemp) {
      this.matricula = matriculaTemp;
      this.matriculaBloqueada = true;
      this.vieneDelScanner = true;
      console.log('📝 Registrando alumno desde scanner, matrícula:', this.matricula);
    } else {
      this.matricula = '';
      this.matriculaBloqueada = false;
      this.vieneDelScanner = false;
      console.log('📝 Registro de alumno — acceso directo');
    }

    this.registroForm = this.fb.group({
            matricula: [
        { value: this.matricula, disabled: this.matriculaBloqueada },
        [Validators.required, Validators.minLength(MATRICULA_CONFIG.minDigitos)]
      ],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: ['', [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: ['', [Validators.required, Validators.minLength(2)]],
      carrera: ['', Validators.required],
      grado: ['', Validators.required],
      grupo: ['', Validators.required],
      turno: ['', Validators.required],
    });
  }

  async registrarAlumno(): Promise<void> {
    if (this.registroForm.invalid) {
      this.error = 'Por favor completa todos los campos correctamente';
      this.toastService.warning('Por favor completa todos los campos correctamente');
      this.marcarCamposComoTocados();
      return;
    }

    try {
      this.cargando = true;
      this.error = null;
      this.loadingService.show('Registrando alumno...');

      const formValue = this.registroForm.getRawValue();


            const matriculaRaw = this.matriculaBloqueada ? this.matricula : formValue.matricula.trim();
      const matriculaFinal = normalizarMatricula(matriculaRaw);

      const nuevoAlumno: Omit<Alumno, 'id' | 'fechaRegistro'> = {
        matricula: matriculaFinal,
        nombre: formValue.nombre.trim(),
        apellidoPaterno: formValue.apellidoPaterno.trim(),
        apellidoMaterno: formValue.apellidoMaterno.trim(),
        carrera: formValue.carrera,
        grado: Number(formValue.grado),
        grupo: formValue.grupo,
        turno: formValue.turno,
        activo: true,
      };

      const alumnoCreado = await this.databaseService.crearAlumno(nuevoAlumno);

      console.log('✅ Alumno registrado:', alumnoCreado);
      this.loadingService.hide();
      this.toastService.success(`Alumno ${formValue.nombre} ${formValue.apellidoPaterno} registrado exitosamente`);

      if (this.vieneDelScanner) {
        sessionStorage.setItem('alumnoActual', JSON.stringify(alumnoCreado));
        sessionStorage.removeItem('matriculaTemp');
        this.router.navigate(['/seleccion-motivo']);
      } else {
        this.cargando = false;
        const dialogData: ConfirmDialogData = {
          titulo: 'Alumno registrado',
          mensaje: `${formValue.nombre} ${formValue.apellidoPaterno} fue registrado correctamente. ¿Deseas registrar otro alumno?`,
          textoConfirmar: 'Registrar otro',
          textoCancelar: 'Ir al escáner',
          variante: 'info',
        };
        const ref = this.dialog.open(ConfirmDialogComponent, {
          width: '400px',
          data: dialogData,
        });
        ref.afterClosed().subscribe((otro: boolean) => {
          if (otro) {
            this.registroForm.reset();
          } else {
            this.router.navigate(['/scanner']);
          }
        });
      }
    } catch (error: any) {
      console.error('❌ Error al registrar alumno:', error);
      this.loadingService.hide();

      const esDuplicado = error.name === 'ConstraintError'
        || (error.message && (error.message.includes('already exists') || error.message.includes('constraint')));

      if (esDuplicado) {
        this.error = 'Esta matrícula ya está registrada en el sistema';
        this.toastService.error('Esta matrícula ya está registrada');
      } else {
        this.error = 'Error al registrar el alumno. Intenta de nuevo.';
        this.toastService.error('Error al registrar el alumno. Intenta de nuevo.');
      }

      this.cargando = false;
    }
  }

  async cancelar(): Promise<void> {
    if (this.tieneCamposLlenados()) {
      const confirmado = await this.pedirConfirmacionDescartar();
      if (!confirmado) return;
    }

    sessionStorage.removeItem('matriculaTemp');

    if (this.vieneDelScanner) {
      this.toastService.info('Registro cancelado');
      this.router.navigate(['/scanner']);
    } else {
      this.registroForm.reset();
      this.toastService.info('Formulario limpiado');
    }
  }

  /**
   * True si algún campo (excepto la matrícula bloqueada prellenada por el
   * scanner) tiene contenido. Si el usuario venía del scanner y todavía no ha
   * tocado nada, no hay nada que perder.
   */
  private tieneCamposLlenados(): boolean {
    const valores = this.registroForm.getRawValue();
    const campos = ['nombre', 'apellidoPaterno', 'apellidoMaterno', 'carrera', 'grado', 'grupo', 'turno'];
    const alguno = campos.some((c) => {
      const v = valores[c];
      return typeof v === 'string' ? v.trim() !== '' : v !== null && v !== undefined && v !== '';
    });
    // Si NO viene del scanner, también considerar la matrícula.
    if (!this.vieneDelScanner) {
      const m = (valores.matricula ?? '').toString().trim();
      if (m !== '') return true;
    }
    return alguno;
  }

  private async pedirConfirmacionDescartar(): Promise<boolean> {
    const data: ConfirmDialogData = {
      titulo: this.vieneDelScanner ? 'Cancelar registro' : 'Limpiar formulario',
      mensaje: this.vieneDelScanner
        ? 'Perderás los datos que ya capturaste. ¿Seguro que quieres cancelar?'
        : 'Se borrarán todos los campos. ¿Continuar?',
      variante: 'warning',
      textoConfirmar: this.vieneDelScanner ? 'Sí, cancelar' : 'Sí, limpiar',
      textoCancelar: 'Seguir editando',
      icono: 'warning',
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '420px', data });
    return (await ref.afterClosed().toPromise()) === true;
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.registroForm.controls).forEach(field => {
      const control = this.registroForm.get(field);
      control?.markAsTouched();
    });
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.registroForm.get(campo);
    if (control?.hasError('required')) return 'Este campo es obligatorio';
          if (control?.hasError('minlength')) {
        const minLen = campo === 'matricula' ? MATRICULA_CONFIG.minDigitos : 2;
        return `Mínimo ${minLen} caracteres`;
      }
    return '';
  }

  campoInvalido(campo: string): boolean {
    const control = this.registroForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }
}