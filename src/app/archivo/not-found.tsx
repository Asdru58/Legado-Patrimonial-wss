import Link from 'next/link'

export default function ArchivoNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--color-bg-primary, #050505)' }}>
      <div className="text-center max-w-md">
        <p className="text-6xl font-light mb-4" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(212, 175, 55, 0.2)' }}>404</p>
        <h2 className="text-xl font-light mb-2" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}>
          Página no encontrada
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>
          La ruta que buscas no existe dentro del archivo.
        </p>
        <Link href="/archivo" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.25)', color: 'var(--color-gold, #D4AF37)' }}>
          Ir al archivo
        </Link>
      </div>
    </div>
  )
}
