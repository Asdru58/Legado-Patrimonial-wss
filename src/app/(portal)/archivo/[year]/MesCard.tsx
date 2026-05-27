// =========================================================
// Legado Patrimonial WSS — Paso 3 Refactorización v2
// src/app/archivo/[year]/MesCard.tsx
// Server Component: Tarjeta visual para un mes específico
// =========================================================

import Link from 'next/link'

type MesCardProps = {
  year: number
  mes: number
  total: number
}

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function MesCard({ year, mes, total }: Readonly<MesCardProps>) {
  const nombreMes = MESES_NOMBRES[mes - 1] || `Mes ${mes}`
  const monthStr = mes.toString().padStart(2, '0')
  const href = `/archivo/${year}/${monthStr}`

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[140px]"
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
            'radial-gradient(circle at top right, rgba(212, 175, 55, 0.12), transparent 70%)',
        }}
      />

      <div className="relative z-10">
        <h3
          className="text-2xl font-light tracking-wide"
          style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            color: 'var(--color-text-primary, rgba(255,255,255,0.95))',
          }}
        >
          {nombreMes}
        </h3>
        <p
          className="mt-2 text-sm font-medium"
          style={{ color: 'var(--color-gold, #D4AF37)' }}
        >
          {total} {total === 1 ? 'conferencia' : 'conferencias'}
        </p>
      </div>

      <div className="relative z-10 mt-auto pt-4 flex justify-end">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 group-hover:bg-opacity-20"
          style={{
            borderColor: 'rgba(212, 175, 55, 0.3)',
            background: 'rgba(212, 175, 55, 0.05)',
            color: 'var(--color-gold, #D4AF37)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
