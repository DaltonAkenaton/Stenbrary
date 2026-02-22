// ╔══════════════════════════════════════════════════════╗
// ║  seleccion-motivo.component.ts                       ║
// ║  Stenbrary v3.1 — Two-Step Confirmation Flow         ║
// ║                                                      ║
// ║  CAMBIO MAYOR: El clic en un motivo ya NO registra   ║
// ║  automáticamente. Ahora selecciona y muestra panel   ║
// ║  de confirmación. El registro solo ocurre al pulsar  ║
// ║  "Registrar Actividad".                              ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Motivo, Registro } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-seleccion-motivo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    MatTooltipModule
  ],
  templateUrl: './seleccion-motivo.component.html',
  styleUrl: './seleccion-motivo.component.scss'
})
export class SeleccionMotivoComponent implements OnInit {
  alumno: Alumno | null = null;
  motivos: Motivo[] = [];

  /** Motivo que el usuario ha seleccionado (pero aún no confirmado) */
  motivoSeleccionado: Motivo | null = null;

  cargandoMotivos = true;
  registrando = false;
  registroExitoso = false;
  error: string | null = null;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private toastService: ToastService,
    private loadingService: LoadingService
  ) {}

  // ═══════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════

  async ngOnInit(): Promise<void> {
    const alumnoData = sessionStorage.getItem('alumnoActual');

    if (!alumnoData) {
      this.toastService.error('No hay datos de alumno. Vuelve a escanear.');
      this.router.navigate(['/scanner']);
      return;
    }

    this.alumno = JSON.parse(alumnoData);
    await this.cargarMotivos();
  }

  // ═══════════════════════════════════════════════
  // CARGA DE MOTIVOS
  // ═══════════════════════════════════════════════

  async cargarMotivos(): Promise<void> {
    try {
      this.cargandoMotivos = true;
      this.error = null;
      this.motivos = await this.databaseService.obtenerMotivosActivos();
      this.cargandoMotivos = false;

      if (this.motivos.length === 0) {
        this.toastService.warning('No hay actividades disponibles. Contacta al administrador.');
      }
    } catch (error) {
      console.error('❌ Error al cargar motivos:', error);
      this.error = 'Error al cargar las actividades';
      this.cargandoMotivos = false;
      this.toastService.error('Error al cargar las actividades');
    }
  }

  // ═══════════════════════════════════════════════
  // SELECCIÓN (paso 1 — sin registro)
  // ═══════════════════════════════════════════════

  /**
   * Selecciona un motivo para mostrar en el panel de confirmación.
   * NO ejecuta el registro — solo visual.
   */
  seleccionarMotivo(motivo: Motivo): void {
    if (this.registrando) return;
    this.motivoSeleccionado = motivo;
  }

  /**
   * Deselecciona el motivo actual (volver a elegir).
   */
  deseleccionarMotivo(): void {
    if (this.registrando) return;
    this.motivoSeleccionado = null;
  }

  // ═══════════════════════════════════════════════
  // CONFIRMACIÓN (paso 2 — ejecuta el registro)
  // ═══════════════════════════════════════════════

  /**
   * Confirma y ejecuta el registro de acceso.
   * Solo se llama al presionar "Registrar Actividad".
   */
  async confirmarRegistro(): Promise<void> {
    if (!this.alumno || !this.motivoSeleccionado || this.registrando) return;

    try {
      this.registrando = true;

      const nombreCompleto = `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;

      const nuevoRegistro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'> = {
        alumnoId: this.alumno.id!,
        matricula: this.alumno.matricula,
        nombreCompleto: nombreCompleto,
        carrera: this.alumno.carrera,
        motivoId: this.motivoSeleccionado.id || '',
        motivoNombre: this.motivoSeleccionado.nombre
      };

      await this.databaseService.crearRegistro(nuevoRegistro);

      console.log('🎉 Registro completado:', this.alumno.nombre, '-', this.motivoSeleccionado.nombre);

      this.toastService.success(
        `¡Registro exitoso! ${this.alumno.nombre} — ${this.motivoSeleccionado.nombre}`
      );

      // Feedback háptico
      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }

      // Mostrar éxito
      this.registroExitoso = true;

      // Limpiar sessionStorage
      sessionStorage.removeItem('alumnoActual');

      // Redirect rápido (1.5s)
      setTimeout(() => {
        this.router.navigate(['/scanner']);
      }, 1500);

    } catch (error) {
      console.error('❌ Error al crear registro:', error);
      this.registrando = false;
      this.toastService.error('Error al guardar el registro. Intenta de nuevo.');
    }
  }

  // ═══════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════

  /**
   * Volver al scanner (matrícula incorrecta o cancelar).
   */
  volverAEscanear(): void {
    sessionStorage.removeItem('alumnoActual');
    this.toastService.info('Vuelve a escanear tu credencial');
    this.router.navigate(['/scanner']);
  }

  /**
   * Cancelar registro completo.
   */
  cancelar(): void {
    sessionStorage.removeItem('alumnoActual');
    this.toastService.info('Registro cancelado');
    this.router.navigate(['/scanner']);
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  obtenerNombreCorto(): string {
    if (!this.alumno) return '';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno}`;
  }

  obtenerNombreCompleto(): string {
    if (!this.alumno) return '';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;
  }
}