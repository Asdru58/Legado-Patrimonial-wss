'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminConferenciasError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[/admin/conferencias] Error boundary:', error)
  }, [error])

  return (
    <div className="py-12">
      <div
        className="
          flex items-center gap-3 px-5 py-4
          border border-red-500/20 bg-red-500/[0.06] rounded-sm
          font-[family-name:var(--font-dm-sans)] text-sm text-red-300
        "
      >
        <svg
          className="w-4 h-4 shrink-0 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
        <span className="flex-1">
          Error al cargar las conferencias. Puede ser un problema temporal de conexión con la base de datos.
        </span>
        <button
          type="button"
          onClick={reset}
          className="
            shrink-0 px-4 py-1.5 rounded-sm
            text-xs font-medium tracking-wide uppercase
            text-[#D4AF37]/90
            bg-[#D4AF37]/10 border border-[#D4AF37]/25
            transition-all duration-200
            hover:bg-[#D4AF37]/[0.18]
          "
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
