// ╔══════════════════════════════════════════════════════╗
// ║  categorias/general.component.ts                     ║
// ║  Categoría "General" del nuevo /configuración        ║
// ║  Stenbrary v3.24.0                                    ║
// ║                                                      ║
// ║  Contiene:                                            ║
// ║   - Info del sistema (conteos + almacenamiento +     ║
// ║     versión + buscar actualizaciones)                 ║
// ║   - Identidad de la institución (nombre)              ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../../core/services/database.service';
import { BackupService } from '../../../core/services/backup.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfigService } from '../../../core/services/config.service';
import { ChangelogService } from '../../../core/services/changelog.service';
import { PwaUpdateService } from '../../../core/services/pwa-update.service';

@Component({
  selector: 'app-config-general',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './general.component.html',
  styleUrls: ['../configuracion.styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralCategoriaComponent implements OnInit {

  cargandoInfo = true;
  procesando = false;

  conteoAlumnos = 0;
  conteoRegistros = 0;
  conteoMotivos = 0;
  almacenamientoEstimado = '—';
  motivosDuplicados = 0;

  nombreInstitucionBorrador = '';
  buscandoActualizacion = false;

  constructor(
    private databaseService: DatabaseService,
    private backupService: BackupService,
    private toastService: ToastService,
    public configService: ConfigService,
    public changelogService: ChangelogService,
    private pwaUpdateService: PwaUpdateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.nombreInstitucionBorrador = this.configService.nombreInstitucion;
  }

  async ngOnInit(): Promise<void> {
    await this.cargarInfo();
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
      const [conteo, duplicados] = await Promise.all([
        this.databaseService.obtenerConteoTotal(),
        this.backupService.contarMotivosDuplicados(),
      ]);
      this.conteoAlumnos = conteo.alumnos;
      this.conteoRegistros = conteo.registros;
      this.conteoMotivos = conteo.motivos;
      this.motivosDuplicados = duplicados;
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

  async limpiarDuplicados(): Promise<void> {
    try {
      this.procesando = true;
      const eliminados = await this.backupService.limpiarMotivosDuplicados();
      if (eliminados > 0) {
        this.toastService.success(`${eliminados} actividades duplicadas eliminadas`);
      } else {
        this.toastService.info('No se encontraron actividades duplicadas');
      }
      await this.cargarInfo();
    } catch {
      this.toastService.error('Error al limpiar duplicados');
    } finally {
      this.procesando = false;
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
