// ╔══════════════════════════════════════════════════════╗
// ║  success-animation.component.ts                      ║
// ║  Stenbrary v3.20 — Animación dinámica de éxito       ║
// ║                                                      ║
// ║  Sistema híbrido + multi-capa:                       ║
// ║    1. Si hay un JSON Lottie en assets/animations/    ║
// ║       lo carga vía ngx-lottie (lazy, ~85KB chunk).   ║
// ║    2. Si no, fallback "wow":                         ║
// ║       - Emoji principal gigante con animación única  ║
// ║       - 4-6 emojis satélite con efecto del tema      ║
// ║       - 8-14 partículas de fondo (lluvia/burst/etc.) ║
// ║       - Aura del color del tema                      ║
// ║       - Vibración háptica distinta por tema          ║
// ╚══════════════════════════════════════════════════════╝

import {
  Component, Input, OnInit, ChangeDetectionStrategy, signal,
} from '@angular/core';

import { LottieComponent, AnimationOptions } from 'ngx-lottie';

interface Tema {
  id: string;
  /** Emoji principal — el que se anima en grande al centro. */
  emoji: string;
  /** Emojis satélite — 4–6 que decoran alrededor del principal. */
  satellites: string[];
  /** Pool de emojis para las partículas de fondo (se randomiza). */
  particles: string[];
  /** Patrón de vibración (ms) — distinto para que se sienta el tema. */
  haptic: number[];
  /** Nombre del archivo Lottie esperado en src/assets/animations/. */
  lottieFile: string;
}

const TEMAS: Tema[] = [
  {
    id: 'book',
    emoji: '📚',
    satellites: ['📖', '📕', '📗', '📘', '📙'],
    particles: ['✨', '📖', '✨', '📚', '✨', '⭐'],
    haptic: [60, 30, 60],
    lottieFile: 'book.json',
  },
  {
    id: 'thumbsup',
    emoji: '👍',
    satellites: ['❤️', '💖', '💯', '⭐', '✨', '❤️'],
    particles: ['❤️', '💖', '💯', '✨', '⭐', '💗'],
    haptic: [40, 20, 40, 20, 80],
    lottieFile: 'thumbsup.json',
  },
  {
    id: 'trophy',
    emoji: '🏆',
    satellites: ['⭐', '✨', '🌟', '⭐', '✨', '🌟'],
    particles: ['🎊', '⭐', '✨', '🌟', '🏅', '🎉'],
    haptic: [100, 50, 100, 50, 200],
    lottieFile: 'trophy.json',
  },
  {
    id: 'graduation',
    emoji: '🎓',
    satellites: ['🎓', '📜', '🎓', '📜', '✨'],
    particles: ['🎓', '📜', '✨', '⭐', '🎓', '📜'],
    haptic: [80, 40, 80, 40, 80],
    lottieFile: 'graduation.json',
  },
  {
    id: 'star',
    emoji: '⭐',
    satellites: ['✨', '⭐', '🌟', '✨', '⭐', '🌟'],
    particles: ['✨', '⭐', '🌟', '💫', '✨', '⭐'],
    haptic: [30, 15, 30, 15, 30, 15, 60],
    lottieFile: 'star.json',
  },
  {
    id: 'party',
    emoji: '🎉',
    satellites: ['🎊', '🎈', '🥳', '🎉', '🎊', '🎈'],
    particles: ['🎊', '🎉', '🎈', '🥳', '🎊', '🎉', '🎈', '✨'],
    haptic: [50, 30, 50, 30, 50, 30, 50, 30, 100],
    lottieFile: 'party.json',
  },
  {
    id: 'check',
    emoji: '✅',
    satellites: ['💚', '✅', '💚', '✅'],
    particles: ['✨', '💚', '✅', '✨', '⭐'],
    haptic: [80, 40, 80],
    lottieFile: 'check.json',
  },
  {
    id: 'cofre',
    emoji: '🎁',
    satellites: ['💎', '🪙', '⭐', '✨', '🌟', '💰'],
    particles: ['💎', '🪙', '✨', '⭐', '💰', '🌟'],
    // Patrón de cofre: temblor (shake corto x4) → silencio → explosión final
    haptic: [25, 25, 25, 25, 25, 25, 25, 25, 200, 50, 200],
    lottieFile: 'cofre.json',
  },
];

/** Cantidad fija de partículas por animación — suficientes para sensación
 *  de abundancia sin asesinar el rendimiento en gama media. */
const PARTICLE_COUNT = 14;

