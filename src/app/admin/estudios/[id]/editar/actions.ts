// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// src/app/admin/estudios/[id]/editar/actions.ts
// Server Action: actualizar colección
//
// Seguridad: usa el cliente SSR normal con sesión del
// usuario. El RLS (is_admin()) valida el UPDATE.
// NO usa SERVICE_ROLE_KEY.
//
// Schema alineado a Fase 1 (13 columnas):
// id, slug, titulo, extracto, descripcion, contenido,
// categoria, orden_display, destacada, published,
// serie_id, created_at, updated_at
// =========================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface EditarColeccionState {
  success: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_TITULO = 300
const MAX_SLUG = 300
const MAX_EXTRACTO = 500
const MAX_DESCRIPCION = 2000
const MAX_CONTENIDO = 50000
const MAX_CATEGORIA = 100

function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : null
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on'
}

function getIntOrNull(formData: FormData, key: string): number | null {
  const raw = formData.get(key)
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const parsed = parseInt(raw.trim(), 10)
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed
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

export async function editarColeccion(
  _prevState: EditarColeccionState | null,
  formData: FormData
): Promise<EditarColeccionState> {
  const fieldErrors: Record<string, string> = {}
  const supabase = await createClient()

  // ── ID ──
  const id = getString(formData, 'id')
  if (!id || !UUID_REGEX.test(id)) {
    return { success: false, error: 'Identificador de colección inválido.', fieldErrors: {} }
  }

  // ── Auth ──
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const isAdmin = (user?.app_metadata?.role as string | undefined) === 'admin'
  if (authError || !user || !isAdmin) {
    return { success: false, error: 'No autorizado para realizar esta acción.', fieldErrors: {} }
  }

  // ── Extracción segura (schema Fase 1) ──
  const titulo = getString(formData, 'titulo')
  const rawSlug = getString(formData, 'slug')
  const extracto = getString(formData, 'extracto')
  const descripcion = getString(formData, 'descripcion')
  const contenido = getString(formData, 'contenido')
  const categoria = getString(formData, 'categoria')
  const orden_display = getIntOrNull(formData, 'orden_display')
  const published = getBoolean(formData, 'published')
  const destacada = getBoolean(formData, 'destacada')

  // ── Normalización fuerte del slug ──
  const slug = rawSlug ? normalizeSlug(rawSlug) : ''

  // ── Validaciones ──
  if (!titulo) fieldErrors.titulo = 'El título es obligatorio.'
  if (!slug) {
    fieldErrors.slug = 'El slug es obligatorio.'
  } else if (!SLUG_REGEX.test(slug)) {
    fieldErrors.slug = 'Solo minúsculas, números y guiones (ej. los-sellos).'
  }

  // Validación editorial: al menos un campo de contenido
  if (!extracto && !descripcion && !contenido) {
    fieldErrors.extracto = 'Al menos uno de Extracto, Descripción o Contenido debe tener texto.'
  }

  validateLength(titulo, MAX_TITULO, 'titulo', fieldErrors)
  validateLength(slug, MAX_SLUG, 'slug', fieldErrors)
  validateLength(extracto, MAX_EXTRACTO, 'extracto', fieldErrors)
  validateLength(descripcion, MAX_DESCRIPCION, 'descripcion', fieldErrors)
  validateLength(contenido, MAX_CONTENIDO, 'contenido', fieldErrors)
  validateLength(categoria, MAX_CATEGORIA, 'categoria', fieldErrors)

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: 'Corrige los campos señalados.', fieldErrors }
  }

  // ── UPDATE directo (RLS verifica is_admin()) ──
  const { error: updateError, count } = await supabase
    .from('colecciones')
    .update({
      titulo,
      slug,
      extracto: extracto || null,
      descripcion: descripcion || null,
      contenido: contenido || null,
      categoria: categoria || null,
      orden_display,
      published,
      destacada,
    })
    .eq('id', id)

  if (updateError) {
    console.error('editarColeccion updateError:', updateError)

    if (updateError.code === '23505') {
      return {
        success: false,
        error: null,
        fieldErrors: { slug: 'Este slug ya está en uso por otra colección.' },
      }
    }

    return {
      success: false,
      error: 'No fue posible actualizar la colección.',
      fieldErrors: {},
    }
  }

  if (count === 0) {
    return {
      success: false,
      error: 'La colección no existe o no pudo ser actualizada.',
      fieldErrors: {},
    }
  }

  // ── Invalidar caché ──
  revalidatePath('/admin/estudios')
  revalidatePath('/estudios')

  return { success: true, error: null, fieldErrors: {} }
}
