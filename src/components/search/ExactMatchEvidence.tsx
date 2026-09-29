'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export const EXACT_MATCH_ANCHOR_ID = 'coincidencia-encontrada'

type ExactMatchEvidenceProps = {
  query: string
  text: string
  paginaInicio: number
  paginaFin: number
  variant?: 'card' | 'detail'
  id?: string
  focusOnMount?: boolean
}

type FoldedText = {
  value: string
  starts: number[]
  ends: number[]
}

/**
 * Pliega el texto igual que lo hace la base de datos en buscar_corpus_exacta:
 * minúsculas, sin diacríticos, y **cualquier carácter no alfanumérico se trata
 * como separador** y se colapsa en un solo espacio.
 *
 * Ese último punto es el que mantiene alineados los dos lados. La función SQL
 * une los términos con [^[:alnum:]]+, de modo que encuentra «el ángel, del
 * Señor». Si aquí se exigiera la coma, el navegador no sabría dónde está la
 * frase que la base sí encontró, y la tarjeta quedaría sin resaltar.
 */
function foldForExactMatch(value: string): FoldedText {
  let folded = ''
  const starts: number[] = []
  const ends: number[] = []
  let previousWasSeparator = false

  for (let index = 0; index < value.length;) {
    const codePoint = value.codePointAt(index)
    if (codePoint === undefined) break

    const character = String.fromCodePoint(codePoint)
    const nextIndex = index + character.length

    const normalized = character
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLocaleLowerCase('es')

    // Marca combinante suelta: no aporta nada y no separa palabras.
    if (normalized === '') {
      index = nextIndex
      continue
    }

    if (!/[\p{L}\p{N}]/u.test(normalized)) {
      if (!previousWasSeparator) {
        folded += ' '
        starts.push(index)
        ends.push(nextIndex)
      } else {
        ends[ends.length - 1] = nextIndex
      }
      previousWasSeparator = true
      index = nextIndex
      continue
    }

    const foldedStart = folded.length
    folded += normalized
    for (let offset = foldedStart; offset < folded.length; offset += 1) {
      starts.push(index)
      ends.push(nextIndex)
    }

    previousWasSeparator = false
    index = nextIndex
  }

  return { value: folded, starts, ends }
}

type Rango = { start: number; end: number }

/** Caracteres de contexto a cada lado de la coincidencia, en la tarjeta. */
const CONTEXTO_ANTES = 150
const CONTEXTO_DESPUES = 250
/** Si no se localiza la frase, cuánto texto mostrar antes de cortar. */
const SIN_COINCIDENCIA = 480

function localizarFrase(text: string, query: string): Rango[] {
  const foldedText = foldForExactMatch(text)
  const foldedQuery = foldForExactMatch(query).value.trim()
  if (!foldedQuery) return []

  const ranges: Rango[] = []
  let searchFrom = 0

  while (searchFrom < foldedText.value.length) {
    const matchIndex = foldedText.value.indexOf(foldedQuery, searchFrom)
    if (matchIndex < 0) break

    const lastMatchIndex = matchIndex + foldedQuery.length - 1
    const start = foldedText.starts[matchIndex]
    const end = foldedText.ends[lastMatchIndex]

    if (start !== undefined && end !== undefined) {
      ranges.push({ start, end })
    }

    searchFrom = matchIndex + foldedQuery.length
  }

  return ranges
}

/** Retrocede o avanza hasta el hueco entre palabras más cercano. */
function ajustarAPalabra(text: string, posicion: number, haciaAdelante: boolean): number {
  const limite = haciaAdelante ? text.length : 0
  const paso = haciaAdelante ? 1 : -1
  for (let i = posicion; haciaAdelante ? i < limite : i > limite; i += paso) {
    if (/\s/u.test(text[i])) return haciaAdelante ? i : i + 1
  }
  return posicion
}

/**
 * Recorta una ventana de contexto alrededor de la primera coincidencia (KWIC).
 * Sin esto la tarjeta muestra el pasaje entero desde su principio, que en los
 * documentos des-impuestos es el encabezado corrido, no la frase buscada.
 */
