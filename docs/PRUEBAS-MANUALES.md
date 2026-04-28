# Pruebas manuales — Stenbrary

Lista exhaustiva de pruebas manuales para validar el sistema con el generador
de datos de prueba (calendario UAT: 3 períodos, vacaciones, festivos, 7–22,
turnos 2/3 matutino).

**Cómo usar:** antes de cada release (o cuando cambies algo sensible), marca
cada casilla según completes. Si algo falla, captura screenshot + pasos y
anótalo en una columna "incidencias" al final de cada sección.

**Convención:**
- ✅ = funcionó como se esperaba.
- ❌ = falló (crear issue).
- ⚠️ = funciona con observación.
- `—` = no aplica en esta release.
- 🤖 = verificado por auditoría de código (no UI real).
- 👤 = requiere intervención manual del usuario (hardware, cámara, visual, volumen).

---

## 0. SETUP INICIAL

### 0.1 Instalación limpia
- [✅] `npx ng serve` arranca sin errores
- [✅] App carga en `http://localhost:4200`
- [✅] Redirige de `/` a `/scanner`
- [✅] Wildcard (`/foo-no-existe`) redirige a `/scanner`
- [ ] Primera carga: NO muestra badge "Novedades" en sidebar
- [ ] IndexedDB creada (DevTools → Application → IndexedDB → `stenbrary-db`)
- [✅] Stores `alumnos`, `registros`, `motivos` existen
- [✅] 5 motivos default creados (Estudiar, Pedir libro, Trabajo escolar, Investigación, Otro)
- [ ] Service Worker registrado (`/ngsw-worker.js` en Application → Service Workers)

### 0.2 PWA
- [✅] Se puede "Instalar app" desde Chrome/Edge
- [✅] Instalada, abre en ventana propia
- [✅] Icono y nombre correctos (Stenbrary)
- [ ] `manifest.webmanifest` cargado

---

## 1. GENERADOR DE DATOS DE PRUEBA

### 1.1 Validación del generador mismo
Ir a `/configuracion` → sección "Datos de prueba".

- [✅] Muestra "Aún no hay datos de prueba cargados"
- [✅] Presets visibles: Pequeño, Medio, Tu universidad (UAT), Histórico 12m, Histórico 30m
- [✅] Seleccionar preset rellena los 3 inputs
- [✅] Tocar cualquier input cambia dropdown a "Personalizado"
- [✅] Estimación actualiza en vivo
- [✅] Tiempo estimado actualiza en vivo (segundos / minutos / horas)
- [ ] Con >30k registros: aparece "Proceso largo. Paciencia."
- [ ] Con >80k registros: "Proceso muy largo. Déjalo correr en segundo plano."

### 1.2 Preset "Pequeño" (100/30/2)
- [ ] Click "Generar datos de prueba" → diálogo de confirmación
- [ ] Diálogo menciona "calendario UAT: vacaciones, festivos, verano 15%"
- [ ] Confirmar → barra de progreso visible
- [ ] Fase 1: "Creando alumnos..." llega a 100
- [ ] Fase 2: "Generando registros..." llega al total estimado ±20%
- [ ] Toast éxito con números finales
- [ ] Conteo actualiza: "100 alumnos · ~N registros de prueba cargados"
- [ ] Tiempo real < 10 segundos

### 1.3 Preset "Medio" (500/180/2)
- [ ] Genera sin errores
- [ ] Tiempo real < 1 minuto
- [ ] Conteo: 500 alumnos, ~3000 registros (después de aplicar factor vacaciones ≈30%)

### 1.4 Preset "Tu universidad" (2554/30/2)
- [ ] Genera sin errores
- [ ] Conteo: 2554 alumnos
- [ ] Registros cercanos a los estimados
- [ ] Tiempo real < 5 minutos

### 1.5 Preset "Histórico 30m" (2500/900/1.5) — CASO EXTREMO
- [✅] Antes de ejecutar: advertencia visible
- [✅] Ejecutar en pestaña secundaria (puede tardar 15–30 min)
- [✅] NO se congela la UI de otras pestañas
- [✅] Completa sin crashear
- [✅] Conteo final: 2500 alumnos, ~90k registros
- [ ] IndexedDB no excede cuota del navegador

### 1.6 Verificación de distribución (con datos ya generados)
Abrir DevTools Console y revisar con `indexedDB.databases()` o inspeccionar.

- [ ] Ningún registro tiene `fechaHora` en día domingo (día 0)
- [ ] Ningún registro cae en festivo oficial (01-01, 02-05, 03-16, 05-01, 05-05, 09-16, 11-02, 11-16, 12-12, 12-25)
- [ ] Ningún registro entre 03-25 y 04-05 (Semana Santa aprox)
- [ ] Ningún registro con `fechaHora.hours` fuera de 7–22
- [ ] Ningún registro con `horaSalida.hours` > 22
- [ ] Matrículas todas ≥ 9000001
- [ ] Todos los registros tienen `dispositivo === 'SEED-TEST'`
- [ ] En meses de verano (junio/julio): menor densidad de registros (~15% del normal)
- [ ] En períodos inter-semestrales (mayo 16–31, julio 16–ago 16, dic 8–ene 11): cero registros
- [ ] Distribución turnos: ~66% Matutino, ~22% Vespertino, ~12% Mixto
- [ ] Ninguno de los 5 motivos default quedó sin usar
- [ ] Al menos un alumno tiene registros con 2 motivos
- [ ] Al menos un alumno tiene registros con 3 motivos

