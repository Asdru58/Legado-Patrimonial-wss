import assert from 'node:assert/strict'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !anonKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o la clave anon en .env.local')
}

const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`
const authHeaders = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
}

async function rpc(
  termino,
  {
    formato = null,
    fechaDesde = null,
    fechaHasta = null,
    limit = 1000,
    offset = 0,
  } = {},
) {
  const response = await fetch(`${restUrl}/rpc/buscar_conferencias`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      termino,
      formato,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      resultado_limit: limit,
      resultado_offset: offset,
    }),
  })

  if (!response.ok) {
    throw new Error(`RPC ${response.status}: ${await response.text()}`)
  }

  return response.json()
}

function totalOf(rows) {
  return Number(rows[0]?.total_count ?? 0)
}

async function allResults(termino, options = {}) {
  const pageSize = 1000
  const firstPage = await rpc(termino, { ...options, limit: pageSize, offset: 0 })
  const total = totalOf(firstPage)
  const rows = [...firstPage]

  for (let offset = pageSize; offset < total; offset += pageSize) {
    rows.push(
      ...(await rpc(termino, {
        ...options,
        limit: pageSize,
        offset,
      })),
    )
  }

  assert.equal(rows.length, total, `La RPC no devolvió las ${total} filas de ${termino}`)
  return rows
}

async function chronologicalCount(year) {
  const query = new URLSearchParams({
    select: 'id',
    fecha_impartida: `gte.${year}-01-01`,
  })
  query.append('fecha_impartida', `lt.${year + 1}-01-01`)

  const response = await fetch(`${restUrl}/conferencias_publicas?${query}`, {
    headers: {
      ...authHeaders,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  })

  if (!response.ok) {
    throw new Error(`Conteo cronológico ${response.status}: ${await response.text()}`)
  }

  const match = response.headers.get('content-range')?.match(/\/(\d+)$/)
  if (!match) throw new Error(`Content-Range inválido para el año ${year}`)
  return Number(match[1])
}

function ids(rows) {
  return rows.map((row) => row.id).sort()
}

function yearOf(row) {
  return Number(row.fecha_impartida?.slice(0, 4))
}

async function assertEquivalentSearches(terms, label, pageSize = 2) {
  const snapshots = await Promise.all(
    terms.map(async (term) => {
      const [all, firstPage, secondPage] = await Promise.all([
        allResults(term),
        rpc(term, { limit: pageSize, offset: 0 }),
        rpc(term, { limit: pageSize, offset: pageSize }),
      ])

      return {
        term,
        total: totalOf(firstPage),
        all,
        firstPage,
        secondPage,
      }
    }),
  )

  const expected = snapshots[0]
  for (const actual of snapshots.slice(1)) {
    assert.equal(
      actual.total,
      expected.total,
      `${label}: ${actual.term} cambió el total respecto de ${expected.term}`,
    )
    assert.deepEqual(
      actual.firstPage,
      expected.firstPage,
      `${label}: ${actual.term} cambió los primeros resultados respecto de ${expected.term}`,
    )
    assert.deepEqual(
      actual.all,
      expected.all,
      `${label}: ${actual.term} cambió los resultados o su orden respecto de ${expected.term}`,
    )
    assert.deepEqual(
      actual.secondPage,
      expected.secondPage,
      `${label}: ${actual.term} cambió la paginación respecto de ${expected.term}`,
    )
  }

  return expected
}

async function run() {
  const auditedYears = [1990, 2004, 2006, 2010, 2011]
  const chronological = new Map()

  for (const year of auditedYears) {
    const expected = await chronologicalCount(year)
    const rows = await allResults(String(year))
    chronological.set(year, expected)
    assert.equal(rows.length, expected, `Búsqueda y Archivo difieren para ${year}`)
    assert.ok(rows.every((row) => yearOf(row) === year), `Se filtró otra fecha en ${year}`)
  }

  assert.equal(chronological.get(2011), 153)

  const diacriticCaseEquivalence = await assertEquivalentSearches(
    [
      'dispensacion 1998',
      'dispensación 1998',
      'DISPENSACION 1998',
      'DISPENSACIÓN 1998',
    ],
    'Normalización de dispensación',
  )

  const septimoSelloEquivalence = await assertEquivalentSearches(
    ['septimo sello', 'séptimo sello'],
    'Normalización de séptimo sello',
    20,
  )

  const multiYear = await allResults('1997 1998')
  const expectedMultiYear =
    (await chronologicalCount(1997)) + (await chronologicalCount(1998))
  assert.equal(multiYear.length, expectedMultiYear, 'Los años múltiples no usan OR')
  assert.ok(
    multiYear.every((row) => yearOf(row) === 1997 || yearOf(row) === 1998),
    'Los años múltiples dejaron pasar otro año',
  )

  const [misterio, misterioMultiYear] = await Promise.all([
    allResults('misterio'),
    allResults('misterio 1997 1998'),
  ])
  const expectedCombined = misterio.filter((row) => {
    const year = yearOf(row)
    return year === 1997 || year === 1998
  })
  assert.deepEqual(
    ids(misterioMultiYear),
    ids(expectedCombined),
    'El grupo de años no se combinó mediante AND con el texto',
  )

  const misterio1997 = await allResults('misterio 1997')
  assert.equal(misterio1997.length, 90, 'misterio 1997 cambió su total histórico')

  const [reino, misterioReino] = await Promise.all([
    allResults('reino'),
    allResults('misterio reino'),
  ])
  const reinoIds = new Set(reino.map((row) => row.id))
  const expectedTextAnd = misterio.filter((row) => reinoIds.has(row.id))
  assert.deepEqual(
    ids(misterioReino),
    ids(expectedTextAnd),
    'Los términos textuales no se combinaron mediante AND',
  )
  assert.equal(misterioReino.length, 15, 'misterio reino cambió su total histórico')

  const dios = await rpc('Dios', { limit: 3 })
  assert.equal(totalOf(dios), 1018)
  assert.deepEqual(
    dios.map((row) => row.titulo),
    [
      'Columna en el templo de Dios donde esta escrito el Nombre de Dios nombre de la ciudad de Dios y nombre nuevo del Señor Jesucristo.',
      'La Iglesia de Dios recibiendo por Fe el Poder de Dios.',
      'La Iglesia de Dios Recibiendo por Fe el Poder de Dios Introduccion.',
    ],
  )

  const [pageOne, pageTwo] = await Promise.all([
    rpc('2011', { limit: 20, offset: 0 }),
    rpc('2011', { limit: 20, offset: 20 }),
  ])
  assert.equal(pageOne.length, 20)
  assert.equal(pageTwo.length, 20)
  assert.equal(totalOf(pageOne), 153)
  assert.equal(totalOf(pageTwo), 153)
  assert.equal(pageOne.some((row) => ids(pageTwo).includes(row.id)), false)

  const [video, pdf, audio] = await Promise.all([
    rpc('2011', { formato: 'video', limit: 1 }),
    rpc('2011', { formato: 'pdf', limit: 1 }),
    rpc('2011', { formato: 'audio', limit: 1 }),
  ])
  assert.equal(totalOf(video), 22)
  assert.equal(totalOf(pdf), 153)
  assert.equal(totalOf(audio), 0)

  console.log(
    JSON.stringify(
      {
        credential: 'anon',
        chronological: Object.fromEntries(chronological),
        diacritic_case_total: diacriticCaseEquivalence.total,
        diacritic_case_order: diacriticCaseEquivalence.all.map((row) => row.id),
        septimo_sello_total: septimoSelloEquivalence.total,
        multi_year_total: multiYear.length,
        combined_total: misterioMultiYear.length,
        misterio_1997_total: misterio1997.length,
        text_and_total: misterioReino.length,
        dios_total: totalOf(dios),
        pagination_total: totalOf(pageTwo),
        status: 'ok',
      },
      null,
      2,
    ),
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
