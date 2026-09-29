// =========================================================
// Legado Patrimonial WSS — Buscador cronológico (etapa 4)
// src/components/search/ExactFilters.tsx
// Filtros de la búsqueda Exacta: año inicial, año final y orden.
//
// Formulario GET sin JavaScript: al aplicarlo se vuelve a la primera página y
// se descarta la huella de la navegación anterior, porque es una búsqueda
// nueva. La paginación, en cambio, conserva estos parámetros en la URL.
// =========================================================

import Link from 'next/link'
import type { ExactOrder } from '@/lib/services/conferences'

type Props = {
  query: string
  anioDesde: number | null
  anioHasta: number | null
  orden: ExactOrder
  minYear: number
  maxYear: number
}

const ETIQUETAS_ORDEN: Record<ExactOrder, string> = {
  antiguos: 'Más antiguas primero',
  recientes: 'Más recientes primero',
  relevancia: 'Más coincidencias primero',
}

const estiloCampo = {
  background: 'rgba(255, 255, 255, 0.04)',
  borderColor: 'rgba(212, 175, 55, 0.22)',
  color: 'var(--color-text-primary, rgba(255,255,255,0.9))',
  colorScheme: 'dark' as const,
}

export function ExactFilters({ query, anioDesde, anioHasta, orden, minYear, maxYear }: Readonly<Props>) {
  const anios = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
  const hayFiltros = anioDesde !== null || anioHasta !== null || orden !== 'antiguos'
  const sinFiltros = `/archivo/busqueda?${new URLSearchParams({ search_mode: 'exact', query }).toString()}`

  return (
    <form
      method="get"
      action="/archivo/busqueda"
      aria-label="Filtrar y ordenar los resultados"
      className="mt-5 flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="search_mode" value="exact" />
      <input type="hidden" name="query" value={query} />

      <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.6))' }}>
        Año inicial
        <select name="desde" defaultValue={anioDesde ?? ''} className="rounded-lg border px-3 py-2 text-sm font-normal" style={estiloCampo}>
          <option value="">Desde el principio</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.6))' }}>
        Año final
        <select name="hasta" defaultValue={anioHasta ?? ''} className="rounded-lg border px-3 py-2 text-sm font-normal" style={estiloCampo}>
          <option value="">Hasta el final</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.6))' }}>
        Orden
        <select name="orden" defaultValue={orden} className="rounded-lg border px-3 py-2 text-sm font-normal" style={estiloCampo}>
          {(Object.keys(ETIQUETAS_ORDEN) as ExactOrder[]).map((o) => (
            <option key={o} value={o}>{ETIQUETAS_ORDEN[o]}</option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
        style={{ background: 'rgba(212, 175, 55, 0.16)', color: 'var(--color-gold, #D4AF37)', border: '1px solid rgba(212, 175, 55, 0.32)' }}
      >
        Aplicar
      </button>

      {hayFiltros && (
        <Link href={sinFiltros} className="py-2 text-sm underline" style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.55))' }}>
          Quitar filtros
        </Link>
      )}
    </form>
  )
}

export function describirOrden(orden: ExactOrder): string {
  return orden === 'antiguos'
    ? 'en orden cronológico, de las más antiguas a las más recientes'
    : orden === 'recientes'
      ? 'en orden cronológico, de las más recientes a las más antiguas'
      : 'de mayor a menor número de coincidencias'
}
