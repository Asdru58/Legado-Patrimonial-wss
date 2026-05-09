// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// src/app/admin/blog/[id]/editar/editar-form.tsx
// Client Component: formulario de edición de artículo
// =========================================================

'use client'

import { useActionState, useState, useCallback } from 'react'
import { editarArticulo, type EditarArticuloState } from './actions'
import type { BlogPost } from '@/lib/services/blog'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const LIMITS = {
  titulo: 300,
  slug: 300,
  extracto: 600,
  contenido: 50000,
  categoria: 100,
  autor: 200,
  tiempo_lectura: 50,
} as const

const labelClass =
  "block font-[family-name:var(--font-dm-sans)] text-xs font-medium tracking-[0.15em] uppercase text-white/60 mb-2"
const inputClass =
  "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/90 placeholder:text-white/25 font-[family-name:var(--font-dm-sans)] text-sm outline-none transition-all duration-300 focus:border-[#C8A843]/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C8A843]/20 disabled:opacity-30 disabled:cursor-not-allowed"
const textareaClass =
  "w-full px-4 py-3 min-h-[100px] resize-y bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/90 placeholder:text-white/25 font-[family-name:var(--font-dm-sans)] text-sm outline-none transition-all duration-300 focus:border-[#C8A843]/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C8A843]/20"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs text-red-400/90">
      {message}
    </p>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-10 first:mt-0">
      <span className="block w-6 h-px bg-[#C8A843]/30" />
      <span className="font-[family-name:var(--font-dm-sans)] text-xs font-medium tracking-[0.25em] uppercase text-[#C8A843]/60">
        {children}
      </span>
      <span className="flex-1 h-px bg-white/[0.04]" />
    </div>
  )
}