@Component({
    selector: 'app-success-animation',
    imports: [LottieComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="success-anim" [class]="'theme-' + tema().id">

      <!-- Aura del color del tema (radial gradient) -->
      <span class="anim-glow" aria-hidden="true"></span>

      <!-- Flash al peak de la animación (overlay sutil) -->
      <span class="anim-flash" aria-hidden="true"></span>

      <!-- Capa de partículas: 14 emojis randomizados con animación del tema -->
      <div class="particle-layer" aria-hidden="true">
        @for (p of particulasDecoradas(); track $index) {
          <span class="particle"
                [style.--i]="$index"
                [style.--delay-extra-ms]="p.delay"
                [style.--scale]="p.scale">
            {{ p.emoji }}
          </span>
        }
      </div>

      <!-- Capa de satélites: 4–6 emojis decorativos cerca del principal -->
      <div class="satellite-layer" aria-hidden="true">
        @for (s of tema().satellites; track $index; let i = $index) {
          <span class="satellite"
                [style.--i]="i"
                [style.--total]="tema().satellites.length">
            {{ s }}
          </span>
        }
      </div>

      <!-- Emoji principal (foreground) -->
      @if (lottieDisponible()) {
        <ng-lottie [options]="lottieOptions()" class="anim-lottie"></ng-lottie>
      } @else {
        <span class="anim-emoji" [attr.aria-label]="'Éxito ' + tema().id">
          {{ tema().emoji }}
        </span>
      }
    </div>
  `,
    styleUrl: './success-animation.component.scss'
})
export class SuccessAnimationComponent implements OnInit {
  /** Forzar un tema específico para testing. */
  @Input() temaForzado?: string;

  readonly tema = signal<Tema>(TEMAS[0]);
  readonly lottieDisponible = signal(false);
  readonly lottieOptions = signal<AnimationOptions>({ path: '' });

  /** Partículas con datos randomizados (emoji, delay, escala) por instancia. */
  readonly particulasDecoradas = signal<{ emoji: string; delay: number; scale: number }[]>([]);

  async ngOnInit(): Promise<void> {
    const elegido = this.elegirTema();
    this.tema.set(elegido);
    this.particulasDecoradas.set(this.generarParticulas(elegido));

    // Vibración háptica del patrón del tema (no bloqueante).
    if ('vibrate' in navigator) {
      try { navigator.vibrate(elegido.haptic); } catch { /* silenciar */ }
    }

    // Lottie opcional: el manifest.json de la carpeta lista qué temas
    // tienen archivo bundleado. Si el tema elegido está ahí, lo usa.
    // Si no (caso default), cae a emoji sin generar ningún 404.
    const disponibles = await SuccessAnimationComponent.cargarManifest();
    if (disponibles.includes(elegido.id)) {
      const path = `assets/animations/${elegido.lottieFile}`;
      this.lottieOptions.set({ path, loop: false, autoplay: true });
      this.lottieDisponible.set(true);
    }
  }

  private elegirTema(): Tema {
    if (this.temaForzado) {
      const forzado = TEMAS.find(t => t.id === this.temaForzado);
      if (forzado) return forzado;
    }
    return TEMAS[Math.floor(Math.random() * TEMAS.length)];
  }

  private generarParticulas(tema: Tema): { emoji: string; delay: number; scale: number }[] {
    const arr: { emoji: string; delay: number; scale: number }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr.push({
        emoji: tema.particles[Math.floor(Math.random() * tema.particles.length)],
        delay: Math.floor(Math.random() * 600),
        scale: 0.7 + Math.random() * 0.7, // 0.7 – 1.4
      });
    }
    return arr;
  }

  /** Manifest.json existe siempre (con array vacío por default), así que
   *  este fetch nunca da 404. La lista cacheada vive en memoria mientras
   *  dure la sesión — recarga al refrescar página. */
  private static manifestCache: string[] | null = null;

  private static async cargarManifest(): Promise<string[]> {
    if (SuccessAnimationComponent.manifestCache !== null) {
      return SuccessAnimationComponent.manifestCache;
    }
    try {
      const res = await fetch('assets/animations/manifest.json');
      if (!res.ok) {
        SuccessAnimationComponent.manifestCache = [];
        return [];
      }
      const data = await res.json();
      const list = Array.isArray(data?.available) ? data.available : [];
      SuccessAnimationComponent.manifestCache = list;
      return list;
    } catch {
      SuccessAnimationComponent.manifestCache = [];
      return [];
    }
  }
}
