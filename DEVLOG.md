# DEVLOG — Stenbrary

Crónica técnica del desarrollo. No es documentación para usuario final
(eso vive en `src/app/core/data/changelog.data.ts`), ni doc arquitectónica
formal (eso vivirá en `docs/adr/` cuando aplique).

Formato: una entrada por tanda de trabajo. Fecha, qué se hizo, qué se
descubrió, qué se decidió, qué sigue. Breve y honesto.

---

## 2026-10-14 — La puerta con prisas: lector fuera del escáner y flujos abandonados (v3.54.0)

Segunda vuelta de revisión. Sin el Excel de la UAT, cada alumno se registra
solo en la puerta, así que se revisó ese camino con el lector y con gente que
se va a medias.

- **Bug real, confirmado por E2E:** en "elegir actividad" el foco puede quedar
  en "Registrar"; el lector del siguiente alumno manda dígitos + Enter y ese
  Enter registraba al anterior. `LectorRafagaService` reconoce la ráfaga y se
  come el Enter. Cancelar el keydown NO bastó (la E2E siguió fallando): Chrome
  activa el botón con un click de teclado posterior; se descartan keypress,
  keyup y clicks con `detail === 0` en los 300 ms siguientes.
- **Flujos abandonados:** en quiosco nada regresaba al escáner. Ahora 90 s
  (actividad) / 3 min (registro) sin interacción → vuelve solo. Lectura de
  otra credencial: con la pantalla 20 s sin tocar, se atiende al nuevo
  (`lecturaPendiente` en sessionStorage); si no, espera con aviso.
- **PIN:** una credencial leída con el diálogo abierto contaba como intento
  fallido (5 → bloqueo). Se descarta.
- **Nombres:** solo letras, espacios de sobra fuera, capitalización si viene
  todo en mayúsculas/minúsculas, materno opcional. La E2E pescó que un espacio
  inicial daba "solo letras": se valida ya recortado (`esNombreValido`). En el
  diálogo de edición no se puso el patrón: nombres importados con caracteres
  raros bloquearían guardar otros campos.
- **Dos pestañas:** registrar desde ambas ya estaba bien. Lo que faltaba:
  `blocked`/`blocking` de IndexedDB. Una pestaña vieja bloqueaba la subida de
  `DB_VERSION` y la nueva se quedaba cargando sin decir nada. Ahora la nueva
  avisa y la vieja se recarga. Solo protege de esta versión en adelante.

308 unitarios, 43 E2E.

## 2026-10-14 — Revisión con el escenario puerta + oficina (v3.53.0)

Revisión del código pensando en una puerta 24/7 en quiosco que casi nunca se
recarga y una oficina que importa el respaldo a diario. Hallazgos y arreglos:

- **Cierre tras N horas solo corría al abrir /presencia.** En la puerta esa
  vista no se abre (ni se puede en quiosco): entradas abiertas todo el día y
  aforo inflado. Ahora lo corre AppComponent cada minuto. Además solo miraba
  "hoy": una entrada de las 21:30 con umbral de 3 h vencía mañana y quedaba
  abierta para siempre. Ventana de 7 días; las de días anteriores se cierran
  confirmadas (Presencia no las mostraría).
- **Import diario lento.** Medido con un año sintético (3 000 alumnos, 50 000
  visitas, JSON de 27 MB): 71 s la primera vez y 124 s la segunda, en una PC
  rápida. Lotes en una transacción: 46/65 s. Sacarlo de la zona de Angular: sin
  cambio (no era la detección de cambios; se descartó). Lo que funcionó: no
  reescribir lo que no cambió (`huella()`): **3 s** el día siguiente. Escribir
  en IndexedDB con 4 índices cuesta ~1 000 filas/s; leer es barato.
- **Borrados no viajaban.** Combinar nunca quita: una visita basura borrada en
  la puerta seguía en la oficina. Los eventos de borrado llevan `refId`; al
  combinar se aplican los nuevos y todos evitan revivir lo borrado. Reemplazar
  no los aplica (restaurar debe devolver el archivo tal cual — p. ej. tras un
  borrado por error, cubierto por test).
- **Eliminar alumno no borraba sus visitas** aunque el diálogo lo prometía.
- **Aviso de versión nueva visible para los alumnos** en quiosco, y si alguien
  tocaba "Ahora no" la puerta se quedaba en la versión vieja. Oculto en
  quiosco; se aplica solo con el escáner 2 min sin uso.
- Aforo a medianoche refrescado; "último respaldo" en el diálogo del PIN (el
  recordatorio del Resumen no se ve en quiosco).

Revisado y bien: Ctrl+K, "?" y Alt+N ya estaban bloqueados en quiosco; el
cierre por horario ya corría cada minuto; exportar 1.5 s y las pantallas de
consulta 0.3–2 s con un año de datos.

296 unitarios, 38 E2E.

## 2026-10-14 — Seguridad local para dos equipos (v3.52.0)

Última vuelta antes de la visita al coordinador, con el modelo de dos equipos
(puerta en quiosco 24/7 + PC de la oficina). Al revisarlo aparecieron dos huecos
reales:

- **El PIN no tenía límite de intentos.** 4 dígitos, intentos infinitos frente
  a la puerta. Ahora 5 fallos → 5 min de bloqueo, persistido en localStorage
  (`stenbrary-pin-intentos`: recargar no lo reinicia). Funciones puras en
  `quiosco.utils.ts`; si el reloj se atrasa, el fin del bloqueo se recorta a un
  bloqueo completo (`normalizarIntentosPin`) para no quedar trabado.
- **El respaldo diario obligaba a salir del quiosco.** Con el PIN correcto el
  diálogo ofrece ahora "Descargar respaldo" (sigue en quiosco) o "Salir".

Y la **bitácora local** (qué, cuándo, en qué equipo; el "quién" llega con las
cuentas de la Fase 2). Decisiones:

- Store propio, `DB_VERSION` 3. Solo agregar y leer; `limpiarTodosDatos()` no
  la toca y el import la combina también en `replace`: tiene que sobrevivir a
  un "borrar todo" para que se note. Tope 5000 eventos.
- Viaja en el respaldo (`bitacora?`, opcional) con `meta.equipo`: la oficina ve
  lo que pasó en la puerta. `nombreEquipo` nuevo en `ConfigService`.
- Se anota en el punto de la acción (componentes, `BackupService`,
  `QuioscoAutoService`), no dentro de `DatabaseService.eliminarRegistro`: el
  "Deshacer" del escáner y el generador de datos de prueba también borran y no
  deben ensuciarla. Costo: una acción nueva hay que anotarla a mano (lo dice
  CLAUDE.md).
- `registrar()` nunca lanza. El PIN nunca se escribe en el detalle.
- Límite honesto: quien sepa abrir las herramientas del navegador puede borrar
  los datos del sitio, pero eso borra todo y se nota.

La E2E encontró un "Te quedan 1 intento". 287 unitarios, 37 E2E.

## 2026-10-14 — Del registro al alumno; lag del drawer (v3.51.0)

Pruebas del usuario con hardware: Excel, constancia PDF con ñ/acentos y app en
el Galaxy A06 bien. El menú "Más" (drawer) da lag en el A06.

Medido con CPU x6 (CDP `setCPUThrottlingRate`): ~45 fps y un cuadro de 117 ms
al primer abrir; o sea, el cuello del A06 es la GPU, que la emulación no mide.
En móvil se quitó lo caro para GPU/layout: `backdrop-filter` a pantalla
completa (backdrop y topbar), `filter: blur` animado en ~15 etiquetas,
`letter-spacing` animado (layout), pulso infinito de box-shadow, borde animado,
y la animación simultánea de `width` + `transform` (el drawer ya nace con el
ancho expandido; solo `transform`). CPU x6 tras el cambio: 10–25 % menos
tiempo por cuadro. La confirmación real es en el A06.

Detalle de registro: el alumno enlaza a `/detalle-alumno/:matricula` (opción
`enlazarAlumno`, solo desde /registros; nunca para INVITADO) y se listan todos
los `motivoNombres`.

## 2026-10-12 — Pasada de pruebas manuales, mi parte (v3.50.0)

Recorrido automatizado (Playwright exploratorio, fuera de la suite) de los
pendientes de `docs/PRUEBAS-MANUALES.md` que no requieren hardware.

**Lo grave:** importar un respaldo de OTRA instalación dejaba los registros
apuntando a ids de motivo inexistentes — cada base crea sus 5 motivos default
con UUIDs propios y el import omitía los del respaldo por nombre sin traducir
los ids. Efectos: `contarMotivos` (agrupa por id) partía "Estudiar" en dos
filas, y el editor de registro tronaba (`principal.id` de undefined). Pasaba
también al restaurar en modo replace (limpiarTodosDatos recrea defaults). Es
exactamente el flujo diario de la opción "equipo en la puerta + PC del
coordinador". Fix: mapa id-respaldo → id-local por nombre + `remapearMotivos`;
replace restaura el catálogo del respaldo con sus ids. 2 specs con dos
IDBFactory distintas (con una sola, las dos "instalaciones" compartían base y
el test pasaba en falso). El editor además resuelve ids huérfanos por nombre.

**Más:** no existía borrar un registro suelto (añadido en el editor, con
ConfirmDialog danger + `AforoService.refrescar`); nombre del respaldo con
`toLocaleTimeString` daba "_0937 p.m..json"; `disableClose` bloqueaba Escape en
los diálogos del escáner (`keydownEvents`); gramática ("los domingo", "Hay 1
personas", "1 registros", "Hoy" a media frase); nombres sin espacios desbordaban
tabla y perfil (`overflow-wrap: anywhere`).

**Verificado sin cambios:** entrada/salida, entrada de ayer, cierre automático,
aforo confirmar/bloquear, horarios en 8 casos, lector rápido vs tecleo humano,
dos pestañas, matrícula 0000001, combinar dos veces sin duplicar, Escape,
bottom nav 57 px. CLAUDE.md decía `DB_VERSION = 1`; es 2 desde Fase 2.2.

## 2026-10-12 — El quiosco vuelve solo (v3.49.0)

Pregunta del usuario: "el sistema lo puede usar cualquiera que tenga acceso,
¿no hay seguridad?". Respuesta: la URL pública no expone nada (cada navegador
tiene su propia base vacía); el riesgo es el equipo físico. Un login local
sería cosmético (los datos siguen legibles desde DevTools), así que se cerró el
hueco real: el equipo que queda fuera de quiosco por descuido.

- `quioscoAutoMinutos` (0–240, 0 = apagado, default 0) en `ConfigService`.
- Decisión pura en `core/utils/quiosco.utils.ts` (`debeVolverAQuiosco`, 5 specs);
  `QuioscoAutoService` escucha pointerdown/keydown/wheel/touchstart fuera de la
  zona de Angular (solo guarda un timestamp: nada de detección de cambios por
  evento, importa en el Galaxy A06) y revisa cada 15 s. No actúa en
  `/bienvenida` ni `/login`. El effect existente de `AppComponent` lleva al escáner.
- E2E con `page.clock` (adelanta 5:30 min sin esperar): 2 tests nuevos.
- Aviso ámbar si el PIN sigue en 0000.

Sigue: plan de respaldos y preparar la visita "casi definitiva" al coordinador.

## 2026-10-12 — Cloudflare Pages en producción (v3.48.1)

`https://stenbrary.pages.dev` publicado y verificado: cabeceras (sin caché para
`index`/`ngsw`/workers, un año para lo que lleva hash), fallback SPA, y la app
instalada en un Galaxy A06 que registró entrada y salida con lector en modo avión.

- **Correo dedicado bloqueado.** Google: "número usado demasiadas veces".
  Microsoft: "actividad inusual". Se paró ahí (dos intentos) y la cuenta se creó
  con un alias `+stenbrary` del Gmail personal; el correo se cambia después.
- **Cloudflare ya llama "legacy" a Pages** y empuja Workers: el "Connect GitHub"
  de *Create* crea un Worker. Se entra por "Continue to Pages".
- **Primer build falló por un espacio** al inicio de *Build output directory*.
- **Node 20 llegó a fin de vida** (aviso del build): `.nvmrc` y CI a 22.
- La 3.48.1 existe para que el push cambie los archivos de la app: solo con
  `.nvmrc` el `ngsw.json` saldría idéntico y no habría aviso que probar.
- Observación del usuario: lag al abrir el drawer y "Más" en el A06 (4 GB).
  Propuesta: medir primero (Chrome remoto), abaratar lo caro (`backdrop-filter`,
  sombras) y como complemento un modo ligero automático/configurable. Pendiente.

**Sigue:** confirmar el aviso de nueva versión en el celular; apagar Netlify.

---

## 2026-10-12 — Notas del usuario sobre Estadísticas y Ctrl+K (v3.47.0)

Revisión de sus notas del bloc. Lo que se hizo y lo que apareció al revisar:

- **Versionado.** 63 versiones, consistentes con `package.json`, pero 20 el
  31-ago, huecos (3.23.1, 3.28.0–2) y ninguna `git tag`. Sin renumerar:
  política nueva en CLAUDE.md (una versión por publicación, v4.0.0 = entrega
  UAT, tag por versión).
- **Manual de fórmulas contra el código.** Lo documentado cuadraba; faltaban
  "Vinieron solo 1 vez", "Carrera en crecimiento" y el resumen del
  crecimiento. Dos errores reales: la carrera en crecimiento mostraba +100 %
  sin base, y "solo 1 vez" se calculaba en el componente (contaba
  desactivados y borrados). Ahora `contarUnaSolaVisita` en utils, mismo
  universo que la inactividad.
