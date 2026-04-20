# DEVLOG — Stenbrary

Crónica técnica del desarrollo. No es documentación para usuario final
(eso vive en `src/app/core/data/changelog.data.ts`), ni doc arquitectónica
formal (eso vivirá en `docs/adr/` cuando aplique).

Formato: una entrada por tanda de trabajo. Fecha, qué se hizo, qué se
descubrió, qué se decidió, qué sigue. Breve y honesto.

---

## 2026-04-20 — Endurecimiento de calidad y tooling (retroactivo)

Primera entrada retroactiva: cubre la fase previa al arranque formal del
roadmap (features core + UX). El objetivo fue dejar la base estable antes
de escalar.

**Hecho:**
- Tests unitarios base: 69 specs en verde.
  - `matricula.utils.spec.ts`, `horarios.utils.spec.ts`,
    `insignias.utils.spec.ts` — 49 specs de lógica pura.
  - `database.service.spec.ts` — 20 specs con `fake-indexeddb`:
    ventana por fecha, duplicados, entrada abierta, registro de salida,
    cierre automático, búsqueda por matrícula.
- CI con GitHub Actions (`.github/workflows/ci.yml`): type-check +
  tests headless (ChromeHeadlessCI con `--no-sandbox`) + guardrail de
  versión en cada push/PR.
- Husky v9 pre-commit ligero: `check:version` + `tsc -p tsconfig.app.json`
  + `tsc -p tsconfig.spec.json`. Tests y build completos quedan en CI
  para no ralentizar el commit.
- Guardrail `scripts/check-version.mjs`: verifica que `package.json`
  y el primer entry de `CHANGELOG` coincidan. Integrado en CI + hook.
- E2E smoke con Playwright (`e2e/smoke.spec.ts`): 4 tests cubriendo
  carga de `/scanner`, navegación, dashboard vacío, título.
- `ErrorReporterService` con cola offline en localStorage, drena en
  evento `online`. Endpoint configurable por environment — cero costo
  de bundle si no se configura. Wired al `GlobalErrorHandler`.
- Lazy load de `@zxing/browser`: migrado de import estático a
  `await import(...)`. Reduce ~430 KB del chunk inicial del scanner.
- Migración parcial `*ngIf` → `@if` en 5 componentes simples.
- `angular.json`: `allowedCommonJsDependencies` silencia warnings de
  build de producción (canvg, core-js, html2canvas, raf, rgbcolor).
  Build prod: 0 warnings.

**Descubierto:**
- `obtenerRegistrosPorFecha` necesita el fallback `getAll()+filter`
  porque registros antiguos tienen `fechaHora` como string ISO, no
  como `Date`. El índice `by-fecha` no los encuentra.
- Seis archivos `.spec.ts` generados por el CLI nunca corrieron y
  estaban desactualizados (esperaban props que ya no existen).
  Eliminados.
- Las webcams de laptop reportan 1280×720 pero tienen foco fijo que
  produce imágenes borrosas → el pipeline agresivo del scanner debe
  estar siempre ON, no gateado por resolución. (Ya aplicado en v3.9.1).

**Decidido:**
- Mantener el fallback de fechas hasta migrar a `DB_VERSION = 2` con
  normalización `string → Date`.
- Migración parcial `*ngIf` solo en archivos simples; los 7 componentes
  grandes (~97 ocurrencias) se abordarán 1 por PR con validación
  visual manual.
- Activity Log (audit trail) como próximo feature crítico — se
  aprovechará la misma migración de `DB_VERSION = 2`.

**Siguiente:**
- Módulo "Datos de prueba" in-app (rango matrículas 9000001+).
- `DB_VERSION = 2`: normalizar fechas + agregar store `audit`.
- Activity Log con vista `/actividad`.

**Commits:**
- `1f3a682` — tests base + CI + karma headless + *ngIf migración fase 1.
- `06e4a47` — Playwright smoke + error reporter + lazy zxing.
- `23bdbac` — tests DB + husky + guardrail + CommonJS allowlist.

---

## 2026-04-20 — Generador de datos de prueba (A1 del roadmap)

Arranque formal del roadmap refinado. Primer paso de la fase A
(infraestructura de datos). El objetivo: poder validar vistas y
performance con volumen realista sin clickear a mano.

**Decisiones previas (exclusiones confirmadas por el coordinador):**
- No habrá tema claro/oscuro. Dark theme único.
- No habrá foto de alumno (costo de almacenamiento vs beneficio bajo).
- No habrá i18n. Sistema 100% español.

**Hecho:**
- `DatosPruebaService` (`core/services/datos-prueba.service.ts`):
  - Genera alumnos con matrículas en rango `9000001+` (fácil de
    limpiar, separable de datos reales sin ensuciar el modelo).
  - Registros marcados con `dispositivo = 'SEED-TEST'` como
    segunda línea de identificación.
  - Distribución Poisson (Knuth) sobre registros por alumno para
    curva natural: heavy users + mayoría esporádicos.
  - Estado de registros: 60% cerrados normales, 25% abiertos,
    15% estancia larga.
  - Motivos: 70% unitario, 25% doble, 5% triple — ejercita
    retrocompat `motivoId` + `motivoIds[]`.
  - Llama a los mismos métodos que el scanner
    (`crearAlumno`, `crearRegistro`, `actualizarRegistroManual`).
    Si hay bug en validaciones/índices, sale a la luz con volumen.
- `DatosPruebaComponent` en `/configuracion`:
  - 4 presets (Pequeño/Medio/Grande/Estrés) + modo personalizado.
  - Inputs libres con rangos naturales (1–1000 alumnos, 1–365 días,
    0.1–50 λ Poisson) — principio de flexibilidad CLAUDE.md.
  - Progress bar en tiempo real durante generación/limpieza.
  - Conteo en vivo de datos de prueba actualmente cargados.
  - `ConfirmDialog` `info` para generar, `danger` para limpiar.

**Descubierto:**
- Bug de timing en `database.service.spec.ts`: 3 tests de
  `cerrarEntradasAntiguas` asumían que "hace N horas" siempre cae
  en el día actual. Falso entre 00:00 y ~05:00 AM (los tests caían
  en "ayer" y el filtro `obtenerRegistrosAbiertoHoy` los excluía).
- **Fix:** `jasmine.clock().mockDate()` congela "ahora" al mediodía
  antes de cada test del grupo. Tests ahora son independientes de
  la hora en que se ejecuten.

**Decidido:**
- Identificar datos de prueba por convención de matrícula
  (`9000001+`) en vez de flag `esPrueba` en el modelo. No requiere
  bump de `DB_VERSION` ni toca el modelo `Alumno`.
- El generador NO usa `cierreAutomatico=true` en registros de
  prueba (requeriría exponer método nuevo en `DatabaseService` o
  acceso directo al `db` privado). Se compensó con distribución
  de "estancias largas" de 3–7h sin cerrar.

**Siguiente:**
- A2: migración `DB_VERSION = 2` — normaliza fechas string → Date
  y crea store `audit`.
- A3: Activity Log completo (servicio + logging + vista `/actividad`).

**Estado de la suite:** 69/69 tests verde. Build prod 0 warnings.

**Commit:** (pendiente al momento de escribir esto)
