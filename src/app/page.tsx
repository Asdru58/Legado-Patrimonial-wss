'use client'

import { type FormEvent, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Page() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = query.trim()
    if (trimmed.length === 0) return

    router.push(`/archivo/busqueda?query=${encodeURIComponent(trimmed)}`)
  }

  return (
    <main className="flex min-h-svh flex-col overflow-hidden bg-[#0F0D0A] px-5 py-6 text-[#E8DCC8] md:px-10 md:py-8 lg:px-16 lg:py-10">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Ir a la portada de Legado Patrimonial El Séptimo Sello"
          className="group flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#C8A843] text-sm font-bold text-[#0F0D0A]">
            LP
          </span>
          <span className="flex min-w-0 flex-col text-sm font-medium leading-tight text-[#E8DCC8] transition-colors group-hover:text-[#DFC06A] md:block md:text-base md:leading-normal">
            <span className="block truncate md:inline">Legado Patrimonial</span>
            <span className="block truncate md:ml-1 md:inline">El Séptimo Sello</span>
          </span>
        </Link>

        <Link
          href="/inicio"
          aria-label="Entrar al portal"
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium text-[rgba(232,220,200,0.7)] transition-colors hover:text-[#DFC06A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
        >
          Inicio
        </Link>
      </header>

      <section
        aria-label="Portada editorial El Séptimo Sello"
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col pt-8 md:pt-10 lg:pt-12"
      >
        <form
          role="search"
          aria-label="Buscar en el archivo patrimonial"
          onSubmit={handleSearch}
          className="relative mb-8 w-full md:mb-12 md:max-w-2xl"
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgba(232,220,200,0.5)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, ponente o contenido..."
            aria-label="Buscar por título, ponente o contenido"
            className="min-h-[48px] w-full rounded-lg border border-[rgba(200,170,100,0.1)] bg-[rgba(200,170,100,0.04)] py-3.5 pl-12 pr-4 text-sm text-[#E8DCC8] placeholder:text-[rgba(232,220,200,0.4)] transition-colors hover:border-[rgba(200,170,100,0.24)] focus-visible:border-[rgba(200,170,100,0.4)] focus-visible:bg-[rgba(200,170,100,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
          />
        </form>

        <div className="grid flex-1 grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[1fr_1.2fr_1fr] lg:gap-8">
          <div className="order-2 border-l-[3px] border-[#C8A843] pl-6 md:order-1">
            <blockquote cite="conferencia: El lugar donde Dios ha puesto su palabra, 10 de julio del 2000">
              <p className="text-sm leading-8 text-[rgba(232,220,200,0.85)] lg:text-base">
                …el Mensaje de Dios para cada etapa, edad o dispensación, luego
                que es dado, es un patrimonio del pueblo de Dios. Mientras está
                el mensajero, el mensajero tiene control, pero cuando se va el
                mensajero, ya ni los familiares del mensajero pueden hacer
                nada, porque ya ese patrimonio fue dado para la Iglesia, para
                el pueblo de Dios.
              </p>
            </blockquote>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.05em] text-[#C8A843]">
              EL LUGAR DONDE DIOS HA PUESTO SU PALABRA. 10 DE JULIO DEL 2000
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.05em] text-[rgba(232,220,200,0.7)]">
              DR. WILLIAM SOTO SANTIAGO
            </p>
          </div>

          <div className="order-1 flex items-center justify-center md:order-2">
            <Image
              src="/images/hero-dr-william.png"
              alt="Dr. William Soto Santiago sosteniendo la Biblia"
              width={500}
              height={600}
              priority
              quality={85}
              sizes="(max-width: 767px) 280px, (max-width: 1023px) 360px, 480px"
              className="h-auto w-full max-w-[280px] object-contain md:max-w-[360px] lg:max-w-[480px]"
            />
          </div>

          <div className="order-3 flex flex-col gap-6 md:col-span-2 lg:col-span-1">
            <h1 className="font-serif text-3xl font-bold leading-[1.2] text-[#E8DCC8] lg:text-[2rem]">
              El resguardo de
              <span className="text-[#DFC06A]"> la Palabra pura</span>
            </h1>
            <div className="space-y-3 text-sm italic leading-[1.6] text-[rgba(232,220,200,0.75)]">
              <p>
                Yo testifico a todo aquel que oye las palabras de la profecía
                de este libro: Si alguno añadiere a estas cosas, Dios traerá
                sobre él las plagas que están escritas en este libro.
              </p>
              <p>
                Y si alguno quitare de las palabras del libro de esta profecía,
                Dios quitará su parte del libro de la vida, y de la santa ciudad
                y de las cosas que están escritas en este libro.
              </p>
              <p className="pt-2 text-xs font-semibold text-[rgba(232,220,200,0.85)]">
                APOC. 22: 18-19
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
