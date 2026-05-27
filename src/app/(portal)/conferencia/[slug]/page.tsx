// =========================================================
// Legado Patrimonial WSS — Fase 5.7 (Frente B)
// src/app/conferencia/[slug]/page.tsx
// Server Component: vista pública individual de conferencia
// =========================================================

import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConferenciaDetalleClient } from './ConferenciaDetalleClient'
import type { Conferencia } from '@/types/database'

// ── Columnas alineadas con el tipo Conferencia (excluye fts) ──
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
  video_checked_at,
  video_fallback_provider,
  video_fallback_url,
  created_at,
  updated_at
`

// ── Validación de slug ──
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

interface ConferenciaPageProps {
  params: Promise<{ slug: string }>
}

// ── Fetch con deduplicación explícita vía cache() de React ──
// Garantiza un solo roundtrip a Supabase aunque se invoque
// desde generateMetadata y desde el componente de página.
const getConferencia = cache(async function getConferencia(
  slug: string
): Promise<Conferencia | null> {
  if (!SLUG_REGEX.test(slug)) {
    return null
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conferencias')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return null
  }

  return data as Conferencia
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
      title: 'Conferencia no encontrada — Legado Patrimonial WSS',
    }
  }

  const description =
    conferencia.extracto ??
    conferencia.descripcion?.slice(0, 160) ??
    `Conferencia: ${conferencia.titulo}`

  return {
    title: `${conferencia.titulo} — Legado Patrimonial WSS`,
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
}: ConferenciaPageProps) {
  const { slug } = await params
  const conferencia = await getConferencia(slug)

  if (!conferencia) {
    notFound()
  }

  return <ConferenciaDetalleClient conferencia={conferencia} />
}
