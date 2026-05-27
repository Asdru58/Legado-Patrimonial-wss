// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// src/app/estudios/page.tsx
// Server Component: hub de colecciones temáticas
//
// Refactorizado: consume datos reales de Supabase vía
// la capa de servicio colecciones.ts.
// Estructura visual original preservada 1:1.
// =========================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  BookMarked,
  FileText,
  Layers3,
  Library,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { getAllColecciones, type Coleccion } from "@/lib/services/colecciones";

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Estudios | Legado Patrimonial WSS",
  description:
    "Colecciones temáticas de estudios y series doctrinales organizadas para exploración clara, sobria y escalable dentro de Legado Patrimonial WSS.",
};

type HighlightStat = {
  label: string;
  value: string;
  detail: string;
};

type Guideline = {
  title: string;
  description: string;
};

const GUIDELINES: Guideline[] = [
  {
    title: "Exploración temática",
    description:
      "El hub agrupa series completas para facilitar continuidad de estudio y contexto doctrinal.",
  },
  {
    title: "Escalabilidad visual",
    description:
      "La estructura admite crecimiento sin romper el layout ni exigir definición inmediata de backend.",
  },
  {
    title: "Preparado para detalle",
    description:
      "Cada colección puede conectar luego con `/estudios/[coleccion]` sin rehacer esta portada.",
  },
];

function buildStats(colecciones: Coleccion[]): HighlightStat[] {
  const categorias = new Set(
    colecciones.map((c) => c.categoria).filter(Boolean)
  );
  const categoriasLabel =
    categorias.size > 0
      ? Array.from(categorias).slice(0, 3).join(" + ")
      : "—";

  const destacadas = colecciones.filter((c) => c.destacada).length;

  return [
    {
      label: "Colecciones activas",
      value: String(colecciones.length).padStart(2, "0"),
      detail: "Listas para navegación temática",
    },
    {
      label: "Destacadas",
      value: String(destacadas).padStart(2, "0"),
      detail: "Colecciones marcadas con prioridad editorial",
    },
    {
      label: "Cobertura",
      value: categoriasLabel,
      detail: "Organización pensada para expansión futura",
    },
  ];
}

