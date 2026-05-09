// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/app/admin/blog/[id]/editar/page.tsx
// Server Component: carga el artículo y renderiza el form
// =========================================================

import { notFound } from 'next/navigation'
import { getBlogPostById } from '@/lib/services/blog'
import { EditarArticuloForm } from './editar-form'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const articulo = await getBlogPostById(id)

  return {
    title: articulo
      ? `Editar: ${articulo.titulo} | Legado Patrimonial WSS`
      : 'Editar Artículo | Legado Patrimonial WSS',
    description: 'Editar los datos de un artículo existente.',
  }
}

export default async function EditarArticuloPage({ params }: PageProps) {
  const { id } = await params
  const articulo = await getBlogPostById(id)

  if (!articulo) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-10 text-center relative z-10">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl md:text-5xl text-[#C8A843] mb-4">
          Editar Artículo
        </h1>
        <p className="font-[family-name:var(--font-dm-sans)] text-white/60">
          Modifica los datos del artículo seleccionado.
        </p>
      </header>

      <div className="bg-[#0A0A0B] border border-white/[0.05] rounded-lg p-6 md:p-10 shadow-2xl relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C8A843]/[0.02] to-transparent pointer-events-none" />
        <EditarArticuloForm articulo={articulo} />
      </div>
    </div>
  )
}
