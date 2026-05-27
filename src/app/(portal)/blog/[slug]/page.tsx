// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/app/blog/[slug]/page.tsx
// Server Component: detalle de artículo publicado
// =========================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getBlogPostBySlug } from '@/lib/services/blog'
import { ArrowLeft, CalendarDays, Clock3, Tag, User } from 'lucide-react'

// ── Renderizado de Markdown conservador (sin dependencias) ──

/**
 * Convierte markdown básico a HTML seguro.
 * Soporta: headings, bold, italic, links, listas, párrafos,
 * blockquotes y code inline.
 * NO ejecuta HTML embebido (se escapan los tags).
 */
function renderMarkdownToHtml(markdown: string): string {
  // Escapar HTML para seguridad
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // Bloques de código (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="markdown-pre"><code>${code.trim()}</code></pre>`
  })

  // Blockquotes
  html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote class="markdown-bq">$1</blockquote>')
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote class="markdown-bq">/g, '\n')

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="markdown-h6">$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="markdown-h5">$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="markdown-h4">$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="markdown-h3">$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="markdown-h2">$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="markdown-h1">$1</h1>')

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="markdown-hr" />')

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="markdown-code">$1</code>')

  // Links — safe: only http/https
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="markdown-link">$1</a>'
  )

  // Unordered lists
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li class="markdown-li">$1</li>')
  html = html.replace(/((?:<li class="markdown-li">.*<\/li>\n?)+)/g, '<ul class="markdown-ul">$1</ul>')

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="markdown-oli">$1</li>')
  html = html.replace(/((?:<li class="markdown-oli">.*<\/li>\n?)+)/g, '<ol class="markdown-ol">$1</ol>')

  // Paragraphs: wrap remaining text lines
  const lines = html.split('\n')
  const result: string[] = []
  let inParagraph = false

  for (const line of lines) {
    const trimmed = line.trim()
    const isBlock = /^<(h[1-6]|ul|ol|li|blockquote|pre|hr|div)/.test(trimmed)
    const isClosingBlock = /^<\/(ul|ol|blockquote|pre)>/.test(trimmed)

    if (!trimmed) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      continue
    }

    if (isBlock || isClosingBlock) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      result.push(line)
    } else {
      if (!inParagraph) {
        result.push('<p class="markdown-p">')
        inParagraph = true
      }
      result.push(line)
    }
  }

  if (inParagraph) result.push('</p>')

  return result.join('\n')
}

// ── Helpers ──

function formatDate(date: string | null): string {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date + 'T00:00:00'))
}

// ── Metadata dinámica ──

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Artículo no encontrado | Legado Patrimonial WSS',
    }
  }

  return {
    title: `${post.titulo} | Blog — Legado Patrimonial WSS`,
    description: post.extracto ?? `Lee "${post.titulo}" en el blog de Legado Patrimonial WSS.`,
  }
}

// ── Página ──

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const contentHtml = renderMarkdownToHtml(post.contenido)

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Breadcrumbs */}
      <div className="mx-auto max-w-4xl px-6 pt-8 md:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-white/50"
        >
          <Link href="/blog" className="transition hover:text-[#D4AF37]">
            Blog
          </Link>
          <span className="text-white/25">/</span>
          <span className="truncate text-white/70">{post.titulo}</span>
        </nav>
      </div>

      {/* Hero del artículo */}
      <header className="relative overflow-hidden border-b border-[#D4AF37]/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_40%)]" />

        <div className="relative mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
          {post.categoria && (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              <Tag className="h-3 w-3" />
              {post.categoria}
            </span>
          )}

          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
            {post.titulo}
          </h1>

          {post.extracto && (
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/65 md:text-lg">
              {post.extracto}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
            {post.autor && (
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-[#D4AF37]/60" />
                {post.autor}
              </span>
            )}
            {post.fecha_publicacion && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#D4AF37]/60" />
                {formatDate(post.fecha_publicacion)}
              </span>
            )}
            {post.tiempo_lectura && (
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[#D4AF37]/60" />
                {post.tiempo_lectura}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenido del artículo */}
      <article className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>

      {/* CTA de retorno */}
      <footer className="mx-auto max-w-4xl px-6 pb-16 md:px-8 md:pb-24">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5E7B5] transition hover:text-[#D4AF37]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al blog
          </Link>
        </div>
      </footer>

      {/* Estilos del renderizado markdown */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .blog-content .markdown-h1 { font-size: 2rem; font-weight: 600; color: #fff; margin: 2rem 0 1rem; line-height: 1.3; }
            .blog-content .markdown-h2 { font-size: 1.6rem; font-weight: 600; color: #fff; margin: 1.8rem 0 0.8rem; line-height: 1.35; }
            .blog-content .markdown-h3 { font-size: 1.3rem; font-weight: 600; color: rgba(255,255,255,0.95); margin: 1.5rem 0 0.7rem; line-height: 1.4; }
            .blog-content .markdown-h4 { font-size: 1.1rem; font-weight: 600; color: rgba(255,255,255,0.90); margin: 1.2rem 0 0.6rem; }
            .blog-content .markdown-h5, .blog-content .markdown-h6 { font-size: 1rem; font-weight: 600; color: rgba(255,255,255,0.85); margin: 1rem 0 0.5rem; }
            .blog-content .markdown-p { color: rgba(255,255,255,0.72); font-size: 1.05rem; line-height: 1.9; margin-bottom: 1.2rem; }
            .blog-content .markdown-link { color: #D4AF37; text-decoration: underline; text-underline-offset: 3px; transition: color 0.2s; }
            .blog-content .markdown-link:hover { color: #e3bf4f; }
            .blog-content strong { color: rgba(255,255,255,0.90); font-weight: 600; }
            .blog-content em { font-style: italic; color: rgba(255,255,255,0.78); }
            .blog-content .markdown-ul, .blog-content .markdown-ol { padding-left: 1.5rem; margin-bottom: 1.2rem; }
            .blog-content .markdown-li, .blog-content .markdown-oli { color: rgba(255,255,255,0.72); font-size: 1.05rem; line-height: 1.8; margin-bottom: 0.4rem; }
            .blog-content .markdown-ul { list-style-type: disc; }
            .blog-content .markdown-ol { list-style-type: decimal; }
            .blog-content .markdown-bq { border-left: 3px solid rgba(212,175,55,0.4); padding: 0.8rem 1.2rem; margin: 1.2rem 0; color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.03); border-radius: 0 0.5rem 0.5rem 0; }
            .blog-content .markdown-code { background: rgba(255,255,255,0.08); padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.9em; color: rgba(212,175,55,0.85); }
            .blog-content .markdown-pre { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; padding: 1.2rem; margin: 1.2rem 0; overflow-x: auto; }
            .blog-content .markdown-pre code { background: none; padding: 0; color: rgba(255,255,255,0.75); font-family: monospace; font-size: 0.9rem; line-height: 1.7; }
            .blog-content .markdown-hr { border: none; border-top: 1px solid rgba(255,255,255,0.10); margin: 2rem 0; }
          `,
        }}
      />
    </main>
  )
}
