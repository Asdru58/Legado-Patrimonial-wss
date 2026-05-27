// =========================================================
// Legado Patrimonial WSS — Paso 2 Refactorización v2
// src/app/archivo/SearchBar.tsx
// Client Component: barra de búsqueda que redirige a
// /archivo/busqueda?query=[término] al enviar
// =========================================================

'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function SearchBar() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Redirige a /archivo/busqueda?query=[término].
   * Solo navega si hay un término válido.
   */
  const submitSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim()
      if (!trimmed) return

      router.push(`/archivo/busqueda?query=${encodeURIComponent(trimmed)}`)
    },
    [router]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      submitSearch(value)
    },
    [submitSearch, value]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitSearch(value)
      }
    },
    [submitSearch, value]
  )

  const handleClear = useCallback(() => {
    setValue('')
    inputRef.current?.focus()
  }, [])

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.35))' }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar por título, ponente o contenido..."
        aria-label="Buscar conferencias"
        className="
          w-full pl-11 pr-10 py-3
          rounded-lg text-sm
          outline-none transition-all duration-300
        "
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--color-text-primary, rgba(255,255,255,0.9))',
        }}
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            w-6 h-6 flex items-center justify-center
            rounded-full transition-colors
          "
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--color-text-muted, rgba(255,255,255,0.4))',
          }}
          aria-label="Limpiar búsqueda"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  )
}
