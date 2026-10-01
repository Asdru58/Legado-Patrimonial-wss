// =========================================================
// Legado Patrimonial WSS — Búsqueda semántica por extractos
// src/lib/services/semanticExtracts.ts
//
// La modalidad «Tema o enseñanza» ya no muestra una conferencia por
// resultado: muestra los extractos más cercanos a la consulta (3.000, 4.000
// o 5.000), agrupados por conferencia, en orden cronológico o por parecido,
// con filtro de años y páginas de 50 a 500 extractos.
//
// UNA SOLA CONSULTA PESADA POR BÚSQUEDA. La RPC
// `buscar_corpus_semantica_extractos` compara la consulta con todo el corpus
// (~1,2-1,7 s) y devuelve siempre los 5.000 más cercanos. El conjunto se
// guarda en la memoria del servidor; el tope visible (3.000/4.000/5.000) es
// un prefijo de esa lista, así que ampliar, reordenar, filtrar o cambiar de
// página no repite ni el codificador ni la base. Al navegador solo llega el
// bloque visible.
//
// TOPE DE MEMORIA. Como mucho CACHE_MAX_ENTRADAS búsquedas a la vez, cada una
// con 5.000 extractos (~7 MB de texto). La más antigua sale al entrar una
// nueva, y cada una caduca a los CACHE_TTL_MS. Si una búsqueda ya no está, se
// recalcula y da el mismo resultado: la RPC es determinista.
// =========================================================

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { encodeBgeQuery } from '@/lib/services/bgeEncoder'

// ============================================
// Opciones públicas
// ============================================

export const TOPES_EXTRACTOS = [3000, 4000, 5000] as const
export type TopeExtractos = (typeof TOPES_EXTRACTOS)[number]
export const TOPE_INICIAL: TopeExtractos = 3000

export const BLOQUES_EXTRACTOS = [50, 100, 200, 300, 500] as const
export type BloqueExtractos = (typeof BLOQUES_EXTRACTOS)[number]
export const BLOQUE_INICIAL: BloqueExtractos = 50

/** Cronológico ascendente, cronológico descendente, o por el extracto más cercano. */
export const ORDENES_EXTRACTOS = ['antiguos', 'recientes', 'parecido'] as const
export type OrdenExtractos = (typeof ORDENES_EXTRACTOS)[number]
export const ORDEN_INICIAL: OrdenExtractos = 'antiguos'

const TOPE_MAXIMO = 5000
const MAX_QUERY_LENGTH = 200
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const CACHE_MAX_ENTRADAS = 12
export const CACHE_TTL_MS = 15 * 60 * 1000

// ============================================
// Tipos
// ============================================

export type ExtractoSemantico = {
  /** Puesto por parecido dentro de los 5.000 (1 = el más cercano). */
  puesto: number
  conferenciaId: string
  documentoId: string
  titulo: string
  fecha: string | null
  slug: string
  pasajeId: string
  orden: number
  paginaInicio: number
  paginaFin: number
  texto: string
  similitud: number
}

/** Un extracto colocado en el recorrido: `posicion` es su número en el orden elegido. */
export type ExtractoEnVista = ExtractoSemantico & { posicion: number }

export type GrupoDeExtractos = {
  conferenciaId: string
  titulo: string
  fecha: string | null
  slug: string
  autor: string | null
  /** Mejor puesto de la conferencia: es lo que la coloca en el orden por parecido. */
  mejorPuesto: number
  /** Cuántos extractos tiene la conferencia en el recorrido completo. */
  extractosEnConferencia: number
  /** La conferencia empezó en la página anterior. */
  continuaDeAntes: boolean
  /** La conferencia sigue en la página siguiente. */
  sigueDespues: boolean
  extractos: ExtractoEnVista[]
}

