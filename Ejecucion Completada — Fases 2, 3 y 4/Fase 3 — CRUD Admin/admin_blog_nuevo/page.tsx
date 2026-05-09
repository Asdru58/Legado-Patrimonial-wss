// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/app/admin/blog/nuevo/page.tsx
// Server Component: página de creación de artículo
// =========================================================

import { Metadata } from 'next'
import { CrearArticuloForm } from './crear-form'

export const metadata: Metadata = {
  title: 'Nuevo Artículo | Legado Patrimonial WSS',
  description: 'Crear un nuevo artículo en el blog.',
}

export default function NuevoArticuloPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-10 text-center relative z-10">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl md:text-5xl text-[#C8A843] mb-4">
          Nuevo Artículo
        </h1>
        <p className="font-[family-name:var(--font-dm-sans)] text-white/60">
          Añade una nueva entrada al blog editorial.
        </p>
      </header>

      <div className="bg-[#0A0A0B] border border-white/[0.05] rounded-lg p-6 md:p-10 shadow-2xl relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C8A843]/[0.02] to-transparent pointer-events-none" />
        <CrearArticuloForm />
      </div>
    </div>
  )
}
