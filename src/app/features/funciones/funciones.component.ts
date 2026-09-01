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

import { Component, computed, inject, signal } from '@angular/core';
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

  protected alternarPresentacion(): void {
    this.modoPresentacion.update(v => !v);
    // Los filtros no aplican en presentación; limpiarlos evita volver del
    // modo con un estado que el usuario no recuerda haber puesto.
    if (this.modoPresentacion()) this.limpiarBusqueda();
  }

  protected abrir(f: Funcion): void {
    if (!f.ruta) return;
    void this.router.navigate([f.ruta]);
  }

  protected contarEnArea(area: AreaFuncion): number {
    return FUNCIONES.filter(f => f.area === area).length;
  }
}
