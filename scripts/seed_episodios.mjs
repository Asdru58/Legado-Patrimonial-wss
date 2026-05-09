// =========================================================
// Legado Patrimonial WSS — Sistema de Podcast
// scripts/seed_episodios.mjs
// Script de migración: inserta episodios iniciales como
// registros reales en la tabla episodios.
//
// EXCEPCIÓN AUTORIZADA: Usa SERVICE_ROLE_KEY para bypass RLS.
// Solo ejecución local manual por el Administrador.
//
// Uso: node scripts/seed_episodios.mjs
// =========================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Leer .env.local ──
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) envVars[match[1]] = match[2].trim()
}

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Variables NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY no encontradas en .env.local.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── Episodios iniciales del Podcast ──
const episodios = [
  {
    slug: 'la-fe-como-fundamento',
    titulo: 'La fe como fundamento del entendimiento',
    descripcion: 'Un recorrido por las bases doctrinales de la fe como punto de partida para toda comprensión espiritual, tomando como eje central el capítulo 11 del libro de Hebreos.',
    tema_doctrinal: 'Soteriología',
    texto_biblico_base: 'Hebreos 11:1-6',
    participantes: 'Equipo Legado Patrimonial WSS',
    audio_url: null,
    video_url: null,
    conferencia_fuente: 'La Fe de Abraham — Dr. William Soto Santiago',
    extracto_referenciado: 'La fe es la sustancia de las cosas que se esperan, la demostración de las cosas que no se ven.',
    duracion_minutos: 42,
    numero_episodio: 1,
    temporada: 1,
    published: true,
    destacado: true,
    fecha_publicacion: '2026-04-01',
  },
  {
    slug: 'las-siete-edades',
    titulo: 'Las siete edades de la Iglesia: contexto y relevancia',
    descripcion: 'Panorámica de las siete edades de la Iglesia gentil según el libro de Apocalipsis, con énfasis en la interpretación profética del Dr. William Soto Santiago.',
    tema_doctrinal: 'Eclesiología profética',
    texto_biblico_base: 'Apocalipsis 2-3',
    participantes: 'Equipo Legado Patrimonial WSS',
    audio_url: null,
    video_url: null,
    conferencia_fuente: 'Las Siete Edades de la Iglesia — Dr. William Soto Santiago',
    extracto_referenciado: 'Cada edad tiene su mensajero, su mensaje y su sello.',
    duracion_minutos: 55,
    numero_episodio: 2,
    temporada: 1,
    published: true,
    destacado: false,
    fecha_publicacion: '2026-04-08',
  },
  {
    slug: 'el-septimo-sello',
    titulo: 'El Séptimo Sello y su misterio',
    descripcion: 'Estudio sobre el silencio en el Cielo (Apocalipsis 8:1) y su relación con los eventos proféticos de la dispensación final.',
    tema_doctrinal: 'Escatología',
    texto_biblico_base: 'Apocalipsis 8:1',
    participantes: 'Equipo Legado Patrimonial WSS',
    audio_url: null,
    video_url: null,
    conferencia_fuente: 'Los Sellos — Dr. William Soto Santiago',
    extracto_referenciado: 'Hubo silencio en el cielo como por media hora.',
    duracion_minutos: 48,
    numero_episodio: 3,
    temporada: 1,
    published: true,
    destacado: false,
    fecha_publicacion: '2026-04-15',
  },
  {
    slug: 'la-restauracion-de-israel',
    titulo: 'La restauración de Israel en el plan profético',
    descripcion: 'Análisis de la higuera como símbolo de la nación de Israel y su papel en los eventos de los últimos tiempos según la enseñanza del Dr. William Soto Santiago.',
    tema_doctrinal: 'Profecía dispensacional',
    texto_biblico_base: 'Mateo 24:32-35',
    participantes: 'Equipo Legado Patrimonial WSS',
    audio_url: null,
    video_url: null,
    conferencia_fuente: 'La Restauración de Israel — Dr. William Soto Santiago',
    extracto_referenciado: 'De la higuera aprended la parábola: Cuando ya su rama está tierna, y brotan las hojas, sabéis que el verano está cerca.',
    duracion_minutos: 38,
    numero_episodio: 4,
    temporada: 1,
    published: true,
    destacado: false,
    fecha_publicacion: '2026-04-22',
  },
  {
    slug: 'la-carpa-y-la-tercera-etapa',
    titulo: 'La Carpa y la Tercera Etapa',
    descripcion: 'Exploración de la visión de la Carpa-Catedral como lugar del cumplimiento de la Tercera Etapa, según la interpretación profética del ministerio.',
    tema_doctrinal: 'Cumplimiento profético',
    texto_biblico_base: 'Apocalipsis 10:7',
    participantes: 'Equipo Legado Patrimonial WSS',
    audio_url: null,
    video_url: null,
    conferencia_fuente: 'La Visión de la Carpa — Dr. William Soto Santiago',
    extracto_referenciado: 'En los días de la voz del séptimo ángel, el misterio de Dios se consumará.',
    duracion_minutos: 50,
    numero_episodio: 5,
    temporada: 1,
    published: false,
    destacado: false,
    fecha_publicacion: null,
  },
]

// ── Ejecución ──
async function seed() {
  console.log('═══════════════════════════════════════════')
  console.log('  SEED — Episodios del Podcast')
  console.log('═══════════════════════════════════════════')
  console.log(`  Destino: ${SUPABASE_URL}`)
  console.log(`  Episodios a insertar: ${episodios.length}`)
  console.log('')

  const { data, error } = await supabase
    .from('episodios')
    .upsert(episodios, { onConflict: 'slug' })
    .select('id, slug, titulo')

  if (error) {
    console.error('ERROR al insertar episodios:', error)
    process.exit(1)
  }

  console.log(`  ✓ ${data.length} episodios insertados/actualizados:`)
  for (const ep of data) {
    console.log(`    • [${ep.id.slice(0, 8)}] ${ep.titulo}`)
  }

  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  SEED completado exitosamente.')
  console.log('═══════════════════════════════════════════')
}

seed().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
