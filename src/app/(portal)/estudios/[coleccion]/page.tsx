// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// src/app/estudios/[coleccion]/page.tsx
// Server Component: detalle de colección (vista pública)
// =========================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getColeccionBySlug } from '@/lib/services/colecciones'
import { ArrowLeft, ArrowRight, BookOpen, Layers3, Tag } from 'lucide-react'

// ── Metadata dinámica ──

interface PageProps {
  params: Promise<{ coleccion: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { coleccion } = await params
  const col = await getColeccionBySlug(coleccion)

  if (!col) {
    return {
      title: 'Colección no encontrada | Legado Patrimonial WSS',
    }
  }

  return {
    title: `${col.titulo} | Estudios — Legado Patrimonial WSS`,
    description: col.descripcion ?? `Explora la colección "${col.titulo}" en Legado Patrimonial WSS.`,
  }
}

// ── Página ──

export default async function ColeccionPage({ params }: PageProps) {
  const { coleccion } = await params
  const col = await getColeccionBySlug(coleccion)

  if (!col) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Breadcrumbs */}
      <div className="mx-auto max-w-5xl px-6 pt-8 md:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-white/50"
        >
          <Link href="/estudios" className="transition hover:text-[#D4AF37]">
            Estudios
          </Link>
          <span className="text-white/25">/</span>
          <span className="truncate text-white/70">{col.titulo}</span>
        </nav>
      </div>

      {/* Hero de la colección */}
      <header className="relative overflow-hidden border-b border-[#D4AF37]/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_40%)]" />

        <div className="relative mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
          {col.categoria && (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              <Tag className="h-3 w-3" />
              {col.categoria}
            </span>
          )}

          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
            {col.titulo}
          </h1>

          {col.descripcion && (
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/65 md:text-lg">
              {col.descripcion}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
            {col.destacada && (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-[#E7C96C]">
                Destacada
              </span>
            )}
          </div>

          {col.extracto && (
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/55 italic">
              {col.extracto}
            </p>
          )}
        </div>
      </header>

      {/* Placeholder: Conferencias relacionadas */}
      <section className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Conferencias relacionadas
          </h2>
        </div>

        {/* ── Placeholder visual — SIN queries a la tabla conferencias ── */}
        <div className="rounded-[2rem] border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center backdrop-blur-2xl">
          <div className="inline-flex rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] p-4">
            <BookOpen className="h-8 w-8 text-[#D4AF37]/50" />
          </div>

          <h3 className="mt-5 text-xl font-semibold text-white/70">
            Próximamente
          </h3>
          <p className="mt-3 mx-auto max-w-md text-sm leading-7 text-white/50">
            Las conferencias asociadas a esta colección se vincularán aquí cuando
            se complete la integración entre colecciones y el archivo de conferencias.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs text-white/40">
            <Layers3 className="h-3.5 w-3.5" />
            Sección en desarrollo
          </div>
        </div>
      </section>

      {/* CTA de retorno */}
      <footer className="mx-auto max-w-5xl px-6 pb-16 md:px-8 md:pb-24">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/estudios"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#F5E7B5] backdrop-blur-2xl transition hover:border-[#D4AF37]/35 hover:bg-white/8 hover:text-[#D4AF37]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Estudios
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
