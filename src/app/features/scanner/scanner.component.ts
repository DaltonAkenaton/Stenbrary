// ╔══════════════════════════════════════════════════════════════════════╗
// ║  scanner.component.ts                                              ║
// ║  Stenbrary v3.6.2 — Duplicados + Registro de salida               ║
// ║                                                                    ║
// ║  NUEVO v3.6.2:                                                     ║
// ║  - Detección de registros duplicados (últimos 30 min)              ║
// ║  - Dialog con 3 opciones: Salida / Nuevo acceso / Cancelar        ║
// ║  - Registro de hora de salida en registro existente                ║
// ║  - Invitados excluidos de la verificación                          ║
// ╚══════════════════════════════════════════════════════════════════════╝

import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';

import { DatabaseService } from '../../core/services/database.service';
import { ConfirmacionMatriculaDialogComponent } from './confirmacion-matricula-dialog/confirmacion-matricula-dialog.component';
import {
  RegistroDuplicadoDialogComponent,
  RegistroDuplicadoData,
  RegistroDuplicadoResultado
} from './registro-duplicado-dialog/registro-duplicado-dialog.component';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { Alumno, Registro } from '../../core/models';

import { esMatriculaValidaScanner, normalizarMatricula } from '../../core/utils/matricula.utils';

import { SoundService } from '../../core/services/sound.service';
import { ConfigService } from '../../core/services/config.service';
import { InvitadoNombreDialogComponent } from './invitado-nombre-dialog/invitado-nombre-dialog.component';



// ── Constantes ──────────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS     = 160; // más frecuente que 200ms para mejor respuesta
const DUPLICADO_UMBRAL_MIN = 30;

/**
 * Estrategias de preprocesado optimizadas para CODE 128 (credenciales UAT).
 *
 * Code 128 es un código de barras 1D que requiere:
 *   - Alto contraste entre barras negras y espacios blancos
 *   - Bordes nítidos (el blur hurt más que ayuda en 1D)
 *   - Suficiente resolución horizontal (upscaling ayuda en webcams ≤640px)
 *
 * Orden de prioridad: de mayor probabilidad de éxito a menor.
 * El presupuesto de 45ms por frame limita cuántas se ejecutan,
 * por eso el orden importa.
 */
const PREPROCESS_STRATEGIES: Array<{ filter: string; scale: number; label: string }> = [
  // 1. Equilibrado — mejor punto de partida para la mayoría de condiciones
  { filter: 'grayscale(100%) contrast(190%) brightness(105%)', scale: 1,   label: 'balanced'        },
  // 2. Alto contraste — iluminación normal, cámara sin problemas
  { filter: 'grayscale(100%) contrast(280%) brightness(90%)',  scale: 1,   label: 'high-contrast'   },
  // 3. Brillante — entorno oscuro / webcam subexpuesta
  { filter: 'grayscale(100%) contrast(150%) brightness(150%)', scale: 1,   label: 'bright'          },
  // 4. Oscuro — entorno muy iluminado / reflexión en la credencial
  { filter: 'grayscale(100%) contrast(260%) brightness(75%)',  scale: 1,   label: 'dark'            },
  // 5. Upscaled 1.5× — webcams antiguas ≤640×480 (más píxeles = mejor decode 1D)
  { filter: 'grayscale(100%) contrast(200%) brightness(105%)', scale: 1.5, label: 'upscaled'        },
  // 6. Ultra contraste upscaled — último recurso, cámaras muy malas
  { filter: 'grayscale(100%) contrast(340%) brightness(82%)',  scale: 1.5, label: 'ultra'           },
  // 7. Denoise al final — blur suaviza el ruido pero puede difuminar barras finas;
  //    solo llega aquí si ninguna estrategia anterior funcionó
  { filter: 'blur(0.4px) grayscale(100%) contrast(240%) brightness(98%)', scale: 1, label: 'denoise' },
];

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatCardModule, MatDialogModule,
  ],
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.scss'
})
export class ScannerComponent implements OnInit, OnDestroy {