export type VistaExtractos = {
  tope: TopeExtractos
  orden: OrdenExtractos
  bloque: BloqueExtractos
  pagina: number
  totalPaginas: number
  /** Lo traído por la búsqueda, antes del filtro de años. */
  extractosTraidos: number
  conferenciasTraidas: number
  /** Lo que queda tras el filtro de años (igual a lo traído si no hay filtro). */
  extractosFiltrados: number
  conferenciasFiltradas: number
  /** Extractos traídos que no tienen fecha y por eso caen al filtrar por años. */
  extractosSinFecha: number
  grupos: GrupoDeExtractos[]
}

type FilaRpc = {
  puesto: number
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
}

// ============================================
// Memoria de búsquedas
//
// Vive en globalThis para que la página de resultados y la del detalle
// compartan la misma instancia aunque el empaquetador duplique el módulo.
// Se guarda la PROMESA: dos peticiones simultáneas de la misma consulta
// esperan a la misma consulta en lugar de lanzar dos.
// ============================================

type EntradaCache = { promesa: Promise<ExtractoSemantico[]>; creada: number }

const CLAVE_GLOBAL = Symbol.for('legado.busquedaSemanticaExtractos.cache')
const almacen = globalThis as unknown as Record<symbol, Map<string, EntradaCache> | undefined>
const cache: Map<string, EntradaCache> =
  almacen[CLAVE_GLOBAL] ?? (almacen[CLAVE_GLOBAL] = new Map())

function leerDeCache(clave: string): Promise<ExtractoSemantico[]> | null {
  const entrada = cache.get(clave)
  if (!entrada) return null
  if (Date.now() - entrada.creada > CACHE_TTL_MS) {
    cache.delete(clave)
    return null
  }
  // Pasa al final: la más usada es la última en salir.
  cache.delete(clave)
  cache.set(clave, entrada)
  return entrada.promesa
}

function guardarEnCache(clave: string, promesa: Promise<ExtractoSemantico[]>) {
  cache.set(clave, { promesa, creada: Date.now() })
  while (cache.size > CACHE_MAX_ENTRADAS) {
    const masAntigua = cache.keys().next().value
    if (masAntigua === undefined) break
    cache.delete(masAntigua)
  }
  // Un fallo no se queda guardado: el siguiente intento vuelve a consultar.
  promesa.catch(() => {
    if (cache.get(clave)?.promesa === promesa) cache.delete(clave)
  })
}

/** Estado de la memoria, para diagnóstico y para las pruebas. */
export function estadoCacheExtractos() {
  return { entradas: cache.size, maximo: CACHE_MAX_ENTRADAS, ttlMs: CACHE_TTL_MS }
}

// ============================================
// Consulta
// ============================================

function normalizarConsulta(query: string): string | null {
  const limpia = query.trim()
  return limpia && limpia.length <= MAX_QUERY_LENGTH ? limpia : null
}

function filaValida(fila: FilaRpc, indice: number): boolean {
  return (
    fila.puesto === indice + 1 &&
    UUID_REGEX.test(fila.conferencia_id) &&
    UUID_REGEX.test(fila.pasaje_id) &&
    typeof fila.texto === 'string' &&
    typeof fila.titulo === 'string' &&
    typeof fila.slug === 'string' &&
    Number.isSafeInteger(fila.orden) &&
    Number.isSafeInteger(fila.pagina_inicio) &&
    Number.isSafeInteger(fila.pagina_fin) &&
    fila.pagina_inicio >= 1 &&
    fila.pagina_fin >= fila.pagina_inicio &&
    typeof fila.similitud === 'number' &&
    Number.isFinite(fila.similitud)
  )
}

