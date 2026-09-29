// =========================================================
// Legado Patrimonial WSS — Fase 5.7 (Frente B)
// src/app/conferencia/[slug]/page.tsx
// Server Component: vista pública individual de conferencia
// =========================================================

import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import {
  getValidatedExactPassage,
  getValidatedSemanticPassage,
} from '@/lib/services/conferences'
import { createClient } from '@/lib/supabase/server'
import { ConferenciaDetalleClient } from './ConferenciaDetalleClient'
import type { ConferenciaPublica } from '@/types/database'

// ── Columnas editoriales expuestas por la vista pública ──
const SELECT_COLUMNS = `
  id,
  slug,
  titulo,
  extracto,
  descripcion,
  fecha_impartida,
  ponente_nombre,
  ponente_rol,
  audio_url,
  audio_duracion,
  pdf_url,
  video_provider,
  video_provider_id,
  video_status,
  video_fallback_provider,
  video_fallback_url
`

// ── Validación de slug ──
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

interface ConferenciaPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    q?: string | string[]
    search_mode?: string | string[]
    pasaje?: string | string[]
  }>
}

function readSingleSearchParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null
}

// ── Fetch con deduplicación explícita vía cache() de React ──
// Garantiza un solo roundtrip a Supabase aunque se invoque
// desde generateMetadata y desde el componente de página.
const getConferencia = cache(async function getConferencia(
  slug: string
): Promise<ConferenciaPublica | null> {
  if (!SLUG_REGEX.test(slug)) {
    return null
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conferencias_publicas')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return null
  }

  return data as ConferenciaPublica
})

// =========================================================
// SEO dinámico
// =========================================================

export async function generateMetadata({
  params,
}: ConferenciaPageProps): Promise<Metadata> {
  const { slug } = await params
  const conferencia = await getConferencia(slug)

  if (!conferencia) {
    return {
      title: 'Conferencia no encontrada — Legado Patrimonial, el Séptimo Sello',
    }
  }

  const description =
    conferencia.extracto ??
    conferencia.descripcion?.slice(0, 160) ??
    `Conferencia: ${conferencia.titulo}`

  return {
    title: `${conferencia.titulo} — Legado Patrimonial, el Séptimo Sello`,
    description,
    openGraph: {
      title: conferencia.titulo,
      description,
      type: 'article',
      publishedTime: conferencia.fecha_impartida ?? undefined,
      authors: conferencia.ponente_nombre
        ? [conferencia.ponente_nombre]
        : undefined,
    },
  }
}

// =========================================================
// Página
// =========================================================

export default async function ConferenciaPage({
  params,
  searchParams,
}: ConferenciaPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  const conferencia = await getConferencia(slug)

  if (!conferencia) {
    notFound()
  }

  const query = readSingleSearchParam(resolvedSearchParams.q)
  const searchMode = readSingleSearchParam(resolvedSearchParams.search_mode)
  const passageId = readSingleSearchParam(resolvedSearchParams.pasaje)

  const exactMatch =
    searchMode === 'exact' && query && passageId
      ? await getValidatedExactPassage({
          query,
          passageId,
          conferenceId: conferencia.id,
          conferenceDate: conferencia.fecha_impartida,
        })
      : null

  const semanticPassage =
    searchMode === 'semantic' && query && passageId
      ? await getValidatedSemanticPassage({
          query,
          passageId,
          conferenceId: conferencia.id,
        })
      : null

  return (
    <ConferenciaDetalleClient
      conferencia={conferencia}
      exactMatch={exactMatch ?? undefined}
      semanticPassage={semanticPassage ?? undefined}
    />
  )
}
