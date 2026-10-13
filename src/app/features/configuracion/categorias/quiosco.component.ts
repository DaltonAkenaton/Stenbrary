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
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '../../../core/services/toast.service';
import { ConfigService, HorarioModo } from '../../../core/services/config.service';
import { DIAS_SEMANA } from '../../../core/utils/horarios.utils';

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

  constructor(
    public configService: ConfigService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ─── Modo quiosco ───────────────────────────────────
  toggleModoQuiosco(): void {
    const nuevo = !this.configService.modoQuiosco;
    this.configService.setModoQuiosco(nuevo);
    this.toastService.info(
      nuevo
        ? 'Modo quiosco activado — pulsación larga + PIN para salir'
        : 'Modo quiosco desactivado'
    );
    this.cdr.markForCheck();
  }

  setQuioscoPin(valor: string): void {
    this.configService.setQuioscoPin(valor);
    const pin = this.configService.quioscoPin;
    this.debouncedToast(
      'quiosco-pin',
      pin ? `PIN del modo quiosco: ${pin.length} dígito(s)` : 'PIN del modo quiosco eliminado',
    );
    this.cdr.markForCheck();
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
