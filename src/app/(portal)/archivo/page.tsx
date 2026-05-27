// =========================================================
// Legado Patrimonial WSS — Paso 2 Refactorización v2
// src/app/archivo/page.tsx
// Server Component: Panel 1 — Años agrupados por década
// con buscador global y enlace a conferencias sin fecha
// =========================================================

import { Suspense } from 'react'
import { getConferenciasPorAnio } from '@/lib/services/conferences'
import { DecadaGrid } from './DecadaGrid'
import { SearchBar } from './SearchBar'

export default async function ArchivoPage() {
  const { anios, sinFecha } = await getConferenciasPorAnio()

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-bg-primary, #050505)' }}
    >
      {/* ============================================
          ENCABEZADO
          ============================================ */}
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6">
        <h1
          className="text-3xl md:text-4xl font-light tracking-wide"
          style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            color: 'var(--color-text-primary, rgba(255,255,255,0.95))',
          }}
        >
          Archivo Cronológico
        </h1>

        <p
          className="mt-2 text-sm mb-6"
          style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}
        >
          Explora el archivo completo de conferencias espirituales
          desde 1974 hasta 2018.
        </p>

        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </div>

      {/* ============================================
          CUERPO: GRILLA DE DÉCADAS
          ============================================ */}
      <div className="mx-auto max-w-7xl px-6 pb-20">
        <DecadaGrid anios={anios} sinFecha={sinFecha} />
      </div>
    </div>
  )
}