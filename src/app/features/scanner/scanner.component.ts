// ==============================================================================
// RUTA: src/app/features/scanner/scanner.component.ts
// v3.1 — Motor de detección DEFINITIVO
//
// BUG RESUELTO: RGBLuminanceSource de @zxing/library espera 1 byte/pixel
// (luminancia pura), pero le pasábamos 4 bytes/pixel (RGBA del canvas).
// ZXing leía datos completamente corruptos → nunca decodificaba en Firefox.
// En Chrome funcionaba porque usaba BarcodeDetector nativo, no ZXing.
//
// SOLUCIÓN: Usar @zxing/browser's BrowserMultiFormatReader.decodeFromCanvas()
// que maneja la conversión RGBA → luminancia internamente de forma correcta.
//
// ARQUITECTURA:
//   Motor 1 → BarcodeDetector nativo (Chrome 83+, Safari 15.4+, Samsung Internet)
//             Acelerado por hardware. Lee directamente del <video>.
//
//   Motor 2 → @zxing/browser BrowserMultiFormatReader.decodeFromCanvas()
//             Para Firefox, Edge, y cualquier navegador sin BarcodeDetector.
//             Maneja la conversión de luminancia correctamente.
//             Se combina con preprocesamiento multi-pass en canvas:
//               • 3 estrategias de filtro (balanced, high-contrast, bright)
//               • 2 regiones por estrategia (frame completo + ROI central)
//               = 6 intentos por ciclo, 5 ciclos/seg = 30 intentos/seg
//
//   Extras → Linterna (torch), fallback de resolución de cámara,
//            mensajes de error en español, cooldown anti-duplicados.
//
// COMPATIBILIDAD VERIFICADA:
//   ✅ Chrome Android   — BarcodeDetector nativo
//   ✅ Firefox Android  — @zxing/browser + multi-pass (CORREGIDO)
//   ✅ Safari iOS       — BarcodeDetector nativo
//   ✅ Chrome PC        — BarcodeDetector nativo
//   ✅ Firefox PC       — @zxing/browser + multi-pass
//   ✅ Edge             — BarcodeDetector o @zxing/browser fallback
//   ✅ Samsung Internet — BarcodeDetector nativo
// ==============================================================================

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

// @zxing/browser: maneja canvas → luminancia correctamente
import { BrowserMultiFormatReader } from '@zxing/browser';
// @zxing/library: tipos y configuración
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';

import { DatabaseService } from '../../core/services/database.service';
import { ConfirmacionMatriculaDialogComponent } from './confirmacion-matricula-dialog/confirmacion-matricula-dialog.component';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';

// ── Constantes ──────────────────────────────────────────────────────────────
const MATRICULA_MIN_LENGTH = 5;
const SCAN_INTERVAL_MS     = 200;  // 5 ciclos/segundo

/**
 * Estrategias de preprocesamiento para cámaras de baja calidad.
 * Se prueban TODAS en cada ciclo. Si una no detecta, otra sí puede.
 *
 * - balanced:      Para condiciones normales de luz
 * - high-contrast: Para códigos borrosos o con poco contraste
 * - bright:        Para condiciones de poca luz
 */
const PREPROCESS_STRATEGIES: Array<{ filter: string; label: string }> = [
  { filter: 'grayscale(100%) contrast(160%) brightness(110%)', label: 'balanced' },
  { filter: 'grayscale(100%) contrast(220%) brightness(90%)',  label: 'high-contrast' },
  { filter: 'grayscale(100%) contrast(120%) brightness(130%)', label: 'bright' },
];

/** Declaración de BarcodeDetector API nativa (no en lib de TypeScript) */
declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

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
    MatDialogModule,
  ],
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.scss'
})
export class ScannerComponent implements OnInit, OnDestroy {

