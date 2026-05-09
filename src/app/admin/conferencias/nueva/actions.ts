// =========================================================
// Legado Patrimonial WSS — Fase 5.9 (Subfase B)
// src/app/admin/conferencias/nueva/actions.ts
// Server Action: crear conferencia + taxonomía via RPC atómica
// =========================================================

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface CrearConferenciaState {
  error: string | null
  fieldErrors: Record<string, string>
}

const VIDEO_PROVIDERS = ['none', 'youtube', 'r2', 's3'] as const
const FALLBACK_PROVIDERS = ['r2', 's3'] as const
const VIDEO_STATUSES = [
  'pending', 'active', 'unavailable', 'processing', 'disabled',
] as const

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{6,20}$/
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_TITULO = 200
const MAX_SLUG = 200
const MAX_EXTRACTO = 500
const MAX_DESCRIPCION = 10000
const MAX_PONENTE_NOMBRE = 150
const MAX_PONENTE_ROL = 150

function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : null
}

function getStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isValidHttpsUrl(value: string): boolean {
  try { return new URL(value).protocol === 'https:' }
  catch { return false }
}

function validateLength(
  value: string | null, max: number,
  fieldName: string, errors: Record<string, string>
): void {
  if (value && value.length > max) errors[fieldName] = `Máximo ${max} caracteres.`
}

