// ╔══════════════════════════════════════════════════════╗
// ║  celebration.component.ts                            ║
// ║  Stenbrary v3.9.0 — Animación celebratoria aleatoria ║
// ║                                                      ║
// ║  Overlay tipo "confetti" inspirado en la animación   ║
// ║  de entrega de tareas en Microsoft Teams. Se dispara ║
// ║  con baja probabilidad (~8%) tras un registro        ║
// ║  exitoso para añadir un toque de gamificación sin    ║
// ║  saturar al usuario.                                 ║
// ╚══════════════════════════════════════════════════════╝

import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface Particula {
  x: number;       // posición horizontal % (0-100)
  delay: number;   // ms
  duration: number; // ms
  rotation: number; // grados
  emoji: string;
  size: number;    // px
}

const EMOJIS = ['🎉', '🎊', '⭐', '✨', '📚', '🏆', '💫', '🎈', '🌟'];

const FRASES = [
  '¡Gracias por venir!',
  '¡Sigue así!',
  '¡Excelente hábito!',
  '¡Eres genial!',
  '¡Buena visita!',
  '¡Tu esfuerzo cuenta!',
];

@Component({
    selector: 'app-celebration',
    imports: [CommonModule],
    template: `
    @if (visible) {
      <div class="celebration-overlay" (click)="cerrar.emit()">
        <div class="celebration-frase">{{ fraseElegida }}</div>
        <div class="celebration-particles">
          @for (p of particulas; track $index) {
            <span
              class="particle"
              [style.left.%]="p.x"
              [style.animation-delay.ms]="p.delay"
              [style.animation-duration.ms]="p.duration"
              [style.font-size.px]="p.size"
              [style.--rot]="p.rotation + 'deg'">
              {{ p.emoji }}
            </span>
          }
        </div>
      </div>
    }
  `,
    styles: [`
    .celebration-overlay {
      position: fixed;
      inset: 0;
      pointer-events: auto;
      z-index: 9999;
      overflow: hidden;
      background: radial-gradient(ellipse at center, rgba(0, 200, 215, 0.10) 0%, transparent 60%);
      animation: fadeIn 200ms ease-out;
    }

    .celebration-frase {
      position: absolute;
      /* Movido de 38% a 12% — el centro está reservado para la animación
         de "registro exitoso" (emoji/Lottie/checkmark) y se solapaba el
         texto. Ahora aparece como banner superior, sin chocar. */
      top: 12%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.5);
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-size: clamp(1.4rem, 3.5vw, 2.2rem);
      font-weight: 800;
      color: #00C8D7;
      text-shadow: 0 0 30px rgba(0, 200, 215, 0.6);
      animation: pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      white-space: nowrap;
      letter-spacing: 0.02em;
      padding: 8px 20px;
      background: rgba(4, 9, 15, 0.55);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 200, 215, 0.25);
      border-radius: 100px;
    }

    .celebration-particles {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .particle {
      position: absolute;
      top: -50px;
      animation: fall linear forwards;
      will-change: transform, opacity;
      filter: drop-shadow(0 2px 6px rgba(0, 200, 215, 0.3));
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes pop {
      0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
      50%  { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }

    @keyframes fall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      100% {
        transform: translateY(110vh) rotate(var(--rot, 360deg));
        opacity: 0;
      }
    }
  `]
})
export class CelebrationComponent implements OnChanges {
  /** Cuando cambia a true, se dispara la animación. */
  @Input() visible = false;

  /** Número de partículas. Default 40. */
  @Input() cantidad = 40;

  @Output() cerrar = new EventEmitter<void>();

  particulas: Particula[] = [];
  fraseElegida = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.generarParticulas();
      this.fraseElegida = FRASES[Math.floor(Math.random() * FRASES.length)];
      // Auto-cerrar tras 2.5s (las partículas más lentas duran ~2.2s)
      setTimeout(() => this.cerrar.emit(), 2500);
    }
  }

  private generarParticulas(): void {
    const arr: Particula[] = [];
    for (let i = 0; i < this.cantidad; i++) {
      arr.push({
        x: Math.random() * 100,
        delay: Math.random() * 600,
        duration: 1400 + Math.random() * 800,
        rotation: (Math.random() - 0.5) * 720,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        size: 18 + Math.random() * 22,
      });
    }
    this.particulas = arr;
  }
}
