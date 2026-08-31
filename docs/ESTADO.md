# Estado del proyecto — Stenbrary

Snapshot de qué tiene el sistema **hoy** y qué queda pendiente.
Se actualiza al cerrar cada tanda relevante. No reemplaza a
`CHANGELOG` (cambios por versión) ni a `DEVLOG.md` (bitácora técnica)
ni a `docs/ROADMAP.md` (visión a largo plazo y fases del producto).

**Versión actual:** `3.25.0` · Última actualización: `2026-05-18`.

**Cierre de Fase 1 (v4.0)**: ver §2.0 abajo. Después de v4.0 arranca
**Fase 2** (backend + auth + sync) — detalle en `docs/ROADMAP.md`.

---

## 1. Features implementadas (qué hace hoy el sistema)

### 1.1 Control de acceso (núcleo operativo)

- **Scanner dual-mode**: cámara web (BarcodeDetector nativo + fallback ZXing) con pipeline agresivo (upscaling, Otsu, rotación, scanlines, invertido, linterna, zoom HW/SW, priorización adaptativa de estrategias).
- **Lector USB HID** (v3.11.0): captura matrícula al recibir Enter de un lector físico.
- **Modo manual**: input con validación tolerante (prefijos `a/A`, longitudes 7–12, trim).
- **Acceso invitado**: matrícula `INVITADO`, pide nombre, ID sintético `invitado-<timestamp>`.
- **Confirmación matrícula**: diálogo antes de procesar (evita falsos positivos).
- **Validación de matrícula** configurable (`MATRICULA_CONFIG`: dígitos min/max, prefijos permitidos).

### 1.2 Registro y selección

- **Registro de alumno nuevo** con campos fijos (matrícula, nombre, apellidos, carrera, grado, grupo, turno) + datos extra dinámicos (`datosExtra: Record<string,string>`).
- **Selección de motivos múltiples** (hasta N) con retrocompat al campo principal `motivoId/motivoNombre`.
- **5 motivos default**: Estudiar, Pedir libro, Trabajo escolar, Investigación, Otro.
- **CRUD de motivos** con icono (Material Icons), color, orden, activo/inactivo.
- **Detección de duplicado** por umbral configurable (default 30 min) con diálogo Salida / Nuevo / Cancelar.

### 1.3 Registro de salida y presencia

- **Registro de salida** opcional (`registroSalidaActivo`): primera vez = entrada, segunda = pregunta si salida.
- **Cálculo de `duracionMinutos`** al dar salida.
- **Cierre automático** (`horasAutoSalida`, 0=off): marca entradas abiertas viejas con `cierreAutomatico: true`.
- **Vista `/presencia`**: alumnos actualmente en biblioteca, tiempo transcurrido en vivo, confirmación de cierres automáticos.

### 1.4 Control de capacidad

- **Aforo configurable** (`aforoMaximo`, 0=off) con 3 modos:
  - `permitir`: registra pero avisa.
  - `confirmar`: diálogo antes de exceder.
  - `bloquear`: rechaza si está lleno.
- **Indicador semáforo**: libre (<50%) / normal (50–79%) / alto (80–99%) / lleno (100%) / sobreaforo (>100%).
- **Signal reactivo** de ocupación (actualiza en vivo).

### 1.5 Horarios de operación (v3.9.0)

- **Horarios por día de la semana** (domingo–sábado) con rangos hora inicio/fin.
- **Activable/desactivable** global.
- **Modo `advertir`** (toast pero registra) o **`bloquear`** (rechaza fuera de horario).
- **Mensaje de próxima apertura** al estar cerrado.

### 1.6 Modo quiosco (v3.9.0)

- **Oculta sidebar, topbar, bottom nav** para operación supervisada.
- **Redirige cualquier ruta ajena al flujo operativo** a `/scanner`.
- **Salida con long-press 3s en scanner + PIN** configurado.
- **Persiste en localStorage**: sobrevive a reloads.

