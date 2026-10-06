-- ============================================================
-- 0008_salida_estimada.sql
-- Stenbrary — Auditoría de estadísticas 2026-10, decisión P3
--
-- Problema: cuando el sistema cierra una entrada por tiempo (o al
-- llegar la hora de cierre) INVENTA la hora de salida: guarda
-- exactamente el umbral (p. ej. 4 h) o hasta la hora de cierre. En
-- cuanto el personal confirma, `cierre_automatico` vuelve a false y esa
-- duración ya no se distingue de una medida. Entraba en el promedio de
-- permanencia, en las horas acumuladas y en la constancia PDF, que
-- certifica horas.
--
-- Decisión: una marca permanente `salida_estimada`. Confirmar significa
-- "visto", no "medido": la marca NO se borra al confirmar, solo cuando
-- alguien corrige la salida a mano con la hora real.
--
-- Filas existentes: quedan en false. No hay forma fiable de reconocer
-- las estimadas de antes (una visita real puede durar justo 4 h).
-- ============================================================

-- ---------- 1. Columna ------------------------------------------------------

alter table public.registros
  add column if not exists salida_estimada boolean not null default false;

comment on column public.registros.salida_estimada is
  'true si hora_salida la puso el sistema (cierre por tiempo u horario). Su duración no cuenta en promedios ni constancias.';

-- ---------- 2. crear_registro_completo con la nueva columna ----------------
-- Copia de la versión de 0004 + salida_estimada. Si el payload no la
-- trae (cliente viejo), queda en false.

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
    salida_estimada,
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
    coalesce((payload->'registro'->>'salida_estimada')::boolean, false),
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
    salida_estimada          = excluded.salida_estimada,
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
-- FIN — 0008_salida_estimada.sql
-- ============================================================
