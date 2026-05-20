export const environment = {
  production: true,

  /**
   * Reporte de errores en producción.
   * Configurar endpoint cuando se conecte a Sentry/backend propio.
   */
  errorReporting: {
    endpoint: '',
  },

  /**
   * Supabase — proyecto de PROD (separado de dev). Vacío = modo solo-local.
   * Pegar url + anonKey del proyecto de PROD cuando se cree.
   */
  supabase: {
    url: '',
    anonKey: '',
  },
};