### 1.7 Limpieza
- [✅] Botón "Limpiar datos de prueba" abre diálogo danger
- [✅] Muestra exactamente los conteos actuales
- [✅] Confirmar → barra de progreso
- [ ] Toast éxito
- [✅] Conteo vuelve a 0
- [✅] IndexedDB ya no contiene matrículas 9000001+
- [✅] Los motivos NO se borraron
- [✅] La configuración NO se borró
- [✅] Si había alumnos REALES (matrículas normales): siguen intactos

### 1.8 Casos edge del generador
- [🤖✅] `cantidadAlumnos = 0`: botón deshabilitado — `configValida` exige `>=1` (`datos-prueba.component.ts:605`)
- [🤖✅] `cantidadAlumnos = 3001`: botón deshabilitado — tope `<=3000`
- [🤖✅] `ventanaDias = 0`: botón deshabilitado — `>=1`
- [🤖✅] `ventanaDias = 1096`: botón deshabilitado — tope `<=1095`
- [🤖✅] `registrosPorAlumnoPorMes = 0`: botón deshabilitado — `>=0.1`
- [🤖✅] `registrosPorAlumnoPorMes = 51`: botón deshabilitado — tope `<=50`
- [🤖✅] Sin motivos activos: throw "No hay motivos activos" (`datos-prueba.service.ts:165-167`)
- [🤖✅] Regenerar con datos ya cargados: no duplica — índice `by-matricula` unique + seed usa matrículas ≥9000001

---

## 2. SCANNER — CÁMARA

### 2.1 Permisos
- [✅] Primera visita: pide permiso de cámara
- [✅] Denegar: muestra mensaje claro con botón "Reintentar"
- [✅] Aceptar: video visible

### 2.2 Detección nativa (`BarcodeDetector`)
Navegadores con soporte: Chrome/Edge en Windows recientes.

- [ ] En consola: `usandoNativo = true`
- [ ] Código impreso limpio: detecta < 1 segundo
- [ ] Código en pantalla de celular: detecta < 1 segundo
- [ ] Código borroso (lejos): detecta en 2–3 segundos
- [ ] Código con reflejo: detecta eventualmente

### 2.3 Fallback ZXing
Firefox o Safari para forzar.

- [ ] En consola: `usandoNativo = false`
- [ ] Detecta Code128 correctamente
- [ ] Detecta Code39 correctamente
- [ ] QR: NO detecta (hints restringidos)

### 2.4 Pipeline agresivo (v3.9.1+)
- [ ] Webcam borrosa: detecta con ≤5 segundos de procesamiento
- [ ] Luz baja: pipeline Otsu entra en juego
- [ ] Código invertido (blanco sobre negro): detecta
- [ ] Código ligeramente rotado: detecta
- [ ] Código muy pequeño en pantalla: upscaling detecta

### 2.5 Linterna y zoom
- [ ] Botón linterna visible si cámara soporta torch
- [ ] Encender linterna: video se ve más claro
- [ ] Apagar linterna: video normal
- [ ] Zoom hardware (si cámara lo soporta): funciona
- [ ] Zoom software: crop+scale visible

### 2.6 Cooldown / duplicado por escaneo
- [ ] Escanear matrícula → procesa
- [ ] Inmediatamente mostrar la misma matrícula: NO vuelve a disparar
- [ ] Esperar el cooldown: vuelve a detectar

### 2.7 Cambio de cámara
- [ ] Dispositivo con múltiples cámaras: dropdown visible
- [ ] Cambiar a otra cámara: stream se reinicia

### 2.8 Rendimiento loop
- [ ] DevTools Performance: loop consume <20% CPU idle
- [ ] Abrir DevTools Memory: no hay leaks de frames después de 10 min

---

## 3. SCANNER — MODO MANUAL

### 3.1 Input válido
- [✅] Ingresar `2299990001` + Enter → procesa
- [✅] Ingresar `a2299990001` → normaliza y procesa
- [✅] Ingresar `A2299990001` → normaliza (case-insensitive)
- [✅] Ingresar ` 2299990001 ` (con espacios) → normaliza y procesa

### 3.2 Input inválido
- [✅] `123` (menos de 7): toast error
- [🤖✅] `12345678901234567890` (más de 12): toast error — **BUG ARREGLADO** v3.12.2: `procesarMatriculaManual` ahora usa `validarMatricula()` que aplica `maxDigitos: 12` (`scanner.component.ts:1348`)
- [✅] `abc` (no numérico sin prefijo válido): toast error
- [✅] Vacío + Enter: no hace nada (o toast)

