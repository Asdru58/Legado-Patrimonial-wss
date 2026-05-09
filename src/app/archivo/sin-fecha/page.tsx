// =========================================================
// Legado Patrimonial WSS — Paso 5 Refactorización v2
// src/app/archivo/sin-fecha/page.tsx
// Server Component: Conferencias pendientes de clasificación temporal
// =========================================================

import Link from 'next/link'
import { getConferenciasSinFecha } from '@/lib/services/conferences'
import { ConferenceCard } from '@/components/ui/ConferenceCard'
import { Pagination } from '@/app/archivo/Pagination'

type SinFechaPageProps = {
  searchParams: Promise<{
    page?: string
  }>
}

const ITEMS_PER_PAGE = 20

export default async function ArchivoSinFechaPage({ searchParams }: SinFechaPageProps) {
  const resolvedSearchParams = await searchParams
  // Parseo de página
  const pageParam = typeof resolvedSearchParams.page === 'string' ? resolvedSearchParams.page : '1'
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)

  // Consulta al servicio
  const { data: conferencias, total } = await getConferenciasSinFecha({
    page: currentPage,
    limit: ITEMS_PER_PAGE
  })

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  // Decisión de diseño (Corección de prolijidad): 
  // Usar exclusivamente el bloque visual de estado vacío en lugar de notFound().
  const isEmpty = total === 0 || conferencias.length === 0

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
              Sin fecha asignada
            </li>
          </ol>
        </nav>

        {/* ============================================
            ENCABEZADO
            ============================================ */}
        <div className="mb-12 border-b pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <h1
              className="text-4xl md:text-5xl font-light tracking-tight"
              style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                color: 'var(--color-text-primary, rgba(255,255,255,0.95))',
              }}
            >
              Sin fecha <span style={{ color: 'var(--color-gold, #D4AF37)' }}>asignada</span>
            </h1>
            <p
              className="mt-3 text-base"
              style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}
            >
              Conferencias pendientes de clasificación temporal exacta. Mostrando {conferencias.length} de {total} registros.
            </p>
          </div>
        </div>

        {/* ============================================
            GRILLA O ESTADO VACÍO
            ============================================ */}
        {!isEmpty ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conferencias.map((conf, idx) => (
                <ConferenceCard
                  key={conf.id}
                  conferencia={conf}
                  index={idx}
                />
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
            <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-gold, #D4AF37)' }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <h2 className="text-xl font-medium mb-2" style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}>No se encontraron resultados</h2>
            <p style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>No hay conferencias sin fecha para esta página.</p>
          </div>
        )}
      </div>
    </div>
  )
}
