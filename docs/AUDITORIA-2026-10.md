# Auditoría de datos y estadísticas — octubre 2026

> Fecha: 2026-10-05 · Versión auditada: v3.41.0 (`e2ffe7e`) · Modo: **solo reporte, sin cambios de código.**
> Los arreglos van después, por severidad, cada uno en su propio commit con su test.

## Estado

| Tanda | Estado | Versión |
|---|---|---|
| 1 — R1, R2, R3, R4, R5, O5, O14, O15, O16, M10, M12 | ✅ Hecha (2026-10-06) | v3.41.1 |
| 2 — tras decisiones | ⏳ Esperando P1, P3, P4, P6, P7, P8 | |
| 3 — blindaje | ⏳ | |

**Hallazgo nuevo durante la Tanda 1 (corregido):** el PDF de `/registros` calculaba su propio período
para la cabecera (con el filtro "ayer" decía "Fecha: hoy"). Ahora usa el mismo rango que la lista.

**Decisiones tomadas:** P2 → cada motivo de una visita suma (2026-10-06). P5 → los invitados no cuentan
en carreras, turnos ni grados (2026-10-06).

## Resumen

| Severidad | Cantidad | Significado |
|---|---|---|
| 🔴 Dato falso o pérdida de datos | **6** | La pantalla muestra un número que no es verdad, o se borra algo que el usuario no eligió. |
| 🟠 Engañoso o bug | **16** | El número es técnicamente correcto pero induce a una conclusión falsa, o una función no hace lo que dice. |
| 🟡 Mejora o texto | **19** | Etiquetas imprecisas, validaciones faltantes, rendimiento. |
| ❓ Decisiones pendientes | **8** | No son bugs: son definiciones que tiene que tomar el dueño del producto. |

**Respuesta corta a "¿funciona al 100 % sin bugs?": no.** La app no truena, pero hay seis
lugares donde muestra información falsa. Dos de ellos afectan a *todo* lo que se filtra por fecha
personalizada (incluido un borrado de registros).

**Por qué no lo detectaron los 184 tests:** casi todos los 🔴 dependen de la zona horaria de México.
CI corre en UTC, donde el desfase no existe; y los cálculos del dashboard ejecutivo viven dentro del
componente (2810 líneas), sin tests.

### Cómo se hizo

- Lectura línea por línea de `estadisticas-avanzadas.service.ts`, `dashboard-ejecutivo.component.{ts,html}`,
  `formulas-info-dialog`, `report.service.ts`, `dashboard.component.ts`, `inactivos`, `registros`,
  `database.service.ts` (consultas y borrados), `config.service.ts`, `limpieza-registros`, `diagnostico`,
  `integridad.utils`, `presencia`, `aforo.service`, `detalle-alumno`.
- Pasada rápida por `alumnos`, `gestion-motivos` y `datos-prueba`.
- Los hallazgos de fechas se **reprodujeron en Node con `TZ=America/Mexico_City`**. El de rendimiento se midió con 100 000 y 300 000 registros sintéticos.
- **Lo que no se hizo todavía:** probar en navegador con datos reales. Varios hallazgos se pueden confirmar a mano en 1 minuto; cada uno indica cómo.

---

## 🔴 Dato falso o pérdida de datos

### R1 · `/registros` con fechas personalizadas muestra el día anterior. Afecta a todos los "clic para ver registros" de Estadísticas

- **Dónde:** `features/registros/registros.component.ts:271-272`.
- **Qué pasa:** `new Date('2026-10-03')` se interpreta como **medianoche UTC**, que en México son las
  18:00 del día 2. Después `setHours(0,0,0,0)` lo lleva al **2 de octubre 00:00**.
  Verificado: *clic en la barra del 3 de octubre → la lista muestra del 2/10 00:00 al 2/10 23:59.*
- **Alcance:**
  - Clic en una barra de la gráfica diaria (`drillDia`).
  - Clic en una celda del mapa de calor, en el total de un día y en el total de una hora.
  - Filtro "Personalizado" de Registros puesto a mano.
  - Excel/PDF que se exporten desde Registros con ese filtro.