async function consultarExtractos(query: string): Promise<ExtractoSemantico[]> {
  const encoded = await encodeBgeQuery(query)
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('buscar_corpus_semantica_extractos', {
    consulta_vector: encoded.vector,
    tope: TOPE_MAXIMO,
  })

  if (error) {
    console.error('[buscarExtractos] RPC error:', error)
    throw new Error('Error al ejecutar la busqueda semantica.')
  }

  const filas = (data ?? []) as FilaRpc[]
  if (filas.length > TOPE_MAXIMO || !filas.every(filaValida)) {
    console.error('[buscarExtractos] respuesta inconsistente:', filas.length)
    throw new Error('La busqueda semantica devolvio extractos invalidos.')
  }

  return filas.map((fila) => ({
    puesto: fila.puesto,
    conferenciaId: fila.conferencia_id,
    documentoId: fila.documento_id,
    titulo: fila.titulo,
    fecha: fila.fecha,
    slug: fila.slug,
    pasajeId: fila.pasaje_id,
    orden: fila.orden,
    paginaInicio: fila.pagina_inicio,
    paginaFin: fila.pagina_fin,
    texto: fila.texto,
    similitud: fila.similitud,
  }))
}

/** Los 5.000 extractos más cercanos, en orden de parecido. Usa la memoria si puede. */
async function obtenerExtractos(query: string): Promise<ExtractoSemantico[]> {
  const enCache = leerDeCache(query)
  if (enCache) return enCache
  const promesa = consultarExtractos(query)
  guardarEnCache(query, promesa)
  return promesa
}

// ============================================
// Vista: tope, filtro, orden y página
// ============================================

function anioDe(fecha: string | null): number | null {
  if (!fecha) return null
  const anio = Number(fecha.slice(0, 4))
  return Number.isInteger(anio) ? anio : null
}

function compararFechas(a: string | null, b: string | null, sentido: 1 | -1): number {
  // Las conferencias sin fecha van al final en los dos sentidos.
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -sentido : sentido
}

async function autoresDe(conferenciaIds: string[]): Promise<Map<string, string | null>> {
  const autores = new Map<string, string | null>()
  if (conferenciaIds.length === 0) return autores
  const supabase = await createClient()
  // En tandas de 100: la lista de identificadores viaja en la URL.
  const tandas: string[][] = []
  for (let i = 0; i < conferenciaIds.length; i += 100) {
    tandas.push(conferenciaIds.slice(i, i + 100))
  }
  const respuestas = await Promise.all(
    tandas.map((ids) =>
      supabase.from('conferencias_publicas').select('id, ponente_nombre').in('id', ids)
    )
  )
  for (const { data, error } of respuestas) {
    // El autor es informativo: si falla, la cabecera sale sin él.
    if (error) {
      console.error('[buscarExtractos] autores:', error)
      continue
    }
    for (const fila of (data ?? []) as { id: string; ponente_nombre: string | null }[]) {
      autores.set(fila.id, fila.ponente_nombre)
    }
  }
  return autores
}

