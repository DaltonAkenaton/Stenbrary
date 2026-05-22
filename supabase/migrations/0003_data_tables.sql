-- ============================================================
-- 0003_data_tables.sql
-- Stenbrary — Fase 2.1 (Modelo de datos espejo)
--
-- Crea las tablas espejo de IndexedDB en Postgres:
--   - motivos
--   - alumnos
--   - registros
--   - registro_motivos (join table — múltiples motivos por registro)
--
-- Convenciones:
--   - Tipos relacionales correctos (uuid, timestamptz, jsonb).
--   - `organization_id` nullable desde el día 1 (single→multi-tenant).
--   - Denormalizamos snapshots en `registros` (matricula, nombre,
--     carrera, motivo_principal_nombre, turno) para que los reportes
--     históricos sigan correctos aunque el alumno/motivo cambie luego.
--   - `unique nulls not distinct` en matricula para que organization_id
--     null funcione como un tenant más (PG 15+).
--   - RLS habilitada con policies basadas en organization_id +
--     super_admin. Usamos `is not distinct from` para que null = null.
--   - Función `crear_registro_completo()` security definer para insert
--     atómico de registro + motivos (sin transacciones HTTP).
--
-- Lección aprendida en 0002: NUNCA hacer subquery directa a la misma
-- tabla dentro del USING de su RLS. Por eso registro_motivos lleva
-- su propio organization_id (snapshot) en vez de joinear con registros.
-- ============================================================

-- ---------- Helpers nuevos --------------------------------------------------

-- Pega los IDs sobre la fila si vienen null (al insertar). Esto evita
-- que el cliente tenga que recordar setearlos cada vez.
create or replace function public.set_organization_id_from_auth()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
  end if;
  return new;
end;
$$;

-- ---------- 1. motivos ------------------------------------------------------

create table if not exists public.motivos (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,
  nombre           text not null,
  descripcion      text,
  icono            text not null default 'help_outline',
  color            text,
  orden            integer not null default 0,
  activo           boolean not null default true,
  fecha_creacion   timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists motivos_nombre_unq
  on public.motivos (organization_id, lower(nombre))
  nulls not distinct;

create index if not exists motivos_orden_idx on public.motivos (organization_id, orden);

drop trigger if exists trg_motivos_updated_at on public.motivos;
create trigger trg_motivos_updated_at
  before update on public.motivos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_motivos_set_org on public.motivos;
create trigger trg_motivos_set_org
  before insert on public.motivos
  for each row execute function public.set_organization_id_from_auth();

comment on table public.motivos is
  'Catálogo de motivos de visita. Único por organización (case-insensitive).';

-- ---------- 2. alumnos ------------------------------------------------------

-- Enum de turno reutilizable.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'turno_enum') then
    create type public.turno_enum as enum ('Matutino', 'Vespertino', 'Mixto');
  end if;
end$$;

create table if not exists public.alumnos (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid references public.organizations(id) on delete cascade,
  matricula             text not null,
  nombre                text not null,
  apellido_paterno      text not null default '',
  apellido_materno      text not null default '',
  carrera               text not null,
  grado                 smallint not null default 1,
  grupo                 text not null default '',
  turno                 public.turno_enum not null default 'Matutino',
  activo                boolean not null default true,
  fecha_registro        timestamptz not null default now(),
  fecha_actualizacion   timestamptz not null default now(),
  -- Opcionales extensibles (v3.3 del modelo TS).
  email                 text,
  telefono              text,
  notas                 text,
  -- Campos personalizados de la coordinadora.
  datos_extra           jsonb not null default '{}'::jsonb
);

create unique index if not exists alumnos_matricula_unq
  on public.alumnos (organization_id, matricula)
  nulls not distinct;

create index if not exists alumnos_carrera_idx on public.alumnos (organization_id, carrera);
create index if not exists alumnos_activo_idx on public.alumnos (organization_id, activo);

drop trigger if exists trg_alumnos_updated_at on public.alumnos;
create trigger trg_alumnos_updated_at
  before update on public.alumnos
  for each row execute function public.set_updated_at();

