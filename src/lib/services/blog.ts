// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/lib/services/blog.ts
// Capa de servicio: única vía de interacción con la tabla
// articulos. Todas las consultas pasan por aquí.
// =========================================================

import 'server-only'

import { createClient } from '@/lib/supabase/server'

// ============================================
// Tipo exportado
// ============================================

export type BlogPost = {
  id: string
  slug: string
  titulo: string
  extracto: string | null
  contenido: string
  categoria: string | null
  autor: string | null
  fecha_publicacion: string | null
  tiempo_lectura: string | null
  destacado: boolean
  published: boolean
  created_at: string
  updated_at: string
}

// ── Columnas explícitas (evita traer campos futuros) ──
const SELECT_COLUMNS = `
  id,
  slug,
  titulo,
  extracto,
  contenido,
  categoria,
  autor,
  fecha_publicacion,
  tiempo_lectura,
  destacado,
  published,
  created_at,
  updated_at
`

// ============================================
// Consultas públicas (respetan RLS: solo published)
// ============================================

/**
 * Obtiene un artículo publicado por su slug.
 * Retorna null si no existe o no está publicado.
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articulos')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[getBlogPostBySlug] error:', error)
    return null
  }

  return data as BlogPost | null
}

/**
 * Obtiene todos los artículos publicados, ordenados por
 * fecha de publicación descendente.
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articulos')
    .select(SELECT_COLUMNS)
    .order('fecha_publicacion', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllBlogPosts] error:', error)
    return []
  }

  return (data ?? []) as BlogPost[]
}

/**
 * Obtiene el artículo destacado más reciente (con destacado=true).
 */
export async function getFeaturedBlogPost(): Promise<BlogPost | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articulos')
    .select(SELECT_COLUMNS)
    .eq('destacado', true)
    .order('fecha_publicacion', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getFeaturedBlogPost] error:', error)
    return null
  }

  return data as BlogPost | null
}

/**
 * Obtiene artículos publicados por categoría.
 */
export async function getBlogPostsByCategory(categoria: string): Promise<BlogPost[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articulos')
    .select(SELECT_COLUMNS)
    .eq('categoria', categoria)
    .order('fecha_publicacion', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[getBlogPostsByCategory] error:', error)
    return []
  }

  return (data ?? []) as BlogPost[]
}

// ============================================
// Consultas administrativas (requieren sesión admin vía RLS)
// ============================================

/**
 * Obtiene TODOS los artículos (publicados y borradores).
 * Utilizado exclusivamente en /admin/blog.
 * Requiere que la policy de admin permita SELECT.
 *
 * Nota: La policy "articulos_select_published" solo permite
 * lectura de published=true para usuarios anónimos/normales.
 * El admin necesita una policy adicional de SELECT para
 * ver borradores. Si no existe, este listado mostrará solo
 * los publicados. Esto es un detalle de RLS.
 */
export async function getAllBlogPostsAdmin(): Promise<BlogPost[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articulos')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllBlogPostsAdmin] error:', error)
    return []
  }

  return (data ?? []) as BlogPost[]
}

/**
 * Obtiene un artículo por ID (para edición en admin).
 * Incluye publicados y borradores si el RLS lo permite.
 */
export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articulos')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getBlogPostById] error:', error)
    return null
  }

  return data as BlogPost | null
}
