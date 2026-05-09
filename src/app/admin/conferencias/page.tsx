// =========================================================
// Legado Patrimonial WSS — Fase 5.7
// src/app/admin/conferencias/page.tsx
// Server Component: inventario de conferencias (CRUD — Read)
// =========================================================

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Mapa visual de estados de video ──
const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  active:      { label: 'Activo',       dot: 'bg-emerald-400', text: 'text-emerald-300' },
  pending:     { label: 'Pendiente',    dot: 'bg-amber-400',   text: 'text-amber-300' },
  processing:  { label: 'Procesando',   dot: 'bg-sky-400',     text: 'text-sky-300' },
  unavailable: { label: 'No disponible', dot: 'bg-red-400',     text: 'text-red-300' },
  disabled:    { label: 'Deshabilitado', dot: 'bg-neutral-500', text: 'text-neutral-400' },
}

// ── Mapa de proveedores ──
const providerLabel: Record<string, string> = {
  youtube: 'YouTube',
  r2:      'Cloudflare R2',
  s3:      'Amazon S3',
  none:    'Sin video',
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default async function ConferenciasPage() {
  const supabase = await createClient()

  const { data: conferencias, error } = await supabase
    .from('conferencias')
    .select('id, titulo, slug, fecha_impartida, video_status, video_provider')
    .order('fecha_impartida', { ascending: false })

  const hasData = !error && conferencias && conferencias.length > 0

  return (
    <div>
      {/* ── Encabezado + botón de acción ── */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="block w-8 h-px bg-[#C8A843]/40" />
            <span
              className="
                font-[family-name:var(--font-dm-sans)]
                text-xs font-medium tracking-[0.25em] uppercase
                text-[#C8A843]/70
              "
            >
              Archivo
            </span>
          </div>
          <h1
            className="
              font-[family-name:var(--font-cormorant)]
              text-3xl font-light text-white/95 tracking-wide
            "
          >
            Conferencias
          </h1>
          <p
            className="
              font-[family-name:var(--font-dm-sans)]
              text-sm text-white/60 mt-1
            "
          >
            {hasData
              ? `${conferencias.length} registro${conferencias.length !== 1 ? 's' : ''} en el acervo.`
              : 'Gestión del catálogo patrimonial.'}
          </p>
        </div>

        <Link
          href="/admin/conferencias/nueva"
          className="
            inline-flex items-center gap-2 px-5 py-2.5
            bg-[#C8A843]/10 border border-[#C8A843]/25
            rounded-sm
            font-[family-name:var(--font-dm-sans)]
            text-sm font-medium tracking-[0.1em] uppercase
            text-[#C8A843]/90
            transition-all duration-300
            hover:bg-[#C8A843]/[0.18] hover:border-[#C8A843]/40
            hover:text-[#C8A843]
            shrink-0
          "
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva Conferencia
        </Link>
      </header>

      {/* ── Error de consulta ── */}
      {error && (
        <div
          role="alert"
          className="
            flex items-center gap-3 px-5 py-4
            border border-red-500/20 bg-red-500/[0.06] rounded-sm
            font-[family-name:var(--font-dm-sans)] text-sm text-red-300
          "
        >
          <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          Error al consultar la base de datos: {error.message}
        </div>
      )}

      {/* ── Empty State ── */}
      {!error && !hasData && (
        <div
          className="
            border border-dashed border-white/[0.08]
            rounded-sm py-20 px-8 text-center
          "
        >
          <svg
            className="w-12 h-12 mx-auto mb-5 text-white/15"
            fill="none" viewBox="0 0 24 24" strokeWidth={0.8} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          <p
            className="
              font-[family-name:var(--font-cormorant)]
              text-xl font-light text-white/70 mb-2
            "
          >
            El archivo está vacío
          </p>
          <p
            className="
              font-[family-name:var(--font-dm-sans)]
              text-sm text-white/50
            "
          >
            Aún no se han registrado conferencias. Comienza agregando la primera.
          </p>
        </div>
      )}

      {/* ── Tabla de inventario ── */}
      {hasData && (
        <div className="border border-white/[0.06] rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th
                    className="
                      text-left px-5 py-3.5
                      font-[family-name:var(--font-dm-sans)]
                      text-xs font-medium tracking-[0.15em] uppercase
                      text-white/50
                    "
                  >
                    Título
                  </th>
                  <th
                    className="
                      text-left px-5 py-3.5
                      font-[family-name:var(--font-dm-sans)]
                      text-xs font-medium tracking-[0.15em] uppercase
                      text-white/50
                    "
                  >
                    Fecha
                  </th>
                  <th
                    className="
                      text-left px-5 py-3.5
                      font-[family-name:var(--font-dm-sans)]
                      text-xs font-medium tracking-[0.15em] uppercase
                      text-white/50
                    "
                  >
                    Estado
                  </th>
                  <th
                    className="
                      text-left px-5 py-3.5
                      font-[family-name:var(--font-dm-sans)]
                      text-xs font-medium tracking-[0.15em] uppercase
                      text-white/50
                    "
                  >
                    Proveedor
                  </th>
                  <th className="px-5 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody>
                {conferencias.map((conf) => {
                  const status = statusConfig[conf.video_status] ?? statusConfig.pending
                  return (
                    <tr
                      key={conf.id}
                      className="
                        border-b border-white/[0.04] last:border-b-0
                        transition-colors duration-150
                        hover:bg-white/[0.02]
                      "
                    >
                      {/* Título */}
                      <td className="px-5 py-4 max-w-xs">
                        <p
                          className="
                            font-[family-name:var(--font-dm-sans)]
                            text-sm font-medium text-white/90
                            truncate
                          "
                        >
                          {conf.titulo}
                        </p>
                        <p
                          className="
                            font-[family-name:var(--font-dm-sans)]
                            text-xs text-white/40 mt-0.5
                            truncate
                          "
                        >
                          /{conf.slug}
                        </p>
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-4">
                        <span
                          className="
                            font-[family-name:var(--font-dm-sans)]
                            text-sm text-white/70
                          "
                        >
                          {formatDate(conf.fecha_impartida)}
                        </span>
                      </td>

                      {/* Estado del video */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          <span
                            className={`
                              font-[family-name:var(--font-dm-sans)]
                              text-sm ${status.text}
                            `}
                          >
                            {status.label}
                          </span>
                        </span>
                      </td>

                      {/* Proveedor */}
                      <td className="px-5 py-4">
                        <span
                          className="
                            font-[family-name:var(--font-dm-sans)]
                            text-sm text-white/60
                          "
                        >
                          {providerLabel[conf.video_provider] ?? conf.video_provider}
                        </span>
                      </td>

                      {/* Acción: editar */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/conferencias/${conf.id}/editar`}
                          className="
                            inline-flex items-center justify-center
                            w-8 h-8 rounded-sm
                            text-white/30 hover:text-[#C8A843]/80
                            hover:bg-[#C8A843]/[0.08]
                            transition-all duration-200
                          "
                          title="Editar conferencia"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
