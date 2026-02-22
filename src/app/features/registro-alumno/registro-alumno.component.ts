// ==============================================================================
// RUTA: src/app/features/registro-alumno/registro-alumno.component.ts
// CAMBIOS: Agregados ToastService y LoadingService, reemplazados alerts
// ==============================================================================

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
import { ToastService } from '../../core/services/toast.service';          // ← NUEVO
import { LoadingService } from '../../core/services/loading.service';      // ← NUEVO

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
  matricula = '';

  // Opciones para los selects
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
    private toastService: ToastService,      // ← NUEVO
    private loadingService: LoadingService   // ← NUEVO
  ) {}

  ngOnInit(): void {
    // Obtener matrícula del sessionStorage
    this.matricula = sessionStorage.getItem('matriculaTemp') || '';
    
    if (!this.matricula) {
      console.error('❌ No hay matrícula temporal, redirigiendo...');
      // ← NUEVO: Toast de error
      this.toastService.error('No hay matrícula para registrar');
      this.router.navigate(['/scanner']);
      return;
    }

    console.log('📝 Registrando nuevo alumno con matrícula:', this.matricula);

    // Inicializar formulario
    this.registroForm = this.fb.group({
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
      // ← NUEVO: Toast de warning en lugar de solo mostrar error
      this.toastService.warning('Por favor completa todos los campos correctamente');
      this.marcarCamposComoTocados();
      return;
    }

    try {
      this.cargando = true;
      this.error = null;
      
      // ← NUEVO: Loading mientras guarda
      this.loadingService.show('Registrando alumno...');

      const formValue = this.registroForm.value;

      // Crear objeto alumno
      const nuevoAlumno: Omit<Alumno, 'id' | 'fechaRegistro'> = {
        matricula: this.matricula,
        nombre: formValue.nombre.trim(),
        apellidoPaterno: formValue.apellidoPaterno.trim(),
        apellidoMaterno: formValue.apellidoMaterno.trim(),
        carrera: formValue.carrera,
        grado: Number(formValue.grado),
        grupo: formValue.grupo,
        turno: formValue.turno,
        activo: true
      };

      // Guardar en la base de datos
      const alumnoCreado = await this.databaseService.crearAlumno(nuevoAlumno);

      console.log('✅ Alumno registrado exitosamente:', alumnoCreado);
      
      // ← NUEVO: Ocultar loading
      this.loadingService.hide();
      
      // ← NUEVO: Toast de éxito con nombre del alumno
      this.toastService.success(`Alumno ${formValue.nombre} ${formValue.apellidoPaterno} registrado exitosamente`);

      // Guardar en sessionStorage para el siguiente componente
      sessionStorage.setItem('alumnoActual', JSON.stringify(alumnoCreado));
      
      // Limpiar matrícula temporal
      sessionStorage.removeItem('matriculaTemp');

      // Navegar a selección de motivo
      this.router.navigate(['/seleccion-motivo']);

    } catch (error: any) {
      console.error('❌ Error al registrar alumno:', error);
      
      // ← NUEVO: Ocultar loading en caso de error
      this.loadingService.hide();
      
      if (error.message && error.message.includes('already exists')) {
        this.error = 'Esta matrícula ya está registrada';
        // ← NUEVO: Toast de error específico
        this.toastService.error('Esta matrícula ya está registrada');
      } else {
        this.error = 'Error al registrar el alumno. Intenta de nuevo.';
        // ← NUEVO: Toast de error genérico
        this.toastService.error('Error al registrar el alumno. Intenta de nuevo.');
      }
      
      this.cargando = false;
    }
  }

  cancelar(): void {
    // Limpiar sessionStorage
    sessionStorage.removeItem('matriculaTemp');
    
    // ← NUEVO: Toast informativo
    this.toastService.info('Registro cancelado');
    
    // Volver al scanner
    this.router.navigate(['/scanner']);
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.registroForm.controls).forEach(field => {
      const control = this.registroForm.get(field);
      control?.markAsTouched();
    });
  }

  // Helpers para validación en template
  obtenerErrorCampo(campo: string): string {
    const control = this.registroForm.get(campo);
    
    if (control?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    
    if (control?.hasError('minlength')) {
      return 'Mínimo 2 caracteres';
    }
    
    return '';
  }

  campoInvalido(campo: string): boolean {
    const control = this.registroForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }
}