- **Crecimiento ajustable** (3/6/12/24 o 2–120). Al probarlo con 6 meses salió
  un bug que con 12 nunca se veía: `resumirCrecimiento` aceptaba "trimestres"
  de 2 meses (3 contra 2). Ahora exige 3 + 3 cerrados (≥ 7 meses).
- **Grados 1–12.** El importador ya aceptaba 12 y los formularios llegaban a 10.
- **Ctrl+K** estaba atrasado: faltaban 6 pantallas y el toggle de cámara;
  "En Biblioteca" salía con la salida apagada. Ahora sigue al menú lateral
  (mismas condiciones y permisos por rol).
- Tarjeta de inactivos → `/inactivos`; comparador con mensaje cuando un lado
  no tiene registros.

**Sigue:** Cloudflare Pages (pasos del panel, del usuario).

**Después, mismo día (v3.48.0): aviso de privacidad.** La entrega será una
herramienta del coordinador, sin pasar por dirección. En modo local los datos no
salen del equipo, pero los alumnos sí ven el escáner. Por eso hay un aviso
corto junto al lector, editable y ocultable. La primera versión lo puso al fondo
de la página (bajo "¿No eres alumno?") y su ajuste dentro del `<details>`
plegado de la cámara: las capturas lo delataron y se movió al lector y a una
tarjeta propia.

---

## 2026-10-07 — Ajustes antes de la presentación (v3.46.0)

Pedidos del usuario tras revisar el sistema con sus capturas, más lo que
apareció al verificarlos.

- **Comparación por unidad.** La captura de "Este periodo" (Otoño comparado
  con 2 abr–22 may) y la de "Esta semana" (lun–mar contra sáb–dom) eran el
  mismo error: "mismos días hacia atrás" solo vale para rangos móviles.
  `rangoAnteriorDeUnidad` compara semana/mes/año/periodo con la unidad
  anterior al mismo avance. E2E en el cuadre con el caso de la semana.
- **Aviso de nueva versión.** No funcionaba: `PwaUpdateService.iniciar()` no
  lo llamaba nadie y además esperaba `isStable`. Verificado con un despliegue
  A → B real.
- **La trampa de la investigación (40 min perdidos).** Al probar el aviso,
  el SW de Angular salía en `SAFE_MODE` ("Entry already exists") y la app no
  abría sin internet en Chrome. Pareció un problema grave de producción; se
  probó Angular 22, reinicios, políticas… Lo resolvió una prueba de 2 minutos
  del usuario en su Chrome real: `Driver state: NORMAL`. Era el Chrome que
  lanza Playwright. Lección (también en memoria): ante un hallazgo grave,
  reportar y pedir la prueba más barata ANTES de excavar.
- Mapa de calor sigue al período principal por defecto; calendario típico
  UAT para cualquier año (Pascua calculada; el típico 2026 coincide festivo
  por festivo con el PDF); "¿Qué es esta pantalla?" en Diagnóstico;
  `environment.mostrarConexionNube` para ocultar la nube en modo local.

---

## 2026-10-06 — Preparación de Cloudflare Pages

Lo que no necesita la cuenta del usuario quedó en el repo; los pasos del panel,
en `docs/DESPLIEGUE-CLOUDFLARE.md`.

- `public/_headers`, válido en Netlify y en Cloudflare: sin caché para
  `index.html`, `ngsw.json` y los workers (la lección de la ronda de pruebas:
  si el service worker no ve el `ngsw.json` fresco, el equipo se queda con la
  versión vieja) y un año, `immutable`, para lo que lleva hash. Sin regla
  `/*.js` genérica: Cloudflare **combina** las cabeceras de todas las reglas
  que coinciden, y `ngsw-worker.js` heredaría el `immutable`.
- `.nvmrc` = 20, el mismo Node que CI; Cloudflare lo lee solo.
- Verificado con `npx wrangler pages dev`: fallback SPA automático (200 en
  `/estadisticas`), cabeceras aplicadas y la regla de `_redirects` de Netlify
  ignorada con "Infinite loop detected". Se borra al apagar Netlify.

---

## 2026-10-06 — Ronda de pruebas: cuadre, volumen y exportes

Informe en `docs/PRUEBAS-RONDA-2026-10.md`. Todo con Playwright sobre el
build de producción, servido por un servidor estático mínimo, con
`timezoneId: America/Matamoros`.

- **Cuadre 32/32.** Fixture de 6 alumnos / 10 visitas restaurado con la UI
  real, reloj congelado con `page.clock`. Quedó como `e2e/cuadre.spec.ts`.
  Las 6 "fallas" de la primera corrida eran de las regex: `innerText`
  respeta `text-transform: uppercase` y pega spans contiguos.
- **Volumen.** 21 k y 50 k registros: todo < 2 s en el equipo de desarrollo.
- **Lo que encontró**, corregido en v3.44.1: el generador de datos de prueba
  creaba visitas futuras (hora al azar 7–22 también para hoy); jsPDF sin
  `compress` (41 MB → 4 MB); nombres de PDF idénticos; Excel de Registros sin
  salida, duración ni motivos secundarios; detalles de texto.
- **Trampa de la prueba que es lección de despliegue:** un perfil persistente
  siguió ejecutando código viejo tras recompilar (service worker y caché HTTP;
  el servidor de pruebas no mandaba `Cache-Control`). Se midió con
  `serviceWorkers: 'block'` y `no-store`. En producción hay que verificar que
  el aviso de nueva versión funcione en el primer despliegue.

**Sigue:** pruebas manuales del usuario (lista en el informe), luego Cloudflare.

---

## 2026-10-06 — Tanda 3: el resto del informe y el blindaje

Cierra los 🟠 y 🟡 pendientes de `docs/AUDITORIA-2026-10.md` (v3.44.0).

**Blindaje.** Los cálculos que seguían dentro de `dashboard-ejecutivo.component.ts`
(retención, turnos, grados, combinaciones, variación, conteo mensual, resumen
de crecimiento, cuartiles del mapa de calor) pasan a `estadisticas.utils.ts`
con tests. El componente queda como presentación: colores y textos.

**Lo que se descubrió al hacerlo.** La tendencia trimestral tenía el mismo
defecto que R4: `sumB === 0 && sumA > 0` → `porcentaje = 100` → "↑ 100 %".
Ningún test lo veía porque la función no existía fuera del componente. Es el
argumento más fuerte para el blindaje: el patrón ya se había corregido en
otros tres sitios.

**Rendimiento (M19).** `EstadisticasAvanzadasService.obtenerRegistros()`
expone la caché; las métricas globales, los meses disponibles y el crecimiento
de 12 meses ya no hacen su propia lectura completa. Las exportaciones siguen
leyendo de la BD a propósito: son a demanda y deben salir con lo último.

**Datos de prueba (O13).** Sus marcas se mudan a `core/utils/datos-prueba.utils.ts`:
desde el servicio, importar el reconocedor creaba un ciclo
(`DatabaseService` → `estadisticas.utils` → `DatosPruebaService` → `DatabaseService`).

Recorrido en navegador (Playwright) de las cinco pestañas de Estadísticas y
siete pantallas más: sin errores de consola. Con base vacía; la prueba con
volumen es la ronda siguiente.

---

## 2026-10-06 — Tanda 2b: calendario escolar capturado a mano

El preset "Este semestre" suponía enero–junio / julio–diciembre; la UAT tiene
tres periodos (Primavera, Verano, Otoño). Con el PDF oficial 2026 que mandó el
usuario se armó `core/utils/calendario.utils.ts` (tipos, `CALENDARIO_UAT_2026`
y funciones puras) y la categoría **Configuración → Calendario escolar**.

**Qué se decidió.**
- **Lista editable, no reglas.** La UAT "usualmente" recorre los festivos al
  lunes o viernes, pero no siempre: ninguna regla lo cubre.
- **Periodos sin huecos** (decisión del usuario): Primavera arranca el 5 de
  enero (inicio de actividades administrativas) y no el 19 (clases), para
  que siempre haya un periodo en curso. Si aun así hay hueco, "Este periodo"
  devuelve el último que terminó, marcado.
- **Borrador + Guardar** en la pantalla: editar fechas a mano produce estados
  intermedios inválidos, y las estadísticas no deben apuntar a ellos.
- Vive en `ConfigService` (localStorage) como el resto de la configuración.
  Las instalaciones previas reciben el calendario UAT al cargar. Cuando la
  configuración viaje a la nube (Fase 2), el calendario va con ella.
- Fechas como `'YYYY-MM-DD'`, siempre vía `parseFechaLocal`: la lección de la
  Tanda 1.

Se verificó en el navegador con Playwright: la categoría renderiza con el
calendario precargado, el borrador marca "Cambios sin guardar" y Estadísticas
muestra "Este periodo (Otoño 2026)". En la misma pasada se vio el comparador
recortar "Mes pasado" al mismo avance (P6). Sin errores en consola.

---

## 2026-10-06 — Tanda 2: una definición por métrica, y la frontera tiene horario de verano

Con las decisiones P1–P8 del usuario, cada número que aparece en más de una
pantalla se calcula ahora en **`core/utils/estadisticas.utils.ts`** (funciones
puras, `ahora` como parámetro, 21 tests con datos contados a mano). Los dos
"Alumnos inactivos" distintos (R6) eran el síntoma: dos implementaciones del
mismo concepto que divergieron sin que nadie lo decidiera.

**Lo que se descubrió.**
- **El usuario vive en Nuevo Laredo**, que conserva el horario de verano de
  EE. UU. La Tanda 1 había puesto CI en `America/Mexico_City`, que no lo tiene.
  Al correr los tests en su máquina (`Central Standard Time`, con DST) truena
  un test que comparaba longitudes de semana en milisegundos. Había tres
  cálculos de "N días después" con aritmética de ms: período anterior,
  rachas de logros y reporte semanal. Todos pasan a `desplazarDias` /
  `diasCalendarioEntre`; CI a `America/Matamoros`.
- **Agujero de sincronización:** cinco caminos de escritura modificaban la
  fila dentro de una transacción sin pasar por `markPending`, así que la
  bandeja nunca los volvía a ofrecer. Se notó al agregar `salidaEstimada`,
  que viaja justamente por los cierres automáticos.
- Dos tests de caracterización fijaban el comportamiento viejo **y decían
  que debían tronar el día que se cambiara**. Troneron; se reescribieron
  al nuevo contrato citando la decisión. Así deben funcionar.

**Qué se decidió.** `salidaEstimada` es un campo nuevo y no un reuso de
`cierreAutomatico`: este se borra al confirmar ("visto"), aquel es permanente
("no medido"). Migración `0008` para la nube. Las filas viejas quedan en
`false`: no hay forma fiable de reconocerlas (una visita real puede durar
justo 4 h).

**Sigue:** Tanda 2b (calendario UAT configurable: periodos y días inhábiles;
el PDF 2026 ya está leído en memoria) y Tanda 3 (resto de 🟠/🟡).

---

## 2026-10-06 — Auditoría de estadísticas y Tanda 1: las fechas mentían un día

Antes de seguir con la nube, el usuario pidió una auditoría "brutal" de todo
lo que muestra números. Informe completo en `docs/AUDITORIA-2026-10.md`
(6 🔴, 16 🟠, 19 🟡, 8 decisiones de producto).

**Lo que se descubrió.** La causa de los dos 🔴 más graves es una sola línea
repetida: `new Date('2026-10-03')`. El estándar la lee como medianoche **UTC**,
que en México son las 18:00 del día anterior; luego `setHours(0,0,0,0)` la
deja en el 2 de octubre. Resultado: todos los drill-down de Estadísticas
abrían `/registros` en el día equivocado, y "Eliminar registros"
personalizado **borraba un día que nadie eligió**. El viaje inverso,
`toISOString().split('T')[0]`, daba la fecha de mañana después de las 18:00
(13 sitios). **Ningún test lo vio porque CI corre en UTC**, donde el desfase
es cero.

**Qué se hizo (Tanda 1, v3.41.1):**
- `parseFechaLocal` / `fechaLocalISO` / `rangoUltimosDias` /
  `contarHastaMismaHora` en `tiempo.utils.ts`, con la regla escrita en la
  cabecera: ningún `new Date(string)` ni `toISOString().split`.
- CI corre los unitarios con `TZ=America/Mexico_City`; Playwright con
  `timezoneId`. Así los tests de fechas sí muerden.
- `DatabaseService.versionDatos`: señal que sube **después** de cada
  escritura confirmada (no se reutilizó `cambiosSync` porque se dispara antes
  de escribir y no cubre borrados). La caché de estadísticas compara versión;
  además relee al entrar y al volver a la pestaña (otra pestaña no mueve la
  señal).
- Tendencia y comparador con `sinReferencia`: sin base no se inventa un %.
- Resumen compara "lo que va de hoy" contra el mismo día de la semana pasada
  **a la misma hora**.
- Hallazgo nuevo durante el arreglo: el PDF de `/registros` ponía en la
  cabecera un período propio ("Fecha: hoy" con el filtro "ayer"). Ahora
  comparte `rangoFiltroTs()` con la lista.

**Pendiente:** R6 y los 🟠 que dependen de definiciones (P1–P8). El usuario
decidió P2 (cada motivo suma) y P5 (invitados fuera de carreras/turnos/grados);
P3 está argumentado y pendiente de su confirmación.

---

## 2026-09-04 — La nube se enciende con un interruptor, no con un deploy

