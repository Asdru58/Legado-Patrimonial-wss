// =========================================================
// Legado Patrimonial WSS — Fase 5.7 (Frente B)
// src/app/conferencia/[slug]/ConferenciaDetalleClient.tsx
// Client Component: vista pública de detalle de conferencia
// Parches de auditoría: isSafeHttpsUrl para todas las URLs,
//   referrerPolicy + rel=0 en YouTube, fallback mejorado
// =========================================================

'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import type { Conferencia } from '@/types/database'
import { tieneAudio, tieneVideo, tienePdf } from '@/types/database'
import { usePlayerStore } from '@/store/playerStore'

interface ConferenciaDetalleClientProps {
  conferencia: Conferencia
}

// ── Helpers ──

function formatFecha(fecha: string | null): string {
  if (!fecha) return 'Fecha no registrada'

  const parsed = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return fecha

  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function isSafeHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

function buildYouTubeEmbedSrc(videoProviderId: string): string {
  const params = new URLSearchParams({ rel: '0' })
  return `https://www.youtube-nocookie.com/embed/${videoProviderId}?${params.toString()}`
}

function buildVideoSrc(conferencia: Conferencia): string | null {
  if (conferencia.video_provider === 'none' || !conferencia.video_provider_id) {
    return null
  }

  if (conferencia.video_provider === 'youtube') {
    return buildYouTubeEmbedSrc(conferencia.video_provider_id)
  }

  // R2 / S3: validar que sea HTTPS antes de renderizar
  return isSafeHttpsUrl(conferencia.video_provider_id)
    ? conferencia.video_provider_id
    : null
}

function buildFallbackSrc(conferencia: Conferencia): string | null {
  if (!conferencia.video_fallback_provider || !conferencia.video_fallback_url) {
    return null
  }

  return isSafeHttpsUrl(conferencia.video_fallback_url)
    ? conferencia.video_fallback_url
    : null
}

// ── Componente principal ──

export function ConferenciaDetalleClient({
  conferencia,
}: ConferenciaDetalleClientProps) {
  const playTrack = usePlayerStore((state) => state.playTrack)

  // URLs validadas contra esquema HTTPS antes de renderizar
  const hasAudio = tieneAudio(conferencia) && isSafeHttpsUrl(conferencia.audio_url)
  const hasPdf = tienePdf(conferencia) && isSafeHttpsUrl(conferencia.pdf_url)
  const hasVideo = tieneVideo(conferencia)

  const videoSrc = buildVideoSrc(conferencia)
  const fallbackSrc = buildFallbackSrc(conferencia)
  const isYouTube = conferencia.video_provider === 'youtube'

  const handlePlay = useCallback(() => {
    if (!isSafeHttpsUrl(conferencia.audio_url)) return

    playTrack({
      conferencia_id: conferencia.id,
      titulo: conferencia.titulo,
      url_audio: conferencia.audio_url,
    })
  }, [conferencia.id, conferencia.audio_url, conferencia.titulo, playTrack])

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-bg-primary, #050505)' }}
    >
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-20">
        {/* ── Volver al archivo ── */}
        <Link
          href="/archivo"
          className="inline-flex items-center gap-2 mb-8 text-sm transition-colors duration-200"
          style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Volver al archivo
        </Link>

        {/* ============================================
            ENCABEZADO
            ============================================ */}
        <header className="mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-[0.22em] mb-4"
            style={{ color: 'var(--color-gold, #D4AF37)' }}
          >
            {capitalizeFirst(formatFecha(conferencia.fecha_impartida))}
          </p>

          <h1
            className="text-3xl md:text-4xl font-light tracking-wide leading-tight"
            style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              color: 'var(--color-text-primary, rgba(255,255,255,0.95))',
            }}
          >
            {conferencia.titulo}
          </h1>

          {conferencia.ponente_nombre && (
            <div className="mt-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                style={{
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  color: 'var(--color-gold, #D4AF37)',
                }}
              >
                {conferencia.ponente_nombre
                  .split(' ')
                  .filter(
                    (_, i) =>
                      i === 0 ||
                      i === conferencia.ponente_nombre!.split(' ').length - 1
                  )
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}
                >
                  {conferencia.ponente_nombre}
                </p>
                {conferencia.ponente_rol && (
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}
                  >
                    {conferencia.ponente_rol}
                  </p>
                )}
              </div>
            </div>
          )}

          {conferencia.extracto && (
            <p
              className="mt-6 text-base leading-relaxed"
              style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.7))' }}
            >
              {conferencia.extracto}
            </p>
          )}
        </header>

        {/* ============================================
            ÁREA MULTIMEDIA: VIDEO
            ============================================ */}
        {hasVideo && (videoSrc || fallbackSrc) && (
          <section className="mb-8">
            <div
              className="rounded-lg overflow-hidden"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              {isYouTube && videoSrc ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={videoSrc}
                    title={conferencia.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 'none' }}
                  />
                </div>
              ) : (
                <video
                  controls
                  preload="metadata"
                  className="w-full"
                  style={{ maxHeight: '70vh' }}
                >
                  {videoSrc && <source src={videoSrc} type="video/mp4" />}
                  {fallbackSrc && <source src={fallbackSrc} type="video/mp4" />}
                  Tu navegador no soporta la reproducción de video.
                </video>
              )}
            </div>
          </section>
        )}

        {/* ============================================
            BARRA DE ACCIONES
            ============================================ */}
        {(hasAudio || hasPdf) && (
          <section
            className="flex flex-wrap items-center gap-3 mb-10 p-4 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {hasAudio && (
              <button
                type="button"
                onClick={handlePlay}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'var(--color-gold, #D4AF37)',
                  color: '#0a0a14',
                  boxShadow: '0 8px 24px rgba(212, 175, 55, 0.2)',
                }}
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
                Reproducir audio
              </button>
            )}

            {hasPdf && conferencia.pdf_url && (
              <a
                href={conferencia.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Leer documento PDF
              </a>
            )}

            {hasAudio && conferencia.audio_duracion && (
              <span
                className="text-xs ml-auto"
                style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.4))' }}
              >
                Duración: {Math.floor(conferencia.audio_duracion / 60)} min
              </span>
            )}
          </section>
        )}

        {/* ============================================
            DESCRIPCIÓN
            ============================================ */}
        {conferencia.descripcion && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span
                className="block w-8 h-px"
                style={{ background: 'rgba(212, 175, 55, 0.3)' }}
              />
              <span
                className="text-xs font-medium tracking-[0.25em] uppercase"
                style={{ color: 'rgba(212, 175, 55, 0.6)' }}
              >
                Descripción
              </span>
              <span
                className="flex-1 h-px"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            </div>

            <div
              className="rounded-lg p-6 md:p-8 text-base leading-[1.8] whitespace-pre-wrap"
              style={{
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--color-text-secondary, rgba(255,255,255,0.75))',
              }}
            >
              {conferencia.descripcion}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