### 3.3 Invitado
- [✅] Botón "Acceso invitado" visible
- [✅] Click: abre diálogo pedir nombre
- [✅] Nombre vacío: no permite
- [✅] Nombre válido: va a `/seleccion-motivo`
- [✅] Registro creado con `matricula: 'INVITADO'`
- [✅] Segundo invitado con mismo nombre: acepta (no es duplicado)

### 3.4 Lector USB HID (v3.11.0)
- [ ] Lector conectado, simulando Enter final: captura matrícula
- [ ] Velocidad de escaneo: no se trunca el input
- [ ] Input parcial sin Enter: no procesa

---

## 4. REGISTRO DE ALUMNO NUEVO

### 4.1 Flujo básico
- [✅] Ingresar matrícula que NO existe → redirige a `/registro-alumno`
- [✅] Matrícula pre-llenada, no editable (o semi-editable)
- [✅] Llenar nombre, apellidos, carrera, grado, grupo, turno
- [✅] Guardar → regresa al scanner y continúa al motivo
- [🤖✅] Alumno creado en IndexedDB con `activo: true` — `registro-alumno.component.ts:131` + `database.service.ts:187-189`
- [✅] `fechaRegistro` es ahora

### 4.2 Validaciones
- [✅] Campos obligatorios vacíos: botón Guardar deshabilitado o toast
- [🤖—] Datos extra (campos dinámicos): se pueden añadir — **feature no implementada** en el form actual (modelo `Alumno.datosExtra` existe pero el UI no expone inputs dinámicos)
- [🤖—] Datos extra se persisten en `datosExtra: Record<string, string>` — idem, ver arriba

### 4.3 Cancelar
- [✅] Botón cancelar → confirmación (si hay datos)
- [✅] Confirmar cancelación → limpia `sessionStorage.matriculaTemp` y vuelve al scanner

---

## 5. SELECCIÓN DE MOTIVOS

### 5.1 Con motivos activos
- [✅] Muestra los 5 default
- [✅] Cada motivo tiene icono y color
- [✅] Un motivo: click → se selecciona
- [✅] Dos motivos: ambos marcados
- [✅] Tres motivos: todos marcados
- [✅] Deseleccionar: quita la marca

### 5.2 Confirmación
- [✅] Sin motivos seleccionados: botón confirmar deshabilitado
- [✅] Con 1+ motivos: confirmar crea registro
- [✅] Registro tiene `motivoId`/`motivoNombre` (principal)
- [✅] Con 2+: también tiene `motivoIds[]`/`motivoNombres[]`
- [✅] Regresa a `/scanner`
- [✅] Toast éxito
- [✅] Beep de scan

### 5.3 Cancelar / atrás
- [✅] Botón cancelar → regresa a scanner
- [✅] No se crea registro
- [🤖✅] `sessionStorage.alumnoActual` se limpia — `seleccion-motivo.component.ts:288,294`

### 5.4 Guardia
- [🤖✅] Sin `alumnoActual`: redirige a `/scanner` + toast — `registro-flujo.guard.ts:38-40`
- [🤖✅] `alumnoActual` corrupto: try/catch JSON.parse, limpia y redirige — `registro-flujo.guard.ts:28-35`

---

## 6. DETECCIÓN DE DUPLICADO

Configurar `umbralDuplicadoMin = 30`. Tener `registroSalidaActivo = false`.

- [✅] Escanear alumno → registrar motivo → volver a escanear inmediatamente
- [✅] Diálogo "Registro duplicado" aparece
- [✅] 3 opciones visibles: Salida, Nuevo registro, Cancelar
- [✅] Cancelar: cierra sin acción
- [✅] Nuevo: crea registro adicional (ahora hay 2)
- [🤖✅] Después del umbral: NO muestra duplicado — `verificarRegistroReciente()` filtra `fechaRegistro >= limite` (`database.service.ts:686`)

---

## 7. REGISTRO DE SALIDA ACTIVO

Configurar `registroSalidaActivo = true`.

### 7.1 Flujo entrada + salida
- [ ] Primera vez: registra entrada (sin horaSalida)
- [ ] Segunda vez (mismo día): diálogo "Salida / Nuevo / Cancelar"
- [ ] Salida: calcula `duracionMinutos`, pone `horaSalida = ahora`
- [ ] El alumno ya NO aparece en `/presencia`
- [ ] Tercera vez: entrada nueva (flujo de nuevo)

### 7.2 Entrada abierta de AYER
- [ ] Crear entrada, bajar reloj del sistema al día siguiente
- [ ] Escanear al alumno: NO considera la entrada de ayer (usa `obtenerEntradaAbiertaHoy`)
- [ ] Entra como entrada nueva

### 7.3 Cierre automático
Configurar `horasAutoSalida = 4`.

- [ ] Crear entrada hace 5 horas
- [ ] Cargar app: entrada aparece cerrada con flag `cierreAutomatico: true`
- [ ] En `/presencia`: visible con indicador distintivo (⚠️ o similar)
- [ ] Botón "Confirmar cierre": limpia el flag
- [ ] Con `horasAutoSalida = 0`: feature off, no cierra nada