### 1.7 Vistas y analítica

- **`/dashboard`**: KPIs del día + gráficas.
- **`/estadisticas`**: dashboard ejecutivo con tendencias mensuales, heatmap día×hora, top alumnos, distribución por carrera/motivo, insights automáticos.
- **`/alumnos`**: listado con búsqueda, filtros (activo/inactivo, carrera, turno), edición, detalle individual.
- **`/detalle-alumno/:matricula`**: historial de visitas, estadísticas del alumno.
- **`/registros`**: historial global con filtros por fecha/carrera/motivo/matrícula, edición manual, eliminación.
- **`/inactivos`** (v3.10.0): alumnos sin venir ≥ `umbralInactividadDias`, ordenados por último acceso.
- **`/productividad-diaria`** (v3.12.0): reporte diario del coordinador.

### 1.8 Configuración (coordinador)

- `/configuracion` centraliza todo:
  - Nombre institución, sonido, umbralDuplicadoMin.
  - Registro de salida + `horasAutoSalida`.
  - Aforo + modo.
  - Horarios por día + modo.
  - Modo quiosco + PIN.
  - Celebraciones (v3.9.0) con probabilidad 0–1.
  - Umbral de inactividad.
  - **Limpieza masiva de registros por rango**.
  - **Datos de prueba** (v3.13 en curso): generador con modelo UAT.
  - **Backup**: export/import JSON completo.

### 1.9 Importación y exportación

- **`/importar-alumnos`**: bulk import xlsx con preview y validación de columnas.
- **Exportación PDF/Excel** de registros, alumnos, reportes del día y del mes.
- **Backup JSON** completo (alumnos + registros + motivos + config).
- **Restauración** con detección de duplicados (motivos por nombre).

### 1.10 Novedades (changelog interno)

- **Vista `/novedades`** muestra el array `CHANGELOG`.
- **Badge "Novedades"** en sidebar hasta que el usuario la visita (localStorage `stenbrary-changelog-vista`).
- **4 tipos** de cambio: `feat | fix | mejora | cambio`, con `destacado` opcional.

### 1.11 PWA y offline

- **Instalable** en desktop y móvil (`manifest.webmanifest`).
- **Service Worker** con registro `registerWhenStable:30000`.
- **Operación 100% offline** tras primera carga.
- **Detección de actualizaciones** vía `SwUpdate.versionUpdates`.
- **Error reporter** con cola offline en localStorage, drena al volver online.

### 1.12 Infraestructura y tooling

- **69 tests unitarios** headless (Karma + Jasmine, `ChromeHeadlessCI`).
- **4 smoke E2E** (Playwright).
- **CI GitHub Actions**: type-check + tests + version guardrail.
- **Husky v9 pre-commit**: version guardrail + type-check app/spec.
- **Guardrail de versión**: `package.json` debe coincidir con primer entry de `CHANGELOG`.
- **Lazy load** de `@zxing/browser` para reducir chunk inicial.

---

## 2. Pendientes (roadmap)

Prioridad: **🔴 alta** · **🟡 media** · **🟢 baja**.

### 2.0 Cierre de Fase 1 — v4.0 🔴 (en curso)

Última milla antes de cerrar Fase 1 y arrancar Fase 2.

- [x] **Rediseño de `/configuración`** (v3.24.0): shell con sidebar de 7 categorías + buscador + URL fragment. Las 7 categorías (General, Escáner, Operación, Quiosco, Experiencia, Datos, Avanzado) son sub-componentes standalone con OnPush. Monolito de 2897 líneas dividido. Versión clásica eliminada (v3.25.1).
- [x] **Command palette Ctrl+K** (v3.25.0): 18 comandos de navegación + 6 toggles de configuración + 6 acciones. Catálogo en `CommandPaletteService` (`providedIn: 'root'`). Búsqueda fuzzy ignora acentos. Chips de color por grupo. Atajos directos a cada categoría de config via URL fragment.
- [ ] **Revisión de tooltips en dashboard ejecutivo**: con el fix global de scroll strategy (v3.24.0) ya no causan lag; restaurar caso por caso donde aporten valor (no por reflejo).

