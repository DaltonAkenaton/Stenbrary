// ╔══════════════════════════════════════════════════════╗
// ║  categorias/datos.component.ts                       ║
// ║  Categoría "Datos" del nuevo /configuración          ║
// ║  Stenbrary v3.24.0                                    ║
// ║                                                      ║
// ║  La categoría más grande. Contiene:                   ║
// ║   - Recordatorio de respaldo (intervalo / programado) ║
// ║   - Backup (exportar JSON completo)                   ║
// ║   - Restore (importar JSON con merge/replace)         ║
// ║   - Eliminación masiva por rango (sub-comp existente) ║
// ║   - Datos de prueba (sub-comp existente)              ║
// ║   - Mantenimiento (limpiar motivos duplicados)        ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BackupService, BackupData, ResultadoImportacion } from '../../../core/services/backup.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingService } from '../../../core/services/loading.service';
import { ConfigService, RecordatorioRespaldoModo } from '../../../core/services/config.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LimpiezaRegistrosComponent } from '../limpieza-registros.component';
import { DatosPruebaComponent } from '../datos-prueba.component';

@Component({
  selector: 'app-config-datos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    LimpiezaRegistrosComponent,
    DatosPruebaComponent,
  ],
  templateUrl: './datos.component.html',
  styleUrls: ['../configuracion.styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatosCategoriaComponent {

  /** Notifica al shell para que la categoría General refresque conteos. */
  @Output() datosCambiaron = new EventEmitter<void>();

  procesando = false;
  ultimoBackup = '';
  backupPreview: BackupData | null = null;
  nombreArchivoSeleccionado = '';
  resultadoImportacion: ResultadoImportacion | null = null;

  readonly recordatorioRespaldoOpciones = [
    { valor: 0,  etiqueta: 'Desactivado' },
    { valor: 7,  etiqueta: '7 días' },
    { valor: 14, etiqueta: '14 días' },
    { valor: 30, etiqueta: '30 días' },
    { valor: 60, etiqueta: '60 días' },
  ];

  readonly diasSemanaOpciones = [
    { valor: 1, etiqueta: 'L' },
    { valor: 2, etiqueta: 'M' },
    { valor: 3, etiqueta: 'X' },
    { valor: 4, etiqueta: 'J' },
    { valor: 5, etiqueta: 'V' },
    { valor: 6, etiqueta: 'S' },
    { valor: 0, etiqueta: 'D' },
  ];

  readonly horasRespaldoOpciones = ['08:00', '12:00', '14:00', '18:00', '20:00'];

  readonly horasNumOpciones = Array.from({ length: 24 }, (_, i) => i);
  readonly minutosNumOpciones = Array.from({ length: 60 }, (_, i) => i);

  constructor(
    public configService: ConfigService,
    private backupService: BackupService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  // ─── Recordatorio de respaldo ───────────────────────
  setUmbralRecordatorioRespaldo(dias: number): void {
    const n = Math.max(0, Math.min(3650, Math.floor(dias) || 0));
    this.configService.setUmbralRecordatorioRespaldoDias(n);
    if (n === 0) {
      this.toastService.info('Recordatorio de respaldo desactivado');
    } else {
      this.toastService.info(`Recordatorio cada ${n} día(s)`);
    }
    this.cdr.markForCheck();
  }

  diasSinRespaldoTexto(): string {
    const dias = this.configService.diasSinRespaldo();
    if (dias === null) return 'Aún no se ha hecho ningún respaldo.';
    if (dias === 0) return 'Último respaldo: hoy.';
    if (dias === 1) return 'Último respaldo: hace 1 día.';
    return `Último respaldo: hace ${dias} días.`;
  }

  private parseHoraActual(): { h: number; m: number } {
    const m = /^(\d{1,2}):(\d{2})$/.exec(this.configService.recordatorioRespaldoHora || '');
    if (!m) return { h: 9, m: 0 };
    return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
  }

  get respaldoHoraH(): number { return this.parseHoraActual().h; }
  get respaldoHoraM(): number { return this.parseHoraActual().m; }

  setRespaldoHoraH(h: number | string): void {
    const hn = typeof h === 'string' ? parseInt(h, 10) : h;
    const { m } = this.parseHoraActual();
    this.configService.setRecordatorioRespaldoHora(`${this.pad2(hn)}:${this.pad2(m)}`);
    this.notificarCambioRespaldo();
  }

  setRespaldoHoraM(min: number | string): void {
    const mn = typeof min === 'string' ? parseInt(min, 10) : min;
    const { h } = this.parseHoraActual();
    this.configService.setRecordatorioRespaldoHora(`${this.pad2(h)}:${this.pad2(mn)}`);
    this.notificarCambioRespaldo();
  }

  onSetModoRespaldo(modo: RecordatorioRespaldoModo): void {
    this.configService.setRecordatorioRespaldoModo(modo);
    if (modo === 'programado') {
      const dias = this.configService.recordatorioRespaldoDiasSemana.length;
      if (dias === 0) {
        this.toastService.info('Modo programado activado — selecciona los días del aviso');
      } else {
        this.notificarCambioRespaldo();
      }
    } else {
      const n = this.configService.umbralRecordatorioRespaldoDias;
      this.toastService.success(
        n > 0 ? `Aviso si pasan ${n} día(s) sin respaldar` : 'Modo por intervalo activado',
      );
    }
    this.cdr.markForCheck();
  }

  onSetHoraRespaldo(hhmm: string): void {
    this.configService.setRecordatorioRespaldoHora(hhmm);
    this.notificarCambioRespaldo();
  }

  onToggleDiaRespaldo(dia: number): void {
    this.configService.toggleRecordatorioRespaldoDia(dia);
    this.notificarCambioRespaldo();
  }

  private notificarCambioRespaldo(): void {
    if (this.configService.recordatorioRespaldoModo !== 'programado') return;
    const dias = this.configService.recordatorioRespaldoDiasSemana.length;
    if (dias === 0) {
      this.toastService.warning('Aviso desactivado — selecciona al menos un día');
      return;
    }
    const hora = this.configService.recordatorioRespaldoHora;
    this.toastService.success(`Aviso programado: ${this.diasSemanaActivosTexto()} a las ${hora}`);
  }

  esDiaRespaldoActivo(dia: number): boolean {
    return this.configService.recordatorioRespaldoDiasSemana.includes(dia);
  }

  diasSemanaActivosTexto(): string {
    const nombres = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
    const dias = [...this.configService.recordatorioRespaldoDiasSemana].sort();
    if (dias.length === 0) return 'ningún día';
    if (dias.length === 7) return 'todos los días';
    return dias.map(d => nombres[d]).join(', ');
  }

  // ─── Backup ─────────────────────────────────────────
  async exportarBackup(): Promise<void> {
    try {
      this.procesando = true;
      this.cdr.markForCheck();
      this.loadingService.show('Generando backup...');
      const resultado = await this.backupService.descargarBackup();
      this.loadingService.hide();
      this.ultimoBackup = new Date().toLocaleString('es-MX');
      this.toastService.success(`Backup descargado: ${resultado.nombreArchivo}`);
    } catch {
      this.loadingService.hide();
      this.toastService.error('Error al generar el backup');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  // ─── Restore ────────────────────────────────────────
  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.backupPreview = null;
    this.resultadoImportacion = null;
    this.nombreArchivoSeleccionado = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      const contenido = reader.result as string;
      const validacion = this.backupService.validarArchivo(contenido);

      if (!validacion.valido) {
        this.toastService.error(validacion.errores[0]);
        return;
      }

      this.backupPreview = validacion.datos!;
      this.toastService.info('Archivo válido — revisa los datos antes de importar');
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.toastService.error('Error al leer el archivo');
    };
    reader.readAsText(file);

    input.value = '';
  }

  async importarBackup(modo: 'merge' | 'replace'): Promise<void> {
    if (!this.backupPreview) return;

    if (modo === 'replace') {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          titulo: '¿Reemplazar TODOS los datos?',
          mensaje: 'Se borrarán todos los datos actuales y se reemplazarán con el backup. Esta acción no se puede deshacer.',
          variante: 'danger',
          textoConfirmar: 'Reemplazar todo',
          icono: 'swap_horiz',
        } as ConfirmDialogData,
      });

      const confirmado = await dialogRef.afterClosed().toPromise();
      if (!confirmado) return;
    }

    try {
      this.procesando = true;
      this.cdr.markForCheck();
      this.loadingService.show(modo === 'replace' ? 'Reemplazando datos...' : 'Combinando datos...');
      this.resultadoImportacion = await this.backupService.importarBackup(this.backupPreview, modo);
      this.backupPreview = null;
      this.loadingService.hide();

      if (this.resultadoImportacion.exitoso) {
        this.toastService.success('Importación completada exitosamente');
        this.datosCambiaron.emit();
      } else {
        this.toastService.error('Hubo errores durante la importación');
      }
    } catch {
      this.loadingService.hide();
      this.toastService.error('Error durante la importación');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  cancelarImportacion(): void {
    this.backupPreview = null;
    this.resultadoImportacion = null;
    this.nombreArchivoSeleccionado = '';
    this.cdr.markForCheck();
  }

  formatearFechaBackup(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ─── Mantenimiento ──────────────────────────────────
  async limpiarDuplicados(): Promise<void> {
    try {
      this.procesando = true;
      this.cdr.markForCheck();
      this.loadingService.show('Limpiando motivos duplicados...');
      const eliminados = await this.backupService.limpiarMotivosDuplicados();
      this.loadingService.hide();
      if (eliminados > 0) {
        this.toastService.success(`${eliminados} motivos duplicados eliminados`);
        this.datosCambiaron.emit();
      } else {
        this.toastService.info('No se encontraron motivos duplicados');
      }
    } catch {
      this.loadingService.hide();
      this.toastService.error('Error al limpiar duplicados');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  // ─── Datos de prueba ────────────────────────────────
  onDatosPruebaCambiaron(): void {
    this.datosCambiaron.emit();
  }
}