- **Cómo confirmarlo a mano:** en Estadísticas, clic en la barra de un día que tenga registros. El encabezado de Registros dirá ese día, pero las filas son del día anterior.
- **Arreglo:** un único helper `parseFechaLocal('YYYY-MM-DD')`, usado en todos los sitios, y tests que fijen la zona horaria de México.

### R2 · La limpieza de registros "Personalizado" borra un día que no elegiste y conserva uno que sí elegiste

- **Dónde:** `features/configuracion/limpieza-registros.component.ts:523-524`. Usa `database.service.ts → eliminarRegistrosPorRango`.
- **Qué pasa:** es la misma causa que R1, pero aquí **borra**. Si eliges 10 → 20 de marzo, se borra
  **del 9 al 19 de marzo**: se pierde el día 9 y el 20 queda intacto. Verificado en Node.
  La vista previa ("se eliminarán N registros") usa el mismo rango desfasado, así que el número parece cuadrar.
- **Gravedad:** el borrado es irreversible si no hay respaldo.
- **Arreglo:** el mismo helper de R1, y un test que borre un rango y compruebe qué días quedan.

### R3 · Estadísticas no se actualiza: puede mostrar datos de hasta 5 minutos atrás

- **Dónde:** `estadisticas-avanzadas.service.ts:116-147`. La caché dura 5 minutos y **nadie la invalida** salvo el botón "Refrescar".
- **Qué pasa:** el servicio es global (`providedIn: 'root'`), así que la caché sobrevive al cambiar de pantalla.
  Ejemplo: abres Estadísticas a las 10:00, escaneas 20 alumnos y vuelves a las 10:03. Los totales,
  gráficas, motivos, carreras y hora pico **no incluyen esos 20**. En la misma tarjeta, "Último registro
  hace 1 minuto" sí está al día, porque se lee aparte de la base. Pasa lo mismo tras borrar registros,
  importar un respaldo o generar o limpiar datos de prueba.
- **Agravante:** el botón "Refrescar" solo existe en la pestaña *Reportes*. Desde *Resumen* no hay forma
  de forzar la recarga, salvo recargar la página.
- **Arreglo:**
  1. Invalidar la caché al entrar a la pantalla.
  2. Que `DatabaseService` avise cuando cambian los registros (una señal de versión), para que la
     caché sepa que quedó vieja.
  3. Botón de refrescar visible en la cabecera.

### R4 · "↑ 0.0 % más que el período anterior" cuando antes hubo 0

- **Dónde:** `estadisticas-avanzadas.service.ts:452-457` y `obtenerTextoTendencia()` en el componente.
  El comparador A vs B tiene la misma lógica (`compararDosRangos`, y el template muestra "+0 %").
- **Qué pasa:** si el período anterior tuvo 0 registros y este 50, la dirección es "sube", pero el porcentaje
  se fija en 0. La pantalla dice literalmente **"↑ 0.0 % más que el período anterior"**, en verde.
  El diálogo de fórmulas lo admite ("se reporta 0 %"), pero el texto visible sigue siendo falso.
- **Arreglo:** cuando la referencia es 0, no mostrar porcentaje. Usar un texto como "Nuevo: no hubo registros en el período anterior".

### R5 · "Accesos hoy ↓ 75 % vs lunes pasado" todas las mañanas (Resumen)

- **Dónde:** `dashboard.component.ts:401-419`, `538-560` (delta) y `709-728` (insight "Día tranquilo").
- **Qué pasa:** compara **lo que va de hoy** contra **el día completo** de la semana pasada. A las 10:00,
  con 30 accesos frente a 120 del lunes pasado entero, muestra "↓ 75 %" y el insight dice
  *"Día tranquilo: 75 % menos accesos que el lunes pasado"*. Es falso casi todos los días hasta la noche.
- **Arreglo:** comparar contra el mismo día de la semana pasada **hasta la misma hora**. El dato existe:
  basta con filtrar `regsSemana` por hora menor o igual a la actual.

### R6 · "Alumnos inactivos": dos números distintos para lo mismo

| | KPI en Estadísticas (`contarAlumnosInactivos`) | Página `/inactivos` (`obtenerAlumnosInactivos`) |
|---|---|---|
| ¿Cuenta a los que nunca vinieron? | **No** | **Sí** |
| ¿Qué es "activo"? | `activo === true` | `activo !== false` |
| Corte | medianoche de hace N días | N periodos de 24 h desde ahora |

