-- ============================================================
-- 0004_invitados_alumno_nullable.sql
-- Stenbrary — Fase 2.1 (Soporte de registros de invitados)
--
-- BUG ORIGEN (al correr el importador one-shot):
-- Los registros del flujo "acceso invitado" tienen `alumnoId`
-- como string sintético `invitado-<timestamp>` (ver CLAUDE.md).
-- Al intentar castearlo a uuid en `crear_registro_completo`,
-- Postgres falla con 22P02 ("invalid input syntax for type uuid").
--
-- DECISIÓN:
-- `alumno_id` pasa a ser nullable. Cuando el registro es de un
-- invitado, queda null. Los snapshots (matricula='INVITADO',
-- nombre_completo, carrera) ya guardan toda la info necesaria
-- para reportes históricos.
--
-- DEFENSA EN PROFUNDIDAD:
-- Reescribimos `crear_registro_completo` para usar nullif sobre
-- los IDs que vienen como string vacío, de modo que el cliente
-- pueda enviar tanto null como '' sin causar 22P02.
-- ============================================================

-- ---------- 1. alumno_id nullable ------------------------------------------

alter table public.registros
  alter column alumno_id drop not null;

comment on column public.registros.alumno_id is
  'FK al alumno. NULL solo para registros del flujo "acceso invitado" (matricula=INVITADO). Los snapshots de la fila guardan la info para reportes.';

-- ---------- 2. Reescribir crear_registro_completo con saneo de IDs ---------

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
    coalesce(nullif(payload->'registro'->>'id', '')::uuid, gen_random_uuid()),
    nullif(payload->'registro'->>'organization_id', '')::uuid,
    -- alumno_id puede venir null o '' (invitados). nullif lo neutraliza.
    nullif(payload->'registro'->>'alumno_id', '')::uuid,
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

-- ============================================================
-- FIN — 0004_invitados_alumno_nullable.sql
-- ============================================================
