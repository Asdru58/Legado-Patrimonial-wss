// =========================================================
// Legado Patrimonial WSS — Sistema de Podcast
// src/app/admin/podcast/[id]/editar/actions.ts
// Server Action: actualizar episodio
//
// Seguridad: usa el cliente SSR normal con sesión del
// usuario. El RLS (is_admin()) valida el UPDATE.
// NO usa SERVICE_ROLE_KEY.
// Validación H-001: todas las URLs pasan por validateMediaUrl.
// =========================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateMediaUrl } from '@/lib/utils/embed'

export interface EditarEpisodioState {
  success: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_TITULO = 300
const MAX_SLUG = 300
const MAX_DESCRIPCION = 2000
const MAX_TEMA = 200
const MAX_TEXTO_BIBLICO = 500
const MAX_PARTICIPANTES = 500
const MAX_URL = 1000
const MAX_CONFERENCIA = 500
const MAX_EXTRACTO = 2000

function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : null
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on'
}

function getInt(formData: FormData, key: string): number | null {
  const raw = formData.get(key)
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const parsed = parseInt(raw.trim(), 10)
  return Number.isNaN(parsed) ? null : parsed
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

export async function editarEpisodio(
  _prevState: EditarEpisodioState | null,
  formData: FormData
): Promise<EditarEpisodioState> {
  const fieldErrors: Record<string, string> = {}
  const supabase = await createClient()

  // ── ID ──
  const id = getString(formData, 'id')
  if (!id || !UUID_REGEX.test(id)) {
    return { success: false, error: 'Identificador de episodio inválido.', fieldErrors: {} }
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
  const descripcion = getString(formData, 'descripcion')
  const tema_doctrinal = getString(formData, 'tema_doctrinal')
  const texto_biblico_base = getString(formData, 'texto_biblico_base')
  const participantes = getString(formData, 'participantes')
  const audio_url = getString(formData, 'audio_url')
  const video_url = getString(formData, 'video_url')
  const conferencia_fuente = getString(formData, 'conferencia_fuente')
  const extracto_referenciado = getString(formData, 'extracto_referenciado')
  const duracion_minutos = getInt(formData, 'duracion_minutos')
  const numero_episodio = getInt(formData, 'numero_episodio')
  const temporada = getInt(formData, 'temporada') ?? 1
  const fecha_publicacion = getString(formData, 'fecha_publicacion')
  const published = getBoolean(formData, 'published')
  const destacado = getBoolean(formData, 'destacado')

  // ── Normalización fuerte del slug ──
  const slug = rawSlug ? normalizeSlug(rawSlug) : ''

  // ── Validaciones ──
  if (!titulo) fieldErrors.titulo = 'El título es obligatorio.'
  if (!slug) {
    fieldErrors.slug = 'El slug es obligatorio.'
  } else if (!SLUG_REGEX.test(slug)) {
    fieldErrors.slug = 'Solo minúsculas, números y guiones (ej. mi-episodio-01).'
  }

  if (fecha_publicacion && !isValidDateOnly(fecha_publicacion)) {
    fieldErrors.fecha_publicacion = 'La fecha no es válida.'
  }

  if (duracion_minutos !== null && duracion_minutos < 1) {
    fieldErrors.duracion_minutos = 'La duración debe ser al menos 1 minuto.'
  }
  if (numero_episodio !== null && numero_episodio < 1) {
    fieldErrors.numero_episodio = 'El número de episodio debe ser positivo.'
  }
  if (temporada < 1) {
    fieldErrors.temporada = 'La temporada debe ser al menos 1.'
  }

  // ── H-001: Validación de URLs de media (whitelist) ──
  const audioErr = validateMediaUrl(audio_url, 'audio')
  if (audioErr) fieldErrors.audio_url = audioErr

  const videoErr = validateMediaUrl(video_url, 'video')
  if (videoErr) fieldErrors.video_url = videoErr

  // ── Validaciones de longitud ──
  validateLength(titulo, MAX_TITULO, 'titulo', fieldErrors)
  validateLength(slug, MAX_SLUG, 'slug', fieldErrors)
  validateLength(descripcion, MAX_DESCRIPCION, 'descripcion', fieldErrors)
  validateLength(tema_doctrinal, MAX_TEMA, 'tema_doctrinal', fieldErrors)
  validateLength(texto_biblico_base, MAX_TEXTO_BIBLICO, 'texto_biblico_base', fieldErrors)
  validateLength(participantes, MAX_PARTICIPANTES, 'participantes', fieldErrors)
  validateLength(audio_url, MAX_URL, 'audio_url', fieldErrors)
  validateLength(video_url, MAX_URL, 'video_url', fieldErrors)
  validateLength(conferencia_fuente, MAX_CONFERENCIA, 'conferencia_fuente', fieldErrors)
  validateLength(extracto_referenciado, MAX_EXTRACTO, 'extracto_referenciado', fieldErrors)

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: 'Corrige los campos señalados.', fieldErrors }
  }

  // ── UPDATE directo (RLS verifica is_admin()) ──
  const { error: updateError, count } = await supabase
    .from('episodios')
    .update({
      titulo,
      slug,
      descripcion: descripcion || null,
      tema_doctrinal: tema_doctrinal || null,
      texto_biblico_base: texto_biblico_base || null,
      participantes: participantes || null,
      audio_url: audio_url || null,
      video_url: video_url || null,
      conferencia_fuente: conferencia_fuente || null,
      extracto_referenciado: extracto_referenciado || null,
      duracion_minutos: duracion_minutos,
      numero_episodio: numero_episodio,
      temporada,
      fecha_publicacion: fecha_publicacion || null,
      published,
      destacado,
    })
    .eq('id', id)

  if (updateError) {
    console.error('editarEpisodio updateError:', updateError)

    if (updateError.code === '23505') {
      return {
        success: false,
        error: null,
        fieldErrors: { slug: 'Este slug ya está en uso por otro episodio.' },
      }
    }

    return {
      success: false,
      error: 'No fue posible actualizar el episodio.',
      fieldErrors: {},
    }
  }

  if (count === 0) {
    return {
      success: false,
      error: 'El episodio no existe o no pudo ser actualizado.',
      fieldErrors: {},
    }
  }

  // ── Invalidar caché ──
  revalidatePath('/admin/podcast')
  revalidatePath('/podcast')

  return { success: true, error: null, fieldErrors: {} }
}