- **Qué pasa:** con 2 000 alumnos importados y 600 que nunca han venido, el KPI puede decir **140** y la
  página **740**, con el mismo título. Además, una visita justo en el límite cuenta como activa en un
  sitio e inactiva en el otro.
- **Arreglo:** una sola función pura compartida, con tests. Antes hay que decidir la definición (❓P1).

---

## 🟠 Engañoso o bug

| # | Dónde | Qué pasa | Arreglo propuesto |
|---|---|---|---|
| O1 | Comparador A vs B | **Por defecto** compara "Este mes" (a 5 de octubre, 5 días) contra "Mes pasado" (30 días): sale "−85 %" en rojo. "Este semestre" termina el 31 de diciembre: el promedio por día divide entre días que aún no pasan. | Recortar el fin a hoy y comparar al mismo avance (días 1–5 contra días 1–5), o avisarlo en pantalla. ❓P6 |
| O2 | Crecimiento 12 meses | El mes en curso, incompleto, se marca como **"MES MÁS BAJO"** y su cambio contra el mes anterior sale "−80 %". La tendencia trimestral sí lo excluye; el resto no. | Excluir el mes en curso de "peor mes" y del cambio mes a mes, o etiquetarlo "en curso". |
| O3 | "Día más concurrido", "Predicción: X es típicamente el día más concurrido", totales del mapa de calor | Suma visitas sin normalizar cuántas veces aparece cada día. En 30 días hay martes que salen 5 veces y lunes que salen 4: el martes gana un **+25 % artificial**. | Promedio por ocurrencia del día. Los totales pueden quedarse, pero la predicción no. |
| O4 | "Hoy al cierre (proyección)" | Horario fijo de 7 a 22 h que **ignora el horario configurado**. Supone un flujo uniforme cuando el propio mapa de calor muestra que no lo es. Marca confianza "alta" con el 50 % del día transcurrido. Con el filtro de hora activo, subestima. | Usar el horario configurado más el perfil por hora del histórico, u ocultarla. ❓P8 |
| O5 | Filtro por hora (Estadísticas) | Los `<select>` usan `[value]`, que entrega **texto**. "9" > "12" da `true` comparando texto, y aparece el aviso falso "La hora desde debe ser anterior a hasta" con un rango válido. | `[ngValue]` o `Number()`. |
| O6 | Mapa de calor | Los botones dicen "Esta semana", "Este mes" y "Este año", pero calculan los últimos 7, 30 y 365 días. | Renombrar a "7 días", "30 días" y "12 meses". |
| O7 | Exportar Top alumnos | El PDF se titula **"Top 5"** aunque muestres 10, 25 o 100. En modo personalizado exporta los registros **de los últimos 30 días**, no del rango elegido. | Usar `topLimite` y el rango real. |
| O8 | PDF "Exportar lo que veo" y reportes predefinidos | La tabla se titula **"Detalle de Visitas del Top"**, pero contiene todos los registros del período. | Título correcto según el contenido. |
| O9 | Visitas por carrera | Los invitados aparecen como carrera **"Visitante"**, todos juntos como si fueran **1 alumno** (misma matrícula `INVITADO`): "40 visitas · 1 alumno · 40 promedio/alumno". El PDF los excluye, así que pantalla y PDF no cuadran. | Sacar a los invitados de carreras y mostrarlos como fila aparte. ❓P5 |
| O10 | Tiempo de estancia, horas en el perfil, **constancia PDF**, logros | Incluyen **duraciones inventadas**: el cierre automático guarda exactamente el umbral (por ejemplo, 4 h) y el "cierre al horario" cuenta hasta la hora de cierre. Una vez confirmadas no se distinguen de las reales. La constancia es un documento que certifica horas. | Marcar de forma permanente que la salida fue estimada y excluirla de promedios y constancias. ❓P3 |
| O11 | Motivos | Estadísticas y PDF cuentan **solo el motivo principal**. El Resumen cuenta **todos** los de cada visita. "Estudiar: 12" en Resumen frente a 8 en Estadísticas; al hacer clic en el Resumen, `/registros` filtra solo por el principal y la lista no coincide con el número. | ❓P2 |
| O12 | Gestión de motivos → estadísticas | Renombrar un motivo **parte sus estadísticas en dos**: se agrupa por el nombre guardado en cada registro, y los antiguos conservan el nombre viejo, sin color. | Agrupar por `motivoId` y mostrar el nombre actual. |
| O13 | Estadísticas, Resumen, PDF | Los **datos de prueba** (matrícula 9000001+, `SEED-TEST`) se mezclan con los reales **sin ningún aviso**. Olvidar limpiarlos deja todas las cifras infladas. | Mostrar un aviso en Estadísticas y Resumen cuando existan datos de prueba. |
| O14 | Limpieza de registros y filtro de `/registros` | "Últimos 7 días" abarca **8 días** y "Últimos 30" abarca **31** (hoy más los N anteriores). En la limpieza eso significa borrar un día de más. | Hoy más N−1 días. |
| O15 | Fechas con `toISOString()` (13 sitios) | Toma la fecha en UTC: **después de las 18:00, "hoy" es mañana**. El rango personalizado por defecto termina mañana (el promedio por día divide entre un día de más), el selector deja elegir mañana y los archivos exportados llevan la fecha de mañana. | Helper `hoyLocalISO()`. |
| O16 | "Todo el historial" | Si existe **un solo** registro con fecha inválida, `Math.min` devuelve `NaN` y todo el preset queda en **0** (gráficas vacías). Diagnóstico afirma que esos registros "no aparecerán en las estadísticas", pero en realidad vacían el preset completo. | Ignorar fechas inválidas al calcular el inicio del rango. |

