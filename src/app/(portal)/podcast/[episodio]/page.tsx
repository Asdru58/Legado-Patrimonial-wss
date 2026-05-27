// =========================================================
// Legado Patrimonial WSS — Sistema de Podcast
// src/app/podcast/[episodio]/page.tsx
// Server Component: detalle de episodio publicado
// =========================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getEpisodioBySlug } from '@/lib/services/podcast'
import { sanitizeEmbedUrl, getEmbedIframeProps } from '@/lib/utils/embed'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Mic2,
  Music,
  Radio,
  Users,
  ExternalLink,
} from 'lucide-react'

// ── Helpers ──

function formatDate(date: string | null): string {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date + 'T00:00:00'))
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ── Metadata dinámica ──

interface PageProps {
  params: Promise<{ episodio: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { episodio } = await params
  const ep = await getEpisodioBySlug(episodio)

  if (!ep) {
    return {
      title: 'Episodio no encontrado | Legado Patrimonial WSS',
    }
  }

  return {
    title: `${ep.titulo} | Podcast — Legado Patrimonial WSS`,
    description:
      ep.descripcion ??
      ep.tema_doctrinal ??
      `Escucha "${ep.titulo}" en el podcast de Legado Patrimonial WSS.`,
  }
}

// ── Componente de reproductor embebido seguro ──

function EmbedPlayer({ url, titulo }: { url: string; titulo: string }) {
  const result = sanitizeEmbedUrl(url)

  if (!result.valid) {
    return null
  }

  const iframeProps = getEmbedIframeProps(result.provider)

  // Spotify tiene dimensiones diferentes (más bajo)
  const isAudioEmbed = result.provider === 'spotify' || result.provider === 'ivoox'

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 ${
        isAudioEmbed ? '' : 'aspect-video'
      }`}
    >
      <iframe
        src={result.embedUrl}
        title={`Reproductor: ${titulo}`}
        className={`w-full ${isAudioEmbed ? 'h-[160px]' : 'h-full'}`}
        {...iframeProps}
      />
    </div>
  )
}

// ── Página ──

export default async function EpisodioPage({ params }: PageProps) {
  const { episodio } = await params
  const ep = await getEpisodioBySlug(episodio)

  if (!ep) {
    notFound()
  }

  // Determinar qué embeds tenemos disponibles
  const videoEmbed = sanitizeEmbedUrl(ep.video_url)
  const audioEmbed = sanitizeEmbedUrl(ep.audio_url)

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Breadcrumbs */}
      <div className="mx-auto max-w-5xl px-6 pt-8 md:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-white/50"
        >
          <Link href="/podcast" className="transition hover:text-[#D4AF37]">
            Podcast
          </Link>
          <span className="text-white/25">/</span>
          <span className="truncate text-white/70">{ep.titulo}</span>
        </nav>
      </div>

      {/* Hero del episodio */}
      <header className="relative overflow-hidden border-b border-[#D4AF37]/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_40%)]" />

        <div className="relative mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
          {/* Badges de temporada y episodio */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              <Radio className="h-3 w-3" />
              Temporada {ep.temporada}
              {ep.numero_episodio != null && ` · Episodio ${ep.numero_episodio}`}
            </span>

            {ep.tema_doctrinal && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-white/60">
                <BookOpen className="h-3 w-3" />
                {ep.tema_doctrinal}
              </span>
            )}
          </div>

          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
            {ep.titulo}
          </h1>

          {ep.descripcion && (
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/65 md:text-lg">
              {ep.descripcion}
            </p>
          )}

          {/* Metadatos del episodio */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
            {ep.fecha_publicacion && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#D4AF37]/60" />
                {formatDate(ep.fecha_publicacion)}
              </span>
            )}
            {ep.duracion_minutos && (
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[#D4AF37]/60" />
                {formatDuration(ep.duracion_minutos)}
              </span>
            )}
            {ep.participantes && (
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-[#D4AF37]/60" />
                {ep.participantes}
              </span>
            )}
          </div>

          {/* Texto bíblico base */}
          {ep.texto_biblico_base && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] px-4 py-2 text-sm text-[#E7C96C]">
              <BookOpen className="h-4 w-4" />
              {ep.texto_biblico_base}
            </div>
          )}
        </div>
      </header>

      {/* Reproductor(es) embebido(s) */}
      <section className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
        {/* Video (si existe y es válido) */}
        {videoEmbed.valid && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Reproducir episodio
              </h2>
            </div>
            <EmbedPlayer url={ep.video_url!} titulo={ep.titulo} />
          </div>
        )}

        {/* Audio (si existe y es válido, como complemento o alternativa) */}
        {audioEmbed.valid && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
              <h2 className="text-xl font-semibold tracking-tight text-white">
                <span className="inline-flex items-center gap-2">
                  <Music className="h-5 w-5 text-[#D4AF37]" />
                  {videoEmbed.valid ? 'También disponible en audio' : 'Escuchar episodio'}
                </span>
              </h2>
            </div>
            <EmbedPlayer url={ep.audio_url!} titulo={ep.titulo} />
          </div>
        )}

        {/* Si no hay ningún embed válido */}
        {!videoEmbed.valid && !audioEmbed.valid && (
          <div className="rounded-[2rem] border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center backdrop-blur-2xl">
            <div className="inline-flex rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] p-4">
              <Mic2 className="h-8 w-8 text-[#D4AF37]/50" />
            </div>

            <h3 className="mt-5 text-xl font-semibold text-white/70">
              Reproductor no disponible
            </h3>
            <p className="mt-3 mx-auto max-w-md text-sm leading-7 text-white/50">
              Este episodio aún no tiene un enlace de reproducción configurado.
              Vuelve pronto para escucharlo.
            </p>
          </div>
        )}

        {/* Enlaces externos directos (si las URLs existen pero no son embebibles) */}
        {ep.video_url && !videoEmbed.valid && (
          <div className="mt-4">
            <a
              href={ep.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#F5E7B5] backdrop-blur-2xl transition hover:border-[#D4AF37]/35 hover:bg-white/8"
            >
              <ExternalLink className="h-4 w-4" />
              Ver video en plataforma externa
            </a>
          </div>
        )}
        {ep.audio_url && !audioEmbed.valid && (
          <div className="mt-4">
            <a
              href={ep.audio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#F5E7B5] backdrop-blur-2xl transition hover:border-[#D4AF37]/35 hover:bg-white/8"
            >
              <ExternalLink className="h-4 w-4" />
              Escuchar audio en plataforma externa
            </a>
          </div>
        )}
      </section>

      {/* Extracto referenciado */}
      {ep.extracto_referenciado && (
        <section className="mx-auto max-w-5xl px-6 pb-8 md:px-8">
          <div className="rounded-[2rem] border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] p-7 backdrop-blur-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#D4AF37]">
              Extracto referenciado
            </p>
            <p className="mt-3 text-[15px] leading-8 text-white/72">
              {ep.extracto_referenciado}
            </p>
          </div>
        </section>
      )}

      {/* Conferencia fuente */}
      {ep.conferencia_fuente && (
        <section className="mx-auto max-w-5xl px-6 pb-8 md:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 backdrop-blur-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#D4AF37]">
              Conferencia de referencia
            </p>
            <p className="mt-3 text-[15px] leading-8 text-white/72">
              {ep.conferencia_fuente}
            </p>
            <Link
              href="/archivo"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#F5E7B5] transition hover:text-[#D4AF37]"
            >
              Explorar en el Archivo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* CTA de retorno */}
      <footer className="mx-auto max-w-5xl px-6 pb-16 md:px-8 md:pb-24">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/podcast"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#F5E7B5] backdrop-blur-2xl transition hover:border-[#D4AF37]/35 hover:bg-white/8 hover:text-[#D4AF37]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Podcast
          </Link>
          <Link
            href="/archivo"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/70 backdrop-blur-2xl transition hover:border-[#D4AF37]/35 hover:bg-white/8"
          >
            Explorar Archivo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </main>
  )
}
