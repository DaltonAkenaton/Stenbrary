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
Si el período que se ve **todavía no termina** (incluye hoy, "este mes"), el
período anterior se corta a la misma altura: mismo día relativo y misma hora.
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
  **Guardar**. "Descartar cambios" vuelve a lo guardado; "Cargar UAT 2026"
  reemplaza lo que se ve por el calendario oficial (tampoco se guarda solo).
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
