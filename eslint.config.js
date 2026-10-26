// ╔══════════════════════════════════════════════════════╗
// ║  eslint.config.js                                    ║
// ║  Stenbrary — configuración de linter                 ║
// ║                                                      ║
// ║  Añadido en septiembre de 2026, cinco meses después  ║
// ║  de que CLAUDE.md documentara `ng lint` como si      ║
// ║  existiera. Hasta aquí la única barrera automática   ║
// ║  eran los dos type-checks y el pre-commit.           ║
// ║                                                      ║
// ║  CRITERIO DE NIVELES:                                ║
// ║  - `error` bloquea. Se reserva para lo que no debe   ║
// ║    entrar nunca: código muerto y las convenciones    ║
// ║    que CLAUDE.md ya exige por escrito.               ║
// ║  - `warn` avisa sin bloquear. Es para deuda real y   ║
// ║    reconocida que arreglar de golpe sería un         ║
// ║    refactor grande y arriesgado, no una limpieza.    ║
// ║                                                      ║
// ║  Un `warn` aquí no es "esto da igual": es "esto      ║
// ║  importa y tiene fecha". Cada bloque de abajo dice   ║
// ║  cuántos hay y cuándo pasa a `error`.                ║
// ╚══════════════════════════════════════════════════════╝

// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    // Sin esto el linter entra en `.angular/cache`, que son dependencias
    // precompiladas por Vite: miles de líneas de código de terceros que ni
    // escribimos ni podemos arreglar.
    ignores: [
      '.angular/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
    ],
  },

  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // ─── Convenciones de CLAUDE.md, ahora automáticas ───
      // Estas eran reglas escritas que solo se sostenían por disciplina.
      // Que las verifique el linter es el motivo principal de haberlo puesto.

      // "NO `confirm()` nativo → usar ConfirmDialogComponent".
      'no-alert': 'error',

      // ─── Deuda reconocida, con fecha ───────────────────
      // 82 apariciones al instalar el linter. Convertirlas a tipos reales de
      // una tacada es un refactor transversal con riesgo de cambiar
      // comportamiento, no una limpieza: se arreglan al tocar cada archivo.
      // Pasa a `error` cuando el conteo llegue a cero.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Un `catch` vacío es legítimo cuando el fallo de verdad da igual (una
      // pantalla completa que no se concede, un wake lock denegado). Lo que
      // no es legítimo es no decir por qué. La regla ignora los cuerpos que
      // contienen un comentario, así que en la práctica obliga a explicarlo.
      '@typescript-eslint/no-empty-function': 'error',
    },
  },

  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // "NO `*ngIf`/`*ngFor` → usar `@if`/`@for`". Otra regla de CLAUDE.md
      // que pasa de texto a comprobación.
      '@angular-eslint/template/prefer-control-flow': 'error',

      // ─── Accesibilidad (v3.62.0: en cero, ahora bloquea) ───
      // Hubo 41 avisos, casi todos `<div (click)>`. Se resolvieron uno por
      // uno (rol, foco, Enter/Espacio, nombre accesible; etiquetas de grupo
      // con role="group"), no con `(keyup)` vacíos que callan el aviso sin
      // resolver el problema. Pasan a `error` para que no vuelvan. Además,
      // `npm run e2e` revisa el flujo principal con axe (e2e/accesibilidad).
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/label-has-associated-control': [
        'error',
        // Un <label> que envuelve un control de Angular Material sí lo nombra.
        { controlComponents: ['mat-checkbox', 'mat-slide-toggle', 'mat-radio-button', 'mat-select'] },
      ],
    },
  },
);
