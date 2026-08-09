-- ============================================================================
-- PLIEGO 021 — Busqueda Lexica de Texto Completo (piloto 40 conferencias)
--
-- Objetos creados exclusivamente:
--   1. indice GIN FTS spanish sobre corpus_pasajes.texto_plegado;
--   2. RPC publica buscar_corpus_lexica.
--
-- La migracion no modifica corpus, transcripciones, pasajes, embeddings,
-- columnas, vistas, politicas, triggers ni las RPC Exacta y Semantica.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Precondiciones cerradas del piloto
-- ----------------------------------------------------------------------------
DO $preconditions$
DECLARE
  transcripciones_total bigint;
  pasajes_total bigint;
  embeddings_total bigint;
BEGIN
  -- El cast falla y revierte toda la transaccion si la configuracion no existe.
  PERFORM 'pg_catalog.spanish'::pg_catalog.regconfig;

  IF pg_catalog.to_regprocedure(
    'public.unaccent_immutable(text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'No existe public.unaccent_immutable(text)';
  END IF;

  IF pg_catalog.to_regclass('public.corpus_pasajes') IS NULL
    OR pg_catalog.to_regclass('public.corpus_transcripciones') IS NULL
    OR pg_catalog.to_regclass('public.conferencias_publicas') IS NULL THEN
    RAISE EXCEPTION 'Falta un objeto obligatorio del corpus piloto';
  END IF;

  IF pg_catalog.to_regclass(
    'public.corpus_pasajes_texto_plegado_fts_spanish_gin_idx'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'El indice FTS spanish del PLIEGO 021 ya existe';
  END IF;

  IF pg_catalog.to_regprocedure(
    'public.buscar_corpus_lexica(text,integer,integer)'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'La RPC buscar_corpus_lexica ya existe';
  END IF;

  SELECT pg_catalog.count(*)
    INTO transcripciones_total
    FROM public.corpus_transcripciones;

  SELECT pg_catalog.count(*)
    INTO pasajes_total
    FROM public.corpus_pasajes;

  SELECT pg_catalog.count(*)
    INTO embeddings_total
    FROM public.corpus_pasaje_embeddings;

  IF transcripciones_total <> 40
    OR pasajes_total <> 1973
    OR embeddings_total <> 1973 THEN
    RAISE EXCEPTION
      'Conteos del corpus fuera del piloto: transcripciones=%, pasajes=%, embeddings=%',
      transcripciones_total,
      pasajes_total,
      embeddings_total;
  END IF;
END
$preconditions$;

-- ----------------------------------------------------------------------------
-- 2. Indice FTS de expresion; texto_plegado permanece intacto
-- ----------------------------------------------------------------------------
CREATE INDEX corpus_pasajes_texto_plegado_fts_spanish_gin_idx
  ON public.corpus_pasajes
  USING gin (
    pg_catalog.to_tsvector(
      'pg_catalog.spanish'::pg_catalog.regconfig,
      texto_plegado
    )
  );

COMMENT ON INDEX
  public.corpus_pasajes_texto_plegado_fts_spanish_gin_idx IS
  'PLIEGO 021: indice FTS spanish sobre texto_plegado del corpus piloto.';

-- ----------------------------------------------------------------------------
-- 3. RPC Lexica independiente de Exacta, Semantica y buscar_conferencias
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.buscar_corpus_lexica(
  consulta text,
  limite integer,
  desplazamiento integer
)
RETURNS TABLE (
  conferencia_id uuid,
  documento_id uuid,
  pasaje_id uuid,
  orden integer,
  pagina_inicio integer,
  pagina_fin integer,
  texto text,
  relevancia real,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '5s'
AS $function$
DECLARE
  consulta_limpia text;
  consulta_plegada text;
  query_lexica pg_catalog.tsquery;
BEGIN
  IF consulta IS NULL THEN
    RAISE EXCEPTION 'La consulta lexica no puede ser NULL'
      USING ERRCODE = '22023';
  END IF;

  -- Trim exterior y colapso de cualquier whitespace interior.
  consulta_limpia := pg_catalog.regexp_replace(
    pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(
        consulta,
        '^[[:space:]]+',
        ''
      ),
      '[[:space:]]+$',
      ''
    ),
    '[[:space:]]+',
    ' ',
    'g'
  );

  IF consulta_limpia = '' THEN
    RAISE EXCEPTION 'La consulta lexica no puede estar vacia'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.char_length(consulta_limpia) > 200 THEN
    RAISE EXCEPTION 'La consulta lexica no puede superar 200 caracteres'
      USING ERRCODE = '22023';
  END IF;

  IF limite IS NULL OR limite < 1 OR limite > 100 THEN
    RAISE EXCEPTION 'limite debe estar entre 1 y 100'
      USING ERRCODE = '22023';
  END IF;

  IF desplazamiento IS NULL OR desplazamiento < 0 THEN
    RAISE EXCEPTION 'desplazamiento debe ser mayor o igual que cero'
      USING ERRCODE = '22023';
  END IF;

  consulta_plegada := pg_catalog.lower(
    public.unaccent_immutable(consulta_limpia)
  );

  query_lexica := pg_catalog.plainto_tsquery(
    'pg_catalog.spanish'::pg_catalog.regconfig,
    consulta_plegada
  );

  IF pg_catalog.numnode(query_lexica) = 0 THEN
    RAISE EXCEPTION
      'La consulta lexica no contiene lexemas significativos'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidatos AS MATERIALIZED (
    SELECT
      conferencia.id AS conferencia_id,
      documento.id AS documento_id,
      pasaje.id AS pasaje_id,
      pasaje.orden,
      pasaje.pagina_inicio,
      pasaje.pagina_fin,
      pasaje.texto,
      pg_catalog.ts_rank_cd(
        pg_catalog.to_tsvector(
          'pg_catalog.spanish'::pg_catalog.regconfig,
          pasaje.texto_plegado
        ),
        query_lexica
      ) AS relevancia,
      pg_catalog.row_number() OVER (
        PARTITION BY conferencia.id
        ORDER BY
          pg_catalog.ts_rank_cd(
            pg_catalog.to_tsvector(
              'pg_catalog.spanish'::pg_catalog.regconfig,
              pasaje.texto_plegado
            ),
            query_lexica
          ) DESC,
          pasaje.orden ASC,
          pasaje.id ASC
      ) AS posicion_en_conferencia
    FROM public.corpus_pasajes AS pasaje
    JOIN public.corpus_transcripciones AS transcripcion
      ON transcripcion.id = pasaje.transcripcion_id
    JOIN public.documentos AS documento
      ON documento.id = transcripcion.documento_id
    JOIN public.conferencias_publicas AS conferencia
      ON conferencia.id = documento.conferencia_id
    WHERE transcripcion.es_vigente = true
      AND pasaje.version_fragmentacion =
        'fragmentacion_paginada_250_40_v1'
      AND pg_catalog.to_tsvector(
        'pg_catalog.spanish'::pg_catalog.regconfig,
        pasaje.texto_plegado
      ) @@ query_lexica
  ),
  mejores_por_conferencia AS MATERIALIZED (
    SELECT
      candidatos.conferencia_id,
      candidatos.documento_id,
      candidatos.pasaje_id,
      candidatos.orden,
      candidatos.pagina_inicio,
      candidatos.pagina_fin,
      candidatos.texto,
      candidatos.relevancia
    FROM candidatos
    WHERE candidatos.posicion_en_conferencia = 1
  ),
  resultados_ordenados AS MATERIALIZED (
    SELECT
      mejores.conferencia_id,
      mejores.documento_id,
      mejores.pasaje_id,
      mejores.orden,
      mejores.pagina_inicio,
      mejores.pagina_fin,
      mejores.texto,
      mejores.relevancia,
      pg_catalog.count(*) OVER () AS total_count
    FROM mejores_por_conferencia AS mejores
    ORDER BY
      mejores.relevancia DESC,
      mejores.conferencia_id ASC
  )
  SELECT
    resultados.conferencia_id,
    resultados.documento_id,
    resultados.pasaje_id,
    resultados.orden,
    resultados.pagina_inicio,
    resultados.pagina_fin,
    resultados.texto,
    resultados.relevancia,
    resultados.total_count
  FROM resultados_ordenados AS resultados
  ORDER BY
    resultados.relevancia DESC,
    resultados.conferencia_id ASC
  LIMIT limite
  OFFSET desplazamiento;
END
$function$;

COMMENT ON FUNCTION public.buscar_corpus_lexica(
  text,
  integer,
  integer
) IS
  'PLIEGO 021: FTS spanish sobre pasajes piloto; devuelve el mejor pasaje por conferencia mediante ts_rank_cd.';

REVOKE ALL ON FUNCTION public.buscar_corpus_lexica(
  text,
  integer,
  integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.buscar_corpus_lexica(
  text,
  integer,
  integer
) TO anon, authenticated;

COMMIT;