### 2.0.1 Fase 2.0 — Fundación de auth (Supabase) ✅ COMPLETADA (2026-05-20)

Primera tanda real de Fase 2. Validado end-to-end con magic link y trigger.

- [x] Proyecto Supabase dev creado (`stenbrary-dev`).
- [x] `@supabase/supabase-js` + `environment.supabase.{url,anonKey}` en Git (la `sb_publishable_*` es pública por diseño).
- [x] `src/app/core/auth/`: `supabase.client.ts` (singleton PKCE), `auth.types.ts`, `auth.service.ts` (signals reactivos), `auth.guard.ts` (deja pasar en modo solo-local).
- [x] `/login` con magic link, 4 estados visuales, auto-redirect post-callback vía `effect`.
- [x] Migration `supabase/migrations/0001_auth_foundation.sql`: enum `user_role`, `organizations`, `user_profiles`, trigger `handle_new_user`, helpers `is_super_admin()` / `current_organization_id()`, RLS habilitada.
- [x] **Modo solo-local explícito**: si `environment.supabase` está vacío, app sigue 100% funcional offline. No hay forma de llegar a `/login` desde la UI todavía — es opt-in mientras maduramos.
- [x] ADR `docs/adr/0001-supabase-auth-foundation.md`.
- [x] Indicador de sesión en topbar + fix RLS recursiva (0002).
- [x] Lock pass-through en `supabase.client.ts` para silenciar warning de NavigatorLockManager.

### 2.0.2 Fase 2.1 — Modelo de datos espejo + importador one-shot ✅ COMPLETADA (2026-05-22)

Schema de Postgres + adapter + subida idempotente de IndexedDB a Supabase.

- [x] **Migration 0003**: `motivos`, `alumnos`, `registros`, `registro_motivos` (join table) con snapshots denormalizados, `organization_id` nullable, `unique nulls not distinct` para matrícula, RLS con `is not distinct from`. Función SQL `crear_registro_completo(payload jsonb)` con UPSERT atómico.
- [x] **Migration 0004**: `alumno_id` nullable + saneo de IDs sintéticos (`invitado-*`) en la función SQL con `nullif`.
- [x] **Migration 0005**: drop del trigger genérico `trg_alumnos_updated_at` que asumía columna `updated_at` inexistente.
- [x] `RemoteDatabaseService` (adapter contra Supabase, mismo shape que `DatabaseService` local): mappers snake↔camel, helper `asUuidOrNull` para IDs sintéticos.
- [x] `ImportSupabaseService`: preview + subida en 3 fases (motivos → alumnos → registros) con reporte final.
- [x] UI: diálogo `SubirSupabaseDialogComponent` (preview / running / done / error) accesible desde `/configuracion#avanzado` solo si signed-in.
- [x] Validado con dataset UAT (500+ alumnos, 5000+ registros): 0 errores tras los 3 fixes encontrados.
- [x] Idempotencia probada: re-corrida sin duplicados.

**Granularidad pendiente** (sólo hoy / sólo nuevos / etc.): es Fase 2.2. Decidir si extender el one-shot con filtros simples o saltar a la bandeja de sincronización completa.

### 2.0.3 Auditoría de Fase 1 (2026-08-31)

Barrido de datos, analítica y responsive antes de cerrar Fase 1. Método:
medir, no leer. Resultados:

