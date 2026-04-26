# Estado del proyecto — Stenbrary

Snapshot de qué tiene el sistema **hoy** y qué queda pendiente.
Se actualiza al cerrar cada tanda relevante. No reemplaza a
`CHANGELOG` (cambios por versión) ni a `DEVLOG.md` (bitácora técnica).

**Versión actual:** `3.12.1` · Última actualización: `2026-04-20`.

---

## 1. Features implementadas (qué hace hoy el sistema)

### 1.1 Control de acceso (núcleo operativo)

- **Scanner dual-mode**: cámara web (BarcodeDetector nativo + fallback ZXing) con pipeline agresivo (upscaling, Otsu, rotación, scanlines, invertido, linterna, zoom HW/SW, priorización adaptativa de estrategias).
- **Lector USB HID** (v3.11.0): captura matrícula al recibir Enter de un lector físico.
- **Modo manual**: input con validación tolerante (prefijos `a/A`, longitudes 7–12, trim).
- **Acceso invitado**: matrícula `INVITADO`, pide nombre, ID sintético `invitado-<timestamp>`.
- **Confirmación matrícula**: diálogo antes de procesar (evita falsos positivos).
- **Validación de matrícula** configurable (`MATRICULA_CONFIG`: dígitos min/max, prefijos permitidos).

### 1.2 Registro y selección

- **Registro de alumno nuevo** con campos fijos (matrícula, nombre, apellidos, carrera, grado, grupo, turno) + datos extra dinámicos (`datosExtra: Record<string,string>`).
- **Selección de motivos múltiples** (hasta N) con retrocompat al campo principal `motivoId/motivoNombre`.
- **5 motivos default**: Estudiar, Pedir libro, Trabajo escolar, Investigación, Otro.
- **CRUD de motivos** con icono (Material Icons), color, orden, activo/inactivo.
- **Detección de duplicado** por umbral configurable (default 30 min) con diálogo Salida / Nuevo / Cancelar.

### 1.3 Registro de salida y presencia

- **Registro de salida** opcional (`registroSalidaActivo`): primera vez = entrada, segunda = pregunta si salida.
- **Cálculo de `duracionMinutos`** al dar salida.
- **Cierre automático** (`horasAutoSalida`, 0=off): marca entradas abiertas viejas con `cierreAutomatico: true`.
- **Vista `/presencia`**: alumnos actualmente en biblioteca, tiempo transcurrido en vivo, confirmación de cierres automáticos.

### 1.4 Control de capacidad

- **Aforo configurable** (`aforoMaximo`, 0=off) con 3 modos:
  - `permitir`: registra pero avisa.
  - `confirmar`: diálogo antes de exceder.
  - `bloquear`: rechaza si está lleno.
- **Indicador semáforo**: libre (<50%) / normal (50–79%) / alto (80–99%) / lleno (100%) / sobreaforo (>100%).
- **Signal reactivo** de ocupación (actualiza en vivo).

### 1.5 Horarios de operación (v3.9.0)

- **Horarios por día de la semana** (domingo–sábado) con rangos hora inicio/fin.
- **Activable/desactivable** global.
- **Modo `advertir`** (toast pero registra) o **`bloquear`** (rechaza fuera de horario).
- **Mensaje de próxima apertura** al estar cerrado.

### 1.6 Modo quiosco (v3.9.0)

- **Oculta sidebar, topbar, bottom nav** para operación supervisada.
- **Redirige cualquier ruta ajena al flujo operativo** a `/scanner`.
- **Salida con long-press 3s en scanner + PIN** configurado.
- **Persiste en localStorage**: sobrevive a reloads.

### 1.7 Vistas y analítica

- **`/dashboard`**: KPIs del día + gráficas.
- **`/estadisticas`**: dashboard ejecutivo con tendencias mensuales, heatmap día×hora, top alumnos, distribución por carrera/motivo, insights automáticos.
- **`/alumnos`**: listado con búsqueda, filtros (activo/inactivo, carrera, turno), edición, detalle individual.
- **`/detalle-alumno/:matricula`**: historial de visitas, estadísticas del alumno.
- **`/registros`**: historial global con filtros por fecha/carrera/motivo/matrícula, edición manual, eliminación.
- **`/inactivos`** (v3.10.0): alumnos sin venir ≥ `umbralInactividadDias`, ordenados por último acceso.
- **`/productividad-diaria`** (v3.12.0): reporte diario del coordinador.

### 1.8 Configuración (coordinador)

- `/configuracion` centraliza todo:
  - Nombre institución, sonido, umbralDuplicadoMin.
  - Registro de salida + `horasAutoSalida`.
  - Aforo + modo.
  - Horarios por día + modo.
  - Modo quiosco + PIN.
  - Celebraciones (v3.9.0) con probabilidad 0–1.
  - Umbral de inactividad.
  - **Limpieza masiva de registros por rango**.
  - **Datos de prueba** (v3.13 en curso): generador con modelo UAT.
  - **Backup**: export/import JSON completo.

### 1.9 Importación y exportación

