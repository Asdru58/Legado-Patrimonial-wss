'use client'

import { useActionState, useState, useCallback } from 'react'
import { crearConferencia, type CrearConferenciaState } from './actions'

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

const LIMITS = { titulo: 200, slug: 200, extracto: 500, descripcion: 10000, ponente_nombre: 150, ponente_rol: 150 } as const

const labelClass = "block font-[family-name:var(--font-dm-sans)] text-xs font-medium tracking-[0.15em] uppercase text-white/60 mb-2"
const inputClass = "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/90 placeholder:text-white/25 font-[family-name:var(--font-dm-sans)] text-sm outline-none transition-all duration-300 focus:border-[#C8A843]/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C8A843]/20 disabled:opacity-30 disabled:cursor-not-allowed"
const selectClass = "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/90 font-[family-name:var(--font-dm-sans)] text-sm outline-none transition-all duration-300 focus:border-[#C8A843]/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C8A843]/20 disabled:opacity-30 disabled:cursor-not-allowed [&>option]:bg-[#0A0A0B] [&>option]:text-white/90"
const textareaClass = "w-full px-4 py-3 min-h-[100px] resize-y bg-white/[0.03] border border-white/[0.08] rounded-sm text-white/90 placeholder:text-white/25 font-[family-name:var(--font-dm-sans)] text-sm outline-none transition-all duration-300 focus:border-[#C8A843]/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C8A843]/20"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs text-red-400/90">{message}</p>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-10 first:mt-0">
      <span className="block w-6 h-px bg-[#C8A843]/30" />
      <span className="font-[family-name:var(--font-dm-sans)] text-xs font-medium tracking-[0.25em] uppercase text-[#C8A843]/60">{children}</span>
      <span className="flex-1 h-px bg-white/[0.04]" />
    </div>
  )
}

