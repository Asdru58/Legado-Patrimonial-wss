'use client'

import { type FormEvent, useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { SearchMode } from '@/lib/services/conferences'

export type PublicSearchMode = Exclude<SearchMode, 'lexical'>

type HeroSearchProps = {
  initialQuery?: string
  initialSearchMode?: PublicSearchMode
}

export function HeroSearch({
  initialQuery = '',
  initialSearchMode = 'exact',
}: Readonly<HeroSearchProps>) {
  const [query, setQuery] = useState(initialQuery)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function navigateSearch(searchMode: PublicSearchMode) {
    const params = new URLSearchParams({ search_mode: searchMode })
    const trimmedQuery = query.trim()

    if (trimmedQuery) {
      params.set('query', trimmedQuery)
    }

    startTransition(() => {
      router.push(`/archivo/busqueda?${params.toString()}`)
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!query.trim()) return

    navigateSearch(initialSearchMode)
  }

  return (
    <form
      role="search"
      aria-label="Buscar en el archivo de conferencias"
      aria-busy={isPending}
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4"
    >
      <fieldset className="w-full">
        <legend className="text-sm font-semibold text-[#E8DCC8]">¿Cómo quieres buscar?</legend>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label
            className={[
              'cursor-pointer rounded-xl border p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#DFC06A]',
              initialSearchMode === 'exact'
                ? 'border-[#DFC06A] bg-[rgba(200,168,67,0.12)]'
                : 'border-[rgba(200,168,67,0.2)] bg-[rgba(200,168,67,0.04)] hover:border-[rgba(200,168,67,0.36)]',
            ].join(' ')}
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                name="search-mode"
                value="exact"
                checked={initialSearchMode === 'exact'}
                onChange={() => navigateSearch('exact')}
                disabled={isPending}
                aria-describedby="search-mode-exact-description"
                className="mt-1 h-4 w-4 shrink-0 accent-[#C8A843]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#E8DCC8]">Frase exacta</span>
                <span
                  id="search-mode-exact-description"
                  className="mt-1 block text-xs leading-5 text-[rgba(232,220,200,0.62)]"
                >
                  Encuentra exactamente las palabras escritas.
                </span>
              </span>
            </span>
          </label>

          <label
            className={[
              'cursor-pointer rounded-xl border p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#DFC06A]',
              initialSearchMode === 'semantic'
                ? 'border-[#DFC06A] bg-[rgba(200,168,67,0.12)]'
                : 'border-[rgba(200,168,67,0.2)] bg-[rgba(200,168,67,0.04)] hover:border-[rgba(200,168,67,0.36)]',
            ].join(' ')}
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                name="search-mode"
                value="semantic"
                checked={initialSearchMode === 'semantic'}
                onChange={() => navigateSearch('semantic')}
                disabled={isPending}
                aria-describedby="search-mode-semantic-description"
                className="mt-1 h-4 w-4 shrink-0 accent-[#C8A843]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#E8DCC8]">Tema o enseñanza</span>
                <span
                  id="search-mode-semantic-description"
                  className="mt-1 block text-xs leading-5 text-[rgba(232,220,200,0.62)]"
                >
                  Busca la idea aunque se hayan utilizado otras palabras.
                </span>
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
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
            disabled={isPending}
            placeholder="Buscar en el archivo de conferencias..."
            className="min-h-[52px] w-full rounded-xl border border-[rgba(200,168,67,0.2)] bg-[rgba(200,168,67,0.05)] py-3 pl-12 pr-4 text-sm text-[#E8DCC8] placeholder:text-[rgba(232,220,200,0.42)] transition-colors hover:border-[rgba(200,168,67,0.36)] focus-visible:border-[#DFC06A] focus-visible:bg-[rgba(200,168,67,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#C8A843] px-6 text-sm font-bold text-[#0F0D0A] transition-colors hover:bg-[#DFC06A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A] disabled:cursor-wait disabled:opacity-70"
        >
          {isPending ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
    </form>
  )
}
