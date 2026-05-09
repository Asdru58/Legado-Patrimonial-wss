// =========================================================
// Legado Patrimonial WSS — Sistema de Podcast
// src/lib/services/podcast.ts
// Capa de servicio: única vía de interacción con la tabla
// episodios. Todas las consultas pasan por aquí.
//
// Schema alineado a Fase 1 (18 columnas):
// id, slug, titulo, descripcion, tema_doctrinal,
// texto_biblico_base, participantes, audio_url, video_url,
// conferencia_fuente, extracto_referenciado,
// duracion_minutos, numero_episodio, temporada,
// published, destacado, fecha_publicacion,
// created_at, updated_at
// =========================================================

import 'server-only'

import { createClient } from '@/lib/supabase/server'

// ============================================
// Tipo exportado — 19 columnas exactas de Fase 1
// ============================================

export type Episodio = {
  id: string                          // uuid, PK
  slug: string                        // text, NOT NULL, UNIQUE
  titulo: string                      // text, NOT NULL
  descripcion: string | null          // text
  tema_doctrinal: string | null       // text
  texto_biblico_base: string | null   // text
  participantes: string | null        // text
  audio_url: string | null            // text
  video_url: string | null            // text
  conferencia_fuente: string | null   // text
  extracto_referenciado: string | null // text
  duracion_minutos: number | null     // integer (> 0)
  numero_episodio: number | null      // integer (> 0)
  temporada: number                   // integer, NOT NULL, default 1
  published: boolean                  // boolean, NOT NULL, default false
  destacado: boolean                  // boolean, NOT NULL, default false
  fecha_publicacion: string | null    // date (como ISO string)
  created_at: string                  // timestamptz, NOT NULL
  updated_at: string                  // timestamptz, NOT NULL
}

// ── Columnas explícitas (evita traer campos futuros) ──
const SELECT_COLUMNS = `
  id,
  slug,
  titulo,
  descripcion,
  tema_doctrinal,
  texto_biblico_base,
  participantes,
  audio_url,
  video_url,
  conferencia_fuente,
  extracto_referenciado,
  duracion_minutos,
  numero_episodio,
  temporada,
  published,
  destacado,
  fecha_publicacion,
  created_at,
  updated_at
`

// ============================================
// Consultas públicas (respetan RLS: solo published)
// ============================================

/**
 * Obtiene un episodio publicado por su slug.
 * Retorna null si no existe o no está publicado.
 */
export async function getEpisodioBySlug(slug: string): Promise<Episodio | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('episodios')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[getEpisodioBySlug] error:', error)
    return null
  }

  return data as Episodio | null
}

/**
 * Obtiene todos los episodios publicados, ordenados por
 * temporada descendente, luego número de episodio descendente.
 */
export async function getAllEpisodios(): Promise<Episodio[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('episodios')
    .select(SELECT_COLUMNS)
    .order('temporada', { ascending: false })
    .order('numero_episodio', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[getAllEpisodios] error:', error)
    return []
  }

  return (data ?? []) as Episodio[]
}

/**
 * Obtiene el episodio destacado más reciente por fecha de publicación.
 * Si hay múltiples destacados, retorna el de fecha_publicacion más reciente.
 * Si ninguno tiene fecha, retorna el primero por orden de inserción.
 * Solo considera episodios publicados (published = true).
 */
export async function getEpisodioDestacado(): Promise<Episodio | null> {
  const supabase = await createClient()

  // Semántica definida: el destacado más reciente por fecha de publicación
  const { data, error } = await supabase
    .from('episodios')
    .select(SELECT_COLUMNS)
    .eq('published', true)
    .eq('destacado', true)
    .order('fecha_publicacion', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getEpisodioDestacado] error:', error)
    return null
  }

  return data as Episodio | null
}

// ============================================
// Consultas administrativas (requieren sesión admin vía RLS)
// ============================================

/**
 * Obtiene TODOS los episodios (publicados y borradores).
 * Utilizado exclusivamente en /admin/podcast.
 * Requiere que la policy de admin permita SELECT.
 */
export async function getAllEpisodiosAdmin(): Promise<Episodio[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('episodios')
    .select(SELECT_COLUMNS)
    .order('temporada', { ascending: false })
    .order('numero_episodio', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllEpisodiosAdmin] error:', error)
    return []
  }

  return (data ?? []) as Episodio[]
}

/**
 * Obtiene un episodio por ID (para edición en admin).
 * Incluye publicados y borradores si el RLS lo permite.
 */
export async function getEpisodioById(id: string): Promise<Episodio | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('episodios')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getEpisodioById] error:', error)
    return null
  }

  return data as Episodio | null
}