export function CrearConferenciaForm() {
  const [state, formAction, isPending] = useActionState<CrearConferenciaState | null, FormData>(crearConferencia, null)
  const [slugManual, setSlugManual] = useState(false)
  const [slug, setSlug] = useState('')
  const [videoProvider, setVideoProvider] = useState('none')
  const [fallbackProvider, setFallbackProvider] = useState('')

  const handleTituloChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!slugManual) setSlug(slugify(e.target.value))
  }, [slugManual])

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManual(true)
    setSlug(e.target.value)
  }, [])

  const hasVideo = videoProvider !== 'none'

  return (
    <form action={formAction}>
      {state?.error && (
        <div role="alert" className="flex items-center gap-3 px-5 py-4 mb-8 border border-red-500/20 bg-red-500/[0.06] rounded-sm font-[family-name:var(--font-dm-sans)] text-sm text-red-300">
          <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          {state.error}
        </div>
      )}

      <SectionLabel>Información básica</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div className="md:col-span-2">
          <label htmlFor="titulo" className={labelClass}>Título *</label>
          <input id="titulo" name="titulo" type="text" required autoFocus maxLength={LIMITS.titulo} placeholder="Ej. El misterio de la satisfacción divina" onChange={handleTituloChange} disabled={isPending} className={inputClass} />
          <FieldError message={state?.fieldErrors?.titulo} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="slug" className={labelClass}>Slug *</label>
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-dm-sans)] text-sm text-white/30 shrink-0">/</span>
            <input id="slug" name="slug" type="text" required maxLength={LIMITS.slug} value={slug} onChange={handleSlugChange} placeholder="se-genera-desde-el-titulo" disabled={isPending} className={inputClass} />
          </div>
          {slugManual && <button type="button" onClick={() => setSlugManual(false)} className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs text-[#C8A843]/50 hover:text-[#C8A843]/80 transition-colors">Volver a autogenerar desde el título</button>}
          <FieldError message={state?.fieldErrors?.slug} />
        </div>
        <div>
          <label htmlFor="fecha_impartida" className={labelClass}>Fecha impartida *</label>
          <input id="fecha_impartida" name="fecha_impartida" type="date" required disabled={isPending} className={`${inputClass} [color-scheme:dark]`} />
          <FieldError message={state?.fieldErrors?.fecha_impartida} />
        </div>
        <div>
          <label htmlFor="ponente_nombre" className={labelClass}>Ponente</label>
          <input id="ponente_nombre" name="ponente_nombre" type="text" maxLength={LIMITS.ponente_nombre} placeholder="Dr. William Soto Santiago" disabled={isPending} className={inputClass} />
          <FieldError message={state?.fieldErrors?.ponente_nombre} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="ponente_rol" className={labelClass}>Rol del ponente</label>
          <input id="ponente_rol" name="ponente_rol" type="text" maxLength={LIMITS.ponente_rol} placeholder="Ej. Embajador de la Paz" disabled={isPending} className={inputClass} />
          <FieldError message={state?.fieldErrors?.ponente_rol} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="extracto" className={labelClass}>Extracto</label>
          <textarea id="extracto" name="extracto" maxLength={LIMITS.extracto} placeholder="Breve resumen de la conferencia (aparece en tarjetas de vista previa)" disabled={isPending} className={textareaClass} />
          <FieldError message={state?.fieldErrors?.extracto} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="descripcion" className={labelClass}>Descripción completa</label>
          <textarea id="descripcion" name="descripcion" maxLength={LIMITS.descripcion} placeholder="Texto extendido con el contenido o sinopsis de la conferencia" disabled={isPending} className={`${textareaClass} min-h-[140px]`} />
          <FieldError message={state?.fieldErrors?.descripcion} />
        </div>
      </div>

      <SectionLabel>Configuración de video</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <label htmlFor="video_provider" className={labelClass}>Proveedor de video</label>
          <select id="video_provider" name="video_provider" value={videoProvider} onChange={(e) => { setVideoProvider(e.target.value); if (e.target.value === 'none') setFallbackProvider(''); }} disabled={isPending} className={selectClass}>
            <option value="none">Sin video</option>
            <option value="youtube">YouTube</option>
            <option value="r2">Cloudflare R2</option>
            <option value="s3">Amazon S3</option>
          </select>
          <FieldError message={state?.fieldErrors?.video_provider} />
        </div>
        <div>
          <label htmlFor="video_status" className={labelClass}>Estado del video</label>
          <select id="video_status" name="video_status" defaultValue="pending" disabled={isPending} className={selectClass}>
            <option value="pending">Pendiente</option>
            <option value="active">Activo</option>
            <option value="processing">Procesando</option>
            <option value="unavailable">No disponible</option>
            <option value="disabled">Deshabilitado</option>
          </select>
          <FieldError message={state?.fieldErrors?.video_status} />
        </div>
        <div className={`md:col-span-2 ${!hasVideo ? 'hidden' : ''}`}>
          <label htmlFor="video_provider_id" className={labelClass}>ID del proveedor *</label>
          <input id="video_provider_id" name="video_provider_id" type="text" placeholder={videoProvider === 'youtube' ? 'Ej. dQw4w9WgXcQ' : 'Ej. videos/conferencia-001.mp4'} disabled={isPending || !hasVideo} className={inputClass} />
          <p className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs text-white/40">{videoProvider === 'youtube' ? 'El ID del video de YouTube (lo que aparece después de v= en la URL).' : videoProvider === 'r2' || videoProvider === 's3' ? 'La ruta o key del archivo en el bucket.' : ''}</p>
          <FieldError message={state?.fieldErrors?.video_provider_id} />
        </div>
      </div>

      {hasVideo && (
        <>
          <SectionLabel>Fallback de video (opcional)</SectionLabel>
          <p className="font-[family-name:var(--font-dm-sans)] text-sm text-white/50 mb-5">Fuente alternativa en caso de que el proveedor primario falle. Si llenas uno de estos campos, ambos son obligatorios.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <label htmlFor="video_fallback_provider" className={labelClass}>Proveedor fallback</label>
              <select id="video_fallback_provider" name="video_fallback_provider" value={fallbackProvider} onChange={(e) => setFallbackProvider(e.target.value)} disabled={isPending} className={selectClass}>
                <option value="">Ninguno</option>
                <option value="r2">Cloudflare R2</option>
                <option value="s3">Amazon S3</option>
              </select>
              <FieldError message={state?.fieldErrors?.video_fallback_provider} />
            </div>
            <div>
              <label htmlFor="video_fallback_url" className={labelClass}>URL fallback</label>
              <input id="video_fallback_url" name="video_fallback_url" type="url" placeholder="https://cdn.ejemplo.com/video-fallback.mp4" disabled={isPending || !fallbackProvider} className={inputClass} />
              <FieldError message={state?.fieldErrors?.video_fallback_url} />
            </div>
          </div>
        </>
      )}

      <div className="mt-10 pt-6 border-t border-white/[0.06] flex justify-end">
        <button type="submit" disabled={isPending} className="relative inline-flex items-center gap-2 px-8 py-3 bg-[#C8A843]/10 border border-[#C8A843]/25 rounded-sm overflow-hidden group font-[family-name:var(--font-dm-sans)] text-sm font-medium tracking-[0.15em] uppercase text-[#C8A843]/90 transition-all duration-500 hover:bg-[#C8A843]/[0.18] hover:border-[#C8A843]/40 hover:text-[#C8A843] disabled:opacity-40 disabled:cursor-not-allowed">
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#C8A843]/[0.07] to-transparent group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
          <span className="relative z-10">{isPending ? <span className="inline-flex items-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Guardando</span> : 'Guardar conferencia'}</span>
        </button>
      </div>
    </form>
  )
}
