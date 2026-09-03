// ╔══════════════════════════════════════════════════════╗
// ║  novedades.component.ts                              ║
// ║  Stenbrary v3.8.0 — Historial de versiones           ║
// ║                                                      ║
// ║  Vista pública del CHANGELOG. Inspirada en los       ║
// ║  release notes de VS Code / Linear / Notion.         ║
// ║                                                      ║
// ║  - Timeline vertical con todas las versiones          ║
// ║  - Última release expandida por default               ║
// ║  - Chips de color por tipo de cambio                  ║
// ║  - Marca automáticamente como "vista" al entrar      ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChangelogService } from '../../core/services/changelog.service';
import { TipoCambio } from '../../core/data/changelog.data';

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="novedades-container">

      <!-- HEADER -->
      <div class="page-header">
        <div class="header-icon">
          <mat-icon>campaign</mat-icon>
        </div>
        <div>
          <h1>Novedades del sistema</h1>
          <p class="subtitle">
            Historial completo de cambios, mejoras y correcciones
          </p>
        </div>
      </div>

      <!-- TIMELINE -->
      <div class="timeline">
        @for (version of changelogService.historial; track version.version; let primero = $first) {
          <article class="release-card"
                   [class.destacado]="version.destacado"
                   [class.expandido]="estaExpandido(version.version)">

            <!-- Cabecera de release -->
            <header class="release-header" (click)="toggle(version.version)">
              <div class="release-version">
                <span class="version-label">v{{ version.version }}</span>
                @if (version.destacado) {
                  <span class="badge-destacado">Mayor</span>
                }
                @if (primero) {
                  <span class="badge-actual">Versión actual</span>
                }
              </div>

              <div class="release-titulo-row">
                @if (version.titulo) {
                  <h2 class="release-titulo">{{ version.titulo }}</h2>
                }
                <span class="release-fecha">
                  <mat-icon>event</mat-icon>
                  {{ formatearFecha(version.fecha) }}
                </span>
              </div>

              <button class="toggle-btn"
                      [matTooltip]="estaExpandido(version.version) ? 'Contraer' : 'Expandir'">
                <mat-icon>{{ estaExpandido(version.version) ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
            </header>

            <!-- Cuerpo (visible si expandido) -->
            @if (estaExpandido(version.version)) {
              <div class="release-body">

                @if (version.resumen) {
                  <p class="release-resumen">{{ version.resumen }}</p>
                }

                <ul class="cambios-lista">
                  @for (cambio of version.cambios; track $index) {
                    <li class="cambio-item">
                      <span class="chip-tipo" [attr.data-tipo]="cambio.tipo">
                        <mat-icon>{{ iconoPorTipo(cambio.tipo) }}</mat-icon>
                        {{ etiquetaPorTipo(cambio.tipo) }}
                      </span>
                      <span class="cambio-texto">{{ cambio.texto }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
          </article>
        }
      </div>

      <!-- FOOTER -->
      <footer class="novedades-footer">
        <mat-icon>info</mat-icon>
        <span>
          Cada vez que el sistema se actualice automáticamente, esta sección reflejará
          las nuevas funcionalidades, mejoras y correcciones.
        </span>
      </footer>

    </div>
  `,
  styles: [`
    .novedades-container {
      max-width: 920px;
      margin: 0 auto;
      padding: 28px 24px 60px;
    }

    /* ── HEADER ── */
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }

    .header-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(0, 200, 215, 0.10);
      border: 1px solid rgba(0, 200, 215, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        color: #00C8D7;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
    }

    h1 {
      margin: 0;
      color: #E8F4F8;
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .subtitle {
      margin: 4px 0 0;
      color: rgba(200, 230, 240, 0.55);
      font-size: 0.92rem;
    }

    /* ── TIMELINE ── */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 11px;
        top: 24px;
        bottom: 24px;
        width: 2px;
        background: linear-gradient(180deg,
          rgba(0, 200, 215, 0.30),
          rgba(0, 200, 215, 0.05));
      }
    }

    .release-card {
      position: relative;
      padding: 20px 22px 20px 44px;
      background: #142033;
      border: 1px solid rgba(0, 200, 215, 0.15);
      border-radius: 14px;
      transition: border-color .25s, transform .15s;

      &::before {
        content: '';
        position: absolute;
        left: 5px;
        top: 28px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #142033;
        border: 3px solid rgba(0, 200, 215, 0.40);
      }

      &.destacado {
        border-color: rgba(0, 200, 215, 0.40);
        background: linear-gradient(135deg, #142033 0%, #1a2a42 100%);
        &::before {
          border-color: #00C8D7;
          box-shadow: 0 0 0 4px rgba(0, 200, 215, 0.15);
        }
      }
    }

    /* ── HEADER DE RELEASE ── */
    .release-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      user-select: none;
    }

    .release-version {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .version-label {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 1.05rem;
      font-weight: 700;
      color: #00C8D7;
      background: rgba(0, 200, 215, 0.08);
      padding: 4px 10px;
      border-radius: 7px;
      border: 1px solid rgba(0, 200, 215, 0.20);
    }

    .badge-destacado {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #FFC36E;
      background: rgba(245, 166, 35, 0.12);
      padding: 3px 8px;
      border-radius: 5px;
      border: 1px solid rgba(245, 166, 35, 0.30);
    }

    .badge-actual {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #0BC4B7;
      background: rgba(11, 196, 183, 0.12);
      padding: 3px 8px;
      border-radius: 5px;
      border: 1px solid rgba(11, 196, 183, 0.30);
    }

    .release-titulo-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .release-titulo {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #E8F4F8;
      letter-spacing: -0.01em;
    }

    .release-fecha {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.55);
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .toggle-btn {
      background: rgba(0, 200, 215, 0.06);
      border: 1px solid rgba(0, 200, 215, 0.15);
      color: #00C8D7;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .2s;
      &:hover { background: rgba(0, 200, 215, 0.14); }
    }

    /* ── BODY DE RELEASE ── */
    .release-body {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid rgba(0, 200, 215, 0.10);
      animation: fadeIn .25s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .release-resumen {
      margin: 0 0 20px;
      padding: 14px 16px;
      background: rgba(0, 200, 215, 0.05);
      border-left: 3px solid rgba(0, 200, 215, 0.40);
      border-radius: 8px;
      color: rgba(232, 244, 248, 0.85);
      font-size: 0.92rem;
      line-height: 1.55;
    }

    .cambios-lista {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cambio-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.06);
      border-radius: 10px;
    }

    .cambio-texto {
      flex: 1;
      font-size: 0.9rem;
      line-height: 1.55;
      color: #E8F4F8;
    }

    /* ── CHIPS POR TIPO ── */
    .chip-tipo {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 4px 9px 4px 7px;
      border-radius: 6px;
      white-space: nowrap;
      mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
      }

      &[data-tipo="feat"] {
        color: #0BC4B7;
        background: rgba(11, 196, 183, 0.10);
        border: 1px solid rgba(11, 196, 183, 0.25);
      }
      &[data-tipo="fix"] {
        color: #FFC36E;
        background: rgba(245, 166, 35, 0.10);
        border: 1px solid rgba(245, 166, 35, 0.25);
      }
      &[data-tipo="mejora"] {
        color: #00C8D7;
        background: rgba(0, 200, 215, 0.10);
        border: 1px solid rgba(0, 200, 215, 0.25);
      }
      &[data-tipo="cambio"] {
        color: rgba(200, 230, 240, 0.65);
        background: rgba(200, 230, 240, 0.06);
        border: 1px solid rgba(200, 230, 240, 0.15);
      }
    }

    /* ── FOOTER ── */
    .novedades-footer {
      margin-top: 36px;
      padding: 16px 20px;
      background: rgba(0, 200, 215, 0.04);
      border: 1px dashed rgba(0, 200, 215, 0.20);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(200, 230, 240, 0.60);
      font-size: 0.85rem;
      line-height: 1.5;
      mat-icon {
        color: #00C8D7;
        flex-shrink: 0;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 640px) {
      .novedades-container { padding: 20px 16px 50px; }
      .release-card { padding: 16px 16px 16px 38px; }
      .release-header {
        grid-template-columns: 1fr auto;
      }
      .release-version { grid-column: 1 / -1; }
      .release-titulo { font-size: 1rem; }
      .cambio-item { flex-direction: column; gap: 8px; }
      .chip-tipo { align-self: flex-start; }
    }
  `],
})
export class NovedadesComponent implements OnInit {

  /** Set de versiones expandidas (por defecto solo la más reciente). */
  private _expandidas = signal(new Set<string>());

  constructor(public changelogService: ChangelogService) {}

  ngOnInit(): void {
    // Expandir la versión más reciente por default
    const primera = this.changelogService.historial[0];
    if (primera) {
      this._expandidas.set(new Set([primera.version]));
    }
    // Marcar como vista (oculta el badge)
    this.changelogService.marcarComoVista();
  }

  estaExpandido(version: string): boolean {
    return this._expandidas().has(version);
  }

  toggle(version: string): void {
    const set = new Set(this._expandidas());
    if (set.has(version)) {
      set.delete(version);
    } else {
      set.add(version);
    }
    this._expandidas.set(set);
  }

  iconoPorTipo(tipo: TipoCambio): string {
    switch (tipo) {
      case 'feat':   return 'auto_awesome';
      case 'fix':    return 'bug_report';
      case 'mejora': return 'tune';
      case 'cambio': return 'swap_horiz';
    }
  }

  etiquetaPorTipo(tipo: TipoCambio): string {
    switch (tipo) {
      case 'feat':   return 'Nuevo';
      case 'fix':    return 'Corregido';
      case 'mejora': return 'Mejora';
      case 'cambio': return 'Cambio';
    }
  }

  formatearFecha(fechaIso: string): string {
    const fecha = new Date(fechaIso + 'T00:00:00');
    return fecha.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
