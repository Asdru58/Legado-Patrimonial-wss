// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/app/blog/page.tsx
// Portada del blog — Consume artículos desde Supabase
// =========================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  Feather,
  FileText,
  NotebookText,
  Sparkles,
} from "lucide-react";
import { getAllBlogPosts, getFeaturedBlogPost } from "@/lib/services/blog";

export const metadata: Metadata = {
  title: "Blog | Legado Patrimonial WSS",
  description:
    "Sala de lectura y actualizaciones de Legado Patrimonial WSS: artículos editoriales, crónicas del archivo y reflexiones doctrinales en una experiencia sobria, elegante e inmersiva.",
};

type BlogMetric = {
  label: string;
  value: string;
  detail: string;
};

type BlogColumn = {
  title: string;
  description: string;
};

const BLOG_METRICS: BlogMetric[] = [
  {
    label: "Artículos en curso",
    value: "~6",
    detail: "Piezas editoriales curadas para lectura sobria y continua",
  },
  {
    label: "Líneas de contenido",
    value: "~4",
    detail: "Actualizaciones, crónicas, ensayos y reflexión doctrinal",
  },
  {
    label: "Experiencia",
    value: "Lectura inmersiva",
    detail: "Diseñada para permanencia, ritmo sereno y jerarquía clara",
  },
];

const BLOG_COLUMNS: BlogColumn[] = [
  {
    title: "Actualizaciones del proyecto",
    description:
      "Textos que acompañan el crecimiento de la plataforma, sus hitos y la consolidación de su visión documental.",
  },
  {
    title: "Crónicas del archivo",
    description:
      "Piezas que observan el archivo desde dentro y traducen su atmósfera, su memoria y su pulso a lenguaje editorial.",
  },
  {
    title: "Reflexión doctrinal",
    description:
      "Artículos que conectan el legado patrimonial con una comprensión más profunda de su sentido espiritual e institucional.",
  },
];

function formatDateLabel(date: string | null): string {
  if (!date) return "Sin fecha";
  const d = new Date(date + "T00:00:00");
  const month = d.toLocaleDateString("es-ES", { month: "long" });
  const year = d.getFullYear();
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
}

