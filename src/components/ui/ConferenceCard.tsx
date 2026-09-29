'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import type {
  ExactSearchContext,
  SemanticSearchContext,
} from '@/lib/services/conferences'
import type { ConferenciaPublica } from '@/types/database'
import { tieneAudio, tieneVideo, tienePdf } from '@/types/database'
import { usePlayerStore } from '@/store/playerStore'
import {
  EXACT_MATCH_ANCHOR_ID,
  ExactMatchEvidence,
} from '@/components/search/ExactMatchEvidence'
import {
  SEMANTIC_PASSAGE_ANCHOR_ID,
  SemanticPassageEvidence,
} from '@/components/search/SemanticPassageEvidence'

type ConferenceCardProps = {
  conferencia: ConferenciaPublica
  index?: number
  exactMatch?: {
    query: string
    context: ExactSearchContext
  }
  semanticMatch?: {
    query: string
    context: SemanticSearchContext
    /**
     * Escalón de afinidad dentro de esta misma búsqueda. Lo calcula la página
     * a partir del puesto en el ranking, no del valor de similitud, que no
     * tiene significado absoluto.
     */
    afinidad?: AfinidadNivel
  }
}

type AfinidadNivel = 'alta' | 'media' | 'baja'

const ETIQUETA_AFINIDAD: Readonly<Record<AfinidadNivel, string>> = {
  alta: 'Muy afín',
  media: 'Afín',
  baja: 'Relacionado',
}

/**
 * Se apoya en la misma paleta dorada de las demás píldoras y reserva el tono
 * más saturado para el escalón superior, de modo que la jerarquía se lea de un
 * vistazo sin introducir un color nuevo en la tarjeta.
 */
const ESTILO_AFINIDAD: Readonly<Record<AfinidadNivel, React.CSSProperties>> = {
  alta: {
    background: 'rgba(212, 175, 55, 0.18)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(212, 175, 55, 0.34)',
  },
  media: {
    background: 'rgba(212, 175, 55, 0.10)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(212, 175, 55, 0.18)',
  },
  baja: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid rgba(212, 175, 55, 0.14)',
  },
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha'

  const parsed = new Date(`${fecha}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return fecha
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

function buildConferenceDetailHref(
  slug: string,
  exactMatch: ConferenceCardProps['exactMatch'],
  semanticMatch: ConferenceCardProps['semanticMatch']
): string {
  const basePath = `/conferencia/${slug}`

  if (exactMatch) {
    const searchParams = new URLSearchParams({
      q: exactMatch.query,
      search_mode: 'exact',
      pasaje: exactMatch.context.pasajeId,
    })

    return `${basePath}?${searchParams.toString()}#${EXACT_MATCH_ANCHOR_ID}`
  }

  if (semanticMatch) {
    const searchParams = new URLSearchParams({
      q: semanticMatch.query,
      search_mode: 'semantic',
      pasaje: semanticMatch.context.pasajeId,
    })

    return `${basePath}?${searchParams.toString()}#${SEMANTIC_PASSAGE_ANCHOR_ID}`
  }

  return basePath
}

export function ConferenceCard({
  conferencia,
  index = 0,
  exactMatch,
  semanticMatch,
}: Readonly<ConferenceCardProps>) {
  const playTrack = usePlayerStore((state) => state.playTrack)

  const hasAudio = tieneAudio(conferencia)
  const hasVideo = tieneVideo(conferencia)
  const hasPdf = tienePdf(conferencia)
  const detailHref = buildConferenceDetailHref(
    conferencia.slug,
    exactMatch,
    semanticMatch
  )

  const handlePlay = useCallback(() => {
    if (!conferencia.audio_url) return

    playTrack({
      conferencia_id: conferencia.id,
      titulo: conferencia.titulo,
      url_audio: conferencia.audio_url,
    })
  }, [conferencia.id, conferencia.audio_url, conferencia.titulo, playTrack])

  return (
    <article
      className="glass-card group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        borderColor: 'var(--color-border)',
        background: 'rgba(255, 255, 255, 0.03)',
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(212, 175, 55, 0.10), transparent 45%)',
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: 'var(--color-gold)' }}
            >
              {formatFecha(conferencia.fecha_impartida)}
            </p>

            <Link
              href={detailHref}
              className="mt-2 block text-lg font-bold leading-snug transition-opacity hover:opacity-85"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {conferencia.titulo}
            </Link>

            {conferencia.ponente_nombre && (
              <p
                className="mt-2 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {conferencia.ponente_nombre}
              </p>
            )}
          </div>

          <Link
            href={detailHref}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5"
            style={{
              borderColor: 'rgba(212, 175, 55, 0.16)',
              background: 'rgba(212, 175, 55, 0.06)',
              color: 'var(--color-gold)',
            }}
            aria-label={`Abrir detalle de ${conferencia.titulo}`}
            title="Ver detalle"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>

        {exactMatch && conferencia.extracto && (
          <ExactMatchEvidence
            query={exactMatch.query}
            text={conferencia.extracto}
            paginaInicio={exactMatch.context.paginaInicio}
            paginaFin={exactMatch.context.paginaFin}
          />
        )}

        {semanticMatch && (
          <SemanticPassageEvidence
            text={semanticMatch.context.texto}
            paginaInicio={semanticMatch.context.paginaInicio}
            paginaFin={semanticMatch.context.paginaFin}
          />
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {semanticMatch?.afinidad && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={ESTILO_AFINIDAD[semanticMatch.afinidad]}
              title="Posición de este resultado dentro de esta búsqueda"
            >
              {ETIQUETA_AFINIDAD[semanticMatch.afinidad]}
            </span>
          )}

          {hasAudio && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: 'rgba(212, 175, 55, 0.12)',
                color: 'var(--color-gold)',
                border: '1px solid rgba(212, 175, 55, 0.18)',
              }}
            >
              Audio
            </span>
          )}

          {hasVideo && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                color: 'var(--color-text-secondary)',
                border: '1px solid rgba(212, 175, 55, 0.12)',
              }}
            >
              Video
            </span>
          )}

          {hasPdf && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                color: 'var(--color-text-secondary)',
                border: '1px solid rgba(212, 175, 55, 0.12)',
              }}
            >
              PDF
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handlePlay}
            disabled={!hasAudio}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all"
            style={{
              background: hasAudio
                ? 'var(--color-gold)'
                : 'rgba(255,255,255,0.04)',
              borderColor: hasAudio
                ? 'rgba(212, 175, 55, 0.45)'
                : 'rgba(255,255,255,0.08)',
              color: hasAudio ? '#0a0a14' : 'var(--color-text-muted)',
              cursor: hasAudio ? 'pointer' : 'not-allowed',
              boxShadow: hasAudio
                ? '0 10px 28px rgba(212, 175, 55, 0.18)'
                : 'none',
            }}
            aria-label={
              hasAudio
                ? `Reproducir ${conferencia.titulo}`
                : `Sin audio disponible para ${conferencia.titulo}`
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7-11-7Z" />
            </svg>
            <span>{hasAudio ? 'Reproducir' : 'Sin audio'}</span>
          </button>

          <Link
            href={detailHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium transition-all hover:-translate-y-0.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  )
}