Primera tanda de Fase 2 después de cerrar Fase 1. El objetivo era el punto con
peor relación entre construido y entregado: **`environment.prod.ts` tiene
Supabase vacío**, así que los cuatro meses de auth, roles, bandeja de
sincronización y descarga no existen en el Netlify que usa el coordinador.
Pegar las claves parecía trabajo de cinco minutos.

**No lo era.** `roleGuard` (`role.guard.ts:51`) dice: si Supabase está
configurado y no hay sesión, a `/login`. Hoy en producción no hay claves, así
que `isLocalOnly()` es `true` y todo pasa. En el momento de pegarlas,
`/configuracion`, `/estadisticas`, `/gestion-motivos`, `/importar-alumnos`,
`/inactivos`, `/sincronizacion`, `/descarga` y `/usuarios` empiezan a pedir
sesión **en todas las instalaciones a la vez**. Y la sesión llega por magic
link: Internet, más un correo que llegue. El primer diferenciador escrito en el
ROADMAP es "la luz se va, el WiFi cae, el sistema sigue"; un despliegue que
exige red para abrir Configuración lo contradice sin que nadie lo haya
decidido.

La operación diaria no se rompía — `/scanner`, `/registro-alumno`,
`/presencia`, `/alumnos` y `/registros` no llevan guard — pero la
administración sí, y el coordinador no había pedido nada.

**El arreglo es separar dos cosas que estaban pegadas.** `isSupabaseConfigured()`
respondía a una sola pregunta y en realidad son dos:

1. `hayCredencialesNube()` — este **build** trae url + anonKey. Lo decide quien
   compila.
2. `isNubeActiva()` — esta **instalación** encendió la nube. Lo decide el
   coordinador, arranca en `false`, vive en `localStorage`
   (`stenbrary-nube-activa`).

Con eso, publicar las claves deja de cambiar el comportamiento de nadie. El
interruptor está en Configuración → Avanzado → "Conexión con la nube", con una
confirmación que dice qué cambia antes de cambiarlo.

**Clave propia y no `stenbrary-config`** a propósito: `getSupabaseClient()`
corre en el inicializador de campo de `AuthService`, fuera de la inyección de
dependencias, así que no puede depender de `ConfigService`. Mismo patrón que
`stenbrary-sonido-activo`.

**Encender y apagar recargan la página.** El cliente se cachea y `AuthService`
fija su estado inicial una sola vez; un cambio en caliente dejaría media app
con la idea vieja. Recarga dura, no `router.navigate`.

**Lo que casi se me pasa: el interruptor era una trampa.** El botón para
apagar la nube vive dentro de Configuración — que es exactamente lo que deja
de abrirse cuando el login no funciona. Encender la nube y que el correo no
llegue dejaba al coordinador sin administración y sin forma de deshacerlo.
`/login` lleva ahora una salida de emergencia al modo solo-local.

Sí, cualquiera que abra `/login` puede pulsarla. Es el mismo argumento que ya
estaba escrito en `avanzado.component.ts` para `puedeRestablecer`: quien tiene
el equipo delante ya puede vaciar IndexedDB desde el navegador. Los permisos
de verdad los aplica RLS en el servidor; el front es UX. Sin dialog de
confirmación, además: es una ruta de rescate, y ponerle fricción a un rescate
es el error opuesto. Queda anotado en el ROADMAP como regla general — **toda
ruta de ida necesita su ruta de vuelta**.

**El texto que ya prometía esto.** La pantalla de login decía desde Fase 2.0:
"¿Solo quieres usar el sistema sin cuenta? Pide al coordinador que active el
modo solo-local". No había forma de activarlo desde la UI. Ahora ese párrafo es
un botón.

**Lo que NO se hizo, y por qué.** No se pegaron claves de PROD: hace falta
crear el proyecto en Supabase, aplicar las 7 migraciones y configurar SMTP, y
eso es trabajo fuera del repo. Queda `docs/DESPLIEGUE-NUBE.md` con los 9 pasos.
Dos cosas que conviene saber antes de empezarlo:

- El SMTP integrado de Supabase va a **~2 correos por hora** y su
  documentación dice que no es para producción. Dos intentos de login seguidos
  y el coordinador se queda esperando.
- El keep-alive de GitHub Actions pinguea **solo el proyecto de dev**. Un
  proyecto de producción pausado por inactividad es una caída silenciosa, y las
  vacaciones son justo cuando no hay tráfico real que lo evite.

**Deriva de documentación otra vez, tercera vez seguida.** `ESTADO.md` §2.4
decía "Fase 2 🔴 planeada post-v4.0" con 2.0, 2.1, 2.2 y 2.3 en código desde
mayo; §2.0 seguía "en curso" con Fase 1 cerrada; §2.3.2 decía "hoy no hay
auth". Corregidos los tres, y §2.4 pasa a ser la lista real de lo que falta de
Fase 2 — que es más corta de lo que parecía desde fuera.

**Y al mirar por qué pasaba la suite E2E, otro instrumento roto.**
`responsive.spec.ts` hace `page.goto(ruta)` y mide, sin comprobar dónde
aterrizó. El `ng serve` usa `environment.ts`, que **sí** tiene credenciales de
Supabase, y Playwright corre sin sesión: hasta hoy `roleGuard` mandaba
`/estadisticas`, `/gestion-motivos`, `/configuracion`, `/importar-alumnos` e
`/inactivos` a `/login`. Es decir, la auditoría del 2026-08-31 concluyó "12
rutas × 3 viewports, cero desbordamientos" midiendo la pantalla de login quince
veces.

La conclusión resulta ser cierta —hoy, con la nube apagada por defecto, esas
cinco rutas se renderizan de verdad y siguen midiendo limpio— pero lo era por
suerte, no porque el test lo hubiera comprobado. El spec ahora verifica
`page.url()` contra la ruta pedida y falla si hubo redirección.

Van tres tandas seguidas encontrando lo mismo: **una comprobación que reporta
verde sin comprobar lo que dice.** El `ng lint` documentado y ausente, el
`SCAN_INTERVAL_LOWRES_MS` documentado y muerto, y ahora un test que mide la
pantalla equivocada. El patrón no es descuido puntual; es que nada vigila a los
vigilantes. Al escribir un test que "recorre" algo, la primera aserción debe ser
que llegó.

**Verificado:** 0 errores de lint · ambos type-checks · **184** tests unitarios
(178 + 6 nuevos sobre el interruptor, incluido el caso peligroso: build con
claves e instalación que nunca pidió la nube) · 20 E2E, con `responsive.spec`
midiendo por fin las 12 rutas de verdad · build de producción.

**Qué sigue:** los pasos manuales de `DESPLIEGUE-NUBE.md`. Después, volumen
real y la política de conflictos con el coordinador.

---

## 2026-09-02 (tarde) — Cierre de Fase 1

Dos cosas pequeñas, una de ellas sorpresa.

**El arranque, al saltar la configuración.** Lo reportó el usuario:
`saltarTodo()` navegaba directo a `/scanner` sin pasar por `finalizar()`, así
que quien elegía los valores por defecto nunca veía cerrarse el libro. Ese
cierre es la única señal de que la instalación terminó. Ahorrar preguntas no
es motivo para quedarse sin el cierre. El toast pasa a un campo
(`mensajeEntrada`) para que `saltarArranque()` no tenga que conocer un mensaje
que no le toca elegir. El e2e afirmaba lo viejo — que tras "Saltar" se llegaba
al scanner de inmediato — y ahora fija lo nuevo.

**Sobre /bienvenida no se hizo nada más, a propósito.** El usuario preguntó si
merecía el mismo tratamiento que `/funciones`. La respuesta, mirando el
código, es que no: `moverA()` ya hace relevo (`saliendo` → cambia índice →
`entrando`), que es exactamente lo que a `/funciones` le faltaba; y su icono
son 34 px dentro de un badge de 72, no un glifo estirado. Los dos defectos que
justificaron rehacer `/funciones` aquí no existen. Proponer un rediseño habría
sido inventar trabajo.

**Los tooltips del dashboard ejecutivo** eran el último punto de Fase 1. Al
auditarlo resultó que la mayor parte ya se había restaurado en v3.26.0 sin
actualizar `ESTADO.md`. Lo que sí quedaba: **6 `title=` nativos** conviviendo
con 56 `matTooltip` — otro aspecto, 1–2 s de retardo, y no funcionan al tocar.
Convertidos, con un detalle que no era obvio: dos estaban sobre `<input>` sin
`<label>`, así que su `title` era su **único nombre accesible** y una
conversión a secas lo habría borrado. Esos llevan `aria-label` además.

**Los dos documentos de plan se habían separado.** `ESTADO.md` daba por hechos
el rediseño de `/configuración` y el Ctrl+K; `ROADMAP.md` los tenía sin marcar
desde v3.24.0/v3.25.0. Es el mismo patrón que el `ng lint` documentado y
ausente, y el `SCAN_INTERVAL_LOWRES_MS` documentado y muerto: **la
documentación se separa del código en silencio y no hay nada que lo detecte.**
Queda escrita en `ROADMAP.md` la regla de desempate — `ESTADO.md` gana, va
pegado al código — y la obligación de tocar los dos al cerrar algo.

**Fase 1 queda cerrada.**

**Verificado:** 0 errores de lint · ambos type-checks · 178 tests unitarios ·
3 e2e del camino de saltar · build de producción.

**Qué sigue (Fase 2):** resolución de conflictos de sincronización — hoy se
muestran campo por campo pero no se aplican, y la política hay que decidirla
con el coordinador — y probar contra volumen real. Bloqueante aparte para
vender: el calendario escolar configurable.

---

## 2026-09-02 — Se añade el linter que llevaba cinco meses documentado

Continuación directa de la entrada anterior: `@angular-eslint` instalado y
configurado. **172 errores en la primera pasada, 0 al terminar**, sin bajar
ninguna regla que importara para conseguirlo.

**Lo primero fue un bug de configuración:** la config que genera `ng add` no
ignora nada, así que estaba linteando `.angular/cache` — dependencias
precompiladas por Vite, código de terceros. Ese `ignores` va antes de mirar
ningún resultado, o el recuento miente.

**Criterio de niveles.** Es la decisión de fondo y está escrita en la cabecera
de `eslint.config.js` para que no se erosione:

- **`error`** solo para lo que no debe entrar nunca: código muerto y las
  convenciones que CLAUDE.md ya exigía por escrito.
- **`warn`** para deuda real que arreglar de golpe sería un refactor
  arriesgado, no una limpieza. Un `warn` aquí no es "da igual": es "importa y
  tiene fecha", y cada bloque dice cuántos hay y cuándo pasa a `error`.

Los 84 `no-explicit-any` y los 41 de accesibilidad quedan en `warn`. Los `any`
se arreglan al tocar cada archivo; la accesibilidad es Fase 3 del ROADMAP.
Ponerlos en `error` habría forzado a taparlos deprisa — y en accesibilidad eso
significa añadir `(keyup)` vacíos, que calla el aviso sin resolver nada y es
peor que no hacerlo.

**El valor real: dos convenciones pasan de texto a comprobación.**
`no-alert` (nada de `confirm()` nativo) y `prefer-control-flow` (`@if`/`@for`,
nunca `*ngIf`/`*ngFor`) estaban en CLAUDE.md sosteniéndose por disciplina.
Ambas daban **0** al instalar el linter — el código ya cumplía — así que
ponerlas en `error` no costó nada y ahora quedan blindadas.

**Código muerto encontrado**, todo verificado antes de borrar:

- 4 parámetros `pageWidth` sin usar en `report.service`, con sus argumentos en
  las llamadas, y una asignación a `y` que nadie leía.
- `p90` en el heatmap de estadísticas: los cinco niveles de intensidad salen de
  tres umbrales más el cero, así que el cuarto percentil no se consultaba
  nunca. El comentario que lo anunciaba también mentía y se corrigió.
- 6 imports muertos (`NgClass`, `Registro`, `VersionChangelog`, `computed`,
  `signal`, `coincide`, `CARRERAS`), un `ngOnDestroy` vacío con su
  `implements OnDestroy`, y 4 `catch (err)` que no usaban la variable.
- **`SCAN_INTERVAL_LOWRES_MS`** en el scanner: huérfano desde v3.9.1, cuando el
  pipeline agresivo pasó a estar siempre activo y desapareció la rama "lowres".
  Estaba **documentado en CLAUDE.md** como parte del throttle adaptativo. Y
  **`DUPLICADO_UMBRAL_MIN = 30`**, una segunda fuente de verdad muerta: el
  umbral real sale de `ConfigService.umbralDuplicadoMin`. Los dos fuera, y
  CLAUDE.md corregido con la explicación de por qué desaparecieron.

**Dos cosas que NO se cambiaron por complacer al linter**, ambas con su
justificación en el código:

- `permiteCtaActividades` sigue siendo un getter que devuelve `true`, con
  `eslint-disable` de una línea. Es el punto por donde entrará la lógica de
  permisos en Fase 2.3; convertirlo en el campo `readonly` que pide la regla
  borraría esa intención.
- Los `catch` vacíos siguen vacíos, pero ahora llevan dentro un comentario
  diciendo por qué se ignora el fallo. `no-empty-function` no reporta cuerpos
  con comentarios, así que la regla acaba obligando a justificarlos — que es
  exactamente lo que se quiere.

**Enganchado donde se nota**, porque un linter que hay que recordar ejecutar se
ignora en una semana:

