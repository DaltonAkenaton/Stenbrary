# CLAUDE.md

## Role
Senior Angular engineer. PWA, offline-first, performance-focused.

## Behavior
- Responder siempre en español.
- Ser conciso. Preferir acción sobre explicación.
- Solo devolver código o cambios necesarios.
- No reescribir archivos completos a menos que sea necesario.
- No modificar código no relacionado.
- Si el usuario pide análisis, opinión o evaluación: dar insights estructurados con tradeoffs.

## Principio transversal: flexibilidad

El sistema debe ser **moldeable**. Toda configuración visible al coordinador debe ser **editable sin límites arbitrarios**: los presets son atajos, no restricciones. Al diseñar cualquier ajuste numérico (umbrales, porcentajes, tiempos, capacidades), además de ofrecer valores recomendados, siempre incluir un input libre con su rango natural (p. ej. 0–100 para porcentajes, 0+ para capacidades, etc.). El coordinador manda sobre los defaults.

## Visión del producto y fases

Stenbrary va más allá de la versión actual. El plan completo está en `docs/ROADMAP.md` (fuente única de verdad del largo plazo). Aquí el resumen para tener contexto al tomar decisiones:

- **Fase 1 — PWA offline-first (cerrando, v3.x → v4.0).** Sistema actual: scanner, registros, motivos, aforo, horarios, quiosco, estadísticas, todo en IndexedDB. Última milla antes de cerrar Fase 1: rediseño de `/configuración` (sidebar + panel) y **command palette Ctrl+K** (navegación + toggles de settings + acciones).
- **Fase 2 — Backend + auth + sync (post-v4.0).** Migrar a un modelo cliente-servidor manteniendo offline-first. Stack elegido: **Supabase** (Postgres + Auth + Storage + Realtime). 4 roles: super-admin, coordinador, asistente, alumno. Sync **supervisado por el coordinador** (no automático ciego — debe poder descartar registros basura antes de subir). Sub-fases 2.0 a 2.5 detalladas en `ROADMAP.md`.
- **Fase 3 — Pulir el producto.** Post-Fase 2: hardening, performance con volumen real, accesibilidad, UX refinada, documentación para usuario final, capacitación.
- **Fase 4 — Módulo de préstamos.** Largo plazo. Requiere investigación con el coordinador antes de diseñar (catálogo de libros, reservas, devoluciones, multas, integración con el sistema bibliotecario existente si lo hay).
- **Fase 5 — Comercialización.** Distribuir a otras universidades. Bloqueada hasta que esté: multi-tenant real (preparación en Fase 2.5), calendario escolar configurable (`docs/ESTADO.md` §2.2), catálogos editables (§2.3.1), branding por institución, plan de capacitación, modelo de licenciamiento.

**Cómo usar esta visión al implementar:** cualquier decisión técnica de Fase 1 debe respetar las decisiones tomadas para Fase 2. Ejemplos prácticos:
- No introducir patrones que dificulten agregar `organization_id` a los modelos.
- Cualquier nuevo `Service` que muta datos debe quedar listo para que un futuro `SyncService` lo intercepte (idempotencia, IDs estables).
- Evitar lógica de permisos hardcoded — preparar el terreno para que un `roleGuard` la reemplace en Fase 2.3.

Si una decisión actual entra en conflicto con la visión, **plantearla explícitamente al usuario**, no asumir cambio silencioso.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Desarrollo con hot reload
npx ng serve

# Build de producción
npx ng build --configuration production

# Lint (@angular-eslint). Debe salir con 0 ERRORES; los avisos son deuda
# contada — ver la cabecera de eslint.config.js.
npx ng lint

# Solo errores, sin el ruido de los avisos. Es lo que corre el pre-commit.
npx eslint . --quiet

# Arreglar lo auto-arreglable
npx ng lint --fix

# Generar componente standalone
npx ng generate component features/nombre --standalone --style=scss
```

```bash
# Tests unitarios (headless)
npx ng test --watch=false --browsers=ChromeHeadlessCI

# Type-check sin build
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.spec.json

# Guardrail de versión (package.json ↔ CHANGELOG)
node scripts/check-version.mjs

# E2E (Playwright). Levanta el dev server solo, pero fuera de CI REUTILIZA el
# que ya esté en el 4200 (`reuseExistingServer`). Si hay uno colgado con un
# error de compilación, los tests fallan por un overlay de Vite que intercepta
# los clics y el mensaje no dice nada del error real: mata el 4200 y repite.
npx playwright test

