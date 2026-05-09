// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// src/lib/services/colecciones.ts
// Capa de servicio: única vía de interacción con la tabla
// colecciones. Todas las consultas pasan por aquí.
//
// Schema alineado a Fase 1 (13 columnas):
// id, slug, titulo, extracto, descripcion, contenido,
// categoria, orden_display, destacada, published,
// serie_id, created_at, updated_at
// =========================================================

import 'server-only'

import { createClient } from '@/lib/supabase/server'

// ============================================
// Tipo exportado — 13 columnas exactas de Fase 1
// ============================================

export type Coleccion = {
  id: string                  // uuid, PK
  slug: string                // text, UNIQUE
  titulo: string              // text, NOT NULL
  extracto: string | null     // text, resumen corto
  descripcion: string | null  // text, descripción extendida
  contenido: string | null    // text, cuerpo rico (markdown/HTML)
  categoria: string | null    // text
  orden_display: number | null // integer, orden visual
  destacada: boolean          // boolean, default false
  published: boolean          // boolean, default false
  serie_id: string | null     // uuid, FK a series
  created_at: string          // timestamptz
  updated_at: string          // timestamptz
}

// ── Columnas explícitas (evita traer campos futuros) ──
const SELECT_COLUMNS = `
  id,
  slug,
  titulo,
  extracto,
  descripcion,
  contenido,
  categoria,
  orden_display,
  destacada,
  published,
  serie_id,
  created_at,
  updated_at
`

// ============================================
// Consultas públicas (respetan RLS: solo published)
// ============================================

/**
 * Obtiene una colección publicada por su slug.
 * Retorna null si no existe o no está publicada.
 */
export async function getColeccionBySlug(slug: string): Promise<Coleccion | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('colecciones')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[getColeccionBySlug] error:', error)
    return null
  }

  return data as Coleccion | null
}

/**
 * Obtiene todas las colecciones publicadas, ordenadas por
 * orden_display ascendente, luego created_at descendente.
 */
export async function getAllColecciones(): Promise<Coleccion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('colecciones')
    .select(SELECT_COLUMNS)
    .order('orden_display', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllColecciones] error:', error)
    return []
  }

  return (data ?? []) as Coleccion[]
}

/**
 * Obtiene las colecciones destacadas (destacada=true).
 */
export async function getFeaturedColecciones(): Promise<Coleccion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('colecciones')
    .select(SELECT_COLUMNS)
    .eq('destacada', true)
    .order('orden_display', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getFeaturedColecciones] error:', error)
    return []
  }

  return (data ?? []) as Coleccion[]
}

// ============================================
// Consultas administrativas (requieren sesión admin vía RLS)
// ============================================

/**
 * Obtiene TODAS las colecciones (publicadas y borradores).
 * Utilizado exclusivamente en /admin/estudios.
 * Requiere que la policy de admin permita SELECT.
 */
export async function getAllColeccionesAdmin(): Promise<Coleccion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('colecciones')
    .select(SELECT_COLUMNS)
    .order('orden_display', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllColeccionesAdmin] error:', error)
    return []
  }

  return (data ?? []) as Coleccion[]
}

/**
 * Obtiene una colección por ID (para edición en admin).
 * Incluye publicadas y borradores si el RLS lo permite.
 */
export async function getColeccionById(id: string): Promise<Coleccion | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('colecciones')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getColeccionById] error:', error)
    return null
  }

  return data as Coleccion | null
}
