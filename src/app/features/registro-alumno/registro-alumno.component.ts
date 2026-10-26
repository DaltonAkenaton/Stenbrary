// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/registro-alumno/             ║
// ║        registro-alumno.component.ts                  ║
// ║  Stenbrary v3.4 — Catálogo unificado                 ║
// ║                                                      ║
// ║  FIX v3.4:                                           ║
// ║  - Carreras, grados, grupos y turnos importados      ║
// ║    desde catalogos.constants.ts (fuente única)       ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
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
import { TURNOS } from '../../core/constants/catalogos.constants';
import { ConfigService } from '../../core/services/config.service';
import { carrerasActivas, gradosDe } from '../../core/utils/catalogos.utils';
import { validarMatricula, MATRICULA_CONFIG, normalizarMatricula } from '../../core/utils/matricula.utils';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { log, logError } from '../../core/utils/logger';
import { LectorRafagaService } from '../../core/services/lector-rafaga.service';
import { ABANDONO_REGISTRO_MS, CLAVE_LECTURA_PENDIENTE } from '../../core/utils/flujo-puerta.utils';
import { esNombreValido, limpiarNombre } from '../../core/utils/nombres.utils';

@Component({
    selector: 'app-registro-alumno',
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
    styleUrl: './registro-alumno.component.scss'
})
export class RegistroAlumnoComponent implements OnInit, OnDestroy {
  private readonly lector = inject(LectorRafagaService);
  private dejarDeVigilar: (() => void) | null = null;

  registroForm!: FormGroup;
  cargando = false;
  error: string | null = null;

  matricula = '';
  matriculaBloqueada = false;
  vieneDelScanner = false;

  // v3.57.0: del catálogo editable (Configuración → Catálogos), no del código.
  private readonly catalogo = inject(ConfigService).catalogoEscolar;
  carreras = carrerasActivas(this.catalogo);
  grados = gradosDe(this.catalogo);
  grupos = this.catalogo.grupos;
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
      log('📝 Registrando alumno desde scanner, matrícula:', this.matricula);
      // v3.54.0: formulario abandonado o credencial del siguiente alumno.
      this.dejarDeVigilar = this.lector.vigilarFlujo({
        abandonoMs: ABANDONO_REGISTRO_MS,
        matricula: () => this.matricula,
        terminado: () => false,
        ocupado: () => this.cargando,
        abandonar: (motivo, leida) => this.abandonarFlujo(motivo, leida),
        avisar: texto => this.toastService.info(texto),
      });
    } else {
      this.matricula = '';
      this.matriculaBloqueada = false;
      this.vieneDelScanner = false;
      log('📝 Registro de alumno — acceso directo');
    }

    this.registroForm = this.fb.group({
      matricula: [
        { value: this.matricula, disabled: this.matriculaBloqueada },
        [Validators.required, Validators.minLength(MATRICULA_CONFIG.minDigitos), this.matriculaValidator],
      ],
      // maxLength previene que un alumno pegue 10 KB de basura por accidente.
      // v3.54.0: solo letras (con acentos), y el materno es opcional — quien
      // tiene un solo apellido escribía "XX" para poder avanzar.
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), this.nombreValidator]],
      apellidoPaterno: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40), this.nombreValidator]],
      apellidoMaterno: ['', [Validators.maxLength(40), this.nombreValidator]],
      carrera: ['', Validators.required],
      grado: ['', Validators.required],
      grupo: ['', Validators.required],
      turno: ['', Validators.required],
    });
  }

  /**
   * Validador reactivo de matrícula: usa la lógica centralizada de
   * matricula.utils para que el feedback sea consistente con el scanner.
   * Si el valor no pasa la regex (caracteres prohibidos, demasiado largo,
   * prefijo desconocido), devuelve un error con la causa exacta.
   */
  private matriculaValidator = (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (!v) return null; // Validators.required ya cubre vacío
    const r = validarMatricula(String(v));
    return r.valida ? null : { matricula: r.error };
  };

  private nombreValidator = (control: AbstractControl): ValidationErrors | null =>
    esNombreValido(control.value) ? null : { pattern: true };

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
        nombre: limpiarNombre(formValue.nombre),
        apellidoPaterno: limpiarNombre(formValue.apellidoPaterno),
        apellidoMaterno: limpiarNombre(formValue.apellidoMaterno),
        carrera: formValue.carrera,
        grado: Number(formValue.grado),
        grupo: formValue.grupo,
        turno: formValue.turno,
        activo: true,
      };

      const alumnoCreado = await this.databaseService.crearAlumno(nuevoAlumno);

      log('✅ Alumno registrado:', alumnoCreado.matricula);
      this.loadingService.hide();
      this.toastService.success(`Alumno ${nuevoAlumno.nombre} ${nuevoAlumno.apellidoPaterno} registrado exitosamente`);

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
      logError('❌ Error al registrar alumno:', error);
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

  /** Sale al escáner sin guardar: por inactividad o por la credencial de otro alumno (v3.54.0). */
  private abandonarFlujo(motivo: 'inactividad' | 'nueva-lectura', leida?: string): void {
    this.dialog.closeAll(); // p. ej. el "¿descartar?" que nadie contestó
    sessionStorage.removeItem('matriculaTemp');
    if (motivo === 'inactividad') this.toastService.info('Registro cancelado por inactividad');
    if (leida) sessionStorage.setItem(CLAVE_LECTURA_PENDIENTE, leida);
    this.router.navigate(['/scanner']);
  }

  ngOnDestroy(): void {
    this.dejarDeVigilar?.();
    // Salir por el menú dejaba la matrícula: "Registrar alumno" volvía a
    // abrir con la de un escaneo viejo, bloqueada.
    sessionStorage.removeItem('matriculaTemp');
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
    if (control?.hasError('pattern')) return 'Solo letras, espacios y guiones';
    if (control?.hasError('matricula')) {
      // Mensaje específico devuelto por validarMatricula()
      return control.getError('matricula') || 'Formato de matrícula no válido';
    }
    if (control?.hasError('minlength')) {
      const minLen = campo === 'matricula' ? MATRICULA_CONFIG.minDigitos : 2;
      return `Mínimo ${minLen} caracteres`;
    }
    if (control?.hasError('maxlength')) {
      const max = control.getError('maxlength').requiredLength;
      return `Máximo ${max} caracteres`;
    }
    return '';
  }

  campoInvalido(campo: string): boolean {
    const control = this.registroForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }
}