  @ViewChild('video',  { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  escaneando         = false;
  matriculaManual    = '';
  cargando           = false;
  error: string | null = null;
  ultimoQrEscaneado  = '';
  linternaActiva     = false;
  linternaDisponible = false;

  private scannerActivo      = false;
  private mediaStream:       MediaStream | null = null;
  private loopFrameId:       number | null = null;
  private lastScanTs         = 0;
  private enCooldown         = false;
  private isDetecting        = false;  // guard para evitar llamadas nativas concurrentes
  private zxingStrategyIdx   = 0;      // rotación de estrategias entre frames
  private nativeDetector:    BarcodeDetector | null = null;
  private browserReader:     BrowserMultiFormatReader | null = null;
  private usandoNativo       = false;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private dialog: MatDialog,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private soundService: SoundService,
    private configService: ConfigService,
    private ngZone: NgZone
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.detectarCapacidades();
  }

  ngOnDestroy(): void {
    this.detenerScanner();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DETECCIÓN DE CAPACIDADES
  // ═══════════════════════════════════════════════════════════════════════

  private async detectarCapacidades(): Promise<void> {
    try {
      if ('BarcodeDetector' in window) {
        const formatos = await BarcodeDetector.getSupportedFormats();
        const tieneLineales = formatos.some(f =>
          ['code_128', 'code_39', 'ean_13', 'itf', 'codabar'].includes(f)
        );
        if (tieneLineales) {
          this.usandoNativo = true;
          console.log('✅ BarcodeDetector nativo:', formatos.join(', '));
          return;
        }
      }
    } catch { /* silenciar */ }
    this.usandoNativo = false;
    console.log('⚠️ Sin BarcodeDetector nativo → @zxing/browser');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INICIAR SCANNER
  // ═══════════════════════════════════════════════════════════════════════

  async iniciarScanner(): Promise<void> {
    try {
      this.error = null;
      this.cargando = true;
      this.escaneando = true;
      this.scannerActivo = true;
      this.ultimoQrEscaneado = '';
      this.enCooldown = false;

      if (this.usandoNativo) {
        // Solo Code 128 y Code 39 — credenciales UAT usan Code 128.
        // Menos formatos = el browser dedica todo su tiempo a un solo decoder.
        this.nativeDetector = new BarcodeDetector({
          formats: ['code_128', 'code_39'],
        });
      } else {
        const hints = new Map<DecodeHintType, any>();
        // Restringir a Code 128 + Code 39 reduce el trabajo de ZXing 5–8×
        // frente a intentar los 10 formatos originales.
        // Si en el futuro se confirma que solo es Code 128, eliminar CODE_39.
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        this.browserReader = new BrowserMultiFormatReader(hints);
      }

      this.mediaStream = await this.obtenerCamara();

      setTimeout(() => {
        const video = this.videoElement?.nativeElement;
        if (!video) return;
        video.srcObject = this.mediaStream!;
        video.play().catch(() => {});

        // addEventListener en lugar de onloadeddata para no sobreescribir handlers
        const onReady = () => {
          video.removeEventListener('loadeddata', onReady);
          this.cargando = false;
          this.toastService.info('Scanner activo — apunta al código de barras');
          this.detectarLinterna();
          this.iniciarLoop();
        };
        video.addEventListener('loadeddata', onReady);
      }, 150);

    } catch (err: any) {
      this.error = this.interpretarErrorCamara(err);
      this.cargando = false;
      this.escaneando = false;
      this.scannerActivo = false;
      this.toastService.error(this.error || 'Error al iniciar el scanner');
    }
  }

  private async obtenerCamara(): Promise<MediaStream> {
    // Progresión de constraints: ideal alta calidad → fallback básico.
    // Se pide 1080p + 30fps para maximizar la nitidez del código de barras;
    // si la cámara no lo soporta, se degrada automáticamente.
    const intentos: MediaStreamConstraints[] = [
      {
        video: {
          facingMode:  { ideal: 'environment' },
          width:       { ideal: 1920, min: 320 },
          height:      { ideal: 1080, min: 240 },
          frameRate:   { ideal: 30,  min: 10  },
          // Foco y exposición continuos mejoran la nitidez en webcams de escritorio
          advanced: [{ focusMode: 'continuous' as any, exposureMode: 'continuous' as any }] as any,
        },
      },
      {
        video: {
          facingMode: { ideal: 'environment' },
          width:      { ideal: 1280 },
          height:     { ideal: 720  },
          frameRate:  { ideal: 30   },
        },
      },
      {
        video: {
          facingMode: { ideal: 'environment' },
          width:      { ideal: 640 },
          height:     { ideal: 480 },
        },
      },
      { video: true }, // último recurso: cualquier cámara disponible
    ];

    // Errores que no tienen sentido reintentar con diferentes constraints
    const erroresNoRecuperables = ['NotAllowedError', 'PermissionDeniedError', 'SecurityError', 'NotFoundError', 'DevicesNotFoundError'];

    for (let i = 0; i < intentos.length; i++) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(intentos[i]);
        if (i > 0) console.warn(`📷 Cámara: usando fallback #${i + 1}`);
        return stream;
      } catch (err: any) {
        if (erroresNoRecuperables.includes(err?.name)) throw err; // falla rápido
        if (i < intentos.length - 1) continue;
        throw err;
      }
    }
    throw new Error('No se pudo acceder a ninguna cámara');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LINTERNA
  // ═══════════════════════════════════════════════════════════════════════

  private async detectarLinterna(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      const caps = track.getCapabilities?.() as any;
      this.linternaDisponible = caps?.torch === true;
    } catch { this.linternaDisponible = false; }
  }

  async toggleLinterna(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      this.linternaActiva = !this.linternaActiva;
      await track.applyConstraints({ advanced: [{ torch: this.linternaActiva } as any] });
    } catch { this.linternaActiva = false; }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LOOP DE DETECCIÓN
  // ═══════════════════════════════════════════════════════════════════════

  private iniciarLoop(): void {
    this.lastScanTs = 0;

    // requestAnimationFrame sincroniza con el ciclo de refresco de la pantalla
    // (60 fps) y evita el drift acumulativo de setInterval. El throttle manual
    // mantiene la frecuencia deseada sin sobrecargar la CPU.
    const tick = (ts: number) => {
      if (!this.scannerActivo) return;

      if (!this.enCooldown && ts - this.lastScanTs >= SCAN_INTERVAL_MS) {
        this.lastScanTs = ts;
        if (this.usandoNativo) this.detectarConNativo();
        else this.detectarConZXingBrowser();
      }

      this.loopFrameId = requestAnimationFrame(tick);
    };

    this.loopFrameId = requestAnimationFrame(tick);
  }

  private async detectarConNativo(): Promise<void> {
    // Guard: si la llamada anterior todavía está esperando la GPU/CPU, saltar este frame.
    // Sin esto, en cámaras lentas se acumulan decenas de llamadas detect() concurrentes.
    if (this.isDetecting) return;
    const video = this.videoElement?.nativeElement;
    if (!video || !this.nativeDetector || video.readyState < 2) return;

    this.isDetecting = true;
    try {
      const resultados = await this.nativeDetector.detect(video);
      for (const barcode of resultados) {
        const texto = barcode.rawValue.trim();
        if (this.esMatriculaValida(texto)) {
          this.procesarDeteccion(texto, `nativo:${barcode.format}`);
          return;
        }
      }
    } catch (err: any) {
      if (err.name !== 'InvalidStateError') console.warn('BarcodeDetector error:', err.message);
    } finally {
      this.isDetecting = false;
    }
  }

  private detectarConZXingBrowser(): void {
    const video  = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas || !this.browserReader || video.readyState < 2) return;

    const vw = video.videoWidth  || 640;
    const vh = video.videoHeight || 480;
    if (vw === 0 || vh === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const total = PREPROCESS_STRATEGIES.length;

    /**
     * Presupuesto de tiempo por frame: 45ms máximo.
     * Sin este límite, 7 estrategias × 2 zonas = 14 decodes síncronos
     * pueden bloquear el hilo principal hasta 1,100ms en cámaras lentas.
     *
     * Rotación de estrategia inicial: cada frame empieza en un índice
     * distinto para que todas las estrategias obtengan intentos equitativos
     * aunque el presupuesto se agote en la primera ronda.
     */
    const BUDGET_MS = 45;
    const t0 = performance.now();

    for (let i = 0; i < total; i++) {
      if (performance.now() - t0 > BUDGET_MS) break;

      const strategy = PREPROCESS_STRATEGIES[(this.zxingStrategyIdx + i) % total];

      // ── Frame completo ──────────────────────────────────────────────
      const tw = Math.round(vw * strategy.scale);
      const th = Math.round(vh * strategy.scale);
      canvas.width  = tw;
      canvas.height = th;
      ctx.filter = strategy.filter;
      ctx.drawImage(video, 0, 0, tw, th);
      ctx.filter = 'none';

      const fullResult = this.intentarDecodeCanvas(canvas);
      if (fullResult) {
        this.procesarDeteccion(fullResult, `zxing:${strategy.label}:full`);
        return;
      }

      if (performance.now() - t0 > BUDGET_MS) break;

      // ── ROI central horizontal (82% ancho, 42% alto, centrado) ──────
      const roiX  = Math.floor(vw * 0.09);
      const roiY  = Math.floor(vh * 0.29);
      const roiW  = Math.floor(vw * 0.82);
      const roiH  = Math.floor(vh * 0.42);
      const roiTW = Math.round(roiW * strategy.scale);
      const roiTH = Math.round(roiH * strategy.scale);
      canvas.width  = roiTW;
      canvas.height = roiTH;
      ctx.filter = strategy.filter;
      ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, roiTW, roiTH);
      ctx.filter = 'none';

      const roiResult = this.intentarDecodeCanvas(canvas);
      if (roiResult) {
        this.procesarDeteccion(roiResult, `zxing:${strategy.label}:roi`);
        return;
      }
    }

    // Avanzar el índice de rotación para el siguiente frame
    this.zxingStrategyIdx = (this.zxingStrategyIdx + 1) % total;

    // ── Fallback raw sin filtro (si el código ya tiene buen contraste) ──
    if (performance.now() - t0 <= BUDGET_MS) {
      canvas.width  = vw;
      canvas.height = vh;
      ctx.filter = 'none';
      ctx.drawImage(video, 0, 0, vw, vh);
      const rawResult = this.intentarDecodeCanvas(canvas);
      if (rawResult) this.procesarDeteccion(rawResult, 'zxing:raw:full');
    }
  }

