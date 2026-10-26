// ╔══════════════════════════════════════════════════════╗
// ║  sincronizacion.component.ts                         ║
// ║  Stenbrary — Fase 2.2.1 (bandeja con acciones)       ║
// ║                                                      ║
// ║  Bandeja de revisión: el coordinador ve cada fila    ║
// ║  pendiente, la filtra, la selecciona, decide si la   ║
// ║  descarta o la sube. Defense in depth: el SyncService║
// ║  hace el trabajo real — este componente solo         ║
// ║  presenta estado y dispara acciones.                 ║
// ║                                                      ║
// ║  Patrones:                                           ║
// ║  - Selección por tipo (no se mezclan IDs entre       ║
// ║    stores — un id de alumno y uno de registro pueden ║
// ║    coincidir aunque sea improbable).                 ║
// ║  - Filtro de texto sobre los 3 tipos a la vez.       ║
// ║  - Confirmación obligatoria antes de descartar.      ║
// ║  - Errores quedan visibles tras el upload para que   ║
// ║    el coordinador pueda revisar y reintentar.        ║
// ╚══════════════════════════════════════════════════════╝


import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { Alumno, Motivo, Registro } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import {
  SyncError,
  SyncService,
  SyncStore,
} from '../../core/services/sync.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type SelMap = Record<SyncStore, Set<string>>;

