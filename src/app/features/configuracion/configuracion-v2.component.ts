// ╔══════════════════════════════════════════════════════╗
// ║  configuracion-v2.component.ts                       ║
// ║  Stenbrary v3.24.0 — Shell del nuevo /configuración  ║
// ║                                                      ║
// ║  Layout sidebar de categorías + panel de la activa.  ║
// ║  Cada categoría es un sub-componente standalone en   ║
// ║  ./categorias/.                                       ║
// ║                                                      ║
// ║  La categoría activa se persiste en localStorage y    ║
// ║  también se refleja en la URL como fragment (#datos), ║
// ║  para que el coordinador pueda hacer bookmark.        ║
// ║                                                      ║
// ║  Búsqueda: filtra qué categorías son visibles en el   ║
// ║  sidebar según keywords del manifest. NO oculta       ║
// ║  contenido del panel — eso lo hace el command palette ║
// ║  (Ctrl+K) cuando esté listo.                          ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { CATEGORIAS_CONFIG, CategoriaConfig, CategoriaConfigId } from './configuracion.types';

// Sub-componentes de categoría — las 7 ya están migradas.
import { GeneralCategoriaComponent } from './categorias/general.component';
import { EscanerCategoriaComponent } from './categorias/escaner.component';
import { OperacionCategoriaComponent } from './categorias/operacion.component';
import { QuioscoCategoriaComponent } from './categorias/quiosco.component';
import { ExperienciaCategoriaComponent } from './categorias/experiencia.component';
import { DatosCategoriaComponent } from './categorias/datos.component';
import { CalendarioCategoriaComponent } from './categorias/calendario.component';
import { CatalogosCategoriaComponent } from './categorias/catalogos.component';
import { AvanzadoCategoriaComponent } from './categorias/avanzado.component';
import { BitacoraCategoriaComponent } from './categorias/bitacora.component';

const STORAGE_KEY = 'stenbrary-config-categoria-activa';
const DEFAULT_CATEGORIA: CategoriaConfigId = 'general';

@Component({
    selector: 'app-configuracion-v2',
    imports: [
    FormsModule,
    MatIconModule,
    GeneralCategoriaComponent,
    EscanerCategoriaComponent,
    OperacionCategoriaComponent,
    QuioscoCategoriaComponent,
    ExperienciaCategoriaComponent,
    DatosCategoriaComponent,
    CalendarioCategoriaComponent,
    CatalogosCategoriaComponent,
    AvanzadoCategoriaComponent,
    BitacoraCategoriaComponent
],
    templateUrl: './configuracion-v2.component.html',
    styleUrls: ['./configuracion.styles.scss', './configuracion-v2.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfiguracionV2Component implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);


  readonly categorias = CATEGORIAS_CONFIG;

  // Todas las categorías están migradas. La constante se mantiene para que el shell
  // pueda volver a marcar alguna como "beta" si en el futuro se añade una nueva.
  readonly migradas = new Set<CategoriaConfigId>([
    'general', 'escaner', 'operacion', 'quiosco',
    'experiencia', 'calendario', 'catalogos', 'datos', 'bitacora', 'avanzado',
  ]);

  /** Callback del sub-componente Datos para refrescar conteos en otras categorías. */
  onDatosCambiaron(): void {
    // El componente General relee sus conteos en cada navegación, así que basta
    // con que el coordinador vuelva a tocar General después de importar/limpiar.
    // Si en el futuro queremos refresco automático cruzado, se puede emitir un
    // evento via ConfigService (signal) y suscribirse desde General.
  }

  readonly categoriaActiva = signal<CategoriaConfigId>(DEFAULT_CATEGORIA);
  readonly busqueda = signal<string>('');
  readonly sidebarAbierto = signal<boolean>(false);

  readonly categoriasFiltradas = computed<CategoriaConfig[]>(() => {
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return this.categorias;
    return this.categorias.filter(c =>
      c.nombre.toLowerCase().includes(q)
      || c.descripcion.toLowerCase().includes(q)
      || c.keywords.some(k => k.includes(q))
    );
  });

  readonly categoriaActual = computed<CategoriaConfig>(() => {
    return this.categorias.find(c => c.id === this.categoriaActiva())
      ?? this.categorias[0];
  });

  private sub?: Subscription;

  ngOnInit(): void {
    const fragment = this.route.snapshot.fragment as CategoriaConfigId | null;
    const guardado = (localStorage.getItem(STORAGE_KEY) ?? '') as CategoriaConfigId;
    const inicial = this.esCategoriaValida(fragment)
      ? fragment!
      : this.esCategoriaValida(guardado)
        ? guardado
        : DEFAULT_CATEGORIA;
    this.categoriaActiva.set(inicial);

    this.sub = this.route.fragment.subscribe(f => {
      if (this.esCategoriaValida(f as CategoriaConfigId | null)) {
        this.categoriaActiva.set(f as CategoriaConfigId);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  seleccionar(id: CategoriaConfigId): void {
    this.categoriaActiva.set(id);
    localStorage.setItem(STORAGE_KEY, id);
    this.sidebarAbierto.set(false);
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: id,
      replaceUrl: true,
    });
  }

  toggleSidebar(): void {
    this.sidebarAbierto.update(v => !v);
  }

  private esCategoriaValida(id: CategoriaConfigId | null): boolean {
    return !!id && this.categorias.some(c => c.id === id);
  }
}
