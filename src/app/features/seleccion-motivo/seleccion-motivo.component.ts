// ╔══════════════════════════════════════════════════════╗
// ║  seleccion-motivo.component.ts                       ║
// ║  Stenbrary v3.2 — Two-Step + Toggle + Guest          ║
// ║                                                      ║
// ║  CAMBIOS v3.2:                                       ║
// ║  - Toggle: clic en mismo motivo = deseleccionar      ║
// ║  - Soporte para invitados (esInvitado flag)          ║
// ║  - "Matrícula incorrecta" siempre visible            ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Motivo, Registro } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { SoundService } from '../../core/services/sound.service';
import { ConfigService } from '../../core/services/config.service';
import { AforoService } from '../../core/services/aforo.service';
import { CelebrationComponent } from '../../shared/components/celebration/celebration.component';
import { SuccessAnimationComponent } from '../../shared/components/success-animation/success-animation.component';
import { logError } from '../../core/utils/logger';
import { LectorRafagaService } from '../../core/services/lector-rafaga.service';
import { ABANDONO_MOTIVO_MS, CLAVE_LECTURA_PENDIENTE } from '../../core/utils/flujo-puerta.utils';

@Component({
    selector: 'app-seleccion-motivo',
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatRippleModule,
        MatTooltipModule,
        CelebrationComponent,
        SuccessAnimationComponent,
    ],
    templateUrl: './seleccion-motivo.component.html',
    styleUrl: './seleccion-motivo.component.scss'
})
export class SeleccionMotivoComponent implements OnInit, OnDestroy {
  alumno: Alumno | null = null;
  motivos: Motivo[] = [];

  /** Motivos seleccionados (multi-select) */
  motivosSeleccionados: Motivo[] = [];

  /** True si la selección proviene de preseleccionarMotivosRecientes (última visita del alumno). */
  motivosPreseleccionados = false;

  /** Si el usuario es un invitado (sin matrícula) */
  esInvitado = false;

  cargandoMotivos = true;
  registrando = false;
  registroExitoso = false;
  error: string | null = null;

  // Strings precomputadas — el template las consume directo y no invoca
  // funciones en cada CD tick. Se actualizan en `precomputarNombres()`
  // cuando se carga `alumno` o cambia `esInvitado`.
  nombreCortoStr = '';
  nombreCompletoStr = '';

  /** Controla la visibilidad de la animación de celebración aleatoria. */
  mostrarCelebracion = false;

  /** Timer de redirección al scanner tras éxito. Se cancela si el usuario
   *  toca la pantalla para saltar manualmente. */
  private exitoTimer: ReturnType<typeof setTimeout> | null = null;

  /** Duración (ms) que dura la pantalla de éxito. Configurable. */
  tiempoExitoMs = 5000;

