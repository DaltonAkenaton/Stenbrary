// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/bienvenida/                  ║
// ║        bienvenida.component.ts                       ║
// ║  Stenbrary — Asistente de configuración inicial      ║
// ║                                                      ║
// ║  Se muestra tras un restablecimiento de fábrica o en ║
// ║  una instalación nueva. Recorre los ajustes que      ║
// ║  cambian de una biblioteca a otra, uno por pantalla. ║
// ║                                                      ║
// ║  Por qué un asistente y no mandar a /configuracion:  ║
// ║  esa pantalla tiene 7 categorías y decenas de        ║
// ║  ajustes. Es excelente para AFINAR y pésima para     ║
// ║  EMPEZAR — quien nunca ha visto el sistema no sabe   ║
// ║  cuáles de esos ajustes le importan. Aquí se         ║
// ║  pregunta lo justo, en orden, con un valor razonable ║
// ║  ya puesto en cada campo.                            ║
// ║                                                      ║
// ║  Todos los pasos se pueden saltar: los defaults son  ║
// ║  utilizables, y obligar a decidir doce cosas antes   ║
// ║  de ver el sistema es la mejor forma de que lo       ║
// ║  abandonen.                                          ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnDestroy, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ConfigService } from '../../core/services/config.service';
import { SoundService } from '../../core/services/sound.service';
import { RestablecerService } from '../../core/services/restablecer.service';
import { DatosPruebaService } from '../../core/services/datos-prueba.service';
import { ToastService } from '../../core/services/toast.service';
import { PinService } from '../../core/services/pin.service';
import { DIAS_SEMANA } from '../../core/utils/horarios.utils';
import { PIN_MAX_DIGITOS, esPinValido, generarCodigoRecuperacion } from '../../core/utils/quiosco.utils';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface Paso {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

const PASOS: Paso[] = [
  { id: 'inicio',    titulo: 'Bienvenido a Stenbrary', descripcion: 'Vamos a dejar el sistema listo en unos minutos.', icono: 'waving_hand' },
  { id: 'institucion', titulo: '¿Cómo se llama tu biblioteca?', descripcion: 'Aparecerá en los reportes y en la pantalla principal.', icono: 'account_balance' },
  { id: 'salida',    titulo: '¿Registras también las salidas?', descripcion: 'Permite saber cuánta gente hay dentro y cuánto tiempo se queda.', icono: 'logout' },
  { id: 'aforo',     titulo: '¿Hay un límite de personas?', descripcion: 'El sistema avisa cuando se acerca al límite.', icono: 'groups' },
  { id: 'horario',   titulo: '¿En qué horario abre?', descripcion: 'Fuera de horario el sistema avisa antes de registrar.', icono: 'schedule' },
  { id: 'sonido',    titulo: '¿Sonido al escanear?', descripcion: 'Un beep confirma el registro sin tener que mirar la pantalla.', icono: 'volume_up' },
  { id: 'quiosco',   titulo: '¿La tablet queda sola en la entrada?', descripcion: 'El modo quiosco oculta los menús para que los alumnos solo escaneen.', icono: 'tablet_android' },
  { id: 'avisos',    titulo: 'Avisos y seguimiento', descripcion: 'Alumnos que dejan de venir, y recordatorios de respaldo.', icono: 'notifications' },
  { id: 'fin',       titulo: 'Todo listo', descripcion: 'Puedes cambiar cualquiera de estos ajustes cuando quieras.', icono: 'check_circle' },
];

/** Un día del horario, editable de forma independiente. */
interface DiaHorario {
  abierto: boolean;
  apertura: string;
  cierre: string;
}

@Component({
    selector: 'app-bienvenida',
    imports: [FormsModule, MatIconModule, MatDialogModule],
    templateUrl: './bienvenida.component.html',
    styleUrl: './bienvenida.component.scss'
})
export class BienvenidaComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly restablecer = inject(RestablecerService);
  protected readonly config = inject(ConfigService);
  private readonly pinService = inject(PinService);
  private readonly sound = inject(SoundService);
  private readonly dialog = inject(MatDialog);
  private readonly datosPrueba = inject(DatosPruebaService);

  protected readonly pasos = PASOS;
  protected readonly indice = signal(0);
  protected readonly diasSemana = DIAS_SEMANA;

  protected readonly pasoActual = computed(() => this.pasos[this.indice()]);
  protected readonly esPrimero = computed(() => this.indice() === 0);
  protected readonly esUltimo = computed(() => this.indice() === this.pasos.length - 1);
  protected readonly progresoPct = computed(
    () => ((this.indice() + 1) / this.pasos.length) * 100,
  );

  // ── Estado del formulario ─────────────────────────────
  // Se arranca con lo que ya haya en ConfigService: si alguien reabre el
  // asistente, ve sus valores actuales y no unos defaults que borrarían su
  // trabajo al pulsar "Siguiente".
  protected nombreInstitucion = this.config.nombreInstitucion;
  protected registroSalidaActivo = this.config.registroSalidaActivo;
  protected horasAutoSalida = this.config.horasAutoSalida;
  protected aforoMaximo = this.config.aforoMaximo;
  protected aforoModo = this.config.aforoModo;
  protected horarioActivo = this.config.horarioActivo;

  // ── Horario ───────────────────────────────────────────
  // Dos modos porque el caso real es mixto: casi siempre L-V comparten
  // horario y el sábado es distinto. Obligar a terminar el asistente e ir a
  // Configuración para ese único día es justo donde se queda sin configurar.
  protected horarioUniforme = true;
  protected apertura = '07:00';
  protected cierre = '22:00';
  protected diasAbiertos: number[] = [1, 2, 3, 4, 5];

  /** Índice 0 = domingo … 6 = sábado, igual que `Date.getDay()`. */
  protected dias: DiaHorario[] = [
    { abierto: false, apertura: '09:00', cierre: '14:00' }, // Dom
    { abierto: true,  apertura: '07:00', cierre: '22:00' }, // Lun
    { abierto: true,  apertura: '07:00', cierre: '22:00' }, // Mar
    { abierto: true,  apertura: '07:00', cierre: '22:00' }, // Mié
    { abierto: true,  apertura: '07:00', cierre: '22:00' }, // Jue
    { abierto: true,  apertura: '07:00', cierre: '22:00' }, // Vie
    { abierto: true,  apertura: '09:00', cierre: '14:00' }, // Sáb
  ];

  // ── Sonido ────────────────────────────────────────────
  protected sonidoActivo = this.sound.habilitado;
  protected volumenPct = Math.round(this.config.volumenBeep * 100);

  protected modoQuiosco = false;
  // v3.62.0: el PIN guardado es un hash; solo se sugiere el de fábrica.
  protected quioscoPin = this.config.quioscoPinDeFabrica ? '0000' : '';
  /** Se muestra junto al PIN para anotarlos juntos; se guarda con él (v3.57.0). */
  protected readonly codigoRecuperacion = generarCodigoRecuperacion();
  protected readonly PIN_MAX = PIN_MAX_DIGITOS;
  protected umbralInactividadDias = this.config.umbralInactividadDias;
  protected umbralRespaldoDias = this.config.umbralRecordatorioRespaldoDias;

  // ── Navegación ────────────────────────────────────────

  /**
   * Controla la animación de entrada.
   *
   * Una animación CSS solo se dispara al AÑADIRSE la clase. Como el contenido
   * del paso se reemplaza pero los elementos son los mismos, hay que quitarla
   * y volver a ponerla en el siguiente frame; si no, solo se animaría el
   * primer paso y el resto aparecería de golpe.
   */
  protected readonly animar = signal(true);

  /**
   * Dirección del último movimiento.
   *
   * Avanzar y retroceder usan gestos OPUESTOS, no el mismo: al avanzar la
   * hoja se levanta y se va; al retroceder, la anterior vuelve a caer desde
   * el lomo por encima. Reutilizar la misma animación en ambos sentidos
   * contradecía lo que decía el botón.
   */
  protected readonly haciaAtras = signal(false);

  /** Letras de la marca, para animarlas una a una en el arranque. */
  protected readonly letrasMarca = 'STENBRARY'.split('');

  /**
   * Iconos del fondo.
   *
   * Antes eran cuadrados abstractos: bonitos y anónimos, podían pertenecer a
   * cualquier producto. Libros a la deriva dicen de qué va esto sin una sola
   * palabra, y es lo primero que ve alguien que no conoce el sistema.
   */
  protected readonly formas = [
    'menu_book', 'auto_stories', 'local_library', 'import_contacts',
    'book', 'menu_book', 'auto_stories', 'bookmark',
    'import_contacts', 'local_library', 'book', 'auto_stories',
  ];

  /**
   * Fase de la transición tipo baraja.
   *
   * `saliendo`: la tarjeta actual retrocede en el mazo.
   * `entrando`: la nueva viene desde atrás hacia el frente.
   *
   * Se hace en dos tiempos y no con una sola animación porque el contenido
   * se sustituye a mitad: la tarjeta debe estar en su punto más alejado y
   * más translúcida justo cuando cambia, o se vería el texto mutar en pleno
   * primer plano.
   */
  protected readonly fase = signal<'reposo' | 'saliendo' | 'entrando'>('reposo');

  /**
   * Duración del levantamiento de la página. Debe coincidir con el keyframe
   * `pagina-pasa`: si el contenido cambia antes de que termine, se ve el texto
   * nuevo dentro de la página que todavía se está yendo.
   */
  private static readonly MS_SALIDA = 380;

  /** Overlay de arranque al terminar el asistente. */
  protected readonly arrancando = signal(false);

  private timers: number[] = [];

  ngOnDestroy(): void {
    this.timers.forEach(t => clearTimeout(t));
  }

  private programar(fn: () => void, ms: number): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private reanimar(): void {
    this.animar.set(false);
    requestAnimationFrame(() => this.animar.set(true));
  }

  /** Cambia de paso con el gesto de baraja. `delta` es +1 o -1. */
  private moverA(delta: number): void {
    // Solo se ignora durante el retroceso (260ms), no durante toda la
    // animación (680ms). Bloquear el paso entero se sentía como que la
    // interfaz no responde: quien pulsa dos veces seguidas perdía el segundo
    // clic sin ningún aviso. Encadenar desde 'entrando' se ve bien porque la
    // carta nueva simplemente vuelve a irse hacia atrás.
    if (this.fase() === 'saliendo') return;

    this.haciaAtras.set(delta < 0);
    this.fase.set('saliendo');

    this.programar(() => {
      this.indice.update(i => i + delta);
      this.fase.set('entrando');
      this.reanimar();
      // Volver a reposo cuando la carta ya está al frente, para no dejar
      // transformaciones activas que compliquen los estados de hover.
      this.programar(() => this.fase.set('reposo'), 520);
    }, BienvenidaComponent.MS_SALIDA);
  }

  protected siguiente(): void {
    this.guardarPasoActual();
    if (this.esUltimo()) {
      this.finalizar();
      return;
    }
    this.moverA(1);
  }

  protected atras(): void {
    if (this.esPrimero()) return;
    this.moverA(-1);
  }

  /**
   * Saltar el asistente entero.
   *
   * Pide confirmación porque el enlace está justo debajo del botón de
   * continuar: se pulsa sin querer, y el efecto es salir del asistente y
   * perder lo configurado hasta ahí. Un descuido no debería costar tanto.
   */
  protected async saltarTodo(): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titulo: '¿Saltar la configuración?',
        mensaje:
          'El sistema quedará con los valores por defecto, que ya son ' +
          'utilizables. Puedes ajustarlo todo después desde Configuración, ' +
          'o volver a abrir este asistente cuando quieras.',
        variante: 'warning',
        textoConfirmar: 'Saltar',
        textoCancelar: 'Seguir configurando',
        icono: 'skip_next',
      } as ConfirmDialogData,
    });

    if (!(await ref.afterClosed().toPromise())) return;

    // Saltar la configuración NO debe saltarse el arranque. Antes esto
    // navegaba directo al scanner y quien elegía los valores por defecto
    // nunca veía cerrarse el libro: la única señal de que la instalación
    // había terminado, y justo el momento que marca que el sistema empieza
    // a existir. Ahorrar preguntas no es motivo para quedarse sin el cierre.
    this.mensajeEntrada =
      'Listo con los valores por defecto. Puedes ajustarlo todo desde Configuración.';
    this.finalizar();
  }

  protected alternarDia(dia: number): void {
    const i = this.diasAbiertos.indexOf(dia);
    if (i >= 0) this.diasAbiertos.splice(i, 1);
    else this.diasAbiertos.push(dia);
    // Mantener sincronizados los dos modos: quien marque días en uniforme y
    // luego cambie a personalizado debe encontrarse su elección, no un reset.
    this.dias[dia].abierto = this.diasAbiertos.includes(dia);
  }

  protected esDiaAbierto(dia: number): boolean {
    return this.diasAbiertos.includes(dia);
  }

  protected alternarDiaCustom(dia: number): void {
    this.dias[dia].abierto = !this.dias[dia].abierto;
    this.diasAbiertos = this.dias
      .map((d, i) => (d.abierto ? i : -1))
      .filter(i => i >= 0);
  }

  /** Al pasar a uniforme, propaga las horas comunes a los días abiertos. */
  protected setHorarioUniforme(valor: boolean): void {
    this.horarioUniforme = valor;
    if (valor) {
      this.dias.forEach((d, i) => {
        d.abierto = this.diasAbiertos.includes(i);
        if (d.abierto) {
          d.apertura = this.apertura;
          d.cierre = this.cierre;
        }
      });
    }
  }

  /** Resumen legible del horario, para confirmar de un vistazo. */
  protected get resumenHorario(): string {
    const abiertos = this.dias
      .map((d, i) => ({ ...d, i }))
      .filter(d => d.abierto);
    if (abiertos.length === 0) return 'Ningún día marcado como abierto.';

    const franjas = new Map<string, string[]>();
    abiertos.forEach(d => {
      const clave = `${d.apertura}–${d.cierre}`;
      const lista = franjas.get(clave) ?? [];
      lista.push(this.diasSemana[d.i].slice(0, 3));
      franjas.set(clave, lista);
    });

    return [...franjas.entries()]
      .map(([horas, dias]) => `${dias.join(', ')}: ${horas}`)
      .join(' · ');
  }

  /** Reproduce el beep para que se oiga antes de decidir. */
  protected probarSonido(): void {
    this.config.setVolumenBeep(this.volumenPct / 100);
    this.sound.habilitado = true;
    this.sound.beepScan();
  }

  // ── Persistencia ──────────────────────────────────────

  /**
   * Guarda solo lo del paso visible.
   *
   * Guardar todo en cada avance sobrescribiría ajustes que el usuario aún no
   * ha visto con los valores iniciales del formulario.
   */
  private guardarPasoActual(): void {
    switch (this.pasoActual().id) {
      case 'institucion':
        this.config.setNombreInstitucion(this.nombreInstitucion.trim());
        break;

      case 'salida':
        this.config.setRegistroSalidaActivo(this.registroSalidaActivo);
        this.config.setHorasAutoSalida(this.horasAutoSalida);
        break;

      case 'aforo':
        this.config.setAforoMaximo(this.aforoMaximo);
        this.config.setAforoModo(this.aforoModo);
        break;

      case 'horario':
        this.config.setHorarioActivo(this.horarioActivo);
        if (this.horarioActivo) {
          for (let dia = 0; dia < 7; dia++) {
            // En modo uniforme se aplican las horas comunes; en personalizado,
            // las de cada día. `dias[]` es la fuente de verdad en ambos casos
            // porque `alternarDia` la mantiene sincronizada.
            const d = this.dias[dia];
            this.config.setHorarioDia(dia, {
              cerrado: !d.abierto,
              apertura: this.horarioUniforme ? this.apertura : d.apertura,
              cierre: this.horarioUniforme ? this.cierre : d.cierre,
            });
          }
        }
        break;

      case 'sonido':
        this.sound.habilitado = this.sonidoActivo;
        this.config.setVolumenBeep(this.sonidoActivo ? this.volumenPct / 100 : 0);
        break;

      case 'quiosco':
        // El PIN se guarda aunque el modo quede apagado: así ya está listo
        // el día que lo enciendan desde Configuración.
        // v3.57.0: 4–6 dígitos como en todo el sistema. Aquí se aceptaban 8 y
        // el guardado los cortaba a 6: ese PIN ya no abría el quiosco.
        if (esPinValido(this.quioscoPin)) {
          // v3.62.0: se guarda su hash (PinService encola el guardado: una
          // verificación inmediata espera a que termine).
          this.pinService.establecerPin(this.quioscoPin, this.codigoRecuperacion)
            .catch(() => this.toast.error('No se pudo guardar el PIN: ponlo en Configuración → Quiosco.'));
        }
        // El modo quiosco NO se aplica aquí, solo se recuerda la elección.
        //
        // `setModoQuiosco(true)` activa un effect en AppComponent que saca de
        // cualquier ruta que no sea del flujo operativo — así que elegir "la
        // tablet queda sola" expulsaba del asistente a media configuración.
        //
        // Aplicarlo al final tiene además otra ventaja: si alguien abandona
        // el asistente a la mitad, no se queda encerrado en modo quiosco con
        // un PIN que acaba de inventar y quizá no memorizó.
        break;

      case 'avisos':
        this.config.setUmbralInactividadDias(this.umbralInactividadDias);
        this.config.setUmbralRecordatorioRespaldoDias(this.umbralRespaldoDias);
        break;
    }
  }

  /**
   * Secuencia de arranque: fundido a negro, marca, y entrada al sistema.
   *
   * Marca el momento en que la configuración termina y el sistema empieza a
   * existir. Dura 2.6 s en total — lo bastante para que se sienta un umbral,
   * lo bastante poco para no estorbar. No se repite nunca: solo ocurre al
   * completar el asistente.
   *
   * La configuración se guarda ANTES de la animación. Si alguien cierra la
   * pestaña a media secuencia, sus ajustes ya están a salvo; lo único que se
   * pierde es el efecto.
   */
  /** Duración total del arranque. Ver `arranque-todo` en el SCSS. */
  private static readonly MS_ARRANQUE = 4400;

  private finalizar(): void {
    this.restablecer.marcarSetupCompletado();
    this.arrancando.set(true);
    this.programar(() => this.entrarAlSistema(), BienvenidaComponent.MS_ARRANQUE);
  }

  /**
   * Último paso: aplicar el modo quiosco y navegar.
   *
   * El quiosco se activa AQUÍ y no antes de la animación. `setModoQuiosco(true)`
   * dispara un effect en AppComponent que redirige al scanner de inmediato, así
   * que activarlo al empezar la secuencia se comía el arranque entero: quien
   * elegía "la tablet queda sola" nunca llegaba a verlo.
   *
   * Es la segunda vez que este effect muerde. La regla queda clara: el modo
   * quiosco es lo ÚLTIMO que se toca, cuando ya no queda nada que mostrar.
   */
  /**
   * Mensaje del toast al entrar. Se guarda en un campo y no se pasa como
   * argumento porque `saltarArranque()` también llama aquí, y tendría que
   * conocer un mensaje que no le corresponde elegir.
   */
  private mensajeEntrada = 'Todo listo. ¡A trabajar!';

  private entrarAlSistema(): void {
    this.config.setModoQuiosco(this.modoQuiosco);
    this.toast.success(this.mensajeEntrada);
    void this.router.navigate(['/scanner']);
  }

  protected readonly generandoEjemplo = signal(false);
  protected readonly progresoEjemplo = signal(0);

  /**
   * Atajo de la demo pública: valores por defecto + datos ficticios, y
   * directo a Estadísticas. Quien evalúa el sistema le dedica un par de
   * minutos; con la base vacía no vería nada de lo que hace.
   *
   * Volumen chico a propósito (~1 400 visitas, unos 4 s): suficiente para
   * llenar gráficas y mapa de calor sin hacer esperar. Los datos llevan las
   * marcas de prueba, así que la limpieza selectiva los quita igual.
   */
  protected async explorarConEjemplo(): Promise<void> {
    if (this.generandoEjemplo()) return;
    this.generandoEjemplo.set(true);
    try {
      await this.datosPrueba.generarDatos(
        { cantidadAlumnos: 300, ventanaDias: 180, registrosPorAlumnoPorMes: 2 },
        p => this.progresoEjemplo.set(
          p.fase === 'alumnos' ? 0 : Math.round((p.actual / Math.max(p.total, 1)) * 100),
        ),
      );
      this.restablecer.marcarSetupCompletado();
      this.toast.success('Datos de ejemplo listos. Los puedes borrar desde Configuración.');
      void this.router.navigate(['/estadisticas']);
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudieron generar los datos de ejemplo.');
      this.generandoEjemplo.set(false);
    }
  }

  /** Permite saltarse el arranque con un clic o una tecla. */
  protected saltarArranque(): void {
    if (!this.arrancando()) return;
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.entrarAlSistema();
  }

  /** Validación mínima del PIN, mostrada en vivo. */
  protected get pinValido(): boolean {
    return esPinValido(this.quioscoPin);
  }
}