@Component({
    selector: 'app-sincronizacion',
    imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
],
    templateUrl: './sincronizacion.component.html',
    styleUrl: './sincronizacion.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SincronizacionComponent implements OnInit {
  protected readonly sync = inject(SyncService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  // ─── Estado de UI ────────────────────────────────────────
  protected readonly cargando = signal(true);
  protected readonly filtro = signal('');
  protected readonly seleccion = signal<SelMap>({
    motivos: new Set(),
    alumnos: new Set(),
    registros: new Set(),
  });
  protected readonly secciones = signal<Record<SyncStore, boolean>>({
    motivos: true,
    alumnos: true,
    registros: true,
  });
  /** Sección de descartados — colapsada por defecto (es la "papelera"). */
  protected readonly seccionDescartados = signal(false);
  /** Panel de errores visible tras un upload con fallos. */
  protected readonly mostrarErrores = signal(false);

  // ─── Derivados del SyncService ───────────────────────────
  protected readonly total = this.sync.totalPendientes;
  protected readonly conteos = this.sync.conteos;
  protected readonly progreso = this.sync.progreso;
  protected readonly subiendo = this.sync.subiendo;
  protected readonly errores = this.sync.ultimosErrores;

  // ─── Filtrado ───────────────────────────────────────────
  protected readonly motivosFiltrados = computed(() =>
    filtrarMotivos(this.sync.detalle().motivos, this.filtro()),
  );
  protected readonly alumnosFiltrados = computed(() =>
    filtrarAlumnos(this.sync.detalle().alumnos, this.filtro()),
  );
  protected readonly registrosFiltrados = computed(() =>
    filtrarRegistros(this.sync.detalle().registros, this.filtro()),
  );

  protected readonly filtroActivo = computed(() => this.filtro().trim().length > 0);

  protected readonly totalFiltrado = computed(() =>
    this.motivosFiltrados().length +
    this.alumnosFiltrados().length +
    this.registrosFiltrados().length,
  );

  // ─── Selección ──────────────────────────────────────────
  protected readonly totalSeleccionado = computed(() => {
    const s = this.seleccion();
    return s.motivos.size + s.alumnos.size + s.registros.size;
  });

  protected readonly progresoPct = computed(() => {
    const p = this.progreso();
    if (!p.activo || p.total === 0) return 0;
    return Math.round((p.procesadas / p.total) * 100);
  });

  protected readonly noHayPendientes = computed(() => this.total() === 0);

  // ─── Descartados (papelera con deshacer) ────────────────
  protected readonly totalDescartados = this.sync.totalDescartados;
  protected readonly descartados = this.sync.descartados;

  async ngOnInit(): Promise<void> {
    if (this.auth.isSignedIn()) {
      await this.sync.refrescar();
    }
    this.cargando.set(false);
  }

  // ─── Acciones generales ─────────────────────────────────

  protected async refrescar(): Promise<void> {
    this.cargando.set(true);
    await this.sync.refrescar();
    this.limpiarSeleccion();
    this.cargando.set(false);
  }

  protected irALogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/sincronizacion' },
    });
  }

  // ─── Toggle secciones (colapsar / expandir) ─────────────

  protected toggleSeccion(store: SyncStore): void {
    this.secciones.update(s => ({ ...s, [store]: !s[store] }));
  }

  protected toggleSeccionDescartados(): void {
    this.seccionDescartados.update(v => !v);
  }

  // ─── Restaurar descartados (deshacer descarte) ──────────

  protected async restaurarFila(store: SyncStore, id: string, label: string): Promise<void> {
    await this.sync.restaurar(store, [id]);
    this.toast.info(`"${label}" volvió a la bandeja de subida.`);
  }

  protected async restaurarTodos(): Promise<void> {
    const d = this.descartados();
    const total = this.totalDescartados();
    if (total === 0) return;

    const ok = await this.confirmar({
      titulo: `¿Restaurar ${total} descartado${total === 1 ? '' : 's'}?`,
      mensaje: 'Volverán a la bandeja de subida como pendientes.',
      variante: 'info',
      textoConfirmar: 'Restaurar todos',
    });
    if (!ok) return;

    await Promise.all([
      this.sync.restaurar('motivos', d.motivos.map(m => m.id!).filter(Boolean)),
      this.sync.restaurar('alumnos', d.alumnos.map(a => a.id!).filter(Boolean)),
      this.sync.restaurar('registros', d.registros.map(r => r.id)),
    ]);
    this.toast.info(`${total} cambio${total === 1 ? '' : 's'} restaurado${total === 1 ? '' : 's'}.`);
  }

  // ─── Selección ──────────────────────────────────────────

  protected toggleFila(store: SyncStore, id: string): void {
    this.seleccion.update(s => {
      const next: SelMap = {
        motivos: new Set(s.motivos),
        alumnos: new Set(s.alumnos),
        registros: new Set(s.registros),
      };
      const set = next[store];
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return next;
    });
  }

  protected estaSeleccionada(store: SyncStore, id: string): boolean {
    return this.seleccion()[store].has(id);
  }

  protected toggleTodoStore(store: SyncStore): void {
    const ids = this.idsVisibles(store);
    const sel = this.seleccion()[store];
    const todosSeleccionados = ids.length > 0 && ids.every(id => sel.has(id));

    this.seleccion.update(s => {
      const next: SelMap = {
        motivos: new Set(s.motivos),
        alumnos: new Set(s.alumnos),
        registros: new Set(s.registros),
      };
      if (todosSeleccionados) {
        ids.forEach(id => next[store].delete(id));
      } else {
        ids.forEach(id => next[store].add(id));
      }
      return next;
    });
  }

  protected todosVisiblesSeleccionados(store: SyncStore): boolean {
    const ids = this.idsVisibles(store);
    if (ids.length === 0) return false;
    const sel = this.seleccion()[store];
    return ids.every(id => sel.has(id));
  }

  protected algunoVisibleSeleccionado(store: SyncStore): boolean {
    const ids = this.idsVisibles(store);
    if (ids.length === 0) return false;
    const sel = this.seleccion()[store];
    return ids.some(id => sel.has(id)) && !ids.every(id => sel.has(id));
  }

  private idsVisibles(store: SyncStore): string[] {
    switch (store) {
      case 'motivos':
        return this.motivosFiltrados().map(m => m.id!).filter(Boolean);
      case 'alumnos':
        return this.alumnosFiltrados().map(a => a.id!).filter(Boolean);
      case 'registros':
        return this.registrosFiltrados().map(r => r.id);
    }
  }

  private limpiarSeleccion(): void {
    this.seleccion.set({
      motivos: new Set(),
      alumnos: new Set(),
      registros: new Set(),
    });
  }

  // ─── Descartar ──────────────────────────────────────────

  protected async descartarFila(store: SyncStore, id: string, label: string): Promise<void> {
    const ok = await this.confirmar({
      titulo: '¿Descartar este cambio?',
      mensaje:
        `"${label}" no se subirá al próximo batch. El dato local se conserva ` +
        `y volverá a aparecer aquí si lo editas de nuevo.`,
      textoConfirmar: 'Descartar',
    });
    if (!ok) return;

    await this.sync.descartar(store, [id]);
    this.seleccion.update(s => {
      const next: SelMap = { ...s };
      next[store] = new Set(s[store]);
      next[store].delete(id);
      return next;
    });
    this.toast.info('Cambio descartado.');
  }

  protected async descartarSeleccion(): Promise<void> {
    const sel = this.seleccion();
    const total = sel.motivos.size + sel.alumnos.size + sel.registros.size;
    if (total === 0) return;

    const ok = await this.confirmar({
      titulo: `¿Descartar ${total} ${total === 1 ? 'cambio' : 'cambios'}?`,
      mensaje:
        'Estas filas no se subirán al próximo batch. Los datos locales se conservan ' +
        'y volverán a aparecer aquí si se editan de nuevo.',
      textoConfirmar: 'Descartar',
    });
    if (!ok) return;

    await Promise.all([
      this.sync.descartar('motivos', Array.from(sel.motivos)),
      this.sync.descartar('alumnos', Array.from(sel.alumnos)),
      this.sync.descartar('registros', Array.from(sel.registros)),
    ]);
    this.limpiarSeleccion();
    this.toast.info(`${total} cambio${total === 1 ? '' : 's'} descartado${total === 1 ? '' : 's'}.`);
  }

  // ─── Subir ──────────────────────────────────────────────

  protected async subirFila(store: SyncStore, id: string, label: string): Promise<void> {
    // Confirmación: subir es deliberado (el modelo es sync supervisado) y
    // el botón vive junto a "descartar" — evita el clic equivocado.
    const ok = await this.confirmar({
      titulo: '¿Subir este cambio a la nube?',
      mensaje: `"${label}" se enviará al servidor ahora.`,
      variante: 'info',
      textoConfirmar: 'Subir',
    });
    if (!ok) return;
    await this.ejecutarSubida({ [store]: [id] } as { motivos?: string[]; alumnos?: string[]; registros?: string[] });
  }

  protected async subirSeleccion(): Promise<void> {
    const sel = this.seleccion();
    await this.ejecutarSubida({
      motivos: Array.from(sel.motivos),
      alumnos: Array.from(sel.alumnos),
      registros: Array.from(sel.registros),
    });
  }

  protected async subirTodo(): Promise<void> {
    const total = this.total();
    const ok = await this.confirmar({
      titulo: `¿Subir ${total} ${total === 1 ? 'cambio' : 'cambios'}?`,
      mensaje:
        'Se enviarán a la nube en orden seguro (motivos → alumnos → registros). ' +
        'Las filas con error se conservarán como pendientes para reintento.',
      variante: 'info',
      textoConfirmar: 'Subir todo',
    });
    if (!ok) return;

    try {
      const resultado = await this.sync.subirTodo();
      this.limpiarSeleccion();
      this.mostrarResultado(resultado);
    } catch (err) {
      this.toast.error((err as Error)?.message ?? 'No se pudo subir.');
    }
  }

  protected async subirFiltrados(): Promise<void> {
    const total = this.totalFiltrado();
    if (total === 0) return;

    const ok = await this.confirmar({
      titulo: `¿Subir ${total} ${total === 1 ? 'cambio filtrado' : 'cambios filtrados'}?`,
      mensaje:
        'Se enviarán a la nube solo las filas visibles con el filtro actual ' +
        '(en orden motivos → alumnos → registros).',
      variante: 'info',
      textoConfirmar: 'Subir filtrados',
    });
    if (!ok) return;

    await this.ejecutarSubida({
      motivos: this.motivosFiltrados().map(m => m.id!).filter(Boolean),
      alumnos: this.alumnosFiltrados().map(a => a.id!).filter(Boolean),
      registros: this.registrosFiltrados().map(r => r.id),
    });
  }

  private async ejecutarSubida(seleccion: {
    motivos?: string[];
    alumnos?: string[];
    registros?: string[];
  }): Promise<void> {
    try {
      const resultado = await this.sync.subir(seleccion);
      this.limpiarSeleccion();
      this.mostrarResultado(resultado);
    } catch (err) {
      this.toast.error((err as Error)?.message ?? 'No se pudo subir.');
    }
  }

  private mostrarResultado(r: { subidos: number; fallidos: number }): void {
    if (r.subidos === 0 && r.fallidos === 0) return;
    if (r.fallidos === 0) {
      this.toast.success(
        `${r.subidos} ${r.subidos === 1 ? 'cambio subido' : 'cambios subidos'} a la nube.`,
      );
      this.mostrarErrores.set(false);
      return;
    }
    if (r.subidos === 0) {
      this.toast.error(`${r.fallidos} ${r.fallidos === 1 ? 'cambio falló' : 'cambios fallaron'}. Revisa el detalle.`);
    } else {
      this.toast.warning(
        `${r.subidos} subido${r.subidos === 1 ? '' : 's'}, ${r.fallidos} con error.`,
      );
    }
    this.mostrarErrores.set(true);
  }

  protected cerrarPanelErrores(): void {
    this.mostrarErrores.set(false);
    this.sync.limpiarErrores();
  }

  // ─── Confirm dialog wrapper ─────────────────────────────

  private confirmar(data: {
    titulo: string;
    mensaje: string;
    variante?: 'danger' | 'warning' | 'info';
    textoConfirmar?: string;
  }): Promise<boolean> {
    return new Promise(resolve => {
      const ref = this.dialog.open(ConfirmDialogComponent, {
        width: '420px',
        data: { variante: 'warning', ...data },
      });
      ref.afterClosed().subscribe(ok => resolve(!!ok));
    });
  }

  // ─── Helpers de presentación ────────────────────────────

  protected nombreAlumno(a: Alumno): string {
    return `${a.nombre} ${a.apellidoPaterno}${a.apellidoMaterno ? ' ' + a.apellidoMaterno : ''}`.trim();
  }

  protected fechaCorta(fecha: Date | string): string {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected motivosResumen(r: Registro): string {
    const nombres = r.motivoNombres ?? (r.motivoNombre ? [r.motivoNombre] : []);
    if (nombres.length === 0) return '—';
    if (nombres.length === 1) return nombres[0];
    return `${nombres[0]} +${nombres.length - 1}`;
  }

  protected labelError(e: SyncError): string {
    const tipo = e.store === 'motivos' ? 'Motivo' : e.store === 'alumnos' ? 'Alumno' : 'Registro';
    return `${tipo} — ${e.label}`;
  }
}

