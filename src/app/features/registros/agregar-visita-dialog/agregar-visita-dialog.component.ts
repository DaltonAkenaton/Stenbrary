// ╔══════════════════════════════════════════════════════╗
// ║  agregar-visita-dialog.component.ts                  ║
// ║  Stenbrary v3.59.0 — Visitas anotadas en papel       ║
// ║                                                      ║
// ║  Se fue la luz o la PC de la puerta estuvo apagada:  ║
// ║  las visitas se anotan en papel y aquí se capturan   ║
// ║  una tras otra. Al guardar, el formulario queda con  ║
// ║  la misma fecha y actividad para la siguiente.       ║
// ║  Avisa si ya hay una visita parecida (el papel y el  ║
// ║  escáner pueden traer la misma).                     ║
// ╚══════════════════════════════════════════════════════╝

import { Component, ElementRef, Inject, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatabaseService } from '../../../core/services/database.service';
import { AforoService } from '../../../core/services/aforo.service';
import { ConfigService } from '../../../core/services/config.service';
import { BitacoraService, describirRegistro } from '../../../core/services/bitacora.service';
import { Alumno, Motivo, Registro } from '../../../core/models';
import { sugerirAlumnos } from '../../../core/utils/registros-filtros.utils';
import { validarVisitaManual, visitaParecida } from '../../../core/utils/visita-manual.utils';
import { fechaLocalISO } from '../../../core/utils/tiempo.utils';

export interface AgregarVisitaDialogData {
  alumnos: Alumno[];
  registros: Registro[];
}

