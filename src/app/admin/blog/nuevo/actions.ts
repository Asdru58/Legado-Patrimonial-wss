// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/app/admin/blog/nuevo/actions.ts
// Server Action: crear artículo
//
// Seguridad: usa el cliente SSR normal con sesión del
// usuario. El RLS (is_admin()) valida el INSERT.
// NO usa SERVICE_ROLE_KEY.
// =========================================================

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface CrearArticuloState {
  error: string | null
  fieldErrors: Record<string, string>
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const MAX_TITULO = 300
const MAX_SLUG = 300
const MAX_EXTRACTO = 600
const MAX_CONTENIDO = 50000
const MAX_CATEGORIA = 100
const MAX_AUTOR = 200
const MAX_TIEMPO_LECTURA = 50

function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : null
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on'
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validateLength(
  value: string | null, max: number,
  fieldName: string, errors: Record<string, string>
): void {
  if (value && value.length > max) errors[fieldName] = `Máximo ${max} caracteres.`
}

/**
 * Normalización fuerte del slug:
 * - Convierte a minúsculas
 * - Remueve acentos (NFD + strip diacritics)
 * - Reemplaza caracteres no alfanuméricos por guiones
 * - Colapsa guiones múltiples
 * - Elimina guiones al inicio y final
 */
function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function crearArticulo(
  _prevState: CrearArticuloState | null,
  formData: FormData
): Promise<CrearArticuloState> {
  const fieldErrors: Record<string, string> = {}
  const supabase = await createClient()

  // ── Auth ──
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const isAdmin = (user?.app_metadata?.role as string | undefined) === 'admin'
  if (authError || !user || !isAdmin) {
    return { error: 'No autorizado para realizar esta acción.', fieldErrors: {} }
  }

  // ── Extracción segura ──
  const titulo = getString(formData, 'titulo')
  const rawSlug = getString(formData, 'slug')
  const extracto = getString(formData, 'extracto')
  const contenido = getString(formData, 'contenido')
  const categoria = getString(formData, 'categoria')
  const autor = getString(formData, 'autor')
  const fecha_publicacion = getString(formData, 'fecha_publicacion')
  const tiempo_lectura = getString(formData, 'tiempo_lectura')
  const published = getBoolean(formData, 'published')
  const destacado = getBoolean(formData, 'destacado')

  // ── Normalización fuerte del slug ──
  const slug = rawSlug ? normalizeSlug(rawSlug) : ''

  // ── Validaciones obligatorias ──
  if (!titulo) fieldErrors.titulo = 'El título es obligatorio.'
  if (!slug) {
    fieldErrors.slug = 'El slug es obligatorio.'
  } else if (!SLUG_REGEX.test(slug)) {
    fieldErrors.slug = 'Solo minúsculas, números y guiones (ej. mi-articulo-2026).'
  }
  if (!contenido) fieldErrors.contenido = 'El contenido es obligatorio.'

  if (fecha_publicacion && !isValidDateOnly(fecha_publicacion)) {
    fieldErrors.fecha_publicacion = 'La fecha no es válida.'
  }

  validateLength(titulo, MAX_TITULO, 'titulo', fieldErrors)
  validateLength(slug, MAX_SLUG, 'slug', fieldErrors)
  validateLength(extracto, MAX_EXTRACTO, 'extracto', fieldErrors)
  validateLength(contenido, MAX_CONTENIDO, 'contenido', fieldErrors)
  validateLength(categoria, MAX_CATEGORIA, 'categoria', fieldErrors)
  validateLength(autor, MAX_AUTOR, 'autor', fieldErrors)
  validateLength(tiempo_lectura, MAX_TIEMPO_LECTURA, 'tiempo_lectura', fieldErrors)

  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Corrige los campos señalados.', fieldErrors }
  }

  // ── INSERT directo (RLS verifica is_admin()) ──
  const { error: insertError } = await supabase
    .from('articulos')
    .insert({
      titulo,
      slug,
      extracto: extracto || null,
      contenido,
      categoria: categoria || null,
      autor: autor || 'Legado Patrimonial WSS',
      fecha_publicacion: fecha_publicacion || null,
      tiempo_lectura: tiempo_lectura || null,
      published,
      destacado,
    })

  if (insertError) {
    console.error('crearArticulo insertError:', insertError)

    if (insertError.code === '23505') {
      return {
        error: null,
        fieldErrors: { slug: 'Este slug ya existe. Elige uno diferente.' },
      }
    }

    return {
      error: 'No fue posible guardar el artículo.',
      fieldErrors: {},
    }
  }

  redirect('/admin/blog')
}