---

## 8. AFORO

### 8.1 Aforo desactivado (aforoMaximo = 0)
- [✅] No hay indicador de aforo en scanner
- [✅] Registrar alumno: ningún aviso

### 8.2 Aforo modo "permitir" (aforoMaximo = 50)
- [👤] Indicador semáforo visible (requiere UI)
- [🤖✅] Con 0 entradas: "libre" — `aforo.service.ts:60` (<50%)
- [🤖✅] Con 25 entradas (50%): "normal" — `>=50 && <80`
- [🤖✅] Con 40 entradas (80%): "alto" — `>=80 && <100`
- [🤖✅] Con 50 entradas (100%): "lleno" — `>=100 && !>100`
- [🤖✅] Con 55 entradas (>100%): "sobreaforo" — `>100`
- [👤] Intentar registrar con sobreaforo: deja pasar (solo warn)

### 8.3 Aforo modo "confirmar"
- [ ] Con aforo lleno: diálogo "¿Registrar de todos modos?"
- [ ] Confirmar: registra
- [ ] Cancelar: no registra

### 8.4 Aforo modo "bloquear"
- [ ] Con aforo lleno: toast error "Aforo completo"
- [ ] NO registra
- [ ] Al dar salida a alguien, vuelve a permitir

### 8.5 Live update
- [ ] Abrir `/presencia` en otra pestaña
- [ ] Registrar alumno en primera pestaña
- [ ] Semáforo actualiza en `/scanner` y contador en `/presencia` (requiere refresh o signal)

---

## 9. HORARIOS DE OPERACIÓN

### 9.1 Desactivado
- [ ] Cualquier hora/día: permite registrar normalmente

### 9.2 Activo — modo "advertir"
Configurar lunes–viernes 07:00–22:00, sábado 08:00–14:00, domingo cerrado.

- [ ] Lunes 10:00: registra sin aviso
- [ ] Lunes 06:00 (antes de abrir): toast "fuera de horario, próxima apertura" pero registra
- [ ] Lunes 23:00: toast pero registra
- [ ] Sábado 10:00: registra
- [ ] Sábado 15:00: toast pero registra
- [ ] Domingo cualquier hora: toast pero registra

### 9.3 Activo — modo "bloquear"
- [ ] Fuera de horario: muestra error con próxima apertura, NO registra
- [ ] Dentro de horario: registra normalmente

---

## 10. MODO QUIOSCO (v3.9.0)

### 10.1 Activación
Sin PIN configurado, intentar activar: advertencia.

- [✅] Configurar PIN numérico (4 dígitos)
- [✅] Activar quiosco
- [✅] Sidebar desaparece
- [✅] Topbar desaparece
- [✅] Bottom nav desaparece
- [✅] Solo scanner visible
- [✅] Navegación directa a `/dashboard` por URL: redirige a `/scanner`
- [✅] `/novedades`, `/alumnos`, etc.: redirigen a `/scanner`
- [✅] `/seleccion-motivo` (dentro del flujo): permitido
- [✅] `/registro-alumno` (dentro del flujo): permitido

### 10.2 Desactivación
- [✅] Long-press 3s en scanner → diálogo PIN
- [✅] PIN incorrecto: rechaza, vibración o animación
- [✅] PIN correcto: desactiva quiosco, shell vuelve normal

### 10.3 Casos
- [✅] En quiosco + refresh: sigue en quiosco
- [✅] En quiosco + cerrar app + abrir: sigue en quiosco
- [✅] Durante long-press 3s, alumnos pueden intentar tocar: no deberían poder activar accidentalmente

---

## 11. DASHBOARD / RESUMEN (`/dashboard`)


Con preset "Histórico 12m" cargado.

- [✅] Carga < 3 segundos
- [✅] KPIs visibles: entradas hoy, alumnos únicos hoy, tiempo promedio, entradas esta semana
- [✅] Gráfica diaria (últimos 7 días)
- [✅] Top 5 alumnos
- [✅] Distribución por carrera
- [✅] Distribución por motivo
- [✅] Comparativa vs período anterior

### Vacíos
- [✅] Con 0 registros: muestra mensajes de "Sin datos" en cada widget
- [✅] Con solo 1 alumno: no rompe layout

---

## 12. ALUMNOS (`/alumnos`)

### 12.1 Listado
- [✅] Con 2554 alumnos: tiempo de carga < 2s
- [✅] Paginación funciona
- [✅] Scroll fluido
- [❌] Avatar/inicial del alumno visible
- [✅] Turno, carrera, grado visibles en cada fila

### 12.2 Búsqueda
- [✅] Buscar por nombre: filtra en vivo
- [✅] Buscar por matrícula: filtra
- [✅] Buscar por carrera: filtra
- [✅] Búsqueda vacía: muestra todos

