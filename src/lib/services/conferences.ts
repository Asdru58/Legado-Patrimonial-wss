// =========================================================
// Legado Patrimonial WSS — Fase 5.8
// src/lib/services/conferences.ts
// Capa de servicio: consultas de conferencias con FTS
// (ranking real + total exacto vía RPC) y navegación
//
// Parche de auditoría: filtros y conteo total movidos
// dentro de la RPC para paginación matemáticamente correcta.
// =========================================================

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { encodeBgeQuery } from '@/lib/services/bgeEncoder'
import type { ConferenciaPublica } from '@/types/database'

// ============================================
// Tipos públicos
// ============================================

export type ArchivoSortOrder = 'reciente' | 'antiguo' | 'titulo'

export type SearchMode = 'exact' | 'semantic' | 'lexical'

export type ArchivoSearchParams = {
  /** Término de búsqueda FTS (opcional) */
  query: string | null
  searchMode?: SearchMode
  /** Página actual (1-indexed) */
  page: number
  /** Registros por página */
  limit: number
  /** Orden de resultados (ignorado cuando hay query activo) */
  sort: ArchivoSortOrder
  /** Filtro por formato: 'audio', 'video', 'pdf' */
  format: string | null
  /** Filtro por año: '2024', '1998-2005', '1990s' */
  year: string | null
}

export type SemanticSearchContext = {
  documentoId: string
  pasajeId: string
  orden: number
  paginaInicio: number
  paginaFin: number
  texto: string
  similitud: number
}

export type ArchivoSearchConference = ConferenciaPublica & {
  semanticContext?: SemanticSearchContext
}

export type ArchivoSearchResult = {
  data: ArchivoSearchConference[]
  total: number
}

// ============================================
// Constantes
// ============================================

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MAX_QUERY_LENGTH = 200

// ── Columnas de la vista pública (sin campos operativos ni FTS) ──
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
  video_fallback_provider,
  video_fallback_url
