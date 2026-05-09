// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/app/admin/blog/[id]/editar/actions.ts
// Server Action: actualizar artículo
//
// Seguridad: usa el cliente SSR normal con sesión del
// usuario. El RLS (is_admin()) valida el UPDATE.
// NO usa SERVICE_ROLE_KEY.
// =========================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface EditarArticuloState {
  success: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
 * Normalización fuerte del slug.
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

export async function editarArticulo(
  _prevState: EditarArticuloState | null,
  formData: FormData
): Promise<EditarArticuloState> {
  const fieldErrors: Record<string, string> = {}
  const supabase = await createClient()

  // ── ID ──
  const id = getString(formData, 'id')
  if (!id || !UUID_REGEX.test(id)) {
    return { success: false, error: 'Identificador de artículo inválido.', fieldErrors: {} }
  }

  // ── Auth ──
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const isAdmin = (user?.app_metadata?.role as string | undefined) === 'admin'
  if (authError || !user || !isAdmin) {
    return { success: false, error: 'No autorizado para realizar esta acción.', fieldErrors: {} }
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

  // ── Validaciones ──
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
    return { success: false, error: 'Corrige los campos señalados.', fieldErrors }
  }

  // ── UPDATE directo (RLS verifica is_admin()) ──
  const { error: updateError, count } = await supabase
    .from('articulos')
    .update({
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
    .eq('id', id)

  if (updateError) {
    console.error('editarArticulo updateError:', updateError)

    if (updateError.code === '23505') {
      return {
        success: false,
        error: null,
        fieldErrors: { slug: 'Este slug ya está en uso por otro artículo.' },
      }
    }

    return {
      success: false,
      error: 'No fue posible actualizar el artículo.',
      fieldErrors: {},
    }
  }

  if (count === 0) {
    return {
      success: false,
      error: 'El artículo no existe o no pudo ser actualizado.',
      fieldErrors: {},
    }
  }

  // ── Invalidar caché ──
  revalidatePath('/admin/blog')
  revalidatePath('/blog')

  return { success: true, error: null, fieldErrors: {} }
}
