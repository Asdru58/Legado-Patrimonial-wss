import { Archive, BookOpen, Landmark, Mic2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { HeroSearch } from './HeroSearch'
import { QuickAccessButton } from './QuickAccessButton'

const quickAccessItems = [
  {
    href: '/archivo',
    icon: Archive,
    label: 'Archivo de Conferencias',
    sublabel: 'Explorar por año, mes y título',
  },
  {
    href: '/estudios',
    icon: BookOpen,
    label: 'Estudios Temáticos',
    sublabel: 'Colecciones y enseñanzas organizadas',
  },
  {
    href: '/podcast',
    icon: Mic2,
    label: 'Podcast',
    sublabel: 'Episodios y contenido doctrinal',
  },
  {
    href: '/el-legado',
    icon: Landmark,
    label: 'El Legado',
    sublabel: 'Propósito e identidad del proyecto',
  },
] as const

export function Hero() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-[#0F0D0A] px-5 py-6 text-[#E8DCC8] md:px-10 md:py-8 lg:px-16 lg:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,rgba(200,168,67,0.1),transparent_58%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Ir a la portada de Legado Patrimonial, el Séptimo Sello"
          className="group flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#C8A843] text-sm font-bold text-[#0F0D0A]">
            LP
          </span>
          <span className="flex min-w-0 flex-col text-sm font-medium leading-tight text-[#E8DCC8] transition-colors group-hover:text-[#DFC06A] md:block md:text-base md:leading-normal">
            <span className="block truncate md:inline">Legado Patrimonial,</span>
            <span className="block truncate md:ml-1 md:inline">
              el Séptimo Sello
            </span>
          </span>
        </Link>

        <Link
          href="/inicio"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium text-[rgba(232,220,200,0.7)] transition-colors hover:text-[#DFC06A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
        >
          Inicio
        </Link>
      </header>

      <section
        aria-labelledby="hero-title"
        className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 py-10 lg:min-h-[calc(100svh-7.75rem)] lg:grid-cols-2 lg:gap-16 lg:py-12"
      >
        <div className="flex flex-col">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#C8A843]">
            Archivo Patrimonial Digital
          </p>
          <h1
            id="hero-title"
            className="max-w-2xl font-serif text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[#E8DCC8] sm:text-5xl lg:text-6xl"
          >
            El resguardo de la{' '}
            <span className="text-[#DFC06A]">Palabra Pura</span>
          </h1>

          <blockquote className="mt-6 max-w-2xl border-l-2 border-[#C8A843] pl-5">
            <p className="text-sm leading-7 text-[rgba(232,220,200,0.72)] sm:text-base">
              “El Mensaje de Dios para cada etapa, edad o dispensación, luego
              que es dado, es un patrimonio del pueblo de Dios.”
            </p>
            <cite className="mt-3 block text-xs not-italic uppercase tracking-[0.08em] text-[rgba(232,220,200,0.5)]">
              Dr. William Soto Santiago
            </cite>
          </blockquote>

          <div className="mt-8">
            <HeroSearch />
          </div>

          <nav aria-label="Accesos rápidos" className="mt-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {quickAccessItems.map((item) => (
                <QuickAccessButton key={item.href} {...item} />
              ))}
            </div>
          </nav>
        </div>

        <div className="relative mx-auto flex w-full max-w-xl items-end justify-center self-stretch">
          <div
            aria-hidden="true"
            className="absolute inset-x-[12%] bottom-[6%] top-[12%] rounded-full bg-[radial-gradient(circle,rgba(200,168,67,0.16),transparent_68%)]"
          />
          <Image
            src="/images/hero-dr-william.png"
            alt="Dr. William Soto Santiago sosteniendo la Biblia"
            width={500}
            height={600}
            priority
            quality={85}
            sizes="(max-width: 1023px) 80vw, 42vw"
            className="relative z-10 h-auto max-h-[660px] w-full max-w-[500px] object-contain"
          />
        </div>
      </section>
    </main>
  )
}
