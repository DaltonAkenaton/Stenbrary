// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/funciones/                   ║
// ║        funciones.component.ts                        ║
// ║  Stenbrary — Qué puede hacer el sistema              ║
// ║                                                      ║
// ║  Reemplaza al PowerPoint: en vez de diapositivas que ║
// ║  envejecen aparte del código, el catálogo vive en el ║
// ║  repositorio y se actualiza con él.                  ║
// ║                                                      ║
// ║  Doble uso deliberado:                                ║
// ║  - "Modo presentación" (solo destacadas, tarjetas     ║
// ║    grandes) para enseñárselo a alguien;               ║
// ║  - listado completo con buscador, para que el         ║
// ║    personal nuevo consulte qué existe y dónde está.   ║
// ╚══════════════════════════════════════════════════════╝

import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import {
  FUNCIONES,
  GRUPOS_FUNCIONES,
  Funcion,
  AreaFuncion,
} from '../../core/data/funciones.data';
import { CHANGELOG } from '../../core/data/changelog.data';

/** Quita acentos y pasa a minúsculas: buscar "estadisticas" debe encontrar
 *  "Estadísticas". Nadie escribe tildes en un buscador. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

@Component({
  selector: 'app-funciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './funciones.component.html',
  styleUrl: './funciones.component.scss',
})
export class FuncionesComponent {
  private readonly router = inject(Router);

  protected readonly grupos = GRUPOS_FUNCIONES;
  protected readonly version = CHANGELOG[0]?.version ?? '';
  protected readonly totalFunciones = FUNCIONES.length;

  protected readonly busqueda = signal('');
  protected readonly areaActiva = signal<AreaFuncion | 'todas'>('todas');
  protected readonly modoPresentacion = signal(false);

  protected readonly destacadas = FUNCIONES.filter(f => f.destacada);

  protected readonly visibles = computed<Funcion[]>(() => {
    const q = normalizar(this.busqueda().trim());
    const area = this.areaActiva();

    return FUNCIONES.filter(f => {
      if (area !== 'todas' && f.area !== area) return false;
      if (!q) return true;
      return (
        normalizar(f.titulo).includes(q) ||
        normalizar(f.descripcion).includes(q) ||
        normalizar(f.donde).includes(q)
      );
    });
  });

  /** Agrupa las visibles por área, conservando el orden de GRUPOS_FUNCIONES. */
  protected readonly porGrupo = computed(() =>
    this.grupos
      .map(g => ({ grupo: g, funciones: this.visibles().filter(f => f.area === g.area) }))
      .filter(x => x.funciones.length > 0),
  );

  protected readonly sinResultados = computed(() => this.visibles().length === 0);

  protected filtrarArea(area: AreaFuncion | 'todas'): void {
    this.areaActiva.set(area);
  }

  protected limpiarBusqueda(): void {
    this.busqueda.set('');
    this.areaActiva.set('todas');
  }

  // ─── Recorrido guiado ───────────────────────────────────
  // El "modo presentación" anterior seguía siendo una rejilla de 13 tarjetas:
  // eso no es presentar, es pedirle a alguien que lea. Aquí va una función
  // por pantalla, con su ilustración animada, y se avanza como en una
  // presentación de diapositivas.
  protected readonly slide = signal(0);
  protected readonly totalSlides = this.destacadas.length;

  protected readonly funcionActual = computed(() => this.destacadas[this.slide()]);
  protected readonly enPrimera = computed(() => this.slide() === 0);
  protected readonly enUltima = computed(() => this.slide() === this.totalSlides - 1);

  /** Dirección, para que la diapositiva entre por el lado del que viene. */
  protected readonly retrocediendo = signal(false);
  protected readonly animarSlide = signal(true);

  private mover(delta: number): void {
    const destino = this.slide() + delta;
    if (destino < 0 || destino >= this.totalSlides) return;
    this.retrocediendo.set(delta < 0);
    this.slide.set(destino);
    // Reiniciar la animación: la clase ya está puesta y CSS solo dispara al
    // añadirla, así que hay que quitarla y reponerla en el siguiente frame.
    this.animarSlide.set(false);
    requestAnimationFrame(() => this.animarSlide.set(true));
  }

  protected siguienteSlide(): void { this.mover(1); }
  protected anteriorSlide(): void { this.mover(-1); }
  protected irASlide(i: number): void { this.mover(i - this.slide()); }

  /**
   * Flechas del teclado.
   *
   * Quien presenta necesita avanzar sin apuntar con el ratón — y muchos
   * mandos de presentación envían exactamente estas teclas.
   */
  @HostListener('window:keydown', ['$event'])
  protected onTecla(e: KeyboardEvent): void {
    if (!this.modoPresentacion()) return;
    const objetivo = e.target as HTMLElement | null;
    if (objetivo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(objetivo.tagName)) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); this.siguienteSlide(); }
    if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { e.preventDefault(); this.anteriorSlide(); }
    if (e.key === 'Escape') this.alternarPresentacion();
  }

  protected alternarPresentacion(): void {
    this.modoPresentacion.update(v => !v);
    // Los filtros no aplican en presentación; limpiarlos evita volver del
    // modo con un estado que el usuario no recuerda haber puesto.
    if (this.modoPresentacion()) {
      this.limpiarBusqueda();
      this.slide.set(0);
    }
  }

  protected abrir(f: Funcion): void {
    if (!f.ruta) return;
    void this.router.navigate([f.ruta]);
  }

  protected contarEnArea(area: AreaFuncion): number {
    return FUNCIONES.filter(f => f.area === area).length;
  }
}
