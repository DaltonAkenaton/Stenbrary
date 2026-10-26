# Hardening de Stenbrary — octubre de 2026 (v3.62.0)

Qué se cambió, con qué se verificó y qué queda fuera del alcance del código.
Resultados obtenidos el 2026-10-26 en Windows 11, Node 24.13.1, rama
`hardening/stenbrary-completo`.

## 1. Resultados de la validación final

| # | Verificación | Resultado |
|---|---|---|
| 1 | `npm audit --omit=dev` | 0 vulnerabilidades |
| 2 | `npm audit` | 0 vulnerabilidades |
| 3 | `npm run lint` | 0 errores, 0 avisos ("All files pass linting") |
| 4 | Tipos de la app (`tsconfig.app.json`) | sin errores |
| 5 | Tipos de las pruebas (`tsconfig.spec.json`), raíz (CI) y Worker | sin errores |
| 6 | `npm run test:ci` (TZ `America/Matamoros`) | **460/460**, 27 archivos; cobertura: sentencias 80.4 %, ramas 68.4 %, funciones 76.1 %, líneas 82.6 %. Tras neutralizar la inyección de fórmulas en los Excel (§3): **483/483**, 29 archivos; sentencias 80.2 %, líneas 82.4 % |
| 7 | E2E (`npx playwright test`) | **85/85** (6.3 min), servidor propio |
| 8 | `npm run build` | correcto; inicial 1.22 MB (310 kB transferidos) |
| 9 | `npm run check:version` | 3.62.0 consistente |
| 10 | Cabeceras sobre el build (`npm run e2e:produccion`) | **5/5**: sin violaciones de la CSP; service worker sin conexión |
| 11 | Bundle de producción | sin credenciales privadas, sin identificadores retirados, sin correos ni rutas personales |
| 12 | Las E2E prueban Stenbrary | `e2e/global-setup.ts` exige `<meta name="application-name" content="Stenbrary">` antes de correr |

Reproducibilidad: un clon limpio de la rama con `npm ci` instala SheetJS desde
`vendor/` y compila sin errores.

Línea base (antes del hardening, 2026-10-25): 398 unitarias, 79 E2E,
123 avisos de lint, 16 vulnerabilidades en producción (1 crítica, 7 altas) y
94 en total; Angular 18 sin soporte.

## 2. Dependencias

| Paquete | Antes | Después | Motivo |
|---|---|---|---|
| Angular (core, common, router, forms…) | 18.2.14 | 21.2.25 | 18 sin soporte; avisos XSS/DoS solo corregidos en ≥ 19.2. 21 = LTS hasta 2027-06 |
| @angular/cli | 18.2.21 | 21.2.28 | ídem |
| @angular-devkit/build-angular | 18.2.21 | (quitado) | reemplazado por `@angular/build` 21.2.28 (sin webpack: 367 paquetes menos) |
| @angular/material, cdk | 18.2.14 | 21.2.14 | ídem |
| angular-eslint | 18.4.3 | 21.4.0 | ídem |
| typescript | 5.5.4 | 5.9.3 | requerido por Angular 21 |
| zone.js | 0.14.10 | 0.15.1 | requerido por Angular 21 |
| ngx-lottie | 12.0.0 | 21.2.0 | compatibilidad con Angular 21 |
| xlsx (SheetJS) | 0.18.5 (npm) | 0.20.3 (CDN oficial, `vendor/`) | CVE-2023-30533 y CVE-2024-22363 |
| jspdf / jspdf-autotable | 4.2.0 / 5.0.7 | 4.2.1 / 5.0.9 | avisos de inyección de marzo de 2026 |
| uuid | 10.0.0 | 14.0.3 | límites del buffer |
| sharp (script de íconos) | 0.34.5 | 0.35.5 | libvips/libheif |
| @types/xlsx, @types/uuid | — | (quitados) | los paquetes traen sus tipos |
| @axe-core/playwright, fflate | — | 4.14.0 / 0.8.3 | pruebas de accesibilidad y de PDF |
| undici (dentro de @angular/build) | 7.29.1 | 7.30.1 (`overrides`) | `@angular/build` la fija exacta; parche de la misma línea |