- `.husky/pre-commit` corre `eslint . --quiet` (solo errores). Con avisos, la
  salida de cada commit enseñaría a ignorarla entera. Cuesta 11 s, el mismo
  orden que los type-checks que ya había.
- CI corre el lint completo. **El job de CI se llamaba "Lint, Type-check, Test,
  Build" y no tenía paso de lint** desde que existe: otra deriva del mismo
  tipo que la de CLAUDE.md, encontrada al ir a añadirlo.

**Verificado:** 0 errores de lint · ambos type-checks · 178 tests unitarios ·
**20 E2E** (la suite completa, no solo los de /funciones — se tocó el scanner
y la generación de PDF) · build de producción.

**Qué sigue:** los 84 `any` y los 41 avisos de accesibilidad. Ninguno es
urgente, los dos están contados. Cuando el conteo de `any` llegue a cero, la
regla pasa a `error`; la accesibilidad espera a Fase 3.

Sin cambio de versión: nada de esto es visible para el usuario final, así que
no toca `changelog.data.ts`.

---

## 2026-09-01 — /funciones: el recorrido, rehecho (v3.40.0)

El usuario dijo que la presentación "se mira algo simplón". Tenía razón, y la
causa no era la que parecía.

**Diagnóstico: el SCSS estaba sedimentado, no diseñado.**
Los tres commits anteriores sobre `funciones.component.scss` fueron +232, +214
y +245 líneas y **ninguno borró nada**. Cada rediseño se apiló encima del
anterior redefiniendo los mismos selectores y dejando que ganara el orden del
archivo. Estado al empezar: 1413 líneas, `.demo mat-icon` definido 3 veces
(46 → 58 → 96px), `.d-tablet mat-icon` 4 veces, 3 `@keyframes` duplicados que
se pisaban en silencio (`pasar-credencial`, `salir-hoja`, `guardar-copia`),
9 media queries con bloques repetidos —uno con un comentario admitiendo que
estaba duplicado "a propósito" porque dependía del orden— y 28
`rgba(0, 200, 215, x)` escritos a mano.

Cuando ya no puedes predecir el render sin abrir el navegador, cada mejora es
un parche más. Eso es lo que se percibe como simplón.

**Qué se hizo:**

- **SCSS reescrito de cero**, 1413 → 963 líneas: una capa, tokenizado
  (`$fx-acento-*`), un solo punto de corte responsive. Regla en la cabecera:
  un selector, un sitio.
- **Ilustraciones a componente propio** (`funciones/ilustracion/`): 13 escenas
  SVG de trazo con `<defs>` compartidos, sobre un lienzo común de 320×320.
  Sustituyen a los `<mat-icon>` estirados a 96–168px — un glifo dibujado para
  24px, a ese tamaño, es una silueta plana, y esa era la causa nº1 del aspecto
  pobre. Vocabulario cerrado de clases (`.il-t`, `.il-f`, `.d`, `.v`, `.b`) y
  todos los ciclos a 4 s o múltiplo, para que la escena tenga ritmo en vez de
  ruido.
- **Pantalla completa de verdad** (`requestFullscreen` sobre el elemento
  anfitrión). El "modo presentación" anterior seguía enseñando sidebar, topbar
  y bottom nav; al proyectar el host, quedan fuera. Se escucha
  `fullscreenchange` porque en pantalla completa el navegador se queda con
  Escape y nuestro `keydown` no llega a dispararse.
- **View Transitions API** para el cambio de diapositiva, con
  `ApplicationRef.tick()` dentro del callback (Angular renderiza async y la API
  exige el DOM ya actualizado al retornar). Aporta lo que faltaba: animar la
  SALIDA. Degrada a la animación CSS de entrada donde no existe.
- Portada y cierre, avance automático (7 s), gesto de deslizar, `aria-live`,
  Home/End/Espacio, y progreso segmentado en lugar de 17 puntos.
- **Fix real:** el regex de acentos de `normalizar()` estaba escrito con los
  caracteres combinantes **literales** (bytes CC 80 – CD AF). Funcionaba, pero
  cualquier herramienta que normalizara el archivo a NFC los habría fusionado
  con el carácter anterior y roto el buscador sin que el diff lo delatara.
  Ahora se escribe con escapes Unicode explícitos en lugar de literales.

**Lo que se descubrió por el camino:**

- Los pseudo-elementos de View Transitions cuelgan del raíz del documento, así
  que sus reglas **no pueden vivir en el SCSS del componente** (el encapsulado
  de Angular las anularía): van en `src/styles.scss`. Y se anclan **sin
  espacio** (`html[data-x]::view-transition-old(y)`); con combinador
  descendente no seleccionan nada y falla en silencio.
- El build imprime "19 rules skipped due to selector errors" por ese bloque. Es
  el inliner de CSS crítico (css-select), que no sabe leer esos
  pseudo-elementos. **Las reglas sí se emiten y funcionan** (verificado en
  `dist/.../styles-*.css`). Envolver en `@supports` no lo silencia: beasties
  recorre dentro igual. Queda documentado en el propio archivo.
- El marco cónico giratorio del panel se animaba rotando el pseudo-elemento, lo
  que recortaba las esquinas en cada vuelta. Ahora se anima el ángulo con
  `@property --fx-angulo`.
- Primer render: la composición quedaba pegada a la izquierda con ~450px
  muertos a la derecha. La columna de texto era `1fr` pero el texto se cortaba
  a 46ch. Se dimensiona por medida de lectura (`47ch`) + `justify-content:
  center`.

**Verificado:** build de producción OK · 178 tests unitarios en verde · 2 e2e
de /funciones (avance del recorrido + sin desborde a 390px) · capturas de las
17 diapositivas a 1440×900 y del móvil a 390×844.

### Segunda pasada (misma versión, sin liberar)

El usuario reportó que **el texto parpadeaba** al pasar de diapositiva. Causa:
corrían **dos animaciones a la vez**. `mover()` reactivaba la clase `.anim` de
respaldo *dentro* del callback de `startViewTransition`, así que se animaba la
instantánea y el elemento real por debajo; y quitar y reponer `.anim` dejaba un
fotograma con el contenido a opacidad plena antes de saltar a 0 para volver a
entrar. Arreglo: con View Transitions disponible, la clase se queda apagada y
la animación es solo del navegador.

Segundo contribuyente: `object-fit: cover` sobre las instantáneas. El grupo
interpolaba su caja del tamaño viejo al nuevo y las instantáneas se estiraban
para seguirlo, deformando el texto a mitad de camino. Ahora
`::view-transition-group(...)` lleva `animation: none` —sin morfeo de caja— y
las instantáneas van a `object-fit: none`, a su tamaño real.

**Verificado con instrumentación, no a ojo:** un script mide
`getAnimations()` sobre el `.tour-texto` real durante la transición. Resultado:
0 animaciones en el elemento, opacidad constante en 1, y 5 animaciones
corriendo sobre los pseudo-elementos. Antes había una `fx-entra` compitiendo.

**Añadido en la misma tanda:**
- **Vista general** (tecla `G`): las 17 diapositivas en miniatura, navegables.
  Es lo que separa pasar diapositivas de presentar — poder ir a la que te
  acaban de preguntar. Las miniaturas van con las animaciones congeladas
  (`:host(.mini)` reutilizando el mixin de `prefers-reduced-motion`): quince
  bucles a la vez no aportan nada a algo que se mira medio segundo.
- **Salto por número**, acumulando dígitos en una ventana de 550 ms para poder
  teclear "12", con realimentación en pantalla.
- **Wake Lock** mientras se presenta, re-pedido en `visibilitychange` porque el
  sistema lo suelta al ocultarse la pestaña y no lo devuelve solo.
- Contador de tiempo dentro del tramo actual con el avance automático.

### Tercera pasada: el destello al cambiar de página

Segundo reporte del usuario: "cambio de página y hay como un flash donde se
mira un texto". No era la transición entre diapositivas, era **el salto de
ruta**.

Instrumentado con un muestreo por fotograma (`requestAnimationFrame` +
comprobar si `.fx-header` está en el DOM), no a ojo:

```
fotogramas con el CATÁLOGO renderizado: 6
  texto que se alcanza a ver: "¿Qué puede hacer Stenbrary?36 funciones "
```

`abrir()` llamaba a `salirPresentacion()` —que apaga `modoPresentacion` y por
tanto renderiza el catálogo entero, cabecera y 36 tarjetas— y *después* a
`router.navigate()`, que es asíncrono. Angular aprovechaba ese hueco de ~100 ms
para pintar el catálogo. Arreglo: al navegar se sueltan los recursos
(temporizador, wake lock) pero el modo se queda encendido; el componente se
destruye enseguida y `ngOnDestroy` remata. Con un `navegandoAUnaFuncion` para
que el manejador de `fullscreenchange` no complete la salida por su cuenta, y
un `.then(ok => ...)` por si un guard bloquea la navegación y hay que salir de
verdad.

**Segundo destello, encontrado de paso:** `salirPresentacion()` apagaba el modo
ANTES de soltar la pantalla completa, así que el catálogo se renderizaba dentro
de un elemento todavía proyectado — aparecía a pantalla completa un instante y
luego encogía de golpe al marco de la aplicación. Ahora la salida va en dos
tiempos: se suelta la pantalla completa y `onCambioPantallaCompleta` completa
el resto, lo que además unifica las tres formas de salir (botón, Escape, y el
navegador saliendo por su cuenta) en un solo camino.

Medición final: navegar a una función, **0 fotogramas** de catálogo (antes 6);
salir del recorrido, 0 fotogramas de catálogo proyectado a pantalla completa.

### Cuarta pasada: el parpadeo de verdad — los dos textos encimados

El usuario volvió con capturas de vídeo pausado a mitad de transición. En ellas
se leen **los dos títulos superpuestos, letra sobre letra**: "Registro con
lector de credencial" encima de la portada que aún no se había ido.

No era un defecto de mecanismo: era el **fundido cruzado en sí**. Old y new se
desvanecen a la vez en la misma posición durante 460 ms. Con imágenes eso es un
dissolve; con dos párrafos distintos es un borrón ilegible, y se percibe como
parpadeo.

**Error de método que conviene anotar:** en la pasada anterior verifiqué con
`getAnimations()` sobre el `.tour-texto` REAL y salió limpio — y lo estaba. Pero
esto ocurre entero en la capa de pseudo-elementos, donde esa consulta no llega.
Medí una cosa correcta que no era la que fallaba, y di por cerrado algo que no
lo estaba.

**Arreglo — relevo en vez de fundido cruzado**, y solo donde importa:
- **Texto**: la saliente dura 150 ms con `animation-fill-mode: forwards` (sin
  `forwards` vuelve a opacidad 1 al acabar y reaparece bajo la entrante: el
  mismo defecto por otra puerta); la entrante arranca a los 155 ms con
  `fill-mode: both` para quedarse invisible durante la espera.
- **Ilustración**: se sigue cruzando a propósito. El relevo estricto en las dos
  capas dejaba ~100 ms de escenario vacío —cambiar un parpadeo por otro— y dos
  dibujos de línea superpuestos un instante no estorban.
- `mix-blend-mode: normal` en vez del `plus-lighter` del navegador: ese modo
  existe para que un fundido cruzado no baje de brillo, pero ya no hay cruce y
  sumar luz solo haría más visible cualquier solape residual.

**Verificación con control negativo**, que es lo que faltó la vez anterior: el
script mide los fotogramas en que la saliente y la entrante están las dos
visibles, y se ejecuta DOS veces — una reinyectando por CSS las reglas
antiguas. Sin ese control, un cero no prueba nada.

```
ANTES (fundido cruzado)    con LOS DOS TEXTOS a la vez: 11
AHORA (relevo)             con LOS DOS TEXTOS a la vez:  0
```

**Lo que destapó la vista general:** puestas en rejilla se veía que las
diapositivas 6/7 y 12/13 compartían ilustración (`grafica` y `archivo`). Se
añadieron dos motivos nuevos, `resumen` (tablero del día: cifras + horas, con
el pico señalado) y `exportar` (la tabla que se parte en Excel y PDF, con el
movimiento hacia AFUERA — el contrario de `archivo`). Vale la pena anotarlo:
la vista general no era solo una función, fue también una herramienta de
revisión que hizo evidente un defecto que de una en una no se veía.

### El linter que no existe

Al ejecutar la verificación de cierre, `npx ng lint` respondió:

```
Cannot find "lint" target for the specified project.
```

**Nunca se añadió `@angular-eslint`.** La línea está en `CLAUDE.md` desde el
commit que creó el archivo (`9ee1ce0`, v3.7.0, 2026-03-31): cinco meses en los
que la documentación decía "pasa el linter" y quien la siguiera obtenía un
error. No es que el lint fallara — es que la documentación describía una red
de seguridad que no estaba puesta.

Lo importante no es el comando roto, es lo que implica: **la única barrera
automática de estilo y errores tontos son los dos type-checks**
(`tsconfig.app.json` y `tsconfig.spec.json`) más el pre-commit de Husky. Nada
revisa imports sin usar, variables muertas, `any` implícitos donde no los
detecte el compilador, ni convenciones del propio `CLAUDE.md` (`@if` vs
`*ngIf`, `confirm()` nativo, etc.). Esas reglas se sostienen solo por
disciplina y revisión.

De paso salió que el conteo de la suite también estaba desactualizado: decía
69 specs unitarios y 4 E2E; son 178 en 9 archivos y 20 E2E en 2. `CLAUDE.md`
queda corregido con los tres puntos (commit `a69e767`), documentando el lint
como ausencia explícita en vez de borrar la línea, para que nadie lo intente
otra vez y concluya que está roto.

