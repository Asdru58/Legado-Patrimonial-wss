// =========================================================
// Legado Patrimonial WSS — Búsqueda semántica por extractos
// src/components/search/SemanticExtracts.tsx
//
// Componentes de servidor, sin JavaScript en el navegador: cada control es un
// enlace o un formulario GET. Todo el estado viaja en la URL (consulta, tope,
// orden, bloque, años y página), así que cualquier vista se puede recargar o
// compartir, y el servidor la resuelve sobre la búsqueda que ya tiene en
// memoria, sin repetirla.
// =========================================================

import type { ReactNode } from 'react'
import Link from 'next/link'

import { conSeparadorDeMiles } from '@/lib/format'
import {
  BLOQUES_EXTRACTOS,
  BLOQUE_INICIAL,
  ORDEN_INICIAL,
  TOPES_EXTRACTOS,
  TOPE_INICIAL,
  type BloqueExtractos,
  type GrupoDeExtractos,
  type OrdenExtractos,
  type TopeExtractos,
  type VistaExtractos,
} from '@/lib/services/semanticExtracts'

// El ancla del pasaje en el detalle. Es la misma cadena que exporta
// SemanticPassageEvidence; no se importa de allí porque ese módulo es de
// cliente y, desde un componente de servidor, sus exportaciones llegan como
// referencias, no como valores.
const SEMANTIC_PASSAGE_ANCHOR_ID = 'pasaje-relevante'

// ============================================
// Enlaces
// ============================================

export type EstadoBusquedaSemantica = {
  query: string
  tope: TopeExtractos
  orden: OrdenExtractos
  bloque: BloqueExtractos
  anioDesde: number | null
  anioHasta: number | null
  pagina: number
}

/** URL de la búsqueda; los valores por omisión no se escriben. */
export function hrefBusquedaSemantica(estado: EstadoBusquedaSemantica): string {
  const p = new URLSearchParams({ search_mode: 'semantic', query: estado.query })
  if (estado.tope !== TOPE_INICIAL) p.set('tope', String(estado.tope))
  if (estado.orden !== ORDEN_INICIAL) p.set('orden', estado.orden)
  if (estado.bloque !== BLOQUE_INICIAL) p.set('bloque', String(estado.bloque))
  if (estado.anioDesde !== null) p.set('desde', String(estado.anioDesde))
  if (estado.anioHasta !== null) p.set('hasta', String(estado.anioHasta))
  if (estado.pagina > 1) p.set('page', String(estado.pagina))
  return `/archivo/busqueda?${p.toString()}`
}

function hrefDetalle(query: string, slug: string, pasajeId?: string): string {
  if (!pasajeId) return `/conferencia/${slug}`
  const p = new URLSearchParams({ q: query, search_mode: 'semantic', pasaje: pasajeId })
  return `/conferencia/${slug}?${p.toString()}#${SEMANTIC_PASSAGE_ANCHOR_ID}`
}

// ============================================
// Textos
// ============================================

const ETIQUETAS_ORDEN: Record<OrdenExtractos, string> = {
  antiguos: '1974 → 2018',
  recientes: '2018 → 1974',
  parecido: 'Por parecido',
}

function plural(n: number, uno: string, varios: string): string {
  return `${conSeparadorDeMiles(n)} ${n === 1 ? uno : varios}`
}

export function describirRango(desde: number | null, hasta: number | null): string {
  if (desde !== null && hasta !== null) return desde === hasta ? `En ${desde}` : `Entre ${desde} y ${hasta}`
  if (desde !== null) return `Desde ${desde}`
  if (hasta !== null) return `Hasta ${hasta}`
  return ''
}

function formatPaginas(inicio: number, fin: number): string {
  return inicio === fin ? `p. ${inicio}` : `pp. ${inicio}–${fin}`
}

// ============================================
// Estilos compartidos
// ============================================

const colorTenue = 'var(--color-text-muted, rgba(255,255,255,0.55))'
const colorOro = 'var(--color-gold, #D4AF37)'

const estiloCampo = {
  background: 'rgba(255, 255, 255, 0.04)',
  borderColor: 'rgba(212, 175, 55, 0.22)',
  color: 'var(--color-text-primary, rgba(255,255,255,0.9))',
  colorScheme: 'dark' as const,
}

function Pastilla({ href, activa, children, etiqueta }: Readonly<{
  href: string
  activa: boolean
  children: ReactNode
  etiqueta?: string
}>) {
  return (
    <Link
      href={href}
      aria-current={activa ? 'true' : undefined}
      aria-label={etiqueta}
      className="rounded-full border px-3 py-1.5 text-sm transition-opacity hover:opacity-85"
      style={
        activa
          ? { background: 'rgba(212, 175, 55, 0.18)', borderColor: 'rgba(212, 175, 55, 0.5)', color: colorOro, fontWeight: 600 }
          : { background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.10)', color: 'var(--color-text-secondary, rgba(255,255,255,0.7))' }
      }
    >
      {children}
    </Link>
  )
}

