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

/** Orden de la modalidad Exacta. Lo resuelve la RPC `buscar_corpus_exacta_v2`. */
export type ExactOrder = 'antiguos' | 'recientes' | 'relevancia'

export const EXACT_ORDERS: readonly ExactOrder[] = ['antiguos', 'recientes', 'relevancia']

/**
 * Filtros de la modalidad Exacta. Los años se validan antes de llegar aquí;
 * la RPC los vuelve a validar y rechaza lo que quede fuera de 1974-2018.
 */
export type ExactSearchFilters = {
  anioDesde: number | null
  anioHasta: number | null
  orden: ExactOrder
  /**
   * Huella del corpus que devolvió la primera página. Si al pedir otra página
   * el corpus ha cambiado, la RPC se niega y la búsqueda debe reiniciarse.
   */
  huella: string | null
}

/**
 * El corpus cambió entre dos páginas de una misma búsqueda. Seguir paginando
 * podría repetir o saltarse conferencias, así que la página lo comunica y
 * ofrece volver a empezar.
 */
export class CorpusCambiadoError extends Error {
  constructor() {
    super('El corpus cambió durante la navegación.')
    this.name = 'CorpusCambiadoError'
  }
}

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
  /** Solo modalidad Exacta: años, orden y huella de la navegación */
  exactFilters?: ExactSearchFilters
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

export type ExactSearchContext = {
  documentoId: string
  pasajeId: string
  orden: number
  paginaInicio: number
  paginaFin: number
  numeroOcurrencias: number
  /**
   * El pasaje en bruto. Opcional a proposito: el contexto representativo que ya
   * usaban la tarjeta y el detalle lo toma de `extracto`, y solo las citas de
   * `exactMatches` necesitan traer el suyo.
   */
  texto?: string
}

export type ValidatedExactPassage = {
  query: string
  pasajeId: string
  paginaInicio: number
  paginaFin: number
  texto: string
}

export type ValidatedSemanticPassage = {
  pasajeId: string
  paginaInicio: number
  paginaFin: number
  texto: string
}

export type LexicalSearchContext = {
  documentoId: string
  pasajeId: string
  orden: number
  paginaInicio: number
  paginaFin: number
  texto: string
  relevancia: number
}

export type ArchivoSearchConference = ConferenciaPublica & {
  exactContext?: ExactSearchContext
  /**
   * Todas las coincidencias de esta conferencia, no solo la primera.
   *
   * La RPC ya las devolvia: su `resultado_limit` cuenta CONFERENCIAS y luego
   * trae todos los pasajes de cada una. El servicio se quedaba con la primera
   * fila y tiraba el resto, de modo que una conferencia con nueve menciones
   * mostraba una. No cuesta una consulta mas: solo dejar de descartarlas.
   */
  exactMatches?: ExactSearchContext[]
  semanticContext?: SemanticSearchContext
  lexicalContext?: LexicalSearchContext
}

export type ArchivoSearchResult = {
  data: ArchivoSearchConference[]
  total: number
  /** Solo modalidad Exacta: huella del corpus con la que se calculó la página */
  huella?: string
}

// ============================================
// Constantes
// ============================================

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MAX_QUERY_LENGTH = 200
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

/**
 * Canonicaliza la entrada Léxica sin truncarla ni interpretar sintaxis FTS.
 * La RPC aplica el límite defensivo y construye el plainto_tsquery.
 */
