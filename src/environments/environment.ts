export const environment = {
  production: false,

  /**
   * Reporte de errores en producción.
   * - endpoint: URL que recibe POST con el payload del error.
   *   Vacío = no-op (solo log local).
   * - Sentry: usar una Netlify Function/tunnel que reenvíe al ingest endpoint.
   * - Endpoint propio: cualquier URL que acepte JSON.
   */
  errorReporting: {
    endpoint: '',
  },
};