// ============================================
// Controles: orden, tamaño de página, años y ampliar
// ============================================

export function SemanticControls({ estado, minYear, maxYear }: Readonly<{
  estado: EstadoBusquedaSemantica
  minYear: number
  maxYear: number
}>) {
  const anios = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
  // Cambiar el orden, el bloque o los años vuelve a la primera página.
  const base = { ...estado, pagina: 1 }
  const hayAnios = estado.anioDesde !== null || estado.anioHasta !== null

  return (
    <div className="mt-6 flex flex-col gap-4" aria-label="Ordenar y filtrar los extractos">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: colorTenue }}>
          Orden
        </span>
        {(Object.keys(ETIQUETAS_ORDEN) as OrdenExtractos[]).map((o) => (
          <Pastilla
            key={o}
            href={hrefBusquedaSemantica({ ...base, orden: o })}
            activa={estado.orden === o}
            etiqueta={
              o === 'antiguos' ? 'Orden cronológico, de 1974 a 2018'
                : o === 'recientes' ? 'Orden cronológico, de 2018 a 1974'
                  : 'Por parecido con la consulta'
            }
          >
            {ETIQUETAS_ORDEN[o]}
          </Pastilla>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: colorTenue }}>
          Extractos por página
        </span>
        {BLOQUES_EXTRACTOS.map((b) => (
          <Pastilla key={b} href={hrefBusquedaSemantica({ ...base, bloque: b })} activa={estado.bloque === b}>
            {b}
          </Pastilla>
        ))}
      </div>

      <form method="get" action="/archivo/busqueda" className="flex flex-wrap items-end gap-3" aria-label="Filtrar por años">
        <input type="hidden" name="search_mode" value="semantic" />
        <input type="hidden" name="query" value={estado.query} />
        {estado.tope !== TOPE_INICIAL && <input type="hidden" name="tope" value={estado.tope} />}
        {estado.orden !== ORDEN_INICIAL && <input type="hidden" name="orden" value={estado.orden} />}
        {estado.bloque !== BLOQUE_INICIAL && <input type="hidden" name="bloque" value={estado.bloque} />}

        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: colorTenue }}>
          Año inicial
          <select name="desde" defaultValue={estado.anioDesde ?? ''} className="rounded-lg border px-3 py-2 text-sm font-normal" style={estiloCampo}>
            <option value="">Desde el principio</option>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: colorTenue }}>
          Año final
          <select name="hasta" defaultValue={estado.anioHasta ?? ''} className="rounded-lg border px-3 py-2 text-sm font-normal" style={estiloCampo}>
            <option value="">Hasta el final</option>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
          style={{ background: 'rgba(212, 175, 55, 0.16)', color: colorOro, border: '1px solid rgba(212, 175, 55, 0.32)' }}
        >
          Aplicar años
        </button>

        {hayAnios && (
          <Link
            href={hrefBusquedaSemantica({ ...base, anioDesde: null, anioHasta: null })}
            className="py-2 text-sm underline"
            style={{ color: colorTenue }}
          >
            Quitar años
          </Link>
        )}
      </form>
    </div>
  )
}

// ============================================
// Contador honesto: lo traído y, si hay filtro, lo que queda
// ============================================

export function SemanticCounter({ vista, anioDesde, anioHasta }: Readonly<{
  vista: VistaExtractos
  anioDesde: number | null
  anioHasta: number | null
}>) {
  const hayAnios = anioDesde !== null || anioHasta !== null
  const primero = vista.extractosFiltrados === 0 ? 0 : (vista.pagina - 1) * vista.bloque + 1
  const ultimo = Math.min(vista.pagina * vista.bloque, vista.extractosFiltrados)

  return (
    <div className="flex flex-col gap-1" role="status">
      <p className="text-lg" style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.92))' }}>
        <strong style={{ color: colorOro }}>{plural(vista.extractosTraidos, 'extracto', 'extractos')}</strong>
        {' en '}
        <strong style={{ color: colorOro }}>{plural(vista.conferenciasTraidas, 'conferencia', 'conferencias')}</strong>
        <span className="text-sm" style={{ color: colorTenue }}>
          {' '}· los {conSeparadorDeMiles(vista.tope)} más cercanos a la consulta
        </span>
      </p>
      {hayAnios && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.75))' }}>
          {describirRango(anioDesde, anioHasta)}: {plural(vista.extractosFiltrados, 'extracto', 'extractos')} en{' '}
          {plural(vista.conferenciasFiltradas, 'conferencia', 'conferencias')}.
          {vista.extractosSinFecha > 0 && ` Quedan fuera ${plural(vista.extractosSinFecha, 'extracto', 'extractos')} sin fecha.`}
        </p>
      )}
      {vista.extractosFiltrados > 0 && (
        <p className="text-xs" style={{ color: colorTenue }}>
          Página {conSeparadorDeMiles(vista.pagina)} de {conSeparadorDeMiles(vista.totalPaginas)} · extractos{' '}
          {conSeparadorDeMiles(primero)}–{conSeparadorDeMiles(ultimo)}
        </p>
      )}
    </div>
  )
}

