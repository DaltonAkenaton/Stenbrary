# Despliegue en Cloudflare Pages

> Sustituye a Netlify, que cobra créditos por cada despliegue. Cloudflare Pages en plan gratuito: 500
> compilaciones al mes por cuenta y tráfico ilimitado. El mes de más actividad de este proyecto tuvo 25
> commits.
>
> Preparado el 2026-10-06. El repositorio ya trae lo necesario (`public/_headers`, `.nvmrc`). Lo que
> falta se hace en el panel de Cloudflare, con la cuenta del proyecto.

## Antes de empezar

- **Cuenta:** créala con el **correo dedicado del proyecto**, no con el personal (decisión de
  2026-10-05: la infraestructura va en una cuenta que se pueda entregar). Activa la verificación
  en dos pasos y guarda los códigos de recuperación.
- **GitHub:** el repositorio sigue en tu cuenta personal. Cloudflare solo pide permiso para leerlo.
- Netlify **se queda encendido** hasta que la versión de Cloudflare esté probada. No hay datos que
  migrar: Stenbrary todavía no se usa en la biblioteca.

## Pasos (unos 15 minutos)

1. Panel de Cloudflare → **Compute** → **Workers & Pages** → **Create**. **No** usar el
   "Connect GitHub" de esa pantalla: crea un *Worker*. Abajo, el enlace *"Need to use the
   legacy Pages workflow? → **Continue to Pages**"* → **Import an existing Git repository**.
   (Panel de octubre de 2026. Cloudflare empuja Workers y llama "legacy" a Pages, pero Pages
   sigue soportado; todo lo del repo está hecho y probado para Pages. Si algún día anuncian
   su retiro, migrar con calma.)
2. Autoriza GitHub y elige **solo** el repositorio `Stenbrary` (no "todos los repositorios").
3. Configuración de compilación:

   | Campo | Valor |
   |---|---|
   | Project name | `stenbrary` (da la URL `https://stenbrary.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | *None* |
   | Build command | `npx ng build --configuration production` |
   | Build output directory | `dist/stenbrary/browser` |
   | Root directory | *(vacío)* |

   No hace falta poner `NODE_VERSION`: Cloudflare lee el archivo `.nvmrc` del repositorio (Node 22,
   el mismo que CI).

   **Ojo con los espacios al escribir los campos.** En la primera compilación real se coló un espacio
   al inicio de *Build output directory*: Angular compiló bien y falló al final con
   `Output directory " dist/stenbrary/browser" not found`. Se corrige en Settings → Build →
   Build configuration y *Retry deployment*.
4. **Save and Deploy.** La primera compilación tarda 2–4 minutos.
5. Settings → **Builds** → **Branch control** → *Preview branches*: **None**. Así solo `main`
   gasta compilaciones; las ramas de trabajo no despliegan nada.

## Qué comprobar en `https://stenbrary.pages.dev`

Hecho el 2026-10-12. La cuenta usa un alias `+stenbrary` del Gmail personal, de forma temporal: ese
día Google y Microsoft bloquearon crear el correo dedicado. Se cambia en My Profile cuando exista.

- [x] Abre y llega al asistente de bienvenida (instalación nueva = navegador sin datos).
- [x] Recargar estando en `/estadisticas` no da error 404 (el *fallback* de rutas es automático).
- [x] Novedades muestra la versión actual.
- [x] **En tablet o celular:** instalar como app (menú del navegador → "Instalar" / "Agregar a pantalla de inicio").
- [x] Con la app instalada, sin internet: abre y registra (Galaxy A06 en modo avión; entrada y salida con lector).
- [ ] Tras el siguiente push a `main`: en la app instalada aparece el aviso de nueva versión.
- [ ] Las pruebas de tablet y celular de `docs/PRUEBAS-RONDA-2026-10.md` §4.

**Firefox pide "almacenamiento persistente" al abrir la app: hay que darle Allow** (con "Remember
this decision"). Sin ese permiso, el navegador puede borrar los datos de Stenbrary si el disco se
llena, y todos los registros viven ahí. Repetirlo en el equipo de la biblioteca el día de la
instalación.

## Qué ya está resuelto en el repositorio

- **`public/_headers`:** `index.html`, `ngsw.json` y los *workers* se sirven sin caché, para que el
  service worker siempre vea la versión nueva; los archivos con hash, con caché de un año. Probado
  con el emulador local de Cloudflare (`npx wrangler pages dev dist/stenbrary/browser`).
- **Rutas de la SPA:** Cloudflare Pages sirve `index.html` en cualquier ruta que no exista, siempre
  que no haya un `404.html`. La regla de `public/_redirects` es la de **Netlify**: Cloudflare la ignora
  con el aviso "Infinite loop detected", que es inofensivo.

## Después, al apagar Netlify (hecho el 2026-10-12)

1. [x] Borrar `public/_redirects` (ya no hará falta) y actualizar la sección *Deployment* de `CLAUDE.md`.
2. [x] En Netlify: Site settings → borrar el sitio.
3. Si la nube ya está desplegada: en Supabase → Authentication → URL Configuration, cambiar las
   *Redirect URLs* de Netlify por `https://stenbrary.pages.dev/**` (ver `docs/DESPLIEGUE-NUBE.md`).

## Dominio propio (opcional, más adelante)

Si se compra un dominio (aprox. 10 USD al año; también lo pide el envío de correos de la nube), se
conecta en Pages → Custom domains, y después se agrega a las *Redirect URLs* de Supabase. Se decide al
desplegar la nube.
