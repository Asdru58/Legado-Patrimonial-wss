import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line && line.trim() && !line.startsWith('#')) {
    const [key, ...val] = line.split('=');
    if (key && val.length > 0) {
      envVars[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
    }
  }
});

const client = new Client({
  connectionString: envVars.DATABASE_URL
});

async function run() {
  await client.connect();

  const queries = [
    {
      name: "BLOQUE 1: CONTEO GENERAL Y VERIFICACIÓN BASE",
      sql: `
SELECT
    count(*)       AS total_registros,
    min(id)        AS id_minimo,
    max(id)        AS id_maximo,
    min(created_at) AS primer_created_at,
    max(created_at) AS ultimo_created_at
FROM public.conferencias;
      `
    },
    {
      name: "BLOQUE 2: IDENTIFICACIÓN DEL REGISTRO FANTASMA (301) - 2a",
      sql: `
SELECT
    id,
    titulo,
    slug,
    fecha_impartida,
    created_at,
    updated_at
FROM public.conferencias
ORDER BY created_at ASC
LIMIT 10;
      `
    },
    {
      name: "BLOQUE 2: IDENTIFICACIÓN DEL REGISTRO FANTASMA (301) - 2b",
      sql: `
WITH ordered AS (
    SELECT
        id,
        titulo,
        slug,
        created_at,
        row_number() OVER (ORDER BY created_at ASC)  AS rn_asc,
        row_number() OVER (ORDER BY created_at DESC) AS rn_desc
    FROM public.conferencias
)
SELECT
    id,
    titulo,
    slug,
    created_at,
    rn_asc,
    rn_desc
FROM ordered
WHERE rn_asc <= 5 OR rn_desc <= 5
ORDER BY created_at ASC;
      `
    },
    {
      name: "BLOQUE 3: DIAGNÓSTICO DE FECHAS - 3a",
      sql: `
SELECT
    CASE
        WHEN fecha_impartida IS NULL THEN 'NULL'
        ELSE 'DATE_VÁLIDA'
    END AS categoria,
    count(*) AS cantidad
FROM public.conferencias
GROUP BY categoria
ORDER BY cantidad DESC;
      `
    },
    {
      name: "BLOQUE 3: DIAGNÓSTICO DE FECHAS - 3b",
      sql: `
SELECT
    id,
    titulo,
    fecha_impartida
FROM public.conferencias
WHERE fecha_impartida IS NULL
ORDER BY id
LIMIT 20;
      `
    },
    {
      name: "BLOQUE 4: CONCENTRACIÓN DE NULLs / VACÍOS POR COLUMNA",
      sql: `
SELECT
    count(*) AS total,
    count(*) FILTER (WHERE titulo IS NULL OR btrim(titulo) = '')
        AS titulo_vacios,
    count(*) FILTER (WHERE slug IS NULL OR btrim(slug) = '')
        AS slug_vacios,
    count(*) FILTER (WHERE fecha_impartida IS NULL)
        AS fecha_nulos,
    count(*) FILTER (WHERE extracto IS NULL OR btrim(extracto) = '')
        AS extracto_vacios,
    count(*) FILTER (WHERE descripcion IS NULL OR btrim(descripcion) = '')
        AS descripcion_vacios,
    count(*) FILTER (WHERE ponente_nombre IS NULL OR btrim(ponente_nombre) = '')
        AS ponente_nombre_vacios,
    count(*) FILTER (WHERE ponente_rol IS NULL OR btrim(ponente_rol) = '')
        AS ponente_rol_vacios,
    count(*) FILTER (WHERE audio_url IS NULL OR btrim(audio_url) = '')
        AS audio_url_vacios,
    count(*) FILTER (WHERE audio_duracion IS NULL)
        AS audio_duracion_nulos,
    count(*) FILTER (WHERE pdf_url IS NULL OR btrim(pdf_url) = '')
        AS pdf_url_vacios,
    count(*) FILTER (WHERE video_provider IS NULL OR btrim(video_provider) = '')
        AS video_provider_vacios,
    count(*) FILTER (WHERE video_provider_id IS NULL OR btrim(video_provider_id) = '')
        AS video_provider_id_vacios,
    count(*) FILTER (WHERE video_fallback_provider IS NULL OR btrim(video_fallback_provider) = '')
        AS video_fallback_provider_vacios,
    count(*) FILTER (WHERE video_fallback_url IS NULL OR btrim(video_fallback_url) = '')
        AS video_fallback_url_vacios,
    count(*) FILTER (WHERE video_status IS NULL OR btrim(video_status) = '')
        AS video_status_vacios,
    count(*) FILTER (WHERE video_checked_at IS NULL)
        AS video_checked_at_nulos,
    count(*) FILTER (WHERE serie_id IS NULL)
        AS serie_id_nulos
FROM public.conferencias;
      `
    },
    {
      name: "BLOQUE 5: DETECCIÓN DE SLUGS CONFLICTIVOS - 5a",
      sql: `
SELECT
    a.id   AS id_a,
    a.slug AS slug_a,
    b.id   AS id_b,
    b.slug AS slug_b,
    a.fecha_impartida
FROM public.conferencias a
JOIN public.conferencias b
    ON a.fecha_impartida = b.fecha_impartida
   AND a.id < b.id
   AND a.slug <> b.slug
ORDER BY a.fecha_impartida, a.slug
LIMIT 100;
      `
    },
    {
      name: "BLOQUE 5: DETECCIÓN DE SLUGS CONFLICTIVOS - 5b",
      sql: `
SELECT
    slug,
    count(*) AS repeticiones
FROM public.conferencias
GROUP BY slug
HAVING count(*) > 1
ORDER BY repeticiones DESC, slug;
      `
    },
    {
      name: "BLOQUE 6: DISTRIBUCIÓN DE VIDEO",
      sql: `
SELECT
    video_provider,
    video_status,
    count(*) AS cantidad
FROM public.conferencias
GROUP BY video_provider, video_status
ORDER BY cantidad DESC, video_provider, video_status;
      `
    },
    {
      name: "BLOQUE 7: DISTRIBUCIÓN TEMPORAL POR DÉCADA",
      sql: `
SELECT
    CASE
        WHEN fecha_impartida IS NULL THEN 'SIN_FECHA'
        ELSE ((extract(year FROM fecha_impartida)::int / 10) * 10)::text || 's'
    END AS decada,
    count(*) AS cantidad
FROM public.conferencias
GROUP BY decada
ORDER BY decada;
      `
    },
    {
      name: "BLOQUE 8: ESTRUCTURA DEL SCHEMA - 8a",
      sql: `
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conferencias'
ORDER BY ordinal_position;
      `
    },
    {
      name: "BLOQUE 8: ESTRUCTURA DEL SCHEMA - 8b",
      sql: `
SELECT
    conname  AS constraint_name,
    contype  AS constraint_type,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.conferencias'::regclass
ORDER BY contype, conname;
      `
    },
    {
      name: "BLOQUE 8: ESTRUCTURA DEL SCHEMA - 8c",
      sql: `
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'conferencias'
  AND schemaname = 'public'
ORDER BY indexname;
      `
    },
    {
      name: "BLOQUE 8: ESTRUCTURA DEL SCHEMA - 8d",
      sql: `
SELECT
    policyname,
    cmd       AS operacion,
    qual      AS condicion_using,
    with_check AS condicion_check
FROM pg_policies
WHERE tablename = 'conferencias'
  AND schemaname = 'public'
ORDER BY policyname;
      `
    }
  ];

  for (const q of queries) {
    console.log("============================================================");
    console.log(q.name);
    console.log("============================================================");
    try {
      const res = await client.query(q.sql);
      // Imprimir crudo usando console.table (formato mas aproximado a psql y de facil lectura cruda).
      if(res.rows.length === 0){
          console.log("(No rows returned)");
      } else {
          console.table(res.rows);
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
    console.log("");
  }

  await client.end();
}

run().catch(console.error);
