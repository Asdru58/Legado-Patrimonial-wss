// =========================================================
// Legado Patrimonial WSS — Sistema de Podcast
// src/app/podcast/[episodio]/not-found.tsx
// Página 404 para episodios no encontrados
// =========================================================

import Link from 'next/link'
import { ArrowLeft, FileQuestion } from 'lucide-react'

export default function EpisodioNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-center text-white">
      <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-4">
        <FileQuestion className="h-8 w-8 text-[#D4AF37]" />
      </div>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl">
        Episodio no encontrado
      </h1>

      <p className="mt-4 max-w-md text-base leading-7 text-white/60">
        El episodio que buscas no existe, fue retirado o aún no ha sido publicado.
        Regresa al podcast para explorar los episodios disponibles.
      </p>

      <Link
        href="/podcast"
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#e3bf4f]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al Podcast
      </Link>
    </main>
  )
}