# Un solo test E2E, por nombre
npx playwright test --grep "recorrido guiado"
```

Suite activa: **279 specs unitarios en verde**, en 14 archivos —
`matricula.utils`, `horarios.utils`, `insignias.utils`, `integridad.utils`,
`invariante.utils`, `descarga.utils`, `tiempo.utils`, `estadisticas.utils`,
`calendario.utils`, `quiosco.utils`, `database.service`,
`backup.service`, `estadisticas-avanzadas.service`, `supabase.client`.
CI corre los unitarios con `TZ=America/Matamoros` (la zona de Nuevo Laredo,
que **conserva el horario de verano**) y Playwright con `timezoneId` igual:
los errores de fecha "un día antes" no existen en UTC, y los de días de 23/25 h
tampoco en Ciudad de México. Para desplazar fechas por días, `desplazarDias` /
`diasCalendarioEntre`, nunca restar `N × 86 400 000` ms.

**Fechas de calendario:** nunca `new Date('YYYY-MM-DD')` (es medianoche UTC:
en México, el día anterior) ni `toISOString().split('T')[0]` (después de las
18:00 da mañana). Usar `parseFechaLocal` / `fechaLocalISO` de
`core/utils/tiempo.utils.ts`. Ver `docs/AUDITORIA-2026-10.md`.

**34 tests E2E** con
Playwright (18 en `smoke.spec.ts`, 8 en `responsive.spec.ts`, 8 en `cuadre.spec.ts` — este
restaura `e2e/fixtures/cuadre.json` y compara cada pantalla contra valores calculados a mano;
si cambias una definición de métrica, actualiza el fixture y los comentarios del spec). CI GitHub Actions
(`.github/workflows/ci.yml`). Husky v9 pre-commit (guardrail de versión +
type-check app/spec).

Al cerrar una tanda, la verificación completa es: lint → type-check → tests
unitarios → E2E → build de producción.

**Linter (`eslint.config.js`).** Añadido en septiembre de 2026; antes `ng lint`
estaba documentado pero no existía. Dos niveles con significados distintos:

- **`error` bloquea** — código muerto, y las convenciones que este archivo ya
  exigía por escrito: `no-alert` (nada de `confirm()` nativo) y
  `prefer-control-flow` (`@if`/`@for`, nunca `*ngIf`/`*ngFor`). Ambas estaban
  en verde al instalarlo, así que ahora quedan blindadas.
- **`warn` no bloquea, pero cuenta** — 84 `no-explicit-any` y 41 avisos de
  accesibilidad. Es deuda reconocida con fecha, no ruido: los `any` se
  arreglan al tocar cada archivo, y la accesibilidad es Fase 3 del ROADMAP.

Un `catch` vacío solo pasa el lint si lleva un comentario dentro diciendo por
qué se ignora el fallo. Es intencionado: la regla obliga a justificarlo.

El pre-commit corre `eslint . --quiet` (solo errores) para no acostumbrar a
ignorar la salida; CI corre el lint completo, con avisos.

## Arquitectura

**Stenbrary** es una PWA Angular 18 offline-first para control de acceso a biblioteca (UAT). Toda la persistencia ocurre en IndexedDB (sin backend); el Service Worker (`@angular/service-worker`) permite operación sin internet. Versión actual: la de `package.json` (no se repite aquí porque se desactualiza; la versión mostrada en UI viene del primer elemento de `CHANGELOG` en `src/app/core/data/changelog.data.ts`).

### Documentación del proyecto (capas)

- **`src/app/core/data/changelog.data.ts`** — novedades visibles al usuario final. Alimenta el badge "Novedades" y la vista `/novedades`.
- **`DEVLOG.md`** — crónica técnica del desarrollo (por tanda de trabajo). Qué se hizo / descubrió / decidió / sigue. Se actualiza al cerrar cada tanda.
- **`docs/PRUEBAS-MANUALES.md`** — checklist exhaustivo (300+ items, 27 áreas) para pruebas manuales. Se marca antes de cada release.
- **`docs/ESTADO.md`** — snapshot de features implementadas + pendientes con prioridad. Fuente para planear roadmap.
- **`docs/adr/`** — Architecture Decision Records (futuro, por ahora vacío).

### Proceso de novedades (release workflow)

Cada mejora visible para el usuario debe quedar documentada en `src/app/core/data/changelog.data.ts`. El `ChangelogService` compara la versión actual con `stenbrary-changelog-vista` (localStorage) y muestra el badge "Novedades" en el sidebar hasta que el usuario visita `/novedades`.

Para liberar una versión nueva:
1. Insertar la entrada **al inicio** del array `CHANGELOG` en `changelog.data.ts` (el primer elemento es siempre la más reciente).
2. Actualizar `version` en `package.json` — debe coincidir con `version` del primer entry del CHANGELOG.
3. Fecha en formato `YYYY-MM-DD`. Tipos de cambio: `feat | fix | mejora | cambio`.
4. Escribir los textos en lenguaje claro para usuarios finales (no jerga técnica).
5. Marcar `destacado: true` solo en releases mayores que merezcan un highlight.

**Política de versionado (desde v3.47.0, decisión 2026-10-12).** Hasta aquí se
subió una versión por cada tanda (20 el 31-ago-2026) y quedaron huecos (no hay
3.23.1 ni 3.28.0–3.28.2). El historial no se renumera; de aquí en adelante:
- **Una versión por cada publicación**, no por tanda: si una tanda no se
  publica, su cambio se acumula en la siguiente entrada.
- Números consecutivos: `menor` para funciones o cambios visibles, `parche` solo
  para correcciones.
- **v4.0.0 = la entrega a la UAT** (cierre de Fase 1 en el ROADMAP).
- Cada versión publicada lleva su `git tag vX.Y.Z` (hasta v3.46.0 no hay ninguna).

### Rutas (`src/app/app.routes.ts`)

Todas las rutas usan `loadComponent()` (lazy). Redirige `''` → `/scanner`, wildcard también a `/scanner`.

| Ruta | Componente | Notas |
|---|---|---|
| `/scanner` | `ScannerComponent` | Punto de entrada |
| `/registro-alumno` | `RegistroAlumnoComponent` | Lee `sessionStorage.matriculaTemp` |
| `/seleccion-motivo` | `SeleccionMotivoComponent` | Protegida por `registroFlujoGuard` |
| `/dashboard` | `DashboardComponent` | Resumen del día |
| `/alumnos` | `AlumnosComponent` | Listado + edición |
| `/registros` | `RegistrosComponent` | Historial global |
| `/estadisticas` | `DashboardEjecutivoComponent` | Analítica avanzada |
| `/gestion-motivos` | `GestionMotivosComponent` | CRUD de motivos |
| `/configuracion` | `ConfiguracionComponent` | Incluye `limpieza-registros.component` y `datos-prueba.component` |
| `/importar-alumnos` | `ImportarAlumnosComponent` | Bulk import (xlsx) |
| `/presencia` | `PresenciaComponent` | Solo visible si `registroSalidaActivo` |
| `/novedades` | `NovedadesComponent` | Muestra CHANGELOG |
| `/inactivos` | `InactivosComponent` | Alumnos sin venir ≥ `umbralInactividadDias` (v3.10.0) |
| `/detalle-alumno/:matricula` | `DetalleAlumnoComponent` | Param es **matrícula**, no id |

### Flujo de operación principal

```
/scanner → detecta matrícula (cámara o manual)
        → busca alumno en IndexedDB por índice by-matricula
        → si existe y activo:
              ├─ si registroSalidaActivo: busca entrada abierta del día
              │                           (obtenerEntradaAbiertaHoy)
              └─ si no:                    busca registro en ventana
                                           umbralDuplicadoMin (default 30)
             └→ si hay registro previo: dialog Salida / Nuevo / Cancelar
                   ├─ salida: registrarSalida() calcula duracionMinutos
                   └─ nuevo: si salida activa, cierra la anterior primero
             └→ antes de entrar: verificarAforo() (modos permitir/confirmar/bloquear)
             └→ sessionStorage.alumnoActual = alumno → /seleccion-motivo
        → si no existe: sessionStorage.matriculaTemp → /registro-alumno
        → acceso invitado: matricula='INVITADO', pasa directo a /seleccion-motivo

