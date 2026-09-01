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

import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { ConfigService } from '../../core/services/config.service';
import { SoundService } from '../../core/services/sound.service';
import { RestablecerService } from '../../core/services/restablecer.service';
import { ToastService } from '../../core/services/toast.service';
import { DIAS_SEMANA } from '../../core/utils/horarios.utils';

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
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './bienvenida.component.html',
  styleUrl: './bienvenida.component.scss',
})
export class BienvenidaComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly restablecer = inject(RestablecerService);
  protected readonly config = inject(ConfigService);
  private readonly sound = inject(SoundService);

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
  protected quioscoPin = this.config.quioscoPin;
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
   * El contenido entra desde la derecha al avanzar y desde la izquierda al
   * retroceder. Es lo que convierte una sucesión de formularios en un
   * recorrido con sentido espacial: se percibe que hay un "antes" y un
   * "después", no pantallas sueltas.
   */
  protected readonly haciaAtras = signal(false);

  /** Doce formas de fondo. El array solo existe para que `@for` las repita. */
  protected readonly formas = Array.from({ length: 12 }, (_, i) => i);

  private reanimar(): void {
    this.animar.set(false);
    requestAnimationFrame(() => this.animar.set(true));
  }

  protected siguiente(): void {
    this.guardarPasoActual();
    if (this.esUltimo()) {
      this.finalizar();
      return;
    }
    this.haciaAtras.set(false);
    this.indice.update(i => i + 1);
    this.reanimar();
  }

  protected atras(): void {
    if (this.esPrimero()) return;
    this.haciaAtras.set(true);
    this.indice.update(i => i - 1);
    this.reanimar();
  }

  /** Saltar el asistente entero: los defaults ya son utilizables. */
  protected saltarTodo(): void {
    this.restablecer.marcarSetupCompletado();
    this.toast.info('Puedes configurar todo desde Configuración cuando quieras.');
    this.router.navigate(['/scanner']);
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
        if (/^\d{4,8}$/.test(this.quioscoPin)) {
          this.config.setQuioscoPin(this.quioscoPin);
        }
        this.config.setModoQuiosco(this.modoQuiosco);
        break;

      case 'avisos':
        this.config.setUmbralInactividadDias(this.umbralInactividadDias);
        this.config.setUmbralRecordatorioRespaldoDias(this.umbralRespaldoDias);
        break;
    }
  }

  private finalizar(): void {
    this.restablecer.marcarSetupCompletado();
    this.toast.success('Configuración guardada. ¡A trabajar!');
    this.router.navigate(['/scanner']);
  }

  /** Validación mínima del PIN, mostrada en vivo. */
  protected get pinValido(): boolean {
    return /^\d{4,8}$/.test(this.quioscoPin);
  }
}