### 12.3 Filtros
- [🤖✅] Filtro "Solo activos" — `alumnos.component.ts:145` (computed)
- [🤖✅] Filtro "Solo inactivos" — `alumnos.component.ts:146`
- [🤖✅] Filtro por carrera (dropdown) — `alumnos.component.ts:141`
- [🤖✅] Filtro por turno — `alumnos.component.ts:144`

### 12.4 Edición
- [✅] Click en alumno → `/detalle-alumno/:matricula`
- [✅] Editar nombre, apellidos, carrera, etc.
- [✅] Guardar → cambios persisten
- [✅] Editar matrícula: ¿permite? (debería alertar, es el keyPath)
- [✅] Desactivar alumno: `activo = false`
- [✅] Alumno desactivado: no aparece en búsqueda por defecto pero sí con filtro

### 12.5 Detalle de alumno
- [✅] Muestra historial de registros del alumno
- [✅] Últimas 10+ visitas ordenadas desc
- [✅] Promedio de duración
- [✅] Motivos más frecuentes
- [] Botón "Ver en `/registros`" con filtro pre-aplicado

### 12.6 Eliminar alumno
- [✅] Botón eliminar con confirmación danger
- [✅] Al eliminar: también elimina registros asociados? (Verificar comportamiento deseado)
- [✅] Toast éxito

---

## 13. REGISTROS (`/registros`)

### 13.1 Listado con volumen
- [✅] Con 90k registros: carga primera página < 3s
- [✅] Paginación (no carga todo de golpe)
- [✅] Ordenamiento por fechaHora DESC por defecto

### 13.2 Filtros
- [✅] Filtro "Hoy"
- [🤖❌] Filtro "Ayer" — **no implementado**. Rangos existentes: `hoy / semana / mes / todo / personalizado` (`registros.component.ts:31`). Fácil de agregar si lo quieres.
- [✅] Filtro "Esta semana"
- [✅] Filtro "Este mes"
- [✅] Filtro rango custom
- [✅] Filtro por carrera
- [✅] Filtro por motivo
- [✅] Filtro por matrícula específica
- [✅] Combinación de filtros
- [✅] Limpiar filtros

### 13.3 Edición manual
- [ ] Click en registro → modal/detalle
- [ ] Editar `fechaHora`
- [ ] Editar `horaSalida`
- [✅] Editar motivos (agregar/quitar)
- [✅] Guardar: se refleja

### 13.4 Eliminación
- [ ] Eliminar uno: confirmación + toast
- [ ] Eliminación masiva por rango: va en `/configuracion`

### 13.5 Indicadores visuales
- [✅] Registros con `cierreAutomatico`: marcador visual
- [✅] Registros con múltiples motivos: chips
- [✅] Registros sin horaSalida: "en curso"

---

## 14. PRESENCIA / EN BIBLIOTECA (`/presencia`)

Solo visible si `registroSalidaActivo = true`.

- [✅] Con 0 entradas abiertas: mensaje vacío
- [✅] Con entradas: lista ordenada por hora de entrada
- [✅] Cada tarjeta muestra: nombre, carrera, hora entrada, tiempo transcurrido
- [✅] Tiempo transcurrido actualiza cada minuto (o al refresh)
- [✅] Cerrar entrada desde aquí: botón "Registrar salida"
- [✅] Registros con `cierreAutomatico`: badge distintivo
- [✅] Botón "Confirmar cierre automático": quita el flag
- [✅] Contador total = aforo mostrado

---

## 15. INACTIVOS (`/inactivos`) — v3.10.0

### 15.1 Con umbral 7 días
- [🤖✅] Alumno que fue hoy: NO aparece — `inactivos.component.ts:77` filtra `diasSinVenir >= umbralDias`
- [🤖✅] Alumno hace 3 días con umbral 7: NO aparece
- [🤖✅] Alumno hace 10 días con umbral 7: aparece
- [🤖✅] Alumno que NUNCA fue: aparece con `diasSinVenir = Infinity` (`database.service.ts:1110`)
- [🤖✅] Ordenado por días desc: default `'dias-desc'` — Infinity > todos → "nunca" primero (`inactivos.component.ts:106`)

### 15.2 Con umbral 30 / 90 días
- [🤖✅] Cambiar umbral: `umbralDias` es signal, `inactivosBase` computed → recalcula automático

### 15.3 Acciones
- [🤖❌] Marcar como inactivo desde aquí — **no implementado** (acción de `desactivarAlumno` existe en el servicio pero el componente `/inactivos` no la expone)
- [🤖❌] Exportar lista a PDF/Excel — **no implementado** en `/inactivos` (sí existe en `/alumnos` y `/registros`)

---

## 16. ESTADÍSTICAS AVANZADAS (`/estadisticas`)

Con dataset histórico 30m.

### 16.1 KPIs
- [✅] Total registros del período
- [✅] Alumnos únicos del período
- [✅] Tiempo promedio por visita
- [✅] Días con más tráfico

### 16.2 Tendencias
- [ ] Línea mensual: visible y sin gaps artificiales donde debería haberlos (verano/vacaciones)
- [ ] Comparativa mes actual vs anterior
- [ ] Crecimiento/decrecimiento porcentual

