// =========================================================
// Legado Patrimonial WSS — Sistema de Blog
// scripts/seed_articulos.mjs
// Script de migración: inserta los 6 artículos mock como
// registros reales en la tabla articulos.
//
// EXCEPCIÓN AUTORIZADA: Usa SERVICE_ROLE_KEY para bypass RLS.
// Solo ejecución local manual por el Administrador.
//
// Uso: node scripts/seed_articulos.mjs
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

// ── Los 6 artículos mock migrados como registros reales ──
const articulos = [
  {
    slug: 'una-casa-para-la-memoria-del-archivo',
    titulo: 'Una casa para la memoria del archivo',
    extracto: 'La plataforma comienza a tomar forma como un lugar de resguardo y lectura para una herencia espiritual y documental que merece permanencia, claridad y reverencia.',
    contenido: `# Una casa para la memoria del archivo

La plataforma comienza a tomar forma como un lugar de resguardo y lectura para una herencia espiritual y documental que merece permanencia, claridad y reverencia.

## El sentido de construir

Construir un archivo digital no es solo organizar archivos. Es levantar una casa para la memoria. Un espacio donde cada conferencia, cada registro sonoro, cada documento encuentra su lugar con dignidad y orden.

## La visión del proyecto

Legado Patrimonial WSS nace de la convicción de que ciertos materiales merecen algo más que un almacenamiento pasivo. Merecen un **contexto**, una **presentación** y un **acceso** que honre su naturaleza.

> La tecnología al servicio de la memoria no es un lujo: es una forma de reverencia práctica.

## Lo que viene

- Consolidación del archivo cronológico
- Sistema de búsqueda avanzada
- Experiencia de lectura inmersiva
- Herramientas de navegación temática

El camino está trazado. La casa, poco a poco, se levanta.`,
    categoria: 'Actualización del proyecto',
    autor: 'Legado Patrimonial WSS',
    fecha_publicacion: '2026-03-15',
    tiempo_lectura: '~6 min de lectura',
    destacado: true,
    published: true,
  },
  {
    slug: 'cuando-la-voz-tambien-es-patrimonio',
    titulo: 'Cuando la voz también es patrimonio',
    extracto: 'Una reflexión sobre el valor de los registros sonoros como parte de la memoria viva, no solo por lo que dicen, sino por la atmósfera espiritual que conservan.',
    contenido: `# Cuando la voz también es patrimonio

Una reflexión sobre el valor de los registros sonoros como parte de la memoria viva, no solo por lo que dicen, sino por la atmósfera espiritual que conservan.

## Más allá de las palabras

Los registros de audio conservan algo que el texto escrito no puede: el **tono**, la **pausa**, la **emoción** del momento. Cuando una conferencia fue grabada hace décadas, su audio no solo preserva información — preserva una *atmósfera*.

## El sonido como testigo

Cada cinta, cada archivo de audio digitalizado, lleva consigo el eco del lugar donde se pronunció. La reverberación del salón, el silencio atento de la audiencia, la respiración del ponente antes de una frase decisiva.

> El sonido es el testigo más fiel del instante. Donde la imagen puede faltar, la voz permanece.

## Custodiar lo intangible

El reto de un archivo patrimonial que incluye audio es doble:

1. **Preservar la calidad técnica** del material original
2. **Presentar el contexto** que le da significado

Sin lo segundo, un archivo de audio es solo ruido digitalizado. Con contexto, se convierte en *patrimonio vivo*.`,
    categoria: 'Crónica del archivo',
    autor: 'Legado Patrimonial WSS',
    fecha_publicacion: '2026-03-08',
    tiempo_lectura: '~5 min de lectura',
    destacado: false,
    published: true,
  },
  {
    slug: 'ordenar-para-transmitir-mejor',
    titulo: 'Ordenar para transmitir mejor',
    extracto: 'La organización documental no reduce el misterio del legado: le da estructura para que llegue con mayor fidelidad a quienes vendrán después.',
    contenido: `# Ordenar para transmitir mejor

La organización documental no reduce el misterio del legado: le da estructura para que llegue con mayor fidelidad a quienes vendrán después.

## El orden como acto de servicio

Organizar un archivo no es un acto burocrático. Es un acto de **servicio**. Quien ordena piensa en quien vendrá después, en quien buscará, en quien necesitará encontrar.

## Categorías con propósito

Cada categoría, cada etiqueta, cada fecha asignada es una *señal* que dejamos para los que vienen. Es decirles: *esto importa, y aquí es donde lo encontrarás*.

## La fidelidad como principio

El orden que aplicamos no altera el contenido. Lo respeta y lo presenta:

- **Sin distorsión**: el material se muestra tal como es
- **Con contexto**: cada pieza se ubica en su lugar temporal y temático
- **Con acceso**: la organización facilita el descubrimiento

> Ordenar no es simplificar. Es *iluminar* el camino hacia lo que ya estaba ahí.`,
    categoria: 'Criterio editorial',
    autor: 'Legado Patrimonial WSS',
    fecha_publicacion: '2026-02-20',
    tiempo_lectura: '~4 min de lectura',
    destacado: false,
    published: true,
  },
  {
    slug: 'el-archivo-como-servicio-a-la-memoria',
    titulo: 'El archivo como servicio a la memoria',
    extracto: 'Pensar el archivo como servicio implica cuidar contexto, acceso y tono, para que cada pieza encuentre su lugar dentro de una narrativa mayor.',
    contenido: `# El archivo como servicio a la memoria

Pensar el archivo como servicio implica cuidar contexto, acceso y tono, para que cada pieza encuentre su lugar dentro de una narrativa mayor.

## Servicio, no almacén

Un archivo puede ser simplemente un almacén de datos. O puede ser un **servicio**. La diferencia está en la intención: ¿guardamos para acumular o guardamos para *servir*?

## Tres pilares del servicio archivístico

### Contexto
Cada pieza necesita su marco. ¿Cuándo fue creada? ¿En qué circunstancias? ¿Qué la conecta con las demás?

### Acceso
De nada sirve un archivo perfectamente organizado si nadie puede llegar a él. El acceso es tan importante como la preservación.

### Tono
La manera en que presentamos el material comunica respeto — o indiferencia. El tono editorial del archivo es parte de su valor.

> Un archivo al servicio de la memoria no solo *tiene* historia. **La cuida**, la presenta y la hace accesible con reverencia.

## El compromiso continuo

Este servicio no termina cuando se digitaliza el último documento. Es un compromiso continuo de actualización, mejora y atención al detalle.`,
    categoria: 'Visión institucional',
    autor: 'Legado Patrimonial WSS',
    fecha_publicacion: '2026-02-10',
    tiempo_lectura: '~7 min de lectura',
    destacado: false,
    published: true,
  },
  {
    slug: 'lectura-lenta-en-tiempos-de-ruido',
    titulo: 'Lectura lenta en tiempos de ruido',
    extracto: 'La sala de lectura del proyecto busca devolverle peso y respiración a los textos, invitando a una experiencia de lectura más serena y contemplativa.',
    contenido: `# Lectura lenta en tiempos de ruido

La sala de lectura del proyecto busca devolverle peso y respiración a los textos, invitando a una experiencia de lectura más serena y contemplativa.

## El ruido digital

Vivimos rodeados de información que se consume en segundos. Las redes sociales entrenan nuestros ojos para escanear, no para leer. Cada scroll es una decisión de *no detenerse*.

## Una invitación a detenerse

La sala de lectura de Legado Patrimonial WSS propone lo contrario:

- **Tipografía amplia** que descansa la vista
- **Espacios generosos** entre párrafos
- **Ausencia de distracciones** visuales
- **Ritmo diseñado** para la contemplación

## El valor de la lentitud

Cuando un texto se lee con calma, revela capas que la lectura rápida no puede captar. Un párrafo que parecía simple se vuelve *denso*. Una frase que parecía obvia se vuelve *profunda*.

> La lectura lenta no es una pérdida de tiempo. Es una recuperación del tiempo.

## Un espacio que protege

La sala de lectura no es solo un diseño bonito. Es una **decisión arquitectónica**: crear un espacio que proteja al lector del ruido exterior y le permita encontrarse con el texto.`,
    categoria: 'Ensayo editorial',
    autor: 'Legado Patrimonial WSS',
    fecha_publicacion: '2026-01-25',
    tiempo_lectura: '~5 min de lectura',
    destacado: false,
    published: true,
  },
  {
    slug: 'notas-sobre-continuidad-y-legado',
    titulo: 'Notas sobre continuidad y legado',
    extracto: 'Toda plataforma patrimonial debe mirar más allá del presente: custodiar no solo materiales, sino también la posibilidad de continuidad en el tiempo.',
    contenido: `# Notas sobre continuidad y legado

Toda plataforma patrimonial debe mirar más allá del presente: custodiar no solo materiales, sino también la posibilidad de continuidad en el tiempo.

## El presente no basta

Un archivo que solo existe para el presente es un archivo incompleto. La verdadera pregunta no es *¿funciona hoy?* sino *¿funcionará dentro de diez años?*

## Decisiones duraderas

Cada decisión técnica del proyecto se evalúa bajo la lente de la durabilidad:

1. **Formatos abiertos** sobre formatos propietarios
2. **Estándares probados** sobre tecnologías de moda
3. **Simplicidad robusta** sobre complejidad frágil

## El legado del legado

Hay una paradoja hermosa en construir un sistema para custodiar un legado: el sistema mismo se convierte en parte del legado. La plataforma no es solo un *medio* para acceder al archivo — es parte integral de su historia.

> Custodiar un legado es, en sí mismo, crear uno nuevo.

## Hacia adelante

El compromiso con la continuidad implica:

- Documentar cada decisión
- Mantener la infraestructura actualizada
- Pensar siempre en quien vendrá después

El archivo no termina con nosotros. Apenas comienza.`,
    categoria: 'Artículo doctrinal',
    autor: 'Legado Patrimonial WSS',
    fecha_publicacion: '2026-01-12',
    tiempo_lectura: '~6 min de lectura',
    destacado: false,
    published: true,
  },
]

// ── Ejecución ──
async function seed() {
  console.log('═══════════════════════════════════════════')
  console.log('  SEED — Artículos del Blog')
  console.log('═══════════════════════════════════════════')
  console.log(`  Destino: ${SUPABASE_URL}`)
  console.log(`  Artículos a insertar: ${articulos.length}`)
  console.log('')

  const { data, error } = await supabase
    .from('articulos')
    .upsert(articulos, { onConflict: 'slug' })
    .select('id, slug, titulo')

  if (error) {
    console.error('ERROR al insertar artículos:', error)
    process.exit(1)
  }

  console.log(`  ✓ ${data.length} artículos insertados/actualizados:`)
  for (const art of data) {
    console.log(`    • [${art.id.slice(0, 8)}] ${art.titulo}`)
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
