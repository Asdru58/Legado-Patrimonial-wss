export default function AdminConferenciasLoading() {
  return (
    <div className="flex items-center gap-3 py-12">
      <div
        className="w-5 h-5 rounded-full border-2 animate-spin"
        style={{
          borderColor: 'rgba(212, 175, 55, 0.15)',
          borderTopColor: '#D4AF37',
        }}
      />
      <p className="font-[family-name:var(--font-dm-sans)] text-sm text-white/50">
        Cargando conferencias...
      </p>
    </div>
  )
}