-- Para alumnos no usamos set_updated_at en `fecha_actualizacion`;
-- mantenemos `updated_at` interno + lo mapeamos a `fechaActualizacion`
-- desde el adapter. Mantenemos el nombre en SQL como `fecha_actualizacion`
-- para alinear con el modelo TS.
create or replace function public.set_alumno_fecha_actualizacion()
returns trigger
language plpgsql
as $$
begin
  new.fecha_actualizacion := now();
  return new;
end;
$$;

drop trigger if exists trg_alumnos_fecha_act on public.alumnos;
create trigger trg_alumnos_fecha_act
  before update on public.alumnos
  for each row execute function public.set_alumno_fecha_actualizacion();

drop trigger if exists trg_alumnos_set_org on public.alumnos;
create trigger trg_alumnos_set_org
  before insert on public.alumnos
  for each row execute function public.set_organization_id_from_auth();

comment on table public.alumnos is
  'Alumnos registrados. Matrícula única por organización.';

-- ---------- 3. registros ----------------------------------------------------

create table if not exists public.registros (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid references public.organizations(id) on delete cascade,
  alumno_id                 uuid not null references public.alumnos(id) on delete cascade,
  -- Snapshots denormalizados (intencional). Razón: si renombran al alumno
  -- o cambian su carrera, los reportes históricos siguen mostrando lo
  -- que era cuando el registro se creó.
  matricula                 text not null,
  nombre_completo           text not null,
  carrera                   text not null,
  turno                     public.turno_enum,
  -- Motivo principal (retrocompat con el modelo TS actual).
  motivo_principal_id       uuid references public.motivos(id) on delete set null,
  motivo_principal_nombre   text not null default '',
  fecha_hora                timestamptz not null default now(),
  hora_salida               timestamptz,
  -- Duración calculada por la BD vía trigger (ver abajo). No usamos
  -- generated column porque la resta `timestamptz - timestamptz` no es
  -- IMMUTABLE para Postgres (depende de zona horaria) — la transacción
  -- aborta completa al intentar crear la tabla. Trigger es portable.
  duracion_minutos          integer,
  cierre_automatico         boolean not null default false,
  dispositivo               text,
  -- Auditoría: quién creó el registro (puede ser null si vino sin sesión).
  creado_por                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists registros_alumno_idx on public.registros (alumno_id, fecha_hora desc);
create index if not exists registros_matricula_idx on public.registros (organization_id, matricula);
create index if not exists registros_fecha_idx on public.registros (organization_id, fecha_hora desc);
create index if not exists registros_abiertos_idx on public.registros (organization_id, hora_salida)
  where hora_salida is null;

-- Trigger que calcula `duracion_minutos` antes de insert/update. Reemplaza
-- a la generated column (ver comentario en la definición de la tabla).
create or replace function public.set_registro_duracion()
returns trigger
language plpgsql
as $$
begin
  if new.hora_salida is not null and new.hora_salida > new.fecha_hora then
    new.duracion_minutos := (extract(epoch from (new.hora_salida - new.fecha_hora)) / 60)::integer;
  else
    new.duracion_minutos := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registros_duracion on public.registros;
create trigger trg_registros_duracion
  before insert or update of fecha_hora, hora_salida on public.registros
  for each row execute function public.set_registro_duracion();

drop trigger if exists trg_registros_updated_at on public.registros;
create trigger trg_registros_updated_at
  before update on public.registros
  for each row execute function public.set_updated_at();

drop trigger if exists trg_registros_set_org on public.registros;
create trigger trg_registros_set_org
  before insert on public.registros
  for each row execute function public.set_organization_id_from_auth();

comment on table public.registros is
  'Registros de acceso (entrada/salida). Snapshots denormalizados de alumno/motivo intencionales para reportes históricos.';

-- ---------- 4. registro_motivos (join table múltiples motivos) ------------

create table if not exists public.registro_motivos (
  registro_id              uuid not null references public.registros(id) on delete cascade,
  motivo_id                uuid not null references public.motivos(id) on delete cascade,
  -- Snapshot denormalizado: si renombran el motivo después, los reportes
  -- históricos siguen mostrando lo que se eligió en su momento.
  motivo_nombre_snapshot   text not null,
  -- Orden dentro del registro (0 = primero seleccionado).
  orden                    smallint not null default 0,
  -- Snapshot de organización para que la RLS no tenga que joinear con
  -- registros (esto previene cualquier riesgo de recursión RLS y baja
  -- el costo de la verificación).
  organization_id          uuid references public.organizations(id) on delete cascade,
  primary key (registro_id, motivo_id)
);

create index if not exists registro_motivos_motivo_idx
  on public.registro_motivos (organization_id, motivo_id);

comment on table public.registro_motivos is
  'Motivos seleccionados por registro (N:M). organization_id duplicado intencionalmente para simplificar RLS.';

-- ---------- 5. Función atómica `crear_registro_completo` -------------------

-- Inserta un registro + sus motivos en una sola transacción. Evita
-- inconsistencias si el cliente cae a mitad del flujo (registro sin
-- motivos, o motivos huérfanos sin su registro).
--
-- Recibe un jsonb con la forma:
--   {
--     "registro": { ...campos de registros... },
--     "motivos":  [ { "motivo_id": "...", "nombre_snapshot": "...", "orden": 0 }, ... ]
--   }
--
-- Retorna el id del registro creado.

create or replace function public.crear_registro_completo(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_registro_id  uuid;
  v_org_id       uuid;
  v_motivo       jsonb;
begin
  -- 1) Upsert del registro principal. Idempotente por id — re-correr el
  --    importador no duplica ni explota. RLS aplica (security invoker).
  insert into public.registros (
    id,
    organization_id,
    alumno_id,
    matricula,
    nombre_completo,
    carrera,
    turno,
    motivo_principal_id,
    motivo_principal_nombre,
    fecha_hora,
    hora_salida,
    cierre_automatico,
    dispositivo,
    creado_por
  )
  select
    coalesce((payload->'registro'->>'id')::uuid, gen_random_uuid()),
    nullif(payload->'registro'->>'organization_id', '')::uuid,
    (payload->'registro'->>'alumno_id')::uuid,
    payload->'registro'->>'matricula',
    payload->'registro'->>'nombre_completo',
    payload->'registro'->>'carrera',
    nullif(payload->'registro'->>'turno', '')::public.turno_enum,
    nullif(payload->'registro'->>'motivo_principal_id', '')::uuid,
    coalesce(payload->'registro'->>'motivo_principal_nombre', ''),
    coalesce(
      (payload->'registro'->>'fecha_hora')::timestamptz,
      now()
    ),
    nullif(payload->'registro'->>'hora_salida', '')::timestamptz,
    coalesce((payload->'registro'->>'cierre_automatico')::boolean, false),
    payload->'registro'->>'dispositivo',
    auth.uid()
  on conflict (id) do update set
    matricula                = excluded.matricula,
    nombre_completo          = excluded.nombre_completo,
    carrera                  = excluded.carrera,
    turno                    = excluded.turno,
    motivo_principal_id      = excluded.motivo_principal_id,
    motivo_principal_nombre  = excluded.motivo_principal_nombre,
    fecha_hora               = excluded.fecha_hora,
    hora_salida              = excluded.hora_salida,
    cierre_automatico        = excluded.cierre_automatico,
    dispositivo              = excluded.dispositivo,
    updated_at               = now()
  returning id, organization_id into v_registro_id, v_org_id;

  -- 2) Insertar cada motivo de la lista. El trigger de set_organization_id
  --    no aplica aquí (no existe en registro_motivos); pasamos el org
  --    del registro padre.
  for v_motivo in select * from jsonb_array_elements(coalesce(payload->'motivos', '[]'::jsonb))
  loop
    insert into public.registro_motivos (
      registro_id,
      motivo_id,
      motivo_nombre_snapshot,
      orden,
      organization_id
    )
    values (
      v_registro_id,
      (v_motivo->>'motivo_id')::uuid,
      v_motivo->>'nombre_snapshot',
      coalesce((v_motivo->>'orden')::smallint, 0),
      v_org_id
    )
    on conflict (registro_id, motivo_id) do update set
      motivo_nombre_snapshot = excluded.motivo_nombre_snapshot,
      orden                  = excluded.orden;
  end loop;

  return v_registro_id;