- **`/importar-alumnos`**: bulk import xlsx con preview y validación de columnas.
- **Exportación PDF/Excel** de registros, alumnos, reportes del día y del mes.
- **Backup JSON** completo (alumnos + registros + motivos + config).
- **Restauración** con detección de duplicados (motivos por nombre).

### 1.10 Novedades (changelog interno)

- **Vista `/novedades`** muestra el array `CHANGELOG`.
- **Badge "Novedades"** en sidebar hasta que el usuario la visita (localStorage `stenbrary-changelog-vista`).
- **4 tipos** de cambio: `feat | fix | mejora | cambio`, con `destacado` opcional.

### 1.11 PWA y offline

- **Instalable** en desktop y móvil (`manifest.webmanifest`).
- **Service Worker** con registro `registerWhenStable:30000`.
- **Operación 100% offline** tras primera carga.
- **Detección de actualizaciones** vía `SwUpdate.versionUpdates`.
- **Error reporter** con cola offline en localStorage, drena al volver online.

### 1.12 Infraestructura y tooling

- **69 tests unitarios** headless (Karma + Jasmine, `ChromeHeadlessCI`).
- **4 smoke E2E** (Playwright).
- **CI GitHub Actions**: type-check + tests + version guardrail.
- **Husky v9 pre-commit**: version guardrail + type-check app/spec.
- **Guardrail de versión**: `package.json` debe coincidir con primer entry de `CHANGELOG`.
- **Lazy load** de `@zxing/browser` para reducir chunk inicial.

---

## 2. Pendientes (roadmap)

Prioridad: **🔴 alta** · **🟡 media** · **🟢 baja**.

### 2.1 Infra de datos 🔴

- [ ] **`DB_VERSION = 2`**: migración que normaliza `fechaHora` string → Date + crea store `audit`. Al bump, implementar `onupgradeneeded`. _(Ahora el código usa fallback `getAll() + filter` para compensar.)_
- [ ] **Activity Log / Audit Trail** (`/actividad`): registrar mutaciones (alumno creado/editado/desactivado, registro editado/eliminado, cambios de config) con usuario + timestamp. Requiere store `audit`. Inspirado en Fishbowl.
- [ ] **`crearRegistrosBatch()`** en `DatabaseService`: transacción única para N registros, reduce tiempo de generación Histórico 30m de ~20 min a ~2–3 min.

### 2.2 Calendario escolar configurable 🔴 (bloquea venta a otras universidades)

- [ ] **`CalendarioEscolarService`**: abstraer las constantes UAT del `DatosPruebaService` a un servicio reactivo con persistencia en `localStorage`.
- [ ] **UI en `/configuracion`**: editor de períodos lectivos (nombre, inicioMMDD, finMMDD, densidadFactor), festivos (lista editable), Semana Santa, horario apertura/cierre, probabilidad de asistencia en verano, ponderación de turnos.
- [ ] **Defaults UAT** disponibles como preset al instalar.
- [ ] **Plantillas preconfiguradas** para otras universidades comunes (a llenar cuando se tenga el primer cliente).
- [ ] **Modalidad de períodos:** soporte para semestres (2/año), trimestres (3/año, ene-mar/abr-jun/jul-sep/oct-dic), cuatrimestres (3/año pero distintos), bimestres y módulos. El comparador del Dashboard Ejecutivo y los presets de período usan este servicio. Hoy "Semestre actual / Semestre anterior" en el comparador asume convención genérica ene-jun / jul-dic — al implementar este servicio, esos atajos se vuelven dinámicos según la modalidad configurada.
- [ ] **Configurar días/meses con clases:** marcar qué meses hay actividad lectiva y cuáles son receso (vacaciones intersemestrales, festivos locales). Lo usan: el generador de seed (no inventa visitas en días sin clases), los reportes (resaltan/excluyen recesos), el dashboard (cálculo de promedios por día lectivo en lugar de día calendario).

### 2.3 UX y analítica 🟡

- [ ] **Búsqueda global Ctrl+K** (spotlight): alumnos + registros + acciones frecuentes.
- [ ] **Tags para alumnos**: etiquetas libres (ej. "becario", "comité", "baja temporal").
- [ ] **Comparativas temporales avanzadas**: overlay del mismo período año anterior en `/estadisticas`.
- [ ] **Alertas persistentes** (dashboard): notificar caídas de asistencia, umbrales de aforo cruzados, inactividad de alumnos clave.
- [ ] **Exportación a Google Sheets** directo (opcional) vía link OAuth.
- [ ] **Filtros por rango de hora** en `/registros` (además del filtro por fecha actual). Útil para analizar picos del día.
- [ ] **Virtual scroll en `/registros`** (cdk-virtual-scroll): hoy con volumen alto (Histórico 30m ≈ 80k+ registros) el scroll lagea. Misma técnica aplicable a la pestaña de historial en `/detalle-alumno`.
- [ ] **Papelera / Undo diferido** para eliminaciones de alumno/registro/motivo: mover a un store `papelera` con retención de 30 días en vez de borrar duro. Hoy solo el toast de "Deshacer" inmediato post-registro cubre ese caso. Se resuelve mejor cuando esté el Activity Log (§2.1).

### 2.3.1 Catálogos editables desde UI 🔴 (bloquea venta a otras universidades)

