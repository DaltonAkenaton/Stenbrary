// ╔══════════════════════════════════════════════════════════════════════╗
// ║  scanner.component.ts                                              ║
// ║  Stenbrary v3.11.0 — Lector USB HID + zoom + pipeline agresivo    ║
// ║                                                                    ║
// ║  NUEVO v3.11.0:                                                    ║
// ║  - Soporte para escáneres USB tipo teclado (HID). Detecta tipeo    ║
// ║    rápido (<50ms entre teclas) terminado en Enter y reusa el flujo ║
// ║    del scanner de cámara. No interfiere con inputs manuales ni con ║
// ║    diálogos abiertos.                                              ║
// ║                                                                    ║
// ║  Base v3.9.1:                                                      ║
// ║  - Zoom digital de cámara (auto 2× + botones manuales UI)          ║
// ║  - Pipeline agresivo SIEMPRE activo (ya no gateado por resolución) ║
// ║  - Sharpening siempre ON (crítico para webcams de foco fijo)       ║
// ║  - Detector nativo SIEMPRE prueba canvas preprocesado + Otsu       ║
// ║  - Umbral low-res subido a 1400px (cubre webcams de laptop)        ║
// ║                                                                    ║
// ║  Base v3.9.0:                                                      ║
// ║  - Detección automática de resolución (low-res ≤800px)             ║
// ║  - Upscaling agresivo (2×–3×) para webcams de laptop              ║
// ║  - Sharpening por software (unsharp mask) para foco fijo           ║
// ║  - Binarización Otsu: umbral óptimo calculado del histograma       ║
// ║  - Corrección de rotación ±3°/±5° para credenciales inclinadas     ║
// ║  - Escaneo por franjas horizontales (scanlines a 40/50/60%)        ║
// ║  - Detección de barcode invertido (colores negados)                ║
// ║  - Tracking de estrategias exitosas (priorización adaptativa)      ║
// ║  - Optimización de exposición vía Camera API                       ║
// ║  - Detector nativo con fallback a canvas preprocesado + Otsu       ║
// ║  - Presupuesto e intervalo adaptativos según resolución            ║
// ╚══════════════════════════════════════════════════════════════════════╝

import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, NgZone, signal, inject, computed
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { filter } from 'rxjs/operators';

// zxing se carga dinámicamente solo cuando el BarcodeDetector nativo no
// está disponible (v3.12.1). Evita meter ~500KB en el chunk del scanner
// cuando el dispositivo ya soporta el decoder nativo del browser.
import type { BrowserMultiFormatReader } from '@zxing/browser';

interface ZxingLib {
  BrowserMultiFormatReader: typeof import('@zxing/browser').BrowserMultiFormatReader;
  DecodeHintType: typeof import('@zxing/library').DecodeHintType;
  BarcodeFormat: typeof import('@zxing/library').BarcodeFormat;
  NotFoundException: typeof import('@zxing/library').NotFoundException;
}

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

import { MATRICULA_CONFIG, esMatriculaValidaScanner, normalizarMatricula, validarMatricula } from '../../core/utils/matricula.utils';

import { SoundService } from '../../core/services/sound.service';
import { ConfigService } from '../../core/services/config.service';
import { RelojService } from '../../core/services/reloj.service';
import { environment } from '../../../environments/environment';
import { AforoService } from '../../core/services/aforo.service';
import { InvitadoNombreDialogComponent } from './invitado-nombre-dialog/invitado-nombre-dialog.component';
import { QuioscoPinDialogComponent, SalidaPinQuiosco } from './quiosco-pin-dialog/quiosco-pin-dialog.component';
import { CLAVE_LECTURA_PENDIENTE } from '../../core/utils/flujo-puerta.utils';
import {
  SalidaVisitanteDialogComponent,
  SalidaVisitanteResultado,
} from './salida-visitante-dialog/salida-visitante-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { verificarHorario } from '../../core/utils/horarios.utils';
import { RestriccionCamara, RestriccionesVideo, aplicar, capacidades, datosError } from './camara.types';



// ── Constantes ──────────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS         = 160; // más frecuente que 200ms para mejor respuesta
// Umbral de "baja resolución" para upscaling agresivo en Otsu/strip/rotation.
// 1400px cubre todas las webcams de laptop (que típicamente reportan 1280×720
// pero tienen óptica pobre) y solo excluye cámaras HD reales de ≥1920px.
const LOWRES_THRESHOLD         = 1400;

/**
 * Estrategias de preprocesado optimizadas para CODE 128 (credenciales UAT).
 *
 * Code 128 es un código de barras 1D que requiere:
 *   - Alto contraste entre barras negras y espacios blancos
 *   - Bordes nítidos (el blur hurt más que ayuda en 1D)
 *   - Suficiente resolución horizontal (upscaling ayuda en webcams ≤640px)
 *
 * Orden de prioridad: de mayor probabilidad de éxito a menor.
 * El presupuesto por frame limita cuántas se ejecutan,
 * por eso el orden importa.
 *
 * En cámaras de baja resolución (≤800px ancho), se inyectan automáticamente
 * estrategias con upscaling agresivo (2×–3×) al principio de la lista.
 */
const PREPROCESS_STRATEGIES: { filter: string; scale: number; label: string }[] = [
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

/**
 * Estrategias adicionales para cámaras de baja resolución.
 * Se anteponen a PREPROCESS_STRATEGIES cuando videoWidth ≤ LOWRES_THRESHOLD.
 * El upscaling agresivo (2×–3×) compensa la falta de píxeles del sensor,
 * dándole al decoder de ZXing más resolución horizontal para distinguir barras.
 */
const LOWRES_EXTRA_STRATEGIES: { filter: string; scale: number; label: string }[] = [
  // Upscale 2× + contraste moderado: balance general para laptops
  { filter: 'grayscale(100%) contrast(220%) brightness(105%)', scale: 2,   label: 'lowres-2x'       },
  // Upscale 2.5× + alto contraste: laptop con webcam 480p en baja iluminación
  { filter: 'grayscale(100%) contrast(260%) brightness(100%)', scale: 2.5, label: 'lowres-2.5x'     },
  // Upscale 3× + contraste extremo: el último recurso para webcams muy malas (e.g. 320×240)
  { filter: 'grayscale(100%) contrast(300%) brightness(95%)',  scale: 3,   label: 'lowres-3x'       },
];

// ── Ángulos de corrección de rotación ────────────────────────────────────
// Code 128 es estrictamente horizontal — una inclinación de 3–5° es suficiente
// para que el decoder falle. Estos ángulos cubren inclinaciones reales comunes
// cuando el usuario sostiene la credencial a mano.
const ROTATION_ANGLES = [0, -3, 3, -5, 5]; // grados — 0 siempre primero

// ── Máximo de éxitos a recordar para priorizar estrategias ───────────────
const STRATEGY_HISTORY_SIZE = 8;

/**
 * Aplica un kernel de sharpening (unsharp mask simplificado) a un canvas.
 * Clave para webcams de laptop con lente de foco fijo — el barcode aparece
 * ligeramente borroso y esto recupera los bordes de las barras.
 *
 * El kernel usado es:
 *   [ 0, -1,  0]
 *   [-1,  5, -1]
 *   [ 0, -1,  0]
 *
 * Intensidad controlada por `strength` (0–1). 0.4 es un buen balance entre
 * nitidez recuperada y ruido amplificado.
 */
function sharpenCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength = 0.4
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src);

  const w4 = width * 4; // bytes per row

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * w4 + x * 4;
      // Solo canal rojo (ya es grayscale, R=G=B)
      const center = src[idx];
      const top    = src[idx - w4];
      const bottom = src[idx + w4];
      const left   = src[idx - 4];
      const right  = src[idx + 4];

      // Kernel: 5*center - (top + bottom + left + right)
      const sharpened = center + strength * (4 * center - top - bottom - left - right);
      const clamped = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;

      dst[idx]     = clamped; // R
      dst[idx + 1] = clamped; // G
      dst[idx + 2] = clamped; // B
      // Alpha unchanged
    }
  }

  imageData.data.set(dst);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Binarización Otsu — calcula el umbral óptimo para separar barras de espacios.
 *
 * A diferencia de CSS contrast() que aplica una curva lineal fija, Otsu analiza
 * el histograma real de la imagen y encuentra el punto de corte que MINIMIZA
 * la varianza intra-clase entre píxeles claros y oscuros. Resultado:
 * - En iluminación uniforme: umbral perfecto, barras nítidas
 * - En iluminación desigual: mejor que contrast() fijo (aunque no tan bueno como
 *   adaptive threshold, que es demasiado costoso para tiempo real)
 *
 * Es EL estándar de preprocesado para decodificación de barcodes en la industria.
 */
