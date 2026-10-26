// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/features/diagnostico/                 ║
// ║        diagnostico.component.ts                      ║
// ║  Stenbrary — Reporte de incidencias                  ║
// ║                                                      ║
// ║  Público real: un coordinador de ~50 años y alumnos  ║
// ║  de carreras no técnicas. Ninguno va a leer un stack ║
// ║  trace ni a describir un bug con precisión.          ║
// ║                                                      ║
// ║  Por eso la pantalla tiene UN botón grande que baja  ║
// ║  un archivo para mandar por correo o WhatsApp. El    ║
// ║  detalle técnico existe, pero está plegado: quien    ║
// ║  no lo entiende no debería tropezarse con él.        ║
// ║                                                      ║
// ║  Tono deliberadamente tranquilo — "esto ayuda a      ║
// ║  mejorar el sistema", no "ERROR CRÍTICO". Un aviso   ║
// ║  alarmante hace que dejen de usar el sistema.        ║
// ╚══════════════════════════════════════════════════════╝

import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { DiagnosticoService, Incidencia } from '../../core/services/diagnostico.service';
import { ToastService } from '../../core/services/toast.service';
import { DatabaseService } from '../../core/services/database.service';
import { revisarIntegridad, ProblemaIntegridad } from '../../core/utils/integridad.utils';
import { CuadreCifrasService, ComprobacionCifra } from '../../core/services/cuadre-cifras.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { fechaLocalISO } from '../../core/utils/tiempo.utils';
import { ConfigService } from '../../core/services/config.service';

@Component({
    selector: 'app-diagnostico',
    imports: [CommonModule, MatIconModule, MatDialogModule],
    templateUrl: './diagnostico.component.html',
    styleUrl: './diagnostico.component.scss'
})
export class DiagnosticoComponent {
  private readonly diagnostico = inject(DiagnosticoService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  protected readonly incidencias = this.diagnostico.incidencias;
  protected readonly total = this.diagnostico.total;
  protected readonly hayIncidencias = this.diagnostico.hayIncidencias;
  protected readonly totalErrores = this.diagnostico.totalErrores;

  protected readonly abierta = signal<string | null>(null);

  // ─── Revisión de datos ──────────────────────────────────
  // A diferencia de la bitácora (que se llena sola cuando algo falla), esto
  // se ejecuta a petición: recorre los datos buscando valores que no pueden
  // ser correctos. Es lo que detecta los defectos que no lanzan error.
  private readonly db = inject(DatabaseService);
  private readonly config = inject(ConfigService);
  protected readonly revisando = signal(false);
  protected readonly problemas = signal<ProblemaIntegridad[] | null>(null);

  protected async revisarDatos(): Promise<void> {
    if (this.revisando()) return;
    this.revisando.set(true);
    try {
      const [alumnos, registros] = await Promise.all([
        this.db.obtenerTodosLosAlumnos(),
        this.db.obtenerTodosLosRegistros(),
      ]);
      const hallazgos = revisarIntegridad(alumnos, registros, new Date(), {
        moduloSalidaActivo: this.config.registroSalidaActivo,
      });
      this.problemas.set(hallazgos);

      // Se anotan en la bitácora para que viajen en el archivo exportado:
      // de nada sirve detectarlos si no llegan a quien puede arreglarlos.
      hallazgos.forEach(p =>
        this.diagnostico.anomalia('datos', p.descripcion, {
          tipo: p.tipo,
          afectados: p.afectados,
          ejemplos: p.ejemplos,
        }),
      );

      if (hallazgos.length === 0) {
        this.toast.success(
          `Revisados ${registros.length} registros y ${alumnos.length} alumnos. Todo correcto.`,
        );
      } else {
        this.toast.warning(
          `Se encontraron ${hallazgos.length} ${hallazgos.length === 1 ? 'situación' : 'situaciones'} que conviene revisar.`,
        );
      }
    } catch (err) {
      this.toast.error('No se pudieron revisar los datos.');
      this.diagnostico.error('datos', 'Falló la revisión de integridad', {
        detalle: (err as Error)?.message,
      });
    } finally {
      this.revisando.set(false);
    }
  }

  // ─── Cuadre de cifras (v3.57.0) ─────────────────────────
  private readonly cuadre = inject(CuadreCifrasService);
  protected readonly verificando = signal(false);
  protected readonly cifras = signal<ComprobacionCifra[] | null>(null);
  protected readonly cifrasMal = computed(() => (this.cifras() ?? []).filter(c => !c.ok).length);

  protected async verificarCifras(): Promise<void> {
    if (this.verificando()) return;
    this.verificando.set(true);
    try {
      const lista = await this.cuadre.verificar();
      this.cifras.set(lista);
      const malas = lista.filter(c => !c.ok);
      // A la bitácora técnica: viaja en el reporte que se manda a soporte.
      malas.forEach(c => this.diagnostico.anomalia('datos', `Cifras que no cuadran: ${c.periodo} — ${c.descripcion}`, {
        esperado: c.esperado, obtenido: c.obtenido,
      }));
      if (malas.length === 0) this.toast.success(`Las ${lista.length} comprobaciones cuadran.`);
      else this.toast.error(`${malas.length} comprobaciones no cuadran. Revisa la lista.`);
    } catch (err) {
      this.toast.error('No se pudieron verificar las cifras.');
      this.diagnostico.error('datos', 'Falló el cuadre de cifras', { detalle: (err as Error)?.message });
    } finally {
      this.verificando.set(false);
    }
  }

  protected readonly resumen = computed(() => {
    const n = this.incidencias().length;
    if (n === 0) return 'No se ha detectado ningún problema.';
    const veces = this.total();
    return n === 1
      ? `1 situación detectada${veces > 1 ? `, ocurrió ${veces} veces` : ''}.`
      : `${n} situaciones detectadas, ${veces} en total.`;
  });

  protected alternar(id: string): void {
    this.abierta.set(this.abierta() === id ? null : id);
  }

  protected fechaLegible(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleString('es-MX', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        });
  }

