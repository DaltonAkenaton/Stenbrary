export const environment = {
  production: false,

  /**
   * Muestra la sección "Conexión con la nube" en Configuración → Avanzado
   * (v3.46.0). Apagado: el sistema se presenta e instala en modo local
   * mientras la universidad no autorice guardar datos de alumnos en la nube, y la
   * sección solo confundiría. Si una instalación YA tiene la nube encendida,
   * la sección se muestra igual para poder apagarla.
   */
  mostrarConexionNube: false,

  /**
   * Reporte de errores en producción.
   * - endpoint: URL que recibe POST con el payload del error.
   *   Vacío = no-op (solo log local).
   * - Sentry: usar una función serverless (tunnel) que reenvíe al ingest endpoint.
   * - Endpoint propio: cualquier URL que acepte JSON.
   */
  errorReporting: {
    endpoint: '',
  },

  /**
   * Supabase — prototipo de backend, en pausa. Vacío = modo solo-local
   * (sin backend): es como se distribuye el sistema.
   * Para probarlo contra una base local: `npx supabase start` y pegar
   * aquí la URL y la llave publicable que imprime (son de demostración;
   * la de un proyecto real no se sube al repositorio).
   * NUNCA pegar la service_role key — esa solo va en Supabase CLI/admin.
   */
  supabase: {
    url: '',
    anonKey: '',
  },
};
