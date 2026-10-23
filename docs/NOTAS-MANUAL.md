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
volver (días de calendario, N se configura en Configuración → Operación). Es
la misma cifra en Estadísticas y en la página Inactivos. Los alumnos que
**nunca** han venido —normalmente importados del padrón desde Excel— se cuentan
aparte y en la página Inactivos se pueden mostrar u ocultar.

*Decisión (P1):* quien nunca vino no "dejó" de venir.

### Día más concurrido
El día de la semana con más visitas **en promedio** (visitas ÷ días de ese tipo
con actividad), no en suma. En 30 días puede haber 5 martes y 4 lunes; sumando,
el martes ganaba solo por aparecer más veces.

### Proyección "Hoy cerraría con"
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

- **Datos de prueba:** si existen (Configuración → Avanzado → Herramientas de prueba, con PIN), el
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

## Estadísticas: ajustes de v3.47.0
- **Vinieron solo 1 vez:** alumnos con exactamente una visita en todo su
  historial, desde hoy (no depende del filtro). No cuenta desactivados ni
  invitados. Quien vino por primera vez hoy aparece hasta que regrese.
- **Carrera en crecimiento:** la que más creció en % contra el período
  anterior; necesita ≥ 5 visitas ahora y alguna visita antes (sin base no se
  inventa un "+100 %").
- **Crecimiento mes a mes:** 12 meses por defecto; atajos 3/6/12/24 o
  cualquier número de 2 a 120. El "último trimestre vs anterior" compara dos
  trimestres cerrados completos: necesita al menos 7 meses en pantalla.
- **Tarjeta de inactivos:** al hacer clic abre la página Inactivos.
- **Comparar:** si un lado no tuvo registros, dice "En ese lapso de tiempo no
  hubo registros" en lugar de mostrar ceros.
- **Grados:** del 1.º al 12.º (la carrera dura 9 semestres, pero hay
  rezagados). El importador ya aceptaba hasta 12.

## Aviso de privacidad (v3.48.0)
Junto al lector, el escáner muestra un aviso corto: para qué se usan los datos
de quien se registra. Activo por defecto con un texto genérico; el
coordinador lo cambia o lo oculta en Configuración → Escáner → Aviso de
privacidad. Si el texto se deja vacío, vuelve al original. El texto por
defecto no dice "solo en este equipo" a propósito: dejaría de ser cierto si
algún día se enciende la nube.

## Volver solo al quiosco (v3.49.0)
En Configuración → Quiosco, "Volver solo al quiosco": si el equipo pasa ese
número de minutos sin que nadie lo toque (clic, toque o tecla; pasar una
credencial por el lector cuenta como uso), el modo quiosco se reactiva solo y
regresa al escáner. Atajos de 5, 10, 15 y 30 minutos, o cualquier valor de 0 a
240; 0 = nunca (el valor de fábrica). Funciona con el quiosco apagado, que es
cuando hace falta: cubre el caso de "salí a revisar algo y se me olvidó
volver a activarlo". No interrumpe el asistente inicial.

Si el PIN sigue siendo 0000, Configuración lo marca en ámbar: es el primer PIN
que probaría cualquiera.

**Qué protege y qué no.** En modo local los datos viven en el navegador del
equipo. El quiosco impide que un alumno llegue a la administración desde la
pantalla, pero no es una caja fuerte: quien tenga el equipo y conocimientos
técnicos puede leer la base del navegador. La protección completa es quiosco
+ bloqueo del equipo (contraseña de Windows o del celular) cuando nadie lo
atiende + respaldos guardados solo por el coordinador. El login con cuentas
llega con la nube (Fase 2).

## Respaldos entre dos equipos (v3.50.0)
El caso "equipo de la puerta → PC del coordinador": se exporta el respaldo en
la puerta y se importa en la oficina con **Combinar**. Repetirlo cada día no
duplica nada: cada registro tiene un identificador y se guarda en su lugar.
Los motivos se reconocen por nombre ("Estudiar" de un equipo es "Estudiar" del
otro). Va en un solo sentido: lo que se edite o borre en la oficina no regresa
a la puerta, así que la oficina es solo para consultar.

