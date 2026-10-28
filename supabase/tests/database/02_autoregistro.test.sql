-- ============================================================
-- 02_autoregistro.test.sql
-- Una cuenta creada por su cuenta (magic link a un correo cualquiera)
-- no debe ver ni tocar datos hasta que un coordinador le dé un rol.
-- Y quien sí tiene rol de personal tiene que seguir operando: la
-- corrección no puede ser "bloquear todo".
--
-- Con 0003–0008 falla: el perfil nacía como `asistente` y las políticas
-- de datos no revisaban el rol.
--
-- Correr: npx supabase test db
-- ============================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

-- ---------- Datos sembrados (organization_id NULL: una sola institución) ----
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

-- Dos cuentas. El trigger handle_new_user crea su perfil con el rol por defecto.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'desconocido@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'coordinacion@example.com');
update public.user_profiles set rol = 'coordinador'
  where id = '00000000-0000-0000-0000-0000000000d2';

select is((select rol::text from public.user_profiles
           where id = '00000000-0000-0000-0000-0000000000d1'),
          'alumno', 'una cuenta nueva nace sin rol de personal');

-- ---------- Cuenta autorregistrada ---------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

-- Leer: no ve nada
select is_empty('select * from public.motivos',          'autorregistrado no ve motivos');
select is_empty('select * from public.alumnos',          'autorregistrado no ve alumnos');
select is_empty('select * from public.registros',        'autorregistrado no ve registros');
select is_empty('select * from public.registro_motivos', 'autorregistrado no ve registro_motivos');

-- Insertar: lo rechaza la política (42501)
select throws_ok($$insert into public.motivos (nombre) values ('Intruso')$$,
  '42501', null, 'autorregistrado no inserta motivos');
select throws_ok($$insert into public.alumnos (matricula, nombre, carrera) values ('2399999999', 'Intruso', 'X')$$,
  '42501', null, 'autorregistrado no inserta alumnos');
select throws_ok($$insert into public.registros (alumno_id, matricula, nombre_completo, carrera)
                   values ('00000000-0000-0000-0000-0000000000b1', '2300000001', 'Intruso', 'X')$$,
  '42501', null, 'autorregistrado no inserta registros');
select throws_ok($$insert into public.registro_motivos (registro_id, motivo_id, motivo_nombre_snapshot)
                   values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'Intruso')$$,
  '42501', null, 'autorregistrado no inserta registro_motivos');

-- Modificar y borrar: la RLS filtra las filas (0 afectadas, sin error).
-- Lo que se comprueba es el resultado, más abajo, ya sin su sesión.
select lives_ok($$update public.motivos set nombre = 'Hackeado' where id = '00000000-0000-0000-0000-0000000000a1'$$, 'update motivos no truena');
select lives_ok($$update public.alumnos set nombre = 'Hackeado'$$, 'update alumnos no truena');
select lives_ok($$update public.registros set nombre_completo = 'Hackeado'$$, 'update registros no truena');
select lives_ok($$update public.registro_motivos set motivo_nombre_snapshot = 'Hackeado'$$, 'update registro_motivos no truena');
select lives_ok('delete from public.registro_motivos', 'delete registro_motivos no truena');
select lives_ok('delete from public.registros',        'delete registros no truena');
select lives_ok('delete from public.alumnos',          'delete alumnos no truena');
select lives_ok('delete from public.motivos',          'delete motivos no truena');

reset role;

-- Nada cambió
select is((select nombre from public.motivos where id = '00000000-0000-0000-0000-0000000000a1'),
          'Estudiar', 'motivos intactos');
select is((select nombre from public.alumnos where id = '00000000-0000-0000-0000-0000000000b1'),
          'Original', 'alumnos intactos');
select is((select nombre_completo from public.registros where id = '00000000-0000-0000-0000-0000000000c1'),
          'Original', 'registros intactos');
select is((select motivo_nombre_snapshot from public.registro_motivos
           where registro_id = '00000000-0000-0000-0000-0000000000c1'),
          'Estudiar', 'registro_motivos intactos');

-- ---------- Control: el personal sigue operando ---------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);

select lives_ok($$insert into public.alumnos (matricula, nombre, carrera) values ('2300000002', 'Nuevo', 'TI')$$,
  'el coordinador da de alta un alumno');
select isnt_empty($$select 1 from public.alumnos where matricula = '2300000002'$$,
  'el coordinador ve lo que registró');
select lives_ok($$select public.crear_registro_completo('{
    "registro": {"alumno_id": "00000000-0000-0000-0000-0000000000b1", "matricula": "2300000001",
                 "nombre_completo": "Original", "carrera": "TI"},
    "motivos":  [{"motivo_id": "00000000-0000-0000-0000-0000000000a2", "nombre_snapshot": "Pedir libro"}]
  }'::jsonb)$$,
  'el coordinador registra una visita con la función de alta');

-- Flujo de invitación: el coordinador le da rol a la cuenta nueva...
select lives_ok($$select public.set_user_role('00000000-0000-0000-0000-0000000000d1', 'asistente')$$,
  'el coordinador promueve la cuenta nueva a asistente');

-- ...y desde ese momento esa cuenta ya opera.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select isnt_empty('select * from public.alumnos', 'ya promovida, la cuenta ve los alumnos');

reset role;
select * from finish();
rollback;
