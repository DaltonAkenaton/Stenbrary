// ╔══════════════════════════════════════════════════════╗
// ║  formulas-info-dialog.component.ts                   ║
// ║  Stenbrary v3.47.0 — Transparencia de cálculos       ║
// ║                                                      ║
// ║  Modal con las fórmulas y supuestos detrás de cada    ║
// ║  métrica del dashboard ejecutivo (tendencia,          ║
// ║  retención, variación, predicciones, percentiles del  ║
// ║  heatmap, etc.). Pensado para que la coordinadora     ║
// ║  entienda qué significa cada número.                  ║
// ╚══════════════════════════════════════════════════════╝

import { Component, inject } from '@angular/core';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
    selector: 'app-formulas-info-dialog',
    imports: [
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule
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
          <p>
            <strong>Al mismo avance:</strong> si el período que ves todavía no termina
            (por ejemplo, incluye hoy), el anterior se corta a la misma altura: mismo
            día y misma hora. Un miércoles a las 10:00, "esta semana" se compara con
            la semana pasada hasta el miércoles a las 10:00, no con la semana completa.
          </p>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Si el período anterior no tuvo registros, no se muestra porcentaje: no hay
            base para calcularlo y cualquier número sería inventado.
          </p>
        </mat-expansion-panel>

        <!-- ─── PROMEDIO POR DÍA ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>today</mat-icon> Promedio por día</mat-panel-title>
          </mat-expansion-panel-header>
          <pre class="formula">
Tomamos el total de registros del período
y lo dividimos entre los días en que hubo al menos un registro.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> 600 registros en un mes donde la biblioteca tuvo
            actividad 24 días = 25 visitas por día.
          </p>
          <p>
            Solo cuentan los días <strong>con actividad</strong>: si hubo registros, la
            biblioteca abrió. Así los domingos, festivos y vacaciones no bajan el
            promedio. Un día que abrió pero no llegó nadie tampoco cuenta.
          </p>
        </mat-expansion-panel>

        <!-- ─── TASA DE RETENCIÓN ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>repeat</mat-icon> Tasa de retención</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            De los alumnos únicos del período, ¿qué % vino <strong>N veces o más</strong>?
            El mínimo N se ajusta solo al largo del rango:
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
            20 vinieron 3 veces o más → retención de 25%.
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
1) Sumamos las visitas de cada día de la semana.
2) Dividimos entre cuántos de esos días hubo actividad.
3) Nos quedamos con el día de mayor promedio.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> si los lunes a las 11:00 hay 47 visitas y es la
            celda más alta del heatmap → "Lunes 11:00" es la hora pico. Para el día
            más ocupado se usa el promedio: en 30 días puede haber 5 martes y solo
            4 lunes, y sumando, el martes ganaría solo por aparecer más veces.
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
            Solo se calcula cuando los datos están agrupados por día (rangos ≤ 31 días),
            y solo con los días que hubo visitas: un domingo cerrado no cuenta como
            "un día muy distinto".
          </p>
        </mat-expansion-panel>

        <!-- ─── PREDICCIÓN DE HOY ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>insights</mat-icon> Predicción de hoy</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Proyecta el total que tendrá el día actual al cierre usando cómo se
            comportaron <strong>los últimos días iguales a hoy</strong> (hasta 8 del mismo
            día de la semana, de las últimas 10 semanas).
          </p>
          <pre class="formula">
1) En esos días, vemos qué parte de las visitas del día
   ya había llegado a esta misma hora.
