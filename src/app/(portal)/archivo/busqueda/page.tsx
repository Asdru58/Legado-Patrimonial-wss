// =========================================================
// Legado Patrimonial WSS — Paso 6 Refactorización v2
// src/app/archivo/busqueda/page.tsx
// Server Component: Resultados de Búsqueda FTS
// =========================================================

import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  searchArchivoConferencias,
  getCoberturaBuscador,
  CorpusCambiadoError,
  EXACT_ORDERS,
  MIN_YEAR,
  MAX_YEAR,
  type ExactOrder,
} from '@/lib/services/conferences'
import {
  obtenerVistaExtractos,
  BLOQUES_EXTRACTOS,
  BLOQUE_INICIAL,
  ORDENES_EXTRACTOS,
  ORDEN_INICIAL,
  TOPES_EXTRACTOS,
  TOPE_INICIAL,
  type BloqueExtractos,
  type OrdenExtractos,
  type TopeExtractos,
  type VistaExtractos,
} from '@/lib/services/semanticExtracts'
import { conSeparadorDeMiles } from '@/lib/format'
import { ExactResultsTree } from '@/components/search/ExactResultsTree'
import {
  SemanticAmpliar,
  SemanticControls,
  SemanticCounter,
  SemanticExtractsList,
  describirRango,
  type EstadoBusquedaSemantica,
} from '@/components/search/SemanticExtracts'
import { ExactFilters, describirOrden } from '@/components/search/ExactFilters'
import { HeroSearch, type PublicSearchMode } from '@/components/hero/HeroSearch'
import { Pagination } from '@/app/(portal)/archivo/Pagination'
import { GuardarBusqueda } from '@/components/estudio/GuardarBusqueda'
import { mesaHabilitada } from '@/lib/estudio/disponibilidad'
import type { ItemAGuardar } from '@/lib/services/estudio'

type BusquedaPageProps = {
  searchParams: Promise<{
    query?: string
    page?: string
    search_mode?: string | string[]
    desde?: string | string[]
    hasta?: string | string[]
    orden?: string | string[]
    huella?: string | string[]
    tope?: string | string[]
    bloque?: string | string[]
  }>
}

const ITEMS_PER_PAGE = 50

/** Año de la URL: vacío o ausente es «sin límite»; lo que no sea un año válido se rechaza. */
function leerAnio(valor: string | string[] | undefined): number | null | 'invalido' {
  if (typeof valor !== 'string' || valor.trim() === '') return null
  if (!/^\d{4}$/.test(valor.trim())) return 'invalido'
  const anio = Number(valor)
  return anio >= MIN_YEAR && anio <= MAX_YEAR ? anio : 'invalido'
}

function leerOrden(valor: string | string[] | undefined): ExactOrder {
  return typeof valor === 'string' && (EXACT_ORDERS as readonly string[]).includes(valor)
    ? (valor as ExactOrder)
    : 'antiguos'
}

/** La huella es un md5; cualquier otra cosa se ignora. */
function leerHuella(valor: string | string[] | undefined): string | null {
  return typeof valor === 'string' && /^[0-9a-f]{32}$/.test(valor) ? valor : null
}

// ── Parámetros de la modalidad Semántica (vista de extractos) ──
// Lo que no sea un valor admitido vuelve al de omisión.

function leerOrdenSemantico(valor: string | string[] | undefined): OrdenExtractos {
  return typeof valor === 'string' && (ORDENES_EXTRACTOS as readonly string[]).includes(valor)
    ? (valor as OrdenExtractos)
    : ORDEN_INICIAL
}

function leerTope(valor: string | string[] | undefined): TopeExtractos {
  const n = typeof valor === 'string' ? Number(valor) : NaN
  return (TOPES_EXTRACTOS as readonly number[]).includes(n) ? (n as TopeExtractos) : TOPE_INICIAL
}

function leerBloque(valor: string | string[] | undefined): BloqueExtractos {
  const n = typeof valor === 'string' ? Number(valor) : NaN
  return (BLOQUES_EXTRACTOS as readonly number[]).includes(n) ? (n as BloqueExtractos) : BLOQUE_INICIAL
}

