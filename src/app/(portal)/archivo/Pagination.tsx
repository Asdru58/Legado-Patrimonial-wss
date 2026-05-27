// =========================================================
// Legado Patrimonial WSS — Fase 5.8
// src/app/archivo/Pagination.tsx
// Client Component: paginación conectada a URL params
// Parche: color dorado #D4AF37
// =========================================================

'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface PaginationProps {
  currentPage: number
  totalPages: number
}

function buildPageNumbers(
  current: number,
  total: number
): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]
  const rangeStart = Math.max(2, current - 1)
  const rangeEnd = Math.min(total - 1, current + 1)

  if (rangeStart > 2) pages.push('ellipsis')

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i)
  }

  if (rangeEnd < total - 1) pages.push('ellipsis')

  pages.push(total)
  return pages
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(page))

      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: true })
    },
    [pathname, router, searchParams]
  )

  if (totalPages <= 1) return null

  const pages = buildPageNumbers(currentPage, totalPages)
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  const arrowStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
  }

  const disabledArrowStyle = {
    ...arrowStyle,
    opacity: 0.3,
    cursor: 'not-allowed' as const,
  }

  return (
    <nav
      className="flex items-center justify-center gap-1.5 mt-10"
      aria-label="Paginación"
    >
      <button
        type="button"
        onClick={() => hasPrev && goToPage(currentPage - 1)}
        disabled={!hasPrev}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all"
        style={hasPrev ? arrowStyle : disabledArrowStyle}
        aria-label="Página anterior"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>

      {pages.map((item, idx) => {
        if (item === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="w-9 h-9 flex items-center justify-center text-sm"
              style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.3))' }}
            >
              ...
            </span>
          )
        }

        const isActive = item === currentPage
        return (
          <button
            key={item}
            type="button"
            onClick={() => !isActive && goToPage(item)}
            disabled={isActive}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all"
            style={
              isActive
                ? {
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: 'var(--color-gold, #D4AF37)',
                  }
                : {
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--color-text-muted, rgba(255,255,255,0.5))',
                  }
            }
            aria-label={`Ir a página ${item}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item}
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => hasNext && goToPage(currentPage + 1)}
        disabled={!hasNext}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all"
        style={hasNext ? arrowStyle : disabledArrowStyle}
        aria-label="Página siguiente"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </nav>
  )
}
