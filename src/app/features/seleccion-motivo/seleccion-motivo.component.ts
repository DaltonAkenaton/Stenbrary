// ╔══════════════════════════════════════════════════════╗
// ║  seleccion-motivo.component.ts                       ║
// ║  Stenbrary v3.2 — Two-Step + Toggle + Guest          ║
// ║                                                      ║
// ║  CAMBIOS v3.2:                                       ║
// ║  - Toggle: clic en mismo motivo = deseleccionar      ║
// ║  - Soporte para invitados (esInvitado flag)          ║
// ║  - "Matrícula incorrecta" siempre visible            ║
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
import { SoundService } from '../../core/services/sound.service';

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

  /** Motivos seleccionados (multi-select) */
  motivosSeleccionados: Motivo[] = [];

  /** Si el usuario es un invitado (sin matrícula) */
  esInvitado = false;

  cargandoMotivos = true;
  registrando = false;
  registroExitoso = false;
  error: string | null = null;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private toastService: ToastService,
    private soundService: SoundService,
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

    const parsed = JSON.parse(alumnoData);
    this.alumno = parsed;
    this.esInvitado = parsed.esInvitado === true;

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
  // SELECCIÓN (paso 1 — toggle behavior)
  // ═══════════════════════════════════════════════

  /** Toggle: añade o quita un motivo de la selección. */
  seleccionarMotivo(motivo: Motivo): void {
    if (this.registrando) return;
    const idx = this.motivosSeleccionados.findIndex(m => m.id === motivo.id);
    if (idx >= 0) {
      this.motivosSeleccionados = this.motivosSeleccionados.filter((_, i) => i !== idx);
    } else {
      this.motivosSeleccionados = [...this.motivosSeleccionados, motivo];
    }
  }

  estaSeleccionado(motivo: Motivo): boolean {
    return this.motivosSeleccionados.some(m => m.id === motivo.id);
  }

  deseleccionarMotivo(): void {
    if (this.registrando) return;
    this.motivosSeleccionados = [];
  }

  get haySeleccion(): boolean {
    return this.motivosSeleccionados.length > 0;
  }

  get resumenMotivos(): string {
    return this.motivosSeleccionados.map(m => m.nombre).join(', ');
  }

  // ═══════════════════════════════════════════════
  // CONFIRMACIÓN (paso 2 — ejecuta el registro)
  // ═══════════════════════════════════════════════

  async confirmarRegistro(): Promise<void> {
    if (!this.alumno || !this.haySeleccion || this.registrando) return;

    try {
      this.registrando = true;

      const nombreCompleto = this.esInvitado
        ? 'Visitante Externo'
        : `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;

      const primero = this.motivosSeleccionados[0];

      const nuevoRegistro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'> = {
        alumnoId: this.alumno.id!,
        matricula: this.alumno.matricula,
        nombreCompleto,
        carrera: this.alumno.carrera,
        motivoId: primero.id || '',
        motivoNombre: primero.nombre,
        motivoIds: this.motivosSeleccionados.map(m => m.id || ''),
        motivoNombres: this.motivosSeleccionados.map(m => m.nombre),
      };

      await this.databaseService.crearRegistro(nuevoRegistro);

      const displayName = this.esInvitado ? 'Visitante' : this.alumno.nombre;
      console.log('🎉 Registro completado:', displayName, '-', this.resumenMotivos);

      this.toastService.success(
        `¡Registro exitoso! ${displayName} — ${this.resumenMotivos}`
      );

      // Feedback háptico
      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
      this.soundService.beepExito();

      this.registroExitoso = true;
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

  volverAEscanear(): void {
    sessionStorage.removeItem('alumnoActual');
    this.toastService.info('Vuelve a escanear tu credencial');
    this.router.navigate(['/scanner']);
  }

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
    if (this.esInvitado) return 'Visitante Externo';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno}`;
  }

  obtenerNombreCompleto(): string {
    if (!this.alumno) return '';
    if (this.esInvitado) return 'Visitante Externo';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;
  }
}