end;
$$;

comment on function public.crear_registro_completo(jsonb) is
  'Insert atómico de registro + motivos. Recibe payload {registro, motivos[]}.';

-- ---------- 6. Row Level Security -----------------------------------------

alter table public.motivos          enable row level security;
alter table public.alumnos          enable row level security;
alter table public.registros        enable row level security;
alter table public.registro_motivos enable row level security;

-- Policy genérica reutilizable: el usuario ve/edita filas de su organization
-- (o todas si super_admin). Usamos `is not distinct from` para tratar null=null.
-- No usamos subqueries a la misma tabla en USING (lección de 0002).

-- ----- motivos -----
drop policy if exists "motivos_select" on public.motivos;
create policy "motivos_select" on public.motivos for select
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id());

drop policy if exists "motivos_insert" on public.motivos;
create policy "motivos_insert" on public.motivos for insert
  with check (public.is_super_admin()
              or organization_id is not distinct from public.current_organization_id());

drop policy if exists "motivos_update" on public.motivos;
create policy "motivos_update" on public.motivos for update
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id())
  with check (public.is_super_admin()
              or organization_id is not distinct from public.current_organization_id());

drop policy if exists "motivos_delete" on public.motivos;
create policy "motivos_delete" on public.motivos for delete
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id());

-- ----- alumnos -----
drop policy if exists "alumnos_select" on public.alumnos;
create policy "alumnos_select" on public.alumnos for select
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id());

