// =========================================================
// Legado Patrimonial WSS — Sistema de Estudios
// scripts/seed_colecciones.mjs
// Script de migración: inserta las 6 colecciones base como
// registros reales en la tabla colecciones.
//
// EXCEPCIÓN AUTORIZADA: Usa SERVICE_ROLE_KEY para bypass RLS.
// Solo ejecución local manual por el Administrador.
//
// Schema alineado a Fase 1 (13 columnas):
// id, slug, titulo, extracto, descripcion, contenido,
// categoria, orden_display, destacada, published,
// serie_id, created_at, updated_at
//
// Uso: node scripts/seed_colecciones.mjs
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

// ── Las 6 colecciones base alineadas al schema Fase 1 ──
const colecciones = [
  {
    slug: 'las-siete-edades',
    titulo: 'Las Siete Edades',
    extracto:
      'Recorrido temático por las edades de la Iglesia con enfoque histórico, profético y doctrinal.',
    descripcion:
      'Serie que examina las siete edades de la Iglesia según la revelación bíblica, trazando la línea profética desde Efeso hasta Laodicea.',
    contenido: null,
    categoria: 'Escatología',
    orden_display: 1,
    destacada: true,
    published: true,
  },
  {
    slug: 'los-sellos',
    titulo: 'Los Sellos',
    extracto:
      'Colección centrada en la apertura de los sellos, su simbolismo y sus implicaciones para el creyente.',
    descripcion:
      'Estudios sobre los siete sellos del Apocalipsis, su correlación con las edades de la Iglesia y su significado profético.',
    contenido: null,
    categoria: 'Apocalipsis',
    orden_display: 2,
    destacada: true,
    published: true,
  },
  {
    slug: 'daniel-setenta-semanas',
    titulo: 'Daniel y las Setenta Semanas',
    extracto:
      'Estudios enfocados en cronología profética, dispensaciones y cumplimiento escritural.',
    descripcion:
      'Análisis detallado de las setenta semanas de Daniel, su contexto histórico y su proyección escatológica.',
    contenido: null,
    categoria: 'Profecía bíblica',
    orden_display: 3,
    destacada: false,
    published: true,
  },
  {
    slug: 'fundamentos-de-la-fe',
    titulo: 'Fundamentos de la Fe',
    extracto:
      'Mensajes para consolidar bases doctrinales, convicciones espirituales y comprensión bíblica.',
    descripcion:
      'Colección formativa que aborda los principios fundamentales de la fe cristiana según el mensaje de la hora.',
    contenido: null,
    categoria: 'Doctrina',
    orden_display: 4,
    destacada: false,
    published: true,
  },
  {
    slug: 'tipologia-del-antiguo-testamento',
    titulo: 'Tipología del Antiguo Testamento',
    extracto:
      'Lecturas y enseñanzas sobre tipos, sombras y figuras que apuntan a realidades mayores.',
    descripcion:
      'Estudios tipológicos que conectan figuras del Antiguo Testamento con su cumplimiento en el Nuevo Pacto.',
    contenido: null,
    categoria: 'Tipología bíblica',
    orden_display: 5,
    destacada: false,
    published: true,
  },
  {
    slug: 'el-libro-de-apocalipsis',
    titulo: 'El Libro de Apocalipsis',
    extracto:
      'Colección organizada para examinar visiones, símbolos, mensajeros y secuencias del texto profético.',
    descripcion:
      'Recorrido exegético por el libro de Apocalipsis, capítulo por capítulo, con especial atención a la revelación progresiva.',
    contenido: null,
    categoria: 'Profecía bíblica',
    orden_display: 6,
    destacada: false,
    published: true,
  },
]

// ── Ejecución ──
async function seed() {
  console.log('═══════════════════════════════════════════')
  console.log('  SEED — Colecciones de Estudios')
  console.log('═══════════════════════════════════════════')
  console.log(`  Destino: ${SUPABASE_URL}`)
  console.log(`  Colecciones a insertar: ${colecciones.length}`)
  console.log('')

  const { data, error } = await supabase
    .from('colecciones')
    .upsert(colecciones, { onConflict: 'slug' })
    .select('id, slug, titulo')

  if (error) {
    console.error('ERROR al insertar colecciones:', error)
    process.exit(1)
  }

  console.log(`  ✓ ${data.length} colecciones insertadas/actualizadas:`)
  for (const col of data) {
    console.log(`    • [${col.id.slice(0, 8)}] ${col.titulo}`)
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
