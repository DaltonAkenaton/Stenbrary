# ADR 0001 — Supabase como fundación de auth y backend

- **Estado:** Aceptado
- **Fecha:** 2026-05-19
- **Contexto fase:** 2.0 (fundación de auth) — primera decisión arquitectónica de Fase 2

## Contexto

Stenbrary cierra Fase 1 con una PWA offline-first que persiste todo en
IndexedDB. Para arrancar Fase 2 (multi-usuario + sync supervisado)
necesitamos un backend con:

- Auth de usuarios (correo + magic link como primer flow).
- Postgres (modelo relacional encaja con `alumnos / registros / motivos`).
- Row-Level Security (RLS) para defender datos entre orgs sin confiar solo
  en la UI.
- SDK cliente que funcione bien en SPA Angular y juegue con offline-first.
- Tier gratis suficiente para validar con un cliente real antes de pagar.

## Decisión

Adoptamos **Supabase** como backend único de Fase 2 (Postgres + Auth +
Storage + Realtime + Edge Functions).

### Sub-decisiones tomadas

1. **PKCE flow** para la SPA (más seguro que implicit grant). Configurado
   en `supabase.client.ts`.
2. **Sesión persistida en localStorage** con clave custom `stenbrary-auth`
   para evitar conflictos con otras apps en mismo dominio.
3. **Storage key separado** del default — facilita debug y "logout total"
   si hace falta.
4. **`organization_id` nullable en todas las tablas desde el día 1.** Aún
   somos single-tenant pero el schema ya soporta multi sin migración
   dolorosa (Fase 2.5).
5. **Trigger `handle_new_user`** crea automáticamente un `user_profiles`
   al registrarse — evita estado inconsistente entre `auth.users` y
   nuestro schema.
6. **RLS habilitada desde la primera migration** — no esperar a tener
   datos sensibles. Defense in depth: front esconde, back deniega.
7. **Tipo enum `user_role`** en lugar de tabla `roles` separada. Solo 4
   valores y son fijos por diseño — el enum es más simple, más rápido
   en queries y obliga a actualizar migration para añadir roles
   (intencionalmente fricción).
8. **`environment.supabase` vacío = modo solo-local.** La app sigue 100%
   funcional contra IndexedDB sin Supabase configurado. Esto desbloquea:
   - desarrollo sin red,
   - clientes en sites sin internet permanente,
   - migración gradual (Fase 2.0 → 2.5 sin big-bang).

## Alternativas consideradas

### Firebase (Firestore + Auth)
- ✗ Modelo NoSQL obliga a denormalizar `alumnos → registros → motivos`.
- ✗ Queries de `EstadisticasAvanzadasService` (joins, agregaciones)
  exigen colecciones derivadas mantenidas a mano o Cloud Functions.
- ✗ Multi-tenant en Firestore = security rules complejas + más lecturas.
- ✗ Costo escala mal con muchas lecturas (caso real: dashboards).
- ✓ Onboarding más rápido si nunca tocaste Postgres.

### Backend propio (Node + Postgres + Auth0/lucia-auth)
- ✗ 2–3 meses adicionales antes de tocar feature funcional.
- ✗ Hosting, CI, observability — todo a operar.
- ✗ Auth implementado a mano = superficie de bugs de seguridad.
- ✓ Control total.

### PocketBase / Appwrite
- ✗ Ecosistema más chico, menos docs y community.
- ✗ Self-hosted obliga a operar infra (descartado por contexto del usuario:
  estudiante sin presupuesto cloud).

### Decisión
Supabase porque maximiza el ratio funcionalidad/tiempo en este contexto.
SQL + RLS también son skills transferibles profesionalmente — fuera del
proyecto el aprendizaje sigue rindiendo.

## Consecuencias

### Positivas
- Schema relacional honest desde el día 1.
- RLS permite defender datos sin escribir middleware custom.
- `supabase-js` integra magic link, refresh, listeners reactivos sin
  reinventar.
- Edge Functions disponibles para Fase 2.4 (envío de magic link a correo
  institucional con dominio whitelist).
- Coexistencia limpia con offline-first — `RemoteDatabaseService` será
  un adapter con la misma interfaz que el `DatabaseService` actual.

### Negativas / riesgos
- Tier gratis tiene límites (500 MB DB, 50K MAU, 1 GB storage). **Mitigación:**
  monitorear desde el día 1; plan de migración a tier $25/mes documentado
  antes de necesitarlo.
- Dependencia de un vendor único para auth + DB + storage. **Mitigación:**
  el schema es Postgres estándar; un éxodo a backend propio sería molesto
  pero no rompedor (data se exporta vía `pg_dump`).
- Aprender RLS bien toma tiempo y los bugs son silenciosos. **Mitigación:**
  tests automatizados de RLS con usuarios de prueba de distintos roles
  (en sub-fase 2.3 cuando los roles tomen forma).
- `supabase-js` añade ~120 KB al bundle. **Mitigación:** lazy load del
  módulo de auth (solo en `/login`, `/usuarios`, `/sincronizacion`).

## Referencias

- `docs/ROADMAP.md` §Fase 2 — sub-fases y estimación.
- `supabase/migrations/0001_auth_foundation.sql` — schema inicial.
- `src/app/core/auth/supabase.client.ts` — singleton del cliente.
- `src/app/core/auth/auth.types.ts` — tipos compartidos.

## Próximos ADRs esperados

- **0002** — Diseño del `RemoteDatabaseService` adapter (Fase 2.1).
- **0003** — Estrategia de sync supervisado y resolución de conflictos
  (Fase 2.2 — recomendar spike de 1 semana antes).
