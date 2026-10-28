export const environment = {
  production: true,

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
   * Configurar endpoint cuando se conecte a Sentry/backend propio.
   */
  errorReporting: {
    endpoint: '',
  },

  /**
   * Supabase — proyecto de PROD (separado de dev).
   *
   * Desde v3.41.0 pegar aquí las claves **ya no cambia el comportamiento de
   * las instalaciones existentes**: la nube es opt-in por instalación
   * (`stenbrary-nube-activa`, ver `core/auth/supabase.client.ts`). Un build
   * con credenciales sigue arrancando en modo solo-local hasta que el
   * coordinador la enciende desde /configuracion#avanzado. Antes de eso,
   * publicar las claves habría hecho que `roleGuard` exigiera sesión en toda
   * la administración desde el primer despliegue.
   *
   * Vacío = ni siquiera aparece el interruptor.
   *
   * La `anonKey` (`sb_publishable_*`) es pública por diseño y respeta RLS.
   * NUNCA pegar aquí la `service_role` — esa solo va en Supabase CLI/admin.
   *
   * Pasos para crear el proyecto y aplicar las migraciones:
   * `docs/DESPLIEGUE-NUBE.md`.
   */
  supabase: {
    url: '',
    anonKey: '',
  },
};