- [x] **Analítica verificada**: 36 tests nuevos sobre `EstadisticasAvanzadasService` (`estadisticas-avanzadas.service.spec.ts`) con dataset sintético de distribución conocida sobre fechas fijas. Cubre filtrado y bordes de rango, bucketing día/semana/mes, tendencias (incluida división por cero), distribución de motivos, top alumnos, carreras, heatmap con auto-expansión horaria, hora pico, caché y estado vacío. **Cero defectos aritméticos encontrados** — el motor de estadísticas es correcto.
- [x] **Responsive verificado**: `e2e/responsive.spec.ts` recorre 12 rutas × 3 viewports (390 / 820 / 1440). **Cero desbordamientos.** `/estadisticas` es la vista mejor atendida del proyecto (17 media queries); las de menos cobertura son `/alumnos` (1) y `/presencia` (0), pero miden limpio.
  - ⚠️ **Nota sobre el instrumento**: la medición ingenua (`documentElement.scrollWidth`) da falso verde en esta app, porque `styles.scss` fija `html, body { overflow: hidden }` y `.content-area` añade `overflow-x: hidden` — el contenido que se pasa se recorta en silencio en vez de volverse scrollable. El spec mide el `scrollWidth` del contenedor de scroll real y **se auto-verifica** inyectando un desborde deliberado. No sustituir por la versión ingenua.
- [x] **🔴 BUG CRÍTICO CORREGIDO — restaurar un backup destruía el historial** (v3.27.0). `importarBackup()` reconstruía los registros con `crearRegistro()`, cuya firma es `Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'>` y estampa `fechaHora: new Date()`. Efecto: **cada restauración colapsaba todo el historial contra el día de la importación**, y descartaba `horaSalida`, `duracionMinutos`, `motivoIds`/`motivoNombres`, `turno`, `dispositivo` y `cierreAutomatico`. Los alumnos además recibían `id` nuevo, rompiendo el `alumnoId` de sus registros. La importación reportaba `exitoso: true` con el conteo correcto — fallo totalmente silencioso.
  - Fix: `DatabaseService.restaurarAlumno()` / `restaurarRegistro()` preservan `id` y fechas, revivien strings ISO → `Date`, y usan `put` (idempotente: reimportar no duplica).
  - Cubierto por `backup.service.spec.ts` (8 tests de round-trip que comparan contenido, no conteo).
- [x] **Keep-alive de Supabase**: se agregó trigger `push` además del cron. El modo de fallo real es que GitHub desactiva los cron tras 60 días sin commits — justo cuando el repo se queda quieto, que es cuando el ping más falta hace.
- [x] **MEDIDO — el problema de `fechaHora` string NO existe** (2026-08-31). Conteo sobre la base real del desarrollador: **3186 registros, 3186 como `Date`, 0 como texto, 0 inválidos**. `DB_VERSION = 2` deja de ser 🔴: la migración de fechas no tiene nada que migrar. Ver §2.1.
- [x] **🟡 Ruido de red contra Supabase corregido**. `ConnectivityService` sondeaba `/auth/v1/health` cada **30 s**, sin `apikey` (imposible mandarla como header con `mode: 'no-cors'`, que solo admite cabeceras de la lista segura). Cada sondeo devolvía **401**. Con ~120 peticiones/hora **por pestaña abierta**, el dashboard de Supabase mostraba *411 requests / 11.2% success rate / 363 warnings en 60 min*: el ruido tapaba cualquier fallo real y consumía cuota del plan gratuito. El sondeo funcionaba igual —una respuesta opaca no distingue 200 de 401— así que nunca se notó desde la app.
  - Fix: `apikey` como query param (200 en vez de 401), intervalo 30 s → 180 s, y no sondear con la pestaña oculta. Los cambios reales de conexión ya llegan al instante por `online`/`offline` y `visibilitychange`; el intervalo solo cubre el portal cautivo.

Suite tras la auditoría: **113 tests unitarios + 9 E2E**.

### 2.1 Infra de datos 🟡 _(bajado de 🔴 el 2026-08-31)_

