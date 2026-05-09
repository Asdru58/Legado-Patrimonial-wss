// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// src/app/admin/estudios/page.tsx
// Server Component: inventario de colecciones (CRUD — Read)
// =========================================================

import Link from 'next/link'
import { getAllColeccionesAdmin } from '@/lib/services/colecciones'

export const dynamic = 'force-dynamic'

// ── Mapa visual de estados ──
const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  published:  { label: 'Publicada', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  draft:      { label: 'Borrador',  dot: 'bg-amber-400',   text: 'text-amber-300' },
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default async function AdminEstudiosPage() {
  const colecciones = await getAllColeccionesAdmin()
  const hasData = colecciones.length > 0

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
              Colecciones
            </span>
          </div>
          <h1
            className="
              font-[family-name:var(--font-cormorant)]
              text-3xl font-light text-white/95 tracking-wide
            "
          >
            Estudios
          </h1>
          <p
            className="
              font-[family-name:var(--font-dm-sans)]
              text-sm text-white/60 mt-1
            "
          >
            {hasData
              ? `${colecciones.length} colección${colecciones.length !== 1 ? 'es' : ''} en el sistema.`
              : 'Gestión de colecciones temáticas.'}
          </p>
        </div>

        <Link
          href="/admin/estudios/nueva"
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
          Nueva Colección
        </Link>
      </header>

      {/* ── Empty State ── */}
      {!hasData && (
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <p
            className="
              font-[family-name:var(--font-cormorant)]
              text-xl font-light text-white/70 mb-2
            "
          >
            No hay colecciones
          </p>
          <p
            className="
              font-[family-name:var(--font-dm-sans)]
              text-sm text-white/50
            "
          >
            Aún no se han creado colecciones. Comienza creando la primera.
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
                    Categoría
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
                    Destacada
                  </th>
                  <th className="px-5 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody>
                {colecciones.map((col) => {
                  const status = col.published ? statusConfig.published : statusConfig.draft
                  return (
                    <tr
                      key={col.id}
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
                          {col.titulo}
                        </p>
                        <p
                          className="
                            font-[family-name:var(--font-dm-sans)]
                            text-xs text-white/40 mt-0.5
                            truncate
                          "
                        >
                          /{col.slug}
                        </p>
                      </td>

                      {/* Categoría */}
                      <td className="px-5 py-4">
                        <span
                          className="
                            font-[family-name:var(--font-dm-sans)]
                            text-sm text-white/60
                          "
                        >
                          {col.categoria ?? '—'}
                        </span>
                      </td>

                      {/* Estado */}
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

                      {/* Destacada */}
                      <td className="px-5 py-4">
                        {col.destacada ? (
                          <span className="inline-flex items-center gap-1.5 text-[#C8A843]/80">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                            </svg>
                            <span className="font-[family-name:var(--font-dm-sans)] text-xs">Sí</span>
                          </span>
                        ) : (
                          <span className="font-[family-name:var(--font-dm-sans)] text-sm text-white/30">—</span>
                        )}
                      </td>

                      {/* Acción: editar */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/estudios/${col.id}/editar`}
                          className="
                            inline-flex items-center justify-center
                            w-8 h-8 rounded-sm
                            text-white/30 hover:text-[#C8A843]/80
                            hover:bg-[#C8A843]/[0.08]
                            transition-all duration-200
                          "
                          title="Editar colección"
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
