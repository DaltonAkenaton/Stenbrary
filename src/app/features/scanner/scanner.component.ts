import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { DatabaseService } from '../../core/services/database.service';
import { ConfirmacionMatriculaDialogComponent } from './confirmacion-matricula-dialog/confirmacion-matricula-dialog.component';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.scss'
})
export class ScannerComponent implements OnInit, OnDestroy {
  @ViewChild('video', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  // Estado
  escaneando = false;
  matriculaManual = '';
  cargando = false;
  error: string | null = null;
  ultimoQrEscaneado = '';

  // Scanner
  private codeReader: BrowserMultiFormatReader | null = null;
  private scannerActivo = false;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    console.log('📱 ScannerComponent inicializado');
  }

  ngOnDestroy(): void {
    this.detenerScanner();
  }

  // ==================== SCANNER QR ====================


 

async iniciarScanner(): Promise<void> {
  try {
    this.error = null;
    this.cargando = true;
    this.escaneando = true;
    this.scannerActivo = true;
    
    this.ultimoQrEscaneado = '';

    console.log('🔵 Iniciando scanner...');

    this.codeReader = new BrowserMultiFormatReader();

    const videoInputDevices = await this.codeReader.listVideoInputDevices();
    
    if (videoInputDevices.length === 0) {
      throw new Error('No se encontraron cámaras disponibles');
    }

    console.log('📷 Cámaras disponibles:', videoInputDevices.length);
    
    // Buscar la cámara trasera
    let selectedDeviceId = videoInputDevices[0].deviceId;
    
    const backCamera = videoInputDevices.find(device => 
      device.label.toLowerCase().includes('back') ||
      device.label.toLowerCase().includes('rear') ||
      device.label.toLowerCase().includes('trasera') ||
      device.label.toLowerCase().includes('environment')
    );
    
    if (backCamera) {
      selectedDeviceId = backCamera.deviceId;
      console.log('📸 Usando cámara trasera:', backCamera.label);
    } else if (videoInputDevices.length > 1) {
      selectedDeviceId = videoInputDevices[1].deviceId;
      console.log('📸 Usando segunda cámara:', videoInputDevices[1].label);
    }

    // NUEVO: Configurar constraints para mayor calidad
    const constraints = {
      video: {
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },      // Alta resolución
        height: { ideal: 1080 },     // HD
        focusMode: { ideal: 'continuous' },  // Enfoque continuo
        zoom: { ideal: 2 }  // Zoom 2x si el dispositivo lo soporta
      }
    };

    setTimeout(async () => {
      if (this.videoElement && this.videoElement.nativeElement) {
        console.log('🎥 Iniciando captura de video en HD...');

        // Usar decodeFromConstraints en lugar de decodeFromVideoDevice
        this.codeReader!.decodeFromConstraints(
          constraints,
          this.videoElement.nativeElement,
          (result: Result | undefined, error: Error | undefined) => {
            
            if (result) {
              const qrText = result.getText();
              
              if (qrText !== this.ultimoQrEscaneado && this.scannerActivo) {
                this.ultimoQrEscaneado = qrText;
                console.log('✅ QR detectado:', qrText);
                
                // Vibración de feedback (si está disponible)
                if (navigator.vibrate) {
                  navigator.vibrate(200);
                }
                
                this.scannerActivo = false;
                this.detenerScanner();
                this.mostrarConfirmacionMatricula(qrText);
              }
            }

            if (error && error.name !== 'NotFoundException') {
              console.warn('⚠️ Error de escaneo:', error.message);
            }
          }
        );

        this.cargando = false;
        console.log('✅ Scanner HD activo');
      }
    }, 500);

  } catch (error: any) {
    console.error('❌ Error al iniciar scanner:', error);
    this.error = error.message || 'No se pudo acceder a la cámara';
    this.cargando = false;
    this.escaneando = false;
    this.scannerActivo = false;
  }
}






  detenerScanner(): void {
    console.log('🔴 Deteniendo scanner...');
    
    this.scannerActivo = false;

    // Detener el lector
    if (this.codeReader) {
      this.codeReader.reset();
      this.codeReader = null;
    }

    this.escaneando = false;
  }

  // ==================== CONFIRMACIÓN ====================

  private mostrarConfirmacionMatricula(matricula: string): void {
    const dialogRef = this.dialog.open(ConfirmacionMatriculaDialogComponent, {
      width: '350px',
      data: { matricula },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        // Usuario confirmó - procesar matrícula
        this.procesarMatricula(matricula);
      } else {
        // Usuario canceló - volver a escanear
        console.log('❌ Matrícula cancelada por el usuario');
        this.ultimoQrEscaneado = ''; // Resetear para poder escanear de nuevo
        // No reiniciar automáticamente, que el usuario decida
      }
    });
  }

  // ==================== MATRÍCULA MANUAL ====================

  async procesarMatriculaManual(): Promise<void> {
    if (!this.matriculaManual.trim()) {
      this.error = 'Por favor ingresa una matrícula';
      return;
    }

    // También mostrar confirmación para matrícula manual
    this.mostrarConfirmacionMatricula(this.matriculaManual.trim());
  }

  // ==================== PROCESAMIENTO ====================

  private async procesarMatricula(matricula: string): Promise<void> {
    try {
      this.cargando = true;
      this.error = null;

      console.log('🔍 Buscando matrícula:', matricula);

      // Buscar alumno en la base de datos
      const alumno = await this.databaseService.obtenerAlumnoPorMatricula(matricula);

      if (alumno) {
        // Alumno existe - ir directo a selección de motivo
        console.log('✅ Alumno encontrado:', alumno.nombre);
        
        sessionStorage.setItem('alumnoActual', JSON.stringify(alumno));
        this.router.navigate(['/seleccion-motivo']);
      } else {
        // Alumno NO existe - ir a registro
        console.log('⚠️ Alumno no encontrado, redirigiendo a registro');
        
        sessionStorage.setItem('matriculaTemp', matricula);
        this.router.navigate(['/registro-alumno']);
      }

      this.cargando = false;
    } catch (error) {
      console.error('❌ Error al procesar matrícula:', error);
      this.error = 'Error al procesar la matrícula';
      this.cargando = false;
    }
  }

  // ==================== UTILIDADES ====================

  limpiarError(): void {
    this.error = null;
  }

  limpiarMatricula(): void {
    this.matriculaManual = '';
    this.error = null;
  }
}