- [ ] **`DB_VERSION = 2`** — 🟡, ya no bloquea nada. Se necesitaría solo para crear el store `audit` (Activity Log), **no** para migrar fechas: medido el 2026-08-31, 3186/3186 registros ya tienen `fechaHora` como `Date` y 0 como string. La ruta de importación tampoco puede fabricar strings desde v3.27.0 (`restaurarRegistro()` los revive a `Date`).
- [ ] **Quitar el fallback `getAll() + filter`** de las consultas por fecha 🟡. Existe para tolerar `fechaHora` string, caso que no se da en datos reales — pero hoy carga los 3186 registros a memoria en **cada** consulta por fecha. Al quitarlo, dejar una verificación de arranque (o un guard en la importación) por si algún día entran datos de otra instalación con fechas serializadas: eliminarlo a ciegas reintroduce el riesgo silencioso que el fallback previene.
- [ ] **Activity Log / Audit Trail** (`/actividad`): registrar mutaciones (alumno creado/editado/desactivado, registro editado/eliminado, cambios de config) con usuario + timestamp. Requiere store `audit`. Inspirado en Fishbowl.
- [ ] **`crearRegistrosBatch()`** en `DatabaseService`: transacción única para N registros, reduce tiempo de generación Histórico 30m de ~20 min a ~2–3 min.

### 2.2 Calendario escolar configurable 🔴 (bloquea venta a otras universidades)

- [ ] **`CalendarioEscolarService`**: abstraer las constantes UAT del `DatosPruebaService` a un servicio reactivo con persistencia en `localStorage`.
- [ ] **UI en `/configuracion`**: editor de períodos lectivos (nombre, inicioMMDD, finMMDD, densidadFactor), festivos (lista editable), Semana Santa, horario apertura/cierre, probabilidad de asistencia en verano, ponderación de turnos.
- [ ] **Defaults UAT** disponibles como preset al instalar.
- [ ] **Plantillas preconfiguradas** para otras universidades comunes (a llenar cuando se tenga el primer cliente).
- [ ] **Modalidad de períodos:** soporte para semestres (2/año), trimestres (3/año, ene-mar/abr-jun/jul-sep/oct-dic), cuatrimestres (3/año pero distintos), bimestres y módulos. El comparador del Dashboard Ejecutivo y los presets de período usan este servicio. Hoy "Semestre actual / Semestre anterior" en el comparador asume convención genérica ene-jun / jul-dic — al implementar este servicio, esos atajos se vuelven dinámicos según la modalidad configurada.
- [ ] **Configurar días/meses con clases:** marcar qué meses hay actividad lectiva y cuáles son receso (vacaciones intersemestrales, festivos locales). Lo usan: el generador de seed (no inventa visitas en días sin clases), los reportes (resaltan/excluyen recesos), el dashboard (cálculo de promedios por día lectivo en lugar de día calendario).

### 2.3 UX y analítica 🟡

- [x] ~~Búsqueda global Ctrl+K (spotlight)~~ — la versión básica ya existe; la expansión a command palette (toggles + acciones) está en §2.0 como parte del cierre v4.0.
- [ ] **Tags para alumnos**: etiquetas libres (ej. "becario", "comité", "baja temporal").
- [ ] **Comparativas temporales avanzadas**: overlay del mismo período año anterior en `/estadisticas`.
- [ ] **Alertas persistentes** (dashboard): notificar caídas de asistencia, umbrales de aforo cruzados, inactividad de alumnos clave.
- [ ] **Exportación a Google Sheets** directo (opcional) vía link OAuth.
- [ ] **Filtros por rango de hora** en `/registros` (además del filtro por fecha actual). Útil para analizar picos del día.
- [ ] **Virtual scroll en `/registros`** (cdk-virtual-scroll): hoy con volumen alto (Histórico 30m ≈ 80k+ registros) el scroll lagea. Misma técnica aplicable a la pestaña de historial en `/detalle-alumno`.
- [ ] **Papelera / Undo diferido** para eliminaciones de alumno/registro/motivo: mover a un store `papelera` con retención de 30 días en vez de borrar duro. Hoy solo el toast de "Deshacer" inmediato post-registro cubre ese caso. Se resuelve mejor cuando esté el Activity Log (§2.1).

