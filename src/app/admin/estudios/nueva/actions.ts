// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// src/app/admin/estudios/nueva/actions.ts
// Server Action: crear colección
//
// Seguridad: usa el cliente SSR normal con sesión del
// usuario. El RLS (is_admin()) valida el INSERT.
// NO usa SERVICE_ROLE_KEY.
//
// Schema alineado a Fase 1 (13 columnas):
// id, slug, titulo, extracto, descripcion, contenido,
// categoria, orden_display, destacada, published,
// serie_id, created_at, updated_at
// =========================================================

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface CrearColeccionState {
  error: string | null
  fieldErrors: Record<string, string>
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
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

export async function crearColeccion(
  _prevState: CrearColeccionState | null,
  formData: FormData
): Promise<CrearColeccionState> {
  const fieldErrors: Record<string, string> = {}
  const supabase = await createClient()

  // ── Auth ──
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const isAdmin = (user?.app_metadata?.role as string | undefined) === 'admin'
  if (authError || !user || !isAdmin) {
    return { error: 'No autorizado para realizar esta acción.', fieldErrors: {} }
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

  // ── Validaciones obligatorias ──
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
    return { error: 'Corrige los campos señalados.', fieldErrors }
  }

  // ── INSERT directo (RLS verifica is_admin()) ──
  const { error: insertError } = await supabase
    .from('colecciones')
    .insert({
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

  if (insertError) {
    console.error('crearColeccion insertError:', insertError)

    if (insertError.code === '23505') {
      return {
        error: null,
        fieldErrors: { slug: 'Este slug ya existe. Elige uno diferente.' },
      }
    }

    return {
      error: 'No fue posible guardar la colección.',
      fieldErrors: {},
    }
  }

  redirect('/admin/estudios')
}