**Decisión pendiente para el usuario:** añadir `@angular-eslint` es barato
(`ng add`) y convertiría en automáticas varias reglas de `CLAUDE.md` que hoy
son solo texto. El coste es una primera pasada ruidosa sobre ~40 componentes
que nunca han visto un linter. No se hizo en esta tanda porque no era el
encargo y habría mezclado un cambio transversal con un rediseño de una sola
pantalla.

---

## 2026-06-01 (tarde) — Fase 2.3.x: página /usuarios + badge en tiempo real

Tras dejar verde el CI, seguimos avanzando hacia el cierre de Fase 2.

**Badge de pendientes en tiempo real:**
- `DatabaseService.cambiosSync` (signal) se incrementa en `markPending` y
  `actualizarEstadoSync`. `AppComponent` lo lee en un effect → el badge del
  sidebar se actualiza al registrar/editar/subir sin re-login ni navegar.

**Página `/usuarios` (asignar roles sin SQL):**
- **Modelo de invitación sin backend extra:** el asistente inicia sesión una
  vez (trigger lo crea como `asistente`), aparece en /usuarios y el
  coordinador ajusta su rol. Sin Edge Functions ni `service_role` en el
  cliente.
- **Migración `0006_user_management.sql`:**
  - Columna `email` en `user_profiles` (+ backfill desde auth.users + trigger
    actualizado) — auth.users no es legible por el cliente.
  - **RPC `set_user_role` (security definer)** con salvaguardas: coordinador
    no puede tocar super_admins, ni asignar super_admin, ni cambiar su propio
    rol; valida misma organización (`is distinct from`, tolerante a NULL).
  - **Cierre de auto-escalación:** `revoke update (rol, organization_id) ...
    from authenticated` — antes `profiles_update_self` permitía que cualquiera
    se promoviera a super_admin editando su propio perfil. Ahora el rol solo
    cambia vía la RPC.
  - `profiles_select` con `is not distinct from` para que coordinador vea a
    sus pares en single-tenant (org NULL).
- **Front:** `RemoteDatabaseService.listarUsuarios()` + `cambiarRolUsuario()`;
  `UsuariosComponent` (lista, selector de rol por fila con confirmación,
  banner explicativo, fila propia y super_admins bloqueados); ruta
  `/usuarios` con roleGuard; item en sidebar (Administración, solo signed-in);
  entrada en permissions.ts.

**⚠️ Pendiente de aplicar y PROBAR en Supabase:** la migración 0006 toca
seguridad. Plan de pruebas: (1) como coordinador, cambiar rol de un asistente
✓; (2) intentar promover a super_admin → debe fallar; (3) intentar cambiar el
propio rol → debe fallar; (4) intentar auto-promoverse vía REST directo a
user_profiles → debe fallar por el revoke.

**Verificación local:** type-check raíz + 69/69 tests + build producción en verde.

---

## 2026-06-01 — Fase 2.3.x: fixes de verificación (auth offline + UX sync)

Tanda de correcciones tras la primera verificación visual del coordinador
(roles + bandeja de sync). El core funcionaba (roles filtran, denegación
correcta, datos suben), pero salieron bugs de auth/offline y fricción de UX.

**Bugs de auth / offline-first (alta prioridad):**
- **Sesión perdida al refrescar offline.** `loadProfile()` consultaba
  `user_profiles` por red; sin internet fallaba y marcaba `signed-out`.
  Violaba offline-first. Fix: cacheo del perfil en localStorage
  (`stenbrary-profile-cache`); si la consulta falla por red reconstruyo
  el `AuthUser` desde el caché. Solo cierro sesión si el perfil
  **realmente** no existe (`error.code === 'PGRST116'`). Caché se limpia
  en `signOut`.
- **Logout no redirigía.** Cerrar sesión desde el avatar del topbar hacía
  `signOut()` sin navegar → te quedabas varado en `/acceso-denegado`. Fix:
  `cerrarSesion()` ahora navega a `/scanner` (la app sigue operativa sin
  sesión, offline-first).

**UX de la bandeja de sincronización:**
- **Vista de descartados con deshacer (E).** Antes descartar marcaba
  `rejected` pero no había forma de verlos ni recuperarlos → "irreversible"
  percibido. Ahora: `DatabaseService.obtenerXRechazados()` +
  `restaurarPendiente()`; `SyncService.descartados`/`totalDescartados` +
  `restaurar()`; sección colapsable "Descartados" con restaurar individual
  y "Restaurar todos". Sale **fuera** del bloque de pendientes (se ve aun
  con 0 pendientes).
- **Confirmación al subir individual (D).** `subirFila` subía directo;
  junto al botón "descartar" era trampa de clic. Ahora confirma (el modelo
  es sync supervisado, subir debe ser deliberado). Descartar ya confirmaba.
- **Seleccionar clicando toda la fila (F).** `(click)` en `<tr class="fila-clic">`
  togglea selección; `stopPropagation` en las celdas de checkbox y acciones.
  Checkbox 16→18px. Cursor pointer.

**Permisos:**
- `/inactivos` restringido a `super_admin`/`coordinador` (era visible para
  asistente). Es vista analítica, alineada con `/estadisticas`.

**Batch cosmético (misma fecha, commit aparte):**
- **C — conectividad real.** `navigator.onLine` solo ve el adaptador → el
  ícono quedaba verde sin internet. Nuevo `ConnectivityService`: combina la
  señal del navegador (negativo rápido) con sondeo activo periódico
  (`fetch` no-cors al health de Supabase, 30 s + en `online`/`visibilitychange`).
  `AppComponent.isOnline` ahora viene del service (quitados los listeners
  locales). Sin backend cae a `navigator.onLine`.
- **G — nombre mostrado.** Si `nombre` es el default autogenerado (== parte
  local del email), el topbar muestra el email completo. `nombreMostrado()`
  computed; el dropdown oculta la línea de email cuando duplicaría el nombre.
- **H — flash de login en F5.** El `roleGuard` corría con auth en `loading`
  (isSignedIn=false) y rebotaba a /login antes de rehidratar. Fix:
  `AuthService.ready` (promise que resuelve al terminar el bootstrap, vía
  `finally`); el guard es ahora `async` y hace `await auth.ready` antes de
  decidir. En local-only resuelve de inmediato.

**Verificación:** type-check app/spec + `ng build` (AOT) en verde.

---

## 2026-05-28 (tarde) — Fase 2.3: roleGuard + permissions + UI condicional

Misma sesión que la Fase 2.2.1 (mañana). Mientras el coordinador prueba
la bandeja, avancé con el modelo de roles. El schema SQL ya tenía
`user_role` enum y `user_profiles.rol` desde 2.0; lo que faltaba era el
front: guard, matriz declarativa, UI condicional, pantalla de denied.

**Hecho:**
- `core/auth/permissions.ts`: matriz declarativa pura (sin DI). Dos
  mapas — `PERMISOS_POR_ACCION` (15 acciones granulares) y
  `PERMISOS_POR_RUTA` (rutas → roles). Funciones puras `puede`,
  `puedeAccederA`, `rolesPara`, `rolesParaRuta`. Sin Angular adentro
  para que pueda usarse en guards funcionales y en tests sin TestBed.
- `core/auth/permissions.service.ts`: capa reactiva. Inyecta
  AuthService. `can(action)` / `canAccessRoute(ruta)` + computed
  signals para los checks más usados (`canConfigurar`,
  `canGestionarMotivos`, `canVerEstadisticas`, etc.).
- `core/guards/role.guard.ts`: `CanActivateFn` parametrizable. Lee
  `data.roles` inline; si no hay, cae al mapa central por URL.
  Comportamiento por estado:
  - `local-only` → pasa (offline-first innegociable).
  - `signed-out` + Supabase configurado → redirige a `/login`.
  - `signed-in` con rol no autorizado → redirige a `/acceso-denegado`
    con query params `ruta` y `roles` (contexto para el usuario).
- `features/acceso-denegado/`: pantalla con icono warn, datos del
  intento (ruta + roles autorizados + rol actual) y acciones "Cerrar
  sesión" / "Volver al inicio". Usa `toSignal(ActivatedRoute.queryParams)`.
- `app.routes.ts`: aplicado `canActivate: [roleGuard]` a:
  `/estadisticas`, `/gestion-motivos`, `/configuracion`,
  `/importar-alumnos`, `/sincronizacion`, `/inactivos`. Más la nueva
  ruta `/acceso-denegado` pública.
- `app.component.ts`: inyecta `PermissionsService`. Nuevo
  `filtrarPorPermisos(items)` aplicado a las 3 secciones del sidebar
  y al bottom-nav. Los items que el rol no puede abrir desaparecen
  del menú (UX > "mostrar y denegar").

**Decisiones arquitectónicas:**
- **Matriz declarativa centralizada.** Una sola fuente de verdad — si
  agregamos rol, basta tocar `permissions.ts`. Las acciones son
  granulares (15) para que la UI pueda esconder botones específicos
  sin tener que esconder vistas completas.
- **`permissions.ts` sin DI.** Funciones puras. Permite que el guard
  funcional las llame directo y que se testeen sin TestBed.
  `PermissionsService` es el wrapper reactivo para templates.
- **local-only siempre pasa.** El coordinador debe poder operar sin
  Internet — sin auth no hay roles que aplicar. Coherente con la
  filosofía. La protección real vive en RLS (defense in depth).
- **`/acceso-denegado` con contexto, no 404.** Le dice al usuario qué
  ruta intentó, qué roles necesita y cuál es el suyo. Si alguien
  teclea la URL por error, sabe cómo proceder (pedir al coordinador).
- **`data.roles` inline opcional.** El guard prioriza `data.roles` si
  está; si no, cae al mapa central. Permite excepciones puntuales
  (ej. una ruta que necesita restricción aún más fina) sin perder el
  DRY del mapa.

**Verificación que hice yo:** type-check de `app` y `spec` limpios.
Build no lo corrí esta tanda — el cambio es ligero y type-check
cubre lo esencial. UI interactiva pendiente del coordinador.

**Pendientes inmediatos:**
- Asignar roles reales en Supabase. Hoy `user_profiles.rol` default
  es `'asistente'`. El coordinador necesita ser `'coordinador'`:
  `update public.user_profiles set rol = 'coordinador' where id = '<su-uuid>';`
- Probar el flujo con un usuario `asistente` real para validar que
  las vistas correctas se esconden y `/acceso-denegado` se ve bien.
- En `AppComponent` quedó duplicada la función `rolLegible` (existía
  desde 2.0). Ahora también vive en `PermissionsService`. No molesta
  pero refactor menor para próxima tanda.

**Lo que NO se hizo (para 2.3.x):**
- Página `/usuarios` para que el coordinador invite asistentes.
  Requiere endpoint + dialog + validación de email + manejo de
  invitaciones pendientes. ~2 días aparte.
- Tests automatizados de RLS con usuarios de prueba. Critical para
  defense in depth pero requiere fixtures SQL — separar en su propia
  tanda con scope claro.
- Aplicar `permisos.can(action)` en botones individuales dentro de
  vistas (ej. ocultar "Eliminar" en alumnos para asistente). Solo
  hice el shell (sidebar + rutas). La granularidad fina sale tanda
  por tanda según se identifiquen los botones críticos.

---

## 2026-05-28 — Fase 2.2.1: bandeja de sync con acciones (descartar / subir)

Continuación del spike de Fase 2.2. La tanda anterior dejó la vista
`/sincronizacion` solo en modo lectura (conteos por tipo). Esta tanda la
convierte en una bandeja operativa: tabla filtrable, selección por fila,
acciones individuales y bulk, subida ordenada por FKs y panel de errores.

**Hecho:**
- `core/services/database.service.ts`: extraído helper privado
  `actualizarEstadoSync(store, id, estado)` que sirve a
  `marcarComoSincronizado` y al nuevo `marcarComoRechazado`. La fila
  rechazada se conserva en IndexedDB — solo cambia su `_syncStatus`. Si
  el coordinador la edita después, `markPending` la regresa a `pending`.
- `core/services/sync.service.ts`: reescrito como orquestador con
  signals reactivos (`progreso`, `subiendo`, `ultimosErrores`, `detalle`).
  Métodos `descartar(store, ids[])`, `subir(seleccion)`, `subirTodo()`.
  Orden de subida fijo motivos → alumnos → registros para respetar FKs
  del schema. Errores por fila individuales (un fail no aborta el batch)
  — la fila con error queda en `pending` para reintento, no en `rejected`.
  Construye el payload de motivos del registro usando `motivoIds`/
  `motivoNombres` con fallback al motivo principal.
- `features/sincronizacion/sincronizacion.component.{ts,html,scss}`:
  reescrito de cero. 3 secciones colapsables (motivos / alumnos /
  registros) con tabla nativa estilizada (descartado MatTable: overkill
  para el spike y ~30kB extra al bundle). Cada fila: checkbox + columnas
  + 2 botones icon (subir individual / descartar). Toolbar global con
  filtro de texto, chip de selección, botones "Descartar seleccionados",
  "Subir seleccionados" y "Subir todo (N)". Progress bar fija durante
  upload. Panel de errores expandible tras un batch con fallos.
  Confirmación via `ConfirmDialogComponent` antes de descartar.