function sanitizeLexicalQuery(raw: string | null): string | null {
  if (!raw) return null

  const canonical = raw.trim().replace(/\s+/g, ' ')
  return canonical || null
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

/**
 * Revalida el contexto Semantico con la misma consulta vectorial y la RPC
 * publica ya autorizada. La URL aporta solo identificadores no confiables.
 *
 * Se mantiene deliberadamente en buscar_corpus_semantica (v1) y no en la v2:
 * la v2 aplica un prefiltro ANN que no garantiza exactitud total, de modo que
 * un pasaje legitimo citado en una URL podria quedar fuera de su alcance y
 * romper el enlace compartido. Esta ruta se usa poco, asi que el costo mayor
 * de la busqueda exacta no compensa ese riesgo.
 */
export async function getValidatedSemanticPassage(
  params: Readonly<{
    query: string
    passageId: string
    conferenceId: string
  }>
): Promise<ValidatedSemanticPassage | null> {
  const query = params.query.trim()

  if (
    !query ||
    query.length > MAX_QUERY_LENGTH ||
    !UUID_REGEX.test(params.passageId) ||
    !UUID_REGEX.test(params.conferenceId)
  ) {
    return null
  }

  const encoded = await encodeBgeQuery(query)
  const supabase = await createClient()
  const { data: rawRows, error } = await supabase.rpc(
    'buscar_corpus_semantica',
    {
      consulta_vector: encoded.vector,
      resultado_limit: MAX_LIMIT,
      resultado_offset: 0,
    }
  )

  if (error) {
    console.error('[getValidatedSemanticPassage] RPC error:', error)
    return null
  }

  const row = ((rawRows ?? []) as CorpusSemanticSearchRow[]).find(
    (candidate) =>
      candidate.pasaje_id === params.passageId &&
      candidate.conferencia_id === params.conferenceId
  )

  if (
    !row ||
    typeof row.texto !== 'string' ||
    !Number.isSafeInteger(row.pagina_inicio) ||
    !Number.isSafeInteger(row.pagina_fin) ||
    row.pagina_inicio < 1 ||
    row.pagina_fin < row.pagina_inicio
  ) {
    return null
  }

  return {
    pasajeId: row.pasaje_id,
    paginaInicio: row.pagina_inicio,
    paginaFin: row.pagina_fin,
    texto: row.texto,
  }
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
    'buscar_corpus_semantica_v2',
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

// ============================================
// Búsqueda Léxica sobre el corpus piloto
// ============================================

type CorpusLexicalSearchRow = {
  conferencia_id: string
  documento_id: string
  pasaje_id: string
  orden: number
  pagina_inicio: number
  pagina_fin: number
  texto: string
  relevancia: number
  total_count: number | string
}

async function searchLexicalCorpus(
  params: {
    query: string
    page: number
    limit: number
  }
): Promise<ArchivoSearchResult> {
  const supabase = await createClient()

  const { data: rawRows, error } = await supabase.rpc(
    'buscar_corpus_lexica',
    {
      consulta: params.query,
      limite: params.limit,
      desplazamiento: (params.page - 1) * params.limit,
    }
  )

  if (error) {
    console.error('[searchLexicalCorpus] RPC error:', error)
    throw new Error('Búsqueda por palabras clave no disponible.')
  }

  const rows = (rawRows ?? []) as CorpusLexicalSearchRow[]

  if (rows.length === 0) {
    return { data: [], total: 0 }
  }

  const total = Number(rows[0].total_count)
  const hasInconsistentTotal = rows.some(
    (row) => Number(row.total_count) !== total
  )

  if (!Number.isSafeInteger(total) || total < 0 || hasInconsistentTotal) {
    console.error(
      '[searchLexicalCorpus] inconsistent total_count:',
      rows.map((row) => row.total_count)
    )
    throw new Error('Búsqueda por palabras clave no disponible.')
  }

  const conferenceIds = rows.map((row) => row.conferencia_id)
  if (new Set(conferenceIds).size !== rows.length) {
    console.error('[searchLexicalCorpus] duplicate conference rows')
    throw new Error('Búsqueda por palabras clave no disponible.')
  }

  const { data: conferenceRows, error: conferenceError } = await supabase
    .from('conferencias_publicas')
    .select(SELECT_COLUMNS)
    .in('id', conferenceIds)

  if (conferenceError) {
    console.error(
      '[searchLexicalCorpus] conference metadata error:',
      conferenceError
    )
    throw new Error('Búsqueda por palabras clave no disponible.')
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
        '[searchLexicalCorpus] missing conference metadata:',
        row.conferencia_id
      )
      throw new Error('Búsqueda por palabras clave no disponible.')
    }

    return {
      ...conference,
      id: row.conferencia_id,
      extracto: row.texto,
      lexicalContext: {
        documentoId: row.documento_id,
        pasajeId: row.pasaje_id,
        orden: row.orden,
        paginaInicio: row.pagina_inicio,
        paginaFin: row.pagina_fin,
        texto: row.texto,
        relevancia: row.relevancia,
      },
    }
  })

  return { data, total }
}

/**
 * Tipo de retorno de la RPC buscar_corpus_exacta_v2.
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
  posicion: number | string
  total_count: number | string
  huella_corpus: string
}

/** Pista con la que la RPC avisa de que el corpus cambió entre páginas. */
const HINT_CORPUS_CAMBIADO = 'huella_corpus_cambiada'

/** Tope de páginas que recorre la validación de un pasaje antes de rendirse. */
const MAX_VALIDATION_PAGES = 10

/**
 * Busca un pasaje concreto entre los resultados Exactos de una consulta.
 *
 * Los resultados van en orden cronológico, así que un pasaje de la página 3 ya
 * no está entre las primeras cien conferencias. Se acota la búsqueda al año de
 * la conferencia; las que no tienen fecha van al final, y se empieza a leer
 * justo donde terminan las fechadas.
 */
