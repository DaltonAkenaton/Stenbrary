// ╔══════════════════════════════════════════════════════╗
// ║  categorias/escaner.component.ts                     ║
// ║  Categoría "Escáner" del nuevo /configuración        ║
// ║  Stenbrary v3.24.0                                    ║
// ║                                                      ║
// ║  Contiene:                                            ║
// ║   - Sonido de confirmación (toggle + volumen)         ║
// ║   - Comportamiento del escáner (velocidad, cooldown, ║
// ║     saltar confirmación, cámara preferida, zoom)     ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SoundService } from '../../../core/services/sound.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfigService, CamaraPreferida } from '../../../core/services/config.service';

@Component({
    selector: 'app-config-escaner',
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatTooltipModule,
    ],
    templateUrl: './escaner.component.html',
    styleUrls: ['../configuracion.styles.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EscanerCategoriaComponent {

  readonly opcionesEscanerCooldown = [
    { valor: 0,    etiqueta: 'Sin espera' },
    { valor: 800,  etiqueta: '0.8 s' },
    { valor: 1500, etiqueta: '1.5 s' },
    { valor: 3000, etiqueta: '3 s' },
  ];

  readonly opcionesCamara: { valor: CamaraPreferida; etiqueta: string; icono: string }[] = [
    { valor: 'auto',        etiqueta: 'Automática',  icono: 'autorenew' },
    { valor: 'environment', etiqueta: 'Trasera',     icono: 'photo_camera_back' },
    { valor: 'user',        etiqueta: 'Frontal',     icono: 'photo_camera_front' },
  ];

  readonly opcionesZoomDefault = [
    { valor: 100, etiqueta: '100% (sin zoom)' },
    { valor: 150, etiqueta: '150%' },
    { valor: 200, etiqueta: '200%' },
    { valor: 250, etiqueta: '250%' },
    { valor: 300, etiqueta: '300%' },
  ];

  // Debounce de toast para inputs continuos (slider, stepper).
  private toastDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    public soundService: SoundService,
    public configService: ConfigService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  get zoomDefaultPct(): number {
    return Math.round(this.configService.zoomScannerDefault * 100);
  }

  get volumenBeepPct(): number {
    return Math.round(this.configService.volumenBeep * 100);
  }

  // ─── Sonido ─────────────────────────────────────────
  toggleSonido(): void {
    const nuevo = this.soundService.toggle();
    this.toastService.info(nuevo ? 'Sonido activado' : 'Sonido desactivado');
    this.cdr.markForCheck();
  }

  probarSonido(): void {
    this.soundService.beepExito();
  }

  setVolumenBeepPct(pct: number | string): void {
    const n = typeof pct === 'string' ? parseInt(pct, 10) : pct;
    const clamped = Math.max(0, Math.min(100, isNaN(n) ? 0 : n));
    this.configService.setVolumenBeep(clamped / 100);
    this.debouncedToast('volumen', `Volumen del beep: ${clamped}%`);
    this.cdr.markForCheck();
  }

  // ─── Comportamiento de la cámara ────────────────────
  // `escanerVelocidadMs` se retiró de la UI en v3.32: solo estrangulaba el
  // bucle de la cámara y, con el default en 0 (lo más rápido posible), el
  // único ajuste posible era hacerla más lenta. La clave sigue en
  // ConfigService por retrocompatibilidad con configuraciones guardadas.
  onChangeEscanerCooldown(ms: number | string): void {
    const n = typeof ms === 'string' ? parseInt(ms, 10) : ms;
    this.configService.setEscanerCooldownMs(isNaN(n) ? 0 : n);
    const v = this.configService.escanerCooldownMs;
    this.debouncedToast(
      'escaner-cd',
      v === 0 ? 'Sin espera entre escaneos' : `Espera entre escaneos: ${v} ms`,
    );
    this.cdr.markForCheck();
  }

  onSetEscanerCooldown(ms: number, etiqueta: string): void {
    this.configService.setEscanerCooldownMs(ms);
    this.toastService.success(`Espera entre escaneos: ${etiqueta}`);
    this.cdr.markForCheck();
  }

  onToggleBotonCamara(): void {
    const nuevo = !this.configService.mostrarBotonCamara;
    this.configService.setMostrarBotonCamara(nuevo);
    this.toastService.success(
      nuevo
        ? 'El escáner muestra la opción de usar la cámara'
        : 'Botón de cámara oculto: el escáner solo usa el lector y la captura manual',
    );
    this.cdr.markForCheck();
  }

  onToggleAvisoPrivacidad(): void {
    const nuevo = !this.configService.avisoPrivacidadActivo;
    this.configService.setAvisoPrivacidadActivo(nuevo);
    this.toastService.success(nuevo ? 'Aviso de privacidad visible en el escáner' : 'Aviso de privacidad oculto');
    this.cdr.markForCheck();
  }

  onChangeAvisoPrivacidad(texto: string): void {
    this.configService.setAvisoPrivacidadTexto(texto);
    this.toastService.success('Aviso de privacidad actualizado');
    this.cdr.markForCheck();
  }

  onToggleEscanerSaltarConfirmacion(): void {
    const nuevo = !this.configService.escanerSaltarConfirmacion;
    this.configService.setEscanerSaltarConfirmacion(nuevo);
    this.toastService.success(
      nuevo
        ? 'El escáner ya no pedirá confirmación — procesará al instante'
        : 'El escáner pedirá confirmación antes de procesar',
    );
    this.cdr.markForCheck();
  }

  // ─── Cámara y zoom ──────────────────────────────────
  onSetCamaraPreferida(valor: CamaraPreferida, etiqueta: string): void {
    this.configService.setCamaraPreferida(valor);
    this.toastService.success(
      `Cámara preferida: ${etiqueta}. Se aplicará la próxima vez que abras el escáner.`,
    );
    this.cdr.markForCheck();
  }

  onSetZoomDefault(pct: number, etiqueta: string): void {
    this.configService.setZoomScannerDefault(pct / 100);
    this.toastService.success(`Zoom inicial del escáner: ${etiqueta}`);
    this.cdr.markForCheck();
  }

  onChangeZoomDefaultPct(pct: number | string): void {
    const n = typeof pct === 'string' ? parseInt(pct, 10) : pct;
    const clamped = Math.max(100, Math.min(300, isNaN(n) ? 100 : n));
    this.configService.setZoomScannerDefault(clamped / 100);
    this.debouncedToast('zoom-def', `Zoom inicial del escáner: ${clamped}%`);
    this.cdr.markForCheck();
  }

  private debouncedToast(key: string, mensaje: string, ms = 700): void {
    const prev = this.toastDebounceTimers.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      this.toastService.success(mensaje);
      this.toastDebounceTimers.delete(key);
    }, ms);
    this.toastDebounceTimers.set(key, t);
  }
}
