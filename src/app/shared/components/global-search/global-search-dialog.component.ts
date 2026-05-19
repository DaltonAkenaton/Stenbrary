// ╔══════════════════════════════════════════════════════╗
// ║  global-search-dialog.component.ts                   ║
// ║  Stenbrary v3.25.0 — Command palette completo         ║
// ║                                                      ║
// ║  3 tipos de resultado:                                ║
// ║   1. Comandos del CommandPaletteService (navegación,  ║
// ║      toggles de settings, acciones)                   ║
// ║   2. Alumnos (matrícula / nombre)                     ║
// ║   3. Registros del día (matrícula / nombre)           ║
// ║                                                      ║
// ║  Heurística de orden cuando hay query:                ║
// ║   - Comandos primero (suelen ser la intención         ║
// ║     explícita: "exportar respaldo", "modo quiosco")   ║
// ║   - Alumnos después                                    ║
// ║   - Registros del día al final                         ║
// ║                                                      ║
// ║  Cuando NO hay query: solo se muestran los comandos   ║
// ║  como "atajos sugeridos" (los 6 más comunes).         ║
// ║  Esto convierte el palette en una "central" del       ║
// ║  sistema, no solo un buscador.                        ║
// ╚══════════════════════════════════════════════════════╝

import { Component, ElementRef, HostListener, OnInit, ViewChild, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { DatabaseService } from '../../../core/services/database.service';
import { CommandPaletteService, Command } from '../../../core/services/command-palette.service';
import { Alumno, Registro } from '../../../core/models';

interface ItemComando {
  tipo: 'comando';
  comando: Command;
  label: string;
  descripcion: string;
}
interface ItemAlumno {
  tipo: 'alumno';
  alumno: Alumno;
}
interface ItemRegistro {
  tipo: 'registro';
  registro: Registro;
}
type Item = ItemComando | ItemAlumno | ItemRegistro;

@Component({
  selector: 'app-global-search-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  template: `
    <div class="palette">
      <div class="search-bar">
        <mat-icon class="search-icon">search</mat-icon>
        <input
          #searchInput
          type="text"
          [(ngModel)]="query"
          (ngModelChange)="onQuery()"
          placeholder="Buscar acciones, alumnos, matrículas, ajustes…"
          autocomplete="off"
          spellcheck="false" />
        @if (query) {
          <button class="clear-btn" (click)="limpiar()" aria-label="Limpiar">
            <mat-icon>close</mat-icon>
          </button>
        }
        <span class="shortcut-hint mono">Esc</span>
      </div>

      <div class="results" #resultsWrap>
        @if (cargando()) {
          <div class="empty">
            <mat-icon>hourglass_empty</mat-icon>
            <span>Buscando...</span>
          </div>
        } @else if (todos().length === 0) {
          <div class="empty">
            <mat-icon>search_off</mat-icon>
            <span>Sin coincidencias para "{{ query }}"</span>
          </div>
        } @else {
          @for (grupo of grupos(); track grupo.titulo) {
            <div class="group-title">{{ grupo.titulo }}</div>
            @for (item of grupo.items; track itemKey(item); let i = $index) {
              <button class="result-item"
                      [class.active]="indiceActivo() === item.__idx"
                      (click)="seleccionar(item.__idx)"
                      (mouseenter)="indiceActivo.set(item.__idx)">
                <mat-icon class="item-icon" [class.cmd-toggle]="esToggle(item)">
                  {{ iconoItem(item) }}
                </mat-icon>
                <div class="item-body">
                  <span class="item-title">{{ tituloItem(item) }}</span>
                  <span class="item-meta">{{ metaItem(item) }}</span>
                </div>
                <span class="item-tag" [attr.data-grupo]="grupo.titulo">{{ chipItem(item) }}</span>
                <mat-icon class="item-go">chevron_right</mat-icon>
              </button>
            }
          }
        }
      </div>

      <div class="footer-hint">
        <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
        <span><kbd>Enter</kbd> ejecutar</span>
        <span><kbd>Esc</kbd> cerrar</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .palette {
      display: flex; flex-direction: column;
      width: min(680px, 92vw);
      max-height: 70vh;
      background: #0F1B2C;
      border-radius: 14px; overflow: hidden;
    }

    .search-bar {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(0, 200, 215, 0.10);

      input {
        flex: 1; background: transparent; border: none; outline: none;
        font-family: 'DM Sans', sans-serif; font-size: 1rem; color: #E8F4F8;
        &::placeholder { color: rgba(200,230,240,.35); }
      }
    }
    .search-icon { font-size: 20px; width: 20px; height: 20px; color: #00C8D7; }
    .clear-btn {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px;
      background: transparent; border: none; color: rgba(200,230,240,.5);
      cursor: pointer; border-radius: 6px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { background: rgba(255,255,255,.05); }
    }
    .shortcut-hint {
      padding: 2px 6px; font-size: .68rem;
      background: rgba(0, 200, 215, 0.08);
      border: 1px solid rgba(0, 200, 215, 0.15);
      border-radius: 4px; color: rgba(0, 200, 215, 0.65);
      font-family: 'Space Mono', monospace;
    }
    .mono { font-family: 'Space Mono', monospace; }

    .results {
      flex: 1; overflow-y: auto; padding: 6px 0;
      min-height: 160px;
    }

    .group-title {
      padding: 10px 18px 4px;
      font-size: .68rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .08em;
      color: rgba(200,230,240,.35);
    }

    .result-item {
      display: flex; align-items: center; gap: 12px;
      width: 100%; padding: 10px 18px;
      background: transparent; border: none;
      font-family: inherit; color: #E8F4F8;
      cursor: pointer; text-align: left;
      transition: background 120ms;

      &.active { background: rgba(0, 200, 215, 0.10); }
      .item-go { opacity: 0; }
      &.active .item-go { opacity: 0.7; }
    }
    .item-icon {
      font-size: 22px; width: 22px; height: 22px;
      color: rgba(0, 200, 215, 0.7); flex-shrink: 0;
      &.cmd-toggle { color: #F5A623; }
    }
    .item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .item-title {
      font-size: .92rem; font-weight: 600; color: #E8F4F8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .item-meta {
      font-size: .75rem; color: rgba(200,230,240,.5);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .item-tag {
      padding: 2px 8px;
      font-size: .65rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em;
      border-radius: 6px;
      flex-shrink: 0;
      background: rgba(255,255,255,.04);
      color: rgba(200,230,240,.45);
      border: 1px solid rgba(255,255,255,.06);

      &[data-grupo="Navegación"]    { background: rgba(0, 200, 215, .08); color: rgba(0, 200, 215, .75); border-color: rgba(0, 200, 215, .15); }
      &[data-grupo="Configuración"] { background: rgba(245, 166, 35, .08); color: #F5A623; border-color: rgba(245, 166, 35, .15); }
      &[data-grupo="Acciones"]      { background: rgba(11, 196, 183, .08); color: #0BC4B7; border-color: rgba(11, 196, 183, .15); }
      &[data-grupo="Alumnos"]       { background: rgba(139, 92, 246, .08); color: #8B5CF6; border-color: rgba(139, 92, 246, .15); }
      &[data-grupo="Registros de hoy"] { background: rgba(200, 230, 240, .04); color: rgba(200,230,240,.5); }
    }
    .item-go {
      font-size: 16px; width: 16px; height: 16px;
      color: #00C8D7; transition: opacity 150ms;
      flex-shrink: 0;
    }

    .empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 40px 20px; color: rgba(200,230,240,.4);
      text-align: center;
      mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: .5; }
      span { font-size: .85rem; }
    }

    .footer-hint {
      display: flex; gap: 14px; align-items: center;
      padding: 10px 18px;
      background: rgba(0, 0, 0, 0.18);
      border-top: 1px solid rgba(0, 200, 215, 0.06);
      font-size: .72rem; color: rgba(200,230,240,.4);
      span { display: inline-flex; align-items: center; gap: 4px; }
      kbd {
        padding: 1px 5px;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 3px;
        font-family: 'Space Mono', monospace; font-size: .66rem;
      }
    }

    @media (max-width: 480px) {
      .palette { max-height: 88vh; }
      .footer-hint { display: none; }
      .item-tag { display: none; }
    }
  `],
})
export class GlobalSearchDialogComponent implements OnInit {
  @ViewChild('searchInput', { static: true }) searchInput!: ElementRef<HTMLInputElement>;

  private dialogRef = inject<MatDialogRef<GlobalSearchDialogComponent>>(MatDialogRef);
  private databaseService = inject(DatabaseService);
  private commandPalette = inject(CommandPaletteService);
  private router = inject(Router);

  query = '';
  cargando = signal(false);
  alumnos: Alumno[] = [];
  registrosHoy: Registro[] = [];
  comandos: Command[] = [];

  // Resultados crudos por sección
  resultadosComandos = signal<ItemComando[]>([]);
  resultadosAlumnos = signal<ItemAlumno[]>([]);
  resultadosRegistros = signal<ItemRegistro[]>([]);

  // Lista plana en orden de render (con __idx asignado para la navegación con teclado)
  todos = computed<(Item & { __idx: number })[]>(() => {
    const lista: (Item & { __idx: number })[] = [];
    let i = 0;
    for (const c of this.resultadosComandos()) lista.push({ ...c, __idx: i++ });
    for (const a of this.resultadosAlumnos())  lista.push({ ...a, __idx: i++ });
    for (const r of this.resultadosRegistros())lista.push({ ...r, __idx: i++ });
    return lista;
  });

  // Agrupado para el template
  grupos = computed(() => {
    const cmds = this.resultadosComandos();
    const alumnos = this.resultadosAlumnos();
    const regs = this.resultadosRegistros();
    const out: { titulo: string; items: (Item & { __idx: number })[] }[] = [];

    let i = 0;
    if (cmds.length > 0) {
      const porGrupo = new Map<string, (Item & { __idx: number })[]>();
      for (const c of cmds) {
        const grupo = c.comando.grupo;
        if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
        porGrupo.get(grupo)!.push({ ...c, __idx: i++ });
      }
      // Orden visual de los grupos de comando
      const ordenGrupos = ['Acciones', 'Configuración', 'Navegación'];
      for (const g of ordenGrupos) {
        const items = porGrupo.get(g);
        if (items?.length) out.push({ titulo: g, items });
      }
    }

    if (alumnos.length > 0) {
      out.push({
        titulo: 'Alumnos',
        items: alumnos.map(a => ({ ...a, __idx: i++ })),
      });
    }

    if (regs.length > 0) {
      out.push({
        titulo: 'Registros de hoy',
        items: regs.map(r => ({ ...r, __idx: i++ })),
      });
    }

    return out;
  });

  indiceActivo = signal(0);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.dialogRef.addPanelClass('global-search-panel');
  }

  async ngOnInit(): Promise<void> {
    this.cargando.set(true);
    try {
      // Comandos sincrónico — no requiere I/O
      this.comandos = this.commandPalette.getCommands();

      const [alumnos, regs] = await Promise.all([
        this.databaseService.obtenerTodosLosAlumnos(),
        this.databaseService.obtenerRegistrosDeHoy(),
      ]);
      this.alumnos = alumnos;
      this.registrosHoy = regs;
    } finally {
      this.cargando.set(false);
    }

    // Estado inicial: mostrar 6 comandos como sugerencias rápidas
    this.aplicarFiltro();

    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  onQuery(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.aplicarFiltro(), 80);
  }

  private aplicarFiltro(): void {
    const qRaw = this.query.trim().toLowerCase();
    const q = this.normalizar(qRaw);

    // ─── Comandos ──────────────────────────────────
    if (!q) {
      // Sin query: muestra los 6 más útiles (toggles + acciones más frecuentes).
      const sugeridos = this.comandos.filter(c =>
        c.tipo === 'toggle' || c.id === 'accion-exportar-backup'
      );
      this.resultadosComandos.set(this.aMaterializar(sugeridos.slice(0, 6)));
    } else {
      const filtrados = this.comandos.filter(c => {
        const label = this.normalizar(this.eval(c.label));
        const desc = c.descripcion ? this.normalizar(this.eval(c.descripcion)) : '';
        return (
          label.includes(q) ||
          desc.includes(q) ||
          c.keywords.some(k => k.includes(q))
        );
      });
      this.resultadosComandos.set(this.aMaterializar(filtrados.slice(0, 8)));
    }

    // ─── Alumnos ───────────────────────────────────
    if (!q) {
      this.resultadosAlumnos.set([]);
    } else {
      const alumnos = this.alumnos
        .filter(a => {
          const completo = this.normalizar(
            `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`,
          );
          return (
            a.matricula.toLowerCase().includes(q) ||
            completo.includes(q)
          );
        })
        .slice(0, 6)
        .map(alumno => ({ tipo: 'alumno', alumno } as ItemAlumno));
      this.resultadosAlumnos.set(alumnos);
    }

    // ─── Registros del día ─────────────────────────
    if (!q) {
      this.resultadosRegistros.set([]);
    } else {
      const registros = this.registrosHoy
        .filter(r =>
          r.matricula.toLowerCase().includes(q) ||
          this.normalizar(r.nombreCompleto).includes(q),
        )
        .slice(0, 4)
        .map(registro => ({ tipo: 'registro', registro } as ItemRegistro));
      this.resultadosRegistros.set(registros);
    }

    this.indiceActivo.set(0);
  }

  /** Resuelve label/descripcion materializando funciones a string. */
  private aMaterializar(cs: Command[]): ItemComando[] {
    return cs.map(comando => ({
      tipo: 'comando',
      comando,
      label: this.eval(comando.label),
      descripcion: comando.descripcion ? this.eval(comando.descripcion) : '',
    } as ItemComando));
  }

  private eval(v: string | (() => string)): string {
    return typeof v === 'function' ? v() : v;
  }

  /** Quita acentos para búsqueda fuzzy. */
  private normalizar(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  async seleccionar(indice: number): Promise<void> {
    const item = this.todos()[indice];
    if (!item) return;

    if (item.tipo === 'comando') {
      // Cerramos primero para que el toast del comando sea visible.
      this.dialogRef.close();
      try {
        await item.comando.ejecutar();
      } catch (err) {
        console.error('Error ejecutando comando', item.comando.id, err);
      }
      return;
    }

    if (item.tipo === 'alumno') {
      void this.router.navigate(['/detalle-alumno', item.alumno.matricula]);
    } else {
      void this.router.navigate(['/detalle-alumno', item.registro.matricula]);
    }
    this.dialogRef.close();
  }

  limpiar(): void {
    this.query = '';
    this.aplicarFiltro();
    this.searchInput?.nativeElement.focus();
  }

  // ─── Helpers para el template ──────────────────
  itemKey(item: Item): string {
    if (item.tipo === 'comando') return `c-${item.comando.id}`;
    if (item.tipo === 'alumno') return `a-${item.alumno.id}`;
    return `r-${item.registro.id}`;
  }

  iconoItem(item: Item): string {
    if (item.tipo === 'comando') return item.comando.icono;
    if (item.tipo === 'alumno') return 'account_circle';
    return 'receipt_long';
  }

  esToggle(item: Item): boolean {
    return item.tipo === 'comando' && item.comando.tipo === 'toggle';
  }

  tituloItem(item: Item): string {
    if (item.tipo === 'comando') return item.label;
    if (item.tipo === 'alumno') {
      const a = item.alumno;
      return `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`;
    }
    return item.registro.nombreCompleto;
  }

  metaItem(item: Item): string {
    if (item.tipo === 'comando') return item.descripcion;
    if (item.tipo === 'alumno') {
      const a = item.alumno;
      return `${a.matricula} · ${a.carrera} · Grupo ${a.grado}${a.grupo}`;
    }
    const r = item.registro;
    const hora = new Date(r.fechaHora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${r.matricula} · ${hora} · ${r.motivoNombre}`;
  }

  chipItem(item: Item): string {
    if (item.tipo === 'comando') return item.comando.grupo;
    if (item.tipo === 'alumno') return 'Alumno';
    return 'Hoy';
  }

  @HostListener('document:keydown', ['$event'])
  handleKey(ev: KeyboardEvent): void {
    const total = this.todos().length;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (total === 0) return;
      this.indiceActivo.update(i => (i + 1) % total);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (total === 0) return;
      this.indiceActivo.update(i => (i - 1 + total) % total);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      if (total > 0) void this.seleccionar(this.indiceActivo());
    } else if (ev.key === 'Escape') {
      this.dialogRef.close();
    }
  }
}
