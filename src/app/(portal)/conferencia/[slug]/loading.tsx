export default function ConferenciaLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary, #050505)' }}>
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(212, 175, 55, 0.15)', borderTopColor: 'var(--color-gold, #D4AF37)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.4))' }}>
          Cargando conferencia...
        </p>
      </div>
    </div>
  )
}
