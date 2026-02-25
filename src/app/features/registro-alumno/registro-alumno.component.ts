// ╔══════════════════════════════════════════════════════╗
// ║  registro-alumno.component.ts                        ║
// ║  Stenbrary v3.2 — Acceso directo sin scanner         ║
// ║                                                      ║
// ║  CAMBIO v3.2: Ya no requiere sessionStorage para     ║
// ║  funcionar. Si hay matriculaTemp del scanner, la     ║
// ║  pre-llena y la bloquea. Si no hay (acceso directo), ║
// ║  el campo matrícula es editable.                     ║
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
import { DatabaseService } from '../../core/services/database.service';
import { Alumno } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './registro-alumno.component.html',
  styleUrl: './registro-alumno.component.scss'
})
export class RegistroAlumnoComponent implements OnInit {
  registroForm!: FormGroup;
  cargando = false;
  error: string | null = null;

  /** Matrícula pre-llenada del scanner (si viene del flujo scanner) */
  matricula = '';

  /** Si viene del scanner, la matrícula se bloquea (ya fue escaneada).
   *  Si accede directo al componente, la matrícula es editable. */
  matriculaBloqueada = false;

  /** Si viene del scanner flow (hay sesión) */
  vieneDelScanner = false;

  carreras = [
    'Contador Público',
    'Licenciatura en Administración',
    'Ingeniería en Autotransporte de Carga',
    'Comercio Exterior',
    'Licenciatura en Derecho',
    'Licenciatura en Enfermería',
    'Licenciatura en Psicología',
    'Ingeniería en Tecnologías de la Información'
  ];

  grados = [1, 2, 3, 4, 5, 6, 7, 8];
  grupos = ['A', 'B', 'C', 'D', 'E', 'F'];
  turnos: ('Matutino' | 'Vespertino' | 'Mixto')[] = ['Matutino', 'Vespertino', 'Mixto'];

  constructor(
    private fb: FormBuilder,
    private databaseService: DatabaseService,
    private router: Router,
    private toastService: ToastService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Intentar obtener matrícula del sessionStorage (flujo scanner)
    const matriculaTemp = sessionStorage.getItem('matriculaTemp');

    if (matriculaTemp) {
      // Viene del scanner: matrícula pre-llenada y bloqueada
      this.matricula = matriculaTemp;
      this.matriculaBloqueada = true;
      this.vieneDelScanner = true;
      console.log('📝 Registrando alumno desde scanner, matrícula:', this.matricula);
    } else {
      // Acceso directo: matrícula editable
      this.matricula = '';
      this.matriculaBloqueada = false;
      this.vieneDelScanner = false;
      console.log('📝 Registro de alumno — acceso directo');
    }

    // Inicializar formulario — matrícula siempre en el form
    this.registroForm = this.fb.group({
      matricula: [
        { value: this.matricula, disabled: this.matriculaBloqueada },
        [Validators.required, Validators.minLength(5)]
      ],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: ['', [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: ['', [Validators.required, Validators.minLength(2)]],
      carrera: ['', Validators.required],
      grado: ['', Validators.required],
      grupo: ['', Validators.required],
      turno: ['', Validators.required]
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

      const formValue = this.registroForm.getRawValue(); // getRawValue incluye campos disabled

      // Usar la matrícula del form (puede ser pre-llenada o manual)
      const matriculaFinal = this.matriculaBloqueada ? this.matricula : formValue.matricula.trim();

      const nuevoAlumno: Omit<Alumno, 'id' | 'fechaRegistro'> = {
        matricula: matriculaFinal,
        nombre: formValue.nombre.trim(),
        apellidoPaterno: formValue.apellidoPaterno.trim(),
        apellidoMaterno: formValue.apellidoMaterno.trim(),
        carrera: formValue.carrera,
        grado: Number(formValue.grado),
        grupo: formValue.grupo,
        turno: formValue.turno,
        activo: true
      };

      const alumnoCreado = await this.databaseService.crearAlumno(nuevoAlumno);

      console.log('✅ Alumno registrado:', alumnoCreado);
      this.loadingService.hide();
      this.toastService.success(`Alumno ${formValue.nombre} ${formValue.apellidoPaterno} registrado exitosamente`);

      if (this.vieneDelScanner) {
        // Flujo scanner: continuar a selección de motivo
        sessionStorage.setItem('alumnoActual', JSON.stringify(alumnoCreado));
        sessionStorage.removeItem('matriculaTemp');
        this.router.navigate(['/seleccion-motivo']);
      } else {
        // Acceso directo: limpiar formulario para otro registro
        this.registroForm.reset();
        this.toastService.info('Puedes registrar otro alumno');
      }

    } catch (error: any) {
      console.error('❌ Error al registrar alumno:', error);
      this.loadingService.hide();

      if (error.message && error.message.includes('already exists')) {
        this.error = 'Esta matrícula ya está registrada';
        this.toastService.error('Esta matrícula ya está registrada');
      } else {
        this.error = 'Error al registrar el alumno. Intenta de nuevo.';
        this.toastService.error('Error al registrar el alumno. Intenta de nuevo.');
      }

      this.cargando = false;
    }
  }

  cancelar(): void {
    sessionStorage.removeItem('matriculaTemp');

    if (this.vieneDelScanner) {
      this.toastService.info('Registro cancelado');
      this.router.navigate(['/scanner']);
    } else {
      // Acceso directo: solo limpiar el formulario
      this.registroForm.reset();
      this.toastService.info('Formulario limpiado');
    }
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.registroForm.controls).forEach(field => {
      const control = this.registroForm.get(field);
      control?.markAsTouched();
    });
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.registroForm.get(campo);

    if (control?.hasError('required')) {
      return 'Este campo es obligatorio';
    }

    if (control?.hasError('minlength')) {
      const minLen = campo === 'matricula' ? 5 : 2;
      return `Mínimo ${minLen} caracteres`;
    }

    return '';
  }

  campoInvalido(campo: string): boolean {
    const control = this.registroForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }
}