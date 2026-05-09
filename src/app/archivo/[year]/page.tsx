// =========================================================
// Legado Patrimonial WSS — Paso 3 Refactorización v2
// src/app/archivo/[year]/page.tsx
// Server Component: Panel 2 — Meses disponibles para un año
// =========================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMesesConConferencias } from '@/lib/services/conferences'
import { MesCard } from './MesCard'

type PageProps = {
  params: Promise<{
    year: string
  }>
}

export default async function ArchivoAnioPage({ params }: PageProps) {
  const resolvedParams = await params
  const yearNumber = parseInt(resolvedParams.year, 10)

  if (Number.isNaN(yearNumber)) {
    notFound()
  }

  const { meses, totalAnio } = await getMesesConConferencias(yearNumber)

  if (!meses || meses.length === 0) {
    notFound()
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
              {yearNumber}
            </li>
          </ol>
        </nav>

        {/* ============================================
            ENCABEZADO
            ============================================ */}
        <div className="mb-12 border-b pb-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h1
            className="text-5xl md:text-6xl font-light tracking-tight"
            style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              color: 'var(--color-text-primary, rgba(255,255,255,0.95))',
            }}
          >
            {yearNumber}
          </h1>
          <p
            className="mt-4 text-base"
            style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}
          >
            Se encontraron{' '}
            <span className="font-semibold" style={{ color: 'var(--color-gold, #D4AF37)' }}>
              {totalAnio}
            </span>{' '}
            {totalAnio === 1 ? 'conferencia' : 'conferencias'} impartidas en este año.
          </p>
        </div>

        {/* ============================================
            GRILLA DE MESES
            ============================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {meses.map((item) => (
            <MesCard
              key={item.mes}
              year={yearNumber}
              mes={item.mes}
              total={item.total}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
