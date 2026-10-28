# Seguridad de Stenbrary

Modelo de amenazas, controles que existen y su verificación, y límites que
una aplicación local sin servidor **no puede** superar. Estado a v3.62.2
(2026-10-27).

## 1. Qué hay que proteger y de quién

| Activo | Dónde vive | Amenaza principal |
|---|---|---|
| Datos de alumnos (matrícula, nombre, carrera) y visitas | IndexedDB del navegador del equipo | Alguien con acceso al equipo; un archivo importado malicioso; un respaldo que circula |
| PIN del coordinador | `localStorage` (hash) | Un alumno frente al equipo en modo quiosco |
| Integridad de las cifras | IndexedDB + respaldos | Importar un respaldo dañado o equivocado |
| La aplicación | Cloudflare Pages (estática) | Inyección de scripts, framing, dependencias vulnerables |

**Fuera de alcance por diseño:** no hay servidor ni cuentas en la versión
actual (la nube está apagada, ver `docs/ROADMAP.md`, Fase 2). Quien controla
el equipo y su navegador, con las herramientas de desarrollador, puede leer
IndexedDB, borrar `localStorage` o modificar la aplicación en memoria.
Ningún control de esta página lo impide; los de abajo **reducen** riesgos,
no los eliminan. La protección real de los datos en un equipo compartido es
física y de cuentas del sistema operativo (ver `docs/PRUEBA-PILOTO-BIBLIOTECA.md`).

## 2. Controles y cómo se verifican

### 2.1 Cabeceras HTTP (`public/_headers`)

- **Content-Security-Policy**: `script-src 'self'` (sin scripts inline, sin
  `eval`, sin terceros), `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `connect-src 'self'`, `font-src` solo
  `fonts.gstatic.com`, `frame-ancestors 'none'`.
- **Excepción única:** `style-src 'unsafe-inline'`. Angular inyecta los
  estilos de cada componente como `<style>` en tiempo de ejecución y las
  plantillas usan atributos `style`; en hosting estático no hay un *nonce*
  por respuesta. El riesgo residual es inyección de CSS (no de scripts).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (cámara solo en el propio sitio; micrófono,
  geolocalización, pago y USB apagados), `Cross-Origin-Opener-Policy`.
- Para cumplir `script-src 'self'`: el build no incrusta el CSS crítico
  (Angular lo activaba con un `onload` inline) y Lottie usa el reproductor
  *light*, sin `eval`.

**Verificación:** `npm run e2e:produccion` (también en CI) sirve el build de
producción con esas cabeceras (`scripts/servir-produccion.mjs` replica la
semántica de Cloudflare) y recorre la app: datos de ejemplo, gráficas, PDF,
Excel, importación en el Worker, respaldo, cámara y el service worker sin
conexión. La prueba falla con **una sola** violación de la CSP. Control
negativo hecho a mano: un `<script>` inline se bloquea y se reporta.

### 2.2 PIN del coordinador

- Se guarda **PBKDF2-HMAC-SHA256**, 600 000 iteraciones (recomendación
  OWASP), sal aleatoria de 16 bytes, comparación en tiempo constante
  (`core/utils/pin-hash.utils.ts`). El código de recuperación también.
- 5 intentos fallidos bloquean 5 minutos; cada intento queda en la bitácora.
  El PIN nunca se escribe en la bitácora ni en la consola (hay prueba).
- Migración: un PIN de una instalación anterior (texto plano) se convierte
  en hash al arrancar; nadie se queda fuera.

**Límite, dicho sin rodeos:** un PIN de 4 a 6 dígitos tiene como mucho un
millón de valores. Quien copie el hash de `localStorage` puede probarlos todos
fuera del navegador; el hash lo encarece y evita que el PIN se lea a simple
vista o se recupere de un respaldo del navegador, pero **no** protege frente
a alguien con control del equipo. Además, ese alguien puede simplemente borrar
`localStorage` (el PIN vuelve al de fábrica) o editar la app en memoria. El
PIN es una barrera contra el uso casual del quiosco, no un control de acceso.
En la Fase 2 lo reemplazan cuentas con roles verificados por el servidor.

### 2.3 Archivos que importa el coordinador

- **Padrón (Excel/CSV)** — `core/utils/lectura-padron.utils.ts`: extensión,
  firma real del archivo (ZIP para `.xlsx`, OLE o texto para `.xls`, texto
  para `.csv`), 10 MB, 20 000 filas, 60 columnas, 300 caracteres por celda;
  sin fórmulas, estilos ni macros; encabezados `__proto__`/`constructor`/
  `prototype` rechazados. Se lee en un Web Worker con 30 s de tiempo máximo.
  Se guarda en una sola transacción: todo o nada.
- **SheetJS 0.20.3** desde el CDN oficial, incluido en `vendor/` (corrige
  CVE-2023-30533 y CVE-2024-22363). Ver `vendor/README.md`.
- **Respaldos (JSON)** — `core/utils/validacion-respaldo.utils.ts`: se valida
  cada alumno, visita, actividad y evento antes de tocar la base; un archivo
  inválido no cambia nada. "Reemplazar" es una sola transacción de IndexedDB
  y antes descarga una copia de lo actual.

**Verificación:** pruebas unitarias con archivos válidos, dañados, vacíos,
disfrazados y excesivos; fallo real a media transacción (los datos quedan
idénticos); E2E con archivos rechazados en el navegador real.

### 2.4 Excel exportados (inyección de fórmulas)

Stenbrary exporta visitas y alumnos solo a `.xlsx` (no hay CSV). SheetJS
escribe los textos como celdas de texto, sin fórmulas; aun así, como el
archivo se puede volver a guardar como CSV, los textos que empiezan con `=`,
`+`, `-`, `@` (o sus formas de ancho completo, tabulador o salto de línea,
incluso tras espacios) llevan un apóstrofo delante, como recomienda OWASP
(`core/utils/hoja-calculo.utils.ts`). Solo en la salida: IndexedDB no cambia,
los números no se tocan.

**Verificación:** `export.service.spec.ts` genera los dos libros con textos
hostiles, descomprime el `.xlsx` y comprueba que el XML de las hojas no tiene
ningún elemento `<f>`, que las celdas hostiles son texto con apóstrofo y que
matrículas, nombres, fechas y números salen exactamente igual.

### 2.5 PDF generados

jsPDF 4.2.1. Stenbrary solo usa `text`, tablas y `save()`: no usa las APIs
con avisos recientes (`output()` a ventana nueva, anotaciones FreeText,
`addJS`, AcroForm, imágenes GIF/BMP). Una prueba genera la constancia y el
reporte con textos que intentan cerrar la cadena e inyectar objetos PDF, lee
el archivo y verifica que el texto sale escapado y que no hay acciones activas.

### 2.6 Dependencias

`npm audit --omit=dev` y `npm audit`: **0 vulnerabilidades** (2026-10-26).
`undici` se fija a 7.30.1 dentro de `@angular/build` (que la fija exacta en
7.29.1) con `overrides`: es un parche de la misma línea; el build no cambia.
Angular 21 tiene soporte LTS hasta junio de 2027.

### 2.7 Privacidad

- La consola del navegador no muestra matrículas ni nombres en producción
  (`core/utils/logger.ts`).
- Las matrículas del repositorio, pruebas y demo son sintéticas (serie
  `229999000N`, `9000001+`).
- La nube (Supabase) está apagada y ningún `environment` incluye
  credenciales. No hay proyectos de Supabase desplegados: el de desarrollo se
  eliminó el 2026-10-27 (ver 2.8).

### 2.8 Backend en pausa: políticas RLS (defecto corregido en 0009)

El prototipo de backend (`supabase/`) no está desplegado, pero su esquema se
mantiene correcto y probado. La auditoría del 2026-10-27 encontró un defecto
en las políticas de 0003:

```sql
using (public.is_super_admin()
       or organization_id is not distinct from public.current_organization_id())
