'use client'

import { useState } from 'react'
import Link from 'next/link'

import { ExactPhraseHighlight, EXACT_MATCH_ANCHOR_ID } from './ExactMatchEvidence'
import type {
  ArchivoSearchConference,
  ExactSearchContext,
} from '@/lib/services/conferences'

/**
 * Árbol compacto de resultados de la búsqueda EXACTA.
 *
 * Solo para esa modalidad. La semántica sigue con sus tarjetas: allí no hay
 * frase literal que resaltar, la ventana centrada no tendría sobre qué
 * centrarse y el extracto largo es justamente lo que ayuda a decidir.
 *
 * Una fila por conferencia, colapsable, con sus coincidencias como filas hijas.
 * Cada cita lleva su página y su extracto con la frase resaltada.
 */

/**
 * Citas que se pintan de entrada dentro de una conferencia.
 *
 * Ninguna mención se pierde: las que pasan de este número siguen ahí, detrás de
 * un botón que las despliega. El motivo es de tamaño, no de criterio — una
 * consulta como «el» devuelve más de tres mil coincidencias repartidas en
 * cincuenta conferencias, y pintarlas todas de golpe deja la página inservible.
 */
const CITAS_VISIBLES = 8

/** A partir de aquí las conferencias arrancan plegadas, para poder ojear. */
const UMBRAL_PLEGADO = 120

function formatFecha(fecha: string | null): string {
  if (!fecha) return '——-——-——'
  return fecha
}

function formatPagina(inicio: number, fin: number): string {
  return inicio === fin ? `p. ${inicio}` : `p. ${inicio}–${fin}`
}

function etiquetaCitas(n: number): string {
  return n === 1 ? '1 cita' : `${n} citas`
}

type FilaProps = {
  conferencia: ArchivoSearchConference
  query: string
  plegadaPorDefecto: boolean
}

function FilaConferencia({ conferencia, query, plegadaPorDefecto }: Readonly<FilaProps>) {
  const [plegada, setPlegada] = useState(plegadaPorDefecto)
  const [verTodas, setVerTodas] = useState(false)

  const citas: ExactSearchContext[] =
    conferencia.exactMatches && conferencia.exactMatches.length > 0
      ? conferencia.exactMatches
      : conferencia.exactContext
        ? [conferencia.exactContext]
        : []

  const detalleHref = `/conferencia/${conferencia.slug}?q=${encodeURIComponent(
    query
  )}&modo=exacta#${EXACT_MATCH_ANCHOR_ID}`

  const mostradas = verTodas ? citas : citas.slice(0, CITAS_VISIBLES)
  const ocultas = citas.length - mostradas.length

  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* ---------- fila padre ---------- */}
      <div
        className="flex items-center gap-3 px-3 py-2 transition-colors md:px-4"
        style={{ background: 'rgba(255, 255, 255, 0.02)' }}
      >
        <button
          type="button"
          onClick={() => setPlegada((v) => !v)}
          aria-expanded={!plegada}
          aria-label={
            plegada
              ? `Mostrar las coincidencias de ${conferencia.titulo}`
              : `Ocultar las coincidencias de ${conferencia.titulo}`
          }
          className="shrink-0 rounded p-1 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400/60"
          style={{
            color: 'var(--color-text-muted)',
            transform: plegada ? 'rotate(-90deg)' : 'none',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>

        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-xs"
          style={{
            fontFamily: 'var(--font-mono)',
            background: 'rgba(212, 175, 55, 0.10)',
            color: 'var(--color-gold)',
            letterSpacing: '-0.02em',
          }}
        >
          {formatFecha(conferencia.fecha_impartida)}
        </span>

        <Link
          href={detalleHref}
          className="min-w-0 flex-1 truncate text-sm font-bold transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-text-primary)' }}
          title={conferencia.titulo}
        >
          {conferencia.titulo}
          {conferencia.ponente_nombre && (
            <span
              className="ml-2 font-normal"
              style={{ color: 'var(--color-text-muted)' }}
            >
              — {conferencia.ponente_nombre}
            </span>
          )}
        </Link>

        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold"
          style={{
            borderColor: 'var(--color-border)',
            background: 'rgba(212, 175, 55, 0.08)',
            color: 'var(--color-gold)',
          }}
        >
          {etiquetaCitas(citas.length)}
        </span>

        <Link
          href={detalleHref}
          className="hidden shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:opacity-80 sm:inline-flex"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Ver documento
        </Link>
      </div>

      {/* ---------- filas hijas ---------- */}
      {!plegada && (
        <div>
          {mostradas.map((cita) => (
            <div
              key={cita.pasajeId}
              className="flex items-start gap-3 border-t px-3 py-2 pl-8 md:px-4 md:pl-12"
              style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}
            >
              <Link
                href={`/conferencia/${conferencia.slug}?q=${encodeURIComponent(
                  query
                )}&modo=exacta&pasaje=${cita.pasajeId}#${EXACT_MATCH_ANCHOR_ID}`}
                className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold transition-colors hover:opacity-80"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(212, 175, 55, 0.10)',
                  color: 'var(--color-gold)',
                }}
              >
                {formatPagina(cita.paginaInicio, cita.paginaFin)}
              </Link>

              <p
                className="min-w-0 flex-1 text-sm leading-relaxed"
                style={{
                  color: 'var(--color-text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  lineClamp: 6,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }}
              >
                <ExactPhraseHighlight query={query} text={cita.texto ?? ''} />
              </p>
            </div>
          ))}

          {ocultas > 0 && (
            <div className="border-t px-3 py-2 pl-8 md:px-4 md:pl-12"
              style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}>
              <button
                type="button"
                onClick={() => setVerTodas(true)}
                className="text-xs font-medium underline-offset-2 hover:underline"
                style={{ color: 'var(--color-gold)' }}
              >
                Ver las otras {ocultas} {ocultas === 1 ? 'cita' : 'citas'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type ExactResultsTreeProps = {
  conferencias: ArchivoSearchConference[]
  query: string
}

export function ExactResultsTree({
  conferencias,
  query,
}: Readonly<ExactResultsTreeProps>) {
  const totalCitas = conferencias.reduce(
    (suma, c) => suma + (c.exactMatches?.length ?? (c.exactContext ? 1 : 0)),
    0
  )
  const plegadaPorDefecto = totalCitas > UMBRAL_PLEGADO

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-card)',
      }}
    >
      {conferencias.map((conferencia) => (
        <FilaConferencia
          key={conferencia.id}
          conferencia={conferencia}
          query={query}
          plegadaPorDefecto={plegadaPorDefecto}
        />
      ))}
    </div>
  )
}
