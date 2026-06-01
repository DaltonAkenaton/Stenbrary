-- ============================================================
-- 0006_user_management.sql
-- Stenbrary — Fase 2.3.x (Gestión de usuarios desde /usuarios)
--
-- Permite al coordinador asignar roles sin SQL, desde la UI.
--
-- Incluye:
--   1. Columna `email` en user_profiles (para identificar usuarios en
--      la UI — auth.users no es legible por el cliente). Backfill +
--      trigger actualizado.
--   2. RPC `set_user_role` (security definer) con salvaguardas
--      anti-escalación. Es el ÚNICO camino para cambiar roles desde
--      el cliente.
--   3. Cierre del hueco de auto-escalación: se revoca a `authenticated`
--      el UPDATE sobre las columnas rol/organization_id, de modo que
--      nadie pueda promoverse a sí mismo editando su propio perfil.
--   4. profiles_select tolerante a organization_id NULL (single-tenant):
--      coordinador ve a sus pares aunque ambos tengan org NULL.
--
-- IMPORTANTE: aplicar en el SQL Editor de Supabase (proyecto dev) y
-- correr el plan de pruebas de seguridad del DEVLOG antes de confiar.
-- ============================================================

-- ---------- 1. Columna email -----------------------------------------------

alter table public.user_profiles
  add column if not exists email text;

-- Backfill desde auth.users (una sola vez).
update public.user_profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

-- El trigger de alta ahora también guarda el email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, nombre, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------- 2. profiles_select tolerante a org NULL ------------------------
-- En single-tenant (Fase 2.x) los perfiles tienen organization_id NULL.
-- `NULL = NULL` es NULL (falsy) → un coordinador con org NULL no vería a
-- sus pares. `is not distinct from` trata NULL=NULL como verdadero.
-- En multi-tenant (Fase 2.5) todos tendrán org real y esto no aplica.

drop policy if exists "profiles_select" on public.user_profiles;
create policy "profiles_select"
  on public.user_profiles for select
  using (
    id = auth.uid()
    or public.is_super_admin()
    or (
      organization_id is not distinct from public.current_organization_id()
      and public.current_user_role() in ('coordinador', 'super_admin')
    )
  );

-- ---------- 3. Cerrar auto-escalación --------------------------------------
-- profiles_update_self (de 0001) deja a cada quien editar su propio perfil,
-- pero sin restricción de columnas → cualquiera podría hacer
-- `update user_profiles set rol='super_admin' where id=auth.uid()`.
-- Revocamos el UPDATE de las columnas sensibles a `authenticated`: los
-- roles solo se cambian vía la RPC `set_user_role` (security definer, que
-- corre como dueño y no está sujeta a este revoke).

revoke update (rol, organization_id) on public.user_profiles from authenticated;

-- ---------- 4. RPC set_user_role -------------------------------------------

create or replace function public.set_user_role(
  target_id uuid,
  nuevo_rol public.user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_rol public.user_role;
  caller_org uuid;
  target_rol public.user_role;
  target_org uuid;
begin
  select rol, organization_id into caller_rol, caller_org
    from public.user_profiles where id = auth.uid();

  if caller_rol is null then
    raise exception 'No autenticado o sin perfil.';
  end if;

  -- super_admin: poder total.
  if caller_rol = 'super_admin' then
    update public.user_profiles set rol = nuevo_rol where id = target_id;
    return;
  end if;

  -- A partir de aquí solo coordinador.
  if caller_rol <> 'coordinador' then
    raise exception 'No autorizado para cambiar roles.';
  end if;

  select rol, organization_id into target_rol, target_org
    from public.user_profiles where id = target_id;

  if target_rol is null then
    raise exception 'Usuario no encontrado.';
  end if;
  if target_org is distinct from caller_org then
    raise exception 'No puedes editar usuarios de otra organización.';
  end if;
  if target_rol = 'super_admin' or nuevo_rol = 'super_admin' then
    raise exception 'No puedes asignar ni modificar el rol super_admin.';
  end if;
  if target_id = auth.uid() then
    raise exception 'No puedes cambiar tu propio rol.';
  end if;

  update public.user_profiles set rol = nuevo_rol where id = target_id;
end;
$$;

revoke all on function public.set_user_role(uuid, public.user_role) from public;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;

-- ============================================================
-- FIN — 0006_user_management.sql
-- ============================================================
