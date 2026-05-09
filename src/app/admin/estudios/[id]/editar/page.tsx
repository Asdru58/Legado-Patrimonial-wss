// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// src/app/admin/estudios/[id]/editar/page.tsx
// Server Component: carga la colección y renderiza el form
// =========================================================

import { notFound } from 'next/navigation'
import { getColeccionById } from '@/lib/services/colecciones'
import { EditarColeccionForm } from './editar-form'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const coleccion = await getColeccionById(id)

  return {
    title: coleccion
      ? `Editar: ${coleccion.titulo} | Legado Patrimonial WSS`
      : 'Editar Colección | Legado Patrimonial WSS',
    description: 'Editar los datos de una colección existente.',
  }
}

export default async function EditarColeccionPage({ params }: PageProps) {
  const { id } = await params
  const coleccion = await getColeccionById(id)

  if (!coleccion) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-10 text-center relative z-10">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl md:text-5xl text-[#C8A843] mb-4">
          Editar Colección
        </h1>
        <p className="font-[family-name:var(--font-dm-sans)] text-white/60">
          Modifica los datos de la colección seleccionada.
        </p>
      </header>

      <div className="bg-[#0A0A0B] border border-white/[0.05] rounded-lg p-6 md:p-10 shadow-2xl relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C8A843]/[0.02] to-transparent pointer-events-none" />
        <EditarColeccionForm coleccion={coleccion} />
      </div>
    </div>
  )
}