/seleccion-motivo → guard verifica sessionStorage.alumnoActual
                  → crea Registro (con motivoIds[] múltiples) → regresa a /scanner
```

### Estado entre rutas

El "estado de sesión" entre scanner y selección de motivo se pasa exclusivamente por `sessionStorage`:
- `alumnoActual`: JSON del objeto `Alumno` — consumido por `SeleccionMotivoComponent` (y por invitados, con `id` sintético `invitado-<timestamp>` y `matricula='INVITADO'`)
- `matriculaTemp`: matrícula cruda — consumido por `RegistroAlumnoComponent`

`registroFlujoGuard` valida que `alumnoActual` sea JSON parseable; si está corrupto lo limpia y redirige a `/scanner` con toast de advertencia.

### Base de datos (IndexedDB via `idb`)

`DatabaseService` (`core/services/database.service.ts`) es el único punto de acceso. `DB_NAME = 'stenbrary-db'`, `DB_VERSION = 2` (v2, Fase 2.2: índice `by-sync-status` en los tres stores). Tres stores:

- `alumnos` (keyPath `id`) — índices: `by-matricula` (unique), `by-carrera`
- `registros` (keyPath `id`) — índices: `by-fecha` (fechaHora), `by-alumno` (alumnoId), `by-matricula`
- `motivos` (keyPath `id`) — índice: `by-orden`

Cambiar el esquema requiere incrementar `DB_VERSION` y ampliar el `upgrade()` en `openDB`. Al inicializar sin datos, `crearMotivosDefault()` inserta 5 motivos: Estudiar, Pedir libro, Trabajo escolar, Investigación, Otro.

**Patrón de queries sobre fechas:** los métodos como `obtenerRegistrosDeHoy` y `obtenerRegistrosPorFecha` intentan primero `getAllFromIndex('by-fecha', IDBKeyRange.bound(...))` y caen en fallback a `getAll() + filter` si el índice no devuelve resultados. Esto es intencional: IndexedDB no encuentra registros antiguos donde `fechaHora` quedó serializado como string ISO. No "simplificar" quitando el fallback sin antes migrar datos.

Métodos clave adicionales:
- `verificarRegistroReciente(matricula, minutosUmbral=30)` — devuelve el último registro dentro de la ventana (para detectar duplicado en el scanner)
- `obtenerEntradaAbiertaHoy(matricula)` — registro del día sin `horaSalida` (cuando `registroSalidaActivo` está ON)
- `obtenerRegistrosAbiertoHoy()` — para la vista `/presencia`, incluye entradas sin salida **y** cerradas por `cierreAutomatico` pendientes de confirmación
- `cerrarEntradasAntiguas(horasUmbral)` — cierre automático (marca `cierreAutomatico=true`)
- `confirmarCierreAutomatico(id)` — limpia el flag tras revisión del personal
- `registrarSalida(id)` — calcula `horaSalida` y `duracionMinutos`
- `eliminarRegistrosPorRango(inicio, fin)` + `contarRegistrosPorRango` — para limpieza masiva

### Modelos (`core/models/`)

- `Alumno`: campos fijos (matricula, nombre, apellidos, carrera, grado, grupo, turno) + opcionales (`email`, `telefono`, `notas`) + `datosExtra: Record<string, string>` para campos personalizados de la coordinadora.
- `Registro`: `motivoId`/`motivoNombre` (principal, retrocompat) **y** `motivoIds?`/`motivoNombres?` (múltiples, v3.7.0+). También `horaSalida?`, `duracionMinutos?`, `cierreAutomatico?` (pendiente de revisar; confirmar lo borra) y `salidaEstimada?` (v3.42.0: la salida la puso el sistema; **permanente**, su duración no cuenta en promedios ni constancias). No romper la retrocompatibilidad.

**Métricas: una sola definición.** Todo número que aparezca en más de una pantalla (inactivos, motivos, estancia, promedio por día, día más concurrido, proyección) se calcula en `core/utils/estadisticas.utils.ts`, con `ahora` como parámetro. No reimplementarlo en un componente: así fue como "alumnos inactivos" llegó a dar dos cifras distintas. Las definiciones (P1–P8) están en `docs/AUDITORIA-2026-10.md` y, en lenguaje de usuario, en `docs/NOTAS-MANUAL.md`.
- `Motivo`: `nombre`, `icono` (Material Icons), `orden`, `activo`, `color?`.

### Servicios (`core/services/`)

Todos `providedIn: 'root'`. El barrel export en `index.ts` solo re-exporta los principales; algunos (`ConfigService`, `AforoService`, `SoundService`, `ChangelogService`, `PwaUpdateService`) se importan por ruta.

- `DatabaseService` — ver sección anterior.
- `ConfigService` — persiste en `localStorage` bajo `stenbrary-config`. Claves: `registroSalidaActivo`, `horasAutoSalida` (0 = off), `nombreInstitucion`, `umbralDuplicadoMin` (default 30), `aforoMaximo` (0 = off), `aforoModo` (`'permitir' | 'confirmar' | 'bloquear'`), `modoQuiosco` + `quioscoPin` (v3.9.0) + `quioscoAutoMinutos` (v3.49.0: minutos sin uso para reactivar el quiosco solo, 0 = off; lo vigila `QuioscoAutoService`), `horarioActivo` + `horarios` (por día, 0=domingo … 6=sábado) + `horarioModo` (`'advertir' | 'bloquear'`, v3.9.0), `celebracionActiva` + `celebracionProbabilidad` (0–1, v3.9.0), `mostrarBotonCamara` (v3.45.0, default true: el lector físico es el camino principal y la cámara un respaldo ocultable), `calendarioEscolar` (periodos + días inhábiles, v3.43.0; funciones puras en `core/utils/calendario.utils.ts`, precarga UAT 2026, signal `calendarioSignal`). Getter derivado: `aforoActivo = aforoMaximo > 0 && registroSalidaActivo`. Signals: `hayAutoClose` (cierres pendientes) y `modoQuioscoSignal` (reactivo para `AppComponent`).
- `AforoService` — usa `signal`/`computed` sobre la ocupación actual. Estados: `inactivo`, `libre` (<50%), `normal` (50–79%), `alto` (80–99%), `lleno` (100%), `sobreaforo` (>100%). `refrescar()` relee de la BD; `setOcupacion()` para evitar doble lectura cuando ya tenemos el conteo (p.ej. en `/presencia`).
- `ChangelogService` — compara `versionActual().version` con `stenbrary-changelog-vista` (localStorage). Signal `hayNovedades` alimenta el badge del sidebar. En primera instalación NO muestra badge (marca la versión como vista).
- `SoundService` — beeps vía Web Audio API (sin archivos). Flag en `stenbrary-sonido-activo`. Métodos: `beepScan`, `beepSalida`, `beepError`.
- `ToastService`, `LoadingService` — UI transversal (componentes en `shared/`).
- `BackupService` — export/import JSON completo. Los motivos se emparejan **por nombre** con los locales y los `motivoIds` de los registros se traducen a los ids locales (`remapearMotivos`, v3.50.0): cada instalación crea sus motivos default con ids propios, y sin el mapa un respaldo de otro equipo dejaba registros apuntando a motivos inexistentes (estadísticas partidas, editor roto). En modo `replace` se restaura el catálogo del respaldo con sus ids. Combinar el mismo respaldo dos veces no duplica nada (`put` por id).
- `ExportService`, `ReportService` — PDF (`jspdf`/`jspdf-autotable`) y Excel (`xlsx`).
- `EstadisticasAvanzadasService` — tendencias, heatmap, top alumnos, insights, distribución por motivo/carrera.
- `PwaUpdateService` — `AppComponent.ngOnInit` llama `iniciar()`: revisión por **reloj** (`timer`, 60 s y luego cada 15 min), nunca por `appRef.isStable` (con intervalos vivos la app no se estabiliza y la revisión no arrancaba; v3.46.0). El aviso lo pinta `AppComponent` con `SwUpdate.versionUpdates`. `stenbrary-sw-revision-ms` en localStorage acorta el intervalo solo para pruebas.
  **Ojo al probar el SW con Playwright:** el Chrome que lanza Playwright (`channel: 'chrome'` o su Chromium con perfil persistente) arranca el SW de Angular en `SAFE_MODE` ("Entry already exists"); el Chrome real del usuario y Edge no. Para pruebas de SW/offline usar `channel: 'msedge'`.
- `ErrorReporterService` — cola offline en localStorage, drena en evento `online`. Endpoint configurable por environment. Cero costo de bundle si no se configura. Wired al `GlobalErrorHandler`.
- `GlobalErrorHandler` — provider en `app.config.ts`.
- `DatosPruebaService` — generador de alumnos/registros sintéticos con modelo UAT (3 períodos, vacaciones, festivos, Semana Santa, horario 7–22, turnos 66/22/12). Matrícula `9000001+` + `dispositivo: 'SEED-TEST'` como marcadores para limpieza selectiva. **Calendario hardcoded** — cuando se venda a otra universidad, abstraer a `CalendarioEscolarService` configurable desde UI (pendiente en `docs/ESTADO.md`).

### Auth y nube (`core/auth/`, Fase 2)

La app arranca **siempre** en modo solo-local y solo habla con Supabase si se
cumplen **dos** condiciones independientes (`supabase.client.ts`):

1. `hayCredencialesNube()` — el build trae `environment.supabase.{url,anonKey}`.
   Lo decide quien compila.
2. `isNubeActiva()` — esta instalación encendió la nube. Lo decide el
   coordinador desde `/configuracion` → Avanzado → "Conexión con la nube".
   Clave propia `stenbrary-nube-activa` en localStorage, default `false`.

`isSupabaseConfigured()` es la conjunción de ambas, y de ella cuelga todo:
`getSupabaseClient()` devuelve `null`, `AuthService` queda en `'local-only'`,
`roleGuard` y `authGuard` dejan pasar todo, y `ConnectivityService` no sondea.

**No colapsar esas dos condiciones en una.** Con una sola, publicar un build
con credenciales haría que `roleGuard` exigiera sesión en toda la
administración de todas las instalaciones a la vez, el día del deploy — y la
sesión llega por magic link, que necesita Internet. La justificación larga está
en la cabecera de `supabase.client.ts` y en `docs/ROADMAP.md` §Fase 2.

Cambiar el interruptor **exige recargar la página** (`window.location.href`, no
`router.navigate`): el cliente se cachea y `AuthService` fija su estado inicial
una sola vez.

`/login` tiene una salida de emergencia al modo solo-local. Es obligatoria, no
decorativa: el interruptor de apagado vive dentro de Configuración, que es lo
que deja de abrirse si el login falla. **Cualquier feature que pueda dejar al
coordinador fuera de su propio sistema necesita su ruta de vuelta.**

Rutas protegidas por `roleGuard`: `/estadisticas`, `/gestion-motivos`,
`/configuracion`, `/importar-alumnos`, `/sincronizacion`, `/descarga`,
`/inactivos`, `/usuarios`. La matriz de permisos es declarativa y pura en
`core/auth/permissions.ts`; la capa reactiva es `permissions.service.ts`.
`/diagnostico` **no** lleva guard a propósito.

Para desplegar la nube en producción: `docs/DESPLIEGUE-NUBE.md`.

**Mientras el sistema se use en modo local** (decisión 2026-10-06: sin autorización de la UAT no se suben datos de alumnos a la nube), `environment.mostrarConexionNube = false` oculta la sección de Configuración → Avanzado; se muestra igual si una instalación ya tiene la nube encendida, para poder apagarla.

### Scanner (dual-mode, `features/scanner/scanner.component.ts`)

El componente detecta en `ngOnInit` si `BarcodeDetector` nativo está disponible:
- **Nativo** (`usandoNativo = true`): llama `detect(video)` directamente. Si falla, re-intenta sobre canvas preprocesado con sharpen y con binarización Otsu.
- **ZXing fallback** (`usandoNativo = false`): `BrowserMultiFormatReader` con hints restringidos a `CODE_128 + CODE_39` y `TRY_HARDER`. Dibuja frames en `<canvas>` con filtros CSS y llama `decodeFromCanvas()`.

El loop usa `requestAnimationFrame` con throttle (`SCAN_INTERVAL_MS = 160`). Las estrategias de preprocesado están en `PREPROCESS_STRATEGIES` + `LOWRES_EXTRA_STRATEGIES` (tope del archivo) — cada estrategia tiene `filter` (CSS), `scale` (upscaling 1×–3×) y `label` (para logs + priorización adaptativa).

> Aquí había documentado un `SCAN_INTERVAL_LOWRES_MS = 120` para un throttle
> distinto en cámaras de baja resolución. El linter demostró que la constante
> no se usaba en ninguna parte: quedó huérfana en v3.9.1, cuando el pipeline
> agresivo pasó a estar siempre activo y dejó de haber una rama "lowres". Se
> eliminó. Lo mismo con un `DUPLICADO_UMBRAL_MIN = 30` del scanner, que era
> una segunda fuente de verdad muerta — el umbral real sale de
> `ConfigService.umbralDuplicadoMin`.

**v3.9.1 cambio clave:** el pipeline agresivo está SIEMPRE activo (ya no gateado por resolución) porque las webcams de laptop reportan 1280×720 pero tienen foco fijo que produce imágenes borrosas. `sharpenCanvas()` (unsharp mask) siempre ON.

Pipeline completo (además de estrategias de filtros):
- Upscaling 2×–3× en ROI central
- Binarización Otsu (threshold óptimo del histograma)
- Corrección de rotación (`ROTATION_ANGLES = [0, -3, 3, -5, 5]`)
- Scanlines horizontales (franjas a 40/50/60%)
- Detección de barcode invertido (colores negados)
- Zoom hardware (si la cámara lo soporta) o software (crop+scale del video)
- Linterna vía `MediaStreamTrack.applyConstraints({ advanced: [{ torch }] })`
- `optimizarExposicionCamara()`: focusMode/exposureMode/whiteBalanceMode `continuous`, `exposureCompensation: -0.5 EV`
- Priorización adaptativa: `strategySuccessHistory` (últimos 8) promueve la estrategia con ≥50% de éxitos
- `enCooldown` tras detección exitosa + `ultimoQrEscaneado` para evitar double-scan

Después de detectar, el scanner abre `ConfirmacionMatriculaDialogComponent` antes de procesar; el invitado pasa por `InvitadoNombreDialogComponent`; el duplicado por `RegistroDuplicadoDialogComponent`.

### Validación de matrícula (`core/utils/matricula.utils.ts`)

- `esMatriculaValidaScanner(texto)` — solo dígitos, `>= MATRICULA_CONFIG.minDigitos` (7). Usado por el scanner.
- `validarMatricula(texto)` — acepta prefijo `a/A` opcional, longitud entre 7 y 12, maneja el caso especial `'INVITADO'`. Retorna `ValidacionMatricula { valida, matriculaLimpia, prefijo, error }`.
- `normalizarMatricula(texto)` — elimina el prefijo: `"a2299990001"` → `"2299990001"`.
- Ajustar `MATRICULA_CONFIG` (`minDigitos`, `maxDigitos`, `prefijosValidos`, `permitirSinPrefijo`, `matriculaInvitado`) si cambia el formato — las funciones se adaptan automáticamente.

### Catálogos fijos (`core/constants/catalogos.constants.ts`)

`CARRERAS` (8 opciones, UAT), `TURNOS` (`Matutino | Vespertino | Mixto`), `GRADOS` (1–10), `GRUPOS` (A–F). Editar aquí para que todos los dropdowns se actualicen.

### Design system

Variables en `src/styles/_variables.scss`, mixins en `src/styles/_mixins.scss`. Paleta: navy (`$navy-950` a `$navy-500`) + acento cyan (`$cyan-500 = #00C8D7`) + teal complementario. Semáforo: `$success-color #0EB07B`, `$warn-color #F05252`, `$amber-color #F5A623`. Tipografías: `$font-display` Space Grotesk, `$font-body` DM Sans, `$font-mono` Space Mono (para matrículas/fechas). Breakpoints relevantes: `$breakpoint-xs: 576px`, `$breakpoint-sm: 768px` (el sidebar se convierte en drawer debajo de `$breakpoint-sm`).

