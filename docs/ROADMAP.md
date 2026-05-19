# Roadmap — Stenbrary

Plan a largo plazo del producto. Fuente única de verdad de hacia dónde va el sistema y por qué.

**No es un cronograma.** Es un documento vivo de visión, fases, decisiones arquitectónicas y riesgos. Se actualiza cuando cambia el rumbo, no cada release.

- **Día a día y status detallado:** `docs/ESTADO.md`
- **Bitácora técnica por tanda:** `DEVLOG.md`
- **Historial de versiones para usuario:** `src/app/core/data/changelog.data.ts`

---

## Visión

Stenbrary es un sistema de **control de acceso a biblioteca universitaria** que prioriza la operación local (offline-first), respeta la realidad de instituciones con conectividad inestable y empodera al coordinador con control total sobre los datos antes de que vivan en la nube.

**Diferenciadores que no negociamos:**
- Funciona sin Internet — la luz se va, el WiFi cae, el sistema sigue.
- El coordinador es dueño de sus datos — revisa antes de sincronizar, no al revés.
- Flexible — todo umbral, catálogo, horario es editable por el cliente sin tocar código.
- Profesional para el coordinador, invisible para el alumno.

---

## Fases

| Fase | Estado | Objetivo | Duración estimada |
|---|---|---|---|
| **1 — PWA offline-first** | Cerrando (v3.x → v4.0) | Sistema operativo local completo | — (ya en producción) |
| **2 — Backend + auth + sync** | Planeada | Multi-usuario, sync a nube supervisado | 4–5 meses part-time |
| **3 — Pulir producto** | Futura | Hardening, perf, a11y, capacitación | 2–3 meses |
| **4 — Módulo de préstamos** | Investigación | Reservas, devoluciones, multas | TBD tras investigación |
| **5 — Comercialización** | Largo plazo | Vender a otras universidades | TBD |

---

## Fase 1 — PWA offline-first (cerrando)

Sistema actual, casi completo. Lo que falta para cerrar v4.0:

### v4.0.0 — Última milla UX (~2 semanas)
- [ ] **Rediseño de `/configuración`** con layout sidebar + panel (categorías a la izquierda, settings a la derecha). Razón: hoy el coordinador debe scrollear mucho y buscar settings — patrón roto en cuanto pasamos de ~6 categorías.
- [ ] **Command palette Ctrl+K** que soporte 3 tipos de resultado:
  1. Navegación (alumnos, registros, vistas — lo que ya hay)
  2. **Toggle de settings** (modo quiosco, celebración, registro salida, horario, aforo, sonido)
  3. **Acciones** (exportar respaldo, generar datos de prueba, limpiar registros, vaciar caché)
- [ ] Revisión caso por caso de tooltips quitados en dashboard ejecutivo (con el fix global de scroll strategy ya no causan lag).

Después de v4.0, Fase 1 queda cerrada. Cualquier feature nueva del modelo local se evalúa contra "¿esto debería esperar a Fase 2?".

---

## Fase 2 — Backend + auth + sync

### Decisiones arquitectónicas (tomadas 2026-05-18)

**Stack: Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions).

Por qué Supabase sobre Firebase:
- Modelo relacional (alumnos → registros → motivos) encaja con Postgres, no con NoSQL.
- Las queries actuales de `EstadisticasAvanzadasService` (joins, agregaciones) son naturales en SQL.
- RLS (Row-Level Security) de Postgres es ideal para multi-tenant futuro.
- Tier gratis suficiente para arrancar (500 MB DB, 50K MAU, 1 GB storage).
- Aprendizaje transferible — SQL y Postgres sirven en cualquier rol profesional.

**Tenancy: single-tenant ahora, multi-tenant después.**
El schema incluye `organization_id` nullable **desde el inicio** para evitar migración dolorosa cuando llegue el segundo cliente.

**Sync: offline-first con sincronización supervisada por el coordinador.**

Esto es el corazón del diseño. **No habrá sync automático ciego.** Razón explícita del cliente: un alumno travieso podría ensuciar registros locales; antes de subir a la nube el coordinador revisa, descarta basura y aprueba.

Modelo de cada registro local:
- `_syncStatus`: `local | pending | synced | rejected`
- `_localId` y `_remoteId` separados (con mapping)

Componentes clave:
- **Bandeja de sincronización** — UI donde el coordinador ve qué se va a subir, con preview, filtros y acción de descartar.
- Sync manual (botón) + sync automático opcional (configurable: "subir todo a las 22:00").
- Conflict resolution: last-write-wins con marca para revisión manual.

**Roles (4):**