export async function crearConferencia(
  _prevState: CrearConferenciaState | null,
  formData: FormData
): Promise<CrearConferenciaState> {
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
  const slug = getString(formData, 'slug')
  const fecha_impartida = getString(formData, 'fecha_impartida')
  const ponente_nombre = getString(formData, 'ponente_nombre')
  const ponente_rol = getString(formData, 'ponente_rol')
  const extracto = getString(formData, 'extracto')
  const descripcion = getString(formData, 'descripcion')

  const video_provider = getString(formData, 'video_provider') ?? 'none'
  const video_status = getString(formData, 'video_status') ?? 'pending'
  const raw_provider_id = getString(formData, 'video_provider_id')
  const raw_fallback_provider = getString(formData, 'video_fallback_provider')
  const raw_fallback_url = getString(formData, 'video_fallback_url')

  // ── Taxonomía con dedupe ──
  const raw_serie_id = getString(formData, 'serie_id')
  const raw_tematica_ids = getStringArray(formData, 'tematica_ids')

  const serie_id = raw_serie_id && UUID_REGEX.test(raw_serie_id)
    ? raw_serie_id : null

  if (raw_serie_id && !serie_id) {
    fieldErrors.serie_id = 'Identificador de serie inválido.'
  }

  const tematica_ids = Array.from(
    new Set(raw_tematica_ids.filter((id) => UUID_REGEX.test(id)))
  )

  if (raw_tematica_ids.length > 0 && tematica_ids.length !== new Set(raw_tematica_ids).size) {
    fieldErrors.tematica_ids = 'Una o más temáticas tienen un identificador inválido.'
  }

  // ── Validaciones obligatorias ──
  if (!titulo) fieldErrors.titulo = 'El título es obligatorio.'
  if (!slug) {
    fieldErrors.slug = 'El slug es obligatorio.'
  } else if (!SLUG_REGEX.test(slug)) {
    fieldErrors.slug = 'Solo minúsculas, números y guiones (ej. mi-conferencia-2025).'
  }
  if (!fecha_impartida) {
    fieldErrors.fecha_impartida = 'La fecha es obligatoria.'
  } else if (!isValidDateOnly(fecha_impartida)) {
    fieldErrors.fecha_impartida = 'La fecha no es válida.'
  }
  if (!VIDEO_PROVIDERS.includes(video_provider as any))
    fieldErrors.video_provider = 'Proveedor de video inválido.'
  if (!VIDEO_STATUSES.includes(video_status as any))
    fieldErrors.video_status = 'Estado de video inválido.'

  validateLength(titulo, MAX_TITULO, 'titulo', fieldErrors)
  validateLength(slug, MAX_SLUG, 'slug', fieldErrors)
  validateLength(extracto, MAX_EXTRACTO, 'extracto', fieldErrors)
  validateLength(descripcion, MAX_DESCRIPCION, 'descripcion', fieldErrors)
  validateLength(ponente_nombre, MAX_PONENTE_NOMBRE, 'ponente_nombre', fieldErrors)
  validateLength(ponente_rol, MAX_PONENTE_ROL, 'ponente_rol', fieldErrors)

  // ── Constraints de video ──
  const video_provider_id = video_provider === 'none' ? null : raw_provider_id
  if (video_provider !== 'none' && !video_provider_id)
    fieldErrors.video_provider_id = 'El ID del proveedor es obligatorio cuando hay video.'
  if (video_provider === 'youtube' && video_provider_id && !YOUTUBE_ID_REGEX.test(video_provider_id))
    fieldErrors.video_provider_id = 'El ID de YouTube no es válido.'

  let video_fallback_provider: string | null = null
  let video_fallback_url: string | null = null

  if (video_provider !== 'none') {
    video_fallback_provider = raw_fallback_provider || null
    video_fallback_url = raw_fallback_url || null
    if (video_fallback_provider && !FALLBACK_PROVIDERS.includes(video_fallback_provider as any))
      fieldErrors.video_fallback_provider = 'Proveedor de fallback inválido.'
    if (video_fallback_provider && !video_fallback_url)
      fieldErrors.video_fallback_url = 'La URL de fallback es obligatoria si seleccionaste un proveedor.'
    if (!video_fallback_provider && video_fallback_url)
      fieldErrors.video_fallback_provider = 'Selecciona un proveedor de fallback si proporcionas una URL.'
    if (video_fallback_url && !isValidHttpsUrl(video_fallback_url))
      fieldErrors.video_fallback_url = 'La URL de fallback debe ser una URL HTTPS válida.'
    if (video_fallback_provider && video_fallback_provider === video_provider)
      fieldErrors.video_fallback_provider = 'El proveedor de fallback debe ser distinto del proveedor principal.'
  }

  if (video_provider === 'none' && video_status === 'active')
    fieldErrors.video_status = 'No puedes marcar el video como activo si el proveedor es "none".'

  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Corrige los campos señalados.', fieldErrors }
  }

  // ── RPC atómica: conferencia + taxonomía en una transacción ──
  const { data: newId, error: rpcError } = await supabase.rpc(
    'crear_conferencia_con_taxonomia',
    {
      p_titulo: titulo,
      p_slug: slug,
      p_fecha_impartida: fecha_impartida,
      p_ponente_nombre: ponente_nombre,
      p_ponente_rol: ponente_rol,
      p_extracto: extracto,
      p_descripcion: descripcion,
      p_video_provider: video_provider,
      p_video_provider_id: video_provider_id,
      p_video_status: video_status,
      p_video_fallback_provider: video_fallback_provider,
      p_video_fallback_url: video_fallback_url,
      p_serie_id: serie_id,
      p_tematica_ids: tematica_ids,
    }
  )

  if (rpcError) {
    console.error('crearConferencia rpcError:', rpcError)

    if (rpcError.code === '23505') {
      return {
        error: null,
        fieldErrors: { slug: 'Este slug ya existe. Elige uno diferente.' },
      }
    }

    if (rpcError.message?.includes('Serie inválida')) {
      return {
        error: null,
        fieldErrors: { serie_id: 'La serie seleccionada no existe.' },
      }
    }

    if (rpcError.message?.includes('Temática inválida')) {
      return {
        error: null,
        fieldErrors: { tematica_ids: 'Una o más temáticas seleccionadas no existen.' },
      }
    }

    return {
      error: 'No fue posible guardar la conferencia.',
      fieldErrors: {},
    }
  }

  if (!newId) {
    return {
      error: 'No fue posible guardar la conferencia.',
      fieldErrors: {},
    }
  }

  redirect('/admin/conferencias')
}
