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

1. Panel de Cloudflare → **Workers & Pages** → **Create** → pestaña **Pages** →
   **Connect to Git**.
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

   No hace falta poner `NODE_VERSION`: Cloudflare lee el archivo `.nvmrc` del repositorio (Node 20,
   el mismo que CI).
4. **Save and Deploy.** La primera compilación tarda 2–4 minutos.
5. Settings → **Builds** → **Branch control** → *Preview branches*: **None**. Así solo `main`
   gasta compilaciones; las ramas de trabajo no despliegan nada.

## Qué comprobar en `https://stenbrary.pages.dev`

- [ ] Abre y llega al asistente de bienvenida (instalación nueva = navegador sin datos).
- [ ] Recargar estando en `/estadisticas` no da error 404 (el *fallback* de rutas es automático).
- [ ] Novedades muestra la versión actual.
- [ ] **En tablet o celular:** instalar como app (menú del navegador → "Instalar" / "Agregar a pantalla de inicio").
- [ ] Con la app instalada, sin internet: abre y registra.
- [ ] Tras el siguiente push a `main`: en la app instalada aparece el aviso de nueva versión.
- [ ] Las pruebas de tablet y celular de `docs/PRUEBAS-RONDA-2026-10.md` §4.

## Qué ya está resuelto en el repositorio

- **`public/_headers`:** `index.html`, `ngsw.json` y los *workers* se sirven sin caché, para que el
  service worker siempre vea la versión nueva; los archivos con hash, con caché de un año. Probado
  con el emulador local de Cloudflare (`npx wrangler pages dev dist/stenbrary/browser`).
- **Rutas de la SPA:** Cloudflare Pages sirve `index.html` en cualquier ruta que no exista, siempre
  que no haya un `404.html`. La regla de `public/_redirects` es la de **Netlify**: Cloudflare la ignora
  con el aviso "Infinite loop detected", que es inofensivo.

## Después, al apagar Netlify

1. Borrar `public/_redirects` (ya no hará falta) y actualizar la sección *Deployment* de `CLAUDE.md`.
2. En Netlify: Site settings → borrar el sitio.
3. Si la nube ya está desplegada: en Supabase → Authentication → URL Configuration, cambiar las
   *Redirect URLs* de Netlify por `https://stenbrary.pages.dev/**` (ver `docs/DESPLIEGUE-NUBE.md`).

## Dominio propio (opcional, más adelante)

Si se compra un dominio (aprox. 10 USD al año; también lo pide el envío de correos de la nube), se
conecta en Pages → Custom domains, y después se agrega a las *Redirect URLs* de Supabase. Se decide al
desplegar la nube.