| Rol | Puede | No puede |
|---|---|---|
| **super-admin** (Stenbrary dev) | Todo, en cualquier organización | — |
| **coordinador** (admin de biblioteca) | CRUD alumnos, ver/exportar todo, configurar, invitar asistentes | Borrar masivo, cambiar matrículas existentes, ver otras orgs |
| **asistente** (escritorio) | Operar scanner, registrar alumnos nuevos, ver registros del día | Configurar, exportar BD completa, eliminar |
| **alumno** | Ver sus propios registros, sus insignias, sus datos | Todo lo demás |

Defense in depth: las restricciones se aplican **en BD (RLS) y en UI**, no solo en una capa.

### Sub-fases

#### 2.0 — Fundación de auth `(~2 sem)`
- Setup proyecto Supabase + CLI + migrations.
- Schema inicial: `organizations`, `users`, `user_roles`.
- Login screen (email + magic link), logout.
- `AuthService` con sesión persistida.
- `authGuard` para rutas protegidas.
- **App sigue 100% funcional offline si no hay sesión** — login es opcional al arrancar (modo "solo local" para setup inicial y casos sin Internet).
- **Aprendizajes esperados:** Supabase CLI, migrations SQL, JWT básico, sesión reactiva con signals.

#### 2.1 — Modelo de datos espejo `(~2-3 sem)`
- Migrar schema `alumnos / registros / motivos` a Postgres con tipos correctos.
- RLS policies básicas (por ahora solo "usuario autenticado puede leer/escribir lo suyo").
- `RemoteDatabaseService` con la **misma interfaz pública** que `DatabaseService` local (adapter pattern). Esto permite swap por feature flag durante desarrollo.
- Importador one-shot: subir el IndexedDB de UAT al Supabase como prueba real.
- Aún sin sync — solo CRUD remoto disponible para admins con Internet.
- **Aprendizajes esperados:** SQL avanzado, RLS, diseño de schemas, índices Postgres, supabase-js SDK.

#### 2.2 — Sync engine offline-first ⭐ **El difícil** `(~4-6 sem)`
- Bump `DB_VERSION` para añadir `_syncStatus`, `_localId`, `_remoteId` a stores existentes.
- `SyncService` con cola persistida en IndexedDB (store nuevo `sync_queue`).
- **Bandeja de sincronización** (`/sincronizacion`): vista del coordinador para revisar, filtrar, descartar y aprobar el batch antes de subir.
- Sync manual (botón) + sync automático opcional (configuración `syncAuto` + `syncAutoHora`).
- Conflict resolution: last-write-wins con flag `conflictoDetectado` para revisión manual.
- Idempotencia garantizada: si la red falla a mitad del sync, reintento no duplica.
- **Recomendación fuerte: spike de 1 semana antes** para validar el approach con un caso real antes de comprometer 6 semanas.
- **Aprendizajes esperados:** arquitectura de sync, conflict resolution, optimistic UI, idempotencia, edge cases de red.

#### 2.3 — Roles y permisos `(~2 sem)`
- Implementar los 4 roles definidos arriba.
- `roleGuard` parametrizable (`canActivate: [roleGuard], data: { roles: ['admin', 'asistente'] }`).
- UI condicional: esconder botones que el rol actual no puede usar (vs. mostrar y denegar — la primera es mejor UX).
- RLS reforzando en BD aunque el front mienta.
- Página `/usuarios` para que el coordinador invite asistentes.
- **Aprendizajes esperados:** RBAC patterns, defense in depth, security mindset.

#### 2.4 — Portal alumno `(~3-4 sem)`
- Login por matrícula + magic link al correo institucional.
- Vistas: "Mis visitas", "Mis insignias", "Mi historial completo".
- Solo lectura de su propio data (RLS lo garantiza).
- Prepara terreno para módulo de préstamos (Fase 4) — el alumno ya tiene cuenta.
- **Aprendizajes esperados:** auth por magic link, UX de portal lectura-only, RLS estricto por usuario.

#### 2.5 — Preparación multi-tenant `(~1-2 sem)`
- Añadir `organization_id` a todas las tablas (nullable, default = la org inicial).
- RLS policies actualizadas con filter por organización.
- Documentar el procedimiento de migración cuando llegue el segundo cliente.
- Aún sin UI de "cambiar organización" — eso es Fase 5.

### Estimación total Fase 2
**4–5 meses part-time** (~10–15 h/sem). Acelerable si full-time.

### Riesgos Fase 2

