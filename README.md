# 📚 Stenbrary

Sistema PWA de registro de accesos para bibliotecas. Permite escanear credenciales de alumnos, registrar su actividad, y consultar estadísticas de uso — todo funcionando offline.

## Stack Técnico

- **Angular 18.2** con standalone components
- **TypeScript 5.5**
- **Angular Material** — UI components + dark theme
- **IndexedDB** (idb 8.0) — almacenamiento local offline-first
- **Chart.js 4.5** — gráficas en dashboard ejecutivo
- **SheetJS (xlsx)** — importación/exportación de archivos Excel
- **ZXing + BarcodeDetector API** — escaneo de códigos de barras
- **Service Workers** — funcionamiento offline (PWA)
- **Cloudflare Pages** — despliegue (`stenbrary.pages.dev`)

## Funcionalidades

- Escaneo de credenciales con cámara (Code 128, Code 39, QR, EAN-13, etc.)
- Registro manual de matrícula + acceso como invitado
- Selección de motivo de visita (Estudiar, Trabajo escolar, etc.)
- Gestión completa de alumnos (CRUD, filtros, búsqueda)
- Importación masiva desde Excel (.xlsx, .xls, .csv)
- Exportación a Excel de registros y alumnos
- Dashboard con estadísticas en tiempo real (auto-refresh 30s)
- Dashboard ejecutivo con gráficas Chart.js (barras, dona, carreras)
- Mapa de calor de actividad por día/hora
- Top alumnos más frecuentes + insights automáticos
- Sistema de backup/restore con JSON
- Configuración del sistema con limpieza de datos
- Gestión de motivos/actividades (crear, editar, reordenar)

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/stenbrary.git
cd stenbrary

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
ng serve
```

Navega a `http://localhost:4200/`

## Comandos

| Comando | Descripción |
|---------|-------------|
| `ng serve` | Servidor de desarrollo con hot-reload |
| `ng build` | Build de producción en `dist/stenbrary/` |
| `ng test` | Tests unitarios con Karma |
| `ng build --configuration=development` | Build sin optimización |

## Estructura del Proyecto

```
src/app/
├── core/                    → Servicios, modelos, guards, constantes
│   ├── models/              → Interfaces (Alumno, Registro, Motivo)
│   ├── services/            → Lógica de negocio (Database, Export, Backup...)
│   ├── guards/              → Protección de rutas
│   └── constants/           → Catálogos y valores fijos
│
├── shared/                  → Componentes reutilizables (Loading, Toast)
│
└── features/                → Páginas (lazy-loaded)
    ├── scanner/             → Escaneo de credenciales
    ├── seleccion-motivo/    → Selección de actividad
    ├── registro-alumno/     → Formulario de nuevo alumno
    ├── dashboard/           → Resumen con auto-refresh
    ├── dashboard-ejecutivo/ → Gráficas y estadísticas avanzadas
    ├── alumnos/             → Gestión de alumnos
    ├── detalle-alumno/      → Perfil individual del alumno
    ├── registros/           → Historial de accesos
    ├── gestion-motivos/     → CRUD de motivos/actividades
    ├── importar-alumnos/    → Importación masiva desde Excel
    └── configuracion/       → Backup, restore, info del sistema
```

## Arquitectura

- **Offline-first**: Toda la data se almacena en IndexedDB. No requiere conexión a internet.
- **Standalone components**: Sin NgModules, cada componente declara sus propias dependencias.
- **Lazy loading**: Cada feature se carga bajo demanda vía `loadComponent()`.
- **PWA**: Service Worker habilitado para caché de assets y funcionamiento sin red.

## Despliegue

Se publica en Cloudflare Pages: cada push a `main` compila y despliega solo. Cloudflare sirve
`index.html` en cualquier ruta (routing de la SPA) y `public/_headers` fija la caché. Guía:
`docs/DESPLIEGUE-CLOUDFLARE.md`.

```bash
# Build de producción
ng build

# Cloudflare publica el contenido de dist/stenbrary/browser/
```

## Versión

**v3.5.1** — Marzo 2026

## Licencia

Proyecto privado — Todos los derechos reservados.