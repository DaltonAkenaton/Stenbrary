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

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Desarrollo con hot reload
npx ng serve

# Build de producción
npx ng build --configuration production

# Lint
npx ng lint

# Generar componente standalone
npx ng generate component features/nombre --standalone --style=scss
```

No hay test suite activa. Existen algunos archivos `.spec.ts` generados por el CLI (`app.component.spec.ts`, `scanner.component.spec.ts`, `dashboard.component.spec.ts`) pero no se ejecutan como parte del flujo — no asumir cobertura de tests.

## Arquitectura

**Stenbrary** es una PWA Angular 18 offline-first para control de acceso a biblioteca (UAT). Toda la persistencia ocurre en IndexedDB (sin backend); el Service Worker (`@angular/service-worker`) permite operación sin internet. Versión actual: `3.10.0` (ver `package.json`; la versión mostrada en UI viene del primer elemento de `CHANGELOG` en `src/app/core/data/changelog.data.ts`).

### Proceso de novedades (release workflow)

Cada mejora visible para el usuario debe quedar documentada en `src/app/core/data/changelog.data.ts`. El `ChangelogService` compara la versión actual con `stenbrary-changelog-vista` (localStorage) y muestra el badge "Novedades" en el sidebar hasta que el usuario visita `/novedades`.

Para liberar una versión nueva:
1. Insertar la entrada **al inicio** del array `CHANGELOG` en `changelog.data.ts` (el primer elemento es siempre la más reciente).
2. Actualizar `version` en `package.json` — debe coincidir con `version` del primer entry del CHANGELOG.
3. Fecha en formato `YYYY-MM-DD`. Tipos de cambio: `feat | fix | mejora | cambio`.
4. Escribir los textos en lenguaje claro para usuarios finales (no jerga técnica).
5. Marcar `destacado: true` solo en releases mayores que merezcan un highlight.

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
| `/configuracion` | `ConfiguracionComponent` | Incluye `limpieza-registros.component` |
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

`DatabaseService` (`core/services/database.service.ts`) es el único punto de acceso. `DB_NAME = 'stenbrary-db'`, `DB_VERSION = 1`. Tres stores:

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
- `Registro`: `motivoId`/`motivoNombre` (principal, retrocompat) **y** `motivoIds?`/`motivoNombres?` (múltiples, v3.7.0+). También `horaSalida?`, `duracionMinutos?`, `cierreAutomatico?`. No romper la retrocompatibilidad.
- `Motivo`: `nombre`, `icono` (Material Icons), `orden`, `activo`, `color?`.

### Servicios (`core/services/`)

Todos `providedIn: 'root'`. El barrel export en `index.ts` solo re-exporta los principales; algunos (`ConfigService`, `AforoService`, `SoundService`, `ChangelogService`, `PwaUpdateService`) se importan por ruta.

- `DatabaseService` — ver sección anterior.
- `ConfigService` — persiste en `localStorage` bajo `stenbrary-config`. Claves: `registroSalidaActivo`, `horasAutoSalida` (0 = off), `nombreInstitucion`, `umbralDuplicadoMin` (default 30), `aforoMaximo` (0 = off), `aforoModo` (`'permitir' | 'confirmar' | 'bloquear'`), `modoQuiosco` + `quioscoPin` (v3.9.0), `horarioActivo` + `horarios` (por día, 0=domingo … 6=sábado) + `horarioModo` (`'advertir' | 'bloquear'`, v3.9.0), `celebracionActiva` + `celebracionProbabilidad` (0–1, v3.9.0). Getter derivado: `aforoActivo = aforoMaximo > 0 && registroSalidaActivo`. Signals: `hayAutoClose` (cierres pendientes) y `modoQuioscoSignal` (reactivo para `AppComponent`).
- `AforoService` — usa `signal`/`computed` sobre la ocupación actual. Estados: `inactivo`, `libre` (<50%), `normal` (50–79%), `alto` (80–99%), `lleno` (100%), `sobreaforo` (>100%). `refrescar()` relee de la BD; `setOcupacion()` para evitar doble lectura cuando ya tenemos el conteo (p.ej. en `/presencia`).
- `ChangelogService` — compara `versionActual().version` con `stenbrary-changelog-vista` (localStorage). Signal `hayNovedades` alimenta el badge del sidebar. En primera instalación NO muestra badge (marca la versión como vista).
- `SoundService` — beeps vía Web Audio API (sin archivos). Flag en `stenbrary-sonido-activo`. Métodos: `beepScan`, `beepSalida`, `beepError`.
- `ToastService`, `LoadingService` — UI transversal (componentes en `shared/`).
- `BackupService` — export/import JSON completo. Verifica duplicados de motivos por nombre antes de insertar.
- `ExportService`, `ReportService` — PDF (`jspdf`/`jspdf-autotable`) y Excel (`xlsx`).
- `EstadisticasAvanzadasService` — tendencias, heatmap, top alumnos, insights, distribución por motivo/carrera.
- `PwaUpdateService` — integrado también directamente en `AppComponent` vía `SwUpdate.versionUpdates`.
- `GlobalErrorHandler` — provider en `app.config.ts`.

### Scanner (dual-mode, `features/scanner/scanner.component.ts`)

El componente detecta en `ngOnInit` si `BarcodeDetector` nativo está disponible:
- **Nativo** (`usandoNativo = true`): llama `detect(video)` directamente. Si falla, re-intenta sobre canvas preprocesado con sharpen y con binarización Otsu.
- **ZXing fallback** (`usandoNativo = false`): `BrowserMultiFormatReader` con hints restringidos a `CODE_128 + CODE_39` y `TRY_HARDER`. Dibuja frames en `<canvas>` con filtros CSS y llama `decodeFromCanvas()`.

El loop usa `requestAnimationFrame` con throttle adaptativo (`SCAN_INTERVAL_MS = 160`, `SCAN_INTERVAL_LOWRES_MS = 120`). Las estrategias de preprocesado están en `PREPROCESS_STRATEGIES` + `LOWRES_EXTRA_STRATEGIES` (tope del archivo) — cada estrategia tiene `filter` (CSS), `scale` (upscaling 1×–3×) y `label` (para logs + priorización adaptativa).

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
- No incrementar `DB_VERSION = 1` sin definir la migración en `onupgradeneeded`.
- Al tocar el scanner: respetar `isDetecting` y `enCooldown` (previenen detecciones concurrentes/dobles) y el throttle de `effectiveScanInterval`.
- No eliminar estrategias de `PREPROCESS_STRATEGIES` / `LOWRES_EXTRA_STRATEGIES` sin datos — el orden refleja probabilidad real de éxito y la priorización adaptativa se apoya en los `label`.
- Al agregar un método que muta `registros`, llamar `AforoService.refrescar()` si el cambio puede alterar la ocupación.

## Deployment

Netlify. `public/_redirects` contiene `/* /index.html 200` para el routing SPA. El build output es `dist/stenbrary/browser/`. Service Worker con `registrationStrategy: 'registerWhenStable:30000'` (`app.config.ts`). Configuración PWA en `ngsw-config.json` y manifiesto en `public/manifest.webmanifest`.