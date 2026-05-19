# DEVLOG — Stenbrary

Crónica técnica del desarrollo. No es documentación para usuario final
(eso vive en `src/app/core/data/changelog.data.ts`), ni doc arquitectónica
formal (eso vivirá en `docs/adr/` cuando aplique).

Formato: una entrada por tanda de trabajo. Fecha, qué se hizo, qué se
descubrió, qué se decidió, qué sigue. Breve y honesto.

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
