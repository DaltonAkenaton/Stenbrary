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

  /**
   * Supabase — Fase 2 (auth + sync). Vacío = modo solo-local (sin backend).
   * Proyecto DEV: stenbrary-dev. La `anonKey` puede ser la JWT clásica o el
   * formato nuevo `sb_publishable_*` — supabase-js acepta ambos.
   * NUNCA pegar service_role key aquí — esa solo va en Supabase CLI/admin.
   */
  supabase: {
    url: 'https://yhibkewgxhmwoemlvruy.supabase.co',
    anonKey: 'sb_publishable_pLIblkALe_5TbYyNJZQTTg_jnihv3sd',
  },
};