// ============================================
// Ampliar el tope: 3.000 → 4.000 → 5.000
// ============================================

export function SemanticAmpliar({ estado }: Readonly<{ estado: EstadoBusquedaSemantica }>) {
  const siguiente = TOPES_EXTRACTOS.find((t) => t > estado.tope)
  if (!siguiente) {
    return (
      <p className="text-sm" style={{ color: colorTenue }}>
        Se muestran los {conSeparadorDeMiles(estado.tope)} extractos más cercanos, que es el máximo.
      </p>
    )
  }
  return (
    <Link
      href={hrefBusquedaSemantica({ ...estado, tope: siguiente, pagina: 1 })}
      className="self-start rounded-full border px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
      style={{ background: 'rgba(212, 175, 55, 0.10)', borderColor: 'rgba(212, 175, 55, 0.32)', color: colorOro }}
    >
      Ampliar a {conSeparadorDeMiles(siguiente)} extractos
    </Link>
  )
}

// ============================================
// Lista: una cabecera por conferencia y sus extractos en orden de página
// ============================================

function CabeceraConferencia({ grupo, query }: Readonly<{ grupo: GrupoDeExtractos; query: string }>) {
  const visibles = grupo.extractos.length
  return (
    <header className="flex flex-col gap-1 border-b pb-3" style={{ borderColor: 'rgba(212, 175, 55, 0.18)' }}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm tabular-nums" style={{ color: colorOro }}>
          {grupo.fecha ?? 'Sin fecha'}
        </span>
        <Link
          href={hrefDetalle(query, grupo.slug)}
          className="text-xl font-light hover:underline"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--color-text-primary, rgba(255,255,255,0.95))' }}
        >
          {grupo.titulo}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: colorTenue }}>
        {grupo.autor && <span>{grupo.autor}</span>}
        <span>
          {grupo.extractosEnConferencia === visibles
            ? plural(visibles, 'extracto', 'extractos')
            : `${plural(visibles, 'extracto', 'extractos')} aquí de ${conSeparadorDeMiles(grupo.extractosEnConferencia)}`}
        </span>
        {grupo.continuaDeAntes && (
          <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: 'rgba(212, 175, 55, 0.12)', color: colorOro }}>
            Continúa de la página anterior
          </span>
        )}
      </div>
    </header>
  )
}

export function SemanticExtractsList({ vista, query }: Readonly<{ vista: VistaExtractos; query: string }>) {
  return (
    <div className="flex max-w-4xl flex-col gap-10">
      {vista.grupos.map((grupo) => (
        <section
          key={`${grupo.conferenciaId}:${grupo.extractos[0].posicion}`}
          aria-label={`${grupo.fecha ?? 'Sin fecha'} — ${grupo.titulo}`}
          data-conferencia={grupo.conferenciaId}
          className="flex flex-col gap-4"
        >
          <CabeceraConferencia grupo={grupo} query={query} />
          <ol className="flex flex-col gap-4">
            {grupo.extractos.map((e) => (
              <li key={e.pasajeId} data-posicion={e.posicion} className="flex flex-col gap-1.5 pl-3" style={{ borderLeft: '2px solid rgba(212, 175, 55, 0.22)' }}>
                <div className="flex flex-wrap items-center gap-x-3 text-xs" style={{ color: colorTenue }}>
                  <span className="font-semibold" style={{ color: 'var(--color-text-secondary, rgba(255,255,255,0.75))' }}>
                    {formatPaginas(e.paginaInicio, e.paginaFin)}
                  </span>
                  <span title="Puesto del extracto ordenando por parecido con la consulta">
                    n.º {conSeparadorDeMiles(e.puesto)} por parecido
                  </span>
                  <Link href={hrefDetalle(query, grupo.slug, e.pasajeId)} className="underline hover:opacity-85" style={{ color: colorOro }}>
                    Ver en la conferencia
                  </Link>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--color-text-primary, rgba(255,255,255,0.9))' }}>
                  {e.texto}
                </p>
              </li>
            ))}
          </ol>
          {grupo.sigueDespues && (
            <p className="text-xs font-semibold" style={{ color: colorOro }}>
              Esta conferencia sigue en la página siguiente.
            </p>
          )}
        </section>
      ))}
    </div>
  )
}