export async function obtenerVistaExtractos(params: Readonly<{
  query: string
  tope: TopeExtractos
  orden: OrdenExtractos
  bloque: BloqueExtractos
  pagina: number
  anioDesde: number | null
  anioHasta: number | null
}>): Promise<VistaExtractos> {
  const query = normalizarConsulta(params.query)
  const todos = query ? await obtenerExtractos(query) : []

  // 1. Tope: los N primeros por parecido.
  const traidos = todos.slice(0, params.tope)

  // 2. Filtro de años sobre lo ya traído. Con filtro, lo que no tiene fecha cae.
  const hayFiltro = params.anioDesde !== null || params.anioHasta !== null
  const filtrados = hayFiltro
    ? traidos.filter((e) => {
        const anio = anioDe(e.fecha)
        return (
          anio !== null &&
          (params.anioDesde === null || anio >= params.anioDesde) &&
          (params.anioHasta === null || anio <= params.anioHasta)
        )
      })
    : traidos

  // 3. Agrupar por conferencia; dentro, en orden de lectura.
  const porConferencia = new Map<string, ExtractoSemantico[]>()
  for (const e of filtrados) {
    const lista = porConferencia.get(e.conferenciaId)
    if (lista) lista.push(e)
    else porConferencia.set(e.conferenciaId, [e])
  }
  const grupos = [...porConferencia.values()].map((extractos) => {
    extractos.sort((a, b) =>
      a.orden - b.orden || a.paginaInicio - b.paginaInicio || a.puesto - b.puesto
    )
    return { extractos, mejorPuesto: Math.min(...extractos.map((e) => e.puesto)) }
  })

  // 4. Ordenar las conferencias.
  grupos.sort((a, b) => {
    const pa = a.extractos[0]
    const pb = b.extractos[0]
    if (params.orden === 'parecido') return a.mejorPuesto - b.mejorPuesto
    return (
      compararFechas(pa.fecha, pb.fecha, params.orden === 'antiguos' ? 1 : -1) ||
      pa.titulo.localeCompare(pb.titulo, 'es') ||
      a.mejorPuesto - b.mejorPuesto
    )
  })

  // 5. Recorrido plano y página por número de extractos.
  const recorrido: { extracto: ExtractoSemantico; grupo: number }[] = []
  grupos.forEach((g, i) => g.extractos.forEach((extracto) => recorrido.push({ extracto, grupo: i })))

  const totalPaginas = Math.max(1, Math.ceil(recorrido.length / params.bloque))
  const pagina = Math.min(Math.max(1, params.pagina), totalPaginas)
  const inicio = (pagina - 1) * params.bloque
  const fin = Math.min(inicio + params.bloque, recorrido.length)

  // 6. Reagrupar lo visible y marcar las conferencias partidas.
  const visibles: GrupoDeExtractos[] = []
  for (let i = inicio; i < fin; i++) {
    const { extracto, grupo } = recorrido[i]
    let actual = visibles[visibles.length - 1]
    if (!actual || actual.conferenciaId !== extracto.conferenciaId) {
      const g = grupos[grupo]
      actual = {
        conferenciaId: extracto.conferenciaId,
        titulo: extracto.titulo,
        fecha: extracto.fecha,
        slug: extracto.slug,
        autor: null,
        mejorPuesto: g.mejorPuesto,
        extractosEnConferencia: g.extractos.length,
        continuaDeAntes: i > 0 && recorrido[i - 1].grupo === grupo,
        sigueDespues: false,
        extractos: [],
      }
      visibles.push(actual)
    }
    actual.extractos.push({ ...extracto, posicion: i + 1 })
  }
  const ultimo = visibles[visibles.length - 1]
  if (ultimo && fin < recorrido.length && recorrido[fin].extracto.conferenciaId === ultimo.conferenciaId) {
    ultimo.sigueDespues = true
  }

  const autores = await autoresDe(visibles.map((g) => g.conferenciaId))
  for (const g of visibles) g.autor = autores.get(g.conferenciaId) ?? null

  return {
    tope: params.tope,
    orden: params.orden,
    bloque: params.bloque,
    pagina,
    totalPaginas,
    extractosTraidos: traidos.length,
    conferenciasTraidas: new Set(traidos.map((e) => e.conferenciaId)).size,
    extractosFiltrados: filtrados.length,
    conferenciasFiltradas: grupos.length,
    extractosSinFecha: traidos.filter((e) => e.fecha === null).length,
    grupos: visibles,
  }
}

/**
 * Comprueba el extracto de un enlace al detalle: debe estar entre los 5.000
 * más cercanos a esa consulta y pertenecer a esa conferencia. La URL solo
 * aporta identificadores no confiables; el texto sale de la búsqueda.
 */
export async function validarExtractoSemantico(params: Readonly<{
  query: string
  pasajeId: string
  conferenciaId: string
}>): Promise<ExtractoSemantico | null> {
  const query = normalizarConsulta(params.query)
  if (!query || !UUID_REGEX.test(params.pasajeId) || !UUID_REGEX.test(params.conferenciaId)) {
    return null
  }
  const extractos = await obtenerExtractos(query)
  return (
    extractos.find(
      (e) => e.pasajeId === params.pasajeId && e.conferenciaId === params.conferenciaId
    ) ?? null
  )
}
