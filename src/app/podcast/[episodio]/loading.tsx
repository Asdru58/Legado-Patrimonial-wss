// =========================================================
// Legado Patrimonial WSS — Sistema de Podcast
// src/app/podcast/[episodio]/loading.tsx
// Skeleton de carga para el detalle del episodio
// =========================================================

export default function EpisodioLoading() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Breadcrumb skeleton */}
      <div className="mx-auto max-w-5xl px-6 pt-8 md:px-8">
        <div className="flex items-center gap-2">
          <div className="h-4 w-14 animate-pulse rounded bg-white/10" />
          <span className="text-white/25">/</span>
          <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
        </div>
      </div>

      {/* Hero skeleton */}
      <header className="border-b border-[#D4AF37]/10">
        <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
          <div className="flex gap-3">
            <div className="h-6 w-40 animate-pulse rounded-full bg-[#D4AF37]/10" />
            <div className="h-6 w-28 animate-pulse rounded-full bg-white/6" />
          </div>
          <div className="mt-5 h-10 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-10 w-1/2 animate-pulse rounded bg-white/10" />
          <div className="mt-5 h-5 w-full max-w-xl animate-pulse rounded bg-white/6" />
          <div className="mt-6 flex gap-4">
            <div className="h-5 w-36 animate-pulse rounded bg-white/6" />
            <div className="h-5 w-20 animate-pulse rounded bg-white/6" />
            <div className="h-5 w-32 animate-pulse rounded bg-white/6" />
          </div>
        </div>
      </header>

      {/* Player skeleton */}
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#D4AF37]/30" />
          <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
        </div>
        <div className="aspect-video w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
      </div>

      {/* Extracto skeleton */}
      <div className="mx-auto max-w-5xl px-6 pb-8 md:px-8">
        <div className="animate-pulse rounded-[2rem] border border-[#D4AF37]/10 bg-[#D4AF37]/[0.02] p-7">
          <div className="h-3 w-36 rounded bg-[#D4AF37]/15" />
          <div className="mt-4 h-4 w-full rounded bg-white/6" />
          <div className="mt-2 h-4 w-3/4 rounded bg-white/6" />
        </div>
      </div>
    </main>
  )
}