// ─── Filtros (fuera de la clase, puros) ───────────────────

function filtrarMotivos(motivos: Motivo[], q: string): Motivo[] {
  const t = q.trim().toLowerCase();
  if (!t) return motivos;
  return motivos.filter(m =>
    m.nombre.toLowerCase().includes(t) ||
    (m.descripcion?.toLowerCase().includes(t) ?? false),
  );
}

function filtrarAlumnos(alumnos: Alumno[], q: string): Alumno[] {
  const t = q.trim().toLowerCase();
  if (!t) return alumnos;
  return alumnos.filter(a =>
    a.matricula.toLowerCase().includes(t) ||
    a.nombre.toLowerCase().includes(t) ||
    a.apellidoPaterno.toLowerCase().includes(t) ||
    (a.apellidoMaterno?.toLowerCase().includes(t) ?? false) ||
    a.carrera.toLowerCase().includes(t),
  );
}

function filtrarRegistros(registros: Registro[], q: string): Registro[] {
  const t = q.trim().toLowerCase();
  if (!t) return registros;
  return registros.filter(r =>
    r.matricula.toLowerCase().includes(t) ||
    r.nombreCompleto.toLowerCase().includes(t) ||
    r.carrera.toLowerCase().includes(t) ||
    r.motivoNombre.toLowerCase().includes(t) ||
    (r.motivoNombres?.some(n => n.toLowerCase().includes(t)) ?? false),
  );
}