Ningún `--force` ni `--legacy-peer-deps`. Node 22 en CI (`.nvmrc`); Angular 22
quedó fuera porque exige Node ≥ 22.22.3/24.15 y TypeScript 6.

## 3. Cambios por área

**Framework.** Migración 18 → 19 → 20 → 21 con `ng update`, comprobando
tipos, pruebas y build en cada paso. `inject()` en lugar de parámetros del
constructor (schematic oficial; se restauraron dos comentarios que borró).
Sass con `@use` y `color.adjust` (el CSS compilado es idéntico byte a byte).
El compilador de Angular 21 detectó un bug real: `@if (!cargando)` sin invocar
la signal ocultaba el contador de "En biblioteca".

**Importación del padrón.** Firma y tamaño antes de leer; lectura en Web
Worker con límites (filas, columnas, celdas, 30 s); encabezados que tocarían
el prototipo, rechazados; escritura en una transacción. Ver `docs/SEGURIDAD.md` §2.3.

**Respaldos.** Validación completa de cada elemento; "Reemplazar" en una
transacción (antes: borrar, escribir y una copia en memoria); copia
automática `antes-de-reemplazar` antes de reemplazar.

**PIN.** PBKDF2-SHA256 (600 000 iteraciones), migración del texto plano,
cola que ordena guardar y verificar. Límites en `docs/SEGURIDAD.md` §2.2.

**Cabeceras.** CSP estricta y cabeceras anti-framing, verificadas contra el
build en CI.

**Accesibilidad.** 40 avisos de lint → 0 (reglas en `error`); axe sobre el
flujo de la puerta y 16 pantallas con datos, en escritorio y móvil: 0
violaciones WCAG 2.1 A/AA. Contraste (`$text-muted` 0.52 → 0.70 y 14 colores
fijos), 46 botones de solo ícono con nombre, texto oculto solo a la vista en
móvil, sin controles anidados.

**Exportación a Excel.** Los textos que una hoja de cálculo podría ejecutar
como fórmula (empiezan con `=`, `+`, `-`, `@`, sus formas de ancho completo,
tabulador o salto de línea) llevan un apóstrofo delante, solo en la salida.
Las pruebas generan el `.xlsx` real, lo descomprimen y verifican que el XML
de cada hoja no tiene fórmulas y que los datos normales salen igual.
No hay exportación a CSV.

**Tipos.** 85 `any` → 0 (regla en `error`).

**Privacidad.** 20 `console.log` saltaban el logger de desarrollo; dos
mostraban en producción la matrícula leída y el nombre del alumno.

**E2E.** Servidor propio en el 4300 (`E2E_PORT`), sin reutilizar uno ajeno,
y verificación de identidad.

**Supabase.** El keep-alive del proyecto de desarrollo pasa a manual (Fase 2
en pausa). RLS y la app no cambian.

## 4. Historial y despliegues

- Historial reescrito **en una copia aparte** (no publicado todavía): sin
  `docs/guias/`, sin `.claude/settings.local.json` y sin el correo personal
  (texto y metadatos de 4 commits; el nombre y la atribución se conservan).
  137 commits y 20 tags; cada tag difiere del original solo en lo retirado.
- Las matrículas de ejemplo de la historia publicada ya eran sintéticas
  (limpieza del 2026-10-24); comprobado en todas las versiones.
- Pendiente fuera del código: GitHub sirve todavía por SHA commits anteriores
  a la primera limpieza, y la caché del borde de Cloudflare conserva dos chunks
  de la v3.59.0 con identificadores retirados (la caché de `*.pages.dev` no se
  puede purgar desde la cuenta). Ambos requieren a su soporte.

## 5. Lo que este trabajo no cubre

- **La prueba en una biblioteca real** (`docs/PRUEBA-PILOTO-BIBLIOTECA.md`):
  lector y credenciales reales, una jornada completa, caída de red, dos
  equipos, restauración, procedimiento de respaldos y aceptación firmada.
- **Acceso físico al equipo:** una app local sin servidor no puede impedir
  que quien controla el navegador lea o altere sus datos (`docs/SEGURIDAD.md` §1).
- Avisos de build que quedan: el SCSS de Estadísticas supera su presupuesto
  (54 kB de 44 kB) y `lottie-web` no es ESM. Ninguno afecta al funcionamiento.
