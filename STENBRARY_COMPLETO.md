# STENBRARY - Codigo Fuente Completo
# Version: v3.6.1 | Generado: 2026-03-17 21:05
# Angular 18.2 | TypeScript 5.5 | Material | IndexedDB | Chart.js | jsPDF

## FILE: package.json
```json
{
  "name": "stenbrary",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^18.2.0",
    "@angular/cdk": "^18.2.14",
    "@angular/common": "^18.2.0",
    "@angular/compiler": "^18.2.0",
    "@angular/core": "^18.2.0",
    "@angular/forms": "^18.2.0",
    "@angular/material": "^18.2.14",
    "@angular/platform-browser": "^18.2.0",
    "@angular/platform-browser-dynamic": "^18.2.0",
    "@angular/router": "^18.2.0",
    "@angular/service-worker": "^18.2.0",
    "@zxing/browser": "^0.1.5",
    "@zxing/library": "^0.21.3",
    "chart.js": "^4.5.1",
    "idb": "^8.0.3",
    "jspdf": "^4.2.0",
    "jspdf-autotable": "^5.0.7",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "uuid": "^10.0.0",
    "xlsx": "^0.18.5",
    "zone.js": "~0.14.3"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^18.2.0",
    "@angular/cli": "^18.2.0",
    "@angular/compiler-cli": "^18.2.0",
    "@types/jasmine": "~5.1.0",
    "@types/uuid": "^10.0.0",
    "@types/xlsx": "^0.0.35",
    "jasmine-core": "~5.2.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "typescript": "~5.5.2"
  }
}

```

## FILE: angular.json
```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "stenbrary": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "scss"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/stenbrary",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": [
              "zone.js"
            ],
            "tsConfig": "tsconfig.app.json",
            "inlineStyleLanguage": "scss",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              },
              {
                "glob": "_redirects",
                "input": "public",
                "output": "/"
              }
            ],
            "styles": [
              "@angular/material/prebuilt-themes/azure-blue.css",
              "src/styles.scss"
            ],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2MB",
                  "maximumError": "5MB"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "20kB",
                  "maximumError": "40kB"
                }
              ],
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ],
              "outputHashing": "all",
              "serviceWorker": "ngsw-config.json"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "stenbrary:build:production"
            },
            "development": {
              "buildTarget": "stenbrary:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": {
          "builder": "@angular-devkit/build-angular:extract-i18n"
        },
        "test": {
          "builder": "@angular-devkit/build-angular:karma",
          "options": {
            "polyfills": [
              "zone.js",
              "zone.js/testing"
            ],
            "tsConfig": "tsconfig.spec.json",
            "inlineStyleLanguage": "scss",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              }
            ],
            "styles": [
              "@angular/material/prebuilt-themes/azure-blue.css",
              "src/styles.scss"
            ],
            "scripts": []
          }
        }
      }
    }
  },
  "cli": {
    "analytics": false
  }
}
```

## FILE: tsconfig.json
```json
/* To learn more about Typescript configuration file: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html. */
/* To learn more about Angular compiler options: https://angular.dev/reference/configs/angular-compiler-options. */
{
  "compileOnSave": false,
  "compilerOptions": {
    "outDir": "./dist/out-tsc",
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "declaration": false,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "lib": [
      "ES2022",
      "dom"
    ]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}

```

## FILE: tsconfig.app.json
```json
/* To learn more about Typescript configuration file: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html. */
/* To learn more about Angular compiler options: https://angular.dev/reference/configs/angular-compiler-options. */
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": [
    "src/main.ts"
  ],
  "include": [
    "src/**/*.d.ts"
  ]
}

```

## FILE: src\index.html
```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Stenbrary</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="manifest" href="manifest.webmanifest">

  <!-- Tema PWA â€” Cyan Cube -->
  <meta name="theme-color" content="#00C8D7">

  <!-- TipografÃ­a Stenbrary v3.2 -->
  <!-- Space Grotesk: headings/display (reemplaza Syne â€” mejores nÃºmeros) -->
  <!-- DM Sans: body -->
  <!-- Space Mono: cÃ³digos/matrÃ­culas -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body class="mat-typography">
  <app-root></app-root>
  <noscript>Por favor activa JavaScript para usar Stenbrary.</noscript>
</body>
</html>
```

## FILE: src\main.ts
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

```

## FILE: src\styles.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  Stenbrary â€” Global Styles                           â•‘
// â•‘  Cyan Cube Design System â€” v3.2                      â•‘
// â•‘                                                      â•‘
// â•‘  FIXES v3.2:                                         â•‘
// â•‘  - mat-tab labels: visible text on dark bg            â•‘
// â•‘  - mat-dialog: dark background, visible title         â•‘
// â•‘  - mat-select: dark dropdown panel                    â•‘
// â•‘  - mat-chip: dark themed                              â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@use '@angular/material' as mat;
@import 'styles/variables';
@import 'styles/mixins';

// â”€â”€â”€ RESET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: $font-body;
  background-color: $navy-900;
  color: $text-primary;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// â”€â”€â”€ FONDO GLOBAL CON MESH SUTIL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 55% 45% at 15% 20%, rgba(0, 200, 215, 0.06) 0%, transparent 70%),
    radial-gradient(ellipse 35% 55% at 88% 75%, rgba(0, 169, 158, 0.05) 0%, transparent 70%);
}

// â”€â”€â”€ SCROLLBAR PERSONALIZADO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: $navy-800;
}

::-webkit-scrollbar-thumb {
  background: $navy-600;
  border-radius: 3px;

  &:hover {
    background: $cyan-600;
  }
}

// Firefox scrollbar
* {
  scrollbar-width: thin;
  scrollbar-color: $navy-600 $navy-800;
}

// â”€â”€â”€ TIPOGRAFÃA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
h1, h2, h3, h4, h5, h6 {
  font-family: $font-display;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: $text-primary;
}

.mono, .matricula, .timestamp {
  font-family: $font-mono;
  letter-spacing: 0.02em;
}

// â”€â”€â”€ UTILIDADES GLOBALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.full-width  { width: 100%; }
.full-height { height: 100%; }
.text-center { text-align: center; }
.text-right  { text-align: right; }

.mt-1 { margin-top: $spacing-sm; }
.mt-2 { margin-top: $spacing-md; }
.mt-3 { margin-top: $spacing-lg; }
.mt-4 { margin-top: $spacing-xl; }
.mb-1 { margin-bottom: $spacing-sm; }
.mb-2 { margin-bottom: $spacing-md; }
.mb-3 { margin-bottom: $spacing-lg; }
.mb-4 { margin-bottom: $spacing-xl; }

.flex          { display: flex; }
.flex-center   { @include flex-center; }
.flex-column   { @include flex-column; }
.flex-between  { @include flex-between; }
.flex-1        { flex: 1; }

// â”€â”€â”€ ANIMACIONES GLOBALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideInUp {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes slideInDown {
  from { transform: translateY(-16px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.92); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.04); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 8px  rgba(0, 200, 215, 0.3); }
  50%       { box-shadow: 0 0 20px rgba(0, 200, 215, 0.6); }
}

@keyframes scanLine {
  0%   { top: 4px; opacity: 1; }
  50%  { top: calc(100% - 6px); opacity: 1; }
  100% { top: 4px; opacity: 1; }
}

.fade-in      { animation: fadeIn    $transition-normal both; }
.slide-in-up  { animation: slideInUp $transition-normal both; }
.slide-in-down{ animation: slideInDown $transition-normal both; }
.scale-in     { animation: scaleIn   $transition-normal both; }
.pulse        { animation: pulse 2s ease-in-out infinite; }

// â”€â”€â”€ CARD GENÃ‰RICO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.card {
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  padding: $spacing-lg;

  &.card-hover {
    transition: border-color $transition-fast, box-shadow $transition-fast, transform $transition-fast;
    cursor: pointer;

    &:hover {
      border-color: $border-glow;
      box-shadow: 0 0 32px rgba(0, 200, 215, 0.08);
      transform: translateY(-2px);
    }
  }
}

// â”€â”€â”€ BOTÃ“N PRIMARIO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  background: linear-gradient(135deg, $cyan-500, $teal-500);
  color: $navy-950;
  padding: 10px $spacing-lg;
  border: none;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: $shadow-cyan;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 28px rgba(0, 200, 215, 0.35);
  }

  &:active { transform: translateY(0); }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

// â”€â”€â”€ CHIP / BADGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.chip-cyan {
  font-family: $font-mono;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 100px;
  background: rgba(0, 200, 215, 0.12);
  color: $cyan-400;
  border: 1px solid $border-glow;
  letter-spacing: 0.5px;
}

// â”€â”€â”€ LOADING SPINNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid $navy-600;
  border-top-color: $cyan-500;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

// â”€â”€â”€ OVERLAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.overlay {
  @include overlay;
  @include flex-center;
  backdrop-filter: blur(4px);
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ANGULAR MATERIAL â€” DARK THEME OVERRIDES
// Overrides completos para que TODOS los componentes
// de Material respeten la paleta navy/cyan.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ CARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-card {
  background: $navy-800 !important;
  border: 1px solid $border-subtle !important;
  color: $text-primary !important;
}

// â”€â”€â”€ FORM FIELDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-form-field {
  .mdc-text-field {
    background-color: $navy-700 !important;
    border-radius: $border-radius-sm !important;
  }

  .mdc-floating-label,
  .mat-mdc-input-element,
  .mat-mdc-select-value {
    color: $text-primary !important;
  }

  // Placeholder text
  .mat-mdc-input-element::placeholder {
    color: $text-muted !important;
  }

  // Outline borders
  .mdc-text-field--outlined .mdc-notched-outline__leading,
  .mdc-text-field--outlined .mdc-notched-outline__notch,
  .mdc-text-field--outlined .mdc-notched-outline__trailing {
    border-color: $border-subtle !important;
  }

  // Focused state
  &.mat-focused {
    .mdc-text-field--outlined .mdc-notched-outline__leading,
    .mdc-text-field--outlined .mdc-notched-outline__notch,
    .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: $cyan-500 !important;
    }

    .mdc-floating-label {
      color: $cyan-400 !important;
    }
  }

  // Hint text
  .mat-mdc-form-field-hint {
    color: $text-muted !important;
  }

  // Prefix/suffix icons
  .mat-mdc-form-field-icon-prefix,
  .mat-mdc-form-field-icon-suffix {
    color: $text-muted !important;
  }
}

// â”€â”€â”€ TABS â€” CRITICAL FIX â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// El texto de los tabs era invisible porque el color heredado
// de Material era oscuro sobre fondo oscuro.
.mat-mdc-tab-group {
  .mat-mdc-tab-header {
    border-bottom: 1px solid $border-subtle;
    background: $navy-800;
  }

  // Label text â€” THE FIX
  .mat-mdc-tab .mdc-tab__text-label {
    color: $text-secondary !important;
    font-family: $font-body;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  // Active tab
  .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
    color: $cyan-400 !important;
    font-weight: 600;
  }

  // Tab indicator (underline)
  .mat-mdc-tab-header .mdc-tab-indicator__content--underline {
    border-color: $cyan-500 !important;
  }

  // Ripple
  .mat-mdc-tab .mat-ripple-element {
    background-color: rgba(0, 200, 215, 0.08) !important;
  }

  // Hover
  .mat-mdc-tab:hover .mdc-tab__text-label {
    color: $text-primary !important;
  }
}

// â”€â”€â”€ DIALOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-dialog-container {
  .mdc-dialog__surface {
    background: $navy-800 !important;
    border: 1px solid $border-subtle !important;
    border-radius: $border-radius-lg !important;
    color: $text-primary !important;
  }

  // Dialog title
  .mat-mdc-dialog-title {
    color: $text-primary !important;
    font-family: $font-display !important;

    // Fix: prevent title from being clipped
    &::before {
      display: none !important;
    }
  }

  // Dialog actions
  .mat-mdc-dialog-actions {
    border-top: 1px solid $border-subtle;
    padding: $spacing-md $spacing-lg !important;
  }
}

// â”€â”€â”€ SELECT DROPDOWN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-select-panel {
  background: $navy-700 !important;
  border: 1px solid $border-subtle !important;
  border-radius: $border-radius-md !important;

  .mat-mdc-option {
    color: $text-primary !important;

    &:hover {
      background: rgba(0, 200, 215, 0.08) !important;
    }

    &.mat-mdc-option-active,
    &.mdc-list-item--selected {
      background: rgba(0, 200, 215, 0.12) !important;
      color: $cyan-400 !important;
    }
  }
}

// â”€â”€â”€ BUTTONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-raised-button.mat-primary {
  background: linear-gradient(135deg, $cyan-500, $teal-400) !important;
  color: $navy-950 !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25) !important;
}

.mat-mdc-outlined-button,
.mat-mdc-button {
  color: $text-secondary !important;

  &:hover {
    background: rgba(0, 200, 215, 0.06) !important;
  }
}

// â”€â”€â”€ SNACK BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-snack-bar-container {
  background: $navy-700 !important;
  border: 1px solid $border-glow !important;
  color: $text-primary !important;
  border-radius: $border-radius-md !important;
}

// â”€â”€â”€ TOOLTIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-tooltip .mdc-tooltip__surface {
  background: $navy-700 !important;
  color: $text-primary !important;
  border: 1px solid $border-subtle !important;
  font-family: $font-body !important;
  font-size: 12px !important;
}

// â”€â”€â”€ PROGRESS SPINNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-progress-spinner circle {
  stroke: $cyan-500 !important;
}

// â”€â”€â”€ CHIPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-chip {
  background: rgba(0, 200, 215, 0.10) !important;
  color: $cyan-400 !important;
  border: 1px solid $border-subtle !important;
}

// â”€â”€â”€ TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-table {
  background: transparent !important;

  .mat-mdc-header-cell {
    background: $navy-700 !important;
    color: $text-primary !important;
    border-bottom-color: $border-subtle !important;
  }

  .mat-mdc-cell {
    color: $text-secondary !important;
    border-bottom-color: $border-subtle !important;
  }

  .mat-mdc-row:hover {
    background: rgba(0, 200, 215, 0.04) !important;
  }
}

// â”€â”€â”€ PAGINATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.mat-mdc-paginator {
  background: transparent !important;
  color: $text-secondary !important;
}
```

## FILE: src\app\app.component.html
```html
<!--
  app.component.html
  Shell de la aplicaciÃ³n: Sidebar + Topbar + Ãrea de contenido
  Stenbrary v3.6 â€” PWA Update Banner

  NUEVO v3.6:
  - Banner de actualizaciÃ³n PWA sobre el contenido
  - Sidebar con ConfiguraciÃ³n
-->

<div class="app-shell" [class.sidebar-expanded]="isSidebarExpanded()">

  <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       SIDEBAR â€” NavegaciÃ³n lateral persistente
       64px colapsado / 220px expandido (via toggle del logo)
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
  <aside class="sidebar" [class.expanded]="isSidebarExpanded()">

    <!-- Logo / Toggle -->
    <button
      class="sidebar-logo"
      (click)="toggleSidebar()"
      [attr.aria-label]="isSidebarExpanded() ? 'Colapsar menÃº' : 'Expandir menÃº'"
      matRipple
      matRippleColor="rgba(0, 200, 215, 0.12)">
      <span class="logo-mark">S</span>
      @if (isSidebarExpanded()) {
        <span class="logo-text">tenbrary</span>
      }
    </button>

    <!-- LÃ­nea divisora despuÃ©s del logo -->
    <div class="sidebar-divider"></div>

    <!-- Nav items principales -->
    <nav class="sidebar-nav" aria-label="NavegaciÃ³n principal">
      @for (item of navItems; track item.route) {
        <a
          class="nav-item"
          [routerLink]="item.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          [attr.aria-label]="item.label"
          [matTooltip]="!isSidebarExpanded() ? item.label : ''"
          matTooltipPosition="right"
          matRipple
          matRippleColor="rgba(0, 200, 215, 0.10)">
          <mat-icon>{{ item.icon }}</mat-icon>
          @if (isSidebarExpanded()) {
            <span class="nav-label">{{ item.label }}</span>
          }
        </a>
      }
    </nav>

    <!-- Spacer empuja el footer hacia abajo -->
    <div class="sidebar-spacer"></div>

    <!-- LÃ­nea divisora antes del footer -->
    <div class="sidebar-divider"></div>

    <!-- Footer del sidebar (alertas, etc.) -->
    <div class="sidebar-footer">
      <a
        class="nav-item"
        [routerLink]="alertNavItem.route"
        routerLinkActive="active"
        [attr.aria-label]="alertNavItem.label"
        [matTooltip]="!isSidebarExpanded() ? alertNavItem.label : ''"
        matTooltipPosition="right"
        matRipple
        matRippleColor="rgba(0, 200, 215, 0.10)">
        <mat-icon>{{ alertNavItem.icon }}</mat-icon>
        @if (isSidebarExpanded()) {
          <span class="nav-label">{{ alertNavItem.label }}</span>
        }
      </a>
    </div>

  </aside>

  <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       ÃREA PRINCIPAL â€” Topbar + Contenido de ruta
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
  <div class="main-area">

    <!-- Topbar -->
    <header class="topbar">
      <h1 class="topbar-title">{{ currentPageTitle }}</h1>
      <div class="topbar-end">
        <!-- Badge de estado â€” reactivo a navigator.onLine -->
        @if (isOnline()) {
          <span
            class="status-badge status-online"
            matTooltip="Conectado a internet â€” los datos se sincronizarÃ¡n"
            matTooltipPosition="below">
            <span class="status-dot"></span>
            <mat-icon class="status-icon">wifi</mat-icon>
            Online
          </span>
        } @else {
          <span
            class="status-badge status-offline"
            matTooltip="Sin conexiÃ³n â€” los registros se guardan localmente y se sincronizarÃ¡n al reconectar"
            matTooltipPosition="below">
            <span class="status-dot"></span>
            <mat-icon class="status-icon">wifi_off</mat-icon>
            Offline
          </span>
        }
      </div>
    </header>

    <!-- Separador del topbar -->
    <div class="topbar-separator"></div>

    <!-- â•â•â• Banner de actualizaciÃ³n PWA â•â•â• -->
    <div class="update-banner" *ngIf="hayActualizacion">
      <div class="update-content">
        <mat-icon>system_update</mat-icon>
        <span>Hay una nueva versiÃ³n disponible</span>
      </div>
      <div class="update-actions">
        <button class="update-dismiss" (click)="descartarActualizacion()">
          Ahora no
        </button>
        <button class="update-apply" (click)="actualizarApp()">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </div>
    </div>

    <!-- Contenido dinÃ¡mico de cada ruta -->
    <main class="content-area">
      <router-outlet />
    </main>

  </div>

</div>
```

## FILE: src\app\app.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  app.component.scss                                  â•‘
// â•‘  Shell: Sidebar + Topbar + Ãrea de contenido         â•‘
// â•‘  Stenbrary v3.3 â€” NavegaciÃ³n por secciones           â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../styles/variables';
@import '../styles/mixins';

// â”€â”€â”€ SHELL PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.app-shell {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SIDEBAR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
.sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: $sidebar-width;
  min-height: 100vh;
  background: $navy-950;
  border-right: 1px solid $border-subtle;
  z-index: $z-sidebar;
  flex-shrink: 0;

  transition:
    width $transition-normal,
    align-items $transition-fast;

  &.expanded {
    width: $sidebar-width-expanded;
    align-items: flex-start;

    .sidebar-logo { justify-content: flex-start; }
    .nav-item     { justify-content: flex-start; }
  }
}

// â”€â”€â”€ LOGO / TOGGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 14px 12px;
  background: none;
  border: none;
  cursor: pointer;
  justify-content: center;
  border-radius: 0;
  transition: background $transition-fast;

  &:hover {
    background: rgba(0, 200, 215, 0.06);
  }

  .logo-mark {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 9px;
    background: linear-gradient(135deg, $cyan-500, $teal-500);
    color: $navy-950;
    font-family: $font-mono;
    font-size: 15px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 18px $cyan-glow;
    transition: box-shadow $transition-normal;
  }

  &:hover .logo-mark {
    box-shadow: 0 0 28px rgba(0, 200, 215, 0.35);
  }

  .logo-text {
    font-family: $font-display;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
  }
}

// â”€â”€â”€ DIVISORES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.sidebar-divider {
  width: 32px;
  height: 1px;
  background: $border-subtle;
  margin: 6px 0;
  flex-shrink: 0;
  transition: width $transition-normal;

  .expanded & {
    width: calc(100% - 28px);
    margin: 6px 14px;
  }
}

// â”€â”€â”€ NAV SECTION TITLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.nav-section-title {
  display: block;
  font-family: $font-mono;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: $text-muted;
  padding: 12px 18px 4px;
  white-space: nowrap;
  overflow: hidden;
}

// When collapsed, show a small dot as section separator
.nav-section-dot {
  width: 4px;
  height: 4px;
  background: $border-subtle;
  border-radius: 50%;
  margin: 8px auto;
  flex-shrink: 0;
}

// â”€â”€â”€ NAV ITEMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  padding: 4px 0;
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: calc(100% - 12px);
  min-height: 42px;
  padding: 0 12px;
  border-radius: $border-radius-md;
  margin: 0 6px;
  cursor: pointer;
  text-decoration: none;
  color: $text-muted;
  transition:
    color $transition-fast,
    background $transition-fast,
    box-shadow $transition-fast;

  mat-icon {
    font-size: 21px;
    width: 21px;
    height: 21px;
    flex-shrink: 0;
    transition: color $transition-fast;
  }

  .nav-label {
    font-family: $font-body;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    background: $navy-700;
    color: $text-secondary;
  }

  &.active {
    background: rgba(0, 200, 215, 0.12);
    color: $cyan-400;
    box-shadow: inset 0 0 0 1px $border-glow;

    mat-icon {
      color: $cyan-500;
      filter: drop-shadow(0 0 6px rgba(0, 200, 215, 0.5));
    }

    .nav-label {
      font-weight: 600;
    }
  }
}

// â”€â”€â”€ SPACER + FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.sidebar-spacer {
  flex: 1;
}

.sidebar-footer {
  width: 100%;
  padding: 4px 0 12px;

  .nav-item.active {
    background: rgba(245, 166, 35, 0.10);
    color: $amber-color;
    box-shadow: inset 0 0 0 1px rgba(245, 166, 35, 0.30);

    mat-icon {
      color: $amber-color;
      filter: drop-shadow(0 0 6px rgba(245, 166, 35, 0.4));
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN AREA â€” Topbar + Contenido
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
.main-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

// â”€â”€â”€ TOPBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $topbar-height;
  padding: 0 $spacing-lg;
  flex-shrink: 0;
  background: transparent;

  .topbar-title {
    font-family: $font-display;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: $text-primary;
  }

  .topbar-end {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }
}

// â”€â”€â”€ SEPARADOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.topbar-separator {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    $border-subtle 20%,
    $border-glow 50%,
    $border-subtle 80%,
    transparent 100%
  );
  flex-shrink: 0;
}

// â”€â”€â”€ STATUS BADGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.status-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: $font-mono;
  font-size: 11px;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border-radius: 100px;
  cursor: default;
  transition: all 300ms ease;

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-icon {
    font-size: 14px;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &.status-online {
    background: rgba(14, 176, 123, 0.12);
    color: #68D391;
    border: 1px solid rgba(14, 176, 123, 0.30);

    .status-dot {
      background: $success-color;
      box-shadow: 0 0 6px $success-color;
      animation: glowPulse 2.5s ease-in-out infinite;
    }

    .status-icon { color: $success-color; }
  }

  &.status-offline {
    background: rgba(245, 166, 35, 0.10);
    color: $amber-color;
    border: 1px solid rgba(245, 166, 35, 0.30);

    .status-dot {
      background: $amber-color;
      animation: glowPulseAmber 2s ease-in-out infinite;
    }

    .status-icon { color: $amber-color; }
  }
}

@keyframes glowPulseAmber {
  0%, 100% { box-shadow: 0 0 4px rgba(245, 166, 35, 0.3); }
  50%      { box-shadow: 0 0 10px rgba(245, 166, 35, 0.6); }
}

// â”€â”€â”€ CONTENT AREA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RESPONSIVE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
@media (max-width: $breakpoint-sm) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: $z-sidebar;
    transform: translateX(-100%);
    transition: transform $transition-normal;
    box-shadow: $shadow-lg;

    &.expanded {
      transform: translateX(0);
    }
  }

  .main-area {
    width: 100%;
  }

  .topbar {
    padding: 0 $spacing-md;
  }
}


// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  AGREGAR al final de:                                â•‘
// â•‘  src/app/app.component.scss                          â•‘
// â•‘  Stenbrary v3.6 â€” Estilos del banner de actualizaciÃ³nâ•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ PWA Update Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

.update-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(0, 200, 215, 0.08));
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
  animation: slideDown 300ms ease-out;
}

@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.update-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #E8F4F8;
  font-size: 0.85rem;
  font-weight: 500;

  mat-icon {
    color: #6366F1;
    font-size: 20px;
    width: 20px;
    height: 20px;
  }
}

.update-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-dismiss {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(200, 230, 240, 0.4);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  cursor: pointer;
  transition: color 200ms;

  &:hover { color: rgba(200, 230, 240, 0.7); }
}

.update-apply {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366F1, #4F46E5);
  color: white;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms;

  mat-icon {
    font-size: 14px;
    width: 14px;
    height: 14px;
  }

  &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
}

@media (max-width: 600px) {
  .update-banner {
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
  }
}
```

## FILE: src\app\app.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  app.component.ts                                    â•‘
// â•‘  Stenbrary v3.6 â€” PWA Update + Sidebar completo      â•‘
// â•‘                                                      â•‘
// â•‘  NUEVO v3.6:                                         â•‘
// â•‘  - PwaUpdateService: banner de nueva versiÃ³n         â•‘
// â•‘  - Sidebar: + ConfiguraciÃ³n en AdministraciÃ³n        â•‘
// â•‘  - currentPageTitle: + configuracion, importar       â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { PwaUpdateService } from './core/services/pwa-update.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatRippleModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {

  // â”€â”€â”€ ESTADO DEL SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  isSidebarExpanded = signal(false);

  toggleSidebar(): void {
    this.isSidebarExpanded.update(v => !v);
  }

  // â”€â”€â”€ ESTADO DE CONEXIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  isOnline = signal(navigator.onLine);

  private onlineHandler = () => this.isOnline.set(true);
  private offlineHandler = () => this.isOnline.set(false);

  // â”€â”€â”€ PWA UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  hayActualizacion = false;

  constructor(
    private router: Router,
    private pwaUpdateService: PwaUpdateService,
  ) {}

  ngOnInit(): void {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    // Iniciar detecciÃ³n de actualizaciones PWA
    this.pwaUpdateService.iniciar();
    this.pwaUpdateService.actualizacionDisponible$.subscribe(
      disponible => this.hayActualizacion = disponible
    );
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }

  actualizarApp(): void {
    this.pwaUpdateService.aplicarActualizacion();
  }

  descartarActualizacion(): void {
    this.pwaUpdateService.descartarActualizacion();
  }

  // â”€â”€â”€ NAVEGACIÃ“N POR SECCIONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  readonly navSections: NavSection[] = [
    {
      title: 'OperaciÃ³n',
      items: [
        {
          icon: 'qr_code_scanner',
          label: 'Registro de Actividad',
          route: '/scanner',
          exact: true,
        },
        {
          icon: 'person_add',
          label: 'Registrar Alumno',
          route: '/registro-alumno',
        },
      ],
    },
    {
      title: 'Consulta',
      items: [
        {
          icon: 'dashboard',
          label: 'Resumen',
          route: '/dashboard',
        },
        {
          icon: 'groups',
          label: 'Alumnos',
          route: '/alumnos',
        },
        {
          icon: 'history',
          label: 'Registros',
          route: '/registros',
        },
        {
          icon: 'bar_chart',
          label: 'EstadÃ­sticas',
          route: '/estadisticas',
        },
      ],
    },
    {
      title: 'AdministraciÃ³n',
      items: [
        {
          icon: 'category',
          label: 'GestiÃ³n de Motivos',
          route: '/gestion-motivos',
        },
        {
          icon: 'settings',
          label: 'ConfiguraciÃ³n',
          route: '/configuracion',
        },
      ],
    },
  ];

  // Flat list for backward compatibility
  get navItems(): NavItem[] {
    return this.navSections.flatMap(s => s.items);
  }

  readonly alertNavItem: NavItem = {
    icon: 'notifications',
    label: 'Alertas',
    route: '/alertas',
  };

  // â”€â”€â”€ TOPBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  get currentPageTitle(): string {
    const map: Record<string, string> = {
      '/scanner':           'Registro de Actividad',
      '/registro-alumno':   'Registrar Alumno',
      '/seleccion-motivo':  'Seleccionar Actividad',
      '/dashboard':         'Resumen',
      '/alumnos':           'Alumnos',
      '/registros':         'Registros',
      '/estadisticas':      'EstadÃ­sticas',
      '/gestion-motivos':   'GestiÃ³n de Motivos',
      '/configuracion':     'ConfiguraciÃ³n',
      '/importar-alumnos':  'Importar Alumnos',
      '/alertas':           'Alertas',
    };
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/detalle-alumno')) return 'Detalle del Alumno';
    return map[url] ?? 'Stenbrary';
  }
}
```

## FILE: src\app\app.config.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/app.config.ts                         â•‘
// â•‘  Stenbrary v3.6 â€” Con Global Error Handler            â•‘
// â•‘                                                      â•‘
// â•‘  NUEVO v3.6:                                         â•‘
// â•‘  - GlobalErrorHandler como ErrorHandler provider      â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { ApplicationConfig, provideZoneChangeDetection, isDevMode, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/services/global-error.handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
```

## FILE: src\app\app.routes.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/app.routes.ts                        â•‘
// â•‘  Stenbrary v3.5 â€” Con importaciÃ³n masiva             â•‘
// â•‘                                                      â•‘
// â•‘  NUEVO v3.5:                                         â•‘
// â•‘  - /importar-alumnos â†’ ImportarAlumnosComponent      â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/scanner',
    pathMatch: 'full',
  },
  {
    path: 'scanner',
    loadComponent: () =>
      import('./features/scanner/scanner.component').then(m => m.ScannerComponent),
    title: 'Stenbrary â€” Registro',
  },
  {
    path: 'registro-alumno',
    loadComponent: () =>
      import('./features/registro-alumno/registro-alumno.component').then(m => m.RegistroAlumnoComponent),
    title: 'Stenbrary â€” Nuevo Alumno',
  },
  {
    path: 'seleccion-motivo',
    loadComponent: () =>
      import('./features/seleccion-motivo/seleccion-motivo.component').then(m => m.SeleccionMotivoComponent),
    title: 'Stenbrary â€” Actividad',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Stenbrary â€” Resumen',
  },
  {
    path: 'alumnos',
    loadComponent: () =>
      import('./features/alumnos/alumnos.component').then(m => m.AlumnosComponent),
    title: 'Stenbrary â€” Alumnos',
  },
  {
    path: 'registros',
    loadComponent: () =>
      import('./features/registros/registros.component').then(m => m.RegistrosComponent),
    title: 'Stenbrary â€” Registros',
  },
  {
    path: 'estadisticas',
    loadComponent: () =>
      import('./features/dashboard-ejecutivo/dashboard-ejecutivo.component').then(m => m.DashboardEjecutivoComponent),
    title: 'Stenbrary â€” EstadÃ­sticas',
  },
  {
    path: 'gestion-motivos',
    loadComponent: () =>
      import('./features/gestion-motivos/gestion-motivos.component').then(m => m.GestionMotivosComponent),
    title: 'Stenbrary â€” GestiÃ³n de Motivos',
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./features/configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
    title: 'Stenbrary â€” ConfiguraciÃ³n',
  },
  {
    path: 'importar-alumnos',
    loadComponent: () =>
      import('./features/importar-alumnos/importar-alumnos.component').then(m => m.ImportarAlumnosComponent),
    title: 'Stenbrary â€” Importar Alumnos',
  },
  {
    path: 'detalle-alumno/:matricula',
    loadComponent: () =>
      import('./features/detalle-alumno/detalle-alumno.component').then(m => m.DetalleAlumnoComponent),
    title: 'Stenbrary â€” Detalle del Alumno',
  },
  {
    path: '**',
    redirectTo: '/scanner',
  },
];
```

## FILE: src\app\core\constants\catalogos.constants.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/constants/catalogos.constants.ts â•‘
// â•‘  Stenbrary v3.6 â€” CatÃ¡logos centralizados UAT        â•‘
// â•‘                                                      â•‘
// â•‘  FIX: Carreras corregidas â€” UAT solo tiene            â•‘
// â•‘  licenciaturas, no ingenierÃ­as                        â•‘
// â•‘                                                      â•‘
// â•‘  FUENTE ÃšNICA: todos los componentes deben importar   â•‘
// â•‘  de aquÃ­ en vez de tener arrays locales.              â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Carreras de la UAT (Universidad AutÃ³noma de Tamaulipas).
 * Solo licenciaturas â€” la UAT no ofrece ingenierÃ­as en esta unidad.
 */
export const CARRERAS: string[] = [
  'Contador PÃºblico',
  'Licenciatura en AdministraciÃ³n',
  'Licenciatura en Autotransporte de Carga',
  'Licenciatura en Comercio Exterior',
  'Licenciatura en Derecho',
  'Licenciatura en EnfermerÃ­a',
  'Licenciatura en PsicologÃ­a',
  'Licenciatura en TecnologÃ­as de la InformaciÃ³n',
];

/** Turnos disponibles */
export const TURNOS = ['Matutino', 'Vespertino', 'Mixto'] as const;
export type Turno = typeof TURNOS[number];

/** Grados (semestres) */
export const GRADOS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Grupos */
export const GRUPOS: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];
```

## FILE: src\app\core\guards\registro-flujo.guard.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/guards/registro-flujo.guard.ts   â•‘
// â•‘  Stenbrary v3.5 â€” Guard para flujo de registro       â•‘
// â•‘                                                      â•‘
// â•‘  Protege /seleccion-motivo: solo se puede acceder    â•‘
// â•‘  si hay un alumno en sessionStorage (escaneado o     â•‘
// â•‘  invitado). Si no, redirige a /scanner.              â•‘
// â•‘                                                      â•‘
// â•‘  Usa functional guard (Angular 14.2+), no class.     â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../services/toast.service';

/**
 * Guard funcional que verifica si hay un alumno activo en sessionStorage.
 * Si no lo hay, redirige al scanner con un mensaje de error.
 */
export const registroFlujoGuard: CanActivateFn = () => {
  const router = inject(Router);
  const toastService = inject(ToastService);

  const alumnoJson = sessionStorage.getItem('alumnoActual');

  if (alumnoJson) {
    try {
      const alumno = JSON.parse(alumnoJson);
      // Verificar que tiene al menos matrÃ­cula y nombre
      if (alumno.matricula && alumno.nombre) {
        return true;
      }
    } catch {
      // JSON invÃ¡lido â†’ limpiar y redirigir
      sessionStorage.removeItem('alumnoActual');
    }
  }

  toastService.warning('Primero escanea o ingresa una matrÃ­cula');
  return router.createUrlTree(['/scanner']);
};
```

## FILE: src\app\core\models\alumno.model.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  alumno.model.ts                                     â•‘
// â•‘  Stenbrary v3.3 â€” Modelo extensible                  â•‘
// â•‘                                                      â•‘
// â•‘  NUEVO v3.3:                                         â•‘
// â•‘  - Campos opcionales: email, telefono, notas         â•‘
// â•‘  - datosExtra: Record para campos personalizados     â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface Alumno {
  id?: string;
  matricula: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  carrera: string;
  grado: number;
  grupo: string;
  turno: 'Matutino' | 'Vespertino' | 'Mixto';
  activo: boolean;
  fechaRegistro: Date;
  fechaActualizacion?: Date;

  // â”€â”€ Campos opcionales extensibles (v3.3) â”€â”€
  email?: string;
  telefono?: string;
  notas?: string;

  // Campos dinÃ¡micos que la coordinadora puede agregar
  // Ej: { "CURP": "XXXX", "NSS": "1234" }
  datosExtra?: Record<string, string>;
}

export interface AlumnoCompleto extends Alumno {
  nombreCompleto: string;
}
```

## FILE: src\app\core\models\index.ts
```typescript
export * from './alumno.model';
export * from './registro.model';
export * from './motivo.model';
```

## FILE: src\app\core\models\motivo.model.ts
```typescript
export interface Motivo {
  id?: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  color?: string;
  orden: number;
  activo: boolean;
  fechaCreacion?: Date;
}
```

## FILE: src\app\core\models\registro.model.ts
```typescript
export interface Registro {
  id: string;
  alumnoId: string;
  matricula: string;
  nombreCompleto: string;
  carrera: string;
  motivoId: string;
  motivoNombre: string;
  fechaHora: Date;
  dispositivo?: string;
  sincronizado: boolean;
}
```

## FILE: src\app\core\services\backup.service.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/services/backup.service.ts       â•‘
// â•‘  Stenbrary v3.4.1 â€” Backup & Restore FIXED           â•‘
// â•‘                                                      â•‘
// â•‘  FIX v3.4.1:                                         â•‘
// â•‘  - Motivos: verifica duplicados por nombre antes     â•‘
// â•‘    de importar (evita duplicaciÃ³n)                   â•‘
// â•‘  - Nuevo: limpiarMotivosDuplicados() para arreglar   â•‘
// â•‘    datos ya duplicados                               â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Alumno, Registro, Motivo } from '../models';

export interface BackupData {
  meta: {
    version: string;
    fecha: string;
    app: string;
    totalAlumnos: number;
    totalRegistros: number;
    totalMotivos: number;
  };
  alumnos: Alumno[];
  registros: Registro[];
  motivos: Motivo[];
}

export interface ValidacionBackup {
  valido: boolean;
  errores: string[];
  datos?: BackupData;
}

export interface ResultadoImportacion {
  exitoso: boolean;
  alumnosImportados: number;
  registrosImportados: number;
  motivosImportados: number;
  alumnosOmitidos: number;
  motivosOmitidos: number;
  errores: string[];
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {

  constructor(private databaseService: DatabaseService) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // EXPORTAR
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async exportarBackup(): Promise<BackupData> {
    const [alumnos, registros, motivos] = await Promise.all([
      this.databaseService.obtenerTodosLosAlumnos(),
      this.databaseService.obtenerTodosLosRegistros(),
      this.databaseService.obtenerTodosLosMotivos(),
    ]);

    return {
      meta: {
        version: '3.4',
        fecha: new Date().toISOString(),
        app: 'Stenbrary',
        totalAlumnos: alumnos.length,
        totalRegistros: registros.length,
        totalMotivos: motivos.length,
      },
      alumnos,
      registros,
      motivos,
    };
  }

  async descargarBackup(): Promise<{ exito: boolean; nombreArchivo: string }> {
    try {
      const backup = await this.exportarBackup();
      const fecha = new Date().toISOString().split('T')[0];
      const hora = new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit',
      }).replace(':', '');
      const nombreArchivo = `stenbrary_backup_${fecha}_${hora}.json`;

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      link.click();
      URL.revokeObjectURL(url);

      console.log('âœ… Backup exportado:', nombreArchivo);
      return { exito: true, nombreArchivo };
    } catch (error) {
      console.error('âŒ Error al exportar backup:', error);
      throw error;
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // VALIDAR
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  validarArchivo(contenido: string): ValidacionBackup {
    const errores: string[] = [];
    let datos: any;

    try {
      datos = JSON.parse(contenido);
    } catch {
      return { valido: false, errores: ['El archivo no es un JSON vÃ¡lido'] };
    }

    if (!datos.meta) {
      errores.push('Falta el campo "meta" â€” no parece ser un backup de Stenbrary');
    } else if (datos.meta.app !== 'Stenbrary') {
      errores.push(`App desconocida: "${datos.meta.app}" (se esperaba "Stenbrary")`);
    }

    if (!Array.isArray(datos.alumnos)) errores.push('Falta el array "alumnos"');
    if (!Array.isArray(datos.registros)) errores.push('Falta el array "registros"');
    if (!Array.isArray(datos.motivos)) errores.push('Falta el array "motivos"');

    if (errores.length > 0) return { valido: false, errores };

    if (datos.alumnos.length > 0) {
      const sample = datos.alumnos[0];
      if (!sample.matricula || !sample.nombre) {
        errores.push('Los datos de alumnos no tienen la estructura esperada');
      }
    }

    if (errores.length > 0) return { valido: false, errores };

    return { valido: true, errores: [], datos: datos as BackupData };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // IMPORTAR (FIX v3.4.1 â€” deduplicaciÃ³n)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async importarBackup(
    datos: BackupData,
    modo: 'merge' | 'replace' = 'merge'
  ): Promise<ResultadoImportacion> {
    const resultado: ResultadoImportacion = {
      exitoso: false,
      alumnosImportados: 0,
      registrosImportados: 0,
      motivosImportados: 0,
      alumnosOmitidos: 0,
      motivosOmitidos: 0,
      errores: [],
    };

    try {
      if (modo === 'replace') {
        await this.databaseService.limpiarTodosDatos();
        console.log('ðŸ—‘ï¸ Datos anteriores eliminados (modo replace)');
      }

      // â”€â”€ Importar Motivos (FIX: deduplicar por nombre) â”€â”€
      const motivosExistentes = await this.databaseService.obtenerTodosLosMotivos();
      const nombresExistentes = new Set(
        motivosExistentes.map(m => m.nombre.toLowerCase().trim())
      );

      for (const motivo of datos.motivos) {
        const nombreNorm = motivo.nombre.toLowerCase().trim();

        if (nombresExistentes.has(nombreNorm)) {
          resultado.motivosOmitidos++;
          continue;
        }

        try {
          await this.databaseService.crearMotivo({
            nombre: motivo.nombre,
            descripcion: motivo.descripcion,
            icono: motivo.icono,
            color: motivo.color,
            orden: motivo.orden,
            activo: motivo.activo,
          });
          nombresExistentes.add(nombreNorm);
          resultado.motivosImportados++;
        } catch {
          resultado.motivosOmitidos++;
        }
      }

      // â”€â”€ Importar Alumnos (deduplicar por matrÃ­cula) â”€â”€
      for (const alumno of datos.alumnos) {
        try {
          await this.databaseService.crearAlumno({
            matricula: alumno.matricula,
            nombre: alumno.nombre,
            apellidoPaterno: alumno.apellidoPaterno,
            apellidoMaterno: alumno.apellidoMaterno,
            carrera: alumno.carrera,
            grado: alumno.grado,
            grupo: alumno.grupo,
            turno: alumno.turno,
            activo: alumno.activo,
            email: alumno.email,
            telefono: alumno.telefono,
            notas: alumno.notas,
            datosExtra: alumno.datosExtra,
          });
          resultado.alumnosImportados++;
        } catch {
          resultado.alumnosOmitidos++;
        }
      }

      // â”€â”€ Importar Registros â”€â”€
      for (const registro of datos.registros) {
        try {
          await this.databaseService.crearRegistro({
            alumnoId: registro.alumnoId,
            matricula: registro.matricula,
            nombreCompleto: registro.nombreCompleto,
            carrera: registro.carrera,
            motivoId: registro.motivoId,
            motivoNombre: registro.motivoNombre,
          });
          resultado.registrosImportados++;
        } catch (err: any) {
          resultado.errores.push(`Registro omitido: ${registro.matricula}`);
        }
      }

      resultado.exitoso = true;
      console.log('âœ… ImportaciÃ³n completada:', resultado);
      return resultado;
    } catch (error: any) {
      resultado.errores.push(`Error general: ${error.message}`);
      console.error('âŒ Error durante importaciÃ³n:', error);
      return resultado;
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LIMPIAR DUPLICADOS (NUEVO v3.4.1)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  /**
   * Encuentra y elimina motivos duplicados por nombre.
   * Conserva el que tiene menor orden (el original).
   * Reasigna Ã³rdenes consecutivos despuÃ©s de limpiar.
   */
  async limpiarMotivosDuplicados(): Promise<number> {
    const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();

    // Agrupar por nombre normalizado
    const grupos = new Map<string, Motivo[]>();
    todosMotivos.forEach(m => {
      const key = m.nombre.toLowerCase().trim();
      const grupo = grupos.get(key) || [];
      grupo.push(m);
      grupos.set(key, grupo);
    });

    let eliminados = 0;

    for (const [, grupo] of grupos) {
      if (grupo.length <= 1) continue;

      // Mantener el de menor orden (el original)
      grupo.sort((a, b) => a.orden - b.orden);

      for (let i = 1; i < grupo.length; i++) {
        if (grupo[i].id) {
          await this.databaseService.eliminarMotivo(grupo[i].id!);
          eliminados++;
          console.log(`ðŸ—‘ï¸ Duplicado eliminado: "${grupo[i].nombre}" (orden ${grupo[i].orden})`);
        }
      }
    }

    // Reasignar Ã³rdenes consecutivos
    if (eliminados > 0) {
      const motivosLimpios = await this.databaseService.obtenerTodosLosMotivos();
      for (let i = 0; i < motivosLimpios.length; i++) {
        if (motivosLimpios[i].orden !== i + 1) {
          await this.databaseService.actualizarMotivo(motivosLimpios[i].id!, {
            ...motivosLimpios[i],
            orden: i + 1,
          });
        }
      }
    }

    return eliminados;
  }

  /**
   * Cuenta cuÃ¡ntos motivos duplicados existen actualmente.
   */
  async contarMotivosDuplicados(): Promise<number> {
    const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();
    const grupos = new Map<string, number>();

    todosMotivos.forEach(m => {
      const key = m.nombre.toLowerCase().trim();
      grupos.set(key, (grupos.get(key) || 0) + 1);
    });

    let duplicados = 0;
    grupos.forEach(count => {
      if (count > 1) duplicados += count - 1;
    });

    return duplicados;
  }
}
```

## FILE: src\app\core\services\database.service.ts
```typescript
import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { Alumno, Registro, Motivo } from '../models';

// Definir esquema de la base de datos
interface StenbraryDB extends DBSchema {
  alumnos: {
    key: string;
    value: Alumno;
    indexes: { 
      'by-matricula': string;
      'by-carrera': string;
    };
  };
  registros: {
    key: string;
    value: Registro;
    indexes: { 
      'by-fecha': Date;
      'by-alumno': string;
      'by-matricula': string;
    };
  };
  motivos: {
    key: string;
    value: Motivo;
    indexes: { 
      'by-orden': number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: IDBPDatabase<StenbraryDB> | null = null;
  private readonly DB_NAME = 'stenbrary-db';
  private readonly DB_VERSION = 1;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.inicializar();
  }

  // ==================== INICIALIZACIÃ“N ====================

  async inicializar(): Promise<void> {
    // Si ya hay una inicializaciÃ³n en progreso, esperar a que termine
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Si ya estÃ¡ inicializada, retornar inmediatamente
    if (this.db) {
      return Promise.resolve();
    }

    // Crear nueva promesa de inicializaciÃ³n
    this.initializationPromise = this.initDatabase();
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async initDatabase(): Promise<void> {
    try {
      this.db = await openDB<StenbraryDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Store de alumnos
          if (!db.objectStoreNames.contains('alumnos')) {
            const alumnosStore = db.createObjectStore('alumnos', { 
              keyPath: 'id' 
            });
            alumnosStore.createIndex('by-matricula', 'matricula', { unique: true });
            alumnosStore.createIndex('by-carrera', 'carrera');
          }

          // Store de registros
          if (!db.objectStoreNames.contains('registros')) {
            const registrosStore = db.createObjectStore('registros', { 
              keyPath: 'id' 
            });
            registrosStore.createIndex('by-fecha', 'fechaHora');
            registrosStore.createIndex('by-alumno', 'alumnoId');
            registrosStore.createIndex('by-matricula', 'matricula');
          }

          // Store de motivos
          if (!db.objectStoreNames.contains('motivos')) {
            const motivosStore = db.createObjectStore('motivos', { 
              keyPath: 'id' 
            });
            motivosStore.createIndex('by-orden', 'orden');
          }
        },
      });

      console.log('âœ… Base de datos inicializada correctamente');
      
      // Crear motivos por defecto si no existen
      await this.crearMotivosDefault();
    } catch (error) {
      console.error('âŒ Error al inicializar base de datos:', error);
      throw error;
    }
  }

  private async crearMotivosDefault(): Promise<void> {
    if (!this.db) return;

    const motivos = await this.db.getAll('motivos');
    
    if (motivos.length === 0) {
      const motivosDefault: Motivo[] = [
        {
          id: uuidv4(),
          nombre: 'Estudiar',
          icono: 'menu_book',
          orden: 1,
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: uuidv4(),
          nombre: 'Pedir libro',
          icono: 'book',
          orden: 2,
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: uuidv4(),
          nombre: 'Trabajo escolar',
          icono: 'assignment',
          orden: 3,
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: uuidv4(),
          nombre: 'InvestigaciÃ³n',
          icono: 'search',
          orden: 4,
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: uuidv4(),
          nombre: 'Otro',
          icono: 'more_horiz',
          orden: 5,
          activo: true,
          fechaCreacion: new Date()
        }
      ];

      for (const motivo of motivosDefault) {
        await this.db.add('motivos', motivo);
      }

      console.log('âœ… Motivos por defecto creados');
    }
  }

  // ==================== ALUMNOS ====================

  async crearAlumno(alumno: Omit<Alumno, 'id' | 'fechaRegistro'>): Promise<Alumno> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const nuevoAlumno: Alumno = {
      ...alumno,
      id: uuidv4(),
      activo: true,
      fechaRegistro: new Date()
    };

    await this.db.add('alumnos', nuevoAlumno);
    console.log('âœ… Alumno creado:', nuevoAlumno.matricula);
    return nuevoAlumno;
  }

  async obtenerAlumnoPorId(id: string): Promise<Alumno | undefined> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    return await this.db.get('alumnos', id);
  }

  async obtenerTodosLosAlumnos(): Promise<Alumno[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    return await this.db.getAll('alumnos');
  }

  async eliminarAlumno(id: string): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    await this.db.delete('alumnos', id);
    console.log('âœ… Alumno eliminado:', id);
  }

  // ==================== REGISTROS ====================

  async crearRegistro(registro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'>): Promise<Registro> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const nuevoRegistro: Registro = {
      ...registro,
      id: uuidv4(),
      fechaHora: new Date(),
      sincronizado: false
    };

    await this.db.add('registros', nuevoRegistro);
    console.log('âœ… Registro creado para:', nuevoRegistro.matricula);
    return nuevoRegistro;
  }

  async obtenerRegistrosDeHoy(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const todosLosRegistros = await this.db.getAll('registros');
    
    return todosLosRegistros.filter(registro => {
      const fechaRegistro = new Date(registro.fechaHora);
      fechaRegistro.setHours(0, 0, 0, 0);
      return fechaRegistro.getTime() === hoy.getTime();
    });
  }

  async obtenerTodosLosRegistros(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const registros = await this.db.getAll('registros');
    return registros.sort((a, b) => 
      new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
  }

  async obtenerRegistrosPorFecha(fecha: Date): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    const todosLosRegistros = await this.db.getAll('registros');
    
    return todosLosRegistros.filter(registro => {
      const fechaRegistro = new Date(registro.fechaHora);
      return fechaRegistro >= inicio && fechaRegistro <= fin;
    });
  }

  // ==================== MOTIVOS ====================

  async obtenerMotivosActivos(): Promise<Motivo[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const motivos = await this.db.getAll('motivos');
    return motivos
      .filter(m => m.activo)
      .sort((a, b) => a.orden - b.orden);
  }

 

  async obtenerMotivoPorId(id: string): Promise<Motivo | undefined> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    return await this.db.get('motivos', id);
  }

  

 

 

  // ==================== ESTADÃSTICAS ====================

  async obtenerEstadisticasHoy(): Promise<{
    totalRegistros: number;
    porCarrera: Map<string, number>;
    porMotivo: Map<string, number>;
  }> {
    const registrosHoy = await this.obtenerRegistrosDeHoy();

    const porCarrera = new Map<string, number>();
    const porMotivo = new Map<string, number>();

    registrosHoy.forEach(registro => {
      // Contar por carrera
      const countCarrera = porCarrera.get(registro.carrera) || 0;
      porCarrera.set(registro.carrera, countCarrera + 1);

      // Contar por motivo
      const countMotivo = porMotivo.get(registro.motivoNombre) || 0;
      porMotivo.set(registro.motivoNombre, countMotivo + 1);
    });

    return {
      totalRegistros: registrosHoy.length,
      porCarrera,
      porMotivo
    };
  }

  // ==================== UTILIDADES ====================

  async limpiarTodosDatos(): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    await this.db.clear('alumnos');
    await this.db.clear('registros');
    await this.db.clear('motivos');
    
    // Recrear motivos por defecto
    await this.crearMotivosDefault();
    
    console.log('âœ… Todos los datos han sido limpiados');
  }

  async obtenerConteoTotal(): Promise<{
    alumnos: number;
    registros: number;
    motivos: number;
  }> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const [alumnos, registros, motivos] = await Promise.all([
      this.db.count('alumnos'),
      this.db.count('registros'),
      this.db.count('motivos')
    ]);

    return { alumnos, registros, motivos };
  }

  // ==================== GESTIÃ“N DE ALUMNOS ====================

  /**
   * Obtener registros de un alumno especÃ­fico por matrÃ­cula
   */
  async obtenerRegistrosPorAlumno(matricula: string): Promise<Registro[]> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const registros = await this.db.getAll('registros');
      
      // Filtrar registros del alumno y ordenar por fecha descendente
      const registrosDelAlumno = registros
        .filter((registro: Registro) => registro.matricula === matricula)
        .sort((a: Registro, b: Registro) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
      
      console.log(`ðŸ“‹ Registros del alumno ${matricula}:`, registrosDelAlumno.length);
      return registrosDelAlumno;
    } catch (error) {
      console.error('âŒ Error al obtener registros del alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener un alumno por su matrÃ­cula
   */
  async obtenerAlumnoPorMatricula(matricula: string): Promise<Alumno | null> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      // Buscar por Ã­ndice de matrÃ­cula
      const alumno = await this.db.getFromIndex('alumnos', 'by-matricula', matricula);
      
      if (alumno) {
        console.log('âœ… Alumno encontrado:', alumno);
        return alumno;
      }
      
      console.log('âš ï¸ Alumno no encontrado con matrÃ­cula:', matricula);
      return null;
    } catch (error) {
      console.error('âŒ Error al obtener alumno por matrÃ­cula:', error);
      throw error;
    }
  }

  /**
   * Actualizar informaciÃ³n de un alumno
   */
  async actualizarAlumno(id: string, alumnoActualizado: Alumno): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      // Asegurarse de que el ID estÃ© presente
      alumnoActualizado.id = id;
      
      await this.db.put('alumnos', alumnoActualizado);
      
      console.log('âœ… Alumno actualizado exitosamente:', alumnoActualizado);
    } catch (error) {
      console.error('âŒ Error al actualizar alumno:', error);
      throw new Error('No se pudo actualizar el alumno');
    }
  }

  /**
   * Desactivar un alumno (soft delete)
   */
  async desactivarAlumno(id: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const alumno = await this.db.get('alumnos', id);
      
      if (!alumno) {
        throw new Error('Alumno no encontrado');
      }
      
      alumno.activo = false;
      await this.db.put('alumnos', alumno);
      
      console.log('âœ… Alumno desactivado:', alumno);
    } catch (error) {
      console.error('âŒ Error al desactivar alumno:', error);
      throw error;
    }
  }

  /**
   * Reactivar un alumno
   */
  async reactivarAlumno(id: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const alumno = await this.db.get('alumnos', id);
      
      if (!alumno) {
        throw new Error('Alumno no encontrado');
      }
      
      alumno.activo = true;
      await this.db.put('alumnos', alumno);
      
      console.log('âœ… Alumno reactivado:', alumno);
    } catch (error) {
      console.error('âŒ Error al reactivar alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener estadÃ­sticas de un alumno
   */
  async obtenerEstadisticasAlumno(matricula: string): Promise<{
    totalVisitas: number;
    ultimaVisita: Date | null;
    primeraVisita: Date | null;
    motivoMasFrecuente: string;
    visitasPorMotivo: Map<string, number>;
  }> {
    try {
      const registros = await this.obtenerRegistrosPorAlumno(matricula);
      
      if (registros.length === 0) {
        return {
          totalVisitas: 0,
          ultimaVisita: null,
          primeraVisita: null,
          motivoMasFrecuente: 'N/A',
          visitasPorMotivo: new Map()
        };
      }
      
      // Calcular estadÃ­sticas
      const totalVisitas = registros.length;
      const ultimaVisita = new Date(registros[0].fechaHora);
      const primeraVisita = new Date(registros[registros.length - 1].fechaHora);
      
      // Contar visitas por motivo
      const visitasPorMotivo = new Map<string, number>();
      registros.forEach((registro: Registro) => {
        if (registro.motivoNombre) {
          const count = visitasPorMotivo.get(registro.motivoNombre) || 0;
          visitasPorMotivo.set(registro.motivoNombre, count + 1);
        }
      });
      
      // Encontrar motivo mÃ¡s frecuente
      let motivoMasFrecuente = 'N/A';
      let maxCount = 0;
      visitasPorMotivo.forEach((count, motivo) => {
        if (count > maxCount) {
          maxCount = count;
          motivoMasFrecuente = motivo;
        }
      });
      
      return {
        totalVisitas,
        ultimaVisita,
        primeraVisita,
        motivoMasFrecuente,
        visitasPorMotivo
      };
    } catch (error) {
      console.error('âŒ Error al obtener estadÃ­sticas del alumno:', error);
      throw error;
    }
  }



// ==============================================================================
// RUTA: src/app/core/services/database.service.ts
// REEMPLAZAR LOS 4 MÃ‰TODOS AL FINAL (lÃ­neas ~540-610)
// ==============================================================================

/**
 * Obtener todos los motivos (activos e inactivos)
 */
async obtenerTodosLosMotivos(): Promise<Motivo[]> {
  await this.inicializar();
  if (!this.db) throw new Error('Base de datos no inicializada');

  const motivos = await this.db.getAll('motivos');
  // Ordenar por orden
  return motivos.sort((a: Motivo, b: Motivo) => a.orden - b.orden);
}

/**
 * Crear un nuevo motivo
 */
async crearMotivo(motivo: Omit<Motivo, 'id'>): Promise<Motivo> {
  await this.inicializar();
  if (!this.db) throw new Error('Base de datos no inicializada');

  const nuevoMotivo: Motivo = {
    ...motivo,
    id: uuidv4(),
    fechaCreacion: new Date()
  };

  await this.db.add('motivos', nuevoMotivo);
  console.log('âœ… Motivo creado:', nuevoMotivo);
  return nuevoMotivo;
}

/**
 * Actualizar un motivo existente
 */
async actualizarMotivo(id: string, motivo: Motivo): Promise<void> {
  await this.inicializar();
  if (!this.db) throw new Error('Base de datos no inicializada');

  // Asegurar que el ID estÃ¡ presente
  motivo.id = id;

  await this.db.put('motivos', motivo);
  console.log('âœ… Motivo actualizado:', motivo);
}

/**
 * Eliminar un motivo
 */
async eliminarMotivo(id: string): Promise<void> {
  await this.inicializar();
  if (!this.db) throw new Error('Base de datos no inicializada');

  await this.db.delete('motivos', id);
  console.log('âœ… Motivo eliminado:', id);
}
}
```

## FILE: src\app\core\services\estadisticas-avanzadas.service.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/services/                        â•‘
// â•‘        estadisticas-avanzadas.service.ts             â•‘
// â•‘  Stenbrary v3.5 â€” Con datos para grÃ¡ficas            â•‘
// â•‘                                                      â•‘
// â•‘  NUEVO v3.5:                                         â•‘
// â•‘  - obtenerRegistrosPorDia() â†’ barras diarias         â•‘
// â•‘  - obtenerDistribucionMotivos() â†’ dona               â•‘
// â•‘  - analizarPorCarrera() mejorado â†’ barras horiz.     â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Registro, Alumno } from '../models';

export interface TendenciaComparativa {
  actual: number;
  anterior: number;
  cambio: number;
  porcentajeCambio: number;
  direccion: 'up' | 'down' | 'igual';
}

export interface HeatmapData {
  dia: string;
  hora: number;
  cantidad: number;
}

export interface TopAlumno {
  alumno: Alumno;
  totalVisitas: number;
  ultimaVisita: Date;
  motivoFrecuente: string;
}

export interface Insight {
  tipo: 'warning' | 'info' | 'success';
  icono: string;
  titulo: string;
  descripcion: string;
}

/** NUEVO: Datos para grÃ¡fica de barras diarias */
export interface DatosDiarios {
  etiquetas: string[];      // ['Lun 24', 'Mar 25', ...]
  cantidades: number[];     // [5, 12, 8, ...]
}

/** NUEVO: Datos para grÃ¡fica de dona/motivos */
export interface DistribucionMotivos {
  etiquetas: string[];      // ['Estudiar', 'Trabajo escolar', ...]
  cantidades: number[];     // [15, 8, ...]
  colores: string[];        // ['#00C8D7', '#0BC4B7', ...]
}

/** NUEVO: Datos para grÃ¡fica de carreras */
export interface DatosCarrera {
  carrera: string;
  totalVisitas: number;
  alumnosActivos: number;
  promedioVisitasPorAlumno: number;
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasAvanzadasService {

  constructor(private databaseService: DatabaseService) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // DATOS PARA GRÃFICAS (NUEVO v3.5)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  /**
   * Registros por dÃ­a de los Ãºltimos N dÃ­as.
   * Para grÃ¡fica de barras.
   */
  async obtenerRegistrosPorDia(dias: number = 7): Promise<DatosDiarios> {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();

    const etiquetas: string[] = [];
    const cantidades: number[] = [];
    const diasCortos = ['Dom', 'Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b'];

    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);
      fecha.setHours(0, 0, 0, 0);

      const fin = new Date(fecha);
      fin.setHours(23, 59, 59, 999);

      const cantidad = todosRegistros.filter(r => {
        const f = new Date(r.fechaHora);
        return f >= fecha && f <= fin;
      }).length;

      const diaCorto = diasCortos[fecha.getDay()];
      const numDia = fecha.getDate();
      etiquetas.push(`${diaCorto} ${numDia}`);
      cantidades.push(cantidad);
    }

    return { etiquetas, cantidades };
  }

  /**
   * DistribuciÃ³n por motivos en los Ãºltimos N dÃ­as.
   * Para grÃ¡fica de dona.
   */
  async obtenerDistribucionMotivos(dias: number = 30): Promise<DistribucionMotivos> {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - dias);

    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    const motivos = await this.databaseService.obtenerTodosLosMotivos();

    const registrosPeriodo = todosRegistros.filter(r =>
      new Date(r.fechaHora) >= inicio
    );

    // Contar por motivo
    const conteo = new Map<string, number>();
    registrosPeriodo.forEach(r => {
      const nombre = r.motivoNombre || 'Sin motivo';
      conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
    });

    // Ordenar de mayor a menor
    const ordenado = Array.from(conteo.entries())
      .sort((a, b) => b[1] - a[1]);

    // Mapear colores de los motivos
    const coloresPaleta = [
      '#00C8D7', '#0BC4B7', '#0EB07B', '#34D399',
      '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
      '#F05252', '#F97316', '#F5A623', '#5DE4EC',
    ];

    const etiquetas: string[] = [];
    const cantidades: number[] = [];
    const colores: string[] = [];

    ordenado.forEach(([nombre, cantidad], index) => {
      etiquetas.push(nombre);
      cantidades.push(cantidad);

      // Buscar color del motivo, si no hay usar paleta cÃ­clica
      const motivoDB = motivos.find(m => m.nombre === nombre);
      colores.push(motivoDB?.color || coloresPaleta[index % coloresPaleta.length]);
    });

    return { etiquetas, cantidades, colores };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MÃ‰TODOS EXISTENTES (sin cambios)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async compararTendencias(
    diasActual: number = 7,
    diasAnterior: number = 7
  ): Promise<TendenciaComparativa> {
    const hoy = new Date();

    const inicioActual = new Date(hoy);
    inicioActual.setDate(hoy.getDate() - diasActual);

    const inicioAnterior = new Date(inicioActual);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasAnterior);
    const finAnterior = new Date(inicioActual);
    finAnterior.setDate(finAnterior.getDate() - 1);

    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();

    const registrosActuales = todosRegistros.filter(r => {
      const fecha = new Date(r.fechaHora);
      return fecha >= inicioActual && fecha <= hoy;
    });

    const registrosAnteriores = todosRegistros.filter(r => {
      const fecha = new Date(r.fechaHora);
      return fecha >= inicioAnterior && fecha <= finAnterior;
    });

    const actual = registrosActuales.length;
    const anterior = registrosAnteriores.length;
    const cambio = actual - anterior;
    const porcentajeCambio = anterior > 0 ? (cambio / anterior) * 100 : 0;

    let direccion: 'up' | 'down' | 'igual' = 'igual';
    if (cambio > 0) direccion = 'up';
    if (cambio < 0) direccion = 'down';

    return { actual, anterior, cambio, porcentajeCambio, direccion };
  }

  async generarHeatmap(diasPeriodo: number = 30): Promise<HeatmapData[]> {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - diasPeriodo);

    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    const registrosPeriodo = todosRegistros.filter(r => {
      const fecha = new Date(r.fechaHora);
      return fecha >= inicio && fecha <= hoy;
    });

    const heatmapMap = new Map<string, number>();

    registrosPeriodo.forEach(registro => {
      const fecha = new Date(registro.fechaHora);
      const dia = this.obtenerNombreDia(fecha.getDay());
      const hora = fecha.getHours();
      const key = `${dia}-${hora}`;
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
    });

    const heatmapData: HeatmapData[] = [];
    const diasSemana = ['Lunes', 'Martes', 'MiÃ©rcoles', 'Jueves', 'Viernes', 'SÃ¡bado', 'Domingo'];

    diasSemana.forEach(dia => {
      for (let hora = 7; hora <= 21; hora++) {
        const key = `${dia}-${hora}`;
        heatmapData.push({ dia, hora, cantidad: heatmapMap.get(key) || 0 });
      }
    });

    return heatmapData;
  }

  async obtenerTopAlumnos(limite: number = 10): Promise<TopAlumno[]> {
    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();
    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();

    const registrosPorMatricula = new Map<string, Registro[]>();

    todosRegistros.forEach(registro => {
      const registros = registrosPorMatricula.get(registro.matricula) || [];
      registros.push(registro);
      registrosPorMatricula.set(registro.matricula, registros);
    });

    const topAlumnos: TopAlumno[] = [];

    registrosPorMatricula.forEach((registros, matricula) => {
      const alumno = todosAlumnos.find(a => a.matricula === matricula);
      if (!alumno) return;

      const motivosCount = new Map<string, number>();
      registros.forEach(r => {
        motivosCount.set(r.motivoNombre, (motivosCount.get(r.motivoNombre) || 0) + 1);
      });

      let motivoFrecuente = 'N/A';
      let maxCount = 0;
      motivosCount.forEach((count, motivo) => {
        if (count > maxCount) {
          maxCount = count;
          motivoFrecuente = motivo;
        }
      });

      const ultimaVisita = new Date(
        Math.max(...registros.map(r => new Date(r.fechaHora).getTime()))
      );

      topAlumnos.push({ alumno, totalVisitas: registros.length, ultimaVisita, motivoFrecuente });
    });

    return topAlumnos.sort((a, b) => b.totalVisitas - a.totalVisitas).slice(0, limite);
  }

  async generarInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];

    const tendencia = await this.compararTendencias(7, 7);
    if (tendencia.direccion === 'up' && tendencia.porcentajeCambio > 10) {
      insights.push({
        tipo: 'success',
        icono: 'trending_up',
        titulo: 'Tendencia al Alza',
        descripcion: `Las visitas aumentaron ${tendencia.porcentajeCambio.toFixed(1)}% esta semana comparado con la anterior`,
      });
    } else if (tendencia.direccion === 'down' && Math.abs(tendencia.porcentajeCambio) > 10) {
      insights.push({
        tipo: 'warning',
        icono: 'trending_down',
        titulo: 'DisminuciÃ³n de Visitas',
        descripcion: `Las visitas disminuyeron ${Math.abs(tendencia.porcentajeCambio).toFixed(1)}% esta semana`,
      });
    }

    const heatmap = await this.generarHeatmap(30);
    const horaPico = this.encontrarHoraPico(heatmap);
    if (horaPico) {
      insights.push({
        tipo: 'info',
        icono: 'schedule',
        titulo: 'Hora Pico Detectada',
        descripcion: `${horaPico.dia} a las ${horaPico.hora}:00 hrs es el momento mÃ¡s concurrido (${horaPico.cantidad} visitas)`,
      });
    }

    const todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();
    const alumnosActivos = todosAlumnos.filter(a => a.activo);
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    let alumnosSinVisitasRecientes = 0;
    for (const alumno of alumnosActivos) {
      const registros = await this.databaseService.obtenerRegistrosPorAlumno(alumno.matricula);
      const tieneVisitasRecientes = registros.some(r => new Date(r.fechaHora) > hace30Dias);
      if (!tieneVisitasRecientes && registros.length > 0) {
        alumnosSinVisitasRecientes++;
      }
    }

    if (alumnosSinVisitasRecientes > 0) {
      insights.push({
        tipo: 'info',
        icono: 'people_outline',
        titulo: 'Alumnos Inactivos',
        descripcion: `${alumnosSinVisitasRecientes} alumnos no han visitado en los Ãºltimos 30 dÃ­as`,
      });
    }

    return insights;
  }

  async analizarPorCarrera(): Promise<DatosCarrera[]> {
    const todosRegistros = await this.databaseService.obtenerTodosLosRegistros();

    const carrerasMap = new Map<string, { visitas: number; alumnos: Set<string> }>();

    todosRegistros.forEach(registro => {
      const data = carrerasMap.get(registro.carrera) || { visitas: 0, alumnos: new Set() };
      data.visitas++;
      data.alumnos.add(registro.matricula);
      carrerasMap.set(registro.carrera, data);
    });

    return Array.from(carrerasMap.entries())
      .map(([carrera, data]) => ({
        carrera,
        totalVisitas: data.visitas,
        alumnosActivos: data.alumnos.size,
        promedioVisitasPorAlumno: parseFloat((data.visitas / data.alumnos.size).toFixed(1)),
      }))
      .sort((a, b) => b.totalVisitas - a.totalVisitas);
  }

  async predecirDiaOcupado(): Promise<string> {
    const heatmap = await this.generarHeatmap(30);
    const visitasPorDia = new Map<string, number>();
    heatmap.forEach(item => {
      visitasPorDia.set(item.dia, (visitasPorDia.get(item.dia) || 0) + item.cantidad);
    });

    let diaOcupado = 'Lunes';
    let maxVisitas = 0;
    visitasPorDia.forEach((visitas, dia) => {
      if (visitas > maxVisitas) {
        maxVisitas = visitas;
        diaOcupado = dia;
      }
    });

    return diaOcupado;
  }

  private obtenerNombreDia(dia: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'MiÃ©rcoles', 'Jueves', 'Viernes', 'SÃ¡bado'];
    return dias[dia];
  }

  private encontrarHoraPico(heatmap: HeatmapData[]): HeatmapData | null {
    if (heatmap.length === 0) return null;
    return heatmap.reduce((max, current) => current.cantidad > max.cantidad ? current : max);
  }
}
```

## FILE: src\app\core\services\export.service.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/services/export.service.ts       â•‘
// â•‘  Stenbrary v3.5.1 â€” ExportaciÃ³n a Excel (XLSX)       â•‘
// â•‘                                                      â•‘
// â•‘  Servicio reutilizable que genera archivos Excel      â•‘
// â•‘  con formato profesional. Usa librerÃ­a xlsx.          â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Registro, Alumno } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ExportService {

  /**
   * Exporta registros a archivo Excel con formato.
   */
  exportarRegistrosXLSX(registros: Registro[], nombreArchivo?: string): void {
    if (registros.length === 0) return;

    const datos = registros.map(r => {
      const d = new Date(r.fechaHora);
      return {
        'Fecha': d.toLocaleDateString('es-MX'),
        'Hora': d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        'MatrÃ­cula': r.matricula,
        'Alumno': r.nombreCompleto,
        'Carrera': r.carrera,
        'Actividad': r.motivoNombre,
      };
    });

    const ws = XLSX.utils.json_to_sheet(datos);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 12 }, // Fecha
      { wch: 8 },  // Hora
      { wch: 16 }, // MatrÃ­cula
      { wch: 32 }, // Alumno
      { wch: 30 }, // Carrera
      { wch: 18 }, // Actividad
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    const nombre = nombreArchivo || `registros_stenbrary_${this.fechaHoy()}`;
    XLSX.writeFile(wb, `${nombre}.xlsx`);
  }

  /**
   * Exporta alumnos a archivo Excel con formato.
   */
  exportarAlumnosXLSX(alumnos: Alumno[], nombreArchivo?: string): void {
    if (alumnos.length === 0) return;

    const datos = alumnos.map(a => ({
      'MatrÃ­cula': a.matricula,
      'Nombre': a.nombre,
      'Apellido Paterno': a.apellidoPaterno,
      'Apellido Materno': a.apellidoMaterno,
      'Carrera': a.carrera,
      'Grado': a.grado,
      'Grupo': a.grupo,
      'Turno': a.turno,
      'Activo': a.activo ? 'SÃ­' : 'No',
      'Fecha Registro': new Date(a.fechaRegistro).toLocaleDateString('es-MX'),
    }));

    const ws = XLSX.utils.json_to_sheet(datos);

    ws['!cols'] = [
      { wch: 16 }, // MatrÃ­cula
      { wch: 14 }, // Nombre
      { wch: 18 }, // Apellido Paterno
      { wch: 18 }, // Apellido Materno
      { wch: 30 }, // Carrera
      { wch: 8 },  // Grado
      { wch: 8 },  // Grupo
      { wch: 14 }, // Turno
      { wch: 8 },  // Activo
      { wch: 14 }, // Fecha Registro
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');

    const nombre = nombreArchivo || `alumnos_stenbrary_${this.fechaHoy()}`;
    XLSX.writeFile(wb, `${nombre}.xlsx`);
  }

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }
}
```

## FILE: src\app\core\services\global-error.handler.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/services/global-error.handler.ts â•‘
// â•‘  Stenbrary v3.6 â€” Manejo global de errores           â•‘
// â•‘                                                      â•‘
// â•‘  Captura errores no manejados (promises rechazadas,  â•‘
// â•‘  errores de componentes, etc.) y:                    â•‘
// â•‘  1. Los loguea en consola con contexto               â•‘
// â•‘  2. Muestra un toast amigable al usuario             â•‘
// â•‘  3. Evita que la app se rompa visualmente            â•‘
// â•‘                                                      â•‘
// â•‘  Se registra en app.config.ts como provider.         â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);

  /** Errores recientes para evitar spam de toasts */
  private erroresRecientes = new Set<string>();

  handleError(error: any): void {
    // Extraer mensaje legible
    const mensaje = this.extraerMensaje(error);

    // Log completo en consola (para debug)
    console.error('ðŸ”´ Error no manejado:', error);

    // Evitar mostrar el mismo error repetidamente
    if (this.erroresRecientes.has(mensaje)) return;
    this.erroresRecientes.add(mensaje);
    setTimeout(() => this.erroresRecientes.delete(mensaje), 5000);

    // Mostrar toast amigable (debe correr dentro de NgZone)
    this.ngZone.run(() => {
      // No mostrar errores de red como errores crÃ­ticos
      if (this.esErrorDeRed(error)) {
        this.toastService.warning('Problema de conexiÃ³n. Los datos se guardan localmente.');
      } else if (this.esErrorDeChunk(error)) {
        // Error de carga de mÃ³dulo â€” generalmente por nueva versiÃ³n
        this.toastService.info('Hay una nueva versiÃ³n disponible. Recarga la pÃ¡gina.');
      } else {
        this.toastService.error('OcurriÃ³ un error inesperado. Intenta de nuevo.');
      }
    });
  }

  private extraerMensaje(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.rejection?.message) return error.rejection.message;
    return 'Error desconocido';
  }

  private esErrorDeRed(error: any): boolean {
    const msg = this.extraerMensaje(error).toLowerCase();
    return (
      error instanceof TypeError && msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('offline') ||
      msg.includes('failed to fetch') ||
      msg.includes('net::err')
    );
  }

  private esErrorDeChunk(error: any): boolean {
    const msg = this.extraerMensaje(error).toLowerCase();
    return (
      msg.includes('loading chunk') ||
      msg.includes('chunkloaderror') ||
      msg.includes('failed to load')
    );
  }
}
```

## FILE: src\app\core\services\index.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/services/index.ts                â•‘
// â•‘  Barrel export â€” v3.6 completo                        â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export { DatabaseService } from './database.service';
export { ToastService } from './toast.service';
export { LoadingService } from './loading.service';
export { ExportService } from './export.service';
export { BackupService } from './backup.service';
export { PwaUpdateService } from './pwa-update.service';
export { GlobalErrorHandler } from './global-error.handler';
export { ReportService, type TipoReporte, type OpcionesReporte } from './report.service';
export {
  EstadisticasAvanzadasService,
  type TendenciaComparativa,
  type HeatmapData,
  type TopAlumno,
  type Insight,
  type DatosDiarios,
  type DistribucionMotivos,
  type DatosCarrera,
} from './estadisticas-avanzadas.service';
```

## FILE: src\app\core\services\loading.service.ts
```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<LoadingState>({
    isLoading: false,
    message: 'Cargando...'
  });

  public loading$ = this.loadingSubject.asObservable();

  /**
   * Mostrar indicador de carga
   */
  show(message: string = 'Cargando...'): void {
    this.loadingSubject.next({
      isLoading: true,
      message
    });
  }

  /**
   * Ocultar indicador de carga
   */
  hide(): void {
    this.loadingSubject.next({
      isLoading: false,
      message: 'Cargando...'
    });
  }
}
```

## FILE: src\app\core\services\pwa-update.service.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/services/pwa-update.service.ts   â•‘
// â•‘  Stenbrary v3.6 â€” NotificaciÃ³n de actualizaciÃ³n PWA  â•‘
// â•‘                                                      â•‘
// â•‘  Detecta cuando hay una nueva versiÃ³n desplegada en   â•‘
// â•‘  Netlify y muestra un banner para que el usuario      â•‘
// â•‘  actualice. Usa SwUpdate de @angular/service-worker.  â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, filter, first, interval, concat } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {

  /** true cuando hay una versiÃ³n nueva lista para instalar */
  private hayActualizacion$ = new BehaviorSubject<boolean>(false);
  public actualizacionDisponible$ = this.hayActualizacion$.asObservable();

  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef,
  ) {}

  /**
   * Inicializar el listener de actualizaciones.
   * Llamar una vez desde AppComponent.ngOnInit().
   */
  iniciar(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('âš™ï¸ Service Worker no habilitado (modo desarrollo)');
      return;
    }

    // Escuchar cuando hay una versiÃ³n nueva lista
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(evt => {
        console.log('ðŸ†• Nueva versiÃ³n disponible:', evt.latestVersion.hash);
        this.hayActualizacion$.next(true);
      });

    // Revisar periÃ³dicamente (cada 60 segundos despuÃ©s de que la app estÃ© estable)
    const appEstable$ = this.appRef.isStable.pipe(first(isStable => isStable));
    const cadaMinuto$ = interval(60_000);

    concat(appEstable$, cadaMinuto$).subscribe(async () => {
      try {
        await this.swUpdate.checkForUpdate();
      } catch (err) {
        // Silenciar â€” puede fallar si el SW no estÃ¡ registrado
      }
    });

    console.log('âœ… PWA Update Service inicializado');
  }

  /**
   * Aplicar la actualizaciÃ³n y recargar la pÃ¡gina.
   */
  async aplicarActualizacion(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      document.location.reload();
    } catch (err) {
      // Fallback: recargar directamente
      document.location.reload();
    }
  }

  /**
   * Descartar la notificaciÃ³n (el usuario decide no actualizar ahora).
   */
  descartarActualizacion(): void {
    this.hayActualizacion$.next(false);
  }
}
```

## FILE: src\app\core\services\report.service.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/core/services/report.service.ts       â•‘
// â•‘  Stenbrary v3.6 â€” Reportes PDF con filtros visibles   â•‘
// â•‘                                                      â•‘
// â•‘  MEJORA: El PDF muestra quÃ© filtros se aplicaron      â•‘
// â•‘  Ej: "Filtrado por: Carrera = Lic. en TI,            â•‘
// â•‘       Actividad = Estudiar"                           â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Registro } from '../models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type TipoReporte = 'diario' | 'semanal' | 'mensual' | 'personalizado';

export interface FiltrosReporte {
  busqueda?: string;
  carrera?: string;
  motivo?: string;
}

export interface OpcionesReporte {
  tipo: TipoReporte;
  fechaInicio?: Date;
  fechaFin?: Date;
  titulo?: string;
  filtros?: FiltrosReporte;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {

  constructor(private databaseService: DatabaseService) {}

  async generarReporteAccesos(
    registros: Registro[],
    opciones: OpcionesReporte
  ): Promise<void> {
    const doc = new jsPDF('portrait', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;

    let y = this.dibujarHeader(doc, opciones, pageWidth, margin);
    y = this.dibujarResumen(doc, registros, y, margin, pageWidth);
    y = this.dibujarTablaRegistros(doc, registros, y, margin);

    y = this.verificarEspacioPagina(doc, y, 60);
    y = this.dibujarResumenCarreras(doc, registros, y, margin, pageWidth);

    y = this.verificarEspacioPagina(doc, y, 60);
    y = this.dibujarResumenMotivos(doc, registros, y, margin, pageWidth);

    this.dibujarFooterTodasPaginas(doc, pageWidth, margin);

    const nombreArchivo = this.generarNombreArchivo(opciones);
    doc.save(nombreArchivo);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // HEADER CON FILTROS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private dibujarHeader(
    doc: jsPDF,
    opciones: OpcionesReporte,
    pageWidth: number,
    margin: number
  ): number {
    let y = 20;

    // LÃ­nea superior decorativa
    doc.setDrawColor(0, 200, 215);
    doc.setLineWidth(1.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Logo
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('STENBRARY', margin, y);

    // SubtÃ­tulo
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Sistema de Registro de Accesos â€” Biblioteca', margin, y + 6);

    // Fecha de generaciÃ³n (derecha)
    const ahora = new Date();
    const fechaGen = ahora.toLocaleString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    doc.setFontSize(8);
    doc.text(`Generado: ${fechaGen}`, pageWidth - margin, y, { align: 'right' });
    y += 14;

    // TÃ­tulo del reporte
    const titulo = opciones.titulo || this.obtenerTituloDefault(opciones);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(titulo, margin, y);
    y += 6;

    // PerÃ­odo
    const periodo = this.obtenerTextoPeriodo(opciones);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(periodo, margin, y);
    y += 5;

    // â”€â”€ FILTROS APLICADOS â”€â”€
    const textoFiltros = this.construirTextoFiltros(opciones.filtros);
    if (textoFiltros) {
      y += 2;

      // Fondo para el badge de filtros
      const anchoTexto = doc.getTextWidth(textoFiltros) + 14;
      doc.setFillColor(255, 248, 230);
      doc.setDrawColor(245, 166, 35);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y - 4, Math.min(anchoTexto, pageWidth - margin * 2), 8, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 120, 0);
      doc.text(textoFiltros, margin + 4, y + 1);
      y += 8;
    }

    y += 3;

    // LÃ­nea separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    return y + 6;
  }

  /**
   * Construye el texto de filtros activos para mostrar en el PDF.
   * Retorna null si no hay filtros.
   */
  private construirTextoFiltros(filtros?: FiltrosReporte): string | null {
    if (!filtros) return null;

    const partes: string[] = [];

    if (filtros.carrera) {
      partes.push(`Carrera: ${filtros.carrera}`);
    }
    if (filtros.motivo) {
      partes.push(`Actividad: ${filtros.motivo}`);
    }
    if (filtros.busqueda) {
      partes.push(`BÃºsqueda: "${filtros.busqueda}"`);
    }

    if (partes.length === 0) return null;

    return `Filtrado por: ${partes.join(' Â· ')}`;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RESUMEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private dibujarResumen(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number,
    pageWidth: number
  ): number {
    let y = startY;

    const totalRegistros = registros.length;
    const matriculasUnicas = new Set(registros.map(r => r.matricula)).size;
    const carrerasUnicas = new Set(registros.map(r => r.carrera)).size;
    const motivosUnicos = new Set(registros.map(r => r.motivoNombre)).size;

    const boxWidth = (pageWidth - margin * 2 - 12) / 4;
    const boxHeight = 22;
    const stats = [
      { valor: totalRegistros.toString(), label: 'Total Registros' },
      { valor: matriculasUnicas.toString(), label: 'Alumnos Ãšnicos' },
      { valor: carrerasUnicas.toString(), label: 'Carreras' },
      { valor: motivosUnicos.toString(), label: 'Actividades' },
    ];

    stats.forEach((stat, i) => {
      const x = margin + i * (boxWidth + 4);
      doc.setFillColor(245, 248, 250);
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 160, 175);
      doc.text(stat.valor, x + boxWidth / 2, y + 10, { align: 'center' });

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(stat.label, x + boxWidth / 2, y + 17, { align: 'center' });
    });

    return y + boxHeight + 8;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // TABLA DE REGISTROS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private dibujarTablaRegistros(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number
  ): number {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Detalle de Registros', margin, startY);

    const datos = registros.map((r, i) => {
      const fecha = new Date(r.fechaHora);
      return [
        (i + 1).toString(),
        fecha.toLocaleDateString('es-MX'),
        fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        r.matricula,
        r.nombreCompleto,
        r.carrera.length > 25 ? r.carrera.substring(0, 23) + '...' : r.carrera,
        r.motivoNombre,
      ];
    });

    autoTable(doc, {
      startY: startY + 3,
      head: [['#', 'Fecha', 'Hora', 'MatrÃ­cula', 'Alumno', 'Carrera', 'Actividad']],
      body: datos,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [0, 160, 175],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { halign: 'center', cellWidth: 14 },
        3: { cellWidth: 22, fontStyle: 'bold' },
        4: { cellWidth: 38 },
        5: { cellWidth: 36 },
        6: { cellWidth: 24 },
      },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RESUMEN POR CARRERA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private dibujarResumenCarreras(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number,
    pageWidth: number
  ): number {
    const porCarrera = new Map<string, { visitas: number; alumnos: Set<string> }>();
    registros.forEach(r => {
      const data = porCarrera.get(r.carrera) || { visitas: 0, alumnos: new Set() };
      data.visitas++;
      data.alumnos.add(r.matricula);
      porCarrera.set(r.carrera, data);
    });

    if (porCarrera.size === 0) return startY;

    const datos = Array.from(porCarrera.entries())
      .sort((a, b) => b[1].visitas - a[1].visitas)
      .map(([carrera, data]) => [
        carrera,
        data.alumnos.size.toString(),
        data.visitas.toString(),
        (data.visitas / data.alumnos.size).toFixed(1),
      ]);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen por Carrera', margin, startY);

    autoTable(doc, {
      startY: startY + 3,
      head: [['Carrera', 'Alumnos', 'Visitas', 'Promedio/Alumno']],
      body: datos,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center', fontStyle: 'bold' },
        3: { halign: 'center' },
      },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RESUMEN POR MOTIVO
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private dibujarResumenMotivos(
    doc: jsPDF,
    registros: Registro[],
    startY: number,
    margin: number,
    pageWidth: number
  ): number {
    const porMotivo = new Map<string, number>();
    registros.forEach(r => {
      porMotivo.set(r.motivoNombre, (porMotivo.get(r.motivoNombre) || 0) + 1);
    });

    if (porMotivo.size === 0) return startY;

    const total = registros.length;
    const datos = Array.from(porMotivo.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([motivo, cantidad]) => [
        motivo,
        cantidad.toString(),
        ((cantidad / total) * 100).toFixed(1) + '%',
      ]);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen por Actividad', margin, startY);

    autoTable(doc, {
      startY: startY + 3,
      head: [['Actividad', 'Registros', '% del Total']],
      body: datos,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: [245, 166, 35], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        1: { halign: 'center', fontStyle: 'bold' },
        2: { halign: 'center' },
      },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // UTILIDADES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private dibujarFooterTodasPaginas(doc: jsPDF, pageWidth: number, margin: number): void {
    const totalPaginas = doc.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('Stenbrary â€” Sistema de Registro de Accesos', margin, pageHeight - 9);
      doc.text(`PÃ¡gina ${i} de ${totalPaginas}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
    }
  }

  private verificarEspacioPagina(doc: jsPDF, y: number, espacioRequerido: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + espacioRequerido > pageHeight - 20) {
      doc.addPage();
      return 20;
    }
    return y;
  }

  private obtenerTituloDefault(opciones: OpcionesReporte): string {
    switch (opciones.tipo) {
      case 'diario': return 'Reporte Diario de Accesos';
      case 'semanal': return 'Reporte Semanal de Accesos';
      case 'mensual': return 'Reporte Mensual de Accesos';
      default: return 'Reporte de Accesos';
    }
  }

  private obtenerTextoPeriodo(opciones: OpcionesReporte): string {
    const formatear = (d: Date) => d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    if (opciones.fechaInicio && opciones.fechaFin) {
      return `PerÃ­odo: ${formatear(opciones.fechaInicio)} â€” ${formatear(opciones.fechaFin)}`;
    }

    const hoy = new Date();
    switch (opciones.tipo) {
      case 'diario': return `Fecha: ${formatear(hoy)}`;
      case 'semanal': {
        const hace7 = new Date(hoy);
        hace7.setDate(hace7.getDate() - 7);
        return `PerÃ­odo: ${formatear(hace7)} â€” ${formatear(hoy)}`;
      }
      case 'mensual': {
        const hace30 = new Date(hoy);
        hace30.setDate(hace30.getDate() - 30);
        return `PerÃ­odo: ${formatear(hace30)} â€” ${formatear(hoy)}`;
      }
      default: return `Fecha: ${formatear(hoy)}`;
    }
  }

  private generarNombreArchivo(opciones: OpcionesReporte): string {
    const fecha = new Date().toISOString().split('T')[0];
    return `reporte_${opciones.tipo}_stenbrary_${fecha}.pdf`;
  }
}
```

## FILE: src\app\core\services\toast.service.ts
```typescript
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toasts$ = this.toastSubject.asObservable();

  /**
   * Mostrar notificaciÃ³n de Ã©xito
   */
  success(message: string, duration: number = 3000): void {
    this.show('success', message, duration);
  }

  /**
   * Mostrar notificaciÃ³n de error
   */
  error(message: string, duration: number = 4000): void {
    this.show('error', message, duration);
  }

  /**
   * Mostrar notificaciÃ³n de advertencia
   */
  warning(message: string, duration: number = 3500): void {
    this.show('warning', message, duration);
  }

  /**
   * Mostrar notificaciÃ³n de informaciÃ³n
   */
  info(message: string, duration: number = 3000): void {
    this.show('info', message, duration);
  }

  /**
   * Mostrar notificaciÃ³n genÃ©rica
   */
  private show(type: Toast['type'], message: string, duration: number): void {
    const toast: Toast = {
      id: this.generateId(),
      type,
      message,
      duration
    };

    this.toastSubject.next(toast);
  }

  /**
   * Generar ID Ãºnico para cada toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## FILE: src\app\features\alumnos\alumnos.component.html
```html
<!-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•— -->
<!-- â•‘  alumnos.component.html â€” Stenbrary v3.5            â•‘ -->
<!-- â•‘  NUEVO: BotÃ³n "Importar" en header-actions           â•‘ -->
<!-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->

<div class="alumnos-container">

  <!-- â”€â”€ HEADER â”€â”€ -->
  <div class="page-header">
    <div class="header-left">
      <div class="header-icon">
        <mat-icon>groups</mat-icon>
      </div>
      <div>
        <h1>Alumnos</h1>
        <p class="header-subtitle">
          {{ todosAlumnos.length }} alumnos registrados
          @if (hayFiltrosActivos) {
            Â· {{ alumnosFiltrados.length }} coinciden con los filtros
          }
        </p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn-outline" (click)="exportarCSV()" matTooltip="Exportar a CSV">
        <mat-icon>download</mat-icon>
        <span class="btn-text">Exportar</span>
      </button>
      <button class="btn-outline" (click)="irAImportar()" matTooltip="Importar desde Excel">
        <mat-icon>upload_file</mat-icon>
        <span class="btn-text">Importar</span>
      </button>
      <button class="btn-primary" (click)="irARegistrar()">
        <mat-icon>person_add</mat-icon>
        <span class="btn-text">Nuevo Alumno</span>
      </button>
    </div>
  </div>

  <!-- â”€â”€ FILTROS â”€â”€ -->
  <div class="filtros-panel">

    <!-- Barra de bÃºsqueda principal -->
    <div class="search-bar">
      <mat-icon class="search-icon">search</mat-icon>
      <input
        type="text"
        placeholder="Buscar por nombre, apellido o matrÃ­cula..."
        [ngModel]="filtros().busqueda"
        (ngModelChange)="actualizarFiltro('busqueda', $event)">
      @if (filtros().busqueda) {
        <button class="clear-btn" (click)="actualizarFiltro('busqueda', '')">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>

    <!-- Filtros secundarios -->
    <div class="filtros-row">
      <mat-form-field appearance="outline" class="filtro-field">
        <mat-label>Carrera</mat-label>
        <mat-select
          [ngModel]="filtros().carrera"
          (ngModelChange)="actualizarFiltro('carrera', $event)">
          <mat-option value="">Todas</mat-option>
          @for (c of carrerasUnicas(); track c) {
            <mat-option [value]="c">{{ c }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filtro-field">
        <mat-label>Grado</mat-label>
        <mat-select
          [ngModel]="filtros().grado"
          (ngModelChange)="actualizarFiltro('grado', $event)">
          <mat-option value="">Todos</mat-option>
          @for (g of gradosUnicos(); track g) {
            <mat-option [value]="g">{{ g }}Â°</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filtro-field">
        <mat-label>Grupo</mat-label>
        <mat-select
          [ngModel]="filtros().grupo"
          (ngModelChange)="actualizarFiltro('grupo', $event)">
          <mat-option value="">Todos</mat-option>
          @for (g of gruposUnicos(); track g) {
            <mat-option [value]="g">{{ g }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filtro-field">
        <mat-label>Turno</mat-label>
        <mat-select
          [ngModel]="filtros().turno"
          (ngModelChange)="actualizarFiltro('turno', $event)">
          <mat-option value="">Todos</mat-option>
          <mat-option value="Matutino">Matutino</mat-option>
          <mat-option value="Vespertino">Vespertino</mat-option>
          <mat-option value="Mixto">Mixto</mat-option>
        </mat-select>
      </mat-form-field>

      @if (hayFiltrosActivos) {
        <button class="btn-clear-filters" (click)="limpiarFiltros()">
          <mat-icon>filter_alt_off</mat-icon>
          Limpiar
        </button>
      }
    </div>
  </div>

  <!-- â”€â”€ LOADING â”€â”€ -->
  @if (cargando) {
    <div class="loading-state">
      <mat-spinner diameter="36"></mat-spinner>
      <p>Cargando alumnos...</p>
    </div>
  }

  <!-- â”€â”€ TABLA â”€â”€ -->
  @if (!cargando && alumnosFiltrados.length > 0) {
    <div class="tabla-container">
      <table mat-table [dataSource]="alumnosPaginados" class="alumnos-table">

        <!-- MatrÃ­cula -->
        <ng-container matColumnDef="matricula">
          <th mat-header-cell *matHeaderCellDef>MatrÃ­cula</th>
          <td mat-cell *matCellDef="let a">
            <span class="mono matricula-badge">{{ a.matricula }}</span>
          </td>
        </ng-container>

        <!-- Nombre -->
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let a">
            <span class="nombre-cell">{{ nombreCompleto(a) }}</span>
          </td>
        </ng-container>

        <!-- Carrera -->
        <ng-container matColumnDef="carrera">
          <th mat-header-cell *matHeaderCellDef>Carrera</th>
          <td mat-cell *matCellDef="let a">{{ a.carrera }}</td>
        </ng-container>

        <!-- Grado -->
        <ng-container matColumnDef="grado">
          <th mat-header-cell *matHeaderCellDef>Grado</th>
          <td mat-cell *matCellDef="let a">
            <span class="mono">{{ a.grado }}Â°</span>
          </td>
        </ng-container>

        <!-- Grupo -->
        <ng-container matColumnDef="grupo">
          <th mat-header-cell *matHeaderCellDef>Grupo</th>
          <td mat-cell *matCellDef="let a">
            <span class="mono">{{ a.grupo }}</span>
          </td>
        </ng-container>

        <!-- Turno -->
        <ng-container matColumnDef="turno">
          <th mat-header-cell *matHeaderCellDef>Turno</th>
          <td mat-cell *matCellDef="let a">
            <span class="turno-chip" [attr.data-turno]="a.turno.toLowerCase()">
              {{ a.turno }}
            </span>
          </td>
        </ng-container>

        <!-- Acciones -->
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let a">
            <button mat-icon-button matTooltip="Ver detalle" (click)="verDetalle(a)">
              <mat-icon>visibility</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row
          *matRowDef="let row; columns: columnas;"
          class="clickable-row"
          (click)="verDetalle(row)">
        </tr>
      </table>

      <!-- PaginaciÃ³n -->
      @if (totalPaginas > 1) {
        <div class="paginacion">
          <span class="pag-info">
            Mostrando {{ paginaActual() * filasPorPagina + 1 }}â€“{{
              [((paginaActual() + 1) * filasPorPagina), alumnosFiltrados.length] | slice:0:1
            }} de {{ alumnosFiltrados.length }}
          </span>
          <div class="pag-controls">
            <button mat-icon-button
              [disabled]="paginaActual() === 0"
              (click)="paginaAnterior()">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="pag-current">{{ paginaActual() + 1 }} / {{ totalPaginas }}</span>
            <button mat-icon-button
              [disabled]="paginaActual() >= totalPaginas - 1"
              (click)="paginaSiguiente()">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>
  }

  <!-- â”€â”€ EMPTY STATE â”€â”€ -->
  @if (!cargando && alumnosFiltrados.length === 0) {
    <div class="empty-state">
      @if (hayFiltrosActivos) {
        <mat-icon>search_off</mat-icon>
        <h3>Sin resultados</h3>
        <p>No se encontraron alumnos con los filtros aplicados</p>
        <button class="btn-outline" (click)="limpiarFiltros()">
          <mat-icon>filter_alt_off</mat-icon>
          Limpiar filtros
        </button>
      } @else {
        <mat-icon>people_outline</mat-icon>
        <h3>No hay alumnos registrados</h3>
        <p>Registra alumnos manualmente o importa desde un archivo Excel</p>
        <div class="empty-actions">
          <button class="btn-primary" (click)="irARegistrar()">
            <mat-icon>person_add</mat-icon>
            Registrar alumno
          </button>
          <button class="btn-outline" (click)="irAImportar()">
            <mat-icon>upload_file</mat-icon>
            Importar desde Excel
          </button>
        </div>
      }
    </div>
  }

</div>
```

## FILE: src\app\features\alumnos\alumnos.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  alumnos.component.scss â€” Stenbrary v3.3              â•‘
// â•‘  Cyan Cube Dark Theme                                 â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

.alumnos-container {
  height: 100%;
  overflow-y: auto;
  padding: $spacing-lg;
}

// â”€â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-lg;
  animation: slideInDown 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba($cyan-500, 0.10);
  border: 1px solid rgba($cyan-500, 0.20);
  border-radius: 14px;

  mat-icon {
    font-size: 24px;
    color: $cyan-400;
  }
}

h1 {
  margin: 0;
  font-family: $font-display;
  font-size: 1.5rem;
  font-weight: 700;
  color: $text-primary;
}

.header-subtitle {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: $text-muted;
  font-family: $font-mono;
}

.header-actions {
  display: flex;
  gap: $spacing-sm;
}

// â”€â”€â”€ BOTONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: linear-gradient(135deg, $cyan-500, $teal-400);
  color: $navy-950;
  border: none;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: $shadow-cyan;

  mat-icon { font-size: 18px; width: 18px; height: 18px; }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(0, 200, 215, 0.35);
  }
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: transparent;
  color: $text-secondary;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;

  mat-icon { font-size: 18px; width: 18px; height: 18px; }

  &:hover {
    border-color: $border-glow;
    color: $cyan-400;
    background: rgba($cyan-500, 0.06);
  }
}

// â”€â”€â”€ FILTROS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.filtros-panel {
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  padding: $spacing-md;
  margin-bottom: $spacing-lg;
  animation: slideInUp 400ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  background: $navy-700;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-md;
  padding: 0 $spacing-md;
  margin-bottom: $spacing-md;
  transition: border-color $transition-fast;

  &:focus-within {
    border-color: $cyan-500;
    box-shadow: 0 0 0 2px rgba($cyan-500, 0.10);
  }

  .search-icon {
    color: $text-muted;
    font-size: 20px;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: $text-primary;
    font-family: $font-body;
    font-size: 0.9rem;
    padding: 12px 0;

    &::placeholder {
      color: $text-muted;
    }
  }

  .clear-btn {
    background: none;
    border: none;
    color: $text-muted;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;

    &:hover { color: $text-primary; }

    mat-icon { font-size: 18px; width: 18px; height: 18px; }
  }
}

.filtros-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.filtro-field {
  min-width: 140px;
  flex: 1;
  max-width: 180px;

  // Compact sizing
  ::ng-deep .mat-mdc-form-field-infix {
    min-height: 40px !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  ::ng-deep .mat-mdc-text-field-wrapper {
    padding: 0 12px !important;
  }
}

.btn-clear-filters {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba($warn-color, 0.08);
  color: $warn-color;
  border: 1px solid rgba($warn-color, 0.20);
  border-radius: $border-radius-md;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;

  mat-icon { font-size: 16px; width: 16px; height: 16px; }

  &:hover {
    background: rgba($warn-color, 0.14);
  }
}

// â”€â”€â”€ TABLA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.tabla-container {
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  overflow: hidden;
  animation: slideInUp 400ms 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.alumnos-table {
  width: 100%;

  .matricula-badge {
    display: inline-block;
    padding: 3px 10px;
    background: rgba($cyan-500, 0.10);
    border: 1px solid rgba($cyan-500, 0.20);
    border-radius: 6px;
    color: $cyan-400;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .nombre-cell {
    font-weight: 500;
    color: $text-primary;
  }

  .turno-chip {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;

    &[data-turno="matutino"] {
      background: rgba(59, 130, 246, 0.12);
      color: #60A5FA;
    }
    &[data-turno="vespertino"] {
      background: rgba(245, 166, 35, 0.12);
      color: $amber-color;
    }
    &[data-turno="mixto"] {
      background: rgba(168, 85, 247, 0.12);
      color: #C084FC;
    }
  }
}

.clickable-row {
  cursor: pointer;
  transition: background $transition-fast;

  &:hover {
    background: rgba($cyan-500, 0.04) !important;
  }
}

// â”€â”€â”€ PAGINACIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.paginacion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid $border-subtle;
}

.pag-info {
  font-size: 0.8rem;
  color: $text-muted;
  font-family: $font-mono;
}

.pag-controls {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.pag-current {
  font-size: 0.82rem;
  color: $text-secondary;
  font-family: $font-mono;
  min-width: 60px;
  text-align: center;
}

// â”€â”€â”€ ESTADOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xl * 2;

  p {
    color: $text-muted;
    font-size: 0.9rem;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xl * 3 $spacing-lg;
  animation: fadeIn 400ms both;

  mat-icon {
    font-size: 56px;
    width: 56px;
    height: 56px;
    color: $navy-600;
  }

  h3 {
    font-size: 1.1rem;
    color: $text-primary;
    margin: 0;
  }

  p {
    color: $text-muted;
    font-size: 0.88rem;
    text-align: center;
    max-width: 360px;
  }
}

// â”€â”€â”€ RESPONSIVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-md;
  }

  .header-actions {
    width: 100%;
  }

  .btn-text {
    display: none;
  }

  .filtros-row {
    flex-direction: column;

    .filtro-field {
      max-width: 100%;
      width: 100%;
    }
  }

  // Hide less important columns on mobile
  .alumnos-table {
    .mat-column-carrera,
    .mat-column-grupo {
      display: none;
    }
  }
}

.empty-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
```

## FILE: src\app\features\alumnos\alumnos.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/alumnos/alumnos.component.ts â•‘
// â•‘  Stenbrary v3.4 â€” Fix navegaciÃ³n + CSV seguro        â•‘
// â•‘                                                      â•‘
// â•‘  FIX v3.4:                                           â•‘
// â•‘  - verDetalle() navega con matricula (antes con id)  â•‘
// â•‘  - exportarCSV() escapa campos con comas/comillas    â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Alumno } from '../../core/models';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
  ],
  templateUrl: './alumnos.component.html',
  styleUrl: './alumnos.component.scss',
})
export class AlumnosComponent implements OnInit {

  // â”€â”€â”€ DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  todosAlumnos: Alumno[] = [];
  cargando = true;

  // â”€â”€â”€ FILTROS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  filtros = signal({
    busqueda: '',
    carrera: '',
    grado: '',
    grupo: '',
    turno: '',
  });

  // Opciones Ãºnicas extraÃ­das de los datos reales
  carrerasUnicas = signal<string[]>([]);
  gradosUnicos = signal<number[]>([]);
  gruposUnicos = signal<string[]>([]);

  // â”€â”€â”€ PAGINACIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  paginaActual = signal(0);
  filasPorPagina = 25;

  // â”€â”€â”€ TABLA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  columnas: string[] = [
    'matricula', 'nombre', 'carrera', 'grado', 'grupo', 'turno', 'acciones',
  ];

  constructor(
  private databaseService: DatabaseService,
  private toastService: ToastService,
  private exportService: ExportService,  // â† AGREGAR
  private router: Router,
) {}

  async ngOnInit(): Promise<void> {
    await this.cargarAlumnos();
  }

  // â”€â”€â”€ CARGA DE DATOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async cargarAlumnos(): Promise<void> {
    try {
      this.cargando = true;
      this.todosAlumnos = await this.databaseService.obtenerTodosLosAlumnos();

      // Extraer opciones Ãºnicas para los filtros
      const carreras = new Set<string>();
      const grados = new Set<number>();
      const grupos = new Set<string>();

      this.todosAlumnos.forEach(a => {
        if (a.carrera) carreras.add(a.carrera);
        if (a.grado) grados.add(a.grado);
        if (a.grupo) grupos.add(a.grupo);
      });

      this.carrerasUnicas.set([...carreras].sort());
      this.gradosUnicos.set([...grados].sort((a, b) => a - b));
      this.gruposUnicos.set([...grupos].sort());

      this.cargando = false;
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      this.cargando = false;
    }
  }

  // â”€â”€â”€ FILTRADO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  get alumnosFiltrados(): Alumno[] {
    const f = this.filtros();
    let resultado = [...this.todosAlumnos];

    if (f.busqueda.trim()) {
      const termino = f.busqueda.toLowerCase().trim();
      resultado = resultado.filter(a =>
        a.matricula.toLowerCase().includes(termino) ||
        a.nombre.toLowerCase().includes(termino) ||
        a.apellidoPaterno.toLowerCase().includes(termino) ||
        a.apellidoMaterno.toLowerCase().includes(termino) ||
        `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`.toLowerCase().includes(termino)
      );
    }

    if (f.carrera) resultado = resultado.filter(a => a.carrera === f.carrera);
    if (f.grado) resultado = resultado.filter(a => a.grado === Number(f.grado));
    if (f.grupo) resultado = resultado.filter(a => a.grupo === f.grupo);
    if (f.turno) resultado = resultado.filter(a => a.turno === f.turno);

    return resultado;
  }

  get alumnosPaginados(): Alumno[] {
    const inicio = this.paginaActual() * this.filasPorPagina;
    return this.alumnosFiltrados.slice(inicio, inicio + this.filasPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.alumnosFiltrados.length / this.filasPorPagina);
  }

  get hayFiltrosActivos(): boolean {
    const f = this.filtros();
    return !!(f.busqueda || f.carrera || f.grado || f.grupo || f.turno);
  }

  // â”€â”€â”€ ACCIONES DE FILTRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  actualizarFiltro(campo: string, valor: string): void {
    this.filtros.update(f => ({ ...f, [campo]: valor }));
    this.paginaActual.set(0);
  }

  limpiarFiltros(): void {
    this.filtros.set({ busqueda: '', carrera: '', grado: '', grupo: '', turno: '' });
    this.paginaActual.set(0);
  }

  // â”€â”€â”€ PAGINACIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  paginaAnterior(): void {
    if (this.paginaActual() > 0) this.paginaActual.update(p => p - 1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas - 1) this.paginaActual.update(p => p + 1);
  }

  // â”€â”€â”€ NAVEGACIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  verDetalle(alumno: Alumno): void {
    // FIX v3.4: navegar con matrÃ­cula (antes enviaba alumno.id â†’ UUID incompatible)
    this.router.navigate(['/detalle-alumno', alumno.matricula]);
  }

  irARegistrar(): void {
    this.router.navigate(['/registro-alumno']);
  }

  irAImportar(): void {
    this.router.navigate(['/importar-alumnos']);
  }

  // â”€â”€â”€ UTILIDADES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  nombreCompleto(a: Alumno): string {
    return `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`;
  }

 exportarCSV(): void {
    const datos = this.alumnosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para exportar');
      return;
    }
    this.exportService.exportarAlumnosXLSX(datos);
    this.toastService.success(`${datos.length} alumnos exportados a Excel`);
  }

  /**
   * Escapa un campo para CSV: si contiene comas, comillas o saltos de lÃ­nea,
   * lo envuelve en comillas dobles y duplica las comillas internas.
   */
  private escaparCSV(valor: string): string {
    if (valor.includes(',') || valor.includes('"') || valor.includes('\n')) {
      return `"${valor.replace(/"/g, '""')}"`;
    }
    return valor;
  }
}
```

## FILE: src\app\features\configuracion\configuracion.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/configuracion/               â•‘
// â•‘        configuracion.component.ts                    â•‘
// â•‘  Stenbrary v3.4.1 â€” Fix padding + limpiar duplicados â•‘
// â•‘                                                      â•‘
// â•‘  FIX v3.4.1:                                         â•‘
// â•‘  - Padding/margin corregidos en layout               â•‘
// â•‘  - BotÃ³n "Limpiar duplicados" en mantenimiento       â•‘
// â•‘  - Info card con conteo de duplicados si existen     â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import {
  BackupService,
  BackupData,
  ResultadoImportacion,
} from '../../core/services/backup.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="config-container">

      <!-- â•â•â• HEADER â•â•â• -->
      <div class="page-header">
        <div class="header-icon">
          <mat-icon>settings</mat-icon>
        </div>
        <div>
          <h1>ConfiguraciÃ³n</h1>
          <p class="subtitle">GestiÃ³n de datos, respaldos y sistema</p>
        </div>
      </div>

      <!-- â•â•â• INFO DEL SISTEMA â•â•â• -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>info</mat-icon>
          <h2>InformaciÃ³n del Sistema</h2>
        </div>

        <div class="info-grid" *ngIf="!cargandoInfo">
          <div class="info-stat">
            <div class="stat-value cyan">{{ conteoAlumnos }}</div>
            <div class="stat-label">Alumnos registrados</div>
          </div>
          <div class="info-stat">
            <div class="stat-value teal">{{ conteoRegistros }}</div>
            <div class="stat-label">Registros de acceso</div>
          </div>
          <div class="info-stat">
            <div class="stat-value amber">{{ conteoMotivos }}</div>
            <div class="stat-label">Motivos / actividades</div>
          </div>
          <div class="info-stat">
            <div class="stat-value purple">{{ almacenamientoEstimado }}</div>
            <div class="stat-label">Almacenamiento usado</div>
          </div>
        </div>

        <!-- Alerta de duplicados -->
        <div class="alert-duplicates" *ngIf="motivosDuplicados > 0">
          <mat-icon>warning</mat-icon>
          <span>
            Se detectaron <strong>{{ motivosDuplicados }}</strong> motivos duplicados.
          </span>
          <button class="btn-inline" (click)="limpiarDuplicados()" [disabled]="procesando">
            Limpiar ahora
          </button>
        </div>

        <div class="info-meta">
          <span class="meta-chip">
            <mat-icon>code</mat-icon>
            Stenbrary v3.4
          </span>
          <span class="meta-chip">
            <mat-icon>storage</mat-icon>
            IndexedDB local
          </span>
          <span class="meta-chip">
            <mat-icon>phone_android</mat-icon>
            PWA Offline-First
          </span>
        </div>
      </mat-card>

      <!-- â•â•â• BACKUP â•â•â• -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>cloud_download</mat-icon>
          <h2>Respaldar Datos</h2>
        </div>
        <p class="section-desc">
          Descarga un archivo JSON con todos tus datos (alumnos, registros y motivos).
          GuÃ¡rdalo en un lugar seguro. PodrÃ¡s restaurarlo en cualquier momento.
        </p>
        <button class="btn-action btn-backup"
                (click)="exportarBackup()"
                [disabled]="procesando">
          <mat-icon>download</mat-icon>
          <span>{{ procesando ? 'Generando...' : 'Descargar Backup' }}</span>
        </button>
        <p class="section-hint">
          <mat-icon>schedule</mat-icon>
          {{ ultimoBackup ? 'Ãšltimo backup: ' + ultimoBackup : 'No se ha hecho ningÃºn backup desde esta sesiÃ³n' }}
        </p>
      </mat-card>

      <!-- â•â•â• RESTORE â•â•â• -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>cloud_upload</mat-icon>
          <h2>Restaurar Datos</h2>
        </div>
        <p class="section-desc">
          Importa un archivo de backup previamente descargado.
          Los datos nuevos se agregarÃ¡n sin borrar los existentes (duplicados se omiten).
        </p>

        <input type="file"
               #fileInput
               accept=".json"
               (change)="onArchivoSeleccionado($event)"
               style="display: none">

        <div class="restore-actions">
          <button class="btn-action btn-restore"
                  (click)="fileInput.click()"
                  [disabled]="procesando">
            <mat-icon>upload_file</mat-icon>
            <span>Seleccionar archivo JSON</span>
          </button>
        </div>

        <!-- Preview del archivo -->
        <div class="restore-preview" *ngIf="backupPreview">
          <div class="preview-header">
            <mat-icon>description</mat-icon>
            <span>{{ nombreArchivoSeleccionado }}</span>
          </div>
          <div class="preview-stats">
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalAlumnos }}</strong> alumnos
            </span>
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalRegistros }}</strong> registros
            </span>
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalMotivos }}</strong> motivos
            </span>
            <span class="preview-stat fecha">
              <mat-icon>event</mat-icon>
              {{ formatearFechaBackup(backupPreview.meta.fecha) }}
            </span>
          </div>
          <div class="preview-actions">
            <button class="btn-action btn-merge"
                    (click)="importarBackup('merge')"
                    [disabled]="procesando"
                    matTooltip="Agrega datos nuevos sin borrar los existentes">
              <mat-icon>merge_type</mat-icon>
              <span>Combinar datos</span>
            </button>
            <button class="btn-action btn-replace"
                    (click)="importarBackup('replace')"
                    [disabled]="procesando"
                    matTooltip="âš ï¸ Borra todo y reemplaza con el backup">
              <mat-icon>swap_horiz</mat-icon>
              <span>Reemplazar todo</span>
            </button>
            <button class="btn-action btn-cancel-preview"
                    (click)="cancelarImportacion()"
                    [disabled]="procesando">
              <mat-icon>close</mat-icon>
              <span>Cancelar</span>
            </button>
          </div>
        </div>

        <!-- Resultado -->
        <div class="import-result" *ngIf="resultadoImportacion"
             [class.success]="resultadoImportacion.exitoso">
          <mat-icon>{{ resultadoImportacion.exitoso ? 'check_circle' : 'error' }}</mat-icon>
          <div class="result-text">
            <strong>{{ resultadoImportacion.exitoso ? 'ImportaciÃ³n exitosa' : 'Error en importaciÃ³n' }}</strong>
            <span *ngIf="resultadoImportacion.exitoso">
              {{ resultadoImportacion.alumnosImportados }} alumnos,
              {{ resultadoImportacion.registrosImportados }} registros,
              {{ resultadoImportacion.motivosImportados }} motivos importados
              <span *ngIf="resultadoImportacion.alumnosOmitidos > 0">
                Â· {{ resultadoImportacion.alumnosOmitidos }} alumnos omitidos (duplicados)
              </span>
              <span *ngIf="resultadoImportacion.motivosOmitidos > 0">
                Â· {{ resultadoImportacion.motivosOmitidos }} motivos omitidos (duplicados)
              </span>
            </span>
          </div>
        </div>
      </mat-card>

      <!-- â•â•â• MANTENIMIENTO â•â•â• -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>build</mat-icon>
          <h2>Mantenimiento</h2>
        </div>
        <p class="section-desc">
          Herramientas para mantener tus datos limpios y organizados.
        </p>
        <div class="maintenance-actions">
          <button class="btn-action btn-maintenance"
                  (click)="limpiarDuplicados()"
                  [disabled]="procesando">
            <mat-icon>content_copy</mat-icon>
            <span>Limpiar motivos duplicados</span>
          </button>
        </div>
      </mat-card>

      <!-- â•â•â• ZONA PELIGROSA â•â•â• -->
      <mat-card class="section-card danger-zone">
        <div class="section-header danger">
          <mat-icon>warning</mat-icon>
          <h2>Zona Peligrosa</h2>
        </div>
        <p class="section-desc">
          Estas acciones son irreversibles. AsegÃºrate de tener un backup antes de continuar.
        </p>
        <div class="danger-actions">
          <button class="btn-action btn-danger"
                  (click)="limpiarTodosDatos()"
                  [disabled]="procesando">
            <mat-icon>delete_forever</mat-icon>
            <span>Eliminar todos los datos</span>
          </button>
        </div>
      </mat-card>

    </div>
  `,
  styles: [`
    /* â”€â”€ Container â”€â”€ */
   .config-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 16px 48px;
}

    /* â”€â”€ Page Header â”€â”€ */
   .page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding-top: 4px;
}

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      background: rgba(0, 200, 215, 0.10);
      border: 1px solid rgba(0, 200, 215, 0.25);
      border-radius: 16px;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #00C8D7;
      }
    }

    h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #E8F4F8;
    }

    .subtitle {
      margin: 2px 0 0;
      font-size: 0.85rem;
      color: rgba(200, 230, 240, 0.5);
    }

    /* â”€â”€ Section Cards â”€â”€ */
    .section-card {
      background: #101c2c !important;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 16px;
      padding: 28px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;

      mat-icon {
        color: #00C8D7;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: #E8F4F8;
      }

      &.danger mat-icon { color: #F05252; }
      &.danger h2 { color: #F05252; }
    }

    .section-desc {
      margin: 0 0 20px;
      font-size: 0.85rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.5;
    }

    .section-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 14px 0 0;
      font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.35);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    /* â”€â”€ Info Grid â”€â”€ */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .info-stat {
      background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 12px;
      padding: 18px 14px;
      text-align: center;
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      font-family: 'Space Mono', monospace;
      line-height: 1;
      margin-bottom: 6px;

      &.cyan { color: #00C8D7; }
      &.teal { color: #0BC4B7; }
      &.amber { color: #F5A623; }
      &.purple { color: #8B5CF6; }
    }

    .stat-label {
      font-size: 0.72rem;
      color: rgba(200, 230, 240, 0.45);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* â”€â”€ Duplicates Alert â”€â”€ */
    .alert-duplicates {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: rgba(245, 166, 35, 0.08);
      border: 1px solid rgba(245, 166, 35, 0.2);
      border-radius: 12px;
      font-size: 0.85rem;
      color: #F5A623;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      strong {
        font-weight: 700;
      }
    }

    .btn-inline {
      background: rgba(245, 166, 35, 0.15);
      color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.3);
      border-radius: 8px;
      padding: 4px 12px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      font-family: 'DM Sans', sans-serif;
      transition: background 200ms;

      &:hover:not(:disabled) {
        background: rgba(245, 166, 35, 0.25);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .info-meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: rgba(0, 200, 215, 0.06);
      border: 1px solid rgba(0, 200, 215, 0.12);
      border-radius: 20px;
      font-size: 0.72rem;
      color: rgba(200, 230, 240, 0.6);
      font-weight: 500;

      mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
        color: #00C8D7;
      }
    }

    /* â”€â”€ Action Buttons â”€â”€ */
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border: none;
      border-radius: 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 200ms;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
      }
    }

    .btn-backup {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 24px rgba(0, 200, 215, 0.35);
      }
    }

    .btn-restore {
      background: rgba(0, 200, 215, 0.10);
      color: #00C8D7;
      border: 1px solid rgba(0, 200, 215, 0.25);

      &:hover:not(:disabled) {
        background: rgba(0, 200, 215, 0.18);
      }
    }

    .btn-merge {
      background: linear-gradient(135deg, #0BC4B7, #0EB07B);
      color: #04090F;
      box-shadow: 0 4px 12px rgba(11, 196, 183, 0.2);
    }

    .btn-replace {
      background: rgba(245, 166, 35, 0.12);
      color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.3);
    }

    .btn-cancel-preview {
      background: rgba(200, 230, 240, 0.06);
      color: rgba(200, 230, 240, 0.5);
      border: 1px solid rgba(200, 230, 240, 0.1);
    }

    .btn-maintenance {
      background: rgba(99, 102, 241, 0.10);
      color: #6366F1;
      border: 1px solid rgba(99, 102, 241, 0.25);

      &:hover:not(:disabled) {
        background: rgba(99, 102, 241, 0.18);
      }
    }

    .btn-danger {
      background: rgba(240, 82, 82, 0.10);
      color: #F05252;
      border: 1px solid rgba(240, 82, 82, 0.25);

      &:hover:not(:disabled) {
        background: rgba(240, 82, 82, 0.20);
      }
    }

    /* â”€â”€ Restore Preview â”€â”€ */
    .restore-preview {
      margin-top: 20px;
      padding: 18px;
      background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.15);
      border-radius: 12px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      font-weight: 600;
      color: #E8F4F8;
      font-size: 0.9rem;

      mat-icon { color: #00C8D7; }
    }

    .preview-stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .preview-stat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.82rem;
      color: rgba(200, 230, 240, 0.55);

      strong { color: #E8F4F8; }

      &.fecha {
        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
          color: rgba(200, 230, 240, 0.35);
        }
      }
    }

    .preview-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .restore-actions {
      display: flex;
      gap: 10px;
    }

    .maintenance-actions {
      display: flex;
      gap: 10px;
    }

    /* â”€â”€ Import Result â”€â”€ */
    .import-result {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 18px;
      padding: 14px 16px;
      background: rgba(240, 82, 82, 0.08);
      border: 1px solid rgba(240, 82, 82, 0.2);
      border-radius: 12px;
      color: #F05252;

      &.success {
        background: rgba(11, 196, 183, 0.08);
        border-color: rgba(11, 196, 183, 0.2);
        color: #0BC4B7;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .result-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.85rem;
        line-height: 1.4;
      }
    }

    /* â”€â”€ Danger Zone â”€â”€ */
    .danger-zone {
      border-color: rgba(240, 82, 82, 0.15);
    }

    .danger-actions {
      display: flex;
      gap: 10px;
    }

    /* â”€â”€ Responsive â”€â”€ */
    @media (max-width: 768px) {
      .info-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .preview-actions {
        flex-direction: column;
      }

      .section-card {
        padding: 20px;
      }
    }

    @media (max-width: 480px) {
      .info-grid {
        grid-template-columns: 1fr 1fr;
      }

      .alert-duplicates {
        flex-wrap: wrap;
      }
    }
  `],
})
export class ConfiguracionComponent implements OnInit {

  cargandoInfo = true;
  procesando = false;

  // Info
  conteoAlumnos = 0;
  conteoRegistros = 0;
  conteoMotivos = 0;
  almacenamientoEstimado = 'â€”';
  motivosDuplicados = 0;

  // Backup
  ultimoBackup = '';

  // Restore
  backupPreview: BackupData | null = null;
  nombreArchivoSeleccionado = '';
  resultadoImportacion: ResultadoImportacion | null = null;

  constructor(
    private databaseService: DatabaseService,
    private backupService: BackupService,
    private toastService: ToastService,
    private loadingService: LoadingService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarInfo();
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // INFO
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async cargarInfo(): Promise<void> {
    try {
      this.cargandoInfo = true;

      const [conteo, duplicados] = await Promise.all([
        this.databaseService.obtenerConteoTotal(),
        this.backupService.contarMotivosDuplicados(),
      ]);

      this.conteoAlumnos = conteo.alumnos;
      this.conteoRegistros = conteo.registros;
      this.conteoMotivos = conteo.motivos;
      this.motivosDuplicados = duplicados;

      await this.estimarAlmacenamiento();

      this.cargandoInfo = false;
    } catch (error) {
      console.error('Error al cargar info:', error);
      this.cargandoInfo = false;
    }
  }

  private async estimarAlmacenamiento(): Promise<void> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / (1024 * 1024);
        if (usedMB < 1) {
          this.almacenamientoEstimado = `${Math.round((estimate.usage || 0) / 1024)} KB`;
        } else {
          this.almacenamientoEstimado = `${usedMB.toFixed(1)} MB`;
        }
      } else {
        this.almacenamientoEstimado = 'N/A';
      }
    } catch {
      this.almacenamientoEstimado = 'N/A';
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // BACKUP
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async exportarBackup(): Promise<void> {
    try {
      this.procesando = true;
      this.loadingService.show('Generando backup...');

      const resultado = await this.backupService.descargarBackup();

      this.loadingService.hide();
      this.procesando = false;
      this.ultimoBackup = new Date().toLocaleString('es-MX');
      this.toastService.success(`Backup descargado: ${resultado.nombreArchivo}`);
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al generar el backup');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RESTORE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.backupPreview = null;
    this.resultadoImportacion = null;
    this.nombreArchivoSeleccionado = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      const contenido = reader.result as string;
      const validacion = this.backupService.validarArchivo(contenido);

      if (!validacion.valido) {
        this.toastService.error(validacion.errores[0]);
        return;
      }

      this.backupPreview = validacion.datos!;
      this.toastService.info('Archivo vÃ¡lido â€” revisa los datos antes de importar');
    };
    reader.onerror = () => {
      this.toastService.error('Error al leer el archivo');
    };
    reader.readAsText(file);

    input.value = '';
  }

  async importarBackup(modo: 'merge' | 'replace'): Promise<void> {
    if (!this.backupPreview) return;

    if (modo === 'replace') {
      const c1 = confirm(
        'âš ï¸ REEMPLAZAR TODO\n\n' +
        'Esto BORRARÃ todos los datos actuales y los reemplazarÃ¡ con el backup.\n\n' +
        'Â¿EstÃ¡s seguro?'
      );
      if (!c1) return;

      const c2 = confirm('Â¿REALMENTE quieres borrar todo? Esta acciÃ³n NO se puede deshacer.');
      if (!c2) return;
    }

    try {
      this.procesando = true;
      this.loadingService.show(
        modo === 'replace' ? 'Reemplazando datos...' : 'Combinando datos...'
      );

      this.resultadoImportacion = await this.backupService.importarBackup(
        this.backupPreview, modo
      );

      this.backupPreview = null;
      this.loadingService.hide();
      this.procesando = false;

      if (this.resultadoImportacion.exitoso) {
        this.toastService.success('ImportaciÃ³n completada exitosamente');
        await this.cargarInfo();
      } else {
        this.toastService.error('Hubo errores durante la importaciÃ³n');
      }
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error durante la importaciÃ³n');
    }
  }

  cancelarImportacion(): void {
    this.backupPreview = null;
    this.resultadoImportacion = null;
    this.nombreArchivoSeleccionado = '';
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MANTENIMIENTO
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async limpiarDuplicados(): Promise<void> {
    try {
      this.procesando = true;
      this.loadingService.show('Limpiando motivos duplicados...');

      const eliminados = await this.backupService.limpiarMotivosDuplicados();

      this.loadingService.hide();
      this.procesando = false;

      if (eliminados > 0) {
        this.toastService.success(`${eliminados} motivos duplicados eliminados`);
      } else {
        this.toastService.info('No se encontraron motivos duplicados');
      }

      await this.cargarInfo();
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al limpiar duplicados');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ZONA PELIGROSA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async limpiarTodosDatos(): Promise<void> {
    const c1 = confirm(
      'âš ï¸ ELIMINAR TODOS LOS DATOS\n\n' +
      'Esto borrarÃ¡ TODOS los alumnos, registros y motivos.\n' +
      'Los motivos por defecto se recrearÃ¡n automÃ¡ticamente.\n\n' +
      'Â¿Hiciste un backup? Si no, cancela y hazlo primero.'
    );
    if (!c1) return;

    const c2 = confirm('Â¿ÃšLTIMA OPORTUNIDAD â€” realmente quieres borrar todo?');
    if (!c2) return;

    try {
      this.procesando = true;
      this.loadingService.show('Eliminando todos los datos...');

      await this.databaseService.limpiarTodosDatos();

      this.loadingService.hide();
      this.procesando = false;
      this.toastService.success('Todos los datos han sido eliminados');
      await this.cargarInfo();
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al limpiar los datos');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // HELPERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  formatearFechaBackup(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
```

## FILE: src\app\features\dashboard\dashboard.component.html
```html
<!-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•— -->
<!-- â•‘  dashboard.component.html â€” Stenbrary v3.5.1        â•‘ -->
<!-- â•‘  Auto-refresh + accesos rÃ¡pidos actualizados         â•‘ -->
<!-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->

<div class="dashboard-container">

  @if (cargando) {
    <div class="loading-state">
      <mat-spinner diameter="36"></mat-spinner>
      <p>Cargando...</p>
    </div>
  } @else {

    <!-- â”€â”€ HEADER â”€â”€ -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <mat-icon>dashboard</mat-icon>
        </div>
        <div>
          <h1>{{ saludo }}</h1>
          <p class="header-subtitle">
            @if (ultimoRegistroHora) {
              Ãšltimo registro a las {{ ultimoRegistroHora }}
            } @else {
              Sin registros hoy
            }
          </p>
        </div>
      </div>
      <div class="header-right">
        <!-- Indicador auto-refresh -->
        <button class="btn-auto-refresh"
          [class.active]="autoRefreshActivo"
          (click)="toggleAutoRefresh()"
          [matTooltip]="autoRefreshActivo ? 'Auto-refresh activo (30s) â€” clic para desactivar' : 'Auto-refresh desactivado â€” clic para activar'">
          <span class="pulse-dot" *ngIf="autoRefreshActivo"></span>
          <mat-icon>{{ autoRefreshActivo ? 'sync' : 'sync_disabled' }}</mat-icon>
        </button>
        <button class="btn-refresh" (click)="cargarDatos()" matTooltip="Actualizar datos">
          <mat-icon [class.spinning]="actualizando">refresh</mat-icon>
        </button>
      </div>
    </div>

    <!-- â”€â”€ STATS GRID â”€â”€ -->
    <div class="stats-grid">
      @for (stat of stats; track stat.etiqueta; let i = $index) {
        <button class="stat-card" (click)="navegar(stat.ruta)"
          [style.animation-delay]="(i * 80) + 'ms'">
          <div class="stat-icon-wrap" [style.background]="stat.color + '14'"
            [style.border-color]="stat.color + '30'">
            <mat-icon [style.color]="stat.color">{{ stat.icono }}</mat-icon>
          </div>
          <div class="stat-data">
            <span class="stat-valor mono">{{ stat.valor }}</span>
            <span class="stat-label">{{ stat.etiqueta }}</span>
          </div>
          <mat-icon class="stat-arrow">chevron_right</mat-icon>
        </button>
      }
    </div>

    <!-- â”€â”€ CONTENIDO EN DOS COLUMNAS â”€â”€ -->
    <div class="content-grid">

      <!-- Actividades de hoy -->
      <div class="panel">
        <div class="panel-header">
          <h2>Actividades de hoy</h2>
          <button class="link-btn" (click)="navegar('/registros')">
            Ver todos
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>

        @if (actividadesHoy.length > 0) {
          <div class="actividades-list">
            @for (a of actividadesHoy; track a.nombre) {
              <div class="actividad-item">
                <div class="actividad-icon"
                  [style.background]="a.color + '14'"
                  [style.border-color]="a.color + '25'">
                  <mat-icon [style.color]="a.color">{{ a.icono }}</mat-icon>
                </div>
                <span class="actividad-nombre">{{ a.nombre }}</span>
                <span class="actividad-count mono">{{ a.cantidad }}</span>
              </div>
            }
          </div>
        } @else {
          <div class="panel-empty">
            <mat-icon>event_note</mat-icon>
            <p>No hay actividades registradas hoy</p>
          </div>
        }
      </div>

      <!-- Ãšltimos registros -->
      <div class="panel">
        <div class="panel-header">
          <h2>Ãšltimos registros</h2>
          <button class="link-btn" (click)="navegar('/registros')">
            Historial
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>

        @if (ultimosRegistros.length > 0) {
          <div class="registros-preview">
            @for (r of ultimosRegistros; track r.id) {
              <div class="registro-item">
                <span class="registro-hora mono">{{ formatearHora(r.fechaHora) }}</span>
                <div class="registro-info">
                  <span class="registro-nombre">{{ r.nombreCompleto }}</span>
                  <span class="registro-motivo">{{ r.motivoNombre }}</span>
                </div>
                <span class="registro-matricula mono">{{ r.matricula }}</span>
              </div>
            }
          </div>
        } @else {
          <div class="panel-empty">
            <mat-icon>schedule</mat-icon>
            <p>Los registros de hoy aparecerÃ¡n aquÃ­</p>
          </div>
        }
      </div>

    </div>

    <!-- â”€â”€ ACCESOS RÃPIDOS â”€â”€ -->
    <div class="quick-actions">
      <h3>Accesos rÃ¡pidos</h3>
      <div class="actions-grid">
        <button class="action-card" (click)="navegar('/scanner')">
          <mat-icon>qr_code_scanner</mat-icon>
          <span>Escanear</span>
        </button>
        <button class="action-card" (click)="navegar('/registro-alumno')">
          <mat-icon>person_add</mat-icon>
          <span>Nuevo alumno</span>
        </button>
        <button class="action-card" (click)="navegar('/importar-alumnos')">
          <mat-icon>upload_file</mat-icon>
          <span>Importar</span>
        </button>
        <button class="action-card" (click)="navegar('/alumnos')">
          <mat-icon>groups</mat-icon>
          <span>Alumnos</span>
        </button>
        <button class="action-card" (click)="navegar('/estadisticas')">
          <mat-icon>bar_chart</mat-icon>
          <span>EstadÃ­sticas</span>
        </button>
        <button class="action-card" (click)="navegar('/configuracion')">
          <mat-icon>settings</mat-icon>
          <span>ConfiguraciÃ³n</span>
        </button>
      </div>
    </div>

  }
</div>
```

## FILE: src\app\features\dashboard\dashboard.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  dashboard.component.scss â€” Stenbrary v3.3            â•‘
// â•‘  Resumen simplificado â€” Cyan Cube Dark Theme          â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

.dashboard-container {
  height: 100%;
  overflow-y: auto;
  padding: $spacing-lg;
}

// â”€â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-lg;
  animation: slideInDown 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba($cyan-500, 0.10);
  border: 1px solid rgba($cyan-500, 0.20);
  border-radius: 14px;
  mat-icon { font-size: 24px; color: $cyan-400; }
}

h1 {
  margin: 0;
  font-family: $font-display;
  font-size: 1.5rem;
  font-weight: 700;
  color: $text-primary;
}

.header-subtitle {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: $text-muted;
  font-family: $font-mono;
}

.btn-refresh {
  width: 40px;
  height: 40px;
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-md;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  &:hover {
    border-color: $border-glow;
    color: $cyan-400;
  }
}

// â”€â”€â”€ STATS GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  cursor: pointer;
  transition: all 250ms;
  animation: slideInUp 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
  text-align: left;

  &:hover {
    border-color: $border-glow;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.20);

    .stat-arrow { opacity: 1; transform: translateX(0); }
  }
}

.stat-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid;
  flex-shrink: 0;

  mat-icon { font-size: 22px; }
}

.stat-data {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stat-valor {
  font-size: 1.4rem;
  font-weight: 700;
  color: $text-primary;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.78rem;
  color: $text-muted;
  margin-top: 2px;
}

.stat-arrow {
  font-size: 18px;
  width: 18px;
  height: 18px;
  color: $text-muted;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 200ms;
}

// â”€â”€â”€ CONTENT GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-lg;
  margin-bottom: $spacing-lg;
}

.panel {
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  padding: $spacing-lg;
  animation: slideInUp 400ms 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-md;

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: $text-primary;
  }
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: $cyan-400;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;

  mat-icon { font-size: 16px; width: 16px; height: 16px; }

  &:hover {
    color: $cyan-200;
    gap: 6px;
  }
}

// â”€â”€â”€ ACTIVIDADES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.actividades-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.actividad-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: 10px $spacing-md;
  background: $navy-700;
  border-radius: $border-radius-md;
  transition: background $transition-fast;

  &:hover { background: $navy-600; }
}

.actividad-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid;
  flex-shrink: 0;

  mat-icon { font-size: 18px; width: 18px; height: 18px; }
}

.actividad-nombre {
  flex: 1;
  font-size: 0.88rem;
  color: $text-primary;
  font-weight: 500;
}

.actividad-count {
  font-size: 0.9rem;
  font-weight: 700;
  color: $cyan-400;
  min-width: 28px;
  text-align: right;
}

// â”€â”€â”€ ÃšLTIMOS REGISTROS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.registros-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.registro-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: 8px $spacing-md;
  border-radius: $border-radius-sm;
  transition: background $transition-fast;

  &:hover { background: rgba($cyan-500, 0.04); }

  &:not(:last-child) {
    border-bottom: 1px solid $border-subtle;
  }
}

.registro-hora {
  font-size: 0.78rem;
  color: $text-muted;
  min-width: 50px;
}

.registro-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.registro-nombre {
  font-size: 0.85rem;
  font-weight: 500;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.registro-motivo {
  font-size: 0.72rem;
  color: $text-muted;
}

.registro-matricula {
  font-size: 0.75rem;
  color: $cyan-400;
  padding: 2px 8px;
  background: rgba($cyan-500, 0.08);
  border-radius: 4px;
}

// â”€â”€â”€ PANEL EMPTY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xl $spacing-md;

  mat-icon {
    font-size: 36px;
    width: 36px;
    height: 36px;
    color: $navy-600;
  }

  p {
    color: $text-muted;
    font-size: 0.85rem;
    text-align: center;
  }
}

// â”€â”€â”€ ACCESOS RÃPIDOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.quick-actions {
  animation: slideInUp 400ms 350ms cubic-bezier(0.16, 1, 0.3, 1) both;

  h3 {
    font-size: 0.82rem;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    margin: 0 0 $spacing-md;
  }
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-lg;
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  cursor: pointer;
  transition: all 250ms;
  color: $text-secondary;

  mat-icon {
    font-size: 28px;
    width: 28px;
    height: 28px;
  }

  span {
    font-size: 0.82rem;
    font-weight: 500;
  }

  &:hover {
    border-color: $border-glow;
    color: $cyan-400;
    background: rgba($cyan-500, 0.04);
    transform: translateY(-2px);
  }
}

// â”€â”€â”€ LOADING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-md;
  height: 50vh;
  p { color: $text-muted; font-size: 0.9rem; }
}

// â”€â”€â”€ RESPONSIVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@media (max-width: $breakpoint-md) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-arrow { display: none; }
}

@media (max-width: $breakpoint-sm) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}


// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  AGREGAR al final de:                                â•‘
// â•‘  src/app/features/dashboard/dashboard.component.scss â•‘
// â•‘  Stenbrary v3.5.1 â€” Estilos auto-refresh             â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ Header right â”€â”€
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

// â”€â”€ Auto-refresh button â”€â”€
.btn-auto-refresh {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(200, 230, 240, 0.08);
  border-radius: 10px;
  background: rgba(200, 230, 240, 0.03);
  color: rgba(200, 230, 240, 0.35);
  cursor: pointer;
  transition: all 200ms;

  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
  }

  &.active {
    border-color: rgba(11, 196, 183, 0.25);
    background: rgba(11, 196, 183, 0.06);
    color: #0BC4B7;
  }

  &:hover {
    background: rgba(200, 230, 240, 0.06);
  }
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0BC4B7;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(11, 196, 183, 0.4); }
  50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(11, 196, 183, 0); }
}

// â”€â”€ Spinning refresh icon â”€â”€
.spinning {
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// â”€â”€ Actions grid: 6 items â”€â”€
.actions-grid {
  grid-template-columns: repeat(3, 1fr) !important;
}

@media (max-width: 600px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
```

## FILE: src\app\features\dashboard\dashboard.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/dashboard/                   â•‘
// â•‘        dashboard.component.ts                        â•‘
// â•‘  Stenbrary v3.5.1 â€” Auto-refresh + accesos rÃ¡pidos   â•‘
// â•‘                                                      â•‘
// â•‘  NUEVO:                                              â•‘
// â•‘  - Auto-refresh cada 30s (toggle on/off)             â•‘
// â•‘  - Indicador visual cuando se estÃ¡ actualizando      â•‘
// â•‘  - Accesos rÃ¡pidos: + Importar, ConfiguraciÃ³n        â•‘
// â•‘  - Saludo segÃºn hora del dÃ­a                         â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Registro, Motivo } from '../../core/models';

interface QuickStat {
  icono: string;
  valor: number;
  etiqueta: string;
  color: string;
  ruta: string;
}

interface ActividadHoy {
  nombre: string;
  icono: string;
  color: string;
  cantidad: number;
}

const AUTO_REFRESH_MS = 30_000; // 30 segundos

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {

  cargando = true;
  actualizando = false;

  // Auto-refresh
  autoRefreshActivo = true;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Stats principales
  stats: QuickStat[] = [];

  // Actividades de hoy
  actividadesHoy: ActividadHoy[] = [];

  // Ãšltimos registros
  ultimosRegistros: Registro[] = [];
  ultimoRegistroHora = '';

  // Saludo
  saludo = '';

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    this.saludo = this.obtenerSaludo();
    await this.cargarDatos();
    this.iniciarAutoRefresh();
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  // â”€â”€â”€ AUTO-REFRESH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  toggleAutoRefresh(): void {
    this.autoRefreshActivo = !this.autoRefreshActivo;
    if (this.autoRefreshActivo) {
      this.iniciarAutoRefresh();
    } else {
      this.detenerAutoRefresh();
    }
  }

  private iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    if (!this.autoRefreshActivo) return;

    this.refreshInterval = setInterval(async () => {
      if (!this.cargando) {
        this.actualizando = true;
        await this.cargarDatos(true);
        this.actualizando = false;
      }
    }, AUTO_REFRESH_MS);
  }

  private detenerAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // â”€â”€â”€ CARGA DE DATOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async cargarDatos(silencioso = false): Promise<void> {
    try {
      if (!silencioso) this.cargando = true;

      const [alumnos, registrosHoy, todosRegistros, motivos] = await Promise.all([
        this.databaseService.obtenerTodosLosAlumnos(),
        this.databaseService.obtenerRegistrosDeHoy(),
        this.databaseService.obtenerTodosLosRegistros(),
        this.databaseService.obtenerMotivosActivos(),
      ]);

      // Stats cards
      this.stats = [
        {
          icono: 'today',
          valor: registrosHoy.length,
          etiqueta: 'Registros hoy',
          color: '#00C8D7',
          ruta: '/registros',
        },
        {
          icono: 'groups',
          valor: alumnos.length,
          etiqueta: 'Alumnos',
          color: '#0BC4B7',
          ruta: '/alumnos',
        },
        {
          icono: 'history',
          valor: todosRegistros.length,
          etiqueta: 'Registros totales',
          color: '#5DE4EC',
          ruta: '/registros',
        },
        {
          icono: 'category',
          valor: motivos.length,
          etiqueta: 'Actividades',
          color: '#F5A623',
          ruta: '/gestion-motivos',
        },
      ];

      // Actividades de hoy
      const porMotivo = new Map<string, { cantidad: number; icono: string; color: string }>();
      registrosHoy.forEach(r => {
        const existente = porMotivo.get(r.motivoNombre);
        if (existente) {
          existente.cantidad++;
        } else {
          const motivo = motivos.find(m => m.nombre === r.motivoNombre);
          porMotivo.set(r.motivoNombre, {
            cantidad: 1,
            icono: motivo?.icono || 'label',
            color: motivo?.color || '#00C8D7',
          });
        }
      });

      this.actividadesHoy = Array.from(porMotivo.entries())
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 6);

      // Ãšltimos 5 registros
      this.ultimosRegistros = registrosHoy
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
        .slice(0, 5);

      if (this.ultimosRegistros.length > 0) {
        const ultimo = new Date(this.ultimosRegistros[0].fechaHora);
        this.ultimoRegistroHora = ultimo.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      this.cargando = false;
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      this.cargando = false;
    }
  }

  // â”€â”€â”€ UTILIDADES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  navegar(ruta: string): void {
    this.router.navigate([ruta]);
  }

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private obtenerSaludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos dÃ­as';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
```

## FILE: src\app\features\dashboard-ejecutivo\dashboard-ejecutivo.component.html
```html
<!--
  RUTA: src/app/features/dashboard-ejecutivo/dashboard-ejecutivo.component.html
  Stenbrary v3.5 â€” Con grÃ¡ficas Chart.js

  NUEVO v3.5:
  - Canvas para grÃ¡fica de barras diaria
  - Canvas para dona de motivos
  - Canvas para barras horizontales de carreras
-->

<div class="dashboard-ejecutivo-container">

  <!-- Header -->
  <div class="header">
    <button mat-icon-button class="back-button" (click)="volverDashboard()">
      <mat-icon>arrow_back</mat-icon>
    </button>
    <div class="header-info">
      <h1>Dashboard Ejecutivo</h1>
      <p class="subtitle">AnÃ¡lisis avanzado y tendencias</p>
    </div>
  </div>

  <!-- Loading -->
  <div class="loading-state" *ngIf="cargando">
    <mat-icon>hourglass_empty</mat-icon>
    <p>Analizando datos...</p>
  </div>

  <!-- Contenido -->
  <div *ngIf="!cargando" class="content">

    <!-- Insights AutomÃ¡ticos -->
    <div class="insights-grid" *ngIf="insights.length > 0">
      <mat-card
        *ngFor="let insight of insights"
        class="insight-card"
        [class.insight-success]="insight.tipo === 'success'"
        [class.insight-warning]="insight.tipo === 'warning'"
        [class.insight-info]="insight.tipo === 'info'">
        <div class="insight-icon">
          <mat-icon>{{ insight.icono }}</mat-icon>
        </div>
        <div class="insight-content">
          <h3>{{ insight.titulo }}</h3>
          <p>{{ insight.descripcion }}</p>
        </div>
      </mat-card>
    </div>

    <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         GRÃFICAS (NUEVO v3.5)
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->

    <!-- Fila 1: Barras diarias + Dona motivos -->
    <div class="charts-row">

      <!-- GrÃ¡fica: Registros por dÃ­a -->
      <mat-card class="chart-card chart-wide">
        <div class="chart-header">
          <h2>
            <mat-icon>bar_chart</mat-icon>
            Registros â€” Ãšltimos 7 dÃ­as
          </h2>
        </div>
        <div class="chart-wrapper">
          <canvas #chartDiario></canvas>
        </div>
      </mat-card>

      <!-- GrÃ¡fica: DistribuciÃ³n por motivos -->
      <mat-card class="chart-card chart-narrow">
        <div class="chart-header">
          <h2>
            <mat-icon>pie_chart</mat-icon>
            Motivos (30 dÃ­as)
          </h2>
        </div>
        <div class="chart-wrapper chart-doughnut">
          <canvas #chartMotivos></canvas>
        </div>
      </mat-card>

    </div>

    <!-- Fila 2: Carreras -->
    <mat-card class="chart-card" *ngIf="datosCarreras.length > 0">
      <div class="chart-header">
        <h2>
          <mat-icon>school</mat-icon>
          Visitas por Carrera
        </h2>
      </div>
      <div class="chart-wrapper chart-carreras"
           [style.height.px]="alturaGraficaCarreras">
        <canvas #chartCarreras></canvas>
      </div>
    </mat-card>

    <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         SECCIONES EXISTENTES
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->

    <!-- Tendencia Semanal -->
    <mat-card class="tendencia-card" *ngIf="tendenciaSemanal">
      <h2>
        <mat-icon>timeline</mat-icon>
        Tendencia Semanal
      </h2>

      <div class="tendencia-grid">
        <div class="tendencia-stat">
          <span class="tendencia-label">Esta Semana</span>
          <span class="tendencia-valor grande">{{ tendenciaSemanal.actual }}</span>
          <span class="tendencia-sublabel">registros</span>
        </div>

        <div class="tendencia-icono" [class]="obtenerColorTendencia()">
          <mat-icon>{{ obtenerIconoTendencia() }}</mat-icon>
        </div>

        <div class="tendencia-stat">
          <span class="tendencia-label">Semana Anterior</span>
          <span class="tendencia-valor">{{ tendenciaSemanal.anterior }}</span>
          <span class="tendencia-sublabel">registros</span>
        </div>
      </div>

      <div class="tendencia-texto" [class]="obtenerColorTendencia()">
        {{ obtenerTextoTendencia() }}
      </div>
    </mat-card>

    <!-- Heatmap de Actividad -->
    <mat-card class="heatmap-card">
      <div class="heatmap-header">
        <h2>
          <mat-icon>grid_on</mat-icon>
          Mapa de Calor â€” Actividad por DÃ­a y Hora
        </h2>
        <div class="heatmap-leyenda">
          <span class="leyenda-item">
            <span class="leyenda-cuadro intensidad-0"></span>
            Nulo
          </span>
          <span class="leyenda-item">
            <span class="leyenda-cuadro intensidad-1"></span>
            Bajo
          </span>
          <span class="leyenda-item">
            <span class="leyenda-cuadro intensidad-2"></span>
            Medio
          </span>
          <span class="leyenda-item">
            <span class="leyenda-cuadro intensidad-3"></span>
            Alto
          </span>
          <span class="leyenda-item">
            <span class="leyenda-cuadro intensidad-4"></span>
            Muy Alto
          </span>
        </div>
      </div>

      <div class="heatmap-container">
        <div class="heatmap-grid">
          <div class="heatmap-corner"></div>
          <div *ngFor="let hora of horasDelDia" class="heatmap-hora">
            {{ hora }}:00
          </div>

          <ng-container *ngFor="let dia of diasSemana">
            <div class="heatmap-dia">{{ dia }}</div>
            <div
              *ngFor="let hora of horasDelDia"
              class="heatmap-cell"
              [class]="obtenerClaseIntensidad(obtenerCantidadHeatmap(dia, hora))"
              [matTooltip]="dia + ' ' + hora + ':00 â€” ' + obtenerCantidadHeatmap(dia, hora) + ' visitas'">
              <span class="cell-value" *ngIf="obtenerCantidadHeatmap(dia, hora) > 0">
                {{ obtenerCantidadHeatmap(dia, hora) }}
              </span>
            </div>
          </ng-container>
        </div>
      </div>

      <div class="heatmap-prediccion" *ngIf="diaPredicho">
        <mat-icon>psychology</mat-icon>
        <span><strong>PredicciÃ³n:</strong> {{ diaPredicho }} es tÃ­picamente el dÃ­a mÃ¡s concurrido</span>
      </div>
    </mat-card>

    <!-- Top Alumnos -->
    <mat-card class="top-alumnos-card">
      <h2>
        <mat-icon>emoji_events</mat-icon>
        Top 5 Alumnos MÃ¡s Frecuentes
      </h2>

      <div class="top-alumnos-lista" *ngIf="topAlumnos.length > 0">
        <div
          *ngFor="let item of topAlumnos; let i = index"
          class="top-alumno-item"
          (click)="verDetalleAlumno(item)">

          <div class="alumno-ranking">
            <span class="ranking-numero" [class.top-1]="i === 0" [class.top-2]="i === 1" [class.top-3]="i === 2">
              {{ i + 1 }}
            </span>
          </div>

          <div class="alumno-avatar">
            <mat-icon>account_circle</mat-icon>
          </div>

          <div class="alumno-info">
            <h3>{{ obtenerNombreCompleto(item) }}</h3>
            <p class="alumno-carrera">{{ item.alumno.carrera }}</p>
          </div>

          <div class="alumno-stats">
            <div class="stat-item">
              <mat-icon>login</mat-icon>
              <span>{{ item.totalVisitas }} visitas</span>
            </div>
            <div class="stat-item">
              <mat-icon>event</mat-icon>
              <span>{{ formatearFecha(item.ultimaVisita) }}</span>
            </div>
            <div class="stat-item">
              <mat-chip class="motivo-chip">{{ item.motivoFrecuente }}</mat-chip>
            </div>
          </div>

          <mat-icon class="ver-mas">chevron_right</mat-icon>
        </div>
      </div>

      <div class="empty-state" *ngIf="topAlumnos.length === 0">
        <mat-icon>people_outline</mat-icon>
        <p>No hay datos suficientes para generar el ranking</p>
      </div>
    </mat-card>

  </div>

</div>
```

## FILE: src\app\features\dashboard-ejecutivo\dashboard-ejecutivo.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  dashboard-ejecutivo.component.scss                  â•‘
// â•‘  Stenbrary v3.0 â€” Dark Theme Fixes                   â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

.dashboard-ejecutivo-container {
  min-height: 100vh;
  background: transparent;
  padding: $spacing-lg;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HEADER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-xl;

  .back-button {
    background: $navy-700;
    color: $text-primary;
    border: 1px solid $border-subtle;
    box-shadow: none;
    transition: all $transition-fast;

    &:hover {
      background: $navy-600;
      border-color: $border-glow;
    }
  }

  .header-info {
    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: $text-primary;
    }

    .subtitle {
      margin: $spacing-xs 0 0;
      color: $text-secondary;
      font-size: 0.85rem;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.loading-state {
  @include flex-center;
  flex-direction: column;
  min-height: 60vh;
  color: $text-secondary;

  mat-icon {
    font-size: 3rem;
    width: 3rem;
    height: 3rem;
    color: $cyan-500;
    margin-bottom: $spacing-md;
    animation: spin 1.5s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INSIGHTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;
}

.insight-card {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
  padding: $spacing-lg;
  border-left: 3px solid;
  transition: all $transition-fast;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .insight-icon {
    @include flex-center;
    width: 44px;
    height: 44px;
    border-radius: $border-radius-md;
    flex-shrink: 0;

    mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: white;
    }
  }

  .insight-content {
    flex: 1;

    h3 {
      margin: 0 0 $spacing-xs 0;
      font-size: 1rem;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: $text-secondary;
      line-height: 1.5;
      font-size: 0.9rem;
    }
  }

  &.insight-success {
    border-left-color: $success-color;
    .insight-icon { background: rgba($success-color, 0.2); }
    .insight-icon mat-icon { color: $success-color; }
  }

  &.insight-warning {
    border-left-color: $amber-color;
    .insight-icon { background: rgba($amber-color, 0.2); }
    .insight-icon mat-icon { color: $amber-color; }
  }

  &.insight-info {
    border-left-color: $cyan-500;
    .insight-icon { background: rgba($cyan-500, 0.2); }
    .insight-icon mat-icon { color: $cyan-400; }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TENDENCIA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.tendencia-card {
  margin-bottom: $spacing-xl;
  padding: $spacing-xl;

  h2 {
    margin: 0 0 $spacing-xl 0;
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    mat-icon { color: $cyan-500; }
  }

  .tendencia-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: $spacing-xl;
    align-items: center;
    margin-bottom: $spacing-lg;
  }

  .tendencia-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;

    .tendencia-label {
      font-size: 0.85rem;
      color: $text-secondary;
      font-weight: 500;
    }

    .tendencia-valor {
      font-size: 2rem;
      font-weight: 800;
      color: $cyan-400;
      font-family: $font-display;

      &.grande { font-size: 2.5rem; }
    }

    .tendencia-sublabel {
      font-size: 0.8rem;
      color: $text-muted;
      font-family: $font-mono;
    }
  }

  .tendencia-icono {
    @include flex-center;

    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    &.success mat-icon { color: $success-color; }
    &.warning mat-icon { color: $amber-color; }
    &.neutral mat-icon { color: $text-muted; }
  }

  .tendencia-texto {
    text-align: center;
    padding: $spacing-md;
    border-radius: $border-radius-md;
    font-size: 1rem;
    font-weight: 600;

    &.success {
      color: $success-color;
      background: rgba($success-color, 0.1);
      border: 1px solid rgba($success-color, 0.2);
    }

    &.warning {
      color: $amber-color;
      background: rgba($amber-color, 0.1);
      border: 1px solid rgba($amber-color, 0.2);
    }

    &.neutral {
      color: $text-secondary;
      background: $navy-700;
      border: 1px solid $border-subtle;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HEATMAP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.heatmap-card {
  margin-bottom: $spacing-xl;
  padding: $spacing-xl;

  .heatmap-header {
    @include flex-between;
    margin-bottom: $spacing-lg;
    flex-wrap: wrap;
    gap: $spacing-md;

    h2 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      mat-icon { color: $cyan-500; }
    }
  }

  .heatmap-leyenda {
    display: flex;
    gap: $spacing-md;
    flex-wrap: wrap;

    .leyenda-item {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      font-size: 0.8rem;
      color: $text-secondary;
    }

    .leyenda-cuadro {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1px solid $border-subtle;
    }
  }

  .heatmap-container {
    overflow-x: auto;
    margin-bottom: $spacing-lg;
  }

  .heatmap-grid {
    display: grid;
    grid-template-columns: 100px repeat(15, 50px);
    gap: 3px;
    min-width: 900px;
  }

  .heatmap-corner { background: transparent; }

  .heatmap-hora,
  .heatmap-dia {
    @include flex-center;
    font-size: 0.7rem;
    font-weight: 600;
    color: $text-muted;
    font-family: $font-mono;
  }

  .heatmap-hora { height: 28px; }

  .heatmap-dia {
    height: 36px;
    justify-content: flex-end;
    padding-right: $spacing-sm;
    color: $text-secondary;
  }

  .heatmap-cell {
    @include flex-center;
    height: 36px;
    border-radius: 4px;
    cursor: pointer;
    transition: all $transition-fast;
    position: relative;

    &:hover {
      transform: scale(1.15);
      z-index: 10;
    }

    .cell-value {
      font-size: 0.7rem;
      font-weight: 700;
      font-family: $font-mono;
    }

    // Dark theme heatmap intensities
    &.intensidad-0 {
      background: $navy-700;
      border: 1px solid $border-subtle;

      .cell-value { color: $text-muted; }
    }

    &.intensidad-1 {
      background: rgba($cyan-500, 0.15);
      border: 1px solid rgba($cyan-500, 0.2);

      .cell-value { color: $cyan-400; }
    }

    &.intensidad-2 {
      background: rgba($cyan-500, 0.30);
      border: 1px solid rgba($cyan-500, 0.35);

      .cell-value { color: white; }
    }

    &.intensidad-3 {
      background: rgba($cyan-500, 0.50);
      box-shadow: 0 0 8px rgba($cyan-500, 0.2);

      .cell-value { color: white; }
    }

    &.intensidad-4 {
      background: rgba($cyan-500, 0.75);
      box-shadow: 0 0 12px rgba($cyan-500, 0.3);

      .cell-value { color: white; font-weight: 800; }
    }
  }

  .heatmap-prediccion {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-md;
    background: rgba($cyan-500, 0.08);
    border: 1px solid $border-glow;
    border-radius: $border-radius-md;
    color: $cyan-400;
    font-size: 0.9rem;

    mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: $cyan-500;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TOP ALUMNOS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.top-alumnos-card {
  padding: $spacing-xl;

  h2 {
    margin: 0 0 $spacing-xl 0;
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    mat-icon { color: $amber-color; }
  }

  .top-alumnos-lista {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }

  .top-alumno-item {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-lg;
    background: $navy-700;
    border: 1px solid $border-subtle;
    border-radius: $border-radius-md;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: rgba(0, 200, 215, 0.05);
      border-color: $border-glow;
      transform: translateX(6px);
    }

    .alumno-ranking {
      .ranking-numero {
        @include flex-center;
        width: 36px;
        height: 36px;
        border-radius: $border-radius-sm;
        background: $navy-600;
        color: $text-secondary;
        font-weight: 700;
        font-size: 1.1rem;
        font-family: $font-mono;

        &.top-1 {
          background: linear-gradient(135deg, #ffd700, #ffb800);
          color: #1a1a2e;
          box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
        }

        &.top-2 {
          background: linear-gradient(135deg, #8e9aaf, #b8c4d4);
          color: #1a1a2e;
        }

        &.top-3 {
          background: linear-gradient(135deg, #cd7f32, #daa06d);
          color: white;
        }
      }
    }

    .alumno-avatar {
      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: $cyan-500;
      }
    }

    .alumno-info {
      flex: 1;

      h3 {
        margin: 0;
        font-size: 1rem;
        color: $text-primary;
      }

      .alumno-carrera {
        margin: 2px 0 0;
        font-size: 0.85rem;
        color: $text-secondary;
      }
    }

    .alumno-stats {
      display: flex;
      gap: $spacing-lg;
      align-items: center;

      .stat-item {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        font-size: 0.85rem;
        color: $text-secondary;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: $text-muted;
        }
      }

      .motivo-chip {
        background: rgba($cyan-500, 0.12) !important;
        color: $cyan-400 !important;
        border: 1px solid $border-glow !important;
        font-size: 0.8rem;
      }
    }

    .ver-mas {
      color: $text-muted;
      opacity: 0;
      transition: opacity $transition-fast, transform $transition-fast;
    }

    &:hover .ver-mas {
      opacity: 1;
      transform: translateX(4px);
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EMPTY STATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.empty-state {
  @include flex-center;
  flex-direction: column;
  padding: $spacing-xxl;
  color: $text-muted;

  mat-icon {
    font-size: 3.5rem;
    width: 3.5rem;
    height: 3.5rem;
    opacity: 0.3;
    color: $cyan-500;
    margin-bottom: $spacing-md;
  }

  p {
    font-size: 1rem;
    color: $text-secondary;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RESPONSIVE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@media (max-width: $breakpoint-lg) {
  .heatmap-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tendencia-grid {
    grid-template-columns: 1fr;
    gap: $spacing-lg;

    .tendencia-icono { order: -1; }
  }
}

@media (max-width: $breakpoint-md) {
  .dashboard-ejecutivo-container { padding: $spacing-md; }
  .insights-grid { grid-template-columns: 1fr; }

  .top-alumno-item {
    flex-wrap: wrap;

    .alumno-stats {
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
    }
  }
}

@media (max-width: $breakpoint-sm) {
  .heatmap-leyenda {
    flex-direction: column;
    align-items: flex-start;
  }
}











// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  REEMPLAZAR TODO el contenido de:                    â•‘
// â•‘  src/app/features/dashboard-ejecutivo/               â•‘
// â•‘       dashboard-ejecutivo.component.scss             â•‘
// â•‘                                                      â•‘
// â•‘  FIX: dona visible sin zoom, grid mejorado           â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ GrÃ¡ficas Chart.js â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  background: #101c2c !important;
  border: 1px solid rgba(0, 200, 215, 0.08);
  border-radius: 16px;
  padding: 24px;
  overflow: hidden;
}

.chart-header {
  margin-bottom: 16px;

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #E8F4F8;

    mat-icon {
      color: #00C8D7;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
  }
}

.chart-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}

.chart-doughnut {
  height: 280px;
}

.chart-carreras {
  min-height: 200px;
}

@media (max-width: 1100px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .chart-wrapper {
    height: 240px;
  }

  .chart-doughnut {
    height: 220px;
  }

  .chart-card {
    padding: 16px;
  }
}
```

## FILE: src\app\features\dashboard-ejecutivo\dashboard-ejecutivo.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/dashboard-ejecutivo/         â•‘
// â•‘        dashboard-ejecutivo.component.ts              â•‘
// â•‘  Stenbrary v3.5 â€” Con grÃ¡ficas Chart.js              â•‘
// â•‘                                                      â•‘
// â•‘  NUEVO v3.5:                                         â•‘
// â•‘  - GrÃ¡fica de barras: registros por dÃ­a (7 dÃ­as)    â•‘
// â•‘  - GrÃ¡fica de dona: distribuciÃ³n por motivos        â•‘
// â•‘  - GrÃ¡fica de barras horiz: visitas por carrera     â•‘
// â•‘  Chart.js se inicializa en AfterViewInit             â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import {
  EstadisticasAvanzadasService,
  TendenciaComparativa,
  HeatmapData,
  TopAlumno,
  Insight,
  DatosDiarios,
  DistribucionMotivos,
  DatosCarrera,
} from '../../core/services/estadisticas-avanzadas.service';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-ejecutivo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './dashboard-ejecutivo.component.html',
  styleUrl: './dashboard-ejecutivo.component.scss',
})
export class DashboardEjecutivoComponent implements OnInit, AfterViewInit, OnDestroy {
  cargando = true;

  // Canvas refs
  @ViewChild('chartDiario') chartDiarioRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartMotivos') chartMotivosRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCarreras') chartCarrerasRef!: ElementRef<HTMLCanvasElement>;

  // Chart instances (para destruir)
  private chartDiario: Chart | null = null;
  private chartMotivos: Chart | null = null;
  private chartCarreras: Chart | null = null;

  // Datos existentes
  tendenciaSemanal?: TendenciaComparativa;
  heatmapData: HeatmapData[] = [];
  topAlumnos: TopAlumno[] = [];
  insights: Insight[] = [];
  diaPredicho = '';

  // Datos nuevos para grÃ¡ficas
  datosDiarios?: DatosDiarios;
  distribucionMotivos?: DistribucionMotivos;
  datosCarreras: DatosCarrera[] = [];

  // Heatmap config
  diasSemana = ['Lunes', 'Martes', 'MiÃ©rcoles', 'Jueves', 'Viernes', 'SÃ¡bado', 'Domingo'];
  horasDelDia = Array.from({ length: 15 }, (_, i) => i + 7);

  // Flag para saber si los datos cargaron antes que la vista
  private datosListos = false;

  constructor(
    private estadisticasService: EstadisticasAvanzadasService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  ngAfterViewInit(): void {
    // Si los datos ya cargaron, renderizar grÃ¡ficas
    if (this.datosListos) {
      setTimeout(() => this.renderizarGraficas(), 0);
    }
  }

  ngOnDestroy(): void {
    this.chartDiario?.destroy();
    this.chartMotivos?.destroy();
    this.chartCarreras?.destroy();
  }

  async cargarDatos(): Promise<void> {
    try {
      this.cargando = true;

      const [tendencia, heatmap, top, insights, prediccion, diarios, motivos, carreras] =
        await Promise.all([
          this.estadisticasService.compararTendencias(7, 7),
          this.estadisticasService.generarHeatmap(30),
          this.estadisticasService.obtenerTopAlumnos(5),
          this.estadisticasService.generarInsights(),
          this.estadisticasService.predecirDiaOcupado(),
          this.estadisticasService.obtenerRegistrosPorDia(7),
          this.estadisticasService.obtenerDistribucionMotivos(30),
          this.estadisticasService.analizarPorCarrera(),
        ]);

      this.tendenciaSemanal = tendencia;
      this.heatmapData = heatmap;
      this.topAlumnos = top;
      this.insights = insights;
      this.diaPredicho = prediccion;
      this.datosDiarios = diarios;
      this.distribucionMotivos = motivos;
      this.datosCarreras = carreras;

      this.cargando = false;
      this.datosListos = true;

      // Renderizar grÃ¡ficas (puede que AfterViewInit ya haya corrido)
      setTimeout(() => this.renderizarGraficas(), 50);

      console.log('âœ… EstadÃ­sticas avanzadas + grÃ¡ficas cargadas');
    } catch (error) {
      console.error('âŒ Error al cargar estadÃ­sticas avanzadas:', error);
      this.cargando = false;
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // GRÃFICAS CHART.JS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private renderizarGraficas(): void {
    this.renderizarGraficaDiaria();
    this.renderizarGraficaMotivos();
    this.renderizarGraficaCarreras();
  }

  private renderizarGraficaDiaria(): void {
    if (!this.chartDiarioRef || !this.datosDiarios) return;

    this.chartDiario?.destroy();

    const ctx = this.chartDiarioRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartDiario = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosDiarios.etiquetas,
        datasets: [
          {
            label: 'Registros',
            data: this.datosDiarios.cantidades,
            backgroundColor: 'rgba(0, 200, 215, 0.6)',
            borderColor: '#00C8D7',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#142033',
            titleColor: '#E8F4F8',
            bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => items[0]?.label || '',
              label: (item) => `${item.raw} registros`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: {
              color: 'rgba(200, 230, 240, 0.5)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: {
              color: 'rgba(200, 230, 240, 0.4)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  private renderizarGraficaMotivos(): void {
    if (!this.chartMotivosRef || !this.distribucionMotivos) return;
    if (this.distribucionMotivos.cantidades.length === 0) return;

    this.chartMotivos?.destroy();

    const ctx = this.chartMotivosRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartMotivos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.distribucionMotivos.etiquetas,
        datasets: [
          {
            data: this.distribucionMotivos.cantidades,
            backgroundColor: this.distribucionMotivos.colores.map(c => c + 'CC'),
            borderColor: this.distribucionMotivos.colores,
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'rgba(200, 230, 240, 0.7)',
              font: { family: "'DM Sans', sans-serif", size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: '#142033',
            titleColor: '#E8F4F8',
            bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: (item) => {
                const total = (item.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const porcentaje = ((item.raw as number) / total * 100).toFixed(1);
                return ` ${item.label}: ${item.raw} (${porcentaje}%)`;
              },
            },
          },
        },
      },
    });
  }

  private renderizarGraficaCarreras(): void {
    if (!this.chartCarrerasRef || this.datosCarreras.length === 0) return;

    this.chartCarreras?.destroy();

    const ctx = this.chartCarrerasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Abreviar nombres largos
    const etiquetas = this.datosCarreras.map(d => this.abreviarCarrera(d.carrera));
    const cantidades = this.datosCarreras.map(d => d.totalVisitas);

    const colores = [
      '#00C8D7', '#0BC4B7', '#0EB07B', '#3B82F6',
      '#6366F1', '#8B5CF6', '#EC4899', '#F5A623',
    ];

    this.chartCarreras = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Visitas totales',
            data: cantidades,
            backgroundColor: cantidades.map((_, i) => (colores[i % colores.length]) + '99'),
            borderColor: cantidades.map((_, i) => colores[i % colores.length]),
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y', // Barras horizontales
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#142033',
            titleColor: '#E8F4F8',
            bodyColor: '#E8F4F8',
            borderColor: 'rgba(0, 200, 215, 0.3)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => {
                const index = items[0]?.dataIndex ?? 0;
                return this.datosCarreras[index]?.carrera || '';
              },
              label: (item) => {
                const index = item.dataIndex;
                const datos = this.datosCarreras[index];
                return [
                  `${item.raw} visitas totales`,
                  `${datos?.alumnosActivos || 0} alumnos`,
                  `${datos?.promedioVisitasPorAlumno || 0} promedio/alumno`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(200, 230, 240, 0.06)' },
            ticks: {
              color: 'rgba(200, 230, 240, 0.4)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
              stepSize: 1,
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: 'rgba(200, 230, 240, 0.6)',
              font: { family: "'DM Sans', sans-serif", size: 11 },
            },
          },
        },
      },
    });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // HELPERS EXISTENTES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  obtenerCantidadHeatmap(dia: string, hora: number): number {
    const item = this.heatmapData.find(h => h.dia === dia && h.hora === hora);
    return item ? item.cantidad : 0;
  }

  obtenerClaseIntensidad(cantidad: number): string {
    if (cantidad === 0) return 'intensidad-0';
    if (cantidad <= 2) return 'intensidad-1';
    if (cantidad <= 5) return 'intensidad-2';
    if (cantidad <= 10) return 'intensidad-3';
    return 'intensidad-4';
  }

  obtenerMaximoHeatmap(): number {
    if (this.heatmapData.length === 0) return 0;
    return Math.max(...this.heatmapData.map(h => h.cantidad));
  }

  obtenerIconoTendencia(): string {
    if (!this.tendenciaSemanal) return 'trending_flat';
    switch (this.tendenciaSemanal.direccion) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  obtenerColorTendencia(): string {
    if (!this.tendenciaSemanal) return 'neutral';
    switch (this.tendenciaSemanal.direccion) {
      case 'up': return 'success';
      case 'down': return 'warning';
      default: return 'neutral';
    }
  }

  obtenerTextoTendencia(): string {
    if (!this.tendenciaSemanal) return 'Sin cambios';
    const p = Math.abs(this.tendenciaSemanal.porcentajeCambio).toFixed(1);
    if (this.tendenciaSemanal.direccion === 'up') return `â†‘ ${p}% mÃ¡s que la semana anterior`;
    if (this.tendenciaSemanal.direccion === 'down') return `â†“ ${p}% menos que la semana anterior`;
    return 'Sin cambios significativos';
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  obtenerNombreCompleto(alumno: TopAlumno): string {
    return `${alumno.alumno.nombre} ${alumno.alumno.apellidoPaterno} ${alumno.alumno.apellidoMaterno}`;
  }

  verDetalleAlumno(alumno: TopAlumno): void {
    this.router.navigate(['/detalle-alumno', alumno.alumno.matricula]);
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /** Altura dinÃ¡mica: mÃ¡s carreras = mÃ¡s alto */
  get alturaGraficaCarreras(): number {
    return Math.max(200, this.datosCarreras.length * 48);
  }

  /**
   * Abreviar nombres de carrera largos para las etiquetas del eje Y.
   * Ej: "IngenierÃ­a en TecnologÃ­as de la InformaciÃ³n" â†’ "Ing. TI"
   */
  private abreviarCarrera(carrera: string): string {
    if (carrera.length <= 20) return carrera;

    const abreviaturas: Record<string, string> = {
      'Contador PÃºblico': 'C. PÃºblico',
      'Licenciatura en AdministraciÃ³n': 'Lic. Admin.',
      'IngenierÃ­a en Autotransporte de Carga': 'Ing. Autotrans.',
      'Licenciatura en Comercio Exterior': 'Lic. Com. Ext.',
      'Licenciatura en Derecho': 'Lic. Derecho',
      'Licenciatura en EnfermerÃ­a': 'Lic. EnfermerÃ­a',
      'Licenciatura en PsicologÃ­a': 'Lic. PsicologÃ­a',
      'IngenierÃ­a en TecnologÃ­as de la InformaciÃ³n': 'Ing. TI',
    };

    return abreviaturas[carrera] || carrera.substring(0, 18) + 'â€¦';
  }
}
```

## FILE: src\app\features\detalle-alumno\detalle-alumno.component.html
```html
<div class="detalle-alumno-container">
  
  <!-- Loading -->
  <div class="loading-state" *ngIf="cargando">
    <mat-icon>hourglass_empty</mat-icon>
    <p>Cargando informaciÃ³n del alumno...</p>
  </div>

  <!-- Error -->
  <div class="error-state" *ngIf="error && !cargando">
    <mat-icon>error_outline</mat-icon>
    <h2>{{ error }}</h2>
    <button mat-raised-button color="primary" (click)="volver()">
      <mat-icon>arrow_back</mat-icon>
      Volver al Dashboard
    </button>
  </div>

  <!-- Contenido Principal -->
  <div *ngIf="alumno && !cargando" class="content">
    
    <!-- Header -->
    <div class="header">
      <button mat-icon-button class="back-button" (click)="volver()">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <div class="header-info">
        <h1>Perfil del Alumno</h1>
        <p class="subtitle">InformaciÃ³n detallada y historial de accesos</p>
      </div>
    </div>

    <!-- InformaciÃ³n del Alumno -->
    <mat-card class="info-card">
      <div class="info-header">
        <div class="alumno-avatar">
          <mat-icon>account_circle</mat-icon>
        </div>
        <div class="alumno-info">
          <h2>{{ obtenerNombreCompleto() }}</h2>
          <p class="matricula">MatrÃ­cula: <strong>{{ alumno.matricula }}</strong></p>
          <mat-chip [class]="alumno.activo ? 'chip-activo' : 'chip-inactivo'">
            {{ alumno.activo ? 'Activo' : 'Inactivo' }}
          </mat-chip>
        </div>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="abrirDialogEditar()"
                  matTooltip="Editar informaciÃ³n del alumno">
            <mat-icon>edit</mat-icon>
            Editar
          </button>
          <button mat-raised-button 
                  [color]="alumno.activo ? 'warn' : 'accent'"
                  (click)="alumno.activo ? desactivarAlumno() : reactivarAlumno()"
                  [matTooltip]="alumno.activo ? 'Desactivar alumno' : 'Reactivar alumno'">
            <mat-icon>{{ alumno.activo ? 'block' : 'check_circle' }}</mat-icon>
            {{ alumno.activo ? 'Desactivar' : 'Reactivar' }}
          </button>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <mat-icon>school</mat-icon>
          <div>
            <span class="label">Carrera</span>
            <span class="value">{{ alumno.carrera }}</span>
          </div>
        </div>

        <div class="info-item">
          <mat-icon>stairs</mat-icon>
          <div>
            <span class="label">Semestre</span>
            <span class="value">{{ alumno.grado }}Â°</span>
          </div>
        </div>

        <div class="info-item">
          <mat-icon>groups</mat-icon>
          <div>
            <span class="label">Grupo</span>
            <span class="value">{{ alumno.grupo }}</span>
          </div>
        </div>

        <div class="info-item">
          <mat-icon>schedule</mat-icon>
          <div>
            <span class="label">Turno</span>
            <span class="value">{{ alumno.turno }}</span>
          </div>
        </div>

        <div class="info-item" *ngIf="alumno.fechaRegistro">
          <mat-icon>event</mat-icon>
          <div>
            <span class="label">Fecha de Registro</span>
            <span class="value">{{ formatearFechaCorta(alumno.fechaRegistro) }}</span>
          </div>
        </div>
      </div>
    </mat-card>

    <!-- EstadÃ­sticas -->
    <div class="stats-grid" *ngIf="estadisticas">
      <mat-card class="stat-card">
        <div class="stat-icon visitas">
          <mat-icon>login</mat-icon>
        </div>
        <div class="stat-content">
          <h3>{{ estadisticas.totalVisitas }}</h3>
          <p>Visitas Totales</p>
        </div>
      </mat-card>

      <mat-card class="stat-card">
        <div class="stat-icon ultima">
          <mat-icon>schedule</mat-icon>
        </div>
        <div class="stat-content">
          <h3 *ngIf="estadisticas.ultimaVisita">
            {{ formatearFechaCorta(estadisticas.ultimaVisita) }}
          </h3>
          <h3 *ngIf="!estadisticas.ultimaVisita">N/A</h3>
          <p>Ãšltima Visita</p>
        </div>
      </mat-card>

      <mat-card class="stat-card">
        <div class="stat-icon motivo">
          <mat-icon>star</mat-icon>
        </div>
        <div class="stat-content">
          <h3>{{ estadisticas.motivoFrecuente }}</h3>
          <p>Motivo MÃ¡s Frecuente</p>
        </div>
      </mat-card>

      <mat-card class="stat-card">
        <div class="stat-icon promedio">
          <mat-icon>trending_up</mat-icon>
        </div>
        <div class="stat-content">
          <h3>{{ estadisticas.promedioSemanal }}</h3>
          <p>Promedio Semanal</p>
        </div>
      </mat-card>
    </div>

    <!-- DistribuciÃ³n por Motivos -->
    <mat-card class="motivos-card" *ngIf="estadisticas && estadisticas.visitasPorMotivo.length > 0">
      <h3>
        <mat-icon>pie_chart</mat-icon>
        DistribuciÃ³n por Motivos
      </h3>
      <div class="motivos-lista">
        <div class="motivo-item" *ngFor="let item of estadisticas.visitasPorMotivo">
          <span class="motivo-nombre">{{ item.motivo }}</span>
          <div class="motivo-bar">
            <div class="motivo-fill" 
                 [style.width.%]="(item.cantidad / estadisticas!.totalVisitas) * 100">
            </div>
          </div>
          <span class="motivo-cantidad">{{ item.cantidad }}</span>
        </div>
      </div>
    </mat-card>

    <!-- Historial de Registros -->
    <mat-card class="historial-card">
      <div class="historial-header">
        <h3>
          <mat-icon>history</mat-icon>
          Historial de Accesos
        </h3>
        <mat-chip class="chip-count">{{ registros.length }} registros</mat-chip>
      </div>

      <div class="table-container" *ngIf="registros.length > 0">
        <table mat-table [dataSource]="registros" class="historial-table">
          
          <ng-container matColumnDef="fechaHora">
            <th mat-header-cell *matHeaderCellDef>Fecha y Hora</th>
            <td mat-cell *matCellDef="let registro">
              <div class="fecha-cell">
                <mat-icon>event</mat-icon>
                <span>{{ formatearFecha(registro.fechaHora) }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="motivo">
            <th mat-header-cell *matHeaderCellDef>Motivo</th>
            <td mat-cell *matCellDef="let registro">
              <mat-chip class="chip-motivo">
                {{ registro.motivoNombre }}
              </mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let registro">
              <button mat-icon-button color="primary" 
                      (click)="verRegistroDetalle(registro)"
                      matTooltip="Ver detalles">
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columnasRegistros"></tr>
          <tr mat-row *matRowDef="let row; columns: columnasRegistros;"></tr>
        </table>
      </div>

      <div class="empty-state" *ngIf="registros.length === 0">
        <mat-icon>event_note</mat-icon>
        <p>Este alumno no tiene registros de acceso aÃºn</p>
      </div>
    </mat-card>

  </div>

</div>
```

## FILE: src\app\features\detalle-alumno\detalle-alumno.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  detalle-alumno.component.scss                       â•‘
// â•‘  Stenbrary v3.0 â€” Cyan Cube Dark Theme               â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

.detalle-alumno-container {
  min-height: 100vh;
  background: transparent;
  padding: $spacing-lg;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOADING & ERROR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.loading-state,
.error-state {
  @include flex-center;
  flex-direction: column;
  min-height: 60vh;
  color: $text-secondary;

  mat-icon {
    font-size: 3rem;
    width: 3rem;
    height: 3rem;
    color: $cyan-500;
    margin-bottom: $spacing-md;
  }

  p, h2 { margin: $spacing-md 0; }
}

.loading-state mat-icon {
  animation: spin 1.5s linear infinite;
}

.error-state mat-icon {
  color: $warn-color;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HEADER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-xl;

  .back-button {
    background: $navy-700;
    color: $text-primary;
    border: 1px solid $border-subtle;
    box-shadow: none;
    transition: all $transition-fast;

    &:hover {
      background: $navy-600;
      border-color: $border-glow;
    }
  }

  .header-info {
    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: $text-primary;
    }

    .subtitle {
      margin: $spacing-xs 0 0;
      color: $text-secondary;
      font-size: 0.85rem;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INFO CARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.info-card {
  margin-bottom: $spacing-xl;
  padding: $spacing-xl;

  .info-header {
    display: flex;
    align-items: flex-start;
    gap: $spacing-lg;
    margin-bottom: $spacing-xl;
    flex-wrap: wrap;

    .alumno-avatar {
      @include flex-center;

      mat-icon {
        font-size: 72px;
        width: 72px;
        height: 72px;
        color: $cyan-500;
      }
    }

    .alumno-info {
      flex: 1;
      min-width: 250px;

      h2 {
        margin: 0 0 $spacing-xs 0;
        font-size: 1.6rem;
        color: $text-primary;
      }

      .matricula {
        margin: $spacing-xs 0;
        color: $text-secondary;
        font-size: 1rem;

        strong {
          color: $cyan-400;
          font-weight: 600;
          font-family: $font-mono;
        }
      }

      .chip-activo {
        background: rgba($success-color, 0.15) !important;
        color: $success-color !important;
        border: 1px solid rgba($success-color, 0.3) !important;
        font-weight: 600;
      }

      .chip-inactivo {
        background: rgba($warn-color, 0.15) !important;
        color: $warn-color !important;
        border: 1px solid rgba($warn-color, 0.3) !important;
        font-weight: 600;
      }
    }

    .actions {
      display: flex;
      gap: $spacing-sm;
      flex-wrap: wrap;

      button mat-icon {
        margin-right: $spacing-xs;
      }
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: $spacing-md;

    .info-item {
      display: flex;
      align-items: center;
      gap: $spacing-md;
      padding: $spacing-md;
      background: $navy-700;
      border: 1px solid $border-subtle;
      border-radius: $border-radius-md;
      transition: all $transition-fast;

      &:hover {
        border-color: $border-glow;
        background: rgba(0, 200, 215, 0.04);
      }

      mat-icon {
        color: $cyan-500;
        font-size: 28px;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
      }

      div {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .label {
          font-size: 0.8rem;
          color: $text-muted;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          font-family: $font-mono;
        }

        .value {
          font-size: 1rem;
          font-weight: 600;
          color: $text-primary;
        }
      }
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ESTADÃSTICAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  padding: $spacing-lg;
  transition: all $transition-fast;

  &:hover {
    transform: translateY(-3px);
    border-color: $border-glow !important;
  }

  .stat-icon {
    @include flex-center;
    width: 52px;
    height: 52px;
    border-radius: $border-radius-md;
    flex-shrink: 0;

    mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
      color: white;
    }

    &.visitas {
      background: linear-gradient(135deg, $cyan-500, $cyan-600);
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }

    &.ultima {
      background: linear-gradient(135deg, $teal-400, $teal-600);
      box-shadow: 0 4px 16px rgba(0, 169, 158, 0.25);
    }

    &.motivo {
      background: linear-gradient(135deg, $amber-color, darken($amber-color, 10%));
      box-shadow: 0 4px 16px rgba(245, 166, 35, 0.25);
    }

    &.promedio {
      background: linear-gradient(135deg, $cyan-400, $teal-400);
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.2);
    }
  }

  .stat-content {
    h3 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 800;
      color: $text-primary;
      font-family: $font-display;
    }

    p {
      margin: 2px 0 0;
      color: $text-secondary;
      font-size: 0.8rem;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MOTIVOS DISTRIBUCIÃ“N
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.motivos-card {
  margin-bottom: $spacing-xl;
  padding: $spacing-lg;

  h3 {
    margin: 0 0 $spacing-lg 0;
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    color: $text-primary;

    mat-icon { color: $cyan-500; }
  }

  .motivos-lista {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }

  .motivo-item {
    display: grid;
    grid-template-columns: 180px 1fr 60px;
    align-items: center;
    gap: $spacing-md;

    .motivo-nombre {
      font-size: 0.9rem;
      color: $text-primary;
    }

    .motivo-bar {
      height: 20px;
      background: $navy-700;
      border: 1px solid $border-subtle;
      border-radius: $border-radius-sm;
      overflow: hidden;

      .motivo-fill {
        height: 100%;
        background: linear-gradient(90deg, $cyan-500, $teal-400);
        border-radius: $border-radius-sm;
        transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 0 8px rgba(0, 200, 215, 0.3);
      }
    }

    .motivo-cantidad {
      text-align: right;
      font-weight: 700;
      color: $cyan-400;
      font-family: $font-mono;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HISTORIAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.historial-card {
  padding: $spacing-lg;

  .historial-header {
    @include flex-between;
    margin-bottom: $spacing-lg;
    flex-wrap: wrap;
    gap: $spacing-md;

    h3 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      color: $text-primary;
      font-size: 1.2rem;

      mat-icon { color: $cyan-500; }
    }

    .chip-count {
      background: rgba(0, 200, 215, 0.15) !important;
      color: $cyan-400 !important;
      border: 1px solid $border-glow !important;
      font-weight: 600;
      font-family: $font-mono;
      font-size: 12px;
    }
  }

  .table-container {
    overflow-x: auto;
    border-radius: $border-radius-md;
    border: 1px solid $border-subtle;
  }

  .historial-table {
    width: 100%;

    .fecha-cell {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: $text-muted;
      }
    }

    .chip-motivo {
      background: $navy-700 !important;
      color: $text-primary !important;
      border: 1px solid $border-subtle !important;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EMPTY STATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.empty-state {
  @include flex-center;
  flex-direction: column;
  padding: $spacing-xxl;
  color: $text-muted;

  mat-icon {
    font-size: 3.5rem;
    width: 3.5rem;
    height: 3.5rem;
    opacity: 0.3;
    color: $cyan-500;
    margin-bottom: $spacing-md;
  }

  p {
    font-size: 1rem;
    color: $text-secondary;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ANIMATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RESPONSIVE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@media (max-width: $breakpoint-md) {
  .info-card .info-header {
    flex-direction: column;

    .actions {
      width: 100%;
      button { flex: 1; }
    }
  }

  .stats-grid { grid-template-columns: 1fr 1fr; }

  .motivo-item {
    grid-template-columns: 1fr;

    .motivo-bar { order: 3; }
    .motivo-cantidad { text-align: left; }
  }
}

@media (max-width: $breakpoint-sm) {
  .detalle-alumno-container { padding: $spacing-md; }
  .info-card { padding: $spacing-md; }
  .stats-grid { grid-template-columns: 1fr; }
}
```

## FILE: src\app\features\detalle-alumno\detalle-alumno.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/detalle-alumno/              â•‘
// â•‘        detalle-alumno.component.ts                   â•‘
// â•‘  Stenbrary v3.4 â€” Fix completo                       â•‘
// â•‘                                                      â•‘
// â•‘  FIX v3.4:                                           â•‘
// â•‘  - Lee :matricula de la ruta (antes :id â€” roto)     â•‘
// â•‘  - CÃ³digo limpio sin residuos de merge               â•‘
// â•‘  - LoadingService/ToastService integrados limpiamenteâ•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Registro } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { EditarAlumnoDialogComponent } from './editar-alumno-dialog/editar-alumno-dialog.component';

interface EstadisticasAlumno {
  totalVisitas: number;
  ultimaVisita: Date | null;
  motivoFrecuente: string;
  promedioSemanal: number;
  visitasPorMotivo: { motivo: string; cantidad: number }[];
}

@Component({
  selector: 'app-detalle-alumno',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './detalle-alumno.component.html',
  styleUrl: './detalle-alumno.component.scss',
})
export class DetalleAlumnoComponent implements OnInit, OnDestroy {
  alumno: Alumno | null = null;
  registros: Registro[] = [];
  estadisticas: EstadisticasAlumno | null = null;
  cargando = true;
  error: string | null = null;

  columnasRegistros: string[] = ['fechaHora', 'motivo', 'acciones'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService,
    public dialog: MatDialog,
    private toastService: ToastService,
    private loadingService: LoadingService,
  ) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LIFECYCLE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async ngOnInit(): Promise<void> {
    // FIX v3.4: El parÃ¡metro en la ruta es :matricula
    const matricula = this.route.snapshot.paramMap.get('matricula');

    if (!matricula) {
      this.error = 'No se especificÃ³ una matrÃ­cula';
      this.cargando = false;
      return;
    }

    await this.cargarDatosAlumno(matricula);
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CARGA DE DATOS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async cargarDatosAlumno(matricula: string): Promise<void> {
    try {
      this.cargando = true;
      this.error = null;
      this.loadingService.show('Cargando datos del alumno...');

      // Buscar alumno por matrÃ­cula
      this.alumno = await this.databaseService.obtenerAlumnoPorMatricula(matricula);

      if (!this.alumno) {
        this.error = 'Alumno no encontrado';
        this.cargando = false;
        this.loadingService.hide();
        return;
      }

      // Cargar registros del alumno
      this.registros = await this.databaseService.obtenerRegistrosPorAlumno(matricula);

      // Calcular estadÃ­sticas
      this.calcularEstadisticas();

      console.log('âœ… Datos del alumno cargados:', this.alumno.matricula);
      this.cargando = false;
      this.loadingService.hide();
    } catch (error) {
      console.error('âŒ Error al cargar datos del alumno:', error);
      this.error = 'Error al cargar la informaciÃ³n del alumno';
      this.cargando = false;
      this.loadingService.hide();
      this.toastService.error('Error al cargar datos del alumno');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ESTADÃSTICAS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  calcularEstadisticas(): void {
    if (!this.registros.length) {
      this.estadisticas = {
        totalVisitas: 0,
        ultimaVisita: null,
        motivoFrecuente: 'N/A',
        promedioSemanal: 0,
        visitasPorMotivo: [],
      };
      return;
    }

    const totalVisitas = this.registros.length;

    const ultimaVisita = new Date(
      Math.max(...this.registros.map(r => new Date(r.fechaHora).getTime()))
    );

    // Contar visitas por motivo
    const motivosCount = new Map<string, number>();
    this.registros.forEach(registro => {
      if (registro.motivoNombre) {
        const count = motivosCount.get(registro.motivoNombre) || 0;
        motivosCount.set(registro.motivoNombre, count + 1);
      }
    });

    // Motivo mÃ¡s frecuente
    let motivoFrecuente = 'N/A';
    let maxCount = 0;
    motivosCount.forEach((count, motivo) => {
      if (count > maxCount) {
        maxCount = count;
        motivoFrecuente = motivo;
      }
    });

    // Visitas por motivo (array ordenado)
    const visitasPorMotivo = Array.from(motivosCount.entries())
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Promedio semanal
    const primeraVisita = new Date(
      Math.min(...this.registros.map(r => new Date(r.fechaHora).getTime()))
    );
    const diasTranscurridos = Math.max(
      1,
      Math.floor((ultimaVisita.getTime() - primeraVisita.getTime()) / (1000 * 60 * 60 * 24))
    );
    const semanasTranscurridas = Math.max(1, diasTranscurridos / 7);
    const promedioSemanal = parseFloat((totalVisitas / semanasTranscurridas).toFixed(1));

    this.estadisticas = {
      totalVisitas,
      ultimaVisita,
      motivoFrecuente,
      promedioSemanal,
      visitasPorMotivo,
    };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ACCIONES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  abrirDialogEditar(): void {
    if (!this.alumno) return;

    const dialogRef = this.dialog.open(EditarAlumnoDialogComponent, {
      width: '600px',
      data: { alumno: this.alumno },
    });

    dialogRef.afterClosed().subscribe(async (resultado) => {
      if (resultado) {
        await this.cargarDatosAlumno(this.alumno!.matricula);
      }
    });
  }

  async desactivarAlumno(): Promise<void> {
    if (!this.alumno) return;

    const confirmar = confirm(
      `Â¿EstÃ¡s seguro de desactivar al alumno ${this.obtenerNombreCompleto()}?\n\n` +
      'El alumno no podrÃ¡ registrar nuevos accesos, pero su historial se mantendrÃ¡.'
    );

    if (!confirmar) return;

    try {
      this.loadingService.show('Desactivando alumno...');

      await this.databaseService.actualizarAlumno(this.alumno.id!, {
        ...this.alumno,
        activo: false,
      });

      this.loadingService.hide();
      this.toastService.success('Alumno desactivado exitosamente');
      this.router.navigate(['/alumnos']);
    } catch (error) {
      console.error('âŒ Error al desactivar alumno:', error);
      this.loadingService.hide();
      this.toastService.error('Error al desactivar el alumno. Intenta de nuevo.');
    }
  }

  async reactivarAlumno(): Promise<void> {
    if (!this.alumno) return;

    const confirmar = confirm(
      `Â¿Reactivar al alumno ${this.obtenerNombreCompleto()}?`
    );

    if (!confirmar) return;

    try {
      this.loadingService.show('Reactivando alumno...');

      await this.databaseService.actualizarAlumno(this.alumno.id!, {
        ...this.alumno,
        activo: true,
      });

      this.loadingService.hide();
      this.toastService.success('Alumno reactivado exitosamente');

      // Recargar datos
      await this.cargarDatosAlumno(this.alumno.matricula);
    } catch (error) {
      console.error('âŒ Error al reactivar alumno:', error);
      this.loadingService.hide();
      this.toastService.error('Error al reactivar el alumno. Intenta de nuevo.');
    }
  }

  verRegistroDetalle(registro: Registro): void {
    this.toastService.info(
      `Registro: ${this.formatearFecha(registro.fechaHora)} â€” ${registro.motivoNombre}`
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // NAVEGACIÃ“N
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  volver(): void {
    this.router.navigate(['/alumnos']);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // HELPERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  obtenerNombreCompleto(): string {
    if (!this.alumno) return '';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatearFechaCorta(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
```

## FILE: src\app\features\detalle-alumno\editar-alumno-dialog\editar-alumno-dialog.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/detalle-alumno/              â•‘
// â•‘        editar-alumno-dialog/                         â•‘
// â•‘        editar-alumno-dialog.component.ts             â•‘
// â•‘  Stenbrary v3.4 â€” CatÃ¡logo unificado + responsive    â•‘
// â•‘                                                      â•‘
// â•‘  FIX v3.4:                                           â•‘
// â•‘  - Carreras importadas desde catalogos.constants.ts  â•‘
// â•‘  - Responsive: min-width removido en mobile          â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../../core/services/database.service';
import { Alumno } from '../../../core/models';
import { CARRERAS, GRADOS, GRUPOS, TURNOS } from '../../../core/constants/catalogos.constants';

@Component({
  selector: 'app-editar-alumno-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>edit</mat-icon>
      Editar Alumno
    </h2>

    <mat-dialog-content>
      <form [formGroup]="editarForm" class="form-container">
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>MatrÃ­cula</mat-label>
          <input matInput [value]="data.alumno.matricula" readonly>
          <mat-icon matPrefix>badge</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre(s)</mat-label>
          <input matInput formControlName="nombre" placeholder="Juan">
          <mat-icon matPrefix>person</mat-icon>
          <mat-error *ngIf="campoInvalido('nombre')">
            {{ obtenerErrorCampo('nombre') }}
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Apellido Paterno</mat-label>
          <input matInput formControlName="apellidoPaterno" placeholder="PÃ©rez">
          <mat-icon matPrefix>person</mat-icon>
          <mat-error *ngIf="campoInvalido('apellidoPaterno')">
            {{ obtenerErrorCampo('apellidoPaterno') }}
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Apellido Materno</mat-label>
          <input matInput formControlName="apellidoMaterno" placeholder="GarcÃ­a">
          <mat-icon matPrefix>person</mat-icon>
          <mat-error *ngIf="campoInvalido('apellidoMaterno')">
            {{ obtenerErrorCampo('apellidoMaterno') }}
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Carrera/Licenciatura</mat-label>
          <mat-select formControlName="carrera">
            <mat-option *ngFor="let carrera of carreras" [value]="carrera">
              {{ carrera }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>school</mat-icon>
          <mat-error *ngIf="campoInvalido('carrera')">
            {{ obtenerErrorCampo('carrera') }}
          </mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Semestre</mat-label>
            <mat-select formControlName="grado">
              <mat-option *ngFor="let grado of grados" [value]="grado">
                {{ grado }}Â°
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>stairs</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Grupo</mat-label>
            <mat-select formControlName="grupo">
              <mat-option *ngFor="let grupo of grupos" [value]="grupo">
                {{ grupo }}
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>groups</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Turno</mat-label>
            <mat-select formControlName="turno">
              <mat-option *ngFor="let turno of turnos" [value]="turno">
                {{ turno }}
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>

        <div class="error-message" *ngIf="error">
          <mat-icon>error</mat-icon>
          <span>{{ error }}</span>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()" [disabled]="guardando">
        Cancelar
      </button>
      <button mat-raised-button color="primary" 
              (click)="guardar()" 
              [disabled]="editarForm.invalid || guardando">
        <mat-icon *ngIf="!guardando">save</mat-icon>
        <mat-icon *ngIf="guardando" class="spinning">hourglass_empty</mat-icon>
        {{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
      min-width: 400px;
    }

    .full-width {
      width: 100%;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(240, 82, 82, 0.1);
      border: 1px solid rgba(240, 82, 82, 0.3);
      border-radius: 12px;
      color: #F05252;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      color: #E8F4F8;

      mat-icon {
        color: #00C8D7;
      }
    }

    .spinning {
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .form-container {
        min-width: auto;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class EditarAlumnoDialogComponent implements OnInit {
  editarForm!: FormGroup;
  guardando = false;
  error: string | null = null;

  // FIX v3.4: CatÃ¡logos centralizados (fuente Ãºnica de verdad)
  carreras = CARRERAS;
  grados = GRADOS;
  grupos = GRUPOS;
  turnos = TURNOS;

  constructor(
    private fb: FormBuilder,
    private databaseService: DatabaseService,
    private dialogRef: MatDialogRef<EditarAlumnoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { alumno: Alumno },
  ) {}

  ngOnInit(): void {
    this.editarForm = this.fb.group({
      nombre: [this.data.alumno.nombre, [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: [this.data.alumno.apellidoPaterno, [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: [this.data.alumno.apellidoMaterno, [Validators.required, Validators.minLength(2)]],
      carrera: [this.data.alumno.carrera, Validators.required],
      grado: [this.data.alumno.grado, Validators.required],
      grupo: [this.data.alumno.grupo, Validators.required],
      turno: [this.data.alumno.turno, Validators.required],
    });
  }

  async guardar(): Promise<void> {
    if (this.editarForm.invalid) {
      this.error = 'Por favor completa todos los campos correctamente';
      this.marcarCamposComoTocados();
      return;
    }

    try {
      this.guardando = true;
      this.error = null;

      const formValue = this.editarForm.value;

      const alumnoActualizado: Alumno = {
        ...this.data.alumno,
        nombre: formValue.nombre.trim(),
        apellidoPaterno: formValue.apellidoPaterno.trim(),
        apellidoMaterno: formValue.apellidoMaterno.trim(),
        carrera: formValue.carrera,
        grado: Number(formValue.grado),
        grupo: formValue.grupo,
        turno: formValue.turno,
      };

      await this.databaseService.actualizarAlumno(this.data.alumno.id!, alumnoActualizado);

      console.log('âœ… Alumno actualizado exitosamente');
      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('âŒ Error al actualizar alumno:', error);
      this.error = 'Error al guardar los cambios. Intenta de nuevo.';
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.editarForm.controls).forEach(field => {
      const control = this.editarForm.get(field);
      control?.markAsTouched();
    });
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.editarForm.get(campo);
    if (control?.hasError('required')) return 'Este campo es obligatorio';
    if (control?.hasError('minlength')) return 'MÃ­nimo 2 caracteres';
    return '';
  }

  campoInvalido(campo: string): boolean {
    const control = this.editarForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }
}
```

## FILE: src\app\features\gestion-motivos\gestion-motivos.component.html
```html
<!-- ==============================================================================
     RUTA: src/app/features/gestion-motivos/gestion-motivos.component.html
     Stenbrary v3.0 â€” Cyan Cube Dark Theme
     ============================================================================== -->

<div class="gestion-motivos-container">
  
  <!-- Header -->
  <div class="header">
    <button mat-icon-button class="back-button" (click)="volverDashboard()">
      <mat-icon>arrow_back</mat-icon>
    </button>
    <div class="header-info">
      <h1>GestiÃ³n de Motivos</h1>
      <p class="subtitle">Administra los motivos de visita a la biblioteca</p>
    </div>
    <button mat-raised-button color="primary" (click)="abrirDialogNuevo()">
      <mat-icon>add</mat-icon>
      Nuevo Motivo
    </button>
  </div>

  <!-- Loading -->
  <div class="loading-state" *ngIf="cargando">
    <mat-icon>hourglass_empty</mat-icon>
    <p>Cargando motivos...</p>
  </div>

  <!-- Lista de Motivos -->
  <div class="motivos-grid" *ngIf="!cargando && motivos.length > 0">
    
    <mat-card *ngFor="let motivo of motivos" class="motivo-card">
      
      <!-- Header del Card -->
      <div class="motivo-header">
        <div class="motivo-icono">
          <mat-icon [style.color]="motivo.color">{{ motivo.icono }}</mat-icon>
        </div>
        <div class="motivo-info">
          <h3>{{ motivo.nombre }}</h3>
          <p class="motivo-prioridad">Prioridad: {{ motivo.orden }}</p>
        </div>
        <mat-chip [class.chip-activo]="motivo.activo" [class.chip-inactivo]="!motivo.activo">
          {{ motivo.activo ? 'Activo' : 'Inactivo' }}
        </mat-chip>
      </div>

      <!-- Acciones -->
      <div class="motivo-acciones">
        
        <div class="orden-buttons">
          <button 
            mat-icon-button 
            matTooltip="Subir prioridad"
            [disabled]="motivo.orden === 1"
            (click)="subirPrioridad(motivo)">
            <mat-icon>arrow_upward</mat-icon>
          </button>
          <button 
            mat-icon-button 
            matTooltip="Bajar prioridad"
            [disabled]="motivo.orden === motivos.length"
            (click)="bajarPrioridad(motivo)">
            <mat-icon>arrow_downward</mat-icon>
          </button>
        </div>

        <button 
          mat-icon-button 
          color="primary"
          matTooltip="Editar motivo"
          (click)="abrirDialogEditar(motivo)">
          <mat-icon>edit</mat-icon>
        </button>

        <button 
          mat-icon-button 
          [color]="motivo.activo ? 'warn' : 'accent'"
          [matTooltip]="motivo.activo ? 'Desactivar' : 'Activar'"
          (click)="cambiarEstado(motivo)">
          <mat-icon>{{ motivo.activo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
        </button>

        <button 
          mat-icon-button 
          color="warn"
          matTooltip="Eliminar motivo"
          (click)="eliminarMotivo(motivo)">
          <mat-icon>delete</mat-icon>
        </button>
      </div>

    </mat-card>

  </div>

  <!-- Empty State -->
  <div class="empty-state" *ngIf="!cargando && motivos.length === 0">
    <mat-icon>label_off</mat-icon>
    <h2>No hay motivos registrados</h2>
    <p>Crea el primer motivo de visita para empezar</p>
    <button mat-raised-button color="primary" (click)="abrirDialogNuevo()">
      <mat-icon>add</mat-icon>
      Crear Primer Motivo
    </button>
  </div>

</div>
```

## FILE: src\app\features\gestion-motivos\gestion-motivos.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  gestion-motivos.component.scss                      â•‘
// â•‘  Stenbrary v3.0 â€” Cyan Cube Dark Theme               â•‘
// â•‘                                                      â•‘
// â•‘  REWRITE: Tema claro â†’ oscuro completo               â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

.gestion-motivos-container {
  min-height: 100vh;
  background: transparent;
  padding: $spacing-lg;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HEADER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-xl;

  .back-button {
    background: $navy-700;
    color: $text-primary;
    border: 1px solid $border-subtle;
    box-shadow: none;
    flex-shrink: 0;
    transition: all $transition-fast;

    &:hover {
      background: $navy-600;
      border-color: $border-glow;
    }
  }

  .header-info {
    flex: 1;

    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: $text-primary;
    }

    .subtitle {
      margin: $spacing-xs 0 0;
      color: $text-secondary;
      font-size: 0.85rem;
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.loading-state {
  @include flex-center;
  flex-direction: column;
  min-height: 50vh;
  color: $text-secondary;

  mat-icon {
    font-size: 3rem;
    width: 3rem;
    height: 3rem;
    color: $cyan-500;
    margin-bottom: $spacing-md;
    animation: spin 1.5s linear infinite;
  }

  p { font-size: 1rem; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GRID DE MOTIVOS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.motivos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $spacing-lg;
}

.motivo-card {
  padding: $spacing-lg;
  border-radius: $border-radius-lg;
  border-left: 3px solid $cyan-500;
  transition: all $transition-fast;

  &:hover {
    transform: translateY(-3px);
    border-color: $border-glow !important;
    border-left-color: $cyan-400 !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 16px rgba(0, 200, 215, 0.06);
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HEADER DEL CARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.motivo-header {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;

  .motivo-icono {
    @include flex-center;
    width: 52px;
    height: 52px;
    background: rgba(0, 200, 215, 0.1);
    border: 1px solid $border-subtle;
    border-radius: $border-radius-md;
    flex-shrink: 0;

    mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
  }

  .motivo-info {
    flex: 1;
    min-width: 0;

    h3 {
      margin: 0 0 2px 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: $text-primary;
    }

    .motivo-prioridad {
      margin: 0;
      font-size: 0.8rem;
      color: $text-muted;
      font-family: $font-mono;
    }
  }

  .chip-activo {
    background: rgba($success-color, 0.15) !important;
    color: $success-color !important;
    border: 1px solid rgba($success-color, 0.3) !important;
    font-weight: 600;
  }

  .chip-inactivo {
    background: rgba($warn-color, 0.15) !important;
    color: $warn-color !important;
    border: 1px solid rgba($warn-color, 0.3) !important;
    font-weight: 600;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ACCIONES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.motivo-acciones {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
  border-top: 1px solid $border-subtle;

  .orden-buttons {
    display: flex;
    gap: 2px;
    margin-right: auto;

    button:disabled {
      opacity: 0.2;
    }
  }

  button {
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      transform: scale(1.1);
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EMPTY STATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.empty-state {
  @include flex-center;
  flex-direction: column;
  min-height: 50vh;
  text-align: center;

  mat-icon {
    font-size: 4rem;
    width: 4rem;
    height: 4rem;
    opacity: 0.3;
    color: $cyan-500;
    margin-bottom: $spacing-lg;
  }

  h2 {
    margin: 0 0 $spacing-sm 0;
    font-size: 1.5rem;
    color: $text-primary;
  }

  p {
    margin: 0 0 $spacing-lg 0;
    color: $text-secondary;
    font-size: 1rem;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RESPONSIVE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@media (max-width: $breakpoint-sm) {
  .gestion-motivos-container { padding: $spacing-md; }

  .header {
    flex-direction: column;
    align-items: stretch;

    .back-button { align-self: flex-start; }
    button { width: 100%; }
  }

  .motivos-grid { grid-template-columns: 1fr; }

  .motivo-acciones {
    flex-wrap: wrap;

    .orden-buttons {
      width: 100%;
      justify-content: center;
      margin-right: 0;
      margin-bottom: $spacing-sm;
    }
  }
}
```

## FILE: src\app\features\gestion-motivos\gestion-motivos.component.ts
```typescript
// ==============================================================================
// RUTA: src/app/features/gestion-motivos/gestion-motivos.component.ts
// ==============================================================================

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { Motivo } from '../../core/models';
import { MotivoFormDialogComponent } from './motivo-form-dialog/motivo-form-dialog.component';

@Component({
  selector: 'app-gestion-motivos',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatTableModule
  ],
  templateUrl: './gestion-motivos.component.html',
  styleUrl: './gestion-motivos.component.scss'
})
export class GestionMotivosComponent implements OnInit {
  motivos: Motivo[] = [];
  cargando = true;

  // Columnas de la tabla
  columnasMotivos: string[] = ['icono', 'nombre', 'prioridad', 'estado', 'acciones'];

  constructor(
    private databaseService: DatabaseService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarMotivos();
  }

  async cargarMotivos(): Promise<void> {
    try {
      this.cargando = true;
      this.motivos = await this.databaseService.obtenerTodosLosMotivos();
      console.log('ðŸ“‹ Motivos cargados:', this.motivos.length);
      this.cargando = false;
    } catch (error) {
      console.error('âŒ Error al cargar motivos:', error);
      this.toastService.error('Error al cargar los motivos');
      this.cargando = false;
    }
  }

  abrirDialogNuevo(): void {
    const dialogRef = this.dialog.open(MotivoFormDialogComponent, {
      width: '500px',
      data: { motivo: null, esNuevo: true }
    });

    dialogRef.afterClosed().subscribe(async (resultado) => {
      if (resultado) {
        await this.cargarMotivos();
      }
    });
  }

  abrirDialogEditar(motivo: Motivo): void {
    const dialogRef = this.dialog.open(MotivoFormDialogComponent, {
      width: '500px',
      data: { motivo: { ...motivo }, esNuevo: false }
    });

    dialogRef.afterClosed().subscribe(async (resultado) => {
      if (resultado) {
        await this.cargarMotivos();
      }
    });
  }

  async cambiarEstado(motivo: Motivo): Promise<void> {
    const accion = motivo.activo ? 'desactivar' : 'activar';
    
    const confirmar = confirm(
      `Â¿EstÃ¡s seguro de ${accion} el motivo "${motivo.nombre}"?`
    );

    if (!confirmar) return;

    try {
      this.loadingService.show(`${accion === 'activar' ? 'Activando' : 'Desactivando'} motivo...`);

      await this.databaseService.actualizarMotivo(motivo.id!, {
        ...motivo,
        activo: !motivo.activo
      });

      this.loadingService.hide();
      this.toastService.success(`Motivo ${accion === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
      
      await this.cargarMotivos();
    } catch (error) {
      console.error('âŒ Error al cambiar estado:', error);
      this.loadingService.hide();
      this.toastService.error('Error al cambiar el estado del motivo');
    }
  }

  async eliminarMotivo(motivo: Motivo): Promise<void> {
    const confirmar = confirm(
      `âš ï¸ Â¿EstÃ¡s seguro de eliminar el motivo "${motivo.nombre}"?\n\n` +
      'Esta acciÃ³n NO se puede deshacer.\n' +
      'Los registros existentes mantendrÃ¡n el nombre del motivo.'
    );

    if (!confirmar) return;

    // Segunda confirmaciÃ³n para acciones destructivas
    const confirmacionFinal = confirm(
      'Â¿REALMENTE quieres eliminarlo? Esta es tu Ãºltima oportunidad.'
    );

    if (!confirmacionFinal) return;

    try {
      this.loadingService.show('Eliminando motivo...');

      await this.databaseService.eliminarMotivo(motivo.id!);

      this.loadingService.hide();
      this.toastService.success('Motivo eliminado exitosamente');
      
      await this.cargarMotivos();
    } catch (error) {
      console.error('âŒ Error al eliminar motivo:', error);
      this.loadingService.hide();
      this.toastService.error('Error al eliminar el motivo');
    }
  }

  async subirPrioridad(motivo: Motivo): Promise<void> {
    if (motivo.orden <= 1) {
      this.toastService.info('El motivo ya estÃ¡ en la primera posiciÃ³n');
      return;
    }

    try {
      // Buscar el motivo anterior
      const motivoAnterior = this.motivos.find(m => m.orden === motivo.orden - 1);
      
      if (!motivoAnterior) return;

      // Intercambiar Ã³rdenes
      await this.databaseService.actualizarMotivo(motivo.id!, {
        ...motivo,
        orden: motivo.orden - 1
      });

      await this.databaseService.actualizarMotivo(motivoAnterior.id!, {
        ...motivoAnterior,
        orden: motivoAnterior.orden + 1
      });

      this.toastService.success('Orden actualizado');
      await this.cargarMotivos();
    } catch (error) {
      console.error('âŒ Error al cambiar orden:', error);
      this.toastService.error('Error al cambiar el orden');
    }
  }

  async bajarPrioridad(motivo: Motivo): Promise<void> {
    if (motivo.orden >= this.motivos.length) {
      this.toastService.info('El motivo ya estÃ¡ en la Ãºltima posiciÃ³n');
      return;
    }

    try {
      // Buscar el motivo siguiente
      const motivoSiguiente = this.motivos.find(m => m.orden === motivo.orden + 1);
      
      if (!motivoSiguiente) return;

      // Intercambiar Ã³rdenes
      await this.databaseService.actualizarMotivo(motivo.id!, {
        ...motivo,
        orden: motivo.orden + 1
      });

      await this.databaseService.actualizarMotivo(motivoSiguiente.id!, {
        ...motivoSiguiente,
        orden: motivoSiguiente.orden - 1
      });

      this.toastService.success('Orden actualizado');
      await this.cargarMotivos();
    } catch (error) {
      console.error('âŒ Error al cambiar orden:', error);
      this.toastService.error('Error al cambiar el orden');
    }
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
```

## FILE: src\app\features\gestion-motivos\motivo-form-dialog\motivo-form-dialog.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  motivo-form-dialog.component.ts                     â•‘
// â•‘  Stenbrary v3.2 â€” Dialog mejorado                    â•‘
// â•‘                                                      â•‘
// â•‘  FIXES v3.2:                                         â•‘
// â•‘  - Title: padding-top para evitar clipping           â•‘
// â•‘  - 12 colores disponibles (antes 7)                  â•‘
// â•‘  - Color swatches visuales en vez de dropdown        â•‘
// â•‘  - Preview con glow del color seleccionado           â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { Motivo } from '../../../core/models';

interface IconoOpcion {
  nombre: string;
  icono: string;
  categoria: string;
}

interface ColorOpcion {
  nombre: string;
  valor: string;
}

@Component({
  selector: 'app-motivo-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="dialog-wrapper">

      <!-- Header con icono decorativo -->
      <div class="dialog-header">
        <div class="header-icon" [class.editing]="!esNuevo">
          <mat-icon>{{ esNuevo ? 'add_circle' : 'edit' }}</mat-icon>
        </div>
        <div class="header-text">
          <h2>{{ esNuevo ? 'Nueva Actividad' : 'Editar Actividad' }}</h2>
          <p>{{ esNuevo ? 'Agrega una actividad disponible para los alumnos' : 'Modifica los datos de esta actividad' }}</p>
        </div>
      </div>

      <mat-dialog-content>
        <form [formGroup]="motivoForm">
          
          <!-- Nombre -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre de la Actividad</mat-label>
            <input 
              matInput 
              formControlName="nombre"
              placeholder="Ej: Estudiar, Expo FEMA, Taller Caterpillar"
              [maxlength]="50">
            <mat-icon matPrefix>label</mat-icon>
            <mat-hint align="end">
              {{ motivoForm.get('nombre')?.value?.length || 0 }}/50
            </mat-hint>
            <mat-error *ngIf="motivoForm.get('nombre')?.hasError('required')">
              El nombre es obligatorio
            </mat-error>
            <mat-error *ngIf="motivoForm.get('nombre')?.hasError('minlength')">
              MÃ­nimo 3 caracteres
            </mat-error>
          </mat-form-field>

          <!-- DescripciÃ³n -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>DescripciÃ³n (opcional)</mat-label>
            <textarea 
              matInput 
              formControlName="descripcion"
              placeholder="Ej: Evento de reclutamiento con dinÃ¡micas y talleres"
              [maxlength]="200"
              rows="3"
              cdkTextareaAutosize
              cdkAutosizeMinRows="2"
              cdkAutosizeMaxRows="4">
            </textarea>
            <mat-icon matPrefix>description</mat-icon>
            <mat-hint>Se mostrarÃ¡ al alumno antes de confirmar su registro</mat-hint>
            <mat-hint align="end">
              {{ motivoForm.get('descripcion')?.value?.length || 0 }}/200
            </mat-hint>
          </mat-form-field>

          <!-- Icono -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Icono</mat-label>
            <mat-select formControlName="icono">
              @for (opcion of iconosDisponibles; track opcion.icono) {
                <mat-option [value]="opcion.icono">
                  <mat-icon [style.color]="motivoForm.get('color')?.value || '#00C8D7'">
                    {{ opcion.icono }}
                  </mat-icon>
                  <span class="icono-nombre">{{ opcion.nombre }}</span>
                </mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>insert_emoticon</mat-icon>
          </mat-form-field>

          <!-- Color â€” Swatches visuales -->
          <div class="color-section">
            <label class="color-label">Color</label>
            <div class="color-swatches">
              @for (color of coloresDisponibles; track color.valor) {
                <button
                  type="button"
                  class="color-swatch"
                  [class.active]="motivoForm.get('color')?.value === color.valor"
                  [style.background]="color.valor"
                  [matTooltip]="color.nombre"
                  (click)="seleccionarColor(color.valor)">
                  @if (motivoForm.get('color')?.value === color.valor) {
                    <mat-icon>check</mat-icon>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Preview -->
          <div class="preview-section">
            <span class="preview-label">Vista previa</span>
            <div class="preview-card"
              [style.border-color]="(motivoForm.get('color')?.value || '#00C8D7') + '40'">
              <div class="preview-icon-wrap"
                [style.background]="(motivoForm.get('color')?.value || '#00C8D7') + '18'"
                [style.border-color]="(motivoForm.get('color')?.value || '#00C8D7') + '35'">
                <mat-icon [style.color]="motivoForm.get('color')?.value || '#00C8D7'">
                  {{ motivoForm.get('icono')?.value || 'label' }}
                </mat-icon>
              </div>
              <div class="preview-text">
                <span class="preview-name">
                  {{ motivoForm.get('nombre')?.value || 'Nombre de la actividad' }}
                </span>
                @if (motivoForm.get('descripcion')?.value) {
                  <span class="preview-desc">
                    {{ motivoForm.get('descripcion')?.value }}
                  </span>
                }
              </div>
            </div>
          </div>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button class="btn-cancel" (click)="cancelar()" [disabled]="guardando">
          Cancelar
        </button>
        <button 
          class="btn-save"
          (click)="guardar()"
          [disabled]="motivoForm.invalid || guardando">
          @if (!guardando) {
            <mat-icon>save</mat-icon>
            <span>Guardar</span>
          } @else {
            <mat-spinner diameter="18"></mat-spinner>
            <span>Guardando...</span>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-wrapper {
      min-width: 460px;
      max-width: 520px;
    }

    /* â”€â”€ Header â”€â”€ */
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0 16px;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: rgba(0, 200, 215, 0.10);
      border: 1px solid rgba(0, 200, 215, 0.25);
      border-radius: 14px;
      flex-shrink: 0;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #00C8D7;
      }

      &.editing {
        background: rgba(245, 166, 35, 0.10);
        border-color: rgba(245, 166, 35, 0.25);

        mat-icon { color: #F5A623; }
      }
    }

    .header-text {
      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #E8F4F8;
        line-height: 1.3;
      }

      p {
        margin: 2px 0 0;
        font-size: 0.78rem;
        color: rgba(200, 230, 240, 0.55);
      }
    }

    mat-dialog-content {
      padding: 8px 0 0;
      max-height: 60vh;
    }

    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }

    .icono-nombre {
      margin-left: 12px;
      vertical-align: middle;
    }

    /* â”€â”€ Color Swatches â”€â”€ */
    .color-section {
      margin-bottom: 16px;
    }

    .color-label {
      display: block;
      font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.55);
      margin-bottom: 8px;
      font-weight: 500;
    }

    .color-swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .color-swatch {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 200ms ease;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #04090F;
        font-weight: bold;
      }

      &:hover {
        transform: scale(1.12);
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
      }

      &.active {
        border-color: #E8F4F8;
        transform: scale(1.12);
        box-shadow: 0 0 16px currentColor;
      }
    }

    /* â”€â”€ Preview â”€â”€ */
    .preview-section {
      margin-top: 16px;
      padding: 14px;
      background: #0D1626;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 14px;
    }

    .preview-label {
      display: block;
      font-size: 0.7rem;
      color: rgba(160, 200, 215, 0.45);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.06em;
      font-family: 'Space Mono', monospace;
      margin-bottom: 10px;
    }

    .preview-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      background: #142033;
      border-radius: 12px;
      border: 1px solid rgba(0, 200, 215, 0.10);
      transition: border-color 300ms;
    }

    .preview-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid;
      flex-shrink: 0;
      transition: all 300ms;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .preview-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .preview-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #E8F4F8;
    }

    .preview-desc {
      font-size: 0.72rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.4;
    }

    /* â”€â”€ Actions â”€â”€ */
    mat-dialog-actions {
      padding: 16px 0 4px;
      margin: 0;
      gap: 8px;
    }

    .btn-cancel {
      color: rgba(200, 230, 240, 0.6) !important;
      font-weight: 500;
    }

    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      border: none;
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 200ms;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(0, 200, 215, 0.35);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      mat-spinner { display: inline-block; }
    }

    @media (max-width: 768px) {
      .dialog-wrapper {
        min-width: auto;
        max-width: 100%;
      }
    }
  `]
})
export class MotivoFormDialogComponent implements OnInit {
  motivoForm!: FormGroup;
  guardando = false;
  esNuevo = true;

  // â”€â”€ Iconos disponibles (ampliado) â”€â”€
  iconosDisponibles: IconoOpcion[] = [
    { nombre: 'Libro', icono: 'menu_book', categoria: 'Lectura' },
    { nombre: 'Estudiar', icono: 'school', categoria: 'AcadÃ©mico' },
    { nombre: 'Investigar', icono: 'science', categoria: 'AcadÃ©mico' },
    { nombre: 'Leer', icono: 'auto_stories', categoria: 'Lectura' },
    { nombre: 'Computadora', icono: 'computer', categoria: 'TecnologÃ­a' },
    { nombre: 'Escribir', icono: 'create', categoria: 'AcadÃ©mico' },
    { nombre: 'Buscar', icono: 'search', categoria: 'General' },
    { nombre: 'Grupos', icono: 'groups', categoria: 'Social' },
    { nombre: 'Tareas', icono: 'assignment', categoria: 'AcadÃ©mico' },
    { nombre: 'Proyecto', icono: 'work', categoria: 'Profesional' },
    { nombre: 'Examen', icono: 'quiz', categoria: 'AcadÃ©mico' },
    { nombre: 'Imprimir', icono: 'print', categoria: 'Servicio' },
    { nombre: 'WiFi', icono: 'wifi', categoria: 'Servicio' },
    { nombre: 'Navegar', icono: 'language', categoria: 'TecnologÃ­a' },
    { nombre: 'Consulta', icono: 'help', categoria: 'General' },
    { nombre: 'Evento', icono: 'event', categoria: 'Evento' },
    { nombre: 'PresentaciÃ³n', icono: 'slideshow', categoria: 'Evento' },
    { nombre: 'ReuniÃ³n', icono: 'meeting_room', categoria: 'Social' },
    { nombre: 'Pedir Libro', icono: 'bookmark', categoria: 'Lectura' },
    { nombre: 'Trabajo', icono: 'engineering', categoria: 'Profesional' },
    { nombre: 'Otro', icono: 'more_horiz', categoria: 'General' }
  ];

  // â”€â”€ 12 colores (ampliado de 7 a 12) â”€â”€
  coloresDisponibles: ColorOpcion[] = [
    { nombre: 'Cyan', valor: '#00C8D7' },
    { nombre: 'Teal', valor: '#0BC4B7' },
    { nombre: 'Verde', valor: '#0EB07B' },
    { nombre: 'Esmeralda', valor: '#34D399' },
    { nombre: 'Azul', valor: '#3B82F6' },
    { nombre: 'Ãndigo', valor: '#6366F1' },
    { nombre: 'Violeta', valor: '#8B5CF6' },
    { nombre: 'Rosa', valor: '#EC4899' },
    { nombre: 'Rojo', valor: '#F05252' },
    { nombre: 'Naranja', valor: '#F97316' },
    { nombre: 'Ãmbar', valor: '#F5A623' },
    { nombre: 'Celeste', valor: '#5DE4EC' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MotivoFormDialogComponent>,
    private databaseService: DatabaseService,
    private toastService: ToastService,
    @Inject(MAT_DIALOG_DATA) public data: { motivo: Motivo | null; esNuevo: boolean }
  ) {
    this.esNuevo = data.esNuevo;
  }

  ngOnInit(): void {
    this.motivoForm = this.fb.group({
      nombre: [
        this.data.motivo?.nombre || '',
        [Validators.required, Validators.minLength(3)]
      ],
      descripcion: [
        this.data.motivo?.descripcion || '',
        [Validators.maxLength(200)]
      ],
      icono: [
        this.data.motivo?.icono || 'menu_book',
        Validators.required
      ],
      color: [
        this.data.motivo?.color || '#00C8D7',
        Validators.required
      ]
    });
  }

  seleccionarColor(color: string): void {
    this.motivoForm.get('color')?.setValue(color);
  }

  async guardar(): Promise<void> {
    if (this.motivoForm.invalid) return;

    try {
      this.guardando = true;

      const formValue = this.motivoForm.value;

      if (this.esNuevo) {
        const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();
        const maxOrden = todosMotivos.length > 0
          ? Math.max(...todosMotivos.map(m => m.orden))
          : 0;

        const nuevoMotivo: Omit<Motivo, 'id'> = {
          nombre: formValue.nombre.trim(),
          descripcion: formValue.descripcion?.trim() || undefined,
          icono: formValue.icono,
          color: formValue.color,
          activo: true,
          orden: maxOrden + 1
        };

        await this.databaseService.crearMotivo(nuevoMotivo);
        this.toastService.success(`Actividad "${formValue.nombre}" creada`);
      } else {
        const motivoActualizado: Motivo = {
          ...this.data.motivo!,
          nombre: formValue.nombre.trim(),
          descripcion: formValue.descripcion?.trim() || undefined,
          icono: formValue.icono,
          color: formValue.color
        };

        await this.databaseService.actualizarMotivo(this.data.motivo!.id!, motivoActualizado);
        this.toastService.success(`Actividad "${formValue.nombre}" actualizada`);
      }

      this.guardando = false;
      this.dialogRef.close(true);
    } catch (error) {
      console.error('âŒ Error al guardar motivo:', error);
      this.guardando = false;
      this.toastService.error('Error al guardar. Intenta de nuevo.');
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
```

## FILE: src\app\features\importar-alumnos\importar-alumnos.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/importar-alumnos/            â•‘
// â•‘        importar-alumnos.component.ts                 â•‘
// â•‘  Stenbrary v3.5 â€” ImportaciÃ³n masiva desde Excel     â•‘
// â•‘                                                      â•‘
// â•‘  Flujo:                                              â•‘
// â•‘  1. Seleccionar archivo .xlsx/.xls/.csv              â•‘
// â•‘  2. Preview con tabla y validaciÃ³n por fila          â•‘
// â•‘  3. Importar vÃ¡lidos, omitir duplicados              â•‘
// â•‘  4. Resultado con conteos                            â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as XLSX from 'xlsx';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { CARRERAS, TURNOS } from '../../core/constants/catalogos.constants';

/** Una fila parseada del Excel con estado de validaciÃ³n */
interface FilaImportacion {
  fila: number;
  matricula: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  carrera: string;
  grado: number;
  grupo: string;
  turno: string;
  valido: boolean;
  errores: string[];
}

interface ResultadoImportacion {
  total: number;
  importados: number;
  duplicados: number;
  invalidos: number;
  errores: string[];
}

@Component({
  selector: 'app-importar-alumnos',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="importar-container">

      <!-- Header -->
      <div class="page-header">
        <button mat-icon-button class="back-btn" (click)="volver()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-icon">
          <mat-icon>upload_file</mat-icon>
        </div>
        <div>
          <h1>Importar Alumnos</h1>
          <p class="subtitle">Carga masiva desde archivo Excel o CSV</p>
        </div>
      </div>

      <!-- â•â•â• PASO 1: SELECCIONAR ARCHIVO â•â•â• -->
      <mat-card class="section-card" *ngIf="paso === 'seleccionar'">
        <div class="section-header">
          <mat-icon>description</mat-icon>
          <h2>Seleccionar Archivo</h2>
        </div>

        <p class="section-desc">
          Sube un archivo Excel (.xlsx, .xls) o CSV con los datos de los alumnos.
          El archivo debe tener las siguientes columnas:
        </p>

        <div class="columnas-requeridas">
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>MatrÃ­cula</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Nombre</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Apellido Paterno</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Apellido Materno</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Carrera</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Grado</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Grupo</span>
          </div>
          <div class="col-item obligatorio">
            <mat-icon>check_circle</mat-icon>
            <span>Turno</span>
          </div>
        </div>

        <input type="file"
               #fileInput
               accept=".xlsx,.xls,.csv"
               (change)="onArchivoSeleccionado($event)"
               style="display: none">


               <div class="upload-actions">
          <button class="btn-action btn-template" (click)="descargarPlantilla()">
            <mat-icon>table_chart</mat-icon>
            <span>Descargar plantilla</span>
          </button>
          <button class="btn-action btn-upload" (click)="fileInput.click()">
            <mat-icon>cloud_upload</mat-icon>
            <span>Seleccionar archivo</span>
          </button>
        </div>


        

        <div class="template-hint">
          <mat-icon>lightbulb</mat-icon>
          <span>
            <strong>Consejo:</strong> Los nombres de columna no necesitan ser exactos.
            El sistema detecta automÃ¡ticamente columnas como "Matricula", "MATRÃCULA",
            "No. Control", "Apellido_Paterno", etc.
          </span>
        </div>
      </mat-card>

      <!-- â•â•â• PASO 2: PREVIEW â•â•â• -->
      <mat-card class="section-card" *ngIf="paso === 'preview'">
        <div class="section-header">
          <mat-icon>table_chart</mat-icon>
          <h2>Vista Previa</h2>
          <span class="archivo-nombre">{{ nombreArchivo }}</span>
        </div>

        <!-- Resumen de validaciÃ³n -->
        <div class="validacion-resumen">
          <div class="resumen-item validos">
            <mat-icon>check_circle</mat-icon>
            <strong>{{ filasValidas }}</strong> vÃ¡lidos
          </div>
          <div class="resumen-item invalidos" *ngIf="filasInvalidas > 0">
            <mat-icon>error</mat-icon>
            <strong>{{ filasInvalidas }}</strong> con errores
          </div>
          <div class="resumen-item total">
            <mat-icon>list</mat-icon>
            <strong>{{ filas.length }}</strong> filas totales
          </div>
        </div>

        <!-- Tabla de preview -->
        <div class="table-container">
          <table mat-table [dataSource]="filas" class="preview-table">

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let fila">
                <mat-icon *ngIf="fila.valido" class="icon-ok">check_circle</mat-icon>
                <mat-icon *ngIf="!fila.valido" class="icon-error"
                          [matTooltip]="fila.errores.join(', ')">error</mat-icon>
              </td>
            </ng-container>

            <ng-container matColumnDef="fila">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let fila">{{ fila.fila }}</td>
            </ng-container>

            <ng-container matColumnDef="matricula">
              <th mat-header-cell *matHeaderCellDef>MatrÃ­cula</th>
              <td mat-cell *matCellDef="let fila"
                  [class.celda-error]="tieneError(fila, 'MatrÃ­cula')">
                {{ fila.matricula || 'â€”' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let fila">{{ fila.nombre || 'â€”' }}</td>
            </ng-container>

            <ng-container matColumnDef="apellidos">
              <th mat-header-cell *matHeaderCellDef>Apellidos</th>
              <td mat-cell *matCellDef="let fila">
                {{ fila.apellidoPaterno || 'â€”' }} {{ fila.apellidoMaterno || 'â€”' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="carrera">
              <th mat-header-cell *matHeaderCellDef>Carrera</th>
              <td mat-cell *matCellDef="let fila"
                  [class.celda-error]="tieneError(fila, 'Carrera')">
                {{ fila.carrera || 'â€”' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="grado">
              <th mat-header-cell *matHeaderCellDef>Grado</th>
              <td mat-cell *matCellDef="let fila">{{ fila.grado || 'â€”' }}</td>
            </ng-container>

            <ng-container matColumnDef="grupo">
              <th mat-header-cell *matHeaderCellDef>Grupo</th>
              <td mat-cell *matCellDef="let fila">{{ fila.grupo || 'â€”' }}</td>
            </ng-container>

            <ng-container matColumnDef="turno">
              <th mat-header-cell *matHeaderCellDef>Turno</th>
              <td mat-cell *matCellDef="let fila"
                  [class.celda-error]="tieneError(fila, 'Turno')">
                {{ fila.turno || 'â€”' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columnasPreview"></tr>
            <tr mat-row *matRowDef="let row; columns: columnasPreview;"
                [class.fila-invalida]="!row.valido"></tr>
          </table>
        </div>

        <!-- Acciones -->
        <div class="preview-actions">
          <button class="btn-action btn-cancel" (click)="cancelar()">
            <mat-icon>close</mat-icon>
            <span>Cancelar</span>
          </button>
          <button class="btn-action btn-import"
                  (click)="importar()"
                  [disabled]="filasValidas === 0 || importando">
            <mat-icon>{{ importando ? 'hourglass_empty' : 'file_download' }}</mat-icon>
            <span>{{ importando ? 'Importando...' : 'Importar ' + filasValidas + ' alumnos' }}</span>
          </button>
        </div>
      </mat-card>

      <!-- â•â•â• PASO 3: RESULTADO â•â•â• -->
      <mat-card class="section-card" *ngIf="paso === 'resultado' && resultado">
        <div class="section-header">
          <mat-icon [class.icon-ok]="resultado.importados > 0"
                    [class.icon-error]="resultado.importados === 0">
            {{ resultado.importados > 0 ? 'check_circle' : 'error' }}
          </mat-icon>
          <h2>ImportaciÃ³n {{ resultado.importados > 0 ? 'Completada' : 'Sin Resultados' }}</h2>
        </div>

        <div class="resultado-grid">
          <div class="resultado-stat exito" *ngIf="resultado.importados > 0">
            <div class="resultado-valor">{{ resultado.importados }}</div>
            <div class="resultado-label">Importados</div>
          </div>
          <div class="resultado-stat duplicado" *ngIf="resultado.duplicados > 0">
            <div class="resultado-valor">{{ resultado.duplicados }}</div>
            <div class="resultado-label">Duplicados (omitidos)</div>
          </div>
          <div class="resultado-stat error" *ngIf="resultado.invalidos > 0">
            <div class="resultado-valor">{{ resultado.invalidos }}</div>
            <div class="resultado-label">InvÃ¡lidos (omitidos)</div>
          </div>
        </div>

        <div class="resultado-actions">
          <button class="btn-action btn-secondary" (click)="importarOtro()">
            <mat-icon>upload_file</mat-icon>
            <span>Importar otro archivo</span>
          </button>
          <button class="btn-action btn-primary" (click)="irAAlumnos()">
            <mat-icon>groups</mat-icon>
            <span>Ver alumnos</span>
          </button>
        </div>
      </mat-card>

    </div>
  `,
  styles: [`
    .importar-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1000px;
      margin: 0 auto;
      padding: 8px 16px 48px;
    }

    /* â”€â”€ Header â”€â”€ */
    .page-header {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .back-btn {
      color: rgba(200, 230, 240, 0.5) !important;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: rgba(0, 200, 215, 0.10);
      border: 1px solid rgba(0, 200, 215, 0.25);
      border-radius: 14px;
      flex-shrink: 0;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #00C8D7;
      }
    }

    h1 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
      color: #E8F4F8;
    }

    .subtitle {
      margin: 2px 0 0;
      font-size: 0.82rem;
      color: rgba(200, 230, 240, 0.5);
    }

    /* â”€â”€ Section Cards â”€â”€ */
    .section-card {
      background: #101c2c !important;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 16px;
      padding: 28px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      mat-icon {
        color: #00C8D7;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: #E8F4F8;
      }

      .archivo-nombre {
        margin-left: auto;
        font-size: 0.78rem;
        color: rgba(200, 230, 240, 0.4);
        font-family: 'Space Mono', monospace;
      }
    }

    .section-desc {
      margin: 0 0 16px;
      font-size: 0.85rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.5;
    }

    /* â”€â”€ Columnas requeridas â”€â”€ */
    .columnas-requeridas {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 24px;
    }

    .col-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 500;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &.obligatorio {
        background: rgba(0, 200, 215, 0.06);
        border: 1px solid rgba(0, 200, 215, 0.15);
        color: #00C8D7;

        mat-icon { color: #0BC4B7; }
      }
    }
.upload-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-template {
      background: rgba(99, 102, 241, 0.10);
      color: #6366F1;
      border: 1px solid rgba(99, 102, 241, 0.25);

      &:hover:not(:disabled) {
        background: rgba(99, 102, 241, 0.18);
      }
    }
    /* â”€â”€ Buttons â”€â”€ */
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 24px;
      border: none;
      border-radius: 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 200ms;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
      }
    }

    .btn-upload {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }

    .btn-import {
      background: linear-gradient(135deg, #0BC4B7, #0EB07B);
      color: #04090F;
      box-shadow: 0 4px 16px rgba(11, 196, 183, 0.25);
    }

    .btn-cancel {
      background: rgba(200, 230, 240, 0.06);
      color: rgba(200, 230, 240, 0.5);
      border: 1px solid rgba(200, 230, 240, 0.1);
    }

    .btn-primary {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }

    .btn-secondary {
      background: rgba(0, 200, 215, 0.10);
      color: #00C8D7;
      border: 1px solid rgba(0, 200, 215, 0.25);
    }

    /* â”€â”€ Template hint â”€â”€ */
    .template-hint {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 20px;
      padding: 14px 16px;
      background: rgba(99, 102, 241, 0.06);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 12px;
      font-size: 0.8rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.5;

      mat-icon {
        color: #6366F1;
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      strong { color: #6366F1; }
    }

    /* â”€â”€ ValidaciÃ³n resumen â”€â”€ */
    .validacion-resumen {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .resumen-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 0.85rem;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.validos {
        background: rgba(11, 196, 183, 0.08);
        color: #0BC4B7;
      }
      &.invalidos {
        background: rgba(240, 82, 82, 0.08);
        color: #F05252;
      }
      &.total {
        background: rgba(200, 230, 240, 0.04);
        color: rgba(200, 230, 240, 0.5);
      }
    }

    /* â”€â”€ Tabla preview â”€â”€ */
    .table-container {
      overflow-x: auto;
      margin-bottom: 20px;
      border-radius: 12px;
      border: 1px solid rgba(0, 200, 215, 0.08);
      max-height: 420px;
      overflow-y: auto;
    }

    .preview-table {
      width: 100%;
      background: transparent !important;

      th {
        background: #0a1420 !important;
        color: rgba(200, 230, 240, 0.6) !important;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 600;
        border-bottom: 1px solid rgba(0, 200, 215, 0.1) !important;
      }

      td {
        color: #E8F4F8;
        font-size: 0.82rem;
        border-bottom: 1px solid rgba(200, 230, 240, 0.04) !important;
      }
    }

    .fila-invalida td {
      opacity: 0.5;
    }

    .celda-error {
      color: #F05252 !important;
      font-weight: 600;
    }

    .icon-ok { color: #0BC4B7 !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }
    .icon-error { color: #F05252 !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }

    /* â”€â”€ Preview actions â”€â”€ */
    .preview-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    /* â”€â”€ Resultado â”€â”€ */
    .resultado-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .resultado-stat {
      flex: 1;
      padding: 20px;
      border-radius: 14px;
      text-align: center;

      .resultado-valor {
        font-size: 2rem;
        font-weight: 800;
        font-family: 'Space Mono', monospace;
        line-height: 1;
        margin-bottom: 6px;
      }

      .resultado-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.7;
      }

      &.exito {
        background: rgba(11, 196, 183, 0.08);
        border: 1px solid rgba(11, 196, 183, 0.2);
        .resultado-valor { color: #0BC4B7; }
        color: #0BC4B7;
      }

      &.duplicado {
        background: rgba(245, 166, 35, 0.08);
        border: 1px solid rgba(245, 166, 35, 0.2);
        .resultado-valor { color: #F5A623; }
        color: #F5A623;
      }

      &.error {
        background: rgba(240, 82, 82, 0.08);
        border: 1px solid rgba(240, 82, 82, 0.2);
        .resultado-valor { color: #F05252; }
        color: #F05252;
      }
    }

    .resultado-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    /* â”€â”€ Responsive â”€â”€ */
    @media (max-width: 768px) {
      .columnas-requeridas {
        gap: 6px;
      }

      .table-container {
        max-height: 300px;
      }

      .resultado-grid {
        flex-direction: column;
      }

      .preview-actions,
      .resultado-actions {
        flex-direction: column;
      }
    }
  `],
})
export class ImportarAlumnosComponent {

  paso: 'seleccionar' | 'preview' | 'resultado' = 'seleccionar';
  nombreArchivo = '';
  importando = false;

  // Preview
  filas: FilaImportacion[] = [];
  columnasPreview = ['estado', 'fila', 'matricula', 'nombre', 'apellidos', 'carrera', 'grado', 'grupo', 'turno'];

  // Resultado
  resultado: ResultadoImportacion | null = null;

  constructor(
    private databaseService: DatabaseService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private router: Router,
  ) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // GETTERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  get filasValidas(): number {
    return this.filas.filter(f => f.valido).length;
  }

  get filasInvalidas(): number {
    return this.filas.filter(f => !f.valido).length;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PASO 1: SELECCIONAR ARCHIVO
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.nombreArchivo = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Tomar la primera hoja
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convertir a JSON (filas como objetos)
        const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonData.length === 0) {
          this.toastService.error('El archivo estÃ¡ vacÃ­o o no tiene datos');
          return;
        }

        this.procesarDatos(jsonData);
        this.paso = 'preview';
        this.toastService.info(`${jsonData.length} filas encontradas en "${sheetName}"`);
      } catch (error) {
        console.error('Error al parsear archivo:', error);
        this.toastService.error('Error al leer el archivo. Verifica que sea un Excel o CSV vÃ¡lido.');
      }
    };
    reader.onerror = () => {
      this.toastService.error('Error al leer el archivo');
    };
    reader.readAsArrayBuffer(file);

    // Reset para poder seleccionar el mismo archivo
    input.value = '';
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PROCESAMIENTO Y MAPEO DE COLUMNAS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private procesarDatos(jsonData: any[]): void {
    // Detectar columnas automÃ¡ticamente
    const primeraFila = jsonData[0];
    const columnas = Object.keys(primeraFila);

    const mapeo = {
      matricula: this.detectarColumna(columnas, ['matricula', 'matrÃ­cula', 'no. control', 'no control', 'numero de control', 'nÃºmero de control', 'no_control', 'id']),
      nombre: this.detectarColumna(columnas, ['nombre', 'nombres', 'name', 'primer nombre']),
      apellidoPaterno: this.detectarColumna(columnas, ['apellido paterno', 'apellido_paterno', 'paterno', 'ap paterno', 'ap_paterno', 'primer apellido']),
      apellidoMaterno: this.detectarColumna(columnas, ['apellido materno', 'apellido_materno', 'materno', 'ap materno', 'ap_materno', 'segundo apellido']),
      carrera: this.detectarColumna(columnas, ['carrera', 'licenciatura', 'programa', 'programa educativo', 'programa_educativo']),
      grado: this.detectarColumna(columnas, ['grado', 'semestre', 'cuatrimestre', 'nivel', 'periodo']),
      grupo: this.detectarColumna(columnas, ['grupo', 'seccion', 'secciÃ³n', 'section', 'aula']),
      turno: this.detectarColumna(columnas, ['turno', 'horario', 'jornada', 'shift']),
    };

    console.log('ðŸ“‹ Mapeo de columnas detectado:', mapeo);

    this.filas = jsonData.map((row, index) => {
      const fila: FilaImportacion = {
        fila: index + 2, // +2 porque fila 1 es el header en Excel
        matricula: this.limpiarTexto(row[mapeo.matricula] || ''),
        nombre: this.limpiarTexto(row[mapeo.nombre] || ''),
        apellidoPaterno: this.limpiarTexto(row[mapeo.apellidoPaterno] || ''),
        apellidoMaterno: this.limpiarTexto(row[mapeo.apellidoMaterno] || ''),
        carrera: this.limpiarTexto(row[mapeo.carrera] || ''),
        grado: this.parsearNumero(row[mapeo.grado]),
        grupo: this.limpiarTexto(row[mapeo.grupo] || '').toUpperCase(),
        turno: this.normalizarTurno(this.limpiarTexto(row[mapeo.turno] || '')),
        valido: true,
        errores: [],
      };

      // Validar
      this.validarFila(fila);

      return fila;
    });
  }

  /**
   * Detecta cuÃ¡l columna del Excel corresponde a un campo.
   * Busca por coincidencia parcial (case-insensitive).
   */
  private detectarColumna(columnas: string[], nombres: string[]): string {
    for (const nombre of nombres) {
      const encontrada = columnas.find(c =>
        c.toLowerCase().trim().includes(nombre.toLowerCase())
      );
      if (encontrada) return encontrada;
    }
    // Si no detecta, buscar match exacto (sin acentos)
    for (const nombre of nombres) {
      const sinAcentos = this.quitarAcentos(nombre);
      const encontrada = columnas.find(c =>
        this.quitarAcentos(c.toLowerCase().trim()) === sinAcentos
      );
      if (encontrada) return encontrada;
    }
    // Fallback: devolver el nombre original del primer intento
    return nombres[0];
  }

  private quitarAcentos(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private limpiarTexto(valor: any): string {
    return String(valor).trim();
  }

  private parsearNumero(valor: any): number {
    const num = parseInt(String(valor), 10);
    return isNaN(num) ? 0 : num;
  }

  private normalizarTurno(turno: string): string {
    const t = turno.toLowerCase().trim();
    if (t.includes('matut') || t === 'm' || t === 'tm') return 'Matutino';
    if (t.includes('vespert') || t === 'v' || t === 'tv') return 'Vespertino';
    if (t.includes('mixt') || t.includes('noct') || t === 'x') return 'Mixto';
    // Si ya viene correcto
    if (TURNOS.includes(turno as any)) return turno;
    return turno; // Dejar como estÃ¡, la validaciÃ³n lo atraparÃ¡
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // VALIDACIÃ“N
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private validarFila(fila: FilaImportacion): void {
    fila.errores = [];

    if (!fila.matricula || fila.matricula.length < 3) {
      fila.errores.push('MatrÃ­cula vacÃ­a o muy corta');
    }

    if (!fila.nombre) fila.errores.push('Nombre vacÃ­o');
    if (!fila.apellidoPaterno) fila.errores.push('Apellido Paterno vacÃ­o');
    if (!fila.apellidoMaterno) fila.errores.push('Apellido Materno vacÃ­o');

    if (!fila.carrera) {
      fila.errores.push('Carrera vacÃ­a');
    }

    if (!fila.grado || fila.grado < 1 || fila.grado > 12) {
      fila.errores.push('Grado invÃ¡lido (debe ser 1-12)');
    }

    if (!fila.grupo) fila.errores.push('Grupo vacÃ­o');

    if (!TURNOS.includes(fila.turno as any)) {
      fila.errores.push(`Turno invÃ¡lido: "${fila.turno}" (usar Matutino, Vespertino o Mixto)`);
    }

    // Verificar duplicados DENTRO del mismo archivo
    const duplicadoInterno = this.filas?.find(f =>
      f !== fila && f.matricula === fila.matricula && fila.matricula !== ''
    );
    if (duplicadoInterno) {
      fila.errores.push(`MatrÃ­cula duplicada en fila ${duplicadoInterno.fila}`);
    }

    fila.valido = fila.errores.length === 0;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PASO 3: IMPORTAR
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async importar(): Promise<void> {
    const validas = this.filas.filter(f => f.valido);
    if (validas.length === 0) return;

    try {
      this.importando = true;
      this.loadingService.show(`Importando ${validas.length} alumnos...`);

      const resultado: ResultadoImportacion = {
        total: validas.length,
        importados: 0,
        duplicados: 0,
        invalidos: this.filasInvalidas,
        errores: [],
      };

      for (const fila of validas) {
        try {
          await this.databaseService.crearAlumno({
            matricula: fila.matricula,
            nombre: fila.nombre,
            apellidoPaterno: fila.apellidoPaterno,
            apellidoMaterno: fila.apellidoMaterno,
            carrera: fila.carrera,
            grado: fila.grado,
            grupo: fila.grupo,
            turno: fila.turno as 'Matutino' | 'Vespertino' | 'Mixto',
            activo: true,
          });
          resultado.importados++;
        } catch (error: any) {
          // MatrÃ­cula duplicada en la base de datos
          resultado.duplicados++;
        }
      }

      this.resultado = resultado;
      this.paso = 'resultado';
      this.loadingService.hide();
      this.importando = false;

      if (resultado.importados > 0) {
        this.toastService.success(`${resultado.importados} alumnos importados exitosamente`);
      } else {
        this.toastService.warning('No se importaron alumnos nuevos (todos duplicados)');
      }

      console.log('âœ… ImportaciÃ³n completada:', resultado);
    } catch (error) {
      this.loadingService.hide();
      this.importando = false;
      this.toastService.error('Error durante la importaciÃ³n');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // NAVEGACIÃ“N
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  cancelar(): void {
    this.paso = 'seleccionar';
    this.filas = [];
    this.nombreArchivo = '';
  }

  importarOtro(): void {
    this.paso = 'seleccionar';
    this.filas = [];
    this.nombreArchivo = '';
    this.resultado = null;
  }

  irAAlumnos(): void {
    this.router.navigate(['/alumnos']);
  }

  volver(): void {
    this.router.navigate(['/alumnos']);
  }

  /** Helper: Angular templates no soportan arrow functions */
  tieneError(fila: FilaImportacion, campo: string): boolean {
    return fila.errores.some(e => e.includes(campo));
  }


    descargarPlantilla(): void {
    const headers = ['MatrÃ­cula', 'Nombre', 'Apellido Paterno', 'Apellido Materno', 'Carrera', 'Grado', 'Grupo', 'Turno'];
    const ejemplo = ['a2299990003', 'Juan', 'GarcÃ­a', 'LÃ³pez', 'Contador PÃºblico', '4', 'A', 'Matutino'];

    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 16 }, // MatrÃ­cula
      { wch: 14 }, // Nombre
      { wch: 18 }, // Apellido Paterno
      { wch: 18 }, // Apellido Materno
      { wch: 30 }, // Carrera
      { wch: 8 },  // Grado
      { wch: 8 },  // Grupo
      { wch: 14 }, // Turno
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
    XLSX.writeFile(wb, 'plantilla_alumnos_stenbrary.xlsx');

    this.toastService.info('Plantilla descargada â€” llÃ©nala y sÃºbela');
  }
}


```

## FILE: src\app\features\registro-alumno\registro-alumno.component.html
```html
<div class="registro-container">
  <!-- Header -->
  <div class="registro-header">
    <button mat-icon-button class="back-button" (click)="cancelar()">
      <mat-icon>{{ vieneDelScanner ? 'arrow_back' : 'refresh' }}</mat-icon>
    </button>
    <h1>Registro de Nuevo Alumno</h1>
  </div>

  <!-- Contenido -->
  <div class="registro-content">
    <mat-card class="registro-card">
      <mat-card-header>
        <div class="card-header-content">
          <mat-icon class="header-icon">person_add</mat-icon>
          <div>
            <mat-card-title>Datos del Alumno</mat-card-title>
            <mat-card-subtitle>
              @if (matriculaBloqueada) {
                MatrÃ­cula escaneada: {{ matricula }}
              } @else {
                Ingresa los datos del nuevo alumno
              }
            </mat-card-subtitle>
          </div>
        </div>
      </mat-card-header>

      <mat-card-content>
        <form [formGroup]="registroForm" class="registro-form">

          <!-- MatrÃ­cula (editable si acceso directo, bloqueada si viene del scanner) -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>MatrÃ­cula</mat-label>
            <input 
              matInput 
              formControlName="matricula"
              placeholder="Ej: a2299990002"
              [class.input-error]="campoInvalido('matricula')">
            <mat-icon matPrefix>fingerprint</mat-icon>
            @if (matriculaBloqueada) {
              <mat-icon matSuffix matTooltip="MatrÃ­cula escaneada â€” no se puede editar">lock</mat-icon>
            }
            <mat-error *ngIf="campoInvalido('matricula')">
              {{ obtenerErrorCampo('matricula') }}
            </mat-error>
          </mat-form-field>
          
          <!-- Nombre -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre(s)</mat-label>
            <input 
              matInput 
              formControlName="nombre"
              placeholder="Ej: Juan Carlos"
              [class.input-error]="campoInvalido('nombre')">
            <mat-icon matPrefix>badge</mat-icon>
            <mat-error *ngIf="campoInvalido('nombre')">
              {{ obtenerErrorCampo('nombre') }}
            </mat-error>
          </mat-form-field>

          <!-- Apellido Paterno -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Apellido Paterno</mat-label>
            <input 
              matInput 
              formControlName="apellidoPaterno"
              placeholder="Ej: GarcÃ­a"
              [class.input-error]="campoInvalido('apellidoPaterno')">
            <mat-icon matPrefix>badge</mat-icon>
            <mat-error *ngIf="campoInvalido('apellidoPaterno')">
              {{ obtenerErrorCampo('apellidoPaterno') }}
            </mat-error>
          </mat-form-field>

          <!-- Apellido Materno -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Apellido Materno</mat-label>
            <input 
              matInput 
              formControlName="apellidoMaterno"
              placeholder="Ej: LÃ³pez"
              [class.input-error]="campoInvalido('apellidoMaterno')">
            <mat-icon matPrefix>badge</mat-icon>
            <mat-error *ngIf="campoInvalido('apellidoMaterno')">
              {{ obtenerErrorCampo('apellidoMaterno') }}
            </mat-error>
          </mat-form-field>

          <!-- Carrera -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Carrera</mat-label>
            <mat-select formControlName="carrera">
              <mat-option *ngFor="let carrera of carreras" [value]="carrera">
                {{ carrera }}
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>school</mat-icon>
            <mat-error *ngIf="campoInvalido('carrera')">
              {{ obtenerErrorCampo('carrera') }}
            </mat-error>
          </mat-form-field>

          <!-- Grado, Grupo, Turno en una fila -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="form-col">
              <mat-label>Grado</mat-label>
              <mat-select formControlName="grado">
                <mat-option *ngFor="let grado of grados" [value]="grado">
                  {{ grado }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="campoInvalido('grado')">
                Requerido
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-col">
              <mat-label>Grupo</mat-label>
              <mat-select formControlName="grupo">
                <mat-option *ngFor="let grupo of grupos" [value]="grupo">
                  {{ grupo }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="campoInvalido('grupo')">
                Requerido
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-col">
              <mat-label>Turno</mat-label>
              <mat-select formControlName="turno">
                <mat-option *ngFor="let turno of turnos" [value]="turno">
                  {{ turno }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="campoInvalido('turno')">
                Requerido
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Error general -->
          <div class="error-message" *ngIf="error && !cargando">
            <mat-icon>error</mat-icon>
            <span>{{ error }}</span>
          </div>

          <!-- Botones -->
          <div class="form-actions">
            <button 
              mat-stroked-button 
              type="button"
              (click)="cancelar()"
              [disabled]="cargando">
              <mat-icon>{{ vieneDelScanner ? 'close' : 'refresh' }}</mat-icon>
              {{ vieneDelScanner ? 'Cancelar' : 'Limpiar' }}
            </button>

            <button 
              mat-raised-button 
              color="primary"
              type="button"
              (click)="registrarAlumno()"
              [disabled]="cargando">
              <mat-spinner *ngIf="cargando" diameter="20" class="button-spinner"></mat-spinner>
              <mat-icon *ngIf="!cargando">check</mat-icon>
              {{ cargando ? 'Guardando...' : (vieneDelScanner ? 'Registrar y Continuar' : 'Registrar Alumno') }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  </div>
</div>
```

## FILE: src\app\features\registro-alumno\registro-alumno.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  registro-alumno.component.scss                      â•‘
// â•‘  Stenbrary v3.2 â€” Dark Theme + Visual Life           â•‘
// â•‘                                                      â•‘
// â•‘  Rewritten from scratch: removed purple gradient,    â•‘
// â•‘  added dark theme, subtle glow accents, entrance     â•‘
// â•‘  animations, decorative side stripe.                 â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

.registro-container {
  min-height: 100%;
  background: transparent;
  padding: $spacing-lg;
  overflow-y: auto;
}

// â”€â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.registro-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
  animation: slideInDown 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
  
  .back-button {
    background: $navy-700;
    border: 1px solid $border-subtle;
    color: $text-primary;
    transition: all $transition-fast;

    &:hover {
      background: $navy-600;
      border-color: $border-glow;
    }
  }
  
  h1 {
    margin: 0;
    font-family: $font-display;
    font-size: 1.5rem;
    font-weight: 700;
    color: $text-primary;
  }
}

// â”€â”€â”€ CONTENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.registro-content {
  max-width: 620px;
  margin: 0 auto;
}

// â”€â”€â”€ CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.registro-card {
  animation: scaleIn 450ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both;
  position: relative;
  overflow: visible;

  // Decorative glow line on the left
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 24px;
    bottom: 24px;
    width: 3px;
    background: linear-gradient(
      180deg,
      transparent,
      $cyan-500 30%,
      $teal-400 70%,
      transparent
    );
    border-radius: 2px;
    opacity: 0.5;
  }
  
  mat-card-header {
    margin-bottom: $spacing-lg;
    
    .card-header-content {
      display: flex;
      align-items: center;
      gap: $spacing-md;
      width: 100%;
      
      .header-icon {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        color: $cyan-500;
        filter: drop-shadow(0 0 8px rgba(0, 200, 215, 0.3));
      }
      
      mat-card-title {
        font-size: 1.3rem;
        font-family: $font-display;
        font-weight: 700;
        margin: 0;
        color: $text-primary;
      }
      
      mat-card-subtitle {
        font-size: 0.88rem;
        margin-top: $spacing-xs;
        color: $cyan-400;
        font-family: $font-mono;
      }
    }
  }
}

// â”€â”€â”€ FORM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.registro-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  // Stagger animation for form fields
  mat-form-field {
    animation: slideInUp 350ms cubic-bezier(0.16, 1, 0.3, 1) both;

    @for $i from 1 through 8 {
      &:nth-child(#{$i}) {
        animation-delay: #{100 + ($i * 50)}ms;
      }
    }
  }
  
  .full-width {
    width: 100%;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-md;
    animation: slideInUp 350ms 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
    
    @media (max-width: $breakpoint-sm) {
      grid-template-columns: 1fr;
    }
  }
  
  .form-col {
    width: 100%;
  }
}

// â”€â”€â”€ ERROR MESSAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.error-message {
  @include flex-center;
  gap: $spacing-sm;
  background: rgba($warn-color, 0.08);
  border: 1px solid rgba($warn-color, 0.25);
  border-radius: $border-radius-sm;
  padding: $spacing-md;
  color: $warn-color;
  animation: slideInUp 300ms ease both;
  
  mat-icon {
    flex-shrink: 0;
  }
}

// â”€â”€â”€ FORM ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.form-actions {
  display: flex;
  gap: $spacing-md;
  margin-top: $spacing-lg;
  animation: slideInUp 350ms 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
  
  button {
    flex: 1;
    height: 48px;
    
    mat-icon {
      margin-right: $spacing-xs;
    }
    
    .button-spinner {
      display: inline-block;
      margin-right: $spacing-xs;
    }
  }
}

.input-error {
  border-color: $warn-color !important;
}

// â”€â”€â”€ RESPONSIVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@media (max-width: $breakpoint-sm) {
  .registro-container {
    padding: $spacing-md;
  }

  .registro-card::before {
    display: none;
  }
}
```

## FILE: src\app\features\registro-alumno\registro-alumno.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/registro-alumno/             â•‘
// â•‘        registro-alumno.component.ts                  â•‘
// â•‘  Stenbrary v3.4 â€” CatÃ¡logo unificado                 â•‘
// â•‘                                                      â•‘
// â•‘  FIX v3.4:                                           â•‘
// â•‘  - Carreras, grados, grupos y turnos importados      â•‘
// â•‘    desde catalogos.constants.ts (fuente Ãºnica)       â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { CARRERAS, GRADOS, GRUPOS, TURNOS } from '../../core/constants/catalogos.constants';

@Component({
  selector: 'app-registro-alumno',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './registro-alumno.component.html',
  styleUrl: './registro-alumno.component.scss',
})
export class RegistroAlumnoComponent implements OnInit {
  registroForm!: FormGroup;
  cargando = false;
  error: string | null = null;

  matricula = '';
  matriculaBloqueada = false;
  vieneDelScanner = false;

  // FIX v3.4: CatÃ¡logos centralizados (fuente Ãºnica de verdad)
  carreras = CARRERAS;
  grados = GRADOS;
  grupos = GRUPOS;
  turnos = TURNOS;

  constructor(
    private fb: FormBuilder,
    private databaseService: DatabaseService,
    private router: Router,
    private toastService: ToastService,
    private loadingService: LoadingService,
  ) {}

  ngOnInit(): void {
    const matriculaTemp = sessionStorage.getItem('matriculaTemp');

    if (matriculaTemp) {
      this.matricula = matriculaTemp;
      this.matriculaBloqueada = true;
      this.vieneDelScanner = true;
      console.log('ðŸ“ Registrando alumno desde scanner, matrÃ­cula:', this.matricula);
    } else {
      this.matricula = '';
      this.matriculaBloqueada = false;
      this.vieneDelScanner = false;
      console.log('ðŸ“ Registro de alumno â€” acceso directo');
    }

    this.registroForm = this.fb.group({
      matricula: [
        { value: this.matricula, disabled: this.matriculaBloqueada },
        [Validators.required, Validators.minLength(5)],
      ],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: ['', [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: ['', [Validators.required, Validators.minLength(2)]],
      carrera: ['', Validators.required],
      grado: ['', Validators.required],
      grupo: ['', Validators.required],
      turno: ['', Validators.required],
    });
  }

  async registrarAlumno(): Promise<void> {
    if (this.registroForm.invalid) {
      this.error = 'Por favor completa todos los campos correctamente';
      this.toastService.warning('Por favor completa todos los campos correctamente');
      this.marcarCamposComoTocados();
      return;
    }

    try {
      this.cargando = true;
      this.error = null;
      this.loadingService.show('Registrando alumno...');

      const formValue = this.registroForm.getRawValue();
      const matriculaFinal = this.matriculaBloqueada ? this.matricula : formValue.matricula.trim();

      const nuevoAlumno: Omit<Alumno, 'id' | 'fechaRegistro'> = {
        matricula: matriculaFinal,
        nombre: formValue.nombre.trim(),
        apellidoPaterno: formValue.apellidoPaterno.trim(),
        apellidoMaterno: formValue.apellidoMaterno.trim(),
        carrera: formValue.carrera,
        grado: Number(formValue.grado),
        grupo: formValue.grupo,
        turno: formValue.turno,
        activo: true,
      };

      const alumnoCreado = await this.databaseService.crearAlumno(nuevoAlumno);

      console.log('âœ… Alumno registrado:', alumnoCreado);
      this.loadingService.hide();
      this.toastService.success(`Alumno ${formValue.nombre} ${formValue.apellidoPaterno} registrado exitosamente`);

      if (this.vieneDelScanner) {
        sessionStorage.setItem('alumnoActual', JSON.stringify(alumnoCreado));
        sessionStorage.removeItem('matriculaTemp');
        this.router.navigate(['/seleccion-motivo']);
      } else {
        this.registroForm.reset();
        this.toastService.info('Puedes registrar otro alumno');
      }
    } catch (error: any) {
      console.error('âŒ Error al registrar alumno:', error);
      this.loadingService.hide();

      if (error.message && error.message.includes('already exists')) {
        this.error = 'Esta matrÃ­cula ya estÃ¡ registrada';
        this.toastService.error('Esta matrÃ­cula ya estÃ¡ registrada');
      } else {
        this.error = 'Error al registrar el alumno. Intenta de nuevo.';
        this.toastService.error('Error al registrar el alumno. Intenta de nuevo.');
      }

      this.cargando = false;
    }
  }

  cancelar(): void {
    sessionStorage.removeItem('matriculaTemp');

    if (this.vieneDelScanner) {
      this.toastService.info('Registro cancelado');
      this.router.navigate(['/scanner']);
    } else {
      this.registroForm.reset();
      this.toastService.info('Formulario limpiado');
    }
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.registroForm.controls).forEach(field => {
      const control = this.registroForm.get(field);
      control?.markAsTouched();
    });
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.registroForm.get(campo);
    if (control?.hasError('required')) return 'Este campo es obligatorio';
    if (control?.hasError('minlength')) {
      const minLen = campo === 'matricula' ? 5 : 2;
      return `MÃ­nimo ${minLen} caracteres`;
    }
    return '';
  }

  campoInvalido(campo: string): boolean {
    const control = this.registroForm.get(campo);
    return !!(control?.invalid && control?.touched);
  }
}
```

## FILE: src\app\features\registros\registros.component.html
```html
<!-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•— -->
<!-- â•‘  registros.component.html â€” Stenbrary v3.6          â•‘ -->
<!-- â•‘  NUEVO: BotÃ³n "Generar PDF" en header               â•‘ -->
<!-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->

<div class="registros-container">

  <!-- â”€â”€ HEADER â”€â”€ -->
  <div class="page-header">
    <div class="header-left">
      <div class="header-icon">
        <mat-icon>history</mat-icon>
      </div>
      <div>
        <h1>Registros</h1>
        <p class="header-subtitle">
          {{ etiquetaRango }}: {{ registrosFiltrados.length }} registros
        </p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn-outline" (click)="generarPDF()" matTooltip="Generar reporte PDF"
              [disabled]="registrosFiltrados.length === 0">
        <mat-icon>picture_as_pdf</mat-icon>
        <span class="btn-text">PDF</span>
      </button>
      <button class="btn-outline" (click)="exportarCSV()" matTooltip="Exportar a Excel">
        <mat-icon>download</mat-icon>
        <span class="btn-text">Excel</span>
      </button>
      <button class="btn-outline" (click)="cargarDatos()" matTooltip="Actualizar">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>
  </div>

  <!-- â”€â”€ RANGO DE FECHA (TABS) â”€â”€ -->
  <div class="rango-tabs">
    @for (rango of [
      { key: 'hoy', label: 'Hoy', icon: 'today' },
      { key: 'semana', label: '7 dÃ­as', icon: 'date_range' },
      { key: 'mes', label: '30 dÃ­as', icon: 'calendar_month' },
      { key: 'todo', label: 'Todo', icon: 'all_inclusive' }
    ]; track rango.key) {
      <button
        class="rango-tab"
        [class.active]="filtros().rangoFecha === rango.key"
        (click)="actualizarFiltro('rangoFecha', rango.key)">
        <mat-icon>{{ rango.icon }}</mat-icon>
        <span>{{ rango.label }}</span>
      </button>
    }
  </div>

  <!-- â”€â”€ FILTROS â”€â”€ -->
  <div class="filtros-panel">
    <div class="search-bar">
      <mat-icon class="search-icon">search</mat-icon>
      <input
        type="text"
        placeholder="Buscar por nombre o matrÃ­cula..."
        [ngModel]="filtros().busqueda"
        (ngModelChange)="actualizarFiltro('busqueda', $event)">
      @if (filtros().busqueda) {
        <button class="clear-btn" (click)="actualizarFiltro('busqueda', '')">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>

    <div class="filtros-row">
      <mat-form-field appearance="outline" class="filtro-field">
        <mat-label>Actividad</mat-label>
        <mat-select
          [ngModel]="filtros().motivo"
          (ngModelChange)="actualizarFiltro('motivo', $event)">
          <mat-option value="">Todas</mat-option>
          @for (m of motivos; track m.id) {
            <mat-option [value]="m.nombre">{{ m.nombre }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filtro-field">
        <mat-label>Carrera</mat-label>
        <mat-select
          [ngModel]="filtros().carrera"
          (ngModelChange)="actualizarFiltro('carrera', $event)">
          <mat-option value="">Todas</mat-option>
          @for (c of carrerasUnicas(); track c) {
            <mat-option [value]="c">{{ c }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (hayFiltrosActivos) {
        <button class="btn-clear-filters" (click)="limpiarFiltros()">
          <mat-icon>filter_alt_off</mat-icon>
          Limpiar
        </button>
      }
    </div>
  </div>

  <!-- â”€â”€ LOADING â”€â”€ -->
  @if (cargando) {
    <div class="loading-state">
      <mat-spinner diameter="36"></mat-spinner>
      <p>Cargando registros...</p>
    </div>
  }

  <!-- â”€â”€ TABLA â”€â”€ -->
  @if (!cargando && registrosFiltrados.length > 0) {
    <div class="tabla-container">
      <table mat-table [dataSource]="registrosPaginados" class="registros-table">

        <!-- Fecha y Hora -->
        <ng-container matColumnDef="fechaHora">
          <th mat-header-cell *matHeaderCellDef>Fecha</th>
          <td mat-cell *matCellDef="let r">
            <div class="fecha-cell">
              <span class="fecha-date">{{ formatearFecha(r.fechaHora).split(',')[0] || formatearFecha(r.fechaHora) }}</span>
              <span class="fecha-time mono">{{ formatearHora(r.fechaHora) }}</span>
            </div>
          </td>
        </ng-container>

        <!-- MatrÃ­cula -->
        <ng-container matColumnDef="matricula">
          <th mat-header-cell *matHeaderCellDef>MatrÃ­cula</th>
          <td mat-cell *matCellDef="let r">
            <span class="mono matricula-badge">{{ r.matricula }}</span>
          </td>
        </ng-container>

        <!-- Nombre -->
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Alumno</th>
          <td mat-cell *matCellDef="let r">
            <span class="nombre-cell">{{ r.nombreCompleto }}</span>
          </td>
        </ng-container>

        <!-- Carrera -->
        <ng-container matColumnDef="carrera">
          <th mat-header-cell *matHeaderCellDef>Carrera</th>
          <td mat-cell *matCellDef="let r">{{ r.carrera }}</td>
        </ng-container>

        <!-- Motivo -->
        <ng-container matColumnDef="motivo">
          <th mat-header-cell *matHeaderCellDef>Actividad</th>
          <td mat-cell *matCellDef="let r">
            <span class="motivo-chip">{{ r.motivoNombre }}</span>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let row; columns: columnas;"></tr>
      </table>

      <!-- PaginaciÃ³n -->
      @if (totalPaginas > 1) {
        <div class="paginacion">
          <span class="pag-info mono">
            {{ paginaActual() * filasPorPagina + 1 }}â€“{{
              finPagina
            }} de {{ registrosFiltrados.length }}
          </span>
          <div class="pag-controls">
            <button mat-icon-button
              [disabled]="paginaActual() === 0"
              (click)="paginaAnterior()">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="pag-current mono">{{ paginaActual() + 1 }} / {{ totalPaginas }}</span>
            <button mat-icon-button
              [disabled]="paginaActual() >= totalPaginas - 1"
              (click)="paginaSiguiente()">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>
  }

  <!-- â”€â”€ EMPTY â”€â”€ -->
  @if (!cargando && registrosFiltrados.length === 0) {
    <div class="empty-state">
      @if (hayFiltrosActivos) {
        <mat-icon>search_off</mat-icon>
        <h3>Sin resultados</h3>
        <p>No se encontraron registros con los filtros aplicados</p>
        <button class="btn-outline" (click)="limpiarFiltros()">
          <mat-icon>filter_alt_off</mat-icon>
          Limpiar filtros
        </button>
      } @else {
        <mat-icon>event_note</mat-icon>
        <h3>No hay registros {{ filtros().rangoFecha === 'hoy' ? 'hoy' : 'en este periodo' }}</h3>
        <p>Los registros aparecerÃ¡n aquÃ­ cuando los alumnos escaneen su credencial</p>
      }
    </div>
  }

</div>
```

## FILE: src\app\features\registros\registros.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  registros.component.scss â€” Stenbrary v3.3            â•‘
// â•‘  Cyan Cube Dark Theme                                 â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

.registros-container {
  height: 100%;
  overflow-y: auto;
  padding: $spacing-lg;
}

// â”€â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-lg;
  animation: slideInDown 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba($teal-400, 0.10);
  border: 1px solid rgba($teal-400, 0.20);
  border-radius: 14px;

  mat-icon {
    font-size: 24px;
    color: $teal-400;
  }
}

h1 {
  margin: 0;
  font-family: $font-display;
  font-size: 1.5rem;
  font-weight: 700;
  color: $text-primary;
}

.header-subtitle {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: $text-muted;
  font-family: $font-mono;
}

.header-actions {
  display: flex;
  gap: $spacing-sm;
}

// â”€â”€â”€ BOTONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: transparent;
  color: $text-secondary;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;

  mat-icon { font-size: 18px; width: 18px; height: 18px; }

  &:hover {
    border-color: $border-glow;
    color: $cyan-400;
    background: rgba($cyan-500, 0.06);
  }
}

// â”€â”€â”€ RANGO TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.rango-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: $spacing-md;
  padding: 4px;
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  animation: slideInUp 400ms 50ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.rango-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px $spacing-md;
  background: transparent;
  border: 1px solid transparent;
  border-radius: $border-radius-md;
  color: $text-muted;
  font-family: $font-body;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 250ms;

  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
  }

  &:hover {
    color: $text-primary;
    background: rgba($cyan-500, 0.04);
  }

  &.active {
    background: rgba($cyan-500, 0.10);
    border-color: rgba($cyan-500, 0.20);
    color: $cyan-400;
    font-weight: 600;
  }
}

// â”€â”€â”€ FILTROS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.filtros-panel {
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  padding: $spacing-md;
  margin-bottom: $spacing-lg;
  animation: slideInUp 400ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  background: $navy-700;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-md;
  padding: 0 $spacing-md;
  margin-bottom: $spacing-md;
  transition: border-color $transition-fast;

  &:focus-within {
    border-color: $cyan-500;
    box-shadow: 0 0 0 2px rgba($cyan-500, 0.10);
  }

  .search-icon {
    color: $text-muted;
    font-size: 20px;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: $text-primary;
    font-family: $font-body;
    font-size: 0.9rem;
    padding: 12px 0;

    &::placeholder { color: $text-muted; }
  }

  .clear-btn {
    background: none;
    border: none;
    color: $text-muted;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    &:hover { color: $text-primary; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
  }
}

.filtros-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.filtro-field {
  min-width: 140px;
  flex: 1;
  max-width: 200px;

  ::ng-deep .mat-mdc-form-field-infix {
    min-height: 40px !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  ::ng-deep .mat-mdc-text-field-wrapper {
    padding: 0 12px !important;
  }
}

.btn-clear-filters {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba($warn-color, 0.08);
  color: $warn-color;
  border: 1px solid rgba($warn-color, 0.20);
  border-radius: $border-radius-md;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;
  mat-icon { font-size: 16px; width: 16px; height: 16px; }
  &:hover { background: rgba($warn-color, 0.14); }
}

// â”€â”€â”€ TABLA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.tabla-container {
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  overflow: hidden;
  animation: slideInUp 400ms 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.registros-table {
  width: 100%;

  .fecha-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .fecha-date {
    font-size: 0.82rem;
    color: $text-secondary;
  }

  .fecha-time {
    font-size: 0.75rem;
    color: $text-muted;
  }

  .matricula-badge {
    display: inline-block;
    padding: 3px 10px;
    background: rgba($cyan-500, 0.10);
    border: 1px solid rgba($cyan-500, 0.20);
    border-radius: 6px;
    color: $cyan-400;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .nombre-cell {
    font-weight: 500;
    color: $text-primary;
  }

  .motivo-chip {
    display: inline-block;
    padding: 3px 12px;
    background: rgba($teal-400, 0.10);
    border: 1px solid rgba($teal-400, 0.15);
    border-radius: 100px;
    color: $teal-400;
    font-size: 0.78rem;
    font-weight: 500;
  }
}

// â”€â”€â”€ PAGINACIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.paginacion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid $border-subtle;
}

.pag-info {
  font-size: 0.8rem;
  color: $text-muted;
}

.pag-controls {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.pag-current {
  font-size: 0.82rem;
  color: $text-secondary;
  min-width: 60px;
  text-align: center;
}

// â”€â”€â”€ ESTADOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xl * 2;
  p { color: $text-muted; font-size: 0.9rem; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xl * 3 $spacing-lg;
  animation: fadeIn 400ms both;

  mat-icon {
    font-size: 56px;
    width: 56px;
    height: 56px;
    color: $navy-600;
  }

  h3 {
    font-size: 1.1rem;
    color: $text-primary;
    margin: 0;
  }

  p {
    color: $text-muted;
    font-size: 0.88rem;
    text-align: center;
    max-width: 360px;
  }
}

// â”€â”€â”€ RESPONSIVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-md;
  }

  .rango-tabs {
    flex-wrap: wrap;
  }

  .rango-tab span {
    display: none;
  }

  .btn-text { display: none; }

  .filtros-row {
    flex-direction: column;
    .filtro-field { max-width: 100%; width: 100%; }
  }

  .registros-table {
    .mat-column-carrera {
      display: none;
    }
  }
}
```

## FILE: src\app\features\registros\registros.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/features/registros/                   â•‘
// â•‘        registros.component.ts                        â•‘
// â•‘  Stenbrary v3.4 â€” Fix exportaciÃ³n CSV                â•‘
// â•‘                                                      â•‘
// â•‘  FIX v3.4:                                           â•‘
// â•‘  - exportarCSV() escapa campos con comas/comillas    â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
import { ReportService, TipoReporte } from '../../core/services/report.service';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Registro, Alumno, Motivo } from '../../core/models';
import { ExportService } from '../../core/services/export.service';

type RangoFecha = 'hoy' | 'semana' | 'mes' | 'todo';

@Component({
  selector: 'app-registros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './registros.component.html',
  styleUrl: './registros.component.scss',
})
export class RegistrosComponent implements OnInit {

  // â”€â”€â”€ DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  todosRegistros: Registro[] = [];
  todosAlumnos: Alumno[] = [];
  motivos: Motivo[] = [];
  cargando = true;

  // â”€â”€â”€ FILTROS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  filtros = signal({
    busqueda: '',
    rangoFecha: 'hoy' as RangoFecha,
    motivo: '',
    carrera: '',
  });

  carrerasUnicas = signal<string[]>([]);

  // â”€â”€â”€ PAGINACIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  paginaActual = signal(0);
  filasPorPagina = 30;

  // â”€â”€â”€ TABLA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  columnas: string[] = ['fechaHora', 'matricula', 'nombre', 'carrera', 'motivo'];

  constructor(
  private databaseService: DatabaseService,
  private toastService: ToastService,
  private exportService: ExportService,
  private reportService: ReportService,   // â† AGREGAR
  private router: Router,
) {}

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  // â”€â”€â”€ CARGA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async cargarDatos(): Promise<void> {
    try {
      this.cargando = true;

      const [registros, alumnos, motivos] = await Promise.all([
        this.databaseService.obtenerTodosLosRegistros(),
        this.databaseService.obtenerTodosLosAlumnos(),
        this.databaseService.obtenerMotivosActivos(),
      ]);

      this.todosRegistros = registros;
      this.todosAlumnos = alumnos;
      this.motivos = motivos;

      const carreras = new Set<string>();
      alumnos.forEach(a => { if (a.carrera) carreras.add(a.carrera); });
      this.carrerasUnicas.set([...carreras].sort());

      this.cargando = false;
    } catch (error) {
      console.error('Error al cargar registros:', error);
      this.cargando = false;
    }
  }

  // â”€â”€â”€ FILTRADO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  get registrosFiltrados(): Registro[] {
    const f = this.filtros();
    let resultado = [...this.todosRegistros];

    const ahora = new Date();
    const inicioHoy = new Date(ahora);
    inicioHoy.setHours(0, 0, 0, 0);

    if (f.rangoFecha === 'hoy') {
      resultado = resultado.filter(r => new Date(r.fechaHora) >= inicioHoy);
    } else if (f.rangoFecha === 'semana') {
      const inicioSemana = new Date(inicioHoy);
      inicioSemana.setDate(inicioSemana.getDate() - 7);
      resultado = resultado.filter(r => new Date(r.fechaHora) >= inicioSemana);
    } else if (f.rangoFecha === 'mes') {
      const inicioMes = new Date(inicioHoy);
      inicioMes.setDate(inicioMes.getDate() - 30);
      resultado = resultado.filter(r => new Date(r.fechaHora) >= inicioMes);
    }

    if (f.busqueda.trim()) {
      const termino = f.busqueda.toLowerCase().trim();
      resultado = resultado.filter(r =>
        r.matricula.toLowerCase().includes(termino) ||
        r.nombreCompleto.toLowerCase().includes(termino)
      );
    }

    if (f.motivo) resultado = resultado.filter(r => r.motivoNombre === f.motivo);
    if (f.carrera) resultado = resultado.filter(r => r.carrera === f.carrera);

    return resultado;
  }

  get registrosPaginados(): Registro[] {
    const inicio = this.paginaActual() * this.filasPorPagina;
    return this.registrosFiltrados.slice(inicio, inicio + this.filasPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.registrosFiltrados.length / this.filasPorPagina);
  }

  get finPagina(): number {
    return Math.min((this.paginaActual() + 1) * this.filasPorPagina, this.registrosFiltrados.length);
  }

  get hayFiltrosActivos(): boolean {
    const f = this.filtros();
    return !!(f.busqueda || f.motivo || f.carrera);
  }

  // â”€â”€â”€ ACCIONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  actualizarFiltro(campo: string, valor: string): void {
    this.filtros.update(f => ({ ...f, [campo]: valor }));
    this.paginaActual.set(0);
  }

  limpiarFiltros(): void {
    this.filtros.set({ busqueda: '', rangoFecha: 'hoy', motivo: '', carrera: '' });
    this.paginaActual.set(0);
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 0) this.paginaActual.update(p => p - 1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas - 1) this.paginaActual.update(p => p + 1);
  }

  // â”€â”€â”€ FORMATO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-MX', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  get etiquetaRango(): string {
    const map: Record<RangoFecha, string> = {
      hoy: 'Hoy',
      semana: 'Ãšltimos 7 dÃ­as',
      mes: 'Ãšltimos 30 dÃ­as',
      todo: 'Todo el historial',
    };
    return map[this.filtros().rangoFecha];
  }

  // â”€â”€â”€ EXPORTAR CSV (FIX v3.4: escapar campos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  exportarCSV(): void {
    const datos = this.registrosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para exportar');
      return;
    }
    this.exportService.exportarRegistrosXLSX(datos);
    this.toastService.success(`${datos.length} registros exportados a Excel`);
  }

  


  generarPDF(): void {
    const datos = this.registrosFiltrados;
    if (datos.length === 0) {
      this.toastService.warning('No hay datos para generar el reporte');
      return;
    }

    const tipoMap: Record<string, TipoReporte> = {
      'hoy': 'diario',
      'semana': 'semanal',
      'mes': 'mensual',
      'todo': 'personalizado',
    };

    const f = this.filtros();
    const tipo = tipoMap[f.rangoFecha] || 'personalizado';

    this.reportService.generarReporteAccesos(datos, {
      tipo,
      filtros: {
        busqueda: f.busqueda || undefined,
        carrera: f.carrera || undefined,
        motivo: f.motivo || undefined,
      },
    });
    this.toastService.success(`Reporte PDF generado (${datos.length} registros)`);
  }



}
```

## FILE: src\app\features\scanner\confirmacion-matricula-dialog\confirmacion-matricula-dialog.component.html
```html
<p>confirmacion-matricula-dialog works!</p>

```

## FILE: src\app\features\scanner\confirmacion-matricula-dialog\confirmacion-matricula-dialog.component.scss
```scss

```

## FILE: src\app\features\scanner\confirmacion-matricula-dialog\confirmacion-matricula-dialog.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  confirmacion-matricula-dialog.component.ts          â•‘
// â•‘  Stenbrary v2.0 â€” Cyan Cube                         â•‘
// â•‘  Solo cambios de estilos. LÃ³gica intacta.           â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirmacion-matricula-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">

      <!-- Ãcono -->
      <div class="dialog-icon">
        <mat-icon>badge</mat-icon>
      </div>

      <!-- TÃ­tulo -->
      <h2 class="dialog-title">Â¿Esta es tu matrÃ­cula?</h2>

      <!-- MatrÃ­cula destacada -->
      <div class="matricula-display">
        {{ data.matricula }}
      </div>

      <!-- Mensaje -->
      <p class="dialog-message">
        Verifica que el cÃ³digo sea correcto antes de continuar.
      </p>

      <!-- Acciones -->
      <div class="dialog-actions">
        <button class="btn-cancel" (click)="cancelar()">
          <mat-icon>close</mat-icon>
          Cancelar
        </button>
        <button class="btn-confirm" (click)="confirmar()">
          <mat-icon>check</mat-icon>
          Confirmar
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* Tokens del design system â€” definidos inline para que el dialog
       funcione correctamente dentro del CDK overlay sin depender
       del SCSS externo */
    :host {
      --navy-800:   #0D1626;
      --navy-700:   #142033;
      --navy-600:   #1C2E47;
      --cyan-500:   #00C8D7;
      --cyan-400:   #22D4E1;
      --teal-500:   #00A99E;
      --border-subtle: rgba(0, 200, 215, 0.10);
      --border-glow:   rgba(0, 200, 215, 0.32);
      --text-primary:   #E8F4F8;
      --text-secondary: rgba(200, 230, 240, 0.65);
      --text-muted:     rgba(160, 200, 215, 0.40);
      --font-display: 'Syne', sans-serif;
      --font-body:    'DM Sans', sans-serif;
      --font-mono:    'Space Mono', monospace;
    }

    .dialog-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 28px 24px 24px;
      background: var(--navy-800);
      color: var(--text-primary);
      border-radius: 18px;
      text-align: center;
    }

    .dialog-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: linear-gradient(135deg,
        rgba(0, 200, 215, 0.15),
        rgba(0, 169, 158, 0.10)
      );
      border: 1px solid var(--border-glow);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px rgba(0, 200, 215, 0.12);
    }

    .dialog-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--cyan-400);
    }

    .dialog-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--text-primary);
      margin: 0;
    }

    .matricula-display {
      width: 100%;
      background: var(--navy-700);
      border: 1px solid var(--border-glow);
      border-radius: 12px;
      padding: 20px 24px;
      font-family: var(--font-mono);
      font-size: 22px;
      font-weight: 700;
      color: var(--cyan-400);
      letter-spacing: 3px;
      box-shadow: inset 0 0 0 1px var(--border-subtle),
                  0 0 20px rgba(0, 200, 215, 0.06);
    }

    .dialog-message {
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0;
    }

    .dialog-actions {
      display: flex;
      gap: 10px;
      width: 100%;
      margin-top: 4px;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
    }

    .btn-cancel,
    .btn-confirm {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 11px 16px;
      border-radius: 10px;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 200ms ease;
    }

    .btn-cancel {
      background: rgba(240, 82, 82, 0.10);
      color: #FC8181;
      border: 1px solid rgba(240, 82, 82, 0.25);
    }

    .btn-cancel:hover {
      background: rgba(240, 82, 82, 0.20);
    }

    .btn-confirm {
      background: linear-gradient(135deg, var(--cyan-500), var(--teal-500));
      color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
    }

    .btn-confirm:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(0, 200, 215, 0.35);
    }

    .btn-cancel mat-icon,
    .btn-confirm mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class ConfirmacionMatriculaDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacionMatriculaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { matricula: string }
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
```

## FILE: src\app\features\scanner\scanner.component.html
```html
<!--
  scanner.component.html
  Stenbrary v3.2 â€” Scanner con acceso de invitados

  NUEVO: SecciÃ³n "Acceso sin credencial" al final,
  para que visitantes externos puedan registrar su entrada.
-->

<div class="scanner-container">

  <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       VISTA PRINCIPAL â€” Tarjetas de acciÃ³n
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
  @if (!escaneando) {
    <div class="scanner-section fade-in">

      <!-- Tarjeta: Escanear cÃ¡mara -->
      <div class="action-card">

        <div class="card-icon-area">
          <div class="card-icon">
            <mat-icon>photo_camera</mat-icon>
          </div>
        </div>

        <div class="card-body">
          <h2 class="card-title">Escanear Credencial</h2>
          <p class="card-desc">
            Coloca el cÃ³digo de barras de tu credencial
            frente a la cÃ¡mara de forma horizontal
          </p>

          <button
            class="btn-scan"
            (click)="iniciarScanner()"
            [disabled]="cargando">
            <mat-icon>barcode_reader</mat-icon>
            Abrir CÃ¡mara y Leer CÃ³digo
          </button>
        </div>

      </div>

      <!-- Separador -->
      <div class="section-divider">
        <span class="divider-label">o ingresa manualmente</span>
      </div>

      <!-- Tarjeta: MatrÃ­cula manual -->
      <div class="action-card">

        <div class="card-body">
          <h2 class="card-title">Â¿Olvidaste tu credencial?</h2>
          <p class="card-desc">Ingresa tu matrÃ­cula directamente</p>

          <div class="input-group">
            <mat-icon class="input-icon">badge</mat-icon>
            <input
              class="matricula-input"
              [(ngModel)]="matriculaManual"
              placeholder="Ingresa tu matrÃ­cula"
              (keyup.enter)="procesarMatriculaManual()"
              [disabled]="cargando"
              type="text"
              autocomplete="off"
              spellcheck="false">
            @if (matriculaManual) {
              <button class="input-clear" (click)="limpiarMatricula()" aria-label="Limpiar">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <button
            class="btn-manual"
            (click)="procesarMatriculaManual()"
            [disabled]="!matriculaManual || cargando">
            <mat-icon>arrow_forward</mat-icon>
            Continuar
          </button>
        </div>

      </div>

      <!-- Separador para invitados -->
      <div class="section-divider">
        <span class="divider-label">Â¿No eres alumno?</span>
      </div>

      <!-- Tarjeta: Acceso sin credencial (invitados) -->
      <div class="action-card guest-card">

        <div class="card-body">
          <div class="guest-header">
            <mat-icon class="guest-icon">person_outline</mat-icon>
            <div>
              <h2 class="card-title">Acceso sin credencial</h2>
              <p class="card-desc">
                Para visitantes, ponentes o personal externo
              </p>
            </div>
          </div>

          <button
            class="btn-guest"
            (click)="accederComoInvitado()"
            [disabled]="cargando">
            <mat-icon>login</mat-icon>
            Continuar como invitado
          </button>
        </div>

      </div>

    </div>
  }

  <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       VISTA SCANNER ACTIVO â€” Video + overlay
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
  @if (escaneando) {
    <div class="video-wrapper fade-in">

      <video #video autoplay playsinline class="scanner-video"></video>

      <canvas #canvas class="scanner-canvas-hidden"></canvas>

      <!-- Overlay visual con frame de cÃ³digo de barras -->
      <div class="scan-overlay">

        <div class="scan-hint top">
          <mat-icon>crop_landscape</mat-icon>
          Coloca el cÃ³digo de barras dentro del Ã¡rea
        </div>

        <div class="barcode-frame">
          <span class="corner tl"></span>
          <span class="corner tr"></span>
          <span class="corner bl"></span>
          <span class="corner br"></span>
          <div class="scan-line"></div>
        </div>

        <div class="scan-hint bottom">
          MantÃ©n la credencial estable y bien iluminada
        </div>

      </div>

      <!-- Controles flotantes -->
      <div class="scanner-controls">

        @if (linternaDisponible) {
          <button
            class="btn-torch"
            [class.active]="linternaActiva"
            (click)="toggleLinterna()"
            aria-label="Linterna">
            <mat-icon>{{ linternaActiva ? 'flashlight_on' : 'flashlight_off' }}</mat-icon>
          </button>
        }

        <button class="btn-cancel" (click)="detenerScanner()" aria-label="Cancelar escaneo">
          <mat-icon>close</mat-icon>
        </button>

      </div>

    </div>
  }

  <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       ESTADOS: Loading y Error
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
  @if (cargando) {
    <div class="state-overlay fade-in">
      <div class="spinner"></div>
      <p class="state-text">Procesando...</p>
    </div>
  }

  @if (error && !cargando) {
    <div class="error-card slide-in-up">
      <mat-icon class="error-icon">error_outline</mat-icon>
      <p class="error-text">{{ error }}</p>
      <button class="btn-retry" (click)="limpiarError()">
        <mat-icon>refresh</mat-icon>
        Reintentar
      </button>
    </div>
  }

</div>
```

## FILE: src\app\features\scanner\scanner.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  scanner.component.scss                              â•‘
// â•‘  Stenbrary v3.2 â€” Scanner + Guest Access             â•‘
// â•‘                                                      â•‘
// â•‘  CAMBIOS vs v2.0:                                    â•‘
// â•‘  - .scanner-controls: contenedor de botones flotantesâ•‘
// â•‘  - .btn-torch: botÃ³n de linterna con estado active   â•‘
// â•‘  - Ajustes responsive para controles                 â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

// â”€â”€â”€ CONTENEDOR PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.scanner-container {
  @include flex-column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: $spacing-xl $spacing-md;
  position: relative;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VISTA PRINCIPAL â€” Tarjetas de acciÃ³n
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
.scanner-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  width: 100%;
  max-width: 520px;
}

// â”€â”€â”€ ACTION CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.action-card {
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  overflow: hidden;
  transition: border-color $transition-normal, box-shadow $transition-normal;

  &:hover {
    border-color: $border-glow;
    box-shadow: 0 0 32px rgba(0, 200, 215, 0.06);
  }
}

.card-icon-area {
  padding: $spacing-xl $spacing-lg $spacing-md;
  display: flex;
  justify-content: center;
}

.card-icon {
  width: 72px;
  height: 72px;
  border-radius: $border-radius-lg;
  background: linear-gradient(135deg,
    rgba(0, 200, 215, 0.15),
    rgba(0, 169, 158, 0.10)
  );
  border: 1px solid $border-glow;
  @include flex-center;
  box-shadow: 0 0 24px rgba(0, 200, 215, 0.12);

  mat-icon {
    font-size: 32px;
    width: 32px;
    height: 32px;
    color: $cyan-400;
  }
}

.card-body {
  padding: $spacing-md $spacing-lg $spacing-xl;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.card-title {
  font-family: $font-display;
  font-size: 18px;
  font-weight: 700;
  color: $text-primary;
  letter-spacing: -0.3px;
  text-align: center;
}

.card-desc {
  font-size: 13px;
  color: $text-secondary;
  text-align: center;
  line-height: 1.6;
  margin: 0;
}

// â”€â”€â”€ BOTÃ“N ESCANEAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.btn-scan {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, $cyan-500, $teal-500);
  color: $navy-950;
  border: none;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: 0 4px 20px rgba(0, 200, 215, 0.25);

  mat-icon {
    font-size: 20px;
    width: 20px;
    height: 20px;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 28px rgba(0, 200, 215, 0.40);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

// â”€â”€â”€ SEPARADOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.section-divider {
  display: flex;
  align-items: center;
  gap: $spacing-md;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $border-subtle;
  }

  .divider-label {
    font-family: $font-mono;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: $text-muted;
    white-space: nowrap;
    padding: 0 $spacing-sm;
  }
}

// â”€â”€â”€ INPUT DE MATRÃCULA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.input-group {
  display: flex;
  align-items: center;
  background: $navy-700;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-md;
  padding: 0 $spacing-md;
  transition: border-color $transition-fast, box-shadow $transition-fast;

  &:focus-within {
    border-color: $border-glow;
    box-shadow: 0 0 0 3px rgba(0, 200, 215, 0.08);
  }

  .input-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
    color: $text-muted;
    flex-shrink: 0;
    margin-right: $spacing-sm;
  }
}

.matricula-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  padding: 14px 0;
  font-family: $font-mono;
  font-size: 14px;
  color: $text-primary;
  letter-spacing: 0.5px;

  &::placeholder {
    color: $text-muted;
    font-family: $font-body;
    font-size: 13px;
    letter-spacing: 0;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: $text-muted;
  padding: 4px;
  border-radius: 50%;
  transition: color $transition-fast, background $transition-fast;
  flex-shrink: 0;

  mat-icon {
    font-size: 16px;
    width: 16px;
    height: 16px;
  }

  &:hover {
    color: $text-secondary;
    background: $navy-600;
  }
}

// â”€â”€â”€ BOTÃ“N MANUAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.btn-manual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  width: 100%;
  padding: 12px;
  background: transparent;
  color: $cyan-400;
  border: 1px solid $border-glow;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
    transition: transform $transition-fast;
  }

  &:hover:not(:disabled) {
    background: rgba(0, 200, 215, 0.08);
    box-shadow: 0 0 20px rgba(0, 200, 215, 0.08);

    mat-icon {
      transform: translateX(3px);
    }
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VISTA SCANNER ACTIVO â€” Video + overlay
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
.video-wrapper {
  position: relative;
  width: 100%;
  max-width: 640px;
  border-radius: $border-radius-xl;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: $navy-950;
  box-shadow: $shadow-lg, 0 0 60px rgba(0, 200, 215, 0.08);
  border: 1px solid $border-subtle;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

// â”€â”€â”€ OVERLAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.scan-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-lg;
  pointer-events: none;
}

// â”€â”€â”€ HINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.scan-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background: rgba(4, 9, 15, 0.75);
  backdrop-filter: blur(8px);
  padding: 6px 14px;
  border-radius: 100px;
  border: 1px solid rgba(255, 255, 255, 0.10);

  mat-icon {
    font-size: 14px;
    width: 14px;
    height: 14px;
    color: $cyan-400;
  }

  &.top { }
  &.bottom { font-size: 11px; opacity: 0.8; }
}

// â”€â”€â”€ BARCODE FRAME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.barcode-frame {
  position: relative;
  width: 65%;
  height: 22%;
  box-shadow: 0 0 0 9999px rgba(4, 9, 15, 0.55);
  border-radius: $border-radius-sm;
  overflow: visible;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid $cyan-500;
  filter: drop-shadow(0 0 4px rgba(0, 200, 215, 0.6));

  &.tl { top: -2px;    left: -2px;  border-right: none; border-bottom: none; border-radius: 4px 0 0 0; }
  &.tr { top: -2px;    right: -2px; border-left: none;  border-bottom: none; border-radius: 0 4px 0 0; }
  &.bl { bottom: -2px; left: -2px;  border-right: none; border-top: none;    border-radius: 0 0 0 4px; }
  &.br { bottom: -2px; right: -2px; border-left: none;  border-top: none;    border-radius: 0 0 4px 0; }
}

.scan-line {
  position: absolute;
  top: 0;
  left: 4px;
  right: 4px;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    $cyan-500 20%,
    $cyan-300 50%,
    $cyan-500 80%,
    transparent
  );
  box-shadow: 0 0 8px $cyan-500, 0 0 16px rgba(0, 200, 215, 0.4);
  animation: scanLine 2s ease-in-out infinite;
}

@keyframes scanLine {
  0%, 100% { top: 0; }
  50%      { top: calc(100% - 2px); }
}

// â”€â”€â”€ CONTROLES FLOTANTES (LINTERNA + CANCELAR) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.scanner-controls {
  position: absolute;
  bottom: $spacing-lg;
  right: $spacing-lg;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  pointer-events: all;
}

// BotÃ³n base flotante (compartido por linterna y cancelar)
%floating-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  @include flex-center;
  transition: all $transition-fast;
  backdrop-filter: blur(8px);
  border: none;

  mat-icon {
    font-size: 20px;
    width: 20px;
    height: 20px;
  }

  &:active {
    transform: scale(0.96);
  }
}

.btn-cancel {
  @extend %floating-btn;
  background: rgba(240, 82, 82, 0.20);
  border: 1px solid rgba(240, 82, 82, 0.40);
  color: #FC8181;

  &:hover {
    background: rgba(240, 82, 82, 0.35);
    transform: scale(1.08);
  }
}

.btn-torch {
  @extend %floating-btn;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.20);
  color: rgba(255, 255, 255, 0.75);

  &:hover {
    background: rgba(255, 255, 255, 0.20);
    transform: scale(1.08);
  }

  // Estado activo â€” linterna encendida
  &.active {
    background: rgba(255, 214, 0, 0.20);
    border-color: rgba(255, 214, 0, 0.50);
    color: #FFD600;
    box-shadow: 0 0 12px rgba(255, 214, 0, 0.25);

    &:hover {
      background: rgba(255, 214, 0, 0.30);
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ESTADOS â€” Loading y Error
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
.state-overlay {
  @include flex-center;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-xxl;
}

.state-text {
  font-family: $font-mono;
  font-size: 12px;
  letter-spacing: 1px;
  color: $text-muted;
  text-transform: uppercase;
}

.error-card {
  @include flex-center;
  flex-direction: column;
  gap: $spacing-md;
  background: rgba(240, 82, 82, 0.08);
  border: 1px solid rgba(240, 82, 82, 0.25);
  border-radius: $border-radius-lg;
  padding: $spacing-xl $spacing-lg;
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.error-icon {
  font-size: 40px !important;
  width: 40px !important;
  height: 40px !important;
  color: #FC8181;
}

.error-text {
  font-size: 14px;
  color: $text-secondary;
  line-height: 1.5;
}

.btn-retry {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  background: transparent;
  border: 1px solid rgba(240, 82, 82, 0.35);
  color: #FC8181;
  padding: 8px 16px;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;

  mat-icon {
    font-size: 16px;
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: rgba(240, 82, 82, 0.12);
  }
}

// â”€â”€â”€ TARJETA DE INVITADO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.guest-card {
  border-style: dashed;
  border-color: rgba(0, 200, 215, 0.15);

  &:hover {
    border-style: solid;
  }
}

.guest-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;

  .guest-icon {
    font-size: 28px;
    width: 28px;
    height: 28px;
    color: $cyan-400;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .card-title {
    text-align: left;
    font-size: 16px;
  }

  .card-desc {
    text-align: left;
    margin: 2px 0 0;
  }
}

.btn-guest {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  width: 100%;
  padding: 12px;
  background: transparent;
  color: $text-secondary;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;

  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
  }

  &:hover:not(:disabled) {
    background: rgba(0, 200, 215, 0.06);
    border-color: $border-glow;
    color: $cyan-400;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RESPONSIVE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
@media (max-width: $breakpoint-sm) {
  .scanner-container {
    padding: $spacing-md $spacing-sm;
    justify-content: flex-start;
    padding-top: $spacing-lg;
  }

  .video-wrapper {
    aspect-ratio: 4 / 3;
  }

  .barcode-frame {
    width: 80%;
    height: 20%;
  }

  .card-body {
    padding: $spacing-md $spacing-md $spacing-lg;
  }

  .scanner-controls {
    bottom: $spacing-md;
    right: $spacing-md;
  }
}

// â”€â”€â”€ CANVAS OCULTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
.scanner-canvas-hidden {
  position: absolute;
  top: -9999px;
  left: -9999px;
  pointer-events: none;
  visibility: hidden;
}
```

## FILE: src\app\features\scanner\scanner.component.ts
```typescript
// ==============================================================================
// RUTA: src/app/features/scanner/scanner.component.ts
// v3.2 â€” Motor de detecciÃ³n DEFINITIVO + Acceso invitados
//
// BUG RESUELTO: RGBLuminanceSource de @zxing/library espera 1 byte/pixel
// (luminancia pura), pero le pasÃ¡bamos 4 bytes/pixel (RGBA del canvas).
// ZXing leÃ­a datos completamente corruptos â†’ nunca decodificaba en Firefox.
// En Chrome funcionaba porque usaba BarcodeDetector nativo, no ZXing.
//
// SOLUCIÃ“N: Usar @zxing/browser's BrowserMultiFormatReader.decodeFromCanvas()
// que maneja la conversiÃ³n RGBA â†’ luminancia internamente de forma correcta.
//
// ARQUITECTURA:
//   Motor 1 â†’ BarcodeDetector nativo (Chrome 83+, Safari 15.4+, Samsung Internet)
//             Acelerado por hardware. Lee directamente del <video>.
//
//   Motor 2 â†’ @zxing/browser BrowserMultiFormatReader.decodeFromCanvas()
//             Para Firefox, Edge, y cualquier navegador sin BarcodeDetector.
//             Maneja la conversiÃ³n de luminancia correctamente.
//             Se combina con preprocesamiento multi-pass en canvas:
//               â€¢ 3 estrategias de filtro (balanced, high-contrast, bright)
//               â€¢ 2 regiones por estrategia (frame completo + ROI central)
//               = 6 intentos por ciclo, 5 ciclos/seg = 30 intentos/seg
//
//   Extras â†’ Linterna (torch), fallback de resoluciÃ³n de cÃ¡mara,
//            mensajes de error en espaÃ±ol, cooldown anti-duplicados.
//
// COMPATIBILIDAD VERIFICADA:
//   âœ… Chrome Android   â€” BarcodeDetector nativo
//   âœ… Firefox Android  â€” @zxing/browser + multi-pass (CORREGIDO)
//   âœ… Safari iOS       â€” BarcodeDetector nativo
//   âœ… Chrome PC        â€” BarcodeDetector nativo
//   âœ… Firefox PC       â€” @zxing/browser + multi-pass
//   âœ… Edge             â€” BarcodeDetector o @zxing/browser fallback
//   âœ… Samsung Internet â€” BarcodeDetector nativo
// ==============================================================================

import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

// @zxing/browser: maneja canvas â†’ luminancia correctamente
import { BrowserMultiFormatReader } from '@zxing/browser';
// @zxing/library: tipos y configuraciÃ³n
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';

import { DatabaseService } from '../../core/services/database.service';
import { ConfirmacionMatriculaDialogComponent } from './confirmacion-matricula-dialog/confirmacion-matricula-dialog.component';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';

// â”€â”€ Constantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MATRICULA_MIN_LENGTH = 5;
const SCAN_INTERVAL_MS     = 200;  // 5 ciclos/segundo

/**
 * Estrategias de preprocesamiento para cÃ¡maras de baja calidad.
 * Se prueban TODAS en cada ciclo. Si una no detecta, otra sÃ­ puede.
 *
 * - balanced:      Para condiciones normales de luz
 * - high-contrast: Para cÃ³digos borrosos o con poco contraste
 * - bright:        Para condiciones de poca luz
 */
const PREPROCESS_STRATEGIES: Array<{ filter: string; label: string }> = [
  { filter: 'grayscale(100%) contrast(160%) brightness(110%)', label: 'balanced' },
  { filter: 'grayscale(100%) contrast(220%) brightness(90%)',  label: 'high-contrast' },
  { filter: 'grayscale(100%) contrast(120%) brightness(130%)', label: 'bright' },
];

/** DeclaraciÃ³n de BarcodeDetector API nativa (no en lib de TypeScript) */
declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
  ],
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.scss'
})
export class ScannerComponent implements OnInit, OnDestroy {

  // â”€â”€ ViewChild refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @ViewChild('video',  { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  // â”€â”€ Estado pÃºblico (template) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  escaneando         = false;
  matriculaManual    = '';
  cargando           = false;
  error: string | null = null;
  ultimoQrEscaneado  = '';
  linternaActiva     = false;
  linternaDisponible = false;

  // â”€â”€ Estado privado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private scannerActivo   = false;
  private mediaStream:    MediaStream | null = null;
  private scanIntervalId: ReturnType<typeof setInterval> | null = null;
  private enCooldown      = false;

  // Motores de detecciÃ³n
  private nativeDetector:   BarcodeDetector | null = null;
  private browserReader:    BrowserMultiFormatReader | null = null;
  private usandoNativo     = false;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private dialog: MatDialog,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private ngZone: NgZone
  ) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LIFECYCLE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  ngOnInit(): void {
    console.log('ðŸ“± ScannerComponent v3.1 â€” Definitive Engine');
    this.detectarCapacidades();
  }

  ngOnDestroy(): void {
    this.detenerScanner();
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // DETECCIÃ“N DE CAPACIDADES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private async detectarCapacidades(): Promise<void> {
    try {
      if ('BarcodeDetector' in window) {
        const formatos = await BarcodeDetector.getSupportedFormats();
        const tieneLineales = formatos.some(f =>
          ['code_128', 'code_39', 'ean_13', 'itf', 'codabar'].includes(f)
        );
        if (tieneLineales) {
          this.usandoNativo = true;
          console.log('âœ… BarcodeDetector nativo disponible:', formatos.join(', '));
          return;
        }
      }
    } catch { /* silenciar */ }
    this.usandoNativo = false;
    console.log('âš ï¸ Sin BarcodeDetector nativo â†’ @zxing/browser multi-pass');
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // INICIAR SCANNER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async iniciarScanner(): Promise<void> {
    try {
      this.error             = null;
      this.cargando          = true;
      this.escaneando        = true;
      this.scannerActivo     = true;
      this.ultimoQrEscaneado = '';
      this.enCooldown        = false;

      // â”€â”€ Inicializar motor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (this.usandoNativo) {
        this.nativeDetector = new BarcodeDetector({
          formats: [
            'code_128', 'code_39', 'ean_13', 'ean_8',
            'itf', 'codabar', 'upc_a', 'upc_e',
            'qr_code', 'data_matrix'
          ]
        });
        console.log('ðŸŸ¢ Motor: BarcodeDetector nativo');
      } else {
        // BrowserMultiFormatReader de @zxing/browser:
        // Maneja RGBA â†’ luminancia internamente de forma correcta.
        const hints = new Map<DecodeHintType, any>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        this.browserReader = new BrowserMultiFormatReader(hints);
        console.log('ðŸŸ¡ Motor: @zxing/browser BrowserMultiFormatReader');
      }

      // â”€â”€ Solicitar cÃ¡mara con fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      this.mediaStream = await this.obtenerCamara();

      // â”€â”€ Conectar video â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setTimeout(() => {
        const video = this.videoElement?.nativeElement;
        if (!video) return;

        video.srcObject = this.mediaStream!;
        video.play().catch(() => {});

        video.onloadeddata = () => {
          this.cargando = false;
          console.log(`ðŸ“¹ CÃ¡mara: ${video.videoWidth}Ã—${video.videoHeight}`);
          this.toastService.info('Scanner activo â€” apunta al cÃ³digo de barras');
          this.detectarLinterna();
          this.iniciarLoop();
        };
      }, 150);

    } catch (err: any) {
      console.error('âŒ Error al iniciar scanner:', err);
      this.error         = this.interpretarErrorCamara(err);
      this.cargando      = false;
      this.escaneando    = false;
      this.scannerActivo = false;
      this.toastService.error(this.error || 'Error al iniciar el scanner');
    }
  }

  /**
   * Intenta obtener la cÃ¡mara con resoluciÃ³n progresivamente menor.
   * CÃ¡maras viejas o restrictas pueden fallar con HD â†’ fallback a SD â†’ a lo que sea.
   */
  private async obtenerCamara(): Promise<MediaStream> {
    const intentos: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 },  height: { ideal: 480 } } },
      { video: true },
    ];

    for (let i = 0; i < intentos.length; i++) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(intentos[i]);
        if (i > 0) console.log(`ðŸ“· Usando fallback de resoluciÃ³n #${i + 1}`);
        return stream;
      } catch (err: any) {
        if (err.name === 'OverconstrainedError' && i < intentos.length - 1) {
          console.warn(`âš ï¸ Constraints #${i + 1} no soportados, reintentando...`);
          continue;
        }
        throw err;
      }
    }
    throw new Error('No se pudo acceder a ninguna cÃ¡mara');
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LINTERNA (TORCH)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private async detectarLinterna(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      const caps = track.getCapabilities?.() as any;
      this.linternaDisponible = caps?.torch === true;
      if (this.linternaDisponible) console.log('ðŸ”¦ Linterna disponible');
    } catch {
      this.linternaDisponible = false;
    }
  }

  async toggleLinterna(): Promise<void> {
    try {
      const track = this.mediaStream?.getVideoTracks()[0];
      if (!track) return;
      this.linternaActiva = !this.linternaActiva;
      await track.applyConstraints({ advanced: [{ torch: this.linternaActiva } as any] });
    } catch {
      this.linternaActiva = false;
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LOOP DE DETECCIÃ“N
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private iniciarLoop(): void {
    this.scanIntervalId = setInterval(() => {
      if (!this.scannerActivo || this.enCooldown) return;

      if (this.usandoNativo) {
        this.detectarConNativo();
      } else {
        this.detectarConZXingBrowser();
      }
    }, SCAN_INTERVAL_MS);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MOTOR 1: BarcodeDetector nativo (Chrome, Safari, Samsung Internet)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private async detectarConNativo(): Promise<void> {
    const video = this.videoElement?.nativeElement;
    if (!video || !this.nativeDetector || video.readyState < 2) return;

    try {
      const resultados = await this.nativeDetector.detect(video);
      for (const barcode of resultados) {
        const texto = barcode.rawValue.trim();
        if (this.esMatriculaValida(texto)) {
          this.procesarDeteccion(texto, `nativo:${barcode.format}`);
          return;
        }
      }
    } catch (err: any) {
      if (err.name !== 'InvalidStateError') {
        console.warn('BarcodeDetector error:', err.message);
      }
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MOTOR 2: @zxing/browser con multi-pass preprocessing
  //
  // CLAVE: BrowserMultiFormatReader.decodeFromCanvas() maneja
  // internamente la conversiÃ³n RGBA â†’ luminancia de forma correcta.
  // Nosotros solo nos encargamos del preprocesamiento visual
  // (grayscale, contraste, brillo) y del recorte ROI.
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private detectarConZXingBrowser(): void {
    const video  = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas || !this.browserReader || video.readyState < 2) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const vw  = video.videoWidth  || 640;
    const vh  = video.videoHeight || 480;

    for (const strategy of PREPROCESS_STRATEGIES) {

      // â”€â”€ PASO A: Frame completo con preprocesamiento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      canvas.width  = vw;
      canvas.height = vh;
      ctx.filter = strategy.filter;
      ctx.drawImage(video, 0, 0, vw, vh);
      ctx.filter = 'none';

      const fullResult = this.intentarDecodeCanvas(canvas);
      if (fullResult) {
        this.procesarDeteccion(fullResult, `zxing:${strategy.label}:full`);
        return;
      }

      // â”€â”€ PASO B: ROI central (70% ancho, 30% alto) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Coincide con la posiciÃ³n del barcode-frame del overlay visual.
      // Recortar reduce ruido y mejora precisiÃ³n en cÃ¡maras malas.
      const roiX = Math.floor(vw * 0.15);
      const roiY = Math.floor(vh * 0.35);
      const roiW = Math.floor(vw * 0.70);
      const roiH = Math.floor(vh * 0.30);

      canvas.width  = roiW;
      canvas.height = roiH;
      ctx.filter = strategy.filter;
      ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);
      ctx.filter = 'none';

      const roiResult = this.intentarDecodeCanvas(canvas);
      if (roiResult) {
        this.procesarDeteccion(roiResult, `zxing:${strategy.label}:roi`);
        return;
      }
    }

    // â”€â”€ PASO C: Frame sin filtro (por si ctx.filter no funciona) â”€â”€â”€
    // Algunos navegadores viejos o WebViews no soportan ctx.filter.
    // Intentamos una pasada sin filtro como Ãºltimo recurso.
    canvas.width  = vw;
    canvas.height = vh;
    ctx.filter = 'none';
    ctx.drawImage(video, 0, 0, vw, vh);

    const rawResult = this.intentarDecodeCanvas(canvas);
    if (rawResult) {
      this.procesarDeteccion(rawResult, 'zxing:raw:full');
    }
  }

  /**
   * Intenta decodificar el contenido actual del canvas usando
   * BrowserMultiFormatReader.decodeFromCanvas().
   *
   * Este mÃ©todo internamente:
   * 1. Lee ImageData del canvas
   * 2. Convierte RGBA â†’ luminancia correctamente
   * 3. Crea BinaryBitmap con HybridBinarizer
   * 4. Decodifica con MultiFormatReader
   *
   * Retorna el texto del cÃ³digo o null si no encontrÃ³ nada.
   */
  private intentarDecodeCanvas(canvas: HTMLCanvasElement): string | null {
    try {
      const result = this.browserReader!.decodeFromCanvas(canvas);
      if (result) {
        const texto = result.getText().trim();
        if (this.esMatriculaValida(texto)) return texto;
      }
    } catch (e: any) {
      // NotFoundException es normal â€” significa que no encontrÃ³ cÃ³digo en este frame
      if (!(e instanceof NotFoundException) && e?.name !== 'NotFoundException') {
        // Solo logear errores reales, no "no encontrado"
        if (e?.message && !e.message.includes('No MultiFormat Readers')) {
          console.warn('ZXing decode error:', e.message);
        }
      }
    }
    return null;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PROCESAMIENTO DE RESULTADO
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private esMatriculaValida(texto: string): boolean {
    return /^\d+$/.test(texto) && texto.length >= MATRICULA_MIN_LENGTH;
  }

  private procesarDeteccion(texto: string, fuente: string): void {
    if (texto === this.ultimoQrEscaneado || this.enCooldown) return;

    this.ultimoQrEscaneado = texto;
    this.enCooldown = true;
    console.log(`âœ… Detectado [${fuente}]: ${texto}`);

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    this.detenerScanner();
    this.ngZone.run(() => {
      this.toastService.success(`CÃ³digo detectado: ${texto}`);
      this.mostrarConfirmacionMatricula(texto);
    });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // DETENER SCANNER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  detenerScanner(): void {
    console.log('ðŸ”´ Deteniendo scanner...');
    this.scannerActivo = false;

    if (this.scanIntervalId !== null) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    if (this.linternaActiva) {
      const track = this.mediaStream?.getVideoTracks()[0];
      track?.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
      this.linternaActiva = false;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    this.nativeDetector     = null;
    this.browserReader      = null;
    this.escaneando         = false;
    this.linternaDisponible = false;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CONFIRMACIÃ“N Y NAVEGACIÃ“N
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private mostrarConfirmacionMatricula(matricula: string): void {
    const dialogRef = this.dialog.open(ConfirmacionMatriculaDialogComponent, {
      width: '350px',
      data: { matricula },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.procesarMatricula(matricula);
      } else {
        this.toastService.warning('Escaneo cancelado');
        this.ultimoQrEscaneado = '';
        this.enCooldown = false;
      }
    });
  }

  async procesarMatriculaManual(): Promise<void> {
    if (!this.matriculaManual.trim()) {
      this.toastService.warning('Por favor ingresa una matrÃ­cula');
      return;
    }
    this.mostrarConfirmacionMatricula(this.matriculaManual.trim());
  }

  private async procesarMatricula(matricula: string): Promise<void> {
    try {
      this.cargando = true;
      this.error    = null;
      this.loadingService.show('Buscando alumno...');

      const alumno = await this.databaseService.obtenerAlumnoPorMatricula(matricula);
      this.loadingService.hide();

      if (alumno) {
        if (!alumno.activo) {
          this.toastService.error('Esta credencial estÃ¡ inactiva. Contacta a la biblioteca.');
          this.cargando   = false;
          this.enCooldown = false;
          return;
        }
        this.toastService.success(`Â¡Bienvenido ${alumno.nombre}!`);
        sessionStorage.setItem('alumnoActual', JSON.stringify(alumno));
        this.router.navigate(['/seleccion-motivo']);
      } else {
        this.toastService.info('Alumno no registrado. Procede a registrarlo');
        sessionStorage.setItem('matriculaTemp', matricula);
        this.router.navigate(['/registro-alumno']);
      }
      this.cargando   = false;
      this.enCooldown = false;
    } catch (err) {
      console.error('Error al procesar matrÃ­cula:', err);
      this.error      = 'Error al procesar la matrÃ­cula';
      this.cargando   = false;
      this.enCooldown = false;
      this.loadingService.hide();
      this.toastService.error('Error al procesar. Intenta de nuevo.');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // UTILIDADES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  limpiarError(): void { this.error = null; }

  limpiarMatricula(): void {
    this.matriculaManual = '';
    this.error = null;
  }

  irAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Acceso sin credencial â€” para visitantes, ponentes, personal externo.
   * Crea un alumno "invitado" temporal en sessionStorage y navega
   * a selecciÃ³n de motivo. El registro se crea con matricula 'INVITADO'.
   */
  accederComoInvitado(): void {
    const invitado = {
      id: 'invitado-' + Date.now(),
      matricula: 'INVITADO',
      nombre: 'Visitante',
      apellidoPaterno: 'Externo',
      apellidoMaterno: '',
      carrera: 'Visitante',
      activo: true,
      esInvitado: true
    };

    sessionStorage.setItem('alumnoActual', JSON.stringify(invitado));
    this.toastService.info('Acceso como invitado â€” selecciona tu actividad');
    this.router.navigate(['/seleccion-motivo']);
  }

  private interpretarErrorCamara(err: any): string {
    switch (err?.name || '') {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Permiso de cÃ¡mara denegado. Revisa la configuraciÃ³n del navegador.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No se encontrÃ³ una cÃ¡mara en este dispositivo.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'La cÃ¡mara estÃ¡ en uso por otra app. CiÃ©rrala e intenta de nuevo.';
      case 'OverconstrainedError':
        return 'La cÃ¡mara no soporta la configuraciÃ³n solicitada.';
      case 'SecurityError':
        return 'CÃ¡mara bloqueada. AsegÃºrate de usar HTTPS.';
      default:
        return err?.message || 'No se pudo acceder a la cÃ¡mara.';
    }
  }
}
```

## FILE: src\app\features\seleccion-motivo\seleccion-motivo.component.html
```html
<!-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
     â•‘  seleccion-motivo.component.html                     â•‘
     â•‘  Stenbrary v3.2 â€” Two-Panel + Toggle + Guest         â•‘
     â•‘                                                      â•‘
     â•‘  CAMBIOS v3.2:                                       â•‘
     â•‘  - "MatrÃ­cula incorrecta" siempre visible            â•‘
     â•‘  - Toggle: clic en mismo motivo deselecciona         â•‘
     â•‘  - Badge de invitado                                 â•‘
     â•‘  - DescripciÃ³n visible en cards                      â•‘
     â•‘  - AnimaciÃ³n de Ã©xito mejorada con lottie-like CSS   â•‘
     â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->

<div class="seleccion-container" [class.exito-mode]="registroExitoso">

  <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       PANTALLA DE Ã‰XITO (overlay animado)
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
  @if (registroExitoso) {
    <div class="exito-overlay">
      <div class="exito-content">

        <!-- Rings animados -->
        <div class="exito-rings">
          <div class="ring ring-1"></div>
          <div class="ring ring-2"></div>
          <div class="ring ring-3"></div>
          <div class="exito-check">
            <svg viewBox="0 0 52 52" class="checkmark-svg">
              <circle class="checkmark-circle" cx="26" cy="26" r="24" fill="none"/>
              <path class="checkmark-path" fill="none" d="M14 27l8 8 16-16"/>
            </svg>
          </div>
        </div>

        <h1 class="exito-titulo">Â¡Registro Exitoso!</h1>

        <div class="exito-info" *ngIf="alumno">
          <p class="exito-nombre">{{ obtenerNombreCorto() }}</p>
          <p class="exito-detalle">
            @if (!esInvitado) {
              {{ alumno.matricula }} Â·
            }
            {{ motivoSeleccionado?.nombre }}
          </p>
        </div>

        <div class="exito-loader">
          <div class="exito-progress-bar">
            <div class="exito-progress-fill"></div>
          </div>
          <span>Redirigiendo al scanner...</span>
        </div>
      </div>
    </div>
  }

  <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       LAYOUT PRINCIPAL â€” DOS PANELES
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
  @if (!registroExitoso) {
    <div class="seleccion-layout">

      <!-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
           PANEL IZQUIERDO: Info del alumno + ConfirmaciÃ³n
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <aside class="panel-info" [class.has-selection]="motivoSeleccionado">

        <!-- Tarjeta del alumno -->
        <div class="student-card" *ngIf="alumno">
          <div class="student-avatar" [class.guest]="esInvitado">
            <mat-icon>{{ esInvitado ? 'person_outline' : 'person' }}</mat-icon>
          </div>
          <div class="student-details">
            <h3 class="student-name">{{ obtenerNombreCorto() }}</h3>
            @if (!esInvitado) {
              <span class="student-matricula">{{ alumno.matricula }}</span>
              <span class="student-carrera">{{ alumno.carrera }}</span>
            } @else {
              <span class="student-guest-badge">Visitante sin credencial</span>
            }
          </div>
        </div>

        <!-- Link: matrÃ­cula incorrecta â€” SIEMPRE visible (sin necesidad de seleccionar) -->
        @if (!esInvitado) {
          <button class="link-rescan" (click)="volverAEscanear()" [disabled]="registrando">
            <mat-icon>qr_code_scanner</mat-icon>
            <span>Â¿MatrÃ­cula incorrecta? Volver a escanear</span>
          </button>
        }

        <!-- Estado: Esperando selecciÃ³n -->
        @if (!motivoSeleccionado && !cargandoMotivos) {
          <div class="waiting-state">
            <div class="waiting-icon">
              <mat-icon>touch_app</mat-icon>
            </div>
            <p class="waiting-text">Selecciona una actividad</p>
            <p class="waiting-hint">Tu acceso se registrarÃ¡ al confirmar</p>
          </div>
        }

        <!-- Panel de confirmaciÃ³n (motivo seleccionado) -->
        @if (motivoSeleccionado) {
          <div class="confirm-panel">

            <!-- Motivo seleccionado -->
            <div class="confirm-motivo">
              <div class="confirm-icon">
                <mat-icon [style.color]="motivoSeleccionado.color || '#00C8D7'">
                  {{ motivoSeleccionado.icono }}
                </mat-icon>
              </div>
              <div class="confirm-details">
                <h3>{{ motivoSeleccionado.nombre }}</h3>
                @if (motivoSeleccionado.descripcion) {
                  <p class="confirm-desc">{{ motivoSeleccionado.descripcion }}</p>
                }
              </div>
            </div>

            <!-- Pregunta de confirmaciÃ³n -->
            <div class="confirm-question">
              <mat-icon>help_outline</mat-icon>
              <span>
                Â¿Registrar actividad
                <strong>"{{ motivoSeleccionado.nombre }}"</strong>
                para <strong>{{ obtenerNombreCorto() }}</strong>?
              </span>
            </div>

            <!-- BotÃ³n principal de registro -->
            <button
              class="btn-registrar"
              (click)="confirmarRegistro()"
              [disabled]="registrando">
              @if (!registrando) {
                <mat-icon>check_circle</mat-icon>
                <span>Registrar Actividad</span>
              } @else {
                <mat-spinner diameter="20"></mat-spinner>
                <span>Registrando...</span>
              }
            </button>

            <!-- Links secundarios -->
            <button class="link-action" (click)="deseleccionarMotivo()" [disabled]="registrando">
              <mat-icon>swap_horiz</mat-icon>
              Cambiar actividad
            </button>

          </div>
        }

        <!-- BotÃ³n cancelar (siempre visible en desktop) -->
        <button class="btn-cancelar-desktop" (click)="cancelar()">
          <mat-icon>close</mat-icon>
          Cancelar registro
        </button>

      </aside>

      <!-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
           PANEL DERECHO: Grid de motivos/actividades
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <main class="panel-motivos">

        <!-- Header -->
        <div class="motivos-header">
          <button mat-icon-button class="back-button" (click)="cancelar()">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-text">
            <h1>Â¿Para quÃ© vienes?</h1>
            <p class="subtitle" *ngIf="alumno">
              {{ obtenerNombreCorto() }} â€” selecciona tu actividad
            </p>
          </div>
        </div>

        <!-- Mobile: link de matrÃ­cula incorrecta -->
        @if (!esInvitado) {
          <button class="mobile-rescan-link" (click)="volverAEscanear()" [disabled]="registrando">
            <mat-icon>qr_code_scanner</mat-icon>
            Â¿MatrÃ­cula incorrecta? Volver a escanear
          </button>
        }

        <!-- Loading -->
        @if (cargandoMotivos) {
          <div class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Cargando actividades...</p>
          </div>
        }

        <!-- Grid de motivos -->
        @if (!cargandoMotivos && !error) {
          <div class="motivos-grid">
            @for (motivo of motivos; track motivo.id; let i = $index) {
              <div
                class="motivo-card"
                [class.selected]="motivoSeleccionado?.id === motivo.id"
                [class.dimmed]="motivoSeleccionado && motivoSeleccionado.id !== motivo.id"
                (click)="seleccionarMotivo(motivo)"
                matRipple>

                <div class="motivo-icon-wrap">
                  <mat-icon [style.color]="motivo.color || '#00C8D7'">
                    {{ motivo.icono || 'help' }}
                  </mat-icon>
                </div>

                <span class="motivo-nombre">{{ motivo.nombre }}</span>

                @if (motivo.descripcion) {
                  <span class="motivo-desc-hint">{{ motivo.descripcion }}</span>
                }

                <!-- Indicador de seleccionado -->
                @if (motivoSeleccionado?.id === motivo.id) {
                  <div class="selected-badge">
                    <mat-icon>check</mat-icon>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Error -->
        @if (error && !cargandoMotivos) {
          <div class="error-state">
            <mat-icon>error_outline</mat-icon>
            <p>{{ error }}</p>
            <button mat-raised-button color="primary" (click)="cargarMotivos()">
              <mat-icon>refresh</mat-icon>
              Reintentar
            </button>
          </div>
        }

      </main>

    </div>

    <!-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
         MOBILE: Bottom sheet de confirmaciÃ³n
    â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    @if (motivoSeleccionado) {
      <div class="mobile-backdrop" (click)="deseleccionarMotivo()"></div>
      <div class="mobile-confirm-sheet">
        <div class="sheet-handle"></div>

        <div class="sheet-motivo">
          <div class="sheet-motivo-icon">
            <mat-icon [style.color]="motivoSeleccionado.color || '#00C8D7'">
              {{ motivoSeleccionado.icono }}
            </mat-icon>
          </div>
          <div class="sheet-motivo-info">
            <h3>{{ motivoSeleccionado.nombre }}</h3>
            @if (motivoSeleccionado.descripcion) {
              <p>{{ motivoSeleccionado.descripcion }}</p>
            }
          </div>
        </div>

        <div class="sheet-question">
          Â¿Registrar <strong>"{{ motivoSeleccionado.nombre }}"</strong>
          para <strong>{{ obtenerNombreCorto() }}</strong>?
        </div>

        <div class="sheet-actions">
          <button class="sheet-btn-cancel" (click)="deseleccionarMotivo()" [disabled]="registrando">
            <mat-icon>close</mat-icon>
            Cancelar
          </button>
          <button class="sheet-btn-confirm" (click)="confirmarRegistro()" [disabled]="registrando">
            @if (!registrando) {
              <mat-icon>check</mat-icon>
              <span>Registrar</span>
            } @else {
              <mat-spinner diameter="18"></mat-spinner>
              <span>...</span>
            }
          </button>
        </div>

        @if (!esInvitado) {
          <button class="sheet-link" (click)="volverAEscanear()" [disabled]="registrando">
            Â¿MatrÃ­cula incorrecta? Volver a escanear
          </button>
        }
      </div>
    }
  }

</div>
```

## FILE: src\app\features\seleccion-motivo\seleccion-motivo.component.scss
```scss
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  seleccion-motivo.component.scss                     â•‘
// â•‘  Stenbrary v3.2 â€” Two-Panel + Toggle + Guest         â•‘
// â•‘                                                      â•‘
// â•‘  FIXES v3.2:                                         â•‘
// â•‘  - Scroll eliminado (height en vez de min-height)    â•‘
// â•‘  - DescripciÃ³n visible en mobile                     â•‘
// â•‘  - AnimaciÃ³n de Ã©xito con SVG checkmark + rings      â•‘
// â•‘  - Badge de invitado                                 â•‘
// â•‘  - Link "matrÃ­cula incorrecta" siempre visible       â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@import '../../../styles/variables';
@import '../../../styles/mixins';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONTAINER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.seleccion-container {
  height: 100%;
  background: transparent;
  overflow: hidden;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYOUT â€” DOS PANELES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.seleccion-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  height: 100%;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
    height: auto;
    overflow-y: auto;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PANEL IZQUIERDO â€” Info + ConfirmaciÃ³n
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.panel-info {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-lg;
  background: $navy-950;
  border-right: 1px solid $border-subtle;
  height: 100%;
  overflow-y: auto;

  @media (max-width: $breakpoint-md) {
    display: none;
  }
}

// â€” Tarjeta del alumno â€”

.student-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;

  .student-avatar {
    @include flex-center;
    width: 48px;
    height: 48px;
    background: rgba(0, 200, 215, 0.10);
    border: 1px solid $border-glow;
    border-radius: $border-radius-md;
    flex-shrink: 0;

    mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
      color: $cyan-400;
    }

    &.guest {
      background: rgba(245, 166, 35, 0.08);
      border-color: rgba(245, 166, 35, 0.25);

      mat-icon {
        color: $amber-color;
      }
    }
  }

  .student-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .student-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .student-matricula {
    font-family: $font-mono;
    font-size: 0.8rem;
    color: $cyan-400;
    letter-spacing: 0.5px;
  }

  .student-carrera {
    font-size: 0.75rem;
    color: $text-muted;
  }

  .student-guest-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    background: rgba(245, 166, 35, 0.10);
    border: 1px solid rgba(245, 166, 35, 0.25);
    border-radius: 100px;
    font-size: 0.7rem;
    color: $amber-color;
    font-weight: 500;
  }
}

// â€” Link de matrÃ­cula incorrecta â€” SIEMPRE visible â€”

.link-rescan {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba($amber-color, 0.04);
  border: 1px solid rgba($amber-color, 0.12);
  border-radius: $border-radius-md;
  padding: 8px 12px;
  font-family: $font-body;
  font-size: 0.78rem;
  color: rgba($amber-color, 0.7);
  cursor: pointer;
  transition: all 200ms;

  mat-icon {
    font-size: 16px;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: rgba($amber-color, 0.08);
    color: $amber-color;
    border-color: rgba($amber-color, 0.25);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// â€” Estado esperando selecciÃ³n â€”

.waiting-state {
  @include flex-center;
  flex-direction: column;
  flex: 1;
  text-align: center;
  padding: $spacing-lg;
  gap: $spacing-sm;

  .waiting-icon {
    @include flex-center;
    width: 72px;
    height: 72px;
    background: rgba(0, 200, 215, 0.06);
    border: 1px dashed rgba(0, 200, 215, 0.20);
    border-radius: 50%;

    mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: $text-muted;
      animation: pulseGlow 2.5s ease-in-out infinite;
    }
  }

  .waiting-text {
    font-size: 0.95rem;
    color: $text-secondary;
    margin: 0;
    font-weight: 500;
  }

  .waiting-hint {
    font-size: 0.78rem;
    color: $text-muted;
    margin: 0;
  }
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 0.8; transform: scale(1.05); }
}

// â€” Panel de confirmaciÃ³n â€”

.confirm-panel {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  flex: 1;
  animation: slideInLeft 350ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); filter: blur(4px); }
  to   { opacity: 1; transform: translateX(0); filter: blur(0); }
}

.confirm-motivo {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $navy-800;
  border: 1px solid $border-glow;
  border-radius: $border-radius-lg;
  box-shadow: 0 0 20px rgba(0, 200, 215, 0.06);

  .confirm-icon {
    @include flex-center;
    width: 48px;
    height: 48px;
    background: rgba(0, 200, 215, 0.10);
    border: 1px solid $border-glow;
    border-radius: $border-radius-md;
    flex-shrink: 0;

    mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
  }

  .confirm-details {
    min-width: 0;

    h3 {
      margin: 0 0 4px;
      font-size: 1.05rem;
      font-weight: 700;
      color: $text-primary;
    }

    .confirm-desc {
      margin: 0;
      font-size: 0.78rem;
      color: $text-secondary;
      line-height: 1.45;
    }
  }
}

.confirm-question {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: rgba(0, 200, 215, 0.04);
  border: 1px solid $border-subtle;
  border-radius: $border-radius-md;
  font-size: 0.82rem;
  color: $text-secondary;
  line-height: 1.5;

  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
    color: $cyan-500;
    margin-top: 1px;
    flex-shrink: 0;
  }

  strong {
    color: $cyan-400;
  }
}

// â€” BotÃ³n registrar â€”

.btn-registrar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px 24px;
  background: linear-gradient(135deg, $cyan-500, $teal-400);
  color: $navy-950;
  border: none;
  border-radius: $border-radius-md;
  font-family: $font-body;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 200ms ease;
  box-shadow: 0 4px 20px rgba(0, 200, 215, 0.30);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0, 200, 215, 0.40);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  mat-icon {
    font-size: 20px;
    width: 20px;
    height: 20px;
  }

  mat-spinner {
    display: inline-block;
  }
}

// â€” Link de cambiar actividad â€”

.link-action {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-family: $font-body;
  font-size: 0.78rem;
  color: $text-muted;
  cursor: pointer;
  padding: 4px 0;
  transition: color 200ms;

  mat-icon {
    font-size: 16px;
    width: 16px;
    height: 16px;
  }

  &:hover:not(:disabled) {
    color: $cyan-400;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// â€” BotÃ³n cancelar desktop â€”

.btn-cancelar-desktop {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: auto;
  padding: 10px;
  background: rgba($warn-color, 0.06);
  border: 1px solid rgba($warn-color, 0.15);
  border-radius: $border-radius-md;
  color: rgba($warn-color, 0.6);
  font-family: $font-body;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 200ms;

  mat-icon {
    font-size: 16px;
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: rgba($warn-color, 0.12);
    color: $warn-color;
    border-color: rgba($warn-color, 0.3);
  }

  @media (max-width: $breakpoint-md) {
    display: none;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PANEL DERECHO â€” Grid de motivos
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.panel-motivos {
  display: flex;
  flex-direction: column;
  padding: $spacing-lg;
  height: 100%;
  overflow-y: auto;

  @media (max-width: $breakpoint-md) {
    height: auto;
    overflow: visible;
    padding-bottom: 200px;
  }
}

.motivos-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
  flex-shrink: 0;

  .back-button {
    background: $navy-700;
    color: $text-primary;
    border: 1px solid $border-subtle;
    transition: all $transition-fast;

    &:hover {
      background: $navy-600;
      border-color: $border-glow;
    }

    @media (min-width: $breakpoint-md) {
      display: none;
    }
  }

  .header-text {
    h1 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 800;
      color: $text-primary;

      @media (min-width: $breakpoint-md) {
        font-size: 1.6rem;
      }
    }

    .subtitle {
      margin: 2px 0 0;
      font-size: 0.82rem;
      color: $text-secondary;
    }
  }
}

// Mobile rescan link
.mobile-rescan-link {
  display: none;

  @media (max-width: $breakpoint-md) {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba($amber-color, 0.04);
    border: 1px solid rgba($amber-color, 0.12);
    border-radius: $border-radius-md;
    padding: 8px 12px;
    margin-bottom: $spacing-md;
    font-family: $font-body;
    font-size: 0.78rem;
    color: rgba($amber-color, 0.7);
    cursor: pointer;
    transition: all 200ms;
    flex-shrink: 0;

    mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    &:hover:not(:disabled) {
      background: rgba($amber-color, 0.08);
      color: $amber-color;
    }

    &:disabled { opacity: 0.4; }
  }
}

// â€” Grid â€”

.motivos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: $spacing-md;
  align-content: start;

  @media (max-width: $breakpoint-sm) {
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-sm;
  }
}

// â€” Motivo card â€”

.motivo-card {
  position: relative;
  @include flex-center;
  flex-direction: column;
  gap: 6px;
  padding: $spacing-md $spacing-sm;
  background: $navy-800;
  border: 1px solid $border-subtle;
  border-radius: $border-radius-lg;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
  animation: revealUp 450ms cubic-bezier(0.16, 1, 0.3, 1) both;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  @for $i from 1 through 16 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 50}ms;
    }
  }

  .motivo-icon-wrap {
    @include flex-center;
    width: 56px;
    height: 56px;
    background: rgba(0, 200, 215, 0.08);
    border: 1px solid $border-subtle;
    border-radius: $border-radius-lg;
    transition: all 250ms;

    mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      transition: all 250ms;
    }
  }

  .motivo-nombre {
    text-align: center;
    font-weight: 600;
    font-size: 0.85rem;
    color: $text-primary;
    line-height: 1.25;
  }

  // DescripciÃ³n â€” visible en todas las resoluciones
  .motivo-desc-hint {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-align: center;
    font-size: 0.68rem;
    color: $text-muted;
    line-height: 1.3;
    max-width: 100%;
    padding: 0 4px;
  }

  &:hover:not(.selected) {
    border-color: rgba(0, 200, 215, 0.25);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);

    .motivo-icon-wrap {
      background: rgba(0, 200, 215, 0.12);
      border-color: rgba(0, 200, 215, 0.25);

      mat-icon {
        transform: scale(1.08);
      }
    }
  }

  &.selected {
    border-color: $border-glow;
    background: rgba(0, 200, 215, 0.06);
    box-shadow: 0 0 28px rgba(0, 200, 215, 0.10), 0 8px 24px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);

    .motivo-icon-wrap {
      background: rgba(0, 200, 215, 0.15);
      border-color: $border-glow;
      box-shadow: 0 0 16px rgba(0, 200, 215, 0.15);
    }

    .motivo-nombre {
      color: $cyan-400;
    }
  }

  &.dimmed {
    opacity: 0.45;
    transform: scale(0.97);

    &:hover {
      opacity: 0.7;
      transform: scale(1);
    }
  }
}

// â€” Badge de seleccionado â€”

.selected-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  @include flex-center;
  width: 24px;
  height: 24px;
  background: $cyan-500;
  border-radius: 50%;
  animation: scaleIn 250ms cubic-bezier(0.68, -0.55, 0.27, 1.55) both;

  mat-icon {
    font-size: 14px;
    width: 14px;
    height: 14px;
    color: $navy-950;
  }
}

// â€” Loading & Error states â€”

.loading-state {
  @include flex-center;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-xxl;
  color: $text-secondary;
}

.error-state {
  @include flex-center;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-xxl;

  mat-icon {
    font-size: 3rem;
    width: 3rem;
    height: 3rem;
    color: $warn-color;
  }

  p {
    color: $text-secondary;
    font-size: 1rem;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MOBILE â€” Bottom sheet de confirmaciÃ³n
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.mobile-backdrop,
.mobile-confirm-sheet {
  display: none;

  @media (max-width: $breakpoint-md) {
    display: block;
  }
}

.mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 90;
  animation: fadeIn 200ms ease both;
}

.mobile-confirm-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 91;
  background: $navy-800;
  border-top: 1px solid $border-glow;
  border-radius: 24px 24px 0 0;
  padding: $spacing-sm $spacing-lg $spacing-lg;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.4), 0 -2px 16px rgba(0, 200, 215, 0.06);
  animation: sheetSlideUp 350ms cubic-bezier(0.16, 1, 0.3, 1) both;

  .sheet-handle {
    width: 40px;
    height: 4px;
    background: rgba(160, 200, 215, 0.20);
    border-radius: 2px;
    margin: 0 auto $spacing-md;
  }

  .sheet-motivo {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-md;

    .sheet-motivo-icon {
      @include flex-center;
      width: 44px;
      height: 44px;
      background: rgba(0, 200, 215, 0.10);
      border: 1px solid $border-glow;
      border-radius: $border-radius-md;
      flex-shrink: 0;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .sheet-motivo-info {
      h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: $text-primary;
      }

      p {
        margin: 2px 0 0;
        font-size: 0.72rem;
        color: $text-secondary;
      }
    }
  }

  .sheet-question {
    font-size: 0.82rem;
    color: $text-secondary;
    margin-bottom: $spacing-md;
    line-height: 1.4;

    strong {
      color: $cyan-400;
    }
  }

  .sheet-actions {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-sm;
  }

  .sheet-btn-cancel,
  .sheet-btn-confirm {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 13px 16px;
    border: none;
    border-radius: $border-radius-md;
    font-family: $font-body;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 200ms;

    mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    &:disabled {
      opacity: 0.5;
      cursor: wait;
    }
  }

  .sheet-btn-cancel {
    background: $navy-700;
    color: $text-secondary;
    border: 1px solid $border-subtle;

    &:hover:not(:disabled) {
      background: $navy-600;
    }
  }

  .sheet-btn-confirm {
    background: linear-gradient(135deg, $cyan-500, $teal-400);
    color: $navy-950;
    font-weight: 700;
    box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);

    &:hover:not(:disabled) {
      box-shadow: 0 6px 24px rgba(0, 200, 215, 0.35);
    }

    mat-spinner {
      display: inline-block;
    }
  }

  .sheet-link {
    display: block;
    width: 100%;
    background: none;
    border: none;
    padding: 8px;
    font-family: $font-body;
    font-size: 0.72rem;
    color: $text-muted;
    cursor: pointer;
    text-align: center;
    transition: color 200ms;

    &:hover:not(:disabled) { color: $amber-color; }
    &:disabled { opacity: 0.4; }
  }
}

@keyframes sheetSlideUp {
  from { opacity: 0; transform: translateY(100%); }
  to   { opacity: 1; transform: translateY(0); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PANTALLA DE Ã‰XITO â€” Animated SVG Checkmark + Rings
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

.exito-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  @include flex-center;
  background: $navy-900;
  animation: fadeIn 300ms ease both;
}

.exito-content {
  @include flex-center;
  flex-direction: column;
  text-align: center;
  padding: $spacing-xl;
  animation: revealUp 500ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

// â€” Animated rings + checkmark â€”

.exito-rings {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: $spacing-xl;

  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid rgba($success-color, 0.15);
  }

  .ring-1 {
    animation: ringExpand 1.2s 200ms ease-out both;
  }

  .ring-2 {
    animation: ringExpand 1.2s 400ms ease-out both;
  }

  .ring-3 {
    animation: ringExpand 1.2s 600ms ease-out both;
  }

  .exito-check {
    position: absolute;
    inset: 10px;
    @include flex-center;
  }
}

@keyframes ringExpand {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
    border-color: rgba($success-color, 0.4);
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
    border-color: rgba($success-color, 0);
  }
}

// â€” SVG Checkmark Animation â€”

.checkmark-svg {
  width: 100px;
  height: 100px;

  .checkmark-circle {
    stroke-dasharray: 166;
    stroke-dashoffset: 166;
    stroke-width: 2;
    stroke-miterlimit: 10;
    stroke: rgba($success-color, 0.35);
    fill: rgba($success-color, 0.08);
    animation: checkCircle 600ms 200ms cubic-bezier(0.65, 0, 0.45, 1) forwards;
  }

  .checkmark-path {
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke: $success-color;
    filter: drop-shadow(0 0 8px rgba($success-color, 0.5));
    animation: checkPath 400ms 500ms cubic-bezier(0.65, 0, 0.45, 1) forwards;
  }
}

@keyframes checkCircle {
  to { stroke-dashoffset: 0; }
}

@keyframes checkPath {
  to { stroke-dashoffset: 0; }
}

.exito-titulo {
  margin: 0 0 $spacing-md;
  font-family: $font-display;
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: $success-color;
  text-shadow: 0 0 40px rgba($success-color, 0.25);
}

.exito-info {
  margin-bottom: $spacing-lg;

  .exito-nombre {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: $text-primary;
  }

  .exito-detalle {
    margin: 4px 0 0;
    font-size: 0.82rem;
    color: $cyan-400;
    font-family: $font-mono;
  }
}

// â€” Progress bar instead of spinner â€”

.exito-loader {
  @include flex-center;
  flex-direction: column;
  gap: $spacing-sm;
  width: 200px;

  span {
    color: $text-muted;
    font-size: 0.75rem;
  }
}

.exito-progress-bar {
  width: 100%;
  height: 3px;
  background: rgba($success-color, 0.12);
  border-radius: 2px;
  overflow: hidden;

  .exito-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, $success-color, $cyan-400);
    border-radius: 2px;
    animation: progressFill 1.5s linear both;
    box-shadow: 0 0 8px rgba($success-color, 0.4);
  }
}

@keyframes progressFill {
  from { width: 0%; }
  to   { width: 100%; }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ANIMACIONES GLOBALES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@keyframes revealUp {
  from { opacity: 0; transform: translateY(20px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes scaleIn {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

## FILE: src\app\features\seleccion-motivo\seleccion-motivo.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  seleccion-motivo.component.ts                       â•‘
// â•‘  Stenbrary v3.2 â€” Two-Step + Toggle + Guest          â•‘
// â•‘                                                      â•‘
// â•‘  CAMBIOS v3.2:                                       â•‘
// â•‘  - Toggle: clic en mismo motivo = deseleccionar      â•‘
// â•‘  - Soporte para invitados (esInvitado flag)          â•‘
// â•‘  - "MatrÃ­cula incorrecta" siempre visible            â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Motivo, Registro } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-seleccion-motivo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    MatTooltipModule
  ],
  templateUrl: './seleccion-motivo.component.html',
  styleUrl: './seleccion-motivo.component.scss'
})
export class SeleccionMotivoComponent implements OnInit {
  alumno: Alumno | null = null;
  motivos: Motivo[] = [];

  /** Motivo seleccionado (pero aÃºn no confirmado) */
  motivoSeleccionado: Motivo | null = null;

  /** Si el usuario es un invitado (sin matrÃ­cula) */
  esInvitado = false;

  cargandoMotivos = true;
  registrando = false;
  registroExitoso = false;
  error: string | null = null;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private toastService: ToastService,
    private loadingService: LoadingService
  ) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LIFECYCLE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async ngOnInit(): Promise<void> {
    const alumnoData = sessionStorage.getItem('alumnoActual');

    if (!alumnoData) {
      this.toastService.error('No hay datos de alumno. Vuelve a escanear.');
      this.router.navigate(['/scanner']);
      return;
    }

    const parsed = JSON.parse(alumnoData);
    this.alumno = parsed;
    this.esInvitado = parsed.esInvitado === true;

    await this.cargarMotivos();
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CARGA DE MOTIVOS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async cargarMotivos(): Promise<void> {
    try {
      this.cargandoMotivos = true;
      this.error = null;
      this.motivos = await this.databaseService.obtenerMotivosActivos();
      this.cargandoMotivos = false;

      if (this.motivos.length === 0) {
        this.toastService.warning('No hay actividades disponibles. Contacta al administrador.');
      }
    } catch (error) {
      console.error('âŒ Error al cargar motivos:', error);
      this.error = 'Error al cargar las actividades';
      this.cargandoMotivos = false;
      this.toastService.error('Error al cargar las actividades');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SELECCIÃ“N (paso 1 â€” toggle behavior)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  /**
   * Toggle: si el motivo ya estÃ¡ seleccionado, deselecciona.
   * Si es otro, lo selecciona.
   */
  seleccionarMotivo(motivo: Motivo): void {
    if (this.registrando) return;

    if (this.motivoSeleccionado?.id === motivo.id) {
      // Toggle off â€” deseleccionar
      this.motivoSeleccionado = null;
    } else {
      // Seleccionar nuevo
      this.motivoSeleccionado = motivo;
    }
  }

  /**
   * Deselecciona el motivo actual.
   */
  deseleccionarMotivo(): void {
    if (this.registrando) return;
    this.motivoSeleccionado = null;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CONFIRMACIÃ“N (paso 2 â€” ejecuta el registro)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async confirmarRegistro(): Promise<void> {
    if (!this.alumno || !this.motivoSeleccionado || this.registrando) return;

    try {
      this.registrando = true;

      const nombreCompleto = this.esInvitado
        ? 'Visitante Externo'
        : `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;

      const nuevoRegistro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'> = {
        alumnoId: this.alumno.id!,
        matricula: this.alumno.matricula,
        nombreCompleto: nombreCompleto,
        carrera: this.alumno.carrera,
        motivoId: this.motivoSeleccionado.id || '',
        motivoNombre: this.motivoSeleccionado.nombre
      };

      await this.databaseService.crearRegistro(nuevoRegistro);

      const displayName = this.esInvitado ? 'Visitante' : this.alumno.nombre;
      console.log('ðŸŽ‰ Registro completado:', displayName, '-', this.motivoSeleccionado.nombre);

      this.toastService.success(
        `Â¡Registro exitoso! ${displayName} â€” ${this.motivoSeleccionado.nombre}`
      );

      // Feedback hÃ¡ptico
      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }

      this.registroExitoso = true;
      sessionStorage.removeItem('alumnoActual');

      // Redirect rÃ¡pido (1.5s)
      setTimeout(() => {
        this.router.navigate(['/scanner']);
      }, 1500);

    } catch (error) {
      console.error('âŒ Error al crear registro:', error);
      this.registrando = false;
      this.toastService.error('Error al guardar el registro. Intenta de nuevo.');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // NAVEGACIÃ“N
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  volverAEscanear(): void {
    sessionStorage.removeItem('alumnoActual');
    this.toastService.info('Vuelve a escanear tu credencial');
    this.router.navigate(['/scanner']);
  }

  cancelar(): void {
    sessionStorage.removeItem('alumnoActual');
    this.toastService.info('Registro cancelado');
    this.router.navigate(['/scanner']);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // HELPERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  obtenerNombreCorto(): string {
    if (!this.alumno) return '';
    if (this.esInvitado) return 'Visitante Externo';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno}`;
  }

  obtenerNombreCompleto(): string {
    if (!this.alumno) return '';
    if (this.esInvitado) return 'Visitante Externo';
    return `${this.alumno.nombre} ${this.alumno.apellidoPaterno} ${this.alumno.apellidoMaterno}`;
  }
}
```

## FILE: src\app\shared\components\confirm-dialog\confirm-dialog.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/shared/components/confirm-dialog/     â•‘
// â•‘        confirm-dialog.component.ts                   â•‘
// â•‘  Stenbrary v3.6 â€” Dialog reutilizable de confirmaciÃ³nâ•‘
// â•‘                                                      â•‘
// â•‘  Uso:                                                â•‘
// â•‘  const ref = this.dialog.open(ConfirmDialogComponent,â•‘
// â•‘    { data: {                                         â•‘
// â•‘      titulo: 'Â¿Eliminar alumno?',                    â•‘
// â•‘      mensaje: 'Esta acciÃ³n no se puede deshacer.',   â•‘
// â•‘      botonConfirmar: 'Eliminar',                     â•‘
// â•‘      tipo: 'danger'                                  â•‘
// â•‘  }});                                                â•‘
// â•‘  ref.afterClosed().subscribe(ok => { if (ok) ... }); â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  botonConfirmar?: string;    // Default: 'Confirmar'
  botonCancelar?: string;     // Default: 'Cancelar'
  tipo?: 'danger' | 'warning' | 'info';  // Default: 'warning'
  icono?: string;             // Default: segÃºn tipo
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog" [class]="'tipo-' + tipo">
      <div class="dialog-icon-wrap">
        <mat-icon>{{ iconoFinal }}</mat-icon>
      </div>
      <h2 class="dialog-titulo">{{ data.titulo }}</h2>
      <p class="dialog-mensaje">{{ data.mensaje }}</p>
      <div class="dialog-actions">
        <button class="btn-cancelar" (click)="cancelar()">
          {{ data.botonCancelar || 'Cancelar' }}
        </button>
        <button class="btn-confirmar" [class]="'btn-' + tipo" (click)="confirmar()">
          <mat-icon>{{ iconoBoton }}</mat-icon>
          {{ data.botonConfirmar || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 28px;
      text-align: center;
      max-width: 380px;
    }

    .dialog-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      margin: 0 auto 18px;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .tipo-danger .dialog-icon-wrap {
      background: rgba(240, 82, 82, 0.10);
      border: 2px solid rgba(240, 82, 82, 0.25);
      mat-icon { color: #F05252; }
    }

    .tipo-warning .dialog-icon-wrap {
      background: rgba(245, 166, 35, 0.10);
      border: 2px solid rgba(245, 166, 35, 0.25);
      mat-icon { color: #F5A623; }
    }

    .tipo-info .dialog-icon-wrap {
      background: rgba(0, 200, 215, 0.10);
      border: 2px solid rgba(0, 200, 215, 0.25);
      mat-icon { color: #00C8D7; }
    }

    .dialog-titulo {
      margin: 0 0 8px;
      font-size: 1.15rem;
      font-weight: 700;
      color: #E8F4F8;
    }

    .dialog-mensaje {
      margin: 0 0 24px;
      font-size: 0.88rem;
      color: rgba(200, 230, 240, 0.55);
      line-height: 1.5;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    button {
      padding: 10px 22px;
      border: none;
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 200ms;
      display: inline-flex;
      align-items: center;
      gap: 6px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover { transform: translateY(-1px); }
    }

    .btn-cancelar {
      background: rgba(200, 230, 240, 0.06);
      color: rgba(200, 230, 240, 0.5);
      border: 1px solid rgba(200, 230, 240, 0.1);
    }

    .btn-danger {
      background: linear-gradient(135deg, #F05252, #DC2626);
      color: white;
      box-shadow: 0 4px 12px rgba(240, 82, 82, 0.25);
    }

    .btn-warning {
      background: linear-gradient(135deg, #F5A623, #D97706);
      color: #04090F;
      box-shadow: 0 4px 12px rgba(245, 166, 35, 0.25);
    }

    .btn-info {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7);
      color: #04090F;
      box-shadow: 0 4px 12px rgba(0, 200, 215, 0.25);
    }

    :host {
      display: block;
    }
  `],
})
export class ConfirmDialogComponent {

  tipo: string;
  iconoFinal: string;
  iconoBoton: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
    private dialogRef: MatDialogRef<ConfirmDialogComponent>,
  ) {
    this.tipo = data.tipo || 'warning';

    // Icono del cÃ­rculo superior
    const iconosPorTipo: Record<string, string> = {
      danger: 'delete_forever',
      warning: 'warning_amber',
      info: 'info',
    };
    this.iconoFinal = data.icono || iconosPorTipo[this.tipo] || 'help';

    // Icono del botÃ³n
    const iconosBoton: Record<string, string> = {
      danger: 'delete',
      warning: 'check',
      info: 'check',
    };
    this.iconoBoton = iconosBoton[this.tipo] || 'check';
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
```

## FILE: src\app\shared\components\loading.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/shared/components/loading/            â•‘
// â•‘        loading.component.ts                          â•‘
// â•‘  Stenbrary v3.6 â€” Dark theme fix                     â•‘
// â•‘                                                      â•‘
// â•‘  FIX: Fondo blanco â†’ dark theme consistente          â•‘
// â•‘  - Overlay oscuro con blur                           â•‘
// â•‘  - Card oscura con borde cyan                        â•‘
// â•‘  - Spinner cyan en vez de morado                     â•‘
// â•‘  - Texto claro                                       â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="loading-overlay" *ngIf="isLoading">
      <div class="loading-content">
        <mat-spinner diameter="52"></mat-spinner>
        <p class="loading-text">{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(4, 9, 15, 0.70);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      backdrop-filter: blur(4px);
      animation: fadeIn 200ms ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      padding: 36px 48px;
      background: #101c2c;
      border: 1px solid rgba(0, 200, 215, 0.15);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                  0 0 0 1px rgba(0, 200, 215, 0.05);
    }

    .loading-text {
      margin: 0;
      font-size: 0.92rem;
      color: rgba(200, 230, 240, 0.7);
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
    }

    ::ng-deep .loading-content .mat-mdc-progress-spinner circle,
    ::ng-deep .loading-content .mdc-circular-progress__determinate-circle,
    ::ng-deep .loading-content .mdc-circular-progress__indeterminate-circle-graphic {
      stroke: #00C8D7 !important;
    }
  `],
})
export class LoadingComponent implements OnInit, OnDestroy {
  isLoading = false;
  message = 'Cargando...';
  private subscription?: Subscription;

  constructor(private loadingService: LoadingService) {}

  ngOnInit(): void {
    this.subscription = this.loadingService.loading$.subscribe(state => {
      this.isLoading = state.isLoading;
      this.message = state.message;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
```

## FILE: src\app\shared\components\toast-container.component.ts
```typescript
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  RUTA: src/app/shared/components/toast-container/    â•‘
// â•‘        toast-container.component.ts                  â•‘
// â•‘  Stenbrary v3.6 â€” Dark theme fix                     â•‘
// â•‘                                                      â•‘
// â•‘  FIX: Fondo blanco â†’ dark theme consistente          â•‘
// â•‘  - Toast con fondo oscuro y borde de color           â•‘
// â•‘  - Colores: cyan (success), rojo (error),            â•‘
// â•‘    amarillo (warning), azul (info)                   â•‘
// â•‘  - Texto claro, Ã­cono X claro                        â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toasts"
        [class]="'toast toast-' + toast.type">

        <div class="toast-icon">
          <mat-icon>{{ getIcon(toast.type) }}</mat-icon>
        </div>

        <div class="toast-content">
          <p class="toast-message">{{ toast.message }}</p>
        </div>

        <button class="toast-close" (click)="removeToast(toast.id)">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      background: #0f1a28;
      border: 1px solid rgba(200, 230, 240, 0.06);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35),
                  0 0 0 1px rgba(0, 0, 0, 0.1);
      animation: slideIn 300ms ease-out;
      min-width: 300px;
      max-width: 400px;
    }

    @keyframes slideIn {
      from {
        transform: translateX(120px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      flex-shrink: 0;
    }

    .toast-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .toast-content {
      flex: 1;
    }

    .toast-message {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.45;
      color: #E8F4F8;
      font-family: 'DM Sans', sans-serif;
    }

    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.35;
      transition: opacity 200ms;
      flex-shrink: 0;
    }

    .toast-close:hover { opacity: 0.8; }

    .toast-close mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(200, 230, 240, 0.6);
    }

    /* â”€â”€ Success â”€â”€ */
    .toast-success {
      border-left: 3px solid #0BC4B7;
    }
    .toast-success .toast-icon {
      background: rgba(11, 196, 183, 0.12);
      mat-icon { color: #0BC4B7; }
    }

    /* â”€â”€ Error â”€â”€ */
    .toast-error {
      border-left: 3px solid #F05252;
    }
    .toast-error .toast-icon {
      background: rgba(240, 82, 82, 0.12);
      mat-icon { color: #F05252; }
    }

    /* â”€â”€ Warning â”€â”€ */
    .toast-warning {
      border-left: 3px solid #F5A623;
    }
    .toast-warning .toast-icon {
      background: rgba(245, 166, 35, 0.12);
      mat-icon { color: #F5A623; }
    }

    /* â”€â”€ Info â”€â”€ */
    .toast-info {
      border-left: 3px solid #3B82F6;
    }
    .toast-info .toast-icon {
      background: rgba(59, 130, 246, 0.12);
      mat-icon { color: #3B82F6; }
    }

    /* â”€â”€ Responsive â”€â”€ */
    @media (max-width: 768px) {
      .toast-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }

      .toast {
        min-width: auto;
        max-width: none;
      }
    }
  `],
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription?: Subscription;
  private timers = new Map<string, any>();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(toast => {
      this.addToast(toast);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.timers.forEach(timer => clearTimeout(timer));
  }

  addToast(toast: Toast): void {
    this.toasts.push(toast);

    const timer = setTimeout(() => {
      this.removeToast(toast.id);
    }, toast.duration);

    this.timers.set(toast.id, timer);
  }

  removeToast(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  getIcon(type: Toast['type']): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}
```