export default async function EstudiosPage() {
  const colecciones = await getAllColecciones();

  const featuredCollections = colecciones.filter((c) => c.destacada);
  const regularCollections = colecciones.filter((c) => !c.destacada);
  const stats = buildStats(colecciones);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section
        aria-labelledby="estudios-hero-title"
        className="relative overflow-hidden border-b border-[#D4AF37]/15"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-8 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#E7C96C] backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              Estudios Temáticos
            </div>

            <h1
              id="estudios-hero-title"
              className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl"
            >
              Un hub doctrinal para recorrer colecciones, series y líneas de estudio con orden.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              Esta sección reúne colecciones temáticas para consulta estructurada. El objetivo es
              ofrecer una navegación clara entre series doctrinales y proféticas sin bloquear el
              desarrollo visual por la definición final de la base de datos.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#destacadas"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#111111] shadow-[0_12px_40px_rgba(212,175,55,0.24)] transition hover:bg-[#e3bf4f]"
              >
                Explorar colecciones
                <ArrowDown className="h-4 w-4" />
              </Link>

              <Link
                href="/el-legado"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-white/5 px-6 py-4 text-sm font-semibold text-[#F5E7B5] backdrop-blur-xl transition hover:border-[#D4AF37]/45 hover:bg-white/8"
              >
                Volver a El Legado
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                {stats.map((stat) => (
                  <article
                    key={stat.label}
                    className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 sm:last:col-span-2"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#E7C96C]">
                      {stat.label}
                    </p>
                    <p className="mt-4 text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-2 text-sm leading-7 text-white/65">{stat.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Colecciones destacadas ── */}
      {featuredCollections.length > 0 && (
        <section
          id="destacadas"
          aria-labelledby="estudios-featured-title"
          className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16 scroll-mt-20"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2
              id="estudios-featured-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Colecciones destacadas
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {featuredCollections.map((collection) => (
              <article
                key={collection.slug}
                className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                    <BookMarked className="h-6 w-6 text-[#D4AF37]" />
                  </div>

                  <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#E7C96C]">
                    Destacada
                  </span>
                </div>

                <h3 className="mt-5 text-2xl font-semibold text-white">{collection.titulo}</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{collection.descripcion}</p>

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/62">
                  {collection.categoria && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {collection.categoria}
                    </span>
                  )}
                  {collection.extracto && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 max-w-xs truncate">
                      {collection.extracto}
                    </span>
                  )}
                </div>

                <div className="mt-8">
                  <Link
                    href={`/estudios/${collection.slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-black/20 px-5 py-3 text-sm font-semibold text-[#F5E7B5] transition hover:border-[#D4AF37]/45 hover:bg-black/30"
                  >
                    Ver colección
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Todas las colecciones (no destacadas) ── */}
      {regularCollections.length > 0 && (
        <section
          aria-labelledby="estudios-grid-title"
          className="mx-auto max-w-7xl px-6 py-4 md:px-8"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2
              id="estudios-grid-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Todas las colecciones
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {regularCollections.map((collection) => (
              <article
                key={collection.slug}
                className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-2xl"
              >
                <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                  <Layers3 className="h-5 w-5 text-[#D4AF37]" />
                </div>

                <h3 className="mt-5 text-xl font-semibold text-white">{collection.titulo}</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{collection.descripcion}</p>

                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <dt className="text-white/52">Categoría</dt>
                    <dd className="font-medium text-white">{collection.categoria ?? '—'}</dd>
                  </div>

                  {collection.extracto && (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <dt className="text-white/52">Extracto</dt>
                      <dd className="font-medium text-white truncate max-w-[200px]">{collection.extracto}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-6">
                  <Link
                    href={`/estudios/${collection.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5E7B5] transition hover:text-[#D4AF37]"
                  >
                    Abrir detalle
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state por si no hay colecciones ── */}
      {colecciones.length === 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16 md:px-8">
          <div className="rounded-[2rem] border border-dashed border-white/[0.08] bg-white/[0.02] p-12 text-center">
            <Layers3 className="h-12 w-12 mx-auto text-white/15 mb-5" />
            <p className="text-xl font-semibold text-white/70 mb-2">
              Sin colecciones publicadas
            </p>
            <p className="text-sm text-white/50">
              Las colecciones aparecerán aquí cuando se publiquen desde el panel de administración.
            </p>
          </div>
        </section>
      )}

      {/* ── Criterio del hub + Principios ── */}
      <section
        aria-labelledby="estudios-guidelines-title"
        className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:px-8 md:py-16 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2
              id="estudios-guidelines-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Criterio del hub
            </h2>
          </div>

          <p className="mt-6 text-[15px] leading-8 text-white/72">
            La portada de Estudios prioriza claridad editorial y agrupación temática. Este nivel
            debe servir como entrada estable mientras se define el modelo real de colecciones,
            materiales relacionados y paginación.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-[#D4AF37]/15 bg-[#D4AF37]/7 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#E7C96C]">
              Datos en vivo
            </p>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Las colecciones se cargan dinámicamente desde Supabase. La gestión
              editorial se realiza desde el panel de administración.
            </p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
              <Library className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Principios de construcción
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            {GUIDELINES.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5"
              >
                <div className="flex items-start gap-3">
                  <ScrollText className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/68">{item.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      {/* ── CTA final ── */}
      <section
        aria-labelledby="estudios-cta-title"
        className="mx-auto max-w-7xl px-6 pb-16 md:px-8 md:pb-24"
      >
        <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#E7C96C]">
                Navegación siguiente
              </p>
              <h2
                id="estudios-cta-title"
                className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl"
              >
                Continúa tu recorrido doctrinal por el archivo y las demás secciones editoriales.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                Desde aquí puedes volver al archivo principal o explorar las demás secciones
                del ecosistema editorial de Legado Patrimonial.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">


              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                Abrir Archivo
              </Link>

              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                <FileText className="h-4 w-4" />
                Ver Blog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
