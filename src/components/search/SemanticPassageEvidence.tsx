'use client'

import { useEffect, useRef } from 'react'

export const SEMANTIC_PASSAGE_ANCHOR_ID = 'pasaje-relevante'

type SemanticPassageEvidenceProps = {
  text: string
  paginaInicio: number
  paginaFin: number
  variant?: 'card' | 'detail'
  id?: string
  focusOnMount?: boolean
}

function formatPageRange(paginaInicio: number, paginaFin: number): string {
  if (paginaInicio === paginaFin) {
    return `Página ${paginaInicio}`
  }

  return `Páginas ${paginaInicio}–${paginaFin}`
}

export function SemanticPassageEvidence({
  text,
  paginaInicio,
  paginaFin,
  variant = 'card',
  id,
  focusOnMount = false,
}: Readonly<SemanticPassageEvidenceProps>) {
  const containerRef = useRef<HTMLElement>(null)
  const isDetail = variant === 'detail'
  const labelId = id ? `${id}-titulo` : undefined

  useEffect(() => {
    if (!focusOnMount || !id || window.location.hash !== `#${id}`) return

    let focusFrame: number | undefined
    const navigationFrame = window.requestAnimationFrame(() => {
      focusFrame = window.requestAnimationFrame(() => {
        containerRef.current?.scrollIntoView({ block: 'start' })
        containerRef.current?.focus({ preventScroll: true })
      })
    })

    return () => {
      window.cancelAnimationFrame(navigationFrame)
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame)
    }
  }, [focusOnMount, id])

  return (
    <section
      ref={containerRef}
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-labelledby={labelId}
      className={`rounded-xl border px-4 py-3 scroll-mt-24 focus:outline-none focus:ring-2 focus:ring-amber-400/60 ${
        isDetail ? 'mb-10 md:px-6 md:py-5' : 'mb-5'
      }`}
      style={{
        borderColor: 'rgba(212, 175, 55, 0.24)',
        background: 'rgba(212, 175, 55, 0.06)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={labelId}
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-gold)' }}
        >
          Pasaje relevante
        </h2>
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {formatPageRange(paginaInicio, paginaFin)}
        </span>
      </div>
      <p
        className={`mt-3 whitespace-pre-line pr-2 leading-relaxed ${
          isDetail ? 'text-base' : 'max-h-56 overflow-y-auto text-sm'
        }`}
        style={{
          color: 'var(--color-text-primary, rgba(255, 255, 255, 0.94))',
          textAlign: isDetail ? 'justify' : 'left',
        }}
      >
        {text}
      </p>
    </section>
  )
}