2) Tomamos las visitas de HOY hasta este momento.
3) Las dividimos entre esa parte para estimar el total.</pre>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> los martes, a las 12:00 suele haber llegado el 40% de las
            visitas del día. Hoy es martes y van 80 → la proyección es 80 ÷ 0.40 = 200.
          </p>
          <p>Confianza: qué tan bien habría acertado este cálculo en esos mismos días.</p>
          <ul class="lista-rangos">
            <li><strong>Alta:</strong> se habría equivocado menos de 15% en promedio</li>
            <li><strong>Media:</strong> entre 15% y 30%</li>
            <li><strong>Baja:</strong> más de 30% (días muy distintos entre sí)</li>
          </ul>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Si no hay al menos 4 días comparables, o a esta hora normalmente todavía
            no llega nadie, no se muestra proyección.
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
            <li>No está desactivado en su ficha</li>
            <li>Tiene al menos un registro histórico (sí ha venido alguna vez)</li>
            <li>Su último registro fue hace <strong>U días o más</strong> (días de calendario)</li>
          </ul>
          <p>
            U es el umbral configurado en
            <code>Configuración → Umbral de inactividad</code>
            (por defecto 30 días). Se mide desde <strong>hoy</strong>, no desde el
            filtro del dashboard. Es la misma cifra que la página Inactivos.
          </p>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Los alumnos que <strong>nunca</strong> han venido (por ejemplo, importados de
            Excel) se cuentan aparte: no "dejaron" de venir.
          </p>
        </mat-expansion-panel>

        <!-- ─── VINIERON SOLO 1 VEZ ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>person_add_disabled</mat-icon> Vinieron solo 1 vez</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Alumnos con <strong>exactamente una visita en todo su historial</strong>.
            Como los inactivos, se mide desde hoy y no depende del filtro.
          </p>
          <ul class="lista-rangos">
            <li>No cuentan los alumnos desactivados en su ficha</li>
            <li>No cuentan los invitados (no tienen identidad)</li>
          </ul>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Un alumno que vino por primera vez hoy también aparece aquí hasta que regrese.
          </p>
        </mat-expansion-panel>

        <!-- ─── CARRERA EN CRECIMIENTO ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>school</mat-icon> Carrera en crecimiento</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            La carrera cuyas visitas crecieron más, en porcentaje, contra el período
            anterior (el mismo que usa la tendencia).
          </p>
          <ul class="lista-rangos">
            <li>Necesita al menos <strong>5 visitas</strong> en el período actual</li>
            <li>Necesita visitas en el período anterior: sin base no hay porcentaje</li>
            <li>Sin invitados</li>
          </ul>
        </mat-expansion-panel>

        <!-- ─── CRECIMIENTO MES A MES ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>bar_chart</mat-icon> Crecimiento mes a mes</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Total de visitas mes a mes durante los últimos meses calendario,
            <strong>independiente del filtro</strong>. Por defecto son 12; puedes
            elegir 3, 6, 12 o 24, o escribir cualquier número entre 2 y 120.
          </p>
          <ul class="lista-rangos">
            <li><strong>Promedio mensual:</strong> total ÷ meses que tuvieron al menos una visita</li>
            <li><strong>Último trimestre vs anterior:</strong> los 3 últimos meses cerrados contra los 3 previos (el mes en curso no entra). Necesita al menos 7 meses en pantalla; con menos no se muestra.</li>
          </ul>
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
          <p class="nota">
            <mat-icon>info</mat-icon>
            El mes en curso va a medias: su cambio se compara contra el mes anterior
            hasta el mismo día y hora, y no participa en "mes más bajo".
          </p>
        </mat-expansion-panel>

        <!-- ─── COMPARADOR A vs B ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>compare_arrows</mat-icon> Comparador A vs B</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            A es el período que evalúas y B la referencia: la diferencia se mide de A contra B.
            Si los pusiste al revés, el botón «Intercambiar» los invierte.
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
          <p>
            Si uno de los dos períodos <strong>sigue en curso</strong> (por ejemplo "Este mes"),
            el otro se toma solo hasta la misma altura: el mismo número de días desde su
            inicio y la misma hora. La pantalla avisa cuándo se hizo ese recorte.
          </p>
          <p class="nota">
            <mat-icon>info</mat-icon>
            Si los rangos tienen distinta duración, el promedio por día (con actividad)
            sigue siendo comparable; el total no.
          </p>
        </mat-expansion-panel>

        <!-- ─── MOTIVOS ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>category</mat-icon> Motivos de visita</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Si en una visita el alumno marcó varios motivos, cuenta para <strong>cada uno</strong>.
            Por eso el porcentaje se lee como "de las visitas, cuántas incluyeron este
            motivo" y la suma puede pasar de 100%.
          </p>
          <p class="ejemplo">
            <strong>Ejemplo:</strong> 10 visitas; 6 marcaron "Estudiar" y 5 "Pedir libro" (una
            visita marcó las dos) → Estudiar 60%, Pedir libro 50%.
          </p>
        </mat-expansion-panel>

        <!-- ─── ESTANCIA ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>timer</mat-icon> Tiempo de estancia</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Promedio de minutos entre la entrada y la salida, contando <strong>solo las
            salidas registradas por una persona</strong>.
          </p>
          <p>
            Cuando el sistema cierra una entrada por tiempo, o al llegar la hora de cierre,
            la hora de salida es una estimación: no se sabe cuándo se fue el alumno. Esas
            visitas siguen contando como visitas, pero su duración no entra en el promedio,
            en las horas acumuladas ni en la constancia.
          </p>
        </mat-expansion-panel>

        <!-- ─── INVITADOS ─── -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title><mat-icon>person_pin</mat-icon> Invitados</mat-panel-title>
          </mat-expansion-panel-header>
          <p>
            Las visitas de invitados cuentan en el total de visitas y en los motivos.
            No cuentan en carreras, turnos ni grados (no son alumnos) ni en "alumnos
            únicos".
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
  `]
})
export class FormulasInfoDialogComponent {
  private dialogRef = inject<MatDialogRef<FormulasInfoDialogComponent>>(MatDialogRef);


  cerrar(): void {
    this.dialogRef.close();
  }
}