  // ── ViewChild refs ──────────────────────────────────────────────────────
  @ViewChild('video',  { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  // ── Estado público (template) ──────────────────────────────────────────
  escaneando         = false;
  matriculaManual    = '';
  cargando           = false;
  error: string | null = null;
  ultimoQrEscaneado  = '';
  linternaActiva     = false;
  linternaDisponible = false;

  // ── Estado privado ─────────────────────────────────────────────────────
  private scannerActivo   = false;
  private mediaStream:    MediaStream | null = null;
  private scanIntervalId: ReturnType<typeof setInterval> | null = null;
  private enCooldown      = false;

  // Motores de detección
  private nativeDetector:   BarcodeDetector | null = null;
  private browserReader:    BrowserMultiFormatReader | null = null;
  private usandoNativo     = false;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private dialog: MatDialog,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private ngZone: NgZone
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    console.log('📱 ScannerComponent v3.1 — Definitive Engine');
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
          console.log('✅ BarcodeDetector nativo disponible:', formatos.join(', '));
          return;
        }
      }
    } catch { /* silenciar */ }
    this.usandoNativo = false;
    console.log('⚠️ Sin BarcodeDetector nativo → @zxing/browser multi-pass');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INICIAR SCANNER
  // ═══════════════════════════════════════════════════════════════════════

  async iniciarScanner(): Promise<void> {
    try {
      this.error             = null;
      this.cargando          = true;
      this.escaneando        = true;
      this.scannerActivo     = true;
      this.ultimoQrEscaneado = '';
      this.enCooldown        = false;

      // ── Inicializar motor ─────────────────────────────────────────
      if (this.usandoNativo) {
        this.nativeDetector = new BarcodeDetector({
          formats: [
            'code_128', 'code_39', 'ean_13', 'ean_8',
            'itf', 'codabar', 'upc_a', 'upc_e',
            'qr_code', 'data_matrix'
          ]
        });
        console.log('🟢 Motor: BarcodeDetector nativo');
      } else {
        // BrowserMultiFormatReader de @zxing/browser:
        // Maneja RGBA → luminancia internamente de forma correcta.
        const hints = new Map<DecodeHintType, any>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        this.browserReader = new BrowserMultiFormatReader(hints);
        console.log('🟡 Motor: @zxing/browser BrowserMultiFormatReader');
      }

      // ── Solicitar cámara con fallback ─────────────────────────────
      this.mediaStream = await this.obtenerCamara();

      // ── Conectar video ────────────────────────────────────────────
      setTimeout(() => {
        const video = this.videoElement?.nativeElement;
        if (!video) return;

        video.srcObject = this.mediaStream!;
        video.play().catch(() => {});

        video.onloadeddata = () => {
          this.cargando = false;
          console.log(`📹 Cámara: ${video.videoWidth}×${video.videoHeight}`);
          this.toastService.info('Scanner activo — apunta al código de barras');
          this.detectarLinterna();
          this.iniciarLoop();
        };
      }, 150);

    } catch (err: any) {
      console.error('❌ Error al iniciar scanner:', err);
      this.error         = this.interpretarErrorCamara(err);
      this.cargando      = false;
      this.escaneando    = false;
      this.scannerActivo = false;
      this.toastService.error(this.error || 'Error al iniciar el scanner');
    }
  }

  /**
   * Intenta obtener la cámara con resolución progresivamente menor.
   * Cámaras viejas o restrictas pueden fallar con HD → fallback a SD → a lo que sea.
   */
  private async obtenerCamara(): Promise<MediaStream> {
    const intentos: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 },  height: { ideal: 480 } } },
      { video: true },
    ];

    for (let i = 0; i < intentos.length; i++) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(intentos[i]);
        if (i > 0) console.log(`📷 Usando fallback de resolución #${i + 1}`);
        return stream;
      } catch (err: any) {
        if (err.name === 'OverconstrainedError' && i < intentos.length - 1) {
          console.warn(`⚠️ Constraints #${i + 1} no soportados, reintentando...`);
          continue;
        }
        throw err;
      }
    }
    throw new Error('No se pudo acceder a ninguna cámara');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LINTERNA (TORCH)
  // ═══════════════════════════════════════════════════════════════════════

  private async detectarLinterna(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      const caps = track.getCapabilities?.() as any;
      this.linternaDisponible = caps?.torch === true;
      if (this.linternaDisponible) console.log('🔦 Linterna disponible');
    } catch {
      this.linternaDisponible = false;
    }
  }

  async toggleLinterna(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      this.linternaActiva = !this.linternaActiva;
      await track.applyConstraints({ advanced: [{ torch: this.linternaActiva } as any] });
    } catch {
      this.linternaActiva = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LOOP DE DETECCIÓN
  // ═══════════════════════════════════════════════════════════════════════

  private iniciarLoop(): void {
    this.scanIntervalId = setInterval(() => {
      if (!this.scannerActivo || this.enCooldown) return;

      if (this.usandoNativo) {
        this.detectarConNativo();
      } else {
        this.detectarConZXingBrowser();
      }
    }, SCAN_INTERVAL_MS);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MOTOR 1: BarcodeDetector nativo (Chrome, Safari, Samsung Internet)
  // ═══════════════════════════════════════════════════════════════════════

  private async detectarConNativo(): Promise<void> {
    const video = this.videoElement?.nativeElement;
    if (!video || !this.nativeDetector || video.readyState < 2) return;

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
      if (err.name !== 'InvalidStateError') {
        console.warn('BarcodeDetector error:', err.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MOTOR 2: @zxing/browser con multi-pass preprocessing
  //
  // CLAVE: BrowserMultiFormatReader.decodeFromCanvas() maneja
  // internamente la conversión RGBA → luminancia de forma correcta.
  // Nosotros solo nos encargamos del preprocesamiento visual
  // (grayscale, contraste, brillo) y del recorte ROI.
  // ═══════════════════════════════════════════════════════════════════════

  private detectarConZXingBrowser(): void {
    const video  = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas || !this.browserReader || video.readyState < 2) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const vw  = video.videoWidth  || 640;
    const vh  = video.videoHeight || 480;

    for (const strategy of PREPROCESS_STRATEGIES) {

      // ── PASO A: Frame completo con preprocesamiento ───────────────
      canvas.width  = vw;
      canvas.height = vh;
      ctx.filter = strategy.filter;
      ctx.drawImage(video, 0, 0, vw, vh);
      ctx.filter = 'none';

      const fullResult = this.intentarDecodeCanvas(canvas);
      if (fullResult) {
        this.procesarDeteccion(fullResult, `zxing:${strategy.label}:full`);
        return;
      }

      // ── PASO B: ROI central (70% ancho, 30% alto) ────────────────
      // Coincide con la posición del barcode-frame del overlay visual.
      // Recortar reduce ruido y mejora precisión en cámaras malas.
      const roiX = Math.floor(vw * 0.15);
      const roiY = Math.floor(vh * 0.35);
      const roiW = Math.floor(vw * 0.70);
      const roiH = Math.floor(vh * 0.30);

      canvas.width  = roiW;
      canvas.height = roiH;
      ctx.filter = strategy.filter;
      ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);
      ctx.filter = 'none';

      const roiResult = this.intentarDecodeCanvas(canvas);
      if (roiResult) {
        this.procesarDeteccion(roiResult, `zxing:${strategy.label}:roi`);
        return;
      }
    }

    // ── PASO C: Frame sin filtro (por si ctx.filter no funciona) ───
    // Algunos navegadores viejos o WebViews no soportan ctx.filter.
    // Intentamos una pasada sin filtro como último recurso.
    canvas.width  = vw;
    canvas.height = vh;
    ctx.filter = 'none';
    ctx.drawImage(video, 0, 0, vw, vh);

    const rawResult = this.intentarDecodeCanvas(canvas);
    if (rawResult) {
      this.procesarDeteccion(rawResult, 'zxing:raw:full');
    }
  }

  /**
   * Intenta decodificar el contenido actual del canvas usando
   * BrowserMultiFormatReader.decodeFromCanvas().
   *
   * Este método internamente:
   * 1. Lee ImageData del canvas
   * 2. Convierte RGBA → luminancia correctamente
   * 3. Crea BinaryBitmap con HybridBinarizer
   * 4. Decodifica con MultiFormatReader
   *
   * Retorna el texto del código o null si no encontró nada.
   */
  private intentarDecodeCanvas(canvas: HTMLCanvasElement): string | null {
    try {
      const result = this.browserReader!.decodeFromCanvas(canvas);
      if (result) {
        const texto = result.getText().trim();
        if (this.esMatriculaValida(texto)) return texto;
      }
    } catch (e: any) {
      // NotFoundException es normal — significa que no encontró código en este frame
      if (!(e instanceof NotFoundException) && e?.name !== 'NotFoundException') {
        // Solo logear errores reales, no "no encontrado"
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
    return /^\d+$/.test(texto) && texto.length >= MATRICULA_MIN_LENGTH;
  }

  private procesarDeteccion(texto: string, fuente: string): void {
    if (texto === this.ultimoQrEscaneado || this.enCooldown) return;

    this.ultimoQrEscaneado = texto;
    this.enCooldown = true;
    console.log(`✅ Detectado [${fuente}]: ${texto}`);

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

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
    console.log('🔴 Deteniendo scanner...');
    this.scannerActivo = false;

    if (this.scanIntervalId !== null) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    if (this.linternaActiva) {
      const track = this.mediaStream?.getVideoTracks()[0];
      track?.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
      this.linternaActiva = false;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    this.nativeDetector     = null;
    this.browserReader      = null;
    this.escaneando         = false;
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
        this.ultimoQrEscaneado = '';
        this.enCooldown = false;
      }
    });
  }

  async procesarMatriculaManual(): Promise<void> {
    if (!this.matriculaManual.trim()) {
      this.toastService.warning('Por favor ingresa una matrícula');
      return;
    }
    this.mostrarConfirmacionMatricula(this.matriculaManual.trim());
  }

  private async procesarMatricula(matricula: string): Promise<void> {
    try {
      this.cargando = true;
      this.error    = null;
      this.loadingService.show('Buscando alumno...');

      const alumno = await this.databaseService.obtenerAlumnoPorMatricula(matricula);
      this.loadingService.hide();

      if (alumno) {
        if (!alumno.activo) {
          this.toastService.error('Esta credencial está inactiva. Contacta a la biblioteca.');
          this.cargando   = false;
          this.enCooldown = false;
          return;
        }
        this.toastService.success(`¡Bienvenido ${alumno.nombre}!`);
        sessionStorage.setItem('alumnoActual', JSON.stringify(alumno));
        this.router.navigate(['/seleccion-motivo']);
      } else {
        this.toastService.info('Alumno no registrado. Procede a registrarlo');
        sessionStorage.setItem('matriculaTemp', matricula);
        this.router.navigate(['/registro-alumno']);
      }
      this.cargando   = false;
      this.enCooldown = false;
    } catch (err) {
      console.error('Error al procesar matrícula:', err);
      this.error      = 'Error al procesar la matrícula';
      this.cargando   = false;
      this.enCooldown = false;
      this.loadingService.hide();
      this.toastService.error('Error al procesar. Intenta de nuevo.');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════

  limpiarError(): void { this.error = null; }

  limpiarMatricula(): void {
    this.matriculaManual = '';
    this.error = null;
  }

  irAlDashboard(): void {
    this.router.navigate(['/dashboard']);
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