### 16.3 Heatmap
- [ ] Heatmap día-de-la-semana × hora
- [ ] Domingos: columna vacía
- [ ] Horas 0–6 y 23: vacías
- [ ] Mayor intensidad en días entre semana horario medio

### 16.4 Top alumnos
- [ ] Top 10 por visitas en el período
- [ ] Enlace a detalle de cada uno

### 16.5 Insights automáticos
- [ ] Detecta tendencia creciente / decreciente
- [ ] Detecta días pico
- [ ] Detecta motivo más usado

### 16.6 Distribuciones
- [ ] Por carrera (pie o barras)
- [ ] Por motivo (incluyendo múltiples)
- [ ] Por turno
- [ ] Por grado

---

## 17. GESTIÓN DE MOTIVOS (`/gestion-motivos`)

- [🤖✅] 5 motivos default visibles — `crearMotivosDefault()` inserta en init si store vacío
- [🤖✅] Crear motivo nuevo — `abrirDialogNuevo()` + `MotivoFormDialogComponent`
- [🤖✅] Editar nombre — dialog de edición (`abrirDialogEditar`)
- [🤖✅] Editar icono (Material Icons) — campo en el form dialog
- [🤖✅] Editar color — campo en el form dialog (modelo `Motivo.color`)
- [🤖✅] Desactivar con confirmación — `cambiarEstado()` + `ConfirmDialogComponent` (`gestion-motivos.component.ts:118`). `obtenerMotivosActivos()` filtra `activo=true`
- [🤖✅] Reactivar — mismo método, toggle
- [🤖✅] Reordenar con botones subir/bajar — `subirPrioridad`/`bajarPrioridad` (línea 194+)
- [🤖✅] Campo `orden` se actualiza — swap entre motivo actual y vecino
- [🤖✅] Eliminar motivo: registros conservan `motivoNombre` — `eliminarMotivo` solo borra del store `motivos`, los `Registro` tienen `motivoNombre` (string) independiente. Dialog muestra cuántos registros lo usan (línea 156-165).

---

## 18. CONFIGURACIÓN (`/configuracion`)

### 18.1 General
- [✅] Cambiar `nombreInstitucion`: se refleja en topbar/reportes
- [✅] Cambiar `umbralDuplicadoMin`
- [✅] Activar/desactivar sonido
- [✅] Probar beeps

### 18.2 Registro de salida
- [✅] Activar `registroSalidaActivo`
- [✅] Aparece item "En biblioteca" en sidebar
- [✅] Desactivar: desaparece
- [✅] `horasAutoSalida` configurable (0 = off)

### 18.3 Aforo
- [✅] Capacidad (0 = off)
- [✅] Modo (permitir/confirmar/bloquear)

### 18.4 Horarios
- [ ] Activar horarios
- [ ] Configurar por día (0=domingo … 6=sábado)
- [ ] Cada día: activo + rangos (hora inicio/fin)
- [ ] Modo (advertir/bloquear)

### 18.5 Modo quiosco
- [✅] PIN numérico
- [✅] Probar activar/desactivar

### 18.6 Celebraciones (v3.9.0)
- [✅] Activar
- [✅] Probabilidad 0–1
- [✅] Después de registrar alumno: ocasionalmente confeti/animación

### 18.7 Limpieza de registros
- [ ] Contar registros por rango
- [ ] Eliminar por rango con confirmación danger

### 18.8 Backup
- [ ] Exportar JSON
- [ ] Verificar tamaño (con 90k registros puede ser 40–80 MB)
- [ ] Importar en navegador limpio (modo incógnito)
- [ ] Todo se restaura
- [ ] Importar con datos existentes: ¿duplica o mergea? (validar)

### 18.9 Flexibilidad
Por feedback "Flexibilidad del sistema" (memory): validar que TODOS los ajustes numéricos acepten valores libres, no solo presets.

- [🤖✅] `umbralDuplicadoMin`: setter sin clamp — acepta cualquier número (`config.service.ts:173`)
- [🤖✅] `aforoMaximo`: `Math.max(0, floor)` — mínimo 0, sin tope superior (`config.service.ts:183`)
- [🤖✅] `horasAutoSalida`: setter sin clamp — acepta cualquier número (`config.service.ts:156`)
- [🤖✅] `celebracionProbabilidad`: clamp 0–1 obligatorio (`config.service.ts:280`)
- [🤖✅] `umbralInactividadDias`: `Math.max(0, floor)` — mínimo 0, sin tope superior (`config.service.ts:293`)

---

## 19. IMPORTAR ALUMNOS (`/importar-alumnos`)

### 19.1 XLSX válido
- [🤖✅] Plantilla descargable — `descargarPlantilla()` genera xlsx con `XLSX.writeFile` (línea 1028)
- [👤] Subir xlsx con 100 alumnos (requiere archivo real)
- [🤖✅] Preview muestra correctamente — tabla `preview-table` con estado/errores por fila
- [👤] Confirmar: crea 100 alumnos (requiere archivo real)

