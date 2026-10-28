// ╔══════════════════════════════════════════════════════╗
// ║  karma.conf.js                                       ║
// ║  Stenbrary v3.12.1 — Configuración Karma + CI        ║
// ║                                                      ║
// ║  Agrega el launcher ChromeHeadlessCI con --no-sandbox║
// ║  para poder correr en GitHub Actions / contenedores  ║
// ║  donde el sandbox de Chrome no está disponible.      ║
// ╚══════════════════════════════════════════════════════╝

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/stenbrary'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
      ],
      // Piso medido el 2026-10-27 (80.3 / 68.3 / 75.9 / 82.4 %), un poco por
      // debajo para no fallar por ruido. El README cita la de sentencias: si
      // baja de aquí, `npm run test:ci` falla en vez de dejar la cifra vieja.
      check: {
        global: { statements: 79, branches: 66, functions: 74, lines: 81 },
      },
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--headless',
        ],
      },
    },
    restartOnFileChange: true,
    singleRun: false,
  });
};
