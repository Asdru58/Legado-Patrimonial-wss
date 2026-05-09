// =========================================================
// Legado Patrimonial WSS — Sistema de Podcast
// src/app/admin/podcast/nuevo/crear-form.tsx
// Client Component: formulario de creación de episodio
// =========================================================

'use client'

import { useActionState, useState, useCallback } from 'react'
import { crearEpisodio, type CrearEpisodioState } from './actions'

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
  descripcion: 2000,
  tema_doctrinal: 200,
  texto_biblico_base: 500,
  participantes: 500,
  audio_url: 1000,
  video_url: 1000,
  conferencia_fuente: 500,
  extracto_referenciado: 2000,
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

export function CrearEpisodioForm() {
  const [state, formAction, isPending] = useActionState<CrearEpisodioState | null, FormData>(
    crearEpisodio,
    null
  )
  const [slugManual, setSlugManual] = useState(false)
  const [slug, setSlug] = useState('')

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

      {/* ── Información básica ── */}
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
            autoFocus
            maxLength={LIMITS.titulo}
            placeholder="Ej. La fe como fundamento del entendimiento"
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
              /podcast/
            </span>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              maxLength={LIMITS.slug}
              value={slug}
              onChange={handleSlugChange}
              placeholder="se-genera-desde-el-titulo"
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
              Volver a autogenerar desde el título
            </button>
          )}
          <FieldError message={state?.fieldErrors?.slug} />
        </div>

        <div>
          <label htmlFor="temporada" className={labelClass}>
            Temporada
          </label>
          <input
            id="temporada"
            name="temporada"
            type="number"
            min={1}
            defaultValue={1}
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.temporada} />
        </div>

        <div>
          <label htmlFor="numero_episodio" className={labelClass}>
            Número de episodio
          </label>
          <input
            id="numero_episodio"
            name="numero_episodio"
            type="number"
            min={1}
            placeholder="Ej. 1"
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.numero_episodio} />
        </div>

        <div>
          <label htmlFor="fecha_publicacion" className={labelClass}>
            Fecha de publicación
          </label>
          <input
            id="fecha_publicacion"
            name="fecha_publicacion"
            type="date"
            disabled={isPending}
            className={`${inputClass} [color-scheme:dark]`}
          />
          <FieldError message={state?.fieldErrors?.fecha_publicacion} />
        </div>

        <div>
          <label htmlFor="duracion_minutos" className={labelClass}>
            Duración (minutos)
          </label>
          <input
            id="duracion_minutos"
            name="duracion_minutos"
            type="number"
            min={1}
            placeholder="Ej. 45"
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.duracion_minutos} />
        </div>
      </div>

      {/* ── Contenido teológico ── */}
      <SectionLabel>Contenido teológico</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <label htmlFor="tema_doctrinal" className={labelClass}>
            Tema doctrinal
          </label>
          <input
            id="tema_doctrinal"
            name="tema_doctrinal"
            type="text"
            maxLength={LIMITS.tema_doctrinal}
            placeholder="Ej. Soteriología"
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.tema_doctrinal} />
        </div>

        <div>
          <label htmlFor="texto_biblico_base" className={labelClass}>
            Texto bíblico base
          </label>
          <input
            id="texto_biblico_base"
            name="texto_biblico_base"
            type="text"
            maxLength={LIMITS.texto_biblico_base}
            placeholder="Ej. Hebreos 11:1-6"
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.texto_biblico_base} />
        </div>

        <div>
          <label htmlFor="participantes" className={labelClass}>
            Participantes
          </label>
          <input
            id="participantes"
            name="participantes"
            type="text"
            maxLength={LIMITS.participantes}
            placeholder="Ej. Dr. William Soto Santiago"
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.participantes} />
        </div>

        <div>
          <label htmlFor="conferencia_fuente" className={labelClass}>
            Conferencia fuente
          </label>
          <input
            id="conferencia_fuente"
            name="conferencia_fuente"
            type="text"
            maxLength={LIMITS.conferencia_fuente}
            placeholder="Ej. Conferencia sobre la fe, 2025"
            disabled={isPending}
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.conferencia_fuente} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="descripcion" className={labelClass}>
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            maxLength={LIMITS.descripcion}
            placeholder="Breve descripción del episodio (aparece en tarjetas de vista previa)"
            disabled={isPending}
            className={textareaClass}
          />
          <FieldError message={state?.fieldErrors?.descripcion} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="extracto_referenciado" className={labelClass}>
            Extracto referenciado
          </label>
          <textarea
            id="extracto_referenciado"
            name="extracto_referenciado"
            maxLength={LIMITS.extracto_referenciado}
            placeholder="Cita o extracto de la conferencia fuente"
            disabled={isPending}
            className={textareaClass}
          />
          <FieldError message={state?.fieldErrors?.extracto_referenciado} />
        </div>
      </div>

      {/* ── Media ── */}
      <SectionLabel>Media (Audio / Video)</SectionLabel>
      <div className="grid grid-cols-1 gap-y-5">
        <div>
          <label htmlFor="audio_url" className={labelClass}>
            URL de Audio
          </label>
          <input
            id="audio_url"
            name="audio_url"
            type="url"
            maxLength={LIMITS.audio_url}
            placeholder="URL de Spotify o iVoox"
            disabled={isPending}
            className={inputClass}
          />
          <p className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs text-white/40">
            Proveedores autorizados: Spotify, iVoox. La URL será sanitizada automáticamente.
          </p>
          <FieldError message={state?.fieldErrors?.audio_url} />
        </div>

        <div>
          <label htmlFor="video_url" className={labelClass}>
            URL de Video
          </label>
          <input
            id="video_url"
            name="video_url"
            type="url"
            maxLength={LIMITS.video_url}
            placeholder="URL de YouTube o Vimeo"
            disabled={isPending}
            className={inputClass}
          />
          <p className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs text-white/40">
            Proveedores autorizados: YouTube, Vimeo. La URL será sanitizada automáticamente.
          </p>
          <FieldError message={state?.fieldErrors?.video_url} />
        </div>
      </div>

      {/* ── Opciones de publicación ── */}
      <SectionLabel>Opciones de publicación</SectionLabel>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="published"
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#C8A843] focus:ring-[#C8A843]/30"
          />
          <span className="font-[family-name:var(--font-dm-sans)] text-sm text-white/70">
            Publicar episodio
          </span>
        </label>

        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="destacado"
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
                Guardando
              </span>
            ) : (
              'Guardar episodio'
            )}
          </span>
        </button>
      </div>
    </form>
  )
}
