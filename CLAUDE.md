# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Desarrollo con hot reload
npx ng serve

# Build de producción
npx ng build --configuration production

# Lint
npx ng lint

# Generar componente standalone
npx ng generate component features/nombre --standalone --style=scss
```

No hay test suite configurada — el proyecto no tiene specs (`.spec.ts`) activos.

## Arquitectura

**Stenbrary** es una PWA Angular 18 offline-first para gestión de acceso a biblioteca. Toda la persistencia ocurre en IndexedDB (sin backend); el Service Worker permite operación sin internet.

### Flujo de operación principal

```
/scanner → detecta matrícula (cámara o manual)
        → busca alumno en IndexedDB
        → si existe: verifica duplicado (últimos 30 min)
             └→ duplicado: dialog Salida / Nuevo / Cancelar
             └→ nuevo: sessionStorage.alumnoActual = alumno → /seleccion-motivo
        → si no existe: sessionStorage.matriculaTemp → /registro-alumno
/seleccion-motivo → guard verifica sessionStorage.alumnoActual
                  → crea Registro en IndexedDB → regresa a /scanner
```

### Estado entre rutas

El "estado de sesión" entre scanner y selección de motivo se pasa exclusivamente por `sessionStorage`:
- `alumnoActual`: JSON del objeto `Alumno` — consumido por `SeleccionMotivoComponent`
- `matriculaTemp`: matrícula cruda — consumido por `RegistroAlumnoComponent`

La ruta `/seleccion-motivo` está protegida por `registroFlujoGuard` que verifica `sessionStorage.alumnoActual`.

### Base de datos (IndexedDB via `idb`)

`DatabaseService` es el único punto de acceso. Tres stores:
- `alumnos` — índices: `by-matricula`, `by-carrera`
- `registros` — índices: `by-fecha`, `by-alumno`, `by-matricula`
- `motivos` — índice: `by-orden`

Las queries usan `getAllFromIndex()` con `IDBKeyRange` (no `getAll()` + filter). La DB se versiona en `DB_VERSION = 1`; cambiar el esquema requiere incrementar esa constante y definir la migración en `onupgradeneeded`.

### Scanner (dual-mode)

`ScannerComponent` detecta en `ngOnInit` si `BarcodeDetector` nativo está disponible:
- **Nativo** (`usandoNativo = true`): usa la API del browser directamente sobre el `<video>`
- **ZXing fallback** (`usandoNativo = false`): dibuja frames en `<canvas>` con filtros CSS y llama `decodeFromCanvas()`

El loop usa `requestAnimationFrame` con throttle a `SCAN_INTERVAL_MS` (160ms). Las estrategias de preprocesado están en la constante `PREPROCESS_STRATEGIES` al tope del archivo — cada estrategia tiene `filter` (CSS), `scale` (upscaling, >1 ayuda en webcams de baja resolución), y `label` (para logs).

### Validación de matrícula

Centralizada en `src/app/core/utils/matricula.utils.ts`:
- El scanner acepta solo dígitos (`esMatriculaValidaScanner`)
- La entrada manual acepta prefijo `a/A` opcional (`validarMatricula`)
- La normalización siempre elimina el prefijo: `"a2299990001"` → `"2299990001"`
- Ajustar `MATRICULA_CONFIG` si cambia el formato — las funciones se adaptan automáticamente

### Design system

Variables en `src/styles/_variables.scss`, mixins en `src/styles/_mixins.scss`. Paleta: navy oscuro (`$navy-950` a `$navy-500`) + acento cyan (`$cyan-500 = #00C8D7`). Los breakpoints son `$breakpoint-xs: 576px` y `$breakpoint-sm: 768px` (el sidebar se convierte en drawer debajo de `$breakpoint-sm`).

### Navegación shell (`AppComponent`)

El shell tiene sidebar lateral (64px colapsado / 220px expandido) + topbar + bottom navigation bar (móvil ≤768px). En móvil el sidebar funciona como drawer activado por:
1. El botón hamburger en el topbar
2. El botón "Más" en la bottom nav

El sidebar se auto-cierra en móvil al navegar (suscripción a `NavigationEnd` en `ngOnInit`).

### Convenciones de código

- Todos los componentes son **standalone** — sin NgModules
- Las rutas usan **lazy loading** via `loadComponent()`
- Los servicios se proveen en `root`
- Usar `signal()` para estado reactivo local en componentes
- `ngZone.run()` para actualizar Angular desde callbacks de browser APIs (scanner, audio)
- Los comentarios de encabezado de archivo usan el formato `╔══╗` con versión y cambios

### Deployment

Netlify. El archivo `public/_redirects` contiene `/* /index.html 200` para el routing SPA. El build output es `dist/stenbrary/browser/`.
