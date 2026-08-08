import { Archive, BookOpen, Landmark, Mic2 } from 'lucide-react'

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

export function ArchiveEntry() {
  return (
    <section
      id="explorar-archivo"
      aria-labelledby="archive-entry-title"
      className="scroll-mt-20 border-y border-[rgba(200,168,67,0.14)] bg-[#161310] px-6 py-14 md:px-10 md:py-18"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C8A843]">
              Búsqueda en el archivo
            </p>
            <span className="border border-[rgba(200,168,67,0.28)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-[#DFC06A]">
              Beta
            </span>
          </div>
          <h2
            id="archive-entry-title"
            className="mt-4 font-serif text-3xl font-semibold text-[#E8DCC8] md:text-4xl"
          >
            Encuentra una conferencia o continúa por sección
          </h2>
          <div className="mt-7">
            <HeroSearch />
          </div>
        </div>

        <nav aria-label="Accesos rápidos" className="mt-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickAccessItems.map((item) => (
              <QuickAccessButton key={item.href} {...item} />
            ))}
          </div>
        </nav>
      </div>
    </section>
  )
}