**Qué versión gana al combinar (v3.57.2).** Si una visita o un alumno se
cambió en los dos equipos, se queda la versión que **una persona** cambió más
recientemente: una corrección hecha en la oficina no se pierde con el respaldo
del día siguiente. El cierre automático no cuenta como cambio de una persona:
la salida real que llega de la puerta reemplaza a la estimada. El resultado de
la importación dice cuántos "se quedaron como estaban aquí". Corregir el nombre
de una carrera (Catálogos → "Corregir en todo") se repite en el otro equipo al
combinar. Si "Reemplazar todo" falla a la mitad, el sistema regresa solo a los
datos que había.

## Horario en "bloquear" (v3.57.2)
Detiene las **entradas** fuera de horario (alumnos y visitantes). Las salidas
siempre se registran: quien se queda después del cierre puede marcar su salida.

## Borrar un registro (v3.50.0)
Registros (o el perfil del alumno) → lápiz del registro → **Eliminar**, con
confirmación. Para un escaneo por error que nadie deshizo a tiempo. No se puede
deshacer. Para borrar muchos a la vez: Configuración → Datos → limpieza por rango.

## Del registro al alumno (v3.51.0)
En Registros, tocar una fila abre el detalle de la visita; el bloque con el
nombre del alumno lleva a su perfil. Los invitados no tienen perfil, así que en
ellos no es un enlace. El detalle lista todas las actividades de la visita.

## PIN del quiosco y respaldo del día (v3.52.0)
Tras **5 PIN incorrectos** el diálogo se bloquea **5 minutos** (aunque se
recargue la página) y cada intento queda en la Bitácora. Con el PIN correcto
hay dos opciones: **Descargar respaldo** (el equipo sigue en modo quiosco: es la
rutina diaria para llevar los datos a la oficina) o **Salir del modo quiosco**.

## PIN del coordinador y código de recuperación (v3.57.0)
El **mismo PIN del modo quiosco** se pide para lo que no se deshace: eliminar
registros por fechas, reemplazar todo con un respaldo, restablecer el sistema y
abrir las herramientas de prueba (Configuración → Avanzado). Esos diálogos
ofrecen descargar un respaldo en el mismo paso. Los intentos fallidos cuentan
juntos en todos los diálogos (5 fallos = 5 minutos de bloqueo).

- El PIN es de **4 a 6 dígitos**. Ya no se ve en Configuración: "Cambiar PIN"
  pide el actual y el nuevo dos veces.
- **Código de recuperación** (como `K7QM-2XPA-9TDF`): se muestra **una sola
  vez**, al poner el PIN (asistente inicial, Cambiar PIN o "Generar código" en
  Configuración → Quiosco). Se anota en papel junto con el PIN, fuera del equipo.
- Si se olvida el PIN: "¿Olvidaste el PIN?" → escribir el código (minúsculas y
  sin guiones también valen) → poner un PIN nuevo, que trae un código nuevo; el
  usado deja de servir. Queda en la Bitácora ("Usó el código de recuperación").
- Sin PIN configurado, cualquiera puede hacer esas acciones: el diálogo lo avisa.

## Bitácora (v3.52.0)
Configuración → Bitácora. Anota **qué** se hizo, **cuándo** y **en qué
equipo**: salidas del modo quiosco, PIN incorrectos y bloqueos, cambio de PIN,
visitas editadas o borradas, limpiezas por fechas, alumnos editados,
desactivados o borrados, actividades borradas, respaldos descargados o
importados y "borrar todo". No dice **quién** (no hay cuentas en modo local).
- **Nombre del equipo:** en la misma pantalla. Ponerle "Puerta" o "Oficina" a
  cada computadora; sale en cada evento.
- **Viaja en el respaldo:** al importar el respaldo de la puerta en la oficina,
  su bitácora se suma; con el filtro por equipo se ve solo lo de la puerta.
- **No se puede borrar** desde el sistema, ni siquiera con "borrar todo".
  Guarda los últimos 5000 eventos.
- Lo que no anota: los registros normales del escáner (eso ya está en
  Registros) ni el "Deshacer" justo después de escanear.

## Listas largas y PDF con muchas visitas (v3.55.0)