### Navegación shell (`AppComponent`)

Sidebar (64px colapsado / 220px expandido) + topbar + bottom nav (≤768px). Secciones computadas en `navSections`:
- **Operación**: Scanner, Registrar Alumno, En Biblioteca (condicional a `registroSalidaActivo`)
- **Consulta**: Resumen, Alumnos, Registros, Estadísticas
- **Administración**: Gestión de Motivos, Novedades, Configuración

`bottomNavItems` swapea "Registros" por "Biblioteca" cuando el módulo de salida está activo. El sidebar se auto-cierra en móvil al navegar (suscripción a `NavigationEnd`, `window.innerWidth < 768`).

En **modo quiosco** (`configService.modoQuioscoSignal()`): el shell aplica la clase `kiosk-mode` que oculta sidebar, topbar y bottom nav; además `AppComponent` intercepta `NavigationEnd` y redirige a `/scanner` cualquier ruta que no sea parte del flujo operativo (`/scanner`, `/seleccion-motivo`, `/registro-alumno`). Se sale con pulsación larga (3 s) en el scanner + PIN configurado en `ConfigService`.

### Horarios de operación (`core/utils/horarios.utils.ts`)

`verificarHorario(fecha, horarios)` devuelve `{ abierto, mensaje?, proximaApertura? }`. Usado por `ScannerComponent.verificarHorarioOperativo()` al comienzo de `procesarMatricula()`: si el horario está activo y estamos fuera, respeta `horarioModo` (`advertir` muestra toast pero continúa; `bloquear` aborta el registro). `DIAS_SEMANA` exporta los nombres en español (0=Domingo … 6=Sábado).

