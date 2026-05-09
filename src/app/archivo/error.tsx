'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ArchivoError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[/archivo] Error boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--color-bg-primary, #050505)' }}>
      <div className="text-center max-w-md">
        <svg className="w-12 h-12 mx-auto mb-5" fill="none" viewBox="0 0 24 24" strokeWidth={0.8} stroke="currentColor" style={{ color: 'rgba(239, 68, 68, 0.5)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <h2 className="text-xl font-light mb-2" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}>
          Error al cargar el archivo
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
          Ocurrió un problema al consultar las conferencias. Puedes intentar de nuevo o volver más tarde.
        </p>
        <button onClick={reset} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.25)', color: 'var(--color-gold, #D4AF37)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
