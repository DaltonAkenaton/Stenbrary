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
  { id: 'quiosco',   titulo: '¿La tablet queda sola en la entrada?', descripcion: 'El modo quiosco oculta los menús para que los alumnos solo escaneen.', icono: 'tablet_android' },
  { id: 'avisos',    titulo: 'Avisos y respaldos', descripcion: 'Cada cuánto quieres que el sistema te recuerde cosas.', icono: 'notifications' },
  { id: 'fin',       titulo: 'Todo listo', descripcion: 'Puedes cambiar cualquiera de estos ajustes cuando quieras.', icono: 'check_circle' },
];

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
  protected apertura = '07:00';
  protected cierre = '22:00';
  protected diasAbiertos: number[] = [1, 2, 3, 4, 5];
  protected modoQuiosco = false;
  protected quioscoPin = this.config.quioscoPin;
  protected umbralInactividadDias = this.config.umbralInactividadDias;
  protected umbralRespaldoDias = this.config.umbralRecordatorioRespaldoDias;

  // ── Navegación ────────────────────────────────────────

  protected siguiente(): void {
    this.guardarPasoActual();
    if (this.esUltimo()) {
      this.finalizar();
      return;
    }
    this.indice.update(i => i + 1);
  }

  protected atras(): void {
    if (this.esPrimero()) return;
    this.indice.update(i => i - 1);
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
  }

  protected esDiaAbierto(dia: number): boolean {
    return this.diasAbiertos.includes(dia);
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
            const abierto = this.diasAbiertos.includes(dia);
            this.config.setHorarioDia(dia, {
              cerrado: !abierto,
              apertura: this.apertura,
              cierre: this.cierre,
            });
          }
        }
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