- [ ] **`CARRERAS` editables desde `/configuracion`**: hoy son constantes en `catalogos.constants.ts`. Problema real: las carreras se renombran con el tiempo (ej. "Licenciatura en Enfermería" no existe en la facultad del coordinador; su propia carrera ya se renombró y volverá a renombrarse). **Requisitos:**
  - CRUD completo (agregar, renombrar, desactivar — no eliminar si hay alumnos/registros vinculados).
  - **Migración bulk**: al renombrar carrera X → Y, actualizar todos los alumnos y registros que la tenían. Confirmación con conteo previo.
  - Persistencia en `ConfigService` / IndexedDB store nuevo (`catalogos`).
  - Dropdown del registro-alumno y filtro de `/alumnos` leen del servicio, no de constantes.
- [ ] **`TURNOS`, `GRADOS`, `GRUPOS` igualmente editables** (menos crítico — estos son más estables que carreras).

### 2.3.2 Permisos y sensibilidad 🟡

- [ ] **Rol admin para operaciones sensibles**: editar matrícula de un alumno existente, eliminar alumno con historial, cambios masivos de carreras. Hoy no hay auth, la protección es solo un `ConfirmDialog`. Depende de §2.4.

### 2.4 Multi-usuario y auth 🟢 (requiere backend)

- [ ] **Roles**: coordinador, personal de biblioteca, consulta-only.
- [ ] **Login con password local** (sin backend) como primer paso.
- [ ] **Auth real** cuando haya backend (Firebase Auth o similar).
- [ ] El Activity Log (§2.1) se enriquece con `usuarioId` cuando esta feature llegue.

### 2.5 Sincronización y cloud 🟢

- [ ] **Backend opcional** (Firebase / Supabase / propio) para sync entre sedes.
- [ ] **Modo híbrido**: offline-first con push cuando hay internet.
- [ ] **Conflict resolution**: estrategia de merge para registros concurrentes.
- [ ] **Dashboard cross-institución** (si se vende a grupos universitarios).

### 2.6 Hardening pre-producción 🟡

- [ ] **Migración completa `*ngIf` → `@if`** en los 7 componentes grandes pendientes (~97 ocurrencias). Se abordará 1 por PR con validación visual manual.
- [ ] **Lighthouse audit completo** (performance, a11y, best practices, SEO). Objetivo: 90+ en todas.
- [ ] **E2E expansion**: flujo completo (escaneo → motivo → salida → export), modo quiosco con PIN, aforo bloqueado.
- [ ] **ADRs** (`docs/adr/`): documentar decisiones arquitectónicas clave (por qué IndexedDB directo, por qué no NgRx, por qué sessionStorage entre rutas, etc.).
- [ ] **Test de generador de datos**: verificar distribuciones (0% registros en domingos, ~15% en verano, etc.) con dataset chico.

### 2.7 Tooling adicional 🟢

- [ ] **Lint rules custom** (por ejemplo, prohibir `*ngIf` con eslint).
- [ ] **Storybook** para el design system.
- [ ] **Visual regression** (Percy o Chromatic) en E2E.
- [ ] **Dependabot** o similar para updates de seguridad.

### 2.8 Descartados por decisión

Cosas que explícitamente **NO** se van a implementar (confirmado con coordinador):

- ❌ Tema claro/oscuro. Dark theme único.
- ❌ Foto de alumno. Costo de almacenamiento vs. beneficio bajo.
- ❌ i18n (internacionalización). Sistema 100% español.
- ❌ Conversión a Electron / app nativa. PWA es suficiente.
- ❌ Sincronización LAN peer-to-peer. Si hay sync, será por backend.

---

## 3. Consideraciones al vender a otra universidad

Checklist mínimo antes de ofrecer el sistema a una segunda universidad:

- [ ] **Calendario configurable** (§2.2) implementado.
- [ ] **`CARRERAS`, `TURNOS`, `GRADOS`, `GRUPOS`** movidos a config persistente (hoy constantes en `catalogos.constants.ts`).
- [ ] **Formato de matrícula** (`MATRICULA_CONFIG`) configurable desde UI.
- [ ] **Logo e identidad visual** de la institución en reportes PDF/Excel.
- [ ] **Nombre institución** ya editable — ✅ hecho.
- [ ] **Activity log** (§2.1) para auditoría básica.
- [ ] **Backup programado** (opcional, requiere backend o indicación al usuario).
- [ ] **Documentación de instalación** para el equipo TI de la institución.
- [ ] **Plan de capacitación** para coordinador + personal.
- [ ] **Versión de demo** limitada en tiempo o volumen (estrategia comercial).

---

## 4. Cómo usar este documento

- **Al planear tanda nueva**: revisar §2 y elegir el pendiente con mejor ratio esfuerzo/valor.
- **Al cerrar tanda**: mover el item de §2 a §1 (features) si quedó completo, o actualizar su estado.
- **Al cambiar prioridad**: sólo cambiar el emoji (🔴/🟡/🟢) con una línea en `DEVLOG.md` explicando por qué.
- **Al descartar algo**: moverlo a §2.8 con el motivo.
