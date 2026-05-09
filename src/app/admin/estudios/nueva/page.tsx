// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// src/app/admin/estudios/nueva/page.tsx
// Server Component: página de creación de colección
// =========================================================

import { Metadata } from 'next'
import { CrearColeccionForm } from './crear-form'

export const metadata: Metadata = {
  title: 'Nueva Colección | Legado Patrimonial WSS',
  description: 'Crear una nueva colección de estudios.',
}

export default function NuevaColeccionPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-10 text-center relative z-10">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl md:text-5xl text-[#C8A843] mb-4">
          Nueva Colección
        </h1>
        <p className="font-[family-name:var(--font-dm-sans)] text-white/60">
          Añade una nueva colección de estudios temáticos.
        </p>
      </header>

      <div className="bg-[#0A0A0B] border border-white/[0.05] rounded-lg p-6 md:p-10 shadow-2xl relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C8A843]/[0.02] to-transparent pointer-events-none" />
        <CrearColeccionForm />
      </div>
    </div>
  )
}
