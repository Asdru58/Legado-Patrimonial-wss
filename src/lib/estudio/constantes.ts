// =========================================================
// Legado Patrimonial WSS — Estación de estudio
// src/lib/estudio/constantes.ts
// Constantes compartidas entre el middleware (runtime Edge)
// y el código de servidor.
//
// Este archivo NO lleva 'server-only': lo importa también el
// middleware, que no corre en el servidor de Node.
// =========================================================

/** Nombre de la cookie que porta el token del propietario. */
export const COOKIE_PROPIETARIO = 'legado_mesa'

/** El token son 32 bytes en hexadecimal: 64 caracteres. */
export const PATRON_TOKEN = /^[0-9a-f]{64}$/

/** Cinco años. El trabajo de estudio no debe caducar por una cookie. */
export const VIDA_COOKIE_SEGUNDOS = 60 * 60 * 24 * 365 * 5

/** Rutas que el middleware vigila. Debe ir en sintonía con `config.matcher`. */
export const RUTAS_DE_LA_MESA = ['/mesa', '/api/estudio'] as const