- **Perfil del alumno:** el historial muestra las 50 visitas más recientes; "Mostrar más" agrega otras 50. Los totales (visitas, horas, actividad frecuente) siempre cuentan todo el historial, no solo lo que se ve.
- **Alumnos inactivos:** igual, de 60 en 60. Cambiar la búsqueda, la carrera o el orden vuelve a la primera tanda. "Exportar a Excel" lleva la lista completa.
- **PDF con más de 3 000 visitas** (Registros, "Exportar lo que veo" y el reporte por periodo de Estadísticas): antes de generarlo, el sistema pregunta. "Incluir detalle" agrega una tabla con cada visita (unas 40 por página: un año son cientos de páginas y puede tardar minutos). "Solo resumen" deja totales, carreras, actividades, turnos y alumnos frecuentes. Cerrar la ventana cancela. "Personalizar PDF" no pregunta porque ahí ya se eligen las secciones.
- **Excel:** el archivo va comprimido. Dos años de visitas pesan unos 17 MB.

## Estadísticas: Top y retención (v3.55.1)

- **Top de alumnos:** por defecto, "Igual que arriba": mismo período y filtro de hora que el resto de la pantalla. Con 7/30/90 días, Año, Todo o Personalizado se elige otro período solo para la lista; el filtro de hora entonces no aplica. Excel y PDF del Top usan exactamente lo que se ve.
- **Tasa de retención:** en períodos de un día (Hoy, Ayer) dice "No aplica". Se mide desde 2 días.
- **Alerta de crecimiento/caída:** compara contra el mismo período anterior que la tarjeta "Contra…" (semana, mes, periodo o año anterior al mismo avance).

## Frases que solo salen con datos suficientes (v3.55.2)

- **"Hoy cerraría con (proyección)":** necesita al menos 4 días del mismo tipo (p. ej. 4 viernes) en las últimas 10 semanas y que, sumándolos, ya hubieran llegado **10 visitas o más a esta hora**. Si no, la tarjeta no aparece. Temprano por la mañana, o con poco historial, es normal que no salga.
- **"Día dentro de lo normal"** (Resumen): solo cuando se comparó con el mismo día de la semana pasada a la misma hora (10 visitas o más de referencia) y la diferencia es menor de ±30 %. Si no hay con qué comparar, el mensaje solo dice cuántos accesos van.
- **Empates:** si varias horas tienen el mismo máximo, la hora pico dice "empata con N franjas más". El valle dice cuántas franjas tienen el mínimo y no cuenta las horas sin ninguna visita.
- **Top de alumnos:** a igual número de visitas, primero quien vino más recientemente.

## Actividades por visita y altas (v3.56.0)

- Toda pantalla que lista visitas (Registros, historial del perfil, Últimas entradas, constancia, Excel, PDF) muestra **todas** las actividades de cada visita, separadas por coma.
- **"Alumnos dados de alta hoy"** (Resumen): alumnos registrados en el sistema hoy, en la puerta o importados. No significa que hayan venido.

## Importar alumnos (v3.57.0)

- La vista previa muestra **qué columna del archivo se usó para cada dato** (Matrícula ← "Cuenta", etc.) y permite cambiarla. Si falta una columna obligatoria (matrícula, nombre, apellido paterno, carrera, grado, grupo, turno), no deja importar hasta elegirla.
- Reglas iguales a las del registro en la puerta: apellido materno opcional; nombres en MAYÚSCULAS o minúsculas se capitalizan ("JUAN PÉREZ" → "Juan Pérez"); la matrícula se guarda sin la "a" y con 7 dígitos o más; la carrera se reconoce sin importar mayúsculas ni acentos.
- **Carrera fuera del catálogo:** la fila se importa con un aviso amarillo (no se rechaza).
- Matrículas repetidas en el mismo archivo: se importa la primera; las demás aparecen con error en la vista previa.
- Volver a cargar el mismo archivo no duplica: los que ya existen se omiten.

## Confirmar la matrícula (v3.57.0)

- Escribir la matrícula + **Enter + Enter** registra la entrada. Esc o "Cancelar" cancelan.
- Si se pasa una credencial con esa ventana abierta, se ignora y aparece "Primero confirma o cancela esta matrícula".

## Cerrar al final del horario (v3.57.0)

- A quien no registró salida, el sistema le pone como salida **la hora de cierre de ese día** (según el horario de operación). Si ese día no abría o la persona entró después del cierre, el fin del día.
- Funciona aunque la computadora estuviera apagada a la hora de cierre: al encenderla, se cierran las entradas pendientes de los últimos 7 días. Las de días anteriores quedan confirmadas; las de hoy aparecen en "En Biblioteca" para revisar (salvo con "Confirmar automáticamente").
- Requiere "Registro de salida", "Horario de operación" y la opción activados. Es una salida estimada: no cuenta en promedios de estancia ni en constancias.