  /**
   * Descarga el reporte como archivo.
   *
   * Se usa un blob y un click sintético en vez de pedirle al usuario que
   * copie texto: copiar y pegar en el móvil es justo donde se pierde la
   * mitad del contenido.
   */
  protected descargar(): void {
    try {
      const contenido = this.diagnostico.construirReporte();
      const blob = new Blob([contenido], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fecha = fechaLocalISO();

      const a = document.createElement('a');
      a.href = url;
      a.download = `stenbrary-reporte-${fecha}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);   // en el acto puede cancelar la descarga

      this.toast.success('Reporte descargado. Envíalo a quien da soporte.');
    } catch {
      this.toast.error('No se pudo generar el archivo.');
    }
  }

  protected async limpiar(): Promise<void> {
    const data: ConfirmDialogData = {
      titulo: '¿Borrar el historial de incidencias?',
      mensaje:
        'Se perderá la información sobre los problemas detectados. ' +
        'Conviene descargar el reporte antes, por si hace falta revisarlo.',
      variante: 'warning',
      textoConfirmar: 'Borrar historial',
      icono: 'delete_sweep',
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '420px', data });
    if (!(await ref.afterClosed().toPromise())) return;

    this.diagnostico.limpiar();
    this.toast.info('Historial vacío.');
  }

  /** Traduce el área técnica a algo que el coordinador reconozca. */
  protected nombreArea(area: string): string {
    const mapa: Record<string, string> = {
      scanner: 'Escáner',
      registros: 'Registros',
      alumnos: 'Alumnos',
      estadisticas: 'Estadísticas',
      configuracion: 'Configuración',
      descarga: 'Bajar de la nube',
      sincronizacion: 'Sincronización',
      'importar-alumnos': 'Importar alumnos',
      'limpieza-registros': 'Eliminar registros',
      respaldo: 'Respaldo',
      inicio: 'Inicio',
    };
    return mapa[area] ?? area;
  }

  protected contextoLegible(inc: Incidencia): string {
    if (!inc.contexto) return '';
    return JSON.stringify(inc.contexto, null, 2);
  }
}
