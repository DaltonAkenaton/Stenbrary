// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/funciones/ilustracion/       ║
// ║        ilustracion.component.ts                      ║
// ║  Stenbrary — Ilustraciones del recorrido guiado      ║
// ║                                                      ║
// ║  Antes cada motivo era un <mat-icon> estirado a      ║
// ║  100-170px. Un glifo dibujado para 24px, a ese       ║
// ║  tamaño, es una silueta plana: no tiene peso ni      ║
// ║  profundidad y se lee como un placeholder. Aquí van  ║
// ║  SVG propios, de trazo, con capas y movimiento       ║
// ║  continuo — el estilo que sostiene una presentación. ║
// ║                                                      ║
// ║  Siguen sin ser capturas de pantalla, y a propósito: ║
// ║  una captura miente en cuanto se toca la interfaz.   ║
// ║  Estos motivos comunican la IDEA y no caducan.       ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { DemoVisual } from '../../../core/data/funciones.data';

@Component({
    selector: 'app-funcion-ilustracion',
    imports: [MatIconModule],
    templateUrl: './ilustracion.component.html',
    styleUrl: './ilustracion.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FuncionIlustracionComponent {
  /** Motivo a dibujar. Sin valor, cae al icono de la función. */
  @Input() demo?: DemoVisual;

  /** Icono Material de respaldo, para funciones sin motivo propio. */
  @Input() icono = 'auto_awesome';
}
