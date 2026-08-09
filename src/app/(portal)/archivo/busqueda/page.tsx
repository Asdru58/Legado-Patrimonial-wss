// =========================================================
// Legado Patrimonial WSS — Paso 6 Refactorización v2
// src/app/archivo/busqueda/page.tsx
// Server Component: Resultados de Búsqueda FTS
// =========================================================

import Link from 'next/link'
import { searchArchivoConferencias, type SearchMode } from '@/lib/services/conferences'
import { ConferenceCard } from '@/components/ui/ConferenceCard'
import { HeroSearch } from '@/components/hero/HeroSearch'
import { Pagination } from '@/app/(portal)/archivo/Pagination'

type BusquedaPageProps = {
  searchParams: Promise<{
    query?: string
    page?: string
    search_mode?: string | string[]
  }>
}

const ITEMS_PER_PAGE = 20

export default async function ArchivoBusquedaPage({ searchParams }: BusquedaPageProps) {
  const resolvedSearchParams = await searchParams
  // Extracción de parámetros
  const queryParam = typeof resolvedSearchParams.query === 'string' ? resolvedSearchParams.query.trim() : ''
  const searchModeParam = resolvedSearchParams.search_mode
  const searchMode: SearchMode =
    searchModeParam === 'exact' ||
    searchModeParam === 'semantic' ||
    searchModeParam === 'lexical'
      ? searchModeParam
      : 'lexical'
  const hasQuery = queryParam.length > 0
  const pageParam = typeof resolvedSearchParams.page === 'string' ? resolvedSearchParams.page : '1'
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)

  let failedSearchMode: SearchMode | null = null
  let searchResult: Awaited<ReturnType<typeof searchArchivoConferencias>> = {
    data: [],
    total: 0,
  }

  try {
    searchResult = await searchArchivoConferencias({
      query: hasQuery ? queryParam : null,
      searchMode,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sort: 'reciente',
      format: null,
      year: null,
    })
  } catch (error) {
    if (searchMode !== 'semantic' && searchMode !== 'lexical') {
      throw error
    }

    failedSearchMode = searchMode
    console.error(`[ArchivoBusquedaPage] ${searchMode} search failed:`, error)
  }

  const { data: conferencias, total } = searchResult

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  // Separación de estados:
  // 1) Sin término de búsqueda
  // 2) Búsqueda con término pero sin resultados
  // 3) Búsqueda con resultados
  const isIdle = !hasQuery
  const isEmpty = hasQuery && failedSearchMode === null &&
    (total === 0 || conferencias.length === 0)

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
              : failedSearchMode === 'lexical'
                ? 'Búsqueda por palabras clave no disponible. No se ejecutó otra modalidad.'
              : isIdle
              ? 'Ingresa un término, título o palabra clave para explorar las conferencias.'
              : isEmpty
                ? 'Ninguna coincidencia encontrada.'
                : `Mostrando ${conferencias.length} de ${total} coincidencias con ranking de relevancia.`}
          </p>

          {(searchMode === 'semantic' || searchMode === 'lexical') && (
            <div
              role="note"
              className="mt-5 rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: 'rgba(212, 175, 55, 0.28)',
                background: 'rgba(212, 175, 55, 0.08)',
                color: 'var(--color-text-secondary, rgba(255,255,255,0.75))',
              }}
            >
              Búsqueda de texto completo disponible actualmente en 40 de 5.866
              conferencias (fase piloto).
            </div>
          )}

          <div className="mt-6 max-w-2xl">
            <HeroSearch
              key={`${queryParam}:${searchMode}`}
              initialQuery={queryParam}
              initialSearchMode={searchMode}
            />
          </div>
        </div>

        {/* ============================================
            RESULTADOS O ESTADOS VISUALES
            ============================================ */}
        {failedSearchMode !== null ? (
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
              {failedSearchMode === 'semantic'
                ? 'Búsqueda semántica no disponible'
                : 'Búsqueda por palabras clave no disponible'}
            </h2>
            <p style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
              {failedSearchMode === 'semantic'
                ? 'El servicio semántico no respondió. Intenta nuevamente cuando esté disponible.'
                : 'La búsqueda léxica no respondió. Intenta nuevamente cuando esté disponible.'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conferencias.map((conf, idx) => (
                <div key={conf.id} className="flex flex-col gap-3">
                  <ConferenceCard
                    conferencia={conf}
                    index={idx}
                  />
                  {searchMode === 'lexical' && conf.lexicalContext && (
                    <div
                      role="note"
                      className="rounded-xl border px-4 py-3 text-sm leading-relaxed"
                      style={{
                        borderColor: 'rgba(212, 175, 55, 0.18)',
                        background: 'rgba(212, 175, 55, 0.05)',
                        color: 'var(--color-text-secondary, rgba(255,255,255,0.75))',
                      }}
                    >
                      <p className="line-clamp-4">{conf.extracto}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ============================================
                PAGINACIÓN
                ============================================ */}
            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
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
              Intenta realizar una nueva búsqueda con otros términos o palabras clave.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
