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
// ║  - "Modo presentación" — recorrido a pantalla         ║
// ║    completa, una función por diapositiva, con         ║
// ║    portada y cierre;                                  ║
// ║  - listado completo con buscador, para que el         ║
// ║    personal nuevo consulte qué existe y dónde está.   ║
// ║                                                      ║
// ║  CAMBIOS v3.40.0:                                     ║
// ║  - Pantalla completa de verdad (Fullscreen API): el   ║
// ║    shell de la aplicación deja de verse detrás.       ║
// ║  - Transición entre diapositivas con View Transitions ║
// ║    API, con degradado a animación CSS donde no está.  ║
// ║  - Portada y cierre; avance automático opcional;      ║
// ║    gesto de deslizar en táctil.                       ║
// ╚══════════════════════════════════════════════════════╝

import {
  ApplicationRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import { FuncionIlustracionComponent } from './ilustracion/ilustracion.component';

/**
 * Quita acentos y pasa a minúsculas: buscar "estadisticas" debe encontrar
 * "Estadísticas". Nadie escribe tildes en un buscador.
 *
 * El rango va escrito con escapes (`̀-ͯ`) y no con los caracteres
 * combinantes literales: escritos literales son invisibles en el editor y
 * cualquier herramienta que normalice el archivo a NFC los fusiona con el
 * carácter anterior, dejando el buscador roto sin que el diff lo delate.
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Una diapositiva del recorrido. La portada y el cierre no son funciones. */
type Diapositiva =
  | { tipo: 'portada' }
  | { tipo: 'funcion'; funcion: Funcion }
  | { tipo: 'cierre' };

/** Milisegundos por diapositiva cuando el avance automático está activo. */
const MS_POR_DIAPOSITIVA = 7000;

/** Píxeles de arrastre horizontal a partir de los cuales cuenta como gesto. */
const UMBRAL_GESTO_PX = 48;

@Component({
  selector: 'app-funciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, FuncionIlustracionComponent],
  templateUrl: './funciones.component.html',
  styleUrl: './funciones.component.scss',
})
export class FuncionesComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly appRef = inject(ApplicationRef);

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

  // ═══════════════════════════════════════════════════════
  // RECORRIDO GUIADO
  // ═══════════════════════════════════════════════════════
  // Portada y cierre no son adorno: una presentación que abre en la función
  // número uno obliga a quien la enseña a explicar de qué va antes de
  // empezar, y una que termina de golpe deja la sala en silencio.

  protected readonly diapositivas: Diapositiva[] = [
    { tipo: 'portada' },
    ...this.destacadas.map(funcion => ({ tipo: 'funcion' as const, funcion })),
    { tipo: 'cierre' },
  ];

  protected readonly slide = signal(0);
  protected readonly totalSlides = this.diapositivas.length;

  protected readonly actual = computed(() => this.diapositivas[this.slide()]);
  protected readonly enPrimera = computed(() => this.slide() === 0);
  protected readonly enUltima = computed(() => this.slide() === this.totalSlides - 1);

  /** Función de la diapositiva actual, o `null` en portada y cierre. */
  protected readonly funcionActual = computed<Funcion | null>(() => {
    const d = this.actual();
    return d.tipo === 'funcion' ? d.funcion : null;
  });

  /** Posición entre las funciones, ignorando portada y cierre. */
  protected readonly numeroFuncion = computed(() => {
    const d = this.actual();
    return d.tipo === 'funcion' ? this.destacadas.indexOf(d.funcion) + 1 : 0;
  });

  protected readonly avance = computed(
    () => (this.slide() / (this.totalSlides - 1)) * 100,
  );

  /** Dirección, para que la diapositiva entre por el lado del que viene. */
  protected readonly retrocediendo = signal(false);
  protected readonly animarSlide = signal(true);
  protected readonly pantallaCompleta = signal(false);
  protected readonly reproduciendo = signal(false);

  private temporizador?: ReturnType<typeof setInterval>;
  private gestoX = 0;
  private gestoY = 0;

  /**
   * Aplica el cambio de diapositiva.
   *
   * Con View Transitions API el navegador captura el estado anterior y el
   * nuevo y los interpola: se puede animar la SALIDA de la diapositiva, que
   * es justo lo que no se podía hacer antes — el contenido cambiaba de golpe
   * y solo entraba el nuevo, así que se leía como "cambió el texto" y no como
   * "avancé". Donde la API no existe, cae en la animación CSS de entrada.
   *
   * El `tick()` es obligatorio: Angular renderiza de forma asíncrona y la
   * devolución de llamada de `startViewTransition` tiene que dejar el DOM ya
   * actualizado antes de retornar.
   */
  private mover(delta: number): void {
    const destino = this.slide() + delta;
    if (destino < 0 || destino >= this.totalSlides) return;
    this.irA(destino, delta < 0);
  }

  private irA(destino: number, atras: boolean): void {
    this.retrocediendo.set(atras);
    document.documentElement.dataset['recorrido'] = atras ? 'atras' : 'adelante';

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (!doc.startViewTransition || this.prefiereMenosMovimiento()) {
      this.slide.set(destino);
      this.reiniciarAnimacionRespaldo();
      return;
    }

    // Con View Transitions la animación la hace el navegador sobre las
    // instantáneas, así que la clase de respaldo tiene que quedarse APAGADA.
    //
    // Tenerla encendida es lo que hacía parpadear el texto: se animaba la
    // instantánea Y el elemento real por debajo, y además quitar y reponer
    // `.anim` dejaba un fotograma con el contenido a opacidad plena antes de
    // saltar a 0 para volver a entrar. Dos animaciones y un destello.
    //
    // El orden importa: la instantánea del estado anterior se toma de forma
    // síncrona al llamar a `startViewTransition`, y Angular todavía no ha
    // volcado este `set(false)`; se aplica dentro del `tick()`, que es
    // exactamente donde hace falta.
    this.animarSlide.set(false);

    doc.startViewTransition(() => {
      this.slide.set(destino);
      this.appRef.tick();
    });
  }

  /** CSS solo dispara una animación al añadir la clase: hay que quitarla y
   *  reponerla en el siguiente fotograma. Solo se usa sin View Transitions. */
  private reiniciarAnimacionRespaldo(): void {
    this.animarSlide.set(false);
    requestAnimationFrame(() => this.animarSlide.set(true));
  }

  private prefiereMenosMovimiento(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  protected siguienteSlide(): void { this.mover(1); }
  protected anteriorSlide(): void { this.mover(-1); }

  protected irASlide(i: number): void { this.mover(i - this.slide()); }

  /** Cualquier navegación manual cancela el avance automático: si el usuario
   *  tomó el control, el temporizador solo estorba. */
  protected navegar(delta: number): void {
    this.detenerAuto();
    this.mover(delta);
  }

  protected saltarA(i: number): void {
    this.detenerAuto();
    this.vistaGeneral.set(false);
    this.irASlide(i);
  }

  // ─── Vista general ─────────────────────────────────────
  // Lo que separa pasar diapositivas de presentar: poder ver el mazo entero y
  // saltar a la que te están preguntando. Con 17 diapositivas, buscar la del
  // aforo pasando una a una delante de alguien es exactamente lo que hace que
  // una presentación se sienta improvisada.

  protected readonly vistaGeneral = signal(false);

  protected alternarVistaGeneral(): void {
    this.vistaGeneral.update(v => !v);
    if (this.vistaGeneral()) this.detenerAuto();
  }

  // ─── Avance automático ─────────────────────────────────
  // Para dejar el recorrido puesto en una pantalla durante una jornada de
  // puertas abiertas, sin que nadie tenga que atenderlo.

  protected alternarAuto(): void {
    if (this.reproduciendo()) { this.detenerAuto(); return; }

    this.reproduciendo.set(true);
    this.temporizador = setInterval(() => {
      if (this.enUltima()) this.irASlide(0);
      else this.siguienteSlide();
    }, MS_POR_DIAPOSITIVA);
  }

  private detenerAuto(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = undefined;
    this.reproduciendo.set(false);
  }

  // ─── Gesto táctil ──────────────────────────────────────
  // Se enseña desde una tablet tanto como desde una laptop, y en una tablet
  // nadie busca la flecha: desliza.

  protected iniciarGesto(e: PointerEvent): void {
    this.gestoX = e.clientX;
    this.gestoY = e.clientY;
  }

  protected terminarGesto(e: PointerEvent): void {
    const dx = e.clientX - this.gestoX;
    const dy = e.clientY - this.gestoY;
    // Un arrastre más vertical que horizontal es un scroll, no un cambio de
    // diapositiva.
    if (Math.abs(dx) < UMBRAL_GESTO_PX || Math.abs(dy) > Math.abs(dx)) return;
    this.navegar(dx < 0 ? 1 : -1);
  }

  /**
   * Teclado.
   *
   * Quien presenta necesita avanzar sin apuntar con el ratón — y los mandos
   * de presentación envían exactamente estas teclas.
   */
  @HostListener('window:keydown', ['$event'])
  protected onTecla(e: KeyboardEvent): void {
    if (!this.modoPresentacion()) return;
    const objetivo = e.target as HTMLElement | null;
    if (objetivo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(objetivo.tagName)) return;

    // Teclear un número salta a esa función. Es la forma más rápida de
    // responder a "¿y lo del aforo?" sin recorrer el mazo delante de nadie.
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      this.acumularDigito(e.key);
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        this.navegar(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        this.navegar(-1);
        break;
      case 'Home':
        e.preventDefault();
        this.saltarA(0);
        break;
      case 'End':
        e.preventDefault();
        this.saltarA(this.totalSlides - 1);
        break;
      case 'g':
      case 'G':
        e.preventDefault();
        this.alternarVistaGeneral();
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        this.alternarAuto();
        break;
      case 'Escape':
        // Dentro de la vista general, Escape cierra la vista y no la
        // presentación: salirse del todo por querer volver a la diapositiva
        // sería el peor momento posible para hacerlo.
        if (this.vistaGeneral()) this.vistaGeneral.set(false);
        else this.alternarPresentacion();
        break;
    }
  }

  /**
   * Marcado de diapositiva por número.
   *
   * Se acumulan dígitos durante medio segundo para poder teclear "12"; si no
   * llega otro, se salta con lo que haya. Sin la ventana, un mazo de más de
   * nueve diapositivas sería inalcanzable de la décima en adelante.
   */
  private digitos = '';
  private saltoPendiente?: ReturnType<typeof setTimeout>;

  private acumularDigito(d: string): void {
    this.digitos += d;
    this.marcado.set(this.digitos);
    if (this.saltoPendiente) clearTimeout(this.saltoPendiente);

    this.saltoPendiente = setTimeout(() => {
      const n = parseInt(this.digitos, 10);
      this.digitos = '';
      this.marcado.set('');
      // El usuario marca el número de FUNCIÓN que ve al pie, no el índice
      // interno: la portada ocupa la posición 0, así que hay que desplazar.
      if (n >= 1 && n <= this.destacadas.length) this.saltarA(n);
    }, 550);
  }

  /** Dígitos marcados aún sin confirmar, para dar realimentación en pantalla. */
  protected readonly marcado = signal('');

  /**
   * Salir de pantalla completa (con Escape, o desde el propio navegador)
   * tiene que salir también del recorrido.
   *
   * En pantalla completa el navegador se queda con la tecla Escape y nuestro
   * `keydown` no llega a dispararse, así que sin esto la aplicación quedaría
   * con el recorrido abierto y sin pantalla completa: un estado que el
   * usuario no pidió y del que no se ve cómo salir.
   */
  @HostListener('document:fullscreenchange')
  protected onCambioPantallaCompleta(): void {
    const activa = document.fullscreenElement === this.host.nativeElement;
    this.pantallaCompleta.set(activa);
    // Al navegar a una función, este componente se va a destruir de todas
    // formas: completar aquí la salida solo serviría para pintar el catálogo
    // durante los fotogramas que quedan.
    if (this.navegandoAUnaFuncion) return;
    if (!activa && this.modoPresentacion()) this.completarSalida();
  }

  protected alternarPresentacion(): void {
    if (this.modoPresentacion()) { this.salirPresentacion(); return; }

    this.modoPresentacion.set(true);
    // Los filtros no aplican en presentación; limpiarlos evita volver del
    // modo con un estado que el usuario no recuerda haber puesto.
    this.limpiarBusqueda();
    this.slide.set(0);
    void this.pedirPantallaCompleta();
    void this.pedirBloqueoPantalla();
  }

  /**
   * Salir del recorrido, en dos tiempos.
   *
   * Primero se suelta la pantalla completa y solo DESPUÉS se apaga el modo.
   * Al revés —que es como estaba— el catálogo se renderiza dentro de un
   * elemento que todavía está proyectado: aparece a pantalla completa un
   * instante y luego encoge de golpe al marco de la aplicación. Se lee como
   * un parpadeo, no como una transición.
   *
   * El segundo tiempo lo dispara `onCambioPantallaCompleta`, que además es
   * quien recoge las salidas que no pasan por aquí: Escape, o el propio
   * navegador saliendo de pantalla completa por su cuenta.
   */
  private salirPresentacion(): void {
    if (document.fullscreenElement === this.host.nativeElement) {
      void document.exitFullscreen().catch(() => this.completarSalida());
      return;
    }
    this.completarSalida();
  }

  private completarSalida(): void {
    this.detenerAuto();
    this.soltarBloqueoPantalla();
    this.vistaGeneral.set(false);
    this.modoPresentacion.set(false);
    delete document.documentElement.dataset['recorrido'];
  }

  // ─── Bloqueo de pantalla ───────────────────────────────
  // Una diapositiva puede estar quince minutos en pantalla mientras alguien
  // habla, y el ahorro de energía del sistema no distingue eso de un equipo
  // abandonado: apaga la pantalla a mitad de la explicación. Peor aún con el
  // avance automático en una jornada de puertas abiertas.

  private bloqueoPantalla?: { release: () => Promise<void> };

  private async pedirBloqueoPantalla(): Promise<void> {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (tipo: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    try {
      this.bloqueoPantalla = await nav.wakeLock?.request('screen');
    } catch {
      // Sin soporte (Safari antiguo, Firefox), o denegado por batería baja.
      // Es una comodidad, no un requisito: el recorrido funciona igual.
      this.bloqueoPantalla = undefined;
    }
  }

  private soltarBloqueoPantalla(): void {
    void this.bloqueoPantalla?.release().catch(() => {
      /* Si el bloqueo ya lo soltó el sistema, no hay nada que hacer. */
    });
    this.bloqueoPantalla = undefined;
  }

  /**
   * El sistema suelta el bloqueo al ocultarse la pestaña y NO lo devuelve al
   * volver. Sin esto, cambiar a otra ventana un momento a mitad de una
   * presentación dejaría la pantalla apagándose el resto de la sesión.
   */
  @HostListener('document:visibilitychange')
  protected onVisibilidad(): void {
    if (document.visibilityState === 'visible' && this.modoPresentacion()) {
      void this.pedirBloqueoPantalla();
    }
  }

  /**
   * Pantalla completa sobre el propio componente.
   *
   * Poner en pantalla completa el elemento anfitrión —y no el documento— es
   * lo que hace que la barra lateral, la superior y la de abajo desaparezcan:
   * quedan fuera del elemento proyectado. Antes el "modo presentación" seguía
   * enseñando el armazón de la aplicación alrededor de la diapositiva.
   *
   * Puede fallar (permisos, un iframe sin `allowfullscreen`, Safari en iOS).
   * No es motivo para abortar: el recorrido funciona igual dentro del marco.
   */
  private async pedirPantallaCompleta(): Promise<void> {
    try {
      await this.host.nativeElement.requestFullscreen?.();
      this.pantallaCompleta.set(true);
    } catch {
      this.pantallaCompleta.set(false);
    }
  }

  /**
   * Marca que la salida del recorrido es para irse a otra ruta.
   *
   * Sin esto, apagar el modo presentación antes de navegar hace que Angular
   * renderice el catálogo entero —cabecera y 36 tarjetas— durante los ~6
   * fotogramas que el router tarda en cambiar de página. Se ve como un
   * destello de texto justo antes de que aparezca la pantalla destino.
   */
  private navegandoAUnaFuncion = false;

  protected abrir(f: Funcion | null): void {
    if (!f?.ruta) return;

    if (this.modoPresentacion()) {
      // Se sueltan los recursos, pero el modo se queda encendido: la
      // diapositiva sigue en pantalla hasta que el router la sustituye, y
      // este componente se destruye acto seguido (ngOnDestroy remata).
      this.navegandoAUnaFuncion = true;
      this.detenerAuto();
      this.soltarBloqueoPantalla();
    }

    void this.router.navigate([f.ruta]).then(ok => {
      // Si un guard bloqueó la navegación seguimos aquí, y dejar al usuario
      // en un recorrido del que ya se soltaron los recursos sería peor que
      // el destello. Se sale de verdad.
      if (!ok && this.modoPresentacion()) {
        this.navegandoAUnaFuncion = false;
        this.salirPresentacion();
      }
    });
  }

  /** La función de una diapositiva, o `null` si es portada o cierre. */
  protected funcionDe(d: Diapositiva): Funcion | null {
    return d.tipo === 'funcion' ? d.funcion : null;
  }

  protected tituloDe(d: Diapositiva): string {
    if (d.tipo === 'portada') return 'Portada';
    if (d.tipo === 'cierre') return 'Cierre';
    return d.funcion.titulo;
  }

  protected contarEnArea(area: AreaFuncion): number {
    return FUNCIONES.filter(f => f.area === area).length;
  }

  ngOnDestroy(): void {
    this.detenerAuto();
    this.soltarBloqueoPantalla();
    if (this.saltoPendiente) clearTimeout(this.saltoPendiente);
    delete document.documentElement.dataset['recorrido'];
    // Aquí el elemento todavía está en el documento, así que esta es la
    // última oportunidad de soltar la pantalla completa de forma ordenada.
    if (document.fullscreenElement === this.host.nativeElement) {
      void document.exitFullscreen().catch(() => {
        /* Salir de pantalla completa es cortesía, no requisito. */
      });
    }
  }
}