---

## 🟡 Mejora o texto

| # | Dónde | Qué pasa |
|---|---|---|
| M1 | Promedio por día | Divide entre **días naturales**, incluidos domingos y vacaciones. El diálogo de fórmulas sugiere "filtra por hora" para obtener el promedio de días hábiles, pero eso no lo resuelve. ❓P4 |
| M2 | Tasa de retención | El tooltip dice "regresó al menos N veces"; el cálculo es "vino al menos N veces". Regresar 3 veces serían 4 visitas. |
| M3 | Variación diaria | Excluye los días con 0 visitas; el diálogo de fórmulas no lo menciona. |
| M4 | Distribución por grado | Usa el grado **actual** del alumno, no el que tenía al visitar. Las visitas de hace un año se atribuyen a su grado de hoy. |
| M5 | Filtro horario | "07:00–21:00" incluye hasta las 21:59; la etiqueta no lo deja claro. |
| M6 | Umbral de inactividad = 0 | Configuración dice "alertas desactivadas", pero Estadísticas e Inactivos usan 30 de todos modos (`\|\| 30`). |
| M7 | Etiqueta de tendencia | Más de 90 días aparece como "Tendencia anual" aunque sean 4 meses. |
| M8 | Insight del Resumen | "Verifica que el escáner esté operando" salta en días cerrados (domingo) y usa horas fijas de 8 a 20 en lugar del horario configurado. |
| M9 | Insight "Actividad concentrada" | "entre 09 y 14 h" cuando las dos horas pico son 9 y 13, que no son seguidas: sugiere un rango continuo que no existe. |
| M10 | Variación del Resumen | Cuando la referencia es 0, muestra **"+100 %"**. Es un porcentaje inventado. |
| M11 | Tooltip de "Accesos hoy" | Dice "cuántos alumnos"; cuenta visitas, con invitados y repeticiones. |
| M12 | Crecimiento 12 meses | No se recalcula con "Refrescar"; solo al entrar a la pantalla. |
| M13 | Excel de Inactivos | No incluye "días sin venir" ni "última visita", que son justo el dato útil. |
| M14 | Alumnos | El filtro "Inactivos" significa *desactivados*, que no es lo mismo que la página Inactivos (*sin venir*). Mismo nombre, dos conceptos. |
| M15 | Diagnóstico y Presencia | El texto de "duración negativa" dice que el promedio está mal, pero el cálculo ya las excluye. Faltan dos detecciones: **entradas abiertas de días anteriores** (nunca se cierran ni aparecen en Presencia) y **cierres automáticos sin confirmar de días anteriores** (desaparecen de Presencia sin que nadie los revise). |
| M16 | Configuración | El umbral de duplicados solo acepta presets, lo que **va contra el principio de flexibilidad** de CLAUDE.md. `setHorasAutoSalida` y `setUmbralDuplicadoMin` no validan en el servicio, y cada tecla del input dispara un aviso. |
| M17 | Gestión de motivos | Permite dos motivos con el mismo nombre; las estadísticas los fusionan sin avisar. |
| M18 | Datos de prueba | Las matrículas 9000001–9099999 se consideran de prueba. La UAT usa 10 dígitos, así que hoy el riesgo es bajo; anotarlo para la Fase 5 (otras instituciones). |
| M19 | Rendimiento de Estadísticas | Cada carga lee y ordena **todos** los registros **4 veces** (caché, métricas globales, meses disponibles y crecimiento de 12 meses); tres de esas lecturas se saltan la caché. Medido: ordenar 100 000 registros cuesta **~215 ms** en un equipo de desarrollo (300 000: ~830 ms), sin contar la lectura de IndexedDB. En un equipo de biblioteca, probablemente varios segundos. Arreglo: una sola lectura compartida y fechas convertidas una vez. |