## Corregir una salida estimada (v3.57.0)

- En "En Biblioteca", al tocar a alguien con salida estimada: **Confirmar y cerrar** la deja tal cual (sigue siendo estimada) o **Corregir hora** permite escribir la hora real.
- La hora debe estar entre la entrada y ahora. Corregida, **deja de ser estimada**: su tiempo de estancia cuenta en promedios y constancias. Queda en la Bitácora.

## Proyección y comparación, en palabras (v3.57.0)

- "Hoy cerraría con ~27 visitas en total · van 12, faltan ~15": 27 es el **total** esperado del día, no visitas adicionales.
- La tarjeta de comparación muestra la cifra ("↑ 8.8%") y debajo qué significa ("más que el período anterior") con los dos totales.

## Actividades: más de 100 % y actividades eliminadas (v3.57.0)

- Bajo la gráfica de actividades y bajo la tabla del PDF aparece la nota "por eso los porcentajes suman más de 100 %" con el promedio de actividades por visita, solo cuando alguna visita tuvo más de una.
- Una actividad borrada del catálogo **sigue contando** (esas visitas pasaron) y aparece como "nombre (actividad eliminada)". Para que deje de salir como opción sin perder el nombre limpio, mejor **Desactivar**: el diálogo de eliminar lo ofrece cuando la actividad ya se usó.
- El número de visitas que muestra ese diálogo cuenta por la actividad misma, aunque se haya renombrado.

## Excel de registros: hoja "Notas" (v3.57.0)

El Excel trae una segunda hoja que explica cada columna: Actividades (todas las de la visita), Salida estimada ("Sí" = la puso el sistema), Duración (vacía si la salida es estimada) e INVITADO.

## Dónde quedó cada ajuste (v3.57.0)

- **Configuración → Operación:** horario de operación, registro de salida y cierres, aforo, duplicados y alertas de inactividad.
- **Configuración → Quiosco:** modo quiosco, volver solo, PIN y código de recuperación.
- **Configuración → Bitácora:** nombre del equipo (con botón Guardar) y la bitácora, con filtros por tipo, equipo, fechas y texto (sin importar acentos ni mayúsculas).
- **Configuración → Avanzado:** accesos directos, herramientas de prueba (con PIN) y restablecer.
- En la interfaz se dice **"actividad"** (antes a veces "motivo"): es lo mismo.

## Catálogos: carreras, grupos y grados (v3.57.0)

Configuración → Catálogos.

- **Agregar** una carrera: aparece al registrar alumnos y se reconoce al importar el Excel (sin importar mayúsculas ni acentos).
- **Desactivar**: deja de ofrecerse al registrar, pero sus alumnos y visitas se conservan y siguen en Estadísticas. No hay "borrar".
- **Renombrar** pregunta qué hacer con lo ya registrado:
  - **Corregir en todo**: el nombre estaba mal escrito. Cambia también en los alumnos y visitas anteriores; Estadísticas muestra una sola carrera.
  - **Cambió de nombre**: la carrera nueva convive con la anterior (p. ej. una generación con plan nuevo). La anterior queda desactivada con sus datos y Estadísticas muestra las dos.
- Abajo aparecen las carreras que están en tus datos pero no en el catálogo (de un Excel o de un nombre viejo), con "Agregar al catálogo".
- **Grupos**: agregar y quitar. Quitar uno no cambia a los alumnos que ya lo tienen.
- **Grados**: rango libre (por ejemplo, del 1 al 12 para incluir rezagados).
- Los turnos (Matutino, Vespertino, Mixto) no se editan.
- El catálogo viaja en el respaldo: al **combinar**, solo se suman las carreras y grupos que falten; al **reemplazar**, queda el del archivo.

## Verificar cifras (v3.57.0)

Reporte del sistema → **Verificar cifras**. Para hoy, los últimos 7 días, este mes y todo el historial compara:

- el total de visitas guardadas (la base de datos, igual que Registros y "Eliminar registros");
- el total de Estadísticas, la suma de las barras, la suma del mapa de calor, visitas por carrera + visitantes y el total de la gráfica de actividades;
- el Resumen de hoy;
- que ninguna visita esté sin actividad.

