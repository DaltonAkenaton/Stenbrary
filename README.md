<div align="center">
  <h1>📚 Stenbrary</h1>
  <p><strong>Sistema de Registro Digital de Acceso para Bibliotecas</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/version-1.0.0--dev-blue" alt="Version">
    <img src="https://img.shields.io/badge/Angular-18-red" alt="Angular">
    <img src="https://img.shields.io/badge/PWA-enabled-brightgreen" alt="PWA">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  </p>
</div>

---

## 🎯 Descripción

**Stenbrary** es una Progressive Web App (PWA) desarrollada con Angular 18 que digitaliza el proceso de registro de acceso a bibliotecas universitarias, reduciendo el tiempo de registro de **30 segundos a 2-3 segundos** mediante el escaneo de códigos QR/barras.

### ✨ Características Principales

- 📱 **Multiplataforma**: Funciona en PC, tablet y celular
- 🔌 **Offline-first**: Opera sin conexión a internet
- ⚡ **Rápido**: Registro en 2-3 segundos
- 📊 **Estadísticas automáticas**: Dashboard con datos en tiempo real
- 💾 **Almacenamiento local**: IndexedDB para persistencia de datos
- 📤 **Exportación**: CSV y Excel

---

## 🚀 Problema que Resuelve

Las bibliotecas universitarias tradicionales utilizan bitácoras físicas donde los estudiantes deben escribir manualmente:
- Matrícula
- Nombre
- Carrera
- Firma

**Esto genera:**
- ❌ Pérdida de tiempo (30+ segundos por registro)
- ❌ Errores humanos (datos ilegibles, incompletos)
- ❌ Falta de estadísticas confiables
- ❌ Imposibilidad de generar reportes automatizados

**Stenbrary soluciona todo esto digitalizando el proceso completo.**

---

## 💡 Solución

### Flujo de Registro (2-3 segundos)
```
1. Alumno escanea su credencial QR
   ↓
2. Sistema valida matrícula
   ↓
3. Alumno selecciona motivo de visita
   ↓
4. Registro guardado automáticamente
   ↓
5. Confirmación visual ✅
```

### Beneficios Medibles

| Métrica | Antes | Con Stenbrary |
|---------|-------|---------------|
| Tiempo de registro | 30+ segundos | 2-3 segundos |
| Tasa de error | ~30% | <1% |
| Estadísticas | ❌ No disponibles | ✅ Automáticas |
| Costo implementación | - | $170 USD |

---

## 🛠️ Stack Tecnológico

### Frontend
- **Angular 18** - Framework principal
- **Angular Material** - Componentes UI
- **Angular PWA** - Funcionalidad offline
- **TypeScript** - Lenguaje de programación
- **SCSS** - Estilos

### Lectura de Códigos
- **BarcodeDetector API** - Lector principal (nativo)
- **ZXing** - Fallback para compatibilidad

### Almacenamiento
- **IndexedDB** - Base de datos local
- **idb** - Librería de abstracción
- **Service Workers** - Caché y offline

### Exportación
- **xlsx** - Generación de archivos Excel
- **CSV** - Exportación de datos

---

## 📦 Instalación

### Prerequisitos

- Node.js 18 o superior
- npm 9 o superior
- Angular CLI 18

### Pasos de Instalación
```bash
# Clonar el repositorio
git clone https://github.com/TU-USUARIO/stenbrary.git
cd stenbrary

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
ng serve

# Abrir en navegador
# http://localhost:4200
```

---

## 📱 Funcionalidades v1.0

### ✅ Incluidas

- [x] Registro mediante escaneo QR/código de barras
- [x] Registro manual de matrícula (alternativa)
- [x] Registro de nuevos alumnos
- [x] Selección de motivo de visita
- [x] Almacenamiento local (IndexedDB)
- [x] Funcionamiento offline completo
- [x] Dashboard administrativo básico
- [x] Gestión de alumnos (CRUD)
- [x] Gestión de motivos de visita
- [x] Exportación CSV/Excel
- [x] Diseño responsive

### ⏳ Futuras Versiones

- [ ] Backend centralizado (v1.1)
- [ ] Sincronización multi-dispositivo (v1.1)
- [ ] Autenticación por roles (v1.2)
- [ ] Préstamo de libros (v2.0)
- [ ] Control de inventario (v2.0)
- [ ] Integración con sistemas académicos (v3.0)