export default async function ArchivoBusquedaPage({ searchParams }: BusquedaPageProps) {
  const resolvedSearchParams = await searchParams
  // Extracción de parámetros
  const queryParam = typeof resolvedSearchParams.query === 'string' ? resolvedSearchParams.query.trim() : ''
  const searchModeParam = resolvedSearchParams.search_mode
  const hasQuery = queryParam.length > 0
  const pageParam = typeof resolvedSearchParams.page === 'string' ? resolvedSearchParams.page : '1'
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)

  if (searchModeParam !== 'exact' && searchModeParam !== 'semantic') {
    const normalizedParams = new URLSearchParams({ search_mode: 'exact' })

    if (hasQuery) normalizedParams.set('query', queryParam)
    for (const clave of ['desde', 'hasta', 'orden', 'huella'] as const) {
      const valor = resolvedSearchParams[clave]
      if (typeof valor === 'string' && valor) normalizedParams.set(clave, valor)
    }
    if (currentPage > 1) normalizedParams.set('page', String(currentPage))

    redirect(`/archivo/busqueda?${normalizedParams.toString()}`)
  }

  const searchMode: PublicSearchMode = searchModeParam
  const searchModeLabel = searchMode === 'exact' ? 'Frase exacta' : 'Tema o enseñanza'

  // ============================================
  // FILTROS
  // Años y orden viajan en la URL, así que la paginación los conserva.
  // Los años valen para las dos modalidades; el orden de la Exacta y el de la
  // Semántica se leen por separado porque admiten valores distintos.
  // ============================================
  const anioDesdeLeido = leerAnio(resolvedSearchParams.desde)
  const anioHastaLeido = leerAnio(resolvedSearchParams.hasta)
  const orden = leerOrden(resolvedSearchParams.orden)
  const huellaParam = leerHuella(resolvedSearchParams.huella)
  const rangoInvalido =
    hasQuery &&
    (anioDesdeLeido === 'invalido' ||
      anioHastaLeido === 'invalido' ||
      (typeof anioDesdeLeido === 'number' && typeof anioHastaLeido === 'number' && anioDesdeLeido > anioHastaLeido))
  const anioDesde = typeof anioDesdeLeido === 'number' ? anioDesdeLeido : null
  const anioHasta = typeof anioHastaLeido === 'number' ? anioHastaLeido : null
  const hayRango = anioDesde !== null || anioHasta !== null

  let failedSearchMode: 'semantic' | null = null
  let corpusCambiado = false
  let searchResult: Awaited<ReturnType<typeof searchArchivoConferencias>> = {
    data: [],
    total: 0,
  }

  // Estado de la vista de extractos; solo existe en la modalidad Semántica.
  const estadoSemantico: EstadoBusquedaSemantica | null =
    searchMode === 'semantic' && hasQuery
      ? {
          query: queryParam,
          tope: leerTope(resolvedSearchParams.tope),
          orden: leerOrdenSemantico(resolvedSearchParams.orden),
          bloque: leerBloque(resolvedSearchParams.bloque),
          anioDesde,
          anioHasta,
          pagina: currentPage,
        }
      : null
  let vistaSemantica: VistaExtractos | null = null

  try {
    if (estadoSemantico && !rangoInvalido) {
      vistaSemantica = await obtenerVistaExtractos({
        query: estadoSemantico.query,
        tope: estadoSemantico.tope,
        orden: estadoSemantico.orden,
        bloque: estadoSemantico.bloque,
        pagina: estadoSemantico.pagina,
        anioDesde: estadoSemantico.anioDesde,
        anioHasta: estadoSemantico.anioHasta,
      })
    } else if (searchMode === 'exact' && !rangoInvalido) {
      searchResult = await searchArchivoConferencias({
        query: hasQuery ? queryParam : null,
        searchMode,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sort: 'reciente',
        format: null,
        year: null,
        exactFilters: { anioDesde, anioHasta, orden, huella: huellaParam },
      })
    }
  } catch (error) {
    if (error instanceof CorpusCambiadoError) {
      corpusCambiado = true
    } else if (searchMode !== 'semantic') {
      throw error
    } else {
      failedSearchMode = searchMode
      console.error(`[ArchivoBusquedaPage] ${searchMode} search failed:`, error)
    }
  }

  const { data: conferencias, total, huella } = searchResult

  // Enlace para empezar de nuevo con los mismos filtros y sin huella.
  const reinicioParams = new URLSearchParams({ search_mode: 'exact', query: queryParam })
  if (anioDesde !== null) reinicioParams.set('desde', String(anioDesde))
  if (anioHasta !== null) reinicioParams.set('hasta', String(anioHasta))
  if (orden !== 'antiguos') reinicioParams.set('orden', orden)
  const reinicioHref = `/archivo/busqueda?${reinicioParams.toString()}`

  const descripcionRango = !hayRango
    ? ''
    : anioDesde !== null && anioHasta !== null
      ? anioDesde === anioHasta
        ? ` de ${anioDesde}`
        : ` entre ${anioDesde} y ${anioHasta}`
      : anioDesde !== null
        ? ` desde ${anioDesde}`
        : ` hasta ${anioHasta}`

  // El aviso de cobertura solo se pinta en la modalidad Semántica, así que
  // solo ahí se paga la consulta.
  // El conteo es informativo: si la RPC aún no existe en este entorno,
  // la búsqueda debe seguir mostrando sus resultados.
  const cobertura =
    searchMode === 'semantic' && failedSearchMode === null
      ? await getCoberturaBuscador().catch(() => null)
      : null

  const totalPages = vistaSemantica
    ? vistaSemantica.totalPaginas
    : Math.ceil(total / ITEMS_PER_PAGE)

  // Separación de estados:
  // 1) Sin término de búsqueda
  // 2) Búsqueda con término pero sin resultados
  // 3) Búsqueda con resultados
  const isIdle = !hasQuery
  // En la Semántica, «vacío» es que la búsqueda no trajo nada. Si lo trajo pero
  // el filtro de años lo deja en cero, la vista sigue en pantalla con sus
  // controles para poder cambiar los años.
  const isEmpty = hasQuery && failedSearchMode === null && !rangoInvalido && !corpusCambiado &&
    (vistaSemantica
      ? vistaSemantica.extractosTraidos === 0
      : total === 0 || conferencias.length === 0)

  // ============================================
  // ESTACIÓN DE ESTUDIO — lo que se guardaría en la mesa
  //
  // Tres campos por ítem y nada más: pasaje_id, posicion y similitud.
  // El texto no viaja; estudio_crear_dossier lo toma de corpus_pasajes.
  //
  // La modalidad léxica queda fuera a propósito: el CHECK de
  // estudio_dossier.modo solo admite 'semantica' y 'exacta'.
  // ============================================
  const modoParaLaMesa =
    searchMode === 'semantic' ? 'semantica'
      : searchMode === 'exact' ? 'exacta'
        : null

  // En la Semántica se guardan los extractos de la página visible (hasta 500,
  // el máximo de la mesa), con su número en el orden elegido.
  const itemsParaLaMesa: ItemAGuardar[] = vistaSemantica
    ? vistaSemantica.grupos.flatMap((grupo) =>
        grupo.extractos.map((e) => ({
          pasaje_id: e.pasajeId,
          posicion: e.posicion,
          similitud: e.similitud,
        }))
      )
    : modoParaLaMesa
      ? conferencias.flatMap((conf, idx) => {
        const contexto = conf.exactContext
        if (!contexto) return []
        return [{
          pasaje_id: contexto.pasajeId,
          posicion: (currentPage - 1) * ITEMS_PER_PAGE + idx + 1,
          similitud: null,
        }]
      })
      : []

  // Lo que la mesa anota de la búsqueda: con los filtros, el dossier sabe
  // de qué recorte y de qué orden salen sus posiciones.
  const parametrosParaLaMesa: Record<string, unknown> = vistaSemantica
    ? {
        modalidad: searchMode,
        vista: 'extractos',
        pagina: vistaSemantica.pagina,
        por_pagina: vistaSemantica.bloque,
        tope: vistaSemantica.tope,
        orden: vistaSemantica.orden,
        anio_desde: anioDesde,
        anio_hasta: anioHasta,
        total_alcanzado: vistaSemantica.extractosFiltrados,
        conferencias_alcanzadas: vistaSemantica.conferenciasFiltradas,
      }
    : {
        modalidad: searchMode,
        pagina: currentPage,
        por_pagina: ITEMS_PER_PAGE,
        total_alcanzado: total,
        ...(searchMode === 'exact'
          ? { anio_desde: anioDesde, anio_hasta: anioHasta, orden, huella_corpus: huella ?? null }
          : {}),
      }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--color-bg-primary, #050505)' }}
    >
      <div className="mx-auto max-w-7xl px-6 pt-10">
        {/* ============================================
            BREADCRUMBS
            ============================================ */}
        <nav aria-label="Migas de pan" className="mb-8">
          <ol className="flex items-center gap-2 text-sm font-medium">
            <li>
              <Link
                href="/archivo"
                className="transition-colors hover:text-white"
                style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.4))' }}
              >
                Archivo
              </Link>
            </li>
            <li aria-hidden="true" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.2))' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </li>
            <li aria-current="page" style={{ color: 'var(--color-gold, #D4AF37)' }}>
              Búsqueda
            </li>
          </ol>
        </nav>

        {/* ============================================
            ENCABEZADO
            ============================================ */}
        <div className="mb-12 border-b pb-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h1
            className="text-4xl md:text-5xl font-light tracking-tight"
            style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              color: 'var(--color-text-primary, rgba(255,255,255,0.95))',
            }}
          >
            {hasQuery ? (
              <>
                Resultados de búsqueda para:{' '}
                <span style={{ color: 'var(--color-gold, #D4AF37)' }}>
                  &ldquo;{queryParam}&rdquo;
                </span>
              </>
            ) : (
              'Búsqueda en el Archivo'
            )}
          </h1>

          <p
            className="mt-3 text-base"
            style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}
          >
            {failedSearchMode === 'semantic'
              ? 'No fue posible completar la búsqueda semántica. No se ejecutó otra modalidad.'
              : isIdle
                ? 'Ingresa una frase o un tema para explorar las conferencias.'
                : (
                    <>
                      {rangoInvalido
                        ? 'El rango de años no es válido.'
                        : corpusCambiado
                          ? 'El archivo se actualizó mientras recorrías los resultados.'
                          : isEmpty
                            ? `Ninguna coincidencia encontrada${descripcionRango}.`
                            : searchMode === 'semantic'
                              ? 'Los pasajes del archivo más cercanos al tema, agrupados por conferencia.'
                              : `Mostrando ${conferencias.length} de ${conSeparadorDeMiles(total)} conferencias${descripcionRango}, ${describirOrden(orden)}.`}
                      <span
                        data-search-mode={searchMode}
                        className="ml-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{
                          borderColor: 'rgba(212, 175, 55, 0.32)',
                          background: 'rgba(212, 175, 55, 0.10)',
                          color: 'var(--color-gold, #D4AF37)',
                        }}
                      >
                        {searchModeLabel}
                      </span>
                    </>
                  )}
          </p>

          {searchMode === 'semantic' && cobertura !== null && (
            <div
              role="note"
              className="mt-5 rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: 'rgba(212, 175, 55, 0.28)',
                background: 'rgba(212, 175, 55, 0.08)',
                color: 'var(--color-text-secondary, rgba(255,255,255,0.75))',
              }}
            >
              La búsqueda de texto completo alcanza{' '}
              {conSeparadorDeMiles(cobertura.indexadas)} de las{' '}
              {conSeparadorDeMiles(cobertura.total)} conferencias. El resto se
              va incorporando.
            </div>
          )}

          <div className="mt-6 max-w-2xl">
            <HeroSearch
              key={`${queryParam}:${searchMode}`}
              initialQuery={queryParam}
              initialSearchMode={searchMode}
            />
          </div>

          {searchMode === 'exact' && hasQuery && (
            <>
              <ExactFilters
                key={`${queryParam}:${anioDesde}:${anioHasta}:${orden}`}
                query={queryParam}
                anioDesde={anioDesde}
                anioHasta={anioHasta}
                orden={orden}
                minYear={MIN_YEAR}
                maxYear={MAX_YEAR}
              />
              {hayRango && (
                <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.45))' }}>
                  Al filtrar por años no se incluyen las conferencias sin fecha.
                </p>
              )}
            </>
          )}

          {estadoSemantico && vistaSemantica && vistaSemantica.extractosTraidos > 0 && (
            <SemanticControls
              key={`${queryParam}:${anioDesde}:${anioHasta}`}
              estado={{ ...estadoSemantico, pagina: vistaSemantica.pagina }}
              minYear={MIN_YEAR}
              maxYear={MAX_YEAR}
            />
          )}
        </div>

        {/* ============================================
            RESULTADOS O ESTADOS VISUALES
            ============================================ */}
        {rangoInvalido || corpusCambiado ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'rgba(212, 175, 55, 0.22)'
            }}
          >
            <h2
              className="text-xl font-medium mb-2"
              style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}
            >
              {rangoInvalido ? 'Revisa los años' : 'Los resultados han cambiado'}
            </h2>
            <p className="max-w-xl" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
              {rangoInvalido
                ? `Los años deben estar entre ${MIN_YEAR} y ${MAX_YEAR}, y el año inicial no puede ser posterior al final.`
                : 'Se incorporaron o corrigieron textos del archivo mientras pasabas de página. Para no repetir ni saltarte conferencias, la búsqueda debe empezar de nuevo.'}
            </p>
            {corpusCambiado && (
              <Link
                href={reinicioHref}
                className="mt-5 rounded-full px-5 py-2 text-sm font-semibold"
                style={{ background: 'rgba(212, 175, 55, 0.16)', color: 'var(--color-gold, #D4AF37)' }}
              >
                Volver a la primera página
              </Link>
            )}
          </div>
        ) : failedSearchMode !== null ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'rgba(212, 175, 55, 0.22)'
            }}
          >
            <h2
              className="text-xl font-medium mb-2"
              style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}
            >
              Búsqueda semántica no disponible
            </h2>
            <p style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
              El servicio semántico no respondió. Intenta nuevamente cuando esté disponible.
            </p>
          </div>
        ) : isIdle ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <div
              className="w-16 h-16 mb-4 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(212, 175, 55, 0.1)' }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--color-gold, #D4AF37)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h2
              className="text-xl font-medium mb-2"
              style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}
            >
              Listo para buscar
            </h2>
            <p style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
              Utiliza el buscador para comenzar tu exploración.
            </p>
          </div>
        ) : !isEmpty ? (
          <>
            {/* ============================================
                GUARDAR EN LA MESA DE ESTUDIO
                ============================================ */}
            {mesaHabilitada && modoParaLaMesa && itemsParaLaMesa.length > 0 && (
              <div className="mb-8">
                <GuardarBusqueda
                  consulta={queryParam}
                  modo={modoParaLaMesa}
                  items={itemsParaLaMesa}
                  parametros={parametrosParaLaMesa}
                />
              </div>
            )}

            {/* Lista de una columna, no cuadrícula: los resultados de una
                búsqueda textual se escanean verticalmente, y una columna
                estrecha parte los renglones cada cuatro o cinco palabras.
                El ancho máximo mantiene la línea en unos 70 caracteres. */}
            {/* La modalidad exacta usa el arbol compacto: hay frase literal que
                resaltar y una misma conferencia puede traer decenas de
                coincidencias, que como tarjetas ocuparian metros de pagina.
                La semantica muestra sus extractos agrupados por conferencia. */}
            {vistaSemantica && estadoSemantico ? (
              <div className="flex flex-col gap-8">
                <SemanticCounter vista={vistaSemantica} anioDesde={anioDesde} anioHasta={anioHasta} />
                {vistaSemantica.extractosFiltrados > 0 ? (
                  <SemanticExtractsList vista={vistaSemantica} query={queryParam} />
                ) : (
                  <p role="status" className="rounded-2xl border px-5 py-6" style={{ borderColor: 'rgba(212, 175, 55, 0.22)', color: 'var(--color-text-muted, rgba(255,255,255,0.6))' }}>
                    {describirRango(anioDesde, anioHasta)} no hay ningún extracto entre los{' '}
                    {conSeparadorDeMiles(vistaSemantica.tope)} más cercanos. Prueba con otros años o amplía la búsqueda.
                  </p>
                )}
                <SemanticAmpliar estado={{ ...estadoSemantico, pagina: vistaSemantica.pagina }} />
              </div>
            ) : (
              <div className="max-w-5xl">
                <ExactResultsTree conferencias={conferencias} query={queryParam} />
              </div>
            )}

            {/* ============================================
                PAGINACIÓN
                ============================================ */}
            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  currentPage={vistaSemantica ? vistaSemantica.pagina : currentPage}
                  totalPages={totalPages}
                  extraParams={searchMode === 'exact' && huella ? { huella } : undefined}
                />
              </div>
            )}
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <div
              className="w-16 h-16 mb-4 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(212, 175, 55, 0.1)' }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--color-gold, #D4AF37)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h2
              className="text-xl font-medium mb-2"
              style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}
            >
              No se encontraron coincidencias
            </h2>
            <p style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
              Intenta realizar una nueva búsqueda con otra frase o tema.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