Todo en verde = las pantallas dicen lo mismo. Algo en rojo = no entregar reportes de ese periodo y mandar el reporte del sistema a soporte (ya incluye qué no cuadró). Recomendado: una vez por semana durante el primer mes.

## Registros: buscar, filtrar y ordenar (v3.58.0)

- **Búsqueda**: al escribir parte del nombre o la matrícula aparecen los
  alumnos parecidos, sin importar acentos. Elegir uno deja solo sus visitas.
- **Quién**: solo alumnos o solo visitantes.
- **Salida**: *real* (la marcó el alumno o el personal), *puesta por el
  sistema* (cierre automático o cierre al horario; no cuenta en el tiempo
  promedio) o *sin salida*.
- **Duración**: de tantos a tantos minutos; una caja vacía = sin límite. Las
  visitas sin salida no tienen duración y no aparecen con este filtro.
- **Ordenar**: tocar el encabezado de la columna; otro toque invierte.
- El Excel y el PDF salen con los filtros que estén puestos.

## Día con más visitas y días sin visitas (v3.58.0)

- Tarjeta en Estadísticas → Resumen. "Días hábiles" = los que la biblioteca
  debía abrir según el **horario** de Configuración y el **calendario
  escolar** (sin festivos ni vacaciones). Hoy no cuenta: el día no ha terminado.
- Un día hábil con **cero** visitas casi siempre es la computadora de la
  puerta apagada o que nadie registró: revisarlo.
- Con "Filtrar por hora del día" no se muestran los días sin visitas.

## Promedio por día de la semana (v3.58.0)

Bajo el TOTAL de cada fila del mapa de calor: visitas de ese día ÷ cuántos de
esos días tuvieron visitas (p. ej. 62 visitas en 9 martes = 6.9/día). Es lo
que decide la tarjeta "Día más concurrido".

## Comparar un mes contra el anterior

Al elegir un mes completo, "Contra los N días anteriores" compara contra el
mismo número de días justo antes (septiembre, 30 días → 2 al 31 de agosto), no
contra el mes anterior completo. Por eso puede no coincidir con la cuenta
"septiembre contra agosto" hecha a mano.

## Hora del sistema (v3.59.0)

- Stenbrary **no usa la hora de la computadora**. Desfase = hora correcta −
  hora de la PC; se aplica a todo (visitas, "hoy", horario, cierres,
  estadísticas). La hora de Windows no se toca.
- **Con internet** se verifica al abrir, cada 30 minutos y al volver la
  conexión (hora del servidor; precisión de un segundo). **Sin internet** se
  sigue con el último desfase guardado.
- **Ajustar a mano** (Configuración → General, con PIN): para equipos sin
  internet. La siguiente verificación por internet lo reemplaza.
- **Avisos**: en el escáner, "La hora de esta computadora no está verificada"
  si nunca se verificó o si el reloj de la PC quedó antes del último ajuste
  (alguien la cambió o se reinició la pila). En Configuración, además, si
  pasaron más de 14 días sin verificar.
- Las correcciones de más de 5 minutos y los ajustes a mano quedan en la
  Bitácora ("Corrigió la hora").
- Las visitas que ya existían no se mueven.

## Alumnos por número de visitas (v3.59.0)

- Alumnos → filtro "Visitas (histórico)": atajos (0, 1, 2–4, 5+) o
  **Personalizado** con "De" y "A" (vacío = sin límite). Cuenta visitas de
  toda la historia, no del período; los visitantes no cuentan.
- Con el filtro activo, junto a cada nombre sale su número de visitas.
- Estadísticas → "Vinieron solo 1 vez" abre esta lista (1 visita, activos).

## Visitas agregadas a mano (v3.59.0)

- Registros → **Agregar visitas**: para lo anotado en papel (sin luz, PC de la
  entrada apagada). Alumno (matrícula o nombre, solo activos) o visitante;
  fecha, entrada y salida opcional; actividades.
- No acepta horas en el futuro ni una salida antes de la entrada. No revisa el
  horario: si se anotó, pasó.
- **Visita parecida**: misma matrícula (o, para visitantes, mismo nombre) a
  menos del umbral de duplicados (Operación, 30 min por omisión). Avisa; un
  segundo clic con los mismos datos la guarda igual.
- Cuentan igual en todas las cifras. Quedan con `capturaManual` (etiqueta
  "a mano" en Registros, columna "Capturada a mano" en el Excel) y en la
  Bitácora como "Agregó una visita a mano".
