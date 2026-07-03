'use client'

import { type FormEvent, useState } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function HeroSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    router.push(`/archivo/busqueda?query=${encodeURIComponent(trimmedQuery)}`)
  }

  return (
    <form
      role="search"
      aria-label="Buscar en el archivo de conferencias"
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 sm:flex-row"
    >
      <label className="relative flex-1">
        <span className="sr-only">Buscar en el archivo de conferencias</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgba(232,220,200,0.48)]"
          strokeWidth={1.6}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en el archivo de conferencias..."
          className="min-h-[52px] w-full rounded-xl border border-[rgba(200,168,67,0.2)] bg-[rgba(200,168,67,0.05)] py-3 pl-12 pr-4 text-sm text-[#E8DCC8] placeholder:text-[rgba(232,220,200,0.42)] transition-colors hover:border-[rgba(200,168,67,0.36)] focus-visible:border-[#DFC06A] focus-visible:bg-[rgba(200,168,67,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#C8A843] px-6 text-sm font-bold text-[#0F0D0A] transition-colors hover:bg-[#DFC06A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
      >
        Buscar
      </button>
    </form>
  )
}