**Pasadas rápidas sin hallazgos de cálculo:** Alumnos (los filtros por visitas cuadran) y Gestión de
motivos (CRUD y reordenamiento correctos; solo O12 y M17). En Biblioteca/Presencia, el conteo de aforo
descuenta bien los cierres automáticos; solo aplica M15.

---

## ❓ Decisiones pendientes (las necesito antes de arreglar los hallazgos relacionados)

| # | Pregunta | Mi recomendación |
|---|---|---|
| P1 | "Inactivos": ¿cuentan los alumnos que **nunca** han venido? | Mostrar dos cifras separadas en ambas pantallas: "Dejaron de venir: N" (con historial) y "Nunca han venido: M". |
| P2 | Una visita con 3 motivos, ¿cuenta 1 vez para cada motivo o solo para el principal? | **Contar todos.** El gráfico pasa a "% de visitas que incluyeron este motivo", que puede sumar más de 100 %; por eso conviene cambiar la dona por barras. |
| P3 | Las salidas **estimadas** (cierre automático o por horario), ¿entran en el tiempo promedio, las horas acumuladas y la constancia? | **No.** Guardarlas marcadas como estimadas, excluirlas y decir en pantalla "N visitas sin salida real no se incluyen". |
| P4 | El "promedio por día", ¿entre qué días se divide? | Si hay horario configurado, entre los **días que abrió**; si no, entre los días con al menos un registro. Indicar en pantalla cuál se usó. |
| P5 | Los invitados, ¿cuentan en total de visitas, motivos, carreras, turnos y grados? | **Sí** en totales y motivos; **no** en carreras, turnos, grados ni alumnos únicos. En esas vistas, fila aparte "Invitados". |
| P6 | Al comparar un período **en curso** (este mes, hoy), ¿contra qué se compara? | Contra el período anterior **al mismo avance** (días 1–5 contra días 1–5; hoy hasta las 10:00 contra el lunes pasado hasta las 10:00). |
| P7 | "Este semestre": la UAT, ¿trabaja con semestres enero–junio y julio–diciembre? El generador de datos de prueba usa **3 períodos**. | Preguntarlo al coordinador. Mientras tanto, renombrarlo a "Ene–Jun / Jul–Dic". |
| P8 | La proyección "Hoy al cierre", ¿se rehace o se quita? | Rehacerla con el horario configurado y el perfil histórico por hora. Si no hay al menos 4 semanas de historial, ocultarla. |

---

## Plan de arreglo propuesto

1. **Tanda 1 (no necesita decisiones, todo 🔴 menos R6):** R1, R2, O14 y O15, más O16 (todo es manejo de fechas,
   con un helper único y tests en zona horaria de México), R3, R4 y R5, más O5.
   Además, **correr los tests unitarios con `TZ=America/Mexico_City` en CI** para que esta clase de error no
   vuelva a pasar desapercibida.
2. **Tanda 2 (tras tus decisiones P1–P8):** R6, O1, O3, O9, O10, O11 y M1.
3. **Tanda 3 (blindaje):** sacar los cálculos del componente de 2810 líneas a funciones puras
   (`estadisticas.utils.ts`), con un conjunto de datos fijo y resultados calculados a mano. Incluye el resto de 🟠 y 🟡, más el rendimiento (M19).