### 2.3.3 Mejoras Dashboard Ejecutivo (post-entrega) 🟢

Anotadas en sesión v3.17.x para después de la entrega; el coordinador pidió enfocar perf/bugs/UX antes de nuevas features.

- [ ] **Comparativa "año móvil" (12 meses rolling)** vs los 12 previos — suaviza estacionalidad escolar.
- [ ] **Detección automática de anomalías**: marcar días con visitas a +3 desviaciones estándar.
- [ ] **Promedio "por día abierto"** vs "por día calendario" — relevante con horarios cerrados.
- [ ] **Tasa de retorno semanal** (cuántos vuelven la semana siguiente).
- [ ] **Ranking de carreras "en caída"** (opuesto al "carrera en crecimiento" que ya existe).
- [ ] **Recordar último filtro al volver** (localStorage) — hoy siempre arranca en "30 días". (Ya hay permalinks en URL desde v3.17.0; falta el default.)
- [ ] **Tarjetas favoritas/anclables**: el coordinador marca cuáles le importan y suben.
- [ ] **Modo presentación** (fullscreen) para mostrar a directivos.
- [ ] **Comparar tres rangos** (no solo A vs B).
- [ ] **Lazy-load de gráficas fuera del viewport** con IntersectionObserver — solo dibujar la del crecimiento 12m si el usuario hace scroll hasta allá.
- [ ] **Web Worker para cálculo de métricas** con +500k registros (para cuando llegue ese volumen).
- [ ] **Colores semánticos en KPIs según el valor** (rojo si retención <30%, ámbar 30-60%, verde >60%).
- [ ] **Mini-leyenda inline en cada gráfica** con su valor numérico al lado.
- [ ] **Modo "alto contraste"** con tema separado.
- [ ] **Atajos de teclado**: H = hero, R = refrescar, P = personalizar PDF.

### 2.3.1 Catálogos editables desde UI 🔴 (bloquea venta a otras universidades)

- [ ] **`CARRERAS` editables desde `/configuracion`**: hoy son constantes en `catalogos.constants.ts`. Problema real: las carreras se renombran con el tiempo (ej. "Licenciatura en Enfermería" no existe en la facultad del coordinador; su propia carrera ya se renombró y volverá a renombrarse). **Requisitos:**
  - CRUD completo (agregar, renombrar, desactivar — no eliminar si hay alumnos/registros vinculados).
  - **Migración bulk**: al renombrar carrera X → Y, actualizar todos los alumnos y registros que la tenían. Confirmación con conteo previo.
  - Persistencia en `ConfigService` / IndexedDB store nuevo (`catalogos`).
  - Dropdown del registro-alumno y filtro de `/alumnos` leen del servicio, no de constantes.
- [ ] **`TURNOS`, `GRADOS`, `GRUPOS` igualmente editables** (menos crítico — estos son más estables que carreras).

### 2.3.2 Permisos y sensibilidad 🟡

- [ ] **Rol admin para operaciones sensibles**: editar matrícula de un alumno existente, eliminar alumno con historial, cambios masivos de carreras. Hoy no hay auth, la protección es solo un `ConfirmDialog`. Depende de §2.4.

### 2.4 Multi-usuario, auth y sync — Fase 2 🔴 (planeada post-v4.0)

**Plan completo en `docs/ROADMAP.md` §Fase 2.** Aquí solo el resumen:

