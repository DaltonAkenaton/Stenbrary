// ╔══════════════════════════════════════════════════════╗
// ║  categorias/quiosco.component.ts                     ║
// ║  Categoría "Quiosco" del nuevo /configuración        ║
// ║  Stenbrary v3.24.0                                    ║
// ║                                                      ║
// ║  Contiene:                                            ║
// ║   - Modo Quiosco (toggle + PIN + volver solo, v3.49)  ║
// ║   - Horarios de Operación (editor por día + modo)     ║
// ║                                                      ║
// ║  Recordatorio: el PIN solo se pide para DESACTIVAR    ║
// ║  el modo quiosco (no para acceder a /presencia ni     ║
// ║  vistas frecuentes — eso expondría el PIN al alumno). ║
// ║  v3.57.0: también autoriza borrados; cambiarlo pide   ║
// ║  el actual, y el código de recuperación se genera     ║
// ║  aquí.                                                ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { PinCoordinadorDialogComponent, PinCoordinadorData } from '../../../shared/components/pin/pin-coordinador-dialog.component';
import { ToastService } from '../../../core/services/toast.service';
import { ConfigService, HorarioModo } from '../../../core/services/config.service';
import { DIAS_SEMANA } from '../../../core/utils/horarios.utils';
import { BitacoraService } from '../../../core/services/bitacora.service';

@Component({
  selector: 'app-config-quiosco',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './quiosco.component.html',
  styleUrls: ['../configuracion.styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuioscoCategoriaComponent {

  readonly diasSemana = DIAS_SEMANA.map((nombre, indice) => ({ indice, nombre }));

  readonly opcionesHorarioModo: { valor: HorarioModo; etiqueta: string; descripcion: string }[] = [
    {
      valor: 'advertir',
      etiqueta: 'Solo advertir',
      descripcion: 'Muestra un toast de advertencia pero permite registrar.',
    },
    {
      valor: 'bloquear',
      etiqueta: 'Bloquear',
      descripcion: 'Bloquea el registro fuera del horario configurado.',
    },
  ];

  // Debounce de toast para inputs continuos (PIN, time inputs).
  private toastDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly bitacora = inject(BitacoraService);
  private readonly dialog = inject(MatDialog);

  constructor(
    public configService: ConfigService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ─── Modo quiosco ───────────────────────────────────
  toggleModoQuiosco(): void {
    const nuevo = !this.configService.modoQuiosco;
    this.configService.setModoQuiosco(nuevo);
    if (nuevo) this.bitacora.registrar('quiosco-activar', 'Desde Configuración');
    this.toastService.info(
      nuevo
        ? 'Modo quiosco activado — pulsación larga + PIN para salir'
        : 'Modo quiosco desactivado'
    );
    this.cdr.markForCheck();
  }

  // ─── PIN y código de recuperación (v3.57.0) ─────────
  // Antes el PIN se escribía en un campo de texto que guardaba cada tecla: a
  // medio escribir quedaba un PIN de 1 dígito, y se leía en claro. Ahora pasa
  // por el diálogo, que pide el actual (o el código) y el nuevo dos veces.

  async cambiarPin(): Promise<void> {
    if (await this.abrirPin({
      titulo: this.configService.quioscoPin ? 'Cambiar el PIN' : 'Poner PIN',
      mensaje: 'Primero el PIN actual. Después escribirás el nuevo dos veces y verás su código de recuperación.',
      icono: 'key',
      cambiarPin: true,
    })) {
      this.toastService.success('PIN guardado. Anota el código de recuperación.');
    }
    this.cdr.markForCheck();
  }

  async generarCodigo(): Promise<void> {
    if (await this.abrirPin({
      titulo: 'Código de recuperación',
      mensaje: this.configService.quioscoCodigoRecuperacion
        ? 'Se genera uno nuevo y el anterior deja de servir.'
        : 'Con él podrás poner un PIN nuevo si olvidas el actual.',
      icono: 'vpn_key',
      soloCodigo: true,
    })) {
      this.toastService.success('Código de recuperación nuevo guardado.');
    }
    this.cdr.markForCheck();
  }

  private async abrirPin(data: PinCoordinadorData): Promise<boolean> {
    const ref = this.dialog.open(PinCoordinadorDialogComponent, {
      width: '420px',
      maxWidth: '94vw',
      disableClose: true,   // el código se muestra una vez: que no se cierre por un clic afuera
      data,
    });
    return !!(await ref.afterClosed().toPromise());
  }

  /** Atajos; el input libre acepta 0–240. */
  readonly opcionesAutoQuiosco = [0, 5, 10, 15, 30];

  setQuioscoAutoMinutos(valor: number | string): void {
    if (valor === '' || valor === null) return; // campo a medio escribir
    this.configService.setQuioscoAutoMinutos(Number(valor));
    const min = this.configService.quioscoAutoMinutos;
    this.debouncedToast(
      'quiosco-auto',
      min ? `Vuelve solo al quiosco tras ${min} min sin uso` : 'Ya no vuelve solo al quiosco',
    );
    this.cdr.markForCheck();
  }

  // ─── Horarios ───────────────────────────────────────
  toggleHorarioActivo(): void {
    const nuevo = !this.configService.horarioActivo;
    this.configService.setHorarioActivo(nuevo);
    this.toastService.info(
      nuevo ? 'Horarios de operación activados' : 'Horarios desactivados'
    );
    this.cdr.markForCheck();
  }

  setHorarioModo(modo: HorarioModo): void {
    this.configService.setHorarioModo(modo);
    const op = this.opcionesHorarioModo.find(o => o.valor === modo);
    if (op) this.toastService.info(`Fuera de horario: ${op.etiqueta}`);
    this.cdr.markForCheck();
  }

  toggleDiaCerrado(dia: number): void {
    const actual = this.configService.horarios[dia];
    const nuevoCerrado = !actual.cerrado;
    this.configService.setHorarioDia(dia, { ...actual, cerrado: nuevoCerrado });
    const nombre = DIAS_SEMANA[dia] ?? `Día ${dia}`;
    this.toastService.success(
      nuevoCerrado ? `${nombre}: cerrado` : `${nombre}: abierto ${actual.apertura}–${actual.cierre}`,
    );
    this.cdr.markForCheck();
  }

  setHorarioCampo(dia: number, campo: 'apertura' | 'cierre', valor: string): void {
    const actual = this.configService.horarios[dia];
    this.configService.setHorarioDia(dia, { ...actual, [campo]: valor });
    const nombre = DIAS_SEMANA[dia] ?? `Día ${dia}`;
    const etiqueta = campo === 'apertura' ? 'apertura' : 'cierre';
    this.debouncedToast(
      `horario-${dia}-${campo}`,
      `${nombre} — ${etiqueta}: ${valor}`,
    );
    this.cdr.markForCheck();
  }

  private debouncedToast(key: string, mensaje: string, ms = 700): void {
    const prev = this.toastDebounceTimers.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      this.toastService.success(mensaje);
      this.toastDebounceTimers.delete(key);
    }, ms);
    this.toastDebounceTimers.set(key, t);
  }
}