- Validado: `tsc --noEmit -p tsconfig.app.json` y `tsconfig.spec.json`
  limpios. Build de producción exitoso, chunk lazy
  `sincronizacion-component` ~74kB.

**Decisiones arquitectónicas:**
- **Descartar ≠ eliminar.** Marcar `_syncStatus = 'rejected'` no borra
  la fila local. La bandeja decide *qué se sube*, no *qué se borra* —
  borrar tiene su propia vista. Beneficio: el coordinador puede
  arrepentirse editando la fila otra vez (vuelve a `pending`).
- **Componente nunca habla con RemoteDatabaseService directamente.**
  Todo pasa por SyncService — manejo de errores, idempotencia y
  progreso viven en una sola capa. Si después se agrega sync automático
  o desde otro entry-point (mobile, CLI, scheduled job), comparten la
  misma lógica.
- **Errores por fila, no por batch.** Una fila que falla no aborta el
  resto. Filas exitosas → `synced`; filas con error → siguen `pending`
  (no `rejected` — `rejected` es decisión humana, no consecuencia de
  un error técnico).
- **Tabla nativa sobre MatTable.** MatTable agrega ~30kB de bundle por
  features (sort, paginación, sticky headers, virtualización) que no
  necesitamos en un spike. CSS custom con dark theme integrado, ARIA
  básico vía elementos semánticos. Si volumen real lo justifica
  después, migramos.
- **"Subir todo (N)" muestra el total real, ignorando el filtro.** El
  filtro es solo presentación. Para subir solo lo filtrado: usar
  checkbox del header de la tabla → "Subir seleccionados". Patrón
  estándar (Gmail).

**Pendientes inmediatos:**
- Probar el flujo en navegador con datos reales:
  - crear/editar un alumno offline → debe aparecer en bandeja
  - descartar fila individual → no aparece pero alumno sigue en `/alumnos`
  - subir individual / bulk / todo → verifica conteos en Supabase
  - simular error de red durante upload → verificar panel de errores
- Si el patrón convence al coordinador real: convertir el spike en
  feature de producción (badge en sidebar con conteo, sync automático
  opcional desde config, conflict resolution para edits concurrentes).
- Si el patrón NO convence: quitar el item del sidebar (`AppComponent.
  itemsAdministracion`) — el resto del código queda inerte (los campos
  `_syncStatus` son opcionales).

**Lo que NO se hizo (para 2.2.2+):**
- Sync automático en background (interval / al volver online).
- Conflict resolution: si el coordinador editó local + alguien editó
  remoto, qué versión gana. Por ahora last-write-wins implícito vía
  `onConflict: 'id'` del upsert.
- Vista de `rejected` y "deshacer descarte" — el coordinador puede
  re-trigger pending al editar, suficiente para v1.
- Badge en sidebar con conteo de pendientes.
- Filtros por estado (todo / hoy / errores anteriores).

---

## 2026-05-22 — Fase 2.1 cerrada: schema espejo + adapter + importador one-shot

Primera tanda de Fase 2.1. Objetivo: subir el IndexedDB local a Postgres
manteniendo los UUIDs y validar end-to-end con datos reales del UAT.

**Hecho:**
- `supabase/migrations/0003_data_tables.sql`: tablas `motivos`, `alumnos`,
  `registros`, `registro_motivos` (join table). Snapshots denormalizados
  en `registros` (matricula, nombre_completo, carrera, motivo_principal_nombre,
  turno) para que renombres futuros no rompan reportes históricos.
  `organization_id` nullable + `unique nulls not distinct` para
  single→multi-tenant. RLS con `is not distinct from` para tratar null=null
  como tenant válido. Función `crear_registro_completo(payload jsonb)` con
  UPSERT atómico de registro + motivos.
- `supabase/migrations/0004_invitados_alumno_nullable.sql`: `alumno_id`
  nullable + reescribir `crear_registro_completo` con `nullif` en todos los
  cast a uuid (defense in depth contra `''`).
- `supabase/migrations/0005_fix_alumnos_trigger.sql`: dropear el trigger
  genérico `trg_alumnos_updated_at` que asumía `new.updated_at` (la tabla
  usa `fecha_actualizacion`).
- `src/app/core/services/remote-database.service.ts`: adapter contra
  Supabase con CRUD básico de alumnos/motivos/registros. Mappers
  snake_case↔camelCase. Helper `asUuidOrNull` para sanear IDs sintéticos
  como `invitado-<timestamp>` (los manda como null al backend).
- `src/app/core/services/import-supabase.service.ts`: importador one-shot
  con preview, progreso por fase (motivos→alumnos→registros) y reporte
  final con conteos + errores acumulados (max 20).
- `features/configuracion/dialogs/subir-supabase-dialog.component.{ts,html,scss}`:
  diálogo con 4 estados (loading-preview, preview, running, done, error).
- `features/configuracion/categorias/avanzado.component`: sección
  "Sincronización en la nube" — visible solo si `isSignedIn` + backend
  configurado.
- `supabase.client.ts`: lock pass-through para silenciar el warning de
  NavigatorLockManager (irrelevante en PWA de una pestaña).

**Validado end-to-end con datos UAT reales:**
- 500+ alumnos, 5000+ registros, 5 motivos subidos sin errores tras
  resolver los 3 bugs encontrados.
- Idempotencia verificada: re-corrida no duplica, todos `subidos = N` y
  `errores = 0`.
- Registros del flujo "acceso invitado" (matricula='INVITADO',
  `alumnoId=invitado-<timestamp>`) ahora suben con `alumno_id = null`.

**Bugs encontrados y corregidos (en orden):**
1. **PostgREST schema cache pegado**: tras crear `crear_registro_completo`,
   la API REST tardó en verla — devolvía PGRST202 "function not found".
   Fix: `notify pgrst, 'reload schema'` o botón "Reload" en
   Supabase Dashboard → Settings → API.
2. **Generated column no-IMMUTABLE**: `duracion_minutos integer generated
   always as ((extract(epoch from (hora_salida - fecha_hora)) / 60)::integer)
   stored` falla porque `timestamptz - timestamptz` no es IMMUTABLE para
   Postgres (depende de zona horaria). **Toda la migration aborta** porque
   SQL Editor envuelve en transacción. Fix: trigger
   `set_registro_duracion` BEFORE INSERT OR UPDATE OF que calcula la columna.
3. **`alumno_id` not null vs invitados**: los registros de invitados tienen
   `alumnoId = 'invitado-<timestamp>'` que no es UUID. Fix: `alumno_id`
   nullable + `asUuidOrNull` en el adapter.
4. **Trigger genérico colisionando con columna**: `trg_alumnos_updated_at`
   intentaba `new.updated_at` pero la tabla `alumnos` usa
   `fecha_actualizacion`. Fix: drop del trigger genérico (el específico
   ya cubría el caso).

**Lecciones aprendidas:**
- Supabase SQL Editor corre todo el bloque como una transacción: si un
  statement falla, ROLLBACK total. Sin retroalimentación parcial — el
  primer error abortar deja todo igual que antes. Implicación: testear
  migrations en chunks pequeños cuando sospechas problemas.
- Generated columns con expresiones de fecha/tiempo son riesgosas. Mejor
  usar trigger.
- Cuando una tabla diverge en nombres de columna (caso `alumnos` con
  `fecha_actualizacion` en vez de `updated_at`), no copiar triggers
  genéricos — escribirlos específicos.
- IDs sintéticos del flujo local pueden no ser UUIDs. Sanear en el adapter.

