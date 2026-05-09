// =========================================================
// Legado Patrimonial WSS — Fase 5.7
// src/app/admin/conferencias/[id]/editar/page.tsx
// Server Component: carga la conferencia y renderiza el form
// =========================================================

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditarConferenciaForm } from './editar-form'
import type { Conferencia } from '@/types/database'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('conferencias')
    .select('titulo')
    .eq('id', id)
    .maybeSingle()

  return {
    title: data
      ? `Editar: ${data.titulo} | Legado Patrimonial WSS`
      : 'Editar Conferencia | Legado Patrimonial WSS',
    description: 'Editar los datos de una conferencia existente.',
  }
}

export default async function EditarConferenciaPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: conferencia, error } = await supabase
    .from('conferencias')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !conferencia) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-10 text-center relative z-10">
        <h1 className="font-[family-name:var(--font-cinzel)] text-3xl md:text-5xl text-[#C8A843] mb-4">
          Editar Conferencia
        </h1>
        <p className="font-[family-name:var(--font-dm-sans)] text-white/60">
          Modifica los datos de la conferencia seleccionada.
        </p>
      </header>

      <div className="bg-[#0A0A0B] border border-white/[0.05] rounded-lg p-6 md:p-10 shadow-2xl relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C8A843]/[0.02] to-transparent pointer-events-none" />
        <EditarConferenciaForm conferencia={conferencia as Conferencia} />
      </div>
    </div>
  )
}
