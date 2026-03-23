// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/environments/environment.prod.ts          ║
// ║  Stenbrary — Configuración de producción             ║
// ╚══════════════════════════════════════════════════════╝

export const environment = {
  production: true,
  appName: 'Stenbrary',
  version: '3.5.1',
  autoRefreshMs: 30_000,

  // ── Futuro: cuando conectes backend ──
  // apiUrl: 'https://api.stenbrary.com',
  // firebaseConfig: { ... },
};