function recortarVentana(text: string, ranges: Rango[]): { texto: string; ranges: Rango[] } {
  if (ranges.length === 0) {
    if (text.length <= SIN_COINCIDENCIA) return { texto: text, ranges }
    const corte = ajustarAPalabra(text, SIN_COINCIDENCIA, false)
    return { texto: `${text.slice(0, corte).trimEnd()}…`, ranges }
  }

  const primera = ranges[0]
  let inicio = Math.max(0, primera.start - CONTEXTO_ANTES)
  let fin = Math.min(text.length, primera.end + CONTEXTO_DESPUES)

  if (inicio > 0) inicio = ajustarAPalabra(text, inicio, true)
  if (fin < text.length) fin = ajustarAPalabra(text, fin, false)

  const prefijo = inicio > 0 ? '…' : ''
  const sufijo = fin < text.length ? '…' : ''
  const recorte = text.slice(inicio, fin)
  const desplazamiento = inicio - prefijo.length

  const dentro = ranges
    .filter((r) => r.start >= inicio && r.end <= fin)
    .map((r) => ({ start: r.start - desplazamiento, end: r.end - desplazamiento }))

  return { texto: `${prefijo}${recorte}${sufijo}`, ranges: dentro }
}

function pintar(text: string, ranges: Rango[]): ReactNode {
  if (ranges.length === 0) return text

  const content: ReactNode[] = []
  let cursor = 0

  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      content.push(text.slice(cursor, range.start))
    }
    content.push(
      <mark
        key={`${range.start}-${range.end}-${index}`}
        className="rounded px-0.5"
        style={{
          background: 'rgba(212, 175, 55, 0.30)',
          color: 'var(--color-text-primary)',
        }}
      >
        {text.slice(range.start, range.end)}
      </mark>
    )
    cursor = range.end
  })

  if (cursor < text.length) {
    content.push(text.slice(cursor))
  }

  return content
}

function highlightExactPhrase(text: string, query: string, recortar: boolean): ReactNode {
  const ranges = localizarFrase(text, query)
  if (!recortar) return pintar(text, ranges)

  const ventana = recortarVentana(text, ranges)
  return pintar(ventana.texto, ventana.ranges)
}

/**
 * Solo el extracto con la frase resaltada, sin el marco de la seccion.
 *
 * Lo usa el arbol de resultados exactos, donde el encabezado —pagina, titulo,
 * conteo— ya lo pone la fila y lo unico que falta es el texto. Reutiliza la
 * misma ventana centrada en la coincidencia que la tarjeta, de modo que el
 * plegado y el recorte no se duplican en dos sitios.
 */
export function ExactPhraseHighlight({
  query,
  text,
}: Readonly<{ query: string; text: string }>) {
  return <>{highlightExactPhrase(text, query, true)}</>
}

function formatPageRange(paginaInicio: number, paginaFin: number): string {
  if (paginaInicio === paginaFin) {
    return `Página ${paginaInicio}`
  }

  return `Páginas ${paginaInicio}–${paginaFin}`
}

export function ExactMatchEvidence({
  query,
  text,
  paginaInicio,
  paginaFin,
  variant = 'card',
  id,
  focusOnMount = false,
}: Readonly<ExactMatchEvidenceProps>) {
  const containerRef = useRef<HTMLElement>(null)
  const isDetail = variant === 'detail'
  const labelId = id ? `${id}-titulo` : undefined

  useEffect(() => {
    if (!focusOnMount || !id || window.location.hash !== `#${id}`) return

    let focusFrame: number | undefined
    const navigationFrame = window.requestAnimationFrame(() => {
      focusFrame = window.requestAnimationFrame(() => {
        containerRef.current?.scrollIntoView({ block: 'start' })
        containerRef.current?.focus({ preventScroll: true })
      })
    })

    return () => {
      window.cancelAnimationFrame(navigationFrame)
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame)
    }
  }, [focusOnMount, id])

  return (
    <section
      ref={containerRef}
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-labelledby={labelId}
      className={`rounded-xl border px-4 py-3 scroll-mt-24 focus:outline-none focus:ring-2 focus:ring-amber-400/60 ${
        isDetail ? 'mb-10 md:px-6 md:py-5' : 'mb-5'
      }`}
      style={{
        borderColor: 'rgba(212, 175, 55, 0.24)',
        background: 'rgba(212, 175, 55, 0.06)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={labelId}
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-gold)' }}
        >
          Coincidencia encontrada
        </h2>
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {formatPageRange(paginaInicio, paginaFin)}
        </span>
      </div>
      <p
        className={`mt-3 whitespace-pre-line pr-2 leading-relaxed ${
          isDetail ? 'text-base' : 'text-[15px]'
        }`}
        style={{
          color: 'var(--color-text-primary, rgba(255, 255, 255, 0.94))',
          textAlign: isDetail ? 'justify' : 'left',
        }}
      >
        {highlightExactPhrase(text, query, !isDetail)}
      </p>
    </section>
  )
}