  private readonly lector = inject(LectorRafagaService);
  private dejarDeVigilar: (() => void) | null = null;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private toastService: ToastService,
    private soundService: SoundService,
    private loadingService: LoadingService,
    private configService: ConfigService,
    private aforoService: AforoService,
  ) {}

  // ═══════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════

  async ngOnInit(): Promise<void> {
    const alumnoData = sessionStorage.getItem('alumnoActual');

    if (!alumnoData) {
      this.toastService.error('No hay datos de alumno. Vuelve a escanear.');
      this.router.navigate(['/scanner']);
      return;
    }

    const parsed = JSON.parse(alumnoData);
    this.alumno = parsed;
    this.esInvitado = parsed.esInvitado === true;
    this.precomputarNombres();

    // v3.54.0: pantalla abandonada o credencial del siguiente alumno.
    this.dejarDeVigilar = this.lector.vigilarFlujo({
      abandonoMs: ABANDONO_MOTIVO_MS,
      matricula: () => this.alumno?.matricula ?? null,
      terminado: () => this.registroExitoso,
      ocupado: () => this.registrando && !this.registroExitoso,
      abandonar: (motivo, leida) => this.abandonarFlujo(motivo, leida),
      avisar: texto => this.toastService.info(texto),
    });

    await this.cargarMotivos();
  }

  // ═══════════════════════════════════════════════
  // CARGA DE MOTIVOS
  // ═══════════════════════════════════════════════


  async cargarMotivos(): Promise<void> {
    try {
      this.cargandoMotivos = true;
      this.error = null;
      this.motivos = await this.databaseService.obtenerMotivosActivos();
      this.cargandoMotivos = false;

      if (this.motivos.length === 0) {
        this.toastService.warning('No hay actividades disponibles. Contacta al administrador.');
      } else {
        await this.preseleccionarMotivosRecientes();
      }
    } catch (error) {
      logError('❌ Error al cargar motivos:', error);
      this.error = 'Error al cargar las actividades';
      this.cargandoMotivos = false;
      this.toastService.error('Error al cargar las actividades');
    }
  }

  /**
   * Preselecciona las actividades del último registro del alumno
   * (dentro de los últimos 30 días) para ahorrar clics a alumnos habituales.
   * Los invitados no se benefician porque no tienen historial asociable.
   */
  private async preseleccionarMotivosRecientes(): Promise<void> {
    if (!this.alumno || this.esInvitado || this.alumno.matricula === 'INVITADO') return;

    try {
      const historicos = await this.databaseService.obtenerRegistrosPorAlumno(this.alumno.matricula);
      if (!historicos.length) return;

      const LIMITE_DIAS = 30;
      const limiteMs = LIMITE_DIAS * 24 * 60 * 60 * 1000;
      const ahora = Date.now();

      const ordenados = historicos
        .filter(r => ahora - new Date(r.fechaHora).getTime() <= limiteMs)
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());

      const ultimo = ordenados[0];
      if (!ultimo) return;

      const idsPrevios = ultimo.motivoIds?.length ? ultimo.motivoIds : [ultimo.motivoId];
      const motivosVigentes = this.motivos.filter(m => m.id && idsPrevios.includes(m.id));

      if (motivosVigentes.length > 0) {
        this.motivosSeleccionados = motivosVigentes;
        this.motivosPreseleccionados = true;
      }
    } catch (e) {
      console.warn('No se pudo preseleccionar motivos recientes:', e);
    }
  }

  // ═══════════════════════════════════════════════
  // SELECCIÓN (paso 1 — toggle behavior)
  // ═══════════════════════════════════════════════

  /** Toggle: añade o quita un motivo de la selección. */
  seleccionarMotivo(motivo: Motivo): void {
    if (this.registrando) return;
    const idx = this.motivosSeleccionados.findIndex(m => m.id === motivo.id);
    if (idx >= 0) {
      this.motivosSeleccionados = this.motivosSeleccionados.filter((_, i) => i !== idx);
    } else {
      this.motivosSeleccionados = [...this.motivosSeleccionados, motivo];
    }
    this.motivosPreseleccionados = false;
  }

  estaSeleccionado(motivo: Motivo): boolean {
    return this.motivosSeleccionados.some(m => m.id === motivo.id);
  }

  deseleccionarMotivo(): void {
    if (this.registrando) return;
    this.motivosSeleccionados = [];
    this.motivosPreseleccionados = false;
  }

  get haySeleccion(): boolean {
    return this.motivosSeleccionados.length > 0;
  }

  /** Selección en el orden de las tarjetas, solo para mostrarla. El
   *  registro conserva el orden en que se tocaron (el primero es el
   *  motivo principal). */
  get seleccionEnOrden(): Motivo[] {
    const pos = (m: Motivo) => this.motivos.findIndex(x => x.id === m.id);
    return [...this.motivosSeleccionados].sort((a, b) => pos(a) - pos(b));
  }

  get resumenMotivos(): string {
    return this.motivosSeleccionados.map(m => m.nombre).join(', ');
  }

  // ═══════════════════════════════════════════════
  // CONFIRMACIÓN (paso 2 — ejecuta el registro)
  // ═══════════════════════════════════════════════

  async confirmarRegistro(): Promise<void> {
    if (!this.alumno || !this.haySeleccion || this.registrando) return;

    try {
      this.registrando = true;

      // Sin apellido materno (opcional desde v3.54.0) quedaba un espacio al
      // final del nombre guardado en la visita.
      const nombreCompleto = this.nombreCompletoStr || 'Visitante';

      const primero = this.motivosSeleccionados[0];

      const nuevoRegistro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'> = {
        alumnoId: this.alumno.id!,
        matricula: this.alumno.matricula,
        nombreCompleto,
        carrera: this.alumno.carrera,
        motivoId: primero.id || '',
        motivoNombre: primero.nombre,
        motivoIds: this.motivosSeleccionados.map(m => m.id || ''),
        motivoNombres: this.motivosSeleccionados.map(m => m.nombre),
        // v3.16.0 — copiar turno del alumno para analítica directa
        ...(this.alumno.turno && !this.esInvitado ? { turno: this.alumno.turno } : {}),
      };

      const registroCreado = await this.databaseService.crearRegistro(nuevoRegistro);

      const displayName = this.esInvitado
        ? (this.alumno.nombre !== 'Visitante' ? this.alumno.nombre : 'Visitante')
        : this.alumno.nombre;
      console.log('🎉 Registro completado:', displayName, '-', this.resumenMotivos);

      // En modo quiosco no mostramos "Deshacer" — el toast queda visible
      // mientras el siguiente alumno se forma; un botón Deshacer expuesto ahí
      // sería un vector de borrado accidental o malintencionado.
      const mostrarUndo = !this.configService.modoQuioscoSignal();

      this.toastService.success(
        `¡Registro exitoso! ${displayName} — ${this.resumenMotivos}`,
        mostrarUndo
          ? {
              duration: 30000,
              action: {
                label: 'Deshacer',
                icon: 'undo',
                handler: () => this.deshacerRegistro(registroCreado.id, displayName),
              },
            }
          : undefined,
      );

      // Háptico generic-removed: el SuccessAnimationComponent ahora dispara
      // su propio patrón de vibración específico al tema elegido (libro,
      // trofeo, fiesta, etc.), así cada animación se siente distinta también
      // en táctil.
      this.soundService.beepExito();

      this.registroExitoso = true;
      sessionStorage.removeItem('alumnoActual');

      // Animación celebratoria con baja probabilidad (configurable)
      const debeCelebrar = this.configService.celebracionActiva
        && Math.random() < this.configService.celebracionProbabilidad;

      if (debeCelebrar) {
        this.mostrarCelebracion = true;
      }

      // Tiempo configurable desde /configuracion (default 5000ms).
      // El usuario puede tocar la pantalla para saltar antes.
      this.tiempoExitoMs = this.configService.tiempoExitoMs;
      this.exitoTimer = setTimeout(
        () => this.router.navigate(['/scanner']),
        this.tiempoExitoMs,
      );

    } catch (error) {
      console.error('❌ Error al crear registro:', error);
      this.registrando = false;
      this.toastService.error('Error al guardar el registro. Intenta de nuevo.');
    }
  }

  private async deshacerRegistro(registroId: string, displayName: string): Promise<void> {
    try {
      await this.databaseService.eliminarRegistro(registroId);
      if (this.configService.aforoActivo) {
        await this.aforoService.refrescar();
      }
      this.toastService.info(`Registro de ${displayName} deshecho`);
    } catch {
      this.toastService.error('No se pudo deshacer el registro');
    }
  }

  // ═══════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════

  volverAEscanear(): void {
    sessionStorage.removeItem('alumnoActual');
    this.toastService.info('Vuelve a escanear tu credencial');
    this.router.navigate(['/scanner']);
  }

  cancelar(): void {
    sessionStorage.removeItem('alumnoActual');
    this.toastService.info('Registro cancelado');
    this.router.navigate(['/scanner']);
  }

  /** Tap/click sobre la pantalla de éxito → saltar inmediatamente al scanner
   *  cancelando el timer de redirección. Solo activo cuando ya hubo registro. */
  saltarExito(): void {
    if (!this.registroExitoso) return;
    if (this.exitoTimer) {
      clearTimeout(this.exitoTimer);
      this.exitoTimer = null;
    }
    this.router.navigate(['/scanner']);
  }

  /**
   * Sale al escáner sin registrar (v3.54.0). Por inactividad, o porque llegó
   * la credencial de otro alumno: esa se procesa al llegar al escáner.
   */
  private abandonarFlujo(motivo: 'inactividad' | 'nueva-lectura', leida?: string): void {
    if (this.exitoTimer) {
      clearTimeout(this.exitoTimer);
      this.exitoTimer = null;
    }
    if (!this.registroExitoso) {
      sessionStorage.removeItem('alumnoActual');
      if (motivo === 'inactividad') this.toastService.info('Registro cancelado por inactividad');
    }
    if (leida) sessionStorage.setItem(CLAVE_LECTURA_PENDIENTE, leida);
    this.router.navigate(['/scanner']);
  }

  ngOnDestroy(): void {
    this.dejarDeVigilar?.();
    // Salir por el menú dejaba al alumno en sesión: la pantalla se podía
    // reabrir por URL con sus datos. (Recargar no destruye: sí sobrevive.)
    sessionStorage.removeItem('alumnoActual');
    if (this.exitoTimer) {
      clearTimeout(this.exitoTimer);
      this.exitoTimer = null;
    }
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  /**
   * Calcula `nombreCortoStr` y `nombreCompletoStr` una sola vez. Llamar
   * después de asignar `this.alumno` y `this.esInvitado` en ngOnInit.
   * El template lee las propiedades directo (no invoca funciones).
   */
  private precomputarNombres(): void {
    const a = this.alumno;
    if (!a) {
      this.nombreCortoStr = '';
      this.nombreCompletoStr = '';
      return;
    }
    const completo = [a.nombre, a.apellidoPaterno, a.apellidoMaterno]
      .map(p => (p ?? '').trim()).filter(Boolean).join(' ');
    if (this.esInvitado) {
      this.nombreCortoStr = a.nombre === 'Visitante' ? 'Visitante' : a.nombre;
      this.nombreCompletoStr = completo || 'Visitante';
    } else {
      this.nombreCortoStr = `${a.nombre} ${a.apellidoPaterno}`;
      this.nombreCompletoStr = completo;
    }
  }
}