## Convenciones de código

- Componentes **standalone** — sin NgModules. Importar `CommonModule`, `FormsModule`, módulos `Mat*` en `imports`.
- Rutas con **lazy loading** via `loadComponent()`.
- Servicios `providedIn: 'root'`.
- Estado reactivo local con `signal()` / `computed()`.
- Template syntax: `@if`/`@for` (Angular 17+), NO `*ngIf`/`*ngFor`.
- Dialogs: `ConfirmDialogComponent` con variantes danger/warning/info. NO usar `confirm()` nativo.
- `ngZone.run()` para actualizar Angular desde callbacks de browser APIs (scanner, audio, `requestAnimationFrame`).
- Los comentarios de encabezado de archivo usan el formato `╔══╗` con versión y cambios recientes. Mantener este estilo al editar/crear archivos nuevos cuando el contexto lo justifique.
- `changelog.data.ts` es fuente única de verdad del historial de versiones: el primer elemento del array es la versión más reciente, `version` debe coincidir con `package.json`, fechas `YYYY-MM-DD`, tipos `feat | fix | mejora | cambio`.
- **MatTooltip scroll strategy**: configurado globalmente en `app.config.ts` como `overlay.scrollStrategies.close()` (no el default `reposition`). Razón: `reposition` registra cada trigger como `cdkScrollable` y dispara reflows en cada evento de scroll; con muchos tooltips por vista (dashboard tenía ~18) causaba lag perceptible. Si necesitas el comportamiento de reposicionar en una vista puntual, sobreescríbelo localmente con `MAT_TOOLTIP_SCROLL_STRATEGY`, no toques el global.

