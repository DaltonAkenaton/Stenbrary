// ╔══════════════════════════════════════════════════════╗
// ║  categorias/operacion.component.ts                   ║
// ║  Categoría "Operación" del nuevo /configuración      ║
// ║  Stenbrary v3.24.0                                    ║
// ║                                                      ║
// ║  Contiene:                                            ║
// ║   - Registro de salida (incl. cierre automático,      ║
// ║     confirmación auto, cierre al horario)             ║
// ║   - Control de aforo (capacidad + modo)               ║
// ║   - Detección de duplicados (umbral)                  ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '../../../core/services/toast.service';
import { ConfigService, AforoModo } from '../../../core/services/config.service';

@Component({
  selector: 'app-config-operacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './operacion.component.html',
  styleUrls: ['../configuracion.styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperacionCategoriaComponent {

  readonly opcionesAutoSalida = [
    { valor: 0,  etiqueta: 'No cerrar' },
    { valor: 1,  etiqueta: '1 hora'    },
    { valor: 2,  etiqueta: '2 horas'   },
    { valor: 3,  etiqueta: '3 horas'   },
    { valor: 4,  etiqueta: '4 horas'   },
    { valor: 6,  etiqueta: '6 horas'   },
    { valor: 8,  etiqueta: '8 horas'   },
  ];

  readonly opcionesAforoModo: { valor: AforoModo; etiqueta: string; descripcion: string }[] = [
    {
      valor: 'permitir',
      etiqueta: 'Solo alertar',
      descripcion: 'Muestra alerta visual y sonora pero permite registrar más entradas.',
    },
    {
      valor: 'confirmar',
      etiqueta: 'Confirmar',
      descripcion: 'Bloquea el registro y pide confirmación explícita del personal para continuar.',
    },
    {
      valor: 'bloquear',
      etiqueta: 'Bloquear',
      descripcion: 'Bloqueo total — no se permiten nuevas entradas hasta que alguien salga.',
    },
  ];

  readonly opcionesUmbral = [
    { valor: 10, etiqueta: '10 min' },
    { valor: 20, etiqueta: '20 min' },
    { valor: 30, etiqueta: '30 min' },
    { valor: 45, etiqueta: '45 min' },
    { valor: 60, etiqueta: '1 hora' },
  ];

  constructor(
    public configService: ConfigService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  get descripcionModoActual(): string {
    return this.opcionesAforoModo.find(o => o.valor === this.configService.aforoModo)?.descripcion ?? '';
  }

  // ─── Registro de salida ─────────────────────────────
  toggleRegistroSalida(): void {
    const nuevo = !this.configService.registroSalidaActivo;
    this.configService.setRegistroSalidaActivo(nuevo);
    this.toastService.info(
      nuevo
        ? 'Registro de salida activado — aparece "En Biblioteca" en el menú'
        : 'Registro de salida desactivado'
    );
    this.cdr.markForCheck();
  }

  setHorasAutoSalida(horas: number): void {
    this.configService.setHorasAutoSalida(horas);
    const valor = this.configService.horasAutoSalida;
    const etiqueta = this.opcionesAutoSalida.find(o => o.valor === valor)?.etiqueta ?? `${valor}h`;
    // Un solo aviso al terminar de escribir, no uno por tecla.
    this.avisoDiferido('auto-salida',
      valor === 0 ? 'Cierre automático desactivado' : `Cierre automático configurado a ${etiqueta}`);
    this.cdr.markForCheck();
  }

  onToggleCierreAutoConfirmar(): void {
    const nuevo = !this.configService.cierreAutoConfirmar;
    this.configService.setCierreAutoConfirmar(nuevo);
    this.toastService.success(
      nuevo
        ? 'Las salidas por timeout se confirmarán automáticamente'
        : 'Las salidas por timeout requerirán revisión manual',
    );
    this.cdr.markForCheck();
  }

  onToggleCierreAlHorario(): void {
    const nuevo = !this.configService.cierreAlHorario;
    this.configService.setCierreAlHorario(nuevo);
    this.toastService.success(
      nuevo
        ? 'Al llegar la hora de cierre se cerrarán todas las entradas pendientes'
        : 'Cierre por horario desactivado',
    );
    this.cdr.markForCheck();
  }

  // ─── Aforo ──────────────────────────────────────────
  setAforoMaximo(valor: number | string): void {
    const num = typeof valor === 'string' ? parseInt(valor, 10) : valor;
    this.configService.setAforoMaximo(isNaN(num) ? 0 : num);
    if (num > 0) {
      this.toastService.info(`Aforo configurado: ${num} personas`);
    } else {
      this.toastService.info('Control de aforo desactivado');
    }
    this.cdr.markForCheck();
  }

  setAforoModo(modo: AforoModo): void {
    this.configService.setAforoModo(modo);
    const op = this.opcionesAforoModo.find(o => o.valor === modo);
    if (op) this.toastService.info(`Modo de aforo: ${op.etiqueta}`);
    this.cdr.markForCheck();
  }

  // ─── Duplicados ─────────────────────────────────────
  setUmbralDuplicado(minutos: number | string): void {
    this.configService.setUmbralDuplicadoMin(Number(minutos));
    const valor = this.configService.umbralDuplicadoMin;
    this.avisoDiferido('duplicados',
      valor === 0 ? 'Detección de duplicados desactivada' : `Umbral de duplicados: ${valor} minutos`);
    this.cdr.markForCheck();
  }

  private avisosPendientes = new Map<string, ReturnType<typeof setTimeout>>();

  /** Muestra el aviso 700 ms después del último cambio (inputs numéricos). */
  private avisoDiferido(clave: string, mensaje: string): void {
    const previo = this.avisosPendientes.get(clave);
    if (previo) clearTimeout(previo);
    this.avisosPendientes.set(clave, setTimeout(() => {
      this.toastService.info(mensaje);
      this.avisosPendientes.delete(clave);
    }, 700));
  }
}
