-- ============================================================
-- 01_sin_sesion.test.sql
-- Sin sesión iniciada (rol `anon`, el de la llave publicable) la base
-- tiene que rechazar cualquier lectura o escritura de datos.
--
-- Con 0003–0008 falla: las políticas comparaban
-- `organization_id is not distinct from current_organization_id()`,
-- y sin sesión ambos lados son NULL → verdadero. La 0009 lo corrige.
--
-- Correr: npx supabase test db
-- ============================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- ---------- Datos sembrados (como dueño de las tablas, sin RLS) ------------
-- organization_id NULL: es como guarda los datos el modo de una sola
-- institución, justo el caso que exponía el defecto.
insert into public.motivos (id, nombre) values
  ('00000000-0000-0000-0000-0000000000a1', 'Estudiar'),
  ('00000000-0000-0000-0000-0000000000a2', 'Pedir libro');
insert into public.alumnos (id, matricula, nombre, carrera) values
  ('00000000-0000-0000-0000-0000000000b1', '2300000001', 'Original', 'TI');
insert into public.registros (id, alumno_id, matricula, nombre_completo, carrera) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
   '2300000001', 'Original', 'TI');
insert into public.registro_motivos (registro_id, motivo_id, motivo_nombre_snapshot) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'Estudiar');

-- ---------- Sin sesión: lo que haría cualquiera con la URL y la llave -------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

-- Leer
select throws_ok('select * from public.motivos',          '42501', null, 'anon no lee motivos');
select throws_ok('select * from public.alumnos',          '42501', null, 'anon no lee alumnos');
select throws_ok('select * from public.registros',        '42501', null, 'anon no lee registros');
select throws_ok('select * from public.registro_motivos', '42501', null, 'anon no lee registro_motivos');

-- Insertar
select throws_ok($$insert into public.motivos (nombre) values ('Intruso')$$,
  '42501', null, 'anon no inserta motivos');
select throws_ok($$insert into public.alumnos (matricula, nombre, carrera) values ('2399999999', 'Intruso', 'X')$$,
  '42501', null, 'anon no inserta alumnos');
select throws_ok($$insert into public.registros (alumno_id, matricula, nombre_completo, carrera)
                   values ('00000000-0000-0000-0000-0000000000b1', '2300000001', 'Intruso', 'X')$$,
  '42501', null, 'anon no inserta registros');
select throws_ok($$insert into public.registro_motivos (registro_id, motivo_id, motivo_nombre_snapshot)
                   values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'Intruso')$$,
  '42501', null, 'anon no inserta registro_motivos');

-- Modificar
select throws_ok($$update public.motivos set nombre = 'Hackeado'$$,
  '42501', null, 'anon no modifica motivos');
select throws_ok($$update public.alumnos set nombre = 'Hackeado'$$,
  '42501', null, 'anon no modifica alumnos');
select throws_ok($$update public.registros set nombre_completo = 'Hackeado'$$,
  '42501', null, 'anon no modifica registros');
select throws_ok($$update public.registro_motivos set motivo_nombre_snapshot = 'Hackeado'$$,
  '42501', null, 'anon no modifica registro_motivos');

-- Borrar
select throws_ok('delete from public.registro_motivos', '42501', null, 'anon no borra registro_motivos');
select throws_ok('delete from public.registros',        '42501', null, 'anon no borra registros');
select throws_ok('delete from public.alumnos',          '42501', null, 'anon no borra alumnos');
select throws_ok('delete from public.motivos',          '42501', null, 'anon no borra motivos');

-- La función de alta atómica tampoco es una puerta trasera.
select throws_ok($$select public.crear_registro_completo('{}'::jsonb)$$,
  '42501', null, 'anon no ejecuta crear_registro_completo');

reset role;
select * from finish();
rollback;