```

`is not distinct from` estaba ahí para que el modo de una sola institución
(`organization_id` NULL) funcionara: `NULL = NULL` es NULL, y con `=` nadie
habría visto nada. Pero `current_organization_id()` sale de `auth.uid()`, que
**también es NULL sin sesión**. Resultado:

1. Con la URL del proyecto y la llave publicable (que estaban en el repositorio,
   como es normal: son públicas *porque* la RLS debería bastar), cualquiera
   podía leer, modificar y borrar alumnos, visitas y motivos.
2. Toda cuenta nueva nacía como `asistente` y las políticas no revisaban el
   rol: crearse una cuenta con cualquier correo daba el mismo acceso.

El proyecto afectado solo tuvo datos de prueba y se eliminó. **Corrección
(`0009_rls_sin_sesion.sql`)**:

- `anon` pierde todo privilegio sobre las tablas de datos y la función de alta
  (sin sesión: *permission denied*, no un arreglo vacío).
- Las políticas pasan a `to authenticated` y exigen rol de personal
  (`es_personal()`) además de la organización.
- Las cuentas nuevas nacen como `alumno`; el registro libre se cierra en el
  servidor (`enable_signup = false`) y en el cliente (`shouldCreateUser: false`).
  El acceso es por invitación y el coordinador asigna el rol.

**Verificación:** `npx supabase test db` (pgTAP, `supabase/tests/database/`,
43 pruebas). Con 0001–0008 fallan 31; con 0009 pasan todas. Incluyen controles
positivos (el coordinador opera, invita y promueve), para que "bloquear todo"
no cuente como corrección.

**Lección:** una comparación que trata NULL como valor válido necesita que el
NULL de "sin sesión" no pueda alcanzarla. Toda política nueva lleva `to
authenticated` y una prueba sin sesión.

## 3. Riesgos residuales conocidos

| Riesgo | Por qué queda | Mitigación |
|---|---|---|
| Acceso físico al equipo | App local sin servidor | Cuenta de Windows propia, bloqueo de pantalla, perfil de navegador dedicado (piloto) |
| Pérdida del navegador o del perfil = pérdida de datos | IndexedDB es la única copia | Respaldo diario (recordatorio integrado) y procedimiento del piloto |
| `style-src 'unsafe-inline'` | Arquitectura de estilos de Angular en hosting estático | `script-src` estricto: el CSS inyectado no ejecuta código |
| Copias viejas en caché de terceros | Caché del borde de Cloudflare e índices de GitHub fuera de nuestro control | Solicitudes de purga documentadas para el mantenedor |
