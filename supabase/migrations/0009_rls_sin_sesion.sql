-- ============================================================
-- 0009_rls_sin_sesion.sql
-- Stenbrary — Corrección de seguridad de las políticas de datos
--
-- EL DEFECTO (encontrado en la auditoría de 2026-10-27)
-- Las políticas de 0003 comparaban
--     organization_id is not distinct from current_organization_id()
-- para que el modo de una sola institución (organization_id NULL)
-- funcionara. Pero `current_organization_id()` también es NULL cuando
-- NO hay sesión, y `NULL is not distinct from NULL` es verdadero:
--   1. Con solo la URL y la llave publicable (rol `anon`) se podía leer,
--      modificar y borrar alumnos, visitas y motivos.
--   2. Cualquier cuenta creada por su cuenta (magic link) nacía como
--      `asistente` y las políticas no revisaban el rol: mismo acceso.
--
-- LA CORRECCIÓN
--   a. `anon` pierde todo privilegio sobre las tablas de datos y la
--      función de alta: sin sesión la base responde "permission denied".
--   b. Las políticas pasan a `to authenticated` y exigen rol de personal
--      (super_admin, coordinador o asistente) además de la organización.
--   c. Una cuenta nueva nace como `alumno` (sin acceso a datos). Un
--      coordinador la promueve con `set_user_role` (0006).
--
-- El modo de una sola institución (organization_id NULL) se conserva:
-- la comparación con NULL sigue, pero ya solo la alcanza personal con
-- sesión. Las pruebas están en supabase/tests/database/.
-- ============================================================

-- ---------- a. Sin sesión, sin privilegios ---------------------------------

revoke all on public.motivos, public.alumnos, public.registros, public.registro_motivos
  from anon;

revoke execute on function public.crear_registro_completo(jsonb) from public, anon;
grant  execute on function public.crear_registro_completo(jsonb) to authenticated;

-- ---------- c. Las cuentas nuevas no nacen con rol de personal -------------

alter table public.user_profiles alter column rol set default 'alumno';

-- ---------- b. Políticas: sesión + rol de personal + organización ---------

-- security definer por la misma razón que current_user_role() (0002): leer
-- user_profiles dentro de una política no debe volver a pasar por su RLS.
create or replace function public.es_personal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('super_admin', 'coordinador', 'asistente'),
    false
  );
$$;

-- Las cuatro tablas llevan exactamente la misma regla; se generan en un
-- bucle para que no puedan divergir. Los `(select ...)` hacen que Postgres
-- evalúe cada función una vez por consulta y no una vez por fila.
do $$
declare
  t    text;
  cond text := '(select public.es_personal()) and ('
            || '(select public.is_super_admin()) '
            || 'or organization_id is not distinct from (select public.current_organization_id()))';
begin
  foreach t in array array['motivos', 'alumnos', 'registros', 'registro_motivos'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);

    execute format('create policy %I on public.%I for select to authenticated using (%s)',
                   t || '_select', t, cond);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
                   t || '_insert', t, cond);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
                   t || '_update', t, cond, cond);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)',
                   t || '_delete', t, cond);
  end loop;
end
$$;
