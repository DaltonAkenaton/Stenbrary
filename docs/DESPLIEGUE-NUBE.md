# Desplegar la nube en producción

Cómo pasar de "Fase 2 funciona en mi laptop" a "Fase 2 existe en el sitio
publicado". Todo lo de este documento se hace **una vez**.

Hoy `src/environments/environment.prod.ts` tiene Supabase vacío, así que el
Netlify que usa el coordinador corre en modo solo-local: nada de lo construido
en Fase 2 (login, roles, bandeja de sincronización, descarga, usuarios) es
alcanzable ahí. Esto lo arregla.

> **Lo que NO pasa al terminar.** Publicar las claves ya no cambia el
> comportamiento de ninguna instalación. Desde v3.41.0 la nube es **opt-in por
> instalación**: el build trae las credenciales, pero cada navegador arranca en
> solo-local hasta que alguien enciende el interruptor en
> `/configuracion` → Avanzado → **Conexión con la nube**. Ver el porqué en la
> cabecera de `src/app/core/auth/supabase.client.ts`.

---

## 1. Crear el proyecto de PROD

En [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.

- Nombre: `stenbrary-prod`.
- Región: la más cercana a Tampico (`us-east-1` suele ser la mejor opción
  disponible).
- Contraseña de la base: guárdala en un gestor. No la vas a usar en la app,
  pero sin ella no puedes conectar el CLI ni entrar por `psql`.

**Proyecto aparte del de dev, no el mismo.** Compartirlos significa que
cualquier prueba local escribe en los datos reales del coordinador, y que un
`drop` de una migración a medio escribir se lleva la biblioteca por delante.

## 2. Aplicar las migraciones

Las 8 migraciones de `supabase/migrations/` van **en orden**:

| Archivo | Qué deja |
|---|---|
| `0001_auth_foundation.sql` | enum `user_role`, `organizations`, `user_profiles`, trigger `handle_new_user`, RLS |
| `0002_fix_rls_recursion.sql` | corrige la recursión de las policies de 0001 |
| `0003_data_tables.sql` | `motivos`, `alumnos`, `registros`, `registro_motivos`, `crear_registro_completo()` |
| `0004_invitados_alumno_nullable.sql` | `alumno_id` nullable para invitados |
| `0005_fix_alumnos_trigger.sql` | quita el trigger que asumía una columna `updated_at` inexistente |
| `0006_user_management.sql` | RPC `set_user_role` + revoke anti-escalación |
| `0007_user_profiles_email.sql` | email en `user_profiles` (lo necesita `/usuarios`) |
| `0008_salida_estimada.sql` | marca las salidas que puso el sistema, para no contarlas como estancias reales |

Con el CLI (recomendado — deja el historial registrado en Supabase):

```bash
npx supabase link --project-ref <ref-del-proyecto-prod>
npx supabase db push
```

Sin CLI: SQL Editor del dashboard, pegar cada archivo **en orden numérico** y
ejecutar uno por uno. Si uno falla, para y resuelve antes de seguir — las
siguientes asumen el estado de las anteriores.

**Verificación:** en Table Editor deben existir `organizations`,
`user_profiles`, `motivos`, `alumnos`, `registros`, `registro_motivos`, todas
con el candado de RLS.

## 3. Configurar el redirect del magic link

Authentication → URL Configuration:

- **Site URL**: la URL de producción. Desde la migración (`docs/DESPLIEGUE-CLOUDFLARE.md`) es
  `https://stenbrary.pages.dev`, o el dominio propio si se compra.
- **Redirect URLs**: añadir `https://stenbrary.pages.dev/login` y también
  `http://localhost:4200/login` si vas a probar el proyecto de PROD desde tu
  máquina.

`AuthService` arma el destino con `window.location.origin + '/login'`
(`auth.service.ts:124`), así que el dominio sale solo — pero Supabase rechaza
cualquier redirect que no esté en esta lista, y el error se ve recién al
abrir el correo.

## 4. SMTP propio (no opcional en la práctica)

El correo integrado de Supabase está limitado a **~2 mensajes por hora** y su
propia documentación dice que no es para producción. Con eso, dos intentos de
login seguidos del coordinador ya lo dejan esperando.

Authentication → Emails → SMTP Settings, con un proveedor de tier gratis
(Resend ~100/día, Brevo ~300/día). Necesitas un dominio verificado o el
subdominio que te dé el proveedor.

Mientras no esté: cuenta con que el magic link tarda o no llega, y que la
salida de emergencia de `/login` ("Usar sin cuenta") es lo que evita que el
coordinador se quede fuera.

## 5. Crear la cuenta del coordinador y darle el rol

El trigger `handle_new_user` da rol `asistente` a todo el que entra por
primera vez. El primero tiene que promoverse a mano, porque `/usuarios` está
restringido justamente al rol que todavía no tiene nadie.

1. Que el coordinador inicie sesión una vez en el sitio publicado (con la nube
   ya encendida en su equipo — paso 8).
2. SQL Editor:

```sql
update user_profiles set rol = 'coordinador' where email = '<su-correo>';
```

3. Que recargue. A partir de ahí puede asignar roles desde `/usuarios` sin SQL.

## 6. Pegar las claves y publicar

Settings → API del proyecto de PROD: copiar **Project URL** y la clave
**publishable** (`sb_publishable_*`; la `anon` clásica también sirve).

En `src/environments/environment.prod.ts`:

```ts
supabase: {
  url: 'https://<ref>.supabase.co',
  anonKey: 'sb_publishable_...',
},
```

La clave es pública por diseño y respeta RLS — por eso vive en Git, igual que
la de dev. **La `service_role` no entra aquí ni en ningún archivo del repo.**

Commit y push: Cloudflare Pages reconstruye solo.

## 7. Keep-alive del proyecto de PROD

`.github/workflows/supabase-keepalive.yml` hace un ping diario **solo al
proyecto de dev**. El free tier pausa un proyecto tras ~7 días sin peticiones,
y un proyecto de producción pausado es una caída silenciosa.

Duplicar el paso `Ping Supabase REST` con la URL y la key de PROD, o
parametrizarlo con una matriz. Mientras el coordinador use la app a diario el
tráfico real basta, pero durante vacaciones no hay tráfico — que es justo
cuando no quieres descubrir que el proyecto se pausó.

## 8. Encender la nube en el equipo del coordinador

En su navegador: `/configuracion` → **Avanzado** → **Conexión con la nube** →
*Conectar con la nube*. La app recarga y lleva a `/login`.

A partir de ahí, en **ese** equipo: la administración pide sesión y respeta el
rol. El escáner, el registro de visitas, `/presencia`, `/alumnos` y
`/registros` siguen sin guard y sin necesitar Internet.

Para deshacerlo: mismo sitio, *Volver a modo solo-local*. Si ya no puede entrar
a Configuración, el botón "Usar sin cuenta" de `/login` hace lo mismo.

## 9. Verificación

- [ ] El sitio publicado abre en solo-local (sin haber tocado el interruptor) y
      `/configuracion` entra sin pedir sesión. **Esto se comprueba antes que
      nada**: si falla, el despliegue rompió a todos los usuarios existentes.
- [ ] Tras encender la nube, `/configuracion` redirige a `/login`.
- [ ] El magic link llega y devuelve a `/login` ya con sesión.
- [ ] Con rol `coordinador` se ven Sincronización, Descarga, Usuarios,
      Estadísticas, Inactivos.
- [ ] Con un segundo usuario en rol `asistente`, esas entradas desaparecen del
      menú y escribir `/configuracion` a mano lleva a `/acceso-denegado`.
- [ ] Apagar el WiFi con sesión iniciada: el scanner sigue registrando y
      `/configuracion` sigue abriendo (perfil cacheado).
- [ ] "Volver a modo solo-local" devuelve el equipo al estado del primer punto.
- [ ] Subir un lote real desde `/sincronizacion` y comprobar en Table Editor.

## Pendiente después de esto

- **Volumen real**: la descarga se validó en local. Falta con miles de filas
  remotas. `RemoteDatabaseService.obtenerTodosLosRegistros()` ya pagina de
  1000 en 1000 porque PostgREST corta ahí en silencio; conviene confirmarlo
  con datos de verdad.
- **Resolución de conflictos** en `/descarga`: hoy se muestran campo por campo
  y no se aplican. Requiere decidir la política con el coordinador.
