// =========================================================
// Legado Patrimonial WSS — Paso 2 Refactorización v2
// src/app/archivo/page.tsx
// Server Component: Panel 1 — Años agrupados por década
// con buscador global y enlace a conferencias sin fecha
// =========================================================

import { getConferenciasPorAnio } from '@/lib/services/conferences'
import { HeroSearch } from '@/components/hero/HeroSearch'
import { DecadaGrid } from './DecadaGrid'

export default async function ArchivoPage() {
  const { anios, sinFecha } = await getConferenciasPorAnio()

  // El rango de años sale del mismo conteo que ya pide la página: ni una
  // consulta más. Escrito a mano decía «1974 hasta 2018», que hoy es correcto
  // pero dejaría de serlo en cuanto entre una conferencia de otro año.
  const aniosOrdenados = anios.map((a) => a.anio).sort((x, y) => x - y)
  const anioInicial = aniosOrdenados.at(0)
  const anioFinal = aniosOrdenados.at(-1)

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
          className="mt-3 max-w-3xl text-base md:text-lg font-medium leading-relaxed text-[#C7B99F]"
        >
          Explora el archivo completo de conferencias espirituales
          {anioInicial && anioFinal
            ? ` desde ${anioInicial} hasta ${anioFinal}.`
            : '.'}
        </p>

        <div className="mt-6 max-w-2xl">
          <HeroSearch />
        </div>
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