drop policy if exists "alumnos_insert" on public.alumnos;
create policy "alumnos_insert" on public.alumnos for insert
  with check (public.is_super_admin()
              or organization_id is not distinct from public.current_organization_id());

drop policy if exists "alumnos_update" on public.alumnos;
create policy "alumnos_update" on public.alumnos for update
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id())
  with check (public.is_super_admin()
              or organization_id is not distinct from public.current_organization_id());

drop policy if exists "alumnos_delete" on public.alumnos;
create policy "alumnos_delete" on public.alumnos for delete
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id());

-- ----- registros -----
drop policy if exists "registros_select" on public.registros;
create policy "registros_select" on public.registros for select
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id());

drop policy if exists "registros_insert" on public.registros;
create policy "registros_insert" on public.registros for insert
  with check (public.is_super_admin()
              or organization_id is not distinct from public.current_organization_id());

drop policy if exists "registros_update" on public.registros;
create policy "registros_update" on public.registros for update
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id())
  with check (public.is_super_admin()
              or organization_id is not distinct from public.current_organization_id());

drop policy if exists "registros_delete" on public.registros;
create policy "registros_delete" on public.registros for delete
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id());

-- ----- registro_motivos -----
drop policy if exists "registro_motivos_select" on public.registro_motivos;
create policy "registro_motivos_select" on public.registro_motivos for select
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id());

drop policy if exists "registro_motivos_insert" on public.registro_motivos;
create policy "registro_motivos_insert" on public.registro_motivos for insert
  with check (public.is_super_admin()
              or organization_id is not distinct from public.current_organization_id());

drop policy if exists "registro_motivos_update" on public.registro_motivos;
create policy "registro_motivos_update" on public.registro_motivos for update
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id())
  with check (public.is_super_admin()
              or organization_id is not distinct from public.current_organization_id());

drop policy if exists "registro_motivos_delete" on public.registro_motivos;
create policy "registro_motivos_delete" on public.registro_motivos for delete
  using (public.is_super_admin()
         or organization_id is not distinct from public.current_organization_id());

-- ============================================================
-- FIN — 0003_data_tables.sql
-- Próximas migrations:
--   0004 — sync metadata (Fase 2.2)
--   0005 — roles refinados (Fase 2.3)
-- ============================================================
