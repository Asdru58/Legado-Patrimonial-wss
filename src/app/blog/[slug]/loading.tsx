// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/app/blog/[slug]/loading.tsx
// Skeleton de carga para el detalle del artículo
// =========================================================

export default function BlogPostLoading() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Breadcrumb skeleton */}
      <div className="mx-auto max-w-4xl px-6 pt-8 md:px-8">
        <div className="flex items-center gap-2">
          <div className="h-4 w-10 animate-pulse rounded bg-white/10" />
          <span className="text-white/25">/</span>
          <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
        </div>
      </div>

      {/* Hero skeleton */}
      <header className="border-b border-[#D4AF37]/10">
        <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
          <div className="h-6 w-32 animate-pulse rounded-full bg-[#D4AF37]/10" />
          <div className="mt-5 h-10 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-10 w-1/2 animate-pulse rounded bg-white/10" />
          <div className="mt-5 h-5 w-full max-w-xl animate-pulse rounded bg-white/6" />
          <div className="mt-6 flex gap-4">
            <div className="h-5 w-36 animate-pulse rounded bg-white/6" />
            <div className="h-5 w-28 animate-pulse rounded bg-white/6" />
            <div className="h-5 w-24 animate-pulse rounded bg-white/6" />
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-12 md:px-8 md:py-16">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-5 animate-pulse rounded bg-white/6"
            style={{ width: `${85 - i * 5}%` }}
          />
        ))}
        <div className="h-12" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`b-${i}`}
            className="h-5 animate-pulse rounded bg-white/6"
            style={{ width: `${90 - i * 7}%` }}
          />
        ))}
      </div>
    </main>
  )
}