async function findExactRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { query: string; passageId: string; conferenceId: string; year: number | null }
): Promise<CorpusExactSearchRow | null> {
  let offset = 0
  let desde: number | null = params.year
  let hasta: number | null = params.year

  if (params.year === null) {
    // Sin fecha: cuántas conferencias fechadas preceden a las que no la tienen.
    const { data, error } = await supabase.rpc('buscar_corpus_exacta_v2', {
      consulta: params.query,
      resultado_limit: 1,
      resultado_offset: 0,
      anio_desde: MIN_YEAR,
      anio_hasta: MAX_YEAR,
      ordenar_por: 'antiguos',
    })
    if (error) {
      console.error('[getValidatedExactPassage] RPC error:', error)
      return null
    }
    offset = Number(((data ?? []) as CorpusExactSearchRow[])[0]?.total_count ?? 0)
    desde = null
    hasta = null
  }

  for (let pagina = 0; pagina < MAX_VALIDATION_PAGES; pagina++) {
    const { data, error } = await supabase.rpc('buscar_corpus_exacta_v2', {
      consulta: params.query,
      resultado_limit: MAX_LIMIT,
      resultado_offset: offset,
      anio_desde: desde,
      anio_hasta: hasta,
      ordenar_por: 'antiguos',
    })
    if (error) {
      console.error('[getValidatedExactPassage] RPC error:', error)
      return null
    }
    const rows = (data ?? []) as CorpusExactSearchRow[]
    const encontrada = rows.find(
      (candidate) =>
        candidate.pasaje_id === params.passageId &&
        candidate.conferencia_id === params.conferenceId
    )
    if (encontrada) return encontrada
    if (rows.length === 0) return null
    offset += MAX_LIMIT
    if (offset >= Number(rows[0].total_count)) return null
  }

  return null
}

/**
 * Revalida el contexto Exacto desde el servidor usando exclusivamente la RPC
 * publica ya autorizada. La URL solo aporta identificadores no confiables:
 * el bloque se devuelve cuando el pasaje aparece para la consulta y pertenece
 * a la conferencia abierta.
 */
