# Notas para el manual de usuario

Material en bruto para la documentación final (Fase 3 del ROADMAP). Se anota
**en lenguaje de usuario** cada definición visible al cerrar la tanda que la
introduce o la cambia, con su porqué, para no reconstruirlo de memoria al
final. No es el manual: es lo que el manual tendrá que decir.

Fuente técnica de cada decisión: `docs/AUDITORIA-2026-10.md` (sección ❓).

---

## Estadísticas — qué significa cada número (v3.42.0, 2026-10-06)

### Promedio por día
Visitas del período divididas entre **los días en que hubo al menos un
registro**. Si hubo registros, la biblioteca abrió; así los domingos, festivos
y vacaciones no bajan el promedio. Un día que abrió pero no llegó nadie
tampoco cuenta. En pantalla: "promedio por día con actividad (N días)".

*Por qué:* dividir entre días naturales mezclaba días cerrados con abiertos y
el promedio no describía un día normal de biblioteca.

### Comparaciones contra el período anterior
Se compara con la **unidad anterior** (v3.46.0): esta semana contra la semana
pasada, este mes contra el mes pasado, este año contra el año pasado, este
periodo escolar contra el periodo anterior. Con rangos de N días ("7 días",
"30 días"), contra los N días previos. El título de la tarjeta dice contra qué
se compara.

Si el período que se ve **todavía no termina** (incluye hoy, "este mes"), el
período anterior se corta a la misma altura: mismo día relativo y misma hora
(un martes a las 8 p. m., "esta semana" se compara con lunes y martes de la
semana pasada hasta las 8 p. m.).
- "Accesos hoy" (Resumen) se compara con el mismo día de la semana pasada
  **a esta misma hora**.
- "Este mes" contra "Mes pasado" (Comparar) toma el mes pasado solo hasta el
  mismo día y hora; la pantalla avisa del recorte.
- El mes en curso del gráfico de 12 meses se compara con el mes anterior al
  mismo día, y no puede salir como "mes más bajo".

Si el período anterior no tuvo visitas, **no se muestra porcentaje**: se dice
que no hay con qué comparar.

*Por qué:* comparar medio día contra un día completo hacía que el sistema
anunciara caídas del 75 % todas las mañanas.

### Motivos de visita
Una visita con varios motivos **suma un punto a cada uno**. El porcentaje se
lee "de las visitas del período, cuántas incluyeron este motivo", y la suma
puede pasar de 100 %. Por eso la gráfica es de barras y no de pastel.
Renombrar un motivo no parte sus estadísticas: se agrupan por motivo, con su
nombre actual.

*Decisión del dueño del producto (P2):* cada motivo es un dato real de lo que
el alumno vino a hacer.

### Tiempo de estancia, horas acumuladas y constancia
Solo cuentan las **salidas registradas por una persona**. Cuando el sistema
cierra una entrada por tiempo o al llegar la hora de cierre, la salida es una
estimación: la visita sigue contando como visita, pero su duración no entra en
el promedio, en las horas del perfil, en los logros ni en la constancia. En la
lista de Registros esas duraciones aparecen como "(estimada)" y en la
constancia como "sin registrar". Confirmar un cierre automático en "En
Biblioteca" significa "visto", no "medido"; si se corrige la hora de salida a
mano, deja de ser estimada.

*Por qué (P3):* la constancia certifica horas; una hora que puso el sistema
no la demostró el alumno, y además infla el promedio (quien olvida marcar
salida casi nunca se quedó tanto como el umbral).

### Invitados
Cuentan en el total de visitas y en los motivos. **No** cuentan en carreras,
turnos, grados ni "alumnos únicos": no son alumnos. Debajo de "Visitas por
carrera" se indica cuántas visitas de invitados hubo aparte.

*Decisión (P5):* los invitados son registros extraordinarios; carreras, turnos
y grados describen alumnos.

### Alumnos inactivos
Un alumno es inactivo si **vino al menos una vez** y lleva **N días o más** sin
volver (días de calendario, N se configura en Configuración → Experiencia). Es
la misma cifra en Estadísticas y en la página Inactivos. Los alumnos que
**nunca** han venido —normalmente importados del padrón desde Excel— se cuentan
aparte y en la página Inactivos se pueden mostrar u ocultar.

*Decisión (P1):* quien nunca vino no "dejó" de venir.

### Día más concurrido
El día de la semana con más visitas **en promedio** (visitas ÷ días de ese tipo
con actividad), no en suma. En 30 días puede haber 5 martes y 4 lunes; sumando,
el martes ganaba solo por aparecer más veces.

### Proyección "Hoy al cierre"
Se calcula con los **últimos días iguales a hoy** (hasta 8 del mismo día de la
semana, de las últimas 10 semanas): qué parte de las visitas del día suele
haber llegado a esta hora, y se extrapola lo que va de hoy. La confianza dice
qué tan parejos fueron esos días. Si no hay al menos 4 días comparables, no se
muestra nada.

*Decisión (P8, tomada por el desarrollador a pedido del usuario):* sustituye a
una regla fija de 7:00 a 22:00 que ignoraba el horario real y suponía un flujo
parejo todo el día.

---

## Otros comportamientos documentables (v3.44.0)

- **Datos de prueba:** si existen (Configuración → Datos → Datos de prueba), el
  Resumen y Estadísticas muestran un aviso: todas las cifras los incluyen hasta
  que se limpian.
