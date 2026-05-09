"use client";

import { HeroSection, DashboardGrid, ConferenceCard } from "@/components/ui";
import { useConferencias } from "@/hooks/useConferencias";
import { usePlayerStore } from "@/store/playerStore";

export default function Home() {
  const { conferencias, loading, error } = useConferencias();
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return (
    <main className="min-h-screen" style={{ background: "var(--color-bg-primary)" }}>
      <HeroSection />

      {/* Dashboard Grid — Category Cards */}
      <DashboardGrid />

      {/* Catalog Section — Live from Supabase */}
      <section
        id="catalogo"
        className="mx-auto max-w-7xl px-6 py-16"
        style={{ paddingBottom: currentTrack ? "calc(var(--player-height) + 2rem)" : "4rem" }}
      >
        {/* Section Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2
              className="text-2xl font-bold tracking-tight md:text-3xl"
              style={{ color: "var(--color-text-primary)" }}
            >
              Catálogo Reciente
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Explora las últimas conferencias añadidas al archivo
            </p>
          </div>
          <span
            className="hidden text-sm font-medium md:block"
            style={{ color: "var(--color-text-muted)" }}
          >
            {!loading && `${conferencias.length} conferencia${conferencias.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass-card h-64 animate-pulse"
                style={{ opacity: 1 - i * 0.1 }}
              >
                <div className="h-1 w-full" style={{ background: "rgba(226,184,87,0.1)" }} />
                <div className="flex flex-col gap-4 p-5">
                  <div className="h-5 w-3/4 rounded" style={{ background: "var(--color-bg-tertiary)" }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: "var(--color-bg-tertiary)" }} />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full" style={{ background: "var(--color-bg-tertiary)" }} />
                    <div className="h-6 w-14 rounded-full" style={{ background: "var(--color-bg-tertiary)" }} />
                  </div>
                  <div className="mt-auto h-10 rounded-xl" style={{ background: "var(--color-bg-tertiary)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card mx-auto max-w-md p-8 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-gold)" }}>
              Error de conexión
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {error}
            </p>
          </div>
        )}

        {/* Conference Grid */}
        {!loading && !error && conferencias.length > 0 && (
          <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {conferencias.map((conf, i) => (
              <ConferenceCard key={conf.id} conferencia={conf} index={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && conferencias.length === 0 && (
          <div className="glass-card mx-auto max-w-md p-8 text-center">
            <div className="mb-4 text-4xl">📭</div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Aún no hay conferencias
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Las conferencias aparecerán aquí una vez que se inyecten datos en Supabase.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-8 text-center text-xs"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text-muted)",
          paddingBottom: currentTrack ? "calc(var(--player-height) + 2rem)" : "2rem",
        }}
      >
        © {new Date().getFullYear()} Legado Patrimonial WSS · Preservando el legado espiritual
      </footer>
    </main>
  );
}
