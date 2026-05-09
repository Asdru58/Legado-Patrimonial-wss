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
import type { Conferencia } from '@/types/database'

// ============================================
// Tipos públicos
// ============================================

export type ArchivoSortOrder = 'reciente' | 'antiguo' | 'titulo'

export type ArchivoSearchParams = {
  /** Término de búsqueda FTS (opcional) */
  query: string | null
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

export type ArchivoSearchResult = {
  data: Conferencia[]
  total: number
}

// ============================================
// Constantes
// ============================================

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MAX_QUERY_LENGTH = 200

// ── Columnas alineadas con el tipo Conferencia (excluye fts) ──
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

/**
 * Construye la cláusula PostgREST para filtrar por formato.
 */
function buildFormatFilter(format: ArchivoFormato): string {
  switch (format) {
    case 'audio':
      return 'audio_url.not.is.null'
    case 'video':
      return 'and(video_provider.neq.none,video_status.eq.active)'
    case 'pdf':
      return 'pdf_url.not.is.null'
  }
}

// ============================================
// Búsqueda FTS con ranking real (vía RPC)
// ============================================

/**
 * Tipo de retorno de la RPC buscar_conferencias.
 * Extiende Conferencia con rank y total_count
 * calculados por PostgreSQL.
 */
type ConferenciaConRank = Conferencia & {
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
  const data: Conferencia[] = rows.map(
    ({ rank, total_count, ...conf }) => conf
  )

  return { data, total }
}

// ============================================
// Función pública (punto de entrada único)
// ============================================

/**
 * Punto de entrada exclusivo para la ruta de búsqueda FTS.
 *
 * Ejecuta búsqueda FTS vía RPC con ranking real
 * por ts_rank(). Filtros y paginación se resuelven en
 * PostgreSQL. El total es exacto vía count(*) over().
 */
export async function searchArchivoConferencias(
  params: Readonly<ArchivoSearchParams>
): Promise<ArchivoSearchResult> {
  const page = normalizePage(params.page)
  const limit = normalizeLimit(params.limit)
  const searchQuery = sanitizeQuery(params.query)
  const format = normalizeFormat(params.format)
  const periodRange = parsePeriodo(params.year)

  if (!searchQuery) {
    return { data: [], total: 0 }
  }

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

/**
 * Panel 1 — Conteo de conferencias por año.
 *
 * Consulta agregada liviana: selecciona solo la columna
 * `fecha_impartida` y agrega por año en el servidor Node.
 * PostgREST no soporta GROUP BY nativo, por lo que la
 * agrupación se resuelve aquí (~300 filas, 1 columna).
 *
 * También devuelve el conteo de registros sin fecha
 * para el enlace "Sin fecha (N)" en la vista de archivo.
 */
export async function getConferenciasPorAnio(): Promise<{
  anios: { anio: number; total: number }[]
  sinFecha: number
}> {
  const supabase = await createClient()

  // Consulta 1: todas las fechas (una sola columna, liviano)
  const { data: rows, error: errorFechas } = await supabase
    .from('conferencias')
    .select('fecha_impartida')
    .not('fecha_impartida', 'is', null)
    .range(0, 9999)

  if (errorFechas) {
    console.error('[getConferenciasPorAnio] error fechas:', errorFechas)
    throw new Error('Error al obtener el conteo por año.')
  }

  // Consulta 2: conteo de registros sin fecha (head: true = solo count)
  const { count: sinFecha, error: errorNull } = await supabase
    .from('conferencias')
    .select('id', { count: 'exact', head: true })
    .is('fecha_impartida', null)

  if (errorNull) {
    console.error('[getConferenciasPorAnio] error sinFecha:', errorNull)
    throw new Error('Error al obtener el conteo de registros sin fecha.')
  }

  // Agregar por año en servidor (timezone-safe: parseo directo del string ISO)
  const conteoPorAnio = new Map<number, number>()
  for (const row of rows ?? []) {
    const anio = Number((row.fecha_impartida as string).substring(0, 4))
    conteoPorAnio.set(anio, (conteoPorAnio.get(anio) ?? 0) + 1)
  }

  const anios = Array.from(conteoPorAnio.entries())
    .map(([anio, total]) => ({ anio, total }))
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
    .from('conferencias')
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
}): Promise<{ data: Conferencia[]; total: number }> {
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
    .from('conferencias')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .gte('fecha_impartida', fechaDesde)
    .lt('fecha_impartida', fechaHasta)
    .order('fecha_impartida', { ascending: true })
    .order('created_at', { ascending: true })
    .range(rangeFrom, rangeTo)

  if (error) {
    console.error('[getConferenciasPorMes] error:', error)
    throw new Error(`Error al obtener conferencias de ${month}/${year}.`)
  }

  return {
    data: (data ?? []) as Conferencia[],
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
}): Promise<{ data: Conferencia[]; total: number }> {
  const page = normalizePage(params.page)
  const limit = normalizeLimit(params.limit)

  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  const supabase = await createClient()

  const { data, error, count } = await supabase
    .from('conferencias')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .is('fecha_impartida', null)
    .order('titulo', { ascending: true })
    .range(rangeFrom, rangeTo)

  if (error) {
    console.error('[getConferenciasSinFecha] error:', error)
    throw new Error('Error al obtener conferencias sin fecha.')
  }

  return {
    data: (data ?? []) as Conferencia[],
    total: count ?? 0,
  }
}
