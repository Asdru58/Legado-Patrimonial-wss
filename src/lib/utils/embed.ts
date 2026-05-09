// =========================================================
// Legado Patrimonial WSS — Utilidades de Seguridad
// src/lib/utils/embed.ts
// Enmienda de Seguridad H-001: Sanitización de embeds
//
// Whitelist estricta de dominios permitidos para iframes.
// NUNCA inyectar URLs crudas directamente en src de iframe.
// Esta utilidad valida, extrae el ID y devuelve una URL
// segura de embed para el reproductor.
// =========================================================

/**
 * Resultado de la sanitización de una URL de embed.
 * Si `valid` es false, la URL no debe usarse en un iframe.
 */
export type EmbedResult = {
  valid: true
  provider: 'youtube' | 'vimeo' | 'spotify' | 'ivoox'
  embedUrl: string
} | {
  valid: false
  provider: null
  embedUrl: null
}

// ── Patrones de extracción por proveedor ──

const YOUTUBE_PATTERNS = [
  // https://www.youtube.com/watch?v=VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  // https://youtu.be/VIDEO_ID
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  // https://www.youtube.com/embed/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  // https://www.youtube.com/v/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
]

const VIMEO_PATTERNS = [
  // https://vimeo.com/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
  // https://player.vimeo.com/video/VIDEO_ID
  /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/,
]

const SPOTIFY_PATTERNS = [
  // https://open.spotify.com/episode/EPISODE_ID
  /(?:https?:\/\/)?open\.spotify\.com\/episode\/([a-zA-Z0-9]+)/,
  // https://open.spotify.com/show/SHOW_ID
  /(?:https?:\/\/)?open\.spotify\.com\/show\/([a-zA-Z0-9]+)/,
]

const IVOOX_PATTERNS = [
  // https://www.ivoox.com/player_ej_12345678_2.html
  /(?:https?:\/\/)?(?:www\.)?ivoox\.com\/player_ej_(\d+)/,
  // https://go.ivoox.com/rf/12345678 o https://www.ivoox.com/algo_rf_12345678_1.html
  /(?:https?:\/\/)?(?:(?:go|www)\.)?ivoox\.com\/(?:.*_)?rf\/(\d+)/,
  // https://www.ivoox.com/algun-podcast-s1234567.html (página de episodio)
  /(?:https?:\/\/)?(?:www\.)?ivoox\.com\/[\w-]+-s(\d+)\.html/,
]

// ── Funciones de extracción ──

function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractVimeoId(url: string): string | null {
  for (const pattern of VIMEO_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractSpotifyId(url: string): { type: 'episode' | 'show'; id: string } | null {
  for (const pattern of SPOTIFY_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) {
      const type = url.includes('/episode/') ? 'episode' : 'show'
      return { type, id: match[1] }
    }
  }
  return null
}

function extractIvooxId(url: string): string | null {
  for (const pattern of IVOOX_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

// ============================================
// Función principal de sanitización
// ============================================

/**
 * Recibe una URL cruda de texto, la valida contra la
 * whitelist de proveedores permitidos (YouTube, Vimeo,
 * Spotify, iVoox), extrae el ID y devuelve una URL
 * segura para inyectar en el src de un iframe.
 *
 * Si la URL no coincide con ningún proveedor, devuelve
 * { valid: false } — NUNCA se debe usar la URL original.
 *
 * @example
 * const result = sanitizeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // { valid: true, provider: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' }
 */
export function sanitizeEmbedUrl(rawUrl: string | null | undefined): EmbedResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, provider: null, embedUrl: null }
  }

  const url = rawUrl.trim()

  // ── YouTube ──
  const ytId = extractYouTubeId(url)
  if (ytId) {
    return {
      valid: true,
      provider: 'youtube',
      // Privacidad: youtube-nocookie.com evita cookies de rastreo
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`,
    }
  }

  // ── Vimeo ──
  const vimeoId = extractVimeoId(url)
  if (vimeoId) {
    return {
      valid: true,
      provider: 'vimeo',
      // Privacidad: dnt=1 activa Do Not Track
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?dnt=1`,
    }
  }

  // ── Spotify ──
  const spotifyData = extractSpotifyId(url)
  if (spotifyData) {
    return {
      valid: true,
      provider: 'spotify',
      // Apariencia: theme=0 activa tema oscuro (coherencia con Design System)
      embedUrl: `https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}?theme=0`,
    }
  }

  // ── iVoox ──
  const ivooxId = extractIvooxId(url)
  if (ivooxId) {
    return {
      valid: true,
      provider: 'ivoox',
      // Estándar: sin medidas de privacidad adicionales
      embedUrl: `https://www.ivoox.com/player_ej_${ivooxId}_2.html`,
    }
  }

  // ── No coincide con ningún proveedor ──
  return { valid: false, provider: null, embedUrl: null }
}

/**
 * Devuelve los atributos de iframe recomendados según el proveedor.
 * Esto centraliza la configuración de sandbox y permisos.
 */
export function getEmbedIframeProps(provider: 'youtube' | 'vimeo' | 'spotify' | 'ivoox') {
  const base = {
    referrerPolicy: 'no-referrer' as const,
    loading: 'lazy' as const,
  }

  switch (provider) {
    case 'youtube':
    case 'vimeo':
      return {
        ...base,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowFullScreen: true,
      }
    case 'spotify':
      return {
        ...base,
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
        allowFullScreen: false,
      }
    case 'ivoox':
      return {
        ...base,
        allow: 'autoplay',
        allowFullScreen: false,
      }
  }
}

// ============================================
// Validación de URLs para Server Actions (H-001)
// ============================================

/**
 * Valida una URL de media contra la whitelist de proveedores.
 * Retorna un mensaje de error si la URL no es válida, o null si es aceptable.
 * Una URL vacía o nula se considera válida (campo opcional).
 *
 * @param url - URL cruda del formulario
 * @param fieldLabel - Etiqueta del campo para mensajes de error (ej: 'video', 'audio')
 */
export function validateMediaUrl(
  url: string | null | undefined,
  fieldLabel: 'video' | 'audio'
): string | null {
  if (!url || url.trim() === '') return null

  const result = sanitizeEmbedUrl(url)
  if (!result.valid) {
    return `La URL de ${fieldLabel} no corresponde a un proveedor autorizado (YouTube, Vimeo, Spotify o iVoox).`
  }

  return null
}
