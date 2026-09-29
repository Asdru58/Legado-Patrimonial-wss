import 'server-only'

/**
 * La Mesa se habilita en desarrollo local. Un despliegue de producción o
 * vista previa necesita activación expresa después de instalar su esquema.
 */
export const mesaHabilitada =
  process.env.ESTUDIO_HABILITADO === 'true' ||
  (process.env.ESTUDIO_HABILITADO !== 'false' && process.env.NODE_ENV !== 'production')
