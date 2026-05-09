import 'server-only'

import type { FilterState } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import type { Conferencia } from '@/types/database'

export type ArchivoSortOrder = 'reciente' | 'antiguo' | 'titulo'

export type GetArchivoCronologicoPageParams = {
  page: number
  limit: number
  sort: ArchivoSortOrder
  filters: FilterState
}

export type GetArchivoCronologicoPageResult = {
  data: Conferencia[]
  total: number
}

type ArchivoFormato = 'audio' | 'video' | 'pdf'

type PeriodRange = {
  from: string
  to: string
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function normalizePage(page: number): number {
  if (!Number.isInteger(page) || page < 1) {
    return DEFAULT_PAGE
  }
  return page
}

function normalizeLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) {
    return DEFAULT_LIMIT
  }
  return Math.min(limit, MAX_LIMIT)
}

function parsePeriodo(periodo: string | null): PeriodRange | null {
  if (!periodo) return null

  const value = periodo.trim().toLowerCase()
  if (!value) return null

  const singleYearMatch = /^(\d{4})$/.exec(value)
  if (singleYearMatch) {
    const year = Number(singleYearMatch[1])
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }

  const rangeMatch = /^(\d{4})\s*-\s*(\d{4})$/.exec(value)
  if (rangeMatch) {
    const firstYear = Number(rangeMatch[1])
    const secondYear = Number(rangeMatch[2])
    const fromYear = Math.min(firstYear, secondYear)
    const toYear = Math.max(firstYear, secondYear)
    return { from: `${fromYear}-01-01`, to: `${toYear}-12-31` }
  }

  const decadeMatch = /^(\d{4})'?s$/.exec(value)
  if (decadeMatch) {
    const startYear = Number(decadeMatch[1])
    if (startYear % 10 !== 0) return null
    return { from: `${startYear}-01-01`, to: `${startYear + 9}-12-31` }
  }

  return null
}

function normalizeFormatos(formatos: string[]): ArchivoFormato[] {
  const normalized = new Set<ArchivoFormato>()

  for (const formato of formatos) {
    switch (formato.trim().toLowerCase()) {
      case 'audio':
        normalized.add('audio')
        break
      case 'video':
        normalized.add('video')
        break
      case 'pdf':
        normalized.add('pdf')
        break
      default:
        break
    }
  }

  return Array.from(normalized)
}

/**
 * Construye un filtro OR plano para los formatos seleccionados.
 * Ya no hay tabla multimedia — los campos son directos en conferencias.
 *
 * audio → audio_url no es null
 * video → video_provider distinto de 'none' Y video_status = 'active'
 * pdf   → pdf_url no es null
 */
function buildFormatOrClause(formatos: ArchivoFormato[]): string | null {
  const clauses: string[] = []

  for (const formato of formatos) {
    switch (formato) {
      case 'audio':
        clauses.push('audio_url.not.is.null')
        break
      case 'video':
        // Supabase PostgREST: and() dentro de or() para condición compuesta
        clauses.push('and(video_provider.neq.none,video_status.eq.active)')
        break
      case 'pdf':
        clauses.push('pdf_url.not.is.null')
        break
      default:
        break
    }
  }

  if (clauses.length === 0) return null
  return clauses.join(',')
}

// ── Todas las columnas del tipo Conferencia (excluye solo fts) ──
const SELECT_COLUMNS = `
  id,
  slug,
  titulo,
  extracto,
  descripcion,
  fecha_impartida,
  ponente_nombre,
  ponente_rol,
  audio_url,
  audio_duracion,
  pdf_url,
  video_provider,
  video_provider_id,
  video_status,
  video_checked_at,
  video_fallback_provider,
  video_fallback_url,
  created_at,
  updated_at
`

export async function getArchivoCronologicoPage(
  params: Readonly<GetArchivoCronologicoPageParams>
): Promise<GetArchivoCronologicoPageResult> {
  const page = normalizePage(params.page)
  const limit = normalizeLimit(params.limit)
  const periodRange = parsePeriodo(params.filters.periodo)
  const formatos = normalizeFormatos(params.filters.formatos)
  const formatOrClause = buildFormatOrClause(formatos)
  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  const supabase = await createClient()

  let query = supabase
    .from('conferencias')
    .select(SELECT_COLUMNS, { count: 'exact' })

  // Filtro por período
  if (periodRange) {
    query = query
      .gte('fecha_impartida', periodRange.from)
      .lte('fecha_impartida', periodRange.to)
  }

  // Filtro por formato — ahora directamente sobre conferencias
  if (formatOrClause) {
    query = query.or(formatOrClause)
  }

  // Ordenamiento
  switch (params.sort) {
    case 'antiguo':
      query = query
        .order('fecha_impartida', { ascending: true })
        .order('created_at', { ascending: true })
      break

    case 'titulo':
      query = query
        .order('titulo', { ascending: true })
        .order('fecha_impartida', { ascending: false })
        .order('created_at', { ascending: false })
      break

    case 'reciente':
    default:
      query = query
        .order('fecha_impartida', { ascending: false })
        .order('created_at', { ascending: false })
      break
  }

  const { data, error, count } = await query.range(rangeFrom, rangeTo)

  if (error) {
    throw new Error(
      `[getArchivoCronologicoPage] Error consultando Supabase: ${error.message}`
    )
  }

  return {
    data: (data ?? []) as Conferencia[],
    total: count ?? 0,
  }
}