function otsuBinarize(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const totalPixels = width * height;

  // 1. Construir histograma (solo canal R, ya es grayscale)
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  // 2. Calcular umbral Otsu
  let sumTotal = 0;
  for (let i = 0; i < 256; i++) sumTotal += i * histogram[i];

  let sumBack = 0;
  let wBack = 0;
  let maxVariance = 0;
  let threshold = 128; // fallback

  for (let t = 0; t < 256; t++) {
    wBack += histogram[t];
    if (wBack === 0) continue;
    const wFore = totalPixels - wBack;
    if (wFore === 0) break;

    sumBack += t * histogram[t];
    const meanBack = sumBack / wBack;
    const meanFore = (sumTotal - sumBack) / wFore;
    const variance = wBack * wFore * (meanBack - meanFore) * (meanBack - meanFore);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  // 3. Binarizar
  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] >= threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Invierte los colores del canvas (negativo).
 * Útil cuando la cámara produce una imagen con tonos invertidos
 * (reflexiones, modo nocturno, etc.) donde las barras aparecen claras
 * y los espacios oscuros.
 */
function invertCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  ctx.putImageData(imageData, 0, 0);
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<{ rawValue: string; format: string }[]>;
  static getSupportedFormats(): Promise<string[]>;
}

@Component({
    selector: 'app-scanner',
    imports: [
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
  private databaseService = inject(DatabaseService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private soundService = inject(SoundService);
  configService = inject(ConfigService);
  aforoService = inject(AforoService);
  private ngZone = inject(NgZone);


  @ViewChild('video',  { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  escaneando         = false;
  matriculaManual    = '';
  cargando           = false;
  error: string | null = null;
  ultimoQrEscaneado  = '';
  /** Timestamp de la última detección aceptada (guard temporal del lector). */
  private ultimaDeteccionTs = 0;
  /**
   * Ventana en la que el lector ignora una relectura idéntica. Solo protege
   * contra el doble disparo del gatillo (<200ms); pasada la ventana, la misma
   * credencial vuelve a ser válida — es lo que permite entrada y salida.
   */
  private static readonly LECTOR_REPETICION_MS = 1200;
  linternaActiva     = false;
  linternaDisponible = false;

  // ── Progreso del lector físico ─────────────────────────────────────────
  // El lector es el camino primario y no abre dialog de confirmación, así que
  // esta barra es la única señal visual de "te leí". Se auto-oculta.
  readonly lectorProcesando = signal(false);
  private lectorProgTimer: number | null = null;
  /** true mientras la matrícula en curso vino del lector físico. */
  origenEsLector = false;

  // ── Flash visual post-salida (refuerzo cuando el dispositivo está en silencio) ──
  readonly salidaFlash = signal<{ nombre: string; duracion: string } | null>(null);
  private salidaFlashTimer: number | null = null;

  // ── Visitantes con entrada abierta (para salida autónoma sin credencial) ──
  // Se refresca al entrar al scanner y tras cada salida/registro. Solo se
  // muestra el botón cuando esta lista tiene al menos un elemento.
  readonly visitantesAbiertos = signal<Registro[]>([]);

  // ── Zoom de cámara (crítico para webcams de laptop con foco fijo) ─────
  zoomDisponible = false;
  zoomHardware   = false;  // true = zoom real de cámara, false = zoom por software
  zoomActual     = 1;
  zoomMin        = 1;
  zoomMax        = 1;
  zoomStep       = 0.5;

  private scannerActivo      = false;
  private mediaStream:       MediaStream | null = null;
  private loopFrameId:       number | null = null;
  private lastScanTs         = 0;
  private enCooldown         = false;
  private isDetecting        = false;  // guard para evitar llamadas nativas concurrentes
  private zxingStrategyIdx   = 0;      // rotación de estrategias entre frames
  private nativeDetector:    BarcodeDetector | null = null;
  private browserReader:     BrowserMultiFormatReader | null = null;
  private zxingLib:          ZxingLib | null = null;  // cargado on-demand en fallback
  private usandoNativo       = false;

  // ── Adaptación a resolución ────────────────────────────────────────────
  private esLowRes           = false;  // true si videoWidth ≤ LOWRES_THRESHOLD
  private effectiveStrategies: { filter: string; scale: number; label: string }[] = PREPROCESS_STRATEGIES;
  private effectiveScanInterval = SCAN_INTERVAL_MS;
  private effectiveBudget    = 45;     // ms por frame — se aumenta en low-res
  private sharpenEnabled     = false;  // se activa en low-res para recuperar bordes

  // ── Tracking de estrategias exitosas ───────────────────────────────────
  // Registra las últimas N estrategias que decodificaron con éxito.
  // Si una estrategia domina el historial, se promueve al inicio de la lista
  // para que se intente primero — reduce latencia de detección promedio.
  private strategySuccessHistory: string[] = [];

  // ── Canvas auxiliar para rotaciones ────────────────────────────────────
  // Se crea una vez y se reutiliza para evitar GC en cada frame.
  private rotCanvas: HTMLCanvasElement | null = null;
  private rotCtx: CanvasRenderingContext2D | null = null;

  // ── Lector USB HID (escáner físico tipo teclado) ───────────────────────
  // Los escáneres USB suelen reportarse como HID y "tipean" los caracteres
  // seguidos de Enter. El tipeo es mucho más rápido que el de un humano
  // (típicamente <30ms entre teclas) — esa diferencia es nuestra heurística.
  private hidBuffer = '';
  private hidLastKeyTs = 0;
  private hidStartTs = 0;
  private hidListener: ((e: KeyboardEvent) => void) | null = null;
  /** Umbral máximo de tiempo entre teclas para considerarlas parte del mismo escaneo. */
  private static readonly HID_MAX_GAP_MS = 150;
  /**
   * Duración máxima total de un escaneo HID (protege contra buffers viejos).
   * 3000ms cubre el modo Bluetooth del lector: con gap de 150ms y matrículas
   * de 10 dígitos, un tope de 1500ms descartaba escaneos válidos en silencio.
   */
  private static readonly HID_MAX_TOTAL_MS = 3000;

  // ── Timers tracked para limpieza en ngOnDestroy ────────────────────────
  // Si el componente se destruye antes de que disparen, evitamos ejecutar
  // callbacks sobre estado huérfano (mediaStream null, scanner inactivo, etc.).
  private startTimer: number | null = null;       // timeout para attach del video
  private confirmTimer: number | null = null;     // timeout post-cancelación de dialog
  // Un solo "¿Esta es tu matrícula?" a la vez: con Enter rápido se abría un
  // segundo que sobrevivía a la navegación y quedaba encima de la siguiente
  // pantalla (v3.57.3).
  private confirmacionRef: MatDialogRef<ConfirmacionMatriculaDialogComponent> | null = null;
  private destruido = false;
  private pressTimer: number | null = null;       // long-press del modo quiosco

  /**
   * v3.59.0: la hora de las visitas no se puede confiar (nunca se verificó o
   * cambiaron la hora de la PC). Solo en producción: en desarrollo y en las
   * pruebas nunca hay verificación y el aviso saldría siempre.
   */
  private readonly reloj = inject(RelojService);
  readonly horaSinVerificar = computed(() =>
    environment.production && (this.reloj.aviso() === 'nunca' || this.reloj.aviso() === 'cambiaron-hora'));

  // ═══════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    // Hard reset de estados transitorios al entrar al scanner. Protege contra
    // casos donde una ruta previa dejó el loading global encendido o `cargando`
    // en true por un flujo cortado (registro → motivo → regreso).
    this.loadingService.hide();
    this.cargando = false;
    this.error = null;

    this.detectarCapacidades();
    this.registrarLectorHid();

    // v3.54.0: el lector se pasó en "elegir actividad" o en el registro de
    // alumno nuevo de una pantalla abandonada. Esa pantalla se cerró y dejó
    // la matrícula aquí para atenderla como si se hubiera leído en el escáner.
    const pendiente = sessionStorage.getItem(CLAVE_LECTURA_PENDIENTE);
    if (pendiente) {
      sessionStorage.removeItem(CLAVE_LECTURA_PENDIENTE);
      setTimeout(() => this.procesarDeteccion(pendiente, 'usb-hid'));
    }
    // Refrescar aforo al entrar al scanner para tener el conteo actualizado
    if (this.configService.aforoActivo) {
      this.aforoService.refrescar();
    }
    this.refrescarVisitantesAbiertos();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.confirmacionRef?.close();
    this.detenerScanner();
    this.desregistrarLectorHid();
    if (this.salidaFlashTimer !== null) {
      clearTimeout(this.salidaFlashTimer);
      this.salidaFlashTimer = null;
    }
    if (this.lectorProgTimer !== null) {
      clearTimeout(this.lectorProgTimer);
      this.lectorProgTimer = null;
    }
    if (this.startTimer !== null) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
    if (this.confirmTimer !== null) {
      clearTimeout(this.confirmTimer);
      this.confirmTimer = null;
    }
    if (this.pressTimer !== null) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    if (this.tapTimer !== null) {
      clearTimeout(this.tapTimer);
      this.tapTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LECTOR USB HID (escáner físico como teclado)
  // ═══════════════════════════════════════════════════════════════════════

  private registrarLectorHid(): void {
    this.hidListener = (e: KeyboardEvent) => this.onHidKeyDown(e);
    document.addEventListener('keydown', this.hidListener, true);
  }

  private desregistrarLectorHid(): void {
    if (this.hidListener) {
      document.removeEventListener('keydown', this.hidListener, true);
      this.hidListener = null;
    }
    this.hidBuffer = '';
  }

  /**
   * Handler global de keydown. Descarta el evento si:
   *   - El foco está en un input/textarea/contenteditable (tipeo manual).
   *   - Hay un diálogo abierto (la confirmación u otro modal tiene el control).
   *   - El scanner está en cooldown o procesando.
   *
   * Acumula caracteres mientras las pulsaciones sean rápidas (<50ms de gap).
   * Al recibir Enter con un buffer válido, lo procesa como si viniera del
   * scanner de cámara — mismo flujo de confirmación + búsqueda.
   */
  private onHidKeyDown(e: KeyboardEvent): void {
    // 1. No robar input al usuario cuando escribe en un campo.
    const target = e.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        this.hidBuffer = '';
        return;
      }
    }

    // 2. No competir con diálogos abiertos (confirmación, invitado, PIN, etc.).
    if (this.dialog.openDialogs.length > 0) {
      this.hidBuffer = '';
      return;
    }

    // 3. Si ya estamos procesando una detección, ignorar.
    if (this.enCooldown || this.isDetecting) return;

    const ahora = performance.now();
    const key = e.key;

    // Reset si la última tecla fue hace mucho → era tipeo humano o ruido.
    if (ahora - this.hidLastKeyTs > ScannerComponent.HID_MAX_GAP_MS && this.hidBuffer.length > 0) {
      this.hidBuffer = '';
    }

    if (key === 'Enter') {
      const candidato = this.hidBuffer;
      const duracion = ahora - this.hidStartTs;
      this.hidBuffer = '';
      // Validar: al menos 2 caracteres y duración total razonable (es un escáner, no un humano).
      if (candidato.length >= 2 && duracion <= ScannerComponent.HID_MAX_TOTAL_MS) {
        const normalizada = normalizarMatricula(candidato);
        if (esMatriculaValidaScanner(normalizada)) {
          e.preventDefault();
          this.ngZone.run(() => this.procesarDeteccion(normalizada, 'usb-hid'));
        } else if (/^\d+$/.test(normalizada) && normalizada.length > MATRICULA_CONFIG.maxDigitos) {
          // Un libro u otro código largo: avisar en vez de no hacer nada.
          e.preventDefault();
          this.ngZone.run(() => {
            this.soundService.beepError();
            this.toastService.warning('Ese código no es una credencial de alumno.');
          });
        }
      }
      return;
    }

    // Solo caracteres útiles para una matrícula (dígitos + prefijo alfabético).
    if (key.length === 1 && /[0-9a-zA-Z]/.test(key)) {
      if (this.hidBuffer.length === 0) this.hidStartTs = ahora;
      this.hidBuffer += key;
      this.hidLastKeyTs = ahora;
    }
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

  /**
   * Carga dinámica de @zxing/browser + @zxing/library.
   * Solo se invoca en el fallback (cuando BarcodeDetector nativo falta).
   * Cachea el módulo para no reimportar en reinicios de cámara.
   */
  private async cargarZxing(): Promise<ZxingLib> {
    if (this.zxingLib) return this.zxingLib;
    const [browserMod, libMod] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);
    this.zxingLib = {
      BrowserMultiFormatReader: browserMod.BrowserMultiFormatReader,
      DecodeHintType: libMod.DecodeHintType,
      BarcodeFormat: libMod.BarcodeFormat,
      NotFoundException: libMod.NotFoundException,
    };
    return this.zxingLib;
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
        const zx = await this.cargarZxing();
        const hints = new Map<number, unknown>();
        // Restringir a Code 128 + Code 39 reduce el trabajo de ZXing 5–8×
        // frente a intentar los 10 formatos originales.
        hints.set(zx.DecodeHintType.POSSIBLE_FORMATS, [
          zx.BarcodeFormat.CODE_128,
          zx.BarcodeFormat.CODE_39,
        ]);
        hints.set(zx.DecodeHintType.TRY_HARDER, true);
        this.browserReader = new zx.BrowserMultiFormatReader(hints);
      }

      this.mediaStream = await this.obtenerCamara();

      this.startTimer = window.setTimeout(() => {
        this.startTimer = null;
        // Guard: si el componente se destruyó o detuvo el scanner mientras
        // esperaba este timeout, abortar — no toques mediaStream null.
        if (!this.scannerActivo || !this.mediaStream) return;
        const video = this.videoElement?.nativeElement;
        if (!video) return;
        video.srcObject = this.mediaStream;
        video.play().catch(() => {
          /* Autoplay bloqueado: el usuario tocará la pantalla para arrancarlo. */
        });

        // addEventListener en lugar de onloadeddata para no sobreescribir handlers
        const onReady = () => {
          video.removeEventListener('loadeddata', onReady);
          if (!this.scannerActivo) return;
          this.cargando = false;
          this.adaptarAResolucion(video);
          this.toastService.info('Escáner activo — apunta al código de barras');
          this.detectarLinterna();
          this.iniciarLoop();
        };
        video.addEventListener('loadeddata', onReady);
      }, 150);

    } catch (err: unknown) {
      this.error = this.interpretarErrorCamara(err);
      this.cargando = false;
      this.escaneando = false;
      this.scannerActivo = false;
      this.toastService.error(this.error || 'Error al iniciar el escáner');
    }
  }

  private async obtenerCamara(): Promise<MediaStream> {
    // Progresión de constraints: ideal alta calidad → fallback básico.
    // Se pide 1080p + 30fps para maximizar la nitidez del código de barras;
    // si la cámara no lo soporta, se degrada automáticamente.
    //
    // v3.23: facingMode se toma de la configuración del coordinador. Si la
    // cámara preferida no existe, el navegador hace fallback automático y
    // los últimos intentos quitan la preferencia por completo.
    const pref = this.configService.camaraPreferida;
    const facing: 'environment' | 'user' | null =
      pref === 'environment' ? 'environment' :
      pref === 'user' ? 'user' :
      null; // 'auto' → no especificamos facingMode

    const withFacing = (v: RestriccionesVideo): RestriccionesVideo =>
      facing ? { ...v, facingMode: { ideal: facing } } : v;

    const intentos: MediaStreamConstraints[] = [
      {
        video: withFacing({
          width:       { ideal: 1920, min: 320 },
          height:      { ideal: 1080, min: 240 },
          frameRate:   { ideal: 30,  min: 10  },
          // Foco y exposición continuos mejoran la nitidez en webcams de escritorio
          advanced: [{ focusMode: 'continuous', exposureMode: 'continuous' }],
        }),
      },
      {
        video: withFacing({
          width:      { ideal: 1280 },
          height:     { ideal: 720  },
          frameRate:  { ideal: 30   },
        }),
      },
      {
        video: withFacing({
          width:      { ideal: 640 },
          height:     { ideal: 480 },
        }),
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
      } catch (err: unknown) {
        if (erroresNoRecuperables.includes(datosError(err).name)) throw err; // falla rápido
        if (i < intentos.length - 1) continue;
        throw err;
      }
    }
    throw new Error('No se pudo acceder a ninguna cámara');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADAPTACIÓN A RESOLUCIÓN
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Detecta la resolución real de la cámara y adapta las estrategias de
   * preprocesado para maximizar la tasa de detección.
   *
   * En cámaras de baja resolución (≤800px ancho, típico en laptops):
   * - Se anteponen estrategias con upscaling agresivo (2×–3×)
   * - Se activa sharpening por software (unsharp mask)
   * - Se aumenta el presupuesto de tiempo por frame (más intentos)
   * - Se reduce el intervalo entre escaneos (el procesamiento es más rápido
   *   porque hay menos píxeles, así que podemos escanear más seguido)
   */
  private adaptarAResolucion(video: HTMLVideoElement): void {
    const vw = video.videoWidth  || 640;
    const vh = video.videoHeight || 480;
    this.esLowRes = vw <= LOWRES_THRESHOLD;

    // CAMBIO CRÍTICO (v3.9.1): Las webcams de laptop reportan 1280×720 pero
    // tienen óptica de foco fijo que produce imágenes borrosas a corta distancia.
    // El umbral de resolución NO es suficiente para detectar esto. Por lo tanto,
    // SIEMPRE incluimos las estrategias agresivas y SIEMPRE activamos sharpening.
    // El presupuesto de tiempo por frame previene bloqueos de UI.
    this.effectiveStrategies = [...LOWRES_EXTRA_STRATEGIES, ...PREPROCESS_STRATEGIES];
    // v3.21.1: el coordinador manda. 0 (default) = "lo más rápido posible"
    // — escanea en cada frame del requestAnimationFrame sin throttle adicional.
    // El presupuesto de tiempo por frame (`effectiveBudget`) sigue protegiendo
    // contra bloqueos de UI. Cualquier otro valor se respeta tal cual.
    this.effectiveScanInterval = Math.max(0, this.configService.escanerVelocidadMs);
    this.effectiveBudget = this.esLowRes ? 70 : 60;
    this.sharpenEnabled = true;
    console.log(`📷 Cámara ${vw}×${vh} — pipeline agresivo activado: ${this.effectiveStrategies.length} estrategias, sharpening ON, budget ${this.effectiveBudget}ms`);

    // Crear canvas auxiliar para rotaciones (reutilizable, evita GC)
    this.rotCanvas = document.createElement('canvas');
    this.rotCtx = this.rotCanvas.getContext('2d', { willReadFrequently: true });

    // Optimizar exposición y zoom para barcode scanning
    this.optimizarExposicionCamara();
    this.detectarYAplicarZoom();
  }

  /**
   * Configura zoom — hardware si la cámara lo soporta, software (crop+scale)
   * en caso contrario. CRÍTICO para webcams de laptop: el foco fijo no permite
   * enfocar objetos cerca, pero el zoom efectivamente "acerca" el barcode.
   *
   * El zoom por software se aplica al video visible (CSS transform) Y al
   * pipeline de decodificación (ROI recortada + escalada).
   *
   * v3.23: el zoom inicial se toma de `configService.zoomScannerDefault`
   * (default 1 = 100%). El coordinador puede ajustarlo desde Configuración.
   */
  private async detectarYAplicarZoom(): Promise<void> {
    const zoomDefault = this.configService.zoomScannerDefault || 1;

    // 1. Intentar zoom por hardware
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (track) {
        const caps = capacidades(track);
        if (caps?.zoom) {
          this.zoomMin  = caps.zoom.min ?? 1;
          this.zoomMax  = caps.zoom.max ?? 1;
          this.zoomStep = caps.zoom.step ?? 0.5;
          if (this.zoomMax > this.zoomMin) {
            this.zoomDisponible = true;
            this.zoomHardware = true;
            // Clamp del default al rango real de la cámara
            const autoZoom = Math.min(this.zoomMax, Math.max(this.zoomMin, zoomDefault));
            await aplicar(track, { zoom: autoZoom });
            this.zoomActual = autoZoom;
            console.log(`📷 Zoom HARDWARE [${this.zoomMin}×–${this.zoomMax}×] — zoom inicial ${autoZoom}×`);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Zoom hardware no aplicable:', err);
    }

    // 2. Fallback: zoom por software (crop + scale)
    // El zoom software no añade detalle real, solo recorta el centro
    // para que el decodificador trabaje sobre un área más chica.
    this.zoomDisponible = true;
    this.zoomHardware   = false;
    this.zoomMin        = 1;
    this.zoomMax        = 3;
    this.zoomStep       = 0.5;
    this.zoomActual     = Math.min(this.zoomMax, Math.max(this.zoomMin, zoomDefault));
    this.aplicarZoomSoftware();
    console.log(`📷 Zoom SOFTWARE [${this.zoomMin}×–${this.zoomMax}×] — zoom inicial ${this.zoomActual}×`);
  }

  /**
   * Aplica zoom por software: escala el <video> con CSS transform.
   * El pipeline de detección lee internamente `zoomActual` y ajusta su ROI.
   */
  private aplicarZoomSoftware(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;
    video.style.transform = `scale(${this.zoomActual})`;
    video.style.transformOrigin = 'center center';
  }

  async aumentarZoom(): Promise<void> {
    if (!this.zoomDisponible) return;
    const nuevo = Math.min(this.zoomMax, this.zoomActual + this.zoomStep);
    await this.aplicarZoom(nuevo);
  }

  async reducirZoom(): Promise<void> {
    if (!this.zoomDisponible) return;
    const nuevo = Math.max(this.zoomMin, this.zoomActual - this.zoomStep);
    await this.aplicarZoom(nuevo);
  }

  private async aplicarZoom(valor: number): Promise<void> {
    this.zoomActual = valor;
    if (this.zoomHardware) {
      try {
        const track = this.mediaStream?.getVideoTracks()[0];
        if (!track) return;
        await aplicar(track, { zoom: valor });
      } catch (err) {
        console.warn('Error al aplicar zoom hardware:', err);
      }
    } else {
      this.aplicarZoomSoftware();
    }
  }

  /**
   * Intenta optimizar los parámetros de la cámara para escaneo de barcodes.
   * Usa la API de MediaStreamTrack.applyConstraints() con advanced para:
   * - Foco continuo (mantener barcode enfocado)
   * - Exposición continua (adaptarse a la iluminación)
   * - Compensación de exposición (evitar sobreexposición que blanquea las barras)
   * - White balance continuo
   *
   * No todas las cámaras soportan estos controles — se aplica best-effort.
   */
  private async optimizarExposicionCamara(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      const caps = capacidades(track);
      if (!caps) return;

      const advanced: RestriccionCamara[] = [];

      // Foco continuo — esencial para webcams que lo soportan
      if (caps.focusMode?.includes('continuous')) {
        advanced.push({ focusMode: 'continuous' });
      }

      // Exposición continua — se adapta a cambios de iluminación
      if (caps.exposureMode?.includes('continuous')) {
        advanced.push({ exposureMode: 'continuous' });
      }

      // White balance continuo
      if (caps.whiteBalanceMode?.includes('continuous')) {
        advanced.push({ whiteBalanceMode: 'continuous' });
      }

      // Compensación de exposición: ligeramente subexpuesta para evitar
      // que las barras se blanqueen por sobreexposición. Solo si soportado.
      if (caps.exposureCompensation) {
        const min = caps.exposureCompensation.min ?? -2;
        // Apuntar a -0.5 EV: reduce sobreexposición sin oscurecer demasiado
        const target = Math.max(min, -0.5);
        advanced.push({ exposureCompensation: target });
      }

      if (advanced.length > 0) {
        await aplicar(track, ...advanced);
        console.log('📷 Exposición optimizada:', advanced.map(a => Object.keys(a).join(',')).join(' + '));
      }
    } catch {
      // Best-effort: si la cámara no lo soporta, silenciar
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LINTERNA
  // ═══════════════════════════════════════════════════════════════════════

  private async detectarLinterna(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      this.linternaDisponible = capacidades(track)?.torch === true;
    } catch { this.linternaDisponible = false; }
  }

  async toggleLinterna(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      this.linternaActiva = !this.linternaActiva;
      await aplicar(track, { torch: this.linternaActiva });
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

      if (!this.enCooldown && ts - this.lastScanTs >= this.effectiveScanInterval) {
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
      // ── Intento 1: detección directa sobre el video ──────────────
      const resultados = await this.nativeDetector.detect(video);
      for (const barcode of resultados) {
        const texto = barcode.rawValue.trim();
        if (this.esMatriculaValida(texto)) {
          this.procesarDeteccion(texto, `nativo:${barcode.format}`);
          return;
        }
      }

      // ── Intento 2: canvas preprocesado con sharpen + contrast ──────
      // El BarcodeDetector nativo acepta ImageBitmapSource, que incluye canvas.
      // SIEMPRE lo intentamos — incluso en cámaras "de alta resolución" los
      // lentes de laptop producen imágenes borrosas que el detector nativo
      // rechaza pero sí decodifica cuando se le pasa un canvas preprocesado.
      {
        const canvas = this.canvasElement?.nativeElement;
        if (!canvas) return;

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

        // Aplicar zoom software si está activo
        const zoomCrop = (!this.zoomHardware && this.zoomActual > 1) ? this.zoomActual : 1;
        const effW = Math.floor(vw / zoomCrop);
        const effH = Math.floor(vh / zoomCrop);
        const offX = Math.floor((vw - effW) / 2);
        const offY = Math.floor((vh - effH) / 2);

        const roiX  = offX + Math.floor(effW * 0.05);
        const roiY  = offY + Math.floor(effH * 0.25);
        const roiW  = Math.floor(effW * 0.90);
        const roiH  = Math.floor(effH * 0.50);
        const scale = 2.5;
        const tw = Math.round(roiW * scale);
        const th = Math.round(roiH * scale);
        canvas.width  = tw;
        canvas.height = th;
        ctx.filter = 'grayscale(100%) contrast(250%) brightness(105%)';
        ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, tw, th);
        ctx.filter = 'none';
        sharpenCanvas(ctx, tw, th, 0.35);

        const resultadosCanvas = await this.nativeDetector.detect(canvas);
        for (const barcode of resultadosCanvas) {
          const texto = barcode.rawValue.trim();
          if (this.esMatriculaValida(texto)) {
            this.procesarDeteccion(texto, `nativo-canvas:${barcode.format}`);
            return;
          }
        }

        // ── Intento 3: Otsu binarization para nativo ──────────────────
        // Redibujamos en grayscale y aplicamos Otsu para un resultado
        // perfectamente binarizado (blanco/negro puro).
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, tw, th);
        ctx.filter = 'none';
        otsuBinarize(ctx, tw, th);

        const resultadosOtsu = await this.nativeDetector.detect(canvas);
        for (const barcode of resultadosOtsu) {
          const texto = barcode.rawValue.trim();
          if (this.esMatriculaValida(texto)) {
            this.procesarDeteccion(texto, `nativo-otsu:${barcode.format}`);
            return;
          }
        }
      }
    } catch (err: unknown) {
      const { name, message } = datosError(err);
      if (name !== 'InvalidStateError') console.warn('BarcodeDetector error:', message);
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
    const strategies = this.getOrderedStrategies();
    const total = strategies.length;

    const BUDGET_MS = this.effectiveBudget;
    const t0 = performance.now();

    // ── Zoom software: recorta ROI al centro proporcional al factor ────
    // Si zoom es software y > 1, recortamos la región central del video
    // que correspondería al encuadre visible con el scale CSS aplicado.
    // Ejemplo: zoom 2× → recortamos centro 50% × 50% como "frame efectivo".
    const zoomCrop = (!this.zoomHardware && this.zoomActual > 1) ? this.zoomActual : 1;
    const effW = Math.floor(vw / zoomCrop);
    const effH = Math.floor(vh / zoomCrop);
    const offX = Math.floor((vw - effW) / 2);
    const offY = Math.floor((vh - effH) / 2);

    // ═════════════════════════════════════════════════════════════════════
    // FASE 1: Estrategias con filtros CSS + sharpening (como antes, mejorado)
    // ═════════════════════════════════════════════════════════════════════

    for (let i = 0; i < total; i++) {
      if (performance.now() - t0 > BUDGET_MS) break;

      const strategy = strategies[(this.zxingStrategyIdx + i) % total];

      // ── Frame completo (ajustado por zoom software) ─────────────────
      const tw = Math.round(effW * strategy.scale);
      const th = Math.round(effH * strategy.scale);
      canvas.width  = tw;
      canvas.height = th;
      ctx.filter = strategy.filter;
      ctx.drawImage(video, offX, offY, effW, effH, 0, 0, tw, th);
      ctx.filter = 'none';

      if (this.sharpenEnabled && strategy.scale >= 1.5) {
        sharpenCanvas(ctx, tw, th, 0.4);
      }

      const fullResult = this.intentarDecodeCanvas(canvas);
      if (fullResult) {
        this.registrarExito(strategy.label);
        this.procesarDeteccion(fullResult, `zxing:${strategy.label}:full`);
        return;
      }

      if (performance.now() - t0 > BUDGET_MS) break;

      // ── ROI central horizontal (82% ancho, 42% alto, centrado) ──────
      const roiX  = offX + Math.floor(effW * 0.09);
      const roiY  = offY + Math.floor(effH * 0.29);
      const roiW  = Math.floor(effW * 0.82);
      const roiH  = Math.floor(effH * 0.42);
      const roiTW = Math.round(roiW * strategy.scale);
      const roiTH = Math.round(roiH * strategy.scale);
      canvas.width  = roiTW;
      canvas.height = roiTH;
      ctx.filter = strategy.filter;
      ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, roiTW, roiTH);
      ctx.filter = 'none';

      if (this.sharpenEnabled && strategy.scale >= 1.5) {
        sharpenCanvas(ctx, roiTW, roiTH, 0.4);
      }

      const roiResult = this.intentarDecodeCanvas(canvas);
      if (roiResult) {
        this.registrarExito(strategy.label);
        this.procesarDeteccion(roiResult, `zxing:${strategy.label}:roi`);
        return;
      }
    }

    this.zxingStrategyIdx = (this.zxingStrategyIdx + 1) % total;

    // ═════════════════════════════════════════════════════════════════════
    // FASE 2: Binarización Otsu — umbral óptimo calculado del histograma
    // Reemplaza el "adivinar" del contrast() CSS con matemáticas.
    // Se aplica sobre ROI central para máximo impacto y mínimo costo.
    // ═════════════════════════════════════════════════════════════════════

    if (performance.now() - t0 <= BUDGET_MS) {
      const roiX  = offX + Math.floor(effW * 0.05);
      const roiY  = offY + Math.floor(effH * 0.25);
      const roiW  = Math.floor(effW * 0.90);
      const roiH  = Math.floor(effH * 0.50);
      const otsuScale = this.esLowRes ? 2.5 : 1;
      const otsuW = Math.round(roiW * otsuScale);
      const otsuH = Math.round(roiH * otsuScale);
      canvas.width  = otsuW;
      canvas.height = otsuH;
      ctx.filter = 'grayscale(100%)';
      ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, otsuW, otsuH);
      ctx.filter = 'none';

      if (this.sharpenEnabled) sharpenCanvas(ctx, otsuW, otsuH, 0.3);
      otsuBinarize(ctx, otsuW, otsuH);

      const otsuResult = this.intentarDecodeCanvas(canvas);
      if (otsuResult) {
        this.registrarExito('otsu');
        this.procesarDeteccion(otsuResult, 'zxing:otsu:roi');
        return;
      }

      // Otsu invertido — por si la cámara produce barras claras sobre fondo oscuro
      if (performance.now() - t0 <= BUDGET_MS) {
        invertCanvas(ctx, otsuW, otsuH);
        const invertResult = this.intentarDecodeCanvas(canvas);
        if (invertResult) {
          this.registrarExito('otsu-inv');
          this.procesarDeteccion(invertResult, 'zxing:otsu-inv:roi');
          return;
        }
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // FASE 3: Franjas horizontales (scanlines)
    // Code 128 es 1D — toda la información está en una sola línea horizontal.
    // Franjas angostas a 3 alturas distintas con upscaling agresivo.
    // ═════════════════════════════════════════════════════════════════════

    if (performance.now() - t0 <= BUDGET_MS) {
      const stripH   = Math.max(Math.floor(effH * 0.10), 24);
      const stripScale = this.esLowRes ? 3 : 1.5;
      // Cobertura completa del encuadre (no solo centro) — el barcode puede
      // estar en cualquier parte cuando el usuario sostiene la credencial
      // con la mano. Probamos del 30% al 70% del frame en pasos de 10%.
      const stripPositions = [0.30, 0.40, 0.50, 0.60, 0.70];

      for (const yFrac of stripPositions) {
        if (performance.now() - t0 > BUDGET_MS) break;

        const srcY = offY + Math.floor(effH * yFrac - stripH / 2);
        const tw2 = Math.round(effW * stripScale);
        const th2 = Math.round(stripH * stripScale);
        canvas.width  = tw2;
        canvas.height = th2;
        ctx.filter = 'grayscale(100%) contrast(250%) brightness(105%)';
        ctx.drawImage(video, offX, srcY, effW, stripH, 0, 0, tw2, th2);
        ctx.filter = 'none';

        if (this.sharpenEnabled) sharpenCanvas(ctx, tw2, th2, 0.5);

        const stripResult = this.intentarDecodeCanvas(canvas);
        if (stripResult) {
          this.registrarExito('strip');
          this.procesarDeteccion(stripResult, `zxing:strip:${Math.round(yFrac * 100)}`);
          return;
        }
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // FASE 4: Corrección de rotación
    // Si la credencial está inclinada ±3°–5°, Code 128 no se decodifica.
    // Rotamos el canvas y reintentamos. Solo se intenta si hay presupuesto
    // (normalmente llega aquí en frames donde las fases 1-3 fueron rápidas).
    // ═════════════════════════════════════════════════════════════════════

    if (performance.now() - t0 <= BUDGET_MS && this.rotCanvas && this.rotCtx) {
      const roiX  = offX + Math.floor(effW * 0.05);
      const roiY  = offY + Math.floor(effH * 0.20);
      const roiW  = Math.floor(effW * 0.90);
      const roiH  = Math.floor(effH * 0.60);
      const rotScale = this.esLowRes ? 2 : 1;

      for (const angle of ROTATION_ANGLES) {
        if (angle === 0) continue; // ya se probó sin rotación en fases anteriores
        if (performance.now() - t0 > BUDGET_MS) break;

        const rad = (angle * Math.PI) / 180;
        const tw3 = Math.round(roiW * rotScale);
        const th3 = Math.round(roiH * rotScale);
        this.rotCanvas.width  = tw3;
        this.rotCanvas.height = th3;

        this.rotCtx.filter = 'grayscale(100%) contrast(220%) brightness(105%)';
        this.rotCtx.save();
        this.rotCtx.translate(tw3 / 2, th3 / 2);
        this.rotCtx.rotate(rad);
        this.rotCtx.drawImage(video, roiX, roiY, roiW, roiH, -tw3 / 2, -th3 / 2, tw3, th3);
        this.rotCtx.restore();
        this.rotCtx.filter = 'none';

        const rotResult = this.intentarDecodeRotCanvas();
        if (rotResult) {
          this.registrarExito(`rot${angle}`);
          this.procesarDeteccion(rotResult, `zxing:rot${angle}:roi`);
          return;
        }
      }
    }

    // ── Fallback raw sin filtro (si el código ya tiene buen contraste) ──
    if (performance.now() - t0 <= BUDGET_MS) {
      canvas.width  = effW;
      canvas.height = effH;
      ctx.filter = 'none';
      ctx.drawImage(video, offX, offY, effW, effH, 0, 0, effW, effH);
      const rawResult = this.intentarDecodeCanvas(canvas);
      if (rawResult) {
        this.registrarExito('raw');
        this.procesarDeteccion(rawResult, 'zxing:raw:full');
      }
    }
  }

  /**
   * Retorna las estrategias ordenadas por probabilidad de éxito.
   * Si una estrategia tiene éxitos recientes, se promueve al inicio.
   */
  private getOrderedStrategies(): { filter: string; scale: number; label: string }[] {
    if (this.strategySuccessHistory.length < 3) return this.effectiveStrategies;

    // Contar éxitos por estrategia
    const counts = new Map<string, number>();
    for (const label of this.strategySuccessHistory) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    // Si alguna estrategia tiene ≥50% de los éxitos, promoverla
    const threshold = Math.floor(this.strategySuccessHistory.length * 0.5);
    let bestLabel = '';
    let bestCount = 0;
    for (const [label, count] of counts) {
      if (count > bestCount) { bestCount = count; bestLabel = label; }
    }

    if (bestCount >= threshold && bestLabel) {
      const idx = this.effectiveStrategies.findIndex(s => s.label === bestLabel);
      if (idx > 0) {
        // Mover al frente sin mutar el array original
        const reordered = [...this.effectiveStrategies];
        const [promoted] = reordered.splice(idx, 1);
        reordered.unshift(promoted);
        return reordered;
      }
    }

    return this.effectiveStrategies;
  }

  /**
   * Registra un éxito de estrategia para el tracking de priorización.
   */
  private registrarExito(label: string): void {
    this.strategySuccessHistory.push(label);
    if (this.strategySuccessHistory.length > STRATEGY_HISTORY_SIZE) {
      this.strategySuccessHistory.shift();
    }
  }

  private intentarDecodeCanvas(canvas: HTMLCanvasElement): string | null {
    try {
      const result = this.browserReader!.decodeFromCanvas(canvas);
      if (result) {
        const texto = result.getText().trim();
        if (this.esMatriculaValida(texto)) return texto;
      }
    } catch (e: unknown) {
      const NFE = this.zxingLib?.NotFoundException;
      const { name, message } = datosError(e);
      if ((!NFE || !(e instanceof NFE)) && name !== 'NotFoundException') {
        if (message && !message.includes('No MultiFormat Readers')) {
          console.warn('ZXing decode error:', message);
        }
      }
    }
    return null;
  }

  /**
   * Intenta decodificar desde el canvas auxiliar de rotación.
   * Separado para evitar confusión con el canvas principal del componente.
   */
  private intentarDecodeRotCanvas(): string | null {
    if (!this.rotCanvas || !this.browserReader) return null;
    try {
      const result = this.browserReader.decodeFromCanvas(this.rotCanvas);
      if (result) {
        const texto = result.getText().trim();
        if (this.esMatriculaValida(texto)) return texto;
      }
    } catch (e: unknown) {
      const NFE = this.zxingLib?.NotFoundException;
      const { name, message } = datosError(e);
      if ((!NFE || !(e instanceof NFE)) && name !== 'NotFoundException') {
        if (message && !message.includes('No MultiFormat Readers')) {
          console.warn('ZXing decode error:', message);
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
    if (this.enCooldown) return;
    // Con una confirmación abierta (matrícula a mano), la lectura de la
    // cámara se ignora SIN consumirla: antes sonaba, apagaba la cámara y se
    // perdía. La cámara la vuelve a leer al cerrarse (revisión v3.58.0).
    if (this.confirmacionRef) return;

    const desdeLector = fuente === 'usb-hid';
    const ahora = Date.now();

    // Guard anti-repetición. La cámara necesita uno POR VALOR: decodifica el
    // mismo frame decenas de veces por segundo y solo se limpia al reiniciarla.
    // El lector físico no: cada escaneo es un disparo discreto, así que ahí el
    // guard debe ser TEMPORAL. Con el guard por valor, un alumno que registra
    // entrada y salida quedaba bloqueado para siempre en su propia credencial
    // (nada volvía a pasar hasta recargar la pantalla).
    if (desdeLector) {
      if (texto === this.ultimoQrEscaneado &&
          ahora - this.ultimaDeteccionTs < ScannerComponent.LECTOR_REPETICION_MS) {
        return;
      }
    } else if (texto === this.ultimoQrEscaneado) {
      return;
    }

    this.ultimoQrEscaneado = texto;
    this.ultimaDeteccionTs = ahora;
    this.enCooldown = true;
    console.log(`✅ Detectado [${fuente}]: ${texto}`);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    this.soundService.beepScan();
    const habiaCamara = this.scannerActivo;
    if (habiaCamara) this.detenerScanner();

    // El lector físico (Code 128 con checksum) no lee mal: o decodifica o no
    // decodifica. El dialog de confirmación existe para el error de lectura de
    // la cámara, así que en el camino del lector es fricción pura — dos taps
    // por alumno que no aportan nada. Feedback pasivo (barra + beep) en su lugar.
    this.ngZone.run(() => {
      if (desdeLector) {
        this.mostrarProgresoLector();
        this.procesarMatricula(texto, 'lector');
        return;
      }

      this.toastService.success(`Código detectado: ${texto}`);
      // v3.21: si el coordinador activó "saltar confirmación" desde
      // /configuracion, procesar directo sin dialog (acelera flujos quiosco).
      if (this.configService.escanerSaltarConfirmacion) {
        this.procesarMatricula(texto, 'camara');
      } else {
        this.mostrarConfirmacionMatricula(texto, habiaCamara);
      }
    });
  }

  /**
   * Enciende la barra de progreso del lector. Se auto-oculta a los 450ms:
   * la búsqueda en IndexedDB tarda milisegundos, y una barra que aparece y
   * desaparece en 3ms se lee como un glitch, no como confirmación.
   */
  private mostrarProgresoLector(): void {
    if (this.lectorProgTimer !== null) clearTimeout(this.lectorProgTimer);
    this.lectorProcesando.set(true);
    this.lectorProgTimer = window.setTimeout(() => {
      this.ngZone.run(() => this.lectorProcesando.set(false));
      this.lectorProgTimer = null;
    }, 450);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DETENER SCANNER
  // ═══════════════════════════════════════════════════════════════════════

  detenerScanner(): void {
    this.scannerActivo = false;
    if (this.loopFrameId !== null) { cancelAnimationFrame(this.loopFrameId); this.loopFrameId = null; }
    if (this.linternaActiva) {
      const track = this.mediaStream?.getVideoTracks()[0];
      (track ? aplicar(track, { torch: false }) : Promise.resolve()).catch(() => {
        /* Apagar la linterna es best-effort: la cámara puede no soportarlo. */
      });
      this.linternaActiva = false;
    }
    if (this.mediaStream) { this.mediaStream.getTracks().forEach(t => t.stop()); this.mediaStream = null; }
    this.nativeDetector = null;
    this.browserReader = null;
    this.rotCanvas = null;
    this.rotCtx = null;
    this.escaneando = false;
    this.linternaDisponible = false;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONFIRMACIÓN Y NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * disableClose evita que un toque fuera del diálogo lo cierre por accidente
   * (tablet del quiosco), pero también bloqueaba Escape. Escape sí es
   * intencional: cierra sin respuesta, que ambos diálogos tratan como cancelar.
   */
  private cerrarConEscape(ref: MatDialogRef<unknown>): void {
    ref.keydownEvents()
      .pipe(filter(e => e.key === 'Escape'))
      .subscribe(() => ref.close());
  }

  private mostrarConfirmacionMatricula(
    matricula: string,
    reiniciarCamara = true,
    origen: 'camara' | 'manual' = 'camara',
  ): void {
    if (this.confirmacionRef || this.destruido) return;
    const dialogRef = this.dialog.open(ConfirmacionMatriculaDialogComponent, {
      width: '350px',
      data: { matricula },
      disableClose: true
    });
    this.confirmacionRef = dialogRef;
    this.cerrarConEscape(dialogRef);

    dialogRef.afterClosed().subscribe(resultado => {
      this.confirmacionRef = null;
      if (this.destruido) return;
      if (resultado === true) {
        this.procesarMatricula(matricula, origen);
      } else {
        this.toastService.warning('Escaneo cancelado');
        // Auto-reiniciar tras 1.5s: da tiempo para que el usuario retire
        // la credencial del encuadre antes de que se vuelva a detectar.
        // Guardado en confirmTimer → cancelable en ngOnDestroy si el
        // usuario navega antes del disparo.
        if (this.confirmTimer !== null) clearTimeout(this.confirmTimer);
        // v3.21: cooldown configurable desde /configuracion.
        const cd = Math.max(0, this.configService.escanerCooldownMs);
        this.confirmTimer = window.setTimeout(() => {
          this.confirmTimer = null;
          this.ultimoQrEscaneado = '';
          this.enCooldown = false;
          if (reiniciarCamara) this.iniciarScanner();
        }, cd);
      }
    });
  }

  /**
   * keydown, no keyup: el Enter que confirma el diálogo devuelve el foco a
   * esta caja y su keyup caía aquí, abriendo otra confirmación. La tecla
   * sostenida (repeat) tampoco cuenta.
   */
  onEnterManual(e: Event): void {
    e.preventDefault();
    if ((e as KeyboardEvent).repeat) return;
    this.procesarMatriculaManual();
  }

  async procesarMatriculaManual(): Promise<void> {
    if (this.cargando || this.confirmacionRef) return;
    const input = this.matriculaManual.trim();
    if (!input) {
      this.toastService.warning('Por favor ingresa una matrícula');
      return;
    }
 
    // Validación completa (aplica min Y max de dígitos, acepta prefijo a/A)
    const resultado = validarMatricula(input);
    if (!resultado.valida) {
      this.toastService.error(resultado.error || 'Formato de matrícula no válido');
      return;
    }

    // Solo pedir reanudar la cámara si estaba activa al momento del envío manual.
    this.mostrarConfirmacionMatricula(resultado.matriculaLimpia, this.scannerActivo, 'manual');
  }

  private async procesarMatricula(
    matricula: string,
    origen: 'camara' | 'manual' | 'lector' = 'camara',
  ): Promise<void> {
    this.origenEsLector = origen === 'lector';
    try {
      // El horario se revisa solo antes de una ENTRADA (más abajo): hasta
      // v3.57.1 se revisaba aquí y, en modo "bloquear", quien salía después
      // del cierre no podía marcar su salida.
      this.cargando = true;
      this.error = null;
      // El lector ya muestra su propia barra en la tarjeta; el overlay global
      // taparía la pantalla completa por una búsqueda de milisegundos.
      if (!this.origenEsLector) this.loadingService.show('Buscando alumno...');

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
            default: {
              this.toastService.info('Registro cancelado');
              this.resetEstado();
              // Otra credencial cerró el diálogo abandonado: atenderla.
              const pendiente = sessionStorage.getItem(CLAVE_LECTURA_PENDIENTE);
              if (pendiente) {
                sessionStorage.removeItem(CLAVE_LECTURA_PENDIENTE);
                setTimeout(() => this.procesarDeteccion(pendiente, 'usb-hid'));
              }
              return;
            }
          }
        }

        // ── Horario y aforo: solo para una entrada nueva ──────────────
        if (!this.verificarHorarioOperativo()) {
          this.resetEstado();
          return;
        }
        const puedeEntrar = await this.verificarAforo();
        if (!puedeEntrar) {
          this.resetEstado();
          return;
        }

        // ── Flujo normal: ir a selección de motivo ────────────────────
        this.toastService.success(`¡Bienvenido ${alumno.nombre}!`);
        sessionStorage.setItem('alumnoActual', JSON.stringify(alumno));
        this.router.navigate(['/seleccion-motivo']);

      } else {
        if (!this.verificarHorarioOperativo()) {
          this.resetEstado();
          return;
        }
        // Alumno no encontrado: vamos al flujo de registro tanto en modo
        // normal como en quiosco. /registro-alumno está explícitamente
        // permitido en quiosco (ver AppComponent.rutasPermitidasEnQuiosco)
        // — bloquear aquí sería inconsistente con la política de rutas.
        // Los visitantes externos tienen su propio flujo ("Acceso invitado").
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

      const enQuiosco = this.configService.modoQuioscoSignal();

      const data: RegistroDuplicadoData = {
        nombreAlumno: `${alumno.nombre} ${alumno.apellidoPaterno}`,
        matricula: alumno.matricula,
        motivoAnterior: registroReciente.motivoNombre,
        horaRegistro,
        minutosTranscurridos,
        registroId: registroReciente.id,
        yaRegistroSalida: !!registroReciente.horaSalida,
        modoQuiosco: enQuiosco,
      };

      const dialogRef = this.dialog.open(RegistroDuplicadoDialogComponent, {
        width: enQuiosco ? '440px' : '380px',
        data,
        disableClose: true,
      });
      this.cerrarConEscape(dialogRef);

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

      // Refuerzo visual (útil cuando el dispositivo está en silencio).
      // Overlay no modal: se disipa solo para no bloquear al siguiente usuario.
      this.mostrarFlashSalida(registro.nombreCompleto, duracionTexto);

      // Mantener actualizada la lista de visitantes con entrada abierta
      // (el registro cerrado puede haber sido un visitante).
      this.refrescarVisitantesAbiertos();
      // Sin esto el banner de aforo seguía contando a quien acaba de salir
      // hasta la siguiente entrada (v3.58.0).
      if (this.configService.aforoActivo) void this.aforoService.refrescar();

      this.resetEstado();
    } catch (err: unknown) {
      console.error('Error al registrar salida:', err);
      this.loadingService.hide();
      this.toastService.error('Error al registrar la salida. Intenta de nuevo.');
      this.resetEstado();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SALIDA AUTÓNOMA DE VISITANTE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Refresca la lista de visitantes (matricula='INVITADO') con entrada
   * abierta del día. Silencioso: un fallo se ignora — el botón simplemente
   * no aparecerá. Llamar al entrar al scanner y tras cada salida.
   */
  private async refrescarVisitantesAbiertos(): Promise<void> {
    try {
      const abiertos = await this.databaseService.obtenerRegistrosAbiertoHoy();
      this.visitantesAbiertos.set(
        abiertos.filter(r => r.matricula === 'INVITADO' && !r.horaSalida),
      );
    } catch {
      this.visitantesAbiertos.set([]);
    }
  }

  /**
   * Abre el dialog con la lista de visitantes con entrada abierta. Al
   * seleccionar uno, cierra su registro reutilizando `procesarSalida()`.
   */
  async abrirSalidaVisitante(): Promise<void> {
    const lista = this.visitantesAbiertos();
    if (lista.length === 0) {
      this.toastService.info('No hay visitantes con entrada abierta');
      return;
    }

    const dialogRef = this.dialog.open(SalidaVisitanteDialogComponent, {
      width: '440px',
      maxWidth: '92vw',
      data: { visitantes: lista },
      disableClose: false,
      panelClass: 'quiosco-dialog-panel',
    });

    const resultado: SalidaVisitanteResultado | null | undefined =
      await dialogRef.afterClosed().toPromise();
    if (!resultado) return;

    const registro = lista.find(r => r.id === resultado.registroId);
    if (!registro) {
      this.toastService.error('No se encontró el visitante en la lista');
      return;
    }

    await this.procesarSalida(registro);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Activa el overlay de confirmación de salida (check verde + nombre +
   * duración). Se auto-oculta tras 1800ms para no bloquear al siguiente
   * usuario. Seguro contra llamadas consecutivas: reinicia el timer.
   */
  private mostrarFlashSalida(nombre: string, duracion: string): void {
    if (this.salidaFlashTimer !== null) {
      clearTimeout(this.salidaFlashTimer);
    }
    this.salidaFlash.set({ nombre, duracion });
    this.salidaFlashTimer = window.setTimeout(() => {
      this.ngZone.run(() => this.salidaFlash.set(null));
      this.salidaFlashTimer = null;
    }, 1800);
  }

  private resetEstado(): void {
    this.cargando = false;
    this.enCooldown = false;
    this.origenEsLector = false;
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

    dialogRef.afterClosed().subscribe(async (nombreIngresado: string | null | undefined) => {
      // Si el dialog se cerró con X (undefined), cancelar
      if (nombreIngresado === undefined) return;

      // Un visitante también es una entrada: mismo horario y aforo (hasta
      // v3.57.1 el horario en modo "bloquear" no lo detenía).
      if (!this.verificarHorarioOperativo()) return;
      const puedeEntrar = await this.verificarAforo();
      if (!puedeEntrar) return;

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

  /**
   * Verifica si hay cupo disponible antes de permitir una nueva entrada.
   * Retorna true si puede continuar, false si debe abortar.
   *
   * Comportamiento según `aforoModo`:
   * - 'permitir':  alerta + sonido pero permite continuar
   * - 'confirmar': bloquea con dialog de confirmación (override manual)
   * - 'bloquear':  bloqueo duro, no permite registrar más entradas
   */
  private async verificarAforo(): Promise<boolean> {
    if (!this.configService.aforoActivo) return true;

    // Refrescar conteo desde la BD para tener el dato más actual
    await this.aforoService.refrescar();

    if (this.aforoService.hayCupo) return true;

    const ocupacion = this.aforoService.ocupacion();
    const capacidad = this.aforoService.capacidad();
    const modo = this.configService.aforoModo;

    // Sonido de alerta en cualquier modo
    this.soundService.beepError();

    if (modo === 'bloquear') {
      this.toastService.error(
        `Aforo lleno (${ocupacion}/${capacidad}). Espera a que alguien salga.`
      );
      return false;
    }

    if (modo === 'confirmar') {
      const data: ConfirmDialogData = {
        titulo: 'Aforo máximo alcanzado',
        mensaje: `${ocupacion === 1 ? 'Hay 1 persona' : `Hay ${ocupacion} personas`} dentro y la capacidad es de ${capacidad}.\n\n¿Deseas autorizar esta entrada de todas formas?`,
        textoConfirmar: 'Autorizar entrada',
        textoCancelar: 'Cancelar',
        variante: 'warning',
        icono: 'warning',
      };
      const ref = this.dialog.open(ConfirmDialogComponent, { width: '420px', data });
      const confirmado = await ref.afterClosed().toPromise();
      if (!confirmado) {
        this.toastService.info('Entrada cancelada');
        return false;
      }
      this.toastService.warning('Entrada autorizada manualmente — sobreaforo');
      return true;
    }

    // modo === 'permitir' (default)
    this.toastService.warning(
      `Aforo lleno (${ocupacion}/${capacidad}) — entrada permitida con alerta`
    );
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HORARIO OPERATIVO + MODO QUIOSCO (v3.9.0)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Verifica si el horario actual permite registrar entradas.
   * Retorna true si puede continuar, false si debe abortar.
   *
   * Comportamiento según `horarioModo`:
   * - 'advertir': muestra toast warning y permite continuar
   * - 'bloquear': muestra toast error y aborta
   *
   * Si `horarioActivo` es false, siempre retorna true.
   */
  private verificarHorarioOperativo(): boolean {
    if (!this.configService.horarioActivo) return true;

    const verif = verificarHorario(new Date(), this.configService.horarios);
    if (verif.abierto) return true;

    const sufijo = verif.proximaApertura ? ` Próxima apertura: ${verif.proximaApertura}.` : '';
    const mensaje = (verif.mensaje || 'Fuera de horario.') + sufijo;

    this.soundService.beepError();

    if (this.configService.horarioModo === 'bloquear') {
      this.toastService.error(mensaje);
      return false;
    }

    this.toastService.warning(mensaje + ' (Registro permitido con alerta)');
    return true;
  }

  // ── Gestos secretos para salir del modo quiosco ──
  // El template llama `pressDownQuiosco()` en mousedown/touchstart sobre el
  // contenedor del scanner y `pressUpQuiosco()` en mouseup/touchend/leave.
  // Hay dos formas de invocar el dialog del PIN:
  //   1. Mantener presionado 3 segundos (long-press).
  //   2. Hacer 5 taps rápidos seguidos (gap ≤ 600 ms entre cada uno).
  // Ambos abren `QuioscoPinDialogComponent`. Si se valida el PIN, se sale.

  // pressTimer ya está declarado arriba como `private pressTimer: number | null`.
  pressActivo = false;

  // Multi-tap (5 taps rápidos en el contenedor del scanner)
  private tapCount = 0;
  private tapTimer: number | null = null;
  private lastTapTs = 0;
  /** Número de taps consecutivos que abren el dialog. */
  private static readonly TAPS_PARA_SALIR = 5;
  /** Gap máximo entre taps para considerarlos parte de la misma secuencia. */
  private static readonly TAP_MAX_GAP_MS = 600;
  /** Si el press dura menos que esto, lo consideramos tap (no long-press). */
  private static readonly TAP_MAX_DURATION_MS = 400;
  private tapDownTs = 0;

  pressDownQuiosco(): void {
    if (!this.configService.modoQuiosco) return;
    this.pressActivo = true;
    this.tapDownTs = Date.now();
    if (this.pressTimer !== null) clearTimeout(this.pressTimer);
    this.pressTimer = window.setTimeout(() => {
      this.pressTimer = null;
      this.pressActivo = false;
      // Long-press completado: reseteamos el contador de taps para que no se
      // mezcle con esta vía.
      this.tapCount = 0;
      if (this.tapTimer !== null) { clearTimeout(this.tapTimer); this.tapTimer = null; }
      this.abrirDialogSalidaQuiosco();
    }, 3000);
  }

  pressUpQuiosco(): void {
    const eraPressActivo = this.pressActivo;
    this.pressActivo = false;
    const pressPending = this.pressTimer !== null;
    if (this.pressTimer !== null) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    // Si el press se soltó ANTES de que disparara el long-press y el modo
    // quiosco está activo, lo contamos como tap rápido. Evita registrar como
    // "tap" un long-press abortado (el usuario soltó tarde por error).
    if (!eraPressActivo || !pressPending) return;
    if (!this.configService.modoQuiosco) return;
    const duracion = Date.now() - this.tapDownTs;
    if (duracion > ScannerComponent.TAP_MAX_DURATION_MS) return;
    this.registrarTapQuiosco();
  }

  private registrarTapQuiosco(): void {
    const ahora = Date.now();
    if (ahora - this.lastTapTs > ScannerComponent.TAP_MAX_GAP_MS) {
      this.tapCount = 0;
    }
    this.tapCount++;
    this.lastTapTs = ahora;

    if (this.tapTimer !== null) clearTimeout(this.tapTimer);
    this.tapTimer = window.setTimeout(() => {
      this.tapCount = 0;
      this.tapTimer = null;
    }, ScannerComponent.TAP_MAX_GAP_MS);

    if (this.tapCount >= ScannerComponent.TAPS_PARA_SALIR) {
      this.tapCount = 0;
      if (this.tapTimer !== null) { clearTimeout(this.tapTimer); this.tapTimer = null; }
      this.abrirDialogSalidaQuiosco();
    }
  }

  private abrirDialogSalidaQuiosco(): void {
    // El diálogo también descarga el respaldo sin salir del quiosco (v3.52.0);
    // aquí solo llega 'salir'.
    const ref = this.dialog.open<QuioscoPinDialogComponent, unknown, SalidaPinQuiosco>(
      QuioscoPinDialogComponent,
      { width: '360px', maxWidth: 'calc(100vw - 32px)', disableClose: false }
    );
    ref.afterClosed().subscribe((salida) => {
      if (salida === 'salir') {
        this.configService.setModoQuiosco(false);
        this.toastService.success('Modo quiosco desactivado');
      }
    });
  }

  private interpretarErrorCamara(err: unknown): string {
    const { name, message } = datosError(err);
    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Permiso de cámara denegado. Revisa la configuración del navegador.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No se encontró una cámara en este dispositivo.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'La cámara está en uso por otro programa. Ciérralo e intenta de nuevo.';
      case 'OverconstrainedError':
        return 'La cámara no soporta la configuración solicitada.';
      case 'SecurityError':
        return 'Cámara bloqueada. Asegúrate de usar HTTPS.';
      default:
        return message || 'No se pudo acceder a la cámara.';
    }
  }
}