- **Umbral de inactividad = 0** significa "alertas desactivadas": Estadísticas
  muestra "—" en la tarjeta de inactivos. La página Inactivos sigue disponible
  con su propio umbral ajustable.
- **Umbral de duplicados:** atajos o cualquier número de minutos; 0 lo
  desactiva (cada escaneo se registra sin preguntar). Solo aplica con el
  módulo de salida apagado.
- **Filtro por hora:** "hasta las 21" incluye toda esa hora (21:00–21:59).
- **Distribución por grado:** usa el grado ACTUAL del alumno; una visita de
  hace un año cuenta en el grado de hoy (el registro no guarda el grado).
- **Retención:** % de alumnos del período que vinieron N veces o más; N crece
  con el largo del período (7 días → 2, 30 → 3, 90 → 5, más → 8).
- **Excel de Inactivos:** incluye última visita y días sin venir.
- **Diagnóstico → Revisar datos** detecta además: entradas de días anteriores
  sin salida (con el módulo de salida activo) y cierres automáticos de días
  anteriores sin confirmar.
- **Alumnos → Estado:** "Desactivados" = dados de baja a mano. No confundir con
  la página Inactivos (alumnos que dejaron de venir).
- **Actividades:** no se permiten dos con el mismo nombre (sin distinguir
  mayúsculas ni acentos).

## Mapa de calor (v3.46.0)
Por defecto usa **el mismo período y filtro de hora** que el resto de
Estadísticas ("Igual que arriba"). Se le puede dar un rango propio (7 a 365
días o personalizado), por ejemplo para ver el patrón de los últimos 30 días
mientras arriba se mira solo "Hoy".

## Aviso de nueva versión (v3.46.0)
La app revisa cada 15 minutos si hay una versión nueva publicada. Cuando la
hay, aparece "Hay una nueva versión disponible" con un botón para actualizar.
Si nadie lo pulsa, se actualiza sola la próxima vez que se abra.

## Reporte del sistema (Diagnóstico)
Sección "¿Qué es esta pantalla y qué revisa?" con cada revisión explicada. El
reporte descargable es para mandarlo a quien da soporte y **puede incluir
algunas matrículas** como ejemplo: no se publica.

## Escáner: lector físico primero (v3.45.0)

El sistema está pensado para un **lector de código de barras** (USB o Bluetooth, unos 340 pesos):
lee al instante y no falla con poca luz, a diferencia de la webcam. El lector se comporta como un
teclado: no necesita instalar nada.
- El escáner **escucha el lector todo el tiempo** en su pantalla; no hay que hacer clic antes.
- Con el lector no aparece "¿confirmas la matrícula?": el código de barras trae verificación propia.
- Sin lector, siempre queda la **captura manual**.
- Configuración → Escáner → **Botón "Usar la cámara"**: mostrar u ocultar el respaldo por cámara.
  Visible por defecto.

## Fechas y zona horaria (v3.41.1 – v3.42.0)

- Las fechas elegidas a mano (Registros, Eliminar registros, Estadísticas)
  se interpretan siempre en la hora local de la biblioteca.
- "Últimos 7 días" son hoy y los 6 anteriores.
- Nuevo Laredo conserva el horario de verano: los días de cambio de hora
  (marzo y noviembre) duran 23 y 25 horas, y el sistema los cuenta como un día
  normal (rachas, reportes semanales, comparaciones).

## Calendario escolar (v3.43.0, 2026-10-06)

Configuración → **Calendario escolar**. Todo se captura a mano.

- **Periodos:** nombre, fecha de inicio y de fin. Viene precargado el
  calendario UAT 2026 (Primavera 5 ene–31 may, Verano 1 jun–16 ago, Otoño
  17 ago–31 dic). Se recomienda capturarlos **sin huecos**: cada periodo
  empieza el día después de que termina el anterior, para que siempre haya
  uno en curso. Si queda un hueco, "Este periodo" muestra el último que
  terminó, marcado "terminado".
- **Días inhábiles:** un día o un rango (vacaciones) con descripción. La UAT
  *suele* recorrer los festivos al lunes o al viernes, pero no siempre: por eso
  es una lista editable y no una regla. Si recorren un festivo, se cambia la
  fecha.
- Los cambios se hacen sobre un borrador: no cuentan hasta pulsar
  **Guardar**. "Descartar cambios" vuelve a lo guardado.
- **Año nuevo:** elegir el año y pulsar **Cargar calendario UAT** (v3.46.0).
  Para 2026 carga el oficial; para otros años, una **aproximación** calculada
  con las reglas de la UAT: festivos de ley recorridos a lunes (primer lunes de
  febrero, tercer lunes de marzo y de noviembre), Semana Santa según la fecha
  de Pascua, vacaciones de verano e invierno y Otoño desde el tercer lunes de
  agosto. Se compara con el PDF oficial y se ajusta lo que la UAT haya movido.
- La pantalla avisa si hay periodos encimados, huecos entre periodos, fechas
  al revés, y cuando el calendario ya no cubre la fecha de hoy (cambio de
  año: **cada año hay que capturar el calendario nuevo**).

**Dónde se usa:**
- Estadísticas y Comparar: botones "Este periodo (nombre)" y "Periodo
  anterior (nombre)". Sustituyen a "Este semestre", que suponía enero–junio /
  julio–diciembre y no corresponde a la UAT.
- Resumen: un día inhábil sin registros muestra "Hoy es día inhábil" en vez
  de la alerta "verifica que el escáner esté operando".
- Los promedios **no** dependen del calendario: ya excluyen solos los días
  sin registros.
