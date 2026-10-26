// ╔══════════════════════════════════════════════════════╗
// ║  keyboard-shortcuts-dialog.component.ts              ║
// ║  Stenbrary v3.12.0 — Referencia de atajos            ║
// ║                                                      ║
// ║  Lista los atajos globales del sistema.              ║
// ║  Se abre con `?` o clic en el icono de ayuda.         ║
// ╚══════════════════════════════════════════════════════╝

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

interface Atajo {
  keys: string[];
  descripcion: string;
}

interface GrupoAtajos {
  titulo: string;
  atajos: Atajo[];
}

@Component({
    selector: 'app-keyboard-shortcuts-dialog',
    imports: [CommonModule, MatDialogModule, MatIconModule],
    template: `
    <div class="ks-container">
      <div class="ks-header">
        <div class="ks-title">
          <mat-icon>keyboard</mat-icon>
          <h2>Atajos de teclado</h2>
        </div>
        <button class="ks-close" (click)="cerrar()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="ks-body">
        @for (grupo of grupos; track grupo.titulo) {
          <div class="ks-group">
            <h3>{{ grupo.titulo }}</h3>
            <ul>
              @for (atajo of grupo.atajos; track atajo.descripcion) {
                <li>
                  <span class="ks-desc">{{ atajo.descripcion }}</span>
                  <span class="ks-keys">
                    @for (k of atajo.keys; track $index; let isLast = $last) {
                      <kbd>{{ k }}</kbd>
                      @if (!isLast) { <span class="ks-plus">+</span> }
                    }
                  </span>
                </li>
              }
            </ul>
          </div>
        }
      </div>

      <div class="ks-footer">
        <mat-icon>info</mat-icon>
        <span>Los atajos se desactivan en modo quiosco para evitar navegación accidental.</span>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      width: min(540px, 92vw);
    }

    .ks-container {
      background: linear-gradient(160deg, #0D1626 0%, #080E1A 100%);
      border: 1px solid rgba(0, 200, 215, 0.18);
      border-radius: 14px;
      color: #E8F4F8;
      overflow: hidden;
      font-family: 'DM Sans', system-ui, sans-serif;
    }

    .ks-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid rgba(0, 200, 215, 0.12);
    }

    .ks-title {
      display: flex;
      align-items: center;
      gap: 10px;

      h2 {
        margin: 0;
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.05rem;
        letter-spacing: 0.02em;
      }
      mat-icon { color: #00C8D7; }
    }

    .ks-close {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: rgba(200, 230, 240, 0.52);
      border-radius: 50%;
      cursor: pointer;
      display: grid;
      place-items: center;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #E8F4F8;
      }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .ks-body {
      padding: 10px 20px 20px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .ks-group {
      margin-top: 18px;

      h3 {
        margin: 0 0 10px;
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(200, 230, 240, 0.55);
      }
      ul { list-style: none; padding: 0; margin: 0; }

      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 0;
        border-bottom: 1px dashed rgba(0, 200, 215, 0.08);
        font-size: 0.88rem;

        &:last-child { border-bottom: none; }
      }
    }

    .ks-desc { color: rgba(232, 244, 248, 0.9); }

    .ks-keys {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    kbd {
      display: inline-block;
      padding: 3px 8px;
      font-family: 'Space Mono', monospace;
      font-size: 0.72rem;
      background: rgba(0, 200, 215, 0.08);
      color: #5DE4EC;
      border: 1px solid rgba(0, 200, 215, 0.22);
      border-bottom-width: 2px;
      border-radius: 5px;
      letter-spacing: 0.02em;
      min-width: 22px;
      text-align: center;
    }

    .ks-plus {
      font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.52);
    }

    .ks-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: rgba(0, 200, 215, 0.04);
      border-top: 1px solid rgba(0, 200, 215, 0.10);
      font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.68);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #00C8D7;
      }
    }

    @media (max-width: 576px) {
      .ks-body li {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
    }
  `]
})
export class KeyboardShortcutsDialogComponent {
  private dialogRef = inject<MatDialogRef<KeyboardShortcutsDialogComponent>>(MatDialogRef);

  grupos: GrupoAtajos[] = [
    {
      titulo: 'Búsqueda y ayuda',
      atajos: [
        { keys: ['Ctrl', 'K'], descripcion: 'Abrir búsqueda global (alumnos y registros)' },
        { keys: ['?'], descripcion: 'Abrir esta ayuda' },
        { keys: ['Esc'], descripcion: 'Cerrar diálogos abiertos' },
      ],
    },
    {
      titulo: 'Navegación rápida',
      atajos: [
        { keys: ['Alt', '1'], descripcion: 'Escáner (registro de entrada)' },
        { keys: ['Alt', '2'], descripcion: 'Resumen' },
        { keys: ['Alt', '3'], descripcion: 'Alumnos' },
        { keys: ['Alt', '4'], descripcion: 'Registros' },
        { keys: ['Alt', '5'], descripcion: 'Estadísticas' },
        { keys: ['Alt', '6'], descripcion: 'En Biblioteca (si módulo activo)' },
        { keys: ['Alt', '0'], descripcion: 'Configuración' },
      ],
    },
  ];

  cerrar(): void {
    this.dialogRef.close();
  }
}
