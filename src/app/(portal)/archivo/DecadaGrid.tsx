// =========================================================
// Legado Patrimonial WSS — Paso 2 Refactorización v2
// src/app/archivo/DecadaGrid.tsx
// Server Component: grilla de años agrupados por década
// con conteo de conferencias y enlace a /archivo/sin-fecha
// =========================================================

import Link from 'next/link'

type AnioConConteo = {
  anio: number
  total: number
}

type DecadaGridProps = {
  anios: AnioConConteo[]
  sinFecha: number
}

/** Agrupa los años en décadas (1970, 1980, …) */
function agruparPorDecada(anios: AnioConConteo[]) {
  const mapa = new Map<number, AnioConConteo[]>()

  for (const item of anios) {
    const decada = Math.floor(item.anio / 10) * 10
    const grupo = mapa.get(decada)
    if (grupo) {
      grupo.push(item)
    } else {
      mapa.set(decada, [item])
    }
  }

  return Array.from(mapa.entries())
    .sort(([a], [b]) => a - b)
    .map(([decada, items]) => ({
      decada,
      label: `${decada}s`,
      anios: items.sort((a, b) => a.anio - b.anio),
      totalDecada: items.reduce((sum, i) => sum + i.total, 0),
    }))
}

export function DecadaGrid({ anios, sinFecha }: Readonly<DecadaGridProps>) {
  const decadas = agruparPorDecada(anios)
  const totalGeneral = anios.reduce((sum, a) => sum + a.total, 0) + sinFecha

  return (
    <div>
      {/* ── Resumen general ── */}
      <div
        className="mb-8 rounded-2xl border p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-sm" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
            Total del archivo:
          </p>
          <p
            className="text-2xl font-light tracking-wide"
            style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              color: 'var(--color-gold, #D4AF37)',
            }}
          >
            {totalGeneral.toLocaleString('es-ES')} conferencias
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.4))' }}>
            en {decadas.length} décadas · {anios.length} años
          </p>
        </div>
      </div>

      {/* ── Décadas con años ── */}
      <div className="space-y-10">
        {decadas.map(({ decada, label, anios: aniosDecada, totalDecada }) => (
          <section key={decada}>
            {/* Encabezado de década */}
            <div className="mb-4 flex items-baseline gap-4">
              <h2
                className="text-xl font-light tracking-wide"
                style={{
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  color: 'var(--color-text-primary, rgba(255,255,255,0.95))',
                }}
              >
                {label}
              </h2>
              <span
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.35))' }}
              >
                {totalDecada} {totalDecada === 1 ? 'conferencia' : 'conferencias'}
              </span>
            </div>

            {/* Grilla de años */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {aniosDecada.map((item) => (
                <Link
                  key={item.anio}
                  href={`/archivo/${item.anio}`}
                  className="group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {/* Efecto hover glassmorphism dorado */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        'radial-gradient(circle at top right, rgba(212, 175, 55, 0.12), transparent 60%)',
                    }}
                  />

                  <div className="relative z-10">
                    <p
                      className="text-2xl font-light tabular-nums"
                      style={{
                        fontFamily: 'var(--font-cormorant, Georgia, serif)',
                        color: 'var(--color-text-primary, rgba(255,255,255,0.9))',
                      }}
                    >
                      {item.anio}
                    </p>
                    <p
                      className="mt-1 text-xs font-medium"
                      style={{ color: 'var(--color-gold, #D4AF37)' }}
                    >
                      {item.total} {item.total === 1 ? 'conferencia' : 'conferencias'}
                    </p>
                  </div>

                  {/* Flecha de navegación */}
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1"
                    style={{ color: 'var(--color-gold, #D4AF37)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Bloque "Sin fecha asignada" ── */}
      {sinFecha > 0 && (
        <div className="mt-12">
          <Link
            href="/archivo/sin-fecha"
            className="group relative block overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'rgba(212, 175, 55, 0.12)',
            }}
          >
            {/* Efecto hover */}
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  'linear-gradient(135deg, rgba(212, 175, 55, 0.06), transparent 50%)',
              }}
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Icono de calendario con signo de interrogación */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: 'rgba(212, 175, 55, 0.08)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: 'var(--color-gold, #D4AF37)' }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M12 14v.01" />
                    <path d="M12 17a1.5 1.5 0 1 0-1.14-2.47" />
                  </svg>
                </div>

                <div>
                  <p
                    className="text-base font-medium"
                    style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}
                  >
                    Sin fecha asignada
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.45))' }}
                  >
                    Conferencias pendientes de clasificación temporal
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-3 py-1 text-sm font-semibold"
                  style={{
                    background: 'rgba(212, 175, 55, 0.1)',
                    color: 'var(--color-gold, #D4AF37)',
                    border: '1px solid rgba(212, 175, 55, 0.18)',
                  }}
                >
                  {sinFecha}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--color-gold, #D4AF37)' }}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
