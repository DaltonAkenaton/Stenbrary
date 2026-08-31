-- ============================================================
-- 0007_user_profiles_email.sql
-- Stenbrary — Fase 2.3
--
-- Problema: `/usuarios` consultaba `user_profiles.email`, columna que
-- nunca existió. La pantalla fallaba con "column user_profiles.email
-- does not exist" y no listaba a nadie.
--
-- El correo vive en `auth.users`, que el cliente anónimo NO puede leer
-- (ni debe: expondría el padrón completo de cuentas). Así que se
-- denormaliza a `user_profiles`, protegido por las RLS que ya existen.
--
-- Denormalizar es deliberado: el correo es EL identificador que el
-- coordinador reconoce al asignar roles. Sin él, la tabla muestra
-- nombres derivados como "dalton.akenaton" y no hay forma de saber a
-- quién se le está dando permiso — justo el momento en el que un error
-- se paga caro.
-- ============================================================

-- ---------- 1. Columna ------------------------------------------------------

alter table public.user_profiles
  add column if not exists email text;

-- ---------- 2. Backfill -----------------------------------------------------
-- Los perfiles ya creados no tienen correo. Se copian desde auth.users.

update public.user_profiles p
set    email = u.email
from   auth.users u
where  u.id = p.id
  and  p.email is distinct from u.email;

-- ---------- 3. Mantenerla al día --------------------------------------------
-- El trigger ya existía; se amplía para incluir el correo en altas nuevas.

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
  on conflict (id) do update
    -- `do nothing` dejaría sin correo a un perfil creado antes de esta
    -- migración que vuelva a pasar por aquí.
    set email = excluded.email
    where public.user_profiles.email is null;
  return new;
end;
$$;

-- Un correo que cambia en auth.users debe reflejarse en el perfil; si no,
-- la tabla de /usuarios muestra un dato viejo y se asignan roles a ciegas.
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
     set email = new.email
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_email_updated on auth.users;
create trigger trg_on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_user_email();

-- ---------- 4. Índice -------------------------------------------------------
-- `/usuarios` ordena por correo.

create index if not exists idx_user_profiles_email
  on public.user_profiles(email);