export async function getValidatedExactPassage(
  params: Readonly<{
    query: string
    passageId: string
    conferenceId: string
    /** Fecha de la conferencia abierta (AAAA-MM-DD) o null si no la tiene */
    conferenceDate: string | null
  }>
): Promise<ValidatedExactPassage | null> {
  const query = params.query.trim()

  if (
    !query ||
    query.length > MAX_QUERY_LENGTH ||
    !UUID_REGEX.test(params.passageId) ||
    !UUID_REGEX.test(params.conferenceId)
  ) {
    return null
  }

  const year = params.conferenceDate ? Number(params.conferenceDate.slice(0, 4)) : null
  const supabase = await createClient()
  const row = await findExactRow(supabase, {
    query,
    passageId: params.passageId,
    conferenceId: params.conferenceId,
    year: year !== null && Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year : null,
  })

  if (
    !row ||
    typeof row.texto !== 'string' ||
    !Number.isSafeInteger(row.pagina_inicio) ||
    !Number.isSafeInteger(row.pagina_fin) ||
    row.pagina_inicio < 1 ||
    row.pagina_fin < row.pagina_inicio
  ) {
    return null
  }

  return {
    query,
    pasajeId: row.pasaje_id,
    paginaInicio: row.pagina_inicio,
    paginaFin: row.pagina_fin,
    texto: row.texto,
  }
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
    filters: ExactSearchFilters
  }
): Promise<ArchivoSearchResult> {
  const supabase = await createClient()

  const { data: rawRows, error } = await supabase.rpc('buscar_corpus_exacta_v2', {
    consulta: params.query,
    resultado_limit: params.limit,
    resultado_offset: (params.page - 1) * params.limit,
    anio_desde: params.filters.anioDesde,
    anio_hasta: params.filters.anioHasta,
    ordenar_por: params.filters.orden,
    huella_esperada: params.filters.huella,
  })

  if (error) {
    if (error.hint === HINT_CORPUS_CAMBIADO) {
      throw new CorpusCambiadoError()
    }
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

  // Se conservan TODAS las filas de cada conferencia. La primera sigue siendo
  // la representativa —`exactContext`, que alimenta la tarjeta y el detalle—,
  // y las demas viajan en `exactMatches` para el arbol de resultados.
  const rowsByConference = new Map<string, CorpusExactSearchRow[]>()

  for (const row of rows) {
    const previas = rowsByConference.get(row.conferencia_id)
    if (previas) previas.push(row)
    else rowsByConference.set(row.conferencia_id, [row])
  }

  const bestRows = [...rowsByConference.values()].map((grupo) => grupo[0])
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

  const data = bestRows.map((row): ArchivoSearchConference => {
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
      exactContext: {
        documentoId: row.documento_id,
        pasajeId: row.pasaje_id,
        orden: row.orden,
        paginaInicio: row.pagina_inicio,
        paginaFin: row.pagina_fin,
        numeroOcurrencias: row.numero_ocurrencias,
      },
      exactMatches: (rowsByConference.get(row.conferencia_id) ?? [row]).map(
        (fila): ExactSearchContext => ({
          documentoId: fila.documento_id,
          pasajeId: fila.pasaje_id,
          orden: fila.orden,
          paginaInicio: fila.pagina_inicio,
          paginaFin: fila.pagina_fin,
          numeroOcurrencias: fila.numero_ocurrencias,
          texto: fila.texto,
        })
      ),
    }
  })

  return { data, total, huella: rows[0].huella_corpus }
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
    : params.searchMode === 'lexical'
      ? sanitizeLexicalQuery(params.query)
      : sanitizeQuery(params.query)

  if (!searchQuery) {
    return { data: [], total: 0 }
  }

  if (params.searchMode === 'exact') {
    return searchExactCorpus({
      query: searchQuery,
      page,
      limit,
      filters: params.exactFilters ?? { anioDesde: null, anioHasta: null, orden: 'antiguos', huella: null },
    })
  }

  if (params.searchMode === 'lexical') {
    return searchLexicalCorpus({
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
export const MIN_YEAR = 1974
export const MAX_YEAR = 2018

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
 * Cobertura del buscador: cuántas conferencias tienen texto indexado y sobre
 * cuántas hay en total.
 *
 * El primer número no puede salir de una consulta directa: vive en
 * `corpus_transcripciones`, que el rol público no puede leer. Lo entrega la
 * función `contar_conferencias_indexadas()`, que devuelve un entero y nada
 * más. Cuenta conferencias distintas —no filas de transcripción— para que el
 * dato sea comparable con el total, que también son conferencias.
 */
export async function getCoberturaBuscador(): Promise<{
  indexadas: number
  total: number
}> {
  const supabase = await createClient()

  const [indexadas, total] = await Promise.all([
    supabase.rpc('contar_conferencias_indexadas'),
    supabase.from('conferencias_publicas').select('id', { count: 'exact', head: true }),
  ])

  if (indexadas.error || total.error) {
    console.error('[getCoberturaBuscador] error:', indexadas.error ?? total.error)
    throw new Error('Error al obtener la cobertura del buscador.')
  }

  return {
    indexadas: Number(indexadas.data ?? 0),
    total: total.count ?? 0,
  }
}

/**
 * Cifras de la portada, calculadas en vez de escritas a mano.
 *
 * Las cuatro salen de relaciones que el rol público ya puede leer, así que no
 * hace falta conceder ningún permiso nuevo. Las consultas van en paralelo y
 * ninguna devuelve filas: tres son conteos de cabecera y la cuarta es la RPC
 * de conteo por año, que trae una fila por año y no las 5.866 conferencias.
 *
 * No incluye el número de conferencias con texto indexado: esa cifra vive en
 * `corpus_transcripciones`, que el rol público no puede leer. La calcula
 * `getCoberturaBuscador` a través de la función de conteo, y solo la usa el
 * aviso del buscador.
 */
export async function getEstadisticasPortada(): Promise<{
  conferencias: number
  anios: number
  colecciones: number
  episodios: number
}> {
  const supabase = await createClient()

  const [porAnio, conferencias, colecciones, episodios] = await Promise.all([
    supabase.rpc('conferencias_por_anio'),
    supabase.from('conferencias_publicas').select('id', { count: 'exact', head: true }),
    supabase.from('colecciones').select('id', { count: 'exact', head: true }),
    supabase.from('episodios').select('id', { count: 'exact', head: true }),
  ])

  const errores = [porAnio.error, conferencias.error, colecciones.error, episodios.error]
    .filter((e): e is NonNullable<typeof e> => Boolean(e))

  if (errores.length > 0) {
    console.error('[getEstadisticasPortada] error:', errores)
    throw new Error('Error al obtener las cifras de la portada.')
  }

  const listaAnios = ((porAnio.data ?? []) as ConteoAnioRpc[])
    .map((row) => Number(row.anio))
    .filter((anio) => Number.isFinite(anio))
    .sort((a, b) => a - b)

  const primero = listaAnios.at(0)
  const ultimo = listaAnios.at(-1)

  return {
    conferencias: conferencias.count ?? 0,
    anios: primero !== undefined && ultimo !== undefined ? ultimo - primero : 0,
    colecciones: colecciones.count ?? 0,
    episodios: episodios.count ?? 0,
  }
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
