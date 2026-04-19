// ╔══════════════════════════════════════════════════════╗
// ║  global-search-dialog.component.ts                   ║
// ║  Stenbrary v3.11.0 — Búsqueda global (command palette)║
// ║                                                      ║
// ║  - Busca alumnos (nombre/matrícula) y registros del  ║
// ║   día (nombre/matrícula) en una sola caja            ║
// ║  - Navegación con flechas, Enter confirma, Esc cierra║
// ╚══════════════════════════════════════════════════════╝

import { Component, ElementRef, HostListener, OnInit, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { DatabaseService } from '../../../core/services/database.service';
import { Alumno, Registro } from '../../../core/models';

interface ResultadoAlumno {
  tipo: 'alumno';
  alumno: Alumno;
}

interface ResultadoRegistro {
  tipo: 'registro';
  registro: Registro;
}

type Resultado = ResultadoAlumno | ResultadoRegistro;

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
          placeholder="Buscar alumnos, matrículas o registros recientes..."
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
        } @else if (!query.trim()) {
          <div class="empty hint">
            <mat-icon>search</mat-icon>
            <span>Escribe para buscar alumnos o registros del día</span>
          </div>
        } @else if (resultados().length === 0) {
          <div class="empty">
            <mat-icon>search_off</mat-icon>
            <span>Sin coincidencias para "{{ query }}"</span>
          </div>
        } @else {
          @if (resultadosAlumnos().length > 0) {
            <div class="group-title">Alumnos</div>
            @for (r of resultadosAlumnos(); track r.alumno.id; let i = $index) {
              <button class="result-item"
                      [class.active]="indiceActivo() === offsetAlumno() + i"
                      (click)="seleccionar(offsetAlumno() + i)"
                      (mouseenter)="indiceActivo.set(offsetAlumno() + i)">
                <mat-icon class="item-icon">account_circle</mat-icon>
                <div class="item-body">
                  <span class="item-title">{{ r.alumno.nombre }} {{ r.alumno.apellidoPaterno }} {{ r.alumno.apellidoMaterno }}</span>
                  <span class="item-meta">
                    <span class="mono">{{ r.alumno.matricula }}</span>
                    &nbsp;·&nbsp; {{ r.alumno.carrera }} · Grupo {{ r.alumno.grado }}{{ r.alumno.grupo }}
                  </span>
                </div>
                <mat-icon class="item-go">chevron_right</mat-icon>
              </button>
            }
          }

          @if (resultadosRegistros().length > 0) {
            <div class="group-title">Registros de hoy</div>
            @for (r of resultadosRegistros(); track r.registro.id; let i = $index) {
              <button class="result-item"
                      [class.active]="indiceActivo() === offsetRegistro() + i"
                      (click)="seleccionar(offsetRegistro() + i)"
                      (mouseenter)="indiceActivo.set(offsetRegistro() + i)">
                <mat-icon class="item-icon">receipt_long</mat-icon>
                <div class="item-body">
                  <span class="item-title">{{ r.registro.nombreCompleto }}</span>
                  <span class="item-meta">
                    <span class="mono">{{ r.registro.matricula }}</span>
                    &nbsp;·&nbsp; {{ formatearHora(r.registro.fechaHora) }}
                    &nbsp;·&nbsp; {{ r.registro.motivoNombre }}
                  </span>
                </div>
                <mat-icon class="item-go">chevron_right</mat-icon>
              </button>
            }
          }
        }
      </div>

      <div class="footer-hint">
        <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
        <span><kbd>Enter</kbd> abrir</span>
        <span><kbd>Esc</kbd> cerrar</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .palette {
      display: flex; flex-direction: column;
      width: min(640px, 92vw);
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
      min-height: 120px;
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
    .item-go {
      font-size: 16px; width: 16px; height: 16px;
      color: #00C8D7; transition: opacity 150ms;
    }

    .empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 40px 20px; color: rgba(200,230,240,.4);
      text-align: center;
      mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: .5; }
      &.hint mat-icon { color: #00C8D7; opacity: .6; }
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
    }
  `],
})
export class GlobalSearchDialogComponent implements OnInit {
  @ViewChild('searchInput', { static: true }) searchInput!: ElementRef<HTMLInputElement>;

  query = '';
  cargando = signal(false);
  alumnos: Alumno[] = [];
  registrosHoy: Registro[] = [];

  resultadosAlumnos = signal<ResultadoAlumno[]>([]);
  resultadosRegistros = signal<ResultadoRegistro[]>([]);

  resultados = computed<Resultado[]>(() => [
    ...this.resultadosAlumnos(),
    ...this.resultadosRegistros(),
  ]);

  offsetAlumno = () => 0;
  offsetRegistro = () => this.resultadosAlumnos().length;

  indiceActivo = signal(0);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private dialogRef: MatDialogRef<GlobalSearchDialogComponent>,
    private databaseService: DatabaseService,
    private router: Router,
  ) {
    this.dialogRef.addPanelClass('global-search-panel');
  }

  async ngOnInit(): Promise<void> {
    this.cargando.set(true);
    try {
      const [alumnos, regs] = await Promise.all([
        this.databaseService.obtenerTodosLosAlumnos(),
        this.databaseService.obtenerRegistrosDeHoy(),
      ]);
      this.alumnos = alumnos;
      this.registrosHoy = regs;
    } finally {
      this.cargando.set(false);
    }

    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  onQuery(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.ejecutarBusqueda(), 80);
  }

  private ejecutarBusqueda(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.resultadosAlumnos.set([]);
      this.resultadosRegistros.set([]);
      this.indiceActivo.set(0);
      return;
    }

    const alumnos = this.alumnos
      .filter(a => {
        const completo = `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`.toLowerCase();
        return (
          a.matricula.toLowerCase().includes(q) ||
          a.nombre.toLowerCase().includes(q) ||
          a.apellidoPaterno.toLowerCase().includes(q) ||
          a.apellidoMaterno.toLowerCase().includes(q) ||
          completo.includes(q)
        );
      })
      .slice(0, 8)
      .map(a => ({ tipo: 'alumno', alumno: a } as ResultadoAlumno));

    const registros = this.registrosHoy
      .filter(r =>
        r.matricula.toLowerCase().includes(q) ||
        r.nombreCompleto.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map(r => ({ tipo: 'registro', registro: r } as ResultadoRegistro));

    this.resultadosAlumnos.set(alumnos);
    this.resultadosRegistros.set(registros);
    this.indiceActivo.set(0);
  }

  seleccionar(indice: number): void {
    const res = this.resultados()[indice];
    if (!res) return;

    if (res.tipo === 'alumno') {
      this.router.navigate(['/detalle-alumno', res.alumno.matricula]);
    } else {
      this.router.navigate(['/detalle-alumno', res.registro.matricula]);
    }
    this.dialogRef.close();
  }

  limpiar(): void {
    this.query = '';
    this.onQuery();
    this.searchInput?.nativeElement.focus();
  }

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  @HostListener('document:keydown', ['$event'])
  handleKey(ev: KeyboardEvent): void {
    const total = this.resultados().length;
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
      if (total > 0) this.seleccionar(this.indiceActivo());
    } else if (ev.key === 'Escape') {
      this.dialogRef.close();
    }
  }
}