### 19.2 Errores
- [🤖✅] Columnas faltantes: `detectarColumna()` retorna undefined → campo vacío → validarFila reporta error específico ("Matrícula vacía", etc.)
- [🤖✅] Matrículas duplicadas en xlsx: `validarFila` línea 902-907 (`duplicadoInterno`)
- [🤖✅] Matrículas ya existentes en BD: preload de `matriculasExistentes` + check en línea 912
- [🤖✅] Turno inválido ("Nocturno"): error (línea 898-900, `TURNOS.includes` check)
- [🤖⚠️] Carrera: solo valida que no esté vacía (no contra catálogo) — por diseño permite carreras de otras instituciones
- [🤖⚠️] Grado: validador permite 1-12 (checklist decía 1-10). No es bug, sistema más permisivo.

### 19.3 Archivo inválido
- [🤖✅] .pdf/.txt: `accept=".xlsx,.xls,.csv"` filtra picker; además si el user fuerza "All files", `XLSX.read` tira y el catch muestra toast "Error al leer el archivo" (línea 769)
- [🤖✅] Archivo vacío: `if (jsonData.length === 0)` → toast "El archivo está vacío" (línea 761)

---

## 20. EXPORTACIÓN (PDF / EXCEL)

### 20.1 Reporte diario
- [🤖✅] Botón exportar PDF en `/registros` — `ReportService.generarReporteAccesos` + `exportarRegistrosXLSX`
- [👤] PDF se descarga (requiere browser)
- [🤖✅] Contiene nombre institución + fecha + tabla — `report.service.ts` con `autoTable`
- [🤖✅] Excel equivalente — `export.service.ts:21-53`

### 20.2 Reporte mensual
- [👤] Desde estadísticas o configuración (visual)
- [🤖✅] Incluye KPIs + detalle — `ReportService` soporta `TipoReporte` configurable

### 20.3 Detalle de alumno
- [🤖✅] Constancia PDF individual — `report.service.ts:576-791` (`constancia_<matricula>.pdf`)
- [👤] PDF legible, Excel manipulable (visual)

### 20.4 Caracteres especiales
- [🤖✅] Excel: librería xlsx usa UTF-8 nativo — tildes/ñ funcionan sin escape
- [👤] PDF: jspdf default usa Helvetica; algunas ñ/tildes pueden necesitar fuente custom. **Verificar visualmente.**

---

## 21. NOVEDADES (`/novedades`)

- [🤖✅] Lista descendente — `historial = CHANGELOG` tal cual (el array se alimenta con más reciente primero por convención)
- [🤖✅] Versión actual al principio — `$first` en `@for` aplica badge "Versión actual"
- [🤖✅] Tipos con iconos — `iconoPorTipo()` mapea feat→auto_awesome, fix→bug_report, mejora→tune, cambio→swap_horiz
- [🤖✅] `destacado: true` distinto — clase `.destacado` + badge "Mayor" dorado
- [🤖✅] Badge en sidebar tras update — `ChangelogService.hayNovedades` computed compara `versionVista` vs `versionActual().version`
- [🤖✅] Click en `/novedades` → badge desaparece — `ngOnInit()` llama `marcarComoVista()`
- [🤖✅] Recargar sin badge — persiste en `localStorage['stenbrary-changelog-vista']`
- [🤖✅] Primera instalación NO muestra badge — `cargar()` marca versión actual como vista si localStorage vacío

---

## 22. NAVEGACIÓN (shell)

### 22.1 Desktop
- [ ] Sidebar colapsado 64px
- [ ] Expandido 220px
- [ ] Sección "Operación" con Scanner, Registrar Alumno, En Biblioteca (si aplica)
- [ ] Sección "Consulta" con 4 items
- [ ] Sección "Administración" con 3 items
- [ ] Topbar con versión visible
- [ ] Item activo resaltado

### 22.2 Móvil (<768px)
- [ ] Sidebar en drawer (overlay)
- [ ] Bottom nav visible
- [ ] Bottom nav tiene Scanner + 3–4 más
- [ ] "Registros" se swapea por "Biblioteca" si `registroSalidaActivo`
- [ ] Navegar: sidebar se auto-cierra

### 22.3 Deep links
- [🤖✅] `/alumnos` por URL: lazy loadComponent (`app.routes.ts:47-51`)
- [🤖✅] `/detalle-alumno/2299990001` por URL: ruta registrada con `:matricula` (`app.routes.ts:101`)
- [🤖✅] `/registro-alumno` sin sessionStorage: muestra form vacío (`matriculaBloqueada=false`, log "acceso directo", `registro-alumno.component.ts:82-86`)

---

## 23. OFFLINE / PWA

### 23.1 Instalación PWA
- [✅] Instalar via Chrome desktop
- [ ] Instalar via Android
- [✅] Icono y nombre correctos