export default async function BlogPage() {
  const [allPosts, featured] = await Promise.all([
    getAllBlogPosts(),
    getFeaturedBlogPost(),
  ]);

  // El artículo destacado es el returned por getFeaturedBlogPost,
  // o el primero de la lista si no hay ninguno marcado.
  const featuredArticle = featured ?? allPosts[0] ?? null;

  // Los artículos regulares excluyen el destacado
  const regularArticles = featuredArticle
    ? allPosts.filter((p) => p.id !== featuredArticle.id)
    : allPosts;

  const hasArticles = allPosts.length > 0;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section
        aria-labelledby="blog-hero-title"
        className="relative overflow-hidden border-b border-[#D4AF37]/15"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-8 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              Sala de Lectura
            </div>

            <h1
              id="blog-hero-title"
              className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl"
            >
              Un espacio para leer el pulso del archivo, sus avances y su memoria en voz escrita.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              Blog reúne textos editoriales, actualizaciones del proyecto y crónicas del archivo en
              una atmósfera de lectura serena. Aquí la plataforma se vuelve palabra reflexiva:
              noticia, ensayo y memoria al servicio de una experiencia más íntima y contemplativa.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#articulos"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#111111] shadow-[0_12px_40px_rgba(212,175,55,0.24)] transition hover:bg-[#e3bf4f]"
              >
                Explorar artículos
                <ArrowDown className="h-4 w-4" />
              </Link>

              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-white/5 px-6 py-4 text-sm font-semibold text-[#F5E7B5] backdrop-blur-xl transition hover:border-[#D4AF37]/45 hover:bg-white/8"
              >
                Volver al archivo
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                {BLOG_METRICS.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 sm:last:col-span-2"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">
                      {metric.label}
                    </p>
                    <p className="mt-4 text-2xl font-semibold text-white">{metric.value}</p>
                    <p className="mt-2 text-sm leading-7 text-white/65">{metric.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Artículo destacado */}
      {featuredArticle && (
        <section
          id="destacado"
          aria-labelledby="blog-destacado-title"
          className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16 scroll-mt-20"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2
              id="blog-destacado-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Artículo destacado
            </h2>
          </div>

          <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
                  <Feather className="h-3.5 w-3.5" />
                  Selección editorial
                </div>

                <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white">
                  {featuredArticle.titulo}
                </h3>

                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-white/72">
                  {featuredArticle.extracto}
                </p>

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/62">
                  {featuredArticle.categoria && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {featuredArticle.categoria}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                    {formatDateLabel(featuredArticle.fecha_publicacion)}
                  </span>
                  {featuredArticle.tiempo_lectura && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {featuredArticle.tiempo_lectura}
                    </span>
                  )}
                </div>

                <div className="mt-8">
                  <Link
                    href={`/blog/${featuredArticle.slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#e3bf4f]"
                  >
                    Leer artículo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
                <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                  <BookOpenText className="h-6 w-6 text-[#D4AF37]" />
                </div>

                <h4 className="mt-5 text-xl font-semibold text-white">
                  Lectura sobria, ritmo sereno
                </h4>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  La sala de lectura ha sido concebida para sostener textos con aire, jerarquía y
                  quietud. Cada artículo busca abrir un espacio de reflexión donde la actualización
                  del proyecto y la memoria del archivo puedan leerse con claridad y permanencia.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <CalendarDays className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-sm text-white/68">
                      Fechas editoriales presentadas con tono institucional
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <Clock3 className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-sm text-white/68">
                      Tiempos de lectura estimados para una navegación más amable
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Grilla de artículos */}
      <section
        id="articulos"
        aria-labelledby="blog-articulos-title"
        className="mx-auto max-w-7xl px-6 py-4 md:px-8 scroll-mt-20"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
          <h2
            id="blog-articulos-title"
            className="text-2xl font-semibold tracking-tight text-white"
          >
            Artículos
          </h2>
        </div>

        {!hasArticles && (
          <div className="rounded-[2rem] border border-dashed border-white/10 py-20 text-center">
            <NotebookText className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-4 text-base text-white/50">
              Aún no hay artículos publicados. Vuelve pronto.
            </p>
          </div>
        )}

        {regularArticles.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {regularArticles.map((article) => (
              <article
                key={article.slug}
                className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-2xl"
              >
                <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                  <NotebookText className="h-5 w-5 text-[#D4AF37]" />
                </div>

                <h3 className="mt-5 text-xl font-semibold leading-8 text-white">
                  {article.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/68">{article.extracto}</p>

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/62">
                  {article.categoria && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {article.categoria}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                    {formatDateLabel(article.fecha_publicacion)}
                  </span>
                  {article.tiempo_lectura && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {article.tiempo_lectura}
                    </span>
                  )}
                </div>

                <div className="mt-8">
                  <Link
                    href={`/blog/${article.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5E7B5] transition hover:text-[#D4AF37]"
                  >
                    Leer más
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Líneas editoriales + CTA */}
      <section
        aria-labelledby="blog-lineas-title"
        className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:px-8 md:py-16 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2
              id="blog-lineas-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Líneas editoriales
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            {BLOG_COLUMNS.map((column) => (
              <article
                key={column.title}
                className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5"
              >
                <h3 className="text-lg font-semibold text-white">{column.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/68">{column.description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
              <FileText className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Una escritura al servicio del legado
            </h2>
          </div>

          <p className="mt-6 text-[15px] leading-8 text-white/72">
            Blog nace como una extensión natural del archivo: un lugar donde el pensamiento se
            ordena, la memoria se interpreta y el avance del proyecto encuentra una voz editorial.
            La intención no es solo informar, sino acompañar al lector hacia una comprensión más
            profunda del sentido, la belleza y la continuidad de esta obra patrimonial.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-[#D4AF37]/15 bg-[#D4AF37]/7 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#D4AF37]">
              Sala de lectura
            </p>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Cada pieza está presentada con una tipografía amplia, un ritmo visual sereno y una
              jerarquía pensada para una lectura cómoda, elegante y atenta.
            </p>
          </div>
        </article>
      </section>

      <section
        aria-labelledby="blog-cta-title"
        className="mx-auto max-w-7xl px-6 pb-16 md:px-8 md:pb-24"
      >
        <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37]">
                Cierre de recorrido
              </p>
              <h2
                id="blog-cta-title"
                className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl"
              >
                El ecosistema editorial de la Fase 5.5 queda completo.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                Desde aquí, el lector puede regresar al archivo principal y continuar el recorrido
                entre conferencias, estudios, alabanza, podcast y lectura editorial.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#e3bf4f]"
              >
                Abrir Archivo
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/el-legado"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                Volver a El Legado
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