`

// ============================================
// Normalización y validación de inputs
// ============================================

type ArchivoFormato = 'audio' | 'video' | 'pdf'

type PeriodRange = {
  from: string
  to: string
}

function normalizePage(page: number): number {
  if (!Number.isInteger(page) || page < 1) return DEFAULT_PAGE
  return page
}

function normalizeLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) return DEFAULT_LIMIT
  return Math.min(limit, MAX_LIMIT)
}

/**
 * Sanitiza el término de búsqueda:
 * - Trunca a MAX_QUERY_LENGTH caracteres
 * - Elimina caracteres especiales de tsquery
 * - Retorna null si queda vacío tras la limpieza
 */
function sanitizeQuery(raw: string | null): string | null {
  if (!raw) return null

  const trimmed = raw.trim().slice(0, MAX_QUERY_LENGTH)
  if (!trimmed) return null

  const cleaned = trimmed
    .replace(/[!&|():*<>'"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned || null
}

/**
 * Prepara una frase Exacta sin aplicar la limpieza propia de FTS.
 * Conserva puntuacion y espacios interiores para que la RPC reproduzca
 * la semantica literal validada del piloto.
 */
function sanitizeExactQuery(raw: string | null): string | null {
  if (!raw) return null

  const trimmed = raw.trim().slice(0, MAX_QUERY_LENGTH)
  return trimmed || null
}

function normalizeFormat(format: string | null): ArchivoFormato | null {
  if (!format) return null

  switch (format.trim().toLowerCase()) {
    case 'audio':
      return 'audio'
    case 'video':
      return 'video'
    case 'pdf':
      return 'pdf'
    default:
      return null
  }
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

// ============================================
// Búsqueda Exacta sobre el corpus piloto
// ============================================

// ============================================
// Busqueda Semantica sobre el corpus piloto
// ============================================

type CorpusSemanticSearchRow = {
  conferencia_id: string
  documento_id: string
  titulo: string
  fecha: string | null
  slug: string
  pasaje_id: string
  orden: number
  pagina_inicio: number
  pagina_fin: number
  texto: string
  similitud: number
  total_count: number | string
}

async function searchSemanticCorpus(
  params: {
    query: string
    page: number
    limit: number
  }
): Promise<ArchivoSearchResult> {
  const encoded = await encodeBgeQuery(params.query)
  const supabase = await createClient()

  const { data: rawRows, error } = await supabase.rpc(
    'buscar_corpus_semantica',
    {
      consulta_vector: encoded.vector,
      resultado_limit: params.limit,
      resultado_offset: (params.page - 1) * params.limit,
    }
  )

  if (error) {
    console.error('[searchSemanticCorpus] RPC error:', error)
    throw new Error('Error al ejecutar la busqueda semantica.')
  }

  const rows = (rawRows ?? []) as CorpusSemanticSearchRow[]

  if (rows.length === 0) {
    return { data: [], total: 0 }
  }

  const total = Number(rows[0].total_count)
  const hasInconsistentTotal = rows.some(
    (row) => Number(row.total_count) !== total
  )

  if (!Number.isSafeInteger(total) || total < 0 || hasInconsistentTotal) {
    console.error(
      '[searchSemanticCorpus] inconsistent total_count:',
      rows.map((row) => row.total_count)
    )
    throw new Error('La busqueda semantica devolvio un total invalido.')
  }

  const conferenceIds = rows.map((row) => row.conferencia_id)
  if (new Set(conferenceIds).size !== rows.length) {
    console.error('[searchSemanticCorpus] duplicate conference rows')
    throw new Error('La busqueda semantica devolvio un ranking invalido.')
  }

  const { data: conferenceRows, error: conferenceError } = await supabase
    .from('conferencias_publicas')
    .select(SELECT_COLUMNS)
    .in('id', conferenceIds)

  if (conferenceError) {
    console.error(
      '[searchSemanticCorpus] conference metadata error:',
      conferenceError
    )
    throw new Error('Error al completar los resultados semanticos.')
  }

  const conferenceById = new Map(
    ((conferenceRows ?? []) as ConferenciaPublica[]).map((conference) => [
      conference.id,
      conference,
    ] as const)
  )

  const data = rows.map((row): ArchivoSearchConference => {
    const conference = conferenceById.get(row.conferencia_id)

    if (!conference) {
      console.error(
        '[searchSemanticCorpus] missing conference metadata:',
        row.conferencia_id
      )
      throw new Error('Faltan metadatos de un resultado semantico.')
    }

    return {
      ...conference,
      id: row.conferencia_id,
      slug: row.slug,
      titulo: row.titulo,
      fecha_impartida: row.fecha,
      extracto: row.texto,
      semanticContext: {
        documentoId: row.documento_id,
        pasajeId: row.pasaje_id,
        orden: row.orden,
        paginaInicio: row.pagina_inicio,
        paginaFin: row.pagina_fin,
        texto: row.texto,
        similitud: row.similitud,
      },
    }
  })

  return { data, total }
}

/**
 * Tipo de retorno de la RPC buscar_corpus_exacta.
 */
type CorpusExactSearchRow = {
  conferencia_id: string
  documento_id: string
  titulo: string
  fecha: string | null
  slug: string
  pasaje_id: string
  orden: number
  pagina_inicio: number
  pagina_fin: number
  texto: string
  numero_ocurrencias: number
  total_count: number | string
}

/**
 * Ejecuta la RPC Exacta, valida su total y agrupa las filas por conferencia.
 * La primera fila de cada conferencia es su mejor pasaje por contrato SQL.
 */
async function searchExactCorpus(
  params: {
    query: string
    page: number
    limit: number
  }
): Promise<ArchivoSearchResult> {
  const supabase = await createClient()

  const { data: rawRows, error } = await supabase.rpc('buscar_corpus_exacta', {
    consulta: params.query,
    resultado_limit: params.limit,
    resultado_offset: (params.page - 1) * params.limit,
  })

  if (error) {
    console.error('[searchExactCorpus] RPC error:', error)
    throw new Error('Error al buscar en el archivo de conferencias.')
  }

  const rows = (rawRows ?? []) as CorpusExactSearchRow[]

  if (rows.length === 0) {
    return { data: [], total: 0 }
  }

  const total = Number(rows[0].total_count)
  const hasInconsistentTotal = rows.some(
    (row) => Number(row.total_count) !== total
  )

  if (!Number.isSafeInteger(total) || total < 0 || hasInconsistentTotal) {
    console.error(
      '[searchExactCorpus] inconsistent total_count:',
      rows.map((row) => row.total_count)
    )
    throw new Error('Error al buscar en el archivo de conferencias.')
  }

  const bestRowByConference = new Map<string, CorpusExactSearchRow>()

  for (const row of rows) {
    if (!bestRowByConference.has(row.conferencia_id)) {
      bestRowByConference.set(row.conferencia_id, row)
    }
  }

  const bestRows = [...bestRowByConference.values()]
  const conferenceIds = bestRows.map((row) => row.conferencia_id)

  const { data: conferenceRows, error: conferenceError } = await supabase
    .from('conferencias_publicas')
    .select(SELECT_COLUMNS)
    .in('id', conferenceIds)

  if (conferenceError) {
    console.error('[searchExactCorpus] conference metadata error:', conferenceError)
    throw new Error('Error al buscar en el archivo de conferencias.')
  }

  const conferenceById = new Map(
    ((conferenceRows ?? []) as ConferenciaPublica[]).map((conference) => [
      conference.id,
      conference,
    ] as const)
  )

  const data = bestRows.map((row): ConferenciaPublica => {
    const conference = conferenceById.get(row.conferencia_id)

    if (!conference) {
      console.error(
        '[searchExactCorpus] missing conference metadata:',
        row.conferencia_id
      )
      throw new Error('Error al buscar en el archivo de conferencias.')
    }

    return {
      ...conference,
      id: row.conferencia_id,
      slug: row.slug,
      titulo: row.titulo,
      fecha_impartida: row.fecha,
      extracto: row.texto,
    }
  })

  return { data, total }
}

// ============================================
// Búsqueda FTS con ranking real (vía RPC)
// ============================================

/**
 * Tipo de retorno de la RPC buscar_conferencias.
 * Extiende Conferencia con rank y total_count
 * calculados por PostgreSQL.
 */
type ConferenciaConRank = ConferenciaPublica & {
  rank: number
  total_count: number
}

/**
 * Ejecuta búsqueda FTS vía la RPC `buscar_conferencias` que:
 * 1. Calcula ts_rank() respetando pesos (A/B/C)
 * 2. Aplica filtros de formato y período en SQL
 * 3. Pagina con LIMIT/OFFSET en SQL
 * 4. Devuelve total_count exacto vía count(*) over()
 *
 * Todo ocurre en PostgreSQL: cero post-filtros en Node,
 * cero truncamiento de total, paginación matemáticamente
 * correcta independientemente del volumen.
 */
async function searchWithRanking(
  params: {
    query: string
    page: number
    limit: number
    format: ArchivoFormato | null
    year: PeriodRange | null
  }
): Promise<ArchivoSearchResult> {
  const supabase = await createClient()

  const { data: rawRows, error } = await supabase.rpc('buscar_conferencias', {
    termino: params.query,
    formato: params.format,
    fecha_desde: params.year?.from ?? null,
    fecha_hasta: params.year?.to ?? null,
    resultado_limit: params.limit,
    resultado_offset: (params.page - 1) * params.limit,
  })

  if (error) {
    console.error('[searchWithRanking] RPC error:', error)
    throw new Error('Error al buscar en el archivo de conferencias.')
  }

  const rows = (rawRows ?? []) as ConferenciaConRank[]

  // total_count es idéntico en todas las filas (window function);
  // lo tomamos de la primera. Si no hay filas, total es 0.
  const total = Number(rows[0]?.total_count ?? 0)

  // Eliminar rank y total_count antes de devolver al frontend
  const data: ConferenciaPublica[] = rows.map((row) => {
    const { rank, total_count: totalCount, ...conferencia } = row
    void rank
    void totalCount
    return conferencia
  })

  return { data, total }
}

// ============================================
// Función pública (punto de entrada único)
// ============================================

/**
 * Punto de entrada exclusivo para la ruta de busqueda.
 * Cada modalidad termina en su motor propio y nunca aplica fallback.
 */
export async function searchArchivoConferencias(
  params: Readonly<ArchivoSearchParams>
): Promise<ArchivoSearchResult> {
  const page = normalizePage(params.page)
  const limit = normalizeLimit(params.limit)

  if (params.searchMode === 'semantic') {
    if (params.query === null) {
      return { data: [], total: 0 }
    }

    return searchSemanticCorpus({
      query: params.query,
      page,
      limit,
    })
  }

  const searchQuery = params.searchMode === 'exact'
    ? sanitizeExactQuery(params.query)
    : sanitizeQuery(params.query)

  if (!searchQuery) {
    return { data: [], total: 0 }
  }

  if (params.searchMode === 'exact') {
    return searchExactCorpus({
      query: searchQuery,
      page,
      limit,
    })
  }

  const format = normalizeFormat(params.format)
  const periodRange = parsePeriodo(params.year)

  return searchWithRanking({
    query: searchQuery,
    page,
    limit,
    format,
    year: periodRange,
  })
}

// ============================================
// Navegación jerárquica — Archivo Cronológico
// (Paso 1 — Refactorización v2)
// ============================================

// ── Rango válido de años en el archivo ──
const MIN_YEAR = 1974
const MAX_YEAR = 2018

/** Fila devuelta por la RPC `conferencias_por_anio`. */
type ConteoAnioRpc = {
  anio: number
  total: number | string
}

/**
 * Panel 1 — Conteo de conferencias por año.
 *
 * La agregación se resuelve por completo en PostgreSQL mediante la RPC
 * `conferencias_por_anio`, que devuelve una fila por año (~45).
 *
 * Antes se descargaba la columna `fecha_impartida` de todo el catálogo y se
 * agrupaba en Node. Esa consulta pedía 10.000 filas y PostgREST devolvía solo
 * 1.000 (tope `db-max-rows`), sin que el código lo detectara: el total mostrado
 * era el número de filas recibidas, no el real. Contar en SQL elimina la
 * dependencia del transporte y del volumen del catálogo.
 *
 * También devuelve el conteo de registros sin fecha
 * para el enlace "Sin fecha (N)" en la vista de archivo.
 */
export async function getConferenciasPorAnio(): Promise<{
  anios: { anio: number; total: number }[]
  sinFecha: number
}> {
  const supabase = await createClient()

  // Consulta 1: conteo por año agregado en PostgreSQL (una fila por año)
  const { data: rows, error: errorFechas } = await supabase.rpc(
    'conferencias_por_anio',
  )

  if (errorFechas) {
    console.error('[getConferenciasPorAnio] error fechas:', errorFechas)
    throw new Error('Error al obtener el conteo por año.')
  }

  // Consulta 2: conteo de registros sin fecha (head: true = solo count)
  const { count: sinFecha, error: errorNull } = await supabase
    .from('conferencias_publicas')
    .select('id', { count: 'exact', head: true })
    .is('fecha_impartida', null)

  if (errorNull) {
    console.error('[getConferenciasPorAnio] error sinFecha:', errorNull)
    throw new Error('Error al obtener el conteo de registros sin fecha.')
  }

  // `total` llega como bigint, que PostgREST serializa como cadena.
  const anios = ((rows ?? []) as ConteoAnioRpc[])
    .map((row) => ({ anio: Number(row.anio), total: Number(row.total) }))
    .sort((a, b) => a.anio - b.anio)

  return { anios, sinFecha: sinFecha ?? 0 }
}

/**
 * Panel 2 — Meses con conferencias dentro de un año.
 *
 * Usa estrictamente rangos de fecha (>= inicio_año, < inicio_año_siguiente),
 * NO extract(). La agrupación por mes se resuelve en servidor Node.
 *
 * Validación: si `year` no está entre MIN_YEAR y MAX_YEAR,
 * retorna vacío sin consultar la base de datos.
 */
export async function getMesesConConferencias(year: number): Promise<{
  meses: { mes: number; total: number }[]
  totalAnio: number
}> {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return { meses: [], totalAnio: 0 }
  }

  const supabase = await createClient()

  // Rango de fecha del año completo
  const fechaDesde = `${year}-01-01`
  const fechaHasta = `${year + 1}-01-01`

  const { data: rows, error } = await supabase
    .from('conferencias_publicas')
    .select('fecha_impartida')
    .gte('fecha_impartida', fechaDesde)
    .lt('fecha_impartida', fechaHasta)

  if (error) {
    console.error('[getMesesConConferencias] error:', error)
    throw new Error(`Error al obtener meses del año ${year}.`)
  }

  // Agregar por mes en servidor (parseo directo del string ISO)
  const conteoPorMes = new Map<number, number>()
  for (const row of rows ?? []) {
    const mes = Number((row.fecha_impartida as string).substring(5, 7))
    conteoPorMes.set(mes, (conteoPorMes.get(mes) ?? 0) + 1)
  }

  const meses = Array.from(conteoPorMes.entries())
    .map(([mes, total]) => ({ mes, total }))
    .sort((a, b) => a.mes - b.mes)

  const totalAnio = meses.reduce((sum, m) => sum + m.total, 0)

  return { meses, totalAnio }
}

/**
 * Panel 3 — Conferencias de un año+mes, paginadas.
 *
 * Usa estrictamente rangos de fecha:
 *   WHERE fecha_impartida >= 'YYYY-MM-01'
 *     AND fecha_impartida <  'YYYY-(MM+1)-01'
 *
 * Trae registros completos (SELECT_COLUMNS) con paginación
 * por rango de PostgREST y count exacto.
 *
 * Validación: year (MIN_YEAR–MAX_YEAR), month (1–12).
 */
export async function getConferenciasPorMes(params: {
  year: number
  month: number
  page: number
  limit: number
}): Promise<{ data: ConferenciaPublica[]; total: number }> {
  const { year, month } = params

  if (
    !Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR ||
    !Number.isInteger(month) || month < 1 || month > 12
  ) {
    return { data: [], total: 0 }
  }

  const page = normalizePage(params.page)
  const limit = normalizeLimit(params.limit)

  // Rango de fecha: >= inicio del mes, < inicio del mes siguiente
  const mesStr = String(month).padStart(2, '0')
  const fechaDesde = `${year}-${mesStr}-01`

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextMesStr = String(nextMonth).padStart(2, '0')
  const fechaHasta = `${nextYear}-${nextMesStr}-01`

  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  const supabase = await createClient()

  const { data, error, count } = await supabase
    .from('conferencias_publicas')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .gte('fecha_impartida', fechaDesde)
    .lt('fecha_impartida', fechaHasta)
    .order('fecha_impartida', { ascending: true })
    .order('titulo', { ascending: true })
    .range(rangeFrom, rangeTo)

  if (error) {
    console.error('[getConferenciasPorMes] error:', error)
    throw new Error(`Error al obtener conferencias de ${month}/${year}.`)
  }

  return {
    data: (data ?? []) as ConferenciaPublica[],
    total: count ?? 0,
  }
}

/**
 * Sin fecha — Conferencias con fecha_impartida IS NULL, paginadas.
 *
 * Ordenadas alfabéticamente por título.
 * Ruta destino: /archivo/sin-fecha
 */
export async function getConferenciasSinFecha(params: {
  page: number
  limit: number
}): Promise<{ data: ConferenciaPublica[]; total: number }> {
  const page = normalizePage(params.page)
  const limit = normalizeLimit(params.limit)

  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  const supabase = await createClient()

  const { data, error, count } = await supabase
    .from('conferencias_publicas')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .is('fecha_impartida', null)
    .order('titulo', { ascending: true })
    .range(rangeFrom, rangeTo)

  if (error) {
    console.error('[getConferenciasSinFecha] error:', error)
    throw new Error('Error al obtener conferencias sin fecha.')
  }

  return {
    data: (data ?? []) as ConferenciaPublica[],
    total: count ?? 0,
  }
}
