// =========================================================
// Legado Patrimonial WSS — Sistema de Podcast
// src/app/podcast/page.tsx
// Server Component: portada del Podcast (datos reales)
//
// Refactorizado: eliminados PODCAST_EPISODES, PODCAST_SERIES
// y PODCAST_METRICS. Ahora consume datos de Supabase vía
// la capa de servicios podcast.ts.
// =========================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowDown,
  CalendarDays,
  Clock3,
  Headphones,
  Mic2,
  Play,
  Radio,
  Sparkles,
  Waves,
} from 'lucide-react'
import { getAllEpisodios, getEpisodioDestacado } from '@/lib/services/podcast'

export const metadata: Metadata = {
  title: 'Podcast | Legado Patrimonial WSS',
  description:
    'Estudios doctrinales pregrabados en formato conversación guiada, centrados en temas bíblico-proféticos derivados de las conferencias del Dr. William Soto Santiago.',
}

// ── Helpers ──

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  return `~${minutes} min`
}

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date + 'T00:00:00'))
}

export default async function PodcastPage() {
  const [allEpisodios, destacado] = await Promise.all([
    getAllEpisodios(),
    getEpisodioDestacado(),
  ])

  // El episodio destacado puede no existir; usar el primero disponible
  const featuredEpisode = destacado ?? allEpisodios[0] ?? null
  // Los episodios regulares excluyen el destacado
  const regularEpisodes = featuredEpisode
    ? allEpisodios.filter((ep) => ep.id !== featuredEpisode.id)
    : allEpisodios

  // Métricas calculadas desde datos reales
  const totalEpisodios = allEpisodios.length
  const temporadas = new Set(allEpisodios.map((ep) => ep.temporada)).size

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section
        aria-labelledby="podcast-hero-title"
        className="relative overflow-hidden border-b border-[#D4AF37]/15"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-8 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              Hub de Podcast
            </div>

            <h1
              id="podcast-hero-title"
              className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl"
            >
              Una sala editorial para escuchar la memoria, la visión y la continuidad del archivo.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              Podcast abre un espacio de conversación íntima y reflexiva dentro de Legado
              Patrimonial WSS. Aquí la voz se convierte en atmósfera, criterio y testimonio: una
              experiencia diseñada para profundizar en la identidad del archivo sin perder sobriedad
              ni presencia documental.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#episodios"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#111111] shadow-[0_12px_40px_rgba(212,175,55,0.24)] transition hover:bg-[#e3bf4f]"
              >
                Explorar episodios
                <ArrowDown className="h-4 w-4" />
              </Link>

              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-white/5 px-6 py-4 text-sm font-semibold text-[#F5E7B5] backdrop-blur-xl transition hover:border-[#D4AF37]/45 hover:bg-white/8"
              >
                Ir al Archivo
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">
                    Temporadas
                  </p>
                  <p className="mt-4 text-2xl font-semibold text-white">
                    {temporadas || '—'}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Líneas editoriales activas
                  </p>
                </article>

                <article className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">
                    Episodios publicados
                  </p>
                  <p className="mt-4 text-2xl font-semibold text-white">
                    {totalEpisodios || '—'}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Conversaciones y análisis doctrinal
                  </p>
                </article>

                <article className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">
                    Experiencia sonora
                  </p>
                  <p className="mt-4 text-2xl font-semibold text-white">Audio inmersivo</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Integrado al módulo de reproducción
                  </p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Episodio destacado */}
      {featuredEpisode && (
        <section
          id="destacado"
          aria-labelledby="podcast-destacado-title"
          className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16 scroll-mt-20"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2
              id="podcast-destacado-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Episodio destacado
            </h2>
          </div>

          <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
                  <Radio className="h-3.5 w-3.5" />
                  Selección editorial
                </div>

                <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white">
                  {featuredEpisode.titulo}
                </h3>

                {featuredEpisode.descripcion && (
                  <p className="mt-4 max-w-3xl text-sm leading-8 text-white/72">
                    {featuredEpisode.descripcion}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/62">
                  {featuredEpisode.tema_doctrinal && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {featuredEpisode.tema_doctrinal}
                    </span>
                  )}
                  {featuredEpisode.duracion_minutos && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {formatDuration(featuredEpisode.duracion_minutos)}
                    </span>
                  )}
                  {featuredEpisode.fecha_publicacion && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {formatDate(featuredEpisode.fecha_publicacion)}
                    </span>
                  )}
                </div>

                <div className="mt-8">
                  <Link
                    href={`/podcast/${featuredEpisode.slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] shadow-[0_12px_40px_rgba(212,175,55,0.24)] transition hover:bg-[#e3bf4f]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Escuchar episodio
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
                <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                  <Headphones className="h-6 w-6 text-[#D4AF37]" />
                </div>

                <h4 className="mt-5 text-xl font-semibold text-white">
                  El valor del diálogo
                </h4>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  La sección de podcast no es solo un repositorio de audio; es un espacio curado donde la reflexión y el contexto en torno al archivo cobran vida a través de la conversación.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <Clock3 className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-sm text-white/68">
                      Análisis profundo del material histórico
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <Waves className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-sm text-white/68">
                      Masterización sonora de alta fidelidad
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Listado de episodios */}
      <section
        id="episodios"
        aria-labelledby="podcast-episodios-title"
        className="mx-auto max-w-7xl px-6 py-4 md:px-8 scroll-mt-20"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
          <h2
            id="podcast-episodios-title"
            className="text-2xl font-semibold tracking-tight text-white"
          >
            {regularEpisodes.length > 0 ? 'Últimos episodios' : 'Episodios'}
          </h2>
        </div>

        {regularEpisodes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {regularEpisodes.map((item) => (
              <article
                key={item.id}
                className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-2xl transition hover:border-[#D4AF37]/20"
              >
                <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                  <Mic2 className="h-5 w-5 text-[#D4AF37]" />
                </div>

                <h3 className="mt-5 text-xl font-semibold text-white">{item.titulo}</h3>
                {item.descripcion && (
                  <p className="mt-3 text-sm leading-7 text-white/68 line-clamp-3">
                    {item.descripcion}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/62">
                  {item.tema_doctrinal && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {item.tema_doctrinal}
                    </span>
                  )}
                  {item.duracion_minutos && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {formatDuration(item.duracion_minutos)}
                    </span>
                  )}
                  {item.fecha_publicacion && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      <CalendarDays className="mr-1 inline h-3 w-3" />
                      {formatDate(item.fecha_publicacion)}
                    </span>
                  )}
                </div>

                <div className="mt-8">
                  <Link
                    href={`/podcast/${item.slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-5 py-3 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/20"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Escuchar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          !featuredEpisode && (
            <div className="rounded-[2rem] border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center backdrop-blur-2xl">
              <div className="inline-flex rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] p-4">
                <Mic2 className="h-8 w-8 text-[#D4AF37]/50" />
              </div>

              <h3 className="mt-5 text-xl font-semibold text-white/70">
                Próximamente
              </h3>
              <p className="mt-3 mx-auto max-w-md text-sm leading-7 text-white/50">
                Los episodios del podcast se publicarán pronto. Vuelve a esta sección
                para explorar las conversaciones doctrinales del proyecto.
              </p>
            </div>
          )
        )}
      </section>

      {/* Sección editorial */}
      <section
        aria-labelledby="podcast-editorial-title"
        className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16"
      >
        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
              <Radio className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <h2
              id="podcast-editorial-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Un tono íntimo y documental
            </h2>
          </div>

          <p className="mt-6 text-[15px] leading-8 text-white/72">
            Podcast no se presenta como una simple lista de audios. Su intención es crear una
            cámara editorial donde la voz tenga espacio, densidad y respiración. Cada episodio
            funciona como una puerta de entrada a la memoria del archivo, con una atmósfera visual
            preparada para acompañar escucha, reflexión y permanencia.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-[#D4AF37]/15 bg-[#D4AF37]/7 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#D4AF37]">
              Enfoque curatorial
            </p>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Cada episodio es cuidadosamente producido para mantener la cohesión temática y el rigor institucional que exige el resguardo de este legado patrimonial.
            </p>
          </div>
        </article>
      </section>

      {/* CTA final */}
      <section
        aria-labelledby="podcast-cta-title"
        className="mx-auto max-w-7xl px-6 pb-16 md:px-8 md:pb-24"
      >
        <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37]">
                Continuidad del recorrido
              </p>
              <h2
                id="podcast-cta-title"
                className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl"
              >
                Continúa hacia Blog o vuelve al archivo principal.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                Esta sección sostiene una narrativa editorial coherente con el resto
                del ecosistema de contenido del proyecto.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#e3bf4f]"
              >
                Ir a Blog
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                Abrir Archivo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
