// ╔══════════════════════════════════════════════════════╗
// ║  categorias/experiencia.component.ts                 ║
// ║  Categoría "Experiencia" del nuevo /configuración    ║
// ║  Stenbrary v3.24.0                                    ║
// ║                                                      ║
// ║  Contiene:                                            ║
// ║   - Animación celebratoria (toggle + frecuencia)      ║
// ║   - Tiempo de pantalla de éxito (presets + custom)    ║
// ║     y preview de los 8 temas                          ║
// ║   (Alertas de inactividad pasó a Operación, v3.57.0) ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';

import { FormsModule, } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '../../../core/services/toast.service';
import { ConfigService } from '../../../core/services/config.service';
import { SuccessAnimationComponent } from '../../../shared/components/success-animation/success-animation.component';

@Component({
    selector: 'app-config-experiencia',
    imports: [
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    SuccessAnimationComponent
],
    templateUrl: './experiencia.component.html',
    styleUrls: ['../configuracion.styles.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienciaCategoriaComponent {
  configService = inject(ConfigService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);


  readonly opcionesCelebracion = [
    { valor: 0.03, etiqueta: 'Rara (3%)' },
    { valor: 0.08, etiqueta: 'Normal (8%)' },
    { valor: 0.15, etiqueta: 'Frecuente (15%)' },
    { valor: 0.30, etiqueta: 'Muy frecuente (30%)' },
  ];

  readonly opcionesTiempoExito = [
    { valor: 2000,  etiqueta: 'Rápida (2 s)' },
    { valor: 5000,  etiqueta: 'Normal (5 s)' },
    { valor: 8000,  etiqueta: 'Lenta (8 s)' },
    { valor: 12000, etiqueta: 'Quiosco (12 s)' },
  ];

  /** IDs deben coincidir con los del SuccessAnimationComponent. */
  readonly temasPreview = [
    { id: 'book',       emoji: '📚', nombre: 'Libro' },
    { id: 'thumbsup',   emoji: '👍', nombre: 'Pulgar' },
    { id: 'trophy',     emoji: '🏆', nombre: 'Trofeo' },
    { id: 'graduation', emoji: '🎓', nombre: 'Graduación' },
    { id: 'star',       emoji: '⭐', nombre: 'Estrella' },
    { id: 'party',      emoji: '🎉', nombre: 'Fiesta' },
    { id: 'check',      emoji: '✅', nombre: 'Check' },
    { id: 'cofre',      emoji: '🎁', nombre: 'Cofre' },
  ];

  mostrarPreviewAnimacion = false;
  /** Si está undefined, el componente elige aleatorio. */
  temaPreview: string | undefined = undefined;

  private toastDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  get porcentajeCelebracion(): number {
    return Math.round(this.configService.celebracionProbabilidad * 100);
  }

  get tiempoExitoSegundos(): number {
    return Math.round(this.configService.tiempoExitoMs / 1000);
  }

  // ─── Celebración ────────────────────────────────────
  celebracionMatch(valor: number): boolean {
    return Math.round(this.configService.celebracionProbabilidad * 100) === Math.round(valor * 100);
  }

  toggleCelebracion(): void {
    const nuevo = !this.configService.celebracionActiva;
    this.configService.setCelebracionActiva(nuevo);
    this.toastService.info(
      nuevo ? 'Animación celebratoria activada' : 'Animación celebratoria desactivada'
    );
    this.cdr.markForCheck();
  }

  setCelebracionPorcentaje(pct: number | string): void {
    const num = typeof pct === 'string' ? parseFloat(pct) : pct;
    if (isNaN(num)) return;
    const acotado = Math.max(0, Math.min(100, Math.round(num)));
    this.configService.setCelebracionProbabilidad(acotado / 100);
    this.debouncedToast('celebracion', `Frecuencia de animación: ${acotado}%`);
    this.cdr.markForCheck();
  }

  // ─── Tiempo de pantalla de éxito ────────────────────
  setTiempoExitoSegundos(segundos: number | string): void {
    const num = typeof segundos === 'string' ? parseFloat(segundos) : segundos;
    if (isNaN(num)) return;
    const seg = Math.max(1, Math.round(num));
    this.configService.setTiempoExitoMs(seg * 1000);
    this.debouncedToast('tiempo-exito', `Pantalla de éxito: ${seg} s`);
    this.cdr.markForCheck();
  }

  setTiempoExito(ms: number): void {
    this.configService.setTiempoExitoMs(ms);
    const etiqueta = this.opcionesTiempoExito.find(o => o.valor === ms)?.etiqueta ?? `${Math.round(ms / 1000)} s`;
    this.toastService.success(`Pantalla de éxito: ${etiqueta}`);
    this.cdr.markForCheck();
  }

  // ─── Preview de animaciones ─────────────────────────
  abrirPreviewAnimacion(temaId?: string): void {
    this.temaPreview = temaId;
    // Forzar remount para que ngOnInit del SuccessAnimation se vuelva a disparar.
    this.mostrarPreviewAnimacion = false;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.mostrarPreviewAnimacion = true;
      this.cdr.markForCheck();
    }, 30);
  }

  cerrarPreviewAnimacion(): void {
    this.mostrarPreviewAnimacion = false;
    this.temaPreview = undefined;
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
