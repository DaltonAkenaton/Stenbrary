// ╔══════════════════════════════════════════════════════╗
// ║  formulas-info-dialog.component.ts                   ║
// ║  Stenbrary v3.18.7 — Transparencia de cálculos       ║
// ║                                                      ║
// ║  Modal con las fórmulas y supuestos detrás de cada    ║
// ║  métrica del dashboard ejecutivo (tendencia,          ║
// ║  retención, variación, predicciones, percentiles del  ║
// ║  heatmap, etc.). Pensado para que la coordinadora     ║
// ║  entienda qué significa cada número.                  ║
// ╚══════════════════════════════════════════════════════╝

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-formulas-info-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatIconModule,
    MatButtonModule, MatExpansionModule,
  ],
  template: `
    <div class="dlg-header">
      <div class="dlg-icon"><mat-icon>functions</mat-icon></div>
      <div>
        <h2>¿Cómo se calculan los números?</h2>
        <p class="dlg-sub">Fórmulas y supuestos detrás de cada métrica del dashboard.</p>
      </div>
      <button mat-icon-button class="dlg-close" (click)="cerrar()" aria-label="Cerrar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <div class="dlg-content" mat-dialog-content>

      <mat-accordion multi="true" displayMode="flat">

        <!-- ─── TENDENCIA ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>trending_up</mat-icon> Tendencia del período</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Compara las visitas del período activo contra el período inmediatamente
            anterior <strong>de la misma duración</strong>.
          </p>
          <pre class="formula">
1) Tomamos las visitas de AHORA.
2) Le restamos las visitas del período ANTERIOR.
3) Esa diferencia la dividimos entre las visitas anteriores.
4) Multiplicamos por 100 para tener el porcentaje.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> filtras 30 días → se compara contra los 30 días previos.
            Si tienes 240 ahora y 200 antes → la diferencia es +40 visitas,
            que representa un +20% de crecimiento.
          </p>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Si el período anterior no tuvo registros, se reporta 0% (no se puede
            dividir entre cero, así que evitamos números irreales).
          </p>
        </mat-expansion-panel>

        <!-- ─── PROMEDIO POR DÍA ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>today</mat-icon> Promedio por día</mat-panel-title>
          </mat-expansion-panel-header>
          <pre class="formula">
Tomamos el total de registros del período
y lo dividimos entre la cantidad de días que cubre el rango.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> 600 registros en 30 días = 20 visitas por día.
          </p>
          <p>
            Cuenta <strong>todos los días del rango</strong> (incluso los que no abre
            la biblioteca). Si quieres un promedio "solo de días hábiles", filtra por
            hora o por preset semanal/mensual.
          </p>
        </mat-expansion-panel>

        <!-- ─── TASA DE RETENCIÓN ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>repeat</mat-icon> Tasa de retención</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            De los alumnos únicos del período, ¿qué % regresó al menos
            <strong>N veces</strong>? El umbral N se ajusta solo al rango:
          </p>
          <ul class="lista-rangos">
            <li><strong>≤ 7 días:</strong> N = 2 visitas</li>
            <li><strong>≤ 30 días:</strong> N = 3 visitas</li>
            <li><strong>≤ 90 días:</strong> N = 5 visitas</li>
            <li><strong>&gt; 90 días:</strong> N = 8 visitas</li>
          </ul>
          <pre class="formula">
1) Contamos cuántos alumnos distintos vinieron en el período.
2) De esos, contamos cuántos vinieron al menos N veces.
3) Dividimos los recurrentes entre el total de alumnos.
4) Multiplicamos por 100 para tener el porcentaje.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> en 30 días vinieron 80 alumnos distintos. De ellos,
            20 regresaron al menos 3 veces → retención de 25%.
          </p>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Los visitantes <strong>INVITADO</strong> no cuentan (no tienen identidad).
          </p>
        </mat-expansion-panel>

        <!-- ─── HORA PICO / DÍA OCUPADO ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>schedule</mat-icon> Hora pico y día ocupado</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Agrupamos los registros por <strong>día de la semana y hora</strong>,
            sumando todas las visitas que cayeron en cada combinación.
          </p>
          <pre class="formula">
HORA PICO:
1) Contamos las visitas de cada celda (día + hora).
2) Buscamos la celda con el número más alto.

DÍA OCUPADO:
1) Sumamos TODAS las visitas de cada día de la semana.
2) Nos quedamos con el día que acumuló más.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> si los lunes a las 11:00 hay 47 visitas y es la
            celda más alta del heatmap → "Lunes 11:00" es la hora pico. Si la suma
            total de los martes es la más grande, el día más ocupado es martes.
          </p>
        </mat-expansion-panel>

        <!-- ─── INTENSIDAD DEL HEATMAP ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>grid_on</mat-icon> Colores del mapa de calor</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            En vez de pintar los colores como "% del máximo" (que se rompía cuando
            una celda atípica dominaba), ordenamos las celdas con datos de menor a
            mayor y las dividimos en <strong>cuatro grupos del mismo tamaño</strong>
            (esto es lo que en estadística se llama "percentiles", pero piénsalo
            como cuartos de la lista ordenada):
          </p>
          <ul class="lista-rangos">
            <li><strong>Nulo (gris):</strong> 0 visitas</li>
            <li><strong>Bajo:</strong> el 25% de celdas con menos visitas</li>
            <li><strong>Medio:</strong> entre el 25% y el 50% (la mitad inferior)</li>
            <li><strong>Alto:</strong> entre el 50% y el 75%</li>
            <li><strong>Muy alto:</strong> el 25% de celdas con más visitas</li>
          </ul>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> si tienes 100 celdas con datos, las 25 más
            bajas se pintan en "Bajo" y las 25 más altas en "Muy alto",
            sin importar si los números absolutos son grandes o pequeños.
          </p>
          <p class="nota">
            <mat-icon>info</mat-icon>
            La escala se ajusta a la <strong>distribución real</strong>, no al máximo
            absoluto. Una celda gigantesca ya no aplasta visualmente al resto.
          </p>
        </mat-expansion-panel>

        <!-- ─── VARIACIÓN DIARIA ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>show_chart</mat-icon> Variación diaria (% CV)</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Es una medida estadística (coeficiente de variación) que responde a
            la pregunta: <em>"¿qué tan parecidos son los días entre sí?"</em>.
            En palabras simples:
          </p>
          <pre class="formula">
1) Calculamos el PROMEDIO de visitas por día.
2) Vemos qué tanto se aleja cada día de ese promedio.
3) Comparamos ese "alejamiento típico" contra el promedio.
4) Lo expresamos como porcentaje.</pre>
          <ul class="lista-rangos">
            <li><strong>0–20%:</strong> flujo muy estable (todos los días parecidos)</li>
            <li><strong>20–50%:</strong> variación normal</li>
            <li><strong>&gt; 50%:</strong> errático (hay días pico fuertes)</li>
          </ul>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> si todos los días tienes ~20 visitas, el
            alejamiento es chico → 10%, muy estable. Si un día tienes 5 y otro 80,
            el alejamiento es grande → 70%, errático.
          </p>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Solo se calcula cuando los datos están agrupados por día (rangos ≤ 31 días).
          </p>
        </mat-expansion-panel>

        <!-- ─── PREDICCIÓN DE HOY ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>insights</mat-icon> Predicción de hoy</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Proyecta el total que tendrá el día actual al cierre, asumiendo que el
            ritmo de visitas se mantiene parejo entre apertura (7:00) y cierre (22:00).
          </p>
          <pre class="formula">
1) Vemos qué fracción del horario ya transcurrió.
   (Si son las 13:00 → llevamos 6 horas de las 15 totales = 40%.)
2) Tomamos las visitas de HOY hasta este momento.
3) Las dividimos entre esa fracción para extrapolar al 100%.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> a las 13:00 (40% del horario) llevas 80 visitas.
            La predicción es 80 ÷ 0.40 = 200 visitas al cierre.
          </p>
          <p>Confianza:</p>
          <ul class="lista-rangos">
            <li><strong>Alta:</strong> ya transcurrió ≥ 50% del horario</li>
            <li><strong>Media:</strong> entre 25% y 50%</li>
            <li><strong>Baja:</strong> menos del 25% (muy temprano para confiar)</li>
          </ul>
          <p class="nota">
            <mat-icon>warning</mat-icon>
            Es una extrapolación lineal simple. No considera estacionalidad ni
            comparación con días previos similares.
          </p>
        </mat-expansion-panel>

        <!-- ─── ALUMNOS INACTIVOS ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>people_outline</mat-icon> Alumnos inactivos</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Se cuenta a un alumno como inactivo si cumple <strong>las tres condiciones</strong>:
          </p>
          <ul class="lista-rangos">
            <li>Está marcado como activo en su ficha</li>
            <li>Tiene al menos un registro histórico (sí ha venido alguna vez)</li>
            <li>Su último registro fue hace más de <strong>U días</strong></li>
          </ul>
          <p>
            U es el umbral configurado en
            <code>Configuración → Umbral de inactividad</code>
            (por defecto 30 días). Se mide desde <strong>hoy</strong>, no desde el
            filtro del dashboard.
          </p>
        </mat-expansion-panel>

        <!-- ─── CRECIMIENTO 12M ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>bar_chart</mat-icon> Crecimiento 12 meses</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Total de visitas mes a mes durante los últimos 12 meses calendario,
            <strong>independiente del filtro</strong>. Sirve para ver salud
            macroscópica del flujo.
          </p>
          <p>
            La altura de cada barra es relativa al mes con más visitas:
          </p>
          <pre class="formula">
1) Buscamos cuál fue el mes con más visitas (referencia).
2) Cada mes se compara contra esa referencia (en porcentaje).
3) A los meses muy pequeños les damos un mínimo de 2% para
   que sigan siendo visibles en la gráfica.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> si el mes top tuvo 1.000 visitas y otro mes
            tuvo 250 → ese mes se ve al 25% de la altura.
          </p>
        </mat-expansion-panel>

        <!-- ─── COMPARADOR A vs B ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>compare_arrows</mat-icon> Comparador A vs B</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Calcula la diferencia tomando A como referencia (no al revés):
          </p>
          <pre class="formula">
1) Tomamos las visitas del rango A.
2) Le restamos las visitas del rango B.
3) Esa diferencia la dividimos entre las visitas de B.
4) Multiplicamos por 100 para tener el porcentaje.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> A = abril (300 visitas), B = marzo (250) →
            la diferencia es +50, lo que equivale a un +20% (abril fue 20% mejor).
          </p>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Si los rangos tienen distinta duración el promedio diario sigue siendo
            comparable; el total no.
          </p>
        </mat-expansion-panel>

      </mat-accordion>

    </div>

    <div class="dlg-actions" mat-dialog-actions>
      <button mat-flat-button color="primary" (click)="cerrar()">
        <mat-icon>check</mat-icon>
        Entendido
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; color: #E8F4F8; }

    .dlg-header {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 20px 24px 12px;
      border-bottom: 1px solid rgba(200, 230, 240, 0.08);
    }
    .dlg-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(0, 200, 215, 0.18), rgba(99, 102, 241, 0.14));
      display: grid; place-items: center; color: #00C8D7;
      flex-shrink: 0;
    }
    .dlg-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .dlg-header h2 {
      margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 1.15rem;
      font-weight: 600;
    }
    .dlg-sub { margin: 4px 0 0; font-size: 0.85rem; color: rgba(200, 230, 240, 0.6); }
    .dlg-close { margin-left: auto; }

    .dlg-content {
      max-height: 65vh; overflow-y: auto; padding: 8px 16px 16px;
    }

    ::ng-deep .mat-expansion-panel {
      background: rgba(20, 32, 51, 0.4) !important;
      color: #E8F4F8 !important;
      box-shadow: none !important;
      border: 1px solid rgba(200, 230, 240, 0.06);
      border-radius: 10px !important;
      margin-bottom: 8px;
    }
    ::ng-deep .mat-expansion-panel-header { padding: 0 16px; }
    ::ng-deep .mat-expansion-panel-header-title {
      color: #E8F4F8 !important; font-weight: 500;
      display: flex; align-items: center; gap: 10px;
    }
    ::ng-deep .mat-expansion-panel-header-title mat-icon { color: #00C8D7; }
    ::ng-deep .mat-expansion-indicator::after {
      color: rgba(200, 230, 240, 0.6) !important;
    }

    p {
      font-size: 0.9rem; line-height: 1.55;
      color: rgba(232, 244, 248, 0.85);
      margin: 0 0 10px;
    }

    .formula {
      background: rgba(0, 200, 215, 0.06);
      border-left: 3px solid #00C8D7;
      padding: 10px 14px;
      border-radius: 6px;
      font-family: 'Space Mono', monospace;
      font-size: 0.82rem;
      color: #5DE4EC;
      white-space: pre-wrap;
      margin: 8px 0;
    }

    .ejemplo {
      background: rgba(11, 196, 183, 0.06);
      border-left: 3px solid #0BC4B7;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
    }

    .nota {
      display: flex; gap: 8px; align-items: flex-start;
      background: rgba(245, 166, 35, 0.06);
      border-left: 3px solid #F5A623;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.82rem;
      color: rgba(232, 244, 248, 0.75);
      margin-top: 8px;
    }
    .nota mat-icon {
      font-size: 18px; width: 18px; height: 18px;
      color: #F5A623; flex-shrink: 0; margin-top: 1px;
    }

    .lista-rangos {
      list-style: none; padding: 0; margin: 8px 0;
    }
    .lista-rangos li {
      padding: 4px 0;
      font-size: 0.85rem;
      color: rgba(232, 244, 248, 0.8);
    }

    code {
      background: rgba(200, 230, 240, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Space Mono', monospace;
      font-size: 0.8rem;
    }

    .dlg-actions {
      padding: 12px 20px 20px;
      border-top: 1px solid rgba(200, 230, 240, 0.08);
      justify-content: flex-end;
    }
  `],
})
export class FormulasInfoDialogComponent {
  constructor(private dialogRef: MatDialogRef<FormulasInfoDialogComponent>) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
