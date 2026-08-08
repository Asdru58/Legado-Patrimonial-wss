/**
 * Tipos TypeScript — Esquema Consolidado Post-R-3
 * Proyecto: Legado Patrimonial WSS
 *
 * Actualización manual: la generación automática vía
 * `supabase gen types` no está disponible sin Docker.
 *
 * Refactorizado: tabla multimedia eliminada.
 * Todos los campos de video/audio/PDF son planos en conferencias.
 * Campo serie_id añadido por migración de taxonomía.
 */

export type VideoProvider = 'none' | 'youtube' | 'r2' | 's3'
export type FallbackProvider = 'r2' | 's3'
export type VideoStatus =
  | 'pending'
  | 'active'
  | 'unavailable'
  | 'processing'
  | 'disabled'

export type Conferencia = {
  id: string                          // uuid, PK
  slug: string                        // text, NOT NULL, UNIQUE
  titulo: string                      // text, NOT NULL
  extracto: string | null             // text
  descripcion: string | null          // text
  fecha_impartida: string | null      // date (como ISO string)
  ponente_nombre: string | null       // text
  ponente_rol: string | null          // text
  audio_url: string | null            // text
  audio_duracion: number | null       // integer (>= 0)
  pdf_url: string | null              // text
  video_provider: VideoProvider       // text, NOT NULL, default 'none'
  video_provider_id: string | null    // text
  video_fallback_provider: FallbackProvider | null // text ('r2' | 's3' | null)
  video_fallback_url: string | null   // text
  video_status: VideoStatus           // text, NOT NULL, default 'pending'
  video_checked_at: string | null     // timestamptz
  fts: unknown | null                 // tsvector (no se usa directamente en frontend)
  created_at: string                  // timestamptz, NOT NULL
  updated_at: string                  // timestamptz, NOT NULL
  serie_id: string | null             // uuid, FK a series
}

export type ConferenciaPublica = Pick<
  Conferencia,
  | 'id'
  | 'slug'
  | 'titulo'
  | 'extracto'
  | 'descripcion'
  | 'fecha_impartida'
  | 'ponente_nombre'
  | 'ponente_rol'
  | 'audio_url'
  | 'audio_duracion'
  | 'pdf_url'
  | 'video_provider'
  | 'video_provider_id'
  | 'video_fallback_provider'
  | 'video_fallback_url'
  | 'video_status'
>

export interface TranscripcionFragmento {
  id: string
  conferencia_id: string
  texto: string
  timestamp_start: number
  timestamp_end: number
  orden_secuencia: number
  embedding?: number[]
}

export interface GrafoTematico {
  id: string
  fragmento_id: string
  entidad: string
  created_at: string
}

export interface ConferenciaCompleta extends Conferencia {
  fragmentos: TranscripcionFragmento[]
}

export interface ResultadoBusqueda {
  fragmento: TranscripcionFragmento
  conferencia: Conferencia
  similitud: number
}

export function tieneAudio(conf: ConferenciaPublica): boolean {
  return Boolean(conf.audio_url)
}

export function tieneVideo(conf: ConferenciaPublica): boolean {
  return conf.video_provider !== 'none' && conf.video_status === 'active'
}

export function tienePdf(conf: ConferenciaPublica): boolean {
  return Boolean(conf.pdf_url)
}

export interface EstadoReproductor {
  conferencia_activa: Conferencia | null
  esta_reproduciendo: boolean
  tiempo_actual: number
  duracion: number
  volumen: number
}
