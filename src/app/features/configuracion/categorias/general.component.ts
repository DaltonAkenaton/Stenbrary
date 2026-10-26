// ╔══════════════════════════════════════════════════════╗
// ║  categorias/general.component.ts                     ║
// ║  Categoría "General" del nuevo /configuración        ║
// ║  Stenbrary v3.24.0                                    ║
// ║                                                      ║
// ║  Contiene:                                            ║
// ║   - Info del sistema (conteos + almacenamiento +     ║
// ║     versión + buscar actualizaciones)                 ║
// ║   - Identidad de la institución (nombre)              ║
// ║   - Hora del sistema (v3.59.0): de internet o a mano   ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfigService } from '../../../core/services/config.service';
import { ChangelogService } from '../../../core/services/changelog.service';
import { PwaUpdateService } from '../../../core/services/pwa-update.service';
import { MatDialog } from '@angular/material/dialog';
import { RelojService } from '../../../core/services/reloj.service';
import { describirDesfase, horaPc } from '../../../core/utils/reloj.utils';
import { fechaLocalISO, parseFechaLocal } from '../../../core/utils/tiempo.utils';
import { PinCoordinadorDialogComponent, PinCoordinadorData } from '../../../shared/components/pin/pin-coordinador-dialog.component';

@Component({
    selector: 'app-config-general',
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
    ],
    templateUrl: './general.component.html',
    styleUrls: ['../configuracion.styles.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralCategoriaComponent implements OnInit, OnDestroy {
  private databaseService = inject(DatabaseService);
  private toastService = inject(ToastService);
  configService = inject(ConfigService);
  changelogService = inject(ChangelogService);
  private pwaUpdateService = inject(PwaUpdateService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);


  readonly reloj = inject(RelojService);
  private readonly dialog = inject(MatDialog);
  private tic?: ReturnType<typeof setInterval>;
  readonly describirDesfase = describirDesfase;

  /** Formulario del ajuste a mano. */
  ajustandoHora = false;
  fechaManual = '';
  horaManual = '';

  cargandoInfo = true;

  conteoAlumnos = 0;
  conteoRegistros = 0;
  conteoMotivos = 0;
  almacenamientoEstimado = '—';

  nombreInstitucionBorrador = '';
  buscandoActualizacion = false;

  constructor() {
    this.nombreInstitucionBorrador = this.configService.nombreInstitucion;
  }

  async ngOnInit(): Promise<void> {
    // Las dos horas en pantalla avanzan solas.
    this.tic = setInterval(() => this.cdr.markForCheck(), 15_000);
    await this.cargarInfo();
  }

  ngOnDestroy(): void {
    clearInterval(this.tic);
  }

  // ─── Hora del sistema (v3.59.0) ────────────────────
  private readonly fmtHora = new Intl.DateTimeFormat('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  get horaSistema(): string { return this.fmtHora.format(new Date()); }
  get horaComputadora(): string { return this.fmtHora.format(new Date(horaPc())); }

  async verificarHora(): Promise<void> {
    const ok = await this.reloj.sincronizar();
    if (ok) this.toastService.success('Hora verificada por internet');
    else this.toastService.warning('No se pudo verificar: revisa la conexión a internet');
    this.cdr.markForCheck();
  }

  abrirAjusteManual(): void {
    const ahora = new Date();
    this.fechaManual = fechaLocalISO(ahora);
    this.horaManual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    this.ajustandoHora = true;
  }

  async guardarAjusteManual(): Promise<void> {
    const dia = parseFechaLocal(this.fechaManual);
    const [h, m] = (this.horaManual || '').split(':').map(Number);
    if (!dia || !Number.isFinite(h) || !Number.isFinite(m)) {
      this.toastService.warning('Escribe la fecha y la hora');
      return;
    }
    dia.setHours(h, m, 0, 0);
    const ok = await this.pedirPin('¿Cambiar la hora del sistema?',
      `Desde ahora las visitas se registrarán con la hora ${this.fmtHora.format(dia)}. No cambia la hora de Windows.`);
    if (!ok) return;
    this.reloj.ajustarAMano(dia);
    this.ajustandoHora = false;
    this.toastService.success('Hora ajustada');
    this.cdr.markForCheck();
  }

  async usarHoraDeLaPc(): Promise<void> {
    const ok = await this.pedirPin('¿Usar la hora de la computadora?',
      'Stenbrary dejará de corregirla. Si la computadora tiene la hora mal, las visitas quedarán con esa hora.');
    if (!ok) return;
    this.reloj.usarHoraDeLaPc();
    this.cdr.markForCheck();
  }

  private async pedirPin(titulo: string, mensaje: string): Promise<boolean> {
    const ref = this.dialog.open(PinCoordinadorDialogComponent, {
      width: '420px', maxWidth: '94vw',
      data: { titulo, mensaje, textoConfirmar: 'Cambiar la hora', icono: 'schedule' } as PinCoordinadorData,
    });
    return !!(await ref.afterClosed().toPromise());
  }

  // ─── Identidad ──────────────────────────────────────
  guardarNombreInstitucion(): void {
    const nuevo = (this.nombreInstitucionBorrador || '').trim();
    if (nuevo === this.configService.nombreInstitucion) return;
    this.configService.setNombreInstitucion(nuevo);
    this.nombreInstitucionBorrador = nuevo;
    this.toastService.success(
      nuevo ? 'Nombre de institución actualizado' : 'Nombre de institución eliminado',
    );
    this.cdr.markForCheck();
  }

  limpiarNombreInstitucion(): void {
    this.nombreInstitucionBorrador = '';
    this.guardarNombreInstitucion();
  }

  // ─── Info ───────────────────────────────────────────
  async cargarInfo(): Promise<void> {
    try {
      this.cargandoInfo = true;
      const conteo = await this.databaseService.obtenerConteoTotal();
      this.conteoAlumnos = conteo.alumnos;
      this.conteoRegistros = conteo.registros;
      this.conteoMotivos = conteo.motivos;
      await this.estimarAlmacenamiento();
    } catch (error) {
      console.error('Error al cargar info:', error);
    } finally {
      this.cargandoInfo = false;
      this.cdr.markForCheck();
    }
  }

  async buscarActualizacion(): Promise<void> {
    if (this.buscandoActualizacion) return;
    if (!this.pwaUpdateService.habilitado) {
      this.toastService.info('Búsqueda no disponible en modo desarrollo');
      return;
    }
    this.buscandoActualizacion = true;
    this.cdr.markForCheck();
    try {
      const hay = await this.pwaUpdateService.buscarActualizacionAhora();
      if (hay) {
        this.toastService.success('Nueva versión encontrada — actualizando...');
        setTimeout(() => this.pwaUpdateService.aplicarActualizacion(), 800);
      } else {
        this.toastService.info('Ya tienes la versión más reciente');
        this.buscandoActualizacion = false;
        this.cdr.markForCheck();
      }
    } catch {
      this.toastService.error('No se pudo verificar actualizaciones');
      this.buscandoActualizacion = false;
      this.cdr.markForCheck();
    }
  }


  private async estimarAlmacenamiento(): Promise<void> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / (1024 * 1024);
        this.almacenamientoEstimado = usedMB < 1
          ? `${Math.round((estimate.usage || 0) / 1024)} KB`
          : `${usedMB.toFixed(1)} MB`;
      } else {
        this.almacenamientoEstimado = 'N/A';
      }
    } catch {
      this.almacenamientoEstimado = 'N/A';
    }
  }

  navegar(ruta: string): void {
    void this.router.navigate([ruta]);
  }
}