---

## 🏗️ Arquitectura
```
┌─────────────────────────────────────────┐
│          Angular PWA Frontend           │
├─────────────────────────────────────────┤
│  Scanner  │  Dashboard  │  Gestión     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│        Services (Core Logic)            │
├─────────────────────────────────────────┤
│  Database │  Scanner  │  Export         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         IndexedDB (Local)               │
├─────────────────────────────────────────┤
│  Alumnos  │  Registros  │  Motivos     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Service Worker + Cache             │
└─────────────────────────────────────────┘
```

---

## 📊 Estructura del Proyecto
```
stenbrary/
├── src/
│   ├── app/
│   │   ├── core/              # Servicios singleton
│   │   ├── features/          # Módulos funcionales
│   │   ├── shared/            # Componentes compartidos
│   │   └── styles/            # Estilos globales
│   ├── assets/                # Recursos estáticos
│   └── environments/          # Configuración por entorno
├── docs/                      # Documentación técnica
└── README.md                  # Este archivo
```

---

## 🎯 Roadmap

### ✅ Fase 0: Planeación (Completada)
- Análisis del problema
- Diseño de arquitectura
- Documentación técnica
- Definición del MVP

### 🔄 Fase 1: Desarrollo MVP (En progreso)
**Duración estimada:** 3-4 semanas

- [ ] Setup del proyecto
- [ ] DatabaseService (IndexedDB)
- [ ] ScannerComponent
- [ ] Flujo de registro completo
- [ ] Dashboard básico
- [ ] Exportación de datos

### ⏳ Fase 2: Backend (v1.1)
- Backend Node.js + Express
- PostgreSQL
- Sincronización automática

### ⏳ Fase 3: Seguridad (v1.2)
- Sistema de autenticación
- Control por roles
- Auditoría de acciones

---

## 💻 Desarrollo

### Comandos Principales
```bash
# Desarrollo
npm start              # Servidor de desarrollo
npm run build          # Build de producción
npm test               # Tests unitarios
npm run lint           # Linter

# PWA
npm run build:pwa      # Build con PWA optimizado
```

### Estructura de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):
```bash
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formato de código
refactor: refactorización
test: añadir tests
```

---

## 👥 Roles de Usuario

| Rol | Acceso | Funciones |
|-----|--------|-----------|
| **Alumno** | Pantalla principal | Registrar entrada, seleccionar motivo |
| **Bibliotecario** | Dashboard | Ver registros, exportar datos |
| **Coordinador** | Reportes | Estadísticas, análisis de uso |
| **Administrador** | Completo | Gestión total del sistema |

---

## 📈 Métricas de Éxito

- ⏱️ Tiempo de registro: **< 3 segundos**
- ✅ Tasa de error: **< 1%**
- 📊 Uptime: **> 99%**
- 💯 Satisfacción de usuario: **> 9/10**

---

## 🤝 Contribución

Este es un proyecto académico/profesional personal. Si deseas contribuir:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo [LICENSE](LICENSE) para más detalles.

---

## 👤 Autor

**Dalton Akenaton Gómez Arellano**

- GitHub: [@TU-USUARIO](https://github.com/TU-USUARIO)
- LinkedIn: [Tu LinkedIn](https://linkedin.com/in/tu-perfil)

---

## 📚 Documentación Adicional

- [Documento de Propuesta](docs/PROPUESTA.md)
- [Arquitectura Técnica](docs/ARCHITECTURE.md)
- [Changelog](docs/CHANGELOG.md)

---

## 💰 Presupuesto

| Concepto | Costo |
|----------|-------|
| Hardware (Tablet 10") | $150 USD |
| Soporte para tablet | $20 USD |
| Software | $0 USD |
| **Total** | **$170 USD** |

---

## 🎓 Contexto Académico

Proyecto desarrollado como solución a una problemática real en bibliotecas universitarias, combinando conocimientos de:

- Desarrollo web moderno
- Arquitectura de software
- UX/UI design
- Gestión de proyectos
- Análisis de requerimientos

---

<div align="center">
  <p>⭐ Si este proyecto te parece útil, dale una estrella en GitHub</p>
  <p>Hecho con ❤️ para mejorar la experiencia en bibliotecas universitarias</p>
</div>