@Component({
    selector: 'app-agregar-visita-dialog',
    imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
    <h2 mat-dialog-title>
      <mat-icon>edit_note</mat-icon>
      Agregar visitas a mano
    </h2>

    <mat-dialog-content class="dialog-content">
      <p class="intro">
        Para las visitas que se anotaron en papel (se fue la luz, la computadora de la entrada
        estuvo apagada). Cuentan igual en las estadísticas y quedan marcadas como "a mano".
      </p>

      <div class="form-grid">
        <!-- Quién -->
        <div class="field">
          <span class="field-label"><mat-icon>person</mat-icon> Quién</span>
          <label class="check">
            <input type="checkbox" [ngModel]="esVisitante()" (ngModelChange)="cambiarTipo($event)">
            Es visitante (no es alumno)
          </label>

          @if (esVisitante()) {
            <input class="texto input-visitante" placeholder="Nombre del visitante (opcional)"
                   [(ngModel)]="nombreVisitante">
          } @else if (alumno()) {
            <div class="alumno-elegido">
              <mat-icon>account_circle</mat-icon>
              <div>
                <p class="alumno-nombre">{{ nombreAlumno() }}</p>
                <p class="alumno-meta mono">{{ alumno()!.matricula }} · {{ alumno()!.carrera }}</p>
              </div>
              <button type="button" class="btn-cambiar" (click)="quitarAlumno()">Cambiar</button>
            </div>
          } @else {
            <input #buscador class="texto input-buscar-alumno" placeholder="Matrícula o nombre"
                   [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)"
                   (keydown.enter)="elegirPrimero()" autocomplete="off">
            @if (sugerencias().length) {
              <div class="sugerencias">
                @for (s of sugerencias(); track s.alumno.id) {
                  <button type="button" class="sugerencia" (click)="elegir(s.alumno)">
                    <span>{{ s.nombre }}</span>
                    <span class="mono">{{ s.alumno.matricula }}</span>
                  </button>
                }
              </div>
            } @else if (busqueda().trim().length >= 3) {
              <span class="field-hint">
                No hay ningún alumno con eso. Si es nuevo, dalo de alta en Alumnos; si no es alumno,
                marca "Es visitante".
              </span>
            }
          }
        </div>

        <!-- Cuándo -->
        <div class="fila-horas">
          <label class="field">
            <span class="field-label"><mat-icon>event</mat-icon> Fecha</span>
            <input type="date" class="texto input-fecha" [(ngModel)]="fecha" [max]="hoy">
          </label>
          <label class="field">
            <span class="field-label"><mat-icon>login</mat-icon> Entrada</span>
            <input type="time" class="texto input-entrada" [(ngModel)]="entrada">
          </label>
          <label class="field">
            <span class="field-label"><mat-icon>logout</mat-icon> Salida</span>
            <input type="time" class="texto input-salida" [(ngModel)]="salida">
          </label>
        </div>
        <span class="field-hint">La salida es opcional: déjala vacía si no se anotó.</span>

        <!-- Actividad -->
        <div class="field">
          <span class="field-label"><mat-icon>category</mat-icon> Actividad</span>
          <div class="motivos-grid">
            @for (m of motivos(); track m.id!) {
              <button type="button" class="motivo-chip"
                      [class.selected]="motivoIds().includes(m.id!)"
                      (click)="toggleMotivo(m.id!)">
                <mat-icon>{{ m.icono || 'label' }}</mat-icon>
                {{ m.nombre }}
              </button>
            }
          </div>
        </div>
      </div>

      @if (error()) {
        <div class="aviso error"><mat-icon>error_outline</mat-icon>{{ error() }}</div>
      }
      @if (parecida()) {
        <div class="aviso parecida">
          <mat-icon>content_copy</mat-icon>
          Ya hay una visita de {{ parecida()!.nombreCompleto }} a las {{ parecida()!.fechaHora | date:'HH:mm' }}
          de ese día. Si es la misma, no la agregues; si es otra, guarda de nuevo.
        </div>
      }

      @if (agregadas().length) {
        <div class="agregadas">
          <span class="field-label"><mat-icon>check_circle</mat-icon> Agregadas ({{ agregadas().length }})</span>
          @for (t of agregadas().slice(0, 5); track $index) {
            <span class="agregada">{{ t }}</span>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cerrar()">{{ agregadas().length ? 'Terminar' : 'Cancelar' }}</button>
      <button mat-raised-button color="primary" class="btn-guardar-visita"
              (click)="guardar()" [disabled]="guardando">
        {{ parecida() ? 'Guardar de todas formas' : 'Guardar y agregar otra' }}
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    h2[mat-dialog-title] {
      display: flex; align-items: center; gap: 8px;
      margin: 0; padding: 20px 24px 12px;
      font-size: 1.1rem; font-weight: 600; color: #E8F4F8;
    }
    .dialog-content { padding: 8px 24px 16px; min-width: 420px; max-width: 560px; }
    .intro { margin: 0 0 16px; font-size: .85rem; color: rgba(200,230,240,.6); }
    .form-grid { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .field-label {
      display: flex; align-items: center; gap: 6px;
      font-size: .78rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
      color: rgba(200,230,240,.65);
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #00C8D7; }
    }
    .field-hint { font-size: .75rem; color: rgba(200,230,240,.5); }
    .check { display: flex; align-items: center; gap: 8px; font-size: .85rem; color: rgba(200,230,240,.8); cursor: pointer; }
    .texto {
      padding: 10px 12px; width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(0,200,215,.2); border-radius: 8px;
      font-family: 'DM Sans', sans-serif; font-size: .9rem; color: #E8F4F8;
      color-scheme: dark;
      &:focus { outline: none; border-color: #00C8D7; }
    }
    .fila-horas { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 10px; }
    .sugerencias { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow-y: auto; }
    .sugerencia {
      display: flex; justify-content: space-between; gap: 12px;
      padding: 8px 12px; text-align: left;
      background: rgba(0,200,215,.05); border: 1px solid rgba(0,200,215,.12); border-radius: 6px;
      color: #E8F4F8; font-size: .85rem; cursor: pointer;
      &:hover { border-color: #00C8D7; }
      .mono { color: rgba(200,230,240,.55); }
    }
    .alumno-elegido {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: rgba(0,200,215,.08); border-left: 3px solid #00C8D7; border-radius: 8px;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #00C8D7; flex-shrink: 0; }
      > div { flex: 1; min-width: 0; }
    }
    .alumno-nombre { margin: 0; font-weight: 600; font-size: .95rem; color: #E8F4F8; overflow-wrap: anywhere; }
    .alumno-meta { margin: 2px 0 0; font-size: .78rem; color: rgba(200,230,240,.55); }
    .mono { font-family: 'Space Mono', monospace; }
    .btn-cambiar {
      background: none; border: 1px solid rgba(0,200,215,.3); border-radius: 6px;
      color: #00C8D7; font-size: .78rem; padding: 4px 10px; cursor: pointer;
    }
    .motivos-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .motivo-chip {
      display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px;
      background: rgba(0,200,215,.06); border: 1px solid rgba(0,200,215,.18); border-radius: 20px;
      color: rgba(200,230,240,.7); font-family: 'DM Sans', sans-serif; font-size: .82rem; cursor: pointer;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.selected { background: rgba(0,200,215,.18); border-color: #00C8D7; color: #00C8D7; }
    }
    .aviso {
      display: flex; align-items: flex-start; gap: 8px; margin-top: 14px; padding: 10px 14px;
      border-radius: 8px; font-size: .85rem;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
      &.error { background: rgba(240,82,82,.10); border: 1px solid rgba(240,82,82,.25); color: #F05252; }
      &.parecida { background: rgba(245,166,35,.08); border: 1px solid rgba(245,166,35,.3); color: #F5A623; }
    }
    .agregadas {
      display: flex; flex-direction: column; gap: 4px; margin-top: 16px; padding-top: 12px;
      border-top: 1px solid rgba(0,200,215,.12);
      .field-label mat-icon { color: #0EB07B; }
    }
    .agregada { font-size: .8rem; color: rgba(200,230,240,.7); }
    mat-dialog-actions { padding: 8px 16px 16px; }
    @media (max-width: 520px) {
      .dialog-content { min-width: 0; }
      .fila-horas { grid-template-columns: 1fr 1fr; }
      .fila-horas > label:first-child { grid-column: 1 / -1; }
    }
  `]
})
export class AgregarVisitaDialogComponent implements OnInit {
  @ViewChild('buscador') private buscador?: ElementRef<HTMLInputElement>;

  private readonly db = inject(DatabaseService);
  private readonly aforo = inject(AforoService);
  private readonly config = inject(ConfigService);
  private readonly bitacora = inject(BitacoraService);

  readonly hoy = fechaLocalISO();
  fecha = this.hoy;
  entrada = '';
  salida = '';
  nombreVisitante = '';
  guardando = false;

  esVisitante = signal(false);
  busqueda = signal('');
  alumno = signal<Alumno | null>(null);
  motivos = signal<Motivo[]>([]);
  motivoIds = signal<string[]>([]);
  error = signal<string | null>(null);
  parecida = signal<Pick<Registro, 'nombreCompleto' | 'fechaHora'> | null>(null);
  agregadas = signal<string[]>([]);
  /** Datos que ya mostraron el aviso de visita parecida. */
  private avisoPara: string | null = null;

  /** Las de esta sesión también cuentan para el aviso de "visita parecida". */
  private registros: Pick<Registro, 'matricula' | 'nombreCompleto' | 'fechaHora'>[];
  private readonly activos: Alumno[];

  sugerencias = computed(() => {
    const texto = this.busqueda().trim();
    if (texto.length < 2) return [];
    const exacto = this.activos.find(a => a.matricula === texto);
    return exacto ? [{ alumno: exacto, nombre: this.nombreDe(exacto) }] : sugerirAlumnos(this.activos, texto, 6);
  });

  nombreAlumno = computed(() => {
    const a = this.alumno();
    return a ? this.nombreDe(a) : '';
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) data: AgregarVisitaDialogData,
    private dialogRef: MatDialogRef<AgregarVisitaDialogComponent, number>,
  ) {
    this.activos = data.alumnos.filter(a => a.activo !== false);
    this.registros = [...data.registros];
  }

  async ngOnInit(): Promise<void> {
    const motivos = await this.db.obtenerMotivosActivos();
    this.motivos.set(motivos);
    if (motivos[0]?.id) this.motivoIds.set([motivos[0].id]);
  }

  cambiarTipo(visitante: boolean): void {
    this.esVisitante.set(visitante);
    this.parecida.set(null);
  }

  elegir(a: Alumno): void {
    this.alumno.set(a);
    this.busqueda.set('');
    this.parecida.set(null);
  }

  elegirPrimero(): void {
    const [primera] = this.sugerencias();
    if (primera) this.elegir(primera.alumno);
  }

  quitarAlumno(): void {
    this.alumno.set(null);
    this.parecida.set(null);
    setTimeout(() => this.buscador?.nativeElement.focus());
  }

  toggleMotivo(id: string): void {
    const actuales = this.motivoIds();
    this.motivoIds.set(actuales.includes(id) ? actuales.filter(x => x !== id) : [...actuales, id]);
  }

  async guardar(): Promise<void> {
    if (this.guardando) return;
    this.error.set(null);

    const a = this.alumno();
    if (!this.esVisitante() && !a) {
      this.error.set('Elige al alumno, o marca "Es visitante".');
      return;
    }
    const horas = validarVisitaManual({ fecha: this.fecha, entrada: this.entrada, salida: this.salida }, new Date());
    if (horas.error !== undefined) {
      this.error.set(horas.error);
      return;
    }
    const seleccion = this.motivos().filter(m => m.id && this.motivoIds().includes(m.id));
    if (seleccion.length === 0) {
      this.error.set('Elige al menos una actividad.');
      return;
    }

    const quien = this.esVisitante() || !a
      ? { alumnoId: 'invitado-' + Date.now(), matricula: 'INVITADO', nombreCompleto: this.nombreVisitante.trim() || 'Visitante', carrera: 'Visitante' }
      : { alumnoId: a.id!, matricula: a.matricula, nombreCompleto: this.nombreDe(a), carrera: a.carrera, ...(a.turno ? { turno: a.turno } : {}) };

    // Primer clic con una visita parecida: avisa. Otro clic con los MISMOS
    // datos guarda; si cambió algo, se vuelve a revisar.
    const clave = `${quien.matricula}|${quien.nombreCompleto}|${horas.entrada.getTime()}`;
    const parecida = visitaParecida(this.registros, quien, horas.entrada, this.config.umbralDuplicadoMin || 30);
    if (parecida && this.avisoPara !== clave) {
      this.parecida.set(parecida);
      this.avisoPara = clave;
      return;
    }

    this.guardando = true;
    try {
      const nuevo = await this.db.crearRegistroManual({
        ...quien,
        fechaHora: horas.entrada,
        ...(horas.salida ? { horaSalida: horas.salida } : {}),
        motivoId: seleccion[0].id!,
        motivoNombre: seleccion[0].nombre,
        motivoIds: seleccion.map(m => m.id!),
        motivoNombres: seleccion.map(m => m.nombre),
      });
      this.bitacora.registrar('registro-agregado', describirRegistro(nuevo), nuevo.id);
      await this.aforo.refrescar(); // una entrada de hoy sin salida ocupa lugar
      this.registros.push(nuevo);
      const hora = this.entrada + (this.salida ? `–${this.salida}` : '');
      this.agregadas.update(l => [`${nuevo.nombreCompleto} · ${this.fecha} ${hora}`, ...l]);

      // Lista para la siguiente: misma fecha y actividad.
      this.alumno.set(null);
      this.nombreVisitante = '';
      this.entrada = '';
      this.salida = '';
      this.parecida.set(null);
      this.avisoPara = null;
      setTimeout(() => this.buscador?.nativeElement.focus());
    } catch {
      this.error.set('No se pudo guardar la visita.');
    } finally {
      this.guardando = false;
    }
  }

  cerrar(): void {
    this.dialogRef.close(this.agregadas().length);
  }

  private nombreDe(a: Alumno): string {
    return [a.nombre, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ');
  }
}
