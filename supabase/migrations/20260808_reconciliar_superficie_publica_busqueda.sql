-- ============================================================================
-- RECONCILIACIÓN DE HISTORIA DE MIGRACIONES
--
-- Esta migración representa hacia adelante el estado actualmente instalado
-- de la superficie pública de búsqueda.
--
-- Absorbe funcionalmente el estado representado por el archivo histórico
-- local no versionado:
--
--   20260716_normalizacion_diacritica_buscar_conferencias.sql
--
-- Ese archivo histórico no debe tratarse como una migración pendiente de
-- aplicar sobre un entorno que ya haya recibido esta reconciliación.
--
-- La reconciliación no introduce funcionalidad nueva: registra de forma
-- reproducible el estado ya existente en Supabase.
-- ============================================================================

BEGIN;

-- La superficie pública instalada utiliza normalización diacrítica inmutable
-- tanto en el tsvector almacenado como en los términos de búsqueda.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.unaccent_immutable(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT public.unaccent(input)
$function$;

COMMENT ON FUNCTION public.unaccent_immutable(text) IS
  'Envoltorio immutable y con search_path fijo para usar unaccent en expresiones FTS almacenadas.';

-- Conserva los permisos instalados de la función auxiliar.
GRANT EXECUTE ON FUNCTION public.unaccent_immutable(text)
  TO PUBLIC, anon, authenticated, service_role;

-- Reconstruye exactamente la superficie FTS instalada.
DROP INDEX IF EXISTS public.conferencias_fts_gin_idx;

ALTER TABLE public.conferencias
  DROP COLUMN fts;

ALTER TABLE public.conferencias
  ADD COLUMN fts tsvector GENERATED ALWAYS AS (
    setweight(
      to_tsvector(
        'spanish',
        public.unaccent_immutable(coalesce(titulo, ''))
      ),
      'A'
    ) ||
    setweight(
      to_tsvector(
        'spanish',
        public.unaccent_immutable(coalesce(extracto, ''))
      ),
      'B'
    ) ||
    setweight(
      to_tsvector(
        'spanish',
        public.unaccent_immutable(coalesce(ponente_nombre, ''))
      ),
      'B'
    ) ||
    setweight(
      to_tsvector(
        'spanish',
        public.unaccent_immutable(coalesce(descripcion, ''))
      ),
      'C'
    )
  ) STORED;

CREATE INDEX conferencias_fts_gin_idx
  ON public.conferencias
  USING gin (fts);

-- Conserva la superficie de acceso instalada de la tabla base.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL ON TABLE public.conferencias FROM PUBLIC, anon;

GRANT SELECT (
  id,
  slug,
  titulo,
  extracto,
  descripcion,
  fecha_impartida,
  ponente_nombre,
  ponente_rol,
  audio_url,
  audio_duracion,
  pdf_url,
  video_provider,
  video_provider_id,
  video_fallback_provider,
  video_fallback_url,
  video_status
) ON TABLE public.conferencias TO anon;

GRANT SELECT ON TABLE public.conferencias TO authenticated;

CREATE OR REPLACE VIEW public.conferencias_publicas
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.slug,
  c.titulo,
  c.extracto,
  c.descripcion,
  c.fecha_impartida,
  c.ponente_nombre,
  c.ponente_rol,
  c.audio_url,
  c.audio_duracion,
  c.pdf_url,
  c.video_provider,
  c.video_provider_id,
  c.video_fallback_provider,
  c.video_fallback_url,
  c.video_status
FROM public.conferencias AS c;

REVOKE ALL ON TABLE public.conferencias_publicas FROM PUBLIC;

-- Estos ACL reproducen el estado instalado. security_invoker=true y los
-- permisos de la tabla base continúan determinando el acceso efectivo.
GRANT ALL ON TABLE public.conferencias_publicas
  TO anon, authenticated, service_role;

-- La versión histórica en HEAD devuelve otra tabla; se elimina su firma antes
-- de registrar el contrato instalado para permitir el cambio de tipo de retorno.
DROP FUNCTION IF EXISTS public.buscar_conferencias(
  text,
  text,
  date,
  date,
  integer,
  integer
);

CREATE FUNCTION public.buscar_conferencias(
  termino text,
  formato text DEFAULT NULL,
  fecha_desde date DEFAULT NULL,
  fecha_hasta date DEFAULT NULL,
  resultado_limit integer DEFAULT 20,
  resultado_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
  titulo text,
  extracto text,
  descripcion text,
  fecha_impartida date,
  ponente_nombre text,
  ponente_rol text,
  audio_url text,
  audio_duracion integer,
  pdf_url text,
  video_provider text,
  video_provider_id text,
  video_status text,
  video_fallback_provider text,
  video_fallback_url text,
  rank real,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH tokens AS (
    SELECT
      lower(public.unaccent_immutable(t.token)) AS token,
      t.posicion
    FROM regexp_split_to_table(
      btrim(coalesce(termino, '')),
      '\s+'
    ) WITH ORDINALITY AS t(token, posicion)
    WHERE t.token <> ''
  ),
  candidatos AS (
    SELECT
      token,
      posicion,
      CASE
        WHEN token ~ '^[0-9]{4}$' THEN token::integer
        ELSE NULL
      END AS anio_candidato
    FROM tokens
  ),
  clasificados AS (
    SELECT
      token,
      posicion,
      CASE
        WHEN anio_candidato BETWEEN 1974 AND 2018 THEN anio_candidato
        ELSE NULL
      END AS anio
    FROM candidatos
  ),
  parametros_base AS (
    SELECT
      coalesce(
        array_agg(DISTINCT anio) FILTER (WHERE anio IS NOT NULL),
        '{}'::integer[]
      ) AS anios,
      coalesce(
        string_agg(token, ' ' ORDER BY posicion)
          FILTER (WHERE anio IS NULL),
        ''
      ) AS texto_normalizado
    FROM clasificados
  ),
  parametros AS (
    SELECT
      anios,
      texto_normalizado,
      plainto_tsquery('spanish', texto_normalizado) AS text_query
    FROM parametros_base
  )
  SELECT
    c.id,
    c.slug,
    c.titulo,
    c.extracto,
    c.descripcion,
    c.fecha_impartida,
    c.ponente_nombre,
    c.ponente_rol,
    c.audio_url,
    c.audio_duracion,
    c.pdf_url,
    c.video_provider,
    c.video_provider_id,
    c.video_status,
    c.video_fallback_provider,
    c.video_fallback_url,
    CASE
      WHEN p.texto_normalizado = '' THEN 0::real
      ELSE ts_rank(c.fts, p.text_query)
    END AS rank,
    count(*) OVER () AS total_count
  FROM public.conferencias AS c
  CROSS JOIN parametros AS p
  WHERE (
      cardinality(p.anios) > 0
      OR p.texto_normalizado <> ''
    )
    AND (
      cardinality(p.anios) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(p.anios) AS y(anio)
        WHERE c.fecha_impartida >= make_date(y.anio, 1, 1)
          AND c.fecha_impartida < make_date(y.anio + 1, 1, 1)
      )
    )
    AND (
      p.texto_normalizado = ''
      OR c.fts @@ p.text_query
    )
    AND (
      fecha_desde IS NULL
      OR c.fecha_impartida >= fecha_desde
    )
    AND (
      fecha_hasta IS NULL
      OR c.fecha_impartida <= fecha_hasta
    )
    AND (
      formato IS NULL
      OR (formato = 'audio' AND c.audio_url IS NOT NULL)
      OR (
        formato = 'video'
        AND c.video_provider <> 'none'
        AND c.video_status = 'active'
      )
      OR (formato = 'pdf' AND c.pdf_url IS NOT NULL)
    )
  ORDER BY rank DESC, c.fecha_impartida DESC
  LIMIT resultado_limit
  OFFSET resultado_offset;
$function$;

REVOKE ALL ON FUNCTION public.buscar_conferencias(
  text,
  text,
  date,
  date,
  integer,
  integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.buscar_conferencias(
  text,
  text,
  date,
  date,
  integer,
  integer
) TO anon, authenticated, service_role;

COMMIT;
