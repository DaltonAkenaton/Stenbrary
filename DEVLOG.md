# DEVLOG — Stenbrary

Crónica técnica del desarrollo. No es documentación para usuario final
(eso vive en `src/app/core/data/changelog.data.ts`), ni doc arquitectónica
formal (eso vivirá en `docs/adr/` cuando aplique).

Formato: una entrada por tanda de trabajo. Fecha, qué se hizo, qué se
descubrió, qué se decidió, qué sigue. Breve y honesto.

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