## Errores a evitar

- **NO** espacios en rutas de import (`gestion-motivos` no `gestion motivos`).
- **NO** doble extensión de archivo (`.ts.ts`).
- **NO** `confirm()` nativo → usar `ConfirmDialogComponent`.
- **NO** `*ngIf`/`*ngFor` → usar `@if`/`@for`.
- **NO** CSV con `.join()` manual → usar `ExportService`.
- **NO** navegar con `alumno.id` → usar `alumno.matricula`.
- Carpeta `environments` con **N** (NO `enviroments`).
- `angular.json`: `src/assets` debe estar en assets de build **Y** test.
- No usar `getAll()` + filter cuando existe índice apropiado en IndexedDB — pero **tampoco** quitar el fallback actual en queries de fechas sin migrar primero los registros viejos con `fechaHora` string.
- No romper la retrocompatibilidad de `Registro`: `motivoId`/`motivoNombre` siguen siendo el "principal"; `motivoIds`/`motivoNombres` son opcionales.
- No acceder a `/seleccion-motivo` sin pasar antes por scanner/registro — el guard depende de `sessionStorage.alumnoActual`.
- El `detalle-alumno` se enruta por `:matricula`, no por `:id`.
- No incrementar `DB_VERSION` (hoy 2) sin definir la migración en el `upgrade()` de `openDB`.
- Al tocar el scanner: respetar `isDetecting` y `enCooldown` (previenen detecciones concurrentes/dobles) y el throttle de `effectiveScanInterval`.
- No eliminar estrategias de `PREPROCESS_STRATEGIES` / `LOWRES_EXTRA_STRATEGIES` sin datos — el orden refleja probabilidad real de éxito y la priorización adaptativa se apoya en los `label`.
- Al agregar un método que muta `registros`, llamar `AforoService.refrescar()` si el cambio puede alterar la ocupación.

## Deployment

**Producción en Cloudflare Pages: `https://stenbrary.pages.dev`** desde el 2026-10-12; cada push a `main` despliega solo (guía: `docs/DESPLIEGUE-CLOUDFLARE.md`). Netlify se apagó ese mismo día (cobraba créditos por despliegue) y `public/_redirects` se borró: Cloudflare hace el fallback SPA solo, siempre que no exista un `404.html`. `public/_headers` (sin caché para `index.html`/`ngsw.json`/workers, un año para lo que lleva hash; no añadir un `/*.js` genérico: Cloudflare combina cabeceras). `.nvmrc` fija Node 22 (Node 20 llegó a fin de vida en abril de 2026; CI usa la misma). El build output es `dist/stenbrary/browser/`. Service Worker con `registrationStrategy: 'registerWhenStable:30000'` (`app.config.ts`). Configuración PWA en `ngsw-config.json` y manifiesto en `public/manifest.webmanifest`.