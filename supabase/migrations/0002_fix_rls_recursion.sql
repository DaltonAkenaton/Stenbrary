-- ============================================================
-- 0002_fix_rls_recursion.sql
-- Stenbrary — Fase 2.0 (Fix de RLS recursiva en profiles_select)
--
-- BUG ORIGEN (en 0001_auth_foundation.sql):
-- La policy `profiles_select` evaluaba una subquery `select 1 from
-- user_profiles p where p.rol in (...)` dentro del USING clause. Esa
-- subquery también pasa por RLS de `user_profiles` → activa la misma
-- policy `profiles_select` recursivamente. Postgres detecta el bucle
-- y devuelve 500.
--
-- Síntoma observado: GET /rest/v1/user_profiles → 500. AuthService no
-- puede cargar el perfil, sesión queda en `signed-out` aunque haya JWT.
--
-- FIX: extraer el check a una función `security definer` (mismo patrón
-- que `is_super_admin()` y `current_organization_id()` ya creadas).
-- `security definer` bypasea RLS dentro de la función, rompiendo el
-- ciclo.
--
-- Defense in depth se mantiene: la función solo lee el rol del JWT
-- actual; no expone datos cruzados.
-- ============================================================

-- Helper: rol del usuario actualmente autenticado. NULL si no hay sesión.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.user_profiles where id = auth.uid();
$$;

-- Reemplazar policy con la versión sin subquery directa.
drop policy if exists "profiles_select" on public.user_profiles;
create policy "profiles_select"
  on public.user_profiles for select
  using (
    -- 1) Cada quien ve su propio perfil.
    id = auth.uid()
    -- 2) Super admin ve todo.
    or public.is_super_admin()
    -- 3) Coordinador ve todos los perfiles de su organización.
    or (
      organization_id = public.current_organization_id()
      and public.current_user_role() in ('coordinador', 'super_admin')
    )
  );

-- ============================================================
-- FIN — 0002_fix_rls_recursion.sql
-- ============================================================