**Feedback recibido del usuario:**
- Confirmó que la idempotencia funciona (UPSERT cubre el escenario "el
  coordinador re-corre por error").
- Pidió **opciones más granulares** de subida: sólo registros de hoy,
  sólo nuevos, sólo alumnos nuevos. Esto es exactamente lo que la
  Fase 2.2 cubre con la "bandeja de sincronización supervisada"
  (`/sincronizacion`). Para esta tanda lo dejé documentado y pendiente
  de decisión: extender el one-shot con filtros simples (rápido) vs.
  saltar directo a la bandeja completa (~6 sem según ROADMAP).

**Estado al cierre:**
- `/configuracion#avanzado` muestra la nueva sección de sincronización
  solo si hay sesión activa.
- La app sigue 100% offline-first; subir a la nube es opt-in manual.
- Sin guards en rutas todavía. Sigue siendo Fase 2 opt-in.

**Pendientes inmediatos:**
- Decidir granularidad de subida (extensión one-shot vs. Fase 2.2).
- Spike de 1 semana para Fase 2.2 (sync engine) cuando se acuerde
  arrancar — el ROADMAP lo recomienda fuerte.

---

## 2026-05-20 (tarde) — Cierre UX del login: indicador de sesión + fix RLS

Segunda tanda del día. La fundación de auth (commit `796d6c0`) ya
funcionaba contra Supabase pero `/login` quedaba huérfana — no había
forma de llegar desde la UI ni de ver "estoy logueado". Esta tanda
cierra ese loop y arregla un bug crítico de RLS encontrado al probar
el flujo end-to-end por segunda vez.

**Hecho:**
- **Indicador de sesión en topbar** (`app.component.html` + `.scss`):
  - `signed-in`: chip pill con avatar circular cyan→teal (inicial del
    nombre) + nombre + caret. Click abre `MatMenu` con avatar grande,
    nombre, email, chip de rol y botón "Cerrar sesión".
  - `signed-out` (Supabase configurado): botón "Iniciar sesión" en
    cyan → navega a `/login?returnUrl=<ruta_actual>`.
  - `local-only`: nada (no confundir cuando se opera sin red).
  - En móvil (≤720px) ambos colapsan: solo avatar / solo icono.
- `inicialUsuario` y `rolLegible` como computed signals en `AppComponent`.
- Métodos `irALogin()` y `cerrarSesion()` con toast confirmatorio.
- Estilos del dropdown viven en `styles.scss` global (no en
  `app.component.scss`) porque el `MatMenu` se renderiza en
  `cdk-overlay-container`, fuera del view encapsulado del componente.
  Se aplica la clase `.account-menu` al panel.
- **Fix RLS recursiva** (`supabase/migrations/0002_fix_rls_recursion.sql`):
  - Bug: la policy `profiles_select` tenía un sub-SELECT contra
    `user_profiles` dentro del USING clause. Esa subquery también
    pasa por la misma RLS → recursión infinita → Postgres devolvía
    **500**. AuthService no podía cargar el perfil; `signed-out`
    silencioso aunque el JWT estuviera presente.
  - Solución: nueva función `current_user_role()` con `security
    definer + set search_path = public`. Bypasea RLS dentro de la
    función (mismo patrón que `is_super_admin()` y
    `current_organization_id()` ya tenían). Policy reescrita para
    consumirla.
- `AuthService.loadProfile()`: `console.error(...)` cuando falla el
  fetch del perfil. Sin esto el próximo fallo así pasaría como "sesión
  cerrada misteriosa". Coste cero, valor diagnóstico real.

**Descubierto:**
- **Trampa clásica de Postgres RLS**: cualquier subquery directa a la
  misma tabla dentro de USING/WITH CHECK reactiva la policy. Antídoto
  estándar es envolver en función `security definer`. Detalle a
  recordar para las migrations 2.1+ cuando agregue policies de
  `alumnos / registros / motivos`.
- En la primera prueba el bug NO se manifestó (probablemente el plan
  query no encontró el ciclo todavía); apareció en la segunda. Buena
  señal para validar siempre el flujo dos veces antes de declarar OK.
- `MatMenu` no propaga estilos encapsulados del componente. Mover a
  global con `class` en `<mat-menu>` resuelve.

**Decidido:**
- **No agregar `authGuard` a rutas todavía.** Fase 2 sigue siendo
  opt-in: el coordinador puede ignorar el login y la app funciona
  igual. Los guards reales llegan en Fase 2.3 cuando los roles
  cuenten para decidir visibilidad de features.
- **El chip de sesión no se muestra en modo solo-local.** Mostrar un
  "Iniciar sesión" cuando no hay backend confundiría — no hay nada
  a qué loguearse. Decisión silenciosa, sin badge.
- **No mostrar el chip en modo quiosco.** Ya está cubierto: el modo
  quiosco oculta el topbar completo (clase `.kiosk-mode` en el shell).

**Validado end-to-end (segunda vez):**
- Cerrar sesión → chip desaparece → aparece "Iniciar sesión".
- Click "Iniciar sesión" → llega a `/login?returnUrl=/scanner`.
- Magic link nuevo → recibo correo → click → vuelvo a `/scanner` con
  el chip activo.
- Sin errores en consola (solo el warning de `lottie-web` CJS,
  preexistente).

**Pendientes que quedan visibles tras esta tanda:**
- `/login` sigue sin link en el sidebar — solo se llega vía botón del
  topbar (`signed-out`) o navegando manualmente. Decisión consciente:
  no contaminar el sidebar mientras auth no es obligatoria.
- Build de prod sigue arrojando warning de presupuesto SCSS en
  `dashboard-ejecutivo` (preexistente, no relacionado).

---

## 2026-05-20 — Fase 2.0 cerrada: fundación de auth con Supabase

Primera tanda de Fase 2 después del cierre de Fase 1 (v3.26.0). Objetivo:
montar la infraestructura mínima de autenticación sin romper nada de la
app actual.

**Hecho:**
- Proyecto Supabase de dev creado (`stenbrary-dev`, región us-east-1).
- `@supabase/supabase-js` instalado.
- `environment.ts` con `supabase.url` + `supabase.anonKey` (formato nuevo
  `sb_publishable_*` — funciona igual que la anon JWT clásica).
- `src/app/core/auth/`:
  - `supabase.client.ts` — singleton `getSupabaseClient()` (PKCE flow,
    persistSession, storageKey custom `stenbrary-auth`).
  - `auth.types.ts` — `AuthUser`, `UserRole` (super_admin/coordinador/
    asistente/alumno), `AuthState` (status: local-only/signed-out/
    signed-in/loading), `Organization`.
  - `auth.service.ts` — signals `state`, `currentUser`, `isSignedIn`,
    `isLocalOnly`, `currentRole`. Métodos `signInWithMagicLink`,
    `signOut`, `refreshProfile`. Suscrito a `onAuthStateChange`.
  - `auth.guard.ts` — `authGuard` funcional. **Importante**: en modo
    local-only deja pasar siempre (offline-first es innegociable).
- `features/auth/login.component.{ts,html,scss}` — pantalla con 4 estados
  visuales: form, sending, sent ("Revisa tu correo"), error. Más vistas
  para `local-only` y `signed-in`. Auto-redirect tras callback con
  `effect` que detecta `isSignedIn() === true` y navega al `returnUrl`.
- Ruta `/login` en `app.routes.ts` (lazy).
- `AppComponent` inyecta `AuthService` para forzar bootstrap al arrancar
  (necesario para que `onAuthStateChange` capture el callback del magic
  link aunque el usuario no esté en `/login`).
- `supabase/migrations/0001_auth_foundation.sql`:
  - Tipo enum `user_role` con los 4 roles.
  - Tabla `organizations` (single-tenant ahora, multi en 2.5).
  - Tabla `user_profiles` con `id` FK a `auth.users(id)`, `organization_id`
    nullable, `rol` default `'asistente'`, `nombre`, `matricula` opcional.
  - Función `handle_new_user()` + trigger `trg_on_auth_user_created` en
    `auth.users` — autocrea perfil al registro.
  - Helpers `is_super_admin()` y `current_organization_id()` (security
    definer, search_path fijado).
  - RLS habilitada en ambas tablas con policies básicas (select propio +
    coordinador ve su org + super_admin ve todo).
- `docs/adr/0001-supabase-auth-foundation.md` — ADR completo con
  contexto, decisión, alternativas (Firebase, backend propio, PocketBase),
  consecuencias.

**Validado end-to-end:**
- `npm install` OK, type-check limpio, build de prod OK (sin warnings
  nuevos).
- Usuario real (correo personal del autor) recibió magic link, click
  inició sesión, trigger creó perfil con rol `asistente` + nombre
  derivado del correo. Verificado por SQL.
- Sesión persiste en localStorage (`stenbrary-auth`).
- Refresh de página mantiene sesión y `effect` redirige a `/scanner`
  automáticamente.

**Descubierto:**
- El formato nuevo `sb_publishable_*` de Supabase funciona idéntico a la
  anon JWT — `supabase-js` lo acepta sin cambios. Vars `NEXT_PUBLIC_*`
  son de Next.js; en Angular las metemos directo en `environment.ts`.
- Bug de UX inicial: tras el callback del magic link, el componente
  mostraba "Hola, X" en vez de redirigir. Fix: `effect` reactivo en
  `LoginComponent` que escucha `isSignedIn()` y dispara navigate.
- El trigger en `auth.users` requiere `security definer` + `set
  search_path` para funcionar (Supabase lo recomienda y previene
  ataques de search_path hijacking).

**Decidido:**
- **No bumpear versión** ni tocar `changelog.data.ts`. Fase 2 aún no es
  feature visible al coordinador — no hay forma de llegar a `/login`
  desde el sidebar y la app sigue funcionando exactamente igual sin
  loguearse. El changelog visible se actualiza cuando arme algo
  utilizable (probablemente al cerrar 2.1 o 2.2).
- **`environment.supabase` con credenciales reales en Git** está OK: la
  publishable key es pública por diseño. El URL del proyecto también.
  Lo que NUNCA va a Git es la `service_role` key.
- **Modo solo-local explícito** desde el día 1: si `environment.supabase`
  está vacío, `getSupabaseClient()` devuelve `null` y el resto del
  código tolera la ausencia. Esto permite desarrollo sin red y respeta
  el principio offline-first del producto.
- **Auth como providedIn: 'root'** sin APP_INITIALIZER: el bootstrap
  pasa por inyectarlo en `AppComponent`. APP_INITIALIZER sería más
  ortodoxo pero introduce un await al cold start que retrasaría el
  scanner — la app debe arrancar offline-first, no esperando red.

**Pendientes inmediatos (Fase 2.1):**
- Migration `0002_data_tables.sql`: `alumnos`, `registros`, `motivos`
  como espejo de IndexedDB con `organization_id` nullable y RLS básica.
- `RemoteDatabaseService` con la misma interfaz pública de
  `DatabaseService` (adapter pattern) para poder hacer feature-flag
  swap durante desarrollo.
- Importador one-shot: subir el IndexedDB de UAT al Supabase como
  prueba con datos reales.

**Notas para el futuro:**
- Aún no hay control de roles real (solo `asistente` por default). Eso
  llega en Fase 2.3. Por ahora cualquiera que se loguea puede hacer todo.
- En el sidebar/topbar todavía no hay indicador de sesión activa ni
  botón de logout. Va a hacer falta cuando empecemos a depender de la
  identidad (Fase 2.1+).
- `/login` está abierta pero no hay forma de llegar desde la UI — si
  quieres probar, navega manualmente.

---

## 2026-05-18 — Fix de lag por matTooltip + alineación de roadmap Fase 2

Tanda mixta: un fix puntual de performance y, sobre todo, **acordar el
rumbo a largo plazo** del producto. Se sentaron decisiones que orientan
los próximos 4-5 meses de trabajo.

**Hecho:**
- `app.config.ts`: provider global de `MAT_TOOLTIP_SCROLL_STRATEGY` →
  `overlay.scrollStrategies.close()` (default es `reposition`). El
  dashboard tenía lag perceptible al scrollear con ~18 tooltips
  activos; ahora el tooltip se cierra al scrollear y los listeners
  reactivos desaparecen. Cambio aplica a toda la app.
- `MAT_TOOLTIP_DEFAULT_OPTIONS` también global con
  `disableTooltipInteractivity: true`.
- `CLAUDE.md`: nueva sección **"Visión del producto y fases"** con
  resumen de las 5 fases y referencia a `docs/ROADMAP.md`. También
  línea sobre la convención del scroll strategy en "Convenciones".
- `docs/ROADMAP.md`: documento nuevo, fuente única de verdad del
  largo plazo. Cubre las 5 fases, decisiones arquitectónicas de
  Fase 2 (stack, tenancy, sync, roles), riesgos y mitigaciones.

**Descubierto:**
- El `MatTooltip` con scroll strategy default `reposition` registra
  **cada trigger como `cdkScrollable`**, lo que dispara un evento
  global por cada scroll y multiplica reflows. Con 18 tooltips por
  vista es notable. Solución global > arreglar caso por caso.
- El dashboard ejecutivo había quitado tooltips por este mismo lag;
  con el fix global se pueden restaurar caso por caso (donde aporten
  valor, no por reflejo).

**Decidido:**
- **Stack de Fase 2: Supabase** (no Firebase). Razón principal: modelo
  relacional (alumnos/registros/motivos) encaja en Postgres y las
  queries de `EstadisticasAvanzadasService` (joins, agregaciones) son
  nativas en SQL. Firestore obligaría a denormalizar y multiplicar
  costo de lecturas. Aprendizaje (Postgres + RLS) también más
  transferible profesionalmente.
- **Tenancy**: single-tenant ahora con `organization_id` nullable en
  todas las tablas desde el inicio. Multi-tenant llega en Fase 2.5.
- **Sync**: offline-first con **bandeja de sincronización supervisada
  por el coordinador**. NO sync automático ciego — el coordinador
  debe poder descartar registros antes de subir (caso "alumno
  travieso"). Sync automático opcional configurable por horario.
- **4 roles**: super-admin, coordinador, asistente, alumno. El
  portal alumno prepara terreno para el módulo de préstamos (Fase 4).
- **Orden**: cerrar Fase 1 (rediseño `/configuración` + command
  palette Ctrl+K) antes de arrancar Fase 2. ~2 sem de UX que entrega
  v4.0 visible al cliente.

**Hecho (segunda mitad de la tanda) — refactor `/configuración`:**
- Estructura nueva en `features/configuracion/`:
  - `configuracion.types.ts`: 7 categorías con id, nombre, icono,
    descripción y `keywords[]` (para búsqueda y futuro command palette).
  - `configuracion.styles.scss`: ~580 líneas extraídas del legacy para
    que el shell y los 7 sub-componentes reutilicen sin duplicar.
  - `configuracion-v2.component.{ts,html,scss}`: shell con sidebar
    (280px) + panel scrollable. Sidebar tiene buscador (filtra por
    nombre + descripción + keywords), nav de categorías y link a
    "versión clásica". Responsive: drawer + backdrop ≤900px.
  - Categoría activa persistida en `localStorage` y reflejada en URL
    como fragment (`/configuracion-v2#datos`) — permite bookmarks.
  - `categorias/general.component.{ts,html}`: info del sistema +
    identidad institución. ChangeDetection OnPush.
  - `categorias/avanzado.component.{ts,html}`: accesos directos +
    zona peligrosa (DESTRUCCION_HABILITADA sigue en false).
- Ruta nueva `/configuracion-v2` agregada en `app.routes.ts`. El
  legacy `/configuracion` queda intacto y muestra un banner
  cyan-teal "Prueba la nueva configuración (beta)" arriba.
- Las 5 categorías no migradas (Escáner, Operación, Quiosco,
  Experiencia, Datos) muestran un placeholder con CTA al legacy.
  El sidebar las marca con badge "beta" para que el coordinador
  sepa cuál ya está migrada.

**Decisiones de implementación:**
- Sub-componentes inyectan servicios directamente (ConfigService,
  BackupService, etc.) en lugar de crear un `ConfiguracionStateService`
  intermedio. Razón: los servicios actuales ya están bien diseñados
  y el state-service intermedio sería un wrapper sin valor añadido.
- Coexistencia de v1 + v2 con feature flag implícito (la ruta
  v2 existe pero no es default) — patrón canary. Permite validar
  con el coordinador antes de swap.

**Hecho (tercera mitad — cierre del refactor):**
- Migradas las 5 categorías restantes siguiendo el mismo patrón:
  - **Escáner** (`escaner.component.{ts,html}`): sonido + velocidad +
    cooldown + saltar confirmación + cámara preferida + zoom inicial.
  - **Operación** (`operacion.component.{ts,html}`): registro de salida
    + cierre auto + confirmación auto + cierre al horario + aforo
    (capacidad + modo) + duplicados.
  - **Quiosco** (`quiosco.component.{ts,html}`): modo quiosco + PIN
    + horarios por día + modo (advertir/bloquear).
  - **Experiencia** (`experiencia.component.{ts,html}`): celebración
    + tiempo de pantalla de éxito + preview de los 8 temas
    + alertas de inactividad.
  - **Datos** (`datos.component.{ts,html}`): recordatorio de respaldo
    (intervalo / programado por día y hora) + backup + restore + integra
    `LimpiezaRegistrosComponent` y `DatosPruebaComponent` existentes
    + mantenimiento (limpiar motivos duplicados).
- Shell `configuracion-v2.component.ts` actualizado: las 7 categorías
  importadas, switch del template las enruta todas, conjunto `migradas`
  cubre las 7. Placeholder de "Sección en migración" eliminado.
- **Swap de routing**:
  - `/configuracion` → ahora apunta al `ConfiguracionV2Component`
    (shell nuevo). Es la ruta por defecto que ve el coordinador.
  - `/configuracion-legacy` → mantiene el monolito de 2897 líneas
    para acceso de emergencia mientras valida.
  - `/configuracion-v2` → redirect a `/configuracion` (backward compat).
  - Botón "Ver versión clásica" del shell apunta a `/configuracion-legacy`.
  - Banner del legacy invierte su mensaje: ahora dice "Estás en la
    clásica, ve a la nueva".
- Release **v3.24.0** registrada en `CHANGELOG` (destacado=true,
  resumen + 5 cambios visibles al usuario). `package.json` bumpeado.
  Guardrail de versión verde.

**Decisiones de cierre:**
- NO borrar `configuracion.component.ts` legacy todavía. Sigue accesible
  en `/configuracion-legacy` por si en producción aparece un edge case
  que el rediseño no contempló. Se borrará en una tanda posterior cuando
  el coordinador haya operado al menos 1-2 semanas con el shell nuevo.
  Deuda técnica documentada — tracked en task pendiente.
- `DatosCategoriaComponent` emite `(datosCambiaron)` cuando importa
  backup o limpia duplicados; el shell lo recibe pero por ahora no
  reacciona (el `GeneralCategoriaComponent` relee conteos al re-montar
  via switch, que es comportamiento esperado). Si en el futuro
  necesitamos refresco cruzado en vivo, agregar un signal en
  `ConfigService` o `DatabaseService` que las categorías afectadas
  observen.

**Hecho (cuarta mitad — fix de centrado + command palette completo):**

- **Fix de centrado del shell**: el panel-body tenía `max-width: 920px`
  pero sin `margin: 0 auto`, así que quedaba pegado al sidebar dejando
  un hueco enorme a la derecha. Solución: separar `panel-header` (full
  width, conserva border-bottom completo) de `.panel-header-inner`
  (max-width 920px, centrado). Mismo tratamiento al `.panel-body`.
- **Command palette (v3.25.0)** — extiende el global-search existente:
  - Nuevo `core/services/command-palette.service.ts` con catálogo de
    comandos. 3 grupos: Navegación (18), Configuración (6 toggles),
    Acciones (6). Cada comando: `id`, `label` (puede ser función para
    estado dinámico), `descripcion`, `icono`, `keywords[]`,
    `visible?()`, `ejecutar()`.
  - Toggles muestran label dinámico: "Activar/Desactivar modo quiosco"
    según estado actual. Misma técnica para celebración, sonido,
    registro salida, horario, saltar confirmación.
  - `global-search-dialog.component.ts` reescrito (363→~430 líneas):
    inyecta `CommandPaletteService`, suma comandos a los resultados,
    materializa labels/descripciones que son funciones, normaliza
    queries para búsqueda fuzzy (ignora acentos).
  - Sin query → muestra 6 sugerencias rápidas (toggles + exportar
    respaldo) en lugar de placeholder vacío. Convierte el palette en
    una "central" del sistema, no solo un buscador.
  - Chips de color por grupo: cyan (Navegación), ámbar (Configuración),
    teal (Acciones), violeta (Alumnos), gris (Hoy).
  - Atajos directos a cada categoría de Configuración via URL fragment
    (`/configuracion#datos`) — reutiliza el shell del rediseño.
  - El dialog se cierra ANTES de ejecutar comando, para que el toast
    del comando sea visible y no quede tapado por el palette.
- Ctrl+K ya estaba wired en `AppComponent` desde v3.11 — no requirió
  cambios. El nuevo dialog se monta directamente.

**Decisiones de implementación:**
- El catálogo de comandos vive en un service singleton (`providedIn:
  'root'`), no inline en el dialog. Razón: el catálogo crecerá (Fase 2
  añadirá auth, sync, roles…) y conviene que esté centralizado para
  agregar comandos sin tocar el dialog.
- `getCommands()` retorna el catálogo filtrado por `visible()` cada vez
  que se llama — no se cachea. Permite que los toggles reflejen el
  estado actual en cada apertura del palette.
- Búsqueda fuzzy sin librería externa: `normalize('NFD').replace(/[̀-ͯ]/g, '')`
  + lowercase. Suficiente para el volumen actual (~30 comandos +
  ~N alumnos).
- En ≤480px se ocultan los chips para no ocupar espacio del título.

**Siguiente (próxima tanda):**
- Validar con el coordinador real `/configuracion` + Ctrl+K (operación
  1-2 semanas). Si todo OK, borrar archivo legacy + ruta
  `/configuracion-legacy`.
- Considerar agregar al palette: filtros de `/registros` (ej. "registros
  de hoy", "registros de esta semana"), historial reciente de comandos,
  fuzzy ranking por uso frecuente.
- **Fase 2.0** — setup Supabase + auth básica (ver `docs/ROADMAP.md`
  §Fase 2). Ya cerrada la "última milla UX" de Fase 1.

**Commits:** pendientes al final de la tanda.

---

## 2026-04-20 — Endurecimiento de calidad y tooling (retroactivo)

Primera entrada retroactiva: cubre la fase previa al arranque formal del
roadmap (features core + UX). El objetivo fue dejar la base estable antes
de escalar.

**Hecho:**
- Tests unitarios base: 69 specs en verde.
  - `matricula.utils.spec.ts`, `horarios.utils.spec.ts`,
    `insignias.utils.spec.ts` — 49 specs de lógica pura.
  - `database.service.spec.ts` — 20 specs con `fake-indexeddb`:
    ventana por fecha, duplicados, entrada abierta, registro de salida,
    cierre automático, búsqueda por matrícula.
- CI con GitHub Actions (`.github/workflows/ci.yml`): type-check +
  tests headless (ChromeHeadlessCI con `--no-sandbox`) + guardrail de
  versión en cada push/PR.
- Husky v9 pre-commit ligero: `check:version` + `tsc -p tsconfig.app.json`
  + `tsc -p tsconfig.spec.json`. Tests y build completos quedan en CI
  para no ralentizar el commit.
- Guardrail `scripts/check-version.mjs`: verifica que `package.json`
  y el primer entry de `CHANGELOG` coincidan. Integrado en CI + hook.
- E2E smoke con Playwright (`e2e/smoke.spec.ts`): 4 tests cubriendo
  carga de `/scanner`, navegación, dashboard vacío, título.
- `ErrorReporterService` con cola offline en localStorage, drena en
  evento `online`. Endpoint configurable por environment — cero costo
  de bundle si no se configura. Wired al `GlobalErrorHandler`.
- Lazy load de `@zxing/browser`: migrado de import estático a
  `await import(...)`. Reduce ~430 KB del chunk inicial del scanner.
- Migración parcial `*ngIf` → `@if` en 5 componentes simples.
- `angular.json`: `allowedCommonJsDependencies` silencia warnings de
  build de producción (canvg, core-js, html2canvas, raf, rgbcolor).
  Build prod: 0 warnings.

**Descubierto:**
- `obtenerRegistrosPorFecha` necesita el fallback `getAll()+filter`
  porque registros antiguos tienen `fechaHora` como string ISO, no
  como `Date`. El índice `by-fecha` no los encuentra.
- Seis archivos `.spec.ts` generados por el CLI nunca corrieron y
  estaban desactualizados (esperaban props que ya no existen).
  Eliminados.
- Las webcams de laptop reportan 1280×720 pero tienen foco fijo que
  produce imágenes borrosas → el pipeline agresivo del scanner debe
  estar siempre ON, no gateado por resolución. (Ya aplicado en v3.9.1).

**Decidido:**
- Mantener el fallback de fechas hasta migrar a `DB_VERSION = 2` con
  normalización `string → Date`.
- Migración parcial `*ngIf` solo en archivos simples; los 7 componentes
  grandes (~97 ocurrencias) se abordarán 1 por PR con validación
  visual manual.
- Activity Log (audit trail) como próximo feature crítico — se
  aprovechará la misma migración de `DB_VERSION = 2`.

**Siguiente:**
- Módulo "Datos de prueba" in-app (rango matrículas 9000001+).
- `DB_VERSION = 2`: normalizar fechas + agregar store `audit`.
- Activity Log con vista `/actividad`.

**Commits:**
- `1f3a682` — tests base + CI + karma headless + *ngIf migración fase 1.
- `06e4a47` — Playwright smoke + error reporter + lazy zxing.
- `23bdbac` — tests DB + husky + guardrail + CommonJS allowlist.

---

## 2026-04-20 — Generador de datos de prueba (A1 del roadmap)

Arranque formal del roadmap refinado. Primer paso de la fase A
(infraestructura de datos). El objetivo: poder validar vistas y
performance con volumen realista sin clickear a mano.

**Decisiones previas (exclusiones confirmadas por el coordinador):**
- No habrá tema claro/oscuro. Dark theme único.
- No habrá foto de alumno (costo de almacenamiento vs beneficio bajo).
- No habrá i18n. Sistema 100% español.

**Hecho:**
- `DatosPruebaService` (`core/services/datos-prueba.service.ts`):
  - Genera alumnos con matrículas en rango `9000001+` (fácil de
    limpiar, separable de datos reales sin ensuciar el modelo).
  - Registros marcados con `dispositivo = 'SEED-TEST'` como
    segunda línea de identificación.
  - Distribución Poisson (Knuth) sobre registros por alumno para
    curva natural: heavy users + mayoría esporádicos.
  - Estado de registros: 60% cerrados normales, 25% abiertos,
    15% estancia larga.
  - Motivos: 70% unitario, 25% doble, 5% triple — ejercita
    retrocompat `motivoId` + `motivoIds[]`.
  - Llama a los mismos métodos que el scanner
    (`crearAlumno`, `crearRegistro`, `actualizarRegistroManual`).
    Si hay bug en validaciones/índices, sale a la luz con volumen.
- `DatosPruebaComponent` en `/configuracion`:
  - 4 presets (Pequeño/Medio/Grande/Estrés) + modo personalizado.
  - Inputs libres con rangos naturales (1–1000 alumnos, 1–365 días,
    0.1–50 λ Poisson) — principio de flexibilidad CLAUDE.md.
  - Progress bar en tiempo real durante generación/limpieza.
  - Conteo en vivo de datos de prueba actualmente cargados.
  - `ConfirmDialog` `info` para generar, `danger` para limpiar.

**Descubierto:**
- Bug de timing en `database.service.spec.ts`: 3 tests de
  `cerrarEntradasAntiguas` asumían que "hace N horas" siempre cae
  en el día actual. Falso entre 00:00 y ~05:00 AM (los tests caían
  en "ayer" y el filtro `obtenerRegistrosAbiertoHoy` los excluía).
- **Fix:** `jasmine.clock().mockDate()` congela "ahora" al mediodía
  antes de cada test del grupo. Tests ahora son independientes de
  la hora en que se ejecuten.

**Decidido:**
- Identificar datos de prueba por convención de matrícula
  (`9000001+`) en vez de flag `esPrueba` en el modelo. No requiere
  bump de `DB_VERSION` ni toca el modelo `Alumno`.
- El generador NO usa `cierreAutomatico=true` en registros de
  prueba (requeriría exponer método nuevo en `DatabaseService` o
  acceso directo al `db` privado). Se compensó con distribución
  de "estancias largas" de 3–7h sin cerrar.

**Siguiente:**
- A2: migración `DB_VERSION = 2` — normaliza fechas string → Date
  y crea store `audit`.
- A3: Activity Log completo (servicio + logging + vista `/actividad`).

**Estado de la suite:** 69/69 tests verde. Build prod 0 warnings.

**Commit:** (pendiente al momento de escribir esto)

---

## 2026-04-20 — Calendario UAT en generador + lista maestra de pruebas

Refinamiento del generador A1 con modelo realista basado en el calendario
escolar UAT 2026 (foto compartida por el coordinador), y entrega de la
"lista de mandado" para pruebas manuales end-to-end.

**Hecho:**
- `datos-prueba.service.ts` reescrito con modelo UAT:
  - 3 períodos lectivos: primavera (12-ene → 15-may), verano
    (01-jun → 15-jul), otoño (17-ago → 07-dic).
  - Verano: solo 15% de alumnos activos (refleja "200–400 inscritos
    en cursos de verano" dicho por coordinador).
  - Festivos oficiales MX + UAT excluidos (01-ene, 05-feb, 16-mar,
    01-may, 05-may, 16-sep, 02-nov, 16-nov, 12-dic, 25-dic).
  - Semana Santa aproximada (25-mar → 05-abr): 0 registros.
  - Domingos cerrado · sábado 30% operación.
  - Horario 7:00–22:00 (antes era 7–20).
  - Turnos ponderados: 66% Matutino, 22% Vespertino, 12% Mixto
    (antes uniforme 33/33/33).
  - `horaSalida` acotada a hora de cierre — no deja registros que
    salen a las 23:00 con entrada legítima a las 21:00.
  - Semántica de λ cambió: "registros por alumno por mes" (antes
    "registros totales promedio por alumno"). Más intuitivo cuando
    la ventana es 30m vs 30 días.
  - Aproximación Normal de Poisson para λ > 30 (Box-Muller), antes
    Knuth se volvía lento.
  - Caps subidos: 3000 alumnos (antes 1000), 1095 días (antes 365).
  - Método público `estimarRegistros(config)` para UI previa.
  - Método público `construirCalendario(ventanaDias)` para
    debugging y futuras vistas.
- `datos-prueba.component.ts` actualizado:
  - Nuevos presets: Pequeño (100/30), Medio (500/180),
    Tu universidad UAT (2554/30), Histórico 12m (2500/365),
    Histórico 30m (2500/900).
  - Label renombrado: "Registros por alumno / mes".
  - Estimación de tiempo (~10ms por registro × 2 writes IDB).
  - Advertencia visible cuando >30k y >80k registros.
- `docs/PRUEBAS-MANUALES.md` — checklist de 300+ items cubriendo
  27 áreas (setup, generador, scanner, registros, dashboard,
  /presencia, /inactivos, configuración, exportación, PWA,
  performance, edge cases, accesibilidad, escenario real UAT).

**Descubierto:**
- El calendario UAT usa 3 períodos (no 2 semestres), corregido.
- `actualizarRegistroManual` acepta `horaSalida` — bien. Pero
  `crearRegistro` NO acepta `fechaHora` custom, por eso seguimos
  con el patrón "crear + actualizar" (2 writes/registro).
  Pendiente: `crearRegistrosBatch()` como optimización.

**Decidido:**
- Calendario UAT HARDCODED en constantes del servicio (no en
  ConfigService). Razón: es infra de testing, no config de
  producción. Cuando se venda a otra universidad, se abstraerá
  a un `CalendarioEscolarService` configurable por el coordinador.
- No se agregaron tests unitarios al servicio de seed porque el
  valor viene de probar con datos reales contra las vistas
  (integración), no de tests aislados de distribuciones.
- Pruebas de distribución (no registros en domingos, no en
  festivos, etc.) quedan como parte del checklist manual
  (sección 1.6).

**Siguiente:**
- Ejecutar checklist con preset "Histórico 30m" para encontrar
  los bugs reales bajo volumen.
- Implementar `crearRegistrosBatch()` si tiempos > 15 min son
  frustrantes.
- A2: migración `DB_VERSION = 2` (fechas string→Date + store audit).

**Commits:** (pendiente)