| Riesgo | Mitigación |
|---|---|
| Sync engine (2.2) es más complejo de lo estimado | Spike de 1 sem antes de comprometer 6 sem. Documentar approach en ADR. |
| RLS mal diseñada filtra datos entre usuarios/orgs | Tests automatizados de RLS con usuarios de prueba de distintos roles. Defense in depth (front + back). |
| Migración de IndexedDB UAT a Postgres pierde data | Import dry-run + diff antes de commit. Backup JSON completo antes de tocar. |
| Supabase tier gratis se queda corto | Monitoreo desde el día 1. Plan de migración a tier $25/mes documentado antes de necesitarlo. |
| Coordinador rechaza el modelo de sync supervisado | Validar UX de la bandeja con coordinador real antes de Fase 2.2. Si rechaza, hacer sync automático opcional default-on. |

---

## Fase 3 — Pulir producto

Post Fase 2. Sistema completo y multi-usuario; toca refinarlo.

- **Performance con volumen real**: 100k+ registros en producción, virtual scroll en todas las listas, web workers para métricas pesadas.
- **Accesibilidad**: Lighthouse a11y ≥ 95, navegación 100% teclado, lectores de pantalla testeados.
- **Hardening**: cobertura E2E del flujo completo, tests de RLS, audit de seguridad.
- **Docs para usuario final**: manual del coordinador, guía del asistente, videos cortos.
- **Capacitación**: material de onboarding para nuevos clientes.

---

## Fase 4 — Módulo de préstamos

**Bloqueado por investigación.** Requiere sesiones con el coordinador para entender:
- ¿Hay un sistema bibliotecario existente que catalogue libros? ¿API o exportable?
- Reglas de préstamo (días, renovaciones, máximo simultáneo por alumno).
- Política de multas (si aplica).
- Reservas (sí/no).
- Códigos de barras de libros (formato existente).

Sin esa investigación, cualquier estimación es ficción. **No diseñar aún.**

Cuando se inicie:
- Aprovechar que el alumno ya tiene cuenta (Fase 2.4) — los préstamos van a su perfil.
- Reusar el scanner para escanear libros además de matrículas.
- Si hay sistema bibliotecario existente, integrarse vía adapter en lugar de reemplazarlo.

---

## Fase 5 — Comercialización

Distribuir a otras universidades. Bloqueada hasta que esté completo:

- [ ] Multi-tenant real (UI de organizaciones, no solo schema preparado).
- [ ] Calendario escolar configurable (`docs/ESTADO.md` §2.2).
- [ ] Catálogos editables (`CARRERAS`, `TURNOS`, `GRADOS`, `GRUPOS` — `docs/ESTADO.md` §2.3.1).
- [ ] Branding por institución (logo, colores, nombre en reportes PDF/Excel).
- [ ] Formato de matrícula configurable por organización.
- [ ] Plan de licenciamiento (precio, tiers, soporte incluido).
- [ ] Plan de capacitación para nuevos clientes.
- [ ] Documentación de instalación / onboarding para el equipo de TI de la institución.
- [ ] Versión demo limitada (en tiempo o volumen) como estrategia comercial.

Cualquier feature de Fase 5 requiere que el cliente confirme — somos prestadores de servicio, no dueños del proceso bibliotecario de nadie.

---

## Principios transversales (válidos en todas las fases)

1. **Offline-first es innegociable.** Cualquier feature debe degradar elegantemente sin Internet.
2. **El cliente manda sobre los defaults.** Si el coordinador quiere `umbralDuplicadoMin = 1`, el sistema lo respeta (ver `feedback_flexibilidad` en CLAUDE.md).
3. **Defense in depth.** Las restricciones de roles viven en BD (RLS) **y** en UI. Nunca confíes solo en una capa.
4. **Idempotencia siempre.** Cualquier operación de sync, import, batch debe poder reintentarse sin duplicar.
5. **Retrocompatibilidad de datos.** Nunca rompas formato de datos existente sin migración explícita. Ver `Registro.motivoId` vs `motivoIds[]` como ejemplo.
6. **Documenta el porqué, no el qué.** El código dice qué hace; los docs (este, DEVLOG, ADRs) dicen por qué.

---

## Cómo usar este documento

- **Al planear una fase nueva**: validar que sigue alineada con la visión de arriba. Si no, actualizar la visión primero (decisión consciente, no drift).
- **Al tomar una decisión arquitectónica importante**: crear un ADR en `docs/adr/` y enlazarlo aquí.
- **Al cambiar el orden de fases o eliminar una**: registrar el motivo en `DEVLOG.md` y actualizar este doc en la misma tanda.
- **Al detectar que una estimación fue muy errónea**: actualizar la estimación y anotar en DEVLOG qué subestimamos para calibrar futuros estimados.