export function EditarArticuloForm({ articulo }: { articulo: BlogPost }) {
  const [state, formAction, isPending] = useActionState<EditarArticuloState | null, FormData>(
    editarArticulo,
    null
  )
  const [slugManual, setSlugManual] = useState(true) // En edición, el slug ya existe
  const [slug, setSlug] = useState(articulo.slug)

  const handleTituloChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!slugManual) setSlug(slugify(e.target.value))
    },
    [slugManual]
  )

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManual(true)
    setSlug(e.target.value)
  }, [])

  return (
    <form action={formAction}>
      {/* ID oculto */}
      <input type="hidden" name="id" value={articulo.id} />

      {/* Mensaje de éxito */}
      {state?.success && (
        <div
          className="flex items-center gap-3 px-5 py-4 mb-8 border border-emerald-500/20 bg-emerald-500/[0.06] rounded-sm font-[family-name:var(--font-dm-sans)] text-sm text-emerald-300"
        >
          <svg
            className="w-4 h-4 shrink-0 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          Artículo actualizado correctamente.
        </div>
      )}

      {/* Mensaje de error */}
      {state?.error && (
        <div
          role="alert"
          className="flex items-center gap-3 px-5 py-4 mb-8 border border-red-500/20 bg-red-500/[0.06] rounded-sm font-[family-name:var(--font-dm-sans)] text-sm text-red-300"
        >
          <svg
            className="w-4 h-4 shrink-0 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          {state.error}
        </div>
      )}

      <SectionLabel>Información básica</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div className="md:col-span-2">
          <label htmlFor="titulo" className={labelClass}>
            Título *
          </label>
          <input
            id="titulo"
            name="titulo"
            type="text"
            required
            maxLength={LIMITS.titulo}
            defaultValue={articulo.titulo}
            onChange={handleTituloChange}
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.titulo} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="slug" className={labelClass}>
            Slug *
          </label>
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-dm-sans)] text-sm text-white/30 shrink-0">
              /blog/
            </span>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              maxLength={LIMITS.slug}
              value={slug}
              onChange={handleSlugChange}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          {slugManual && (
            <button
              type="button"
              onClick={() => setSlugManual(false)}
              className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs text-[#C8A843]/50 hover:text-[#C8A843]/80 transition-colors"
            >
              Regenerar slug desde el título
            </button>
          )}
          <FieldError message={state?.fieldErrors?.slug} />
        </div>

        <div>
          <label htmlFor="categoria" className={labelClass}>
            Categoría
          </label>
          <input
            id="categoria"
            name="categoria"
            type="text"
            maxLength={LIMITS.categoria}
            defaultValue={articulo.categoria ?? ''}
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.categoria} />
        </div>

        <div>
          <label htmlFor="autor" className={labelClass}>
            Autor
          </label>
          <input
            id="autor"
            name="autor"
            type="text"
            maxLength={LIMITS.autor}
            defaultValue={articulo.autor ?? ''}
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.autor} />
        </div>

        <div>
          <label htmlFor="fecha_publicacion" className={labelClass}>
            Fecha de publicación
          </label>
          <input
            id="fecha_publicacion"
            name="fecha_publicacion"
            type="date"
            defaultValue={articulo.fecha_publicacion ?? ''}
            disabled={isPending}
            className={`${inputClass} [color-scheme:dark]`}
          />
          <FieldError message={state?.fieldErrors?.fecha_publicacion} />
        </div>

        <div>
          <label htmlFor="tiempo_lectura" className={labelClass}>
            Tiempo de lectura
          </label>
          <input
            id="tiempo_lectura"
            name="tiempo_lectura"
            type="text"
            maxLength={LIMITS.tiempo_lectura}
            defaultValue={articulo.tiempo_lectura ?? ''}
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.tiempo_lectura} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="extracto" className={labelClass}>
            Extracto
          </label>
          <textarea
            id="extracto"
            name="extracto"
            maxLength={LIMITS.extracto}
            defaultValue={articulo.extracto ?? ''}
            disabled={isPending}
            className={textareaClass}
          />
          <FieldError message={state?.fieldErrors?.extracto} />
        </div>
      </div>

      <SectionLabel>Contenido</SectionLabel>
      <div>
        <label htmlFor="contenido" className={labelClass}>
          Contenido (Markdown) *
        </label>
        <textarea
          id="contenido"
          name="contenido"
          required
          maxLength={LIMITS.contenido}
          defaultValue={articulo.contenido}
          disabled={isPending}
          className={`${textareaClass} min-h-[300px] font-mono text-xs leading-6`}
        />
        <p className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs text-white/40">
          Soporta: encabezados (#), negritas (**), itálicas (*), listas, citas (&gt;), código
          (`), enlaces [texto](url) y separadores (---).
        </p>
        <FieldError message={state?.fieldErrors?.contenido} />
      </div>

      <SectionLabel>Opciones de publicación</SectionLabel>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="published"
            defaultChecked={articulo.published}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#C8A843] focus:ring-[#C8A843]/30"
          />
          <span className="font-[family-name:var(--font-dm-sans)] text-sm text-white/70">
            Publicar artículo
          </span>
        </label>

        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="destacado"
            defaultChecked={articulo.destacado}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#C8A843] focus:ring-[#C8A843]/30"
          />
          <span className="font-[family-name:var(--font-dm-sans)] text-sm text-white/70">
            Marcar como destacado
          </span>
        </label>
      </div>

      <div className="mt-10 pt-6 border-t border-white/[0.06] flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="relative inline-flex items-center gap-2 px-8 py-3 bg-[#C8A843]/10 border border-[#C8A843]/25 rounded-sm overflow-hidden group font-[family-name:var(--font-dm-sans)] text-sm font-medium tracking-[0.15em] uppercase text-[#C8A843]/90 transition-all duration-500 hover:bg-[#C8A843]/[0.18] hover:border-[#C8A843]/40 hover:text-[#C8A843] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#C8A843]/[0.07] to-transparent group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
          <span className="relative z-10">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Actualizando
              </span>
            ) : (
              'Guardar cambios'
            )}
          </span>
        </button>
      </div>
    </form>
  )
}
