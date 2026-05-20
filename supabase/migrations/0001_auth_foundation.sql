-- ============================================================
-- 0001_auth_foundation.sql
-- Stenbrary — Fase 2.0 (Fundación de auth)
--
-- Crea el esqueleto mínimo para multi-usuario:
--   - tipo enum `user_role` con los 4 roles
--   - tabla `organizations` (single-tenant ahora, multi después)
--   - tabla `user_profiles` (perfil enriquecido sobre auth.users)
--   - trigger handle_new_user (autocrea perfil al registrarse)
--   - políticas RLS básicas
--
-- Convención: nullable organization_id desde el día 1 para que
-- super_admin pueda existir sin pertenecer a una organización
-- y para no romper el día que hagamos multi-tenant (Fase 2.5).
-- ============================================================

-- ---------- 1. Tipo de rol --------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'super_admin',
      'coordinador',
      'asistente',
      'alumno'
    );
  end if;
end$$;

-- ---------- 2. Organizaciones -----------------------------------------------

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant — institución que opera Stenbrary. Single-tenant en Fase 2.0; multi en Fase 2.5.';

-- ---------- 3. Perfiles de usuario ------------------------------------------

create table if not exists public.user_profiles (
  -- Mismo id que auth.users (1:1). On delete cascade para no dejar huérfanos.
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid references public.organizations(id) on delete set null,
  rol              public.user_role not null default 'asistente',
  nombre           text not null default '',
  -- Solo se llena cuando rol = 'alumno'. Enlace al `Alumno` local (matrícula).
  matricula        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_user_profiles_organization
  on public.user_profiles(organization_id);

create index if not exists idx_user_profiles_matricula
  on public.user_profiles(matricula)
  where matricula is not null;

comment on table public.user_profiles is
  'Datos de perfil que la app necesita además de auth.users (rol, org, matrícula).';

-- ---------- 4. updated_at automático ----------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ---------- 5. Auto-creación de perfil al registrarse -----------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 6. Row Level Security -------------------------------------------

alter table public.organizations  enable row level security;
alter table public.user_profiles  enable row level security;

-- Helper: ¿el usuario actual es super_admin?
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and rol = 'super_admin'
  );
$$;

-- Helper: organization_id del usuario actual.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.user_profiles where id = auth.uid();
$$;

-- ---- organizations ---------------------------------------------------------

drop policy if exists "org_select_own" on public.organizations;
create policy "org_select_own"
  on public.organizations for select
  using (
    public.is_super_admin()
    or id = public.current_organization_id()
  );

-- Solo super_admin crea organizaciones (en Fase 2.5 esto se relaja).
drop policy if exists "org_insert_super_admin" on public.organizations;
create policy "org_insert_super_admin"
  on public.organizations for insert
  with check (public.is_super_admin());

drop policy if exists "org_update_super_admin" on public.organizations;
create policy "org_update_super_admin"
  on public.organizations for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---- user_profiles ---------------------------------------------------------

-- Lectura: el usuario ve su propio perfil; el coordinador ve los de su org;
-- el super_admin ve todo.
drop policy if exists "profiles_select" on public.user_profiles;
create policy "profiles_select"
  on public.user_profiles for select
  using (
    id = auth.uid()
    or public.is_super_admin()
    or (
      organization_id = public.current_organization_id()
      and exists (
        select 1 from public.user_profiles p
        where p.id = auth.uid() and p.rol in ('coordinador', 'super_admin')
      )
    )
  );

-- Actualización: cada quien puede editar su propio perfil (excepto rol/org —
-- eso requiere policy adicional aplicada vía coordinador, viene en Fase 2.3).
drop policy if exists "profiles_update_self" on public.user_profiles;
create policy "profiles_update_self"
  on public.user_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Insert manual (raro — normalmente lo hace el trigger). Solo super_admin.
drop policy if exists "profiles_insert_super_admin" on public.user_profiles;
create policy "profiles_insert_super_admin"
  on public.user_profiles for insert
  with check (public.is_super_admin());

-- ============================================================
-- FIN — 0001_auth_foundation.sql
-- Próxima migration: 0002_data_tables.sql (alumnos, registros, motivos).
-- ============================================================
