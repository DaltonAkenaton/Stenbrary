// ╔══════════════════════════════════════════════════════╗
// ║  categorias/catalogos.component.ts                   ║
// ║  Categoría "Catálogos" de /configuración             ║
// ║  Stenbrary v3.57.0                                    ║
// ║                                                      ║
// ║  Carreras (agregar, renombrar, desactivar), grupos y  ║
// ║  rango de grados. Cada cambio se guarda al momento y  ║
// ║  va a la bitácora.                                    ║
// ║                                                      ║
// ║  Renombrar pregunta qué pasa con lo anterior:         ║
// ║  - Corregir el nombre: también alumnos y visitas       ║
// ║    pasadas (una sola fila en Estadísticas).            ║
// ║  - La carrera cambió de nombre: la vieja queda         ║
// ║    desactivada con sus datos y se agrega la nueva      ║
// ║    (dos filas: las dos generaciones conviven).         ║
// ║  Una carrera no se borra: se desactiva.                ║
// ╚══════════════════════════════════════════════════════╝

import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ConfigService } from '../../../core/services/config.service';
import { ToastService } from '../../../core/services/toast.service';
import { DatabaseService } from '../../../core/services/database.service';
import { BitacoraService } from '../../../core/services/bitacora.service';
import {
  CarreraCatalogo, CatalogoEscolar, ResultadoEdicion,
  agregarCarrera, agregarGrupo, alternarCarrera, buscarCarrera, cambiarRangoGrados, quitarGrupo, renombrarCarrera,
} from '../../../core/utils/catalogos.utils';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-config-catalogos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './catalogos.component.html',
  styleUrls: ['../configuracion.styles.scss', './catalogos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogosCategoriaComponent implements OnInit {
  protected readonly config = inject(ConfigService);
  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);
  private readonly bitacora = inject(BitacoraService);
  private readonly dialog = inject(MatDialog);

  readonly catalogo = this.config.catalogoSignal;
  readonly conteo = signal(new Map<string, { alumnos: number; visitas: number }>());

  nuevaCarrera = '';
  nuevoGrupo = '';
  readonly editando = signal<string | null>(null);
  nombreEditado = '';
  gradoMin = this.config.catalogoEscolar.gradoMin;
  gradoMax = this.config.catalogoEscolar.gradoMax;

  /** Activas primero, en el orden en que se capturaron. */
  readonly carreras = computed(() =>
    [...this.catalogo().carreras].sort((a, b) => Number(b.activa) - Number(a.activa)),
  );

  /** Carreras que tienen alumnos o visitas pero no están en el catálogo (p. ej. de un Excel). */
  readonly fueraDeCatalogo = computed(() => {
    const cat = this.catalogo();
    return [...this.conteo().entries()]
      .filter(([nombre]) => !buscarCarrera(cat, nombre))
      .map(([nombre, c]) => ({ nombre, ...c }))
      .sort((a, b) => b.alumnos - a.alumnos);
  });

  constructor() {
    // Releer conteos si los datos cambian (importar, restaurar…).
    effect(() => {
      this.db.versionDatos();
      untracked(() => void this.contar());
    });
  }

  ngOnInit(): void {
    void this.contar();
  }

  async contar(): Promise<void> {
    try {
      this.conteo.set(await this.db.contarPorCarrera());
    } catch {
      // Sin conteos la pantalla sigue sirviendo; solo no dice cuántos hay.
    }
  }

  uso(nombre: string): { alumnos: number; visitas: number } {
    return this.conteo().get(nombre) ?? { alumnos: 0, visitas: 0 };
  }

  // ─── Carreras ───────────────────────────────────────

  agregarCarrera(nombre = this.nuevaCarrera): void {
    if (this.aplicar(agregarCarrera(this.catalogo(), nombre), `Carrera agregada: ${nombre.trim()}`)) {
      this.nuevaCarrera = '';
    }
  }

  empezarARenombrar(c: CarreraCatalogo): void {
    this.editando.set(c.id);
    this.nombreEditado = c.nombre;
  }

  cancelarRenombre(): void {
    this.editando.set(null);
  }

  async guardarRenombre(c: CarreraCatalogo): Promise<void> {
    const nuevo = this.nombreEditado.replace(/\s+/g, ' ').trim();
    if (nuevo === c.nombre) { this.editando.set(null); return; }
    const prueba = renombrarCarrera(this.catalogo(), c.id, nuevo);
    if (!prueba.ok) { this.toast.warning(prueba.error); return; }

    const { alumnos, visitas } = this.uso(c.nombre);
    // Sin datos con ese nombre no hay nada que decidir.
    let modo: 'corregir' | 'adelante' = 'corregir';
    if (alumnos + visitas > 0) {
      const ref = this.dialog.open(ConfirmDialogComponent, {
        width: '460px',
        data: {
          titulo: '¿Qué pasa con lo que ya está registrado?',
          mensaje:
            `"${c.nombre}" tiene ${alumnos} alumno${alumnos === 1 ? '' : 's'} y ${visitas} visita${visitas === 1 ? '' : 's'}. ` +
            `Corregir: si el nombre estaba mal escrito, se cambia también en todo lo anterior y Estadísticas muestra una sola carrera. ` +
            `Cambió de nombre: si la carrera nueva convive con la anterior, la anterior queda desactivada con sus datos y Estadísticas muestra las dos.`,
          variante: 'info',
          icono: 'drive_file_rename_outline',
          textoConfirmar: 'Corregir en todo',
          textoAlternativa: 'Cambió de nombre',
          iconoAlternativa: 'fork_right',
        } as ConfirmDialogData,
      });
      const r = await ref.afterClosed().toPromise();
      if (r === 'alternativa') modo = 'adelante';
      else if (r !== true) return;
    }

    if (modo === 'corregir') {
      this.config.setCatalogoEscolar(prueba.catalogo);
      try {
        const n = await this.db.renombrarCarreraEnDatos(c.nombre, nuevo);
        // `renombre`: el otro equipo la repite al combinar el respaldo (v3.57.2).
        this.bitacora.registrar('catalogo-cambiado',
          `Carrera "${c.nombre}" corregida a "${nuevo}" (${n.alumnos} alumnos y ${n.registros} visitas actualizados)`,
          undefined, { de: c.nombre, a: nuevo });
        this.toast.success(`Nombre corregido en el catálogo, ${n.alumnos} alumnos y ${n.registros} visitas`);
      } catch {
        this.toast.error('El catálogo cambió, pero no se pudieron actualizar los alumnos y visitas');
      }
    } else {
      const conNueva = agregarCarrera(this.catalogo(), nuevo);
      if (!conNueva.ok) { this.toast.warning(conNueva.error); return; }
      const sinVieja = alternarCarrera(conNueva.catalogo, c.id);
      const final = sinVieja.ok ? sinVieja.catalogo : conNueva.catalogo;
      this.config.setCatalogoEscolar(final);
      this.bitacora.registrar('catalogo-cambiado', `Carrera "${c.nombre}" desactivada; nueva: "${nuevo}"`);
      this.toast.success(`"${nuevo}" agregada; "${c.nombre}" queda desactivada con sus datos`);
    }
    this.editando.set(null);
  }

  alternar(c: CarreraCatalogo): void {
    this.aplicar(alternarCarrera(this.catalogo(), c.id),
      c.activa ? `"${c.nombre}" desactivada: ya no se ofrece al registrar` : `"${c.nombre}" activa otra vez`);
  }

  // ─── Grupos y grados ────────────────────────────────

  agregarGrupo(): void {
    const g = this.nuevoGrupo.trim().toUpperCase();
    if (this.aplicar(agregarGrupo(this.catalogo(), g), `Grupo ${g} agregado`)) this.nuevoGrupo = '';
  }

  quitarGrupo(g: string): void {
    this.aplicar(quitarGrupo(this.catalogo(), g), `Grupo ${g} quitado (los alumnos que lo tienen lo conservan)`);
  }

  guardarGrados(): void {
    const r = cambiarRangoGrados(this.catalogo(), this.gradoMin, this.gradoMax);
    if (!this.aplicar(r, `Grados: del ${this.gradoMin} al ${this.gradoMax}`)) {
      this.gradoMin = this.catalogo().gradoMin;
      this.gradoMax = this.catalogo().gradoMax;
    }
  }

  get gradosSinGuardar(): boolean {
    const c = this.catalogo();
    return Number(this.gradoMin) !== c.gradoMin || Number(this.gradoMax) !== c.gradoMax;
  }

  /** Guarda si salió bien, avisa y anota. Devuelve si se aplicó. */
  private aplicar(r: ResultadoEdicion, mensaje: string): boolean {
    if (!r.ok) {
      this.toast.warning(r.error);
      return false;
    }
    this.config.setCatalogoEscolar(r.catalogo as CatalogoEscolar);
    this.bitacora.registrar('catalogo-cambiado', mensaje);
    this.toast.success(mensaje);
    return true;
  }
}
