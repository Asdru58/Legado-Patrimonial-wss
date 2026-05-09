import Link from 'next/link'

export default function AdminConferenciasNotFound() {
  return (
    <div className="py-12">
      <div className="border border-dashed border-white/[0.08] rounded-sm py-16 px-8 text-center">
        <p className="font-[family-name:var(--font-cormorant)] text-xl font-light text-white/70 mb-2">
          Registro no encontrado
        </p>
        <p className="font-[family-name:var(--font-dm-sans)] text-sm text-white/50 mb-6">
          La conferencia que buscas no existe o fue eliminada.
        </p>
        <Link
          href="/admin/conferencias"
          className="
            inline-flex items-center gap-2 px-5 py-2.5 rounded-sm
            font-[family-name:var(--font-dm-sans)] text-sm font-medium tracking-wide
            text-[#D4AF37]/90 bg-[#D4AF37]/10 border border-[#D4AF37]/25
            transition-all duration-200 hover:bg-[#D4AF37]/[0.18]
          "
        >
          Volver al inventario
        </Link>
      </div>
    </div>
  )
}