- **Stack decidido:** Supabase (Postgres + Auth + Storage + Realtime).
- **4 roles:** super-admin, coordinador, asistente, alumno.
- **Sync supervisado**: offline-first con bandeja de sincronización; el coordinador revisa y descarta antes de subir (caso "alumno travieso"). NO sync automático ciego.
- **Sub-fases 2.0 a 2.5** documentadas con deliverables, estimaciones y riesgos en el ROADMAP.
- **Estimado total**: 4–5 meses part-time.
- El **Activity Log** (§2.1) se enriquece con `usuarioId` cuando esta fase aterrice (Fase 2.3).

### 2.5 Comercialización a otras universidades — Fase 5

**Plan completo en `docs/ROADMAP.md` §Fase 5.** Requisitos bloqueantes ya rastreados en §3 abajo.

### 2.6 Hardening pre-producción 🟡

- [x] ~~**Migración completa `*ngIf` → `@if`**~~ — **completada** (verificado 2026-08-31): 0 ocurrencias en `.html` y 0 en templates inline. El único hit de grep es una línea de comentario en `toast-container.component.ts`. Este item llevaba tiempo desactualizado declarando "~97 ocurrencias pendientes".
- [ ] **Lighthouse audit completo** (performance, a11y, best practices, SEO). Objetivo: 90+ en todas.
- [ ] **E2E expansion**: flujo completo (escaneo → motivo → salida → export), modo quiosco con PIN, aforo bloqueado.
- [ ] **ADRs** (`docs/adr/`): documentar decisiones arquitectónicas clave (por qué IndexedDB directo, por qué no NgRx, por qué sessionStorage entre rutas, etc.).
- [ ] **Test de generador de datos**: verificar distribuciones (0% registros en domingos, ~15% en verano, etc.) con dataset chico.

### 2.7 Tooling adicional 🟢

- [ ] **Lint rules custom** (por ejemplo, prohibir `*ngIf` con eslint).
- [ ] **Storybook** para el design system.
- [ ] **Visual regression** (Percy o Chromatic) en E2E.
- [ ] **Dependabot** o similar para updates de seguridad.

### 2.8 Descartados por decisión

Cosas que explícitamente **NO** se van a implementar (confirmado con coordinador):

- ❌ Tema claro/oscuro. Dark theme único.
- ❌ Foto de alumno. Costo de almacenamiento vs. beneficio bajo.
- ❌ i18n (internacionalización). Sistema 100% español.
- ❌ Conversión a Electron / app nativa. PWA es suficiente.
- ❌ Sincronización LAN peer-to-peer. Si hay sync, será por backend.

---

## 3. Consideraciones al vender a otra universidad

Checklist mínimo antes de ofrecer el sistema a una segunda universidad:

- [ ] **Calendario configurable** (§2.2) implementado.
- [ ] **`CARRERAS`, `TURNOS`, `GRADOS`, `GRUPOS`** movidos a config persistente (hoy constantes en `catalogos.constants.ts`).
- [ ] **Formato de matrícula** (`MATRICULA_CONFIG`) configurable desde UI.
- [ ] **Logo e identidad visual** de la institución en reportes PDF/Excel.
- [ ] **Nombre institución** ya editable — ✅ hecho.
- [ ] **Activity log** (§2.1) para auditoría básica.
- [ ] **Backup programado** (opcional, requiere backend o indicación al usuario).
- [ ] **Documentación de instalación** para el equipo TI de la institución.
- [ ] **Plan de capacitación** para coordinador + personal.
- [ ] **Versión de demo** limitada en tiempo o volumen (estrategia comercial).

---

## 4. Cómo usar este documento

- **Al planear tanda nueva**: revisar §2 y elegir el pendiente con mejor ratio esfuerzo/valor.
- **Al cerrar tanda**: mover el item de §2 a §1 (features) si quedó completo, o actualizar su estado.
- **Al cambiar prioridad**: sólo cambiar el emoji (🔴/🟡/🟢) con una línea en `DEVLOG.md` explicando por qué.
- **Al descartar algo**: moverlo a §2.8 con el motivo.
