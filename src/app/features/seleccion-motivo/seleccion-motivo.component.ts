import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Motivo, Registro } from '../../core/models';

@Component({
  selector: 'app-seleccion-motivo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRippleModule
  ],
  templateUrl: './seleccion-motivo.component.html',
  styleUrl: './seleccion-motivo.component.scss'
})
export class SeleccionMotivoComponent implements OnInit {
  alumno: Alumno | null = null;
  motivos: Motivo[] = [];
  cargando = false;
  error: string | null = null;
  registroExitoso = false;

  constructor(
    private databaseService: DatabaseService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Obtener datos del alumno desde sessionStorage
    const alumnoData = sessionStorage.getItem('alumnoActual');
    
    if (!alumnoData) {
      console.error('❌ No hay datos de alumno, redirigiendo...');
      this.router.navigate(['/scanner']);
      return;
    }

    this.alumno = JSON.parse(alumnoData);
    console.log('👤 Alumno:', this.alumno?.nombre, this.alumno?.apellidoPaterno);

    // Cargar motivos disponibles
    await this.cargarMotivos();
  }

   async cargarMotivos(): Promise<void> {
    try {
      this.cargando = true;
      this.motivos = await this.databaseService.obtenerMotivosActivos();
      console.log('📋 Motivos cargados:', this.motivos.length);
      this.cargando = false;
    } catch (error) {
      console.error('❌ Error al cargar motivos:', error);
      this.error = 'Error al cargar los motivos de visita';
      this.cargando = false;
    }
  }

  async seleccionarMotivo(motivo: Motivo): Promise<void> {
    if (!this.alumno || this.cargando) return;

    try {
      this.cargando = true;
      this.error = null;

      console.log('✅ Motivo seleccionado:', motivo.nombre);

      // Crear el registro de acceso
      const nombreCompleto = `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;

      const nuevoRegistro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'> = {
        alumnoId: this.alumno.id!,
        matricula: this.alumno.matricula,
        nombreCompleto: nombreCompleto,
        carrera: this.alumno.carrera,
        motivoId: motivo.id,
        motivoNombre: motivo.nombre
      };

      // Guardar registro en la base de datos
      const registroCreado = await this.databaseService.crearRegistro(nuevoRegistro);

      console.log('🎉 Registro completado exitosamente:', registroCreado);

      // Mostrar pantalla de éxito
      this.registroExitoso = true;

      // Vibración de feedback (si está disponible)
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Limpiar sessionStorage
      sessionStorage.removeItem('alumnoActual');

      // Esperar 2 segundos y volver al scanner
      setTimeout(() => {
        this.router.navigate(['/scanner']);
      }, 2000);

    } catch (error) {
      console.error('❌ Error al crear registro:', error);
      this.error = 'Error al guardar el registro. Intenta de nuevo.';
      this.cargando = false;
    }
  }

  cancelar(): void {
    // Limpiar sessionStorage
    sessionStorage.removeItem('alumnoActual');
    
    // Volver al scanner
    this.router.navigate(['/scanner']);
  }
}