  private intentarDecodeCanvas(canvas: HTMLCanvasElement): string | null {
    try {
      const result = this.browserReader!.decodeFromCanvas(canvas);
      if (result) {
        const texto = result.getText().trim();
        if (this.esMatriculaValida(texto)) return texto;
      }
    } catch (e: any) {
      if (!(e instanceof NotFoundException) && e?.name !== 'NotFoundException') {
        if (e?.message && !e.message.includes('No MultiFormat Readers')) {
          console.warn('ZXing decode error:', e.message);
        }
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROCESAMIENTO DE RESULTADO
  // ═══════════════════════════════════════════════════════════════════════

    private esMatriculaValida(texto: string): boolean {
    return esMatriculaValidaScanner(texto);
  }

  private procesarDeteccion(texto: string, fuente: string): void {
    if (texto === this.ultimoQrEscaneado || this.enCooldown) return;
    this.ultimoQrEscaneado = texto;
    this.enCooldown = true;
    console.log(`✅ Detectado [${fuente}]: ${texto}`);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    this.soundService.beepScan();
    this.detenerScanner();
    this.ngZone.run(() => {
      this.toastService.success(`Código detectado: ${texto}`);
      this.mostrarConfirmacionMatricula(texto);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DETENER SCANNER
  // ═══════════════════════════════════════════════════════════════════════

  detenerScanner(): void {
    this.scannerActivo = false;
    if (this.loopFrameId !== null) { cancelAnimationFrame(this.loopFrameId); this.loopFrameId = null; }
    if (this.linternaActiva) {
      const track = this.mediaStream?.getVideoTracks()[0];
      track?.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
      this.linternaActiva = false;
    }
    if (this.mediaStream) { this.mediaStream.getTracks().forEach(t => t.stop()); this.mediaStream = null; }
    this.nativeDetector = null;
    this.browserReader = null;
    this.escaneando = false;
    this.linternaDisponible = false;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONFIRMACIÓN Y NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════════════════

  private mostrarConfirmacionMatricula(matricula: string): void {
    const dialogRef = this.dialog.open(ConfirmacionMatriculaDialogComponent, {
      width: '350px',
      data: { matricula },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.procesarMatricula(matricula);
      } else {
        this.toastService.warning('Escaneo cancelado');
        // Auto-reiniciar tras 1.5s: da tiempo para que el usuario retire
        // la credencial del encuadre antes de que se vuelva a detectar.
        setTimeout(() => {
          this.ultimoQrEscaneado = '';
          this.enCooldown = false;
          this.iniciarScanner();
        }, 1500);
      }
    });
  }

    async procesarMatriculaManual(): Promise<void> {
    const input = this.matriculaManual.trim();
    if (!input) {
      this.toastService.warning('Por favor ingresa una matrícula');
      return;
    }
 
    // Normalizar: "a2299990001" → "2299990001"
    const matriculaNormalizada = normalizarMatricula(input);
 
    // Validar formato
    if (!esMatriculaValidaScanner(matriculaNormalizada)) {
      this.toastService.error('Formato de matrícula no válido. Debe tener al menos 7 dígitos.');
      return;
    }
 
    this.mostrarConfirmacionMatricula(matriculaNormalizada);
  }

  private async procesarMatricula(matricula: string): Promise<void> {
    try {
      this.cargando = true;
      this.error = null;
      this.loadingService.show('Buscando alumno...');

      const alumno = await this.databaseService.obtenerAlumnoPorMatricula(matricula);
      this.loadingService.hide();

      if (alumno) {
        if (!alumno.activo) {
          this.toastService.error('Esta credencial está inactiva. Contacta a la biblioteca.');
          this.resetEstado();
          return;
        }

        // ── Verificar entrada abierta / duplicado ─────────────────────
        // Cuando el módulo de salida está activo, buscamos cualquier entrada
        // abierta del día (sin horaSalida), no solo en los últimos 30 min.
        const registroReciente = this.configService.registroSalidaActivo
          ? await this.databaseService.obtenerEntradaAbiertaHoy(matricula)
          : await this.databaseService.verificarRegistroReciente(matricula, this.configService.umbralDuplicadoMin);

        if (registroReciente) {
          const resultado = await this.mostrarDialogDuplicado(alumno, registroReciente);

          switch (resultado) {
            case 'salida':
              await this.procesarSalida(registroReciente);
              return;

            case 'nuevo':
              // Si el módulo de salida está activo, cerrar la entrada anterior
              // para que el alumno no aparezca dos veces en "En Biblioteca"
              if (this.configService.registroSalidaActivo) {
                await this.databaseService.registrarSalida(registroReciente.id);
              }
              break;

            case 'cancelar':
            default:
              this.toastService.info('Registro cancelado');
              this.resetEstado();
              return;
          }
        }

        // ── Flujo normal: ir a selección de motivo ────────────────────
        this.toastService.success(`¡Bienvenido ${alumno.nombre}!`);
        sessionStorage.setItem('alumnoActual', JSON.stringify(alumno));
        this.router.navigate(['/seleccion-motivo']);

      } else {
        this.toastService.info('Alumno no registrado. Procede a registrarlo');
        sessionStorage.setItem('matriculaTemp', matricula);
        this.router.navigate(['/registro-alumno']);
      }

      this.resetEstado();
    } catch (err) {
      console.error('Error al procesar matrícula:', err);
      this.error = 'Error al procesar la matrícula';
      this.loadingService.hide();
      this.toastService.error('Error al procesar. Intenta de nuevo.');
      this.resetEstado();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DETECCIÓN DE DUPLICADOS + REGISTRO DE SALIDA
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Muestra dialog de duplicado con 3 opciones.
   * Retorna: 'salida' | 'nuevo' | 'cancelar'
   */
  private mostrarDialogDuplicado(
    alumno: Alumno,
    registroReciente: Registro
  ): Promise<RegistroDuplicadoResultado> {
    return new Promise<RegistroDuplicadoResultado>((resolve) => {
      const ahora = new Date();
      const fechaRegistro = new Date(registroReciente.fechaHora);
      const minutosTranscurridos = Math.round(
        (ahora.getTime() - fechaRegistro.getTime()) / (1000 * 60)
      );

      const horaRegistro = fechaRegistro.toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit',
      });

      const data: RegistroDuplicadoData = {
        nombreAlumno: `${alumno.nombre} ${alumno.apellidoPaterno}`,
        matricula: alumno.matricula,
        motivoAnterior: registroReciente.motivoNombre,
        horaRegistro,
        minutosTranscurridos,
        registroId: registroReciente.id,
        yaRegistroSalida: !!registroReciente.horaSalida,
      };

      const dialogRef = this.dialog.open(RegistroDuplicadoDialogComponent, {
        width: '380px',
        data,
        disableClose: true,
      });

      dialogRef.afterClosed().subscribe((resultado: RegistroDuplicadoResultado) => {
        resolve(resultado || 'cancelar');
      });
    });
  }

  /**
   * Registra la hora de salida en un registro existente.
   */
  private async procesarSalida(registro: Registro): Promise<void> {
    try {
      this.loadingService.show('Registrando salida...');

      const actualizado = await this.databaseService.registrarSalida(registro.id);

      this.loadingService.hide();

      // Feedback háptico
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      this.soundService.beepSalida();
      // Mostrar duración
      const duracion = actualizado.duracionMinutos || 0;
      let duracionTexto: string;
      if (duracion < 60) {
        duracionTexto = `${duracion} min`;
      } else {
        const horas = Math.floor(duracion / 60);
        const mins = duracion % 60;
        duracionTexto = mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
      }

      this.toastService.success(
        `¡Salida registrada! Estancia: ${duracionTexto}`
      );

      this.resetEstado();
    } catch (err: any) {
      console.error('Error al registrar salida:', err);
      this.loadingService.hide();
      this.toastService.error('Error al registrar la salida. Intenta de nuevo.');
      this.resetEstado();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════

  private resetEstado(): void {
    this.cargando = false;
    this.enCooldown = false;
  }

  limpiarError(): void { this.error = null; }

  limpiarMatricula(): void {
    this.matriculaManual = '';
    this.error = null;
  }

  irAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Acceso sin credencial — invitados NO pasan por verificación de duplicados.
   * Abre un dialog para capturar un nombre opcional del visitante.
   */
  accederComoInvitado(): void {
    const dialogRef = this.dialog.open(InvitadoNombreDialogComponent, {
      width: '380px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((nombreIngresado: string | null | undefined) => {
      // Si el dialog se cerró con X (undefined), cancelar
      if (nombreIngresado === undefined) return;

      const nombreVisitante = nombreIngresado || 'Visitante';
      const invitado = {
        id: 'invitado-' + Date.now(),
        matricula: 'INVITADO',
        nombre: nombreVisitante,
        apellidoPaterno: nombreIngresado ? '' : 'Externo',
        apellidoMaterno: '',
        carrera: 'Visitante',
        activo: true,
        esInvitado: true
      };

      sessionStorage.setItem('alumnoActual', JSON.stringify(invitado));
      this.toastService.info('Acceso como visitante — selecciona tu actividad');
      this.router.navigate(['/seleccion-motivo']);
    });
  }

  private interpretarErrorCamara(err: any): string {
    switch (err?.name || '') {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Permiso de cámara denegado. Revisa la configuración del navegador.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No se encontró una cámara en este dispositivo.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'La cámara está en uso por otra app. Ciérrala e intenta de nuevo.';
      case 'OverconstrainedError':
        return 'La cámara no soporta la configuración solicitada.';
      case 'SecurityError':
        return 'Cámara bloqueada. Asegúrate de usar HTTPS.';
      default:
        return err?.message || 'No se pudo acceder a la cámara.';
    }
  }
}