### 23.2 Offline
- [✅] Cargar la app una vez online
- [✅] Desconectar internet (DevTools: Offline)
- [✅] Recargar: sigue funcionando
- [✅] Navegar a `/dashboard`, `/alumnos`: carga
- [✅] Registrar alumno nuevo offline: persiste en IndexedDB
- [✅] Reconectar: datos siguen ahí
- [✅] Service worker sirve assets del cache

### 23.3 Updates
- [✅] Cambiar versión (bump package.json)
- [✅] Build y deploy
- [✅] Abrir app instalada: toast "actualización disponible"
- [✅] Recargar: versión nueva

---

## 24. PERFORMANCE CON VOLUMEN

Ejecutar con Histórico 30m cargado (≈90k registros, 2500 alumnos).

### 24.1 Tiempos de carga
- [✅] `/scanner`: < 1s
- [✅] `/dashboard`: < 3s
- [✅] `/alumnos`: < 2s (primera página)
- [✅] `/registros`: < 3s (primera página)
- [✅] `/estadisticas`: < 5s
- [✅] `/inactivos`: < 3s

### 24.2 Memoria
- [ ] DevTools Memory: heap snapshot < 150 MB en uso normal
- [ ] Navegar 10 veces entre rutas: no crece indefinido (leaks)

### 24.3 Scroll y búsqueda
- [✅] Listado de 2500 alumnos: scroll 60fps
- [✅] Listado de 90k registros con virtualización: scroll fluido
- [✅] Búsqueda con 2554 alumnos: respuesta < 200ms

### 24.4 Operaciones masivas
- [ ] Generar 30m: no se congela la UI durante la operación
- [ ] Limpiar 30m: no se congela
- [ ] Exportar backup: completa sin crashear
- [ ] Importar backup: completa sin crashear

---

## 25. EDGE CASES

### 25.1 Datos extremos
- [ ] Alumno con nombre de 200 caracteres: UI no rompe
- [ ] Matrícula con ceros al inicio `0000001`: maneja correctamente
- [ ] Registro con `duracionMinutos > 900` (15h): visualiza sin bug

### 25.2 Tiempo
- [ ] Cambiar fecha del sistema hacia adelante: registros "de ayer" siguen visibles
- [ ] Cambiar fecha hacia atrás: no duplica entradas "de hoy"
- [ ] Cruce de medianoche durante uso: transiciones limpias

### 25.3 Concurrencia
- [ ] Dos pestañas abiertas, registrar en ambas: ambos registros persisten
- [ ] Dos pestañas modificando el mismo alumno: último gana (no lock)
- [ ] Abrir y cerrar app muchas veces: inicialización consistente

### 25.4 IndexedDB
- [ ] Cuota llena (difícil de simular): mensaje claro
- [ ] BD corrupta: app debería manejar graceful, no quedar en loading infinito
- [ ] Migración de versión: preparado para v2 sin perder datos

### 25.5 Invitados
- [👤] Invitado sin nombre: rechaza — `InvitadoNombreDialogComponent` (requiere UI)
- [🤖✅] 10 invitados distintos — `id: 'invitado-' + Date.now()` (`scanner.component.ts:1662`); matrícula siempre `'INVITADO'`
- [🤖✅] NO aparece en `/inactivos` — `obtenerAlumnosInactivos()` lee store `alumnos`; los invitados son sintéticos y NO se persisten en ese store (solo en `registros`)
- [🤖✅] NO aparece en `/alumnos` — mismo motivo; store `alumnos` jamás los recibe

---

## 26. ACCESIBILIDAD Y UX

- [✅] Navegación por teclado funciona en scanner
- [✅] Todos los botones tienen focus visible
- [✅] Contraste de texto (Lighthouse A11y > 90)
- [ ] Tamaño touch ≥44px en bottom nav
- [ ] Toasts no bloquean contenido crítico
- [ ] Diálogos con backdrop cerrable
- [ ] Escape cierra diálogos
- [ ] Enter envía formularios

---

## 27. INSTALACIÓN EN UNIVERSIDAD (escenario real)

Antes de instalar en la UAT, validar end-to-end con datos reales de muestra.

- [ ] Borrar datos de prueba (dejar BD limpia)
- [ ] Importar alumnos reales vía xlsx
- [ ] Configurar nombre institución "Biblioteca UAT"
- [ ] Configurar horarios reales
- [ ] Configurar aforo real
- [ ] Generar matrículas de prueba (5–10) y probar flujo completo
- [ ] Exportar backup inicial
- [ ] Exportar plantilla xlsx de alumnos
- [ ] Verificar que PDF de reporte tiene nombre institución
- [ ] Verificar PWA instala en el equipo de biblioteca
- [ ] Prueba de lector USB real con matrículas reales
- [ ] Prueba de cámara real con luz de biblioteca
- [ ] Modo quiosco activado con PIN dado solo al coordinador

---

## Observaciones / Incidencias

> Anota aquí cualquier `❌` o `⚠️` con pasos para reproducir.

| # | Área | Síntoma | Pasos reproducción | Prioridad | Estado |
|---|------|---------|--------------------|-----------|--------|
|   |      |         |                    |           |        |
